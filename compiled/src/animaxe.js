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
    function Parameter(init) {
        this.init = init;
    }
    Parameter.prototype.init = function () { throw new Error('This method is abstract'); };
    Parameter.prototype.map = function (fn) {
        var base = this;
        return new Parameter(function () {
            var base_next = base.init();
            return function (t) {
                return fn(base_next(t));
            };
        });
    };
    Parameter.prototype.clone = function () {
        return this.map(function (x) { return x; });
    };
    return Parameter;
})();
exports.Parameter = Parameter;
function fixed(val) {
    if (typeof val.init === 'function') {
        // we were passed in a Parameter object
        return new Parameter(function () {
            var generate = true;
            var next = val.init();
            var value = null;
            return function (clock) {
                if (generate) {
                    generate = false;
                    value = next(clock);
                }
                console.log("fixed: val from parameter", value);
                return value;
            };
        });
    }
    else {
        return new Parameter(function () {
            return function (clock) {
                console.log("fixed: val from constant", val);
                return val;
            };
        });
    }
}
exports.fixed = fixed;
function toStreamNumber(x) {
    return (typeof x.init === 'function' ? x : fixed(x));
}
exports.toStreamNumber = toStreamNumber;
function toStreamPoint(x) {
    return (typeof x.init === 'function' ? x : fixed(x));
}
exports.toStreamPoint = toStreamPoint;
function toStreamColor(x) {
    return (typeof x.init === 'function' ? x : fixed(x));
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
    return new Parameter(function () {
        var x_next = x_stream.init();
        var y_next = y_stream.init();
        return function (t) {
            var result = [x_next(t), y_next(t)];
            //console.log("point: next", result);
            return result;
        };
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
    return new Parameter(function () {
        var r_next = r_stream.init();
        var g_next = g_stream.init();
        var b_next = b_stream.init();
        var a_next = a_stream.init();
        return function (t) {
            var r_val = Math.floor(r_next(t));
            var g_val = Math.floor(g_next(t));
            var b_val = Math.floor(b_next(t));
            var a_val = a_next(t);
            var val = "rgba(" + r_val + "," + g_val + "," + b_val + "," + a_val + ")";
            console.log("color: ", val);
            return val;
        };
    });
}
exports.color = color;
function t() {
    return new Parameter(function () { return function (t) {
        return t;
    }; });
}
exports.t = t;
function rnd() {
    return new Parameter(function () { return function (t) {
        return Math.random();
    }; });
}
exports.rnd = rnd;
function rndNormal(scale) {
    if (scale === void 0) { scale = 1; }
    var scale_ = toStreamNumber(scale);
    return new Parameter(function () {
        console.log("rndNormal: init");
        var scale_next = scale_.init();
        return function (t) {
            var scale = scale_next(t);
            // generate random numbers
            var norm2 = 100;
            while (norm2 > 1) {
                var x = (Math.random() - 0.5) * 2;
                var y = (Math.random() - 0.5) * 2;
                norm2 = x * x + y * y;
            }
            var norm = Math.sqrt(norm2);
            var val = [scale * x / norm, scale * y / norm];
            console.log("rndNormal: val", val);
            return val;
        };
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
    return new Parameter(function () {
        var dt_next = deltat.init();
        var value_next = value.init();
        return function (t) {
            var dt = dt_next(t);
            console.log("displaceT: ", dt);
            return value_next(t + dt);
        };
    });
}
exports.displaceT = displaceT;
//todo: should be t as a parameter to a non tempor
function sin(period) {
    console.log("sin: new");
    var period_stream = toStreamNumber(period);
    return new Parameter(function () {
        var period_next = period_stream.init();
        return function (t) {
            var value = Math.sin(t * (Math.PI * 2) / period_next(t));
            console.log("sin: tick", t, value);
            return value;
        };
    });
}
exports.sin = sin;
function cos(period) {
    console.log("cos: new");
    var period_stream = toStreamNumber(period);
    return new Parameter(function () {
        var period_next = period_stream.init();
        return function (t) {
            var value = Math.cos(t * (Math.PI * 2) / period_next(t));
            console.log("cos: tick", t, value);
            return value;
        };
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
function draw(initDraw, animation) {
    return new Animation(function (previous) {
        var draw = initDraw();
        return previous.tapOnNext(draw);
    }, animation);
}
exports.draw = draw;
function move(delta, animation) {
    console.log("move: attached");
    var pointStream = toStreamPoint(delta);
    return draw(function () {
        var point_next = pointStream.init();
        return function (tick) {
            var point = point_next(tick.clock);
            console.log("move:", point);
            if (tick)
                tick.ctx.transform(1, 0, 0, 1, point[0], point[1]);
            return tick;
        };
    }, animation);
}
exports.move = move;
function composite(composite_mode, animation) {
    return draw(function () {
        return function (tick) {
            tick.ctx.globalCompositeOperation = composite_mode;
        };
    }, animation);
}
exports.composite = composite;
function velocity(velocity, animation) {
    var velocityStream = toStreamPoint(velocity);
    return draw(function () {
        var pos = [0.0, 0.0];
        var velocity_next = velocityStream.init();
        return function (tick) {
            var velocity = velocity_next(tick.clock);
            tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
            pos[0] += velocity[0] * tick.dt;
            pos[1] += velocity[1] * tick.dt;
        };
    }, animation);
}
exports.velocity = velocity;
function tween_linear(from, to, time, animation /* copies */) {
    var from_stream = toStreamPoint(from);
    var to_stream = toStreamPoint(to);
    var scale = 1.0 / time;
    return new Animation(function (prev) {
        var t = 0;
        var from_next = from_stream.init();
        var to_next = to_stream.init();
        return prev.map(function (tick) {
            console.log("tween: inner");
            var from = from_next(tick.clock);
            var to = to_next(tick.clock);
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
    return draw(function () {
        return function (tick) {
            console.log("rect: fillRect");
            tick.ctx.fillRect(p1[0], p1[1], p2[0], p2[1]); //todo observer stream if necissary
        };
    }, animation);
}
exports.rect = rect;
function changeColor(color, //todo
    animation) {
    return draw(function () {
        return function (tick) {
            tick.ctx.fillStyle = color;
        };
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
// todo BUG TODO LIST
// replace parralel with its own internal animator
// website
// jsFiddle
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiRHJhd1RpY2siLCJEcmF3VGljay5jb25zdHJ1Y3RvciIsInN0YWNrVHJhY2UiLCJQYXJhbWV0ZXIiLCJQYXJhbWV0ZXIuY29uc3RydWN0b3IiLCJQYXJhbWV0ZXIuaW5pdCIsIlBhcmFtZXRlci5tYXAiLCJQYXJhbWV0ZXIuY2xvbmUiLCJmaXhlZCIsInRvU3RyZWFtTnVtYmVyIiwidG9TdHJlYW1Qb2ludCIsInRvU3RyZWFtQ29sb3IiLCJBbmltYXRpb24iLCJBbmltYXRpb24uY29uc3RydWN0b3IiLCJBbmltYXRpb24uYXR0YWNoIiwiQW5pbWF0aW9uLnRoZW4iLCJBbmltYXRvciIsIkFuaW1hdG9yLmNvbnN0cnVjdG9yIiwiQW5pbWF0b3IudGlja2VyIiwiQW5pbWF0b3IucGxheSIsInBvaW50IiwiY29sb3IiLCJ0Iiwicm5kIiwicm5kTm9ybWFsIiwiYXNzZXJ0RHQiLCJhc3NlcnRDbG9jayIsImRpc3BsYWNlVCIsInNpbiIsImNvcyIsInNjYWxlX3giLCJzdG9yZVR4IiwibG9hZFR4IiwicGFyYWxsZWwiLCJkZWNyZW1lbnRBY3RpdmUiLCJjbG9uZSIsInNlcXVlbmNlIiwiZW1pdCIsImxvb3AiLCJhdHRhY2hMb29wIiwiZHJhdyIsIm1vdmUiLCJjb21wb3NpdGUiLCJ2ZWxvY2l0eSIsInR3ZWVuX2xpbmVhciIsInJlY3QiLCJjaGFuZ2VDb2xvciIsIm1hcCIsInRha2UiLCJzYXZlIl0sIm1hcHBpbmdzIjoiQUFBQSxBQUVBLDBEQUYwRDtBQUMxRCwyQ0FBMkM7QUFDM0MsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDeEMsSUFBTyxFQUFFLFdBQVcsSUFBSSxDQUFDLENBQUM7QUFFZixrQkFBVSxHQUFHLEtBQUssQ0FBQztBQUNuQixrQkFBVSxHQUFHLEtBQUssQ0FBQztBQUNuQixrQkFBVSxHQUFHLElBQUksQ0FBQztBQUU3QjtJQUNJQSxrQkFBb0JBLEdBQTZCQSxFQUFT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XCIuLi9ub2RlX21vZHVsZXMvcngvdHMvcnguYWxsLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL25vZGUuZC50c1wiIC8+XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5pbXBvcnQgUnggPSByZXF1aXJlKFwicnhcIik7XG5cbmV4cG9ydCB2YXIgREVCVUdfTE9PUCA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVR19USEVOID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX0VNSVQgPSB0cnVlO1xuXG5leHBvcnQgY2xhc3MgRHJhd1RpY2sge1xuICAgIGNvbnN0cnVjdG9yIChwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHB1YmxpYyBjbG9jazogbnVtYmVyLCBwdWJsaWMgZHQ6IG51bWJlcikge31cbn1cblxuZnVuY3Rpb24gc3RhY2tUcmFjZSgpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG4gICAgcmV0dXJuICg8YW55PmVycikuc3RhY2s7XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJhbWV0ZXI8VmFsdWU+IHtcbiAgICBjb25zdHJ1Y3Rvcihpbml0OiAoKSA9PiAoKHQ6IG51bWJlcikgPT4gVmFsdWUpKSB7XG4gICAgICAgIHRoaXMuaW5pdCA9IGluaXQ7XG4gICAgfVxuXG4gICAgaW5pdCgpOiAoY2xvY2s6IG51bWJlcikgPT4gVmFsdWUge3Rocm93IG5ldyBFcnJvcignVGhpcyBtZXRob2QgaXMgYWJzdHJhY3QnKTt9XG5cbiAgICBtYXA8Vj4oZm46IChWYWx1ZSkgPT4gVik6IFBhcmFtZXRlcjxWPiB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIGJhc2VfbmV4dCA9IGJhc2UuaW5pdCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmbihiYXNlX25leHQodCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBjbG9uZSgpOiBQYXJhbWV0ZXI8VmFsdWU+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwKHggPT4geCk7XG4gICAgfVxufVxuXG4vLyB0b2RvIHJlbW92ZSB0aGVzZVxuZXhwb3J0IHR5cGUgTnVtYmVyU3RyZWFtID0gUGFyYW1ldGVyPG51bWJlcj47XG5leHBvcnQgdHlwZSBQb2ludFN0cmVhbSA9IFBhcmFtZXRlcjxQb2ludD47XG5leHBvcnQgdHlwZSBDb2xvclN0cmVhbSA9IFBhcmFtZXRlcjxzdHJpbmc+O1xuZXhwb3J0IHR5cGUgRHJhd1N0cmVhbSA9IFJ4Lk9ic2VydmFibGU8RHJhd1RpY2s+O1xuXG5leHBvcnQgZnVuY3Rpb24gZml4ZWQ8VD4odmFsOiBUIHwgUGFyYW1ldGVyPFQ+KTogUGFyYW1ldGVyPFQ+IHtcbiAgICBpZiAodHlwZW9mICg8YW55PnZhbCkuaW5pdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyB3ZSB3ZXJlIHBhc3NlZCBpbiBhIFBhcmFtZXRlciBvYmplY3RcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXI8VD4oXG4gICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIGdlbmVyYXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dCA9ICg8UGFyYW1ldGVyPFQ+PnZhbCkuaW5pdCgpO1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZTogVCA9IG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjbG9jazogbnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChnZW5lcmF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbmV4dChjbG9jayk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJmaXhlZDogdmFsIGZyb20gcGFyYW1ldGVyXCIsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgUGFyYW1ldGVyPFQ+KFxuICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoY2xvY2s6IG51bWJlcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImZpeGVkOiB2YWwgZnJvbSBjb25zdGFudFwiLCB2YWwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gPFQ+dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbU51bWJlcih4OiBudW1iZXIgfCBOdW1iZXJTdHJlYW0pOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiA8TnVtYmVyU3RyZWFtPiAodHlwZW9mICg8YW55PngpLmluaXQgPT09ICdmdW5jdGlvbicgPyB4OiBmaXhlZCh4KSk7XG59XG5leHBvcnQgZnVuY3Rpb24gdG9TdHJlYW1Qb2ludCh4OiBQb2ludCB8IFBvaW50U3RyZWFtKTogUG9pbnRTdHJlYW0ge1xuICAgIHJldHVybiA8UG9pbnRTdHJlYW0+ICh0eXBlb2YgKDxhbnk+eCkuaW5pdCA9PT0gJ2Z1bmN0aW9uJyA/IHg6IGZpeGVkKHgpKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbUNvbG9yKHg6IHN0cmluZyB8IENvbG9yU3RyZWFtKTogQ29sb3JTdHJlYW0ge1xuICAgIHJldHVybiA8Q29sb3JTdHJlYW0+ICh0eXBlb2YgKDxhbnk+eCkuaW5pdCA9PT0gJ2Z1bmN0aW9uJyA/IHg6IGZpeGVkKHgpKTtcbn1cblxuZXhwb3J0IGNsYXNzIEFuaW1hdGlvbiB7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgX2F0dGFjaDogKHVwc3RyZWFtOiBEcmF3U3RyZWFtKSA9PiBEcmF3U3RyZWFtLCBwdWJsaWMgYWZ0ZXI/OiBBbmltYXRpb24pIHtcbiAgICB9XG4gICAgYXR0YWNoKHVwc3RyZWFtOiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImFuaW1hdGlvbiBpbml0aWFsaXplZCBcIiwgY2xvY2spO1xuXG4gICAgICAgIHZhciBpbnN0cmVhbSA9IG51bGw7XG4gICAgICAgIGluc3RyZWFtID0gdXBzdHJlYW07XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJhbmltYXRpb246IGluc3RyZWFtXCIsIGluc3RyZWFtLCBcInVwc3RyZWFtXCIsIHVwc3RyZWFtKTtcbiAgICAgICAgdmFyIHByb2Nlc3NlZCA9IHRoaXMuX2F0dGFjaChpbnN0cmVhbSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFmdGVyPyB0aGlzLmFmdGVyLmF0dGFjaChwcm9jZXNzZWQpOiBwcm9jZXNzZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIGRlbGl2ZXJzIGV2ZW50cyB0byB0aGlzIGZpcnN0LCB0aGVuIHdoZW4gdGhhdCBhbmltYXRpb24gaXMgZmluaXNoZWRcbiAgICAgKiB0aGUgZm9sbG93ZXIgY29uc3VtZXJzIGV2ZW50cyBhbmQgdGhlIHZhbHVlcyBhcmUgdXNlZCBhcyBvdXRwdXQsIHVudGlsIHRoZSBmb2xsb3dlciBhbmltYXRpb24gY29tcGxldGVzXG4gICAgICovXG4gICAgdGhlbihmb2xsb3dlcjogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2OiBEcmF3U3RyZWFtKSA6IERyYXdTdHJlYW0ge1xuICAgICAgICAgICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuY3JlYXRlPERyYXdUaWNrPihmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3QgID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0VHVybiA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudCA9IGZpcnN0O1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGF0dGFjaFwiKTtcblxuICAgICAgICAgICAgICAgIHZhciBzZWNvbmRBdHRhY2ggPSBudWxsO1xuXG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0QXR0YWNoICA9IHNlbGYuYXR0YWNoKGZpcnN0LnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpKS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGZpcnN0IHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IuYmluZChvYnNlcnZlciksXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBmaXJzdCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0VHVybiA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmRBdHRhY2ggPSBmb2xsb3dlci5hdHRhY2goc2Vjb25kLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpKS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBzZWNvbmQgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBzZWNvbmQgY29tcGxldGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgdmFyIHByZXZTdWJzY3JpcHRpb24gPSBwcmV2LnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogdXBzdHJlYW0gdG8gZmlyc3QgT1Igc2Vjb25kXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpcnN0VHVybikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0Lm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vjb25kLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogdXBzdHJlYW0gY29tcGxldGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAvLyBvbiBkaXNwb3NlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZGlzcG9zZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIHByZXZTdWJzY3JpcHRpb24uZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBmaXJzdEF0dGFjaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWNvbmRBdHRhY2gpXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmRBdHRhY2guZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKTsgLy90b2RvIHJlbW92ZSBzdWJzY3JpYmVPbnNcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQW5pbWF0b3Ige1xuICAgIHRpY2tlclN1YnNjcmlwdGlvbjogUnguRGlzcG9zYWJsZSA9IG51bGw7XG4gICAgcm9vdDogUnguU3ViamVjdDxEcmF3VGljaz47XG4gICAgYW5pbWF0aW9uU3Vic2NyaXB0aW9uczogUnguSURpc3Bvc2FibGVbXSA9IFtdO1xuICAgIHQ6IG51bWJlciA9IDA7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpIHtcbiAgICAgICAgdGhpcy5yb290ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KClcbiAgICB9XG4gICAgdGlja2VyKHRpY2s6IFJ4Lk9ic2VydmFibGU8bnVtYmVyPik6IHZvaWQge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50aWNrZXJTdWJzY3JpcHRpb24gPSB0aWNrLm1hcChmdW5jdGlvbihkdDogbnVtYmVyKSB7IC8vbWFwIHRoZSB0aWNrZXIgb250byBhbnkgLT4gY29udGV4dFxuICAgICAgICAgICAgdmFyIHRpY2sgPSBuZXcgRHJhd1RpY2soc2VsZi5jdHgsIHNlbGYudCwgZHQpO1xuICAgICAgICAgICAgc2VsZi50ICs9IGR0O1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pLnN1YnNjcmliZSh0aGlzLnJvb3QpO1xuICAgIH1cbiAgICBwbGF5IChhbmltYXRpb246IEFuaW1hdGlvbik6IHZvaWQge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IHBsYXlcIik7XG4gICAgICAgIHZhciBzYXZlQmVmb3JlRnJhbWUgPSB0aGlzLnJvb3QudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IHNhdmVcIik7XG4gICAgICAgICAgICB0aWNrLmN0eC5zYXZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZG9BbmltYXRpb24gPSBhbmltYXRpb24uYXR0YWNoKHNhdmVCZWZvcmVGcmFtZSk7XG4gICAgICAgIHZhciByZXN0b3JlQWZ0ZXJGcmFtZSA9IGRvQW5pbWF0aW9uLnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBuZXh0IHJlc3RvcmVcIik7XG4gICAgICAgICAgICAgICAgdGljay5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSxmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBlcnIgcmVzdG9yZVwiLCBlcnIpO1xuICAgICAgICAgICAgICAgIHNlbGYuY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0sZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hbmltYXRpb25TdWJzY3JpcHRpb25zLnB1c2goXG4gICAgICAgICAgICByZXN0b3JlQWZ0ZXJGcmFtZS5zdWJzY3JpYmUoKVxuICAgICAgICApO1xuICAgIH1cbn1cblxuZXhwb3J0IHR5cGUgUG9pbnQgPSBbbnVtYmVyLCBudW1iZXJdXG5leHBvcnQgZnVuY3Rpb24gcG9pbnQoXG4gICAgeDogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIHk6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogUG9pbnRTdHJlYW1cbntcbiAgICB2YXIgeF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcih4KTtcbiAgICB2YXIgeV9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcih5KTtcblxuICAgIC8vY29uc29sZS5sb2coXCJwb2ludDogaW5pdFwiLCB4X3N0cmVhbSwgeV9zdHJlYW0pO1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgeF9uZXh0ID0geF9zdHJlYW0uaW5pdCgpO1xuICAgICAgICAgICAgdmFyIHlfbmV4dCA9IHlfc3RyZWFtLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0OiBudW1iZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0OiBbbnVtYmVyLCBudW1iZXJdID0gW3hfbmV4dCh0KSwgeV9uZXh0KHQpXTtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwicG9pbnQ6IG5leHRcIiwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuLypcbiAgICBSR0IgYmV0d2VlbiAwIGFuZCAyNTVcbiAgICBhIGJldHdlZW4gMCAtIDFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbG9yKFxuICAgIHI6IG51bWJlciB8IE51bWJlclN0cmVhbSxcbiAgICBnOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgYjogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGE6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogQ29sb3JTdHJlYW1cbntcbiAgICB2YXIgcl9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihyKTtcbiAgICB2YXIgZ19zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihnKTtcbiAgICB2YXIgYl9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihiKTtcbiAgICB2YXIgYV9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihhKTtcbiAgICByZXR1cm4gbmV3IFBhcmFtZXRlcihcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHJfbmV4dCA9IHJfc3RyZWFtLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBnX25leHQgPSBnX3N0cmVhbS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYl9uZXh0ID0gYl9zdHJlYW0uaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFfbmV4dCA9IGFfc3RyZWFtLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0OiBudW1iZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgcl92YWwgPSBNYXRoLmZsb29yKHJfbmV4dCh0KSk7XG4gICAgICAgICAgICAgICAgdmFyIGdfdmFsID0gTWF0aC5mbG9vcihnX25leHQodCkpO1xuICAgICAgICAgICAgICAgIHZhciBiX3ZhbCA9IE1hdGguZmxvb3IoYl9uZXh0KHQpKTtcbiAgICAgICAgICAgICAgICB2YXIgYV92YWwgPSBhX25leHQodCk7XG4gICAgICAgICAgICAgICAgdmFyIHZhbCA9IFwicmdiYShcIiArIHJfdmFsICsgXCIsXCIgKyBnX3ZhbCArIFwiLFwiICsgYl92YWwgKyBcIixcIiArIGFfdmFsICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjb2xvcjogXCIsIHZhbCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0KCk6IE51bWJlclN0cmVhbSB7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgICgpID0+IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICByZXR1cm4gdDtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBybmQoKTogTnVtYmVyU3RyZWFtIHtcbiAgICByZXR1cm4gbmV3IFBhcmFtZXRlcihcbiAgICAgICAgKCkgPT4gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnJhbmRvbSgpO1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJuZE5vcm1hbChzY2FsZSA6IE51bWJlclN0cmVhbSB8IG51bWJlciA9IDEpOiBQb2ludFN0cmVhbSB7XG4gICAgdmFyIHNjYWxlXyA9IHRvU3RyZWFtTnVtYmVyKHNjYWxlKTtcbiAgICByZXR1cm4gbmV3IFBhcmFtZXRlcjxQb2ludD4oXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicm5kTm9ybWFsOiBpbml0XCIpO1xuICAgICAgICAgICAgdmFyIHNjYWxlX25leHQgPSBzY2FsZV8uaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0OiBudW1iZXIpOiBQb2ludCB7XG4gICAgICAgICAgICAgICAgdmFyIHNjYWxlID0gc2NhbGVfbmV4dCh0KTtcbiAgICAgICAgICAgICAgICAvLyBnZW5lcmF0ZSByYW5kb20gbnVtYmVyc1xuICAgICAgICAgICAgICAgIHZhciBub3JtMiA9IDEwMDtcbiAgICAgICAgICAgICAgICB3aGlsZSAobm9ybTIgPiAxKSB7IC8vcmVqZWN0IHRob3NlIG91dHNpZGUgdGhlIHVuaXQgY2lyY2xlXG4gICAgICAgICAgICAgICAgICAgIHZhciB4ID0gKE1hdGgucmFuZG9tKCkgLSAwLjUpICogMjtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHkgPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiAyO1xuICAgICAgICAgICAgICAgICAgICBub3JtMiA9IHggKiB4ICsgeSAqIHk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG5vcm0gPSBNYXRoLnNxcnQobm9ybTIpO1xuICAgICAgICAgICAgICAgIHZhciB2YWw6IFtudW1iZXIsIG51bWJlcl0gPSBbc2NhbGUgKiB4IC8gbm9ybSAsIHNjYWxlICogeSAvIG5vcm1dO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicm5kTm9ybWFsOiB2YWxcIiwgdmFsKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuLyoqXG4gKiBOT1RFOiBjdXJyZW50bHkgZmFpbHMgaWYgdGhlIHN0cmVhbXMgYXJlIGRpZmZlcmVudCBsZW5ndGhzXG4gKiBAcGFyYW0gYXNzZXJ0RHQgdGhlIGV4cGVjdGVkIGNsb2NrIHRpY2sgdmFsdWVzXG4gKiBAcGFyYW0gYWZ0ZXJcbiAqIEByZXR1cm5zIHtBbmltYXRpb259XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnREdChleHBlY3RlZER0OiBSeC5PYnNlcnZhYmxlPG51bWJlcj4sIGFmdGVyPzogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbih1cHN0cmVhbSkge1xuICAgICAgICByZXR1cm4gdXBzdHJlYW0uemlwKGV4cGVjdGVkRHQsIGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrLCBleHBlY3RlZER0VmFsdWU6IG51bWJlcikge1xuICAgICAgICAgICAgaWYgKHRpY2suZHQgIT0gZXhwZWN0ZWREdFZhbHVlKSB0aHJvdyBuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIGR0IG9ic2VydmVkOiBcIiArIHRpY2suZHQgKyBcIiwgZXhwZWN0ZWQ6XCIgKyBleHBlY3RlZER0VmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pO1xuICAgIH0sIGFmdGVyKTtcbn1cblxuLy90b2RvIHdvdWxkIGJlIG5pY2UgaWYgdGhpcyB0b29rIGFuIGl0ZXJhYmxlIG9yIHNvbWUgb3RoZXIgdHlwZSBvZiBzaW1wbGUgcHVsbCBzdHJlYW1cbi8vIGFuZCB1c2VkIHN0cmVhbUVxdWFsc1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydENsb2NrKGFzc2VydENsb2NrOiBudW1iZXJbXSwgYWZ0ZXI/OiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgIHZhciBpbmRleCA9IDA7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbih1cHN0cmVhbSkge1xuICAgICAgICByZXR1cm4gdXBzdHJlYW0udGFwT25OZXh0KGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFzc2VydENsb2NrOiBcIiwgdGljayk7XG4gICAgICAgICAgICBpZiAodGljay5jbG9jayA8IGFzc2VydENsb2NrW2luZGV4XSAtIDAuMDAwMDEgfHwgdGljay5jbG9jayA+IGFzc2VydENsb2NrW2luZGV4XSArIDAuMDAwMDEpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3JNc2cgPSBcInVuZXhwZWN0ZWQgY2xvY2sgb2JzZXJ2ZWQ6IFwiICsgdGljay5jbG9jayArIFwiLCBleHBlY3RlZDpcIiArIGFzc2VydENsb2NrW2luZGV4XVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yTXNnKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5kZXggKys7XG4gICAgICAgIH0pO1xuICAgIH0sIGFmdGVyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRpc3BsYWNlVDxUPihkaXNwbGFjZW1lbnQ6IG51bWJlciB8IFBhcmFtZXRlcjxudW1iZXI+LCB2YWx1ZTogUGFyYW1ldGVyPFQ+KTogUGFyYW1ldGVyPFQ+IHtcbiAgICB2YXIgZGVsdGF0OiBQYXJhbWV0ZXI8bnVtYmVyPiA9IHRvU3RyZWFtTnVtYmVyKGRpc3BsYWNlbWVudCk7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXI8VD4gKFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgZHRfbmV4dCA9IGRlbHRhdC5pbml0KCk7XG4gICAgICAgICAgICB2YXIgdmFsdWVfbmV4dCA9IHZhbHVlLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodCkge1xuICAgICAgICAgICAgICAgIHZhciBkdCA9IGR0X25leHQodCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkaXNwbGFjZVQ6IFwiLCBkdClcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVfbmV4dCh0ICsgZHQpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApXG59XG5cbi8vdG9kbzogc2hvdWxkIGJlIHQgYXMgYSBwYXJhbWV0ZXIgdG8gYSBub24gdGVtcG9yXG5leHBvcnQgZnVuY3Rpb24gc2luKHBlcmlvZDogbnVtYmVyfCBQYXJhbWV0ZXI8bnVtYmVyPik6IFBhcmFtZXRlcjxudW1iZXI+IHtcbiAgICBjb25zb2xlLmxvZyhcInNpbjogbmV3XCIpO1xuICAgIHZhciBwZXJpb2Rfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocGVyaW9kKTtcbiAgICByZXR1cm4gbmV3IFBhcmFtZXRlcihcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHBlcmlvZF9uZXh0ID0gcGVyaW9kX3N0cmVhbS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IE1hdGguc2luKHQgKiAoTWF0aC5QSSAqIDIpIC8gcGVyaW9kX25leHQodCkpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic2luOiB0aWNrXCIsIHQsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNvcyhwZXJpb2Q6IG51bWJlcnwgUGFyYW1ldGVyPG51bWJlcj4pOiBQYXJhbWV0ZXI8bnVtYmVyPiB7XG4gICAgY29uc29sZS5sb2coXCJjb3M6IG5ld1wiKTtcbiAgICB2YXIgcGVyaW9kX3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKHBlcmlvZCk7XG4gICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHZhciBwZXJpb2RfbmV4dCA9IHBlcmlvZF9zdHJlYW0uaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0OiBudW1iZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBNYXRoLmNvcyh0ICogKE1hdGguUEkgKiAyKSAvIHBlcmlvZF9uZXh0KHQpKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNvczogdGlja1wiLCB0LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuZnVuY3Rpb24gc2NhbGVfeChcbiAgICBzY2FsZTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIHg6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG57IHJldHVybiAwO31cblxuZnVuY3Rpb24gc3RvcmVUeChcbiAgICBuOiBzdHJpbmcsIC8qcGFzcyB0aG91Z2ggY29udGV4dCBidXQgc3RvcmUgdHJhbnNmb3JtIGluIHZhcmlhYmxlKi9cbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvL3Bhc3N0aHJvdWdoXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG5mdW5jdGlvbiBsb2FkVHgoXG4gICAgbjogc3RyaW5nLCAvKnBhc3MgdGhvdWdoIGNvbnRleHQgYnV0IHN0b3JlIHRyYW5zZm9ybSBpbiB2YXJpYWJsZSovXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb24gLy9wYXNzdGhyb3VnaFxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuLyoqXG4gKiBwbGF5cyBzZXZlcmFsIGFuaW1hdGlvbnMsIGZpbmlzaGVzIHdoZW4gdGhleSBhcmUgYWxsIGRvbmUuXG4gKiBAcGFyYW0gYW5pbWF0aW9uc1xuICogQHJldHVybnMge0FuaW1hdGlvbn1cbiAqIHRvZG86IEkgdGhpbmsgdGhlcmUgYXJlIGxvdHMgb2YgYnVncyB3aGVuIGFuIGFuaW1hdGlvbiBzdG9wcyBwYXJ0IHdheVxuICogSSB0aGluayBpdCBiZSBiZXR0ZXIgaWYgdGhpcyBzcGF3bmVkIGl0cyBvd24gQW5pbWF0b3IgdG8gaGFuZGxlIGN0eCByZXN0b3Jlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyYWxsZWwoXG4gICAgYW5pbWF0aW9uczogUnguT2JzZXJ2YWJsZTxBbmltYXRpb24+IHwgQW5pbWF0aW9uW11cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBpbml0aWFsaXppbmdcIik7XG5cbiAgICAgICAgdmFyIGFjdGl2ZUFuaW1hdGlvbnMgPSAwO1xuICAgICAgICB2YXIgYXR0YWNoUG9pbnQgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcblxuICAgICAgICBmdW5jdGlvbiBkZWNyZW1lbnRBY3RpdmUoKSB7XG4gICAgICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJwYXJhbGxlbDogZGVjcmVtZW50IGFjdGl2ZVwiKTtcbiAgICAgICAgICAgIGFjdGl2ZUFuaW1hdGlvbnMgLS07XG4gICAgICAgIH1cblxuICAgICAgICBhbmltYXRpb25zLmZvckVhY2goZnVuY3Rpb24oYW5pbWF0aW9uOiBBbmltYXRpb24pIHtcbiAgICAgICAgICAgIGFjdGl2ZUFuaW1hdGlvbnMrKztcbiAgICAgICAgICAgIGFuaW1hdGlvbi5hdHRhY2goYXR0YWNoUG9pbnQudGFwT25OZXh0KHRpY2sgPT4gdGljay5jdHguc2F2ZSgpKSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICB0aWNrID0+IHRpY2suY3R4LnJlc3RvcmUoKSxcbiAgICAgICAgICAgICAgICBkZWNyZW1lbnRBY3RpdmUsXG4gICAgICAgICAgICAgICAgZGVjcmVtZW50QWN0aXZlKVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcHJldi50YWtlV2hpbGUoKCkgPT4gYWN0aXZlQW5pbWF0aW9ucyA+IDApLnRhcE9uTmV4dChmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBlbWl0dGluZywgYW5pbWF0aW9uc1wiLCB0aWNrKTtcbiAgICAgICAgICAgICAgICBhdHRhY2hQb2ludC5vbk5leHQodGljayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGVtaXR0aW5nIGZpbmlzaGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xvbmUoXG4gICAgbjogbnVtYmVyLFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBwYXJhbGxlbChSeC5PYnNlcnZhYmxlLnJldHVybihhbmltYXRpb24pLnJlcGVhdChuKSk7XG59XG5cblxuZnVuY3Rpb24gc2VxdWVuY2UoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57IHJldHVybiBudWxsO31cblxuLyoqXG4gKiBUaGUgY2hpbGQgYW5pbWF0aW9uIGlzIHN0YXJ0ZWQgZXZlcnkgZnJhbWVcbiAqIEBwYXJhbSBhbmltYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVtaXQoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcImVtaXQ6IGluaXRpYWxpemluZ1wiKTtcbiAgICAgICAgdmFyIGF0dGFjaFBvaW50ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgcmV0dXJuIHByZXYudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwiZW1pdDogZW1taXR0aW5nXCIsIGFuaW1hdGlvbik7XG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uLmF0dGFjaChhdHRhY2hQb2ludCkuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgYXR0YWNoUG9pbnQub25OZXh0KHRpY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0pO1xufVxuXG5cbi8qKlxuICogV2hlbiB0aGUgY2hpbGQgbG9vcCBmaW5pc2hlcywgaXQgaXMgc3Bhd25lZFxuICogQHBhcmFtIGFuaW1hdGlvblxuICogQHJldHVybnMge0FuaW1hdGlvbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvb3AoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGluaXRpYWxpemluZ1wiKTtcblxuXG4gICAgICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmNyZWF0ZTxEcmF3VGljaz4oZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGNyZWF0ZSBuZXcgbG9vcFwiKTtcbiAgICAgICAgICAgIHZhciBsb29wU3RhcnQgPSBudWxsO1xuICAgICAgICAgICAgdmFyIGxvb3BTdWJzY3JpcHRpb24gPSBudWxsO1xuICAgICAgICAgICAgdmFyIHQgPSAwO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBhdHRhY2hMb29wKG5leHQpIHsgLy90b2RvIEkgZmVlbCBsaWtlIHdlIGNhbiByZW1vdmUgYSBsZXZlbCBmcm9tIHRoaXMgc29tZWhvd1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIHN0YXJ0aW5nIGF0XCIsIHQpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN0YXJ0ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICBsb29wU3Vic2NyaXB0aW9uID0gYW5pbWF0aW9uLmF0dGFjaChsb29wU3RhcnQpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIGVyciB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgY29tcGxldGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbmV3IGlubmVyIGxvb3AgZmluaXNoZWQgY29uc3RydWN0aW9uXCIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByZXYuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvb3BTdGFydCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBubyBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTG9vcChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSB0byBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnQub25OZXh0KG5leHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHQgKz0gbmV4dC5kdDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHVwc3RyZWFtIGVycm9yIHRvIGRvd25zdHJlYW1cIiwgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQuYmluZChvYnNlcnZlcilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvL2Rpc3Bvc2VcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBkaXNwb3NlXCIpO1xuICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQpIGxvb3BTdGFydC5kaXNwb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJhdyhcbiAgICBpbml0RHJhdzogKCkgPT4gKCh0aWNrOiBEcmF3VGljaykgPT4gdm9pZCksXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldmlvdXM6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIGRyYXc6ICh0aWNrOiBEcmF3VGljaykgPT4gdm9pZCA9IGluaXREcmF3KCk7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy50YXBPbk5leHQoZHJhdyk7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1vdmUoXG4gICAgZGVsdGE6IFBvaW50IHwgUG9pbnRTdHJlYW0sXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIGNvbnNvbGUubG9nKFwibW92ZTogYXR0YWNoZWRcIik7XG4gICAgdmFyIHBvaW50U3RyZWFtOiBQb2ludFN0cmVhbSA9IHRvU3RyZWFtUG9pbnQoZGVsdGEpO1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgcG9pbnRfbmV4dCA9IHBvaW50U3RyZWFtLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvaW50ID0gcG9pbnRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm1vdmU6XCIsIHBvaW50KTtcbiAgICAgICAgICAgICAgICBpZiAodGljaylcbiAgICAgICAgICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKDEsIDAsIDAsIDEsIHBvaW50WzBdLCBwb2ludFsxXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAsIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wb3NpdGUoXG4gICAgY29tcG9zaXRlX21vZGU6IHN0cmluZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgdGljay5jdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gY29tcG9zaXRlX21vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAsIGFuaW1hdGlvbik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHZlbG9jaXR5KFxuICAgIHZlbG9jaXR5OiBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgdmVsb2NpdHlTdHJlYW06IFBvaW50U3RyZWFtID0gdG9TdHJlYW1Qb2ludCh2ZWxvY2l0eSk7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHZhciBwb3M6IFBvaW50ID0gWzAuMCwwLjBdO1xuICAgICAgICAgICAgdmFyIHZlbG9jaXR5X25leHQgPSB2ZWxvY2l0eVN0cmVhbS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odGljaykge1xuICAgICAgICAgICAgICAgIHZhciB2ZWxvY2l0eSA9IHZlbG9jaXR5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKDEsIDAsIDAsIDEsIHBvc1swXSwgcG9zWzFdKTtcbiAgICAgICAgICAgICAgICBwb3NbMF0gKz0gdmVsb2NpdHlbMF0gKiB0aWNrLmR0O1xuICAgICAgICAgICAgICAgIHBvc1sxXSArPSB2ZWxvY2l0eVsxXSAqIHRpY2suZHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2Vlbl9saW5lYXIoXG4gICAgZnJvbTogUG9pbnQgfCBQb2ludFN0cmVhbSxcbiAgICB0bzogICBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIHRpbWU6IG51bWJlcixcbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvKiBjb3BpZXMgKi9cbik6IEFuaW1hdGlvblxue1xuICAgIHZhciBmcm9tX3N0cmVhbSA9IHRvU3RyZWFtUG9pbnQoZnJvbSk7XG4gICAgdmFyIHRvX3N0cmVhbSA9IHRvU3RyZWFtUG9pbnQodG8pO1xuICAgIHZhciBzY2FsZSA9IDEuMCAvIHRpbWU7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbihwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHZhciB0ID0gMDtcbiAgICAgICAgdmFyIGZyb21fbmV4dCA9IGZyb21fc3RyZWFtLmluaXQoKTtcbiAgICAgICAgdmFyIHRvX25leHQgPSB0b19zdHJlYW0uaW5pdCgpO1xuICAgICAgICByZXR1cm4gcHJldi5tYXAoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidHdlZW46IGlubmVyXCIpO1xuICAgICAgICAgICAgdmFyIGZyb20gPSBmcm9tX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICB2YXIgdG8gICA9IHRvX25leHQodGljay5jbG9jayk7XG5cbiAgICAgICAgICAgIHQgPSB0ICsgdGljay5kdDtcbiAgICAgICAgICAgIGlmICh0ID4gdGltZSkgdCA9IHRpbWU7XG4gICAgICAgICAgICB2YXIgeCA9IGZyb21bMF0gKyAodG9bMF0gLSBmcm9tWzBdKSAqIHQgKiBzY2FsZTtcbiAgICAgICAgICAgIHZhciB5ID0gZnJvbVsxXSArICh0b1sxXSAtIGZyb21bMV0pICogdCAqIHNjYWxlO1xuICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKDEsIDAsIDAsIDEsIHgsIHkpO1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pLnRha2VXaGlsZShmdW5jdGlvbih0aWNrKSB7cmV0dXJuIHQgPCB0aW1lO30pXG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlY3QoXG4gICAgcDE6IFBvaW50LCAvL3RvZG8gZHluYW1pYyBwYXJhbXMgaW5zdGVhZFxuICAgIHAyOiBQb2ludCwgLy90b2RvIGR5bmFtaWMgcGFyYW1zIGluc3RlYWRcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlY3Q6IGZpbGxSZWN0XCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxSZWN0KHAxWzBdLCBwMVsxXSwgcDJbMF0sIHAyWzFdKTsgLy90b2RvIG9ic2VydmVyIHN0cmVhbSBpZiBuZWNpc3NhcnlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjaGFuZ2VDb2xvcihcbiAgICBjb2xvcjogc3RyaW5nLCAvL3RvZG9cbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5maWxsU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZnVuY3Rpb24gbWFwKFxuICAgIG1hcF9mbjogKHByZXY6IERyYXdUaWNrKSA9PiBEcmF3VGljayxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXZpb3VzOiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy5tYXAobWFwX2ZuKVxuICAgIH0sIGFuaW1hdGlvbilcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRha2UoXG4gICAgaXRlcmF0aW9uczogbnVtYmVyLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24ocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICByZXR1cm4gcHJldi50YWtlKGl0ZXJhdGlvbnMpO1xuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmUod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyLCBwYXRoOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgIHZhciBHSUZFbmNvZGVyID0gcmVxdWlyZSgnZ2lmZW5jb2RlcicpO1xuICAgIHZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cblxuICAgIHZhciBlbmNvZGVyID0gbmV3IEdJRkVuY29kZXIod2lkdGgsIGhlaWdodCk7XG4gICAgZW5jb2Rlci5jcmVhdGVSZWFkU3RyZWFtKClcbiAgICAgIC5waXBlKGVuY29kZXIuY3JlYXRlV3JpdGVTdHJlYW0oeyByZXBlYXQ6IDEwMDAwLCBkZWxheTogMTAwLCBxdWFsaXR5OiAxIH0pKVxuICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ocGF0aCkpO1xuICAgIGVuY29kZXIuc3RhcnQoKTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwYXJlbnQ6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICB2YXIgZW5kTmV4dCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gcGFyZW50LnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzYXZlOiB3cm90ZSBmcmFtZVwiKTtcbiAgICAgICAgICAgICAgICAvL3QgKz0gdGljay5kdDtcbiAgICAgICAgICAgICAgICAvL3ZhciBvdXQgPSBmcy53cml0ZUZpbGVTeW5jKHBhdGggKyBcIl9cIisgdCArIFwiLnBuZ1wiLCBjYW52YXMudG9CdWZmZXIoKSk7XG4gICAgICAgICAgICAgICAgLy92YXIgcGFyc2VkID0gcG5ncGFyc2UoY2FudmFzLnRvQnVmZmVyKCkpXG4gICAgICAgICAgICAgICAgZW5jb2Rlci5hZGRGcmFtZSh0aWNrLmN0eCk7XG4gICAgICAgICAgICAgICAgLy9lbmNvZGVyLmFkZEZyYW1lKHRpY2suY3R4LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmVycm9yKFwic2F2ZTogbm90IHNhdmVkXCIsIHBhdGgpO30sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmxvZyhcInNhdmU6IHNhdmVkXCIsIHBhdGgpOyBlbmNvZGVyLmZpbmlzaCgpOy8qIGVuZE5leHQgPSB0cnVlOyovfVxuICAgICAgICApXG4gICAgfSk7XG59XG5cbi8vIHRvZG8gQlVHIFRPRE8gTElTVFxuXG4vLyByZXBsYWNlIHBhcnJhbGVsIHdpdGggaXRzIG93biBpbnRlcm5hbCBhbmltYXRvclxuLy8gd2Vic2l0ZVxuLy8ganNGaWRkbGVcbi8vIGdsb3dcbi8vIEwgc3lzdGVtcyAoZm9sZD8pXG5cblxuLy8gSURFQVNcblxuLy8gUGFjTWFuXG4vLyB3aGF0IGFib3V0IGEgZGlmZmVyZW50IHdheSBvZiBtYWtpbmcgZ2xvdz9cbi8vIHJlbmRlciBsdW1pbmVjZW5jZSBpbnRvIGEgdGV4dHVyZSBhbmQgdGhlbiBjb2xvciBiYXNlZCBvbiBkaXN0YW5jZSBmcm9tIGxpZ2h0c291cmNlXG4vLyBtb3VzZSBpbnB1dCwgdGFpbGluZyBnbG93IChyZW1iZXIgdG8gdHdlZW4gYmV0d2VlbiByYXBpZCBtb3ZlbWVudHMpXG4vLyBvZmZzY3JlZW4gcmVuZGVyaW5nIGFuIHBsYXliYWNrXG4vLyBzaW4gd2F2ZSwgcmFuZG9taXplZFxuLy8gR1VJIGNvbXBvbmVudHMsIHJlc3BvbnNpdmUsIGJvb3RzdHJhcFxuLy8gZ2V0IGRhdGEgb3V0IGJ5IHRhcHBpbmcgaW50byBmbG93IChpbnRlcmNlcHQoU3ViamVjdCBwYXNzYmFjaykpXG4vLyBTVkcgaW1wb3J0XG4vLyBsYXllcmluZyB3aXRoIHBhcnJhbGxlbCAoYmFjayBmaXJzdClcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==