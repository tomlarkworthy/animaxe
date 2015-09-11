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
exports.DEBUG_LOOP = false;
exports.DEBUG_THEN = false;
var DrawTick = (function () {
    function DrawTick(ctx, clock, dt) {
        this.ctx = ctx;
        this.clock = clock;
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
    Animation.prototype.attach = function (upstream) {
        var self = this;
        //console.log("animation initialized ", clock);
        var instream = null;
        if (this.predecessors == null) {
            instream = upstream;
        }
        else {
            // if we have dependant parameters we update their clock before attaching
            instream = upstream.tap(function (tick) {
                //console.log("animation: sending upstream tick", t);
                //we update params of clock before
                self.predecessors.forEach(function (pred) {
                    pred.upstreamTick(tick.clock);
                });
            });
        }
        //console.log("animation: instream", instream, "upstream", upstream);
        var processed = this._attach(instream);
        return this.after ? this.after.attach(processed) : processed;
    };
    /**
     * delivers events to this first, then when that animation is finished
     * the follower consumers events and the values are used as output, until the follower animation completes
     */
    Animation.prototype.then = function (follower) {
        var self = this;
        return new Animation(function (prev) {
            return Rx.Observable.create(function (observer) {
                var first = new Rx.Subject();
                var second = new Rx.Subject();
                var firstTurn = true;
                var current = first;
                if (exports.DEBUG_THEN)
                    console.log("then: attach");
                var secondAttach = null;
                var firstAttach = self.attach(first.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: first to downstream");
                    observer.onNext(next);
                }, observer.onError.bind(observer), function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: first complete", t);
                    firstTurn = false;
                    secondAttach = follower.attach(second.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                        if (exports.DEBUG_THEN)
                            console.log("then: second to downstream");
                        observer.onNext(next);
                    }, observer.onError.bind(observer), function () {
                        if (exports.DEBUG_THEN)
                            console.log("then: second complete");
                        observer.onCompleted();
                    });
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
            var tick = new DrawTick(self.ctx, self.t, dt);
            self.t += dt;
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
        var doAnimation = animation.attach(saveBeforeFrame);
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
/**
 * NOTE: currently fails if the streams are different lengths
 * @param assertDt the expected clock tick values
 * @param after
 * @returns {Animation}
 */
function assertDt(expectedDt, after) {
    return new Animation(function (upstream) {
        return upstream.zip(expectedDt, function (tick, expectedDtValue) {
            if (tick.dt != expectedDtValue)
                throw new Error("unexpected dt observed: " + tick.dt + ", expected:" + expectedDtValue);
            return tick;
        });
    }, after);
}
exports.assertDt = assertDt;
//todo would be nice if this took an iterable or some other type of simple pull stream
function assertClock(assertClock, after) {
    var error = null;
    var tester = new IterableStateful(0, [], function (clock, index) {
        console.log("assertClock: tick", clock);
        if (clock < assertClock[index] - 0.00001 || clock > assertClock[index] + 0.00001)
            error = "unexpected clock observed: " + clock + ", expected:" + assertClock[index];
        return index + 1;
    }, function (index) {
        return null; //we don't need a value
    });
    return new Animation(function (upstream) {
        return upstream.tapOnNext(function () {
            console.log("assertClock error", error);
            if (error)
                throw new Error(error);
        });
    }, after, [tester]);
}
exports.assertClock = assertClock;
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
                loopSubscription = animation.attach(loopStart).subscribe(function (next) {
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
// fix then
// test case shows time is reset
// emitter
// rand normal
// animator.play(
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiRHJhd1RpY2siLCJEcmF3VGljay5jb25zdHJ1Y3RvciIsInN0YWNrVHJhY2UiLCJJdGVyYWJsZSIsIkl0ZXJhYmxlLmNvbnN0cnVjdG9yIiwiSXRlcmFibGUudXBzdHJlYW1UaWNrIiwiSXRlcmFibGUubmV4dCIsIkl0ZXJhYmxlLm1hcCIsIkl0ZXJhYmxlLmNsb25lIiwiSXRlcmFibGVTdGF0ZWZ1bCIsIkl0ZXJhYmxlU3RhdGVmdWwuY29uc3RydWN0b3IiLCJJdGVyYWJsZVN0YXRlZnVsLnVwc3RyZWFtVGljayIsIkZpeGVkIiwiRml4ZWQuY29uc3RydWN0b3IiLCJ0b1N0cmVhbU51bWJlciIsInRvU3RyZWFtUG9pbnQiLCJ0b1N0cmVhbUNvbG9yIiwiQW5pbWF0aW9uIiwiQW5pbWF0aW9uLmNvbnN0cnVjdG9yIiwiQW5pbWF0aW9uLmF0dGFjaCIsIkFuaW1hdGlvbi50aGVuIiwiQW5pbWF0b3IiLCJBbmltYXRvci5jb25zdHJ1Y3RvciIsIkFuaW1hdG9yLnRpY2tlciIsIkFuaW1hdG9yLnBsYXkiLCJBbmltYXRvci5jbG9jayIsInBvaW50IiwiY29sb3IiLCJybmQiLCJhc3NlcnREdCIsImFzc2VydENsb2NrIiwicHJldmlvdXMiLCJzaW4iLCJjb3MiLCJzY2FsZV94Iiwic3RvcmVUeCIsImxvYWRUeCIsImNsb25lIiwicGFyYWxsZWwiLCJzZXF1ZW5jZSIsImxvb3AiLCJhdHRhY2hMb29wIiwiZHJhdyIsIm1vdmUiLCJ2ZWxvY2l0eSIsInR3ZWVuX2xpbmVhciIsInJlY3QiLCJjaGFuZ2VDb2xvciIsIm1hcCIsInRha2UiLCJzYXZlIiwiZHJhd0RlYnJpcyIsImRyYXdFeHBsb3Npb24iLCJkcmF3QmlnRXhwbG9zaW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxBQUVBLDBEQUYwRDtBQUMxRCwyQ0FBMkM7QUFDM0MsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDeEMsSUFB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Q3hDLGtFQUFrRTtBQUNsRSxhQUFhO0FBQ2IsdUNBQXVDIiwiZmlsZSI6ImFuaW1heGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbm9kZV9tb2R1bGVzL3J4L3RzL3J4LmFsbC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9ub2RlLmQudHNcIiAvPlxucmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0JykuaW5zdGFsbCgpO1xuaW1wb3J0IFJ4ID0gcmVxdWlyZShcInJ4XCIpO1xuXG5leHBvcnQgdmFyIERFQlVHX0xPT1AgPSBmYWxzZTtcbmV4cG9ydCB2YXIgREVCVUdfVEhFTiA9IGZhbHNlO1xuXG5leHBvcnQgY2xhc3MgRHJhd1RpY2sge1xuICAgIGNvbnN0cnVjdG9yIChwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHB1YmxpYyBjbG9jazogbnVtYmVyLCBwdWJsaWMgZHQ6IG51bWJlcikge31cbn1cblxuZnVuY3Rpb24gc3RhY2tUcmFjZSgpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG4gICAgcmV0dXJuICg8YW55PmVycikuc3RhY2s7XG59XG5cbmV4cG9ydCBjbGFzcyBJdGVyYWJsZTxWYWx1ZT4ge1xuICAgIHByaXZhdGUgcHJlZGVjZXNzb3JzOiBJdGVyYWJsZTxhbnk+W107XG5cbiAgICAvLyB0cmllZCBpbW11dGFibGUuanMgYnV0IGl0IG9ubHkgc3VwcG9ydHMgMiBkaW1lbnNpb25hYmxlIGl0ZXJhYmxlc1xuICAgIGNvbnN0cnVjdG9yKHByZWRlY2Vzc29yczogSXRlcmFibGU8YW55PltdLCBuZXh0OiAoKSA9PiBWYWx1ZSkge1xuICAgICAgICB0aGlzLnByZWRlY2Vzc29ycyA9IHByZWRlY2Vzc29ycztcbiAgICAgICAgdGhpcy5uZXh0ID0gbmV4dDtcbiAgICB9XG5cbiAgICB1cHN0cmVhbVRpY2sodDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJJdGVyYWJsZTogdXBzdHJlYW1UaWNrXCIsIHQpO1xuICAgICAgICAvLyBmaXJzdCBsZXQgdXBzdHJlYW0gdXBkYXRlIGZpcnN0XG4gICAgICAgIHRoaXMucHJlZGVjZXNzb3JzLmZvckVhY2goZnVuY3Rpb24gKHByZWRlY2Vzc29yKSB7XG4gICAgICAgICAgICBwcmVkZWNlc3Nvci51cHN0cmVhbVRpY2sodCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG5leHQoKTogVmFsdWUge3Rocm93IG5ldyBFcnJvcignVGhpcyBtZXRob2QgaXMgYWJzdHJhY3QnKTt9XG5cbiAgICBtYXA8Vj4oZm46IChWYWx1ZSkgPT4gVik6IEl0ZXJhYmxlPFY+IHtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IEl0ZXJhYmxlKFxuICAgICAgICAgICAgW2Jhc2VdLFxuICAgICAgICAgICAgZnVuY3Rpb24oKTogViB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkl0ZXJhYmxlOiBuZXh0XCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmbihiYXNlLm5leHQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgY2xvbmUoKTogSXRlcmFibGU8VmFsdWU+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwKHggPT4geCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgSXRlcmFibGVTdGF0ZWZ1bDxTdGF0ZSwgVmFsdWU+IGV4dGVuZHMgSXRlcmFibGU8VmFsdWU+e1xuXG4gICAgc3RhdGU6IFN0YXRlO1xuICAgIHByaXZhdGUgdGljazogKHQ6IG51bWJlciwgc3RhdGU6IFN0YXRlKSA9PiBTdGF0ZTtcbiAgICAvLyB0cmllZCBpbW11dGFibGUuanMgYnV0IGl0IG9ubHkgc3VwcG9ydHMgMiBkaW1lbnNpb25hYmxlIGl0ZXJhYmxlc1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBpbml0aWFsOiBTdGF0ZSxcbiAgICAgICAgcHJlZGVjZXNzb3JzOiBJdGVyYWJsZTxhbnk+W10sXG4gICAgICAgIHRpY2s6ICh0OiBudW1iZXIsIHN0YXRlOiBTdGF0ZSkgPT4gU3RhdGUsXG4gICAgICAgIHZhbHVlOiAoc3RhdGU6IFN0YXRlKSA9PiBWYWx1ZSkge1xuXG4gICAgICAgIHN1cGVyKFxuICAgICAgICAgICAgcHJlZGVjZXNzb3JzLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSh0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IGluaXRpYWw7XG4gICAgICAgIHRoaXMudGljayAgPSB0aWNrO1xuICAgIH1cblxuICAgIHVwc3RyZWFtVGljayh0OiBudW1iZXIpIHtcbiAgICAgICAgLy8gZmlyc3QgbGV0IHVwc3RyZWFtIHVwZGF0ZSBmaXJzdFxuICAgICAgICBzdXBlci51cHN0cmVhbVRpY2sodCk7XG4gICAgICAgIC8vIG5vdyBjYWxsIGludGVybmFsIHN0YXRlIGNoYW5nZVxcXG4gICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLnRpY2sodCwgdGhpcy5zdGF0ZSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBUT0RPLCB3ZSBjb3VsZCBtYXAgc3RhdGUgaGVyZSBtYXliZVxuICAgIG1hcDxWPihmbjogKFZhbHVlKSA9PiBWKTogSXRlcmFibGVTdGF0ZWZ1bDxhbnksIFY+IHtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IEl0ZXJhYmxlU3RhdGVmdWwoXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgW2Jhc2VdLFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7fSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCk6IFYge1xuICAgICAgICAgICAgICAgIHJldHVybiBmbihiYXNlLm5leHQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSoqL1xufVxuXG5leHBvcnQgdHlwZSBOdW1iZXJTdHJlYW0gPSBJdGVyYWJsZTxudW1iZXI+O1xuZXhwb3J0IHR5cGUgUG9pbnRTdHJlYW0gPSBJdGVyYWJsZTxQb2ludD47XG5leHBvcnQgdHlwZSBDb2xvclN0cmVhbSA9IEl0ZXJhYmxlPHN0cmluZz47XG5leHBvcnQgdHlwZSBEcmF3U3RyZWFtID0gUnguT2JzZXJ2YWJsZTxEcmF3VGljaz47XG5cbmV4cG9ydCBjbGFzcyBGaXhlZDxUPiBleHRlbmRzIEl0ZXJhYmxlPFQ+IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgdmFsOiBUKSB7XG4gICAgICAgIHN1cGVyKFxuICAgICAgICAgICAgW10sIC8vbm8gZGVwZW5kYW50c1xuICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9TdHJlYW1OdW1iZXIoeDogbnVtYmVyIHwgTnVtYmVyU3RyZWFtKTogTnVtYmVyU3RyZWFtIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdudW1iZXInID8gbmV3IEZpeGVkKHgpOiB4O1xufVxuZXhwb3J0IGZ1bmN0aW9uIHRvU3RyZWFtUG9pbnQoeDogUG9pbnQgfCBQb2ludFN0cmVhbSk6IFBvaW50U3RyZWFtIHtcbiAgICByZXR1cm4gPFBvaW50U3RyZWFtPiAodHlwZW9mICg8YW55PngpLm5leHQgPT09ICdmdW5jdGlvbicgPyB4OiBuZXcgRml4ZWQoeCkpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHRvU3RyZWFtQ29sb3IoeDogc3RyaW5nIHwgQ29sb3JTdHJlYW0pOiBDb2xvclN0cmVhbSB7XG4gICAgcmV0dXJuIDxDb2xvclN0cmVhbT4gKHR5cGVvZiAoPGFueT54KS5uZXh0ID09PSAnZnVuY3Rpb24nID8geDogbmV3IEZpeGVkKHgpKTtcbn1cblxuZXhwb3J0IGNsYXNzIEFuaW1hdGlvbiB7XG4gICAgcHJpdmF0ZSBwcmVkZWNlc3NvcnM6IEl0ZXJhYmxlPGFueT5bXTtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBfYXR0YWNoOiAodXBzdHJlYW06IERyYXdTdHJlYW0pID0+IERyYXdTdHJlYW0sIHB1YmxpYyBhZnRlcj86IEFuaW1hdGlvbiwgcHJlZGVjZXNzb3JzPzogSXRlcmFibGU8YW55PltdKSB7XG4gICAgICAgIHRoaXMucHJlZGVjZXNzb3JzID0gcHJlZGVjZXNzb3JzXG4gICAgfVxuICAgIGF0dGFjaCh1cHN0cmVhbTogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJhbmltYXRpb24gaW5pdGlhbGl6ZWQgXCIsIGNsb2NrKTtcblxuICAgICAgICB2YXIgaW5zdHJlYW0gPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5wcmVkZWNlc3NvcnMgPT0gbnVsbCkge1xuICAgICAgICAgICAgaW5zdHJlYW0gPSB1cHN0cmVhbTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGlmIHdlIGhhdmUgZGVwZW5kYW50IHBhcmFtZXRlcnMgd2UgdXBkYXRlIHRoZWlyIGNsb2NrIGJlZm9yZSBhdHRhY2hpbmdcbiAgICAgICAgICAgIGluc3RyZWFtID0gdXBzdHJlYW0udGFwKGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJhbmltYXRpb246IHNlbmRpbmcgdXBzdHJlYW0gdGlja1wiLCB0KTtcbiAgICAgICAgICAgICAgICAvL3dlIHVwZGF0ZSBwYXJhbXMgb2YgY2xvY2sgYmVmb3JlXG4gICAgICAgICAgICAgICAgc2VsZi5wcmVkZWNlc3NvcnMuZm9yRWFjaChmdW5jdGlvbihwcmVkKXtcbiAgICAgICAgICAgICAgICAgICAgcHJlZC51cHN0cmVhbVRpY2sodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiYW5pbWF0aW9uOiBpbnN0cmVhbVwiLCBpbnN0cmVhbSwgXCJ1cHN0cmVhbVwiLCB1cHN0cmVhbSk7XG4gICAgICAgIHZhciBwcm9jZXNzZWQgPSB0aGlzLl9hdHRhY2goaW5zdHJlYW0pO1xuICAgICAgICByZXR1cm4gdGhpcy5hZnRlcj8gdGhpcy5hZnRlci5hdHRhY2gocHJvY2Vzc2VkKTogcHJvY2Vzc2VkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBkZWxpdmVycyBldmVudHMgdG8gdGhpcyBmaXJzdCwgdGhlbiB3aGVuIHRoYXQgYW5pbWF0aW9uIGlzIGZpbmlzaGVkXG4gICAgICogdGhlIGZvbGxvd2VyIGNvbnN1bWVycyBldmVudHMgYW5kIHRoZSB2YWx1ZXMgYXJlIHVzZWQgYXMgb3V0cHV0LCB1bnRpbCB0aGUgZm9sbG93ZXIgYW5pbWF0aW9uIGNvbXBsZXRlc1xuICAgICAqL1xuICAgIHRoZW4oZm9sbG93ZXI6IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSkgOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmNyZWF0ZTxEcmF3VGljaz4oZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ICA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuICAgICAgICAgICAgICAgIHZhciBzZWNvbmQgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcblxuICAgICAgICAgICAgICAgIHZhciBmaXJzdFR1cm4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnQgPSBmaXJzdDtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBhdHRhY2hcIik7XG5cbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kQXR0YWNoID0gbnVsbDtcblxuICAgICAgICAgICAgICAgIHZhciBmaXJzdEF0dGFjaCAgPSBzZWxmLmF0dGFjaChmaXJzdC5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBmaXJzdCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgY29tcGxldGVcIiwgdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFR1cm4gPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vjb25kQXR0YWNoID0gZm9sbG93ZXIuYXR0YWNoKHNlY29uZC5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogc2Vjb25kIHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IuYmluZChvYnNlcnZlciksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogc2Vjb25kIGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkNvbXBsZXRlZCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIHZhciBwcmV2U3Vic2NyaXB0aW9uID0gcHJldi5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHVwc3RyZWFtIHRvIGZpcnN0IE9SIHNlY29uZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaXJzdFR1cm4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdC5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZC5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHVwc3RyZWFtIGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgLy8gb24gZGlzcG9zZVxuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGRpc3Bvc2VyXCIpO1xuICAgICAgICAgICAgICAgICAgICBwcmV2U3Vic2NyaXB0aW9uLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RBdHRhY2guZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZWNvbmRBdHRhY2guZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKTsgLy90b2RvIHJlbW92ZSBzdWJzY3JpYmVPbnNcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQW5pbWF0b3Ige1xuICAgIHRpY2tlclN1YnNjcmlwdGlvbjogUnguRGlzcG9zYWJsZSA9IG51bGw7XG4gICAgcm9vdDogUnguU3ViamVjdDxEcmF3VGljaz47XG4gICAgYW5pbWF0aW9uU3Vic2NyaXB0aW9uczogUnguSURpc3Bvc2FibGVbXSA9IFtdO1xuICAgIHQ6IG51bWJlciA9IDA7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpIHtcbiAgICAgICAgdGhpcy5yb290ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KClcbiAgICB9XG4gICAgdGlja2VyKHRpY2s6IFJ4Lk9ic2VydmFibGU8bnVtYmVyPik6IHZvaWQge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50aWNrZXJTdWJzY3JpcHRpb24gPSB0aWNrLm1hcChmdW5jdGlvbihkdDogbnVtYmVyKSB7IC8vbWFwIHRoZSB0aWNrZXIgb250byBhbnkgLT4gY29udGV4dFxuICAgICAgICAgICAgdmFyIHRpY2sgPSBuZXcgRHJhd1RpY2soc2VsZi5jdHgsIHNlbGYudCwgZHQpO1xuICAgICAgICAgICAgc2VsZi50ICs9IGR0O1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pLnN1YnNjcmliZSh0aGlzLnJvb3QpO1xuICAgIH1cbiAgICBwbGF5IChhbmltYXRpb246IEFuaW1hdGlvbik6IHZvaWQge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IHBsYXlcIik7XG4gICAgICAgIHZhciBzYXZlQmVmb3JlRnJhbWUgPSB0aGlzLnJvb3QudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IHNhdmVcIik7XG4gICAgICAgICAgICB0aWNrLmN0eC5zYXZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZG9BbmltYXRpb24gPSBhbmltYXRpb24uYXR0YWNoKHNhdmVCZWZvcmVGcmFtZSk7XG4gICAgICAgIHZhciByZXN0b3JlQWZ0ZXJGcmFtZSA9IGRvQW5pbWF0aW9uLnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBuZXh0IHJlc3RvcmVcIik7XG4gICAgICAgICAgICAgICAgdGljay5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSxmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBlcnIgcmVzdG9yZVwiKTtcbiAgICAgICAgICAgICAgICBzZWxmLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uU3Vic2NyaXB0aW9ucy5wdXNoKFxuICAgICAgICAgICAgcmVzdG9yZUFmdGVyRnJhbWUuc3Vic2NyaWJlKClcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBjbG9jaygpOiBOdW1iZXJTdHJlYW0ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgSXRlcmFibGUoW10sIGZ1bmN0aW9uKCkge3JldHVybiBzZWxmLnR9KVxuICAgIH1cbn1cblxuZXhwb3J0IHR5cGUgUG9pbnQgPSBbbnVtYmVyLCBudW1iZXJdXG5leHBvcnQgZnVuY3Rpb24gcG9pbnQoXG4gICAgeDogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIHk6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogUG9pbnRTdHJlYW1cbntcbiAgICB2YXIgeF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcih4KTtcbiAgICB2YXIgeV9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcih5KTtcblxuICAgIC8vY29uc29sZS5sb2coXCJwb2ludDogaW5pdFwiLCB4X3N0cmVhbSwgeV9zdHJlYW0pO1xuICAgIHJldHVybiBuZXcgSXRlcmFibGUoXG4gICAgICAgIFt4X3N0cmVhbSwgeV9zdHJlYW1dLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQ6IFtudW1iZXIsIG51bWJlcl0gPSBbeF9zdHJlYW0ubmV4dCgpLCB5X3N0cmVhbS5uZXh0KCldO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcInBvaW50OiBuZXh0XCIsIHJlc3VsdCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuLypcbiAgICBSR0IgYmV0d2VlbiAwIGFuZCAyNTVcbiAgICBhIGJldHdlZW4gMCAtIDFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbG9yKFxuICAgIHI6IG51bWJlciB8IE51bWJlclN0cmVhbSxcbiAgICBnOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgYjogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGE6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogQ29sb3JTdHJlYW1cbntcbiAgICB2YXIgcl9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihyKTtcbiAgICB2YXIgZ19zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihnKTtcbiAgICB2YXIgYl9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihiKTtcbiAgICB2YXIgYV9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihhKTtcbiAgICByZXR1cm4gbmV3IEl0ZXJhYmxlKFxuICAgICAgICBbcl9zdHJlYW0sIGdfc3RyZWFtLCBiX3N0cmVhbSwgYV9zdHJlYW1dLFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciByID0gTWF0aC5mbG9vcihyX3N0cmVhbS5uZXh0KCkpO1xuICAgICAgICAgICAgdmFyIGcgPSBNYXRoLmZsb29yKGdfc3RyZWFtLm5leHQoKSk7XG4gICAgICAgICAgICB2YXIgYiA9IE1hdGguZmxvb3IoYl9zdHJlYW0ubmV4dCgpKTtcbiAgICAgICAgICAgIHZhciBhID0gTWF0aC5mbG9vcihhX3N0cmVhbS5uZXh0KCkpO1xuICAgICAgICAgICAgcmV0dXJuIFwicmdiKFwiICsgciArIFwiLFwiICsgZyArIFwiLFwiICsgYiArIFwiKVwiO1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJuZCgpOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiBuZXcgSXRlcmFibGUoW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpO1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuLyoqXG4gKiBOT1RFOiBjdXJyZW50bHkgZmFpbHMgaWYgdGhlIHN0cmVhbXMgYXJlIGRpZmZlcmVudCBsZW5ndGhzXG4gKiBAcGFyYW0gYXNzZXJ0RHQgdGhlIGV4cGVjdGVkIGNsb2NrIHRpY2sgdmFsdWVzXG4gKiBAcGFyYW0gYWZ0ZXJcbiAqIEByZXR1cm5zIHtBbmltYXRpb259XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnREdChleHBlY3RlZER0OiBSeC5PYnNlcnZhYmxlPG51bWJlcj4sIGFmdGVyPzogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbih1cHN0cmVhbSkge1xuICAgICAgICByZXR1cm4gdXBzdHJlYW0uemlwKGV4cGVjdGVkRHQsIGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrLCBleHBlY3RlZER0VmFsdWU6IG51bWJlcikge1xuICAgICAgICAgICAgaWYgKHRpY2suZHQgIT0gZXhwZWN0ZWREdFZhbHVlKSB0aHJvdyBuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIGR0IG9ic2VydmVkOiBcIiArIHRpY2suZHQgKyBcIiwgZXhwZWN0ZWQ6XCIgKyBleHBlY3RlZER0VmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pO1xuICAgIH0sIGFmdGVyKTtcbn1cblxuLy90b2RvIHdvdWxkIGJlIG5pY2UgaWYgdGhpcyB0b29rIGFuIGl0ZXJhYmxlIG9yIHNvbWUgb3RoZXIgdHlwZSBvZiBzaW1wbGUgcHVsbCBzdHJlYW1cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRDbG9jayhhc3NlcnRDbG9jazogbnVtYmVyW10sIGFmdGVyPzogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgZXJyb3IgPSBudWxsO1xuICAgIHZhciB0ZXN0ZXIgPSBuZXcgSXRlcmFibGVTdGF0ZWZ1bChcbiAgICAgICAgMCxcbiAgICAgICAgW10sXG4gICAgICAgIGZ1bmN0aW9uKGNsb2NrOiBudW1iZXIsIGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYXNzZXJ0Q2xvY2s6IHRpY2tcIiwgY2xvY2spO1xuICAgICAgICAgICAgaWYgKGNsb2NrIDwgYXNzZXJ0Q2xvY2tbaW5kZXhdIC0gMC4wMDAwMSB8fCBjbG9jayA+IGFzc2VydENsb2NrW2luZGV4XSArIDAuMDAwMDEpXG4gICAgICAgICAgICAgICAgZXJyb3IgPSBcInVuZXhwZWN0ZWQgY2xvY2sgb2JzZXJ2ZWQ6IFwiICsgY2xvY2sgKyBcIiwgZXhwZWN0ZWQ6XCIgKyBhc3NlcnRDbG9ja1tpbmRleF07XG5cbiAgICAgICAgICAgIHJldHVybiBpbmRleCArIDE7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsOyAvL3dlIGRvbid0IG5lZWQgYSB2YWx1ZVxuICAgICAgICB9XG4gICAgKTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHVwc3RyZWFtKSB7XG4gICAgICAgIHJldHVybiB1cHN0cmVhbS50YXBPbk5leHQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFzc2VydENsb2NrIGVycm9yXCIsIGVycm9yKTtcbiAgICAgICAgICAgIGlmIChlcnJvcikgdGhyb3cgbmV3IEVycm9yKGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSwgYWZ0ZXIsIFt0ZXN0ZXJdKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByZXZpb3VzPFQ+KHZhbHVlOiBJdGVyYWJsZTxUPik6IEl0ZXJhYmxlPFQ+IHtcbiAgICByZXR1cm4gbmV3IEl0ZXJhYmxlU3RhdGVmdWw8e2N1cnJlbnRWYWx1ZTpUOyBwcmV2VmFsdWU6VH0sIFQ+IChcbiAgICAgICAge2N1cnJlbnRWYWx1ZTogdmFsdWUubmV4dCgpLCBwcmV2VmFsdWU6IHZhbHVlLm5leHQoKX0sXG4gICAgICAgIFt2YWx1ZV0sXG4gICAgICAgIGZ1bmN0aW9uICh0LCBzdGF0ZSkge1xuICAgICAgICAgICAgdmFyIG5ld1N0YXRlID0gIHtjdXJyZW50VmFsdWU6IHZhbHVlLm5leHQoKSwgcHJldlZhbHVlOiBzdGF0ZS5jdXJyZW50VmFsdWV9O1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwcmV2aW91czogdGljayBcIiwgdCwgc3RhdGUsIFwiLT5cIiwgbmV3U3RhdGUpO1xuICAgICAgICAgICAgcmV0dXJuIG5ld1N0YXRlO1xuICAgICAgICB9LCBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwcmV2aW91czogdmFsdWVcIiwgc3RhdGUucHJldlZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiA8VD5zdGF0ZS5wcmV2VmFsdWU7XG4gICAgICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2luKHBlcmlvZDogbnVtYmVyfCBOdW1iZXJTdHJlYW0pOiBOdW1iZXJTdHJlYW0ge1xuICAgIGNvbnNvbGUubG9nKFwic2luOiBuZXdcIik7XG4gICAgdmFyIHBlcmlvZF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihwZXJpb2QpO1xuXG4gICAgcmV0dXJuIG5ldyBJdGVyYWJsZVN0YXRlZnVsPG51bWJlciwgbnVtYmVyPihcbiAgICAgICAgMCxcbiAgICAgICAgW3BlcmlvZF9zdHJlYW1dLFxuICAgICAgICBmdW5jdGlvbih0LCBzdGF0ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInNpbjogdGlja1wiLCB0KTtcbiAgICAgICAgICAgIHJldHVybiB0O1xuICAgICAgICB9LCBmdW5jdGlvbihzdGF0ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBNYXRoLnNpbihzdGF0ZSAqIChNYXRoLlBJICogMikgLyBwZXJpb2Rfc3RyZWFtLm5leHQoKSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInNpbjogXCIsIHZhbHVlLCBzdGF0ZSk7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNvcyhwZXJpb2Q6IG51bWJlcnwgTnVtYmVyU3RyZWFtKTogTnVtYmVyU3RyZWFtIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiY29zOiBuZXdcIik7XG4gICAgdmFyIHBlcmlvZF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihwZXJpb2QpO1xuXG4gICAgcmV0dXJuIG5ldyBJdGVyYWJsZVN0YXRlZnVsPG51bWJlciwgbnVtYmVyPihcbiAgICAgICAgMCxcbiAgICAgICAgW3BlcmlvZF9zdHJlYW1dLFxuICAgICAgICBmdW5jdGlvbih0LCBzdGF0ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImNvczogdGlja1wiKTtcbiAgICAgICAgICAgIHJldHVybiB0O1xuICAgICAgICB9LCBmdW5jdGlvbihzdGF0ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBNYXRoLmNvcyhzdGF0ZSAqIChNYXRoLlBJICogMikgLyBwZXJpb2Rfc3RyZWFtLm5leHQoKSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImNvczogXCIsIHZhbHVlLCBzdGF0ZSk7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzY2FsZV94KFxuICAgIHNjYWxlOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgeDogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG4pOiBudW1iZXIgfCBOdW1iZXJTdHJlYW1cbnsgcmV0dXJuIDA7fVxuXG5mdW5jdGlvbiBzdG9yZVR4KFxuICAgIG46IHN0cmluZywgLypwYXNzIHRob3VnaCBjb250ZXh0IGJ1dCBzdG9yZSB0cmFuc2Zvcm0gaW4gdmFyaWFibGUqL1xuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8vcGFzc3Rocm91Z2hcbik6IEFuaW1hdGlvblxueyByZXR1cm4gbnVsbDt9XG5cbmZ1bmN0aW9uIGxvYWRUeChcbiAgICBuOiBzdHJpbmcsIC8qcGFzcyB0aG91Z2ggY29udGV4dCBidXQgc3RvcmUgdHJhbnNmb3JtIGluIHZhcmlhYmxlKi9cbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvL3Bhc3N0aHJvdWdoXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBjbG9uZShcbiAgICBuOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb24gLyogY29waWVzICovXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBwYXJhbGxlbCggLy9yZW5hbWUgbGF5ZXI/XG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuZnVuY3Rpb24gc2VxdWVuY2UoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuZXhwb3J0IGZ1bmN0aW9uIGxvb3AoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGluaXRpYWxpemluZ1wiKTtcblxuXG4gICAgICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmNyZWF0ZTxEcmF3VGljaz4oZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGNyZWF0ZSBuZXcgbG9vcFwiKTtcbiAgICAgICAgICAgIHZhciBsb29wU3RhcnQgPSBudWxsO1xuICAgICAgICAgICAgdmFyIGxvb3BTdWJzY3JpcHRpb24gPSBudWxsO1xuICAgICAgICAgICAgdmFyIHQgPSAwO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBhdHRhY2hMb29wKG5leHQpIHsgLy90b2RvIEkgZmVlbCBsaWtlIHdlIGNhbiByZW1vdmUgYSBsZXZlbCBmcm9tIHRoaXMgc29tZWhvd1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIHN0YXJ0aW5nIGF0XCIsIHQpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN0YXJ0ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICBsb29wU3Vic2NyaXB0aW9uID0gYW5pbWF0aW9uLmF0dGFjaChsb29wU3RhcnQpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIGVyciB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgY29tcGxldGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbmV3IGlubmVyIGxvb3AgZmluaXNoZWQgY29uc3RydWN0aW9uXCIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByZXYuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvb3BTdGFydCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBubyBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTG9vcChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSB0byBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnQub25OZXh0KG5leHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHQgKz0gbmV4dC5kdDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHVwc3RyZWFtIGVycm9yIHRvIGRvd25zdHJlYW1cIiwgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQuYmluZChvYnNlcnZlcilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvL2Rpc3Bvc2VcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBkaXNwb3NlXCIpO1xuICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQpIGxvb3BTdGFydC5kaXNwb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJhdyhcbiAgICBmbjogKHRpY2s6IERyYXdUaWNrKSA9PiB2b2lkLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvbixcbiAgICBwcmVkZWNlc3NvcnM/OiBJdGVyYWJsZTxhbnk+W11cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2aW91czogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICByZXR1cm4gcHJldmlvdXMudGFwT25OZXh0KGZuKTtcbiAgICB9LCBhbmltYXRpb24sIHByZWRlY2Vzc29ycyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3ZlKFxuICAgIGRlbHRhOiBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICBjb25zb2xlLmxvZyhcIm1vdmU6IGF0dGFjaGVkXCIpO1xuICAgIHZhciBwb2ludFN0cmVhbTogUG9pbnRTdHJlYW0gPSB0b1N0cmVhbVBvaW50KGRlbHRhKTtcbiAgICByZXR1cm4gZHJhdyhmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgIHZhciBwb2ludCA9IHBvaW50U3RyZWFtLm5leHQoKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJtb3ZlOlwiLCBwb2ludCk7XG4gICAgICAgIGlmICh0aWNrKVxuICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKDEsIDAsIDAsIDEsIHBvaW50WzBdLCBwb2ludFsxXSk7XG4gICAgICAgIHJldHVybiB0aWNrO1xuICAgIH0sIGFuaW1hdGlvbiwgW3BvaW50U3RyZWFtXSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2ZWxvY2l0eShcbiAgICB2ZWxvY2l0eTogUG9pbnQgfCBQb2ludFN0cmVhbSxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgdmFyIHZlbG9jaXR5U3RyZWFtOiBQb2ludFN0cmVhbSA9IHRvU3RyZWFtUG9pbnQodmVsb2NpdHkpO1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHBvczogUG9pbnQgPSBbMC4wLDAuMF07XG4gICAgICAgIHJldHVybiBwcmV2Lm1hcChmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICB2YXIgdmVsb2NpdHkgPSB2ZWxvY2l0eVN0cmVhbS5uZXh0KCk7XG4gICAgICAgICAgICBwb3NbMF0gKz0gdmVsb2NpdHlbMF0gKiB0aWNrLmR0O1xuICAgICAgICAgICAgcG9zWzFdICs9IHZlbG9jaXR5WzFdICogdGljay5kdDtcbiAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCBwb3NbMF0sIHBvc1sxXSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSk7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR3ZWVuX2xpbmVhcihcbiAgICBmcm9tOiBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIHRvOiAgIFBvaW50IHwgUG9pbnRTdHJlYW0sXG4gICAgdGltZTogbnVtYmVyLFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8qIGNvcGllcyAqL1xuKTogQW5pbWF0aW9uXG57XG4gICAgdmFyIGZyb21fc3RyZWFtID0gdG9TdHJlYW1Qb2ludChmcm9tKTtcbiAgICB2YXIgdG9fc3RyZWFtID0gdG9TdHJlYW1Qb2ludCh0byk7XG4gICAgdmFyIHNjYWxlID0gMS4wIC8gdGltZTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICByZXR1cm4gcHJldi5tYXAoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidHdlZW46IGlubmVyXCIpO1xuICAgICAgICAgICAgdmFyIGZyb20gPSBmcm9tX3N0cmVhbS5uZXh0KCk7XG4gICAgICAgICAgICB2YXIgdG8gICA9IHRvX3N0cmVhbS5uZXh0KCk7XG5cbiAgICAgICAgICAgIHQgPSB0ICsgdGljay5kdDtcbiAgICAgICAgICAgIGlmICh0ID4gdGltZSkgdCA9IHRpbWU7XG4gICAgICAgICAgICB2YXIgeCA9IGZyb21bMF0gKyAodG9bMF0gLSBmcm9tWzBdKSAqIHQgKiBzY2FsZTtcbiAgICAgICAgICAgIHZhciB5ID0gZnJvbVsxXSArICh0b1sxXSAtIGZyb21bMV0pICogdCAqIHNjYWxlO1xuICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKDEsIDAsIDAsIDEsIHgsIHkpO1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pLnRha2VXaGlsZShmdW5jdGlvbih0aWNrKSB7cmV0dXJuIHQgPCB0aW1lO30pXG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlY3QoXG4gICAgcDE6IFBvaW50LCAvL3RvZG8gZHluYW1pYyBwYXJhbXMgaW5zdGVhZFxuICAgIHAyOiBQb2ludCwgLy90b2RvIGR5bmFtaWMgcGFyYW1zIGluc3RlYWRcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVjdDogZmlsbFJlY3RcIik7XG4gICAgICAgIHRpY2suY3R4LmZpbGxSZWN0KHAxWzBdLCBwMVsxXSwgcDJbMF0sIHAyWzFdKTsgLy90b2RvIG9ic2VydmVyIHN0cmVhbSBpZiBuZWNpc3NhcnlcbiAgICB9LCBhbmltYXRpb24pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNoYW5nZUNvbG9yKFxuICAgIGNvbG9yOiBzdHJpbmcsIC8vdG9kb1xuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhmdW5jdGlvbiAodGljazogRHJhd1RpY2spIHtcbiAgICAgICAgdGljay5jdHguZmlsbFN0eWxlID0gY29sb3I7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZnVuY3Rpb24gbWFwKFxuICAgIG1hcF9mbjogKHByZXY6IERyYXdUaWNrKSA9PiBEcmF3VGljayxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXZpb3VzOiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy5tYXAobWFwX2ZuKVxuICAgIH0sIGFuaW1hdGlvbilcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRha2UoXG4gICAgaXRlcmF0aW9uczogbnVtYmVyLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24ocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICByZXR1cm4gcHJldi50YWtlKGl0ZXJhdGlvbnMpO1xuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmUod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyLCBwYXRoOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgIHZhciBHSUZFbmNvZGVyID0gcmVxdWlyZSgnZ2lmZW5jb2RlcicpO1xuICAgIHZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cblxuICAgIHZhciBlbmNvZGVyID0gbmV3IEdJRkVuY29kZXIod2lkdGgsIGhlaWdodCk7XG4gICAgZW5jb2Rlci5jcmVhdGVSZWFkU3RyZWFtKClcbiAgICAgIC5waXBlKGVuY29kZXIuY3JlYXRlV3JpdGVTdHJlYW0oeyByZXBlYXQ6IDEwMDAwLCBkZWxheTogMTAwLCBxdWFsaXR5OiAxIH0pKVxuICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ocGF0aCkpO1xuICAgIGVuY29kZXIuc3RhcnQoKTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwYXJlbnQ6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICB2YXIgZW5kTmV4dCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gcGFyZW50LnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzYXZlOiB3cm90ZSBmcmFtZVwiKTtcbiAgICAgICAgICAgICAgICAvL3QgKz0gdGljay5kdDtcbiAgICAgICAgICAgICAgICAvL3ZhciBvdXQgPSBmcy53cml0ZUZpbGVTeW5jKHBhdGggKyBcIl9cIisgdCArIFwiLnBuZ1wiLCBjYW52YXMudG9CdWZmZXIoKSk7XG4gICAgICAgICAgICAgICAgLy92YXIgcGFyc2VkID0gcG5ncGFyc2UoY2FudmFzLnRvQnVmZmVyKCkpXG4gICAgICAgICAgICAgICAgZW5jb2Rlci5hZGRGcmFtZSh0aWNrLmN0eCk7XG4gICAgICAgICAgICAgICAgLy9lbmNvZGVyLmFkZEZyYW1lKHRpY2suY3R4LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmVycm9yKFwic2F2ZTogbm90IHNhdmVkXCIsIHBhdGgpO30sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmxvZyhcInNhdmU6IHNhdmVkXCIsIHBhdGgpOyBlbmNvZGVyLmZpbmlzaCgpOy8qIGVuZE5leHQgPSB0cnVlOyovfVxuICAgICAgICApXG4gICAgfSk7XG59XG5cblxuLy93ZSB3aWxsIGRyYXdcbi8vIEVYUExPRElORyBTSElQXG4vLzEuIG4gcGllY2VzIG9mIGRlYnJpcyBmbHlpbmcgb3V0d2FyZHMgKGxpbmVhciBtb3ZlbWVudCBpbiB0aW1lIG9mIERlYnJpcyBmcm9tIDUwLDUwIHRvIHJuZCwgcm5kLCBhdCB2ZWxvY2l0eSB2KVxuLy8yLiBleHBsb3Npb24gb2YgZGVicmlzIChsYXN0IHBvc2l0aW9uIG9mIGRlYnJpcyBzcGF3bnMgZXhwbG9zaW9uXG4vLzMuIGxhcmdlIGV4cGxvc2lvbiBhdCBjZW50ZXIgKDUwLDUwKSBhdCBlbmQgb2YgbGluZWFyIG1vdmVtZW50XG52YXIgQ0VOVFJFID0gcG9pbnQoNTAsNTApO1xudmFyIFRMID0gcG9pbnQoNTAsNTApO1xudmFyIEJSID0gcG9pbnQoNTAsNTApO1xudmFyIHQ6IG51bWJlciA9IDA7XG52YXIgbjogbnVtYmVyID0gMDtcblxudmFyIGdhdXNzaWFuOiBOdW1iZXJTdHJlYW07XG52YXIgc3BsYXR0ZXI6IG51bWJlciB8IE51bWJlclN0cmVhbSA9IHNjYWxlX3goMywgZ2F1c3NpYW4pO1xuXG5mdW5jdGlvbiBkcmF3RGVicmlzKCk6IEFuaW1hdGlvbiB7cmV0dXJuIG51bGw7fVxuZnVuY3Rpb24gZHJhd0V4cGxvc2lvbigpOiBBbmltYXRpb24ge3JldHVybiBudWxsO31cbmZ1bmN0aW9uIGRyYXdCaWdFeHBsb3Npb24oKTogQW5pbWF0aW9uIHtyZXR1cm4gbnVsbDt9XG5cbi8vV2hhdCBkbyB3ZSB3YW50IGl0IHRvIGxvb2sgbGlrZVxuXG5cbi8vdG9kb1xuLy8gSU5WRVNUIElOIEJVSUxEIEFORCBURVNUSU5HXG5cbi8vIGZpeCB0aGVuXG4vLyB0ZXN0IGNhc2Ugc2hvd3MgdGltZSBpcyByZXNldFxuLy8gZW1pdHRlclxuLy8gcmFuZCBub3JtYWxcblxuXG4vLyBhbmltYXRvci5wbGF5KFxuLy8gICAgLy9jbG9uZSBpcyBhIHBhcnJhbGxlbCBleGVjdXRpb24gdGhlIHNhbWUgYW5pbWF0aW9uXG4vLyAgICBwYXJhbGxlbChbY2xvbmUobiwgbGluZWFyX3R3ZWVuKC8qZml4ZWQgcG9pbnQqL0NFTlRSRSxcbi8vICAgICAgICAgICAgICAgICAgIC8qZ2VuZXJhdGl2ZSBwb2ludCovIHBvaW50KHNwbGF0dGVyLCBzcGxhdHRlciksXG4vLyAgICAgICAgICAgICAgICAgICAvKnRpbWUqLyB0LFxuLy8gICAgICAgICAgICAgICAgICAgLypkcmF3IGZuIGZvciB0d2VlbiovIHN0b3JlVHgoXCJYXCIsIGRyYXdEZWJyaXMoKSkpXG4vLyAgICAgICAgICAgICAgICAudGhlbihsb2FkVHgoXCJYXCIsIGRyYXdFeHBsb3Npb24oKSkpIC8vYWZ0ZXIgdGhlIHR3ZWVuIGNvbXBsZXRlcyBkcmF3IHRoZSBleHBsb3Npb25cbi8vICAgICAgICAgICAgICApLFxuLy8gICAgICAgICAgICAgIHRha2UoLypmaXhlZCB2YWx1ZSovIHQpLnRoZW4oZHJhd0JpZ0V4cGxvc2lvbigpKVxuLy8gICAgICAgICAgICAgXSlcbi8vKTtcblxuXG4vLyBJREVBU1xuXG4vLyBQYWNNYW5cbi8vIHdoYXQgYWJvdXQgYSBkaWZmZXJlbnQgd2F5IG9mIG1ha2luZyBnbG93P1xuLy8gcmVuZGVyIGx1bWluZWNlbmNlIGludG8gYSB0ZXh0dXJlIGFuZCB0aGVuIGNvbG9yIGJhc2VkIG9uIGRpc3RhbmNlIGZyb20gbGlnaHRzb3VyY2Vcbi8vIG1vdXNlIGlucHV0LCB0YWlsaW5nIGdsb3cgKHJlbWJlciB0byB0d2VlbiBiZXR3ZWVuIHJhcGlkIG1vdmVtZW50cylcbi8vIG9mZnNjcmVlbiByZW5kZXJpbmcgYW4gcGxheWJhY2tcbi8vIHNpbiB3YXZlLCByYW5kb21pemVkXG4vLyBHVUkgY29tcG9uZW50cywgcmVzcG9uc2l2ZSwgYm9vdHN0cmFwXG4vLyBnZXQgZGF0YSBvdXQgYnkgdGFwcGluZyBpbnRvIGZsb3cgKGludGVyY2VwdChTdWJqZWN0IHBhc3NiYWNrKSlcbi8vIFNWRyBpbXBvcnRcbi8vIGxheWVyaW5nIHdpdGggcGFycmFsbGVsIChiYWNrIGZpcnN0KVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9