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
var Parameter = (function () {
    // tried immutable.js but it only supports 2 dimensionable iterables
    function Parameter(next) {
        this.next = next;
    }
    Parameter.prototype.next = function (t) { throw new Error('This method is abstract'); };
    Parameter.prototype.map = function (fn) {
        var base = this;
        return new Parameter(function (t) {
            //console.log("Iterable: next");
            return fn(base.next(t));
        });
    };
    Parameter.prototype.clone = function () {
        return this.map(function (x) { return x; });
    };
    return Parameter;
})();
exports.Parameter = Parameter;
var ParameterStateful = (function (_super) {
    __extends(ParameterStateful, _super);
    // tried immutable.js but it only supports 2 dimension iterables
    function ParameterStateful(initial, predecessors, tick, value) {
        _super.call(this, function () {
            return value(this.state);
        });
        this.state = initial;
        this.tick = tick;
    }
    return ParameterStateful;
})(Parameter);
exports.ParameterStateful = ParameterStateful;
var Fixed = (function (_super) {
    __extends(Fixed, _super);
    function Fixed(val) {
        _super.call(this, function () {
            return this.val;
        });
        this.val = val;
    }
    return Fixed;
})(Parameter);
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
        instream = upstream;
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
    return Animator;
})();
exports.Animator = Animator;
function point(x, y) {
    var x_stream = toStreamNumber(x);
    var y_stream = toStreamNumber(y);
    //console.log("point: init", x_stream, y_stream);
    return new Parameter(function (t) {
        var result = [x_stream.next(t), y_stream.next(t)];
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
    return new Parameter(function (t) {
        var r = Math.floor(r_stream.next(t));
        var g = Math.floor(g_stream.next(t));
        var b = Math.floor(b_stream.next(t));
        var a = Math.floor(a_stream.next(t));
        return "rgb(" + r + "," + g + "," + b + ")";
    });
}
exports.color = color;
function rnd() {
    return new Parameter(function (t) {
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
    var tester = new ParameterStateful(0, [], function (clock, index) {
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
function displaceT(displacement, value) {
    var deltat = toStreamNumber(displacement);
    return new Parameter(function (t) {
        var dt = deltat.next(t);
        console.log("displaceT: ", dt);
        return value.next(t + dt);
    });
}
exports.displaceT = displaceT;
//todo: shoudl be t
function sin(period) {
    console.log("sin: new");
    var period_stream = toStreamNumber(period);
    return new Parameter(function (t) {
        var value = Math.sin(t * (Math.PI * 2) / period_stream.next(t));
        console.log("sin: tick", t, value);
        return value;
    });
}
exports.sin = sin;
function cos(period) {
    //console.log("cos: new");
    var period_stream = toStreamNumber(period);
    return new Parameter(function (t) {
        var value = Math.cos(t * (Math.PI * 2) / period_stream.next(t));
        console.log("cos: tick", t, value);
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
        var point = pointStream.next(tick.clock);
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
            var velocity = velocityStream.next(tick.clock);
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
            var from = from_stream.next(tick.clock);
            var to = to_stream.next(tick.clock);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiRHJhd1RpY2siLCJEcmF3VGljay5jb25zdHJ1Y3RvciIsInN0YWNrVHJhY2UiLCJQYXJhbWV0ZXIiLCJQYXJhbWV0ZXIuY29uc3RydWN0b3IiLCJQYXJhbWV0ZXIubmV4dCIsIlBhcmFtZXRlci5tYXAiLCJQYXJhbWV0ZXIuY2xvbmUiLCJQYXJhbWV0ZXJTdGF0ZWZ1bCIsIlBhcmFtZXRlclN0YXRlZnVsLmNvbnN0cnVjdG9yIiwiRml4ZWQiLCJGaXhlZC5jb25zdHJ1Y3RvciIsInRvU3RyZWFtTnVtYmVyIiwidG9TdHJlYW1Qb2ludCIsInRvU3RyZWFtQ29sb3IiLCJBbmltYXRpb24iLCJBbmltYXRpb24uY29uc3RydWN0b3IiLCJBbmltYXRpb24uYXR0YWNoIiwiQW5pbWF0aW9uLnRoZW4iLCJBbmltYXRvciIsIkFuaW1hdG9yLmNvbnN0cnVjdG9yIiwiQW5pbWF0b3IudGlja2VyIiwiQW5pbWF0b3IucGxheSIsInBvaW50IiwiY29sb3IiLCJybmQiLCJhc3NlcnREdCIsImFzc2VydENsb2NrIiwiZGlzcGxhY2VUIiwic2luIiwiY29zIiwic2NhbGVfeCIsInN0b3JlVHgiLCJsb2FkVHgiLCJjbG9uZSIsInBhcmFsbGVsIiwic2VxdWVuY2UiLCJsb29wIiwiYXR0YWNoTG9vcCIsImRyYXciLCJtb3ZlIiwidmVsb2NpdHkiLCJ0d2Vlbl9saW5lYXIiLCJyZWN0IiwiY2hhbmdlQ29sb3IiLCJtYXAiLCJ0YWtlIiwic2F2ZSIsImRyYXdEZWJyaXMiLCJkcmF3RXhwbG9zaW9uIiwiZHJhd0JpZ0V4cGxvc2lvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsQUFFQSwwREFGMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3hDLElBQU8sRUFBRSxXQUFXLElBQUksQ0FBQyxDQUFDO0FBRWYsa0JBQVUsR0FBRyxLQUFLLENBQUM7QUFDbkIsa0JBQVUs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QyxVQUFVO0FBQ1YsY0FBYztBQUdkLGlCQUFpQjtBQUNqQix5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELG9FQUFvRTtBQUNwRSxnQ0FBZ0M7QUFDaEMsc0VBQXNFO0FBQ3RFLG9HQUFvRztBQUNwRyxrQkFBa0I7QUFDbEIsZ0VBQWdFO0FBQ2hFLGlCQUFpQjtBQUNqQixJQUFJO0FBR0osUUFBUTtBQUVSLFNBQVM7QUFDVCw2Q0FBNkM7QUFDN0Msc0ZBQXNGO0FBQ3RGLHNFQUFzRTtBQUN0RSxrQ0FBa0M7QUFDbEMsdUJBQXVCO0FBQ3ZCLHdDQUF3QztBQUN4QyxrRUFBa0U7QUFDbEUsYUFBYTtBQUNiLHVDQUF1QyIsImZpbGUiOiJhbmltYXhlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL25vZGVfbW9kdWxlcy9yeC90cy9yeC5hbGwuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbmltcG9ydCBSeCA9IHJlcXVpcmUoXCJyeFwiKTtcblxuZXhwb3J0IHZhciBERUJVR19MT09QID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX1RIRU4gPSBmYWxzZTtcblxuZXhwb3J0IGNsYXNzIERyYXdUaWNrIHtcbiAgICBjb25zdHJ1Y3RvciAocHVibGljIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCBwdWJsaWMgY2xvY2s6IG51bWJlciwgcHVibGljIGR0OiBudW1iZXIpIHt9XG59XG5cbmZ1bmN0aW9uIHN0YWNrVHJhY2UoKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIHJldHVybiAoPGFueT5lcnIpLnN0YWNrO1xufVxuXG5leHBvcnQgY2xhc3MgUGFyYW1ldGVyPFZhbHVlPiB7XG4gICAgLy8gdHJpZWQgaW1tdXRhYmxlLmpzIGJ1dCBpdCBvbmx5IHN1cHBvcnRzIDIgZGltZW5zaW9uYWJsZSBpdGVyYWJsZXNcbiAgICBjb25zdHJ1Y3RvcihuZXh0OiAodDogbnVtYmVyKSA9PiBWYWx1ZSkge1xuICAgICAgICB0aGlzLm5leHQgPSBuZXh0O1xuICAgIH1cblxuICAgIG5leHQodDogbnVtYmVyKTogVmFsdWUge3Rocm93IG5ldyBFcnJvcignVGhpcyBtZXRob2QgaXMgYWJzdHJhY3QnKTt9XG5cbiAgICBtYXA8Vj4oZm46IChWYWx1ZSkgPT4gVik6IFBhcmFtZXRlcjxWPiB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgICAgICBmdW5jdGlvbih0OiBudW1iZXIpOiBWIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiSXRlcmFibGU6IG5leHRcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuKGJhc2UubmV4dCh0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgY2xvbmUoKTogUGFyYW1ldGVyPFZhbHVlPiB7XG4gICAgICAgIHJldHVybiB0aGlzLm1hcCh4ID0+IHgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFBhcmFtZXRlclN0YXRlZnVsPFN0YXRlLCBWYWx1ZT4gZXh0ZW5kcyBQYXJhbWV0ZXI8VmFsdWU+e1xuXG4gICAgc3RhdGU6IFN0YXRlO1xuICAgIHByaXZhdGUgdGljazogKHQ6IG51bWJlciwgc3RhdGU6IFN0YXRlKSA9PiBTdGF0ZTtcbiAgICAvLyB0cmllZCBpbW11dGFibGUuanMgYnV0IGl0IG9ubHkgc3VwcG9ydHMgMiBkaW1lbnNpb24gaXRlcmFibGVzXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGluaXRpYWw6IFN0YXRlLFxuICAgICAgICBwcmVkZWNlc3NvcnM6IFBhcmFtZXRlcjxhbnk+W10sXG4gICAgICAgIHRpY2s6ICh0OiBudW1iZXIsIHN0YXRlOiBTdGF0ZSkgPT4gU3RhdGUsXG4gICAgICAgIHZhbHVlOiAoc3RhdGU6IFN0YXRlKSA9PiBWYWx1ZSkge1xuXG4gICAgICAgIHN1cGVyKFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSh0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IGluaXRpYWw7XG4gICAgICAgIHRoaXMudGljayAgPSB0aWNrO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogVE9ETywgd2UgY291bGQgbWFwIHN0YXRlIGhlcmUgbWF5YmVcbiAgICBtYXA8Vj4oZm46IChWYWx1ZSkgPT4gVik6IEl0ZXJhYmxlU3RhdGVmdWw8YW55LCBWPiB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyYWJsZVN0YXRlZnVsKFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIFtiYXNlXSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge30sXG4gICAgICAgICAgICBmdW5jdGlvbigpOiBWIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4oYmFzZS5uZXh0KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0qKi9cbn1cblxuZXhwb3J0IHR5cGUgTnVtYmVyU3RyZWFtID0gUGFyYW1ldGVyPG51bWJlcj47XG5leHBvcnQgdHlwZSBQb2ludFN0cmVhbSA9IFBhcmFtZXRlcjxQb2ludD47XG5leHBvcnQgdHlwZSBDb2xvclN0cmVhbSA9IFBhcmFtZXRlcjxzdHJpbmc+O1xuZXhwb3J0IHR5cGUgRHJhd1N0cmVhbSA9IFJ4Lk9ic2VydmFibGU8RHJhd1RpY2s+O1xuXG5leHBvcnQgY2xhc3MgRml4ZWQ8VD4gZXh0ZW5kcyBQYXJhbWV0ZXI8VD4ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB2YWw6IFQpIHtcbiAgICAgICAgc3VwZXIoXG4gICAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbU51bWJlcih4OiBudW1iZXIgfCBOdW1iZXJTdHJlYW0pOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ251bWJlcicgPyBuZXcgRml4ZWQoeCk6IHg7XG59XG5leHBvcnQgZnVuY3Rpb24gdG9TdHJlYW1Qb2ludCh4OiBQb2ludCB8IFBvaW50U3RyZWFtKTogUG9pbnRTdHJlYW0ge1xuICAgIHJldHVybiA8UG9pbnRTdHJlYW0+ICh0eXBlb2YgKDxhbnk+eCkubmV4dCA9PT0gJ2Z1bmN0aW9uJyA/IHg6IG5ldyBGaXhlZCh4KSk7XG59XG5leHBvcnQgZnVuY3Rpb24gdG9TdHJlYW1Db2xvcih4OiBzdHJpbmcgfCBDb2xvclN0cmVhbSk6IENvbG9yU3RyZWFtIHtcbiAgICByZXR1cm4gPENvbG9yU3RyZWFtPiAodHlwZW9mICg8YW55PngpLm5leHQgPT09ICdmdW5jdGlvbicgPyB4OiBuZXcgRml4ZWQoeCkpO1xufVxuXG5leHBvcnQgY2xhc3MgQW5pbWF0aW9uIHtcbiAgICBwcml2YXRlIHByZWRlY2Vzc29yczogUGFyYW1ldGVyPGFueT5bXTtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBfYXR0YWNoOiAodXBzdHJlYW06IERyYXdTdHJlYW0pID0+IERyYXdTdHJlYW0sIHB1YmxpYyBhZnRlcj86IEFuaW1hdGlvbiwgcHJlZGVjZXNzb3JzPzogUGFyYW1ldGVyPGFueT5bXSkge1xuICAgICAgICB0aGlzLnByZWRlY2Vzc29ycyA9IHByZWRlY2Vzc29yc1xuICAgIH1cbiAgICBhdHRhY2godXBzdHJlYW06IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiYW5pbWF0aW9uIGluaXRpYWxpemVkIFwiLCBjbG9jayk7XG5cbiAgICAgICAgdmFyIGluc3RyZWFtID0gbnVsbDtcbiAgICAgICAgaW5zdHJlYW0gPSB1cHN0cmVhbTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImFuaW1hdGlvbjogaW5zdHJlYW1cIiwgaW5zdHJlYW0sIFwidXBzdHJlYW1cIiwgdXBzdHJlYW0pO1xuICAgICAgICB2YXIgcHJvY2Vzc2VkID0gdGhpcy5fYXR0YWNoKGluc3RyZWFtKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWZ0ZXI/IHRoaXMuYWZ0ZXIuYXR0YWNoKHByb2Nlc3NlZCk6IHByb2Nlc3NlZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogZGVsaXZlcnMgZXZlbnRzIHRvIHRoaXMgZmlyc3QsIHRoZW4gd2hlbiB0aGF0IGFuaW1hdGlvbiBpcyBmaW5pc2hlZFxuICAgICAqIHRoZSBmb2xsb3dlciBjb25zdW1lcnMgZXZlbnRzIGFuZCB0aGUgdmFsdWVzIGFyZSB1c2VkIGFzIG91dHB1dCwgdW50aWwgdGhlIGZvbGxvd2VyIGFuaW1hdGlvbiBjb21wbGV0ZXNcbiAgICAgKi9cbiAgICB0aGVuKGZvbGxvd2VyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IERyYXdTdHJlYW0pIDogRHJhd1N0cmVhbSB7XG4gICAgICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uIChvYnNlcnZlcikge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCAgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RUdXJuID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50ID0gZmlyc3Q7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogYXR0YWNoXCIpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZEF0dGFjaCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RBdHRhY2ggID0gc2VsZi5hdHRhY2goZmlyc3Quc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGZpcnN0IGNvbXBsZXRlXCIsIHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUdXJuID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaCA9IGZvbGxvd2VyLmF0dGFjaChzZWNvbmQuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcHJldlN1YnNjcmlwdGlvbiA9IHByZXYuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSB0byBmaXJzdCBPUiBzZWNvbmRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlyc3RUdXJuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3Qub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmQub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIC8vIG9uIGRpc3Bvc2VcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBkaXNwb3NlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0QXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgc2Vjb25kQXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSk7IC8vdG9kbyByZW1vdmUgc3Vic2NyaWJlT25zXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFuaW1hdG9yIHtcbiAgICB0aWNrZXJTdWJzY3JpcHRpb246IFJ4LkRpc3Bvc2FibGUgPSBudWxsO1xuICAgIHJvb3Q6IFJ4LlN1YmplY3Q8RHJhd1RpY2s+O1xuICAgIGFuaW1hdGlvblN1YnNjcmlwdGlvbnM6IFJ4LklEaXNwb3NhYmxlW10gPSBbXTtcbiAgICB0OiBudW1iZXIgPSAwO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKSB7XG4gICAgICAgIHRoaXMucm9vdCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpXG4gICAgfVxuICAgIHRpY2tlcih0aWNrOiBSeC5PYnNlcnZhYmxlPG51bWJlcj4pOiB2b2lkIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMudGlja2VyU3Vic2NyaXB0aW9uID0gdGljay5tYXAoZnVuY3Rpb24oZHQ6IG51bWJlcikgeyAvL21hcCB0aGUgdGlja2VyIG9udG8gYW55IC0+IGNvbnRleHRcbiAgICAgICAgICAgIHZhciB0aWNrID0gbmV3IERyYXdUaWNrKHNlbGYuY3R4LCBzZWxmLnQsIGR0KTtcbiAgICAgICAgICAgIHNlbGYudCArPSBkdDtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KS5zdWJzY3JpYmUodGhpcy5yb290KTtcbiAgICB9XG4gICAgcGxheSAoYW5pbWF0aW9uOiBBbmltYXRpb24pOiB2b2lkIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBwbGF5XCIpO1xuICAgICAgICB2YXIgc2F2ZUJlZm9yZUZyYW1lID0gdGhpcy5yb290LnRhcE9uTmV4dChmdW5jdGlvbih0aWNrKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBzYXZlXCIpO1xuICAgICAgICAgICAgdGljay5jdHguc2F2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRvQW5pbWF0aW9uID0gYW5pbWF0aW9uLmF0dGFjaChzYXZlQmVmb3JlRnJhbWUpO1xuICAgICAgICB2YXIgcmVzdG9yZUFmdGVyRnJhbWUgPSBkb0FuaW1hdGlvbi50YXAoXG4gICAgICAgICAgICBmdW5jdGlvbih0aWNrKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggbmV4dCByZXN0b3JlXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0sZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggZXJyIHJlc3RvcmVcIik7XG4gICAgICAgICAgICAgICAgc2VsZi5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSxmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFuaW1hdGlvblN1YnNjcmlwdGlvbnMucHVzaChcbiAgICAgICAgICAgIHJlc3RvcmVBZnRlckZyYW1lLnN1YnNjcmliZSgpXG4gICAgICAgICk7XG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBQb2ludCA9IFtudW1iZXIsIG51bWJlcl1cbmV4cG9ydCBmdW5jdGlvbiBwb2ludChcbiAgICB4OiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgeTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG4pOiBQb2ludFN0cmVhbVxue1xuICAgIHZhciB4X3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKHgpO1xuICAgIHZhciB5X3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKHkpO1xuXG4gICAgLy9jb25zb2xlLmxvZyhcInBvaW50OiBpbml0XCIsIHhfc3RyZWFtLCB5X3N0cmVhbSk7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgIGZ1bmN0aW9uKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgdmFyIHJlc3VsdDogW251bWJlciwgbnVtYmVyXSA9IFt4X3N0cmVhbS5uZXh0KHQpLCB5X3N0cmVhbS5uZXh0KHQpXTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJwb2ludDogbmV4dFwiLCByZXN1bHQpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qXG4gICAgUkdCIGJldHdlZW4gMCBhbmQgMjU1XG4gICAgYSBiZXR3ZWVuIDAgLSAxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb2xvcihcbiAgICByOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgZzogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGI6IG51bWJlciB8IE51bWJlclN0cmVhbSxcbiAgICBhOiBudW1iZXIgfCBOdW1iZXJTdHJlYW1cbik6IENvbG9yU3RyZWFtXG57XG4gICAgdmFyIHJfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocik7XG4gICAgdmFyIGdfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoZyk7XG4gICAgdmFyIGJfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoYik7XG4gICAgdmFyIGFfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoYSk7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgIGZ1bmN0aW9uKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgdmFyIHIgPSBNYXRoLmZsb29yKHJfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGcgPSBNYXRoLmZsb29yKGdfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGIgPSBNYXRoLmZsb29yKGJfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGEgPSBNYXRoLmZsb29yKGFfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgcmV0dXJuIFwicmdiKFwiICsgciArIFwiLFwiICsgZyArIFwiLFwiICsgYiArIFwiKVwiO1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJuZCgpOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qKlxuICogTk9URTogY3VycmVudGx5IGZhaWxzIGlmIHRoZSBzdHJlYW1zIGFyZSBkaWZmZXJlbnQgbGVuZ3Roc1xuICogQHBhcmFtIGFzc2VydER0IHRoZSBleHBlY3RlZCBjbG9jayB0aWNrIHZhbHVlc1xuICogQHBhcmFtIGFmdGVyXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RHQoZXhwZWN0ZWREdDogUnguT2JzZXJ2YWJsZTxudW1iZXI+LCBhZnRlcj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnppcChleHBlY3RlZER0LCBmdW5jdGlvbih0aWNrOiBEcmF3VGljaywgZXhwZWN0ZWREdFZhbHVlOiBudW1iZXIpIHtcbiAgICAgICAgICAgIGlmICh0aWNrLmR0ICE9IGV4cGVjdGVkRHRWYWx1ZSkgdGhyb3cgbmV3IEVycm9yKFwidW5leHBlY3RlZCBkdCBvYnNlcnZlZDogXCIgKyB0aWNrLmR0ICsgXCIsIGV4cGVjdGVkOlwiICsgZXhwZWN0ZWREdFZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KTtcbiAgICB9LCBhZnRlcik7XG59XG5cbi8vdG9kbyB3b3VsZCBiZSBuaWNlIGlmIHRoaXMgdG9vayBhbiBpdGVyYWJsZSBvciBzb21lIG90aGVyIHR5cGUgb2Ygc2ltcGxlIHB1bGwgc3RyZWFtXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Q2xvY2soYXNzZXJ0Q2xvY2s6IG51bWJlcltdLCBhZnRlcj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgdmFyIGVycm9yID0gbnVsbDtcbiAgICB2YXIgdGVzdGVyID0gbmV3IFBhcmFtZXRlclN0YXRlZnVsKFxuICAgICAgICAwLFxuICAgICAgICBbXSxcbiAgICAgICAgZnVuY3Rpb24oY2xvY2s6IG51bWJlciwgaW5kZXg6IG51bWJlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhc3NlcnRDbG9jazogdGlja1wiLCBjbG9jayk7XG4gICAgICAgICAgICBpZiAoY2xvY2sgPCBhc3NlcnRDbG9ja1tpbmRleF0gLSAwLjAwMDAxIHx8IGNsb2NrID4gYXNzZXJ0Q2xvY2tbaW5kZXhdICsgMC4wMDAwMSlcbiAgICAgICAgICAgICAgICBlcnJvciA9IFwidW5leHBlY3RlZCBjbG9jayBvYnNlcnZlZDogXCIgKyBjbG9jayArIFwiLCBleHBlY3RlZDpcIiArIGFzc2VydENsb2NrW2luZGV4XTtcblxuICAgICAgICAgICAgcmV0dXJuIGluZGV4ICsgMTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oaW5kZXg6IG51bWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7IC8vd2UgZG9uJ3QgbmVlZCBhIHZhbHVlXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnRhcE9uTmV4dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYXNzZXJ0Q2xvY2sgZXJyb3JcIiwgZXJyb3IpO1xuICAgICAgICAgICAgaWYgKGVycm9yKSB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9LCBhZnRlciwgW3Rlc3Rlcl0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlzcGxhY2VUPFQ+KGRpc3BsYWNlbWVudDogbnVtYmVyIHwgUGFyYW1ldGVyPG51bWJlcj4sIHZhbHVlOiBQYXJhbWV0ZXI8VD4pOiBQYXJhbWV0ZXI8VD4ge1xuICAgIHZhciBkZWx0YXQ6IFBhcmFtZXRlcjxudW1iZXI+ID0gdG9TdHJlYW1OdW1iZXIoZGlzcGxhY2VtZW50KTtcbiAgICByZXR1cm4gbmV3IFBhcmFtZXRlcjxUPiAoXG4gICAgICAgIGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICB2YXIgZHQgPSBkZWx0YXQubmV4dCh0KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGlzcGxhY2VUOiBcIiwgZHQpXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUubmV4dCh0ICsgZHQpXG4gICAgICAgIH0pO1xufVxuXG4vL3RvZG86IHNob3VkbCBiZSB0XG5leHBvcnQgZnVuY3Rpb24gc2luKHBlcmlvZDogbnVtYmVyfCBQYXJhbWV0ZXI8bnVtYmVyPik6IFBhcmFtZXRlcjxudW1iZXI+IHtcbiAgICBjb25zb2xlLmxvZyhcInNpbjogbmV3XCIpO1xuICAgIHZhciBwZXJpb2Rfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocGVyaW9kKTtcblxuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKGZ1bmN0aW9uICh0OiBudW1iZXIpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gTWF0aC5zaW4odCAqIChNYXRoLlBJICogMikgLyBwZXJpb2Rfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICBjb25zb2xlLmxvZyhcInNpbjogdGlja1wiLCB0LCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9KTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjb3MocGVyaW9kOiBudW1iZXJ8IE51bWJlclN0cmVhbSk6IE51bWJlclN0cmVhbSB7XG4gICAgLy9jb25zb2xlLmxvZyhcImNvczogbmV3XCIpO1xuICAgIHZhciBwZXJpb2Rfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocGVyaW9kKTtcblxuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKGZ1bmN0aW9uICh0OiBudW1iZXIpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gTWF0aC5jb3ModCAqIChNYXRoLlBJICogMikgLyBwZXJpb2Rfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImNvczogdGlja1wiLCB0LCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc2NhbGVfeChcbiAgICBzY2FsZTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIHg6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG57IHJldHVybiAwO31cblxuZnVuY3Rpb24gc3RvcmVUeChcbiAgICBuOiBzdHJpbmcsIC8qcGFzcyB0aG91Z2ggY29udGV4dCBidXQgc3RvcmUgdHJhbnNmb3JtIGluIHZhcmlhYmxlKi9cbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvL3Bhc3N0aHJvdWdoXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBsb2FkVHgoXG4gICAgbjogc3RyaW5nLCAvKnBhc3MgdGhvdWdoIGNvbnRleHQgYnV0IHN0b3JlIHRyYW5zZm9ybSBpbiB2YXJpYWJsZSovXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb24gLy9wYXNzdGhyb3VnaFxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuZnVuY3Rpb24gY2xvbmUoXG4gICAgbjogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8qIGNvcGllcyAqL1xuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuZnVuY3Rpb24gcGFyYWxsZWwoIC8vcmVuYW1lIGxheWVyP1xuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uW11cbik6IEFuaW1hdGlvblxueyByZXR1cm4gbnVsbDt9XG5cbmZ1bmN0aW9uIHNlcXVlbmNlKFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uW11cbik6IEFuaW1hdGlvblxueyByZXR1cm4gbnVsbDt9XG5cbmV4cG9ydCBmdW5jdGlvbiBsb29wKFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBpbml0aWFsaXppbmdcIik7XG5cblxuICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBjcmVhdGUgbmV3IGxvb3BcIik7XG4gICAgICAgICAgICB2YXIgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBsb29wU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICAgICAgICAgIHZhciB0ID0gMDtcblxuICAgICAgICAgICAgZnVuY3Rpb24gYXR0YWNoTG9vcChuZXh0KSB7IC8vdG9kbyBJIGZlZWwgbGlrZSB3ZSBjYW4gcmVtb3ZlIGEgbGV2ZWwgZnJvbSB0aGlzIHNvbWVob3dcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBuZXcgaW5uZXIgbG9vcCBzdGFydGluZyBhdFwiLCB0KTtcblxuICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN1YnNjcmlwdGlvbiA9IGFuaW1hdGlvbi5hdHRhY2gobG9vcFN0YXJ0KS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCBlcnIgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBwb3N0LWlubmVyIGNvbXBsZXRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIGZpbmlzaGVkIGNvbnN0cnVjdGlvblwiKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmV2LnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbm8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaExvb3AobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogdXBzdHJlYW0gdG8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0Lm9uTmV4dChuZXh0KTtcblxuICAgICAgICAgICAgICAgICAgICB0ICs9IG5leHQuZHQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSBlcnJvciB0byBkb3duc3RyZWFtXCIsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkLmJpbmQob2JzZXJ2ZXIpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy9kaXNwb3NlXG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogZGlzcG9zZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAobG9vcFN0YXJ0KSBsb29wU3RhcnQuZGlzcG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXcoXG4gICAgZm46ICh0aWNrOiBEcmF3VGljaykgPT4gdm9pZCxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb24sXG4gICAgcHJlZGVjZXNzb3JzPzogUGFyYW1ldGVyPGFueT5bXVxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXZpb3VzOiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy50YXBPbk5leHQoZm4pO1xuICAgIH0sIGFuaW1hdGlvbiwgcHJlZGVjZXNzb3JzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1vdmUoXG4gICAgZGVsdGE6IFBvaW50IHwgUG9pbnRTdHJlYW0sXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIGNvbnNvbGUubG9nKFwibW92ZTogYXR0YWNoZWRcIik7XG4gICAgdmFyIHBvaW50U3RyZWFtOiBQb2ludFN0cmVhbSA9IHRvU3RyZWFtUG9pbnQoZGVsdGEpO1xuICAgIHJldHVybiBkcmF3KGZ1bmN0aW9uKHRpY2spIHtcbiAgICAgICAgdmFyIHBvaW50ID0gcG9pbnRTdHJlYW0ubmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJtb3ZlOlwiLCBwb2ludCk7XG4gICAgICAgIGlmICh0aWNrKVxuICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKDEsIDAsIDAsIDEsIHBvaW50WzBdLCBwb2ludFsxXSk7XG4gICAgICAgIHJldHVybiB0aWNrO1xuICAgIH0sIGFuaW1hdGlvbiwgW3BvaW50U3RyZWFtXSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2ZWxvY2l0eShcbiAgICB2ZWxvY2l0eTogUG9pbnQgfCBQb2ludFN0cmVhbSxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgdmFyIHZlbG9jaXR5U3RyZWFtOiBQb2ludFN0cmVhbSA9IHRvU3RyZWFtUG9pbnQodmVsb2NpdHkpO1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHBvczogUG9pbnQgPSBbMC4wLDAuMF07XG4gICAgICAgIHJldHVybiBwcmV2Lm1hcChmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICB2YXIgdmVsb2NpdHkgPSB2ZWxvY2l0eVN0cmVhbS5uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgcG9zWzBdICs9IHZlbG9jaXR5WzBdICogdGljay5kdDtcbiAgICAgICAgICAgIHBvc1sxXSArPSB2ZWxvY2l0eVsxXSAqIHRpY2suZHQ7XG4gICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgcG9zWzBdLCBwb3NbMV0pO1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pO1xuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2Vlbl9saW5lYXIoXG4gICAgZnJvbTogUG9pbnQgfCBQb2ludFN0cmVhbSxcbiAgICB0bzogICBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIHRpbWU6IG51bWJlcixcbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvKiBjb3BpZXMgKi9cbik6IEFuaW1hdGlvblxue1xuICAgIHZhciBmcm9tX3N0cmVhbSA9IHRvU3RyZWFtUG9pbnQoZnJvbSk7XG4gICAgdmFyIHRvX3N0cmVhbSA9IHRvU3RyZWFtUG9pbnQodG8pO1xuICAgIHZhciBzY2FsZSA9IDEuMCAvIHRpbWU7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbihwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHZhciB0ID0gMDtcbiAgICAgICAgcmV0dXJuIHByZXYubWFwKGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInR3ZWVuOiBpbm5lclwiKTtcbiAgICAgICAgICAgIHZhciBmcm9tID0gZnJvbV9zdHJlYW0ubmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgIHZhciB0byAgID0gdG9fc3RyZWFtLm5leHQodGljay5jbG9jayk7XG5cbiAgICAgICAgICAgIHQgPSB0ICsgdGljay5kdDtcbiAgICAgICAgICAgIGlmICh0ID4gdGltZSkgdCA9IHRpbWU7XG4gICAgICAgICAgICB2YXIgeCA9IGZyb21bMF0gKyAodG9bMF0gLSBmcm9tWzBdKSAqIHQgKiBzY2FsZTtcbiAgICAgICAgICAgIHZhciB5ID0gZnJvbVsxXSArICh0b1sxXSAtIGZyb21bMV0pICogdCAqIHNjYWxlO1xuICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKDEsIDAsIDAsIDEsIHgsIHkpO1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pLnRha2VXaGlsZShmdW5jdGlvbih0aWNrKSB7cmV0dXJuIHQgPCB0aW1lO30pXG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlY3QoXG4gICAgcDE6IFBvaW50LCAvL3RvZG8gZHluYW1pYyBwYXJhbXMgaW5zdGVhZFxuICAgIHAyOiBQb2ludCwgLy90b2RvIGR5bmFtaWMgcGFyYW1zIGluc3RlYWRcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVjdDogZmlsbFJlY3RcIik7XG4gICAgICAgIHRpY2suY3R4LmZpbGxSZWN0KHAxWzBdLCBwMVsxXSwgcDJbMF0sIHAyWzFdKTsgLy90b2RvIG9ic2VydmVyIHN0cmVhbSBpZiBuZWNpc3NhcnlcbiAgICB9LCBhbmltYXRpb24pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNoYW5nZUNvbG9yKFxuICAgIGNvbG9yOiBzdHJpbmcsIC8vdG9kb1xuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhmdW5jdGlvbiAodGljazogRHJhd1RpY2spIHtcbiAgICAgICAgdGljay5jdHguZmlsbFN0eWxlID0gY29sb3I7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZnVuY3Rpb24gbWFwKFxuICAgIG1hcF9mbjogKHByZXY6IERyYXdUaWNrKSA9PiBEcmF3VGljayxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXZpb3VzOiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy5tYXAobWFwX2ZuKVxuICAgIH0sIGFuaW1hdGlvbilcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRha2UoXG4gICAgaXRlcmF0aW9uczogbnVtYmVyLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24ocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICByZXR1cm4gcHJldi50YWtlKGl0ZXJhdGlvbnMpO1xuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmUod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyLCBwYXRoOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgIHZhciBHSUZFbmNvZGVyID0gcmVxdWlyZSgnZ2lmZW5jb2RlcicpO1xuICAgIHZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cblxuICAgIHZhciBlbmNvZGVyID0gbmV3IEdJRkVuY29kZXIod2lkdGgsIGhlaWdodCk7XG4gICAgZW5jb2Rlci5jcmVhdGVSZWFkU3RyZWFtKClcbiAgICAgIC5waXBlKGVuY29kZXIuY3JlYXRlV3JpdGVTdHJlYW0oeyByZXBlYXQ6IDEwMDAwLCBkZWxheTogMTAwLCBxdWFsaXR5OiAxIH0pKVxuICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ocGF0aCkpO1xuICAgIGVuY29kZXIuc3RhcnQoKTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwYXJlbnQ6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICB2YXIgZW5kTmV4dCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gcGFyZW50LnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzYXZlOiB3cm90ZSBmcmFtZVwiKTtcbiAgICAgICAgICAgICAgICAvL3QgKz0gdGljay5kdDtcbiAgICAgICAgICAgICAgICAvL3ZhciBvdXQgPSBmcy53cml0ZUZpbGVTeW5jKHBhdGggKyBcIl9cIisgdCArIFwiLnBuZ1wiLCBjYW52YXMudG9CdWZmZXIoKSk7XG4gICAgICAgICAgICAgICAgLy92YXIgcGFyc2VkID0gcG5ncGFyc2UoY2FudmFzLnRvQnVmZmVyKCkpXG4gICAgICAgICAgICAgICAgZW5jb2Rlci5hZGRGcmFtZSh0aWNrLmN0eCk7XG4gICAgICAgICAgICAgICAgLy9lbmNvZGVyLmFkZEZyYW1lKHRpY2suY3R4LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmVycm9yKFwic2F2ZTogbm90IHNhdmVkXCIsIHBhdGgpO30sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmxvZyhcInNhdmU6IHNhdmVkXCIsIHBhdGgpOyBlbmNvZGVyLmZpbmlzaCgpOy8qIGVuZE5leHQgPSB0cnVlOyovfVxuICAgICAgICApXG4gICAgfSk7XG59XG5cblxuLy93ZSB3aWxsIGRyYXdcbi8vIEVYUExPRElORyBTSElQXG4vLzEuIG4gcGllY2VzIG9mIGRlYnJpcyBmbHlpbmcgb3V0d2FyZHMgKGxpbmVhciBtb3ZlbWVudCBpbiB0aW1lIG9mIERlYnJpcyBmcm9tIDUwLDUwIHRvIHJuZCwgcm5kLCBhdCB2ZWxvY2l0eSB2KVxuLy8yLiBleHBsb3Npb24gb2YgZGVicmlzIChsYXN0IHBvc2l0aW9uIG9mIGRlYnJpcyBzcGF3bnMgZXhwbG9zaW9uXG4vLzMuIGxhcmdlIGV4cGxvc2lvbiBhdCBjZW50ZXIgKDUwLDUwKSBhdCBlbmQgb2YgbGluZWFyIG1vdmVtZW50XG52YXIgQ0VOVFJFID0gcG9pbnQoNTAsNTApO1xudmFyIFRMID0gcG9pbnQoNTAsNTApO1xudmFyIEJSID0gcG9pbnQoNTAsNTApO1xudmFyIHQ6IG51bWJlciA9IDA7XG52YXIgbjogbnVtYmVyID0gMDtcblxudmFyIGdhdXNzaWFuOiBOdW1iZXJTdHJlYW07XG52YXIgc3BsYXR0ZXI6IG51bWJlciB8IE51bWJlclN0cmVhbSA9IHNjYWxlX3goMywgZ2F1c3NpYW4pO1xuXG5mdW5jdGlvbiBkcmF3RGVicmlzKCk6IEFuaW1hdGlvbiB7cmV0dXJuIG51bGw7fVxuZnVuY3Rpb24gZHJhd0V4cGxvc2lvbigpOiBBbmltYXRpb24ge3JldHVybiBudWxsO31cbmZ1bmN0aW9uIGRyYXdCaWdFeHBsb3Npb24oKTogQW5pbWF0aW9uIHtyZXR1cm4gbnVsbDt9XG5cbi8vV2hhdCBkbyB3ZSB3YW50IGl0IHRvIGxvb2sgbGlrZVxuXG5cbi8vdG9kb1xuLy8gSU5WRVNUIElOIEJVSUxEIEFORCBURVNUSU5HXG5cbi8vIGZpeCB0aGVuXG4vLyB0ZXN0IGNhc2Ugc2hvd3MgdGltZSBpcyByZXNldFxuLy8gZW1pdHRlclxuLy8gcmFuZCBub3JtYWxcblxuXG4vLyBhbmltYXRvci5wbGF5KFxuLy8gICAgLy9jbG9uZSBpcyBhIHBhcnJhbGxlbCBleGVjdXRpb24gdGhlIHNhbWUgYW5pbWF0aW9uXG4vLyAgICBwYXJhbGxlbChbY2xvbmUobiwgbGluZWFyX3R3ZWVuKC8qZml4ZWQgcG9pbnQqL0NFTlRSRSxcbi8vICAgICAgICAgICAgICAgICAgIC8qZ2VuZXJhdGl2ZSBwb2ludCovIHBvaW50KHNwbGF0dGVyLCBzcGxhdHRlciksXG4vLyAgICAgICAgICAgICAgICAgICAvKnRpbWUqLyB0LFxuLy8gICAgICAgICAgICAgICAgICAgLypkcmF3IGZuIGZvciB0d2VlbiovIHN0b3JlVHgoXCJYXCIsIGRyYXdEZWJyaXMoKSkpXG4vLyAgICAgICAgICAgICAgICAudGhlbihsb2FkVHgoXCJYXCIsIGRyYXdFeHBsb3Npb24oKSkpIC8vYWZ0ZXIgdGhlIHR3ZWVuIGNvbXBsZXRlcyBkcmF3IHRoZSBleHBsb3Npb25cbi8vICAgICAgICAgICAgICApLFxuLy8gICAgICAgICAgICAgIHRha2UoLypmaXhlZCB2YWx1ZSovIHQpLnRoZW4oZHJhd0JpZ0V4cGxvc2lvbigpKVxuLy8gICAgICAgICAgICAgXSlcbi8vKTtcblxuXG4vLyBJREVBU1xuXG4vLyBQYWNNYW5cbi8vIHdoYXQgYWJvdXQgYSBkaWZmZXJlbnQgd2F5IG9mIG1ha2luZyBnbG93P1xuLy8gcmVuZGVyIGx1bWluZWNlbmNlIGludG8gYSB0ZXh0dXJlIGFuZCB0aGVuIGNvbG9yIGJhc2VkIG9uIGRpc3RhbmNlIGZyb20gbGlnaHRzb3VyY2Vcbi8vIG1vdXNlIGlucHV0LCB0YWlsaW5nIGdsb3cgKHJlbWJlciB0byB0d2VlbiBiZXR3ZWVuIHJhcGlkIG1vdmVtZW50cylcbi8vIG9mZnNjcmVlbiByZW5kZXJpbmcgYW4gcGxheWJhY2tcbi8vIHNpbiB3YXZlLCByYW5kb21pemVkXG4vLyBHVUkgY29tcG9uZW50cywgcmVzcG9uc2l2ZSwgYm9vdHN0cmFwXG4vLyBnZXQgZGF0YSBvdXQgYnkgdGFwcGluZyBpbnRvIGZsb3cgKGludGVyY2VwdChTdWJqZWN0IHBhc3NiYWNrKSlcbi8vIFNWRyBpbXBvcnRcbi8vIGxheWVyaW5nIHdpdGggcGFycmFsbGVsIChiYWNrIGZpcnN0KVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9