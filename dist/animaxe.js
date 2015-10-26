/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
var Rx = require('rx');
var Parameter = require('./parameter');
exports.DEBUG_LOOP = false;
exports.DEBUG_THEN = false;
exports.DEBUG_EMIT = false;
exports.DEBUG = false;
console.log("Animaxe, https://github.com/tomlarkworthy/animaxe");
/**
 * Animators are updated with a DrawTick, which provides the local animation time, the
 */
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
var Animation = (function () {
    function Animation(_attach, after) {
        this._attach = _attach;
        this.after = after;
    }
    Animation.prototype.attach = function (upstream) {
        var processed = this._attach(upstream);
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
    Animation.prototype.pipe = function (after) {
        return combine2(this, after);
    };
    Animation.prototype.translate = function (position) {
        return this.pipe(translate(position));
    };
    Animation.prototype.velocity = function (vector) {
        return this.pipe(velocity(vector));
    };
    Animation.prototype.loop = function (inner) {
        return this.pipe(loop(inner));
    };
    Animation.prototype.emit = function (inner) {
        return this.pipe(emit(inner));
    };
    Animation.prototype.clone = function (n, inner) {
        return this.pipe(clone(n, inner));
    };
    Animation.prototype.parallel = function (inner) {
        return this.pipe(parallel(inner));
    };
    Animation.prototype.tween_linear = function (from, to, time) {
        return this.pipe(tween_linear(from, to, time));
    };
    Animation.prototype.take = function (frames) {
        return this.pipe(take(frames));
    };
    Animation.prototype.draw = function (drawFactory) {
        return this.pipe(draw(drawFactory));
    };
    // Canvas API
    Animation.prototype.strokeStyle = function (color) {
        return this.pipe(strokeStyle(color));
    };
    Animation.prototype.fillStyle = function (color) {
        return this.pipe(fillStyle(color));
    };
    Animation.prototype.fillRect = function (xy, width_height) {
        return this.pipe(fillRect(xy, width_height));
    };
    Animation.prototype.withinPath = function (inner) {
        return this.pipe(withinPath(inner));
    };
    Animation.prototype.moveTo = function (xy) {
        return this.pipe(moveTo(xy));
    };
    Animation.prototype.lineTo = function (xy) {
        return this.pipe(lineTo(xy));
    };
    Animation.prototype.stroke = function () {
        return this.pipe(stroke());
    };
    Animation.prototype.globalCompositeOperation = function (operation) {
        return this.pipe(globalCompositeOperation(operation));
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
        if (exports.DEBUG)
            console.log("animator: play");
        var saveBeforeFrame = this.root.tapOnNext(function (tick) {
            if (exports.DEBUG)
                console.log("animator: ctx save");
            tick.ctx.save();
        });
        var doAnimation = animation.attach(saveBeforeFrame);
        var restoreAfterFrame = doAnimation.tap(function (tick) {
            if (exports.DEBUG)
                console.log("animator: ctx next restore");
            tick.ctx.restore();
        }, function (err) {
            if (exports.DEBUG)
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
/**
 * NOTE: currently fails if the streams are different lengths
 * @param expectedDt the expected clock tick values
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
            if (exports.DEBUG)
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
/**
 * Creates a new Animation by piping the animation flow of A into B
 */
function combine2(a, b) {
    return new Animation(function (upstream) {
        return b.attach(a.attach(upstream));
    });
}
exports.combine2 = combine2;
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
function clone(n, // todo make dynamic
    animation) {
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
function draw(drawFactory, after) {
    return new Animation(function (previous) {
        var draw = drawFactory();
        return previous.tapOnNext(draw);
    }, after);
}
exports.draw = draw;
function translate(delta, animation) {
    if (exports.DEBUG)
        console.log("translate: attached");
    return draw(function () {
        var point_next = Parameter.from(delta).init();
        return function (tick) {
            var point = point_next(tick.clock);
            if (exports.DEBUG)
                console.log("translate:", point);
            tick.ctx.translate(point[0], point[1]);
            return tick;
        };
    }, animation);
}
exports.translate = translate;
function globalCompositeOperation(composite_mode, animation) {
    return draw(function () {
        return function (tick) {
            tick.ctx.globalCompositeOperation = composite_mode;
        };
    }, animation);
}
exports.globalCompositeOperation = globalCompositeOperation;
function velocity(velocity, animation) {
    if (exports.DEBUG)
        console.log("velocity: attached");
    return draw(function () {
        var pos = [0.0, 0.0];
        var velocity_next = Parameter.from(velocity).init();
        return function (tick) {
            tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
            var velocity = velocity_next(tick.clock);
            pos[0] += velocity[0] * tick.dt;
            pos[1] += velocity[1] * tick.dt;
        };
    }, animation);
}
exports.velocity = velocity;
function tween_linear(from, to, time, animation /* copies */) {
    return new Animation(function (prev) {
        var t = 0;
        var from_next = Parameter.from(from).init();
        var to_next = Parameter.from(to).init();
        var time_next = Parameter.from(time).init();
        return prev.map(function (tick) {
            if (exports.DEBUG)
                console.log("tween: inner");
            var from = from_next(tick.clock);
            var to = to_next(tick.clock);
            var time = time_next(tick.clock);
            t = t + tick.dt;
            if (t > time)
                t = time;
            var x = from[0] + (to[0] - from[0]) * t / time;
            var y = from[1] + (to[1] - from[1]) * t / time;
            tick.ctx.transform(1, 0, 0, 1, x, y);
            return tick;
        }).takeWhile(function (tick) { return t < time; });
    }, animation);
}
exports.tween_linear = tween_linear;
function fillRect(xy, width_height, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("fillRect: attach");
        var xy_next = Parameter.from(xy).init();
        var width_height_next = Parameter.from(width_height).init();
        return function (tick) {
            var xy = xy_next(tick.clock);
            var width_height = width_height_next(tick.clock);
            if (exports.DEBUG)
                console.log("fillRect: fillRect", xy, width_height);
            tick.ctx.fillRect(xy[0], xy[1], width_height[0], width_height[1]);
        };
    }, animation);
}
exports.fillRect = fillRect;
function fillStyle(color, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("fillStyle: attach");
        var color_next = Parameter.from(color).init();
        return function (tick) {
            var color = color_next(tick.clock);
            if (exports.DEBUG)
                console.log("fillStyle: fillStyle", color);
            tick.ctx.fillStyle = color;
        };
    }, animation);
}
exports.fillStyle = fillStyle;
function strokeStyle(color, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("strokeStyle: attach");
        var color_next = Parameter.from(color).init();
        return function (tick) {
            var color = color_next(tick.clock);
            if (exports.DEBUG)
                console.log("strokeStyle: strokeStyle", color);
            tick.ctx.strokeStyle = color;
        };
    }, animation);
}
exports.strokeStyle = strokeStyle;
function withinPath(inner) {
    return new Animation(function (upstream) {
        if (exports.DEBUG)
            console.log("withinPath: attach");
        var beginPathBeforeInner = upstream.tapOnNext(function (tick) { return tick.ctx.beginPath(); });
        return inner.attach(beginPathBeforeInner).tapOnNext(function (tick) { return tick.ctx.closePath(); });
    });
}
exports.withinPath = withinPath;
function moveTo(xy, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("moveTo: attach");
        var xy_next = Parameter.from(xy).init();
        return function (tick) {
            var xy = xy_next(tick.clock);
            if (exports.DEBUG)
                console.log("moveTo: moveTo", xy);
            tick.ctx.moveTo(xy[0], xy[1]);
        };
    }, animation);
}
exports.moveTo = moveTo;
function lineTo(xy, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("lineTo: attach");
        var xy_next = Parameter.from(xy).init();
        return function (tick) {
            var xy = xy_next(tick.clock);
            if (exports.DEBUG)
                console.log("lineTo: lineTo", xy);
            tick.ctx.lineTo(xy[0], xy[1]);
        };
    }, animation);
}
exports.lineTo = lineTo;
function stroke(animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("stroke: attach");
        return function (tick) {
            if (exports.DEBUG)
                console.log("stroke: stroke");
            tick.ctx.stroke();
        };
    }, animation);
}
exports.stroke = stroke;
function lineWidth(width, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("lineWidth: attach");
        var width_next = Parameter.from(width).init();
        return function (tick) {
            var width = width_next(tick.clock);
            if (exports.DEBUG)
                console.log("lineWidth: lineWidth", width);
            tick.ctx.lineWidth = width;
        };
    }, animation);
}
exports.lineWidth = lineWidth;
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
                    var local_decay = hsl[2] + 1;
                    // we only need to calculate a contribution near the source
                    // contribution = qty decaying by inverse square distance
                    // c = q / (d^2 * k), we want to find the c < 0.01 point
                    // 0.01 = q / (d^2 * k) => d^2 = q / (0.01 * k)
                    // d = sqrt(100 * q / k) (note 2 solutions, representing the two halfwidths)
                    var halfwidth = Math.sqrt(1000 * qty / (decay * local_decay));
                    halfwidth *= 100;
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
                            var c = (qty) / (1.0001 + Math.sqrt(d_squared) * decay * local_decay);
                            assert(c <= 100);
                            assert(c >= 0);
                            rgb = hslToRgb(hue, 50, c, rgb);
                            // rgb = husl.toRGB(hue, 50, c);
                            //for (var husli = 0; husli< 3; husli++) rgb [husli] *= 255;
                            var c_alpha = c / 100.0;
                            var r_i = ((width * j) + i) * 4;
                            var g_i = ((width * j) + i) * 4 + 1;
                            var b_i = ((width * j) + i) * 4 + 2;
                            var a_i = ((width * j) + i) * 4 + 3;
                            // console.log("rgb", rgb);
                            // console.log("c", c);
                            var pre_alpha = glowData[a_i];
                            assert(c_alpha <= 1);
                            assert(c_alpha >= 0);
                            assert(pre_alpha <= 1);
                            assert(pre_alpha >= 0);
                            // blend alpha first into accumulator
                            // glowData[a_i] = glowData[a_i] + c_alpha - c_alpha * glowData[a_i];
                            // glowData[a_i] = Math.max(glowData[a_i], c_alpha);
                            glowData[a_i] = 1;
                            assert(glowData[a_i] <= 1);
                            assert(glowData[a_i] >= 0);
                            assert(glowData[r_i] <= 255);
                            assert(glowData[r_i] >= 0);
                            assert(glowData[g_i] <= 255);
                            assert(glowData[g_i] >= 0);
                            assert(glowData[b_i] <= 255);
                            assert(glowData[b_i] >= 0);
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
                            if (x < 2 && j == 20 && i == 20) {
                            }
                            if (glowData[r_i] == -1) {
                                console.log("pre-alpha", glowData[a_i]);
                                console.log("dx", dx, "dy", dy);
                                console.log("d_squared", d_squared);
                                console.log("decay", decay);
                                console.log("local_decay", local_decay);
                                console.log("c", c);
                                console.log("c_alpha", c_alpha);
                                console.log("a_i", a_i);
                                console.log("hue", hue);
                                console.log("qty", qty);
                                console.log("red", red);
                                console.log("green", green);
                                console.log("blue", blue);
                                console.log("rgb", rgb);
                                console.log("glowData[r_i]", glowData[r_i]);
                                throw new Error();
                            }
                        }
                    }
                }
            }
            // console.log("glow", glowData);
            var buf = new ArrayBuffer(data.length);
            for (var y = 0; y < height; y++) {
                for (var x = 0; x < width; x++) {
                    var r_i = ((width * y) + x) * 4;
                    var g_i = ((width * y) + x) * 4 + 1;
                    var b_i = ((width * y) + x) * 4 + 2;
                    var a_i = ((width * y) + x) * 4 + 3;
                    buf[r_i] = Math.floor(glowData[r_i]);
                    buf[g_i] = Math.floor(glowData[g_i]);
                    buf[b_i] = Math.floor(glowData[b_i]);
                    buf[a_i] = 255; //Math.floor(glowData[a_i] * 255);
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
function take(frames, animation) {
    return new Animation(function (prev) {
        if (exports.DEBUG)
            console.log("take: attach");
        return prev.take(frames);
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
        return parent.tap(function (tick) {
            if (exports.DEBUG)
                console.log("save: wrote frame");
            encoder.addFrame(tick.ctx);
        }, function () { console.error("save: not saved", path); }, function () { console.log("save: saved", path); encoder.finish(); });
    });
}
exports.save = save;
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
    passback[0] = (h * 360); // 0 - 360 degrees
    passback[1] = (s * 100); // 0 - 100%
    passback[2] = (l * 100); // 0 - 100%
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
    h = h / 360.0;
    s = s / 100.0;
    l = l / 100.0;
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
    passback[0] = r * 255;
    passback[1] = g * 255;
    passback[2] = b * 255;
    // console.log("hslToRgb", passback);
    return passback;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiRHJhd1RpY2siLCJEcmF3VGljay5jb25zdHJ1Y3RvciIsImFzc2VydCIsInN0YWNrVHJhY2UiLCJBbmltYXRpb24iLCJBbmltYXRpb24uY29uc3RydWN0b3IiLCJBbmltYXRpb24uYXR0YWNoIiwiQW5pbWF0aW9uLnRoZW4iLCJBbmltYXRpb24ucGlwZSIsIkFuaW1hdGlvbi50cmFuc2xhdGUiLCJBbmltYXRpb24udmVsb2NpdHkiLCJBbmltYXRpb24ubG9vcCIsIkFuaW1hdGlvbi5lbWl0IiwiQW5pbWF0aW9uLmNsb25lIiwiQW5pbWF0aW9uLnBhcmFsbGVsIiwiQW5pbWF0aW9uLnR3ZWVuX2xpbmVhciIsIkFuaW1hdGlvbi50YWtlIiwiQW5pbWF0aW9uLmRyYXciLCJBbmltYXRpb24uc3Ryb2tlU3R5bGUiLCJBbmltYXRpb24uZmlsbFN0eWxlIiwiQW5pbWF0aW9uLmZpbGxSZWN0IiwiQW5pbWF0aW9uLndpdGhpblBhdGgiLCJBbmltYXRpb24ubW92ZVRvIiwiQW5pbWF0aW9uLmxpbmVUbyIsIkFuaW1hdGlvbi5zdHJva2UiLCJBbmltYXRpb24uZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uIiwiQW5pbWF0b3IiLCJBbmltYXRvci5jb25zdHJ1Y3RvciIsIkFuaW1hdG9yLnRpY2tlciIsIkFuaW1hdG9yLnBsYXkiLCJhc3NlcnREdCIsImFzc2VydENsb2NrIiwiY29tYmluZTIiLCJwYXJhbGxlbCIsImRlY3JlbWVudEFjdGl2ZSIsImNsb25lIiwic2VxdWVuY2UiLCJlbWl0IiwibG9vcCIsImF0dGFjaExvb3AiLCJkcmF3IiwidHJhbnNsYXRlIiwiZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uIiwidmVsb2NpdHkiLCJ0d2Vlbl9saW5lYXIiLCJmaWxsUmVjdCIsImZpbGxTdHlsZSIsInN0cm9rZVN0eWxlIiwid2l0aGluUGF0aCIsIm1vdmVUbyIsImxpbmVUbyIsInN0cm9rZSIsImxpbmVXaWR0aCIsImdsb3ciLCJt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QyxDQUFDOzRCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDOzRCQUM3QixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDOzRCQUM3QixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDOzRCQUM3QixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUUzQjs7Ozs4QkFJRTs0QkFFRiw0Q0FBNEM7NEJBRTVDLHFCQUFxQjs0QkFFckI7Ozs7OEJBSUU7NEJBRUYsOEJBQThCOzRCQUM5Qjs7Ozs7OEJBS0U7NEJBQ0Y7Ozs7OzhCQUtFOzRCQUVGLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7NEJBQ3RELFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7NEJBQ3RELFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7NEJBSXRELEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRyxDQUFDLENBQUMsQ0FBQzs0QkFD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Ozs7Ozs7O0dBVUc7QUFDSCxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBa0M7SUFDekRDLDJDQUEyQ0E7SUFFM0NBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLElBQUlBLEdBQUdBLENBQUNBO0lBQzdCQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNyREEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7SUFFOUJBLEVBQUVBLENBQUFBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLENBQUNBLENBQUFBLENBQUNBO1FBQ1hBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLGFBQWFBO0lBQzVCQSxDQUFDQTtJQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtRQUNKQSxJQUFJQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQTtRQUNsQkEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDcERBLE1BQU1BLENBQUFBLENBQUNBLEdBQUdBLENBQUNBLENBQUFBLENBQUNBO1lBQ1JBLEtBQUtBLENBQUNBO2dCQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFBQ0EsS0FBS0EsQ0FBQ0E7WUFDakRBLEtBQUtBLENBQUNBO2dCQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFBQ0EsS0FBS0EsQ0FBQ0E7WUFDbkNBLEtBQUtBLENBQUNBO2dCQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFBQ0EsS0FBS0EsQ0FBQ0E7UUFDdkNBLENBQUNBO1FBQ0RBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO0lBQ1hBLENBQUNBO0lBQ0RBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQU9BLGtCQUFrQkE7SUFDakRBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLFdBQVdBO0lBQ3BDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxXQUFXQTtJQUVwQ0EsNkNBQTZDQTtJQUU3Q0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7QUFDcEJBLENBQUNBO0FBRUQ7Ozs7Ozs7Ozs7R0FVRztBQUNILGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFrQztJQUN6REMsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7SUFDWkEsMkNBQTJDQTtJQUUzQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFDZEEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFDZEEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFFZEEsRUFBRUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQUEsQ0FBQ0E7UUFDUEEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsYUFBYUE7SUFDaENBLENBQUNBO0lBQUFBLElBQUlBLENBQUFBLENBQUNBO1FBQ0ZBLElBQUlBLE9BQU9BLEdBQUdBLGlCQUFpQkEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7WUFDbENDLEVBQUVBLENBQUFBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNqQkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFBQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQTtnQkFBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDdkNBLEVBQUVBLENBQUFBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBO2dCQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNyQkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLE1BQU1BLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQy9DQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNiQSxDQUFDQSxDQUFDRDtRQUVGQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUM5Q0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDbEJBLENBQUNBLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBLENBQUNBO1FBQzNCQSxDQUFDQSxHQUFHQSxPQUFPQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNyQkEsQ0FBQ0EsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDL0JBLENBQUNBO0lBRURBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBO0lBQ3RCQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQTtJQUN0QkEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0E7SUFFdEJBLHFDQUFxQ0E7SUFFckNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBO0FBQ3BCQSxDQUFDQSIsImZpbGUiOiJhbmltYXhlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL25vZGVfbW9kdWxlcy9yeC90cy9yeC5hbGwuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbmltcG9ydCBSeCA9IHJlcXVpcmUoJ3J4Jyk7XG5pbXBvcnQgUGFyYW1ldGVyID0gcmVxdWlyZSgnLi9wYXJhbWV0ZXInKTtcblxuZXhwb3J0IHZhciBERUJVR19MT09QID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX1RIRU4gPSBmYWxzZTtcbmV4cG9ydCB2YXIgREVCVUdfRU1JVCA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVRyA9IGZhbHNlO1xuXG5jb25zb2xlLmxvZyhcIkFuaW1heGUsIGh0dHBzOi8vZ2l0aHViLmNvbS90b21sYXJrd29ydGh5L2FuaW1heGVcIik7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyPFQ+IGV4dGVuZHMgUGFyYW1ldGVyLlBhcmFtZXRlcjxUPiB7fVxuXG4vLyB0b2RvIHdlIHNob3VsZCBtb3ZlIHRoZXNlIGludG8gYW4gRVM2IG1vZHVsZSBidXQgbXkgSURFIGRvZXMgbm90IHN1cHBvcnQgaXQgeWV0XG5leHBvcnQgdHlwZSBDb2xvciA9IHN0cmluZ1xuZXhwb3J0IHR5cGUgUG9pbnQgICAgID0gW251bWJlciwgbnVtYmVyXVxuZXhwb3J0IHR5cGUgTnVtYmVyQXJnID0gbnVtYmVyIHwgUGFyYW1ldGVyPG51bWJlcj5cbmV4cG9ydCB0eXBlIFBvaW50QXJnICA9IFBvaW50IHwgUGFyYW1ldGVyPFBvaW50PlxuZXhwb3J0IHR5cGUgQ29sb3JBcmcgID0gQ29sb3IgfCBQYXJhbWV0ZXI8Q29sb3I+XG5cblxuLyoqXG4gKiBBbmltYXRvcnMgYXJlIHVwZGF0ZWQgd2l0aCBhIERyYXdUaWNrLCB3aGljaCBwcm92aWRlcyB0aGUgbG9jYWwgYW5pbWF0aW9uIHRpbWUsIHRoZVxuICovXG5leHBvcnQgY2xhc3MgRHJhd1RpY2sge1xuICAgIGNvbnN0cnVjdG9yIChwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsIHB1YmxpYyBjbG9jazogbnVtYmVyLCBwdWJsaWMgZHQ6IG51bWJlcikge31cbn1cblxuZXhwb3J0IHR5cGUgRHJhd1N0cmVhbSA9IFJ4Lk9ic2VydmFibGU8RHJhd1RpY2s+O1xuXG5cbmZ1bmN0aW9uIGFzc2VydChwcmVkaWNhdGU6IGJvb2xlYW4sIG1lc3NhZ2UgPzogc3RyaW5nKSB7XG4gICAgaWYgKCFwcmVkaWNhdGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihzdGFja1RyYWNlKCkpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0YWNrVHJhY2UoKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIHJldHVybiAoPGFueT5lcnIpLnN0YWNrO1xufVxuXG5cbmV4cG9ydCBjbGFzcyBBbmltYXRpb24ge1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIF9hdHRhY2g6ICh1cHN0cmVhbTogRHJhd1N0cmVhbSkgPT4gRHJhd1N0cmVhbSwgcHVibGljIGFmdGVyPzogQW5pbWF0aW9uKSB7XG4gICAgfVxuICAgIGF0dGFjaCh1cHN0cmVhbTogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICB2YXIgcHJvY2Vzc2VkID0gdGhpcy5fYXR0YWNoKHVwc3RyZWFtKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWZ0ZXI/IHRoaXMuYWZ0ZXIuYXR0YWNoKHByb2Nlc3NlZCk6IHByb2Nlc3NlZDtcbiAgICB9XG4gICAgLyoqXG4gICAgICogZGVsaXZlcnMgZXZlbnRzIHRvIHRoaXMgZmlyc3QsIHRoZW4gd2hlbiB0aGF0IGFuaW1hdGlvbiBpcyBmaW5pc2hlZFxuICAgICAqIHRoZSBmb2xsb3dlciBjb25zdW1lcnMgZXZlbnRzIGFuZCB0aGUgdmFsdWVzIGFyZSB1c2VkIGFzIG91dHB1dCwgdW50aWwgdGhlIGZvbGxvd2VyIGFuaW1hdGlvbiBjb21wbGV0ZXNcbiAgICAgKi9cbiAgICB0aGVuKGZvbGxvd2VyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IERyYXdTdHJlYW0pIDogRHJhd1N0cmVhbSB7XG4gICAgICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uIChvYnNlcnZlcikge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCAgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RUdXJuID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50ID0gZmlyc3Q7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogYXR0YWNoXCIpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZEF0dGFjaCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RBdHRhY2ggID0gc2VsZi5hdHRhY2goZmlyc3Quc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGZpcnN0IGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUdXJuID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaCA9IGZvbGxvd2VyLmF0dGFjaChzZWNvbmQuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcHJldlN1YnNjcmlwdGlvbiA9IHByZXYuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSB0byBmaXJzdCBPUiBzZWNvbmRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlyc3RUdXJuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3Qub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmQub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIC8vIG9uIGRpc3Bvc2VcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBkaXNwb3NlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0QXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlY29uZEF0dGFjaClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpOyAvL3RvZG8gcmVtb3ZlIHN1YnNjcmliZU9uc1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwaXBlKGFmdGVyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gY29tYmluZTIodGhpcywgYWZ0ZXIpO1xuICAgIH1cblxuICAgIHRyYW5zbGF0ZShwb3NpdGlvbjogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHRyYW5zbGF0ZShwb3NpdGlvbikpO1xuICAgIH1cbiAgICB2ZWxvY2l0eSh2ZWN0b3I6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh2ZWxvY2l0eSh2ZWN0b3IpKTtcbiAgICB9XG5cbiAgICBsb29wKGlubmVyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGxvb3AoaW5uZXIpKTtcbiAgICB9XG5cbiAgICBlbWl0KGlubmVyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGVtaXQoaW5uZXIpKTtcbiAgICB9XG4gICAgY2xvbmUobjogbnVtYmVyLCBpbm5lcjogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShjbG9uZShuLCBpbm5lcikpO1xuICAgIH1cbiAgICBwYXJhbGxlbChpbm5lcjogUnguT2JzZXJ2YWJsZTxBbmltYXRpb24+IHwgQW5pbWF0aW9uW10pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHBhcmFsbGVsKGlubmVyKSk7XG4gICAgfVxuICAgIHR3ZWVuX2xpbmVhcihcbiAgICAgICAgZnJvbTogUG9pbnRBcmcsXG4gICAgICAgIHRvOiAgIFBvaW50QXJnLFxuICAgICAgICB0aW1lOiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHR3ZWVuX2xpbmVhcihmcm9tLCB0bywgdGltZSkpO1xuICAgIH1cblxuICAgIHRha2UoZnJhbWVzOiBudW1iZXIpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHRha2UoZnJhbWVzKSk7XG4gICAgfVxuICAgIGRyYXcoZHJhd0ZhY3Rvcnk6ICgpID0+ICgodGljazogRHJhd1RpY2spID0+IHZvaWQpKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShkcmF3KGRyYXdGYWN0b3J5KSk7XG4gICAgfVxuXG4gICAgLy8gQ2FudmFzIEFQSVxuICAgIHN0cm9rZVN0eWxlKGNvbG9yOiBDb2xvckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoc3Ryb2tlU3R5bGUoY29sb3IpKTtcbiAgICB9XG4gICAgZmlsbFN0eWxlKGNvbG9yOiBDb2xvckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZmlsbFN0eWxlKGNvbG9yKSk7XG4gICAgfVxuICAgIGZpbGxSZWN0KHh5OiBQb2ludEFyZywgd2lkdGhfaGVpZ2h0OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZmlsbFJlY3QoeHksIHdpZHRoX2hlaWdodCkpO1xuICAgIH1cbiAgICB3aXRoaW5QYXRoKGlubmVyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHdpdGhpblBhdGgoaW5uZXIpKTtcbiAgICB9XG4gICAgbW92ZVRvKHh5OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUobW92ZVRvKHh5KSk7XG4gICAgfVxuICAgIGxpbmVUbyh4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGxpbmVUbyh4eSkpO1xuICAgIH1cbiAgICBzdHJva2UoKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzdHJva2UoKSk7XG4gICAgfVxuICAgIGdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbihvcGVyYXRpb246IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uKG9wZXJhdGlvbikpO1xuICAgIH1cbiAgICAvLyBFbmQgQ2FudmFzIEFQSVxuXG59XG5cbmV4cG9ydCBjbGFzcyBBbmltYXRvciB7XG4gICAgdGlja2VyU3Vic2NyaXB0aW9uOiBSeC5EaXNwb3NhYmxlID0gbnVsbDtcbiAgICByb290OiBSeC5TdWJqZWN0PERyYXdUaWNrPjtcbiAgICBhbmltYXRpb25TdWJzY3JpcHRpb25zOiBSeC5JRGlzcG9zYWJsZVtdID0gW107XG4gICAgdDogbnVtYmVyID0gMDtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCkge1xuICAgICAgICB0aGlzLnJvb3QgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKVxuICAgIH1cbiAgICB0aWNrZXIodGljazogUnguT2JzZXJ2YWJsZTxudW1iZXI+KTogdm9pZCB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICB0aGlzLnRpY2tlclN1YnNjcmlwdGlvbiA9IHRpY2subWFwKGZ1bmN0aW9uKGR0OiBudW1iZXIpIHsgLy9tYXAgdGhlIHRpY2tlciBvbnRvIGFueSAtPiBjb250ZXh0XG4gICAgICAgICAgICB2YXIgdGljayA9IG5ldyBEcmF3VGljayhzZWxmLmN0eCwgc2VsZi50LCBkdCk7XG4gICAgICAgICAgICBzZWxmLnQgKz0gZHQ7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSkuc3Vic2NyaWJlKHRoaXMucm9vdCk7XG4gICAgfVxuICAgIHBsYXkgKGFuaW1hdGlvbjogQW5pbWF0aW9uKTogdm9pZCB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBwbGF5XCIpO1xuICAgICAgICB2YXIgc2F2ZUJlZm9yZUZyYW1lID0gdGhpcy5yb290LnRhcE9uTmV4dChmdW5jdGlvbih0aWNrKXtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IHNhdmVcIik7XG4gICAgICAgICAgICB0aWNrLmN0eC5zYXZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZG9BbmltYXRpb24gPSBhbmltYXRpb24uYXR0YWNoKHNhdmVCZWZvcmVGcmFtZSk7XG4gICAgICAgIHZhciByZXN0b3JlQWZ0ZXJGcmFtZSA9IGRvQW5pbWF0aW9uLnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IG5leHQgcmVzdG9yZVwiKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggZXJyIHJlc3RvcmVcIiwgZXJyKTtcbiAgICAgICAgICAgICAgICBzZWxmLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uU3Vic2NyaXB0aW9ucy5wdXNoKFxuICAgICAgICAgICAgcmVzdG9yZUFmdGVyRnJhbWUuc3Vic2NyaWJlKClcbiAgICAgICAgKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBOT1RFOiBjdXJyZW50bHkgZmFpbHMgaWYgdGhlIHN0cmVhbXMgYXJlIGRpZmZlcmVudCBsZW5ndGhzXG4gKiBAcGFyYW0gZXhwZWN0ZWREdCB0aGUgZXhwZWN0ZWQgY2xvY2sgdGljayB2YWx1ZXNcbiAqIEBwYXJhbSBhZnRlclxuICogQHJldHVybnMge0FuaW1hdGlvbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydER0KGV4cGVjdGVkRHQ6IFJ4Lk9ic2VydmFibGU8bnVtYmVyPiwgYWZ0ZXI/OiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHVwc3RyZWFtKSB7XG4gICAgICAgIHJldHVybiB1cHN0cmVhbS56aXAoZXhwZWN0ZWREdCwgZnVuY3Rpb24odGljazogRHJhd1RpY2ssIGV4cGVjdGVkRHRWYWx1ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICBpZiAodGljay5kdCAhPSBleHBlY3RlZER0VmFsdWUpIHRocm93IG5ldyBFcnJvcihcInVuZXhwZWN0ZWQgZHQgb2JzZXJ2ZWQ6IFwiICsgdGljay5kdCArIFwiLCBleHBlY3RlZDpcIiArIGV4cGVjdGVkRHRWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSk7XG4gICAgfSwgYWZ0ZXIpO1xufVxuXG4vL3RvZG8gd291bGQgYmUgbmljZSBpZiB0aGlzIHRvb2sgYW4gaXRlcmFibGUgb3Igc29tZSBvdGhlciB0eXBlIG9mIHNpbXBsZSBwdWxsIHN0cmVhbVxuLy8gYW5kIHVzZWQgc3RyZWFtRXF1YWxzXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Q2xvY2soYXNzZXJ0Q2xvY2s6IG51bWJlcltdLCBhZnRlcj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgdmFyIGluZGV4ID0gMDtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHVwc3RyZWFtKSB7XG4gICAgICAgIHJldHVybiB1cHN0cmVhbS50YXBPbk5leHQoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhc3NlcnRDbG9jazogXCIsIHRpY2spO1xuICAgICAgICAgICAgaWYgKHRpY2suY2xvY2sgPCBhc3NlcnRDbG9ja1tpbmRleF0gLSAwLjAwMDAxIHx8IHRpY2suY2xvY2sgPiBhc3NlcnRDbG9ja1tpbmRleF0gKyAwLjAwMDAxKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yTXNnID0gXCJ1bmV4cGVjdGVkIGNsb2NrIG9ic2VydmVkOiBcIiArIHRpY2suY2xvY2sgKyBcIiwgZXhwZWN0ZWQ6XCIgKyBhc3NlcnRDbG9ja1tpbmRleF1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvck1zZyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yTXNnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluZGV4ICsrO1xuICAgICAgICB9KTtcbiAgICB9LCBhZnRlcik7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBBbmltYXRpb24gYnkgcGlwaW5nIHRoZSBhbmltYXRpb24gZmxvdyBvZiBBIGludG8gQlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tYmluZTIoYTogQW5pbWF0aW9uLCBiOiBBbmltYXRpb24pIHtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihcbiAgICAgICAgKHVwc3RyZWFtOiBEcmF3U3RyZWFtKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gYi5hdHRhY2goYS5hdHRhY2godXBzdHJlYW0pKTtcbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8qKlxuICogcGxheXMgc2V2ZXJhbCBhbmltYXRpb25zLCBmaW5pc2hlcyB3aGVuIHRoZXkgYXJlIGFsbCBkb25lLlxuICogQHBhcmFtIGFuaW1hdGlvbnNcbiAqIEByZXR1cm5zIHtBbmltYXRpb259XG4gKiB0b2RvOiBJIHRoaW5rIHRoZXJlIGFyZSBsb3RzIG9mIGJ1Z3Mgd2hlbiBhbiBhbmltYXRpb24gc3RvcHMgcGFydCB3YXlcbiAqIEkgdGhpbmsgaXQgYmUgYmV0dGVyIGlmIHRoaXMgc3Bhd25lZCBpdHMgb3duIEFuaW1hdG9yIHRvIGhhbmRsZSBjdHggcmVzdG9yZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcmFsbGVsKFxuICAgIGFuaW1hdGlvbnM6IFJ4Lk9ic2VydmFibGU8QW5pbWF0aW9uPiB8IEFuaW1hdGlvbltdXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJwYXJhbGxlbDogaW5pdGlhbGl6aW5nXCIpO1xuXG4gICAgICAgIHZhciBhY3RpdmVBbmltYXRpb25zID0gMDtcbiAgICAgICAgdmFyIGF0dGFjaFBvaW50ID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgZnVuY3Rpb24gZGVjcmVtZW50QWN0aXZlKCkge1xuICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGRlY3JlbWVudCBhY3RpdmVcIik7XG4gICAgICAgICAgICBhY3RpdmVBbmltYXRpb25zIC0tO1xuICAgICAgICB9XG5cbiAgICAgICAgYW5pbWF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGFuaW1hdGlvbjogQW5pbWF0aW9uKSB7XG4gICAgICAgICAgICBhY3RpdmVBbmltYXRpb25zKys7XG4gICAgICAgICAgICBhbmltYXRpb24uYXR0YWNoKGF0dGFjaFBvaW50LnRhcE9uTmV4dCh0aWNrID0+IHRpY2suY3R4LnNhdmUoKSkpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgdGljayA9PiB0aWNrLmN0eC5yZXN0b3JlKCksXG4gICAgICAgICAgICAgICAgZGVjcmVtZW50QWN0aXZlLFxuICAgICAgICAgICAgICAgIGRlY3JlbWVudEFjdGl2ZSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHByZXYudGFrZVdoaWxlKCgpID0+IGFjdGl2ZUFuaW1hdGlvbnMgPiAwKS50YXBPbk5leHQoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJwYXJhbGxlbDogZW1pdHRpbmcsIGFuaW1hdGlvbnNcIiwgdGljayk7XG4gICAgICAgICAgICAgICAgYXR0YWNoUG9pbnQub25OZXh0KHRpY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBlbWl0dGluZyBmaW5pc2hlZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsb25lKFxuICAgIG46IG51bWJlciwgLy8gdG9kbyBtYWtlIGR5bmFtaWNcbiAgICBhbmltYXRpb246IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gcGFyYWxsZWwoUnguT2JzZXJ2YWJsZS5yZXR1cm4oYW5pbWF0aW9uKS5yZXBlYXQobikpO1xufVxuXG5cbmZ1bmN0aW9uIHNlcXVlbmNlKFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uW11cbik6IEFuaW1hdGlvblxueyByZXR1cm4gbnVsbDt9XG5cbi8qKlxuICogVGhlIGNoaWxkIGFuaW1hdGlvbiBpcyBzdGFydGVkIGV2ZXJ5IGZyYW1lXG4gKiBAcGFyYW0gYW5pbWF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbWl0KFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJlbWl0OiBpbml0aWFsaXppbmdcIik7XG4gICAgICAgIHZhciBhdHRhY2hQb2ludCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgIHJldHVybiBwcmV2LnRhcE9uTmV4dChmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcImVtaXQ6IGVtbWl0dGluZ1wiLCBhbmltYXRpb24pO1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5hdHRhY2goYXR0YWNoUG9pbnQpLnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIGF0dGFjaFBvaW50Lm9uTmV4dCh0aWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIFdoZW4gdGhlIGNoaWxkIGxvb3AgZmluaXNoZXMsIGl0IGlzIHNwYXduZWRcbiAqIEBwYXJhbSBhbmltYXRpb25cbiAqIEByZXR1cm5zIHtBbmltYXRpb259XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb29wKFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBpbml0aWFsaXppbmdcIik7XG5cblxuICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBjcmVhdGUgbmV3IGxvb3BcIik7XG4gICAgICAgICAgICB2YXIgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBsb29wU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICAgICAgICAgIHZhciB0ID0gMDtcblxuICAgICAgICAgICAgZnVuY3Rpb24gYXR0YWNoTG9vcChuZXh0KSB7IC8vdG9kbyBJIGZlZWwgbGlrZSB3ZSBjYW4gcmVtb3ZlIGEgbGV2ZWwgZnJvbSB0aGlzIHNvbWVob3dcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBuZXcgaW5uZXIgbG9vcCBzdGFydGluZyBhdFwiLCB0KTtcblxuICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN1YnNjcmlwdGlvbiA9IGFuaW1hdGlvbi5hdHRhY2gobG9vcFN0YXJ0KS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCBlcnIgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBwb3N0LWlubmVyIGNvbXBsZXRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIGZpbmlzaGVkIGNvbnN0cnVjdGlvblwiKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmV2LnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbm8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaExvb3AobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogdXBzdHJlYW0gdG8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0Lm9uTmV4dChuZXh0KTtcblxuICAgICAgICAgICAgICAgICAgICB0ICs9IG5leHQuZHQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSBlcnJvciB0byBkb3duc3RyZWFtXCIsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkLmJpbmQob2JzZXJ2ZXIpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy9kaXNwb3NlXG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogZGlzcG9zZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAobG9vcFN0YXJ0KSBsb29wU3RhcnQuZGlzcG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXcoXG4gICAgZHJhd0ZhY3Rvcnk6ICgpID0+ICgodGljazogRHJhd1RpY2spID0+IHZvaWQpLFxuICAgIGFmdGVyPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldmlvdXM6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIGRyYXc6ICh0aWNrOiBEcmF3VGljaykgPT4gdm9pZCA9IGRyYXdGYWN0b3J5KCk7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy50YXBPbk5leHQoZHJhdyk7XG4gICAgfSwgYWZ0ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlKFxuICAgIGRlbHRhOiBQb2ludEFyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zbGF0ZTogYXR0YWNoZWRcIik7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHZhciBwb2ludF9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZGVsdGEpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvaW50ID0gcG9pbnRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidHJhbnNsYXRlOlwiLCBwb2ludCk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgudHJhbnNsYXRlKHBvaW50WzBdLCBwb2ludFsxXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAsIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnbG9iYWxDb21wb3NpdGVPcGVyYXRpb24oXG4gICAgY29tcG9zaXRlX21vZGU6IHN0cmluZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgdGljay5jdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gY29tcG9zaXRlX21vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAsIGFuaW1hdGlvbik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHZlbG9jaXR5KFxuICAgIHZlbG9jaXR5OiBQb2ludEFyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInZlbG9jaXR5OiBhdHRhY2hlZFwiKTtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHBvczogUG9pbnQgPSBbMC4wLDAuMF07XG4gICAgICAgICAgICB2YXIgdmVsb2NpdHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHZlbG9jaXR5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odGljaykge1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCBwb3NbMF0sIHBvc1sxXSk7XG4gICAgICAgICAgICAgICAgdmFyIHZlbG9jaXR5ID0gdmVsb2NpdHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBwb3NbMF0gKz0gdmVsb2NpdHlbMF0gKiB0aWNrLmR0O1xuICAgICAgICAgICAgICAgIHBvc1sxXSArPSB2ZWxvY2l0eVsxXSAqIHRpY2suZHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2Vlbl9saW5lYXIoXG4gICAgZnJvbTogUG9pbnRBcmcsXG4gICAgdG86ICAgUG9pbnRBcmcsXG4gICAgdGltZTogTnVtYmVyQXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvbiAvKiBjb3BpZXMgKi9cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICB2YXIgZnJvbV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZnJvbSkuaW5pdCgpO1xuICAgICAgICB2YXIgdG9fbmV4dCAgID0gUGFyYW1ldGVyLmZyb20odG8pLmluaXQoKTtcbiAgICAgICAgdmFyIHRpbWVfbmV4dCAgID0gUGFyYW1ldGVyLmZyb20odGltZSkuaW5pdCgpO1xuICAgICAgICByZXR1cm4gcHJldi5tYXAoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0d2VlbjogaW5uZXJcIik7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IGZyb21fbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgIHZhciB0byAgID0gdG9fbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgIHZhciB0aW1lID0gdGltZV9uZXh0KHRpY2suY2xvY2spO1xuXG4gICAgICAgICAgICB0ID0gdCArIHRpY2suZHQ7XG4gICAgICAgICAgICBpZiAodCA+IHRpbWUpIHQgPSB0aW1lO1xuICAgICAgICAgICAgdmFyIHggPSBmcm9tWzBdICsgKHRvWzBdIC0gZnJvbVswXSkgKiB0IC8gdGltZTtcbiAgICAgICAgICAgIHZhciB5ID0gZnJvbVsxXSArICh0b1sxXSAtIGZyb21bMV0pICogdCAvIHRpbWU7XG4gICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgeCwgeSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSkudGFrZVdoaWxlKGZ1bmN0aW9uKHRpY2spIHtyZXR1cm4gdCA8IHRpbWU7fSlcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsbFJlY3QoXG4gICAgeHk6IFBvaW50QXJnLFxuICAgIHdpZHRoX2hlaWdodDogUG9pbnRBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFJlY3Q6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB4eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHdpZHRoX2hlaWdodCkuaW5pdCgpO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5OiBQb2ludCA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodDogUG9pbnQgPSB3aWR0aF9oZWlnaHRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFJlY3Q6IGZpbGxSZWN0XCIsIHh5LCB3aWR0aF9oZWlnaHQpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxSZWN0KHh5WzBdLCB4eVsxXSwgd2lkdGhfaGVpZ2h0WzBdLCB3aWR0aF9oZWlnaHRbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGZpbGxTdHlsZShcbiAgICBjb2xvcjogQ29sb3JBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFN0eWxlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgY29sb3JfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGNvbG9yKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gY29sb3JfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFN0eWxlOiBmaWxsU3R5bGVcIiwgY29sb3IpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Ryb2tlU3R5bGUoXG4gICAgY29sb3I6IENvbG9yQXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZVN0eWxlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgY29sb3JfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGNvbG9yKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gY29sb3JfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlU3R5bGU6IHN0cm9rZVN0eWxlXCIsIGNvbG9yKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zdHJva2VTdHlsZSA9IGNvbG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhpblBhdGgoXG4gICAgaW5uZXI6IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihcbiAgICAgICAgKHVwc3RyZWFtOiBEcmF3U3RyZWFtKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwid2l0aGluUGF0aDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGJlZ2luUGF0aEJlZm9yZUlubmVyID0gdXBzdHJlYW0udGFwT25OZXh0KCh0aWNrOiBEcmF3VGljaykgPT4gdGljay5jdHguYmVnaW5QYXRoKCkpO1xuICAgICAgICAgICAgcmV0dXJuIGlubmVyLmF0dGFjaChiZWdpblBhdGhCZWZvcmVJbm5lcikudGFwT25OZXh0KCh0aWNrOiBEcmF3VGljaykgPT4gdGljay5jdHguY2xvc2VQYXRoKCkpXG4gICAgICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW92ZVRvKFxuICAgIHh5OiBQb2ludEFyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJtb3ZlVG86IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB4eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHkgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJtb3ZlVG86IG1vdmVUb1wiLCB4eSk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgubW92ZVRvKHh5WzBdLCB4eVsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5lVG8oXG4gICAgeHk6IFBvaW50QXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVUbzogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eSA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVUbzogbGluZVRvXCIsIHh5KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5saW5lVG8oeHlbMF0sIHh5WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzdHJva2UoXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZTogc3Ryb2tlXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnN0cm9rZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGluZVdpZHRoKFxuICAgIHdpZHRoOiBOdW1iZXJBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZVdpZHRoOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgd2lkdGhfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHdpZHRoKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoID0gd2lkdGhfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZVdpZHRoOiBsaW5lV2lkdGhcIiwgd2lkdGgpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmxpbmVXaWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG4vLyBmb3JlZ3JvdW5kIGNvbG9yIHVzZWQgdG8gZGVmaW5lIGVtbWl0dGVyIHJlZ2lvbnMgYXJvdW5kIHRoZSBjYW52YXNcbi8vICB0aGUgaHVlLCBpcyByZXVzZWQgaW4gdGhlIHBhcnRpY2xlc1xuLy8gIHRoZSBsaWdodG5lc3MgaXMgdXNlIHRvIGRlc2NyaWJlIHRoZSBxdWFudGl0eSAobWF4IGxpZ2h0bmVzcyBsZWFkcyB0byB0b3RhbCBzYXR1cmF0aW9uKVxuLy9cbi8vIHRoZSBhZGRpdGlvbmFsIHBhcmFtZXRlciBpbnRlc2l0eSBpcyB1c2VkIHRvIHNjYWxlIHRoZSBlbW1pdGVyc1xuLy8gZ2VuZXJhbGx5IHRoZSBjb2xvcnMgeW91IHBsYWNlIG9uIHRoZSBtYXAgd2lsbCBiZSBleGNlZWRlZCBieSB0aGUgc2F0dXJhdGlvblxuLy9cbi8vIEhvdyBhcmUgdHdvIGRpZmZlcmVudCBodWVzIHNlbnNpYmx5IG1peGVkXG5cbi8vIGRlY2F5IG9mIDAuNVxuLy9cbi8vICAgICAgIEhcbi8vIDEgMiA0IDkgNCAyIDEgICAgICAgLy9zYXQsIGFsc28gYWxwaGFcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gICAgICAgICAxIDIgNCAyIDEgICAvL3NhdFxuLy8gICAgICAgICAgICAgSDJcbi8vXG4vLyB3ZSBhZGQgdGhlIGNvbnRyaWJ1dGlvbiB0byBhbiBpbWFnZSBzaXplZCBhY2N1bXVsYXRvclxuLy8gYXMgdGhlIGNvbnRyaWJ1dGlvbnMgbmVlZCB0byBzdW0gcGVybXV0YXRpb24gaW5kZXBlbmRlbnRseSAoYWxzbyBwcm9iYWJseSBhc3NvY2lhdGl2ZSlcbi8vIGJsZW5kKHJnYmExLCByZ2JhMikgPSBibGVuZChyZ2JhMixyZ2JhMSlcbi8vIGFscGhhID0gYTEgKyBhMiAtIGExYTJcbi8vIGlmIGExID0gMSAgIGFuZCBhMiA9IDEsICAgYWxwaGEgPSAxICAgICAgICAgPSAxXG4vLyBpZiBhMSA9IDAuNSBhbmQgYTIgPSAxLCAgIGFscGhhID0gMS41IC0gMC41ID0gMVxuLy8gaWYgYTEgPSAwLjUgYW5kIGEyID0gMC41LCBhbHBoYSA9IDEgLSAwLjI1ICA9IDAuNzVcblxuLy8gTm9ybWFsIGJsZW5kaW5nIGRvZXNuJ3QgY29tbXV0ZTpcbi8vIHJlZCA9IChyMSAqIGExICArIChyMiAqIGEyKSAqICgxIC0gYTEpKSAvIGFscGhhXG5cbi8vIGxpZ2h0ZW4gZG9lcywgd2hpY2ggaXMganVzdCB0aGUgbWF4XG4vLyByZWQgPSBtYXgocjEsIHIyKVxuLy8gb3IgYWRkaXRpb24gcmVkID0gcjEgKyByMlxuLy8gaHR0cDovL3d3dy5kZWVwc2t5Y29sb3JzLmNvbS9hcmNoaXZlLzIwMTAvMDQvMjEvZm9ybXVsYXMtZm9yLVBob3Rvc2hvcC1ibGVuZGluZy1tb2Rlcy5odG1sXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdsb3coXG4gICAgZGVjYXk6IG51bWJlciA9IDAuMSxcbiAgICBhZnRlciA/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN0eCA9IHRpY2suY3R4O1xuXG4gICAgICAgICAgICAgICAgLy8gb3VyIHNyYyBwaXhlbCBkYXRhXG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoID0gY3R4LmNhbnZhcy53aWR0aDtcbiAgICAgICAgICAgICAgICB2YXIgaGVpZ2h0ID0gY3R4LmNhbnZhcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgdmFyIHBpeGVscyA9IHdpZHRoICogaGVpZ2h0O1xuICAgICAgICAgICAgICAgIHZhciBpbWdEYXRhID0gY3R4LmdldEltYWdlRGF0YSgwLDAsd2lkdGgsaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGltZ0RhdGEuZGF0YTtcblxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwib3JpZ2luYWwgZGF0YVwiLCBpbWdEYXRhLmRhdGEpXG5cbiAgICAgICAgICAgICAgICAvLyBvdXIgdGFyZ2V0IGRhdGFcbiAgICAgICAgICAgICAgICAvLyB0b2RvIGlmIHdlIHVzZWQgYSBUeXBlZCBhcnJheSB0aHJvdWdob3V0IHdlIGNvdWxkIHNhdmUgc29tZSB6ZXJvaW5nIGFuZCBvdGhlciBjcmFwcHkgY29udmVyc2lvbnNcbiAgICAgICAgICAgICAgICAvLyBhbHRob3VnaCBhdCBsZWFzdCB3ZSBhcmUgY2FsY3VsYXRpbmcgYXQgYSBoaWdoIGFjY3VyYWN5LCBsZXRzIG5vdCBkbyBhIGJ5dGUgYXJyYXkgZnJvbSB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgICAgdmFyIGdsb3dEYXRhOiBudW1iZXJbXSA9IG5ldyBBcnJheTxudW1iZXI+KHBpeGVscyo0KTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGl4ZWxzICogNDsgaSsrKSBnbG93RGF0YVtpXSA9IDA7XG5cbiAgICAgICAgICAgICAgICAvLyBwYXNzYmFjayB0byBhdm9pZCBsb3RzIG9mIGFycmF5IGFsbG9jYXRpb25zIGluIHJnYlRvSHNsLCBhbmQgaHNsVG9SZ2IgY2FsbHNcbiAgICAgICAgICAgICAgICB2YXIgaHNsOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0gPSBbMCwwLDBdO1xuICAgICAgICAgICAgICAgIHZhciByZ2I6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSA9IFswLDAsMF07XG5cbiAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgdGhlIGNvbnRyaWJ1dGlvbiBvZiBlYWNoIGVtbWl0dGVyIG9uIHRoZWlyIHN1cnJvdW5kc1xuICAgICAgICAgICAgICAgIGZvcih2YXIgeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlZCAgID0gZGF0YVsoKHdpZHRoICogeSkgKyB4KSAqIDRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdyZWVuID0gZGF0YVsoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBibHVlICA9IGRhdGFbKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgMl07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYWxwaGEgPSBkYXRhWygod2lkdGggKiB5KSArIHgpICogNCArIDNdO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnZlcnQgdG8gaHNsXG4gICAgICAgICAgICAgICAgICAgICAgICByZ2JUb0hzbChyZWQsIGdyZWVuLCBibHVlLCBoc2wpO1xuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGh1ZSA9IGhzbFswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBxdHkgPSBoc2xbMV07IC8vIHF0eSBkZWNheXNcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsb2NhbF9kZWNheSA9IGhzbFsyXSArIDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIG9ubHkgbmVlZCB0byBjYWxjdWxhdGUgYSBjb250cmlidXRpb24gbmVhciB0aGUgc291cmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb250cmlidXRpb24gPSBxdHkgZGVjYXlpbmcgYnkgaW52ZXJzZSBzcXVhcmUgZGlzdGFuY2VcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGMgPSBxIC8gKGReMiAqIGspLCB3ZSB3YW50IHRvIGZpbmQgdGhlIGMgPCAwLjAxIHBvaW50XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAwLjAxID0gcSAvIChkXjIgKiBrKSA9PiBkXjIgPSBxIC8gKDAuMDEgKiBrKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZCA9IHNxcnQoMTAwICogcSAvIGspIChub3RlIDIgc29sdXRpb25zLCByZXByZXNlbnRpbmcgdGhlIHR3byBoYWxmd2lkdGhzKVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbGZ3aWR0aCA9IE1hdGguc3FydCgxMDAwICogcXR5IC8gKGRlY2F5ICogbG9jYWxfZGVjYXkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbGZ3aWR0aCAqPSAxMDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGkgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHggLSBoYWxmd2lkdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1aSA9IE1hdGgubWluKHdpZHRoLCBNYXRoLmNlaWwoeCArIGhhbGZ3aWR0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxqID0gTWF0aC5tYXgoMCwgTWF0aC5mbG9vcih5IC0gaGFsZndpZHRoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdWogPSBNYXRoLm1pbihoZWlnaHQsIE1hdGguY2VpbCh5ICsgaGFsZndpZHRoKSk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBqID0gbGo7IGogPCB1ajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gbGk7IGkgPCB1aTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkeCA9IGkgLSB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZHkgPSBqIC0geTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRfc3F1YXJlZCA9IGR4ICogZHggKyBkeSAqIGR5O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGMgaXMgaW4gdGhlIHNhbWUgc2NhbGUgYXQgcXR5IGkuZS4gKDAgLSAxMDAsIHNhdHVyYXRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjID0gKHF0eSkgLyAoMS4wMDAxICsgTWF0aC5zcXJ0KGRfc3F1YXJlZCkgKiBkZWNheSAqIGxvY2FsX2RlY2F5KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoYyA8PSAxMDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoYyA+PSAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmdiID0gaHNsVG9SZ2IoaHVlLCA1MCwgYywgcmdiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmdiID0gaHVzbC50b1JHQihodWUsIDUwLCBjKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9mb3IgKHZhciBodXNsaSA9IDA7IGh1c2xpPCAzOyBodXNsaSsrKSByZ2IgW2h1c2xpXSAqPSAyNTU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjX2FscGhhID0gYyAvIDEwMC4wO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByX2kgPSAoKHdpZHRoICogaikgKyBpKSAqIDQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnX2kgPSAoKHdpZHRoICogaikgKyBpKSAqIDQgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYl9pID0gKCh3aWR0aCAqIGopICsgaSkgKiA0ICsgMjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFfaSA9ICgod2lkdGggKiBqKSArIGkpICogNCArIDM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJyZ2JcIiwgcmdiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJjXCIsIGMpO1xuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJlX2FscGhhID0gZ2xvd0RhdGFbYV9pXTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChjX2FscGhhIDw9IDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoY19hbHBoYSA+PSAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KHByZV9hbHBoYSA8PSAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KHByZV9hbHBoYSA+PSAwKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBibGVuZCBhbHBoYSBmaXJzdCBpbnRvIGFjY3VtdWxhdG9yXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdsb3dEYXRhW2FfaV0gPSBnbG93RGF0YVthX2ldICsgY19hbHBoYSAtIGNfYWxwaGEgKiBnbG93RGF0YVthX2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnbG93RGF0YVthX2ldID0gTWF0aC5tYXgoZ2xvd0RhdGFbYV9pXSwgY19hbHBoYSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbYV9pXSA9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW2FfaV0gPD0gMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVthX2ldID49IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbcl9pXSA8PSAyNTUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbcl9pXSA+PSAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW2dfaV0gPD0gMjU1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW2dfaV0gPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVtiX2ldIDw9IDI1NSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVtiX2ldID49IDApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW3JfaV0gPSAocHJlX2FscGhhICsgcmdiWzBdLyAyNTUuMCAtIGNfYWxwaGEgKiByZ2JbMF0vIDI1NS4wKSAqIDI1NTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IChwcmVfYWxwaGEgKyByZ2JbMV0vIDI1NS4wIC0gY19hbHBoYSAqIHJnYlsxXS8gMjU1LjApICogMjU1O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtiX2ldID0gKHByZV9hbHBoYSArIHJnYlsyXS8gMjU1LjAgLSBjX2FscGhhICogcmdiWzJdLyAyNTUuMCkgKiAyNTU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJwb3N0LWFscGhhXCIsIGdsb3dEYXRhW2FfaV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vdyBzaW1wbGUgbGlnaHRlblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW3JfaV0gPSBNYXRoLm1heChyZ2JbMF0sIGdsb3dEYXRhW3JfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtnX2ldID0gTWF0aC5tYXgocmdiWzFdLCBnbG93RGF0YVtnX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbYl9pXSA9IE1hdGgubWF4KHJnYlsyXSwgZ2xvd0RhdGFbYl9pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWl4IHRoZSBjb2xvcnMgbGlrZSBwaWdtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b3RhbF9hbHBoYSA9IGNfYWxwaGEgKyBwcmVfYWxwaGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW3JfaV0gPSAoY19hbHBoYSAqIHJnYlswXSArIHByZV9hbHBoYSAqIGdsb3dEYXRhW3JfaV0pIC8gdG90YWxfYWxwaGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2dfaV0gPSAoY19hbHBoYSAqIHJnYlsxXSArIHByZV9hbHBoYSAqIGdsb3dEYXRhW2dfaV0pIC8gdG90YWxfYWxwaGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2JfaV0gPSAoY19hbHBoYSAqIHJnYlsyXSArIHByZV9hbHBoYSAqIGdsb3dEYXRhW2JfaV0pIC8gdG90YWxfYWxwaGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFJFQUxMWSBDT09MIEVGRkVDVFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gcmdiWzBdICsgZ2xvd0RhdGFbcl9pXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IHJnYlsxXSArIGdsb3dEYXRhW2dfaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2JfaV0gPSByZ2JbMl0gKyBnbG93RGF0YVtiX2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW3JfaV0gPSBNYXRoLm1pbihyZ2JbMF0gKyBnbG93RGF0YVtyX2ldLCAyNTUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtnX2ldID0gTWF0aC5taW4ocmdiWzFdICsgZ2xvd0RhdGFbZ19pXSwgMjU1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbYl9pXSA9IE1hdGgubWluKHJnYlsyXSArIGdsb3dEYXRhW2JfaV0sIDI1NSk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4IDwgMiAmJiBqID09IDIwICYmIGkgPT0gMjAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2xvd0RhdGFbcl9pXSA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJwcmUtYWxwaGFcIiwgZ2xvd0RhdGFbYV9pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImR4XCIsIGR4LCBcImR5XCIsIGR5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZF9zcXVhcmVkXCIsIGRfc3F1YXJlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRlY2F5XCIsIGRlY2F5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibG9jYWxfZGVjYXlcIiwgbG9jYWxfZGVjYXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjXCIsIGMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjX2FscGhhXCIsIGNfYWxwaGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhX2lcIiwgYV9pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaHVlXCIsIGh1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInF0eVwiLCBxdHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZWRcIiwgcmVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ3JlZW5cIiwgZ3JlZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJibHVlXCIsIGJsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZ2JcIiwgcmdiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ2xvd0RhdGFbcl9pXVwiLCBnbG93RGF0YVtyX2ldKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZ2xvd1wiLCBnbG93RGF0YSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKGRhdGEubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBmb3IodmFyIHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciB4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByX2kgPSAoKHdpZHRoICogeSkgKyB4KSAqIDQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ19pID0gKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiX2kgPSAoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFfaSA9ICgod2lkdGggKiB5KSArIHgpICogNCArIDM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZltyX2ldID0gTWF0aC5mbG9vcihnbG93RGF0YVtyX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZltnX2ldID0gTWF0aC5mbG9vcihnbG93RGF0YVtnX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZltiX2ldID0gTWF0aC5mbG9vcihnbG93RGF0YVtiX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZlthX2ldID0gMjU1OyAvL01hdGguZmxvb3IoZ2xvd0RhdGFbYV9pXSAqIDI1NSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vICh0b2RvKSBtYXliZSB3ZSBjYW4gc3BlZWQgYm9vc3Qgc29tZSBvZiB0aGlzXG4gICAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9oYWNrcy5tb3ppbGxhLm9yZy8yMDExLzEyL2Zhc3Rlci1jYW52YXMtcGl4ZWwtbWFuaXB1bGF0aW9uLXdpdGgtdHlwZWQtYXJyYXlzL1xuXG4gICAgICAgICAgICAgICAgLy9maW5hbGx5IG92ZXJ3cml0ZSB0aGUgcGl4ZWwgZGF0YSB3aXRoIHRoZSBhY2N1bXVsYXRvclxuICAgICAgICAgICAgICAgICg8YW55PmltZ0RhdGEuZGF0YSkuc2V0KG5ldyBVaW50OENsYW1wZWRBcnJheShidWYpKTtcblxuICAgICAgICAgICAgICAgIGN0eC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFmdGVyKTtcbn1cblxuZnVuY3Rpb24gbWFwKFxuICAgIG1hcF9mbjogKHByZXY6IERyYXdUaWNrKSA9PiBEcmF3VGljayxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXZpb3VzOiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy5tYXAobWFwX2ZuKVxuICAgIH0sIGFuaW1hdGlvbilcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRha2UoXG4gICAgZnJhbWVzOiBudW1iZXIsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbihwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0YWtlOiBhdHRhY2hcIik7XG4gICAgICAgIHJldHVybiBwcmV2LnRha2UoZnJhbWVzKTtcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlciwgcGF0aDogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgR0lGRW5jb2RlciA9IHJlcXVpcmUoJ2dpZmVuY29kZXInKTtcbiAgICB2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuXG5cbiAgICB2YXIgZW5jb2RlciA9IG5ldyBHSUZFbmNvZGVyKHdpZHRoLCBoZWlnaHQpO1xuICAgIGVuY29kZXIuY3JlYXRlUmVhZFN0cmVhbSgpXG4gICAgICAucGlwZShlbmNvZGVyLmNyZWF0ZVdyaXRlU3RyZWFtKHsgcmVwZWF0OiAxMDAwMCwgZGVsYXk6IDEwMCwgcXVhbGl0eTogMSB9KSlcbiAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHBhdGgpKTtcbiAgICBlbmNvZGVyLnN0YXJ0KCk7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocGFyZW50OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQudGFwKFxuICAgICAgICAgICAgZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2F2ZTogd3JvdGUgZnJhbWVcIik7XG4gICAgICAgICAgICAgICAgZW5jb2Rlci5hZGRGcmFtZSh0aWNrLmN0eCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7Y29uc29sZS5lcnJvcihcInNhdmU6IG5vdCBzYXZlZFwiLCBwYXRoKTt9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7Y29uc29sZS5sb2coXCJzYXZlOiBzYXZlZFwiLCBwYXRoKTsgZW5jb2Rlci5maW5pc2goKTt9XG4gICAgICAgIClcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIENvbnZlcnRzIGFuIFJHQiBjb2xvciB2YWx1ZSB0byBIU0wuIENvbnZlcnNpb24gZm9ybXVsYVxuICogYWRhcHRlZCBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSFNMX2NvbG9yX3NwYWNlLlxuICogQXNzdW1lcyByLCBnLCBhbmQgYiBhcmUgY29udGFpbmVkIGluIHRoZSBzZXQgWzAsIDI1NV0gYW5kXG4gKiByZXR1cm5zIGgsIHMsIGFuZCBsIGluIHRoZSBzZXQgWzAsIDFdLlxuICpcbiAqIEBwYXJhbSAgIE51bWJlciAgciAgICAgICBUaGUgcmVkIGNvbG9yIHZhbHVlXG4gKiBAcGFyYW0gICBOdW1iZXIgIGcgICAgICAgVGhlIGdyZWVuIGNvbG9yIHZhbHVlXG4gKiBAcGFyYW0gICBOdW1iZXIgIGIgICAgICAgVGhlIGJsdWUgY29sb3IgdmFsdWVcbiAqIEByZXR1cm4gIEFycmF5ICAgICAgICAgICBUaGUgSFNMIHJlcHJlc2VudGF0aW9uXG4gKi9cbmZ1bmN0aW9uIHJnYlRvSHNsKHIsIGcsIGIsIHBhc3NiYWNrOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0pOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0ge1xuICAgIC8vIGNvbnNvbGUubG9nKFwicmdiVG9Ic2w6IGlucHV0XCIsIHIsIGcsIGIpO1xuXG4gICAgciAvPSAyNTUsIGcgLz0gMjU1LCBiIC89IDI1NTtcbiAgICB2YXIgbWF4ID0gTWF0aC5tYXgociwgZywgYiksIG1pbiA9IE1hdGgubWluKHIsIGcsIGIpO1xuICAgIHZhciBoLCBzLCBsID0gKG1heCArIG1pbikgLyAyO1xuXG4gICAgaWYobWF4ID09IG1pbil7XG4gICAgICAgIGggPSBzID0gMDsgLy8gYWNocm9tYXRpY1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBkID0gbWF4IC0gbWluO1xuICAgICAgICBzID0gbCA+IDAuNSA/IGQgLyAoMiAtIG1heCAtIG1pbikgOiBkIC8gKG1heCArIG1pbik7XG4gICAgICAgIHN3aXRjaChtYXgpe1xuICAgICAgICAgICAgY2FzZSByOiBoID0gKGcgLSBiKSAvIGQgKyAoZyA8IGIgPyA2IDogMCk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBnOiBoID0gKGIgLSByKSAvIGQgKyAyOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgYjogaCA9IChyIC0gZykgLyBkICsgNDsgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaCAvPSA2O1xuICAgIH1cbiAgICBwYXNzYmFja1swXSA9IChoICogMzYwKTsgICAgICAgLy8gMCAtIDM2MCBkZWdyZWVzXG4gICAgcGFzc2JhY2tbMV0gPSAocyAqIDEwMCk7IC8vIDAgLSAxMDAlXG4gICAgcGFzc2JhY2tbMl0gPSAobCAqIDEwMCk7IC8vIDAgLSAxMDAlXG5cbiAgICAvLyBjb25zb2xlLmxvZyhcInJnYlRvSHNsOiBvdXRwdXRcIiwgcGFzc2JhY2spO1xuXG4gICAgcmV0dXJuIHBhc3NiYWNrO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGFuIEhTTCBjb2xvciB2YWx1ZSB0byBSR0IuIENvbnZlcnNpb24gZm9ybXVsYVxuICogYWRhcHRlZCBmcm9tIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSFNMX2NvbG9yX3NwYWNlLlxuICogQXNzdW1lcyBoLCBzLCBhbmQgbCBhcmUgY29udGFpbmVkIGluIHRoZSBzZXQgWzAsIDFdIGFuZFxuICogcmV0dXJucyByLCBnLCBhbmQgYiBpbiB0aGUgc2V0IFswLCAyNTVdLlxuICpcbiAqIEBwYXJhbSAgIE51bWJlciAgaCAgICAgICBUaGUgaHVlXG4gKiBAcGFyYW0gICBOdW1iZXIgIHMgICAgICAgVGhlIHNhdHVyYXRpb25cbiAqIEBwYXJhbSAgIE51bWJlciAgbCAgICAgICBUaGUgbGlnaHRuZXNzXG4gKiBAcmV0dXJuICBBcnJheSAgICAgICAgICAgVGhlIFJHQiByZXByZXNlbnRhdGlvblxuICovXG5mdW5jdGlvbiBoc2xUb1JnYihoLCBzLCBsLCBwYXNzYmFjazogW251bWJlciwgbnVtYmVyLCBudW1iZXJdKTogW251bWJlciwgbnVtYmVyLCBudW1iZXJde1xuICAgIHZhciByLCBnLCBiO1xuICAgIC8vIGNvbnNvbGUubG9nKFwiaHNsVG9SZ2IgaW5wdXQ6XCIsIGgsIHMsIGwpO1xuXG4gICAgaCA9IGggLyAzNjAuMDtcbiAgICBzID0gcyAvIDEwMC4wO1xuICAgIGwgPSBsIC8gMTAwLjA7XG5cbiAgICBpZihzID09IDApe1xuICAgICAgICByID0gZyA9IGIgPSBsOyAvLyBhY2hyb21hdGljXG4gICAgfWVsc2V7XG4gICAgICAgIHZhciBodWUycmdiID0gZnVuY3Rpb24gaHVlMnJnYihwLCBxLCB0KXtcbiAgICAgICAgICAgIGlmKHQgPCAwKSB0ICs9IDE7XG4gICAgICAgICAgICBpZih0ID4gMSkgdCAtPSAxO1xuICAgICAgICAgICAgaWYodCA8IDEvNikgcmV0dXJuIHAgKyAocSAtIHApICogNiAqIHQ7XG4gICAgICAgICAgICBpZih0IDwgMS8yKSByZXR1cm4gcTtcbiAgICAgICAgICAgIGlmKHQgPCAyLzMpIHJldHVybiBwICsgKHEgLSBwKSAqICgyLzMgLSB0KSAqIDY7XG4gICAgICAgICAgICByZXR1cm4gcDtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcSA9IGwgPCAwLjUgPyBsICogKDEgKyBzKSA6IGwgKyBzIC0gbCAqIHM7XG4gICAgICAgIHZhciBwID0gMiAqIGwgLSBxO1xuICAgICAgICByID0gaHVlMnJnYihwLCBxLCBoICsgMS8zKTtcbiAgICAgICAgZyA9IGh1ZTJyZ2IocCwgcSwgaCk7XG4gICAgICAgIGIgPSBodWUycmdiKHAsIHEsIGggLSAxLzMpO1xuICAgIH1cblxuICAgIHBhc3NiYWNrWzBdID0gciAqIDI1NTtcbiAgICBwYXNzYmFja1sxXSA9IGcgKiAyNTU7XG4gICAgcGFzc2JhY2tbMl0gPSBiICogMjU1O1xuXG4gICAgLy8gY29uc29sZS5sb2coXCJoc2xUb1JnYlwiLCBwYXNzYmFjayk7XG5cbiAgICByZXR1cm4gcGFzc2JhY2s7XG59XG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
