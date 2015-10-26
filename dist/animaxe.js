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
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     * This allows you to chain custom animation.
     * Ax.move(...).pipe(myAnimation());
     */
    Animation.prototype.pipe = function (downstream) {
        return combine2(this, downstream);
    };
    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     * This allows you to sequence animations temporally.
     * frame1Animation().then(frame2Animation).then(frame3Animation)
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
    /**
     * Creates an animation that replays the inner animation each time the inner animation completes.
     * The resultant animation is always runs forever while upstream is live. Only a single inner animation
     * plays at a time (unlike emit())
     */
    Animation.prototype.loop = function (inner) {
        return this.pipe(loop(inner));
    };
    /**
     * Creates an animation that sequences the inner animation every time frame
     * The resultant animation is always runs forever while upstream is live. Multiple inner animations
     * can be playing at the same time (unlike loop)
     */
    Animation.prototype.emit = function (inner) {
        return this.pipe(emit(inner));
    };
    /**
     * Plays all the inner animations at the same time. Parallel completes when all inner animations are over.
     * The canvas states are restored each time, so styling and transforms of different animations do not
     * affect each other (although obsviously the pixel buffer is affected by each animation)
     */
    Animation.prototype.parallel = function (inner_animations) {
        return this.pipe(parallel(inner_animations));
    };
    /**
     * Sequences n copies of the inner animation. Clone completes when all inner animations are over.
     */
    Animation.prototype.clone = function (n, inner) {
        return this.pipe(clone(n, inner));
    };
    Animation.prototype.tween_linear = function (from, to, time) {
        return this.pipe(tween_linear(from, to, time));
    };
    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    Animation.prototype.take = function (frames) {
        return this.pipe(take(frames));
    };
    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * You just have to supply a function that does something with the draw tick.
     */
    Animation.prototype.draw = function (drawFactory) {
        return this.pipe(draw(drawFactory));
    };
    // Canvas API
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     */
    Animation.prototype.translate = function (position) {
        return this.pipe(translate(position));
    };
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    Animation.prototype.strokeStyle = function (color) {
        return this.pipe(strokeStyle(color));
    };
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    Animation.prototype.fillStyle = function (color) {
        return this.pipe(fillStyle(color));
    };
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    Animation.prototype.fillRect = function (xy, width_height) {
        return this.pipe(fillRect(xy, width_height));
    };
    /**
     * Encloses the inner animation with a beginpath() and endpath() from the canvas API.
     */
    Animation.prototype.withinPath = function (inner) {
        return this.pipe(withinPath(inner));
    };
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.moveTo = function (xy) {
        return this.pipe(moveTo(xy));
    };
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.lineTo = function (xy) {
        return this.pipe(lineTo(xy));
    };
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    Animation.prototype.stroke = function () {
        return this.pipe(stroke());
    };
    /**
     * * Dynamic chainable wrapper for globalCompositeOperation in the canvas API.
     */
    Animation.prototype.globalCompositeOperation = function (operation) {
        return this.pipe(globalCompositeOperation(operation));
    };
    // End Canvas API
    /**
     * translates the drawing context by velocity * tick.clock
     */
    Animation.prototype.velocity = function (vector) {
        return this.pipe(velocity(vector));
    };
    Animation.prototype.glow = function (decay) {
        return this.pipe(glow(decay));
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
        var decay_next = Parameter.from(decay).init();
        return function (tick) {
            var ctx = tick.ctx;
            // our src pixel data
            var width = ctx.canvas.width;
            var height = ctx.canvas.height;
            var pixels = width * height;
            var imgData = ctx.getImageData(0, 0, width, height);
            var data = imgData.data;
            var decay = decay_next(tick.clock);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiRHJhd1RpY2siLCJEcmF3VGljay5jb25zdHJ1Y3RvciIsImFzc2VydCIsInN0YWNrVHJhY2UiLCJBbmltYXRpb24iLCJBbmltYXRpb24uY29uc3RydWN0b3IiLCJBbmltYXRpb24uYXR0YWNoIiwiQW5pbWF0aW9uLnBpcGUiLCJBbmltYXRpb24udGhlbiIsIkFuaW1hdGlvbi5sb29wIiwiQW5pbWF0aW9uLmVtaXQiLCJBbmltYXRpb24ucGFyYWxsZWwiLCJBbmltYXRpb24uY2xvbmUiLCJBbmltYXRpb24udHdlZW5fbGluZWFyIiwiQW5pbWF0aW9uLnRha2UiLCJBbmltYXRpb24uZHJhdyIsIkFuaW1hdGlvbi50cmFuc2xhdGUiLCJBbmltYXRpb24uc3Ryb2tlU3R5bGUiLCJBbmltYXRpb24uZmlsbFN0eWxlIiwiQW5pbWF0aW9uLmZpbGxSZWN0IiwiQW5pbWF0aW9uLndpdGhpblBhdGgiLCJBbmltYXRpb24ubW92ZVRvIiwiQW5pbWF0aW9uLmxpbmVUbyIsIkFuaW1hdGlvbi5zdHJva2UiLCJBbmltYXRpb24uZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uIiwiQW5pbWF0aW9uLnZlbG9jaXR5IiwiQW5pbWF0aW9uLmdsb3ciLCJBbmltYXRvciIsIkFuaW1hdG9yLmNvbnN0cnVjdG9yIiwiQW5pbWF0b3IudGlja2VyIiwiQW5pbWF0b3IucGxheSIsImFzc2VydER0IiwiYXNzZXJ0Q2xvY2siLCJjb21iaW5lMiIsInBhcmFsbGVsIiwiZGVjcmVtZW50QWN0aXZlIiwiY2xvbmUiLCJlbWl0IiwibG9vcCIsImF0dGFjaExvb3AiLCJkcmF3IiwidHJhbnNsYXRlIiwiZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uIiwidmVsb2NpdHkiLCJ0d2Vlbl9saW5lYXIiLCJmaWxsUmVjdCIsImZpbGxTdHlsZSIsInN0cm9rZVN0eWxlIiwid2l0aGluUGF0aCIsIm1vdmVUbyIsImxpbmVUbyIsInN0cm9rZSIsImxpbmVXaWR0aCIsImds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UUFDbEJBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBO1FBQ3BEQSxNQUFNQSxDQUFBQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFBQSxDQUFDQTtZQUNSQSxLQUFLQSxDQUFDQTtnQkFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLEtBQUtBLENBQUNBO1lBQ2pEQSxLQUFLQSxDQUFDQTtnQkFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLEtBQUtBLENBQUNBO1lBQ25DQSxLQUFLQSxDQUFDQTtnQkFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLEtBQUtBLENBQUNBO1FBQ3ZDQSxDQUFDQTtRQUNEQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtJQUNYQSxDQUFDQTtJQUNEQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFPQSxrQkFBa0JBO0lBQ2pEQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxXQUFXQTtJQUNwQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsV0FBV0E7SUFFcENBLDZDQUE2Q0E7SUFFN0NBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBO0FBQ3BCQSxDQUFDQTtBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSCxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBa0M7SUFDekRDLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBO0lBQ1pBLDJDQUEyQ0E7SUFFM0NBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEtBQUtBLENBQUNBO0lBQ2RBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEtBQUtBLENBQUNBO0lBQ2RBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEtBQUtBLENBQUNBO0lBRWRBLEVBQUVBLENBQUFBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUFBLENBQUNBO1FBQ1BBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLGFBQWFBO0lBQ2hDQSxDQUFDQTtJQUFBQSxJQUFJQSxDQUFBQSxDQUFDQTtRQUNGQSxJQUFJQSxPQUFPQSxHQUFHQSxpQkFBaUJBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBO1lBQ2xDQyxFQUFFQSxDQUFBQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDakJBLEVBQUVBLENBQUFBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNqQkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLE1BQU1BLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQ3ZDQSxFQUFFQSxDQUFBQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQTtnQkFBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDckJBLEVBQUVBLENBQUFBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBO2dCQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUMvQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDYkEsQ0FBQ0EsQ0FBQ0Q7UUFFRkEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDOUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQ2xCQSxDQUFDQSxHQUFHQSxPQUFPQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUMzQkEsQ0FBQ0EsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDckJBLENBQUNBLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBLENBQUNBO0lBQy9CQSxDQUFDQTtJQUVEQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQTtJQUN0QkEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0E7SUFDdEJBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBO0lBRXRCQSxxQ0FBcUNBO0lBRXJDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtBQUNwQkEsQ0FBQ0EiLCJmaWxlIjoiYW5pbWF4ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9ub2RlX21vZHVsZXMvcngvdHMvcnguYWxsLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL25vZGUuZC50c1wiIC8+XG5pbXBvcnQgUnggPSByZXF1aXJlKCdyeCcpO1xuaW1wb3J0IFBhcmFtZXRlciA9IHJlcXVpcmUoJy4vcGFyYW1ldGVyJyk7XG5cbmV4cG9ydCB2YXIgREVCVUdfTE9PUCA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVR19USEVOID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX0VNSVQgPSBmYWxzZTtcbmV4cG9ydCB2YXIgREVCVUcgPSBmYWxzZTtcblxuY29uc29sZS5sb2coXCJBbmltYXhlLCBodHRwczovL2dpdGh1Yi5jb20vdG9tbGFya3dvcnRoeS9hbmltYXhlXCIpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhcmFtZXRlcjxUPiBleHRlbmRzIFBhcmFtZXRlci5QYXJhbWV0ZXI8VD4ge31cblxuLy8gdG9kbyB3ZSBzaG91bGQgbW92ZSB0aGVzZSBpbnRvIGFuIEVTNiBtb2R1bGUgYnV0IG15IElERSBkb2VzIG5vdCBzdXBwb3J0IGl0IHlldFxuZXhwb3J0IHR5cGUgQ29sb3IgPSBzdHJpbmdcbmV4cG9ydCB0eXBlIFBvaW50ICAgICA9IFtudW1iZXIsIG51bWJlcl1cbmV4cG9ydCB0eXBlIE51bWJlckFyZyA9IG51bWJlciB8IFBhcmFtZXRlcjxudW1iZXI+XG5leHBvcnQgdHlwZSBQb2ludEFyZyAgPSBQb2ludCB8IFBhcmFtZXRlcjxQb2ludD5cbmV4cG9ydCB0eXBlIENvbG9yQXJnICA9IENvbG9yIHwgUGFyYW1ldGVyPENvbG9yPlxuXG5cbi8qKlxuICogQW5pbWF0b3JzIGFyZSB1cGRhdGVkIHdpdGggYSBEcmF3VGljaywgd2hpY2ggcHJvdmlkZXMgdGhlIGxvY2FsIGFuaW1hdGlvbiB0aW1lLCB0aGVcbiAqL1xuZXhwb3J0IGNsYXNzIERyYXdUaWNrIHtcbiAgICBjb25zdHJ1Y3RvciAocHVibGljIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCBwdWJsaWMgY2xvY2s6IG51bWJlciwgcHVibGljIGR0OiBudW1iZXIpIHt9XG59XG5cbmV4cG9ydCB0eXBlIERyYXdTdHJlYW0gPSBSeC5PYnNlcnZhYmxlPERyYXdUaWNrPjtcblxuXG5mdW5jdGlvbiBhc3NlcnQocHJlZGljYXRlOiBib29sZWFuLCBtZXNzYWdlID86IHN0cmluZykge1xuICAgIGlmICghcHJlZGljYXRlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3Ioc3RhY2tUcmFjZSgpKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzdGFja1RyYWNlKCkge1xuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoKTtcbiAgICByZXR1cm4gKDxhbnk+ZXJyKS5zdGFjaztcbn1cblxuXG5leHBvcnQgY2xhc3MgQW5pbWF0aW9uIHtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBfYXR0YWNoOiAodXBzdHJlYW06IERyYXdTdHJlYW0pID0+IERyYXdTdHJlYW0sIHB1YmxpYyBhZnRlcj86IEFuaW1hdGlvbikge1xuICAgIH1cbiAgICBhdHRhY2godXBzdHJlYW06IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHByb2Nlc3NlZCA9IHRoaXMuX2F0dGFjaCh1cHN0cmVhbSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFmdGVyPyB0aGlzLmFmdGVyLmF0dGFjaChwcm9jZXNzZWQpOiBwcm9jZXNzZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2VuZCB0aGUgZG93bnN0cmVhbSBjb250ZXh0IG9mICd0aGlzJyBhbmltYXRpb24sIGFzIHRoZSB1cHN0cmVhbSBjb250ZXh0IHRvIHN1cHBsaWVkIGFuaW1hdGlvbi5cbiAgICAgKiBUaGlzIGFsbG93cyB5b3UgdG8gY2hhaW4gY3VzdG9tIGFuaW1hdGlvbi5cbiAgICAgKiBBeC5tb3ZlKC4uLikucGlwZShteUFuaW1hdGlvbigpKTtcbiAgICAgKi9cbiAgICBwaXBlKGRvd25zdHJlYW06IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiBjb21iaW5lMih0aGlzLCBkb3duc3RyZWFtKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkZWxpdmVycyB1cHN0cmVhbSBldmVudHMgdG8gJ3RoaXMnIGZpcnN0LCB0aGVuIHdoZW4gJ3RoaXMnIGFuaW1hdGlvbiBpcyBmaW5pc2hlZFxuICAgICAqIHRoZSB1cHN0cmVhbSBpcyBzd2l0Y2hlZCB0byB0aGUgdGhlIGZvbGxvd2VyIGFuaW1hdGlvbi5cbiAgICAgKiBUaGlzIGFsbG93cyB5b3UgdG8gc2VxdWVuY2UgYW5pbWF0aW9ucyB0ZW1wb3JhbGx5LlxuICAgICAqIGZyYW1lMUFuaW1hdGlvbigpLnRoZW4oZnJhbWUyQW5pbWF0aW9uKS50aGVuKGZyYW1lM0FuaW1hdGlvbilcbiAgICAgKi9cbiAgICB0aGVuKGZvbGxvd2VyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IERyYXdTdHJlYW0pIDogRHJhd1N0cmVhbSB7XG4gICAgICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uIChvYnNlcnZlcikge1xuICAgICAgICAgICAgICAgIHZhciBmaXJzdCAgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kID0gbmV3IFJ4LlN1YmplY3Q8RHJhd1RpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RUdXJuID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50ID0gZmlyc3Q7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogYXR0YWNoXCIpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZEF0dGFjaCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RBdHRhY2ggID0gc2VsZi5hdHRhY2goZmlyc3Quc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGZpcnN0IGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUdXJuID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaCA9IGZvbGxvd2VyLmF0dGFjaChzZWNvbmQuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcHJldlN1YnNjcmlwdGlvbiA9IHByZXYuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSB0byBmaXJzdCBPUiBzZWNvbmRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlyc3RUdXJuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3Qub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmQub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIC8vIG9uIGRpc3Bvc2VcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBkaXNwb3NlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0QXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlY29uZEF0dGFjaClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpOyAvL3RvZG8gcmVtb3ZlIHN1YnNjcmliZU9uc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhbmltYXRpb24gdGhhdCByZXBsYXlzIHRoZSBpbm5lciBhbmltYXRpb24gZWFjaCB0aW1lIHRoZSBpbm5lciBhbmltYXRpb24gY29tcGxldGVzLlxuICAgICAqIFRoZSByZXN1bHRhbnQgYW5pbWF0aW9uIGlzIGFsd2F5cyBydW5zIGZvcmV2ZXIgd2hpbGUgdXBzdHJlYW0gaXMgbGl2ZS4gT25seSBhIHNpbmdsZSBpbm5lciBhbmltYXRpb25cbiAgICAgKiBwbGF5cyBhdCBhIHRpbWUgKHVubGlrZSBlbWl0KCkpXG4gICAgICovXG4gICAgbG9vcChpbm5lcjogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShsb29wKGlubmVyKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYW5pbWF0aW9uIHRoYXQgc2VxdWVuY2VzIHRoZSBpbm5lciBhbmltYXRpb24gZXZlcnkgdGltZSBmcmFtZVxuICAgICAqIFRoZSByZXN1bHRhbnQgYW5pbWF0aW9uIGlzIGFsd2F5cyBydW5zIGZvcmV2ZXIgd2hpbGUgdXBzdHJlYW0gaXMgbGl2ZS4gTXVsdGlwbGUgaW5uZXIgYW5pbWF0aW9uc1xuICAgICAqIGNhbiBiZSBwbGF5aW5nIGF0IHRoZSBzYW1lIHRpbWUgKHVubGlrZSBsb29wKVxuICAgICAqL1xuICAgIGVtaXQoaW5uZXI6IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZW1pdChpbm5lcikpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBsYXlzIGFsbCB0aGUgaW5uZXIgYW5pbWF0aW9ucyBhdCB0aGUgc2FtZSB0aW1lLiBQYXJhbGxlbCBjb21wbGV0ZXMgd2hlbiBhbGwgaW5uZXIgYW5pbWF0aW9ucyBhcmUgb3Zlci5cbiAgICAgKiBUaGUgY2FudmFzIHN0YXRlcyBhcmUgcmVzdG9yZWQgZWFjaCB0aW1lLCBzbyBzdHlsaW5nIGFuZCB0cmFuc2Zvcm1zIG9mIGRpZmZlcmVudCBhbmltYXRpb25zIGRvIG5vdFxuICAgICAqIGFmZmVjdCBlYWNoIG90aGVyIChhbHRob3VnaCBvYnN2aW91c2x5IHRoZSBwaXhlbCBidWZmZXIgaXMgYWZmZWN0ZWQgYnkgZWFjaCBhbmltYXRpb24pXG4gICAgICovXG4gICAgcGFyYWxsZWwoaW5uZXJfYW5pbWF0aW9uczogUnguT2JzZXJ2YWJsZTxBbmltYXRpb24+IHwgQW5pbWF0aW9uW10pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHBhcmFsbGVsKGlubmVyX2FuaW1hdGlvbnMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXF1ZW5jZXMgbiBjb3BpZXMgb2YgdGhlIGlubmVyIGFuaW1hdGlvbi4gQ2xvbmUgY29tcGxldGVzIHdoZW4gYWxsIGlubmVyIGFuaW1hdGlvbnMgYXJlIG92ZXIuXG4gICAgICovXG4gICAgY2xvbmUobjogbnVtYmVyLCBpbm5lcjogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShjbG9uZShuLCBpbm5lcikpO1xuICAgIH1cblxuICAgIHR3ZWVuX2xpbmVhcihcbiAgICAgICAgZnJvbTogUG9pbnRBcmcsXG4gICAgICAgIHRvOiAgIFBvaW50QXJnLFxuICAgICAgICB0aW1lOiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHR3ZWVuX2xpbmVhcihmcm9tLCB0bywgdGltZSkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYW5pbWF0aW9uIHRoYXQgaXMgYXQgbW9zdCBuIGZyYW1lcyBmcm9tICd0aGlzJy5cbiAgICAgKi9cbiAgICB0YWtlKGZyYW1lczogbnVtYmVyKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh0YWtlKGZyYW1lcykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGhlbHBlciBtZXRob2QgZm9yIGltcGxlbWVudGluZyBzaW1wbGUgYW5pbWF0aW9ucyAodGhhdCBkb24ndCBmb3JrIHRoZSBhbmltYXRpb24gdHJlZSkuXG4gICAgICogWW91IGp1c3QgaGF2ZSB0byBzdXBwbHkgYSBmdW5jdGlvbiB0aGF0IGRvZXMgc29tZXRoaW5nIHdpdGggdGhlIGRyYXcgdGljay5cbiAgICAgKi9cbiAgICBkcmF3KGRyYXdGYWN0b3J5OiAoKSA9PiAoKHRpY2s6IERyYXdUaWNrKSA9PiB2b2lkKSk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZHJhdyhkcmF3RmFjdG9yeSkpO1xuICAgIH1cblxuICAgIC8vIENhbnZhcyBBUElcbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciB0cmFuc2xhdGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgdHJhbnNsYXRlKHBvc2l0aW9uOiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodHJhbnNsYXRlKHBvc2l0aW9uKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHN0cm9rZVN0eWxlIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHN0cm9rZVN0eWxlKGNvbG9yOiBDb2xvckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoc3Ryb2tlU3R5bGUoY29sb3IpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgZmlsbFN0eWxlIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGZpbGxTdHlsZShjb2xvcjogQ29sb3JBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGZpbGxTdHlsZShjb2xvcikpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBmaWxsUmVjdCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBmaWxsUmVjdCh4eTogUG9pbnRBcmcsIHdpZHRoX2hlaWdodDogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGZpbGxSZWN0KHh5LCB3aWR0aF9oZWlnaHQpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRW5jbG9zZXMgdGhlIGlubmVyIGFuaW1hdGlvbiB3aXRoIGEgYmVnaW5wYXRoKCkgYW5kIGVuZHBhdGgoKSBmcm9tIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHdpdGhpblBhdGgoaW5uZXI6IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUod2l0aGluUGF0aChpbm5lcikpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBtb3ZlVG8gaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgbW92ZVRvKHh5OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUobW92ZVRvKHh5KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGxpbmVUbyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAgICAgKi9cbiAgICBsaW5lVG8oeHk6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShsaW5lVG8oeHkpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc3Ryb2tlIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHN0cm9rZSgpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHN0cm9rZSgpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBnbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uKG9wZXJhdGlvbjogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShnbG9iYWxDb21wb3NpdGVPcGVyYXRpb24ob3BlcmF0aW9uKSk7XG4gICAgfVxuICAgIC8vIEVuZCBDYW52YXMgQVBJXG5cblxuICAgIC8qKlxuICAgICAqIHRyYW5zbGF0ZXMgdGhlIGRyYXdpbmcgY29udGV4dCBieSB2ZWxvY2l0eSAqIHRpY2suY2xvY2tcbiAgICAgKi9cbiAgICB2ZWxvY2l0eSh2ZWN0b3I6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh2ZWxvY2l0eSh2ZWN0b3IpKTtcbiAgICB9XG5cbiAgICBnbG93KGRlY2F5OiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGdsb3coZGVjYXkpKTtcbiAgICB9XG5cbn1cblxuZXhwb3J0IGNsYXNzIEFuaW1hdG9yIHtcbiAgICB0aWNrZXJTdWJzY3JpcHRpb246IFJ4LkRpc3Bvc2FibGUgPSBudWxsO1xuICAgIHJvb3Q6IFJ4LlN1YmplY3Q8RHJhd1RpY2s+O1xuICAgIGFuaW1hdGlvblN1YnNjcmlwdGlvbnM6IFJ4LklEaXNwb3NhYmxlW10gPSBbXTtcbiAgICB0OiBudW1iZXIgPSAwO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKSB7XG4gICAgICAgIHRoaXMucm9vdCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpXG4gICAgfVxuICAgIHRpY2tlcih0aWNrOiBSeC5PYnNlcnZhYmxlPG51bWJlcj4pOiB2b2lkIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIHRoaXMudGlja2VyU3Vic2NyaXB0aW9uID0gdGljay5tYXAoZnVuY3Rpb24oZHQ6IG51bWJlcikgeyAvL21hcCB0aGUgdGlja2VyIG9udG8gYW55IC0+IGNvbnRleHRcbiAgICAgICAgICAgIHZhciB0aWNrID0gbmV3IERyYXdUaWNrKHNlbGYuY3R4LCBzZWxmLnQsIGR0KTtcbiAgICAgICAgICAgIHNlbGYudCArPSBkdDtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KS5zdWJzY3JpYmUodGhpcy5yb290KTtcbiAgICB9XG4gICAgcGxheSAoYW5pbWF0aW9uOiBBbmltYXRpb24pOiB2b2lkIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IHBsYXlcIik7XG4gICAgICAgIHZhciBzYXZlQmVmb3JlRnJhbWUgPSB0aGlzLnJvb3QudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggc2F2ZVwiKTtcbiAgICAgICAgICAgIHRpY2suY3R4LnNhdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBkb0FuaW1hdGlvbiA9IGFuaW1hdGlvbi5hdHRhY2goc2F2ZUJlZm9yZUZyYW1lKTtcbiAgICAgICAgdmFyIHJlc3RvcmVBZnRlckZyYW1lID0gZG9BbmltYXRpb24udGFwKFxuICAgICAgICAgICAgZnVuY3Rpb24odGljayl7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggbmV4dCByZXN0b3JlXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0sZnVuY3Rpb24oZXJyKXtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBlcnIgcmVzdG9yZVwiLCBlcnIpO1xuICAgICAgICAgICAgICAgIHNlbGYuY3R4LnJlc3RvcmUoKTtcbiAgICAgICAgICAgIH0sZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBzZWxmLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hbmltYXRpb25TdWJzY3JpcHRpb25zLnB1c2goXG4gICAgICAgICAgICByZXN0b3JlQWZ0ZXJGcmFtZS5zdWJzY3JpYmUoKVxuICAgICAgICApO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIE5PVEU6IGN1cnJlbnRseSBmYWlscyBpZiB0aGUgc3RyZWFtcyBhcmUgZGlmZmVyZW50IGxlbmd0aHNcbiAqIEBwYXJhbSBleHBlY3RlZER0IHRoZSBleHBlY3RlZCBjbG9jayB0aWNrIHZhbHVlc1xuICogQHBhcmFtIGFmdGVyXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RHQoZXhwZWN0ZWREdDogUnguT2JzZXJ2YWJsZTxudW1iZXI+LCBhZnRlcj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnppcChleHBlY3RlZER0LCBmdW5jdGlvbih0aWNrOiBEcmF3VGljaywgZXhwZWN0ZWREdFZhbHVlOiBudW1iZXIpIHtcbiAgICAgICAgICAgIGlmICh0aWNrLmR0ICE9IGV4cGVjdGVkRHRWYWx1ZSkgdGhyb3cgbmV3IEVycm9yKFwidW5leHBlY3RlZCBkdCBvYnNlcnZlZDogXCIgKyB0aWNrLmR0ICsgXCIsIGV4cGVjdGVkOlwiICsgZXhwZWN0ZWREdFZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KTtcbiAgICB9LCBhZnRlcik7XG59XG5cbi8vdG9kbyB3b3VsZCBiZSBuaWNlIGlmIHRoaXMgdG9vayBhbiBpdGVyYWJsZSBvciBzb21lIG90aGVyIHR5cGUgb2Ygc2ltcGxlIHB1bGwgc3RyZWFtXG4vLyBhbmQgdXNlZCBzdHJlYW1FcXVhbHNcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRDbG9jayhhc3NlcnRDbG9jazogbnVtYmVyW10sIGFmdGVyPzogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgaW5kZXggPSAwO1xuXG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnRhcE9uTmV4dChmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFzc2VydENsb2NrOiBcIiwgdGljayk7XG4gICAgICAgICAgICBpZiAodGljay5jbG9jayA8IGFzc2VydENsb2NrW2luZGV4XSAtIDAuMDAwMDEgfHwgdGljay5jbG9jayA+IGFzc2VydENsb2NrW2luZGV4XSArIDAuMDAwMDEpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3JNc2cgPSBcInVuZXhwZWN0ZWQgY2xvY2sgb2JzZXJ2ZWQ6IFwiICsgdGljay5jbG9jayArIFwiLCBleHBlY3RlZDpcIiArIGFzc2VydENsb2NrW2luZGV4XVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yTXNnKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5kZXggKys7XG4gICAgICAgIH0pO1xuICAgIH0sIGFmdGVyKTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IEFuaW1hdGlvbiBieSBwaXBpbmcgdGhlIGFuaW1hdGlvbiBmbG93IG9mIEEgaW50byBCXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5lMihhOiBBbmltYXRpb24sIGI6IEFuaW1hdGlvbikge1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKFxuICAgICAgICAodXBzdHJlYW06IERyYXdTdHJlYW0pID0+IHtcbiAgICAgICAgICAgIHJldHVybiBiLmF0dGFjaChhLmF0dGFjaCh1cHN0cmVhbSkpO1xuICAgICAgICB9XG4gICAgKTtcbn1cblxuLyoqXG4gKiBwbGF5cyBzZXZlcmFsIGFuaW1hdGlvbnMsIGZpbmlzaGVzIHdoZW4gdGhleSBhcmUgYWxsIGRvbmUuXG4gKiBAcGFyYW0gYW5pbWF0aW9uc1xuICogQHJldHVybnMge0FuaW1hdGlvbn1cbiAqIHRvZG86IEkgdGhpbmsgdGhlcmUgYXJlIGxvdHMgb2YgYnVncyB3aGVuIGFuIGFuaW1hdGlvbiBzdG9wcyBwYXJ0IHdheVxuICogSSB0aGluayBpdCBiZSBiZXR0ZXIgaWYgdGhpcyBzcGF3bmVkIGl0cyBvd24gQW5pbWF0b3IgdG8gaGFuZGxlIGN0eCByZXN0b3Jlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyYWxsZWwoXG4gICAgYW5pbWF0aW9uczogUnguT2JzZXJ2YWJsZTxBbmltYXRpb24+IHwgQW5pbWF0aW9uW11cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2OiBEcmF3U3RyZWFtKTogRHJhd1N0cmVhbSB7XG4gICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBpbml0aWFsaXppbmdcIik7XG5cbiAgICAgICAgdmFyIGFjdGl2ZUFuaW1hdGlvbnMgPSAwO1xuICAgICAgICB2YXIgYXR0YWNoUG9pbnQgPSBuZXcgUnguU3ViamVjdDxEcmF3VGljaz4oKTtcblxuICAgICAgICBmdW5jdGlvbiBkZWNyZW1lbnRBY3RpdmUoKSB7XG4gICAgICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJwYXJhbGxlbDogZGVjcmVtZW50IGFjdGl2ZVwiKTtcbiAgICAgICAgICAgIGFjdGl2ZUFuaW1hdGlvbnMgLS07XG4gICAgICAgIH1cblxuICAgICAgICBhbmltYXRpb25zLmZvckVhY2goZnVuY3Rpb24oYW5pbWF0aW9uOiBBbmltYXRpb24pIHtcbiAgICAgICAgICAgIGFjdGl2ZUFuaW1hdGlvbnMrKztcbiAgICAgICAgICAgIGFuaW1hdGlvbi5hdHRhY2goYXR0YWNoUG9pbnQudGFwT25OZXh0KHRpY2sgPT4gdGljay5jdHguc2F2ZSgpKSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICB0aWNrID0+IHRpY2suY3R4LnJlc3RvcmUoKSxcbiAgICAgICAgICAgICAgICBkZWNyZW1lbnRBY3RpdmUsXG4gICAgICAgICAgICAgICAgZGVjcmVtZW50QWN0aXZlKVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcHJldi50YWtlV2hpbGUoKCkgPT4gYWN0aXZlQW5pbWF0aW9ucyA+IDApLnRhcE9uTmV4dChmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBlbWl0dGluZywgYW5pbWF0aW9uc1wiLCB0aWNrKTtcbiAgICAgICAgICAgICAgICBhdHRhY2hQb2ludC5vbk5leHQodGljayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGVtaXR0aW5nIGZpbmlzaGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xvbmUoXG4gICAgbjogbnVtYmVyLCAvLyB0b2RvIG1ha2UgZHluYW1pY1xuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBwYXJhbGxlbChSeC5PYnNlcnZhYmxlLnJldHVybihhbmltYXRpb24pLnJlcGVhdChuKSk7XG59XG5cbi8qKlxuICogVGhlIGNoaWxkIGFuaW1hdGlvbiBpcyBzdGFydGVkIGV2ZXJ5IGZyYW1lXG4gKiBAcGFyYW0gYW5pbWF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbWl0KFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJlbWl0OiBpbml0aWFsaXppbmdcIik7XG4gICAgICAgIHZhciBhdHRhY2hQb2ludCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgIHJldHVybiBwcmV2LnRhcE9uTmV4dChmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcImVtaXQ6IGVtbWl0dGluZ1wiLCBhbmltYXRpb24pO1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5hdHRhY2goYXR0YWNoUG9pbnQpLnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIGF0dGFjaFBvaW50Lm9uTmV4dCh0aWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIFdoZW4gdGhlIGNoaWxkIGxvb3AgZmluaXNoZXMsIGl0IGlzIHNwYXduZWRcbiAqIEBwYXJhbSBhbmltYXRpb25cbiAqIEByZXR1cm5zIHtBbmltYXRpb259XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb29wKFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogRHJhd1N0cmVhbSk6IERyYXdTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBpbml0aWFsaXppbmdcIik7XG5cblxuICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8RHJhd1RpY2s+KGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBjcmVhdGUgbmV3IGxvb3BcIik7XG4gICAgICAgICAgICB2YXIgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBsb29wU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICAgICAgICAgIHZhciB0ID0gMDtcblxuICAgICAgICAgICAgZnVuY3Rpb24gYXR0YWNoTG9vcChuZXh0KSB7IC8vdG9kbyBJIGZlZWwgbGlrZSB3ZSBjYW4gcmVtb3ZlIGEgbGV2ZWwgZnJvbSB0aGlzIHNvbWVob3dcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBuZXcgaW5uZXIgbG9vcCBzdGFydGluZyBhdFwiLCB0KTtcblxuICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG5ldyBSeC5TdWJqZWN0PERyYXdUaWNrPigpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN1YnNjcmlwdGlvbiA9IGFuaW1hdGlvbi5hdHRhY2gobG9vcFN0YXJ0KS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCBlcnIgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBwb3N0LWlubmVyIGNvbXBsZXRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIGZpbmlzaGVkIGNvbnN0cnVjdGlvblwiKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmV2LnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbm8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaExvb3AobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogdXBzdHJlYW0gdG8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0Lm9uTmV4dChuZXh0KTtcblxuICAgICAgICAgICAgICAgICAgICB0ICs9IG5leHQuZHQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSBlcnJvciB0byBkb3duc3RyZWFtXCIsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkLmJpbmQob2JzZXJ2ZXIpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy9kaXNwb3NlXG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogZGlzcG9zZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAobG9vcFN0YXJ0KSBsb29wU3RhcnQuZGlzcG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXcoXG4gICAgZHJhd0ZhY3Rvcnk6ICgpID0+ICgodGljazogRHJhd1RpY2spID0+IHZvaWQpLFxuICAgIGFmdGVyPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldmlvdXM6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIGRyYXc6ICh0aWNrOiBEcmF3VGljaykgPT4gdm9pZCA9IGRyYXdGYWN0b3J5KCk7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy50YXBPbk5leHQoZHJhdyk7XG4gICAgfSwgYWZ0ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlKFxuICAgIGRlbHRhOiBQb2ludEFyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zbGF0ZTogYXR0YWNoZWRcIik7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHZhciBwb2ludF9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZGVsdGEpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvaW50ID0gcG9pbnRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidHJhbnNsYXRlOlwiLCBwb2ludCk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgudHJhbnNsYXRlKHBvaW50WzBdLCBwb2ludFsxXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAsIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnbG9iYWxDb21wb3NpdGVPcGVyYXRpb24oXG4gICAgY29tcG9zaXRlX21vZGU6IHN0cmluZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgdGljay5jdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gY29tcG9zaXRlX21vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAsIGFuaW1hdGlvbik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHZlbG9jaXR5KFxuICAgIHZlbG9jaXR5OiBQb2ludEFyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInZlbG9jaXR5OiBhdHRhY2hlZFwiKTtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHBvczogUG9pbnQgPSBbMC4wLDAuMF07XG4gICAgICAgICAgICB2YXIgdmVsb2NpdHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHZlbG9jaXR5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odGljaykge1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCBwb3NbMF0sIHBvc1sxXSk7XG4gICAgICAgICAgICAgICAgdmFyIHZlbG9jaXR5ID0gdmVsb2NpdHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBwb3NbMF0gKz0gdmVsb2NpdHlbMF0gKiB0aWNrLmR0O1xuICAgICAgICAgICAgICAgIHBvc1sxXSArPSB2ZWxvY2l0eVsxXSAqIHRpY2suZHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2Vlbl9saW5lYXIoXG4gICAgZnJvbTogUG9pbnRBcmcsXG4gICAgdG86ICAgUG9pbnRBcmcsXG4gICAgdGltZTogTnVtYmVyQXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvbiAvKiBjb3BpZXMgKi9cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICB2YXIgZnJvbV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZnJvbSkuaW5pdCgpO1xuICAgICAgICB2YXIgdG9fbmV4dCAgID0gUGFyYW1ldGVyLmZyb20odG8pLmluaXQoKTtcbiAgICAgICAgdmFyIHRpbWVfbmV4dCAgID0gUGFyYW1ldGVyLmZyb20odGltZSkuaW5pdCgpO1xuICAgICAgICByZXR1cm4gcHJldi5tYXAoZnVuY3Rpb24odGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0d2VlbjogaW5uZXJcIik7XG4gICAgICAgICAgICB2YXIgZnJvbSA9IGZyb21fbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgIHZhciB0byAgID0gdG9fbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgIHZhciB0aW1lID0gdGltZV9uZXh0KHRpY2suY2xvY2spO1xuXG4gICAgICAgICAgICB0ID0gdCArIHRpY2suZHQ7XG4gICAgICAgICAgICBpZiAodCA+IHRpbWUpIHQgPSB0aW1lO1xuICAgICAgICAgICAgdmFyIHggPSBmcm9tWzBdICsgKHRvWzBdIC0gZnJvbVswXSkgKiB0IC8gdGltZTtcbiAgICAgICAgICAgIHZhciB5ID0gZnJvbVsxXSArICh0b1sxXSAtIGZyb21bMV0pICogdCAvIHRpbWU7XG4gICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgeCwgeSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSkudGFrZVdoaWxlKGZ1bmN0aW9uKHRpY2spIHtyZXR1cm4gdCA8IHRpbWU7fSlcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsbFJlY3QoXG4gICAgeHk6IFBvaW50QXJnLFxuICAgIHdpZHRoX2hlaWdodDogUG9pbnRBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFJlY3Q6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB4eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHdpZHRoX2hlaWdodCkuaW5pdCgpO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5OiBQb2ludCA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodDogUG9pbnQgPSB3aWR0aF9oZWlnaHRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFJlY3Q6IGZpbGxSZWN0XCIsIHh5LCB3aWR0aF9oZWlnaHQpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxSZWN0KHh5WzBdLCB4eVsxXSwgd2lkdGhfaGVpZ2h0WzBdLCB3aWR0aF9oZWlnaHRbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGZpbGxTdHlsZShcbiAgICBjb2xvcjogQ29sb3JBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFN0eWxlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgY29sb3JfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGNvbG9yKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gY29sb3JfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFN0eWxlOiBmaWxsU3R5bGVcIiwgY29sb3IpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Ryb2tlU3R5bGUoXG4gICAgY29sb3I6IENvbG9yQXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZVN0eWxlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgY29sb3JfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGNvbG9yKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gY29sb3JfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlU3R5bGU6IHN0cm9rZVN0eWxlXCIsIGNvbG9yKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zdHJva2VTdHlsZSA9IGNvbG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhpblBhdGgoXG4gICAgaW5uZXI6IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihcbiAgICAgICAgKHVwc3RyZWFtOiBEcmF3U3RyZWFtKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwid2l0aGluUGF0aDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGJlZ2luUGF0aEJlZm9yZUlubmVyID0gdXBzdHJlYW0udGFwT25OZXh0KCh0aWNrOiBEcmF3VGljaykgPT4gdGljay5jdHguYmVnaW5QYXRoKCkpO1xuICAgICAgICAgICAgcmV0dXJuIGlubmVyLmF0dGFjaChiZWdpblBhdGhCZWZvcmVJbm5lcikudGFwT25OZXh0KCh0aWNrOiBEcmF3VGljaykgPT4gdGljay5jdHguY2xvc2VQYXRoKCkpXG4gICAgICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW92ZVRvKFxuICAgIHh5OiBQb2ludEFyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJtb3ZlVG86IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB4eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHkgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJtb3ZlVG86IG1vdmVUb1wiLCB4eSk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgubW92ZVRvKHh5WzBdLCB4eVsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5lVG8oXG4gICAgeHk6IFBvaW50QXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVUbzogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eSA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVUbzogbGluZVRvXCIsIHh5KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5saW5lVG8oeHlbMF0sIHh5WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzdHJva2UoXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZTogc3Ryb2tlXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnN0cm9rZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGluZVdpZHRoKFxuICAgIHdpZHRoOiBOdW1iZXJBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZVdpZHRoOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgd2lkdGhfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHdpZHRoKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoID0gd2lkdGhfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZVdpZHRoOiBsaW5lV2lkdGhcIiwgd2lkdGgpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmxpbmVXaWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG4vLyBmb3JlZ3JvdW5kIGNvbG9yIHVzZWQgdG8gZGVmaW5lIGVtbWl0dGVyIHJlZ2lvbnMgYXJvdW5kIHRoZSBjYW52YXNcbi8vICB0aGUgaHVlLCBpcyByZXVzZWQgaW4gdGhlIHBhcnRpY2xlc1xuLy8gIHRoZSBsaWdodG5lc3MgaXMgdXNlIHRvIGRlc2NyaWJlIHRoZSBxdWFudGl0eSAobWF4IGxpZ2h0bmVzcyBsZWFkcyB0byB0b3RhbCBzYXR1cmF0aW9uKVxuLy9cbi8vIHRoZSBhZGRpdGlvbmFsIHBhcmFtZXRlciBpbnRlc2l0eSBpcyB1c2VkIHRvIHNjYWxlIHRoZSBlbW1pdGVyc1xuLy8gZ2VuZXJhbGx5IHRoZSBjb2xvcnMgeW91IHBsYWNlIG9uIHRoZSBtYXAgd2lsbCBiZSBleGNlZWRlZCBieSB0aGUgc2F0dXJhdGlvblxuLy9cbi8vIEhvdyBhcmUgdHdvIGRpZmZlcmVudCBodWVzIHNlbnNpYmx5IG1peGVkXG5cbi8vIGRlY2F5IG9mIDAuNVxuLy9cbi8vICAgICAgIEhcbi8vIDEgMiA0IDkgNCAyIDEgICAgICAgLy9zYXQsIGFsc28gYWxwaGFcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gICAgICAgICAxIDIgNCAyIDEgICAvL3NhdFxuLy8gICAgICAgICAgICAgSDJcbi8vXG4vLyB3ZSBhZGQgdGhlIGNvbnRyaWJ1dGlvbiB0byBhbiBpbWFnZSBzaXplZCBhY2N1bXVsYXRvclxuLy8gYXMgdGhlIGNvbnRyaWJ1dGlvbnMgbmVlZCB0byBzdW0gcGVybXV0YXRpb24gaW5kZXBlbmRlbnRseSAoYWxzbyBwcm9iYWJseSBhc3NvY2lhdGl2ZSlcbi8vIGJsZW5kKHJnYmExLCByZ2JhMikgPSBibGVuZChyZ2JhMixyZ2JhMSlcbi8vIGFscGhhID0gYTEgKyBhMiAtIGExYTJcbi8vIGlmIGExID0gMSAgIGFuZCBhMiA9IDEsICAgYWxwaGEgPSAxICAgICAgICAgPSAxXG4vLyBpZiBhMSA9IDAuNSBhbmQgYTIgPSAxLCAgIGFscGhhID0gMS41IC0gMC41ID0gMVxuLy8gaWYgYTEgPSAwLjUgYW5kIGEyID0gMC41LCBhbHBoYSA9IDEgLSAwLjI1ICA9IDAuNzVcblxuLy8gTm9ybWFsIGJsZW5kaW5nIGRvZXNuJ3QgY29tbXV0ZTpcbi8vIHJlZCA9IChyMSAqIGExICArIChyMiAqIGEyKSAqICgxIC0gYTEpKSAvIGFscGhhXG5cbi8vIGxpZ2h0ZW4gZG9lcywgd2hpY2ggaXMganVzdCB0aGUgbWF4XG4vLyByZWQgPSBtYXgocjEsIHIyKVxuLy8gb3IgYWRkaXRpb24gcmVkID0gcjEgKyByMlxuLy8gaHR0cDovL3d3dy5kZWVwc2t5Y29sb3JzLmNvbS9hcmNoaXZlLzIwMTAvMDQvMjEvZm9ybXVsYXMtZm9yLVBob3Rvc2hvcC1ibGVuZGluZy1tb2Rlcy5odG1sXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdsb3coXG4gICAgZGVjYXk6IE51bWJlckFyZyA9IDAuMSxcbiAgICBhZnRlciA/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgZGVjYXlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGRlY2F5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN0eCA9IHRpY2suY3R4O1xuXG4gICAgICAgICAgICAgICAgLy8gb3VyIHNyYyBwaXhlbCBkYXRhXG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoID0gY3R4LmNhbnZhcy53aWR0aDtcbiAgICAgICAgICAgICAgICB2YXIgaGVpZ2h0ID0gY3R4LmNhbnZhcy5oZWlnaHQ7XG4gICAgICAgICAgICAgICAgdmFyIHBpeGVscyA9IHdpZHRoICogaGVpZ2h0O1xuICAgICAgICAgICAgICAgIHZhciBpbWdEYXRhID0gY3R4LmdldEltYWdlRGF0YSgwLDAsd2lkdGgsaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGltZ0RhdGEuZGF0YTtcbiAgICAgICAgICAgICAgICB2YXIgZGVjYXkgPSBkZWNheV9uZXh0KHRpY2suY2xvY2spO1xuXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJvcmlnaW5hbCBkYXRhXCIsIGltZ0RhdGEuZGF0YSlcblxuICAgICAgICAgICAgICAgIC8vIG91ciB0YXJnZXQgZGF0YVxuICAgICAgICAgICAgICAgIC8vIHRvZG8gaWYgd2UgdXNlZCBhIFR5cGVkIGFycmF5IHRocm91Z2hvdXQgd2UgY291bGQgc2F2ZSBzb21lIHplcm9pbmcgYW5kIG90aGVyIGNyYXBweSBjb252ZXJzaW9uc1xuICAgICAgICAgICAgICAgIC8vIGFsdGhvdWdoIGF0IGxlYXN0IHdlIGFyZSBjYWxjdWxhdGluZyBhdCBhIGhpZ2ggYWNjdXJhY3ksIGxldHMgbm90IGRvIGEgYnl0ZSBhcnJheSBmcm9tIHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgICB2YXIgZ2xvd0RhdGE6IG51bWJlcltdID0gbmV3IEFycmF5PG51bWJlcj4ocGl4ZWxzKjQpO1xuXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwaXhlbHMgKiA0OyBpKyspIGdsb3dEYXRhW2ldID0gMDtcblxuICAgICAgICAgICAgICAgIC8vIHBhc3NiYWNrIHRvIGF2b2lkIGxvdHMgb2YgYXJyYXkgYWxsb2NhdGlvbnMgaW4gcmdiVG9Ic2wsIGFuZCBoc2xUb1JnYiBjYWxsc1xuICAgICAgICAgICAgICAgIHZhciBoc2w6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSA9IFswLDAsMF07XG4gICAgICAgICAgICAgICAgdmFyIHJnYjogW251bWJlciwgbnVtYmVyLCBudW1iZXJdID0gWzAsMCwwXTtcblxuICAgICAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSB0aGUgY29udHJpYnV0aW9uIG9mIGVhY2ggZW1taXR0ZXIgb24gdGhlaXIgc3Vycm91bmRzXG4gICAgICAgICAgICAgICAgZm9yKHZhciB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVkICAgPSBkYXRhWygod2lkdGggKiB5KSArIHgpICogNF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ3JlZW4gPSBkYXRhWygod2lkdGggKiB5KSArIHgpICogNCArIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJsdWUgID0gZGF0YVsoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhbHBoYSA9IGRhdGFbKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgM107XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29udmVydCB0byBoc2xcbiAgICAgICAgICAgICAgICAgICAgICAgIHJnYlRvSHNsKHJlZCwgZ3JlZW4sIGJsdWUsIGhzbCk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaHVlID0gaHNsWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHF0eSA9IGhzbFsxXTsgLy8gcXR5IGRlY2F5c1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2FsX2RlY2F5ID0gaHNsWzJdICsgMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2Ugb25seSBuZWVkIHRvIGNhbGN1bGF0ZSBhIGNvbnRyaWJ1dGlvbiBuZWFyIHRoZSBzb3VyY2VcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnRyaWJ1dGlvbiA9IHF0eSBkZWNheWluZyBieSBpbnZlcnNlIHNxdWFyZSBkaXN0YW5jZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYyA9IHEgLyAoZF4yICogayksIHdlIHdhbnQgdG8gZmluZCB0aGUgYyA8IDAuMDEgcG9pbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIDAuMDEgPSBxIC8gKGReMiAqIGspID0+IGReMiA9IHEgLyAoMC4wMSAqIGspXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBkID0gc3FydCgxMDAgKiBxIC8gaykgKG5vdGUgMiBzb2x1dGlvbnMsIHJlcHJlc2VudGluZyB0aGUgdHdvIGhhbGZ3aWR0aHMpXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFsZndpZHRoID0gTWF0aC5zcXJ0KDEwMDAgKiBxdHkgLyAoZGVjYXkgKiBsb2NhbF9kZWNheSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFsZndpZHRoICo9IDEwMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsaSA9IE1hdGgubWF4KDAsIE1hdGguZmxvb3IoeCAtIGhhbGZ3aWR0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVpID0gTWF0aC5taW4od2lkdGgsIE1hdGguY2VpbCh4ICsgaGFsZndpZHRoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGogPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHkgLSBoYWxmd2lkdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1aiA9IE1hdGgubWluKGhlaWdodCwgTWF0aC5jZWlsKHkgKyBoYWxmd2lkdGgpKTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGogPSBsajsgaiA8IHVqOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSBsaTsgaSA8IHVpOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGR4ID0gaSAtIHg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkeSA9IGogLSB5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZF9zcXVhcmVkID0gZHggKiBkeCArIGR5ICogZHk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYyBpcyBpbiB0aGUgc2FtZSBzY2FsZSBhdCBxdHkgaS5lLiAoMCAtIDEwMCwgc2F0dXJhdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGMgPSAocXR5KSAvICgxLjAwMDEgKyBNYXRoLnNxcnQoZF9zcXVhcmVkKSAqIGRlY2F5ICogbG9jYWxfZGVjYXkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChjIDw9IDEwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChjID49IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZ2IgPSBoc2xUb1JnYihodWUsIDUwLCBjLCByZ2IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZ2IgPSBodXNsLnRvUkdCKGh1ZSwgNTAsIGMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2ZvciAodmFyIGh1c2xpID0gMDsgaHVzbGk8IDM7IGh1c2xpKyspIHJnYiBbaHVzbGldICo9IDI1NTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNfYWxwaGEgPSBjIC8gMTAwLjA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJfaSA9ICgod2lkdGggKiBqKSArIGkpICogNDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdfaSA9ICgod2lkdGggKiBqKSArIGkpICogNCArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiX2kgPSAoKHdpZHRoICogaikgKyBpKSAqIDQgKyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYV9pID0gKCh3aWR0aCAqIGopICsgaSkgKiA0ICsgMztcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInJnYlwiLCByZ2IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImNcIiwgYyk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcmVfYWxwaGEgPSBnbG93RGF0YVthX2ldO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGNfYWxwaGEgPD0gMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChjX2FscGhhID49IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQocHJlX2FscGhhIDw9IDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQocHJlX2FscGhhID49IDApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJsZW5kIGFscGhhIGZpcnN0IGludG8gYWNjdW11bGF0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ2xvd0RhdGFbYV9pXSA9IGdsb3dEYXRhW2FfaV0gKyBjX2FscGhhIC0gY19hbHBoYSAqIGdsb3dEYXRhW2FfaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdsb3dEYXRhW2FfaV0gPSBNYXRoLm1heChnbG93RGF0YVthX2ldLCBjX2FscGhhKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVthX2ldID0gMTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbYV9pXSA8PSAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW2FfaV0gPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVtyX2ldIDw9IDI1NSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVtyX2ldID49IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbZ19pXSA8PSAyNTUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbZ19pXSA+PSAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW2JfaV0gPD0gMjU1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW2JfaV0gPj0gMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbcl9pXSA9IChwcmVfYWxwaGEgKyByZ2JbMF0vIDI1NS4wIC0gY19hbHBoYSAqIHJnYlswXS8gMjU1LjApICogMjU1O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtnX2ldID0gKHByZV9hbHBoYSArIHJnYlsxXS8gMjU1LjAgLSBjX2FscGhhICogcmdiWzFdLyAyNTUuMCkgKiAyNTU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2JfaV0gPSAocHJlX2FscGhhICsgcmdiWzJdLyAyNTUuMCAtIGNfYWxwaGEgKiByZ2JbMl0vIDI1NS4wKSAqIDI1NTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInBvc3QtYWxwaGFcIiwgZ2xvd0RhdGFbYV9pXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbm93IHNpbXBsZSBsaWdodGVuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbcl9pXSA9IE1hdGgubWF4KHJnYlswXSwgZ2xvd0RhdGFbcl9pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2dfaV0gPSBNYXRoLm1heChyZ2JbMV0sIGdsb3dEYXRhW2dfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtiX2ldID0gTWF0aC5tYXgocmdiWzJdLCBnbG93RGF0YVtiX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBtaXggdGhlIGNvbG9ycyBsaWtlIHBpZ21lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRvdGFsX2FscGhhID0gY19hbHBoYSArIHByZV9hbHBoYTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbcl9pXSA9IChjX2FscGhhICogcmdiWzBdICsgcHJlX2FscGhhICogZ2xvd0RhdGFbcl9pXSkgLyB0b3RhbF9hbHBoYTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IChjX2FscGhhICogcmdiWzFdICsgcHJlX2FscGhhICogZ2xvd0RhdGFbZ19pXSkgLyB0b3RhbF9hbHBoYTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbYl9pXSA9IChjX2FscGhhICogcmdiWzJdICsgcHJlX2FscGhhICogZ2xvd0RhdGFbYl9pXSkgLyB0b3RhbF9hbHBoYTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUkVBTExZIENPT0wgRUZGRUNUXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW3JfaV0gPSByZ2JbMF0gKyBnbG93RGF0YVtyX2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtnX2ldID0gcmdiWzFdICsgZ2xvd0RhdGFbZ19pXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbYl9pXSA9IHJnYlsyXSArIGdsb3dEYXRhW2JfaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbcl9pXSA9IE1hdGgubWluKHJnYlswXSArIGdsb3dEYXRhW3JfaV0sIDI1NSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2dfaV0gPSBNYXRoLm1pbihyZ2JbMV0gKyBnbG93RGF0YVtnX2ldLCAyNTUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtiX2ldID0gTWF0aC5taW4ocmdiWzJdICsgZ2xvd0RhdGFbYl9pXSwgMjU1KTtcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHggPCAyICYmIGogPT0gMjAgJiYgaSA9PSAyMCApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChnbG93RGF0YVtyX2ldID09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInByZS1hbHBoYVwiLCBnbG93RGF0YVthX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZHhcIiwgZHgsIFwiZHlcIiwgZHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkX3NxdWFyZWRcIiwgZF9zcXVhcmVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGVjYXlcIiwgZGVjYXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJsb2NhbF9kZWNheVwiLCBsb2NhbF9kZWNheSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNcIiwgYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNfYWxwaGFcIiwgY19hbHBoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImFfaVwiLCBhX2kpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJodWVcIiwgaHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicXR5XCIsIHF0eSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJlZFwiLCByZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJncmVlblwiLCBncmVlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImJsdWVcIiwgYmx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInJnYlwiLCByZ2IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJnbG93RGF0YVtyX2ldXCIsIGdsb3dEYXRhW3JfaV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJnbG93XCIsIGdsb3dEYXRhKTtcblxuICAgICAgICAgICAgICAgIHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIoZGF0YS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIGZvcih2YXIgeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJfaSA9ICgod2lkdGggKiB5KSArIHgpICogNDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnX2kgPSAoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJfaSA9ICgod2lkdGggKiB5KSArIHgpICogNCArIDI7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYV9pID0gKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgMztcblxuICAgICAgICAgICAgICAgICAgICAgICAgYnVmW3JfaV0gPSBNYXRoLmZsb29yKGdsb3dEYXRhW3JfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmW2dfaV0gPSBNYXRoLmZsb29yKGdsb3dEYXRhW2dfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmW2JfaV0gPSBNYXRoLmZsb29yKGdsb3dEYXRhW2JfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmW2FfaV0gPSAyNTU7IC8vTWF0aC5mbG9vcihnbG93RGF0YVthX2ldICogMjU1KTtcblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gKHRvZG8pIG1heWJlIHdlIGNhbiBzcGVlZCBib29zdCBzb21lIG9mIHRoaXNcbiAgICAgICAgICAgICAgICAvLyBodHRwczovL2hhY2tzLm1vemlsbGEub3JnLzIwMTEvMTIvZmFzdGVyLWNhbnZhcy1waXhlbC1tYW5pcHVsYXRpb24td2l0aC10eXBlZC1hcnJheXMvXG5cbiAgICAgICAgICAgICAgICAvL2ZpbmFsbHkgb3ZlcndyaXRlIHRoZSBwaXhlbCBkYXRhIHdpdGggdGhlIGFjY3VtdWxhdG9yXG4gICAgICAgICAgICAgICAgKDxhbnk+aW1nRGF0YS5kYXRhKS5zZXQobmV3IFVpbnQ4Q2xhbXBlZEFycmF5KGJ1ZikpO1xuXG4gICAgICAgICAgICAgICAgY3R4LnB1dEltYWdlRGF0YShpbWdEYXRhLCAwLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYWZ0ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGFrZShcbiAgICBmcmFtZXM6IG51bWJlcixcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRha2U6IGF0dGFjaFwiKTtcbiAgICAgICAgcmV0dXJuIHByZXYudGFrZShmcmFtZXMpO1xuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmUod2lkdGg6bnVtYmVyLCBoZWlnaHQ6bnVtYmVyLCBwYXRoOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgIHZhciBHSUZFbmNvZGVyID0gcmVxdWlyZSgnZ2lmZW5jb2RlcicpO1xuICAgIHZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5cblxuICAgIHZhciBlbmNvZGVyID0gbmV3IEdJRkVuY29kZXIod2lkdGgsIGhlaWdodCk7XG4gICAgZW5jb2Rlci5jcmVhdGVSZWFkU3RyZWFtKClcbiAgICAgIC5waXBlKGVuY29kZXIuY3JlYXRlV3JpdGVTdHJlYW0oeyByZXBlYXQ6IDEwMDAwLCBkZWxheTogMTAwLCBxdWFsaXR5OiAxIH0pKVxuICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0ocGF0aCkpO1xuICAgIGVuY29kZXIuc3RhcnQoKTtcblxuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwYXJlbnQ6IERyYXdTdHJlYW0pOiBEcmF3U3RyZWFtIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudC50YXAoXG4gICAgICAgICAgICBmdW5jdGlvbih0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzYXZlOiB3cm90ZSBmcmFtZVwiKTtcbiAgICAgICAgICAgICAgICBlbmNvZGVyLmFkZEZyYW1lKHRpY2suY3R4KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmVycm9yKFwic2F2ZTogbm90IHNhdmVkXCIsIHBhdGgpO30sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmxvZyhcInNhdmU6IHNhdmVkXCIsIHBhdGgpOyBlbmNvZGVyLmZpbmlzaCgpO31cbiAgICAgICAgKVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogQ29udmVydHMgYW4gUkdCIGNvbG9yIHZhbHVlIHRvIEhTTC4gQ29udmVyc2lvbiBmb3JtdWxhXG4gKiBhZGFwdGVkIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IU0xfY29sb3Jfc3BhY2UuXG4gKiBBc3N1bWVzIHIsIGcsIGFuZCBiIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMjU1XSBhbmRcbiAqIHJldHVybnMgaCwgcywgYW5kIGwgaW4gdGhlIHNldCBbMCwgMV0uXG4gKlxuICogQHBhcmFtICAgTnVtYmVyICByICAgICAgIFRoZSByZWQgY29sb3IgdmFsdWVcbiAqIEBwYXJhbSAgIE51bWJlciAgZyAgICAgICBUaGUgZ3JlZW4gY29sb3IgdmFsdWVcbiAqIEBwYXJhbSAgIE51bWJlciAgYiAgICAgICBUaGUgYmx1ZSBjb2xvciB2YWx1ZVxuICogQHJldHVybiAgQXJyYXkgICAgICAgICAgIFRoZSBIU0wgcmVwcmVzZW50YXRpb25cbiAqL1xuZnVuY3Rpb24gcmdiVG9Ic2wociwgZywgYiwgcGFzc2JhY2s6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSk6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJyZ2JUb0hzbDogaW5wdXRcIiwgciwgZywgYik7XG5cbiAgICByIC89IDI1NSwgZyAvPSAyNTUsIGIgLz0gMjU1O1xuICAgIHZhciBtYXggPSBNYXRoLm1heChyLCBnLCBiKSwgbWluID0gTWF0aC5taW4ociwgZywgYik7XG4gICAgdmFyIGgsIHMsIGwgPSAobWF4ICsgbWluKSAvIDI7XG5cbiAgICBpZihtYXggPT0gbWluKXtcbiAgICAgICAgaCA9IHMgPSAwOyAvLyBhY2hyb21hdGljXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGQgPSBtYXggLSBtaW47XG4gICAgICAgIHMgPSBsID4gMC41ID8gZCAvICgyIC0gbWF4IC0gbWluKSA6IGQgLyAobWF4ICsgbWluKTtcbiAgICAgICAgc3dpdGNoKG1heCl7XG4gICAgICAgICAgICBjYXNlIHI6IGggPSAoZyAtIGIpIC8gZCArIChnIDwgYiA/IDYgOiAwKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGc6IGggPSAoYiAtIHIpIC8gZCArIDI7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBiOiBoID0gKHIgLSBnKSAvIGQgKyA0OyBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBoIC89IDY7XG4gICAgfVxuICAgIHBhc3NiYWNrWzBdID0gKGggKiAzNjApOyAgICAgICAvLyAwIC0gMzYwIGRlZ3JlZXNcbiAgICBwYXNzYmFja1sxXSA9IChzICogMTAwKTsgLy8gMCAtIDEwMCVcbiAgICBwYXNzYmFja1syXSA9IChsICogMTAwKTsgLy8gMCAtIDEwMCVcblxuICAgIC8vIGNvbnNvbGUubG9nKFwicmdiVG9Ic2w6IG91dHB1dFwiLCBwYXNzYmFjayk7XG5cbiAgICByZXR1cm4gcGFzc2JhY2s7XG59XG5cbi8qKlxuICogQ29udmVydHMgYW4gSFNMIGNvbG9yIHZhbHVlIHRvIFJHQi4gQ29udmVyc2lvbiBmb3JtdWxhXG4gKiBhZGFwdGVkIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IU0xfY29sb3Jfc3BhY2UuXG4gKiBBc3N1bWVzIGgsIHMsIGFuZCBsIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMV0gYW5kXG4gKiByZXR1cm5zIHIsIGcsIGFuZCBiIGluIHRoZSBzZXQgWzAsIDI1NV0uXG4gKlxuICogQHBhcmFtICAgTnVtYmVyICBoICAgICAgIFRoZSBodWVcbiAqIEBwYXJhbSAgIE51bWJlciAgcyAgICAgICBUaGUgc2F0dXJhdGlvblxuICogQHBhcmFtICAgTnVtYmVyICBsICAgICAgIFRoZSBsaWdodG5lc3NcbiAqIEByZXR1cm4gIEFycmF5ICAgICAgICAgICBUaGUgUkdCIHJlcHJlc2VudGF0aW9uXG4gKi9cbmZ1bmN0aW9uIGhzbFRvUmdiKGgsIHMsIGwsIHBhc3NiYWNrOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0pOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl17XG4gICAgdmFyIHIsIGcsIGI7XG4gICAgLy8gY29uc29sZS5sb2coXCJoc2xUb1JnYiBpbnB1dDpcIiwgaCwgcywgbCk7XG5cbiAgICBoID0gaCAvIDM2MC4wO1xuICAgIHMgPSBzIC8gMTAwLjA7XG4gICAgbCA9IGwgLyAxMDAuMDtcblxuICAgIGlmKHMgPT0gMCl7XG4gICAgICAgIHIgPSBnID0gYiA9IGw7IC8vIGFjaHJvbWF0aWNcbiAgICB9ZWxzZXtcbiAgICAgICAgdmFyIGh1ZTJyZ2IgPSBmdW5jdGlvbiBodWUycmdiKHAsIHEsIHQpe1xuICAgICAgICAgICAgaWYodCA8IDApIHQgKz0gMTtcbiAgICAgICAgICAgIGlmKHQgPiAxKSB0IC09IDE7XG4gICAgICAgICAgICBpZih0IDwgMS82KSByZXR1cm4gcCArIChxIC0gcCkgKiA2ICogdDtcbiAgICAgICAgICAgIGlmKHQgPCAxLzIpIHJldHVybiBxO1xuICAgICAgICAgICAgaWYodCA8IDIvMykgcmV0dXJuIHAgKyAocSAtIHApICogKDIvMyAtIHQpICogNjtcbiAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBxID0gbCA8IDAuNSA/IGwgKiAoMSArIHMpIDogbCArIHMgLSBsICogcztcbiAgICAgICAgdmFyIHAgPSAyICogbCAtIHE7XG4gICAgICAgIHIgPSBodWUycmdiKHAsIHEsIGggKyAxLzMpO1xuICAgICAgICBnID0gaHVlMnJnYihwLCBxLCBoKTtcbiAgICAgICAgYiA9IGh1ZTJyZ2IocCwgcSwgaCAtIDEvMyk7XG4gICAgfVxuXG4gICAgcGFzc2JhY2tbMF0gPSByICogMjU1O1xuICAgIHBhc3NiYWNrWzFdID0gZyAqIDI1NTtcbiAgICBwYXNzYmFja1syXSA9IGIgKiAyNTU7XG5cbiAgICAvLyBjb25zb2xlLmxvZyhcImhzbFRvUmdiXCIsIHBhc3NiYWNrKTtcblxuICAgIHJldHVybiBwYXNzYmFjaztcbn1cblxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
