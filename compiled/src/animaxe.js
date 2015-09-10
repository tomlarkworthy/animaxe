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
        if (clock != assertClock[index])
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
// fix then
// test case shows time is reset
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiRHJhd1RpY2siLCJEcmF3VGljay5jb25zdHJ1Y3RvciIsInN0YWNrVHJhY2UiLCJJdGVyYWJsZSIsIkl0ZXJhYmxlLmNvbnN0cnVjdG9yIiwiSXRlcmFibGUudXBzdHJlYW1UaWNrIiwiSXRlcmFibGUubmV4dCIsIkl0ZXJhYmxlLm1hcCIsIkl0ZXJhYmxlLmNsb25lIiwiSXRlcmFibGVTdGF0ZWZ1bCIsIkl0ZXJhYmxlU3RhdGVmdWwuY29uc3RydWN0b3IiLCJJdGVyYWJsZVN0YXRlZnVsLnVwc3RyZWFtVGljayIsIkZpeGVkIiwiRml4ZWQuY29uc3RydWN0b3IiLCJ0b1N0cmVhbU51bWJlciIsInRvU3RyZWFtUG9pbnQiLCJ0b1N0cmVhbUNvbG9yIiwiQW5pbWF0aW9uIiwiQW5pbWF0aW9uLmNvbnN0cnVjdG9yIiwiQW5pbWF0aW9uLmF0dGFjaCIsIkFuaW1hdGlvbi50aGVuIiwiQW5pbWF0b3IiLCJBbmltYXRvci5jb25zdHJ1Y3RvciIsIkFuaW1hdG9yLnRpY2tlciIsIkFuaW1hdG9yLnBsYXkiLCJBbmltYXRvci5jbG9jayIsInBvaW50IiwiY29sb3IiLCJybmQiLCJhc3NlcnREdCIsImFzc2VydENsb2NrIiwicHJldmlvdXMiLCJzaW4iLCJjb3MiLCJzY2FsZV94Iiwic3RvcmVUeCIsImxvYWRUeCIsImNsb25lIiwicGFyYWxsZWwiLCJzZXF1ZW5jZSIsImxvb3AiLCJhdHRhY2hMb29wIiwiZHJhdyIsIm1vdmUiLCJ2ZWxvY2l0eSIsInR3ZWVuX2xpbmVhciIsInJlY3QiLCJjaGFuZ2VDb2xvciIsIm1hcCIsInRha2UiLCJzYXZlIiwiZHJhd0RlYnJpcyIsImRyYXdFeHBsb3Npb24iLCJkcmF3QmlnRXhwbG9zaW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxBQUVBLDBEQUYwRDtBQUMxRCwyQ0FBMkM7QUFDM0MsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDeEMsSUFB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QXNGO0FBQ3RGLHNFQUFzRTtBQUN0RSxrQ0FBa0M7QUFDbEMsdUJBQXVCO0FBQ3ZCLHdDQUF3QztBQUN4QyxrRUFBa0U7QUFDbEUsYUFBYTtBQUNiLHVDQUF1QyIsImZpbGUiOiJhbmltYXhlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL25vZGVfbW9kdWxlcy9yeC90cy9yeC5hbGwuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbmltcG9ydCBSeCA9IHJlcXVpcmUoXCJyeFwiKTtcblxuZXhwb3J0IHZhciBERUJVR19MT09QID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX1RIRU4gPSBmYWxzZTtcblxuXG5leHBvcnQgY2xhc3MgRHJhd1RpY2sge1xuICAgIGNvbnN0cnVjdG9yIChwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHB1YmxpYyBkdDogbnVtYmVyKSB7fVxufVxuXG5mdW5jdGlvbiBzdGFja1RyYWNlKCkge1xuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoKTtcbiAgICByZXR1cm4gKDxhbnk+ZXJyKS5zdGFjaztcbn1cblxuZXhwb3J0IGNsYXNzIEl0ZXJhYmxlPFZhbHVlPiB7XG4gICAgcHJpdmF0ZSBwcmVkZWNlc3NvcnM6IEl0ZXJhYmxlPGFueT5bXTtcblxuICAgIC8vIHRyaWVkIGltbXV0YWJsZS5qcyBidXQgaXQgb25seSBzdXBwb3J0cyAyIGRpbWVuc2lvbmFibGUgaXRlcmFibGVzXG4gICAgY29uc3RydWN0b3IocHJlZGVjZXNzb3JzOiBJdGVyYWJsZTxhbnk+W10sIG5leHQ6ICgpID0+IFZhbHVlKSB7XG4gICAgICAgIHRoaXMucHJlZGVjZXNzb3JzID0gcHJlZGVjZXNzb3JzO1xuICAgICAgICB0aGlzLm5leHQgPSBuZXh0O1xuICAgIH1cblxuICAgIHVwc3RyZWFtVGljayh0OiBudW1iZXIpOiB2b2lkIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkl0ZXJhYmxlOiB1cHN0cmVhbVRpY2tcIiwgdCk7XG4gICAgICAgIC8vIGZpcnN0IGxldCB1cHN0cmVhbSB1cGRhdGUgZmlyc3RcbiAgICAgICAgdGhpcy5wcmVkZWNlc3NvcnMuZm9yRWFjaChmdW5jdGlvbiAocHJlZGVjZXNzb3IpIHtcbiAgICAgICAgICAgIHByZWRlY2Vzc29yLnVwc3RyZWFtVGljayh0KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgbmV4dCgpOiBWYWx1ZSB7dGhyb3cgbmV3IEVycm9yKCdUaGlzIG1ldGhvZCBpcyBhYnN0cmFjdCcpO31cblxuICAgIG1hcDxWPihmbjogKFZhbHVlKSA9PiBWKTogSXRlcmFibGU8Vj4ge1xuICAgICAgICB2YXIgYmFzZSA9IHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgSXRlcmFibGUoXG4gICAgICAgICAgICBbYmFzZV0sXG4gICAgICAgICAgICBmdW5jdGlvbigpOiBWIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiSXRlcmFibGU6IG5leHRcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuKGJhc2UubmV4dCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBjbG9uZSgpOiBJdGVyYWJsZTxWYWx1ZT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5tYXAoeCA9PiB4KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJdGVyYWJsZVN0YXRlZnVsPFN0YXRlLCBWYWx1ZT4gZXh0ZW5kcyBJdGVyYWJsZTxWYWx1ZT57XG5cbiAgICBzdGF0ZTogU3RhdGU7XG4gICAgcHJpdmF0ZSB0aWNrOiAodDogbnVtYmVyLCBzdGF0ZTogU3RhdGUpID0+IFN0YXRlO1xuICAgIC8vIHRyaWVkIGltbXV0YWJsZS5qcyBidXQgaXQgb25seSBzdXBwb3J0cyAyIGRpbWVuc2lvbmFibGUgaXRlcmFibGVzXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGluaXRpYWw6IFN0YXRlLFxuICAgICAgICBwcmVkZWNlc3NvcnM6IEl0ZXJhYmxlPGFueT5bXSxcbiAgICAgICAgdGljazogKHQ6IG51bWJlciwgc3RhdGU6IFN0YXRlKSA9PiBTdGF0ZSxcbiAgICAgICAgdmFsdWU6IChzdGF0ZTogU3RhdGUpID0+IFZhbHVlKSB7XG5cbiAgICAgICAgc3VwZXIoXG4gICAgICAgICAgICBwcmVkZWNlc3NvcnMsXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlKHRoaXMuc3RhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICApXG4gICAgICAgIHRoaXMuc3RhdGUgPSBpbml0aWFsO1xuICAgICAgICB0aGlzLnRpY2sgID0gdGljaztcbiAgICB9XG5cbiAgICB1cHN0cmVhbVRpY2sodDogbnVtYmVyKSB7XG4gICAgICAgIC8vIGZpcnN0IGxldCB1cHN0cmVhbSB1cGRhdGUgZmlyc3RcbiAgICAgICAgc3VwZXIudXBzdHJlYW1UaWNrKHQpO1xuICAgICAgICAvLyBub3cgY2FsbCBpbnRlcm5hbCBzdGF0ZSBjaGFuZ2VcXFxuICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy50aWNrKHQsIHRoaXMuc3RhdGUpO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogVE9ETywgd2UgY291bGQgbWFwIHN0YXRlIGhlcmUgbWF5YmVcbiAgICBtYXA8Vj4oZm46IChWYWx1ZSkgPT4gVik6IEl0ZXJhYmxlU3RhdGVmdWw8YW55LCBWPiB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyYWJsZVN0YXRlZnVsKFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIFtiYXNlXSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge30sXG4gICAgICAgICAgICBmdW5jdGlvbigpOiBWIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4oYmFzZS5uZXh0KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0qKi9cbn1cblxuZXhwb3J0IHR5cGUgTnVtYmVyU3RyZWFtID0gSXRlcmFibGU8bnVtYmVyPjtcbmV4cG9ydCB0eXBlIFBvaW50U3RyZWFtID0gSXRlcmFibGU8UG9pbnQ+O1xuZXhwb3J0IHR5cGUgQ29sb3JTdHJlYW0gPSBJdGVyYWJsZTxzdHJpbmc+O1xuZXhwb3J0IHR5cGUgRHJhd1N0cmVhbSA9IFJ4Lk9ic2VydmFibGU8RHJhd1RpY2s+O1xuXG5leHBvcnQgY2xhc3MgRml4ZWQ8VD4gZXh0ZW5kcyBJdGVyYWJsZTxUPiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHZhbDogVCkge1xuICAgICAgICBzdXBlcihcbiAgICAgICAgICAgIFtdLCAvL25vIGRlcGVuZGFudHNcbiAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvU3RyZWFtTnVtYmVyKHg6IG51bWJlciB8IE51bWJlclN0cmVhbSk6IE51bWJlclN0cmVhbSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnbnVtYmVyJyA/IG5ldyBGaXhlZCh4KTogeDtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbVBvaW50KHg6IFBvaW50IHwgUG9pbnRTdHJlYW0pOiBQb2ludFN0cmVhbSB7XG4gICAgcmV0dXJuIDxQb2ludFN0cmVhbT4gKHR5cGVvZiAoPGFueT54KS5uZXh0ID09PSAnZnVuY3Rpb24nID8geDogbmV3IEZpeGVkKHgpKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbUNvbG9yKHg6IHN0cmluZyB8IENvbG9yU3RyZWFtKTogQ29sb3JTdHJlYW0ge1xuICAgIHJldHVybiA8Q29sb3JTdHJlYW0+ICh0eXBlb2YgKDxhbnk+eCkubmV4dCA9PT0gJ2Z1bmN0aW9uJyA/IHg6IG5ldyBGaXhlZCh4KSk7XG59XG5cbmV4cG9ydCBjbGFzcyBBbmltYXRpb24ge1xuICAgIHByaXZhdGUgcHJlZGVjZXNzb3JzOiBJdGVyYWJsZTxhbnk+W107XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgX2F0dGFjaDogKHVwc3RyZWFtOiBEcmF3U3RyZWFtKSA9PiBEcmF3U3RyZWFtLCBwdWJsaWMgYWZ0ZXI/OiBBbmltYXRpb24sIHByZWRlY2Vzc29ycz86IEl0ZXJhYmxlPGFueT5bXSkge1xuICAgICAgICB0aGlzLnByZWRlY2Vzc29ycyA9IHByZWRlY2Vzc29yc1xuICAgIH1cbiAgICBhdHRhY2goY2xvY2s6IG51bWJlciwgdXBzdHJlYW06IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgdCA9IGNsb2NrO1xuXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJhbmltYXRpb24gaW5pdGlhbGl6ZWQgXCIsIGNsb2NrKTtcblxuICAgICAgICB2YXIgaW5zdHJlYW0gPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5wcmVkZWNlc3NvcnMgPT0gbnVsbCkge1xuICAgICAgICAgICAgaW5zdHJlYW0gPSB1cHN0cmVhbTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGlmIHdlIGhhdmUgZGVwZW5kYW50IHBhcmFtZXRlcnMgd2UgdXBkYXRlIHRoZWlyIGNsb2NrIGJlZm9yZSBhdHRhY2hpbmdcbiAgICAgICAgICAgIGluc3RyZWFtID0gdXBzdHJlYW0udGFwKGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJhbmltYXRpb246IHNlbmRpbmcgdXBzdHJlYW0gdGlja1wiLCB0KTtcbiAgICAgICAgICAgICAgICAvL3dlIHVwZGF0ZSBwYXJhbXMgb2YgY2xvY2sgYmVmb3JlXG4gICAgICAgICAgICAgICAgc2VsZi5wcmVkZWNlc3NvcnMuZm9yRWFjaChmdW5jdGlvbihwcmVkKXtcbiAgICAgICAgICAgICAgICAgICAgcHJlZC51cHN0cmVhbVRpY2sodCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdCArPSB0aWNrLmR0O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImFuaW1hdGlvbjogaW5zdHJlYW1cIiwgaW5zdHJlYW0sIFwidXBzdHJlYW1cIiwgdXBzdHJlYW0pO1xuICAgICAgICB2YXIgcHJvY2Vzc2VkID0gdGhpcy5fYXR0YWNoKGluc3RyZWFtKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWZ0ZXI/IHRoaXMuYWZ0ZXIuYXR0YWNoKHQsIHByb2Nlc3NlZCk6IHByb2Nlc3NlZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogZGVsaXZlcnMgZXZlbnRzIHRvIHRoaXMgZmlyc3QsIHRoZW4gd2hlbiB0aGF0IGFuaW1hdGlvbiBpcyBmaW5pc2hlZFxuICAgICAqIHRoZSBmb2xsb3dlciBjb25zdW1lcnMgZXZlbnRzIGFuZCB0aGUgdmFsdWVzIGFyZSB1c2VkIGFzIG91dHB1dCwgdW50aWwgdGhlIGZvbGxvd2VyIGFuaW1hdGlvbiBjb21wbGV0ZXNcbiAgICAgKi9cbiAgICB0aGVuKGZvbGxvd2VyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IERyYXdTdHJlYW0pIDogRHJhd1N0cmVhbSB7XG5cbiAgICAgICAgICAgIHZhciB0ID0gMDtcblxuICAgICAgICAgICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuY3JlYXRlPERyYXdUaWNrPihmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3QgID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0VHVybiA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudCA9IGZpcnN0O1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGF0dGFjaFwiKTtcblxuICAgICAgICAgICAgICAgIHZhciBmaXJzdEF0dGFjaCAgPSBzZWxmLmF0dGFjaCh0LCBmaXJzdC5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBmaXJzdCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgY29tcGxldGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFR1cm4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgLy90b2RvIHNlY29uZCBhdHRhY2ggaXMgemVyb2VkIGluIHRpbWVcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kQXR0YWNoID0gZm9sbG93ZXIuYXR0YWNoKHQsIHNlY29uZC5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBzZWNvbmQgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKClcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIHZhciBwcmV2U3Vic2NyaXB0aW9uID0gcHJldi5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHVwc3RyZWFtIHRvIGZpcnN0IE9SIHNlY29uZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaXJzdFR1cm4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdC5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZC5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0ICs9IG5leHQuZHQ7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHVwc3RyZWFtIGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgLy8gb24gZGlzcG9zZVxuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGRpc3Bvc2VyXCIpO1xuICAgICAgICAgICAgICAgICAgICBwcmV2U3Vic2NyaXB0aW9uLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RBdHRhY2guZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBzZWNvbmRBdHRhY2guZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKTsgLy90b2RvIHJlbW92ZSBzdWJzY3JpYmVPbnNcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQW5pbWF0b3Ige1xuICAgIHRpY2tlclN1YnNjcmlwdGlvbjogUnguRGlzcG9zYWJsZSA9IG51bGw7XG4gICAgcm9vdDogUnguU3ViamVjdDxEcmF3VGljaz47XG4gICAgYW5pbWF0aW9uU3Vic2NyaXB0aW9uczogUnguSURpc3Bvc2FibGVbXSA9IFtdO1xuICAgIHQ6IG51bWJlciA9IDA7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpIHtcbiAgICAgICAgdGhpcy5yb290ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KClcbiAgICB9XG4gICAgdGlja2VyKHRpY2s6IFJ4Lk9ic2VydmFibGU8bnVtYmVyPik6IHZvaWQge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50aWNrZXJTdWJzY3JpcHRpb24gPSB0aWNrLm1hcChmdW5jdGlvbihkdDogbnVtYmVyKSB7IC8vbWFwIHRoZSB0aWNrZXIgb250byBhbnkgLT4gY29udGV4dFxuICAgICAgICAgICAgc2VsZi50ICs9IGR0O1xuICAgICAgICAgICAgdmFyIHRpY2sgPSBuZXcgRHJhd1RpY2soc2VsZi5jdHgsIGR0KTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KS5zdWJzY3JpYmUodGhpcy5yb290KTtcbiAgICB9XG4gICAgcGxheSAoYW5pbWF0aW9uOiBBbmltYXRpb24pOiB2b2lkIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBwbGF5XCIpO1xuICAgICAgICB2YXIgc2F2ZUJlZm9yZUZyYW1lID0gdGhpcy5yb290LnRhcE9uTmV4dChmdW5jdGlvbih0aWNrKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBzYXZlXCIpO1xuICAgICAgICAgICAgdGljay5jdHguc2F2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRvQW5pbWF0aW9uID0gYW5pbWF0aW9uLmF0dGFjaCgwLCBzYXZlQmVmb3JlRnJhbWUpO1xuICAgICAgICB2YXIgcmVzdG9yZUFmdGVyRnJhbWUgPSBkb0FuaW1hdGlvbi50YXAoXG4gICAgICAgICAgICBmdW5jdGlvbih0aWNrKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggbmV4dCByZXN0b3JlXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0sZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggZXJyIHJlc3RvcmVcIik7XG4gICAgICAgICAgICAgICAgc2VsZi5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSxmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFuaW1hdGlvblN1YnNjcmlwdGlvbnMucHVzaChcbiAgICAgICAgICAgIHJlc3RvcmVBZnRlckZyYW1lLnN1YnNjcmliZSgpXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgY2xvY2soKTogTnVtYmVyU3RyZWFtIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IEl0ZXJhYmxlKFtdLCBmdW5jdGlvbigpIHtyZXR1cm4gc2VsZi50fSlcbiAgICB9XG59XG5cbmV4cG9ydCB0eXBlIFBvaW50ID0gW251bWJlciwgbnVtYmVyXVxuZXhwb3J0IGZ1bmN0aW9uIHBvaW50KFxuICAgIHg6IG51bWJlciB8IE51bWJlclN0cmVhbSxcbiAgICB5OiBudW1iZXIgfCBOdW1iZXJTdHJlYW1cbik6IFBvaW50U3RyZWFtXG57XG4gICAgdmFyIHhfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoeCk7XG4gICAgdmFyIHlfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoeSk7XG5cbiAgICAvL2NvbnNvbGUubG9nKFwicG9pbnQ6IGluaXRcIiwgeF9zdHJlYW0sIHlfc3RyZWFtKTtcbiAgICByZXR1cm4gbmV3IEl0ZXJhYmxlKFxuICAgICAgICBbeF9zdHJlYW0sIHlfc3RyZWFtXSxcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0OiBbbnVtYmVyLCBudW1iZXJdID0gW3hfc3RyZWFtLm5leHQoKSwgeV9zdHJlYW0ubmV4dCgpXTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJwb2ludDogbmV4dFwiLCByZXN1bHQpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qXG4gICAgUkdCIGJldHdlZW4gMCBhbmQgMjU1XG4gICAgYSBiZXR3ZWVuIDAgLSAxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb2xvcihcbiAgICByOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgZzogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGI6IG51bWJlciB8IE51bWJlclN0cmVhbSxcbiAgICBhOiBudW1iZXIgfCBOdW1iZXJTdHJlYW1cbik6IENvbG9yU3RyZWFtXG57XG4gICAgdmFyIHJfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocik7XG4gICAgdmFyIGdfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoZyk7XG4gICAgdmFyIGJfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoYik7XG4gICAgdmFyIGFfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoYSk7XG4gICAgcmV0dXJuIG5ldyBJdGVyYWJsZShcbiAgICAgICAgW3Jfc3RyZWFtLCBnX3N0cmVhbSwgYl9zdHJlYW0sIGFfc3RyZWFtXSxcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgciA9IE1hdGguZmxvb3Iocl9zdHJlYW0ubmV4dCgpKTtcbiAgICAgICAgICAgIHZhciBnID0gTWF0aC5mbG9vcihnX3N0cmVhbS5uZXh0KCkpO1xuICAgICAgICAgICAgdmFyIGIgPSBNYXRoLmZsb29yKGJfc3RyZWFtLm5leHQoKSk7XG4gICAgICAgICAgICB2YXIgYSA9IE1hdGguZmxvb3IoYV9zdHJlYW0ubmV4dCgpKTtcbiAgICAgICAgICAgIHJldHVybiBcInJnYihcIiArIHIgKyBcIixcIiArIGcgKyBcIixcIiArIGIgKyBcIilcIjtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBybmQoKTogTnVtYmVyU3RyZWFtIHtcbiAgICByZXR1cm4gbmV3IEl0ZXJhYmxlKFtdLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qKlxuICogTk9URTogY3VycmVudGx5IGZhaWxzIGlmIHRoZSBzdHJlYW1zIGFyZSBkaWZmZXJlbnQgbGVuZ3Roc1xuICogQHBhcmFtIGFzc2VydER0IHRoZSBleHBlY3RlZCBjbG9jayB0aWNrIHZhbHVlc1xuICogQHBhcmFtIGFmdGVyXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RHQoZXhwZWN0ZWREdDogUnguT2JzZXJ2YWJsZTxudW1iZXI+LCBhZnRlcj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnppcChleHBlY3RlZER0LCBmdW5jdGlvbih0aWNrOiBEcmF3VGljaywgZXhwZWN0ZWREdFZhbHVlOiBudW1iZXIpIHtcbiAgICAgICAgICAgIGlmICh0aWNrLmR0ICE9IGV4cGVjdGVkRHRWYWx1ZSkgdGhyb3cgbmV3IEVycm9yKFwidW5leHBlY3RlZCBkdCBvYnNlcnZlZDogXCIgKyB0aWNrLmR0ICsgXCIsIGV4cGVjdGVkOlwiICsgZXhwZWN0ZWREdFZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KTtcbiAgICB9LCBhZnRlcik7XG59XG5cbi8vdG9kbyB3b3VsZCBiZSBuaWNlIGlmIHRoaXMgdG9vayBhbiBpdGVyYWJsZSBvciBzb21lIG90aGVyIHR5cGUgb2Ygc2ltcGxlIHB1bGwgc3RyZWFtXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Q2xvY2soYXNzZXJ0Q2xvY2s6IG51bWJlcltdLCBhZnRlcj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgdmFyIGVycm9yID0gbnVsbDtcbiAgICB2YXIgdGVzdGVyID0gbmV3IEl0ZXJhYmxlU3RhdGVmdWwoXG4gICAgICAgIDAsXG4gICAgICAgIFtdLFxuICAgICAgICBmdW5jdGlvbihjbG9jazogbnVtYmVyLCBpbmRleDogbnVtYmVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFzc2VydENsb2NrOiB0aWNrXCIsIGNsb2NrKTtcbiAgICAgICAgICAgIGlmIChjbG9jayAhPSBhc3NlcnRDbG9ja1tpbmRleF0pXG4gICAgICAgICAgICAgICAgZXJyb3IgPSBcInVuZXhwZWN0ZWQgY2xvY2sgb2JzZXJ2ZWQ6IFwiICsgY2xvY2sgKyBcIiwgZXhwZWN0ZWQ6XCIgKyBhc3NlcnRDbG9ja1tpbmRleF07XG5cbiAgICAgICAgICAgIHJldHVybiBpbmRleCArIDE7XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uKGluZGV4OiBudW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsOyAvL3dlIGRvbid0IG5lZWQgYSB2YWx1ZVxuICAgICAgICB9XG4gICAgKTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHVwc3RyZWFtKSB7XG4gICAgICAgIHJldHVybiB1cHN0cmVhbS50YXBPbk5leHQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFzc2VydENsb2NrIGVycm9yXCIsIGVycm9yKTtcbiAgICAgICAgICAgIGlmIChlcnJvcikgdGhyb3cgbmV3IEVycm9yKGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSwgYWZ0ZXIsIFt0ZXN0ZXJdKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByZXZpb3VzPFQ+KHZhbHVlOiBJdGVyYWJsZTxUPik6IEl0ZXJhYmxlPFQ+IHtcbiAgICByZXR1cm4gbmV3IEl0ZXJhYmxlU3RhdGVmdWw8e2N1cnJlbnRWYWx1ZTpUOyBwcmV2VmFsdWU6VH0sIFQ+IChcbiAgICAgICAge2N1cnJlbnRWYWx1ZTogdmFsdWUubmV4dCgpLCBwcmV2VmFsdWU6IHZhbHVlLm5leHQoKX0sXG4gICAgICAgIFt2YWx1ZV0sXG4gICAgICAgIGZ1bmN0aW9uICh0LCBzdGF0ZSkge1xuICAgICAgICAgICAgdmFyIG5ld1N0YXRlID0gIHtjdXJyZW50VmFsdWU6IHZhbHVlLm5leHQoKSwgcHJldlZhbHVlOiBzdGF0ZS5jdXJyZW50VmFsdWV9O1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwcmV2aW91czogdGljayBcIiwgdCwgc3RhdGUsIFwiLT5cIiwgbmV3U3RhdGUpO1xuICAgICAgICAgICAgcmV0dXJuIG5ld1N0YXRlO1xuICAgICAgICB9LCBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJwcmV2aW91czogdmFsdWVcIiwgc3RhdGUucHJldlZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiA8VD5zdGF0ZS5wcmV2VmFsdWU7XG4gICAgICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2luKHBlcmlvZDogbnVtYmVyfCBOdW1iZXJTdHJlYW0pOiBOdW1iZXJTdHJlYW0ge1xuICAgIGNvbnNvbGUubG9nKFwic2luOiBuZXdcIik7XG4gICAgdmFyIHBlcmlvZF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihwZXJpb2QpO1xuXG4gICAgcmV0dXJuIG5ldyBJdGVyYWJsZVN0YXRlZnVsPG51bWJlciwgbnVtYmVyPihcbiAgICAgICAgMCxcbiAgICAgICAgW3BlcmlvZF9zdHJlYW1dLFxuICAgICAgICBmdW5jdGlvbih0LCBzdGF0ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInNpbjogdGlja1wiLCB0KTtcbiAgICAgICAgICAgIHJldHVybiB0O1xuICAgICAgICB9LCBmdW5jdGlvbihzdGF0ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBNYXRoLnNpbihzdGF0ZSAqIChNYXRoLlBJICogMikgLyBwZXJpb2Rfc3RyZWFtLm5leHQoKSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInNpbjogXCIsIHZhbHVlLCBzdGF0ZSk7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNvcyhwZXJpb2Q6IG51bWJlcnwgTnVtYmVyU3RyZWFtKTogTnVtYmVyU3RyZWFtIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiY29zOiBuZXdcIik7XG4gICAgdmFyIHBlcmlvZF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihwZXJpb2QpO1xuXG4gICAgcmV0dXJuIG5ldyBJdGVyYWJsZVN0YXRlZnVsPG51bWJlciwgbnVtYmVyPihcbiAgICAgICAgMCxcbiAgICAgICAgW3BlcmlvZF9zdHJlYW1dLFxuICAgICAgICBmdW5jdGlvbih0LCBzdGF0ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImNvczogdGlja1wiKTtcbiAgICAgICAgICAgIHJldHVybiB0O1xuICAgICAgICB9LCBmdW5jdGlvbihzdGF0ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBNYXRoLmNvcyhzdGF0ZSAqIChNYXRoLlBJICogMikgLyBwZXJpb2Rfc3RyZWFtLm5leHQoKSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImNvczogXCIsIHZhbHVlLCBzdGF0ZSk7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzY2FsZV94KFxuICAgIHNjYWxlOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgeDogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG4pOiBudW1iZXIgfCBOdW1iZXJTdHJlYW1cbnsgcmV0dXJuIDA7fVxuXG5mdW5jdGlvbiBzdG9yZVR4KFxuICAgIG46IHN0cmluZywgLypwYXNzIHRob3VnaCBjb250ZXh0IGJ1dCBzdG9yZSB0cmFuc2Zvcm0gaW4gdmFyaWFibGUqL1xuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8vcGFzc3Rocm91Z2hcbik6IEFuaW1hdGlvblxueyByZXR1cm4gbnVsbDt9XG5cbmZ1bmN0aW9uIGxvYWRUeChcbiAgICBuOiBzdHJpbmcsIC8qcGFzcyB0aG91Z2ggY29udGV4dCBidXQgc3RvcmUgdHJhbnNmb3JtIGluIHZhcmlhYmxlKi9cbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvL3Bhc3N0aHJvdWdoXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBjbG9uZShcbiAgICBuOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb24gLyogY29waWVzICovXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBwYXJhbGxlbCggLy9yZW5hbWUgbGF5ZXI/XG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuZnVuY3Rpb24gc2VxdWVuY2UoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuZXhwb3J0IGZ1bmN0aW9uIGxvb3AoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGluaXRpYWxpemluZ1wiKTtcblxuXG4gICAgICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmNyZWF0ZTxEcmF3VGljaz4oZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGNyZWF0ZSBuZXcgbG9vcFwiKTtcbiAgICAgICAgICAgIHZhciBsb29wU3RhcnQgPSBudWxsO1xuICAgICAgICAgICAgdmFyIGxvb3BTdWJzY3JpcHRpb24gPSBudWxsO1xuICAgICAgICAgICAgdmFyIHQgPSAwO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBhdHRhY2hMb29wKG5leHQpIHsgLy90b2RvIEkgZmVlbCBsaWtlIHdlIGNhbiByZW1vdmUgYSBsZXZlbCBmcm9tIHRoaXMgc29tZWhvd1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIHN0YXJ0aW5nIGF0XCIsIHQpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN0YXJ0ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICBsb29wU3Vic2NyaXB0aW9uID0gYW5pbWF0aW9uLmF0dGFjaCh0LCBsb29wU3RhcnQpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIGVyciB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgY29tcGxldGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbmV3IGlubmVyIGxvb3AgZmluaXNoZWQgY29uc3RydWN0aW9uXCIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByZXYuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvb3BTdGFydCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBubyBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTG9vcChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSB0byBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnQub25OZXh0KG5leHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHQgKz0gbmV4dC5kdDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHVwc3RyZWFtIGVycm9yIHRvIGRvd25zdHJlYW1cIiwgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQuYmluZChvYnNlcnZlcilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvL2Rpc3Bvc2VcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBkaXNwb3NlXCIpO1xuICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQpIGxvb3BTdGFydC5kaXNwb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJhdyhcbiAgICBmbjogKHRpY2s6IERyYXdUaWNrKSA9PiB2b2lkLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvbixcbiAgICBwcmVkZWNlc3NvcnM/OiBJdGVyYWJsZTxhbnk+W11cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2aW91czogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICByZXR1cm4gcHJldmlvdXMudGFwT25OZXh0KGZuKTtcbiAgICB9LCBhbmltYXRpb24sIHByZWRlY2Vzc29ycyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3ZlKFxuICAgIGRlbHRhOiBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICBjb25zb2xlLmxvZyhcIm1vdmU6IGF0dGFjaGVkXCIpO1xuICAgIHZhciBwb2ludFN0cmVhbTogUG9pbnRTdHJlYW0gPSB0b1N0cmVhbVBvaW50KGRlbHRhKTtcbiAgICByZXR1cm4gZHJhdyhmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgIHZhciBwb2ludCA9IHBvaW50U3RyZWFtLm5leHQoKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJtb3ZlOlwiLCBwb2ludCk7XG4gICAgICAgIGlmICh0aWNrKVxuICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKDEsIDAsIDAsIDEsIHBvaW50WzBdLCBwb2ludFsxXSk7XG4gICAgICAgIHJldHVybiB0aWNrO1xuICAgIH0sIGFuaW1hdGlvbiwgW3BvaW50U3RyZWFtXSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2ZWxvY2l0eShcbiAgICB2ZWxvY2l0eTogUG9pbnQgfCBQb2ludFN0cmVhbSxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgdmFyIHZlbG9jaXR5U3RyZWFtOiBQb2ludFN0cmVhbSA9IHRvU3RyZWFtUG9pbnQodmVsb2NpdHkpO1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHBvczogUG9pbnQgPSBbMC4wLDAuMF07XG4gICAgICAgIHJldHVybiBwcmV2Lm1hcChmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICB2YXIgdmVsb2NpdHkgPSB2ZWxvY2l0eVN0cmVhbS5uZXh0KCk7XG4gICAgICAgICAgICBwb3NbMF0gKz0gdmVsb2NpdHlbMF0gKiB0aWNrLmR0O1xuICAgICAgICAgICAgcG9zWzFdICs9IHZlbG9jaXR5WzFdICogdGljay5kdDtcbiAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCBwb3NbMF0sIHBvc1sxXSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSk7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR3ZWVuX2xpbmVhcihcbiAgICBmcm9tOiBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIHRvOiAgIFBvaW50IHwgUG9pbnRTdHJlYW0sXG4gICAgdGltZTogbnVtYmVyLFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8qIGNvcGllcyAqL1xuKTogQW5pbWF0aW9uXG57XG4gICAgdmFyIGZyb21fc3RyZWFtID0gdG9TdHJlYW1Qb2ludChmcm9tKTtcbiAgICB2YXIgdG9fc3RyZWFtID0gdG9TdHJlYW1Qb2ludCh0byk7XG4gICAgdmFyIHNjYWxlID0gMS4wIC8gdGltZTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICByZXR1cm4gcHJldi5tYXAoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidHdlZW46IGlubmVyXCIpO1xuICAgICAgICAgICAgdmFyIGZyb20gPSBmcm9tX3N0cmVhbS5uZXh0KCk7XG4gICAgICAgICAgICB2YXIgdG8gICA9IHRvX3N0cmVhbS5uZXh0KCk7XG5cbiAgICAgICAgICAgIHQgPSB0ICsgdGljay5kdDtcbiAgICAgICAgICAgIGlmICh0ID4gdGltZSkgdCA9IHRpbWU7XG4gICAgICAgICAgICB2YXIgeCA9IGZyb21bMF0gKyAodG9bMF0gLSBmcm9tWzBdKSAqIHQgKiBzY2FsZTtcbiAgICAgICAgICAgIHZhciB5ID0gZnJvbVsxXSArICh0b1sxXSAtIGZyb21bMV0pICogdCAqIHNjYWxlO1xuICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKDEsIDAsIDAsIDEsIHgsIHkpO1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pLnRha2VXaGlsZShmdW5jdGlvbih0aWNrKSB7cmV0dXJuIHQgPCB0aW1lO30pXG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlY3QoXG4gICAgcDE6IFBvaW50LCAvL3RvZG8gZHluYW1pYyBwYXJhbXMgaW5zdGVhZFxuICAgIHAyOiBQb2ludCwgLy90b2RvIGR5bmFtaWMgcGFyYW1zIGluc3RlYWRcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVjdDogZmlsbFJlY3RcIik7XG4gICAgICAgIHRpY2suY3R4LmZpbGxSZWN0KHAxWzBdLCBwMVsxXSwgcDJbMF0sIHAyWzFdKTsgLy90b2RvIG9ic2VydmVyIHN0cmVhbSBpZiBuZWNpc3NhcnlcbiAgICB9LCBhbmltYXRpb24pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNoYW5nZUNvbG9yKFxuICAgIGNvbG9yOiBzdHJpbmcsIC8vdG9kb1xuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhmdW5jdGlvbiAodGljazogRHJhd1RpY2spIHtcbiAgICAgICAgdGljay5jdHguZmlsbFN0eWxlID0gY29sb3I7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZnVuY3Rpb24gbWFwKFxuICAgIG1hcF9mbjogKHByZXY6IERyYXdUaWNrKSA9PiBEcmF3VGljayxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXZpb3VzOiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy5tYXAobWFwX2ZuKVxuICAgIH0sIGFuaW1hdGlvbilcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRha2UoXG4gICAgaXRlcmF0aW9uczogbnVtYmVyLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24ocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICByZXR1cm4gcHJldi50YWtlKGl0ZXJhdGlvbnMpO1xuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmUod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyLCBwYXRoOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgIHZhciBHSUZFbmNvZGVyID0gcmVxdWlyZSgnZ2lmZW5jb2RlcicpO1xuICAgIHZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cblxuICAgIHZhciBlbmNvZGVyID0gbmV3IEdJRkVuY29kZXIod2lkdGgsIGhlaWdodCk7XG4gICAgZW5jb2Rlci5jcmVhdGVSZWFkU3RyZWFtKClcbiAgICAgIC5waXBlKGVuY29kZXIuY3JlYXRlV3JpdGVTdHJlYW0oeyByZXBlYXQ6IDEwMDAwLCBkZWxheTogMTAwLCBxdWFsaXR5OiAxIH0pKVxuICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ocGF0aCkpO1xuICAgIGVuY29kZXIuc3RhcnQoKTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwYXJlbnQ6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICB2YXIgZW5kTmV4dCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gcGFyZW50LnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzYXZlOiB3cm90ZSBmcmFtZVwiKTtcbiAgICAgICAgICAgICAgICAvL3QgKz0gdGljay5kdDtcbiAgICAgICAgICAgICAgICAvL3ZhciBvdXQgPSBmcy53cml0ZUZpbGVTeW5jKHBhdGggKyBcIl9cIisgdCArIFwiLnBuZ1wiLCBjYW52YXMudG9CdWZmZXIoKSk7XG4gICAgICAgICAgICAgICAgLy92YXIgcGFyc2VkID0gcG5ncGFyc2UoY2FudmFzLnRvQnVmZmVyKCkpXG4gICAgICAgICAgICAgICAgZW5jb2Rlci5hZGRGcmFtZSh0aWNrLmN0eCk7XG4gICAgICAgICAgICAgICAgLy9lbmNvZGVyLmFkZEZyYW1lKHRpY2suY3R4LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmVycm9yKFwic2F2ZTogbm90IHNhdmVkXCIsIHBhdGgpO30sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmxvZyhcInNhdmU6IHNhdmVkXCIsIHBhdGgpOyBlbmNvZGVyLmZpbmlzaCgpOy8qIGVuZE5leHQgPSB0cnVlOyovfVxuICAgICAgICApXG4gICAgfSk7XG59XG5cblxuLy93ZSB3aWxsIGRyYXdcbi8vIEVYUExPRElORyBTSElQXG4vLzEuIG4gcGllY2VzIG9mIGRlYnJpcyBmbHlpbmcgb3V0d2FyZHMgKGxpbmVhciBtb3ZlbWVudCBpbiB0aW1lIG9mIERlYnJpcyBmcm9tIDUwLDUwIHRvIHJuZCwgcm5kLCBhdCB2ZWxvY2l0eSB2KVxuLy8yLiBleHBsb3Npb24gb2YgZGVicmlzIChsYXN0IHBvc2l0aW9uIG9mIGRlYnJpcyBzcGF3bnMgZXhwbG9zaW9uXG4vLzMuIGxhcmdlIGV4cGxvc2lvbiBhdCBjZW50ZXIgKDUwLDUwKSBhdCBlbmQgb2YgbGluZWFyIG1vdmVtZW50XG52YXIgQ0VOVFJFID0gcG9pbnQoNTAsNTApO1xudmFyIFRMID0gcG9pbnQoNTAsNTApO1xudmFyIEJSID0gcG9pbnQoNTAsNTApO1xudmFyIHQ6IG51bWJlciA9IDA7XG52YXIgbjogbnVtYmVyID0gMDtcblxudmFyIGdhdXNzaWFuOiBOdW1iZXJTdHJlYW07XG52YXIgc3BsYXR0ZXI6IG51bWJlciB8IE51bWJlclN0cmVhbSA9IHNjYWxlX3goMywgZ2F1c3NpYW4pO1xuXG5mdW5jdGlvbiBkcmF3RGVicmlzKCk6IEFuaW1hdGlvbiB7cmV0dXJuIG51bGw7fVxuZnVuY3Rpb24gZHJhd0V4cGxvc2lvbigpOiBBbmltYXRpb24ge3JldHVybiBudWxsO31cbmZ1bmN0aW9uIGRyYXdCaWdFeHBsb3Npb24oKTogQW5pbWF0aW9uIHtyZXR1cm4gbnVsbDt9XG5cbi8vV2hhdCBkbyB3ZSB3YW50IGl0IHRvIGxvb2sgbGlrZVxuXG5cbi8vdG9kb1xuLy8gSU5WRVNUIElOIEJVSUxEIEFORCBURVNUSU5HXG5cbi8vIGZpeCB0aGVuXG4vLyB0ZXN0IGNhc2Ugc2hvd3MgdGltZSBpcyByZXNldFxuLy9lbWl0dGVyXG4vL3JhbmQgbm9ybWFsXG5cblxuLy9hbmltYXRvci5wbGF5KFxuLy8gICAgLy9jbG9uZSBpcyBhIHBhcnJhbGxlbCBleGVjdXRpb24gdGhlIHNhbWUgYW5pbWF0aW9uXG4vLyAgICBwYXJhbGxlbChbY2xvbmUobiwgbGluZWFyX3R3ZWVuKC8qZml4ZWQgcG9pbnQqL0NFTlRSRSxcbi8vICAgICAgICAgICAgICAgICAgIC8qZ2VuZXJhdGl2ZSBwb2ludCovIHBvaW50KHNwbGF0dGVyLCBzcGxhdHRlciksXG4vLyAgICAgICAgICAgICAgICAgICAvKnRpbWUqLyB0LFxuLy8gICAgICAgICAgICAgICAgICAgLypkcmF3IGZuIGZvciB0d2VlbiovIHN0b3JlVHgoXCJYXCIsIGRyYXdEZWJyaXMoKSkpXG4vLyAgICAgICAgICAgICAgICAudGhlbihsb2FkVHgoXCJYXCIsIGRyYXdFeHBsb3Npb24oKSkpIC8vYWZ0ZXIgdGhlIHR3ZWVuIGNvbXBsZXRlcyBkcmF3IHRoZSBleHBsb3Npb25cbi8vICAgICAgICAgICAgICApLFxuLy8gICAgICAgICAgICAgIHRha2UoLypmaXhlZCB2YWx1ZSovIHQpLnRoZW4oZHJhd0JpZ0V4cGxvc2lvbigpKVxuLy8gICAgICAgICAgICAgXSlcbi8vKTtcblxuXG4vLyBJREVBU1xuXG4vLyBQYWNNYW5cbi8vIHdoYXQgYWJvdXQgYSBkaWZmZXJlbnQgd2F5IG9mIG1ha2luZyBnbG93P1xuLy8gcmVuZGVyIGx1bWluZWNlbmNlIGludG8gYSB0ZXh0dXJlIGFuZCB0aGVuIGNvbG9yIGJhc2VkIG9uIGRpc3RhbmNlIGZyb20gbGlnaHRzb3VyY2Vcbi8vIG1vdXNlIGlucHV0LCB0YWlsaW5nIGdsb3cgKHJlbWJlciB0byB0d2VlbiBiZXR3ZWVuIHJhcGlkIG1vdmVtZW50cylcbi8vIG9mZnNjcmVlbiByZW5kZXJpbmcgYW4gcGxheWJhY2tcbi8vIHNpbiB3YXZlLCByYW5kb21pemVkXG4vLyBHVUkgY29tcG9uZW50cywgcmVzcG9uc2l2ZSwgYm9vdHN0cmFwXG4vLyBnZXQgZGF0YSBvdXQgYnkgdGFwcGluZyBpbnRvIGZsb3cgKGludGVyY2VwdChTdWJqZWN0IHBhc3NiYWNrKSlcbi8vIFNWRyBpbXBvcnRcbi8vIGxheWVyaW5nIHdpdGggcGFycmFsbGVsIChiYWNrIGZpcnN0KVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9