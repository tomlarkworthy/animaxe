var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
var Rx = require("rx");
exports.DEBUG_LOOP = true;
exports.DEBUG_THEN = false;
var DrawTick = (function () {
    function DrawTick(ctx, dt) {
        this.ctx = ctx;
        this.dt = dt;
    }
    return DrawTick;
})();
exports.DrawTick = DrawTick;
function stackTrace() {
    var err = new Error();
    return err.stack;
}
var Iterable = (function () {
    // tried immutable.js but it only supports 2 dimensionable iterables
    function Iterable(predecessors, next) {
        this.predecessors = predecessors;
        this.next = next;
    }
    Iterable.prototype.upstreamTick = function (t) {
        //console.log("Iterable: upstreamTick", t);
        // first let upstream update first
        this.predecessors.forEach(function (predecessor) {
            predecessor.upstreamTick(t);
        });
    };
    Iterable.prototype.next = function () { throw new Error('This method is abstract'); };
    Iterable.prototype.map = function (fn) {
        var base = this;
        return new Iterable([base], function () {
            //console.log("Iterable: next");
            return fn(base.next());
        });
    };
    Iterable.prototype.clone = function () {
        return this.map(function (x) { return x; });
    };
    return Iterable;
})();
exports.Iterable = Iterable;
var IterableStateful = (function (_super) {
    __extends(IterableStateful, _super);
    // tried immutable.js but it only supports 2 dimensionable iterables
    function IterableStateful(initial, predecessors, tick, value) {
        _super.call(this, predecessors, function () {
            return value(this.state);
        });
        this.state = initial;
        this.tick = tick;
    }
    IterableStateful.prototype.upstreamTick = function (t) {
        // first let upstream update first
        _super.prototype.upstreamTick.call(this, t);
        // now call internal state change\
        this.state = this.tick(t, this.state);
    };
    return IterableStateful;
})(Iterable);
exports.IterableStateful = IterableStateful;
var Fixed = (function (_super) {
    __extends(Fixed, _super);
    function Fixed(val) {
        _super.call(this, [], function () {
            return this.val;
        });
        this.val = val;
    }
    return Fixed;
})(Iterable);
exports.Fixed = Fixed;
function toStreamNumber(x) {
    return typeof x === 'number' ? new Fixed(x) : x;
}
exports.toStreamNumber = toStreamNumber;
function toStreamPoint(x) {
    return (typeof x.next === 'function' ? x : new Fixed(x));
}
exports.toStreamPoint = toStreamPoint;
function toStreamColor(x) {
    return (typeof x.next === 'function' ? x : new Fixed(x));
}
exports.toStreamColor = toStreamColor;
var Animation = (function () {
    function Animation(_attach, after, predecessors) {
        this._attach = _attach;
        this.after = after;
        this.predecessors = predecessors;
    }
    Animation.prototype.attach = function (clock, upstream) {
        var self = this;
        var t = clock;
        var instream = null;
        if (this.predecessors == null) {
            instream = upstream;
        }
        else {
            // if we have dependant parameters we update their clock before attaching
            instream = upstream.tap(function (tick) {
                //console.log("animation: sending upstream tick", self.t);
                //we update params of clock before
                self.predecessors.forEach(function (pred) {
                    pred.upstreamTick(t);
                });
                t += tick.dt;
            });
        }
        //console.log("animation: instream", instream, "upstream", upstream);
        var processed = this._attach(instream);
        return this.after ? this.after.attach(t, processed) : processed;
    };
    /**
     * delivers events to this first, then when that animation is finished
     * the follower consumers events and the values are used as output, until the follower animation completes
     */
    Animation.prototype.then = function (follower) {
        var self = this;
        return new Animation(function (prev) {
            var t = 0;
            return Rx.Observable.create(function (observer) {
                var first = new Rx.Subject();
                var second = new Rx.Subject();
                var firstTurn = true;
                var current = first;
                if (exports.DEBUG_THEN)
                    console.log("then: attach");
                var firstAttach = self.attach(t, first.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: first to downstream");
                    observer.onNext(next);
                }, observer.onError.bind(observer), function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: first complete");
                    firstTurn = false;
                });
                //todo second attach is zeroed in time
                var secondAttach = follower.attach(t, second.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: second to downstream");
                    observer.onNext(next);
                }, observer.onError.bind(observer), function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: second complete");
                    observer.onCompleted();
                });
                var prevSubscription = prev.subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: upstream to first OR second");
                    if (firstTurn) {
                        first.onNext(next);
                    }
                    else {
                        second.onNext(next);
                    }
                    t += next.dt;
                }, observer.onError, function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: upstream complete");
                    observer.onCompleted();
                });
                // on dispose
                return function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: disposer");
                    prevSubscription.dispose();
                    firstAttach.dispose();
                    secondAttach.dispose();
                };
            }).subscribeOn(Rx.Scheduler.immediate); //todo remove subscribeOns
        });
    };
    return Animation;
})();
exports.Animation = Animation;
var Animator = (function () {
    function Animator(ctx) {
        this.ctx = ctx;
        this.tickerSubscription = null;
        this.animationSubscriptions = [];
        this.t = 0;
        this.root = new Rx.Subject();
    }
    Animator.prototype.ticker = function (tick) {
        var self = this;
        this.tickerSubscription = tick.map(function (dt) {
            self.t += dt;
            var tick = new DrawTick(self.ctx, dt);
            return tick;
        }).subscribe(this.root);
    };
    Animator.prototype.play = function (animation) {
        var self = this;
        console.log("animator: play");
        var saveBeforeFrame = this.root.tapOnNext(function (tick) {
            console.log("animator: ctx save");
            tick.ctx.save();
        });
        var doAnimation = animation.attach(0, saveBeforeFrame);
        var restoreAfterFrame = doAnimation.tap(function (tick) {
            console.log("animator: ctx next restore");
            tick.ctx.restore();
        }, function (err) {
            console.log("animator: ctx err restore");
            self.ctx.restore();
        }, function () {
            self.ctx.restore();
        });
        this.animationSubscriptions.push(restoreAfterFrame.subscribe());
    };
    Animator.prototype.clock = function () {
        var self = this;
        return new Iterable([], function () { return self.t; });
    };
    return Animator;
})();
exports.Animator = Animator;
function point(x, y) {
    var x_stream = toStreamNumber(x);
    var y_stream = toStreamNumber(y);
    //console.log("point: init", x_stream, y_stream);
    return new Iterable([x_stream, y_stream], function () {
        var result = [x_stream.next(), y_stream.next()];
        //console.log("point: next", result);
        return result;
    });
}
exports.point = point;
/*
    RGB between 0 and 255
    a between 0 - 1
 */
