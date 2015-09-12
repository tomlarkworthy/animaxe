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
    function Animation(_attach, after) {
        this._attach = _attach;
        this.after = after;
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
    }, after);
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
function draw(fn, animation) {
    return new Animation(function (previous) {
        return previous.tapOnNext(fn);
    }, animation);
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
    }, animation);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiRHJhd1RpY2siLCJEcmF3VGljay5jb25zdHJ1Y3RvciIsInN0YWNrVHJhY2UiLCJQYXJhbWV0ZXIiLCJQYXJhbWV0ZXIuY29uc3RydWN0b3IiLCJQYXJhbWV0ZXIubmV4dCIsIlBhcmFtZXRlci5tYXAiLCJQYXJhbWV0ZXIuY2xvbmUiLCJQYXJhbWV0ZXJTdGF0ZWZ1bCIsIlBhcmFtZXRlclN0YXRlZnVsLmNvbnN0cnVjdG9yIiwiRml4ZWQiLCJGaXhlZC5jb25zdHJ1Y3RvciIsInRvU3RyZWFtTnVtYmVyIiwidG9TdHJlYW1Qb2ludCIsInRvU3RyZWFtQ29sb3IiLCJBbmltYXRpb24iLCJBbmltYXRpb24uY29uc3RydWN0b3IiLCJBbmltYXRpb24uYXR0YWNoIiwiQW5pbWF0aW9uLnRoZW4iLCJBbmltYXRvciIsIkFuaW1hdG9yLmNvbnN0cnVjdG9yIiwiQW5pbWF0b3IudGlja2VyIiwiQW5pbWF0b3IucGxheSIsInBvaW50IiwiY29sb3IiLCJybmQiLCJhc3NlcnREdCIsImFzc2VydENsb2NrIiwiZGlzcGxhY2VUIiwic2luIiwiY29zIiwic2NhbGVfeCIsInN0b3JlVHgiLCJsb2FkVHgiLCJjbG9uZSIsInBhcmFsbGVsIiwic2VxdWVuY2UiLCJsb29wIiwiYXR0YWNoTG9vcCIsImRyYXciLCJtb3ZlIiwidmVsb2NpdHkiLCJ0d2Vlbl9saW5lYXIiLCJyZWN0IiwiY2hhbmdlQ29sb3IiLCJtYXAiLCJ0YWtlIiwic2F2ZSIsImRyYXdEZWJyaXMiLCJkcmF3RXhwbG9zaW9uIiwiZHJhd0JpZ0V4cGxvc2lvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsQUFFQSwwREFGMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3hDLElBQU8sRUFBRSxXQUFXLElBQUksQ0FBQyxDQUFDO0FBRWYsa0JBQVUsR0FBRyxLQUFLLENBQUM7QUFDbkIsa0JBQVUs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QWdFO0FBQ2hFLGlCQUFpQjtBQUNqQixJQUFJO0FBR0osUUFBUTtBQUVSLFNBQVM7QUFDVCw2Q0FBNkM7QUFDN0Msc0ZBQXNGO0FBQ3RGLHNFQUFzRTtBQUN0RSxrQ0FBa0M7QUFDbEMsdUJBQXVCO0FBQ3ZCLHdDQUF3QztBQUN4QyxrRUFBa0U7QUFDbEUsYUFBYTtBQUNiLHVDQUF1QyIsImZpbGUiOiJhbmltYXhlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL25vZGVfbW9kdWxlcy9yeC90cy9yeC5hbGwuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbmltcG9ydCBSeCA9IHJlcXVpcmUoXCJyeFwiKTtcblxuZXhwb3J0IHZhciBERUJVR19MT09QID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX1RIRU4gPSBmYWxzZTtcblxuZXhwb3J0IGNsYXNzIERyYXdUaWNrIHtcbiAgICBjb25zdHJ1Y3RvciAocHVibGljIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCBwdWJsaWMgY2xvY2s6IG51bWJlciwgcHVibGljIGR0OiBudW1iZXIpIHt9XG59XG5cbmZ1bmN0aW9uIHN0YWNrVHJhY2UoKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIHJldHVybiAoPGFueT5lcnIpLnN0YWNrO1xufVxuXG5leHBvcnQgY2xhc3MgUGFyYW1ldGVyPFZhbHVlPiB7XG4gICAgLy8gdHJpZWQgaW1tdXRhYmxlLmpzIGJ1dCBpdCBvbmx5IHN1cHBvcnRzIDIgZGltZW5zaW9uYWJsZSBpdGVyYWJsZXNcbiAgICBjb25zdHJ1Y3RvcihuZXh0OiAodDogbnVtYmVyKSA9PiBWYWx1ZSkge1xuICAgICAgICB0aGlzLm5leHQgPSBuZXh0O1xuICAgIH1cblxuICAgIG5leHQodDogbnVtYmVyKTogVmFsdWUge3Rocm93IG5ldyBFcnJvcignVGhpcyBtZXRob2QgaXMgYWJzdHJhY3QnKTt9XG5cbiAgICBtYXA8Vj4oZm46IChWYWx1ZSkgPT4gVik6IFBhcmFtZXRlcjxWPiB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgICAgICBmdW5jdGlvbih0OiBudW1iZXIpOiBWIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiSXRlcmFibGU6IG5leHRcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuKGJhc2UubmV4dCh0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgY2xvbmUoKTogUGFyYW1ldGVyPFZhbHVlPiB7XG4gICAgICAgIHJldHVybiB0aGlzLm1hcCh4ID0+IHgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFBhcmFtZXRlclN0YXRlZnVsPFN0YXRlLCBWYWx1ZT4gZXh0ZW5kcyBQYXJhbWV0ZXI8VmFsdWU+e1xuXG4gICAgc3RhdGU6IFN0YXRlO1xuICAgIHByaXZhdGUgdGljazogKHQ6IG51bWJlciwgc3RhdGU6IFN0YXRlKSA9PiBTdGF0ZTtcbiAgICAvLyB0cmllZCBpbW11dGFibGUuanMgYnV0IGl0IG9ubHkgc3VwcG9ydHMgMiBkaW1lbnNpb24gaXRlcmFibGVzXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGluaXRpYWw6IFN0YXRlLFxuICAgICAgICBwcmVkZWNlc3NvcnM6IFBhcmFtZXRlcjxhbnk+W10sXG4gICAgICAgIHRpY2s6ICh0OiBudW1iZXIsIHN0YXRlOiBTdGF0ZSkgPT4gU3RhdGUsXG4gICAgICAgIHZhbHVlOiAoc3RhdGU6IFN0YXRlKSA9PiBWYWx1ZSkge1xuXG4gICAgICAgIHN1cGVyKFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSh0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IGluaXRpYWw7XG4gICAgICAgIHRoaXMudGljayAgPSB0aWNrO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogVE9ETywgd2UgY291bGQgbWFwIHN0YXRlIGhlcmUgbWF5YmVcbiAgICBtYXA8Vj4oZm46IChWYWx1ZSkgPT4gVik6IEl0ZXJhYmxlU3RhdGVmdWw8YW55LCBWPiB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyYWJsZVN0YXRlZnVsKFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIFtiYXNlXSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge30sXG4gICAgICAgICAgICBmdW5jdGlvbigpOiBWIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4oYmFzZS5uZXh0KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0qKi9cbn1cblxuZXhwb3J0IHR5cGUgTnVtYmVyU3RyZWFtID0gUGFyYW1ldGVyPG51bWJlcj47XG5leHBvcnQgdHlwZSBQb2ludFN0cmVhbSA9IFBhcmFtZXRlcjxQb2ludD47XG5leHBvcnQgdHlwZSBDb2xvclN0cmVhbSA9IFBhcmFtZXRlcjxzdHJpbmc+O1xuZXhwb3J0IHR5cGUgRHJhd1N0cmVhbSA9IFJ4Lk9ic2VydmFibGU8RHJhd1RpY2s+O1xuXG5leHBvcnQgY2xhc3MgRml4ZWQ8VD4gZXh0ZW5kcyBQYXJhbWV0ZXI8VD4ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyB2YWw6IFQpIHtcbiAgICAgICAgc3VwZXIoXG4gICAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbU51bWJlcih4OiBudW1iZXIgfCBOdW1iZXJTdHJlYW0pOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ251bWJlcicgPyBuZXcgRml4ZWQoeCk6IHg7XG59XG5leHBvcnQgZnVuY3Rpb24gdG9TdHJlYW1Qb2ludCh4OiBQb2ludCB8IFBvaW50U3RyZWFtKTogUG9pbnRTdHJlYW0ge1xuICAgIHJldHVybiA8UG9pbnRTdHJlYW0+ICh0eXBlb2YgKDxhbnk+eCkubmV4dCA9PT0gJ2Z1bmN0aW9uJyA/IHg6IG5ldyBGaXhlZCh4KSk7XG59XG5leHBvcnQgZnVuY3Rpb24gdG9TdHJlYW1Db2xvcih4OiBzdHJpbmcgfCBDb2xvclN0cmVhbSk6IENvbG9yU3RyZWFtIHtcbiAgICByZXR1cm4gPENvbG9yU3RyZWFtPiAodHlwZW9mICg8YW55PngpLm5leHQgPT09ICdmdW5jdGlvbicgPyB4OiBuZXcgRml4ZWQoeCkpO1xufVxuXG5leHBvcnQgY2xhc3MgQW5pbWF0aW9uIHtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBfYXR0YWNoOiAodXBzdHJlYW06IERyYXdTdHJlYW0pID0+IERyYXdTdHJlYW0sIHB1YmxpYyBhZnRlcj86IEFuaW1hdGlvbikge1xuICAgIH1cbiAgICBhdHRhY2godXBzdHJlYW06IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiYW5pbWF0aW9uIGluaXRpYWxpemVkIFwiLCBjbG9jayk7XG5cbiAgICAgICAgdmFyIGluc3RyZWFtID0gbnVsbDtcbiAgICAgICAgaW5zdHJlYW0gPSB1cHN0cmVhbTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImFuaW1hdGlvbjogaW5zdHJlYW1cIiwgaW5zdHJlYW0sIFwidXBzdHJlYW1cIiwgdXBzdHJlYW0pO1xuICAgICAgICB2YXIgcHJvY2Vzc2VkID0gdGhpcy5fYXR0YWNoKGluc3RyZWFtKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWZ0ZXI/IHRoaXMuYWZ0ZXIuYXR0YWNoKHByb2Nlc3NlZCk6IHByb2Nlc3NlZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogZGVsaXZlcnMgZXZlbnRzIHRvIHRoaXMgZmlyc3QsIHRoZW4gd2hlbiB0aGF0IGFuaW1hdGlvbiBpcyBmaW5pc2hlZFxuICAgICAqIHRoZSBmb2xsb3dlciBjb25zdW1lcnMgZXZlbnRzIGFuZCB0aGUgdmFsdWVzIGFyZSB1c2VkIGFzIG91dHB1dCwgdW50aWwgdGhlIGZvbGxvd2VyIGFuaW1hdGlvbiBjb21wbGV0ZXNcbiAgICAgKi9cbiAgICB0aGVuKGZvbGxvd2VyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IERyYXdTdHJlYW0pIDogRHJhd1N0cmVhbSB7XG4gICAgICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uIChvYnNlcnZlcikge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCAgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RUdXJuID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50ID0gZmlyc3Q7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogYXR0YWNoXCIpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZEF0dGFjaCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RBdHRhY2ggID0gc2VsZi5hdHRhY2goZmlyc3Quc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGZpcnN0IGNvbXBsZXRlXCIsIHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUdXJuID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaCA9IGZvbGxvd2VyLmF0dGFjaChzZWNvbmQuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcHJldlN1YnNjcmlwdGlvbiA9IHByZXYuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSB0byBmaXJzdCBPUiBzZWNvbmRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlyc3RUdXJuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3Qub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmQub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIC8vIG9uIGRpc3Bvc2VcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBkaXNwb3NlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0QXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgc2Vjb25kQXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSk7IC8vdG9kbyByZW1vdmUgc3Vic2NyaWJlT25zXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFuaW1hdG9yIHtcbiAgICB0aWNrZXJTdWJzY3JpcHRpb246IFJ4LkRpc3Bvc2FibGUgPSBudWxsO1xuICAgIHJvb3Q6IFJ4LlN1YmplY3Q8RHJhd1RpY2s+O1xuICAgIGFuaW1hdGlvblN1YnNjcmlwdGlvbnM6IFJ4LklEaXNwb3NhYmxlW10gPSBbXTtcbiAgICB0OiBudW1iZXIgPSAwO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKSB7XG4gICAgICAgIHRoaXMucm9vdCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpXG4gICAgfVxuICAgIHRpY2tlcih0aWNrOiBSeC5PYnNlcnZhYmxlPG51bWJlcj4pOiB2b2lkIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMudGlja2VyU3Vic2NyaXB0aW9uID0gdGljay5tYXAoZnVuY3Rpb24oZHQ6IG51bWJlcikgeyAvL21hcCB0aGUgdGlja2VyIG9udG8gYW55IC0+IGNvbnRleHRcbiAgICAgICAgICAgIHZhciB0aWNrID0gbmV3IERyYXdUaWNrKHNlbGYuY3R4LCBzZWxmLnQsIGR0KTtcbiAgICAgICAgICAgIHNlbGYudCArPSBkdDtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KS5zdWJzY3JpYmUodGhpcy5yb290KTtcbiAgICB9XG4gICAgcGxheSAoYW5pbWF0aW9uOiBBbmltYXRpb24pOiB2b2lkIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBwbGF5XCIpO1xuICAgICAgICB2YXIgc2F2ZUJlZm9yZUZyYW1lID0gdGhpcy5yb290LnRhcE9uTmV4dChmdW5jdGlvbih0aWNrKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBzYXZlXCIpO1xuICAgICAgICAgICAgdGljay5jdHguc2F2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRvQW5pbWF0aW9uID0gYW5pbWF0aW9uLmF0dGFjaChzYXZlQmVmb3JlRnJhbWUpO1xuICAgICAgICB2YXIgcmVzdG9yZUFmdGVyRnJhbWUgPSBkb0FuaW1hdGlvbi50YXAoXG4gICAgICAgICAgICBmdW5jdGlvbih0aWNrKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggbmV4dCByZXN0b3JlXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0sZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggZXJyIHJlc3RvcmVcIik7XG4gICAgICAgICAgICAgICAgc2VsZi5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSxmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFuaW1hdGlvblN1YnNjcmlwdGlvbnMucHVzaChcbiAgICAgICAgICAgIHJlc3RvcmVBZnRlckZyYW1lLnN1YnNjcmliZSgpXG4gICAgICAgICk7XG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBQb2ludCA9IFtudW1iZXIsIG51bWJlcl1cbmV4cG9ydCBmdW5jdGlvbiBwb2ludChcbiAgICB4OiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgeTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG4pOiBQb2ludFN0cmVhbVxue1xuICAgIHZhciB4X3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKHgpO1xuICAgIHZhciB5X3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKHkpO1xuXG4gICAgLy9jb25zb2xlLmxvZyhcInBvaW50OiBpbml0XCIsIHhfc3RyZWFtLCB5X3N0cmVhbSk7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgIGZ1bmN0aW9uKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgdmFyIHJlc3VsdDogW251bWJlciwgbnVtYmVyXSA9IFt4X3N0cmVhbS5uZXh0KHQpLCB5X3N0cmVhbS5uZXh0KHQpXTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJwb2ludDogbmV4dFwiLCByZXN1bHQpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qXG4gICAgUkdCIGJldHdlZW4gMCBhbmQgMjU1XG4gICAgYSBiZXR3ZWVuIDAgLSAxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb2xvcihcbiAgICByOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgZzogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGI6IG51bWJlciB8IE51bWJlclN0cmVhbSxcbiAgICBhOiBudW1iZXIgfCBOdW1iZXJTdHJlYW1cbik6IENvbG9yU3RyZWFtXG57XG4gICAgdmFyIHJfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocik7XG4gICAgdmFyIGdfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoZyk7XG4gICAgdmFyIGJfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoYik7XG4gICAgdmFyIGFfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoYSk7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgIGZ1bmN0aW9uKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgdmFyIHIgPSBNYXRoLmZsb29yKHJfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGcgPSBNYXRoLmZsb29yKGdfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGIgPSBNYXRoLmZsb29yKGJfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGEgPSBNYXRoLmZsb29yKGFfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgcmV0dXJuIFwicmdiKFwiICsgciArIFwiLFwiICsgZyArIFwiLFwiICsgYiArIFwiKVwiO1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJuZCgpOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qKlxuICogTk9URTogY3VycmVudGx5IGZhaWxzIGlmIHRoZSBzdHJlYW1zIGFyZSBkaWZmZXJlbnQgbGVuZ3Roc1xuICogQHBhcmFtIGFzc2VydER0IHRoZSBleHBlY3RlZCBjbG9jayB0aWNrIHZhbHVlc1xuICogQHBhcmFtIGFmdGVyXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RHQoZXhwZWN0ZWREdDogUnguT2JzZXJ2YWJsZTxudW1iZXI+LCBhZnRlcj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnppcChleHBlY3RlZER0LCBmdW5jdGlvbih0aWNrOiBEcmF3VGljaywgZXhwZWN0ZWREdFZhbHVlOiBudW1iZXIpIHtcbiAgICAgICAgICAgIGlmICh0aWNrLmR0ICE9IGV4cGVjdGVkRHRWYWx1ZSkgdGhyb3cgbmV3IEVycm9yKFwidW5leHBlY3RlZCBkdCBvYnNlcnZlZDogXCIgKyB0aWNrLmR0ICsgXCIsIGV4cGVjdGVkOlwiICsgZXhwZWN0ZWREdFZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KTtcbiAgICB9LCBhZnRlcik7XG59XG5cbi8vdG9kbyB3b3VsZCBiZSBuaWNlIGlmIHRoaXMgdG9vayBhbiBpdGVyYWJsZSBvciBzb21lIG90aGVyIHR5cGUgb2Ygc2ltcGxlIHB1bGwgc3RyZWFtXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Q2xvY2soYXNzZXJ0Q2xvY2s6IG51bWJlcltdLCBhZnRlcj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgdmFyIGVycm9yID0gbnVsbDtcbiAgICB2YXIgdGVzdGVyID0gbmV3IFBhcmFtZXRlclN0YXRlZnVsKFxuICAgICAgICAwLFxuICAgICAgICBbXSxcbiAgICAgICAgZnVuY3Rpb24oY2xvY2s6IG51bWJlciwgaW5kZXg6IG51bWJlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhc3NlcnRDbG9jazogdGlja1wiLCBjbG9jayk7XG4gICAgICAgICAgICBpZiAoY2xvY2sgPCBhc3NlcnRDbG9ja1tpbmRleF0gLSAwLjAwMDAxIHx8IGNsb2NrID4gYXNzZXJ0Q2xvY2tbaW5kZXhdICsgMC4wMDAwMSlcbiAgICAgICAgICAgICAgICBlcnJvciA9IFwidW5leHBlY3RlZCBjbG9jayBvYnNlcnZlZDogXCIgKyBjbG9jayArIFwiLCBleHBlY3RlZDpcIiArIGFzc2VydENsb2NrW2luZGV4XTtcblxuICAgICAgICAgICAgcmV0dXJuIGluZGV4ICsgMTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24oaW5kZXg6IG51bWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7IC8vd2UgZG9uJ3QgbmVlZCBhIHZhbHVlXG4gICAgICAgIH1cbiAgICApO1xuXG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnRhcE9uTmV4dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYXNzZXJ0Q2xvY2sgZXJyb3JcIiwgZXJyb3IpO1xuICAgICAgICAgICAgaWYgKGVycm9yKSB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9LCBhZnRlcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNwbGFjZVQ8VD4oZGlzcGxhY2VtZW50OiBudW1iZXIgfCBQYXJhbWV0ZXI8bnVtYmVyPiwgdmFsdWU6IFBhcmFtZXRlcjxUPik6IFBhcmFtZXRlcjxUPiB7XG4gICAgdmFyIGRlbHRhdDogUGFyYW1ldGVyPG51bWJlcj4gPSB0b1N0cmVhbU51bWJlcihkaXNwbGFjZW1lbnQpO1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyPFQ+IChcbiAgICAgICAgZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgICAgIHZhciBkdCA9IGRlbHRhdC5uZXh0KHQpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJkaXNwbGFjZVQ6IFwiLCBkdClcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS5uZXh0KHQgKyBkdClcbiAgICAgICAgfSk7XG59XG5cbi8vdG9kbzogc2hvdWRsIGJlIHRcbmV4cG9ydCBmdW5jdGlvbiBzaW4ocGVyaW9kOiBudW1iZXJ8IFBhcmFtZXRlcjxudW1iZXI+KTogUGFyYW1ldGVyPG51bWJlcj4ge1xuICAgIGNvbnNvbGUubG9nKFwic2luOiBuZXdcIik7XG4gICAgdmFyIHBlcmlvZF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihwZXJpb2QpO1xuXG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoZnVuY3Rpb24gKHQ6IG51bWJlcikge1xuICAgICAgICB2YXIgdmFsdWUgPSBNYXRoLnNpbih0ICogKE1hdGguUEkgKiAyKSAvIHBlcmlvZF9zdHJlYW0ubmV4dCh0KSk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic2luOiB0aWNrXCIsIHQsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNvcyhwZXJpb2Q6IG51bWJlcnwgTnVtYmVyU3RyZWFtKTogTnVtYmVyU3RyZWFtIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiY29zOiBuZXdcIik7XG4gICAgdmFyIHBlcmlvZF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihwZXJpb2QpO1xuXG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoZnVuY3Rpb24gKHQ6IG51bWJlcikge1xuICAgICAgICB2YXIgdmFsdWUgPSBNYXRoLmNvcyh0ICogKE1hdGguUEkgKiAyKSAvIHBlcmlvZF9zdHJlYW0ubmV4dCh0KSk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29zOiB0aWNrXCIsIHQsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzY2FsZV94KFxuICAgIHNjYWxlOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgeDogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG4pOiBudW1iZXIgfCBOdW1iZXJTdHJlYW1cbnsgcmV0dXJuIDA7fVxuXG5mdW5jdGlvbiBzdG9yZVR4KFxuICAgIG46IHN0cmluZywgLypwYXNzIHRob3VnaCBjb250ZXh0IGJ1dCBzdG9yZSB0cmFuc2Zvcm0gaW4gdmFyaWFibGUqL1xuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8vcGFzc3Rocm91Z2hcbik6IEFuaW1hdGlvblxueyByZXR1cm4gbnVsbDt9XG5cbmZ1bmN0aW9uIGxvYWRUeChcbiAgICBuOiBzdHJpbmcsIC8qcGFzcyB0aG91Z2ggY29udGV4dCBidXQgc3RvcmUgdHJhbnNmb3JtIGluIHZhcmlhYmxlKi9cbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvL3Bhc3N0aHJvdWdoXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBjbG9uZShcbiAgICBuOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb24gLyogY29waWVzICovXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBwYXJhbGxlbCggLy9yZW5hbWUgbGF5ZXI/XG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuZnVuY3Rpb24gc2VxdWVuY2UoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuZXhwb3J0IGZ1bmN0aW9uIGxvb3AoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGluaXRpYWxpemluZ1wiKTtcblxuXG4gICAgICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmNyZWF0ZTxEcmF3VGljaz4oZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGNyZWF0ZSBuZXcgbG9vcFwiKTtcbiAgICAgICAgICAgIHZhciBsb29wU3RhcnQgPSBudWxsO1xuICAgICAgICAgICAgdmFyIGxvb3BTdWJzY3JpcHRpb24gPSBudWxsO1xuICAgICAgICAgICAgdmFyIHQgPSAwO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBhdHRhY2hMb29wKG5leHQpIHsgLy90b2RvIEkgZmVlbCBsaWtlIHdlIGNhbiByZW1vdmUgYSBsZXZlbCBmcm9tIHRoaXMgc29tZWhvd1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIHN0YXJ0aW5nIGF0XCIsIHQpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN0YXJ0ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICBsb29wU3Vic2NyaXB0aW9uID0gYW5pbWF0aW9uLmF0dGFjaChsb29wU3RhcnQpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIGVyciB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgY29tcGxldGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbmV3IGlubmVyIGxvb3AgZmluaXNoZWQgY29uc3RydWN0aW9uXCIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByZXYuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvb3BTdGFydCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBubyBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTG9vcChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSB0byBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnQub25OZXh0KG5leHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHQgKz0gbmV4dC5kdDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHVwc3RyZWFtIGVycm9yIHRvIGRvd25zdHJlYW1cIiwgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQuYmluZChvYnNlcnZlcilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvL2Rpc3Bvc2VcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBkaXNwb3NlXCIpO1xuICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQpIGxvb3BTdGFydC5kaXNwb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJhdyhcbiAgICBmbjogKHRpY2s6IERyYXdUaWNrKSA9PiB2b2lkLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXZpb3VzOiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy50YXBPbk5leHQoZm4pO1xuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3ZlKFxuICAgIGRlbHRhOiBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICBjb25zb2xlLmxvZyhcIm1vdmU6IGF0dGFjaGVkXCIpO1xuICAgIHZhciBwb2ludFN0cmVhbTogUG9pbnRTdHJlYW0gPSB0b1N0cmVhbVBvaW50KGRlbHRhKTtcbiAgICByZXR1cm4gZHJhdyhmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgIHZhciBwb2ludCA9IHBvaW50U3RyZWFtLm5leHQodGljay5jbG9jayk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibW92ZTpcIiwgcG9pbnQpO1xuICAgICAgICBpZiAodGljaylcbiAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCBwb2ludFswXSwgcG9pbnRbMV0pO1xuICAgICAgICByZXR1cm4gdGljaztcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdmVsb2NpdHkoXG4gICAgdmVsb2NpdHk6IFBvaW50IHwgUG9pbnRTdHJlYW0sXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHZhciB2ZWxvY2l0eVN0cmVhbTogUG9pbnRTdHJlYW0gPSB0b1N0cmVhbVBvaW50KHZlbG9jaXR5KTtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbihwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHZhciBwb3M6IFBvaW50ID0gWzAuMCwwLjBdO1xuICAgICAgICByZXR1cm4gcHJldi5tYXAoZnVuY3Rpb24odGljaykge1xuICAgICAgICAgICAgdmFyIHZlbG9jaXR5ID0gdmVsb2NpdHlTdHJlYW0ubmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgIHBvc1swXSArPSB2ZWxvY2l0eVswXSAqIHRpY2suZHQ7XG4gICAgICAgICAgICBwb3NbMV0gKz0gdmVsb2NpdHlbMV0gKiB0aWNrLmR0O1xuICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKDEsIDAsIDAsIDEsIHBvc1swXSwgcG9zWzFdKTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KTtcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHdlZW5fbGluZWFyKFxuICAgIGZyb206IFBvaW50IHwgUG9pbnRTdHJlYW0sXG4gICAgdG86ICAgUG9pbnQgfCBQb2ludFN0cmVhbSxcbiAgICB0aW1lOiBudW1iZXIsXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb24gLyogY29waWVzICovXG4pOiBBbmltYXRpb25cbntcbiAgICB2YXIgZnJvbV9zdHJlYW0gPSB0b1N0cmVhbVBvaW50KGZyb20pO1xuICAgIHZhciB0b19zdHJlYW0gPSB0b1N0cmVhbVBvaW50KHRvKTtcbiAgICB2YXIgc2NhbGUgPSAxLjAgLyB0aW1lO1xuXG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24ocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICB2YXIgdCA9IDA7XG4gICAgICAgIHJldHVybiBwcmV2Lm1hcChmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0d2VlbjogaW5uZXJcIik7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IGZyb21fc3RyZWFtLm5leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICB2YXIgdG8gICA9IHRvX3N0cmVhbS5uZXh0KHRpY2suY2xvY2spO1xuXG4gICAgICAgICAgICB0ID0gdCArIHRpY2suZHQ7XG4gICAgICAgICAgICBpZiAodCA+IHRpbWUpIHQgPSB0aW1lO1xuICAgICAgICAgICAgdmFyIHggPSBmcm9tWzBdICsgKHRvWzBdIC0gZnJvbVswXSkgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICB2YXIgeSA9IGZyb21bMV0gKyAodG9bMV0gLSBmcm9tWzFdKSAqIHQgKiBzY2FsZTtcbiAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCB4LCB5KTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KS50YWtlV2hpbGUoZnVuY3Rpb24odGljaykge3JldHVybiB0IDwgdGltZTt9KVxuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWN0KFxuICAgIHAxOiBQb2ludCwgLy90b2RvIGR5bmFtaWMgcGFyYW1zIGluc3RlYWRcbiAgICBwMjogUG9pbnQsIC8vdG9kbyBkeW5hbWljIHBhcmFtcyBpbnN0ZWFkXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlY3Q6IGZpbGxSZWN0XCIpO1xuICAgICAgICB0aWNrLmN0eC5maWxsUmVjdChwMVswXSwgcDFbMV0sIHAyWzBdLCBwMlsxXSk7IC8vdG9kbyBvYnNlcnZlciBzdHJlYW0gaWYgbmVjaXNzYXJ5XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjaGFuZ2VDb2xvcihcbiAgICBjb2xvcjogc3RyaW5nLCAvL3RvZG9cbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgIHRpY2suY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmZ1bmN0aW9uIG1hcChcbiAgICBtYXBfZm46IChwcmV2OiBEcmF3VGljaykgPT4gRHJhd1RpY2ssXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2aW91czogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICByZXR1cm4gcHJldmlvdXMubWFwKG1hcF9mbilcbiAgICB9LCBhbmltYXRpb24pXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0YWtlKFxuICAgIGl0ZXJhdGlvbnM6IG51bWJlcixcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgcmV0dXJuIHByZXYudGFrZShpdGVyYXRpb25zKTtcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlciwgcGF0aDogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgR0lGRW5jb2RlciA9IHJlcXVpcmUoJ2dpZmVuY29kZXInKTtcbiAgICB2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuXG5cbiAgICB2YXIgZW5jb2RlciA9IG5ldyBHSUZFbmNvZGVyKHdpZHRoLCBoZWlnaHQpO1xuICAgIGVuY29kZXIuY3JlYXRlUmVhZFN0cmVhbSgpXG4gICAgICAucGlwZShlbmNvZGVyLmNyZWF0ZVdyaXRlU3RyZWFtKHsgcmVwZWF0OiAxMDAwMCwgZGVsYXk6IDEwMCwgcXVhbGl0eTogMSB9KSlcbiAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHBhdGgpKTtcbiAgICBlbmNvZGVyLnN0YXJ0KCk7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocGFyZW50OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHZhciB0ID0gMDtcbiAgICAgICAgdmFyIGVuZE5leHQgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHBhcmVudC50YXAoXG4gICAgICAgICAgICBmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic2F2ZTogd3JvdGUgZnJhbWVcIik7XG4gICAgICAgICAgICAgICAgLy90ICs9IHRpY2suZHQ7XG4gICAgICAgICAgICAgICAgLy92YXIgb3V0ID0gZnMud3JpdGVGaWxlU3luYyhwYXRoICsgXCJfXCIrIHQgKyBcIi5wbmdcIiwgY2FudmFzLnRvQnVmZmVyKCkpO1xuICAgICAgICAgICAgICAgIC8vdmFyIHBhcnNlZCA9IHBuZ3BhcnNlKGNhbnZhcy50b0J1ZmZlcigpKVxuICAgICAgICAgICAgICAgIGVuY29kZXIuYWRkRnJhbWUodGljay5jdHgpO1xuICAgICAgICAgICAgICAgIC8vZW5jb2Rlci5hZGRGcmFtZSh0aWNrLmN0eC5nZXRJbWFnZURhdGEoMCwgMCwgd2lkdGgsIGhlaWdodCkuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7Y29uc29sZS5lcnJvcihcInNhdmU6IG5vdCBzYXZlZFwiLCBwYXRoKTt9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7Y29uc29sZS5sb2coXCJzYXZlOiBzYXZlZFwiLCBwYXRoKTsgZW5jb2Rlci5maW5pc2goKTsvKiBlbmROZXh0ID0gdHJ1ZTsqL31cbiAgICAgICAgKVxuICAgIH0pO1xufVxuXG5cbi8vd2Ugd2lsbCBkcmF3XG4vLyBFWFBMT0RJTkcgU0hJUFxuLy8xLiBuIHBpZWNlcyBvZiBkZWJyaXMgZmx5aW5nIG91dHdhcmRzIChsaW5lYXIgbW92ZW1lbnQgaW4gdGltZSBvZiBEZWJyaXMgZnJvbSA1MCw1MCB0byBybmQsIHJuZCwgYXQgdmVsb2NpdHkgdilcbi8vMi4gZXhwbG9zaW9uIG9mIGRlYnJpcyAobGFzdCBwb3NpdGlvbiBvZiBkZWJyaXMgc3Bhd25zIGV4cGxvc2lvblxuLy8zLiBsYXJnZSBleHBsb3Npb24gYXQgY2VudGVyICg1MCw1MCkgYXQgZW5kIG9mIGxpbmVhciBtb3ZlbWVudFxudmFyIENFTlRSRSA9IHBvaW50KDUwLDUwKTtcbnZhciBUTCA9IHBvaW50KDUwLDUwKTtcbnZhciBCUiA9IHBvaW50KDUwLDUwKTtcbnZhciB0OiBudW1iZXIgPSAwO1xudmFyIG46IG51bWJlciA9IDA7XG5cbnZhciBnYXVzc2lhbjogTnVtYmVyU3RyZWFtO1xudmFyIHNwbGF0dGVyOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0gPSBzY2FsZV94KDMsIGdhdXNzaWFuKTtcblxuZnVuY3Rpb24gZHJhd0RlYnJpcygpOiBBbmltYXRpb24ge3JldHVybiBudWxsO31cbmZ1bmN0aW9uIGRyYXdFeHBsb3Npb24oKTogQW5pbWF0aW9uIHtyZXR1cm4gbnVsbDt9XG5mdW5jdGlvbiBkcmF3QmlnRXhwbG9zaW9uKCk6IEFuaW1hdGlvbiB7cmV0dXJuIG51bGw7fVxuXG4vL1doYXQgZG8gd2Ugd2FudCBpdCB0byBsb29rIGxpa2VcblxuXG4vL3RvZG9cbi8vIElOVkVTVCBJTiBCVUlMRCBBTkQgVEVTVElOR1xuXG4vLyBmaXggdGhlblxuLy8gdGVzdCBjYXNlIHNob3dzIHRpbWUgaXMgcmVzZXRcbi8vIGVtaXR0ZXJcbi8vIHJhbmQgbm9ybWFsXG5cblxuLy8gYW5pbWF0b3IucGxheShcbi8vICAgIC8vY2xvbmUgaXMgYSBwYXJyYWxsZWwgZXhlY3V0aW9uIHRoZSBzYW1lIGFuaW1hdGlvblxuLy8gICAgcGFyYWxsZWwoW2Nsb25lKG4sIGxpbmVhcl90d2VlbigvKmZpeGVkIHBvaW50Ki9DRU5UUkUsXG4vLyAgICAgICAgICAgICAgICAgICAvKmdlbmVyYXRpdmUgcG9pbnQqLyBwb2ludChzcGxhdHRlciwgc3BsYXR0ZXIpLFxuLy8gICAgICAgICAgICAgICAgICAgLyp0aW1lKi8gdCxcbi8vICAgICAgICAgICAgICAgICAgIC8qZHJhdyBmbiBmb3IgdHdlZW4qLyBzdG9yZVR4KFwiWFwiLCBkcmF3RGVicmlzKCkpKVxuLy8gICAgICAgICAgICAgICAgLnRoZW4obG9hZFR4KFwiWFwiLCBkcmF3RXhwbG9zaW9uKCkpKSAvL2FmdGVyIHRoZSB0d2VlbiBjb21wbGV0ZXMgZHJhdyB0aGUgZXhwbG9zaW9uXG4vLyAgICAgICAgICAgICAgKSxcbi8vICAgICAgICAgICAgICB0YWtlKC8qZml4ZWQgdmFsdWUqLyB0KS50aGVuKGRyYXdCaWdFeHBsb3Npb24oKSlcbi8vICAgICAgICAgICAgIF0pXG4vLyk7XG5cblxuLy8gSURFQVNcblxuLy8gUGFjTWFuXG4vLyB3aGF0IGFib3V0IGEgZGlmZmVyZW50IHdheSBvZiBtYWtpbmcgZ2xvdz9cbi8vIHJlbmRlciBsdW1pbmVjZW5jZSBpbnRvIGEgdGV4dHVyZSBhbmQgdGhlbiBjb2xvciBiYXNlZCBvbiBkaXN0YW5jZSBmcm9tIGxpZ2h0c291cmNlXG4vLyBtb3VzZSBpbnB1dCwgdGFpbGluZyBnbG93IChyZW1iZXIgdG8gdHdlZW4gYmV0d2VlbiByYXBpZCBtb3ZlbWVudHMpXG4vLyBvZmZzY3JlZW4gcmVuZGVyaW5nIGFuIHBsYXliYWNrXG4vLyBzaW4gd2F2ZSwgcmFuZG9taXplZFxuLy8gR1VJIGNvbXBvbmVudHMsIHJlc3BvbnNpdmUsIGJvb3RzdHJhcFxuLy8gZ2V0IGRhdGEgb3V0IGJ5IHRhcHBpbmcgaW50byBmbG93IChpbnRlcmNlcHQoU3ViamVjdCBwYXNzYmFjaykpXG4vLyBTVkcgaW1wb3J0XG4vLyBsYXllcmluZyB3aXRoIHBhcnJhbGxlbCAoYmFjayBmaXJzdClcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==