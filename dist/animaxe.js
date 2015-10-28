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
 * Each frame an animation is provided a Tick. The tick exposes access to the local animation time, the
 * time delta between the previous frame (dt) and the drawing context. Animators typically use the drawing context
 * directly, and pass the clock onto any time varying parameters.
 */
var Tick = (function () {
    function Tick(ctx, clock, dt) {
        this.ctx = ctx;
        this.clock = clock;
        this.dt = dt;
    }
    return Tick;
})();
exports.Tick = Tick;
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
/**
 * An animation is pipeline that modifies the drawing context found in an animation Tick. Animations can be chained
 * together to create a more complicated Animation. They are composeable,
 *
 * e.g. ```animation1 = Ax.translate([50, 50]).fillStyle("red").fillRect([0,0], [20,20])```
 * is one animation which has been formed from three subanimations.
 *
 * Animations have a lifecycle, they can be finite or infinite in length. You can start temporally compose animations
 * using ```anim1.then(anim2)```, which creates a new animation that plays animation 2 when animation 1 finishes.
 *
 * When an animation is sequenced into the animation pipeline. Its attach method is called which atcually builds the
 * RxJS pipeline. Thus an animation is not live, but really a factory for a RxJS configuration.
 */
var Animation = (function () {
    function Animation(_attach, after) {
        this._attach = _attach;
        this.after = after;
    }
    /**
     * Apply the animation to a new RxJS pipeline.
     */
    Animation.prototype.attach = function (upstream) {
        var processed = this._attach(upstream);
        return this.after ? this.after.attach(processed) : processed;
    };
    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     *
     * This allows you to chain custom animations.
     *
     * ```Ax.move(...).pipe(myAnimation());```
     */
    Animation.prototype.pipe = function (downstream) {
        return combine2(this, downstream);
    };
    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     *
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
     *
     * The resultant animation is always runs forever while upstream is live. Only a single inner animation
     * plays at a time (unlike emit())
     */
    Animation.prototype.loop = function (inner) {
        return this.pipe(loop(inner));
    };
    /**
     * Creates an animation that sequences the inner animation every time frame.
     *
     * The resultant animation is always runs forever while upstream is live. Multiple inner animations
     * can be playing at the same time (unlike loop)
     */
    Animation.prototype.emit = function (inner) {
        return this.pipe(emit(inner));
    };
    /**
     * Plays all the inner animations at the same time. Parallel completes when all inner animations are over.
     *
     * The canvas states are restored before each fork, so styling and transforms of different child animations do not
     * interact (although obsviously the pixel buffer is affected by each animation)
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
     * Dynamic chainable wrapper for shadowColor in the canvas API.
     */
    Animation.prototype.shadowColor = function (color) {
        return this.pipe(shadowColor(color));
    };
    /**
     * Dynamic chainable wrapper for shadowBlur in the canvas API.
     */
    Animation.prototype.shadowBlur = function (level) {
        return this.pipe(shadowBlur(level));
    };
    /**
     * Dynamic chainable wrapper for shadowOffsetX and shadowOffsetY in the canvas API.
     */
    Animation.prototype.shadowOffset = function (xy) {
        return this.pipe(shadowOffset(xy));
    };
    /**
     * Dynamic chainable wrapper for lineCap in the canvas API.
     */
    Animation.prototype.lineCap = function (style) {
        return this.pipe(lineCap(style));
    };
    /**
     * Dynamic chainable wrapper for lineJoin in the canvas API.
     */
    Animation.prototype.lineJoin = function (style) {
        return this.pipe(lineJoin(style));
    };
    /**
     * Dynamic chainable wrapper for lineWidth in the canvas API.
     */
    Animation.prototype.lineWidth = function (width) {
        return this.pipe(lineWidth(width));
    };
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    Animation.prototype.miterLimit = function (limit) {
        return this.pipe(miterLimit(limit));
    };
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    Animation.prototype.rect = function (xy, width_height) {
        return this.pipe(rect(xy, width_height));
    };
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    Animation.prototype.fillRect = function (xy, width_height) {
        return this.pipe(fillRect(xy, width_height));
    };
    /**
     * Dynamic chainable wrapper for strokeRect in the canvas API.
     */
    Animation.prototype.strokeRect = function (xy, width_height) {
        return this.pipe(strokeRect(xy, width_height));
    };
    /**
     * Dynamic chainable wrapper for clearRect in the canvas API.
     */
    Animation.prototype.clearRect = function (xy, width_height) {
        return this.pipe(clearRect(xy, width_height));
    };
    /**
     * Encloses the inner animation with a beginpath() and endpath() from the canvas API.
     */
    Animation.prototype.withinPath = function (inner) {
        return this.pipe(withinPath(inner));
    };
    /**
     * Dynamic chainable wrapper for fill in the canvas API. Use with withinPath.
     */
    Animation.prototype.fill = function () {
        return this.pipe(fill());
    };
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    Animation.prototype.stroke = function () {
        return this.pipe(stroke());
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
     * Dynamic chainable wrapper for clip in the canvas API. Use with withinPath.
     */
    Animation.prototype.clip = function () {
        return this.pipe(clip());
    };
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.quadraticCurveTo = function (control, end) {
        return this.pipe(quadraticCurveTo(control, end));
    };
    /**
     * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.bezierCurveTo = function (control1, control2, end) {
        return this.pipe(bezierCurveTo(control1, control2, end));
    };
    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    Animation.prototype.arc = function (center, radius, radStartAngle, radEndAngle, counterclockwise) {
        return this.pipe(arc(center, radius, radStartAngle, radEndAngle, counterclockwise));
    };
    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    Animation.prototype.arcTo = function (tangent1, tangent2, radius) {
        return this.pipe(arcTo(tangent1, tangent2, radius));
    };
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    Animation.prototype.scale = function (xy) {
        return this.pipe(scale(xy));
    };
    /**
     * Dynamic chainable wrapper for rotate in the canvas API.
     */
    Animation.prototype.rotate = function (rads) {
        return this.pipe(rotate(rads));
    };
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     */
    Animation.prototype.translate = function (xy) {
        return this.pipe(translate(xy));
    };
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     * [ a c e
     *   b d f
     *   0 0 1 ]
     */
    Animation.prototype.transform = function (a, b, c, d, e, f) {
        return this.pipe(transform(a, b, c, d, e, f));
    };
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    Animation.prototype.setTransform = function (a, b, c, d, e, f) {
        return this.pipe(setTransform(a, b, c, d, e, f));
    };
    /**
     * Dynamic chainable wrapper for font in the canvas API.
     */
    Animation.prototype.font = function (style) {
        return this.pipe(font(style));
    };
    /**
     * Dynamic chainable wrapper for textAlign in the canvas API.
     */
    Animation.prototype.textAlign = function (style) {
        return this.pipe(textAlign(style));
    };
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    Animation.prototype.textBaseline = function (style) {
        return this.pipe(textBaseline(style));
    };
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    Animation.prototype.fillText = function (text, xy, maxWidth) {
        return this.pipe(fillText(text, xy, maxWidth));
    };
    /**
     * Dynamic chainable wrapper for drawImage in the canvas API.
     */
    Animation.prototype.drawImage = function (img, xy) {
        return this.pipe(drawImage(img, xy));
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
            var tick = new Tick(self.ctx, self.t, dt);
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
function shadowColor(color, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("shadowColor: attach");
        var color_next = Parameter.from(color).init();
        return function (tick) {
            var color = color_next(tick.clock);
            if (exports.DEBUG)
                console.log("shadowColor: shadowColor", color);
            tick.ctx.shadowColor = color;
        };
    }, animation);
}
exports.shadowColor = shadowColor;
function shadowBlur(level, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("shadowBlur: attach");
        var level_next = Parameter.from(level).init();
        return function (tick) {
            var level = level_next(tick.clock);
            if (exports.DEBUG)
                console.log("shadowBlur: shadowBlur", level);
            tick.ctx.shadowBlur = level;
        };
    }, animation);
}
exports.shadowBlur = shadowBlur;
function shadowOffset(xy, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("shadowOffset: attach");
        var xy_next = Parameter.from(xy).init();
        return function (tick) {
            var xy = xy_next(tick.clock);
            if (exports.DEBUG)
                console.log("shadowOffset: shadowBlur", xy);
            tick.ctx.shadowOffsetX = xy[0];
            tick.ctx.shadowOffsetY = xy[1];
        };
    }, animation);
}
exports.shadowOffset = shadowOffset;
function lineCap(style, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("lineCap: attach");
        var arg_next = Parameter.from(style).init();
        return function (tick) {
            var arg = arg_next(tick.clock);
            if (exports.DEBUG)
                console.log("lineCap: lineCap", arg);
            tick.ctx.lineCap = arg;
        };
    }, animation);
}
exports.lineCap = lineCap;
function lineJoin(style, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("lineJoin: attach");
        var arg_next = Parameter.from(style).init();
        return function (tick) {
            var arg = arg_next(tick.clock);
            if (exports.DEBUG)
                console.log("lineJoin: lineCap", arg);
            tick.ctx.lineJoin = arg;
        };
    }, animation);
}
exports.lineJoin = lineJoin;
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
function miterLimit(limit, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("miterLimit: attach");
        var arg_next = Parameter.from(limit).init();
        return function (tick) {
            var arg = arg_next(tick.clock);
            if (exports.DEBUG)
                console.log("miterLimit: miterLimit", arg);
            tick.ctx.miterLimit = arg;
        };
    }, animation);
}
exports.miterLimit = miterLimit;
function rect(xy, width_height, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("rect: attach");
        var xy_next = Parameter.from(xy).init();
        var width_height_next = Parameter.from(width_height).init();
        return function (tick) {
            var xy = xy_next(tick.clock);
            var width_height = width_height_next(tick.clock);
            if (exports.DEBUG)
                console.log("rect: rect", xy, width_height);
            tick.ctx.rect(xy[0], xy[1], width_height[0], width_height[1]);
        };
    }, animation);
}
exports.rect = rect;
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
function strokeRect(xy, width_height, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("strokeRect: attach");
        var xy_next = Parameter.from(xy).init();
        var width_height_next = Parameter.from(width_height).init();
        return function (tick) {
            var xy = xy_next(tick.clock);
            var width_height = width_height_next(tick.clock);
            if (exports.DEBUG)
                console.log("strokeRect: strokeRect", xy, width_height);
            tick.ctx.strokeRect(xy[0], xy[1], width_height[0], width_height[1]);
        };
    }, animation);
}
exports.strokeRect = strokeRect;
function clearRect(xy, width_height, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("clearRect: attach");
        var xy_next = Parameter.from(xy).init();
        var width_height_next = Parameter.from(width_height).init();
        return function (tick) {
            var xy = xy_next(tick.clock);
            var width_height = width_height_next(tick.clock);
            if (exports.DEBUG)
                console.log("clearRect: clearRect", xy, width_height);
            tick.ctx.clearRect(xy[0], xy[1], width_height[0], width_height[1]);
        };
    }, animation);
}
exports.clearRect = clearRect;
function withinPath(inner) {
    return new Animation(function (upstream) {
        if (exports.DEBUG)
            console.log("withinPath: attach");
        var beginPathBeforeInner = upstream.tapOnNext(function (tick) { tick.ctx.beginPath(); });
        return inner.attach(beginPathBeforeInner).tapOnNext(function (tick) { tick.ctx.closePath(); });
    });
}
exports.withinPath = withinPath;
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
function fill(animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("fill: attach");
        return function (tick) {
            if (exports.DEBUG)
                console.log("fill: stroke");
            tick.ctx.fill();
        };
    }, animation);
}
exports.fill = fill;
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
function clip(animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("clip: attach");
        return function (tick) {
            if (exports.DEBUG)
                console.log("clip: clip");
            tick.ctx.clip();
        };
    }, animation);
}
exports.clip = clip;
function quadraticCurveTo(control, end, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("quadraticCurveTo: attach");
        var arg1_next = Parameter.from(control).init();
        var arg2_next = Parameter.from(end).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            var arg2 = arg2_next(tick.clock);
            if (exports.DEBUG)
                console.log("quadraticCurveTo: quadraticCurveTo", arg1, arg2);
            tick.ctx.quadraticCurveTo(arg1[0], arg1[1], arg2[0], arg2[1]);
        };
    }, animation);
}
exports.quadraticCurveTo = quadraticCurveTo;
/**
 * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
 */
function bezierCurveTo(control1, control2, end, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("bezierCurveTo: attach");
        var arg1_next = Parameter.from(control1).init();
        var arg2_next = Parameter.from(control2).init();
        var arg3_next = Parameter.from(end).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            var arg2 = arg2_next(tick.clock);
            var arg3 = arg3_next(tick.clock);
            if (exports.DEBUG)
                console.log("bezierCurveTo: bezierCurveTo", arg1, arg2, arg3);
            tick.ctx.bezierCurveTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3[0], arg3[1]);
        };
    }, animation);
}
exports.bezierCurveTo = bezierCurveTo;
/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
function arc(center, radius, radStartAngle, radEndAngle, counterclockwise, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("arc: attach");
        var arg1_next = Parameter.from(center).init();
        var arg2_next = Parameter.from(radius).init();
        var arg3_next = Parameter.from(radStartAngle).init();
        var arg4_next = Parameter.from(radEndAngle).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            var arg2 = arg2_next(tick.clock);
            var arg3 = arg3_next(tick.clock);
            var arg4 = arg4_next(tick.clock);
            if (exports.DEBUG)
                console.log("arc: arc", arg1, arg2, arg3, arg4);
            tick.ctx.arc(arg1[0], arg1[1], arg2, arg3, arg4, counterclockwise);
        };
    }, animation);
}
exports.arc = arc;
/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
function arcTo(tangent1, tangent2, radius, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("arc: attach");
        var arg1_next = Parameter.from(tangent1).init();
        var arg2_next = Parameter.from(tangent2).init();
        var arg3_next = Parameter.from(radius).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            var arg2 = arg2_next(tick.clock);
            var arg3 = arg3_next(tick.clock);
            if (exports.DEBUG)
                console.log("arc: arc", arg1, arg2, arg3);
            tick.ctx.arcTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3);
        };
    }, animation);
}
exports.arcTo = arcTo;
/**
 * Dynamic chainable wrapper for scale in the canvas API.
 */
function scale(xy, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("scale: attach");
        var arg1_next = Parameter.from(xy).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            if (exports.DEBUG)
                console.log("scale: scale", arg1);
            tick.ctx.scale(arg1[0], arg1[1]);
        };
    }, animation);
}
exports.scale = scale;
/**
 * Dynamic chainable wrapper for rotate in the canvas API.
 */
function rotate(rads, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("rotate: attach");
        var arg1_next = Parameter.from(rads).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            if (exports.DEBUG)
                console.log("rotate: rotate", arg1);
            tick.ctx.scale(arg1[0], arg1[1]);
        };
    }, animation);
}
exports.rotate = rotate;
/**
 * Dynamic chainable wrapper for translate in the canvas API.
 * [ a c e
 *   b d f
 *   0 0 1 ]
 */
function transform(a, b, c, d, e, f, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("transform: attach");
        var arg1_next = Parameter.from(a).init();
        var arg2_next = Parameter.from(b).init();
        var arg3_next = Parameter.from(c).init();
        var arg4_next = Parameter.from(d).init();
        var arg5_next = Parameter.from(e).init();
        var arg6_next = Parameter.from(f).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            var arg2 = arg2_next(tick.clock);
            var arg3 = arg3_next(tick.clock);
            var arg4 = arg4_next(tick.clock);
            var arg5 = arg5_next(tick.clock);
            var arg6 = arg6_next(tick.clock);
            if (exports.DEBUG)
                console.log("transform: transform", arg1, arg2, arg3, arg4, arg5, arg6);
            tick.ctx.transform(arg1, arg2, arg3, arg4, arg5, arg6);
        };
    }, animation);
}
exports.transform = transform;
/**
 * Dynamic chainable wrapper for setTransform in the canvas API.
 */
function setTransform(a, b, c, d, e, f, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("setTransform: attach");
        var arg1_next = Parameter.from(a).init();
        var arg2_next = Parameter.from(b).init();
        var arg3_next = Parameter.from(c).init();
        var arg4_next = Parameter.from(d).init();
        var arg5_next = Parameter.from(e).init();
        var arg6_next = Parameter.from(f).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            var arg2 = arg2_next(tick.clock);
            var arg3 = arg3_next(tick.clock);
            var arg4 = arg4_next(tick.clock);
            var arg5 = arg5_next(tick.clock);
            var arg6 = arg6_next(tick.clock);
            if (exports.DEBUG)
                console.log("setTransform: setTransform", arg1, arg2, arg3, arg4, arg5, arg6);
            tick.ctx.setTransform(arg1, arg2, arg3, arg4, arg5, arg6);
        };
    }, animation);
}
exports.setTransform = setTransform;
/**
 * Dynamic chainable wrapper for font in the canvas API.
 */
function font(style, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("font: attach");
        var arg1_next = Parameter.from(style).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            if (exports.DEBUG)
                console.log("font: font", arg1);
            tick.ctx.font = arg1;
        };
    }, animation);
}
exports.font = font;
/**
 * Dynamic chainable wrapper for textAlign in the canvas API.
 */