function color(r, g, b, a) {
    var r_stream = toStreamNumber(r);
    var g_stream = toStreamNumber(g);
    var b_stream = toStreamNumber(b);
    var a_stream = toStreamNumber(a);
    return new Iterable([r_stream, g_stream, b_stream, a_stream], function () {
        var r = Math.floor(r_stream.next());
        var g = Math.floor(g_stream.next());
        var b = Math.floor(b_stream.next());
        var a = Math.floor(a_stream.next());
        return "rgb(" + r + "," + g + "," + b + ")";
    });
}
exports.color = color;
function rnd() {
    return new Iterable([], function () {
        return Math.random();
    });
}
exports.rnd = rnd;
function assertDt(assertDt, after) {
    return new Animation(function (upstream) {
        return upstream.zip(assertDt, function (tick, expectedDt) {
            if (tick.dt != expectedDt)
                throw new Error("unexpected clock observed: " + tick.dt + ", expected:" + expectedDt);
            return tick;
        });
    }, after);
}
exports.assertDt = assertDt;
function previous(value) {
    return new IterableStateful({ currentValue: value.next(), prevValue: value.next() }, [value], function (t, state) {
        var newState = { currentValue: value.next(), prevValue: state.currentValue };
        console.log("previous: tick ", t, state, "->", newState);
        return newState;
    }, function (state) {
        console.log("previous: value", state.prevValue);
        return state.prevValue;
    });
}
exports.previous = previous;
function sin(period) {
    console.log("sin: new");
    var period_stream = toStreamNumber(period);
    return new IterableStateful(0, [period_stream], function (t, state) {
        console.log("sin: tick", t);
        return t;
    }, function (state) {
        var value = Math.sin(state * (Math.PI * 2) / period_stream.next());
        console.log("sin: ", value, state);
        return value;
    });
}
exports.sin = sin;
function cos(period) {
    //console.log("cos: new");
    var period_stream = toStreamNumber(period);
    return new IterableStateful(0, [period_stream], function (t, state) {
        console.log("cos: tick");
        return t;
    }, function (state) {
        var value = Math.cos(state * (Math.PI * 2) / period_stream.next());
        console.log("cos: ", value, state);
        return value;
    });
}
exports.cos = cos;
function scale_x(scale, x) { return 0; }
function storeTx(n, /*pass though context but store transform in variable*/ animation //passthrough
    ) { return null; }
function loadTx(n, /*pass though context but store transform in variable*/ animation //passthrough
    ) { return null; }
function clone(n, animation /* copies */) { return null; }
function parallel(//rename layer?
    animation) { return null; }
