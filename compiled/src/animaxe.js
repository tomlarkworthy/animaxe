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
function fixed(val) {
    if (typeof val.next === 'function') {
        var generate = true;
        // we were passed in a Parameter object
        return new Parameter(function (clock) {
            if (generate) {
                generate = false;
                val = val.next(clock);
            }
            return val;
        });
    }
    else {
        return new Parameter(function (clock) {
            return val;
        });
    }
}
exports.fixed = fixed;
function toStreamNumber(x) {
    return typeof x === 'number' ? fixed(x) : x;
}
exports.toStreamNumber = toStreamNumber;
function toStreamPoint(x) {
    return (typeof x.next === 'function' ? x : fixed(x));
}
exports.toStreamPoint = toStreamPoint;
function toStreamColor(x) {
    return (typeof x.next === 'function' ? x : fixed(x));
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
                        console.log("then: first complete");
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
            console.log("animator: ctx err restore", err);
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
function rndNormal(scale) {
    if (scale === void 0) { scale = 1; }
    var scale_ = toStreamNumber(scale);
    return new Parameter(function (t) {
        var scale = scale_.next(t);
        // generate random numbers
        var norm2 = 100;
        while (norm2 > 1) {
            var x = (Math.random() - 0.5) * 2;
            var y = (Math.random() - 0.5) * 2;
            norm2 = x * x + y * y;
        }
        var norm = Math.sqrt(norm2);
        return [scale * x / norm, scale * y / norm];
    });
}
exports.rndNormal = rndNormal;
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
/**
 * plays several animations, finishes when they are all done.
 * @param animations
 * @returns {Animation}
 * todo: I think there are lots of bugs when an animation stops part way
 * I think it be better if this spawned its own Animator to handle ctx restores
 */
function parallel(animations) {
    return new Animation(function (prev) {
        if (exports.DEBUG_EMIT)
            console.log("parallel: initializing");
        var activeAnimations = 0;
        var attachPoint = new Rx.Subject();
        function decrementActive() {
            if (exports.DEBUG_EMIT)
                console.log("parallel: decrement active");
            activeAnimations--;
        }
        animations.forEach(function (animation) {
            activeAnimations++;
            animation.attach(attachPoint.tapOnNext(function (tick) { return tick.ctx.save(); })).subscribe(function (tick) { return tick.ctx.restore(); }, decrementActive, decrementActive);
        });
        return prev.takeWhile(function () { return activeAnimations > 0; }).tapOnNext(function (tick) {
            if (exports.DEBUG_EMIT)
                console.log("parallel: emitting, animations", tick);
            attachPoint.onNext(tick);
            if (exports.DEBUG_EMIT)
                console.log("parallel: emitting finished");
        });
    });
}
exports.parallel = parallel;
function clone(n, animation) {
    return parallel(Rx.Observable.return(animation).repeat(n));
}
exports.clone = clone;
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
// TODO
// Parameters need initialization lifecycle too
// replace parralel with its own internal animator
// website
// jsFiddle
// rand normal
// glow
// L systems (fold?)
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiRHJhd1RpY2siLCJEcmF3VGljay5jb25zdHJ1Y3RvciIsInN0YWNrVHJhY2UiLCJQYXJhbWV0ZXIiLCJQYXJhbWV0ZXIuY29uc3RydWN0b3IiLCJQYXJhbWV0ZXIubmV4dCIsIlBhcmFtZXRlci5tYXAiLCJQYXJhbWV0ZXIuY2xvbmUiLCJQYXJhbWV0ZXJTdGF0ZWZ1bCIsIlBhcmFtZXRlclN0YXRlZnVsLmNvbnN0cnVjdG9yIiwiZml4ZWQiLCJ0b1N0cmVhbU51bWJlciIsInRvU3RyZWFtUG9pbnQiLCJ0b1N0cmVhbUNvbG9yIiwiQW5pbWF0aW9uIiwiQW5pbWF0aW9uLmNvbnN0cnVjdG9yIiwiQW5pbWF0aW9uLmF0dGFjaCIsIkFuaW1hdGlvbi50aGVuIiwiQW5pbWF0b3IiLCJBbmltYXRvci5jb25zdHJ1Y3RvciIsIkFuaW1hdG9yLnRpY2tlciIsIkFuaW1hdG9yLnBsYXkiLCJwb2ludCIsImNvbG9yIiwicm5kIiwicm5kTm9ybWFsIiwiYXNzZXJ0RHQiLCJhc3NlcnRDbG9jayIsImRpc3BsYWNlVCIsInNpbiIsImNvcyIsInNjYWxlX3giLCJzdG9yZVR4IiwibG9hZFR4IiwicGFyYWxsZWwiLCJkZWNyZW1lbnRBY3RpdmUiLCJjbG9uZSIsInNlcXVlbmNlIiwiZW1pdCIsImxvb3AiLCJhdHRhY2hMb29wIiwiZHJhdyIsIm1vdmUiLCJ2ZWxvY2l0eSIsInR3ZWVuX2xpbmVhciIsInJlY3QiLCJjaGFuZ2VDb2xvciIsIm1hcCIsInRha2UiLCJzYXZlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxBQUVBLDBEQUYwRDtBQUMxRCwyQ0FBMkM7QUFDM0MsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDeEMsSUFBTyxFQUFFLFdBQVcsSUFBSSxDQUFDLENBQUM7QUFFZixrQkFBVSxHQUFHLEtBQUssQ0FBQztBQUNuQixrQkFBVSxHQUFHLEtBQUssQ0FBQztBQUNuQixrQkFBVSxHQUFH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QUMvQyxrREFBa0Q7QUFDbEQsVUFBVTtBQUNWLFdBQVc7QUFDWCxjQUFjO0FBQ2QsT0FBTztBQUNQLG9CQUFvQjtBQUdwQixRQUFRO0FBRVIsU0FBUztBQUNULDZDQUE2QztBQUM3QyxzRkFBc0Y7QUFDdEYsc0VBQXNFO0FBQ3RFLGtDQUFrQztBQUNsQyx1QkFBdUI7QUFDdkIsd0NBQXdDO0FBQ3hDLGtFQUFrRTtBQUNsRSxhQUFhO0FBQ2IsdUNBQXVDIiwiZmlsZSI6ImFuaW1heGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbm9kZV9tb2R1bGVzL3J4L3RzL3J4LmFsbC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9ub2RlLmQudHNcIiAvPlxucmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0JykuaW5zdGFsbCgpO1xuaW1wb3J0IFJ4ID0gcmVxdWlyZShcInJ4XCIpO1xuXG5leHBvcnQgdmFyIERFQlVHX0xPT1AgPSBmYWxzZTtcbmV4cG9ydCB2YXIgREVCVUdfVEhFTiA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVR19FTUlUID0gdHJ1ZTtcblxuZXhwb3J0IGNsYXNzIERyYXdUaWNrIHtcbiAgICBjb25zdHJ1Y3RvciAocHVibGljIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCBwdWJsaWMgY2xvY2s6IG51bWJlciwgcHVibGljIGR0OiBudW1iZXIpIHt9XG59XG5cbmZ1bmN0aW9uIHN0YWNrVHJhY2UoKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIHJldHVybiAoPGFueT5lcnIpLnN0YWNrO1xufVxuXG5leHBvcnQgY2xhc3MgUGFyYW1ldGVyPFZhbHVlPiB7XG4gICAgLy8gdHJpZWQgaW1tdXRhYmxlLmpzIGJ1dCBpdCBvbmx5IHN1cHBvcnRzIDIgZGltZW5zaW9uYWJsZSBpdGVyYWJsZXNcbiAgICBjb25zdHJ1Y3RvcihuZXh0OiAodDogbnVtYmVyKSA9PiBWYWx1ZSkge1xuICAgICAgICB0aGlzLm5leHQgPSBuZXh0O1xuICAgIH1cblxuICAgIG5leHQodDogbnVtYmVyKTogVmFsdWUge3Rocm93IG5ldyBFcnJvcignVGhpcyBtZXRob2QgaXMgYWJzdHJhY3QnKTt9XG5cbiAgICBtYXA8Vj4oZm46IChWYWx1ZSkgPT4gVik6IFBhcmFtZXRlcjxWPiB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgICAgICBmdW5jdGlvbih0OiBudW1iZXIpOiBWIHtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiSXRlcmFibGU6IG5leHRcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZuKGJhc2UubmV4dCh0KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgY2xvbmUoKTogUGFyYW1ldGVyPFZhbHVlPiB7XG4gICAgICAgIHJldHVybiB0aGlzLm1hcCh4ID0+IHgpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFBhcmFtZXRlclN0YXRlZnVsPFN0YXRlLCBWYWx1ZT4gZXh0ZW5kcyBQYXJhbWV0ZXI8VmFsdWU+e1xuXG4gICAgc3RhdGU6IFN0YXRlO1xuICAgIHByaXZhdGUgdGljazogKHQ6IG51bWJlciwgc3RhdGU6IFN0YXRlKSA9PiBTdGF0ZTtcbiAgICAvLyB0cmllZCBpbW11dGFibGUuanMgYnV0IGl0IG9ubHkgc3VwcG9ydHMgMiBkaW1lbnNpb24gaXRlcmFibGVzXG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIGluaXRpYWw6IFN0YXRlLFxuICAgICAgICBwcmVkZWNlc3NvcnM6IFBhcmFtZXRlcjxhbnk+W10sXG4gICAgICAgIHRpY2s6ICh0OiBudW1iZXIsIHN0YXRlOiBTdGF0ZSkgPT4gU3RhdGUsXG4gICAgICAgIHZhbHVlOiAoc3RhdGU6IFN0YXRlKSA9PiBWYWx1ZSkge1xuXG4gICAgICAgIHN1cGVyKFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSh0aGlzLnN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgdGhpcy5zdGF0ZSA9IGluaXRpYWw7XG4gICAgICAgIHRoaXMudGljayAgPSB0aWNrO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogVE9ETywgd2UgY291bGQgbWFwIHN0YXRlIGhlcmUgbWF5YmVcbiAgICBtYXA8Vj4oZm46IChWYWx1ZSkgPT4gVik6IEl0ZXJhYmxlU3RhdGVmdWw8YW55LCBWPiB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBJdGVyYWJsZVN0YXRlZnVsKFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgIFtiYXNlXSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge30sXG4gICAgICAgICAgICBmdW5jdGlvbigpOiBWIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZm4oYmFzZS5uZXh0KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0qKi9cbn1cblxuZXhwb3J0IHR5cGUgTnVtYmVyU3RyZWFtID0gUGFyYW1ldGVyPG51bWJlcj47XG5leHBvcnQgdHlwZSBQb2ludFN0cmVhbSA9IFBhcmFtZXRlcjxQb2ludD47XG5leHBvcnQgdHlwZSBDb2xvclN0cmVhbSA9IFBhcmFtZXRlcjxzdHJpbmc+O1xuZXhwb3J0IHR5cGUgRHJhd1N0cmVhbSA9IFJ4Lk9ic2VydmFibGU8RHJhd1RpY2s+O1xuXG5leHBvcnQgZnVuY3Rpb24gZml4ZWQ8VD4odmFsOiBUIHwgUGFyYW1ldGVyPFQ+KTogUGFyYW1ldGVyPFQ+IHtcbiAgICBpZiAodHlwZW9mICg8YW55PnZhbCkubmV4dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgZ2VuZXJhdGUgPSB0cnVlO1xuICAgICAgICAvLyB3ZSB3ZXJlIHBhc3NlZCBpbiBhIFBhcmFtZXRlciBvYmplY3RcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXI8VD4oXG4gICAgICAgICAgICBmdW5jdGlvbihjbG9jazogbnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdlbmVyYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHZhbCA9ICg8UGFyYW1ldGVyPFQ+PnZhbCkubmV4dChjbG9jayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiA8VD52YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXI8VD4oXG4gICAgICAgICAgICBmdW5jdGlvbihjbG9jazogbnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDxUPnZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbU51bWJlcih4OiBudW1iZXIgfCBOdW1iZXJTdHJlYW0pOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ251bWJlcicgPyBmaXhlZCh4KTogeDtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbVBvaW50KHg6IFBvaW50IHwgUG9pbnRTdHJlYW0pOiBQb2ludFN0cmVhbSB7XG4gICAgcmV0dXJuIDxQb2ludFN0cmVhbT4gKHR5cGVvZiAoPGFueT54KS5uZXh0ID09PSAnZnVuY3Rpb24nID8geDogZml4ZWQoeCkpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHRvU3RyZWFtQ29sb3IoeDogc3RyaW5nIHwgQ29sb3JTdHJlYW0pOiBDb2xvclN0cmVhbSB7XG4gICAgcmV0dXJuIDxDb2xvclN0cmVhbT4gKHR5cGVvZiAoPGFueT54KS5uZXh0ID09PSAnZnVuY3Rpb24nID8geDogZml4ZWQoeCkpO1xufVxuXG5leHBvcnQgY2xhc3MgQW5pbWF0aW9uIHtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBfYXR0YWNoOiAodXBzdHJlYW06IERyYXdTdHJlYW0pID0+IERyYXdTdHJlYW0sIHB1YmxpYyBhZnRlcj86IEFuaW1hdGlvbikge1xuICAgIH1cbiAgICBhdHRhY2godXBzdHJlYW06IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiYW5pbWF0aW9uIGluaXRpYWxpemVkIFwiLCBjbG9jayk7XG5cbiAgICAgICAgdmFyIGluc3RyZWFtID0gbnVsbDtcbiAgICAgICAgaW5zdHJlYW0gPSB1cHN0cmVhbTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImFuaW1hdGlvbjogaW5zdHJlYW1cIiwgaW5zdHJlYW0sIFwidXBzdHJlYW1cIiwgdXBzdHJlYW0pO1xuICAgICAgICB2YXIgcHJvY2Vzc2VkID0gdGhpcy5fYXR0YWNoKGluc3RyZWFtKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWZ0ZXI/IHRoaXMuYWZ0ZXIuYXR0YWNoKHByb2Nlc3NlZCk6IHByb2Nlc3NlZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogZGVsaXZlcnMgZXZlbnRzIHRvIHRoaXMgZmlyc3QsIHRoZW4gd2hlbiB0aGF0IGFuaW1hdGlvbiBpcyBmaW5pc2hlZFxuICAgICAqIHRoZSBmb2xsb3dlciBjb25zdW1lcnMgZXZlbnRzIGFuZCB0aGUgdmFsdWVzIGFyZSB1c2VkIGFzIG91dHB1dCwgdW50aWwgdGhlIGZvbGxvd2VyIGFuaW1hdGlvbiBjb21wbGV0ZXNcbiAgICAgKi9cbiAgICB0aGVuKGZvbGxvd2VyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IERyYXdTdHJlYW0pIDogRHJhd1N0cmVhbSB7XG4gICAgICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uIChvYnNlcnZlcikge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCAgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RUdXJuID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50ID0gZmlyc3Q7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogYXR0YWNoXCIpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZEF0dGFjaCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RBdHRhY2ggID0gc2VsZi5hdHRhY2goZmlyc3Quc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGZpcnN0IGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUdXJuID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaCA9IGZvbGxvd2VyLmF0dGFjaChzZWNvbmQuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcHJldlN1YnNjcmlwdGlvbiA9IHByZXYuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSB0byBmaXJzdCBPUiBzZWNvbmRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlyc3RUdXJuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3Qub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmQub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIC8vIG9uIGRpc3Bvc2VcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBkaXNwb3NlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0QXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlY29uZEF0dGFjaClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpOyAvL3RvZG8gcmVtb3ZlIHN1YnNjcmliZU9uc1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBbmltYXRvciB7XG4gICAgdGlja2VyU3Vic2NyaXB0aW9uOiBSeC5EaXNwb3NhYmxlID0gbnVsbDtcbiAgICByb290OiBSeC5TdWJqZWN0PERyYXdUaWNrPjtcbiAgICBhbmltYXRpb25TdWJzY3JpcHRpb25zOiBSeC5JRGlzcG9zYWJsZVtdID0gW107XG4gICAgdDogbnVtYmVyID0gMDtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCkge1xuICAgICAgICB0aGlzLnJvb3QgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKVxuICAgIH1cbiAgICB0aWNrZXIodGljazogUnguT2JzZXJ2YWJsZTxudW1iZXI+KTogdm9pZCB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB0aGlzLnRpY2tlclN1YnNjcmlwdGlvbiA9IHRpY2subWFwKGZ1bmN0aW9uKGR0OiBudW1iZXIpIHsgLy9tYXAgdGhlIHRpY2tlciBvbnRvIGFueSAtPiBjb250ZXh0XG4gICAgICAgICAgICB2YXIgdGljayA9IG5ldyBEcmF3VGljayhzZWxmLmN0eCwgc2VsZi50LCBkdCk7XG4gICAgICAgICAgICBzZWxmLnQgKz0gZHQ7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSkuc3Vic2NyaWJlKHRoaXMucm9vdCk7XG4gICAgfVxuICAgIHBsYXkgKGFuaW1hdGlvbjogQW5pbWF0aW9uKTogdm9pZCB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgY29uc29sZS5sb2coXCJhbmltYXRvcjogcGxheVwiKTtcbiAgICAgICAgdmFyIHNhdmVCZWZvcmVGcmFtZSA9IHRoaXMucm9vdC50YXBPbk5leHQoZnVuY3Rpb24odGljayl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggc2F2ZVwiKTtcbiAgICAgICAgICAgIHRpY2suY3R4LnNhdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkb0FuaW1hdGlvbiA9IGFuaW1hdGlvbi5hdHRhY2goc2F2ZUJlZm9yZUZyYW1lKTtcbiAgICAgICAgdmFyIHJlc3RvcmVBZnRlckZyYW1lID0gZG9BbmltYXRpb24udGFwKFxuICAgICAgICAgICAgZnVuY3Rpb24odGljayl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IG5leHQgcmVzdG9yZVwiKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IGVyciByZXN0b3JlXCIsIGVycik7XG4gICAgICAgICAgICAgICAgc2VsZi5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSxmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHNlbGYuY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFuaW1hdGlvblN1YnNjcmlwdGlvbnMucHVzaChcbiAgICAgICAgICAgIHJlc3RvcmVBZnRlckZyYW1lLnN1YnNjcmliZSgpXG4gICAgICAgICk7XG4gICAgfVxufVxuXG5leHBvcnQgdHlwZSBQb2ludCA9IFtudW1iZXIsIG51bWJlcl1cbmV4cG9ydCBmdW5jdGlvbiBwb2ludChcbiAgICB4OiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgeTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG4pOiBQb2ludFN0cmVhbVxue1xuICAgIHZhciB4X3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKHgpO1xuICAgIHZhciB5X3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKHkpO1xuXG4gICAgLy9jb25zb2xlLmxvZyhcInBvaW50OiBpbml0XCIsIHhfc3RyZWFtLCB5X3N0cmVhbSk7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgIGZ1bmN0aW9uKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgdmFyIHJlc3VsdDogW251bWJlciwgbnVtYmVyXSA9IFt4X3N0cmVhbS5uZXh0KHQpLCB5X3N0cmVhbS5uZXh0KHQpXTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJwb2ludDogbmV4dFwiLCByZXN1bHQpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qXG4gICAgUkdCIGJldHdlZW4gMCBhbmQgMjU1XG4gICAgYSBiZXR3ZWVuIDAgLSAxXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb2xvcihcbiAgICByOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgZzogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGI6IG51bWJlciB8IE51bWJlclN0cmVhbSxcbiAgICBhOiBudW1iZXIgfCBOdW1iZXJTdHJlYW1cbik6IENvbG9yU3RyZWFtXG57XG4gICAgdmFyIHJfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocik7XG4gICAgdmFyIGdfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoZyk7XG4gICAgdmFyIGJfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoYik7XG4gICAgdmFyIGFfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIoYSk7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgIGZ1bmN0aW9uKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgdmFyIHIgPSBNYXRoLmZsb29yKHJfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGcgPSBNYXRoLmZsb29yKGdfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGIgPSBNYXRoLmZsb29yKGJfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgdmFyIGEgPSBNYXRoLmZsb29yKGFfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICAgICAgcmV0dXJuIFwicmdiKFwiICsgciArIFwiLFwiICsgZyArIFwiLFwiICsgYiArIFwiKVwiO1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJuZCgpOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBybmROb3JtYWwoc2NhbGUgOiBOdW1iZXJTdHJlYW0gfCBudW1iZXIgPSAxKTogUG9pbnRTdHJlYW0ge1xuICAgIHZhciBzY2FsZV8gPSB0b1N0cmVhbU51bWJlcihzY2FsZSk7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXI8UG9pbnQ+KGZ1bmN0aW9uICh0OiBudW1iZXIpOiBQb2ludCB7XG4gICAgICAgICAgICB2YXIgc2NhbGUgPSBzY2FsZV8ubmV4dCh0KTtcbiAgICAgICAgICAgIC8vIGdlbmVyYXRlIHJhbmRvbSBudW1iZXJzXG4gICAgICAgICAgICB2YXIgbm9ybTIgPSAxMDA7XG4gICAgICAgICAgICB3aGlsZSAobm9ybTIgPiAxKSB7IC8vcmVqZWN0IHRob3NlIG91dHNpZGUgdGhlIHVuaXQgY2lyY2xlXG4gICAgICAgICAgICAgICAgdmFyIHggPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiAyO1xuICAgICAgICAgICAgICAgIHZhciB5ID0gKE1hdGgucmFuZG9tKCkgLSAwLjUpICogMjtcbiAgICAgICAgICAgICAgICBub3JtMiA9IHggKiB4ICsgeSAqIHk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBub3JtID0gTWF0aC5zcXJ0KG5vcm0yKTtcblxuICAgICAgICAgICAgcmV0dXJuIFtzY2FsZSAqIHggLyBub3JtICwgc2NhbGUgKiB5IC8gbm9ybV07XG4gICAgICAgIH1cbiAgICApO1xufVxuXG4vKipcbiAqIE5PVEU6IGN1cnJlbnRseSBmYWlscyBpZiB0aGUgc3RyZWFtcyBhcmUgZGlmZmVyZW50IGxlbmd0aHNcbiAqIEBwYXJhbSBhc3NlcnREdCB0aGUgZXhwZWN0ZWQgY2xvY2sgdGljayB2YWx1ZXNcbiAqIEBwYXJhbSBhZnRlclxuICogQHJldHVybnMge0FuaW1hdGlvbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydER0KGV4cGVjdGVkRHQ6IFJ4Lk9ic2VydmFibGU8bnVtYmVyPiwgYWZ0ZXI/OiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHVwc3RyZWFtKSB7XG4gICAgICAgIHJldHVybiB1cHN0cmVhbS56aXAoZXhwZWN0ZWREdCwgZnVuY3Rpb24odGljazogRHJhd1RpY2ssIGV4cGVjdGVkRHRWYWx1ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICBpZiAodGljay5kdCAhPSBleHBlY3RlZER0VmFsdWUpIHRocm93IG5ldyBFcnJvcihcInVuZXhwZWN0ZWQgZHQgb2JzZXJ2ZWQ6IFwiICsgdGljay5kdCArIFwiLCBleHBlY3RlZDpcIiArIGV4cGVjdGVkRHRWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSk7XG4gICAgfSwgYWZ0ZXIpO1xufVxuXG4vL3RvZG8gd291bGQgYmUgbmljZSBpZiB0aGlzIHRvb2sgYW4gaXRlcmFibGUgb3Igc29tZSBvdGhlciB0eXBlIG9mIHNpbXBsZSBwdWxsIHN0cmVhbVxuLy8gYW5kIHVzZWQgc3RyZWFtRXF1YWxzXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Q2xvY2soYXNzZXJ0Q2xvY2s6IG51bWJlcltdLCBhZnRlcj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgdmFyIGluZGV4ID0gMDtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHVwc3RyZWFtKSB7XG4gICAgICAgIHJldHVybiB1cHN0cmVhbS50YXBPbk5leHQoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYXNzZXJ0Q2xvY2s6IFwiLCB0aWNrKTtcbiAgICAgICAgICAgIGlmICh0aWNrLmNsb2NrIDwgYXNzZXJ0Q2xvY2tbaW5kZXhdIC0gMC4wMDAwMSB8fCB0aWNrLmNsb2NrID4gYXNzZXJ0Q2xvY2tbaW5kZXhdICsgMC4wMDAwMSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvck1zZyA9IFwidW5leHBlY3RlZCBjbG9jayBvYnNlcnZlZDogXCIgKyB0aWNrLmNsb2NrICsgXCIsIGV4cGVjdGVkOlwiICsgYXNzZXJ0Q2xvY2tbaW5kZXhdXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3JNc2cpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbmRleCArKztcbiAgICAgICAgfSk7XG4gICAgfSwgYWZ0ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlzcGxhY2VUPFQ+KGRpc3BsYWNlbWVudDogbnVtYmVyIHwgUGFyYW1ldGVyPG51bWJlcj4sIHZhbHVlOiBQYXJhbWV0ZXI8VD4pOiBQYXJhbWV0ZXI8VD4ge1xuICAgIHZhciBkZWx0YXQ6IFBhcmFtZXRlcjxudW1iZXI+ID0gdG9TdHJlYW1OdW1iZXIoZGlzcGxhY2VtZW50KTtcbiAgICByZXR1cm4gbmV3IFBhcmFtZXRlcjxUPiAoXG4gICAgICAgIGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICB2YXIgZHQgPSBkZWx0YXQubmV4dCh0KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGlzcGxhY2VUOiBcIiwgZHQpXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUubmV4dCh0ICsgZHQpXG4gICAgICAgIH0pO1xufVxuXG4vL3RvZG86IHNob3VkbCBiZSB0XG5leHBvcnQgZnVuY3Rpb24gc2luKHBlcmlvZDogbnVtYmVyfCBQYXJhbWV0ZXI8bnVtYmVyPik6IFBhcmFtZXRlcjxudW1iZXI+IHtcbiAgICBjb25zb2xlLmxvZyhcInNpbjogbmV3XCIpO1xuICAgIHZhciBwZXJpb2Rfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocGVyaW9kKTtcblxuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKGZ1bmN0aW9uICh0OiBudW1iZXIpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gTWF0aC5zaW4odCAqIChNYXRoLlBJICogMikgLyBwZXJpb2Rfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICBjb25zb2xlLmxvZyhcInNpbjogdGlja1wiLCB0LCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9KTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjb3MocGVyaW9kOiBudW1iZXJ8IE51bWJlclN0cmVhbSk6IE51bWJlclN0cmVhbSB7XG4gICAgLy9jb25zb2xlLmxvZyhcImNvczogbmV3XCIpO1xuICAgIHZhciBwZXJpb2Rfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocGVyaW9kKTtcblxuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKGZ1bmN0aW9uICh0OiBudW1iZXIpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gTWF0aC5jb3ModCAqIChNYXRoLlBJICogMikgLyBwZXJpb2Rfc3RyZWFtLm5leHQodCkpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImNvczogdGlja1wiLCB0LCB2YWx1ZSk7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc2NhbGVfeChcbiAgICBzY2FsZTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIHg6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG57IHJldHVybiAwO31cblxuZnVuY3Rpb24gc3RvcmVUeChcbiAgICBuOiBzdHJpbmcsIC8qcGFzcyB0aG91Z2ggY29udGV4dCBidXQgc3RvcmUgdHJhbnNmb3JtIGluIHZhcmlhYmxlKi9cbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvL3Bhc3N0aHJvdWdoXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBsb2FkVHgoXG4gICAgbjogc3RyaW5nLCAvKnBhc3MgdGhvdWdoIGNvbnRleHQgYnV0IHN0b3JlIHRyYW5zZm9ybSBpbiB2YXJpYWJsZSovXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb24gLy9wYXNzdGhyb3VnaFxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuLyoqXG4gKiBwbGF5cyBzZXZlcmFsIGFuaW1hdGlvbnMsIGZpbmlzaGVzIHdoZW4gdGhleSBhcmUgYWxsIGRvbmUuXG4gKiBAcGFyYW0gYW5pbWF0aW9uc1xuICogQHJldHVybnMge0FuaW1hdGlvbn1cbiAqIHRvZG86IEkgdGhpbmsgdGhlcmUgYXJlIGxvdHMgb2YgYnVncyB3aGVuIGFuIGFuaW1hdGlvbiBzdG9wcyBwYXJ0IHdheVxuICogSSB0aGluayBpdCBiZSBiZXR0ZXIgaWYgdGhpcyBzcGF3bmVkIGl0cyBvd24gQW5pbWF0b3IgdG8gaGFuZGxlIGN0eCByZXN0b3Jlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyYWxsZWwoXG4gICAgYW5pbWF0aW9uczogUnguT2JzZXJ2YWJsZTxBbmltYXRpb24+XG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJwYXJhbGxlbDogaW5pdGlhbGl6aW5nXCIpO1xuXG4gICAgICAgIHZhciBhY3RpdmVBbmltYXRpb25zID0gMDtcbiAgICAgICAgdmFyIGF0dGFjaFBvaW50ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgZnVuY3Rpb24gZGVjcmVtZW50QWN0aXZlKCkge1xuICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGRlY3JlbWVudCBhY3RpdmVcIik7XG4gICAgICAgICAgICBhY3RpdmVBbmltYXRpb25zIC0tO1xuICAgICAgICB9XG5cbiAgICAgICAgYW5pbWF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGFuaW1hdGlvbjogQW5pbWF0aW9uKSB7XG4gICAgICAgICAgICBhY3RpdmVBbmltYXRpb25zKys7XG4gICAgICAgICAgICBhbmltYXRpb24uYXR0YWNoKGF0dGFjaFBvaW50LnRhcE9uTmV4dCh0aWNrID0+IHRpY2suY3R4LnNhdmUoKSkpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgdGljayA9PiB0aWNrLmN0eC5yZXN0b3JlKCksXG4gICAgICAgICAgICAgICAgZGVjcmVtZW50QWN0aXZlLFxuICAgICAgICAgICAgICAgIGRlY3JlbWVudEFjdGl2ZSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHByZXYudGFrZVdoaWxlKCgpID0+IGFjdGl2ZUFuaW1hdGlvbnMgPiAwKS50YXBPbk5leHQoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJwYXJhbGxlbDogZW1pdHRpbmcsIGFuaW1hdGlvbnNcIiwgdGljayk7XG4gICAgICAgICAgICAgICAgYXR0YWNoUG9pbnQub25OZXh0KHRpY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBlbWl0dGluZyBmaW5pc2hlZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsb25lKFxuICAgIG46IG51bWJlcixcbiAgICBhbmltYXRpb246IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gcGFyYWxsZWwoUnguT2JzZXJ2YWJsZS5yZXR1cm4oYW5pbWF0aW9uKS5yZXBlYXQobikpO1xufVxuXG5cbmZ1bmN0aW9uIHNlcXVlbmNlKFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uW11cbik6IEFuaW1hdGlvblxueyByZXR1cm4gbnVsbDt9XG5cbi8qKlxuICogVGhlIGNoaWxkIGFuaW1hdGlvbiBpcyBzdGFydGVkIGV2ZXJ5IGZyYW1lXG4gKiBAcGFyYW0gYW5pbWF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbWl0KFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJlbWl0OiBpbml0aWFsaXppbmdcIik7XG4gICAgICAgIHZhciBhdHRhY2hQb2ludCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgIHJldHVybiBwcmV2LnRhcE9uTmV4dChmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcImVtaXQ6IGVtbWl0dGluZ1wiLCBhbmltYXRpb24pO1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5hdHRhY2goYXR0YWNoUG9pbnQpLnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIGF0dGFjaFBvaW50Lm9uTmV4dCh0aWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIFdoZW4gdGhlIGNoaWxkIGxvb3AgZmluaXNoZXMsIGl0IGlzIHNwYXduZWRcbiAqIEBwYXJhbSBhbmltYXRpb25cbiAqIEByZXR1cm5zIHtBbmltYXRpb259XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb29wKFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBpbml0aWFsaXppbmdcIik7XG5cblxuICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBjcmVhdGUgbmV3IGxvb3BcIik7XG4gICAgICAgICAgICB2YXIgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBsb29wU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICAgICAgICAgIHZhciB0ID0gMDtcblxuICAgICAgICAgICAgZnVuY3Rpb24gYXR0YWNoTG9vcChuZXh0KSB7IC8vdG9kbyBJIGZlZWwgbGlrZSB3ZSBjYW4gcmVtb3ZlIGEgbGV2ZWwgZnJvbSB0aGlzIHNvbWVob3dcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBuZXcgaW5uZXIgbG9vcCBzdGFydGluZyBhdFwiLCB0KTtcblxuICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN1YnNjcmlwdGlvbiA9IGFuaW1hdGlvbi5hdHRhY2gobG9vcFN0YXJ0KS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCBlcnIgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBwb3N0LWlubmVyIGNvbXBsZXRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIGZpbmlzaGVkIGNvbnN0cnVjdGlvblwiKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmV2LnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbm8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaExvb3AobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogdXBzdHJlYW0gdG8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0Lm9uTmV4dChuZXh0KTtcblxuICAgICAgICAgICAgICAgICAgICB0ICs9IG5leHQuZHQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSBlcnJvciB0byBkb3duc3RyZWFtXCIsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkLmJpbmQob2JzZXJ2ZXIpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy9kaXNwb3NlXG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogZGlzcG9zZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAobG9vcFN0YXJ0KSBsb29wU3RhcnQuZGlzcG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXcoXG4gICAgZm46ICh0aWNrOiBEcmF3VGljaykgPT4gdm9pZCxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2aW91czogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICByZXR1cm4gcHJldmlvdXMudGFwT25OZXh0KGZuKTtcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW92ZShcbiAgICBkZWx0YTogUG9pbnQgfCBQb2ludFN0cmVhbSxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgY29uc29sZS5sb2coXCJtb3ZlOiBhdHRhY2hlZFwiKTtcbiAgICB2YXIgcG9pbnRTdHJlYW06IFBvaW50U3RyZWFtID0gdG9TdHJlYW1Qb2ludChkZWx0YSk7XG4gICAgcmV0dXJuIGRyYXcoZnVuY3Rpb24odGljaykge1xuICAgICAgICB2YXIgcG9pbnQgPSBwb2ludFN0cmVhbS5uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICBjb25zb2xlLmxvZyhcIm1vdmU6XCIsIHBvaW50KTtcbiAgICAgICAgaWYgKHRpY2spXG4gICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgcG9pbnRbMF0sIHBvaW50WzFdKTtcbiAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZlbG9jaXR5KFxuICAgIHZlbG9jaXR5OiBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgdmVsb2NpdHlTdHJlYW06IFBvaW50U3RyZWFtID0gdG9TdHJlYW1Qb2ludCh2ZWxvY2l0eSk7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24ocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICB2YXIgcG9zOiBQb2ludCA9IFswLjAsMC4wXTtcbiAgICAgICAgcmV0dXJuIHByZXYubWFwKGZ1bmN0aW9uKHRpY2spIHtcbiAgICAgICAgICAgIHZhciB2ZWxvY2l0eSA9IHZlbG9jaXR5U3RyZWFtLm5leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICBwb3NbMF0gKz0gdmVsb2NpdHlbMF0gKiB0aWNrLmR0O1xuICAgICAgICAgICAgcG9zWzFdICs9IHZlbG9jaXR5WzFdICogdGljay5kdDtcbiAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCBwb3NbMF0sIHBvc1sxXSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSk7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR3ZWVuX2xpbmVhcihcbiAgICBmcm9tOiBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIHRvOiAgIFBvaW50IHwgUG9pbnRTdHJlYW0sXG4gICAgdGltZTogbnVtYmVyLFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8qIGNvcGllcyAqL1xuKTogQW5pbWF0aW9uXG57XG4gICAgdmFyIGZyb21fc3RyZWFtID0gdG9TdHJlYW1Qb2ludChmcm9tKTtcbiAgICB2YXIgdG9fc3RyZWFtID0gdG9TdHJlYW1Qb2ludCh0byk7XG4gICAgdmFyIHNjYWxlID0gMS4wIC8gdGltZTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICByZXR1cm4gcHJldi5tYXAoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidHdlZW46IGlubmVyXCIpO1xuICAgICAgICAgICAgdmFyIGZyb20gPSBmcm9tX3N0cmVhbS5uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgdmFyIHRvICAgPSB0b19zdHJlYW0ubmV4dCh0aWNrLmNsb2NrKTtcblxuICAgICAgICAgICAgdCA9IHQgKyB0aWNrLmR0O1xuICAgICAgICAgICAgaWYgKHQgPiB0aW1lKSB0ID0gdGltZTtcbiAgICAgICAgICAgIHZhciB4ID0gZnJvbVswXSArICh0b1swXSAtIGZyb21bMF0pICogdCAqIHNjYWxlO1xuICAgICAgICAgICAgdmFyIHkgPSBmcm9tWzFdICsgKHRvWzFdIC0gZnJvbVsxXSkgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgeCwgeSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSkudGFrZVdoaWxlKGZ1bmN0aW9uKHRpY2spIHtyZXR1cm4gdCA8IHRpbWU7fSlcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVjdChcbiAgICBwMTogUG9pbnQsIC8vdG9kbyBkeW5hbWljIHBhcmFtcyBpbnN0ZWFkXG4gICAgcDI6IFBvaW50LCAvL3RvZG8gZHluYW1pYyBwYXJhbXMgaW5zdGVhZFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhmdW5jdGlvbiAodGljazogRHJhd1RpY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJyZWN0OiBmaWxsUmVjdFwiKTtcbiAgICAgICAgdGljay5jdHguZmlsbFJlY3QocDFbMF0sIHAxWzFdLCBwMlswXSwgcDJbMV0pOyAvL3RvZG8gb2JzZXJ2ZXIgc3RyZWFtIGlmIG5lY2lzc2FyeVxuICAgIH0sIGFuaW1hdGlvbik7XG59XG5leHBvcnQgZnVuY3Rpb24gY2hhbmdlQ29sb3IoXG4gICAgY29sb3I6IHN0cmluZywgLy90b2RvXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICB0aWNrLmN0eC5maWxsU3R5bGUgPSBjb2xvcjtcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5mdW5jdGlvbiBtYXAoXG4gICAgbWFwX2ZuOiAocHJldjogRHJhd1RpY2spID0+IERyYXdUaWNrLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldmlvdXM6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzLm1hcChtYXBfZm4pXG4gICAgfSwgYW5pbWF0aW9uKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdGFrZShcbiAgICBpdGVyYXRpb25zOiBudW1iZXIsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbihwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwcmV2LnRha2UoaXRlcmF0aW9ucyk7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZSh3aWR0aDpudW1iZXIsIGhlaWdodDpudW1iZXIsIHBhdGg6IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgdmFyIEdJRkVuY29kZXIgPSByZXF1aXJlKCdnaWZlbmNvZGVyJyk7XG4gICAgdmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcblxuXG4gICAgdmFyIGVuY29kZXIgPSBuZXcgR0lGRW5jb2Rlcih3aWR0aCwgaGVpZ2h0KTtcbiAgICBlbmNvZGVyLmNyZWF0ZVJlYWRTdHJlYW0oKVxuICAgICAgLnBpcGUoZW5jb2Rlci5jcmVhdGVXcml0ZVN0cmVhbSh7IHJlcGVhdDogMTAwMDAsIGRlbGF5OiAxMDAsIHF1YWxpdHk6IDEgfSkpXG4gICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShwYXRoKSk7XG4gICAgZW5jb2Rlci5zdGFydCgpO1xuXG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHBhcmVudDogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICB2YXIgdCA9IDA7XG4gICAgICAgIHZhciBlbmROZXh0ID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBwYXJlbnQudGFwKFxuICAgICAgICAgICAgZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInNhdmU6IHdyb3RlIGZyYW1lXCIpO1xuICAgICAgICAgICAgICAgIC8vdCArPSB0aWNrLmR0O1xuICAgICAgICAgICAgICAgIC8vdmFyIG91dCA9IGZzLndyaXRlRmlsZVN5bmMocGF0aCArIFwiX1wiKyB0ICsgXCIucG5nXCIsIGNhbnZhcy50b0J1ZmZlcigpKTtcbiAgICAgICAgICAgICAgICAvL3ZhciBwYXJzZWQgPSBwbmdwYXJzZShjYW52YXMudG9CdWZmZXIoKSlcbiAgICAgICAgICAgICAgICBlbmNvZGVyLmFkZEZyYW1lKHRpY2suY3R4KTtcbiAgICAgICAgICAgICAgICAvL2VuY29kZXIuYWRkRnJhbWUodGljay5jdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHdpZHRoLCBoZWlnaHQpLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge2NvbnNvbGUuZXJyb3IoXCJzYXZlOiBub3Qgc2F2ZWRcIiwgcGF0aCk7fSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge2NvbnNvbGUubG9nKFwic2F2ZTogc2F2ZWRcIiwgcGF0aCk7IGVuY29kZXIuZmluaXNoKCk7LyogZW5kTmV4dCA9IHRydWU7Ki99XG4gICAgICAgIClcbiAgICB9KTtcbn1cblxuLy8gVE9ET1xuXG4vLyBQYXJhbWV0ZXJzIG5lZWQgaW5pdGlhbGl6YXRpb24gbGlmZWN5Y2xlIHRvb1xuLy8gcmVwbGFjZSBwYXJyYWxlbCB3aXRoIGl0cyBvd24gaW50ZXJuYWwgYW5pbWF0b3Jcbi8vIHdlYnNpdGVcbi8vIGpzRmlkZGxlXG4vLyByYW5kIG5vcm1hbFxuLy8gZ2xvd1xuLy8gTCBzeXN0ZW1zIChmb2xkPylcblxuXG4vLyBJREVBU1xuXG4vLyBQYWNNYW5cbi8vIHdoYXQgYWJvdXQgYSBkaWZmZXJlbnQgd2F5IG9mIG1ha2luZyBnbG93P1xuLy8gcmVuZGVyIGx1bWluZWNlbmNlIGludG8gYSB0ZXh0dXJlIGFuZCB0aGVuIGNvbG9yIGJhc2VkIG9uIGRpc3RhbmNlIGZyb20gbGlnaHRzb3VyY2Vcbi8vIG1vdXNlIGlucHV0LCB0YWlsaW5nIGdsb3cgKHJlbWJlciB0byB0d2VlbiBiZXR3ZWVuIHJhcGlkIG1vdmVtZW50cylcbi8vIG9mZnNjcmVlbiByZW5kZXJpbmcgYW4gcGxheWJhY2tcbi8vIHNpbiB3YXZlLCByYW5kb21pemVkXG4vLyBHVUkgY29tcG9uZW50cywgcmVzcG9uc2l2ZSwgYm9vdHN0cmFwXG4vLyBnZXQgZGF0YSBvdXQgYnkgdGFwcGluZyBpbnRvIGZsb3cgKGludGVyY2VwdChTdWJqZWN0IHBhc3NiYWNrKSlcbi8vIFNWRyBpbXBvcnRcbi8vIGxheWVyaW5nIHdpdGggcGFycmFsbGVsIChiYWNrIGZpcnN0KVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9