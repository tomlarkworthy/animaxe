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
exports.DEBUG_EMIT = true;
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
                    if (secondAttach)
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
// and used streamEquals
function assertClock(assertClock, after) {
    var index = 0;
    return new Animation(function (upstream) {
        return upstream.tapOnNext(function (tick) {
            console.log("assertClock: ", tick);
            if (tick.clock < assertClock[index] - 0.00001 || tick.clock > assertClock[index] + 0.00001) {
                var errorMsg = "unexpected clock observed: " + tick.clock + ", expected:" + assertClock[index];
                console.log(errorMsg);
                throw new Error(errorMsg);
            }
            index++;
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
/**
 * The child animation is started every frame
 * @param animation
 */
function emit(animation) {
    return new Animation(function (prev) {
        if (exports.DEBUG_EMIT)
            console.log("emit: initializing");
        var attachPoint = new Rx.Subject();
        return prev.tapOnNext(function (tick) {
            if (exports.DEBUG_EMIT)
                console.log("emit: emmitting", animation);
            animation.attach(attachPoint).subscribe();
            attachPoint.onNext(tick);
        });
    });
}
exports.emit = emit;
/**
 * When the child loop finishes, it is spawned
 * @param animation
 * @returns {Animation}
 */
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
// refactor examples
// website
// jsFiddle
// rand normal
// glow
// L systems (fold?)
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiRHJhd1RpY2siLCJEcmF3VGljay5jb25zdHJ1Y3RvciIsInN0YWNrVHJhY2UiLCJQYXJhbWV0ZXIiLCJQYXJhbWV0ZXIuY29uc3RydWN0b3IiLCJQYXJhbWV0ZXIubmV4dCIsIlBhcmFtZXRlci5tYXAiLCJQYXJhbWV0ZXIuY2xvbmUiLCJQYXJhbWV0ZXJTdGF0ZWZ1bCIsIlBhcmFtZXRlclN0YXRlZnVsLmNvbnN0cnVjdG9yIiwiRml4ZWQiLCJGaXhlZC5jb25zdHJ1Y3RvciIsInRvU3RyZWFtTnVtYmVyIiwidG9TdHJlYW1Qb2ludCIsInRvU3RyZWFtQ29sb3IiLCJBbmltYXRpb24iLCJBbmltYXRpb24uY29uc3RydWN0b3IiLCJBbmltYXRpb24uYXR0YWNoIiwiQW5pbWF0aW9uLnRoZW4iLCJBbmltYXRvciIsIkFuaW1hdG9yLmNvbnN0cnVjdG9yIiwiQW5pbWF0b3IudGlja2VyIiwiQW5pbWF0b3IucGxheSIsInBvaW50IiwiY29sb3IiLCJybmQiLCJhc3NlcnREdCIsImFzc2VydENsb2NrIiwiZGlzcGxhY2VUIiwic2luIiwiY29zIiwic2NhbGVfeCIsInN0b3JlVHgiLCJsb2FkVHgiLCJjbG9uZSIsInBhcmFsbGVsIiwic2VxdWVuY2UiLCJlbWl0IiwibG9vcCIsImF0dGFjaExvb3AiLCJkcmF3IiwibW92ZSIsInZlbG9jaXR5IiwidHdlZW5fbGluZWFyIiwicmVjdCIsImNoYW5nZUNvbG9yIiwibWFwIiwidGFrZSIsInNhdmUiLCJkcmF3RGVicmlzIiwiZHJhd0V4cGxvc2lvbiIsImRyYXdCaWdFeHBsb3Npb24iXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLEFBRUEsMERBRjBEO0FBQzFELDJDQUEyQztBQUMzQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN4QyxJQUFPLEVBQUUsV0FBVyxJQUFJLENBQUMsQ0FBQztBQUVmLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25C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LElBQUksUUFBc0IsQ0FBQztBQUMzQixJQUFJLFFBQVEsR0FBMEIsT0FBTyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUUzRCx3QkFBa0NDLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUFBLENBQUNBO0FBQy9DLDJCQUFxQ0MsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQUEsQ0FBQ0E7QUFDbEQsOEJBQXdDQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFBQSxDQUFDQTtBQUVyRCxpQ0FBaUM7QUFFakMsTUFBTTtBQUNOLDhCQUE4QjtBQUM5QixvQkFBb0I7QUFDcEIsVUFBVTtBQUNWLFdBQVc7QUFDWCxjQUFjO0FBQ2QsT0FBTztBQUNQLG9CQUFvQjtBQUdwQixpQkFBaUI7QUFDakIseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCxvRUFBb0U7QUFDcEUsZ0NBQWdDO0FBQ2hDLHNFQUFzRTtBQUN0RSxvR0FBb0c7QUFDcEcsa0JBQWtCO0FBQ2xCLGdFQUFnRTtBQUNoRSxpQkFBaUI7QUFDakIsSUFBSTtBQUdKLFFBQVE7QUFFUixTQUFTO0FBQ1QsNkNBQTZDO0FBQzdDLHNGQUFzRjtBQUN0RixzRUFBc0U7QUFDdEUsa0NBQWtDO0FBQ2xDLHVCQUF1QjtBQUN2Qix3Q0FBd0M7QUFDeEMsa0VBQWtFO0FBQ2xFLGFBQWE7QUFDYix1Q0FBdUMiLCJmaWxlIjoiYW5pbWF4ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9ub2RlX21vZHVsZXMvcngvdHMvcnguYWxsLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL25vZGUuZC50c1wiIC8+XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5pbXBvcnQgUnggPSByZXF1aXJlKFwicnhcIik7XG5cbmV4cG9ydCB2YXIgREVCVUdfTE9PUCA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVR19USEVOID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX0VNSVQgPSB0cnVlO1xuXG5leHBvcnQgY2xhc3MgRHJhd1RpY2sge1xuICAgIGNvbnN0cnVjdG9yIChwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHB1YmxpYyBjbG9jazogbnVtYmVyLCBwdWJsaWMgZHQ6IG51bWJlcikge31cbn1cblxuZnVuY3Rpb24gc3RhY2tUcmFjZSgpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG4gICAgcmV0dXJuICg8YW55PmVycikuc3RhY2s7XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJhbWV0ZXI8VmFsdWU+IHtcbiAgICAvLyB0cmllZCBpbW11dGFibGUuanMgYnV0IGl0IG9ubHkgc3VwcG9ydHMgMiBkaW1lbnNpb25hYmxlIGl0ZXJhYmxlc1xuICAgIGNvbnN0cnVjdG9yKG5leHQ6ICh0OiBudW1iZXIpID0+IFZhbHVlKSB7XG4gICAgICAgIHRoaXMubmV4dCA9IG5leHQ7XG4gICAgfVxuXG4gICAgbmV4dCh0OiBudW1iZXIpOiBWYWx1ZSB7dGhyb3cgbmV3IEVycm9yKCdUaGlzIG1ldGhvZCBpcyBhYnN0cmFjdCcpO31cblxuICAgIG1hcDxWPihmbjogKFZhbHVlKSA9PiBWKTogUGFyYW1ldGVyPFY+IHtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IFBhcmFtZXRlcihcbiAgICAgICAgICAgIGZ1bmN0aW9uKHQ6IG51bWJlcik6IFYge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJJdGVyYWJsZTogbmV4dFwiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4oYmFzZS5uZXh0KHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBjbG9uZSgpOiBQYXJhbWV0ZXI8VmFsdWU+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwKHggPT4geCk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUGFyYW1ldGVyU3RhdGVmdWw8U3RhdGUsIFZhbHVlPiBleHRlbmRzIFBhcmFtZXRlcjxWYWx1ZT57XG5cbiAgICBzdGF0ZTogU3RhdGU7XG4gICAgcHJpdmF0ZSB0aWNrOiAodDogbnVtYmVyLCBzdGF0ZTogU3RhdGUpID0+IFN0YXRlO1xuICAgIC8vIHRyaWVkIGltbXV0YWJsZS5qcyBidXQgaXQgb25seSBzdXBwb3J0cyAyIGRpbWVuc2lvbiBpdGVyYWJsZXNcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgaW5pdGlhbDogU3RhdGUsXG4gICAgICAgIHByZWRlY2Vzc29yczogUGFyYW1ldGVyPGFueT5bXSxcbiAgICAgICAgdGljazogKHQ6IG51bWJlciwgc3RhdGU6IFN0YXRlKSA9PiBTdGF0ZSxcbiAgICAgICAgdmFsdWU6IChzdGF0ZTogU3RhdGUpID0+IFZhbHVlKSB7XG5cbiAgICAgICAgc3VwZXIoXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlKHRoaXMuc3RhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICB0aGlzLnN0YXRlID0gaW5pdGlhbDtcbiAgICAgICAgdGhpcy50aWNrICA9IHRpY2s7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBUT0RPLCB3ZSBjb3VsZCBtYXAgc3RhdGUgaGVyZSBtYXliZVxuICAgIG1hcDxWPihmbjogKFZhbHVlKSA9PiBWKTogSXRlcmFibGVTdGF0ZWZ1bDxhbnksIFY+IHtcbiAgICAgICAgdmFyIGJhc2UgPSB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IEl0ZXJhYmxlU3RhdGVmdWwoXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgW2Jhc2VdLFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7fSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCk6IFYge1xuICAgICAgICAgICAgICAgIHJldHVybiBmbihiYXNlLm5leHQoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSoqL1xufVxuXG5leHBvcnQgdHlwZSBOdW1iZXJTdHJlYW0gPSBQYXJhbWV0ZXI8bnVtYmVyPjtcbmV4cG9ydCB0eXBlIFBvaW50U3RyZWFtID0gUGFyYW1ldGVyPFBvaW50PjtcbmV4cG9ydCB0eXBlIENvbG9yU3RyZWFtID0gUGFyYW1ldGVyPHN0cmluZz47XG5leHBvcnQgdHlwZSBEcmF3U3RyZWFtID0gUnguT2JzZXJ2YWJsZTxEcmF3VGljaz47XG5cbmV4cG9ydCBjbGFzcyBGaXhlZDxUPiBleHRlbmRzIFBhcmFtZXRlcjxUPiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIHZhbDogVCkge1xuICAgICAgICBzdXBlcihcbiAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvU3RyZWFtTnVtYmVyKHg6IG51bWJlciB8IE51bWJlclN0cmVhbSk6IE51bWJlclN0cmVhbSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnbnVtYmVyJyA/IG5ldyBGaXhlZCh4KTogeDtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbVBvaW50KHg6IFBvaW50IHwgUG9pbnRTdHJlYW0pOiBQb2ludFN0cmVhbSB7XG4gICAgcmV0dXJuIDxQb2ludFN0cmVhbT4gKHR5cGVvZiAoPGFueT54KS5uZXh0ID09PSAnZnVuY3Rpb24nID8geDogbmV3IEZpeGVkKHgpKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbUNvbG9yKHg6IHN0cmluZyB8IENvbG9yU3RyZWFtKTogQ29sb3JTdHJlYW0ge1xuICAgIHJldHVybiA8Q29sb3JTdHJlYW0+ICh0eXBlb2YgKDxhbnk+eCkubmV4dCA9PT0gJ2Z1bmN0aW9uJyA/IHg6IG5ldyBGaXhlZCh4KSk7XG59XG5cbmV4cG9ydCBjbGFzcyBBbmltYXRpb24ge1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIF9hdHRhY2g6ICh1cHN0cmVhbTogRHJhd1N0cmVhbSkgPT4gRHJhd1N0cmVhbSwgcHVibGljIGFmdGVyPzogQW5pbWF0aW9uKSB7XG4gICAgfVxuICAgIGF0dGFjaCh1cHN0cmVhbTogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJhbmltYXRpb24gaW5pdGlhbGl6ZWQgXCIsIGNsb2NrKTtcblxuICAgICAgICB2YXIgaW5zdHJlYW0gPSBudWxsO1xuICAgICAgICBpbnN0cmVhbSA9IHVwc3RyZWFtO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiYW5pbWF0aW9uOiBpbnN0cmVhbVwiLCBpbnN0cmVhbSwgXCJ1cHN0cmVhbVwiLCB1cHN0cmVhbSk7XG4gICAgICAgIHZhciBwcm9jZXNzZWQgPSB0aGlzLl9hdHRhY2goaW5zdHJlYW0pO1xuICAgICAgICByZXR1cm4gdGhpcy5hZnRlcj8gdGhpcy5hZnRlci5hdHRhY2gocHJvY2Vzc2VkKTogcHJvY2Vzc2VkO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBkZWxpdmVycyBldmVudHMgdG8gdGhpcyBmaXJzdCwgdGhlbiB3aGVuIHRoYXQgYW5pbWF0aW9uIGlzIGZpbmlzaGVkXG4gICAgICogdGhlIGZvbGxvd2VyIGNvbnN1bWVycyBldmVudHMgYW5kIHRoZSB2YWx1ZXMgYXJlIHVzZWQgYXMgb3V0cHV0LCB1bnRpbCB0aGUgZm9sbG93ZXIgYW5pbWF0aW9uIGNvbXBsZXRlc1xuICAgICAqL1xuICAgIHRoZW4oZm9sbG93ZXI6IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSkgOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmNyZWF0ZTxEcmF3VGljaz4oZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ICA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuICAgICAgICAgICAgICAgIHZhciBzZWNvbmQgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcblxuICAgICAgICAgICAgICAgIHZhciBmaXJzdFR1cm4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnQgPSBmaXJzdDtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBhdHRhY2hcIik7XG5cbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kQXR0YWNoID0gbnVsbDtcblxuICAgICAgICAgICAgICAgIHZhciBmaXJzdEF0dGFjaCAgPSBzZWxmLmF0dGFjaChmaXJzdC5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBmaXJzdCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgY29tcGxldGVcIiwgdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFR1cm4gPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vjb25kQXR0YWNoID0gZm9sbG93ZXIuYXR0YWNoKHNlY29uZC5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogc2Vjb25kIHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IuYmluZChvYnNlcnZlciksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogc2Vjb25kIGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkNvbXBsZXRlZCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIHZhciBwcmV2U3Vic2NyaXB0aW9uID0gcHJldi5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHVwc3RyZWFtIHRvIGZpcnN0IE9SIHNlY29uZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaXJzdFR1cm4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdC5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZC5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHVwc3RyZWFtIGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgLy8gb24gZGlzcG9zZVxuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGRpc3Bvc2VyXCIpO1xuICAgICAgICAgICAgICAgICAgICBwcmV2U3Vic2NyaXB0aW9uLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RBdHRhY2guZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vjb25kQXR0YWNoKVxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vjb25kQXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSk7IC8vdG9kbyByZW1vdmUgc3Vic2NyaWJlT25zXG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFuaW1hdG9yIHtcbiAgICB0aWNrZXJTdWJzY3JpcHRpb246IFJ4LkRpc3Bvc2FibGUgPSBudWxsO1xuICAgIHJvb3Q6IFJ4LlN1YmplY3Q8RHJhd1RpY2s+O1xuICAgIGFuaW1hdGlvblN1YnNjcmlwdGlvbnM6IFJ4LklEaXNwb3NhYmxlW10gPSBbXTtcbiAgICB0OiBudW1iZXIgPSAwO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKSB7XG4gICAgICAgIHRoaXMucm9vdCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpXG4gICAgfVxuICAgIHRpY2tlcih0aWNrOiBSeC5PYnNlcnZhYmxlPG51bWJlcj4pOiB2b2lkIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMudGlja2VyU3Vic2NyaXB0aW9uID0gdGljay5tYXAoZnVuY3Rpb24oZHQ6IG51bWJlcikgeyAvL21hcCB0aGUgdGlja2VyIG9udG8gYW55IC0+IGNvbnRleHRcbiAgICAgICAgICAgIHZhciB0aWNrID0gbmV3IERyYXdUaWNrKHNlbGYuY3R4LCBzZWxmLnQsIGR0KTtcbiAgICAgICAgICAgIHNlbGYudCArPSBkdDtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KS5zdWJzY3JpYmUodGhpcy5yb290KTtcbiAgICB9XG4gICAgcGxheSAoYW5pbWF0aW9uOiBBbmltYXRpb24pOiB2b2lkIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBwbGF5XCIpO1xuICAgICAgICB2YXIgc2F2ZUJlZm9yZUZyYW1lID0gdGhpcy5yb290LnRhcE9uTmV4dChmdW5jdGlvbih0aWNrKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBzYXZlXCIpO1xuICAgICAgICAgICAgdGljay5jdHguc2F2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGRvQW5pbWF0aW9uID0gYW5pbWF0aW9uLmF0dGFjaChzYXZlQmVmb3JlRnJhbWUpO1xuICAgICAgICB2YXIgcmVzdG9yZUFmdGVyRnJhbWUgPSBkb0FuaW1hdGlvbi50YXAoXG4gICAgICAgICAgICBmdW5jdGlvbih0aWNrKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggbmV4dCByZXN0b3JlXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0sZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggZXJyIHJlc3RvcmVcIik7XG4gICAgICAgICAgICAgICAgc2VsZi5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSxmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFuaW1hdGlvblN1YnNjcmlwdGlvbnMucHVzaChcbiAgICAgICAgICAgIHJlc3RvcmVBZnRlckZyYW1lLnN1YnNjcmliZSgpXG4gICAgICAgICk7XG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBQb2ludCA9IFtudW1iZXIsIG51bWJlcl1cbmV4cG9ydCBmdW5jdGlvbiBwb2ludChcbiAgICB4OiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgeTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG4pOiBQb2ludFN0cmVhbVxue1xuICAgIHZhciB4X3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKHgpO1xuICAgIHZhciB5X3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKHkpO1xuXG4gICAgLy9jb25zb2xlLmxvZyhcInBvaW50OiBpbml0XCIsIHhfc3RyZWFtLCB5X3N0cmVhbSk7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgIGZ1bmN0aW9uKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgdmFyIHJlc3VsdDogW251bWJlciwgbnVtYmVyXSA9IFt4X3N0cmVhbS5uZXh0KHQpLCB5X3N0cmVhbS5uZXh0KHQpXTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJwb2ludDogbmV4dFwiLCByZXN1bHQpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qXG4gICAgUkdCIGJldHdlZW4gMCBhbmQgMjU1XG4gICAgYSBiZXR3ZWVuIDAgLSAxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb2xvcihcbiAgICByOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgZzogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGI6IG51bWJlciB8IE51bWJlclN0cmVhbSxcbiAgICBhOiBudW1iZXIgfCBOdW1iZXJTdHJlYW1cbik6IENvbG9yU3RyZWFtXG57XG4gICAgdmFyIHJfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocik7XG4gICAgdmFyIGdfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoZyk7XG4gICAgdmFyIGJfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoYik7XG4gICAgdmFyIGFfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoYSk7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgIGZ1bmN0aW9uKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgdmFyIHIgPSBNYXRoLmZsb29yKHJfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGcgPSBNYXRoLmZsb29yKGdfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGIgPSBNYXRoLmZsb29yKGJfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGEgPSBNYXRoLmZsb29yKGFfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgcmV0dXJuIFwicmdiKFwiICsgciArIFwiLFwiICsgZyArIFwiLFwiICsgYiArIFwiKVwiO1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJuZCgpOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qKlxuICogTk9URTogY3VycmVudGx5IGZhaWxzIGlmIHRoZSBzdHJlYW1zIGFyZSBkaWZmZXJlbnQgbGVuZ3Roc1xuICogQHBhcmFtIGFzc2VydER0IHRoZSBleHBlY3RlZCBjbG9jayB0aWNrIHZhbHVlc1xuICogQHBhcmFtIGFmdGVyXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RHQoZXhwZWN0ZWREdDogUnguT2JzZXJ2YWJsZTxudW1iZXI+LCBhZnRlcj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnppcChleHBlY3RlZER0LCBmdW5jdGlvbih0aWNrOiBEcmF3VGljaywgZXhwZWN0ZWREdFZhbHVlOiBudW1iZXIpIHtcbiAgICAgICAgICAgIGlmICh0aWNrLmR0ICE9IGV4cGVjdGVkRHRWYWx1ZSkgdGhyb3cgbmV3IEVycm9yKFwidW5leHBlY3RlZCBkdCBvYnNlcnZlZDogXCIgKyB0aWNrLmR0ICsgXCIsIGV4cGVjdGVkOlwiICsgZXhwZWN0ZWREdFZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KTtcbiAgICB9LCBhZnRlcik7XG59XG5cbi8vdG9kbyB3b3VsZCBiZSBuaWNlIGlmIHRoaXMgdG9vayBhbiBpdGVyYWJsZSBvciBzb21lIG90aGVyIHR5cGUgb2Ygc2ltcGxlIHB1bGwgc3RyZWFtXG4vLyBhbmQgdXNlZCBzdHJlYW1FcXVhbHNcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRDbG9jayhhc3NlcnRDbG9jazogbnVtYmVyW10sIGFmdGVyPzogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgaW5kZXggPSAwO1xuXG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnRhcE9uTmV4dChmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhc3NlcnRDbG9jazogXCIsIHRpY2spO1xuICAgICAgICAgICAgaWYgKHRpY2suY2xvY2sgPCBhc3NlcnRDbG9ja1tpbmRleF0gLSAwLjAwMDAxIHx8IHRpY2suY2xvY2sgPiBhc3NlcnRDbG9ja1tpbmRleF0gKyAwLjAwMDAxKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yTXNnID0gXCJ1bmV4cGVjdGVkIGNsb2NrIG9ic2VydmVkOiBcIiArIHRpY2suY2xvY2sgKyBcIiwgZXhwZWN0ZWQ6XCIgKyBhc3NlcnRDbG9ja1tpbmRleF1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvck1zZyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yTXNnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluZGV4ICsrO1xuICAgICAgICB9KTtcbiAgICB9LCBhZnRlcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkaXNwbGFjZVQ8VD4oZGlzcGxhY2VtZW50OiBudW1iZXIgfCBQYXJhbWV0ZXI8bnVtYmVyPiwgdmFsdWU6IFBhcmFtZXRlcjxUPik6IFBhcmFtZXRlcjxUPiB7XG4gICAgdmFyIGRlbHRhdDogUGFyYW1ldGVyPG51bWJlcj4gPSB0b1N0cmVhbU51bWJlcihkaXNwbGFjZW1lbnQpO1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyPFQ+IChcbiAgICAgICAgZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgICAgIHZhciBkdCA9IGRlbHRhdC5uZXh0KHQpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJkaXNwbGFjZVQ6IFwiLCBkdClcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS5uZXh0KHQgKyBkdClcbiAgICAgICAgfSk7XG59XG5cbi8vdG9kbzogc2hvdWRsIGJlIHRcbmV4cG9ydCBmdW5jdGlvbiBzaW4ocGVyaW9kOiBudW1iZXJ8IFBhcmFtZXRlcjxudW1iZXI+KTogUGFyYW1ldGVyPG51bWJlcj4ge1xuICAgIGNvbnNvbGUubG9nKFwic2luOiBuZXdcIik7XG4gICAgdmFyIHBlcmlvZF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihwZXJpb2QpO1xuXG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoZnVuY3Rpb24gKHQ6IG51bWJlcikge1xuICAgICAgICB2YXIgdmFsdWUgPSBNYXRoLnNpbih0ICogKE1hdGguUEkgKiAyKSAvIHBlcmlvZF9zdHJlYW0ubmV4dCh0KSk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic2luOiB0aWNrXCIsIHQsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNvcyhwZXJpb2Q6IG51bWJlcnwgTnVtYmVyU3RyZWFtKTogTnVtYmVyU3RyZWFtIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiY29zOiBuZXdcIik7XG4gICAgdmFyIHBlcmlvZF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihwZXJpb2QpO1xuXG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoZnVuY3Rpb24gKHQ6IG51bWJlcikge1xuICAgICAgICB2YXIgdmFsdWUgPSBNYXRoLmNvcyh0ICogKE1hdGguUEkgKiAyKSAvIHBlcmlvZF9zdHJlYW0ubmV4dCh0KSk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29zOiB0aWNrXCIsIHQsIHZhbHVlKTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzY2FsZV94KFxuICAgIHNjYWxlOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgeDogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG4pOiBudW1iZXIgfCBOdW1iZXJTdHJlYW1cbnsgcmV0dXJuIDA7fVxuXG5mdW5jdGlvbiBzdG9yZVR4KFxuICAgIG46IHN0cmluZywgLypwYXNzIHRob3VnaCBjb250ZXh0IGJ1dCBzdG9yZSB0cmFuc2Zvcm0gaW4gdmFyaWFibGUqL1xuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8vcGFzc3Rocm91Z2hcbik6IEFuaW1hdGlvblxueyByZXR1cm4gbnVsbDt9XG5cbmZ1bmN0aW9uIGxvYWRUeChcbiAgICBuOiBzdHJpbmcsIC8qcGFzcyB0aG91Z2ggY29udGV4dCBidXQgc3RvcmUgdHJhbnNmb3JtIGluIHZhcmlhYmxlKi9cbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvL3Bhc3N0aHJvdWdoXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBjbG9uZShcbiAgICBuOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb24gLyogY29waWVzICovXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBwYXJhbGxlbCggLy9yZW5hbWUgbGF5ZXI/XG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuZnVuY3Rpb24gc2VxdWVuY2UoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuLyoqXG4gKiBUaGUgY2hpbGQgYW5pbWF0aW9uIGlzIHN0YXJ0ZWQgZXZlcnkgZnJhbWVcbiAqIEBwYXJhbSBhbmltYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVtaXQoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcImVtaXQ6IGluaXRpYWxpemluZ1wiKTtcbiAgICAgICAgdmFyIGF0dGFjaFBvaW50ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgcmV0dXJuIHByZXYudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwiZW1pdDogZW1taXR0aW5nXCIsIGFuaW1hdGlvbik7XG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uLmF0dGFjaChhdHRhY2hQb2ludCkuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgYXR0YWNoUG9pbnQub25OZXh0KHRpY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIFdoZW4gdGhlIGNoaWxkIGxvb3AgZmluaXNoZXMsIGl0IGlzIHNwYXduZWRcbiAqIEBwYXJhbSBhbmltYXRpb25cbiAqIEByZXR1cm5zIHtBbmltYXRpb259XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb29wKFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBpbml0aWFsaXppbmdcIik7XG5cblxuICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBjcmVhdGUgbmV3IGxvb3BcIik7XG4gICAgICAgICAgICB2YXIgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBsb29wU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICAgICAgICAgIHZhciB0ID0gMDtcblxuICAgICAgICAgICAgZnVuY3Rpb24gYXR0YWNoTG9vcChuZXh0KSB7IC8vdG9kbyBJIGZlZWwgbGlrZSB3ZSBjYW4gcmVtb3ZlIGEgbGV2ZWwgZnJvbSB0aGlzIHNvbWVob3dcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBuZXcgaW5uZXIgbG9vcCBzdGFydGluZyBhdFwiLCB0KTtcblxuICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN1YnNjcmlwdGlvbiA9IGFuaW1hdGlvbi5hdHRhY2gobG9vcFN0YXJ0KS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCBlcnIgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBwb3N0LWlubmVyIGNvbXBsZXRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIGZpbmlzaGVkIGNvbnN0cnVjdGlvblwiKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmV2LnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbm8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaExvb3AobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogdXBzdHJlYW0gdG8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0Lm9uTmV4dChuZXh0KTtcblxuICAgICAgICAgICAgICAgICAgICB0ICs9IG5leHQuZHQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSBlcnJvciB0byBkb3duc3RyZWFtXCIsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkLmJpbmQob2JzZXJ2ZXIpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy9kaXNwb3NlXG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogZGlzcG9zZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAobG9vcFN0YXJ0KSBsb29wU3RhcnQuZGlzcG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXcoXG4gICAgZm46ICh0aWNrOiBEcmF3VGljaykgPT4gdm9pZCxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2aW91czogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICByZXR1cm4gcHJldmlvdXMudGFwT25OZXh0KGZuKTtcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW92ZShcbiAgICBkZWx0YTogUG9pbnQgfCBQb2ludFN0cmVhbSxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgY29uc29sZS5sb2coXCJtb3ZlOiBhdHRhY2hlZFwiKTtcbiAgICB2YXIgcG9pbnRTdHJlYW06IFBvaW50U3RyZWFtID0gdG9TdHJlYW1Qb2ludChkZWx0YSk7XG4gICAgcmV0dXJuIGRyYXcoZnVuY3Rpb24odGljaykge1xuICAgICAgICB2YXIgcG9pbnQgPSBwb2ludFN0cmVhbS5uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1vdmU6XCIsIHBvaW50KTtcbiAgICAgICAgaWYgKHRpY2spXG4gICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgcG9pbnRbMF0sIHBvaW50WzFdKTtcbiAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZlbG9jaXR5KFxuICAgIHZlbG9jaXR5OiBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgdmVsb2NpdHlTdHJlYW06IFBvaW50U3RyZWFtID0gdG9TdHJlYW1Qb2ludCh2ZWxvY2l0eSk7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24ocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICB2YXIgcG9zOiBQb2ludCA9IFswLjAsMC4wXTtcbiAgICAgICAgcmV0dXJuIHByZXYubWFwKGZ1bmN0aW9uKHRpY2spIHtcbiAgICAgICAgICAgIHZhciB2ZWxvY2l0eSA9IHZlbG9jaXR5U3RyZWFtLm5leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICBwb3NbMF0gKz0gdmVsb2NpdHlbMF0gKiB0aWNrLmR0O1xuICAgICAgICAgICAgcG9zWzFdICs9IHZlbG9jaXR5WzFdICogdGljay5kdDtcbiAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCBwb3NbMF0sIHBvc1sxXSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSk7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR3ZWVuX2xpbmVhcihcbiAgICBmcm9tOiBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIHRvOiAgIFBvaW50IHwgUG9pbnRTdHJlYW0sXG4gICAgdGltZTogbnVtYmVyLFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8qIGNvcGllcyAqL1xuKTogQW5pbWF0aW9uXG57XG4gICAgdmFyIGZyb21fc3RyZWFtID0gdG9TdHJlYW1Qb2ludChmcm9tKTtcbiAgICB2YXIgdG9fc3RyZWFtID0gdG9TdHJlYW1Qb2ludCh0byk7XG4gICAgdmFyIHNjYWxlID0gMS4wIC8gdGltZTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICByZXR1cm4gcHJldi5tYXAoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidHdlZW46IGlubmVyXCIpO1xuICAgICAgICAgICAgdmFyIGZyb20gPSBmcm9tX3N0cmVhbS5uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgdmFyIHRvICAgPSB0b19zdHJlYW0ubmV4dCh0aWNrLmNsb2NrKTtcblxuICAgICAgICAgICAgdCA9IHQgKyB0aWNrLmR0O1xuICAgICAgICAgICAgaWYgKHQgPiB0aW1lKSB0ID0gdGltZTtcbiAgICAgICAgICAgIHZhciB4ID0gZnJvbVswXSArICh0b1swXSAtIGZyb21bMF0pICogdCAqIHNjYWxlO1xuICAgICAgICAgICAgdmFyIHkgPSBmcm9tWzFdICsgKHRvWzFdIC0gZnJvbVsxXSkgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgeCwgeSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSkudGFrZVdoaWxlKGZ1bmN0aW9uKHRpY2spIHtyZXR1cm4gdCA8IHRpbWU7fSlcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVjdChcbiAgICBwMTogUG9pbnQsIC8vdG9kbyBkeW5hbWljIHBhcmFtcyBpbnN0ZWFkXG4gICAgcDI6IFBvaW50LCAvL3RvZG8gZHluYW1pYyBwYXJhbXMgaW5zdGVhZFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhmdW5jdGlvbiAodGljazogRHJhd1RpY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJyZWN0OiBmaWxsUmVjdFwiKTtcbiAgICAgICAgdGljay5jdHguZmlsbFJlY3QocDFbMF0sIHAxWzFdLCBwMlswXSwgcDJbMV0pOyAvL3RvZG8gb2JzZXJ2ZXIgc3RyZWFtIGlmIG5lY2lzc2FyeVxuICAgIH0sIGFuaW1hdGlvbik7XG59XG5leHBvcnQgZnVuY3Rpb24gY2hhbmdlQ29sb3IoXG4gICAgY29sb3I6IHN0cmluZywgLy90b2RvXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICB0aWNrLmN0eC5maWxsU3R5bGUgPSBjb2xvcjtcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5mdW5jdGlvbiBtYXAoXG4gICAgbWFwX2ZuOiAocHJldjogRHJhd1RpY2spID0+IERyYXdUaWNrLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldmlvdXM6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzLm1hcChtYXBfZm4pXG4gICAgfSwgYW5pbWF0aW9uKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdGFrZShcbiAgICBpdGVyYXRpb25zOiBudW1iZXIsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbihwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwcmV2LnRha2UoaXRlcmF0aW9ucyk7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZSh3aWR0aDpudW1iZXIsIGhlaWdodDpudW1iZXIsIHBhdGg6IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgdmFyIEdJRkVuY29kZXIgPSByZXF1aXJlKCdnaWZlbmNvZGVyJyk7XG4gICAgdmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcblxuXG4gICAgdmFyIGVuY29kZXIgPSBuZXcgR0lGRW5jb2Rlcih3aWR0aCwgaGVpZ2h0KTtcbiAgICBlbmNvZGVyLmNyZWF0ZVJlYWRTdHJlYW0oKVxuICAgICAgLnBpcGUoZW5jb2Rlci5jcmVhdGVXcml0ZVN0cmVhbSh7IHJlcGVhdDogMTAwMDAsIGRlbGF5OiAxMDAsIHF1YWxpdHk6IDEgfSkpXG4gICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShwYXRoKSk7XG4gICAgZW5jb2Rlci5zdGFydCgpO1xuXG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHBhcmVudDogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICB2YXIgdCA9IDA7XG4gICAgICAgIHZhciBlbmROZXh0ID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBwYXJlbnQudGFwKFxuICAgICAgICAgICAgZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInNhdmU6IHdyb3RlIGZyYW1lXCIpO1xuICAgICAgICAgICAgICAgIC8vdCArPSB0aWNrLmR0O1xuICAgICAgICAgICAgICAgIC8vdmFyIG91dCA9IGZzLndyaXRlRmlsZVN5bmMocGF0aCArIFwiX1wiKyB0ICsgXCIucG5nXCIsIGNhbnZhcy50b0J1ZmZlcigpKTtcbiAgICAgICAgICAgICAgICAvL3ZhciBwYXJzZWQgPSBwbmdwYXJzZShjYW52YXMudG9CdWZmZXIoKSlcbiAgICAgICAgICAgICAgICBlbmNvZGVyLmFkZEZyYW1lKHRpY2suY3R4KTtcbiAgICAgICAgICAgICAgICAvL2VuY29kZXIuYWRkRnJhbWUodGljay5jdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHdpZHRoLCBoZWlnaHQpLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge2NvbnNvbGUuZXJyb3IoXCJzYXZlOiBub3Qgc2F2ZWRcIiwgcGF0aCk7fSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge2NvbnNvbGUubG9nKFwic2F2ZTogc2F2ZWRcIiwgcGF0aCk7IGVuY29kZXIuZmluaXNoKCk7LyogZW5kTmV4dCA9IHRydWU7Ki99XG4gICAgICAgIClcbiAgICB9KTtcbn1cblxuXG4vL3dlIHdpbGwgZHJhd1xuLy8gRVhQTE9ESU5HIFNISVBcbi8vMS4gbiBwaWVjZXMgb2YgZGVicmlzIGZseWluZyBvdXR3YXJkcyAobGluZWFyIG1vdmVtZW50IGluIHRpbWUgb2YgRGVicmlzIGZyb20gNTAsNTAgdG8gcm5kLCBybmQsIGF0IHZlbG9jaXR5IHYpXG4vLzIuIGV4cGxvc2lvbiBvZiBkZWJyaXMgKGxhc3QgcG9zaXRpb24gb2YgZGVicmlzIHNwYXducyBleHBsb3Npb25cbi8vMy4gbGFyZ2UgZXhwbG9zaW9uIGF0IGNlbnRlciAoNTAsNTApIGF0IGVuZCBvZiBsaW5lYXIgbW92ZW1lbnRcbnZhciBDRU5UUkUgPSBwb2ludCg1MCw1MCk7XG52YXIgVEwgPSBwb2ludCg1MCw1MCk7XG52YXIgQlIgPSBwb2ludCg1MCw1MCk7XG52YXIgdDogbnVtYmVyID0gMDtcbnZhciBuOiBudW1iZXIgPSAwO1xuXG52YXIgZ2F1c3NpYW46IE51bWJlclN0cmVhbTtcbnZhciBzcGxhdHRlcjogbnVtYmVyIHwgTnVtYmVyU3RyZWFtID0gc2NhbGVfeCgzLCBnYXVzc2lhbik7XG5cbmZ1bmN0aW9uIGRyYXdEZWJyaXMoKTogQW5pbWF0aW9uIHtyZXR1cm4gbnVsbDt9XG5mdW5jdGlvbiBkcmF3RXhwbG9zaW9uKCk6IEFuaW1hdGlvbiB7cmV0dXJuIG51bGw7fVxuZnVuY3Rpb24gZHJhd0JpZ0V4cGxvc2lvbigpOiBBbmltYXRpb24ge3JldHVybiBudWxsO31cblxuLy9XaGF0IGRvIHdlIHdhbnQgaXQgdG8gbG9vayBsaWtlXG5cbi8vdG9kb1xuLy8gSU5WRVNUIElOIEJVSUxEIEFORCBURVNUSU5HXG4vLyByZWZhY3RvciBleGFtcGxlc1xuLy8gd2Vic2l0ZVxuLy8ganNGaWRkbGVcbi8vIHJhbmQgbm9ybWFsXG4vLyBnbG93XG4vLyBMIHN5c3RlbXMgKGZvbGQ/KVxuXG5cbi8vIGFuaW1hdG9yLnBsYXkoXG4vLyAgICAvL2Nsb25lIGlzIGEgcGFycmFsbGVsIGV4ZWN1dGlvbiB0aGUgc2FtZSBhbmltYXRpb25cbi8vICAgIHBhcmFsbGVsKFtjbG9uZShuLCBsaW5lYXJfdHdlZW4oLypmaXhlZCBwb2ludCovQ0VOVFJFLFxuLy8gICAgICAgICAgICAgICAgICAgLypnZW5lcmF0aXZlIHBvaW50Ki8gcG9pbnQoc3BsYXR0ZXIsIHNwbGF0dGVyKSxcbi8vICAgICAgICAgICAgICAgICAgIC8qdGltZSovIHQsXG4vLyAgICAgICAgICAgICAgICAgICAvKmRyYXcgZm4gZm9yIHR3ZWVuKi8gc3RvcmVUeChcIlhcIiwgZHJhd0RlYnJpcygpKSlcbi8vICAgICAgICAgICAgICAgIC50aGVuKGxvYWRUeChcIlhcIiwgZHJhd0V4cGxvc2lvbigpKSkgLy9hZnRlciB0aGUgdHdlZW4gY29tcGxldGVzIGRyYXcgdGhlIGV4cGxvc2lvblxuLy8gICAgICAgICAgICAgICksXG4vLyAgICAgICAgICAgICAgdGFrZSgvKmZpeGVkIHZhbHVlKi8gdCkudGhlbihkcmF3QmlnRXhwbG9zaW9uKCkpXG4vLyAgICAgICAgICAgICBdKVxuLy8pO1xuXG5cbi8vIElERUFTXG5cbi8vIFBhY01hblxuLy8gd2hhdCBhYm91dCBhIGRpZmZlcmVudCB3YXkgb2YgbWFraW5nIGdsb3c/XG4vLyByZW5kZXIgbHVtaW5lY2VuY2UgaW50byBhIHRleHR1cmUgYW5kIHRoZW4gY29sb3IgYmFzZWQgb24gZGlzdGFuY2UgZnJvbSBsaWdodHNvdXJjZVxuLy8gbW91c2UgaW5wdXQsIHRhaWxpbmcgZ2xvdyAocmVtYmVyIHRvIHR3ZWVuIGJldHdlZW4gcmFwaWQgbW92ZW1lbnRzKVxuLy8gb2Zmc2NyZWVuIHJlbmRlcmluZyBhbiBwbGF5YmFja1xuLy8gc2luIHdhdmUsIHJhbmRvbWl6ZWRcbi8vIEdVSSBjb21wb25lbnRzLCByZXNwb25zaXZlLCBib290c3RyYXBcbi8vIGdldCBkYXRhIG91dCBieSB0YXBwaW5nIGludG8gZmxvdyAoaW50ZXJjZXB0KFN1YmplY3QgcGFzc2JhY2spKVxuLy8gU1ZHIGltcG9ydFxuLy8gbGF5ZXJpbmcgd2l0aCBwYXJyYWxsZWwgKGJhY2sgZmlyc3QpXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=