function sequence(animation) { return null; }
function loop(animation) {
    return new Animation(function (prev) {
        if (exports.DEBUG_LOOP)
            console.log("loop: initializing");
        return Rx.Observable.create(function (observer) {
            if (exports.DEBUG_LOOP)
                console.log("loop: create new loop");
            var loopStart = null;
            var loopSubscription = null;
            var t = 0;
            function attachLoop(next) {
                if (exports.DEBUG_LOOP)
                    console.log("loop: new inner loop starting at", t);
                loopStart = new Rx.Subject();
                loopSubscription = animation.attach(t, loopStart).subscribe(function (next) {
                    if (exports.DEBUG_LOOP)
                        console.log("loop: post-inner loop to downstream");
                    observer.onNext(next);
                }, function (err) {
                    if (exports.DEBUG_LOOP)
                        console.log("loop: post-inner loop err to downstream");
                    observer.onError(err);
                }, function () {
                    if (exports.DEBUG_LOOP)
                        console.log("loop: post-inner completed");
                    loopStart = null;
                });
                if (exports.DEBUG_LOOP)
                    console.log("loop: new inner loop finished construction");
            }
            prev.subscribe(function (next) {
                if (loopStart == null) {
                    if (exports.DEBUG_LOOP)
                        console.log("loop: no inner loop");
                    attachLoop(next);
                }
                if (exports.DEBUG_LOOP)
                    console.log("loop: upstream to inner loop");
                loopStart.onNext(next);
                t += next.dt;
            }, function (err) {
                if (exports.DEBUG_LOOP)
                    console.log("loop: upstream error to downstream", err);
                observer.onError(err);
            }, observer.onCompleted.bind(observer));
            return function () {
                //dispose
                if (exports.DEBUG_LOOP)
                    console.log("loop: dispose");
                if (loopStart)
                    loopStart.dispose();
            };
        }).subscribeOn(Rx.Scheduler.immediate);
    });
}
exports.loop = loop;
function draw(fn, animation, predecessors) {
    return new Animation(function (previous) {
        return previous.tapOnNext(fn);
    }, animation, predecessors);
}
exports.draw = draw;
function move(delta, animation) {
    console.log("move: attached");
    var pointStream = toStreamPoint(delta);
    return draw(function (tick) {
        var point = pointStream.next();
        console.log("move:", point);
        if (tick)
            tick.ctx.transform(1, 0, 0, 1, point[0], point[1]);
        return tick;
    }, animation, [pointStream]);
}
exports.move = move;
function velocity(velocity, animation) {
    var velocityStream = toStreamPoint(velocity);
    return new Animation(function (prev) {
        var pos = [0.0, 0.0];
        return prev.map(function (tick) {
            var velocity = velocityStream.next();
            pos[0] += velocity[0] * tick.dt;
            pos[1] += velocity[1] * tick.dt;
            tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
            return tick;
        });
    }, animation);
}
exports.velocity = velocity;
function tween_linear(from, to, time, animation /* copies */) {
    var from_stream = toStreamPoint(from);
    var to_stream = toStreamPoint(to);
    var scale = 1.0 / time;
    return new Animation(function (prev) {
        var t = 0;
        return prev.map(function (tick) {
            console.log("tween: inner");
            var from = from_stream.next();
            var to = to_stream.next();
            t = t + tick.dt;
            if (t > time)
                t = time;
            var x = from[0] + (to[0] - from[0]) * t * scale;
            var y = from[1] + (to[1] - from[1]) * t * scale;
            tick.ctx.transform(1, 0, 0, 1, x, y);
            return tick;
        }).takeWhile(function (tick) { return t < time; });
    }, animation);
}
exports.tween_linear = tween_linear;
function rect(p1, //todo dynamic params instead
    p2, //todo dynamic params instead
    animation) {
    return draw(function (tick) {
        console.log("rect: fillRect");
        tick.ctx.fillRect(p1[0], p1[1], p2[0], p2[1]); //todo observer stream if necissary
    }, animation);
}
exports.rect = rect;
function changeColor(color, //todo
    animation) {
    return draw(function (tick) {
        tick.ctx.fillStyle = color;
    }, animation);
}
exports.changeColor = changeColor;
function map(map_fn, animation) {
    return new Animation(function (previous) {
        return previous.map(map_fn);
    }, animation);
}
function take(iterations, animation) {
    return new Animation(function (prev) {
        return prev.take(iterations);
    }, animation);
}
exports.take = take;
function save(width, height, path) {
    var GIFEncoder = require('gifencoder');
    var fs = require('fs');
    var encoder = new GIFEncoder(width, height);
    encoder.createReadStream()
        .pipe(encoder.createWriteStream({ repeat: 10000, delay: 100, quality: 1 }))
        .pipe(fs.createWriteStream(path));
    encoder.start();
    return new Animation(function (parent) {
        var t = 0;
        var endNext = false;
        return parent.tap(function (tick) {
            console.log("save: wrote frame");
            //t += tick.dt;
            //var out = fs.writeFileSync(path + "_"+ t + ".png", canvas.toBuffer());
            //var parsed = pngparse(canvas.toBuffer())
            encoder.addFrame(tick.ctx);
            //encoder.addFrame(tick.ctx.getImageData(0, 0, width, height).data);
        }, function () { console.error("save: not saved", path); }, function () { console.log("save: saved", path); encoder.finish(); /* endNext = true;*/ });
    });
}
exports.save = save;
//we will draw
// EXPLODING SHIP
//1. n pieces of debris flying outwards (linear movement in time of Debris from 50,50 to rnd, rnd, at velocity v)
//2. explosion of debris (last position of debris spawns explosion
//3. large explosion at center (50,50) at end of linear movement
var CENTRE = point(50, 50);
var TL = point(50, 50);
var BR = point(50, 50);
var t = 0;
var n = 0;
var gaussian;
var splatter = scale_x(3, gaussian);
function drawDebris() { return null; }
function drawExplosion() { return null; }
function drawBigExplosion() { return null; }
//What do we want it to look like
//todo
// INVEST IN BUILD AND TESTING
// fix time
// then and loop resets time each use?
// example in loop? see uncommenting example2
//emitter
//rand normal
//animator.play(
//    //clone is a parrallel execution the same animation
//    parallel([clone(n, linear_tween(/*fixed point*/CENTRE,
//                   /*generative point*/ point(splatter, splatter),
//                   /*time*/ t,
//                   /*draw fn for tween*/ storeTx("X", drawDebris()))
//                .then(loadTx("X", drawExplosion())) //after the tween completes draw the explosion
//              ),
//              take(/*fixed value*/ t).then(drawBigExplosion())
//             ])
//);
// IDEAS
// PacMan
// what about a different way of making glow?
// render luminecence into a texture and then color based on distance from lightsource
// mouse input, tailing glow (rember to tween between rapid movements)
// offscreen rendering an playback
// sin wave, randomized
// GUI components, responsive, bootstrap
// get data out by tapping into flow (intercept(Subject passback))
// SVG import
// layering with parrallel (back first)

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiRHJhd1RpY2siLCJEcmF3VGljay5jb25zdHJ1Y3RvciIsInN0YWNrVHJhY2UiLCJJdGVyYWJsZSIsIkl0ZXJhYmxlLmNvbnN0cnVjdG9yIiwiSXRlcmFibGUudXBzdHJlYW1UaWNrIiwiSXRlcmFibGUubmV4dCIsIkl0ZXJhYmxlLm1hcCIsIkl0ZXJhYmxlLmNsb25lIiwiSXRlcmFibGVTdGF0ZWZ1bCIsIkl0ZXJhYmxlU3RhdGVmdWwuY29uc3RydWN0b3IiLCJJdGVyYWJsZVN0YXRlZnVsLnVwc3RyZWFtVGljayIsIkZpeGVkIiwiRml4ZWQuY29uc3RydWN0b3IiLCJ0b1N0cmVhbU51bWJlciIsInRvU3RyZWFtUG9pbnQiLCJ0b1N0cmVhbUNvbG9yIiwiQW5pbWF0aW9uIiwiQW5pbWF0aW9uLmNvbnN0cnVjdG9yIiwiQW5pbWF0aW9uLmF0dGFjaCIsIkFuaW1hdGlvbi50aGVuIiwiQW5pbWF0b3IiLCJBbmltYXRvci5jb25zdHJ1Y3RvciIsIkFuaW1hdG9yLnRpY2tlciIsIkFuaW1hdG9yLnBsYXkiLCJBbmltYXRvci5jbG9jayIsInBvaW50IiwiY29sb3IiLCJybmQiLCJhc3NlcnREdCIsInByZXZpb3VzIiwic2luIiwiY29zIiwic2NhbGVfeCIsInN0b3JlVHgiLCJsb2FkVHgiLCJjbG9uZSIsInBhcmFsbGVsIiwic2VxdWVuY2UiLCJsb29wIiwiYXR0YWNoTG9vcCIsImRyYXciLCJtb3ZlIiwidmVsb2NpdHkiLCJ0d2Vlbl9saW5lYXIiLCJyZWN0IiwiY2hhbmdlQ29sb3IiLCJtYXAiLCJ0YWtlIiwic2F2ZSIsImRyYXdEZWJyaXMiLCJkcmF3RXhwbG9zaW9uIiwiZHJhd0JpZ0V4cGxvc2lvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsQUFFQSwwREFGMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3hDLElBQU8sRUFBRSxXQUFXLElB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Q2hFLGlCQUFpQjtBQUNqQixJQUFJO0FBR0osUUFBUTtBQUVSLFNBQVM7QUFDVCw2Q0FBNkM7QUFDN0Msc0ZBQXNGO0FBQ3RGLHNFQUFzRTtBQUN0RSxrQ0FBa0M7QUFDbEMsdUJBQXVCO0FBQ3ZCLHdDQUF3QztBQUN4QyxrRUFBa0U7QUFDbEUsYUFBYTtBQUNiLHVDQUF1QyIsImZpbGUiOiJhbmltYXhlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL25vZGVfbW9kdWxlcy9yeC90cy9yeC5hbGwuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbmltcG9ydCBSeCA9IHJlcXVpcmUoXCJyeFwiKTtcblxuZXhwb3J0IHZhciBERUJVR19MT09QID0gdHJ1ZTtcbmV4cG9ydCB2YXIgREVCVUdfVEhFTiA9IGZhbHNlO1xuXG5cbmV4cG9ydCBjbGFzcyBEcmF3VGljayB7XG4gICAgY29uc3RydWN0b3IgKHB1YmxpYyBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgcHVibGljIGR0OiBudW1iZXIpIHt9XG59XG5cbmZ1bmN0aW9uIHN0YWNrVHJhY2UoKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIHJldHVybiAoPGFueT5lcnIpLnN0YWNrO1xufVxuXG5leHBvcnQgY2xhc3MgSXRlcmFibGU8VmFsdWU+IHtcbiAgICBwcml2YXRlIHByZWRlY2Vzc29yczogSXRlcmFibGU8YW55PltdO1xuXG4gICAgLy8gdHJpZWQgaW1tdXRhYmxlLmpzIGJ1dCBpdCBvbmx5IHN1cHBvcnRzIDIgZGltZW5zaW9uYWJsZSBpdGVyYWJsZXNcbiAgICBjb25zdHJ1Y3RvcihwcmVkZWNlc3NvcnM6IEl0ZXJhYmxlPGFueT5bXSwgbmV4dDogKCkgPT4gVmFsdWUpIHtcbiAgICAgICAgdGhpcy5wcmVkZWNlc3NvcnMgPSBwcmVkZWNlc3NvcnM7XG4gICAgICAgIHRoaXMubmV4dCA9IG5leHQ7XG4gICAgfVxuXG4gICAgdXBzdHJlYW1UaWNrKHQ6IG51bWJlcik6IHZvaWQge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiSXRlcmFibGU6IHVwc3RyZWFtVGlja1wiLCB0KTtcbiAgICAgICAgLy8gZmlyc3QgbGV0IHVwc3RyZWFtIHVwZGF0ZSBmaXJzdFxuICAgICAgICB0aGlzLnByZWRlY2Vzc29ycy5mb3JFYWNoKGZ1bmN0aW9uIChwcmVkZWNlc3Nvcikge1xuICAgICAgICAgICAgcHJlZGVjZXNzb3IudXBzdHJlYW1UaWNrKHQpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBuZXh0KCk6IFZhbHVlIHt0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgbWV0aG9kIGlzIGFic3RyYWN0Jyk7fVxuXG4gICAgbWFwPFY+KGZuOiAoVmFsdWUpID0+IFYpOiBJdGVyYWJsZTxWPiB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyYWJsZShcbiAgICAgICAgICAgIFtiYXNlXSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCk6IFYge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJJdGVyYWJsZTogbmV4dFwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4oYmFzZS5uZXh0KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIGNsb25lKCk6IEl0ZXJhYmxlPFZhbHVlPiB7XG4gICAgICAgIHJldHVybiB0aGlzLm1hcCh4ID0+IHgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEl0ZXJhYmxlU3RhdGVmdWw8U3RhdGUsIFZhbHVlPiBleHRlbmRzIEl0ZXJhYmxlPFZhbHVlPntcblxuICAgIHN0YXRlOiBTdGF0ZTtcbiAgICBwcml2YXRlIHRpY2s6ICh0OiBudW1iZXIsIHN0YXRlOiBTdGF0ZSkgPT4gU3RhdGU7XG4gICAgLy8gdHJpZWQgaW1tdXRhYmxlLmpzIGJ1dCBpdCBvbmx5IHN1cHBvcnRzIDIgZGltZW5zaW9uYWJsZSBpdGVyYWJsZXNcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgaW5pdGlhbDogU3RhdGUsXG4gICAgICAgIHByZWRlY2Vzc29yczogSXRlcmFibGU8YW55PltdLFxuICAgICAgICB0aWNrOiAodDogbnVtYmVyLCBzdGF0ZTogU3RhdGUpID0+IFN0YXRlLFxuICAgICAgICB2YWx1ZTogKFN0YXRlKSA9PiBWYWx1ZSkge1xuXG4gICAgICAgIHN1cGVyKFxuICAgICAgICAgICAgcHJlZGVjZXNzb3JzLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSh0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgICB0aGlzLnN0YXRlID0gaW5pdGlhbDtcbiAgICAgICAgdGhpcy50aWNrICA9IHRpY2s7XG4gICAgfVxuXG4gICAgdXBzdHJlYW1UaWNrKHQ6IG51bWJlcikge1xuICAgICAgICAvLyBmaXJzdCBsZXQgdXBzdHJlYW0gdXBkYXRlIGZpcnN0XG4gICAgICAgIHN1cGVyLnVwc3RyZWFtVGljayh0KTtcbiAgICAgICAgLy8gbm93IGNhbGwgaW50ZXJuYWwgc3RhdGUgY2hhbmdlXFxcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMudGljayh0LCB0aGlzLnN0YXRlKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFRPRE8sIHdlIGNvdWxkIG1hcCBzdGF0ZSBoZXJlIG1heWJlXG4gICAgbWFwPFY+KGZuOiAoVmFsdWUpID0+IFYpOiBJdGVyYWJsZVN0YXRlZnVsPGFueSwgVj4ge1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgSXRlcmFibGVTdGF0ZWZ1bChcbiAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICBbYmFzZV0sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHt9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKTogViB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuKGJhc2UubmV4dCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9KiovXG59XG5cbmV4cG9ydCB0eXBlIE51bWJlclN0cmVhbSA9IEl0ZXJhYmxlPG51bWJlcj47XG5leHBvcnQgdHlwZSBQb2ludFN0cmVhbSA9IEl0ZXJhYmxlPFBvaW50PjtcbmV4cG9ydCB0eXBlIENvbG9yU3RyZWFtID0gSXRlcmFibGU8c3RyaW5nPjtcbmV4cG9ydCB0eXBlIERyYXdTdHJlYW0gPSBSeC5PYnNlcnZhYmxlPERyYXdUaWNrPjtcblxuZXhwb3J0IGNsYXNzIEZpeGVkPFQ+IGV4dGVuZHMgSXRlcmFibGU8VD4ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB2YWw6IFQpIHtcbiAgICAgICAgc3VwZXIoXG4gICAgICAgICAgICBbXSwgLy9ubyBkZXBlbmRhbnRzXG4gICAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbU51bWJlcih4OiBudW1iZXIgfCBOdW1iZXJTdHJlYW0pOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ251bWJlcicgPyBuZXcgRml4ZWQoeCk6IHg7XG59XG5leHBvcnQgZnVuY3Rpb24gdG9TdHJlYW1Qb2ludCh4OiBQb2ludCB8IFBvaW50U3RyZWFtKTogUG9pbnRTdHJlYW0ge1xuICAgIHJldHVybiA8UG9pbnRTdHJlYW0+ICh0eXBlb2YgKDxhbnk+eCkubmV4dCA9PT0gJ2Z1bmN0aW9uJyA/IHg6IG5ldyBGaXhlZCh4KSk7XG59XG5leHBvcnQgZnVuY3Rpb24gdG9TdHJlYW1Db2xvcih4OiBzdHJpbmcgfCBDb2xvclN0cmVhbSk6IENvbG9yU3RyZWFtIHtcbiAgICByZXR1cm4gPENvbG9yU3RyZWFtPiAodHlwZW9mICg8YW55PngpLm5leHQgPT09ICdmdW5jdGlvbicgPyB4OiBuZXcgRml4ZWQoeCkpO1xufVxuXG5leHBvcnQgY2xhc3MgQW5pbWF0aW9uIHtcbiAgICBwcml2YXRlIHByZWRlY2Vzc29yczogSXRlcmFibGU8YW55PltdO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIF9hdHRhY2g6ICh1cHN0cmVhbTogRHJhd1N0cmVhbSkgPT4gRHJhd1N0cmVhbSwgcHVibGljIGFmdGVyPzogQW5pbWF0aW9uLCBwcmVkZWNlc3NvcnM/OiBJdGVyYWJsZTxhbnk+W10pIHtcbiAgICAgICAgdGhpcy5wcmVkZWNlc3NvcnMgPSBwcmVkZWNlc3NvcnNcbiAgICB9XG4gICAgYXR0YWNoKGNsb2NrOiBudW1iZXIsIHVwc3RyZWFtOiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIHQgPSBjbG9jaztcblxuICAgICAgICB2YXIgaW5zdHJlYW0gPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5wcmVkZWNlc3NvcnMgPT0gbnVsbCkge1xuICAgICAgICAgICAgaW5zdHJlYW0gPSB1cHN0cmVhbTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGlmIHdlIGhhdmUgZGVwZW5kYW50IHBhcmFtZXRlcnMgd2UgdXBkYXRlIHRoZWlyIGNsb2NrIGJlZm9yZSBhdHRhY2hpbmdcbiAgICAgICAgICAgIGluc3RyZWFtID0gdXBzdHJlYW0udGFwKGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJhbmltYXRpb246IHNlbmRpbmcgdXBzdHJlYW0gdGlja1wiLCBzZWxmLnQpO1xuICAgICAgICAgICAgICAgIC8vd2UgdXBkYXRlIHBhcmFtcyBvZiBjbG9jayBiZWZvcmVcbiAgICAgICAgICAgICAgICBzZWxmLnByZWRlY2Vzc29ycy5mb3JFYWNoKGZ1bmN0aW9uKHByZWQpe1xuICAgICAgICAgICAgICAgICAgICBwcmVkLnVwc3RyZWFtVGljayh0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0ICs9IHRpY2suZHQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiYW5pbWF0aW9uOiBpbnN0cmVhbVwiLCBpbnN0cmVhbSwgXCJ1cHN0cmVhbVwiLCB1cHN0cmVhbSk7XG4gICAgICAgIHZhciBwcm9jZXNzZWQgPSB0aGlzLl9hdHRhY2goaW5zdHJlYW0pO1xuICAgICAgICByZXR1cm4gdGhpcy5hZnRlcj8gdGhpcy5hZnRlci5hdHRhY2godCwgcHJvY2Vzc2VkKTogcHJvY2Vzc2VkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBkZWxpdmVycyBldmVudHMgdG8gdGhpcyBmaXJzdCwgdGhlbiB3aGVuIHRoYXQgYW5pbWF0aW9uIGlzIGZpbmlzaGVkXG4gICAgICogdGhlIGZvbGxvd2VyIGNvbnN1bWVycyBldmVudHMgYW5kIHRoZSB2YWx1ZXMgYXJlIHVzZWQgYXMgb3V0cHV0LCB1bnRpbCB0aGUgZm9sbG93ZXIgYW5pbWF0aW9uIGNvbXBsZXRlc1xuICAgICAqL1xuICAgIHRoZW4oZm9sbG93ZXI6IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSkgOiBEcmF3U3RyZWFtIHtcblxuICAgICAgICAgICAgdmFyIHQgPSAwO1xuXG4gICAgICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uIChvYnNlcnZlcikge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCAgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RUdXJuID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50ID0gZmlyc3Q7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogYXR0YWNoXCIpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0QXR0YWNoICA9IHNlbGYuYXR0YWNoKHQsIGZpcnN0LnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpKS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGZpcnN0IHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IuYmluZChvYnNlcnZlciksXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBmaXJzdCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0VHVybiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAvL3RvZG8gc2Vjb25kIGF0dGFjaCBpcyB6ZXJvZWQgaW4gdGltZVxuICAgICAgICAgICAgICAgIHZhciBzZWNvbmRBdHRhY2ggPSBmb2xsb3dlci5hdHRhY2godCwgc2Vjb25kLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpKS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogc2Vjb25kIGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgdmFyIHByZXZTdWJzY3JpcHRpb24gPSBwcmV2LnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogdXBzdHJlYW0gdG8gZmlyc3QgT1Igc2Vjb25kXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpcnN0VHVybikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0Lm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vjb25kLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHQgKz0gbmV4dC5kdDtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogdXBzdHJlYW0gY29tcGxldGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAvLyBvbiBkaXNwb3NlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZGlzcG9zZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIHByZXZTdWJzY3JpcHRpb24uZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBmaXJzdEF0dGFjaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpOyAvL3RvZG8gcmVtb3ZlIHN1YnNjcmliZU9uc1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBbmltYXRvciB7XG4gICAgdGlja2VyU3Vic2NyaXB0aW9uOiBSeC5EaXNwb3NhYmxlID0gbnVsbDtcbiAgICByb290OiBSeC5TdWJqZWN0PERyYXdUaWNrPjtcbiAgICBhbmltYXRpb25TdWJzY3JpcHRpb25zOiBSeC5JRGlzcG9zYWJsZVtdID0gW107XG4gICAgdDogbnVtYmVyID0gMDtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCkge1xuICAgICAgICB0aGlzLnJvb3QgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKVxuICAgIH1cbiAgICB0aWNrZXIodGljazogUnguT2JzZXJ2YWJsZTxudW1iZXI+KTogdm9pZCB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB0aGlzLnRpY2tlclN1YnNjcmlwdGlvbiA9IHRpY2subWFwKGZ1bmN0aW9uKGR0OiBudW1iZXIpIHsgLy9tYXAgdGhlIHRpY2tlciBvbnRvIGFueSAtPiBjb250ZXh0XG4gICAgICAgICAgICBzZWxmLnQgKz0gZHQ7XG4gICAgICAgICAgICB2YXIgdGljayA9IG5ldyBEcmF3VGljayhzZWxmLmN0eCwgZHQpO1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pLnN1YnNjcmliZSh0aGlzLnJvb3QpO1xuICAgIH1cbiAgICBwbGF5IChhbmltYXRpb246IEFuaW1hdGlvbik6IHZvaWQge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IHBsYXlcIik7XG4gICAgICAgIHZhciBzYXZlQmVmb3JlRnJhbWUgPSB0aGlzLnJvb3QudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IHNhdmVcIik7XG4gICAgICAgICAgICB0aWNrLmN0eC5zYXZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZG9BbmltYXRpb24gPSBhbmltYXRpb24uYXR0YWNoKDAsIHNhdmVCZWZvcmVGcmFtZSk7XG4gICAgICAgIHZhciByZXN0b3JlQWZ0ZXJGcmFtZSA9IGRvQW5pbWF0aW9uLnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBuZXh0IHJlc3RvcmVcIik7XG4gICAgICAgICAgICAgICAgdGljay5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSxmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBlcnIgcmVzdG9yZVwiKTtcbiAgICAgICAgICAgICAgICBzZWxmLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uU3Vic2NyaXB0aW9ucy5wdXNoKFxuICAgICAgICAgICAgcmVzdG9yZUFmdGVyRnJhbWUuc3Vic2NyaWJlKClcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBjbG9jaygpOiBOdW1iZXJTdHJlYW0ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgSXRlcmFibGUoW10sIGZ1bmN0aW9uKCkge3JldHVybiBzZWxmLnR9KVxuICAgIH1cbn1cblxuZXhwb3J0IHR5cGUgUG9pbnQgPSBbbnVtYmVyLCBudW1iZXJdXG5leHBvcnQgZnVuY3Rpb24gcG9pbnQoXG4gICAgeDogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIHk6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogUG9pbnRTdHJlYW1cbntcbiAgICB2YXIgeF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcih4KTtcbiAgICB2YXIgeV9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcih5KTtcblxuICAgIC8vY29uc29sZS5sb2coXCJwb2ludDogaW5pdFwiLCB4X3N0cmVhbSwgeV9zdHJlYW0pO1xuICAgIHJldHVybiBuZXcgSXRlcmFibGUoXG4gICAgICAgIFt4X3N0cmVhbSwgeV9zdHJlYW1dLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQ6IFtudW1iZXIsIG51bWJlcl0gPSBbeF9zdHJlYW0ubmV4dCgpLCB5X3N0cmVhbS5uZXh0KCldO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcInBvaW50OiBuZXh0XCIsIHJlc3VsdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuLypcbiAgICBSR0IgYmV0d2VlbiAwIGFuZCAyNTVcbiAgICBhIGJldHdlZW4gMCAtIDFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbG9yKFxuICAgIHI6IG51bWJlciB8IE51bWJlclN0cmVhbSxcbiAgICBnOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgYjogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGE6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogQ29sb3JTdHJlYW1cbntcbiAgICB2YXIgcl9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihyKTtcbiAgICB2YXIgZ19zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihnKTtcbiAgICB2YXIgYl9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihiKTtcbiAgICB2YXIgYV9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihhKTtcbiAgICByZXR1cm4gbmV3IEl0ZXJhYmxlKFxuICAgICAgICBbcl9zdHJlYW0sIGdfc3RyZWFtLCBiX3N0cmVhbSwgYV9zdHJlYW1dLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciByID0gTWF0aC5mbG9vcihyX3N0cmVhbS5uZXh0KCkpO1xuICAgICAgICAgICAgdmFyIGcgPSBNYXRoLmZsb29yKGdfc3RyZWFtLm5leHQoKSk7XG4gICAgICAgICAgICB2YXIgYiA9IE1hdGguZmxvb3IoYl9zdHJlYW0ubmV4dCgpKTtcbiAgICAgICAgICAgIHZhciBhID0gTWF0aC5mbG9vcihhX3N0cmVhbS5uZXh0KCkpO1xuICAgICAgICAgICAgcmV0dXJuIFwicmdiKFwiICsgciArIFwiLFwiICsgZyArIFwiLFwiICsgYiArIFwiKVwiO1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJuZCgpOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiBuZXcgSXRlcmFibGUoW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpO1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydER0KGFzc2VydER0OiBSeC5PYnNlcnZhYmxlPG51bWJlcj4sIGFmdGVyPzogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbih1cHN0cmVhbSkge1xuICAgICAgICByZXR1cm4gdXBzdHJlYW0uemlwKGFzc2VydER0LCBmdW5jdGlvbih0aWNrOiBEcmF3VGljaywgZXhwZWN0ZWREdDogbnVtYmVyKSB7XG4gICAgICAgICAgICBpZiAodGljay5kdCAhPSBleHBlY3RlZER0KSB0aHJvdyBuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIGNsb2NrIG9ic2VydmVkOiBcIiArIHRpY2suZHQgKyBcIiwgZXhwZWN0ZWQ6XCIgKyBleHBlY3RlZER0KTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KTtcbiAgICB9LCBhZnRlcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmV2aW91czxUPih2YWx1ZTogSXRlcmFibGU8VD4pOiBJdGVyYWJsZTxUPiB7XG4gICAgcmV0dXJuIG5ldyBJdGVyYWJsZVN0YXRlZnVsPHtjdXJyZW50VmFsdWU6VDsgcHJldlZhbHVlOlR9LCBUPiAoXG4gICAgICAgIHtjdXJyZW50VmFsdWU6IHZhbHVlLm5leHQoKSwgcHJldlZhbHVlOiB2YWx1ZS5uZXh0KCl9LFxuICAgICAgICBbdmFsdWVdLFxuICAgICAgICBmdW5jdGlvbiAodCwgc3RhdGUpIHtcbiAgICAgICAgICAgIHZhciBuZXdTdGF0ZSA9ICB7Y3VycmVudFZhbHVlOiB2YWx1ZS5uZXh0KCksIHByZXZWYWx1ZTogc3RhdGUuY3VycmVudFZhbHVlfTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicHJldmlvdXM6IHRpY2sgXCIsIHQsIHN0YXRlLCBcIi0+XCIsIG5ld1N0YXRlKTtcbiAgICAgICAgICAgIHJldHVybiBuZXdTdGF0ZTtcbiAgICAgICAgfSwgZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicHJldmlvdXM6IHZhbHVlXCIsIHN0YXRlLnByZXZWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gPFQ+c3RhdGUucHJldlZhbHVlO1xuICAgICAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpbihwZXJpb2Q6IG51bWJlcnwgTnVtYmVyU3RyZWFtKTogTnVtYmVyU3RyZWFtIHtcbiAgICBjb25zb2xlLmxvZyhcInNpbjogbmV3XCIpO1xuICAgIHZhciBwZXJpb2Rfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocGVyaW9kKTtcblxuICAgIHJldHVybiBuZXcgSXRlcmFibGVTdGF0ZWZ1bDxudW1iZXIsIG51bWJlcj4oXG4gICAgICAgIDAsXG4gICAgICAgIFtwZXJpb2Rfc3RyZWFtXSxcbiAgICAgICAgZnVuY3Rpb24odCwgc3RhdGU6IG51bWJlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJzaW46IHRpY2tcIiwgdCk7XG4gICAgICAgICAgICByZXR1cm4gdDtcbiAgICAgICAgfSwgZnVuY3Rpb24oc3RhdGU6IG51bWJlcikge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gTWF0aC5zaW4oc3RhdGUgKiAoTWF0aC5QSSAqIDIpIC8gcGVyaW9kX3N0cmVhbS5uZXh0KCkpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJzaW46IFwiLCB2YWx1ZSwgc3RhdGUpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9KTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjb3MocGVyaW9kOiBudW1iZXJ8IE51bWJlclN0cmVhbSk6IE51bWJlclN0cmVhbSB7XG4gICAgLy9jb25zb2xlLmxvZyhcImNvczogbmV3XCIpO1xuICAgIHZhciBwZXJpb2Rfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocGVyaW9kKTtcblxuICAgIHJldHVybiBuZXcgSXRlcmFibGVTdGF0ZWZ1bDxudW1iZXIsIG51bWJlcj4oXG4gICAgICAgIDAsXG4gICAgICAgIFtwZXJpb2Rfc3RyZWFtXSxcbiAgICAgICAgZnVuY3Rpb24odCwgc3RhdGU6IG51bWJlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjb3M6IHRpY2tcIik7XG4gICAgICAgICAgICByZXR1cm4gdDtcbiAgICAgICAgfSwgZnVuY3Rpb24oc3RhdGU6IG51bWJlcikge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gTWF0aC5jb3Moc3RhdGUgKiAoTWF0aC5QSSAqIDIpIC8gcGVyaW9kX3N0cmVhbS5uZXh0KCkpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJjb3M6IFwiLCB2YWx1ZSwgc3RhdGUpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9KTtcbn1cblxuZnVuY3Rpb24gc2NhbGVfeChcbiAgICBzY2FsZTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIHg6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG57IHJldHVybiAwO31cblxuZnVuY3Rpb24gc3RvcmVUeChcbiAgICBuOiBzdHJpbmcsIC8qcGFzcyB0aG91Z2ggY29udGV4dCBidXQgc3RvcmUgdHJhbnNmb3JtIGluIHZhcmlhYmxlKi9cbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvL3Bhc3N0aHJvdWdoXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBsb2FkVHgoXG4gICAgbjogc3RyaW5nLCAvKnBhc3MgdGhvdWdoIGNvbnRleHQgYnV0IHN0b3JlIHRyYW5zZm9ybSBpbiB2YXJpYWJsZSovXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb24gLy9wYXNzdGhyb3VnaFxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuZnVuY3Rpb24gY2xvbmUoXG4gICAgbjogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8qIGNvcGllcyAqL1xuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuZnVuY3Rpb24gcGFyYWxsZWwoIC8vcmVuYW1lIGxheWVyP1xuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uW11cbik6IEFuaW1hdGlvblxueyByZXR1cm4gbnVsbDt9XG5cbmZ1bmN0aW9uIHNlcXVlbmNlKFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uW11cbik6IEFuaW1hdGlvblxueyByZXR1cm4gbnVsbDt9XG5cbmV4cG9ydCBmdW5jdGlvbiBsb29wKFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBpbml0aWFsaXppbmdcIik7XG5cblxuICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBjcmVhdGUgbmV3IGxvb3BcIik7XG4gICAgICAgICAgICB2YXIgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBsb29wU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICAgICAgICAgIHZhciB0ID0gMDtcblxuICAgICAgICAgICAgZnVuY3Rpb24gYXR0YWNoTG9vcChuZXh0KSB7IC8vdG9kbyBJIGZlZWwgbGlrZSB3ZSBjYW4gcmVtb3ZlIGEgbGV2ZWwgZnJvbSB0aGlzIHNvbWVob3dcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBuZXcgaW5uZXIgbG9vcCBzdGFydGluZyBhdFwiLCB0KTtcblxuICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN1YnNjcmlwdGlvbiA9IGFuaW1hdGlvbi5hdHRhY2godCwgbG9vcFN0YXJ0KS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCBlcnIgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBwb3N0LWlubmVyIGNvbXBsZXRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIGZpbmlzaGVkIGNvbnN0cnVjdGlvblwiKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmV2LnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbm8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaExvb3AobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogdXBzdHJlYW0gdG8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0Lm9uTmV4dChuZXh0KTtcblxuICAgICAgICAgICAgICAgICAgICB0ICs9IG5leHQuZHQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSBlcnJvciB0byBkb3duc3RyZWFtXCIsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkLmJpbmQob2JzZXJ2ZXIpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy9kaXNwb3NlXG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogZGlzcG9zZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAobG9vcFN0YXJ0KSBsb29wU3RhcnQuZGlzcG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXcoXG4gICAgZm46ICh0aWNrOiBEcmF3VGljaykgPT4gdm9pZCxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb24sXG4gICAgcHJlZGVjZXNzb3JzPzogSXRlcmFibGU8YW55PltdXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldmlvdXM6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzLnRhcE9uTmV4dChmbik7XG4gICAgfSwgYW5pbWF0aW9uLCBwcmVkZWNlc3NvcnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW92ZShcbiAgICBkZWx0YTogUG9pbnQgfCBQb2ludFN0cmVhbSxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgY29uc29sZS5sb2coXCJtb3ZlOiBhdHRhY2hlZFwiKTtcbiAgICB2YXIgcG9pbnRTdHJlYW06IFBvaW50U3RyZWFtID0gdG9TdHJlYW1Qb2ludChkZWx0YSk7XG4gICAgcmV0dXJuIGRyYXcoZnVuY3Rpb24odGljaykge1xuICAgICAgICB2YXIgcG9pbnQgPSBwb2ludFN0cmVhbS5uZXh0KCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibW92ZTpcIiwgcG9pbnQpO1xuICAgICAgICBpZiAodGljaylcbiAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCBwb2ludFswXSwgcG9pbnRbMV0pO1xuICAgICAgICByZXR1cm4gdGljaztcbiAgICB9LCBhbmltYXRpb24sIFtwb2ludFN0cmVhbV0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmVsb2NpdHkoXG4gICAgdmVsb2NpdHk6IFBvaW50IHwgUG9pbnRTdHJlYW0sXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHZhciB2ZWxvY2l0eVN0cmVhbTogUG9pbnRTdHJlYW0gPSB0b1N0cmVhbVBvaW50KHZlbG9jaXR5KTtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbihwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHZhciBwb3M6IFBvaW50ID0gWzAuMCwwLjBdO1xuICAgICAgICByZXR1cm4gcHJldi5tYXAoZnVuY3Rpb24odGljaykge1xuICAgICAgICAgICAgdmFyIHZlbG9jaXR5ID0gdmVsb2NpdHlTdHJlYW0ubmV4dCgpO1xuICAgICAgICAgICAgcG9zWzBdICs9IHZlbG9jaXR5WzBdICogdGljay5kdDtcbiAgICAgICAgICAgIHBvc1sxXSArPSB2ZWxvY2l0eVsxXSAqIHRpY2suZHQ7XG4gICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgcG9zWzBdLCBwb3NbMV0pO1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pO1xuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2Vlbl9saW5lYXIoXG4gICAgZnJvbTogUG9pbnQgfCBQb2ludFN0cmVhbSxcbiAgICB0bzogICBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIHRpbWU6IG51bWJlcixcbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvKiBjb3BpZXMgKi9cbik6IEFuaW1hdGlvblxue1xuICAgIHZhciBmcm9tX3N0cmVhbSA9IHRvU3RyZWFtUG9pbnQoZnJvbSk7XG4gICAgdmFyIHRvX3N0cmVhbSA9IHRvU3RyZWFtUG9pbnQodG8pO1xuICAgIHZhciBzY2FsZSA9IDEuMCAvIHRpbWU7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbihwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHZhciB0ID0gMDtcbiAgICAgICAgcmV0dXJuIHByZXYubWFwKGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInR3ZWVuOiBpbm5lclwiKTtcbiAgICAgICAgICAgIHZhciBmcm9tID0gZnJvbV9zdHJlYW0ubmV4dCgpO1xuICAgICAgICAgICAgdmFyIHRvICAgPSB0b19zdHJlYW0ubmV4dCgpO1xuXG4gICAgICAgICAgICB0ID0gdCArIHRpY2suZHQ7XG4gICAgICAgICAgICBpZiAodCA+IHRpbWUpIHQgPSB0aW1lO1xuICAgICAgICAgICAgdmFyIHggPSBmcm9tWzBdICsgKHRvWzBdIC0gZnJvbVswXSkgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICB2YXIgeSA9IGZyb21bMV0gKyAodG9bMV0gLSBmcm9tWzFdKSAqIHQgKiBzY2FsZTtcbiAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCB4LCB5KTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KS50YWtlV2hpbGUoZnVuY3Rpb24odGljaykge3JldHVybiB0IDwgdGltZTt9KVxuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWN0KFxuICAgIHAxOiBQb2ludCwgLy90b2RvIGR5bmFtaWMgcGFyYW1zIGluc3RlYWRcbiAgICBwMjogUG9pbnQsIC8vdG9kbyBkeW5hbWljIHBhcmFtcyBpbnN0ZWFkXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlY3Q6IGZpbGxSZWN0XCIpO1xuICAgICAgICB0aWNrLmN0eC5maWxsUmVjdChwMVswXSwgcDFbMV0sIHAyWzBdLCBwMlsxXSk7IC8vdG9kbyBvYnNlcnZlciBzdHJlYW0gaWYgbmVjaXNzYXJ5XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjaGFuZ2VDb2xvcihcbiAgICBjb2xvcjogc3RyaW5nLCAvL3RvZG9cbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgIHRpY2suY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmZ1bmN0aW9uIG1hcChcbiAgICBtYXBfZm46IChwcmV2OiBEcmF3VGljaykgPT4gRHJhd1RpY2ssXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2aW91czogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICByZXR1cm4gcHJldmlvdXMubWFwKG1hcF9mbilcbiAgICB9LCBhbmltYXRpb24pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0YWtlKFxuICAgIGl0ZXJhdGlvbnM6IG51bWJlcixcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgcmV0dXJuIHByZXYudGFrZShpdGVyYXRpb25zKTtcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlciwgcGF0aDogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgR0lGRW5jb2RlciA9IHJlcXVpcmUoJ2dpZmVuY29kZXInKTtcbiAgICB2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuXG5cbiAgICB2YXIgZW5jb2RlciA9IG5ldyBHSUZFbmNvZGVyKHdpZHRoLCBoZWlnaHQpO1xuICAgIGVuY29kZXIuY3JlYXRlUmVhZFN0cmVhbSgpXG4gICAgICAucGlwZShlbmNvZGVyLmNyZWF0ZVdyaXRlU3RyZWFtKHsgcmVwZWF0OiAxMDAwMCwgZGVsYXk6IDEwMCwgcXVhbGl0eTogMSB9KSlcbiAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHBhdGgpKTtcbiAgICBlbmNvZGVyLnN0YXJ0KCk7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocGFyZW50OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHZhciB0ID0gMDtcbiAgICAgICAgdmFyIGVuZE5leHQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHBhcmVudC50YXAoXG4gICAgICAgICAgICBmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic2F2ZTogd3JvdGUgZnJhbWVcIik7XG4gICAgICAgICAgICAgICAgLy90ICs9IHRpY2suZHQ7XG4gICAgICAgICAgICAgICAgLy92YXIgb3V0ID0gZnMud3JpdGVGaWxlU3luYyhwYXRoICsgXCJfXCIrIHQgKyBcIi5wbmdcIiwgY2FudmFzLnRvQnVmZmVyKCkpO1xuICAgICAgICAgICAgICAgIC8vdmFyIHBhcnNlZCA9IHBuZ3BhcnNlKGNhbnZhcy50b0J1ZmZlcigpKVxuICAgICAgICAgICAgICAgIGVuY29kZXIuYWRkRnJhbWUodGljay5jdHgpO1xuICAgICAgICAgICAgICAgIC8vZW5jb2Rlci5hZGRGcmFtZSh0aWNrLmN0eC5nZXRJbWFnZURhdGEoMCwgMCwgd2lkdGgsIGhlaWdodCkuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7Y29uc29sZS5lcnJvcihcInNhdmU6IG5vdCBzYXZlZFwiLCBwYXRoKTt9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7Y29uc29sZS5sb2coXCJzYXZlOiBzYXZlZFwiLCBwYXRoKTsgZW5jb2Rlci5maW5pc2goKTsvKiBlbmROZXh0ID0gdHJ1ZTsqL31cbiAgICAgICAgKVxuICAgIH0pO1xufVxuXG5cbi8vd2Ugd2lsbCBkcmF3XG4vLyBFWFBMT0RJTkcgU0hJUFxuLy8xLiBuIHBpZWNlcyBvZiBkZWJyaXMgZmx5aW5nIG91dHdhcmRzIChsaW5lYXIgbW92ZW1lbnQgaW4gdGltZSBvZiBEZWJyaXMgZnJvbSA1MCw1MCB0byBybmQsIHJuZCwgYXQgdmVsb2NpdHkgdilcbi8vMi4gZXhwbG9zaW9uIG9mIGRlYnJpcyAobGFzdCBwb3NpdGlvbiBvZiBkZWJyaXMgc3Bhd25zIGV4cGxvc2lvblxuLy8zLiBsYXJnZSBleHBsb3Npb24gYXQgY2VudGVyICg1MCw1MCkgYXQgZW5kIG9mIGxpbmVhciBtb3ZlbWVudFxudmFyIENFTlRSRSA9IHBvaW50KDUwLDUwKTtcbnZhciBUTCA9IHBvaW50KDUwLDUwKTtcbnZhciBCUiA9IHBvaW50KDUwLDUwKTtcbnZhciB0OiBudW1iZXIgPSAwO1xudmFyIG46IG51bWJlciA9IDA7XG5cbnZhciBnYXVzc2lhbjogTnVtYmVyU3RyZWFtO1xudmFyIHNwbGF0dGVyOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0gPSBzY2FsZV94KDMsIGdhdXNzaWFuKTtcblxuZnVuY3Rpb24gZHJhd0RlYnJpcygpOiBBbmltYXRpb24ge3JldHVybiBudWxsO31cbmZ1bmN0aW9uIGRyYXdFeHBsb3Npb24oKTogQW5pbWF0aW9uIHtyZXR1cm4gbnVsbDt9XG5mdW5jdGlvbiBkcmF3QmlnRXhwbG9zaW9uKCk6IEFuaW1hdGlvbiB7cmV0dXJuIG51bGw7fVxuXG4vL1doYXQgZG8gd2Ugd2FudCBpdCB0byBsb29rIGxpa2VcblxuXG4vL3RvZG9cbi8vIElOVkVTVCBJTiBCVUlMRCBBTkQgVEVTVElOR1xuXG4vLyBmaXggdGltZVxuLy8gdGhlbiBhbmQgbG9vcCByZXNldHMgdGltZSBlYWNoIHVzZT9cbi8vIGV4YW1wbGUgaW4gbG9vcD8gc2VlIHVuY29tbWVudGluZyBleGFtcGxlMlxuXG4vL2VtaXR0ZXJcbi8vcmFuZCBub3JtYWxcblxuXG4vL2FuaW1hdG9yLnBsYXkoXG4vLyAgICAvL2Nsb25lIGlzIGEgcGFycmFsbGVsIGV4ZWN1dGlvbiB0aGUgc2FtZSBhbmltYXRpb25cbi8vICAgIHBhcmFsbGVsKFtjbG9uZShuLCBsaW5lYXJfdHdlZW4oLypmaXhlZCBwb2ludCovQ0VOVFJFLFxuLy8gICAgICAgICAgICAgICAgICAgLypnZW5lcmF0aXZlIHBvaW50Ki8gcG9pbnQoc3BsYXR0ZXIsIHNwbGF0dGVyKSxcbi8vICAgICAgICAgICAgICAgICAgIC8qdGltZSovIHQsXG4vLyAgICAgICAgICAgICAgICAgICAvKmRyYXcgZm4gZm9yIHR3ZWVuKi8gc3RvcmVUeChcIlhcIiwgZHJhd0RlYnJpcygpKSlcbi8vICAgICAgICAgICAgICAgIC50aGVuKGxvYWRUeChcIlhcIiwgZHJhd0V4cGxvc2lvbigpKSkgLy9hZnRlciB0aGUgdHdlZW4gY29tcGxldGVzIGRyYXcgdGhlIGV4cGxvc2lvblxuLy8gICAgICAgICAgICAgICksXG4vLyAgICAgICAgICAgICAgdGFrZSgvKmZpeGVkIHZhbHVlKi8gdCkudGhlbihkcmF3QmlnRXhwbG9zaW9uKCkpXG4vLyAgICAgICAgICAgICBdKVxuLy8pO1xuXG5cbi8vIElERUFTXG5cbi8vIFBhY01hblxuLy8gd2hhdCBhYm91dCBhIGRpZmZlcmVudCB3YXkgb2YgbWFraW5nIGdsb3c/XG4vLyByZW5kZXIgbHVtaW5lY2VuY2UgaW50byBhIHRleHR1cmUgYW5kIHRoZW4gY29sb3IgYmFzZWQgb24gZGlzdGFuY2UgZnJvbSBsaWdodHNvdXJjZVxuLy8gbW91c2UgaW5wdXQsIHRhaWxpbmcgZ2xvdyAocmVtYmVyIHRvIHR3ZWVuIGJldHdlZW4gcmFwaWQgbW92ZW1lbnRzKVxuLy8gb2Zmc2NyZWVuIHJlbmRlcmluZyBhbiBwbGF5YmFja1xuLy8gc2luIHdhdmUsIHJhbmRvbWl6ZWRcbi8vIEdVSSBjb21wb25lbnRzLCByZXNwb25zaXZlLCBib290c3RyYXBcbi8vIGdldCBkYXRhIG91dCBieSB0YXBwaW5nIGludG8gZmxvdyAoaW50ZXJjZXB0KFN1YmplY3QgcGFzc2JhY2spKVxuLy8gU1ZHIGltcG9ydFxuLy8gbGF5ZXJpbmcgd2l0aCBwYXJyYWxsZWwgKGJhY2sgZmlyc3QpXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=