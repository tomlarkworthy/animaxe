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
function assert(predicate, message) {
    if (!predicate) {
        console.error(stackTrace());
        throw new Error();
    }
}
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
function rgba(r, g, b, a) {
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
exports.rgba = rgba;
function hsl(h, s, l) {
    var h_stream = toStreamNumber(h);
    var s_stream = toStreamNumber(s);
    var l_stream = toStreamNumber(l);
    return new Parameter(function () {
        var h_next = h_stream.init();
        var s_next = s_stream.init();
        var l_next = l_stream.init();
        return function (t) {
            var h_val = Math.floor(h_next(t));
            var s_val = Math.floor(s_next(t));
            var l_val = Math.floor(l_next(t));
            var val = "hsl(" + h_val + "," + s_val + "%," + l_val + "%)";
            console.log("hsl: ", val);
            return val;
        };
    });
}
exports.hsl = hsl;
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
// foreground color used to define emmitter regions around the canvas
//  the hue, is reused in the particles
//  the lightness is use to describe the quantity (max lightness leads to total saturation)
//
// the additional parameter intesity is used to scale the emmiters
// generally the colors you place on the map will be exceeded by the saturation
//
// How are two different hues sensibly mixed
// decay of 0.5
//
//       H
// 1 2 4 9 4 2 1       //sat, also alpha
//----------------------------
//         1 2 4 2 1   //sat
//             H2
//
// we add the contribution to an image sized accumulator
// as the contributions need to sum permutation independently (also probably associative)
// blend(rgba1, rgba2) = blend(rgba2,rgba1)
// alpha = a1 + a2 - a1a2
// if a1 = 1   and a2 = 1,   alpha = 1         = 1
// if a1 = 0.5 and a2 = 1,   alpha = 1.5 - 0.5 = 1
// if a1 = 0.5 and a2 = 0.5, alpha = 1 - 0.25  = 0.75
// Normal blending doesn't commute:
// red = (r1 * a1  + (r2 * a2) * (1 - a1)) / alpha
// lighten does, which is just the max
// red = max(r1, r2)
// or addition red = r1 + r2
// http://www.deepskycolors.com/archive/2010/04/21/formulas-for-Photoshop-blending-modes.html
function glow(decay, after) {
    if (decay === void 0) { decay = 0.1; }
    return draw(function () {
        return function (tick) {
            var ctx = tick.ctx;
            // our src pixel data
            var width = ctx.canvas.width;
            var height = ctx.canvas.height;
            var pixels = width * height;
            var imgData = ctx.getImageData(0, 0, width, height);
            var data = imgData.data;
            // console.log("original data", imgData.data)
            // our target data
            // todo if we used a Typed array throughout we could save some zeroing and other crappy conversions
            // although at least we are calculating at a high accuracy, lets not do a byte array from the beginning
            var glowData = new Array(pixels * 4);
            for (var i = 0; i < pixels * 4; i++)
                glowData[i] = 0;
            // passback to avoid lots of array allocations in rgbToHsl, and hslToRgb calls
            var hsl = [0, 0, 0];
            var rgb = [0, 0, 0];
            // calculate the contribution of each emmitter on their surrounds
            for (var y = 0; y < height; y++) {
                for (var x = 0; x < width; x++) {
                    var red = data[((width * y) + x) * 4];
                    var green = data[((width * y) + x) * 4 + 1];
                    var blue = data[((width * y) + x) * 4 + 2];
                    var alpha = data[((width * y) + x) * 4 + 3];
                    // convert to hsl
                    rgbToHsl(red, green, blue, hsl);
                    var hue = hsl[0];
                    var qty = hsl[1]; // qty decays
                    var local_decay = hsl[2];
                    // we only need to calculate a contribution near the source
                    // contribution = qty decaying by inverse square distance
                    // c = q / (d^2 * k), we want to find the c < 0.01 point
                    // 0.01 = q / (d^2 * k) => d^2 = q / (0.01 * k)
                    // d = sqrt(100 * q / k) (note 2 solutions, representing the two halfwidths)
                    var halfwidth = Math.sqrt(1000 * qty / (decay * local_decay));
                    var li = Math.max(0, Math.floor(x - halfwidth));
                    var ui = Math.min(width, Math.ceil(x + halfwidth));
                    var lj = Math.max(0, Math.floor(y - halfwidth));
                    var uj = Math.min(height, Math.ceil(y + halfwidth));
                    for (var j = lj; j < uj; j++) {
                        for (var i = li; i < ui; i++) {
                            var dx = i - x;
                            var dy = j - y;
                            var d_squared = dx * dx + dy * dy;
                            // c is in the same scale at qty i.e. (0 - 100, saturation)
                            var c = (qty) / (1 + d_squared * decay * local_decay);
                            assert(c <= 100);
                            assert(c > 0);
                            rgb = hslToRgb(hue, 100, c, rgb);
                            var c_alpha = c / 100.0;
                            var r_i = ((width * j) + i) * 4;
                            var g_i = ((width * j) + i) * 4 + 1;
                            var b_i = ((width * j) + i) * 4 + 2;
                            var a_i = ((width * j) + i) * 4 + 3;
                            /*
                            console.log("pre-alpha", glowData[a_i]);
                            console.log("dx", dx, "dy", dy);
                            console.log("qty", qty);
                            console.log("d_squared", d_squared);
                            console.log("decay", decay);
                            console.log("local_decay", local_decay);
                            console.log("c", c);
                            console.log("c_alpha", c_alpha);
                            console.log("a_i", a_i);
                            */
                            var pre_alpha = glowData[a_i];
                            assert(c_alpha <= 1);
                            assert(c_alpha >= 0);
                            assert(pre_alpha <= 1);
                            assert(pre_alpha >= 0);
                            // blend alpha first into accumulator
                            glowData[a_i] = glowData[a_i] + c_alpha - c_alpha * glowData[a_i];
                            //glowData[a_i] = Math.max(glowData[a_i], c_alpha);
                            assert(glowData[a_i] <= 1);
                            assert(glowData[a_i] >= 0);
                            /*
                            glowData[r_i] = (pre_alpha + rgb[0]/ 255.0 - c_alpha * rgb[0]/ 255.0) * 255;
                            glowData[g_i] = (pre_alpha + rgb[1]/ 255.0 - c_alpha * rgb[1]/ 255.0) * 255;
                            glowData[b_i] = (pre_alpha + rgb[2]/ 255.0 - c_alpha * rgb[2]/ 255.0) * 255;
                            */
                            // console.log("post-alpha", glowData[a_i]);
                            // now simple lighten
                            /*
                            glowData[r_i] = Math.max(rgb[0], glowData[r_i]);
                            glowData[g_i] = Math.max(rgb[1], glowData[g_i]);
                            glowData[b_i] = Math.max(rgb[2], glowData[b_i]);
                            */
                            // mix the colors like pigment
                            /*
                            var total_alpha = c_alpha + pre_alpha;
                            glowData[r_i] = (c_alpha * rgb[0] + pre_alpha * glowData[r_i]) / total_alpha;
                            glowData[g_i] = (c_alpha * rgb[1] + pre_alpha * glowData[g_i]) / total_alpha;
                            glowData[b_i] = (c_alpha * rgb[2] + pre_alpha * glowData[b_i]) / total_alpha;
                            */
                            /*
                            REALLY COOL EFFECT
                            glowData[r_i] = rgb[0] + glowData[r_i];
                            glowData[g_i] = rgb[1] + glowData[g_i];
                            glowData[b_i] = rgb[2] + glowData[b_i];
                            */
                            glowData[r_i] = Math.min(rgb[0] + glowData[r_i], 255);
                            glowData[g_i] = Math.min(rgb[1] + glowData[g_i], 255);
                            glowData[b_i] = Math.min(rgb[2] + glowData[b_i], 255);
                        }
                    }
                }
            }
            console.log("glow", glowData);
            var buf = new ArrayBuffer(data.length);
            for (var y = 0; y < height; y++) {
                for (var x = 0; x < width; x++) {
                    var r_i = ((width * y) + x) * 4;
                    var g_i = ((width * y) + x) * 4 + 1;
                    var b_i = ((width * y) + x) * 4 + 2;
                    var a_i = ((width * y) + x) * 4 + 3;
                    buf[r_i] = Math.round(glowData[r_i]);
                    buf[g_i] = Math.round(glowData[g_i]);
                    buf[b_i] = Math.round(glowData[b_i]);
                    buf[a_i] = Math.round(glowData[a_i] * 255);
                }
            }
            // (todo) maybe we can speed boost some of this
            // https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/
            //finally overwrite the pixel data with the accumulator
            imgData.data.set(new Uint8ClampedArray(buf));
            ctx.putImageData(imgData, 0, 0);
        };
    }, after);
}
exports.glow = glow;
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
// Features
// Glow
// lighten = 1−(1−A)×(1−B)
// number particles k/(d^2)
// transparency increases inverse square too
// only foreground alpha makes an effect (background is considered solid)
// Reflection
// L systems (fold?)
// Engineering
// figure out why example3 cannot have move than 1000 particles without a stack overflow
// fix test randomness
// replace paralel with its own internal animator
// marketing
// website
// jsFiddle
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
/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b, passback) {
    // console.log("rgbToHsl: input", r, g, b);
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max == min) {
        h = s = 0; // achromatic
    }
    else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    passback[0] = Math.round(h * 360); // 0 - 360 degrees
    passback[1] = Math.round(s * 100); // 0 - 100%
    passback[2] = Math.round(l * 100); // 0 - 100%
    // console.log("rgbToHsl: output", passback);
    return passback;
}
/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l, passback) {
    var r, g, b;
    // console.log("hslToRgb input:", h, s, l);
    h /= 360;
    l /= 100;
    s /= 100;
    if (s == 0) {
        r = g = b = l; // achromatic
    }
    else {
        var hue2rgb = function hue2rgb(p, q, t) {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    passback[0] = Math.round(r * 255);
    passback[1] = Math.round(g * 255);
    passback[2] = Math.round(b * 255);
    // console.log("hslToRgb", passback);
    return passback;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiRHJhd1RpY2siLCJEcmF3VGljay5jb25zdHJ1Y3RvciIsImFzc2VydCIsInN0YWNrVHJhY2UiLCJQYXJhbWV0ZXIiLCJQYXJhbWV0ZXIuY29uc3RydWN0b3IiLCJQYXJhbWV0ZXIuaW5pdCIsIlBhcmFtZXRlci5tYXAiLCJQYXJhbWV0ZXIuY2xvbmUiLCJmaXhlZCIsInRvU3RyZWFtTnVtYmVyIiwidG9TdHJlYW1Qb2ludCIsInRvU3RyZWFtQ29sb3IiLCJBbmltYXRpb24iLCJBbmltYXRpb24uY29uc3RydWN0b3IiLCJBbmltYXRpb24uYXR0YWNoIiwiQW5pbWF0aW9uLnRoZW4iLCJBbmltYXRvciIsIkFuaW1hdG9yLmNvbnN0cnVjdG9yIiwiQW5pbWF0b3IudGlja2VyIiwiQW5pbWF0b3IucGxheSIsInBvaW50IiwicmdiYSIsImhzbCIsInQiLCJybmQiLCJybmROb3JtYWwiLCJhc3NlcnREdCIsImFzc2VydENsb2NrIiwiZGlzcGxhY2VUIiwic2luIiwiY29zIiwic2NhbGVfeCIsInN0b3JlVHgiLCJsb2FkVHgiLCJwYXJhbGxlbCIsImRlY3JlbWVudEFjdGl2ZSIsImNsb25lIiwic2VxdWVuY2UiLCJlbWl0IiwibG9vcCIsImF0dGFjaExvb3AiLCJkcmF3IiwibW92ZSIsImNvbXBvc2l0ZSIsInZlbG9jaXR5IiwidHdlZW5fbGluZWFyIiwicmVjdCIsImNoYW5nZUNvbG9yIiwiZ2xvdyIsIm1hcCIsInRha2UiLCJzYXZlIiwicmdiVG9Ic2wiLCJoc2xUb1JnYiIsImhzbFRvUmdiLmh1ZTJyZ2IiXSwibWFwcGluZ3MiOiJBQUFBLDBEQUEwRDtBQUMxRCwyQ0FBMkM7QUFDM0MsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDeEMsSUFBTyxFQUFFLFdBQVcsSUFBSSxDQUFDLENBQUM7QUFFZixrQkFBVSxHQUFHLEtBQUssQ0FBQztBQUNuQixrQkFBVSxHQUFHLEtBQUssQ0FBQztB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Q0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDckRBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO0lBRTlCQSxFQUFFQSxDQUFBQSxDQUFDQSxHQUFHQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFBQSxDQUFDQTtRQUNYQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxhQUFhQTtJQUM1QkEsQ0FBQ0E7SUFBQUEsSUFBSUEsQ0FBQUEsQ0FBQ0E7UUFDRkEsSUFBSUEsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0E7UUFDbEJBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBO1FBQ3BEQSxNQUFNQSxDQUFBQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFBQSxDQUFDQTtZQUNSQSxLQUFLQSxDQUFDQTtnQkFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLEtBQUtBLENBQUNBO1lBQ2pEQSxLQUFLQSxDQUFDQTtnQkFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLEtBQUtBLENBQUNBO1lBQ25DQSxLQUFLQSxD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LEdBQUdBLENBQUNBLENBQUNBO1FBQ2xCQSxDQUFDQSxHQUFHQSxPQUFPQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUMzQkEsQ0FBQ0EsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDckJBLENBQUNBLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBLENBQUNBO0lBQy9CQSxDQUFDQTtJQUVEQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQTtJQUNsQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7SUFDbENBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBO0lBRWxDQSxxQ0FBcUNBO0lBRXJDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtBQUNwQkEsQ0FBQ0EiLCJmaWxlIjoiYW5pbWF4ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9ub2RlX21vZHVsZXMvcngvdHMvcnguYWxsLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL25vZGUuZC50c1wiIC8+XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5pbXBvcnQgUnggPSByZXF1aXJlKFwicnhcIik7XG5cbmV4cG9ydCB2YXIgREVCVUdfTE9PUCA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVR19USEVOID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX0VNSVQgPSB0cnVlO1xuXG5leHBvcnQgY2xhc3MgRHJhd1RpY2sge1xuICAgIGNvbnN0cnVjdG9yIChwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHB1YmxpYyBjbG9jazogbnVtYmVyLCBwdWJsaWMgZHQ6IG51bWJlcikge31cbn1cblxuZnVuY3Rpb24gYXNzZXJ0KHByZWRpY2F0ZTogYm9vbGVhbiwgbWVzc2FnZSA/OiBzdHJpbmcpIHtcbiAgICBpZiAoIXByZWRpY2F0ZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKHN0YWNrVHJhY2UoKSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3RhY2tUcmFjZSgpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG4gICAgcmV0dXJuICg8YW55PmVycikuc3RhY2s7XG59XG5cbmV4cG9ydCBjbGFzcyBQYXJhbWV0ZXI8VmFsdWU+IHtcbiAgICBjb25zdHJ1Y3Rvcihpbml0OiAoKSA9PiAoKHQ6IG51bWJlcikgPT4gVmFsdWUpKSB7XG4gICAgICAgIHRoaXMuaW5pdCA9IGluaXQ7XG4gICAgfVxuXG4gICAgaW5pdCgpOiAoY2xvY2s6IG51bWJlcikgPT4gVmFsdWUge3Rocm93IG5ldyBFcnJvcignVGhpcyBtZXRob2QgaXMgYWJzdHJhY3QnKTt9XG5cbiAgICBtYXA8Vj4oZm46IChWYWx1ZSkgPT4gVik6IFBhcmFtZXRlcjxWPiB7XG4gICAgICAgIHZhciBiYXNlID0gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXIoXG4gICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIGJhc2VfbmV4dCA9IGJhc2UuaW5pdCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmbihiYXNlX25leHQodCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBjbG9uZSgpOiBQYXJhbWV0ZXI8VmFsdWU+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwKHggPT4geCk7XG4gICAgfVxufVxuXG4vLyB0b2RvIHJlbW92ZSB0aGVzZVxuZXhwb3J0IHR5cGUgTnVtYmVyU3RyZWFtID0gUGFyYW1ldGVyPG51bWJlcj47XG5leHBvcnQgdHlwZSBQb2ludFN0cmVhbSA9IFBhcmFtZXRlcjxQb2ludD47XG5leHBvcnQgdHlwZSBDb2xvclN0cmVhbSA9IFBhcmFtZXRlcjxzdHJpbmc+O1xuZXhwb3J0IHR5cGUgRHJhd1N0cmVhbSA9IFJ4Lk9ic2VydmFibGU8RHJhd1RpY2s+O1xuXG5leHBvcnQgZnVuY3Rpb24gZml4ZWQ8VD4odmFsOiBUIHwgUGFyYW1ldGVyPFQ+KTogUGFyYW1ldGVyPFQ+IHtcbiAgICBpZiAodHlwZW9mICg8YW55PnZhbCkuaW5pdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyB3ZSB3ZXJlIHBhc3NlZCBpbiBhIFBhcmFtZXRlciBvYmplY3RcbiAgICAgICAgcmV0dXJuIG5ldyBQYXJhbWV0ZXI8VD4oXG4gICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIGdlbmVyYXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dCA9ICg8UGFyYW1ldGVyPFQ+PnZhbCkuaW5pdCgpO1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZTogVCA9IG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjbG9jazogbnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChnZW5lcmF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gbmV4dChjbG9jayk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJmaXhlZDogdmFsIGZyb20gcGFyYW1ldGVyXCIsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgUGFyYW1ldGVyPFQ+KFxuICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoY2xvY2s6IG51bWJlcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImZpeGVkOiB2YWwgZnJvbSBjb25zdGFudFwiLCB2YWwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gPFQ+dmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbU51bWJlcih4OiBudW1iZXIgfCBOdW1iZXJTdHJlYW0pOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiA8TnVtYmVyU3RyZWFtPiAodHlwZW9mICg8YW55PngpLmluaXQgPT09ICdmdW5jdGlvbicgPyB4OiBmaXhlZCh4KSk7XG59XG5leHBvcnQgZnVuY3Rpb24gdG9TdHJlYW1Qb2ludCh4OiBQb2ludCB8IFBvaW50U3RyZWFtKTogUG9pbnRTdHJlYW0ge1xuICAgIHJldHVybiA8UG9pbnRTdHJlYW0+ICh0eXBlb2YgKDxhbnk+eCkuaW5pdCA9PT0gJ2Z1bmN0aW9uJyA/IHg6IGZpeGVkKHgpKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiB0b1N0cmVhbUNvbG9yKHg6IHN0cmluZyB8IENvbG9yU3RyZWFtKTogQ29sb3JTdHJlYW0ge1xuICAgIHJldHVybiA8Q29sb3JTdHJlYW0+ICh0eXBlb2YgKDxhbnk+eCkuaW5pdCA9PT0gJ2Z1bmN0aW9uJyA/IHg6IGZpeGVkKHgpKTtcbn1cblxuZXhwb3J0IGNsYXNzIEFuaW1hdGlvbiB7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgX2F0dGFjaDogKHVwc3RyZWFtOiBEcmF3U3RyZWFtKSA9PiBEcmF3U3RyZWFtLCBwdWJsaWMgYWZ0ZXI/OiBBbmltYXRpb24pIHtcbiAgICB9XG4gICAgYXR0YWNoKHVwc3RyZWFtOiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImFuaW1hdGlvbiBpbml0aWFsaXplZCBcIiwgY2xvY2spO1xuXG4gICAgICAgIHZhciBpbnN0cmVhbSA9IG51bGw7XG4gICAgICAgIGluc3RyZWFtID0gdXBzdHJlYW07XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJhbmltYXRpb246IGluc3RyZWFtXCIsIGluc3RyZWFtLCBcInVwc3RyZWFtXCIsIHVwc3RyZWFtKTtcbiAgICAgICAgdmFyIHByb2Nlc3NlZCA9IHRoaXMuX2F0dGFjaChpbnN0cmVhbSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFmdGVyPyB0aGlzLmFmdGVyLmF0dGFjaChwcm9jZXNzZWQpOiBwcm9jZXNzZWQ7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIGRlbGl2ZXJzIGV2ZW50cyB0byB0aGlzIGZpcnN0LCB0aGVuIHdoZW4gdGhhdCBhbmltYXRpb24gaXMgZmluaXNoZWRcbiAgICAgKiB0aGUgZm9sbG93ZXIgY29uc3VtZXJzIGV2ZW50cyBhbmQgdGhlIHZhbHVlcyBhcmUgdXNlZCBhcyBvdXRwdXQsIHVudGlsIHRoZSBmb2xsb3dlciBhbmltYXRpb24gY29tcGxldGVzXG4gICAgICovXG4gICAgdGhlbihmb2xsb3dlcjogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2OiBEcmF3U3RyZWFtKSA6IERyYXdTdHJlYW0ge1xuICAgICAgICAgICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuY3JlYXRlPERyYXdUaWNrPihmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3QgID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0VHVybiA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudCA9IGZpcnN0O1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGF0dGFjaFwiKTtcblxuICAgICAgICAgICAgICAgIHZhciBzZWNvbmRBdHRhY2ggPSBudWxsO1xuXG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0QXR0YWNoICA9IHNlbGYuYXR0YWNoKGZpcnN0LnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpKS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGZpcnN0IHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IuYmluZChvYnNlcnZlciksXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBmaXJzdCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0VHVybiA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmRBdHRhY2ggPSBmb2xsb3dlci5hdHRhY2goc2Vjb25kLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpKS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBzZWNvbmQgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBzZWNvbmQgY29tcGxldGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgdmFyIHByZXZTdWJzY3JpcHRpb24gPSBwcmV2LnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogdXBzdHJlYW0gdG8gZmlyc3QgT1Igc2Vjb25kXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpcnN0VHVybikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0Lm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vjb25kLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcixcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogdXBzdHJlYW0gY29tcGxldGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkNvbXBsZXRlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAvLyBvbiBkaXNwb3NlXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZGlzcG9zZXJcIik7XG4gICAgICAgICAgICAgICAgICAgIHByZXZTdWJzY3JpcHRpb24uZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBmaXJzdEF0dGFjaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWNvbmRBdHRhY2gpXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmRBdHRhY2guZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKTsgLy90b2RvIHJlbW92ZSBzdWJzY3JpYmVPbnNcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQW5pbWF0b3Ige1xuICAgIHRpY2tlclN1YnNjcmlwdGlvbjogUnguRGlzcG9zYWJsZSA9IG51bGw7XG4gICAgcm9vdDogUnguU3ViamVjdDxEcmF3VGljaz47XG4gICAgYW5pbWF0aW9uU3Vic2NyaXB0aW9uczogUnguSURpc3Bvc2FibGVbXSA9IFtdO1xuICAgIHQ6IG51bWJlciA9IDA7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpIHtcbiAgICAgICAgdGhpcy5yb290ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KClcbiAgICB9XG4gICAgdGlja2VyKHRpY2s6IFJ4Lk9ic2VydmFibGU8bnVtYmVyPik6IHZvaWQge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50aWNrZXJTdWJzY3JpcHRpb24gPSB0aWNrLm1hcChmdW5jdGlvbihkdDogbnVtYmVyKSB7IC8vbWFwIHRoZSB0aWNrZXIgb250byBhbnkgLT4gY29udGV4dFxuICAgICAgICAgICAgdmFyIHRpY2sgPSBuZXcgRHJhd1RpY2soc2VsZi5jdHgsIHNlbGYudCwgZHQpO1xuICAgICAgICAgICAgc2VsZi50ICs9IGR0O1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pLnN1YnNjcmliZSh0aGlzLnJvb3QpO1xuICAgIH1cbiAgICBwbGF5IChhbmltYXRpb246IEFuaW1hdGlvbik6IHZvaWQge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IHBsYXlcIik7XG4gICAgICAgIHZhciBzYXZlQmVmb3JlRnJhbWUgPSB0aGlzLnJvb3QudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IHNhdmVcIik7XG4gICAgICAgICAgICB0aWNrLmN0eC5zYXZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZG9BbmltYXRpb24gPSBhbmltYXRpb24uYXR0YWNoKHNhdmVCZWZvcmVGcmFtZSk7XG4gICAgICAgIHZhciByZXN0b3JlQWZ0ZXJGcmFtZSA9IGRvQW5pbWF0aW9uLnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBuZXh0IHJlc3RvcmVcIik7XG4gICAgICAgICAgICAgICAgdGljay5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSxmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBlcnIgcmVzdG9yZVwiLCBlcnIpO1xuICAgICAgICAgICAgICAgIHNlbGYuY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0sZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hbmltYXRpb25TdWJzY3JpcHRpb25zLnB1c2goXG4gICAgICAgICAgICByZXN0b3JlQWZ0ZXJGcmFtZS5zdWJzY3JpYmUoKVxuICAgICAgICApO1xuICAgIH1cbn1cblxuZXhwb3J0IHR5cGUgUG9pbnQgPSBbbnVtYmVyLCBudW1iZXJdXG5leHBvcnQgZnVuY3Rpb24gcG9pbnQoXG4gICAgeDogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIHk6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogUG9pbnRTdHJlYW1cbntcbiAgICB2YXIgeF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcih4KTtcbiAgICB2YXIgeV9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcih5KTtcblxuICAgIC8vY29uc29sZS5sb2coXCJwb2ludDogaW5pdFwiLCB4X3N0cmVhbSwgeV9zdHJlYW0pO1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgeF9uZXh0ID0geF9zdHJlYW0uaW5pdCgpO1xuICAgICAgICAgICAgdmFyIHlfbmV4dCA9IHlfc3RyZWFtLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0OiBudW1iZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0OiBbbnVtYmVyLCBudW1iZXJdID0gW3hfbmV4dCh0KSwgeV9uZXh0KHQpXTtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwicG9pbnQ6IG5leHRcIiwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuLypcbiAgICBSR0IgYmV0d2VlbiAwIGFuZCAyNTVcbiAgICBhIGJldHdlZW4gMCAtIDFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJnYmEoXG4gICAgcjogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGc6IG51bWJlciB8IE51bWJlclN0cmVhbSxcbiAgICBiOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgYTogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG4pOiBDb2xvclN0cmVhbVxue1xuICAgIHZhciByX3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKHIpO1xuICAgIHZhciBnX3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKGcpO1xuICAgIHZhciBiX3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKGIpO1xuICAgIHZhciBhX3N0cmVhbSA9IHRvU3RyZWFtTnVtYmVyKGEpO1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgcl9uZXh0ID0gcl9zdHJlYW0uaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGdfbmV4dCA9IGdfc3RyZWFtLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBiX25leHQgPSBiX3N0cmVhbS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYV9uZXh0ID0gYV9zdHJlYW0uaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgICAgIHZhciByX3ZhbCA9IE1hdGguZmxvb3Iocl9uZXh0KHQpKTtcbiAgICAgICAgICAgICAgICB2YXIgZ192YWwgPSBNYXRoLmZsb29yKGdfbmV4dCh0KSk7XG4gICAgICAgICAgICAgICAgdmFyIGJfdmFsID0gTWF0aC5mbG9vcihiX25leHQodCkpO1xuICAgICAgICAgICAgICAgIHZhciBhX3ZhbCA9IGFfbmV4dCh0KTtcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gXCJyZ2JhKFwiICsgcl92YWwgKyBcIixcIiArIGdfdmFsICsgXCIsXCIgKyBiX3ZhbCArIFwiLFwiICsgYV92YWwgKyBcIilcIjtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNvbG9yOiBcIiwgdmFsKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhzbChcbiAgICBoOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgczogbnVtYmVyIHwgTnVtYmVyU3RyZWFtLFxuICAgIGw6IG51bWJlciB8IE51bWJlclN0cmVhbVxuKTogQ29sb3JTdHJlYW1cbntcbiAgICB2YXIgaF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihoKTtcbiAgICB2YXIgc19zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihzKTtcbiAgICB2YXIgbF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihsKTtcbiAgICByZXR1cm4gbmV3IFBhcmFtZXRlcihcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIGhfbmV4dCA9IGhfc3RyZWFtLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBzX25leHQgPSBzX3N0cmVhbS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgbF9uZXh0ID0gbF9zdHJlYW0uaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgICAgIHZhciBoX3ZhbCA9IE1hdGguZmxvb3IoaF9uZXh0KHQpKTtcbiAgICAgICAgICAgICAgICB2YXIgc192YWwgPSBNYXRoLmZsb29yKHNfbmV4dCh0KSk7XG4gICAgICAgICAgICAgICAgdmFyIGxfdmFsID0gTWF0aC5mbG9vcihsX25leHQodCkpO1xuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBcImhzbChcIiArIGhfdmFsICsgXCIsXCIgKyBzX3ZhbCArIFwiJSxcIiArIGxfdmFsICsgXCIlKVwiO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaHNsOiBcIiwgdmFsKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHQoKTogTnVtYmVyU3RyZWFtIHtcbiAgICByZXR1cm4gbmV3IFBhcmFtZXRlcihcbiAgICAgICAgKCkgPT4gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgICAgIHJldHVybiB0O1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJuZCgpOiBOdW1iZXJTdHJlYW0ge1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKFxuICAgICAgICAoKSA9PiBmdW5jdGlvbiAodCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcm5kTm9ybWFsKHNjYWxlIDogTnVtYmVyU3RyZWFtIHwgbnVtYmVyID0gMSk6IFBvaW50U3RyZWFtIHtcbiAgICB2YXIgc2NhbGVfID0gdG9TdHJlYW1OdW1iZXIoc2NhbGUpO1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyPFBvaW50PihcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJybmROb3JtYWw6IGluaXRcIik7XG4gICAgICAgICAgICB2YXIgc2NhbGVfbmV4dCA9IHNjYWxlXy5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHQ6IG51bWJlcik6IFBvaW50IHtcbiAgICAgICAgICAgICAgICB2YXIgc2NhbGUgPSBzY2FsZV9uZXh0KHQpO1xuICAgICAgICAgICAgICAgIC8vIGdlbmVyYXRlIHJhbmRvbSBudW1iZXJzXG4gICAgICAgICAgICAgICAgdmFyIG5vcm0yID0gMTAwO1xuICAgICAgICAgICAgICAgIHdoaWxlIChub3JtMiA+IDEpIHsgLy9yZWplY3QgdGhvc2Ugb3V0c2lkZSB0aGUgdW5pdCBjaXJjbGVcbiAgICAgICAgICAgICAgICAgICAgdmFyIHggPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiAyO1xuICAgICAgICAgICAgICAgICAgICB2YXIgeSA9IChNYXRoLnJhbmRvbSgpIC0gMC41KSAqIDI7XG4gICAgICAgICAgICAgICAgICAgIG5vcm0yID0geCAqIHggKyB5ICogeTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgbm9ybSA9IE1hdGguc3FydChub3JtMik7XG4gICAgICAgICAgICAgICAgdmFyIHZhbDogW251bWJlciwgbnVtYmVyXSA9IFtzY2FsZSAqIHggLyBub3JtICwgc2NhbGUgKiB5IC8gbm9ybV07XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJybmROb3JtYWw6IHZhbFwiLCB2YWwpO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG4vKipcbiAqIE5PVEU6IGN1cnJlbnRseSBmYWlscyBpZiB0aGUgc3RyZWFtcyBhcmUgZGlmZmVyZW50IGxlbmd0aHNcbiAqIEBwYXJhbSBhc3NlcnREdCB0aGUgZXhwZWN0ZWQgY2xvY2sgdGljayB2YWx1ZXNcbiAqIEBwYXJhbSBhZnRlclxuICogQHJldHVybnMge0FuaW1hdGlvbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydER0KGV4cGVjdGVkRHQ6IFJ4Lk9ic2VydmFibGU8bnVtYmVyPiwgYWZ0ZXI/OiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHVwc3RyZWFtKSB7XG4gICAgICAgIHJldHVybiB1cHN0cmVhbS56aXAoZXhwZWN0ZWREdCwgZnVuY3Rpb24odGljazogRHJhd1RpY2ssIGV4cGVjdGVkRHRWYWx1ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICBpZiAodGljay5kdCAhPSBleHBlY3RlZER0VmFsdWUpIHRocm93IG5ldyBFcnJvcihcInVuZXhwZWN0ZWQgZHQgb2JzZXJ2ZWQ6IFwiICsgdGljay5kdCArIFwiLCBleHBlY3RlZDpcIiArIGV4cGVjdGVkRHRWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSk7XG4gICAgfSwgYWZ0ZXIpO1xufVxuXG4vL3RvZG8gd291bGQgYmUgbmljZSBpZiB0aGlzIHRvb2sgYW4gaXRlcmFibGUgb3Igc29tZSBvdGhlciB0eXBlIG9mIHNpbXBsZSBwdWxsIHN0cmVhbVxuLy8gYW5kIHVzZWQgc3RyZWFtRXF1YWxzXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Q2xvY2soYXNzZXJ0Q2xvY2s6IG51bWJlcltdLCBhZnRlcj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgdmFyIGluZGV4ID0gMDtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHVwc3RyZWFtKSB7XG4gICAgICAgIHJldHVybiB1cHN0cmVhbS50YXBPbk5leHQoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYXNzZXJ0Q2xvY2s6IFwiLCB0aWNrKTtcbiAgICAgICAgICAgIGlmICh0aWNrLmNsb2NrIDwgYXNzZXJ0Q2xvY2tbaW5kZXhdIC0gMC4wMDAwMSB8fCB0aWNrLmNsb2NrID4gYXNzZXJ0Q2xvY2tbaW5kZXhdICsgMC4wMDAwMSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvck1zZyA9IFwidW5leHBlY3RlZCBjbG9jayBvYnNlcnZlZDogXCIgKyB0aWNrLmNsb2NrICsgXCIsIGV4cGVjdGVkOlwiICsgYXNzZXJ0Q2xvY2tbaW5kZXhdXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3JNc2cpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbmRleCArKztcbiAgICAgICAgfSk7XG4gICAgfSwgYWZ0ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlzcGxhY2VUPFQ+KGRpc3BsYWNlbWVudDogbnVtYmVyIHwgUGFyYW1ldGVyPG51bWJlcj4sIHZhbHVlOiBQYXJhbWV0ZXI8VD4pOiBQYXJhbWV0ZXI8VD4ge1xuICAgIHZhciBkZWx0YXQ6IFBhcmFtZXRlcjxudW1iZXI+ID0gdG9TdHJlYW1OdW1iZXIoZGlzcGxhY2VtZW50KTtcbiAgICByZXR1cm4gbmV3IFBhcmFtZXRlcjxUPiAoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHZhciBkdF9uZXh0ID0gZGVsdGF0LmluaXQoKTtcbiAgICAgICAgICAgIHZhciB2YWx1ZV9uZXh0ID0gdmFsdWUuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGR0ID0gZHRfbmV4dCh0KTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRpc3BsYWNlVDogXCIsIGR0KVxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZV9uZXh0KHQgKyBkdClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIClcbn1cblxuLy90b2RvOiBzaG91bGQgYmUgdCBhcyBhIHBhcmFtZXRlciB0byBhIG5vbiB0ZW1wb3JcbmV4cG9ydCBmdW5jdGlvbiBzaW4ocGVyaW9kOiBudW1iZXJ8IFBhcmFtZXRlcjxudW1iZXI+KTogUGFyYW1ldGVyPG51bWJlcj4ge1xuICAgIGNvbnNvbGUubG9nKFwic2luOiBuZXdcIik7XG4gICAgdmFyIHBlcmlvZF9zdHJlYW0gPSB0b1N0cmVhbU51bWJlcihwZXJpb2QpO1xuICAgIHJldHVybiBuZXcgUGFyYW1ldGVyKFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgcGVyaW9kX25leHQgPSBwZXJpb2Rfc3RyZWFtLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodDogbnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gTWF0aC5zaW4odCAqIChNYXRoLlBJICogMikgLyBwZXJpb2RfbmV4dCh0KSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzaW46IHRpY2tcIiwgdCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5leHBvcnQgZnVuY3Rpb24gY29zKHBlcmlvZDogbnVtYmVyfCBQYXJhbWV0ZXI8bnVtYmVyPik6IFBhcmFtZXRlcjxudW1iZXI+IHtcbiAgICBjb25zb2xlLmxvZyhcImNvczogbmV3XCIpO1xuICAgIHZhciBwZXJpb2Rfc3RyZWFtID0gdG9TdHJlYW1OdW1iZXIocGVyaW9kKTtcbiAgICByZXR1cm4gbmV3IFBhcmFtZXRlcihcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHBlcmlvZF9uZXh0ID0gcGVyaW9kX3N0cmVhbS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHQ6IG51bWJlcikge1xuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IE1hdGguY29zKHQgKiAoTWF0aC5QSSAqIDIpIC8gcGVyaW9kX25leHQodCkpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY29zOiB0aWNrXCIsIHQsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5mdW5jdGlvbiBzY2FsZV94KFxuICAgIHNjYWxlOiBudW1iZXIgfCBOdW1iZXJTdHJlYW0sXG4gICAgeDogbnVtYmVyIHwgTnVtYmVyU3RyZWFtXG4pOiBudW1iZXIgfCBOdW1iZXJTdHJlYW1cbnsgcmV0dXJuIDA7fVxuXG5mdW5jdGlvbiBzdG9yZVR4KFxuICAgIG46IHN0cmluZywgLypwYXNzIHRob3VnaCBjb250ZXh0IGJ1dCBzdG9yZSB0cmFuc2Zvcm0gaW4gdmFyaWFibGUqL1xuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8vcGFzc3Rocm91Z2hcbik6IEFuaW1hdGlvblxueyByZXR1cm4gbnVsbDt9XG5cbmZ1bmN0aW9uIGxvYWRUeChcbiAgICBuOiBzdHJpbmcsIC8qcGFzcyB0aG91Z2ggY29udGV4dCBidXQgc3RvcmUgdHJhbnNmb3JtIGluIHZhcmlhYmxlKi9cbiAgICBhbmltYXRpb246IEFuaW1hdGlvbiAvL3Bhc3N0aHJvdWdoXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG4vKipcbiAqIHBsYXlzIHNldmVyYWwgYW5pbWF0aW9ucywgZmluaXNoZXMgd2hlbiB0aGV5IGFyZSBhbGwgZG9uZS5cbiAqIEBwYXJhbSBhbmltYXRpb25zXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICogdG9kbzogSSB0aGluayB0aGVyZSBhcmUgbG90cyBvZiBidWdzIHdoZW4gYW4gYW5pbWF0aW9uIHN0b3BzIHBhcnQgd2F5XG4gKiBJIHRoaW5rIGl0IGJlIGJldHRlciBpZiB0aGlzIHNwYXduZWQgaXRzIG93biBBbmltYXRvciB0byBoYW5kbGUgY3R4IHJlc3RvcmVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJhbGxlbChcbiAgICBhbmltYXRpb25zOiBSeC5PYnNlcnZhYmxlPEFuaW1hdGlvbj4gfCBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGluaXRpYWxpemluZ1wiKTtcblxuICAgICAgICB2YXIgYWN0aXZlQW5pbWF0aW9ucyA9IDA7XG4gICAgICAgIHZhciBhdHRhY2hQb2ludCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGRlY3JlbWVudEFjdGl2ZSgpIHtcbiAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBkZWNyZW1lbnQgYWN0aXZlXCIpO1xuICAgICAgICAgICAgYWN0aXZlQW5pbWF0aW9ucyAtLTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFuaW1hdGlvbnMuZm9yRWFjaChmdW5jdGlvbihhbmltYXRpb246IEFuaW1hdGlvbikge1xuICAgICAgICAgICAgYWN0aXZlQW5pbWF0aW9ucysrO1xuICAgICAgICAgICAgYW5pbWF0aW9uLmF0dGFjaChhdHRhY2hQb2ludC50YXBPbk5leHQodGljayA9PiB0aWNrLmN0eC5zYXZlKCkpKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIHRpY2sgPT4gdGljay5jdHgucmVzdG9yZSgpLFxuICAgICAgICAgICAgICAgIGRlY3JlbWVudEFjdGl2ZSxcbiAgICAgICAgICAgICAgICBkZWNyZW1lbnRBY3RpdmUpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBwcmV2LnRha2VXaGlsZSgoKSA9PiBhY3RpdmVBbmltYXRpb25zID4gMCkudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGVtaXR0aW5nLCBhbmltYXRpb25zXCIsIHRpY2spO1xuICAgICAgICAgICAgICAgIGF0dGFjaFBvaW50Lm9uTmV4dCh0aWNrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJwYXJhbGxlbDogZW1pdHRpbmcgZmluaXNoZWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbG9uZShcbiAgICBuOiBudW1iZXIsXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIHBhcmFsbGVsKFJ4Lk9ic2VydmFibGUucmV0dXJuKGFuaW1hdGlvbikucmVwZWF0KG4pKTtcbn1cblxuXG5mdW5jdGlvbiBzZXF1ZW5jZShcbiAgICBhbmltYXRpb246IEFuaW1hdGlvbltdXG4pOiBBbmltYXRpb25cbnsgcmV0dXJuIG51bGw7fVxuXG4vKipcbiAqIFRoZSBjaGlsZCBhbmltYXRpb24gaXMgc3RhcnRlZCBldmVyeSBmcmFtZVxuICogQHBhcmFtIGFuaW1hdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZW1pdChcbiAgICBhbmltYXRpb246IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwiZW1pdDogaW5pdGlhbGl6aW5nXCIpO1xuICAgICAgICB2YXIgYXR0YWNoUG9pbnQgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcblxuICAgICAgICByZXR1cm4gcHJldi50YXBPbk5leHQoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJlbWl0OiBlbW1pdHRpbmdcIiwgYW5pbWF0aW9uKTtcbiAgICAgICAgICAgICAgICBhbmltYXRpb24uYXR0YWNoKGF0dGFjaFBvaW50KS5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICBhdHRhY2hQb2ludC5vbk5leHQodGljayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSk7XG59XG5cblxuLyoqXG4gKiBXaGVuIHRoZSBjaGlsZCBsb29wIGZpbmlzaGVzLCBpdCBpcyBzcGF3bmVkXG4gKiBAcGFyYW0gYW5pbWF0aW9uXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9vcChcbiAgICBhbmltYXRpb246IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogaW5pdGlhbGl6aW5nXCIpO1xuXG5cbiAgICAgICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuY3JlYXRlPERyYXdUaWNrPihmdW5jdGlvbihvYnNlcnZlcikge1xuICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogY3JlYXRlIG5ldyBsb29wXCIpO1xuICAgICAgICAgICAgdmFyIGxvb3BTdGFydCA9IG51bGw7XG4gICAgICAgICAgICB2YXIgbG9vcFN1YnNjcmlwdGlvbiA9IG51bGw7XG4gICAgICAgICAgICB2YXIgdCA9IDA7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGF0dGFjaExvb3AobmV4dCkgeyAvL3RvZG8gSSBmZWVsIGxpa2Ugd2UgY2FuIHJlbW92ZSBhIGxldmVsIGZyb20gdGhpcyBzb21laG93XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbmV3IGlubmVyIGxvb3Agc3RhcnRpbmcgYXRcIiwgdCk7XG5cbiAgICAgICAgICAgICAgICBsb29wU3RhcnQgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcblxuICAgICAgICAgICAgICAgIGxvb3BTdWJzY3JpcHRpb24gPSBhbmltYXRpb24uYXR0YWNoKGxvb3BTdGFydCkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBwb3N0LWlubmVyIGxvb3AgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBwb3N0LWlubmVyIGxvb3AgZXJyIHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBjb21wbGV0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBuZXcgaW5uZXIgbG9vcCBmaW5pc2hlZCBjb25zdHJ1Y3Rpb25cIilcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJldi5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobG9vcFN0YXJ0ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5vIGlubmVyIGxvb3BcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHRhY2hMb29wKG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHVwc3RyZWFtIHRvIGlubmVyIGxvb3BcIik7XG4gICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydC5vbk5leHQobmV4dCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdCArPSBuZXh0LmR0O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogdXBzdHJlYW0gZXJyb3IgdG8gZG93bnN0cmVhbVwiLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkNvbXBsZXRlZC5iaW5kKG9ic2VydmVyKVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vZGlzcG9zZVxuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGRpc3Bvc2VcIik7XG4gICAgICAgICAgICAgICAgaWYgKGxvb3BTdGFydCkgbG9vcFN0YXJ0LmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSk7XG4gICAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkcmF3KFxuICAgIGluaXREcmF3OiAoKSA9PiAoKHRpY2s6IERyYXdUaWNrKSA9PiB2b2lkKSxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2aW91czogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICB2YXIgZHJhdzogKHRpY2s6IERyYXdUaWNrKSA9PiB2b2lkID0gaW5pdERyYXcoKTtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzLnRhcE9uTmV4dChkcmF3KTtcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW92ZShcbiAgICBkZWx0YTogUG9pbnQgfCBQb2ludFN0cmVhbSxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgY29uc29sZS5sb2coXCJtb3ZlOiBhdHRhY2hlZFwiKTtcbiAgICB2YXIgcG9pbnRTdHJlYW06IFBvaW50U3RyZWFtID0gdG9TdHJlYW1Qb2ludChkZWx0YSk7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHZhciBwb2ludF9uZXh0ID0gcG9pbnRTdHJlYW0uaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9pbnQgPSBwb2ludF9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibW92ZTpcIiwgcG9pbnQpO1xuICAgICAgICAgICAgICAgIGlmICh0aWNrKVxuICAgICAgICAgICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgcG9pbnRbMF0sIHBvaW50WzFdKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBvc2l0ZShcbiAgICBjb21wb3NpdGVfbW9kZTogc3RyaW5nLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHRpY2spIHtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBjb21wb3NpdGVfbW9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICwgYW5pbWF0aW9uKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gdmVsb2NpdHkoXG4gICAgdmVsb2NpdHk6IFBvaW50IHwgUG9pbnRTdHJlYW0sXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHZhciB2ZWxvY2l0eVN0cmVhbTogUG9pbnRTdHJlYW0gPSB0b1N0cmVhbVBvaW50KHZlbG9jaXR5KTtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHBvczogUG9pbnQgPSBbMC4wLDAuMF07XG4gICAgICAgICAgICB2YXIgdmVsb2NpdHlfbmV4dCA9IHZlbG9jaXR5U3RyZWFtLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHZlbG9jaXR5ID0gdmVsb2NpdHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgcG9zWzBdLCBwb3NbMV0pO1xuICAgICAgICAgICAgICAgIHBvc1swXSArPSB2ZWxvY2l0eVswXSAqIHRpY2suZHQ7XG4gICAgICAgICAgICAgICAgcG9zWzFdICs9IHZlbG9jaXR5WzFdICogdGljay5kdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHR3ZWVuX2xpbmVhcihcbiAgICBmcm9tOiBQb2ludCB8IFBvaW50U3RyZWFtLFxuICAgIHRvOiAgIFBvaW50IHwgUG9pbnRTdHJlYW0sXG4gICAgdGltZTogbnVtYmVyLFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uIC8qIGNvcGllcyAqL1xuKTogQW5pbWF0aW9uXG57XG4gICAgdmFyIGZyb21fc3RyZWFtID0gdG9TdHJlYW1Qb2ludChmcm9tKTtcbiAgICB2YXIgdG9fc3RyZWFtID0gdG9TdHJlYW1Qb2ludCh0byk7XG4gICAgdmFyIHNjYWxlID0gMS4wIC8gdGltZTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICB2YXIgZnJvbV9uZXh0ID0gZnJvbV9zdHJlYW0uaW5pdCgpO1xuICAgICAgICB2YXIgdG9fbmV4dCA9IHRvX3N0cmVhbS5pbml0KCk7XG4gICAgICAgIHJldHVybiBwcmV2Lm1hcChmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ0d2VlbjogaW5uZXJcIik7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IGZyb21fbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgIHZhciB0byAgID0gdG9fbmV4dCh0aWNrLmNsb2NrKTtcblxuICAgICAgICAgICAgdCA9IHQgKyB0aWNrLmR0O1xuICAgICAgICAgICAgaWYgKHQgPiB0aW1lKSB0ID0gdGltZTtcbiAgICAgICAgICAgIHZhciB4ID0gZnJvbVswXSArICh0b1swXSAtIGZyb21bMF0pICogdCAqIHNjYWxlO1xuICAgICAgICAgICAgdmFyIHkgPSBmcm9tWzFdICsgKHRvWzFdIC0gZnJvbVsxXSkgKiB0ICogc2NhbGU7XG4gICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgeCwgeSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSkudGFrZVdoaWxlKGZ1bmN0aW9uKHRpY2spIHtyZXR1cm4gdCA8IHRpbWU7fSlcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVjdChcbiAgICBwMTogUG9pbnQsIC8vdG9kbyBkeW5hbWljIHBhcmFtcyBpbnN0ZWFkXG4gICAgcDI6IFBvaW50LCAvL3RvZG8gZHluYW1pYyBwYXJhbXMgaW5zdGVhZFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVjdDogZmlsbFJlY3RcIik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguZmlsbFJlY3QocDFbMF0sIHAxWzFdLCBwMlswXSwgcDJbMV0pOyAvL3RvZG8gb2JzZXJ2ZXIgc3RyZWFtIGlmIG5lY2lzc2FyeVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNoYW5nZUNvbG9yKFxuICAgIGNvbG9yOiBzdHJpbmcsIC8vdG9kb1xuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG4vLyBmb3JlZ3JvdW5kIGNvbG9yIHVzZWQgdG8gZGVmaW5lIGVtbWl0dGVyIHJlZ2lvbnMgYXJvdW5kIHRoZSBjYW52YXNcbi8vICB0aGUgaHVlLCBpcyByZXVzZWQgaW4gdGhlIHBhcnRpY2xlc1xuLy8gIHRoZSBsaWdodG5lc3MgaXMgdXNlIHRvIGRlc2NyaWJlIHRoZSBxdWFudGl0eSAobWF4IGxpZ2h0bmVzcyBsZWFkcyB0byB0b3RhbCBzYXR1cmF0aW9uKVxuLy9cbi8vIHRoZSBhZGRpdGlvbmFsIHBhcmFtZXRlciBpbnRlc2l0eSBpcyB1c2VkIHRvIHNjYWxlIHRoZSBlbW1pdGVyc1xuLy8gZ2VuZXJhbGx5IHRoZSBjb2xvcnMgeW91IHBsYWNlIG9uIHRoZSBtYXAgd2lsbCBiZSBleGNlZWRlZCBieSB0aGUgc2F0dXJhdGlvblxuLy9cbi8vIEhvdyBhcmUgdHdvIGRpZmZlcmVudCBodWVzIHNlbnNpYmx5IG1peGVkXG5cbi8vIGRlY2F5IG9mIDAuNVxuLy9cbi8vICAgICAgIEhcbi8vIDEgMiA0IDkgNCAyIDEgICAgICAgLy9zYXQsIGFsc28gYWxwaGFcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gICAgICAgICAxIDIgNCAyIDEgICAvL3NhdFxuLy8gICAgICAgICAgICAgSDJcbi8vXG4vLyB3ZSBhZGQgdGhlIGNvbnRyaWJ1dGlvbiB0byBhbiBpbWFnZSBzaXplZCBhY2N1bXVsYXRvclxuLy8gYXMgdGhlIGNvbnRyaWJ1dGlvbnMgbmVlZCB0byBzdW0gcGVybXV0YXRpb24gaW5kZXBlbmRlbnRseSAoYWxzbyBwcm9iYWJseSBhc3NvY2lhdGl2ZSlcbi8vIGJsZW5kKHJnYmExLCByZ2JhMikgPSBibGVuZChyZ2JhMixyZ2JhMSlcbi8vIGFscGhhID0gYTEgKyBhMiAtIGExYTJcbi8vIGlmIGExID0gMSAgIGFuZCBhMiA9IDEsICAgYWxwaGEgPSAxICAgICAgICAgPSAxXG4vLyBpZiBhMSA9IDAuNSBhbmQgYTIgPSAxLCAgIGFscGhhID0gMS41IC0gMC41ID0gMVxuLy8gaWYgYTEgPSAwLjUgYW5kIGEyID0gMC41LCBhbHBoYSA9IDEgLSAwLjI1ICA9IDAuNzVcblxuLy8gTm9ybWFsIGJsZW5kaW5nIGRvZXNuJ3QgY29tbXV0ZTpcbi8vIHJlZCA9IChyMSAqIGExICArIChyMiAqIGEyKSAqICgxIC0gYTEpKSAvIGFscGhhXG5cbi8vIGxpZ2h0ZW4gZG9lcywgd2hpY2ggaXMganVzdCB0aGUgbWF4XG4vLyByZWQgPSBtYXgocjEsIHIyKVxuLy8gb3IgYWRkaXRpb24gcmVkID0gcjEgKyByMlxuLy8gaHR0cDovL3d3dy5kZWVwc2t5Y29sb3JzLmNvbS9hcmNoaXZlLzIwMTAvMDQvMjEvZm9ybXVsYXMtZm9yLVBob3Rvc2hvcC1ibGVuZGluZy1tb2Rlcy5odG1sXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdsb3coXG4gICAgZGVjYXk6IG51bWJlciA9IDAuMSxcbiAgICBhZnRlciA/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN0eCA9IHRpY2suY3R4O1xuXG4gICAgICAgICAgICAgICAgLy8gb3VyIHNyYyBwaXhlbCBkYXRhXG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoID0gY3R4LmNhbnZhcy53aWR0aDtcbiAgICAgICAgICAgICAgICB2YXIgaGVpZ2h0ID0gY3R4LmNhbnZhcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgdmFyIHBpeGVscyA9IHdpZHRoICogaGVpZ2h0O1xuICAgICAgICAgICAgICAgIHZhciBpbWdEYXRhID0gY3R4LmdldEltYWdlRGF0YSgwLDAsd2lkdGgsaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGltZ0RhdGEuZGF0YTtcblxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwib3JpZ2luYWwgZGF0YVwiLCBpbWdEYXRhLmRhdGEpXG5cbiAgICAgICAgICAgICAgICAvLyBvdXIgdGFyZ2V0IGRhdGFcbiAgICAgICAgICAgICAgICAvLyB0b2RvIGlmIHdlIHVzZWQgYSBUeXBlZCBhcnJheSB0aHJvdWdob3V0IHdlIGNvdWxkIHNhdmUgc29tZSB6ZXJvaW5nIGFuZCBvdGhlciBjcmFwcHkgY29udmVyc2lvbnNcbiAgICAgICAgICAgICAgICAvLyBhbHRob3VnaCBhdCBsZWFzdCB3ZSBhcmUgY2FsY3VsYXRpbmcgYXQgYSBoaWdoIGFjY3VyYWN5LCBsZXRzIG5vdCBkbyBhIGJ5dGUgYXJyYXkgZnJvbSB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgICAgdmFyIGdsb3dEYXRhOiBudW1iZXJbXSA9IG5ldyBBcnJheTxudW1iZXI+KHBpeGVscyo0KTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGl4ZWxzICogNDsgaSsrKSBnbG93RGF0YVtpXSA9IDA7XG5cbiAgICAgICAgICAgICAgICAvLyBwYXNzYmFjayB0byBhdm9pZCBsb3RzIG9mIGFycmF5IGFsbG9jYXRpb25zIGluIHJnYlRvSHNsLCBhbmQgaHNsVG9SZ2IgY2FsbHNcbiAgICAgICAgICAgICAgICB2YXIgaHNsOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0gPSBbMCwwLDBdO1xuICAgICAgICAgICAgICAgIHZhciByZ2I6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSA9IFswLDAsMF07XG5cbiAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgdGhlIGNvbnRyaWJ1dGlvbiBvZiBlYWNoIGVtbWl0dGVyIG9uIHRoZWlyIHN1cnJvdW5kc1xuICAgICAgICAgICAgICAgIGZvcih2YXIgeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlZCAgID0gZGF0YVsoKHdpZHRoICogeSkgKyB4KSAqIDRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdyZWVuID0gZGF0YVsoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBibHVlICA9IGRhdGFbKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgMl07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYWxwaGEgPSBkYXRhWygod2lkdGggKiB5KSArIHgpICogNCArIDNdO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnZlcnQgdG8gaHNsXG4gICAgICAgICAgICAgICAgICAgICAgICByZ2JUb0hzbChyZWQsIGdyZWVuLCBibHVlLCBoc2wpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaHVlID0gaHNsWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHF0eSA9IGhzbFsxXTsgLy8gcXR5IGRlY2F5c1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2FsX2RlY2F5ID0gaHNsWzJdO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBvbmx5IG5lZWQgdG8gY2FsY3VsYXRlIGEgY29udHJpYnV0aW9uIG5lYXIgdGhlIHNvdXJjZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29udHJpYnV0aW9uID0gcXR5IGRlY2F5aW5nIGJ5IGludmVyc2Ugc3F1YXJlIGRpc3RhbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjID0gcSAvIChkXjIgKiBrKSwgd2Ugd2FudCB0byBmaW5kIHRoZSBjIDwgMC4wMSBwb2ludFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gMC4wMSA9IHEgLyAoZF4yICogaykgPT4gZF4yID0gcSAvICgwLjAxICogaylcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGQgPSBzcXJ0KDEwMCAqIHEgLyBrKSAobm90ZSAyIHNvbHV0aW9ucywgcmVwcmVzZW50aW5nIHRoZSB0d28gaGFsZndpZHRocylcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYWxmd2lkdGggPSBNYXRoLnNxcnQoMTAwMCAqIHF0eSAvIChkZWNheSAqIGxvY2FsX2RlY2F5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGkgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHggLSBoYWxmd2lkdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1aSA9IE1hdGgubWluKHdpZHRoLCBNYXRoLmNlaWwoeCArIGhhbGZ3aWR0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxqID0gTWF0aC5tYXgoMCwgTWF0aC5mbG9vcih5IC0gaGFsZndpZHRoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdWogPSBNYXRoLm1pbihoZWlnaHQsIE1hdGguY2VpbCh5ICsgaGFsZndpZHRoKSk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBqID0gbGo7IGogPCB1ajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gbGk7IGkgPCB1aTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkeCA9IGkgLSB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZHkgPSBqIC0geTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRfc3F1YXJlZCA9IGR4ICogZHggKyBkeSAqIGR5O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGMgaXMgaW4gdGhlIHNhbWUgc2NhbGUgYXQgcXR5IGkuZS4gKDAgLSAxMDAsIHNhdHVyYXRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjID0gKHF0eSkgLyAoMSArIGRfc3F1YXJlZCAqIGRlY2F5ICogbG9jYWxfZGVjYXkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChjIDw9IDEwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChjID4gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJnYiA9IGhzbFRvUmdiKGh1ZSwgMTAwLCBjLCByZ2IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY19hbHBoYSA9IGMgLyAxMDAuMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcl9pID0gKCh3aWR0aCAqIGopICsgaSkgKiA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ19pID0gKCh3aWR0aCAqIGopICsgaSkgKiA0ICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJfaSA9ICgod2lkdGggKiBqKSArIGkpICogNCArIDI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhX2kgPSAoKHdpZHRoICogaikgKyBpKSAqIDQgKyAzO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicHJlLWFscGhhXCIsIGdsb3dEYXRhW2FfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImR4XCIsIGR4LCBcImR5XCIsIGR5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJxdHlcIiwgcXR5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkX3NxdWFyZWRcIiwgZF9zcXVhcmVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZWNheVwiLCBkZWNheSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibG9jYWxfZGVjYXlcIiwgbG9jYWxfZGVjYXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNcIiwgYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY19hbHBoYVwiLCBjX2FscGhhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhX2lcIiwgYV9pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByZV9hbHBoYSA9IGdsb3dEYXRhW2FfaV07XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoY19hbHBoYSA8PSAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGNfYWxwaGEgPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChwcmVfYWxwaGEgPD0gMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChwcmVfYWxwaGEgPj0gMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYmxlbmQgYWxwaGEgZmlyc3QgaW50byBhY2N1bXVsYXRvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVthX2ldID0gZ2xvd0RhdGFbYV9pXSArIGNfYWxwaGEgLSBjX2FscGhhICogZ2xvd0RhdGFbYV9pXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9nbG93RGF0YVthX2ldID0gTWF0aC5tYXgoZ2xvd0RhdGFbYV9pXSwgY19hbHBoYSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW2FfaV0gPD0gMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVthX2ldID49IDApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW3JfaV0gPSAocHJlX2FscGhhICsgcmdiWzBdLyAyNTUuMCAtIGNfYWxwaGEgKiByZ2JbMF0vIDI1NS4wKSAqIDI1NTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IChwcmVfYWxwaGEgKyByZ2JbMV0vIDI1NS4wIC0gY19hbHBoYSAqIHJnYlsxXS8gMjU1LjApICogMjU1O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtiX2ldID0gKHByZV9hbHBoYSArIHJnYlsyXS8gMjU1LjAgLSBjX2FscGhhICogcmdiWzJdLyAyNTUuMCkgKiAyNTU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJwb3N0LWFscGhhXCIsIGdsb3dEYXRhW2FfaV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vdyBzaW1wbGUgbGlnaHRlblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gTWF0aC5tYXgocmdiWzBdLCBnbG93RGF0YVtyX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IE1hdGgubWF4KHJnYlsxXSwgZ2xvd0RhdGFbZ19pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2JfaV0gPSBNYXRoLm1heChyZ2JbMl0sIGdsb3dEYXRhW2JfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1peCB0aGUgY29sb3JzIGxpa2UgcGlnbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdG90YWxfYWxwaGEgPSBjX2FscGhhICsgcHJlX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gKGNfYWxwaGEgKiByZ2JbMF0gKyBwcmVfYWxwaGEgKiBnbG93RGF0YVtyX2ldKSAvIHRvdGFsX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtnX2ldID0gKGNfYWxwaGEgKiByZ2JbMV0gKyBwcmVfYWxwaGEgKiBnbG93RGF0YVtnX2ldKSAvIHRvdGFsX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtiX2ldID0gKGNfYWxwaGEgKiByZ2JbMl0gKyBwcmVfYWxwaGEgKiBnbG93RGF0YVtiX2ldKSAvIHRvdGFsX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBSRUFMTFkgQ09PTCBFRkZFQ1RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbcl9pXSA9IHJnYlswXSArIGdsb3dEYXRhW3JfaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2dfaV0gPSByZ2JbMV0gKyBnbG93RGF0YVtnX2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtiX2ldID0gcmdiWzJdICsgZ2xvd0RhdGFbYl9pXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gTWF0aC5taW4ocmdiWzBdICsgZ2xvd0RhdGFbcl9pXSwgMjU1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IE1hdGgubWluKHJnYlsxXSArIGdsb3dEYXRhW2dfaV0sIDI1NSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2JfaV0gPSBNYXRoLm1pbihyZ2JbMl0gKyBnbG93RGF0YVtiX2ldLCAyNTUpO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImdsb3dcIiwgZ2xvd0RhdGEpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcihkYXRhLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgZm9yKHZhciB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcl9pID0gKCh3aWR0aCAqIHkpICsgeCkgKiA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdfaSA9ICgod2lkdGggKiB5KSArIHgpICogNCArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYl9pID0gKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgMjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhX2kgPSAoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAzO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbcl9pXSA9IE1hdGgucm91bmQoZ2xvd0RhdGFbcl9pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbZ19pXSA9IE1hdGgucm91bmQoZ2xvd0RhdGFbZ19pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbYl9pXSA9IE1hdGgucm91bmQoZ2xvd0RhdGFbYl9pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbYV9pXSA9IE1hdGgucm91bmQoZ2xvd0RhdGFbYV9pXSAqIDI1NSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vICh0b2RvKSBtYXliZSB3ZSBjYW4gc3BlZWQgYm9vc3Qgc29tZSBvZiB0aGlzXG4gICAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9oYWNrcy5tb3ppbGxhLm9yZy8yMDExLzEyL2Zhc3Rlci1jYW52YXMtcGl4ZWwtbWFuaXB1bGF0aW9uLXdpdGgtdHlwZWQtYXJyYXlzL1xuXG4gICAgICAgICAgICAgICAgLy9maW5hbGx5IG92ZXJ3cml0ZSB0aGUgcGl4ZWwgZGF0YSB3aXRoIHRoZSBhY2N1bXVsYXRvclxuICAgICAgICAgICAgICAgIGltZ0RhdGEuZGF0YS5zZXQobmV3IFVpbnQ4Q2xhbXBlZEFycmF5KGJ1ZikpO1xuXG4gICAgICAgICAgICAgICAgY3R4LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYWZ0ZXIpO1xufVxuXG5mdW5jdGlvbiBtYXAoXG4gICAgbWFwX2ZuOiAocHJldjogRHJhd1RpY2spID0+IERyYXdUaWNrLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldmlvdXM6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzLm1hcChtYXBfZm4pXG4gICAgfSwgYW5pbWF0aW9uKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdGFrZShcbiAgICBpdGVyYXRpb25zOiBudW1iZXIsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbihwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwcmV2LnRha2UoaXRlcmF0aW9ucyk7XG4gICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZSh3aWR0aDpudW1iZXIsIGhlaWdodDpudW1iZXIsIHBhdGg6IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgdmFyIEdJRkVuY29kZXIgPSByZXF1aXJlKCdnaWZlbmNvZGVyJyk7XG4gICAgdmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcblxuXG4gICAgdmFyIGVuY29kZXIgPSBuZXcgR0lGRW5jb2Rlcih3aWR0aCwgaGVpZ2h0KTtcbiAgICBlbmNvZGVyLmNyZWF0ZVJlYWRTdHJlYW0oKVxuICAgICAgLnBpcGUoZW5jb2Rlci5jcmVhdGVXcml0ZVN0cmVhbSh7IHJlcGVhdDogMTAwMDAsIGRlbGF5OiAxMDAsIHF1YWxpdHk6IDEgfSkpXG4gICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShwYXRoKSk7XG4gICAgZW5jb2Rlci5zdGFydCgpO1xuXG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHBhcmVudDogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICB2YXIgdCA9IDA7XG4gICAgICAgIHZhciBlbmROZXh0ID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBwYXJlbnQudGFwKFxuICAgICAgICAgICAgZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInNhdmU6IHdyb3RlIGZyYW1lXCIpO1xuICAgICAgICAgICAgICAgIC8vdCArPSB0aWNrLmR0O1xuICAgICAgICAgICAgICAgIC8vdmFyIG91dCA9IGZzLndyaXRlRmlsZVN5bmMocGF0aCArIFwiX1wiKyB0ICsgXCIucG5nXCIsIGNhbnZhcy50b0J1ZmZlcigpKTtcbiAgICAgICAgICAgICAgICAvL3ZhciBwYXJzZWQgPSBwbmdwYXJzZShjYW52YXMudG9CdWZmZXIoKSlcbiAgICAgICAgICAgICAgICBlbmNvZGVyLmFkZEZyYW1lKHRpY2suY3R4KTtcbiAgICAgICAgICAgICAgICAvL2VuY29kZXIuYWRkRnJhbWUodGljay5jdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHdpZHRoLCBoZWlnaHQpLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge2NvbnNvbGUuZXJyb3IoXCJzYXZlOiBub3Qgc2F2ZWRcIiwgcGF0aCk7fSxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge2NvbnNvbGUubG9nKFwic2F2ZTogc2F2ZWRcIiwgcGF0aCk7IGVuY29kZXIuZmluaXNoKCk7LyogZW5kTmV4dCA9IHRydWU7Ki99XG4gICAgICAgIClcbiAgICB9KTtcbn1cblxuLy8gdG9kbyBCVUcgVE9ETyBMSVNUXG5cbi8vIEZlYXR1cmVzXG4vLyBHbG93XG4gICAgLy8gbGlnaHRlbiA9IDHiiJIoMeKIkkEpw5coMeKIkkIpXG4gICAgLy8gbnVtYmVyIHBhcnRpY2xlcyBrLyhkXjIpXG4gICAgLy8gdHJhbnNwYXJlbmN5IGluY3JlYXNlcyBpbnZlcnNlIHNxdWFyZSB0b29cbiAgICAvLyBvbmx5IGZvcmVncm91bmQgYWxwaGEgbWFrZXMgYW4gZWZmZWN0IChiYWNrZ3JvdW5kIGlzIGNvbnNpZGVyZWQgc29saWQpXG5cbi8vIFJlZmxlY3Rpb25cbi8vIEwgc3lzdGVtcyAoZm9sZD8pXG5cbi8vIEVuZ2luZWVyaW5nXG4vLyBmaWd1cmUgb3V0IHdoeSBleGFtcGxlMyBjYW5ub3QgaGF2ZSBtb3ZlIHRoYW4gMTAwMCBwYXJ0aWNsZXMgd2l0aG91dCBhIHN0YWNrIG92ZXJmbG93XG4vLyBmaXggdGVzdCByYW5kb21uZXNzXG4vLyByZXBsYWNlIHBhcmFsZWwgd2l0aCBpdHMgb3duIGludGVybmFsIGFuaW1hdG9yXG5cbi8vIG1hcmtldGluZ1xuLy8gd2Vic2l0ZVxuLy8ganNGaWRkbGVcblxuXG5cbi8vIElERUFTXG5cbi8vIFBhY01hblxuLy8gd2hhdCBhYm91dCBhIGRpZmZlcmVudCB3YXkgb2YgbWFraW5nIGdsb3c/XG4vLyByZW5kZXIgbHVtaW5lY2VuY2UgaW50byBhIHRleHR1cmUgYW5kIHRoZW4gY29sb3IgYmFzZWQgb24gZGlzdGFuY2UgZnJvbSBsaWdodHNvdXJjZVxuLy8gbW91c2UgaW5wdXQsIHRhaWxpbmcgZ2xvdyAocmVtYmVyIHRvIHR3ZWVuIGJldHdlZW4gcmFwaWQgbW92ZW1lbnRzKVxuLy8gb2Zmc2NyZWVuIHJlbmRlcmluZyBhbiBwbGF5YmFja1xuLy8gc2luIHdhdmUsIHJhbmRvbWl6ZWRcbi8vIEdVSSBjb21wb25lbnRzLCByZXNwb25zaXZlLCBib290c3RyYXBcbi8vIGdldCBkYXRhIG91dCBieSB0YXBwaW5nIGludG8gZmxvdyAoaW50ZXJjZXB0KFN1YmplY3QgcGFzc2JhY2spKVxuLy8gU1ZHIGltcG9ydFxuLy8gbGF5ZXJpbmcgd2l0aCBwYXJyYWxsZWwgKGJhY2sgZmlyc3QpXG5cblxuLyoqXG4gKiBDb252ZXJ0cyBhbiBSR0IgY29sb3IgdmFsdWUgdG8gSFNMLiBDb252ZXJzaW9uIGZvcm11bGFcbiAqIGFkYXB0ZWQgZnJvbSBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0hTTF9jb2xvcl9zcGFjZS5cbiAqIEFzc3VtZXMgciwgZywgYW5kIGIgYXJlIGNvbnRhaW5lZCBpbiB0aGUgc2V0IFswLCAyNTVdIGFuZFxuICogcmV0dXJucyBoLCBzLCBhbmQgbCBpbiB0aGUgc2V0IFswLCAxXS5cbiAqXG4gKiBAcGFyYW0gICBOdW1iZXIgIHIgICAgICAgVGhlIHJlZCBjb2xvciB2YWx1ZVxuICogQHBhcmFtICAgTnVtYmVyICBnICAgICAgIFRoZSBncmVlbiBjb2xvciB2YWx1ZVxuICogQHBhcmFtICAgTnVtYmVyICBiICAgICAgIFRoZSBibHVlIGNvbG9yIHZhbHVlXG4gKiBAcmV0dXJuICBBcnJheSAgICAgICAgICAgVGhlIEhTTCByZXByZXNlbnRhdGlvblxuICovXG5mdW5jdGlvbiByZ2JUb0hzbChyLCBnLCBiLCBwYXNzYmFjazogW251bWJlciwgbnVtYmVyLCBudW1iZXJdKTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcInJnYlRvSHNsOiBpbnB1dFwiLCByLCBnLCBiKTtcblxuICAgIHIgLz0gMjU1LCBnIC89IDI1NSwgYiAvPSAyNTU7XG4gICAgdmFyIG1heCA9IE1hdGgubWF4KHIsIGcsIGIpLCBtaW4gPSBNYXRoLm1pbihyLCBnLCBiKTtcbiAgICB2YXIgaCwgcywgbCA9IChtYXggKyBtaW4pIC8gMjtcblxuICAgIGlmKG1heCA9PSBtaW4pe1xuICAgICAgICBoID0gcyA9IDA7IC8vIGFjaHJvbWF0aWNcbiAgICB9ZWxzZXtcbiAgICAgICAgdmFyIGQgPSBtYXggLSBtaW47XG4gICAgICAgIHMgPSBsID4gMC41ID8gZCAvICgyIC0gbWF4IC0gbWluKSA6IGQgLyAobWF4ICsgbWluKTtcbiAgICAgICAgc3dpdGNoKG1heCl7XG4gICAgICAgICAgICBjYXNlIHI6IGggPSAoZyAtIGIpIC8gZCArIChnIDwgYiA/IDYgOiAwKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGc6IGggPSAoYiAtIHIpIC8gZCArIDI7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBiOiBoID0gKHIgLSBnKSAvIGQgKyA0OyBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBoIC89IDY7XG4gICAgfVxuICAgIHBhc3NiYWNrWzBdID0gTWF0aC5yb3VuZChoICogMzYwKTsgICAgICAgLy8gMCAtIDM2MCBkZWdyZWVzXG4gICAgcGFzc2JhY2tbMV0gPSBNYXRoLnJvdW5kKHMgKiAxMDApOyAvLyAwIC0gMTAwJVxuICAgIHBhc3NiYWNrWzJdID0gTWF0aC5yb3VuZChsICogMTAwKTsgLy8gMCAtIDEwMCVcblxuICAgIC8vIGNvbnNvbGUubG9nKFwicmdiVG9Ic2w6IG91dHB1dFwiLCBwYXNzYmFjayk7XG5cbiAgICByZXR1cm4gcGFzc2JhY2s7XG59XG5cbi8qKlxuICogQ29udmVydHMgYW4gSFNMIGNvbG9yIHZhbHVlIHRvIFJHQi4gQ29udmVyc2lvbiBmb3JtdWxhXG4gKiBhZGFwdGVkIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IU0xfY29sb3Jfc3BhY2UuXG4gKiBBc3N1bWVzIGgsIHMsIGFuZCBsIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMV0gYW5kXG4gKiByZXR1cm5zIHIsIGcsIGFuZCBiIGluIHRoZSBzZXQgWzAsIDI1NV0uXG4gKlxuICogQHBhcmFtICAgTnVtYmVyICBoICAgICAgIFRoZSBodWVcbiAqIEBwYXJhbSAgIE51bWJlciAgcyAgICAgICBUaGUgc2F0dXJhdGlvblxuICogQHBhcmFtICAgTnVtYmVyICBsICAgICAgIFRoZSBsaWdodG5lc3NcbiAqIEByZXR1cm4gIEFycmF5ICAgICAgICAgICBUaGUgUkdCIHJlcHJlc2VudGF0aW9uXG4gKi9cbmZ1bmN0aW9uIGhzbFRvUmdiKGgsIHMsIGwsIHBhc3NiYWNrOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0pOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl17XG4gICAgdmFyIHIsIGcsIGI7XG4gICAgLy8gY29uc29sZS5sb2coXCJoc2xUb1JnYiBpbnB1dDpcIiwgaCwgcywgbCk7XG5cbiAgICBoIC89IDM2MDtcbiAgICBsIC89IDEwMDtcbiAgICBzIC89IDEwMDtcblxuICAgIGlmKHMgPT0gMCl7XG4gICAgICAgIHIgPSBnID0gYiA9IGw7IC8vIGFjaHJvbWF0aWNcbiAgICB9ZWxzZXtcbiAgICAgICAgdmFyIGh1ZTJyZ2IgPSBmdW5jdGlvbiBodWUycmdiKHAsIHEsIHQpe1xuICAgICAgICAgICAgaWYodCA8IDApIHQgKz0gMTtcbiAgICAgICAgICAgIGlmKHQgPiAxKSB0IC09IDE7XG4gICAgICAgICAgICBpZih0IDwgMS82KSByZXR1cm4gcCArIChxIC0gcCkgKiA2ICogdDtcbiAgICAgICAgICAgIGlmKHQgPCAxLzIpIHJldHVybiBxO1xuICAgICAgICAgICAgaWYodCA8IDIvMykgcmV0dXJuIHAgKyAocSAtIHApICogKDIvMyAtIHQpICogNjtcbiAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBxID0gbCA8IDAuNSA/IGwgKiAoMSArIHMpIDogbCArIHMgLSBsICogcztcbiAgICAgICAgdmFyIHAgPSAyICogbCAtIHE7XG4gICAgICAgIHIgPSBodWUycmdiKHAsIHEsIGggKyAxLzMpO1xuICAgICAgICBnID0gaHVlMnJnYihwLCBxLCBoKTtcbiAgICAgICAgYiA9IGh1ZTJyZ2IocCwgcSwgaCAtIDEvMyk7XG4gICAgfVxuXG4gICAgcGFzc2JhY2tbMF0gPSBNYXRoLnJvdW5kKHIgKiAyNTUpO1xuICAgIHBhc3NiYWNrWzFdID0gTWF0aC5yb3VuZChnICogMjU1KTtcbiAgICBwYXNzYmFja1syXSA9IE1hdGgucm91bmQoYiAqIDI1NSk7XG5cbiAgICAvLyBjb25zb2xlLmxvZyhcImhzbFRvUmdiXCIsIHBhc3NiYWNrKTtcblxuICAgIHJldHVybiBwYXNzYmFjaztcbn0iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=