function textAlign(style, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("textAlign: attach");
        var arg1_next = Parameter.from(style).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            if (exports.DEBUG)
                console.log("textAlign: textAlign", arg1);
            tick.ctx.textAlign = arg1;
        };
    }, animation);
}
exports.textAlign = textAlign;
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
function textBaseline(style, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("textBaseline: attach");
        var arg1_next = Parameter.from(style).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            if (exports.DEBUG)
                console.log("textBaseline: textBaseline", arg1);
            tick.ctx.textBaseline = arg1;
        };
    }, animation);
}
exports.textBaseline = textBaseline;
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
function fillText(text, xy, maxWidth, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("fillText: attach");
        var arg1_next = Parameter.from(text).init();
        var arg2_next = Parameter.from(xy).init();
        var arg3_next = maxWidth ? Parameter.from(maxWidth).init() : undefined;
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            var arg2 = arg2_next(tick.clock);
            var arg3 = maxWidth ? arg3_next(tick.clock) : undefined;
            if (exports.DEBUG)
                console.log("fillText: fillText", arg1, arg2, arg3);
            if (maxWidth) {
                tick.ctx.fillText(arg1, arg2[0], arg2[0], arg3);
            }
            else {
                tick.ctx.fillText(arg1, arg2[0], arg2[0]);
            }
        };
    }, animation);
}
exports.fillText = fillText;
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
function drawImage(img, xy, animation) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("drawImage: attach");
        var arg1_next = Parameter.from(xy).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            if (exports.DEBUG)
                console.log("drawImage: drawImage", arg1);
            tick.ctx.drawImage(img, arg1[0], arg1[1]);
        };
    }, animation);
}
exports.drawImage = drawImage;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiVGljayIsIlRpY2suY29uc3RydWN0b3IiLCJhc3NlcnQiLCJzdGFja1RyYWNlIiwiQW5pbWF0aW9uIiwiQW5pbWF0aW9uLmNvbnN0cnVjdG9yIiwiQW5pbWF0aW9uLmF0dGFjaCIsIkFuaW1hdGlvbi5waXBlIiwiQW5pbWF0aW9uLnRoZW4iLCJBbmltYXRpb24ubG9vcCIsIkFuaW1hdGlvbi5lbWl0IiwiQW5pbWF0aW9uLnBhcmFsbGVsIiwiQW5pbWF0aW9uLmNsb25lIiwiQW5pbWF0aW9uLnR3ZWVuX2xpbmVhciIsIkFuaW1hdGlvbi50YWtlIiwiQW5pbWF0aW9uLmRyYXciLCJBbmltYXRpb24uc3Ryb2tlU3R5bGUiLCJBbmltYXRpb24uZmlsbFN0eWxlIiwiQW5pbWF0aW9uLnNoYWRvd0NvbG9yIiwiQW5pbWF0aW9uLnNoYWRvd0JsdXIiLCJBbmltYXRpb24uc2hhZG93T2Zmc2V0IiwiQW5pbWF0aW9uLmxpbmVDYXAiLCJBbmltYXRpb24ubGluZUpvaW4iLCJBbmltYXRpb24ubGluZVdpZHRoIiwiQW5pbWF0aW9uLm1pdGVyTGltaXQiLCJBbmltYXRpb24ucmVjdCIsIkFuaW1hdGlvbi5maWxsUmVjdCIsIkFuaW1hdGlvbi5zdHJva2VSZWN0IiwiQW5pbWF0aW9uLmNsZWFyUmVjdCIsIkFuaW1hdGlvbi53aXRoaW5QYXRoIiwiQW5pbWF0aW9uLmZpbGwiLCJBbmltYXRpb24uc3Ryb2tlIiwiQW5pbWF0aW9uLm1vdmVUbyIsIkFuaW1hdGlvbi5saW5lVG8iLCJBbmltYXRpb24uY2xpcCIsIkFuaW1hdGlvbi5xdWFkcmF0aWNDdXJ2ZVRvIiwiQW5pbWF0aW9uLmJlemllckN1cnZlVG8iLCJBbmltYXRpb24uYXJjIiwiQW5pbWF0aW9uLmFyY1RvIiwiQW5pbWF0aW9uLnNjYWxlIiwiQW5pbWF0aW9uLnJvdGF0ZSIsIkFuaW1hdGlvbi50cmFuc2xhdGUiLCJBbmltYXRpb24udHJhbnNmb3JtIiwiQW5pbWF0aW9uLnNldFRyYW5zZm9ybSIsIkFuaW1hdGlvbi5mb250IiwiQW5pbWF0aW9uLnRleHRBbGlnbiIsIkFuaW1hdGlvbi50ZXh0QmFzZWxpbmUiLCJBbmltYXRpb24uZmlsbFRleHQiLCJBbmltYXRpb24uZHJhd0ltYWdlIiwiQW5pbWF0aW9uLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiIsIkFuaW1hdGlvbi52ZWxvY2l0eSIsIkFuaW1hdGlvbi5nbG93IiwiQW5pbWF0b3IiLCJBbmltYXRvci5jb25zdHJ1Y3RvciIsIkFuaW1hdG9yLnRpY2tlciIsIkFuaW1hdG9yLnBsYXkiLCJhc3NlcnREdCIsImFzc2VydENsb2NrIiwiY29tYmluZTIiLCJwYXJhbGxlbCIsImRlY3JlbWVudEFjdGl2ZSIsImNsb25lIiwiZW1pdCIsImxvb3AiLCJhdHRhY2hMb29wIiwiZHJhdyIsInRyYW5zbGF0ZSIsImdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiIsInZlbG9jaXR5IiwidHdlZW5fbGluZWFyIiwiZmlsbFN0eWxlIiwic3Ryb2tlU3R5bGUiLCJzaGFkb3dDb2xvciIsInNoYWRvd0JsdXIiLCJzaGFkb3dPZmZzZXQiLCJsaW5lQ2FwIiwibGluZUpvaW4iLCJsaW5lV2lkdGgiLCJtaXRlckxpbWl0IiwicmVjdCIsImZpbGxSZWN0Iiwic3Ryb2tlUmVjdCIsImNsZWFyUmVjdCIsIndpdGhpblBhdGgiLCJzdHJva2UiLCJmaWxsIiwibW92ZVRvIiwibGluZVRvIiwiY2xpcCIsInF1YWRyYXRpY0N1cnZlVG8iLCJiZXppZXJDdXJ2ZVRvIiwiYXJjIiwiYXJjVG8iLCJzY2FsZSIsInJvdGF0ZSIsInRyYW5zZm9ybSIsInNldFRyYW5zZm9ybSIsImZvbnQiLCJ0ZXh0QWxpZ24iLCJ0ZXh0QmFzZWxpbmUiLCJmaWxsVGV4dCIsImRyYXdJbWFnZSIsImdsb3ciLCJ0YWtlIiwic2F2ZSIsInJnYlRvSHNsIiwiaHNsVG9SZ2IiLCJoc2xUb1JnYi5odWUycmdiIl0sIm1hcHBpbmdzIjoiQUFBQSwwREFBMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLElBQU8sRUFBRSxXQUFXLElBQUksQ0FBQyxDQUFDO0FBQzFCLElBQU8sU0FBUyxXQUFXLGFBQWEsQ0FBQyxDQUFDO0FBRS9CLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLGFBQUssR0FBRyxLQUFLLENBQUM7QUFFekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO0FBcURqRTs7OztHQUlHO0FBQ0g7SUFDSUEsY0FBb0JBLEdBQTZCQSxFQUFTQSxLQUFhQSxFQUFTQSxFQUFVQTtRQUF0RUMsUUFBR0EsR0FBSEEsR0FBR0EsQ0FBMEJBO1FBQVNBLFVBQUtBLEdBQUxBLEtBQUtBLENBQVFBO1FBQVNBLE9BQUVBLEdBQUZBLEVBQUVBLENBQVFBO0lBQUdBLENBQUNBO0lBQ2xHRCxXQUFDQTtBQUFEQSxDQUZBLEFBRUNBLElBQUE7QUFGWSxZQUFJLE9BRWhCLENBQUE7QUFRRCxnQkFBZ0IsU0FBa0IsRUFBRSxPQUFpQjtJQUNqREUsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDYkEsT0FBT0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsVUFBVUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7UUFDNUJBLE1BQU1BLElBQUlBLEtBQUtBLEVBQUVBLENBQUNBO0lBQ3RCQSxDQUFDQTtBQUNMQSxDQUFDQTtBQUVEO0lBQ0lDLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLEtBQUtBLEVBQUVBLENBQUNBO0lBQ3RCQSxNQUFNQSxDQUFPQSxHQUFJQSxDQUFDQSxLQUFLQSxDQUFDQTtBQUM1QkEsQ0FBQ0E7QUFFRDs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSDtJQUVJQyxtQkFBbUJBLE9BQTZDQSxFQUFTQSxLQUFpQkE7UUFBdkVDLFlBQU9BLEdBQVBBLE9BQU9BLENBQXNDQTtRQUFTQSxVQUFLQSxHQUFMQSxLQUFLQSxDQUFZQTtJQUMxRkEsQ0FBQ0E7SUFFREQ7O09BRUdBO0lBQ0hBLDBCQUFNQSxHQUFOQSxVQUFPQSxRQUFvQkE7UUFDdkJFLElBQUlBLFNBQVNBLEdBQUdBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO1FBQ3ZDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxHQUFFQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFFQSxTQUFTQSxDQUFDQTtJQUMvREEsQ0FBQ0E7SUFFREY7Ozs7OztPQU1HQTtJQUNIQSx3QkFBSUEsR0FBSkEsVUFBS0EsVUFBcUJBO1FBQ3RCRyxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxFQUFFQSxVQUFVQSxDQUFDQSxDQUFDQTtJQUN0Q0EsQ0FBQ0E7SUFFREg7Ozs7OztPQU1HQTtJQUNIQSx3QkFBSUEsR0FBSkEsVUFBS0EsUUFBbUJBO1FBQ3BCSSxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUVoQkEsTUFBTUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsVUFBVUEsSUFBZ0JBO1lBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBTyxVQUFVLFFBQVE7Z0JBQ2hELElBQUksS0FBSyxHQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBUSxDQUFDO2dCQUNwQyxJQUFJLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQVEsQ0FBQztnQkFFcEMsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDO2dCQUVyQixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7Z0JBQ3BCLEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7b0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFFNUMsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDO2dCQUV4QixJQUFJLFdBQVcsR0FBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FDbkgsVUFBUyxJQUFJO29CQUNULEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7d0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO29CQUN6RCxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUMxQixDQUFDLEVBQ0QsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQy9CO29CQUNJLEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7d0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO29CQUNwRCxTQUFTLEdBQUcsS0FBSyxDQUFDO29CQUVsQixZQUFZLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQ3BILFVBQVMsSUFBSTt3QkFDVCxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDOzRCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQzt3QkFDMUQsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDMUIsQ0FBQyxFQUNELFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUMvQjt3QkFDSSxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDOzRCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQzt3QkFDckQsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFBO29CQUMxQixDQUFDLENBRUosQ0FBQztnQkFDTixDQUFDLENBQ0osQ0FBQztnQkFFRixJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQ3JFLFVBQVMsSUFBSTtvQkFDVCxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDO3dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FBQztvQkFDakUsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzt3QkFDWixLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN2QixDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3hCLENBQUM7Z0JBQ0wsQ0FBQyxFQUNELFFBQVEsQ0FBQyxPQUFPLEVBQ2hCO29CQUNJLEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7d0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO29CQUN2RCxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzNCLENBQUMsQ0FDSixDQUFDO2dCQUNGLGFBQWE7Z0JBQ2IsTUFBTSxDQUFDO29CQUNILEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7d0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUM5QyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDM0IsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUN0QixFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUM7d0JBQ2IsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMvQixDQUFDLENBQUM7WUFDTixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLDBCQUEwQjtRQUN0RSxDQUFDLENBQUNBLENBQUNBO0lBQ1BBLENBQUNBO0lBQ0RKOzs7OztPQUtHQTtJQUNIQSx3QkFBSUEsR0FBSkEsVUFBS0EsS0FBZ0JBO1FBQ2pCSyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNsQ0EsQ0FBQ0E7SUFDREw7Ozs7O09BS0dBO0lBQ0hBLHdCQUFJQSxHQUFKQSxVQUFLQSxLQUFnQkE7UUFDakJNLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO0lBQ2xDQSxDQUFDQTtJQUVETjs7Ozs7T0FLR0E7SUFDSEEsNEJBQVFBLEdBQVJBLFVBQVNBLGdCQUF3REE7UUFDN0RPLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDakRBLENBQUNBO0lBRURQOztPQUVHQTtJQUNIQSx5QkFBS0EsR0FBTEEsVUFBTUEsQ0FBU0EsRUFBRUEsS0FBZ0JBO1FBQzdCUSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUN0Q0EsQ0FBQ0E7SUFFRFIsZ0NBQVlBLEdBQVpBLFVBQ0lBLElBQWNBLEVBQ2RBLEVBQWNBLEVBQ2RBLElBQWVBO1FBQ2ZTLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLElBQUlBLEVBQUVBLEVBQUVBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO0lBQ25EQSxDQUFDQTtJQUVEVDs7T0FFR0E7SUFDSEEsd0JBQUlBLEdBQUpBLFVBQUtBLE1BQWNBO1FBQ2ZVLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO0lBQ25DQSxDQUFDQTtJQUVEVjs7O09BR0dBO0lBQ0hBLHdCQUFJQSxHQUFKQSxVQUFLQSxXQUF5Q0E7UUFDMUNXLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLENBQUNBO0lBQ3hDQSxDQUFDQTtJQUVEWCxhQUFhQTtJQUNiQTs7T0FFR0E7SUFDSEEsK0JBQVdBLEdBQVhBLFVBQVlBLEtBQWVBO1FBQ3ZCWSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUN6Q0EsQ0FBQ0E7SUFDRFo7O09BRUdBO0lBQ0hBLDZCQUFTQSxHQUFUQSxVQUFVQSxLQUFlQTtRQUNyQmEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDdkNBLENBQUNBO0lBQ0RiOztPQUVHQTtJQUNIQSwrQkFBV0EsR0FBWEEsVUFBWUEsS0FBZUE7UUFDdkJjLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFdBQVdBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO0lBQ3pDQSxDQUFDQTtJQUNEZDs7T0FFR0E7SUFDSEEsOEJBQVVBLEdBQVZBLFVBQVdBLEtBQWdCQTtRQUN2QmUsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDeENBLENBQUNBO0lBQ0RmOztPQUVHQTtJQUNIQSxnQ0FBWUEsR0FBWkEsVUFBYUEsRUFBWUE7UUFDckJnQixNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUN2Q0EsQ0FBQ0E7SUFDRGhCOztPQUVHQTtJQUNIQSwyQkFBT0EsR0FBUEEsVUFBUUEsS0FBYUE7UUFDakJpQixNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNyQ0EsQ0FBQ0E7SUFDRGpCOztPQUVHQTtJQUNIQSw0QkFBUUEsR0FBUkEsVUFBU0EsS0FBYUE7UUFDbEJrQixNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUN0Q0EsQ0FBQ0E7SUFDRGxCOztPQUVHQTtJQUNIQSw2QkFBU0EsR0FBVEEsVUFBVUEsS0FBZ0JBO1FBQ3RCbUIsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDdkNBLENBQUNBO0lBQ0RuQjs7T0FFR0E7SUFDSEEsOEJBQVVBLEdBQVZBLFVBQVdBLEtBQWdCQTtRQUN2Qm9CLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO0lBQ3hDQSxDQUFDQTtJQUNEcEI7O09BRUdBO0lBQ0hBLHdCQUFJQSxHQUFKQSxVQUFLQSxFQUFZQSxFQUFFQSxZQUFzQkE7UUFDckNxQixNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUM3Q0EsQ0FBQ0E7SUFDRHJCOztPQUVHQTtJQUNIQSw0QkFBUUEsR0FBUkEsVUFBU0EsRUFBWUEsRUFBRUEsWUFBc0JBO1FBQ3pDc0IsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsRUFBRUEsRUFBRUEsWUFBWUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDakRBLENBQUNBO0lBQ0R0Qjs7T0FFR0E7SUFDSEEsOEJBQVVBLEdBQVZBLFVBQVdBLEVBQVlBLEVBQUVBLFlBQXNCQTtRQUMzQ3VCLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEVBQUVBLEVBQUVBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBO0lBQ25EQSxDQUFDQTtJQUNEdkI7O09BRUdBO0lBQ0hBLDZCQUFTQSxHQUFUQSxVQUFVQSxFQUFZQSxFQUFFQSxZQUFzQkE7UUFDMUN3QixNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxFQUFFQSxFQUFFQSxZQUFZQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNsREEsQ0FBQ0E7SUFDRHhCOztPQUVHQTtJQUNIQSw4QkFBVUEsR0FBVkEsVUFBV0EsS0FBZ0JBO1FBQ3ZCeUIsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDeENBLENBQUNBO0lBQ0R6Qjs7T0FFR0E7SUFDSEEsd0JBQUlBLEdBQUpBO1FBQ0kwQixNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxDQUFDQTtJQUM3QkEsQ0FBQ0E7SUFDRDFCOztPQUVHQTtJQUNIQSwwQkFBTUEsR0FBTkE7UUFDSTJCLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLENBQUNBO0lBQy9CQSxDQUFDQTtJQUNEM0I7O09BRUdBO0lBQ0hBLDBCQUFNQSxHQUFOQSxVQUFPQSxFQUFZQTtRQUNmNEIsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDakNBLENBQUNBO0lBQ0Q1Qjs7T0FFR0E7SUFDSEEsMEJBQU1BLEdBQU5BLFVBQU9BLEVBQVlBO1FBQ2Y2QixNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNqQ0EsQ0FBQ0E7SUFDRDdCOztPQUVHQTtJQUNIQSx3QkFBSUEsR0FBSkE7UUFDSThCLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLENBQUNBO0lBQzdCQSxDQUFDQTtJQUNEOUI7O09BRUdBO0lBQ0hBLG9DQUFnQkEsR0FBaEJBLFVBQWlCQSxPQUFpQkEsRUFBRUEsR0FBYUE7UUFDN0MrQixNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxnQkFBZ0JBLENBQUNBLE9BQU9BLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO0lBQ3JEQSxDQUFDQTtJQUNEL0I7O09BRUdBO0lBQ0hBLGlDQUFhQSxHQUFiQSxVQUFjQSxRQUFrQkEsRUFBRUEsUUFBa0JBLEVBQUVBLEdBQWFBO1FBQy9EZ0MsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsUUFBUUEsRUFBRUEsUUFBUUEsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDN0RBLENBQUNBO0lBQ0RoQzs7T0FFR0E7SUFDSEEsdUJBQUdBLEdBQUhBLFVBQUlBLE1BQWdCQSxFQUFFQSxNQUFpQkEsRUFDbkNBLGFBQXdCQSxFQUFFQSxXQUFzQkEsRUFDaERBLGdCQUEwQkE7UUFDMUJpQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxNQUFNQSxFQUFFQSxNQUFNQSxFQUFFQSxhQUFhQSxFQUFFQSxXQUFXQSxFQUFFQSxnQkFBZ0JBLENBQUNBLENBQUNBLENBQUNBO0lBQ3hGQSxDQUFDQTtJQUVEakM7O09BRUdBO0lBQ0hBLHlCQUFLQSxHQUFMQSxVQUFNQSxRQUFrQkEsRUFBRUEsUUFBa0JBLEVBQUVBLE1BQWlCQTtRQUMzRGtDLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLFFBQVFBLEVBQUVBLFFBQVFBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO0lBQ3hEQSxDQUFDQTtJQUNEbEM7O09BRUdBO0lBQ0hBLHlCQUFLQSxHQUFMQSxVQUFNQSxFQUFZQTtRQUNkbUMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDaENBLENBQUNBO0lBQ0RuQzs7T0FFR0E7SUFDSEEsMEJBQU1BLEdBQU5BLFVBQU9BLElBQWVBO1FBQ2xCb0MsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDbkNBLENBQUNBO0lBQ0RwQzs7T0FFR0E7SUFDSEEsNkJBQVNBLEdBQVRBLFVBQVVBLEVBQVlBO1FBQ2xCcUMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDcENBLENBQUNBO0lBQ0RyQzs7Ozs7T0FLR0E7SUFDSEEsNkJBQVNBLEdBQVRBLFVBQVVBLENBQVlBLEVBQUVBLENBQVlBLEVBQUVBLENBQVlBLEVBQ3hDQSxDQUFZQSxFQUFFQSxDQUFZQSxFQUFFQSxDQUFZQTtRQUM5Q3NDLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLEVBQUNBLENBQUNBLEVBQUNBLENBQUNBLEVBQUNBLENBQUNBLEVBQUNBLENBQUNBLEVBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0lBQzdDQSxDQUFDQTtJQUNEdEM7O09BRUdBO0lBQ0hBLGdDQUFZQSxHQUFaQSxVQUFhQSxDQUFZQSxFQUFFQSxDQUFZQSxFQUFFQSxDQUFZQSxFQUN4Q0EsQ0FBWUEsRUFBRUEsQ0FBWUEsRUFBRUEsQ0FBWUE7UUFDakR1QyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQSxFQUFDQSxDQUFDQSxFQUFDQSxDQUFDQSxFQUFDQSxDQUFDQSxFQUFDQSxDQUFDQSxFQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNoREEsQ0FBQ0E7SUFDRHZDOztPQUVHQTtJQUNIQSx3QkFBSUEsR0FBSkEsVUFBS0EsS0FBYUE7UUFDZHdDLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO0lBQ2xDQSxDQUFDQTtJQUNEeEM7O09BRUdBO0lBQ0hBLDZCQUFTQSxHQUFUQSxVQUFVQSxLQUFhQTtRQUNuQnlDLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO0lBQ3ZDQSxDQUFDQTtJQUNEekM7O09BRUdBO0lBQ0hBLGdDQUFZQSxHQUFaQSxVQUFhQSxLQUFhQTtRQUN0QjBDLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO0lBQzFDQSxDQUFDQTtJQUNEMUM7O09BRUdBO0lBQ0hBLDRCQUFRQSxHQUFSQSxVQUFTQSxJQUFlQSxFQUFFQSxFQUFZQSxFQUFFQSxRQUFvQkE7UUFDeEQyQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxFQUFFQSxFQUFFQSxFQUFFQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNuREEsQ0FBQ0E7SUFDRDNDOztPQUVHQTtJQUNIQSw2QkFBU0EsR0FBVEEsVUFBVUEsR0FBR0EsRUFBRUEsRUFBWUE7UUFDdkI0QyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxHQUFHQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUN6Q0EsQ0FBQ0E7SUFDRDVDOztPQUVHQTtJQUNIQSw0Q0FBd0JBLEdBQXhCQSxVQUF5QkEsU0FBaUJBO1FBQ3RDNkMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0Esd0JBQXdCQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUMxREEsQ0FBQ0E7SUFDRDdDLGlCQUFpQkE7SUFHakJBOztPQUVHQTtJQUNIQSw0QkFBUUEsR0FBUkEsVUFBU0EsTUFBZ0JBO1FBQ3JCOEMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDdkNBLENBQUNBO0lBRUQ5Qyx3QkFBSUEsR0FBSkEsVUFBS0EsS0FBZ0JBO1FBQ2pCK0MsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDbENBLENBQUNBO0lBRUwvQyxnQkFBQ0E7QUFBREEsQ0E5WEEsQUE4WENBLElBQUE7QUE5WFksaUJBQVMsWUE4WHJCLENBQUE7QUFFRDtJQU1JZ0Qsa0JBQW1CQSxHQUE2QkE7UUFBN0JDLFFBQUdBLEdBQUhBLEdBQUdBLENBQTBCQTtRQUxoREEsdUJBQWtCQSxHQUFrQkEsSUFBSUEsQ0FBQ0E7UUFFekNBLDJCQUFzQkEsR0FBcUJBLEVBQUVBLENBQUNBO1FBQzlDQSxNQUFDQSxHQUFXQSxDQUFDQSxDQUFDQTtRQUdWQSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxFQUFFQSxDQUFDQSxPQUFPQSxFQUFRQSxDQUFBQTtJQUN0Q0EsQ0FBQ0E7SUFDREQseUJBQU1BLEdBQU5BLFVBQU9BLElBQTJCQTtRQUM5QkUsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsQ0FBQ0E7UUFFaEJBLElBQUlBLENBQUNBLGtCQUFrQkEsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBU0EsRUFBVUE7WUFDbEQsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2IsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNoQixDQUFDLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO0lBQzVCQSxDQUFDQTtJQUNERix1QkFBSUEsR0FBSkEsVUFBTUEsU0FBb0JBO1FBQ3RCRyxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUNoQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxDQUFDQTtRQUN6Q0EsSUFBSUEsZUFBZUEsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsVUFBU0EsSUFBSUE7WUFDbkQsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3BCLENBQUMsQ0FBQ0EsQ0FBQ0E7UUFDSEEsSUFBSUEsV0FBV0EsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0E7UUFDcERBLElBQUlBLGlCQUFpQkEsR0FBR0EsV0FBV0EsQ0FBQ0EsR0FBR0EsQ0FDbkNBLFVBQVNBLElBQUlBO1lBQ1QsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZCLENBQUMsRUFBQ0EsVUFBU0EsR0FBR0E7WUFDVixFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN6RCxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZCLENBQUMsRUFBQ0E7WUFDRSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQ0EsQ0FBQ0E7UUFDUEEsSUFBSUEsQ0FBQ0Esc0JBQXNCQSxDQUFDQSxJQUFJQSxDQUM1QkEsaUJBQWlCQSxDQUFDQSxTQUFTQSxFQUFFQSxDQUNoQ0EsQ0FBQ0E7SUFDTkEsQ0FBQ0E7SUFDTEgsZUFBQ0E7QUFBREEsQ0F4Q0EsQUF3Q0NBLElBQUE7QUF4Q1ksZ0JBQVEsV0F3Q3BCLENBQUE7QUFHRDs7Ozs7R0FLRztBQUNILGtCQUF5QixVQUFpQyxFQUFFLEtBQWlCO0lBQ3pFSSxNQUFNQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUFDQSxVQUFTQSxRQUFRQTtRQUNsQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsVUFBUyxJQUFVLEVBQUUsZUFBdUI7WUFDeEUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxlQUFlLENBQUM7Z0JBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLGFBQWEsR0FBRyxlQUFlLENBQUMsQ0FBQztZQUN4SCxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxFQUFFQSxLQUFLQSxDQUFDQSxDQUFDQTtBQUNkQSxDQUFDQTtBQVBlLGdCQUFRLFdBT3ZCLENBQUE7QUFFRCxzRkFBc0Y7QUFDdEYsd0JBQXdCO0FBQ3hCLHFCQUE0QixXQUFxQixFQUFFLEtBQWlCO0lBQ2hFQyxJQUFJQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQTtJQUVkQSxNQUFNQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUFDQSxVQUFTQSxRQUFRQTtRQUNsQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxVQUFTLElBQVU7WUFDekMsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUN6RixJQUFJLFFBQVEsR0FBRyw2QkFBNkIsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLGFBQWEsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQzlGLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDOUIsQ0FBQztZQUNELEtBQUssRUFBRyxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBO0FBQ2RBLENBQUNBO0FBZGUsbUJBQVcsY0FjMUIsQ0FBQTtBQUVEOztHQUVHO0FBQ0gsa0JBQXlCLENBQVksRUFBRSxDQUFZO0lBQy9DQyxNQUFNQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUNoQkEsVUFBQ0EsUUFBb0JBO1FBQ2pCQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUN4Q0EsQ0FBQ0EsQ0FDSkEsQ0FBQ0E7QUFDTkEsQ0FBQ0E7QUFOZSxnQkFBUSxXQU12QixDQUFBO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsa0JBQ0ksVUFBa0Q7SUFHbERDLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLFVBQVVBLElBQWdCQTtRQUMzQyxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDO1lBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRXRELElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO1FBQ3pCLElBQUksV0FBVyxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBUSxDQUFDO1FBRXpDO1lBQ0lDLEVBQUVBLENBQUNBLENBQUNBLGtCQUFVQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsNEJBQTRCQSxDQUFDQSxDQUFDQTtZQUMxREEsZ0JBQWdCQSxFQUFHQSxDQUFDQTtRQUN4QkEsQ0FBQ0E7UUFFRCxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQVMsU0FBb0I7WUFDNUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNuQixTQUFTLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFmLENBQWUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUNsRSxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQWxCLENBQWtCLEVBQzlCLGVBQWUsRUFDZixlQUFlLENBQUMsQ0FBQTtRQUN4QixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQU0sT0FBQSxnQkFBZ0IsR0FBRyxDQUFDLEVBQXBCLENBQW9CLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxJQUFVO1lBQ3ZFLEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNwRSxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQy9ELENBQUMsQ0FDSixDQUFDO0lBQ04sQ0FBQyxDQUFDRCxDQUFDQTtBQUNQQSxDQUFDQTtBQTlCZSxnQkFBUSxXQThCdkIsQ0FBQTtBQUVELGVBQ0ksQ0FBUyxFQUFFLG9CQUFvQjtJQUMvQixTQUFvQjtJQUVwQkUsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDL0RBLENBQUNBO0FBTGUsYUFBSyxRQUtwQixDQUFBO0FBRUQ7OztHQUdHO0FBQ0gsY0FDSSxTQUFvQjtJQUdwQkMsTUFBTUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsVUFBVUEsSUFBZ0JBO1FBQzNDLEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7WUFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDbEQsSUFBSSxXQUFXLEdBQUcsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFRLENBQUM7UUFFekMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBUyxJQUFVO1lBQ2pDLEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxRCxTQUFTLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUNKLENBQUM7SUFDTixDQUFDLENBQUNBLENBQUNBO0FBQ1BBLENBQUNBO0FBZmUsWUFBSSxPQWVuQixDQUFBO0FBR0Q7Ozs7R0FJRztBQUNILGNBQ0ksU0FBb0I7SUFHcEJDLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLFVBQVVBLElBQWdCQTtRQUMzQyxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDO1lBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBR2xELE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBTyxVQUFTLFFBQVE7WUFDL0MsRUFBRSxDQUFDLENBQUMsa0JBQVUsQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDckQsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3JCLElBQUksZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO1lBQzVCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVWLG9CQUFvQixJQUFJO2dCQUNwQkMsRUFBRUEsQ0FBQ0EsQ0FBQ0Esa0JBQVVBLENBQUNBO29CQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxrQ0FBa0NBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO2dCQUVuRUEsU0FBU0EsR0FBR0EsSUFBSUEsRUFBRUEsQ0FBQ0EsT0FBT0EsRUFBUUEsQ0FBQ0E7Z0JBRW5DQSxnQkFBZ0JBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLFNBQVNBLENBQ3BEQSxVQUFTQSxJQUFJQTtvQkFDVCxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDO3dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLENBQUMsQ0FBQztvQkFDbkUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxFQUNEQSxVQUFTQSxHQUFHQTtvQkFDUixFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDO3dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLENBQUMsQ0FBQztvQkFDdkUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxFQUNEQTtvQkFDSSxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDO3dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQztvQkFDMUQsU0FBUyxHQUFHLElBQUksQ0FBQztnQkFDckIsQ0FBQyxDQUNKQSxDQUFDQTtnQkFDRkEsRUFBRUEsQ0FBQ0EsQ0FBQ0Esa0JBQVVBLENBQUNBO29CQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSw0Q0FBNENBLENBQUNBLENBQUFBO1lBQzdFQSxDQUFDQTtZQUVELElBQUksQ0FBQyxTQUFTLENBQ1YsVUFBUyxJQUFJO2dCQUNULEVBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNwQixFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDO3dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztvQkFDbkQsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNyQixDQUFDO2dCQUNELEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7b0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO2dCQUM1RCxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUV2QixDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNqQixDQUFDLEVBQ0QsVUFBUyxHQUFHO2dCQUNSLEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7b0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDdkUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxQixDQUFDLEVBQ0QsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQ3RDLENBQUM7WUFFRixNQUFNLENBQUM7Z0JBQ0gsU0FBUztnQkFDVCxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDO29CQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzdDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQztvQkFBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdkMsQ0FBQyxDQUFBO1FBQ0wsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDRCxDQUFDQTtBQUNQQSxDQUFDQTtBQTdEZSxZQUFJLE9BNkRuQixDQUFBO0FBRUQsY0FDSSxXQUF5QyxFQUN6QyxLQUFpQjtJQUdqQkUsTUFBTUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsVUFBVUEsUUFBb0JBO1FBQy9DLElBQUksSUFBSSxHQUF5QixXQUFXLEVBQUUsQ0FBQztRQUMvQyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNwQyxDQUFDLEVBQUVBLEtBQUtBLENBQUNBLENBQUNBO0FBQ2RBLENBQUNBO0FBVGUsWUFBSSxPQVNuQixDQUFBO0FBRUQsbUJBQ0ksS0FBZSxFQUNmLFNBQXFCO0lBRXJCQyxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtRQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUNBO0lBQzlDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUNQQTtRQUNJQSxJQUFJQSxVQUFVQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUM5Q0EsTUFBTUEsQ0FBQ0EsVUFBU0EsSUFBSUE7WUFDaEIsSUFBSSxLQUFLLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuQyxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDaEIsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxFQUNIQSxTQUFTQSxDQUFDQSxDQUFDQTtBQUNqQkEsQ0FBQ0E7QUFoQmUsaUJBQVMsWUFnQnhCLENBQUE7QUFFRCxrQ0FDSSxjQUFzQixFQUN0QixTQUFxQjtJQUVyQkMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FDUEE7UUFDSUEsTUFBTUEsQ0FBQ0EsVUFBU0EsSUFBSUE7WUFDaEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsR0FBRyxjQUFjLENBQUM7UUFDdkQsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxFQUNIQSxTQUFTQSxDQUFDQSxDQUFDQTtBQUNqQkEsQ0FBQ0E7QUFYZSxnQ0FBd0IsMkJBV3ZDLENBQUE7QUFHRCxrQkFDSSxRQUFrQixFQUNsQixTQUFxQjtJQUVyQkMsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7UUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxDQUFDQTtJQUM3Q0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FDUEE7UUFDSUEsSUFBSUEsR0FBR0EsR0FBVUEsQ0FBQ0EsR0FBR0EsRUFBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDM0JBLElBQUlBLGFBQWFBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3BEQSxNQUFNQSxDQUFDQSxVQUFTQSxJQUFJQTtZQUNoQixJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9DLElBQUksUUFBUSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDekMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2hDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNwQyxDQUFDLENBQUFBO0lBQ0xBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ3RCQSxDQUFDQTtBQWhCZSxnQkFBUSxXQWdCdkIsQ0FBQTtBQUVELHNCQUNJLElBQWMsRUFDZCxFQUFjLEVBQ2QsSUFBZSxFQUNmLFNBQXFCLENBQUMsWUFBWTtJQUdsQ0MsTUFBTUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsVUFBU0EsSUFBZ0JBO1FBQzFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNWLElBQUksU0FBUyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDNUMsSUFBSSxPQUFPLEdBQUssU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMxQyxJQUFJLFNBQVMsR0FBSyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVMsSUFBVTtZQUMvQixFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN2QyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLElBQUksRUFBRSxHQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0IsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVqQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDaEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztnQkFBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQy9DLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQy9DLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBUyxJQUFJLElBQUcsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQSxDQUFDLENBQUMsQ0FBQTtJQUNuRCxDQUFDLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ2xCQSxDQUFDQTtBQTFCZSxvQkFBWSxlQTBCM0IsQ0FBQTtBQUVELG1CQUNJLEtBQWUsRUFDZixTQUFxQjtJQUVyQkMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FDUEE7UUFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsbUJBQW1CQSxDQUFDQSxDQUFDQTtRQUM1Q0EsSUFBSUEsVUFBVUEsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDOUNBLE1BQU1BLENBQUNBLFVBQVVBLElBQVVBO1lBQ3ZCLElBQUksS0FBSyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkMsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdEQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQy9CLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBZGUsaUJBQVMsWUFjeEIsQ0FBQTtBQUdELHFCQUNJLEtBQWUsRUFDZixTQUFxQjtJQUVyQkMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FDUEE7UUFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxDQUFDQSxDQUFDQTtRQUM5Q0EsSUFBSUEsVUFBVUEsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDOUNBLE1BQU1BLENBQUNBLFVBQVVBLElBQVVBO1lBQ3ZCLElBQUksS0FBSyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkMsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ2pDLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBZGUsbUJBQVcsY0FjMUIsQ0FBQTtBQUVELHFCQUNJLEtBQWUsRUFDZixTQUFxQjtJQUVyQkMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FDUEE7UUFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxDQUFDQSxDQUFDQTtRQUM5Q0EsSUFBSUEsVUFBVUEsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDOUNBLE1BQU1BLENBQUNBLFVBQVVBLElBQVVBO1lBQ3ZCLElBQUksS0FBSyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkMsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO1FBQ2pDLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBZGUsbUJBQVcsY0FjMUIsQ0FBQTtBQUNELG9CQUNJLEtBQWdCLEVBQ2hCLFNBQXFCO0lBRXJCQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUNQQTtRQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtZQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxvQkFBb0JBLENBQUNBLENBQUNBO1FBQzdDQSxJQUFJQSxVQUFVQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUM5Q0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBVUE7WUFDdkIsSUFBSSxLQUFLLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuQyxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDaEMsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtBQUN0QkEsQ0FBQ0E7QUFkZSxrQkFBVSxhQWN6QixDQUFBO0FBR0Qsc0JBQ0ksRUFBWSxFQUNaLFNBQXFCO0lBRXJCQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUNQQTtRQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtZQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxzQkFBc0JBLENBQUNBLENBQUNBO1FBQy9DQSxJQUFJQSxPQUFPQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUN4Q0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBVUE7WUFDdkIsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM3QixFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN2RCxJQUFJLENBQUMsR0FBRyxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBZmUsb0JBQVksZUFlM0IsQ0FBQTtBQUVELGlCQUNJLEtBQWdCLEVBQ2hCLFNBQXFCO0lBRXJCQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUNQQTtRQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtZQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxpQkFBaUJBLENBQUNBLENBQUNBO1FBQzFDQSxJQUFJQSxRQUFRQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUM1Q0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBVUE7WUFDdkIsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMvQixFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNoRCxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUM7UUFDM0IsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtBQUN0QkEsQ0FBQ0E7QUFkZSxlQUFPLFVBY3RCLENBQUE7QUFDRCxrQkFDSSxLQUFnQixFQUNoQixTQUFxQjtJQUVyQkMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FDUEE7UUFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxDQUFDQTtRQUMzQ0EsSUFBSUEsUUFBUUEsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDNUNBLE1BQU1BLENBQUNBLFVBQVVBLElBQVVBO1lBQ3ZCLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0IsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDakQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDO1FBQzVCLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBZGUsZ0JBQVEsV0FjdkIsQ0FBQTtBQUVELG1CQUNJLEtBQWdCLEVBQ2hCLFNBQXFCO0lBRXJCQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUNQQTtRQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtZQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO1FBQzVDQSxJQUFJQSxVQUFVQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUM5Q0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBVUE7WUFDdkIsSUFBSSxLQUFLLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuQyxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN0RCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDL0IsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtBQUN0QkEsQ0FBQ0E7QUFkZSxpQkFBUyxZQWN4QixDQUFBO0FBRUQsb0JBQ0ksS0FBZ0IsRUFDaEIsU0FBcUI7SUFFckJDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsQ0FBQ0E7UUFDN0NBLElBQUlBLFFBQVFBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQzVDQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQy9CLEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3RELElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztRQUM5QixDQUFDLENBQUFBO0lBQ0xBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ3RCQSxDQUFDQTtBQWRlLGtCQUFVLGFBY3pCLENBQUE7QUFHRCxjQUNJLEVBQVksRUFDWixZQUFzQixFQUN0QixTQUFxQjtJQUVyQkMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FDUEE7UUFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsQ0FBQ0E7UUFDdkNBLElBQUlBLE9BQU9BLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3hDQSxJQUFJQSxpQkFBaUJBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBRTVEQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixJQUFJLEVBQUUsR0FBVSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BDLElBQUksWUFBWSxHQUFVLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4RCxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ3ZELElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBbEJlLFlBQUksT0FrQm5CLENBQUE7QUFFRCxrQkFDSSxFQUFZLEVBQ1osWUFBc0IsRUFDdEIsU0FBcUI7SUFFckJDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGtCQUFrQkEsQ0FBQ0EsQ0FBQ0E7UUFDM0NBLElBQUlBLE9BQU9BLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3hDQSxJQUFJQSxpQkFBaUJBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBRTVEQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixJQUFJLEVBQUUsR0FBVSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BDLElBQUksWUFBWSxHQUFVLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4RCxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDL0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEUsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtBQUN0QkEsQ0FBQ0E7QUFsQmUsZ0JBQVEsV0FrQnZCLENBQUE7QUFFRCxvQkFDSSxFQUFZLEVBQ1osWUFBc0IsRUFDdEIsU0FBcUI7SUFFckJDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsQ0FBQ0E7UUFDN0NBLElBQUlBLE9BQU9BLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3hDQSxJQUFJQSxpQkFBaUJBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBRTVEQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixJQUFJLEVBQUUsR0FBVSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BDLElBQUksWUFBWSxHQUFVLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4RCxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDbkUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEUsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtBQUN0QkEsQ0FBQ0E7QUFsQmUsa0JBQVUsYUFrQnpCLENBQUE7QUFDRCxtQkFDSSxFQUFZLEVBQ1osWUFBc0IsRUFDdEIsU0FBcUI7SUFFckJDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0E7UUFDNUNBLElBQUlBLE9BQU9BLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3hDQSxJQUFJQSxpQkFBaUJBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBRTVEQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixJQUFJLEVBQUUsR0FBVSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BDLElBQUksWUFBWSxHQUFVLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4RCxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDakUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtBQUN0QkEsQ0FBQ0E7QUFsQmUsaUJBQVMsWUFrQnhCLENBQUE7QUFHRCxvQkFDSSxLQUFnQjtJQUVoQkMsTUFBTUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FDaEJBLFVBQUNBLFFBQW9CQTtRQUNqQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxDQUFDQTtRQUM3Q0EsSUFBSUEsb0JBQW9CQSxHQUFHQSxRQUFRQSxDQUFDQSxTQUFTQSxDQUN6Q0EsVUFBVUEsSUFBVUEsSUFBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUEsQ0FBQyxDQUNoREEsQ0FBQ0E7UUFDRkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUMvQ0EsVUFBVUEsSUFBVUEsSUFBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUEsQ0FBQyxDQUNoREEsQ0FBQUE7SUFDTEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDWEEsQ0FBQ0E7QUFiZSxrQkFBVSxhQWF6QixDQUFBO0FBRUQsZ0JBQ0ksU0FBcUI7SUFFckJDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsQ0FBQ0E7UUFDekNBLE1BQU1BLENBQUNBLFVBQVVBLElBQVVBO1lBQ3ZCLEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN0QixDQUFDLENBQUFBO0lBQ0xBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ3RCQSxDQUFDQTtBQVhlLGNBQU0sU0FXckIsQ0FBQTtBQUVELGNBQ0ksU0FBcUI7SUFFckJDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBO1FBQ3ZDQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUN2QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3BCLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBWGUsWUFBSSxPQVduQixDQUFBO0FBRUQsZ0JBQ0ksRUFBWSxFQUNaLFNBQXFCO0lBRXJCQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUNQQTtRQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtZQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxnQkFBZ0JBLENBQUNBLENBQUNBO1FBQ3pDQSxJQUFJQSxPQUFPQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUN4Q0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBVUE7WUFDdkIsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM3QixFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtBQUN0QkEsQ0FBQ0E7QUFkZSxjQUFNLFNBY3JCLENBQUE7QUFFRCxnQkFDSSxFQUFZLEVBQ1osU0FBcUI7SUFFckJDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsQ0FBQ0E7UUFDekNBLElBQUlBLE9BQU9BLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3hDQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixJQUFJLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdCLEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQyxDQUFDLENBQUFBO0lBQ0xBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ3RCQSxDQUFDQTtBQWRlLGNBQU0sU0FjckIsQ0FBQTtBQUdELGNBQ0ksU0FBcUI7SUFFckJDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBO1FBQ3ZDQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3BCLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBWGUsWUFBSSxPQVduQixDQUFBO0FBRUQsMEJBQWlDLE9BQWlCLEVBQUUsR0FBYSxFQUFFLFNBQXFCO0lBQ3BGQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUNQQTtRQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtZQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSwwQkFBMEJBLENBQUNBLENBQUNBO1FBQ25EQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUMvQ0EsSUFBSUEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDM0NBLE1BQU1BLENBQUNBLFVBQVVBLElBQVVBO1lBQ3ZCLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUFBO0lBQ0xBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ3RCQSxDQUFDQTtBQWJlLHdCQUFnQixtQkFhL0IsQ0FBQTtBQUNEOztHQUVHO0FBQ0gsdUJBQThCLFFBQWtCLEVBQUUsUUFBa0IsRUFBRSxHQUFhLEVBQUUsU0FBcUI7SUFDdEdDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHVCQUF1QkEsQ0FBQ0EsQ0FBQ0E7UUFDaERBLElBQUlBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ2hEQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUNoREEsSUFBSUEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDM0NBLE1BQU1BLENBQUNBLFVBQVVBLElBQVVBO1lBQ3ZCLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRixDQUFDLENBQUFBO0lBQ0xBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ3RCQSxDQUFDQTtBQWZlLHFCQUFhLGdCQWU1QixDQUFBO0FBQ0Q7O0dBRUc7QUFDSCxhQUFvQixNQUFnQixFQUFFLE1BQWlCLEVBQ25ELGFBQXdCLEVBQUUsV0FBc0IsRUFDaEQsZ0JBQTBCLEVBQUUsU0FBcUI7SUFDakRDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBO1FBQ3RDQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUM5Q0EsSUFBSUEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDOUNBLElBQUlBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3JEQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUNuREEsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBVUE7WUFDdkIsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3ZFLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBbkJlLFdBQUcsTUFtQmxCLENBQUE7QUFFRDs7R0FFRztBQUNILGVBQXNCLFFBQWtCLEVBQUUsUUFBa0IsRUFBRSxNQUFpQixFQUFFLFNBQXFCO0lBQ2xHQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUNQQTtRQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtZQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQTtRQUN0Q0EsSUFBSUEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDaERBLElBQUlBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ2hEQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUM5Q0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBVUE7WUFDdkIsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDckQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdELENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBZmUsYUFBSyxRQWVwQixDQUFBO0FBQ0Q7O0dBRUc7QUFDSCxlQUFzQixFQUFZLEVBQUUsU0FBcUI7SUFDckRDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBO1FBQ3hDQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUMxQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBVUE7WUFDdkIsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBWGUsYUFBSyxRQVdwQixDQUFBO0FBQ0Q7O0dBRUc7QUFDSCxnQkFBdUIsSUFBZSxFQUFFLFNBQXFCO0lBQ3pEQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUNQQTtRQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtZQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxnQkFBZ0JBLENBQUNBLENBQUNBO1FBQ3pDQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUM1Q0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBVUE7WUFDdkIsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMvQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtBQUN0QkEsQ0FBQ0E7QUFYZSxjQUFNLFNBV3JCLENBQUE7QUFDRDs7Ozs7R0FLRztBQUNILG1CQUEwQixDQUFZLEVBQUUsQ0FBWSxFQUFFLENBQVksRUFDeEQsQ0FBWSxFQUFFLENBQVksRUFBRSxDQUFZLEVBQUUsU0FBcUI7SUFDckVDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0E7UUFDNUNBLElBQUlBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3pDQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUN6Q0EsSUFBSUEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDekNBLElBQUlBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3pDQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUN6Q0EsSUFBSUEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDekNBLE1BQU1BLENBQUNBLFVBQVVBLElBQVVBO1lBQ3ZCLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbkYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMzRCxDQUFDLENBQUFBO0lBQ0xBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ3RCQSxDQUFDQTtBQXRCZSxpQkFBUyxZQXNCeEIsQ0FBQTtBQUNEOztHQUVHO0FBQ0gsc0JBQTZCLENBQVksRUFBRSxDQUFZLEVBQUUsQ0FBWSxFQUN4RCxDQUFZLEVBQUUsQ0FBWSxFQUFFLENBQVksRUFBRSxTQUFxQjtJQUN4RUMsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FDUEE7UUFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esc0JBQXNCQSxDQUFDQSxDQUFDQTtRQUMvQ0EsSUFBSUEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDekNBLElBQUlBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3pDQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUN6Q0EsSUFBSUEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDekNBLElBQUlBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3pDQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUN6Q0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBVUE7WUFDdkIsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6RixJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlELENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7QUFDdEJBLENBQUNBO0FBdEJlLG9CQUFZLGVBc0IzQixDQUFBO0FBQ0Q7O0dBRUc7QUFDSCxjQUFxQixLQUFnQixFQUFFLFNBQXFCO0lBQ3hEQyxNQUFNQSxDQUFDQSxJQUFJQSxDQUNQQTtRQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtZQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxjQUFjQSxDQUFDQSxDQUFDQTtRQUN2Q0EsSUFBSUEsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDN0NBLE1BQU1BLENBQUNBLFVBQVVBLElBQVVBO1lBQ3ZCLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUN6QixDQUFDLENBQUFBO0lBQ0xBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ3RCQSxDQUFDQTtBQVhlLFlBQUksT0FXbkIsQ0FBQTtBQUNEOztHQUVHO0FBQ0gsbUJBQTBCLEtBQWdCLEVBQUUsU0FBcUI7SUFDN0RDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0E7UUFDNUNBLElBQUlBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQzdDQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3JELElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUM5QixDQUFDLENBQUFBO0lBQ0xBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ3RCQSxDQUFDQTtBQVhlLGlCQUFTLFlBV3hCLENBQUE7QUFDRDs7R0FFRztBQUNILHNCQUE2QixLQUFhLEVBQUUsU0FBcUI7SUFDN0RDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHNCQUFzQkEsQ0FBQ0EsQ0FBQ0E7UUFDL0NBLElBQUlBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQzdDQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUNqQyxDQUFDLENBQUFBO0lBQ0xBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ3RCQSxDQUFDQTtBQVhlLG9CQUFZLGVBVzNCLENBQUE7QUFDRDs7R0FFRztBQUNILGtCQUF5QixJQUFlLEVBQUUsRUFBWSxFQUFFLFFBQW9CLEVBQUUsU0FBcUI7SUFDL0ZDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGtCQUFrQkEsQ0FBQ0EsQ0FBQ0E7UUFDM0NBLElBQUlBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQzVDQSxJQUFJQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUMxQ0EsSUFBSUEsU0FBU0EsR0FBR0EsUUFBUUEsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsR0FBRUEsU0FBU0EsQ0FBQ0E7UUFDdEVBLE1BQU1BLENBQUNBLFVBQVVBLElBQVVBO1lBQ3ZCLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqQyxJQUFJLElBQUksR0FBRyxRQUFRLEdBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRSxTQUFTLENBQUM7WUFDdEQsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMvRCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNYLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3BELENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlDLENBQUM7UUFDTCxDQUFDLENBQUFBO0lBQ0xBLENBQUNBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBO0FBQ3RCQSxDQUFDQTtBQW5CZSxnQkFBUSxXQW1CdkIsQ0FBQTtBQUNEOztHQUVHO0FBQ0gsbUJBQTBCLEdBQUcsRUFBRSxFQUFZLEVBQUUsU0FBcUI7SUFDOURDLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0E7UUFDNUNBLElBQUlBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQzFDQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pDLEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3JELElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQTtBQUN0QkEsQ0FBQ0E7QUFYZSxpQkFBUyxZQVd4QixDQUFBO0FBR0QscUVBQXFFO0FBQ3JFLHVDQUF1QztBQUN2QywyRkFBMkY7QUFDM0YsRUFBRTtBQUNGLGtFQUFrRTtBQUNsRSwrRUFBK0U7QUFDL0UsRUFBRTtBQUNGLDRDQUE0QztBQUU1QyxlQUFlO0FBQ2YsRUFBRTtBQUNGLFVBQVU7QUFDVix3Q0FBd0M7QUFDeEMsOEJBQThCO0FBQzlCLDRCQUE0QjtBQUM1QixpQkFBaUI7QUFDakIsRUFBRTtBQUNGLHdEQUF3RDtBQUN4RCx5RkFBeUY7QUFDekYsMkNBQTJDO0FBQzNDLHlCQUF5QjtBQUN6QixrREFBa0Q7QUFDbEQsa0RBQWtEO0FBQ2xELHFEQUFxRDtBQUVyRCxtQ0FBbUM7QUFDbkMsa0RBQWtEO0FBRWxELHNDQUFzQztBQUN0QyxvQkFBb0I7QUFDcEIsNEJBQTRCO0FBQzVCLDZGQUE2RjtBQUc3RixjQUNJLEtBQXNCLEVBQ3RCLEtBQWtCO0lBRGxCQyxxQkFBc0JBLEdBQXRCQSxXQUFzQkE7SUFJdEJBLE1BQU1BLENBQUNBLElBQUlBLENBQ1BBO1FBQ0lBLElBQUlBLFVBQVVBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQzlDQSxNQUFNQSxDQUFDQSxVQUFVQSxJQUFVQTtZQUN2QixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBRW5CLHFCQUFxQjtZQUNyQixJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztZQUM3QixJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUMvQixJQUFJLE1BQU0sR0FBRyxLQUFLLEdBQUcsTUFBTSxDQUFDO1lBQzVCLElBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxLQUFLLEVBQUMsTUFBTSxDQUFDLENBQUM7WUFDakQsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztZQUN4QixJQUFJLEtBQUssR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRW5DLDZDQUE2QztZQUU3QyxrQkFBa0I7WUFDbEIsbUdBQW1HO1lBQ25HLHVHQUF1RztZQUN2RyxJQUFJLFFBQVEsR0FBYSxJQUFJLEtBQUssQ0FBUyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUM7WUFFckQsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFckQsOEVBQThFO1lBQzlFLElBQUksR0FBRyxHQUE2QixDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsSUFBSSxHQUFHLEdBQTZCLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztZQUU1QyxpRUFBaUU7WUFDakUsR0FBRyxDQUFBLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM3QixHQUFHLENBQUEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzVCLElBQUksR0FBRyxHQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUN4QyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzVDLElBQUksSUFBSSxHQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDNUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUc1QyxpQkFBaUI7b0JBQ2pCLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFJaEMsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNqQixJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhO29CQUMvQixJQUFJLFdBQVcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUU3QiwyREFBMkQ7b0JBQzNELHlEQUF5RDtvQkFDekQsd0RBQXdEO29CQUN4RCwrQ0FBK0M7b0JBQy9DLDRFQUE0RTtvQkFDNUUsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQzlELFNBQVMsSUFBSSxHQUFHLENBQUM7b0JBQ2pCLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ2hELElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ25ELElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ2hELElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBR3BELEdBQUcsQ0FBQSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzt3QkFDMUIsR0FBRyxDQUFBLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDOzRCQUMxQixJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUNmLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQ2YsSUFBSSxTQUFTLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDOzRCQUVsQywyREFBMkQ7NEJBQzNELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxLQUFLLEdBQUcsV0FBVyxDQUFDLENBQUM7NEJBRXRFLE1BQU0sQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7NEJBQ2pCLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7NEJBQ2YsR0FBRyxHQUFHLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzs0QkFDaEMsZ0NBQWdDOzRCQUNoQyw0REFBNEQ7NEJBQzVELElBQUksT0FBTyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7NEJBRXhCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUNoQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQ3BDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDcEMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUVwQywyQkFBMkI7NEJBQzNCLHVCQUF1Qjs0QkFJdkIsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUc5QixNQUFNLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUNyQixNQUFNLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUNyQixNQUFNLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUN2QixNQUFNLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUV2QixxQ0FBcUM7NEJBQ3JDLHFFQUFxRTs0QkFDckUsb0RBQW9EOzRCQUVwRCxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUVsQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDOzRCQUM3QixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDOzRCQUM3QixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDOzRCQUM3QixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUUzQjs7Ozs4QkFJRTs0QkFFRiw0Q0FBNEM7NEJB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LENBQUNBLENBQUNBO1FBQ0pBLElBQUlBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBO1FBQ2xCQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNwREEsTUFBTUEsQ0FBQUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQUEsQ0FBQ0E7WUFDUkEsS0FBS0EsQ0FBQ0E7Z0JBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO2dCQUFDQSxLQUFLQSxDQUFDQTtZQUNqREEsS0FBS0EsQ0FBQ0E7Z0JBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUFDQSxLQUFLQSxDQUFDQTtZQUNuQ0EsS0FBS0EsQ0FBQ0E7Z0JBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUFDQSxLQUFLQSxDQUFDQTtRQUN2Q0EsQ0FBQ0E7UUFDREEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7SUFDWEEsQ0FBQ0E7SUFDREEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBT0Esa0JBQWtCQTtJQUNqREEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsV0FBV0E7SUFDcENBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLFdBQVdBO0lBRXBDQSw2Q0FBNkNBO0lBRTdDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtBQUNwQkEsQ0FBQ0E7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0gsa0JBQWtCLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQWtDO0lBQ3pEQyxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQTtJQUNaQSwyQ0FBMkNBO0lBRTNDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUNkQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUNkQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUVkQSxFQUFFQSxDQUFBQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFBQSxDQUFDQTtRQUNQQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxhQUFhQTtJQUNoQ0EsQ0FBQ0E7SUFBQUEsSUFBSUEsQ0FBQUEsQ0FBQ0E7UUFDRkEsSUFBSUEsT0FBT0EsR0FBR0EsaUJBQWlCQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQTtZQUNsQ0MsRUFBRUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFBQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDakJBLEVBQUVBLENBQUFBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBO2dCQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUN2Q0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1lBQ3JCQSxFQUFFQSxDQUFBQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQTtnQkFBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDL0NBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1FBQ2JBLENBQUNBLENBQUNEO1FBRUZBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQzlDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNsQkEsQ0FBQ0EsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDM0JBLENBQUNBLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO1FBQ3JCQSxDQUFDQSxHQUFHQSxPQUFPQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUMvQkEsQ0FBQ0E7SUFFREEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0E7SUFDdEJBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBO0lBQ3RCQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQTtJQUV0QkEscUNBQXFDQTtJQUVyQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7QUFDcEJBLENBQUNBIiwiZmlsZSI6ImFuaW1heGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbm9kZV9tb2R1bGVzL3J4L3RzL3J4LmFsbC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9ub2RlLmQudHNcIiAvPlxuaW1wb3J0IFJ4ID0gcmVxdWlyZSgncngnKTtcbmltcG9ydCBQYXJhbWV0ZXIgPSByZXF1aXJlKCcuL3BhcmFtZXRlcicpO1xuXG5leHBvcnQgdmFyIERFQlVHX0xPT1AgPSBmYWxzZTtcbmV4cG9ydCB2YXIgREVCVUdfVEhFTiA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVR19FTUlUID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHID0gZmFsc2U7XG5cbmNvbnNvbGUubG9nKFwiQW5pbWF4ZSwgaHR0cHM6Ly9naXRodWIuY29tL3RvbWxhcmt3b3J0aHkvYW5pbWF4ZVwiKTtcblxuLyoqXG4gKiBBIHBhcmFtZXRlciBpcyB1c2VkIGZvciB0aW1lIHZhcnlpbmcgdmFsdWVzIHRvIGFuaW1hdGlvbiBmdW5jdGlvbnMuXG4gKiBCZWZvcmUgYSBwYXJhbWV0ZXIgaXMgdXNlZCwgdGhlIGVuY2xvc2luZyBhbmltYXRpb24gbXVzdCBjYWxsIGluaXQuIFRoaXMgcmV0dXJucyBhIGZ1bmN0aW9uIHdoaWNoXG4gKiBjYW4gYmUgdXNlZCB0byBmaW5kIHRoZSB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gZm9yIHNwZWNpZmljIHZhbHVlcyBvZiB0aW1lLiBUeXBpY2FsbHkgdGhpcyBpcyBkb25lIHdpdGhpbiB0aGVcbiAqIGFuaW1hdGlvbidzIGNsb3N1cmUuIEZvciBleGFtcGxlOlxuYGBgXG5mdW5jdGlvbiBtb3ZlVG8oXG4gICAgeHk6IFBvaW50QXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpOyAvLyBpbml0IHRvIG9idGFpbiAnbmV4dCdcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBEcmF3VGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eSA9IHh5X25leHQodGljay5jbG9jayk7IC8vIHVzZSAnbmV4dCcgdG8gZ2V0IHZhbHVlXG4gICAgICAgICAgICAgICAgdGljay5jdHgubW92ZVRvKHh5WzBdLCB4eVsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5gYGBcbiAqXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyPFQ+IGV4dGVuZHMgUGFyYW1ldGVyLlBhcmFtZXRlcjxUPiB7fVxuXG4vLyB0b2RvIHdlIHNob3VsZCBtb3ZlIHRoZXNlIGludG8gYW4gRVM2IG1vZHVsZSBidXQgbXkgSURFIGRvZXMgbm90IHN1cHBvcnQgaXQgeWV0XG4vKipcbiAqIEEgY3NzIGVuY29kZWQgY29sb3IsIGUuZy4gXCJyZ2JhKDI1NSwgMTI1LCAzMiwgMC41KVwiIG9yIFwicmVkXCJcbiAqL1xuZXhwb3J0IHR5cGUgQ29sb3IgPSBzdHJpbmdcbi8qKlxuICogQSAyRCBhcnJheSBvZiBudW1iZXJzIHVzZWQgZm9yIHJlcHJlc2VudGluZyBwb2ludHMgb3IgdmVjdG9yc1xuICovXG5leHBvcnQgdHlwZSBQb2ludCAgICAgPSBbbnVtYmVyLCBudW1iZXJdXG4vKipcbiAqIEEgbGl0ZXJhbCBvciBhIGR5bmFtaWMgUGFyYW1ldGVyIGFsaWFzLCB1c2VkIGFzIGFyZ3VtZW50cyB0byBhbmltYXRpb25zLlxuICovXG5leHBvcnQgdHlwZSBOdW1iZXJBcmcgPSBudW1iZXIgfCBQYXJhbWV0ZXI8bnVtYmVyPlxuLyoqXG4gKiBBIGxpdGVyYWwgb3IgYSBkeW5hbWljIFBhcmFtZXRlciBhbGlhcywgdXNlZCBhcyBhcmd1bWVudHMgdG8gYW5pbWF0aW9ucy5cbiAqL1xuZXhwb3J0IHR5cGUgUG9pbnRBcmcgID0gUG9pbnQgfCBQYXJhbWV0ZXI8UG9pbnQ+XG4vKipcbiAqIEEgbGl0ZXJhbCBvciBhIGR5bmFtaWMgUGFyYW1ldGVyIGFsaWFzLCB1c2VkIGFzIGFyZ3VtZW50cyB0byBhbmltYXRpb25zLlxuICovXG5leHBvcnQgdHlwZSBDb2xvckFyZyAgPSBDb2xvciB8IFBhcmFtZXRlcjxDb2xvcj5cbi8qKlxuICogQSBsaXRlcmFsIG9yIGEgZHluYW1pYyBQYXJhbWV0ZXIgYWxpYXMsIHVzZWQgYXMgYXJndW1lbnRzIHRvIGFuaW1hdGlvbnMuXG4gKi9cbmV4cG9ydCB0eXBlIFN0cmluZ0FyZyA9IHN0cmluZyB8IFBhcmFtZXRlcjxzdHJpbmc+XG5cbi8qKlxuICogRWFjaCBmcmFtZSBhbiBhbmltYXRpb24gaXMgcHJvdmlkZWQgYSBUaWNrLiBUaGUgdGljayBleHBvc2VzIGFjY2VzcyB0byB0aGUgbG9jYWwgYW5pbWF0aW9uIHRpbWUsIHRoZVxuICogdGltZSBkZWx0YSBiZXR3ZWVuIHRoZSBwcmV2aW91cyBmcmFtZSAoZHQpIGFuZCB0aGUgZHJhd2luZyBjb250ZXh0LiBBbmltYXRvcnMgdHlwaWNhbGx5IHVzZSB0aGUgZHJhd2luZyBjb250ZXh0XG4gKiBkaXJlY3RseSwgYW5kIHBhc3MgdGhlIGNsb2NrIG9udG8gYW55IHRpbWUgdmFyeWluZyBwYXJhbWV0ZXJzLlxuICovXG5leHBvcnQgY2xhc3MgVGljayB7XG4gICAgY29uc3RydWN0b3IgKHB1YmxpYyBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgcHVibGljIGNsb2NrOiBudW1iZXIsIHB1YmxpYyBkdDogbnVtYmVyKSB7fVxufVxuXG4vKipcbiAqIFRoZSBzdHJlYW0gb2YgVGljaydzIGFuIGFuaW1hdGlvbiBpcyBwcm92aWRlZCB3aXRoIGlzIHJlcHJlc2VudGVkIGJ5IGEgcmVhY3RpdmUgZXh0ZW5zaW9uIG9ic2VydmFibGUuXG4gKi9cbmV4cG9ydCB0eXBlIFRpY2tTdHJlYW0gPSBSeC5PYnNlcnZhYmxlPFRpY2s+O1xuXG5cbmZ1bmN0aW9uIGFzc2VydChwcmVkaWNhdGU6IGJvb2xlYW4sIG1lc3NhZ2UgPzogc3RyaW5nKSB7XG4gICAgaWYgKCFwcmVkaWNhdGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihzdGFja1RyYWNlKCkpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0YWNrVHJhY2UoKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIHJldHVybiAoPGFueT5lcnIpLnN0YWNrO1xufVxuXG4vKipcbiAqIEFuIGFuaW1hdGlvbiBpcyBwaXBlbGluZSB0aGF0IG1vZGlmaWVzIHRoZSBkcmF3aW5nIGNvbnRleHQgZm91bmQgaW4gYW4gYW5pbWF0aW9uIFRpY2suIEFuaW1hdGlvbnMgY2FuIGJlIGNoYWluZWRcbiAqIHRvZ2V0aGVyIHRvIGNyZWF0ZSBhIG1vcmUgY29tcGxpY2F0ZWQgQW5pbWF0aW9uLiBUaGV5IGFyZSBjb21wb3NlYWJsZSxcbiAqXG4gKiBlLmcuIGBgYGFuaW1hdGlvbjEgPSBBeC50cmFuc2xhdGUoWzUwLCA1MF0pLmZpbGxTdHlsZShcInJlZFwiKS5maWxsUmVjdChbMCwwXSwgWzIwLDIwXSlgYGBcbiAqIGlzIG9uZSBhbmltYXRpb24gd2hpY2ggaGFzIGJlZW4gZm9ybWVkIGZyb20gdGhyZWUgc3ViYW5pbWF0aW9ucy5cbiAqXG4gKiBBbmltYXRpb25zIGhhdmUgYSBsaWZlY3ljbGUsIHRoZXkgY2FuIGJlIGZpbml0ZSBvciBpbmZpbml0ZSBpbiBsZW5ndGguIFlvdSBjYW4gc3RhcnQgdGVtcG9yYWxseSBjb21wb3NlIGFuaW1hdGlvbnNcbiAqIHVzaW5nIGBgYGFuaW0xLnRoZW4oYW5pbTIpYGBgLCB3aGljaCBjcmVhdGVzIGEgbmV3IGFuaW1hdGlvbiB0aGF0IHBsYXlzIGFuaW1hdGlvbiAyIHdoZW4gYW5pbWF0aW9uIDEgZmluaXNoZXMuXG4gKlxuICogV2hlbiBhbiBhbmltYXRpb24gaXMgc2VxdWVuY2VkIGludG8gdGhlIGFuaW1hdGlvbiBwaXBlbGluZS4gSXRzIGF0dGFjaCBtZXRob2QgaXMgY2FsbGVkIHdoaWNoIGF0Y3VhbGx5IGJ1aWxkcyB0aGVcbiAqIFJ4SlMgcGlwZWxpbmUuIFRodXMgYW4gYW5pbWF0aW9uIGlzIG5vdCBsaXZlLCBidXQgcmVhbGx5IGEgZmFjdG9yeSBmb3IgYSBSeEpTIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBBbmltYXRpb24ge1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIF9hdHRhY2g6ICh1cHN0cmVhbTogVGlja1N0cmVhbSkgPT4gVGlja1N0cmVhbSwgcHVibGljIGFmdGVyPzogQW5pbWF0aW9uKSB7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgdGhlIGFuaW1hdGlvbiB0byBhIG5ldyBSeEpTIHBpcGVsaW5lLlxuICAgICAqL1xuICAgIGF0dGFjaCh1cHN0cmVhbTogVGlja1N0cmVhbSk6IFRpY2tTdHJlYW0ge1xuICAgICAgICB2YXIgcHJvY2Vzc2VkID0gdGhpcy5fYXR0YWNoKHVwc3RyZWFtKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWZ0ZXI/IHRoaXMuYWZ0ZXIuYXR0YWNoKHByb2Nlc3NlZCk6IHByb2Nlc3NlZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBzZW5kIHRoZSBkb3duc3RyZWFtIGNvbnRleHQgb2YgJ3RoaXMnIGFuaW1hdGlvbiwgYXMgdGhlIHVwc3RyZWFtIGNvbnRleHQgdG8gc3VwcGxpZWQgYW5pbWF0aW9uLlxuICAgICAqXG4gICAgICogVGhpcyBhbGxvd3MgeW91IHRvIGNoYWluIGN1c3RvbSBhbmltYXRpb25zLlxuICAgICAqXG4gICAgICogYGBgQXgubW92ZSguLi4pLnBpcGUobXlBbmltYXRpb24oKSk7YGBgXG4gICAgICovXG4gICAgcGlwZShkb3duc3RyZWFtOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gY29tYmluZTIodGhpcywgZG93bnN0cmVhbSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGVsaXZlcnMgdXBzdHJlYW0gZXZlbnRzIHRvICd0aGlzJyBmaXJzdCwgdGhlbiB3aGVuICd0aGlzJyBhbmltYXRpb24gaXMgZmluaXNoZWRcbiAgICAgKiB0aGUgdXBzdHJlYW0gaXMgc3dpdGNoZWQgdG8gdGhlIHRoZSBmb2xsb3dlciBhbmltYXRpb24uXG4gICAgICpcbiAgICAgKiBUaGlzIGFsbG93cyB5b3UgdG8gc2VxdWVuY2UgYW5pbWF0aW9ucyB0ZW1wb3JhbGx5LlxuICAgICAqIGZyYW1lMUFuaW1hdGlvbigpLnRoZW4oZnJhbWUyQW5pbWF0aW9uKS50aGVuKGZyYW1lM0FuaW1hdGlvbilcbiAgICAgKi9cbiAgICB0aGVuKGZvbGxvd2VyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IFRpY2tTdHJlYW0pIDogVGlja1N0cmVhbSB7XG4gICAgICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8VGljaz4oZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ICA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RUdXJuID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50ID0gZmlyc3Q7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogYXR0YWNoXCIpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZEF0dGFjaCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RBdHRhY2ggID0gc2VsZi5hdHRhY2goZmlyc3Quc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGZpcnN0IGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUdXJuID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaCA9IGZvbGxvd2VyLmF0dGFjaChzZWNvbmQuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcHJldlN1YnNjcmlwdGlvbiA9IHByZXYuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSB0byBmaXJzdCBPUiBzZWNvbmRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlyc3RUdXJuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3Qub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmQub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIC8vIG9uIGRpc3Bvc2VcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBkaXNwb3NlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0QXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlY29uZEF0dGFjaClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpOyAvL3RvZG8gcmVtb3ZlIHN1YnNjcmliZU9uc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhbmltYXRpb24gdGhhdCByZXBsYXlzIHRoZSBpbm5lciBhbmltYXRpb24gZWFjaCB0aW1lIHRoZSBpbm5lciBhbmltYXRpb24gY29tcGxldGVzLlxuICAgICAqXG4gICAgICogVGhlIHJlc3VsdGFudCBhbmltYXRpb24gaXMgYWx3YXlzIHJ1bnMgZm9yZXZlciB3aGlsZSB1cHN0cmVhbSBpcyBsaXZlLiBPbmx5IGEgc2luZ2xlIGlubmVyIGFuaW1hdGlvblxuICAgICAqIHBsYXlzIGF0IGEgdGltZSAodW5saWtlIGVtaXQoKSlcbiAgICAgKi9cbiAgICBsb29wKGlubmVyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGxvb3AoaW5uZXIpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhbmltYXRpb24gdGhhdCBzZXF1ZW5jZXMgdGhlIGlubmVyIGFuaW1hdGlvbiBldmVyeSB0aW1lIGZyYW1lLlxuICAgICAqXG4gICAgICogVGhlIHJlc3VsdGFudCBhbmltYXRpb24gaXMgYWx3YXlzIHJ1bnMgZm9yZXZlciB3aGlsZSB1cHN0cmVhbSBpcyBsaXZlLiBNdWx0aXBsZSBpbm5lciBhbmltYXRpb25zXG4gICAgICogY2FuIGJlIHBsYXlpbmcgYXQgdGhlIHNhbWUgdGltZSAodW5saWtlIGxvb3ApXG4gICAgICovXG4gICAgZW1pdChpbm5lcjogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShlbWl0KGlubmVyKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGxheXMgYWxsIHRoZSBpbm5lciBhbmltYXRpb25zIGF0IHRoZSBzYW1lIHRpbWUuIFBhcmFsbGVsIGNvbXBsZXRlcyB3aGVuIGFsbCBpbm5lciBhbmltYXRpb25zIGFyZSBvdmVyLlxuICAgICAqXG4gICAgICogVGhlIGNhbnZhcyBzdGF0ZXMgYXJlIHJlc3RvcmVkIGJlZm9yZSBlYWNoIGZvcmssIHNvIHN0eWxpbmcgYW5kIHRyYW5zZm9ybXMgb2YgZGlmZmVyZW50IGNoaWxkIGFuaW1hdGlvbnMgZG8gbm90XG4gICAgICogaW50ZXJhY3QgKGFsdGhvdWdoIG9ic3Zpb3VzbHkgdGhlIHBpeGVsIGJ1ZmZlciBpcyBhZmZlY3RlZCBieSBlYWNoIGFuaW1hdGlvbilcbiAgICAgKi9cbiAgICBwYXJhbGxlbChpbm5lcl9hbmltYXRpb25zOiBSeC5PYnNlcnZhYmxlPEFuaW1hdGlvbj4gfCBBbmltYXRpb25bXSk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUocGFyYWxsZWwoaW5uZXJfYW5pbWF0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlcXVlbmNlcyBuIGNvcGllcyBvZiB0aGUgaW5uZXIgYW5pbWF0aW9uLiBDbG9uZSBjb21wbGV0ZXMgd2hlbiBhbGwgaW5uZXIgYW5pbWF0aW9ucyBhcmUgb3Zlci5cbiAgICAgKi9cbiAgICBjbG9uZShuOiBudW1iZXIsIGlubmVyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGNsb25lKG4sIGlubmVyKSk7XG4gICAgfVxuXG4gICAgdHdlZW5fbGluZWFyKFxuICAgICAgICBmcm9tOiBQb2ludEFyZyxcbiAgICAgICAgdG86ICAgUG9pbnRBcmcsXG4gICAgICAgIHRpbWU6IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodHdlZW5fbGluZWFyKGZyb20sIHRvLCB0aW1lKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhbmltYXRpb24gdGhhdCBpcyBhdCBtb3N0IG4gZnJhbWVzIGZyb20gJ3RoaXMnLlxuICAgICAqL1xuICAgIHRha2UoZnJhbWVzOiBudW1iZXIpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHRha2UoZnJhbWVzKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaGVscGVyIG1ldGhvZCBmb3IgaW1wbGVtZW50aW5nIHNpbXBsZSBhbmltYXRpb25zICh0aGF0IGRvbid0IGZvcmsgdGhlIGFuaW1hdGlvbiB0cmVlKS5cbiAgICAgKiBZb3UganVzdCBoYXZlIHRvIHN1cHBseSBhIGZ1bmN0aW9uIHRoYXQgZG9lcyBzb21ldGhpbmcgd2l0aCB0aGUgZHJhdyB0aWNrLlxuICAgICAqL1xuICAgIGRyYXcoZHJhd0ZhY3Rvcnk6ICgpID0+ICgodGljazogVGljaykgPT4gdm9pZCkpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGRyYXcoZHJhd0ZhY3RvcnkpKTtcbiAgICB9XG5cbiAgICAvLyBDYW52YXMgQVBJXG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc3Ryb2tlU3R5bGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgc3Ryb2tlU3R5bGUoY29sb3I6IENvbG9yQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzdHJva2VTdHlsZShjb2xvcikpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBmaWxsU3R5bGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgZmlsbFN0eWxlKGNvbG9yOiBDb2xvckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZmlsbFN0eWxlKGNvbG9yKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNoYWRvd0NvbG9yIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHNoYWRvd0NvbG9yKGNvbG9yOiBDb2xvckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoc2hhZG93Q29sb3IoY29sb3IpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc2hhZG93Qmx1ciBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzaGFkb3dCbHVyKGxldmVsOiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHNoYWRvd0JsdXIobGV2ZWwpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc2hhZG93T2Zmc2V0WCBhbmQgc2hhZG93T2Zmc2V0WSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzaGFkb3dPZmZzZXQoeHk6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzaGFkb3dPZmZzZXQoeHkpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbGluZUNhcCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBsaW5lQ2FwKHN0eWxlOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGxpbmVDYXAoc3R5bGUpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbGluZUpvaW4gaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgbGluZUpvaW4oc3R5bGU6IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUobGluZUpvaW4oc3R5bGUpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbGluZVdpZHRoIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGxpbmVXaWR0aCh3aWR0aDogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShsaW5lV2lkdGgod2lkdGgpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbWl0ZXJMaW1pdCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBtaXRlckxpbWl0KGxpbWl0OiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKG1pdGVyTGltaXQobGltaXQpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgcmVjdCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICByZWN0KHh5OiBQb2ludEFyZywgd2lkdGhfaGVpZ2h0OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUocmVjdCh4eSwgd2lkdGhfaGVpZ2h0KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGZpbGxSZWN0IGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGZpbGxSZWN0KHh5OiBQb2ludEFyZywgd2lkdGhfaGVpZ2h0OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZmlsbFJlY3QoeHksIHdpZHRoX2hlaWdodCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBzdHJva2VSZWN0IGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHN0cm9rZVJlY3QoeHk6IFBvaW50QXJnLCB3aWR0aF9oZWlnaHQ6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzdHJva2VSZWN0KHh5LCB3aWR0aF9oZWlnaHQpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgY2xlYXJSZWN0IGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGNsZWFyUmVjdCh4eTogUG9pbnRBcmcsIHdpZHRoX2hlaWdodDogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGNsZWFyUmVjdCh4eSwgd2lkdGhfaGVpZ2h0KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVuY2xvc2VzIHRoZSBpbm5lciBhbmltYXRpb24gd2l0aCBhIGJlZ2lucGF0aCgpIGFuZCBlbmRwYXRoKCkgZnJvbSB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICB3aXRoaW5QYXRoKGlubmVyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHdpdGhpblBhdGgoaW5uZXIpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgZmlsbCBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAgICAgKi9cbiAgICBmaWxsKCk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZmlsbCgpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc3Ryb2tlIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHN0cm9rZSgpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHN0cm9rZSgpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbW92ZVRvIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICAgICAqL1xuICAgIG1vdmVUbyh4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKG1vdmVUbyh4eSkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBsaW5lVG8gaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgbGluZVRvKHh5OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUobGluZVRvKHh5KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGNsaXAgaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgY2xpcCgpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGNsaXAoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHF1YWRyYXRpY0N1cnZlVG8gaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgcXVhZHJhdGljQ3VydmVUbyhjb250cm9sOiBQb2ludEFyZywgZW5kOiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUocXVhZHJhdGljQ3VydmVUbyhjb250cm9sLCBlbmQpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgYmV6aWVyQ3VydmVUbyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAgICAgKi9cbiAgICBiZXppZXJDdXJ2ZVRvKGNvbnRyb2wxOiBQb2ludEFyZywgY29udHJvbDI6IFBvaW50QXJnLCBlbmQ6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShiZXppZXJDdXJ2ZVRvKGNvbnRyb2wxLCBjb250cm9sMiwgZW5kKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGFyYyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAgICAgKi9cbiAgICBhcmMoY2VudGVyOiBQb2ludEFyZywgcmFkaXVzOiBOdW1iZXJBcmcsXG4gICAgICAgIHJhZFN0YXJ0QW5nbGU6IE51bWJlckFyZywgcmFkRW5kQW5nbGU6IE51bWJlckFyZyxcbiAgICAgICAgY291bnRlcmNsb2Nrd2lzZT86IGJvb2xlYW4pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGFyYyhjZW50ZXIsIHJhZGl1cywgcmFkU3RhcnRBbmdsZSwgcmFkRW5kQW5nbGUsIGNvdW50ZXJjbG9ja3dpc2UpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBhcmMgaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgYXJjVG8odGFuZ2VudDE6IFBvaW50QXJnLCB0YW5nZW50MjogUG9pbnRBcmcsIHJhZGl1czogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShhcmNUbyh0YW5nZW50MSwgdGFuZ2VudDIsIHJhZGl1cykpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBzY2FsZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzY2FsZSh4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHNjYWxlKHh5KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHJvdGF0ZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICByb3RhdGUocmFkczogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShyb3RhdGUocmFkcykpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciB0cmFuc2xhdGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgdHJhbnNsYXRlKHh5OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodHJhbnNsYXRlKHh5KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHRyYW5zbGF0ZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKiBbIGEgYyBlXG4gICAgICogICBiIGQgZlxuICAgICAqICAgMCAwIDEgXVxuICAgICAqL1xuICAgIHRyYW5zZm9ybShhOiBOdW1iZXJBcmcsIGI6IE51bWJlckFyZywgYzogTnVtYmVyQXJnLFxuICAgICAgICAgICAgICBkOiBOdW1iZXJBcmcsIGU6IE51bWJlckFyZywgZjogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh0cmFuc2Zvcm0oYSxiLGMsZCxlLGYpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc2V0VHJhbnNmb3JtIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHNldFRyYW5zZm9ybShhOiBOdW1iZXJBcmcsIGI6IE51bWJlckFyZywgYzogTnVtYmVyQXJnLFxuICAgICAgICAgICAgICAgICBkOiBOdW1iZXJBcmcsIGU6IE51bWJlckFyZywgZjogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzZXRUcmFuc2Zvcm0oYSxiLGMsZCxlLGYpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgZm9udCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBmb250KHN0eWxlOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGZvbnQoc3R5bGUpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEFsaWduIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHRleHRBbGlnbihzdHlsZTogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh0ZXh0QWxpZ24oc3R5bGUpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEJhc2VsaW5lIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHRleHRCYXNlbGluZShzdHlsZTogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh0ZXh0QmFzZWxpbmUoc3R5bGUpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEJhc2VsaW5lIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGZpbGxUZXh0KHRleHQ6IFN0cmluZ0FyZywgeHk6IFBvaW50QXJnLCBtYXhXaWR0aD86IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZmlsbFRleHQodGV4dCwgeHksIG1heFdpZHRoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGRyYXdJbWFnZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBkcmF3SW1hZ2UoaW1nLCB4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGRyYXdJbWFnZShpbWcsIHh5KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbihvcGVyYXRpb246IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uKG9wZXJhdGlvbikpO1xuICAgIH1cbiAgICAvLyBFbmQgQ2FudmFzIEFQSVxuXG5cbiAgICAvKipcbiAgICAgKiB0cmFuc2xhdGVzIHRoZSBkcmF3aW5nIGNvbnRleHQgYnkgdmVsb2NpdHkgKiB0aWNrLmNsb2NrXG4gICAgICovXG4gICAgdmVsb2NpdHkodmVjdG9yOiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodmVsb2NpdHkodmVjdG9yKSk7XG4gICAgfVxuXG4gICAgZ2xvdyhkZWNheTogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShnbG93KGRlY2F5KSk7XG4gICAgfVxuXG59XG5cbmV4cG9ydCBjbGFzcyBBbmltYXRvciB7XG4gICAgdGlja2VyU3Vic2NyaXB0aW9uOiBSeC5EaXNwb3NhYmxlID0gbnVsbDtcbiAgICByb290OiBSeC5TdWJqZWN0PFRpY2s+O1xuICAgIGFuaW1hdGlvblN1YnNjcmlwdGlvbnM6IFJ4LklEaXNwb3NhYmxlW10gPSBbXTtcbiAgICB0OiBudW1iZXIgPSAwO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKSB7XG4gICAgICAgIHRoaXMucm9vdCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KClcbiAgICB9XG4gICAgdGlja2VyKHRpY2s6IFJ4Lk9ic2VydmFibGU8bnVtYmVyPik6IHZvaWQge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy50aWNrZXJTdWJzY3JpcHRpb24gPSB0aWNrLm1hcChmdW5jdGlvbihkdDogbnVtYmVyKSB7IC8vbWFwIHRoZSB0aWNrZXIgb250byBhbnkgLT4gY29udGV4dFxuICAgICAgICAgICAgdmFyIHRpY2sgPSBuZXcgVGljayhzZWxmLmN0eCwgc2VsZi50LCBkdCk7XG4gICAgICAgICAgICBzZWxmLnQgKz0gZHQ7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSkuc3Vic2NyaWJlKHRoaXMucm9vdCk7XG4gICAgfVxuICAgIHBsYXkgKGFuaW1hdGlvbjogQW5pbWF0aW9uKTogdm9pZCB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBwbGF5XCIpO1xuICAgICAgICB2YXIgc2F2ZUJlZm9yZUZyYW1lID0gdGhpcy5yb290LnRhcE9uTmV4dChmdW5jdGlvbih0aWNrKXtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IHNhdmVcIik7XG4gICAgICAgICAgICB0aWNrLmN0eC5zYXZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgZG9BbmltYXRpb24gPSBhbmltYXRpb24uYXR0YWNoKHNhdmVCZWZvcmVGcmFtZSk7XG4gICAgICAgIHZhciByZXN0b3JlQWZ0ZXJGcmFtZSA9IGRvQW5pbWF0aW9uLnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IG5leHQgcmVzdG9yZVwiKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggZXJyIHJlc3RvcmVcIiwgZXJyKTtcbiAgICAgICAgICAgICAgICBzZWxmLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgc2VsZi5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYW5pbWF0aW9uU3Vic2NyaXB0aW9ucy5wdXNoKFxuICAgICAgICAgICAgcmVzdG9yZUFmdGVyRnJhbWUuc3Vic2NyaWJlKClcbiAgICAgICAgKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBOT1RFOiBjdXJyZW50bHkgZmFpbHMgaWYgdGhlIHN0cmVhbXMgYXJlIGRpZmZlcmVudCBsZW5ndGhzXG4gKiBAcGFyYW0gZXhwZWN0ZWREdCB0aGUgZXhwZWN0ZWQgY2xvY2sgdGljayB2YWx1ZXNcbiAqIEBwYXJhbSBhZnRlclxuICogQHJldHVybnMge0FuaW1hdGlvbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydER0KGV4cGVjdGVkRHQ6IFJ4Lk9ic2VydmFibGU8bnVtYmVyPiwgYWZ0ZXI/OiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHVwc3RyZWFtKSB7XG4gICAgICAgIHJldHVybiB1cHN0cmVhbS56aXAoZXhwZWN0ZWREdCwgZnVuY3Rpb24odGljazogVGljaywgZXhwZWN0ZWREdFZhbHVlOiBudW1iZXIpIHtcbiAgICAgICAgICAgIGlmICh0aWNrLmR0ICE9IGV4cGVjdGVkRHRWYWx1ZSkgdGhyb3cgbmV3IEVycm9yKFwidW5leHBlY3RlZCBkdCBvYnNlcnZlZDogXCIgKyB0aWNrLmR0ICsgXCIsIGV4cGVjdGVkOlwiICsgZXhwZWN0ZWREdFZhbHVlKTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KTtcbiAgICB9LCBhZnRlcik7XG59XG5cbi8vdG9kbyB3b3VsZCBiZSBuaWNlIGlmIHRoaXMgdG9vayBhbiBpdGVyYWJsZSBvciBzb21lIG90aGVyIHR5cGUgb2Ygc2ltcGxlIHB1bGwgc3RyZWFtXG4vLyBhbmQgdXNlZCBzdHJlYW1FcXVhbHNcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRDbG9jayhhc3NlcnRDbG9jazogbnVtYmVyW10sIGFmdGVyPzogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgaW5kZXggPSAwO1xuXG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnRhcE9uTmV4dChmdW5jdGlvbih0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYXNzZXJ0Q2xvY2s6IFwiLCB0aWNrKTtcbiAgICAgICAgICAgIGlmICh0aWNrLmNsb2NrIDwgYXNzZXJ0Q2xvY2tbaW5kZXhdIC0gMC4wMDAwMSB8fCB0aWNrLmNsb2NrID4gYXNzZXJ0Q2xvY2tbaW5kZXhdICsgMC4wMDAwMSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvck1zZyA9IFwidW5leHBlY3RlZCBjbG9jayBvYnNlcnZlZDogXCIgKyB0aWNrLmNsb2NrICsgXCIsIGV4cGVjdGVkOlwiICsgYXNzZXJ0Q2xvY2tbaW5kZXhdXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3JNc2cpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbmRleCArKztcbiAgICAgICAgfSk7XG4gICAgfSwgYWZ0ZXIpO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgQW5pbWF0aW9uIGJ5IHBpcGluZyB0aGUgYW5pbWF0aW9uIGZsb3cgb2YgQSBpbnRvIEJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmUyKGE6IEFuaW1hdGlvbiwgYjogQW5pbWF0aW9uKSB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oXG4gICAgICAgICh1cHN0cmVhbTogVGlja1N0cmVhbSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGIuYXR0YWNoKGEuYXR0YWNoKHVwc3RyZWFtKSk7XG4gICAgICAgIH1cbiAgICApO1xufVxuXG4vKipcbiAqIHBsYXlzIHNldmVyYWwgYW5pbWF0aW9ucywgZmluaXNoZXMgd2hlbiB0aGV5IGFyZSBhbGwgZG9uZS5cbiAqIEBwYXJhbSBhbmltYXRpb25zXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICogdG9kbzogSSB0aGluayB0aGVyZSBhcmUgbG90cyBvZiBidWdzIHdoZW4gYW4gYW5pbWF0aW9uIHN0b3BzIHBhcnQgd2F5XG4gKiBJIHRoaW5rIGl0IGJlIGJldHRlciBpZiB0aGlzIHNwYXduZWQgaXRzIG93biBBbmltYXRvciB0byBoYW5kbGUgY3R4IHJlc3RvcmVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJhbGxlbChcbiAgICBhbmltYXRpb25zOiBSeC5PYnNlcnZhYmxlPEFuaW1hdGlvbj4gfCBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IFRpY2tTdHJlYW0pOiBUaWNrU3RyZWFtIHtcbiAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGluaXRpYWxpemluZ1wiKTtcblxuICAgICAgICB2YXIgYWN0aXZlQW5pbWF0aW9ucyA9IDA7XG4gICAgICAgIHZhciBhdHRhY2hQb2ludCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgZnVuY3Rpb24gZGVjcmVtZW50QWN0aXZlKCkge1xuICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGRlY3JlbWVudCBhY3RpdmVcIik7XG4gICAgICAgICAgICBhY3RpdmVBbmltYXRpb25zIC0tO1xuICAgICAgICB9XG5cbiAgICAgICAgYW5pbWF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGFuaW1hdGlvbjogQW5pbWF0aW9uKSB7XG4gICAgICAgICAgICBhY3RpdmVBbmltYXRpb25zKys7XG4gICAgICAgICAgICBhbmltYXRpb24uYXR0YWNoKGF0dGFjaFBvaW50LnRhcE9uTmV4dCh0aWNrID0+IHRpY2suY3R4LnNhdmUoKSkpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgdGljayA9PiB0aWNrLmN0eC5yZXN0b3JlKCksXG4gICAgICAgICAgICAgICAgZGVjcmVtZW50QWN0aXZlLFxuICAgICAgICAgICAgICAgIGRlY3JlbWVudEFjdGl2ZSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHByZXYudGFrZVdoaWxlKCgpID0+IGFjdGl2ZUFuaW1hdGlvbnMgPiAwKS50YXBPbk5leHQoZnVuY3Rpb24odGljazogVGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBlbWl0dGluZywgYW5pbWF0aW9uc1wiLCB0aWNrKTtcbiAgICAgICAgICAgICAgICBhdHRhY2hQb2ludC5vbk5leHQodGljayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGVtaXR0aW5nIGZpbmlzaGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xvbmUoXG4gICAgbjogbnVtYmVyLCAvLyB0b2RvIG1ha2UgZHluYW1pY1xuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBwYXJhbGxlbChSeC5PYnNlcnZhYmxlLnJldHVybihhbmltYXRpb24pLnJlcGVhdChuKSk7XG59XG5cbi8qKlxuICogVGhlIGNoaWxkIGFuaW1hdGlvbiBpcyBzdGFydGVkIGV2ZXJ5IGZyYW1lXG4gKiBAcGFyYW0gYW5pbWF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbWl0KFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogVGlja1N0cmVhbSk6IFRpY2tTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJlbWl0OiBpbml0aWFsaXppbmdcIik7XG4gICAgICAgIHZhciBhdHRhY2hQb2ludCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgcmV0dXJuIHByZXYudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJlbWl0OiBlbW1pdHRpbmdcIiwgYW5pbWF0aW9uKTtcbiAgICAgICAgICAgICAgICBhbmltYXRpb24uYXR0YWNoKGF0dGFjaFBvaW50KS5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICBhdHRhY2hQb2ludC5vbk5leHQodGljayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSk7XG59XG5cblxuLyoqXG4gKiBXaGVuIHRoZSBjaGlsZCBsb29wIGZpbmlzaGVzLCBpdCBpcyBzcGF3bmVkXG4gKiBAcGFyYW0gYW5pbWF0aW9uXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9vcChcbiAgICBhbmltYXRpb246IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IFRpY2tTdHJlYW0pOiBUaWNrU3RyZWFtIHtcbiAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogaW5pdGlhbGl6aW5nXCIpO1xuXG5cbiAgICAgICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuY3JlYXRlPFRpY2s+KGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBjcmVhdGUgbmV3IGxvb3BcIik7XG4gICAgICAgICAgICB2YXIgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBsb29wU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICAgICAgICAgIHZhciB0ID0gMDtcblxuICAgICAgICAgICAgZnVuY3Rpb24gYXR0YWNoTG9vcChuZXh0KSB7IC8vdG9kbyBJIGZlZWwgbGlrZSB3ZSBjYW4gcmVtb3ZlIGEgbGV2ZWwgZnJvbSB0aGlzIHNvbWVob3dcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBuZXcgaW5uZXIgbG9vcCBzdGFydGluZyBhdFwiLCB0KTtcblxuICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICBsb29wU3Vic2NyaXB0aW9uID0gYW5pbWF0aW9uLmF0dGFjaChsb29wU3RhcnQpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIGVyciB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgY29tcGxldGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbmV3IGlubmVyIGxvb3AgZmluaXNoZWQgY29uc3RydWN0aW9uXCIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByZXYuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvb3BTdGFydCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBubyBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTG9vcChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSB0byBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnQub25OZXh0KG5leHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHQgKz0gbmV4dC5kdDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHVwc3RyZWFtIGVycm9yIHRvIGRvd25zdHJlYW1cIiwgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQuYmluZChvYnNlcnZlcilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvL2Rpc3Bvc2VcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBkaXNwb3NlXCIpO1xuICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQpIGxvb3BTdGFydC5kaXNwb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZHJhdyhcbiAgICBkcmF3RmFjdG9yeTogKCkgPT4gKCh0aWNrOiBUaWNrKSA9PiB2b2lkKSxcbiAgICBhZnRlcj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXZpb3VzOiBUaWNrU3RyZWFtKTogVGlja1N0cmVhbSB7XG4gICAgICAgIHZhciBkcmF3OiAodGljazogVGljaykgPT4gdm9pZCA9IGRyYXdGYWN0b3J5KCk7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy50YXBPbk5leHQoZHJhdyk7XG4gICAgfSwgYWZ0ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlKFxuICAgIGRlbHRhOiBQb2ludEFyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zbGF0ZTogYXR0YWNoZWRcIik7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHZhciBwb2ludF9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZGVsdGEpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvaW50ID0gcG9pbnRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidHJhbnNsYXRlOlwiLCBwb2ludCk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgudHJhbnNsYXRlKHBvaW50WzBdLCBwb2ludFsxXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAsIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnbG9iYWxDb21wb3NpdGVPcGVyYXRpb24oXG4gICAgY29tcG9zaXRlX21vZGU6IHN0cmluZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgdGljay5jdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gY29tcG9zaXRlX21vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAsIGFuaW1hdGlvbik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHZlbG9jaXR5KFxuICAgIHZlbG9jaXR5OiBQb2ludEFyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInZlbG9jaXR5OiBhdHRhY2hlZFwiKTtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHBvczogUG9pbnQgPSBbMC4wLDAuMF07XG4gICAgICAgICAgICB2YXIgdmVsb2NpdHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHZlbG9jaXR5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odGljaykge1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCBwb3NbMF0sIHBvc1sxXSk7XG4gICAgICAgICAgICAgICAgdmFyIHZlbG9jaXR5ID0gdmVsb2NpdHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBwb3NbMF0gKz0gdmVsb2NpdHlbMF0gKiB0aWNrLmR0O1xuICAgICAgICAgICAgICAgIHBvc1sxXSArPSB2ZWxvY2l0eVsxXSAqIHRpY2suZHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2Vlbl9saW5lYXIoXG4gICAgZnJvbTogUG9pbnRBcmcsXG4gICAgdG86ICAgUG9pbnRBcmcsXG4gICAgdGltZTogTnVtYmVyQXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvbiAvKiBjb3BpZXMgKi9cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IFRpY2tTdHJlYW0pOiBUaWNrU3RyZWFtIHtcbiAgICAgICAgdmFyIHQgPSAwO1xuICAgICAgICB2YXIgZnJvbV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZnJvbSkuaW5pdCgpO1xuICAgICAgICB2YXIgdG9fbmV4dCAgID0gUGFyYW1ldGVyLmZyb20odG8pLmluaXQoKTtcbiAgICAgICAgdmFyIHRpbWVfbmV4dCAgID0gUGFyYW1ldGVyLmZyb20odGltZSkuaW5pdCgpO1xuICAgICAgICByZXR1cm4gcHJldi5tYXAoZnVuY3Rpb24odGljazogVGljaykge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInR3ZWVuOiBpbm5lclwiKTtcbiAgICAgICAgICAgIHZhciBmcm9tID0gZnJvbV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgdmFyIHRvICAgPSB0b19uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgdmFyIHRpbWUgPSB0aW1lX25leHQodGljay5jbG9jayk7XG5cbiAgICAgICAgICAgIHQgPSB0ICsgdGljay5kdDtcbiAgICAgICAgICAgIGlmICh0ID4gdGltZSkgdCA9IHRpbWU7XG4gICAgICAgICAgICB2YXIgeCA9IGZyb21bMF0gKyAodG9bMF0gLSBmcm9tWzBdKSAqIHQgLyB0aW1lO1xuICAgICAgICAgICAgdmFyIHkgPSBmcm9tWzFdICsgKHRvWzFdIC0gZnJvbVsxXSkgKiB0IC8gdGltZTtcbiAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCB4LCB5KTtcbiAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICB9KS50YWtlV2hpbGUoZnVuY3Rpb24odGljaykge3JldHVybiB0IDwgdGltZTt9KVxuICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWxsU3R5bGUoXG4gICAgY29sb3I6IENvbG9yQXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGxTdHlsZTogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGNvbG9yX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjb2xvcikuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gY29sb3JfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFN0eWxlOiBmaWxsU3R5bGVcIiwgY29sb3IpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJva2VTdHlsZShcbiAgICBjb2xvcjogQ29sb3JBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlU3R5bGU6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBjb2xvcl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29sb3IpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBjb2xvciA9IGNvbG9yX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZVN0eWxlOiBzdHJva2VTdHlsZVwiLCBjb2xvcik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc3Ryb2tlU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNoYWRvd0NvbG9yKFxuICAgIGNvbG9yOiBDb2xvckFyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzaGFkb3dDb2xvcjogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGNvbG9yX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjb2xvcikuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gY29sb3JfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2hhZG93Q29sb3I6IHNoYWRvd0NvbG9yXCIsIGNvbG9yKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zaGFkb3dDb2xvciA9IGNvbG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNoYWRvd0JsdXIoXG4gICAgbGV2ZWw6IE51bWJlckFyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzaGFkb3dCbHVyOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgbGV2ZWxfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGxldmVsKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgbGV2ZWwgPSBsZXZlbF9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzaGFkb3dCbHVyOiBzaGFkb3dCbHVyXCIsIGxldmVsKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zaGFkb3dCbHVyID0gbGV2ZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNoYWRvd09mZnNldChcbiAgICB4eTogUG9pbnRBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2hhZG93T2Zmc2V0OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHkgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzaGFkb3dPZmZzZXQ6IHNoYWRvd0JsdXJcIiwgeHkpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnNoYWRvd09mZnNldFggPSB4eVswXTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zaGFkb3dPZmZzZXRZID0geHlbMV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5lQ2FwKFxuICAgIHN0eWxlOiBTdHJpbmdBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZUNhcDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZ19uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcgPSBhcmdfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZUNhcDogbGluZUNhcFwiLCBhcmcpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmxpbmVDYXAgPSBhcmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5leHBvcnQgZnVuY3Rpb24gbGluZUpvaW4oXG4gICAgc3R5bGU6IFN0cmluZ0FyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJsaW5lSm9pbjogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZ19uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcgPSBhcmdfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZUpvaW46IGxpbmVDYXBcIiwgYXJnKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5saW5lSm9pbiA9IGFyZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpbmVXaWR0aChcbiAgICB3aWR0aDogTnVtYmVyQXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVXaWR0aDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHdpZHRoX25leHQgPSBQYXJhbWV0ZXIuZnJvbSh3aWR0aCkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoID0gd2lkdGhfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZVdpZHRoOiBsaW5lV2lkdGhcIiwgd2lkdGgpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmxpbmVXaWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWl0ZXJMaW1pdChcbiAgICBsaW1pdDogTnVtYmVyQXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcIm1pdGVyTGltaXQ6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmdfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGxpbWl0KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnID0gYXJnX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcIm1pdGVyTGltaXQ6IG1pdGVyTGltaXRcIiwgYXJnKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5taXRlckxpbWl0ID0gYXJnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiByZWN0KFxuICAgIHh5OiBQb2ludEFyZyxcbiAgICB3aWR0aF9oZWlnaHQ6IFBvaW50QXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInJlY3Q6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB4eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHdpZHRoX2hlaWdodCkuaW5pdCgpO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHk6IFBvaW50ID0geHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgd2lkdGhfaGVpZ2h0OiBQb2ludCA9IHdpZHRoX2hlaWdodF9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJyZWN0OiByZWN0XCIsIHh5LCB3aWR0aF9oZWlnaHQpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnJlY3QoeHlbMF0sIHh5WzFdLCB3aWR0aF9oZWlnaHRbMF0sIHdpZHRoX2hlaWdodFsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWxsUmVjdChcbiAgICB4eTogUG9pbnRBcmcsXG4gICAgd2lkdGhfaGVpZ2h0OiBQb2ludEFyZyxcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmaWxsUmVjdDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodF9uZXh0ID0gUGFyYW1ldGVyLmZyb20od2lkdGhfaGVpZ2h0KS5pbml0KCk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eTogUG9pbnQgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHQ6IFBvaW50ID0gd2lkdGhfaGVpZ2h0X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGxSZWN0OiBmaWxsUmVjdFwiLCB4eSwgd2lkdGhfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5maWxsUmVjdCh4eVswXSwgeHlbMV0sIHdpZHRoX2hlaWdodFswXSwgd2lkdGhfaGVpZ2h0WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cm9rZVJlY3QoXG4gICAgeHk6IFBvaW50QXJnLFxuICAgIHdpZHRoX2hlaWdodDogUG9pbnRBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlUmVjdDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodF9uZXh0ID0gUGFyYW1ldGVyLmZyb20od2lkdGhfaGVpZ2h0KS5pbml0KCk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eTogUG9pbnQgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHQ6IFBvaW50ID0gd2lkdGhfaGVpZ2h0X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZVJlY3Q6IHN0cm9rZVJlY3RcIiwgeHksIHdpZHRoX2hlaWdodCk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc3Ryb2tlUmVjdCh4eVswXSwgeHlbMV0sIHdpZHRoX2hlaWdodFswXSwgd2lkdGhfaGVpZ2h0WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjbGVhclJlY3QoXG4gICAgeHk6IFBvaW50QXJnLFxuICAgIHdpZHRoX2hlaWdodDogUG9pbnRBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiY2xlYXJSZWN0OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgd2lkdGhfaGVpZ2h0X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh3aWR0aF9oZWlnaHQpLmluaXQoKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5OiBQb2ludCA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodDogUG9pbnQgPSB3aWR0aF9oZWlnaHRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiY2xlYXJSZWN0OiBjbGVhclJlY3RcIiwgeHksIHdpZHRoX2hlaWdodCk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguY2xlYXJSZWN0KHh5WzBdLCB4eVsxXSwgd2lkdGhfaGVpZ2h0WzBdLCB3aWR0aF9oZWlnaHRbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiB3aXRoaW5QYXRoKFxuICAgIGlubmVyOiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oXG4gICAgICAgICh1cHN0cmVhbTogVGlja1N0cmVhbSkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcIndpdGhpblBhdGg6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBiZWdpblBhdGhCZWZvcmVJbm5lciA9IHVwc3RyZWFtLnRhcE9uTmV4dChcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAodGljazogVGljaykge3RpY2suY3R4LmJlZ2luUGF0aCgpO31cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gaW5uZXIuYXR0YWNoKGJlZ2luUGF0aEJlZm9yZUlubmVyKS50YXBPbk5leHQoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHRpY2s6IFRpY2spIHt0aWNrLmN0eC5jbG9zZVBhdGgoKTt9XG4gICAgICAgICAgICApXG4gICAgICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Ryb2tlKFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZTogYXR0YWNoXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZTogc3Ryb2tlXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnN0cm9rZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsbChcbiAgICBhbmltYXRpb24/OiBBbmltYXRpb25cbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmaWxsOiBhdHRhY2hcIik7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbDogc3Ryb2tlXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1vdmVUbyhcbiAgICB4eTogUG9pbnRBcmcsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibW92ZVRvOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHkgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJtb3ZlVG86IG1vdmVUb1wiLCB4eSk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgubW92ZVRvKHh5WzBdLCB4eVsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5lVG8oXG4gICAgeHk6IFBvaW50QXJnLFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVUbzogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5ID0geHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZVRvOiBsaW5lVG9cIiwgeHkpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmxpbmVUbyh4eVswXSwgeHlbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjbGlwKFxuICAgIGFuaW1hdGlvbj86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImNsaXA6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJjbGlwOiBjbGlwXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmNsaXAoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHF1YWRyYXRpY0N1cnZlVG8oY29udHJvbDogUG9pbnRBcmcsIGVuZDogUG9pbnRBcmcsIGFuaW1hdGlvbj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJxdWFkcmF0aWNDdXJ2ZVRvOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29udHJvbCkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGVuZCkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInF1YWRyYXRpY0N1cnZlVG86IHF1YWRyYXRpY0N1cnZlVG9cIiwgYXJnMSwgYXJnMik7XG4gICAgICAgICAgICAgICAgdGljay5jdHgucXVhZHJhdGljQ3VydmVUbyhhcmcxWzBdLCBhcmcxWzFdLCBhcmcyWzBdLCBhcmcyWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgYmV6aWVyQ3VydmVUbyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJlemllckN1cnZlVG8oY29udHJvbDE6IFBvaW50QXJnLCBjb250cm9sMjogUG9pbnRBcmcsIGVuZDogUG9pbnRBcmcsIGFuaW1hdGlvbj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJiZXppZXJDdXJ2ZVRvOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29udHJvbDEpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmcyX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjb250cm9sMikuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzNfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGVuZCkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzMgPSBhcmczX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImJlemllckN1cnZlVG86IGJlemllckN1cnZlVG9cIiwgYXJnMSwgYXJnMiwgYXJnMyk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguYmV6aWVyQ3VydmVUbyhhcmcxWzBdLCBhcmcxWzFdLCBhcmcyWzBdLCBhcmcyWzFdLCBhcmczWzBdLCBhcmczWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgYXJjIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXJjKGNlbnRlcjogUG9pbnRBcmcsIHJhZGl1czogTnVtYmVyQXJnLFxuICAgIHJhZFN0YXJ0QW5nbGU6IE51bWJlckFyZywgcmFkRW5kQW5nbGU6IE51bWJlckFyZyxcbiAgICBjb3VudGVyY2xvY2t3aXNlPzogYm9vbGVhbiwgYW5pbWF0aW9uPzogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFyYzogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGNlbnRlcikuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHJhZGl1cykuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzNfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHJhZFN0YXJ0QW5nbGUpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmc0X25leHQgPSBQYXJhbWV0ZXIuZnJvbShyYWRFbmRBbmdsZSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzMgPSBhcmczX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzQgPSBhcmc0X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFyYzogYXJjXCIsIGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmFyYyhhcmcxWzBdLCBhcmcxWzFdLCBhcmcyLCBhcmczLCBhcmc0LCBjb3VudGVyY2xvY2t3aXNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cblxuLyoqXG4gKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBhcmMgaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcmNUbyh0YW5nZW50MTogUG9pbnRBcmcsIHRhbmdlbnQyOiBQb2ludEFyZywgcmFkaXVzOiBOdW1iZXJBcmcsIGFuaW1hdGlvbj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhcmM6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbSh0YW5nZW50MSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHRhbmdlbnQyKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnM19uZXh0ID0gUGFyYW1ldGVyLmZyb20ocmFkaXVzKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMiA9IGFyZzJfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMyA9IGFyZzNfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYXJjOiBhcmNcIiwgYXJnMSwgYXJnMiwgYXJnMyk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguYXJjVG8oYXJnMVswXSwgYXJnMVsxXSwgYXJnMlswXSwgYXJnMlsxXSwgYXJnMyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNjYWxlIGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2NhbGUoeHk6IFBvaW50QXJnLCBhbmltYXRpb24/OiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2NhbGU6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInNjYWxlOiBzY2FsZVwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zY2FsZShhcmcxWzBdLCBhcmcxWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igcm90YXRlIGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcm90YXRlKHJhZHM6IE51bWJlckFyZywgYW5pbWF0aW9uPzogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInJvdGF0ZTogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHJhZHMpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJyb3RhdGU6IHJvdGF0ZVwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zY2FsZShhcmcxWzBdLCBhcmcxWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdHJhbnNsYXRlIGluIHRoZSBjYW52YXMgQVBJLlxuICogWyBhIGMgZVxuICogICBiIGQgZlxuICogICAwIDAgMSBdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2Zvcm0oYTogTnVtYmVyQXJnLCBiOiBOdW1iZXJBcmcsIGM6IE51bWJlckFyZyxcbiAgICAgICAgICBkOiBOdW1iZXJBcmcsIGU6IE51bWJlckFyZywgZjogTnVtYmVyQXJnLCBhbmltYXRpb24/OiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidHJhbnNmb3JtOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oYSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGIpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmczX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnNF9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZCkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzVfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGUpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmc2X25leHQgPSBQYXJhbWV0ZXIuZnJvbShmKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMiA9IGFyZzJfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMyA9IGFyZzNfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNCA9IGFyZzRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNSA9IGFyZzVfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNiA9IGFyZzZfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidHJhbnNmb3JtOiB0cmFuc2Zvcm1cIiwgYXJnMSwgYXJnMiwgYXJnMywgYXJnNCwgYXJnNSwgYXJnNik7XG4gICAgICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuLyoqXG4gKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBzZXRUcmFuc2Zvcm0gaW4gdGhlIGNhbnZhcyBBUEkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRUcmFuc2Zvcm0oYTogTnVtYmVyQXJnLCBiOiBOdW1iZXJBcmcsIGM6IE51bWJlckFyZyxcbiAgICAgICAgICAgICBkOiBOdW1iZXJBcmcsIGU6IE51bWJlckFyZywgZjogTnVtYmVyQXJnLCBhbmltYXRpb24/OiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2V0VHJhbnNmb3JtOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oYSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGIpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmczX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnNF9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZCkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzVfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGUpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmc2X25leHQgPSBQYXJhbWV0ZXIuZnJvbShmKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMiA9IGFyZzJfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMyA9IGFyZzNfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNCA9IGFyZzRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNSA9IGFyZzVfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNiA9IGFyZzZfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2V0VHJhbnNmb3JtOiBzZXRUcmFuc2Zvcm1cIiwgYXJnMSwgYXJnMiwgYXJnMywgYXJnNCwgYXJnNSwgYXJnNik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc2V0VHJhbnNmb3JtKGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuLyoqXG4gKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBmb250IGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9udChzdHlsZTogU3RyaW5nQXJnLCBhbmltYXRpb24/OiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZm9udDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHN0eWxlKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZm9udDogZm9udFwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5mb250ID0gYXJnMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgYW5pbWF0aW9uKTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEFsaWduIGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dEFsaWduKHN0eWxlOiBTdHJpbmdBcmcsIGFuaW1hdGlvbj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0ZXh0QWxpZ246IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbShzdHlsZSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRleHRBbGlnbjogdGV4dEFsaWduXCIsIGFyZzEpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnRleHRBbGlnbiA9IGFyZzE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFuaW1hdGlvbik7XG59XG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHRleHRCYXNlbGluZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRleHRCYXNlbGluZShzdHlsZTogc3RyaW5nLCBhbmltYXRpb24/OiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidGV4dEJhc2VsaW5lOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0ZXh0QmFzZWxpbmU6IHRleHRCYXNlbGluZVwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC50ZXh0QmFzZWxpbmUgPSBhcmcxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuLyoqXG4gKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciB0ZXh0QmFzZWxpbmUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaWxsVGV4dCh0ZXh0OiBTdHJpbmdBcmcsIHh5OiBQb2ludEFyZywgbWF4V2lkdGg/OiBOdW1iZXJBcmcsIGFuaW1hdGlvbj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmaWxsVGV4dDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHRleHQpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmcyX25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzNfbmV4dCA9IG1heFdpZHRoID8gUGFyYW1ldGVyLmZyb20obWF4V2lkdGgpLmluaXQoKTogdW5kZWZpbmVkO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzMgPSBtYXhXaWR0aD8gYXJnM19uZXh0KHRpY2suY2xvY2spOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGxUZXh0OiBmaWxsVGV4dFwiLCBhcmcxLCBhcmcyLCBhcmczKTtcbiAgICAgICAgICAgICAgICBpZiAobWF4V2lkdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGljay5jdHguZmlsbFRleHQoYXJnMSwgYXJnMlswXSwgYXJnMlswXSwgYXJnMyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGljay5jdHguZmlsbFRleHQoYXJnMSwgYXJnMlswXSwgYXJnMlswXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuLyoqXG4gKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciB0ZXh0QmFzZWxpbmUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcmF3SW1hZ2UoaW1nLCB4eTogUG9pbnRBcmcsIGFuaW1hdGlvbj86IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJkcmF3SW1hZ2U6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImRyYXdJbWFnZTogZHJhd0ltYWdlXCIsIGFyZzEpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmRyYXdJbWFnZShpbWcsIGFyZzFbMF0sIGFyZzFbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBhbmltYXRpb24pO1xufVxuXG5cbi8vIGZvcmVncm91bmQgY29sb3IgdXNlZCB0byBkZWZpbmUgZW1taXR0ZXIgcmVnaW9ucyBhcm91bmQgdGhlIGNhbnZhc1xuLy8gIHRoZSBodWUsIGlzIHJldXNlZCBpbiB0aGUgcGFydGljbGVzXG4vLyAgdGhlIGxpZ2h0bmVzcyBpcyB1c2UgdG8gZGVzY3JpYmUgdGhlIHF1YW50aXR5IChtYXggbGlnaHRuZXNzIGxlYWRzIHRvIHRvdGFsIHNhdHVyYXRpb24pXG4vL1xuLy8gdGhlIGFkZGl0aW9uYWwgcGFyYW1ldGVyIGludGVzaXR5IGlzIHVzZWQgdG8gc2NhbGUgdGhlIGVtbWl0ZXJzXG4vLyBnZW5lcmFsbHkgdGhlIGNvbG9ycyB5b3UgcGxhY2Ugb24gdGhlIG1hcCB3aWxsIGJlIGV4Y2VlZGVkIGJ5IHRoZSBzYXR1cmF0aW9uXG4vL1xuLy8gSG93IGFyZSB0d28gZGlmZmVyZW50IGh1ZXMgc2Vuc2libHkgbWl4ZWRcblxuLy8gZGVjYXkgb2YgMC41XG4vL1xuLy8gICAgICAgSFxuLy8gMSAyIDQgOSA0IDIgMSAgICAgICAvL3NhdCwgYWxzbyBhbHBoYVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyAgICAgICAgIDEgMiA0IDIgMSAgIC8vc2F0XG4vLyAgICAgICAgICAgICBIMlxuLy9cbi8vIHdlIGFkZCB0aGUgY29udHJpYnV0aW9uIHRvIGFuIGltYWdlIHNpemVkIGFjY3VtdWxhdG9yXG4vLyBhcyB0aGUgY29udHJpYnV0aW9ucyBuZWVkIHRvIHN1bSBwZXJtdXRhdGlvbiBpbmRlcGVuZGVudGx5IChhbHNvIHByb2JhYmx5IGFzc29jaWF0aXZlKVxuLy8gYmxlbmQocmdiYTEsIHJnYmEyKSA9IGJsZW5kKHJnYmEyLHJnYmExKVxuLy8gYWxwaGEgPSBhMSArIGEyIC0gYTFhMlxuLy8gaWYgYTEgPSAxICAgYW5kIGEyID0gMSwgICBhbHBoYSA9IDEgICAgICAgICA9IDFcbi8vIGlmIGExID0gMC41IGFuZCBhMiA9IDEsICAgYWxwaGEgPSAxLjUgLSAwLjUgPSAxXG4vLyBpZiBhMSA9IDAuNSBhbmQgYTIgPSAwLjUsIGFscGhhID0gMSAtIDAuMjUgID0gMC43NVxuXG4vLyBOb3JtYWwgYmxlbmRpbmcgZG9lc24ndCBjb21tdXRlOlxuLy8gcmVkID0gKHIxICogYTEgICsgKHIyICogYTIpICogKDEgLSBhMSkpIC8gYWxwaGFcblxuLy8gbGlnaHRlbiBkb2VzLCB3aGljaCBpcyBqdXN0IHRoZSBtYXhcbi8vIHJlZCA9IG1heChyMSwgcjIpXG4vLyBvciBhZGRpdGlvbiByZWQgPSByMSArIHIyXG4vLyBodHRwOi8vd3d3LmRlZXBza3ljb2xvcnMuY29tL2FyY2hpdmUvMjAxMC8wNC8yMS9mb3JtdWxhcy1mb3ItUGhvdG9zaG9wLWJsZW5kaW5nLW1vZGVzLmh0bWxcblxuXG5leHBvcnQgZnVuY3Rpb24gZ2xvdyhcbiAgICBkZWNheTogTnVtYmVyQXJnID0gMC4xLFxuICAgIGFmdGVyID86IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHZhciBkZWNheV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZGVjYXkpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBjdHggPSB0aWNrLmN0eDtcblxuICAgICAgICAgICAgICAgIC8vIG91ciBzcmMgcGl4ZWwgZGF0YVxuICAgICAgICAgICAgICAgIHZhciB3aWR0aCA9IGN0eC5jYW52YXMud2lkdGg7XG4gICAgICAgICAgICAgICAgdmFyIGhlaWdodCA9IGN0eC5jYW52YXMuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIHZhciBwaXhlbHMgPSB3aWR0aCAqIGhlaWdodDtcbiAgICAgICAgICAgICAgICB2YXIgaW1nRGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoMCwwLHdpZHRoLGhlaWdodCk7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBpbWdEYXRhLmRhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGRlY2F5ID0gZGVjYXlfbmV4dCh0aWNrLmNsb2NrKTtcblxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwib3JpZ2luYWwgZGF0YVwiLCBpbWdEYXRhLmRhdGEpXG5cbiAgICAgICAgICAgICAgICAvLyBvdXIgdGFyZ2V0IGRhdGFcbiAgICAgICAgICAgICAgICAvLyB0b2RvIGlmIHdlIHVzZWQgYSBUeXBlZCBhcnJheSB0aHJvdWdob3V0IHdlIGNvdWxkIHNhdmUgc29tZSB6ZXJvaW5nIGFuZCBvdGhlciBjcmFwcHkgY29udmVyc2lvbnNcbiAgICAgICAgICAgICAgICAvLyBhbHRob3VnaCBhdCBsZWFzdCB3ZSBhcmUgY2FsY3VsYXRpbmcgYXQgYSBoaWdoIGFjY3VyYWN5LCBsZXRzIG5vdCBkbyBhIGJ5dGUgYXJyYXkgZnJvbSB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgICAgdmFyIGdsb3dEYXRhOiBudW1iZXJbXSA9IG5ldyBBcnJheTxudW1iZXI+KHBpeGVscyo0KTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGl4ZWxzICogNDsgaSsrKSBnbG93RGF0YVtpXSA9IDA7XG5cbiAgICAgICAgICAgICAgICAvLyBwYXNzYmFjayB0byBhdm9pZCBsb3RzIG9mIGFycmF5IGFsbG9jYXRpb25zIGluIHJnYlRvSHNsLCBhbmQgaHNsVG9SZ2IgY2FsbHNcbiAgICAgICAgICAgICAgICB2YXIgaHNsOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0gPSBbMCwwLDBdO1xuICAgICAgICAgICAgICAgIHZhciByZ2I6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSA9IFswLDAsMF07XG5cbiAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgdGhlIGNvbnRyaWJ1dGlvbiBvZiBlYWNoIGVtbWl0dGVyIG9uIHRoZWlyIHN1cnJvdW5kc1xuICAgICAgICAgICAgICAgIGZvcih2YXIgeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgICAgICAgICAgICAgICBmb3IodmFyIHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlZCAgID0gZGF0YVsoKHdpZHRoICogeSkgKyB4KSAqIDRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdyZWVuID0gZGF0YVsoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBibHVlICA9IGRhdGFbKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgMl07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYWxwaGEgPSBkYXRhWygod2lkdGggKiB5KSArIHgpICogNCArIDNdO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnZlcnQgdG8gaHNsXG4gICAgICAgICAgICAgICAgICAgICAgICByZ2JUb0hzbChyZWQsIGdyZWVuLCBibHVlLCBoc2wpO1xuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGh1ZSA9IGhzbFswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBxdHkgPSBoc2xbMV07IC8vIHF0eSBkZWNheXNcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsb2NhbF9kZWNheSA9IGhzbFsyXSArIDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdlIG9ubHkgbmVlZCB0byBjYWxjdWxhdGUgYSBjb250cmlidXRpb24gbmVhciB0aGUgc291cmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb250cmlidXRpb24gPSBxdHkgZGVjYXlpbmcgYnkgaW52ZXJzZSBzcXVhcmUgZGlzdGFuY2VcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGMgPSBxIC8gKGReMiAqIGspLCB3ZSB3YW50IHRvIGZpbmQgdGhlIGMgPCAwLjAxIHBvaW50XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAwLjAxID0gcSAvIChkXjIgKiBrKSA9PiBkXjIgPSBxIC8gKDAuMDEgKiBrKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZCA9IHNxcnQoMTAwICogcSAvIGspIChub3RlIDIgc29sdXRpb25zLCByZXByZXNlbnRpbmcgdGhlIHR3byBoYWxmd2lkdGhzKVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbGZ3aWR0aCA9IE1hdGguc3FydCgxMDAwICogcXR5IC8gKGRlY2F5ICogbG9jYWxfZGVjYXkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhbGZ3aWR0aCAqPSAxMDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGkgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHggLSBoYWxmd2lkdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1aSA9IE1hdGgubWluKHdpZHRoLCBNYXRoLmNlaWwoeCArIGhhbGZ3aWR0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxqID0gTWF0aC5tYXgoMCwgTWF0aC5mbG9vcih5IC0gaGFsZndpZHRoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdWogPSBNYXRoLm1pbihoZWlnaHQsIE1hdGguY2VpbCh5ICsgaGFsZndpZHRoKSk7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBqID0gbGo7IGogPCB1ajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpID0gbGk7IGkgPCB1aTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkeCA9IGkgLSB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZHkgPSBqIC0geTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRfc3F1YXJlZCA9IGR4ICogZHggKyBkeSAqIGR5O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGMgaXMgaW4gdGhlIHNhbWUgc2NhbGUgYXQgcXR5IGkuZS4gKDAgLSAxMDAsIHNhdHVyYXRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjID0gKHF0eSkgLyAoMS4wMDAxICsgTWF0aC5zcXJ0KGRfc3F1YXJlZCkgKiBkZWNheSAqIGxvY2FsX2RlY2F5KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoYyA8PSAxMDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoYyA+PSAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmdiID0gaHNsVG9SZ2IoaHVlLCA1MCwgYywgcmdiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmdiID0gaHVzbC50b1JHQihodWUsIDUwLCBjKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9mb3IgKHZhciBodXNsaSA9IDA7IGh1c2xpPCAzOyBodXNsaSsrKSByZ2IgW2h1c2xpXSAqPSAyNTU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjX2FscGhhID0gYyAvIDEwMC4wO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByX2kgPSAoKHdpZHRoICogaikgKyBpKSAqIDQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnX2kgPSAoKHdpZHRoICogaikgKyBpKSAqIDQgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYl9pID0gKCh3aWR0aCAqIGopICsgaSkgKiA0ICsgMjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFfaSA9ICgod2lkdGggKiBqKSArIGkpICogNCArIDM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJyZ2JcIiwgcmdiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJjXCIsIGMpO1xuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcHJlX2FscGhhID0gZ2xvd0RhdGFbYV9pXTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChjX2FscGhhIDw9IDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoY19hbHBoYSA+PSAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KHByZV9hbHBoYSA8PSAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KHByZV9hbHBoYSA+PSAwKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBibGVuZCBhbHBoYSBmaXJzdCBpbnRvIGFjY3VtdWxhdG9yXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdsb3dEYXRhW2FfaV0gPSBnbG93RGF0YVthX2ldICsgY19hbHBoYSAtIGNfYWxwaGEgKiBnbG93RGF0YVthX2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnbG93RGF0YVthX2ldID0gTWF0aC5tYXgoZ2xvd0RhdGFbYV9pXSwgY19hbHBoYSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbYV9pXSA9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW2FfaV0gPD0gMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVthX2ldID49IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbcl9pXSA8PSAyNTUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbcl9pXSA+PSAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW2dfaV0gPD0gMjU1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW2dfaV0gPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVtiX2ldIDw9IDI1NSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVtiX2ldID49IDApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW3JfaV0gPSAocHJlX2FscGhhICsgcmdiWzBdLyAyNTUuMCAtIGNfYWxwaGEgKiByZ2JbMF0vIDI1NS4wKSAqIDI1NTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IChwcmVfYWxwaGEgKyByZ2JbMV0vIDI1NS4wIC0gY19hbHBoYSAqIHJnYlsxXS8gMjU1LjApICogMjU1O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtiX2ldID0gKHByZV9hbHBoYSArIHJnYlsyXS8gMjU1LjAgLSBjX2FscGhhICogcmdiWzJdLyAyNTUuMCkgKiAyNTU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJwb3N0LWFscGhhXCIsIGdsb3dEYXRhW2FfaV0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vdyBzaW1wbGUgbGlnaHRlblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW3JfaV0gPSBNYXRoLm1heChyZ2JbMF0sIGdsb3dEYXRhW3JfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtnX2ldID0gTWF0aC5tYXgocmdiWzFdLCBnbG93RGF0YVtnX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbYl9pXSA9IE1hdGgubWF4KHJnYlsyXSwgZ2xvd0RhdGFbYl9pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWl4IHRoZSBjb2xvcnMgbGlrZSBwaWdtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b3RhbF9hbHBoYSA9IGNfYWxwaGEgKyBwcmVfYWxwaGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW3JfaV0gPSAoY19hbHBoYSAqIHJnYlswXSArIHByZV9hbHBoYSAqIGdsb3dEYXRhW3JfaV0pIC8gdG90YWxfYWxwaGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2dfaV0gPSAoY19hbHBoYSAqIHJnYlsxXSArIHByZV9hbHBoYSAqIGdsb3dEYXRhW2dfaV0pIC8gdG90YWxfYWxwaGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2JfaV0gPSAoY19hbHBoYSAqIHJnYlsyXSArIHByZV9hbHBoYSAqIGdsb3dEYXRhW2JfaV0pIC8gdG90YWxfYWxwaGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFJFQUxMWSBDT09MIEVGRkVDVFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gcmdiWzBdICsgZ2xvd0RhdGFbcl9pXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IHJnYlsxXSArIGdsb3dEYXRhW2dfaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2JfaV0gPSByZ2JbMl0gKyBnbG93RGF0YVtiX2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW3JfaV0gPSBNYXRoLm1pbihyZ2JbMF0gKyBnbG93RGF0YVtyX2ldLCAyNTUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtnX2ldID0gTWF0aC5taW4ocmdiWzFdICsgZ2xvd0RhdGFbZ19pXSwgMjU1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbYl9pXSA9IE1hdGgubWluKHJnYlsyXSArIGdsb3dEYXRhW2JfaV0sIDI1NSk7XG5cblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4IDwgMiAmJiBqID09IDIwICYmIGkgPT0gMjAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2xvd0RhdGFbcl9pXSA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJwcmUtYWxwaGFcIiwgZ2xvd0RhdGFbYV9pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImR4XCIsIGR4LCBcImR5XCIsIGR5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZF9zcXVhcmVkXCIsIGRfc3F1YXJlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRlY2F5XCIsIGRlY2F5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibG9jYWxfZGVjYXlcIiwgbG9jYWxfZGVjYXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjXCIsIGMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjX2FscGhhXCIsIGNfYWxwaGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJhX2lcIiwgYV9pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaHVlXCIsIGh1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInF0eVwiLCBxdHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZWRcIiwgcmVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ3JlZW5cIiwgZ3JlZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJibHVlXCIsIGJsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZ2JcIiwgcmdiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZ2xvd0RhdGFbcl9pXVwiLCBnbG93RGF0YVtyX2ldKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZ2xvd1wiLCBnbG93RGF0YSk7XG5cbiAgICAgICAgICAgICAgICB2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKGRhdGEubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBmb3IodmFyIHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciB4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByX2kgPSAoKHdpZHRoICogeSkgKyB4KSAqIDQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ19pID0gKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiX2kgPSAoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFfaSA9ICgod2lkdGggKiB5KSArIHgpICogNCArIDM7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZltyX2ldID0gTWF0aC5mbG9vcihnbG93RGF0YVtyX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZltnX2ldID0gTWF0aC5mbG9vcihnbG93RGF0YVtnX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZltiX2ldID0gTWF0aC5mbG9vcihnbG93RGF0YVtiX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZlthX2ldID0gMjU1OyAvL01hdGguZmxvb3IoZ2xvd0RhdGFbYV9pXSAqIDI1NSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vICh0b2RvKSBtYXliZSB3ZSBjYW4gc3BlZWQgYm9vc3Qgc29tZSBvZiB0aGlzXG4gICAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9oYWNrcy5tb3ppbGxhLm9yZy8yMDExLzEyL2Zhc3Rlci1jYW52YXMtcGl4ZWwtbWFuaXB1bGF0aW9uLXdpdGgtdHlwZWQtYXJyYXlzL1xuXG4gICAgICAgICAgICAgICAgLy9maW5hbGx5IG92ZXJ3cml0ZSB0aGUgcGl4ZWwgZGF0YSB3aXRoIHRoZSBhY2N1bXVsYXRvclxuICAgICAgICAgICAgICAgICg8YW55PmltZ0RhdGEuZGF0YSkuc2V0KG5ldyBVaW50OENsYW1wZWRBcnJheShidWYpKTtcblxuICAgICAgICAgICAgICAgIGN0eC5wdXRJbWFnZURhdGEoaW1nRGF0YSwgMCwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGFmdGVyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRha2UoXG4gICAgZnJhbWVzOiBudW1iZXIsXG4gICAgYW5pbWF0aW9uPzogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbihwcmV2OiBUaWNrU3RyZWFtKTogVGlja1N0cmVhbSB7XG4gICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0YWtlOiBhdHRhY2hcIik7XG4gICAgICAgIHJldHVybiBwcmV2LnRha2UoZnJhbWVzKTtcbiAgICB9LCBhbmltYXRpb24pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlciwgcGF0aDogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgR0lGRW5jb2RlciA9IHJlcXVpcmUoJ2dpZmVuY29kZXInKTtcbiAgICB2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuXG5cbiAgICB2YXIgZW5jb2RlciA9IG5ldyBHSUZFbmNvZGVyKHdpZHRoLCBoZWlnaHQpO1xuICAgIGVuY29kZXIuY3JlYXRlUmVhZFN0cmVhbSgpXG4gICAgICAucGlwZShlbmNvZGVyLmNyZWF0ZVdyaXRlU3RyZWFtKHsgcmVwZWF0OiAxMDAwMCwgZGVsYXk6IDEwMCwgcXVhbGl0eTogMSB9KSlcbiAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHBhdGgpKTtcbiAgICBlbmNvZGVyLnN0YXJ0KCk7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocGFyZW50OiBUaWNrU3RyZWFtKTogVGlja1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQudGFwKFxuICAgICAgICAgICAgZnVuY3Rpb24odGljazogVGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzYXZlOiB3cm90ZSBmcmFtZVwiKTtcbiAgICAgICAgICAgICAgICBlbmNvZGVyLmFkZEZyYW1lKHRpY2suY3R4KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmVycm9yKFwic2F2ZTogbm90IHNhdmVkXCIsIHBhdGgpO30sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmxvZyhcInNhdmU6IHNhdmVkXCIsIHBhdGgpOyBlbmNvZGVyLmZpbmlzaCgpO31cbiAgICAgICAgKVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogQ29udmVydHMgYW4gUkdCIGNvbG9yIHZhbHVlIHRvIEhTTC4gQ29udmVyc2lvbiBmb3JtdWxhXG4gKiBhZGFwdGVkIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IU0xfY29sb3Jfc3BhY2UuXG4gKiBBc3N1bWVzIHIsIGcsIGFuZCBiIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMjU1XSBhbmRcbiAqIHJldHVybnMgaCwgcywgYW5kIGwgaW4gdGhlIHNldCBbMCwgMV0uXG4gKlxuICogQHBhcmFtICAgTnVtYmVyICByICAgICAgIFRoZSByZWQgY29sb3IgdmFsdWVcbiAqIEBwYXJhbSAgIE51bWJlciAgZyAgICAgICBUaGUgZ3JlZW4gY29sb3IgdmFsdWVcbiAqIEBwYXJhbSAgIE51bWJlciAgYiAgICAgICBUaGUgYmx1ZSBjb2xvciB2YWx1ZVxuICogQHJldHVybiAgQXJyYXkgICAgICAgICAgIFRoZSBIU0wgcmVwcmVzZW50YXRpb25cbiAqL1xuZnVuY3Rpb24gcmdiVG9Ic2wociwgZywgYiwgcGFzc2JhY2s6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSk6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJyZ2JUb0hzbDogaW5wdXRcIiwgciwgZywgYik7XG5cbiAgICByIC89IDI1NSwgZyAvPSAyNTUsIGIgLz0gMjU1O1xuICAgIHZhciBtYXggPSBNYXRoLm1heChyLCBnLCBiKSwgbWluID0gTWF0aC5taW4ociwgZywgYik7XG4gICAgdmFyIGgsIHMsIGwgPSAobWF4ICsgbWluKSAvIDI7XG5cbiAgICBpZihtYXggPT0gbWluKXtcbiAgICAgICAgaCA9IHMgPSAwOyAvLyBhY2hyb21hdGljXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGQgPSBtYXggLSBtaW47XG4gICAgICAgIHMgPSBsID4gMC41ID8gZCAvICgyIC0gbWF4IC0gbWluKSA6IGQgLyAobWF4ICsgbWluKTtcbiAgICAgICAgc3dpdGNoKG1heCl7XG4gICAgICAgICAgICBjYXNlIHI6IGggPSAoZyAtIGIpIC8gZCArIChnIDwgYiA/IDYgOiAwKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGc6IGggPSAoYiAtIHIpIC8gZCArIDI7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBiOiBoID0gKHIgLSBnKSAvIGQgKyA0OyBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBoIC89IDY7XG4gICAgfVxuICAgIHBhc3NiYWNrWzBdID0gKGggKiAzNjApOyAgICAgICAvLyAwIC0gMzYwIGRlZ3JlZXNcbiAgICBwYXNzYmFja1sxXSA9IChzICogMTAwKTsgLy8gMCAtIDEwMCVcbiAgICBwYXNzYmFja1syXSA9IChsICogMTAwKTsgLy8gMCAtIDEwMCVcblxuICAgIC8vIGNvbnNvbGUubG9nKFwicmdiVG9Ic2w6IG91dHB1dFwiLCBwYXNzYmFjayk7XG5cbiAgICByZXR1cm4gcGFzc2JhY2s7XG59XG5cbi8qKlxuICogQ29udmVydHMgYW4gSFNMIGNvbG9yIHZhbHVlIHRvIFJHQi4gQ29udmVyc2lvbiBmb3JtdWxhXG4gKiBhZGFwdGVkIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IU0xfY29sb3Jfc3BhY2UuXG4gKiBBc3N1bWVzIGgsIHMsIGFuZCBsIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMV0gYW5kXG4gKiByZXR1cm5zIHIsIGcsIGFuZCBiIGluIHRoZSBzZXQgWzAsIDI1NV0uXG4gKlxuICogQHBhcmFtICAgTnVtYmVyICBoICAgICAgIFRoZSBodWVcbiAqIEBwYXJhbSAgIE51bWJlciAgcyAgICAgICBUaGUgc2F0dXJhdGlvblxuICogQHBhcmFtICAgTnVtYmVyICBsICAgICAgIFRoZSBsaWdodG5lc3NcbiAqIEByZXR1cm4gIEFycmF5ICAgICAgICAgICBUaGUgUkdCIHJlcHJlc2VudGF0aW9uXG4gKi9cbmZ1bmN0aW9uIGhzbFRvUmdiKGgsIHMsIGwsIHBhc3NiYWNrOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0pOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl17XG4gICAgdmFyIHIsIGcsIGI7XG4gICAgLy8gY29uc29sZS5sb2coXCJoc2xUb1JnYiBpbnB1dDpcIiwgaCwgcywgbCk7XG5cbiAgICBoID0gaCAvIDM2MC4wO1xuICAgIHMgPSBzIC8gMTAwLjA7XG4gICAgbCA9IGwgLyAxMDAuMDtcblxuICAgIGlmKHMgPT0gMCl7XG4gICAgICAgIHIgPSBnID0gYiA9IGw7IC8vIGFjaHJvbWF0aWNcbiAgICB9ZWxzZXtcbiAgICAgICAgdmFyIGh1ZTJyZ2IgPSBmdW5jdGlvbiBodWUycmdiKHAsIHEsIHQpe1xuICAgICAgICAgICAgaWYodCA8IDApIHQgKz0gMTtcbiAgICAgICAgICAgIGlmKHQgPiAxKSB0IC09IDE7XG4gICAgICAgICAgICBpZih0IDwgMS82KSByZXR1cm4gcCArIChxIC0gcCkgKiA2ICogdDtcbiAgICAgICAgICAgIGlmKHQgPCAxLzIpIHJldHVybiBxO1xuICAgICAgICAgICAgaWYodCA8IDIvMykgcmV0dXJuIHAgKyAocSAtIHApICogKDIvMyAtIHQpICogNjtcbiAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBxID0gbCA8IDAuNSA/IGwgKiAoMSArIHMpIDogbCArIHMgLSBsICogcztcbiAgICAgICAgdmFyIHAgPSAyICogbCAtIHE7XG4gICAgICAgIHIgPSBodWUycmdiKHAsIHEsIGggKyAxLzMpO1xuICAgICAgICBnID0gaHVlMnJnYihwLCBxLCBoKTtcbiAgICAgICAgYiA9IGh1ZTJyZ2IocCwgcSwgaCAtIDEvMyk7XG4gICAgfVxuXG4gICAgcGFzc2JhY2tbMF0gPSByICogMjU1O1xuICAgIHBhc3NiYWNrWzFdID0gZyAqIDI1NTtcbiAgICBwYXNzYmFja1syXSA9IGIgKiAyNTU7XG5cbiAgICAvLyBjb25zb2xlLmxvZyhcImhzbFRvUmdiXCIsIHBhc3NiYWNrKTtcblxuICAgIHJldHVybiBwYXNzYmFjaztcbn1cblxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
