var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
var Rx = require('rx');
var events = require('./events');
var Parameter = require('./parameter');
exports.DEBUG_LOOP = false;
exports.DEBUG_THEN = false;
exports.DEBUG_EMIT = false;
exports.DEBUG_EVENTS = true;
exports.DEBUG = false;
console.log("Animaxe, https://github.com/tomlarkworthy/animaxe");
/**
 * Each frame an animation is provided a Tick. The tick exposes access to the local animation time, the
 * time delta between the previous frame (dt) and the drawing context. Animators typically use the drawing context
 * directly, and pass the clock onto any time varying parameters.
 */
var Tick = (function () {
    function Tick(ctx, clock, dt, events) {
        this.ctx = ctx;
        this.clock = clock;
        this.dt = dt;
        this.events = events;
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
    function Animation(attach) {
        this.attach = attach;
    }
    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     *
     * This allows you to chain custom animations.
     *
     * ```Ax.move(...).pipe(myAnimation());```
     */
    Animation.prototype.pipe = function (downstream) {
        return combine(this, downstream);
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
     *
     * This returns a path object which events can be subscribed to
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
        this.t = 0;
        this.events = new events.Events();
        this.root = new Rx.Subject();
    }
    Animator.prototype.tick = function (dt) {
        var tick = new Tick(this.ctx, this.t, dt, this.events);
        this.t += dt;
        this.root.onNext(tick);
        this.events.clear();
    };
    Animator.prototype.ticker = function (dts) {
        // todo this is a bit yuck
        dts.subscribe(this.tick.bind(this), this.root.onError.bind(this.root), this.root.onCompleted.bind(this.root));
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
        return animation
            .attach(saveBeforeFrame) // todo, it be nicer if we could chain attach
            .tap(function (tick) {
            if (exports.DEBUG)
                console.log("animator: ctx next restore");
            tick.ctx.restore();
        }, function (err) {
            if (exports.DEBUG)
                console.log("animator: ctx err restore", err);
            self.ctx.restore();
        }, function () {
            if (exports.DEBUG)
                console.log("animator: ctx complete restore");
            self.ctx.restore();
        }).subscribe();
    };
    Animator.prototype.mousedown = function (x, y) {
        if (exports.DEBUG_EVENTS)
            console.log("mousedown", x, y);
        this.events.mousedowns.push([x, y]);
    };
    Animator.prototype.mouseup = function (x, y) {
        if (exports.DEBUG_EVENTS)
            console.log("mouseup", x, y);
        this.events.mouseups.push([x, y]);
    };
    /**
     * Attaches listener for a canvas which will be propogated during ticks to animators that take input, e.g. UI
     */
    Animator.prototype.registerEvents = function (canvas) {
        var self = this;
        var rect = canvas.getBoundingClientRect(); // you have to correct for padding, todo this might get stale
        canvas.onmousedown = function (evt) { return self.mousedown(evt.clientX - rect.left, evt.clientY - rect.top); };
        canvas.onmouseup = function (evt) { return self.mouseup(evt.clientX - rect.left, evt.clientY - rect.top); };
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
function assertDt(expectedDt) {
    return new Animation(function (upstream) {
        return upstream.zip(expectedDt, function (tick, expectedDtValue) {
            if (tick.dt != expectedDtValue)
                throw new Error("unexpected dt observed: " + tick.dt + ", expected:" + expectedDtValue);
            return tick;
        });
    });
}
exports.assertDt = assertDt;
//todo would be nice if this took an iterable or some other type of simple pull stream
// and used streamEquals
function assertClock(assertClock) {
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
    });
}
exports.assertClock = assertClock;
/**
 * Creates a new Animation by piping the animation flow of A into B
 */
function combine(a, b) {
    var b_prev_attach = b.attach;
    b.attach =
        function (upstream) {
            return b_prev_attach(a.attach(upstream));
        };
    return b;
}
exports.combine = combine;
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
var PathAnimation = (function (_super) {
    __extends(PathAnimation, _super);
    function PathAnimation() {
        _super.apply(this, arguments);
    }
    return PathAnimation;
})(Animation);
exports.PathAnimation = PathAnimation;
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
function draw(drawFactory) {
    return new Animation(function (previous) {
        var draw = drawFactory();
        return previous.tapOnNext(draw);
    });
}
exports.draw = draw;
function translate(delta) {
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
    });
}
exports.translate = translate;
function globalCompositeOperation(composite_mode) {
    return draw(function () {
        return function (tick) {
            tick.ctx.globalCompositeOperation = composite_mode;
        };
    });
}
exports.globalCompositeOperation = globalCompositeOperation;
function velocity(velocity) {
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
    });
}
exports.velocity = velocity;
function tween_linear(from, to, time) {
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
    });
}
exports.tween_linear = tween_linear;
function fillStyle(color) {
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
    });
}
exports.fillStyle = fillStyle;
function strokeStyle(color) {
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
    });
}
exports.strokeStyle = strokeStyle;
function shadowColor(color) {
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
    });
}
exports.shadowColor = shadowColor;
function shadowBlur(level) {
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
    });
}
exports.shadowBlur = shadowBlur;
function shadowOffset(xy) {
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
    });
}
exports.shadowOffset = shadowOffset;
function lineCap(style) {
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
    });
}
exports.lineCap = lineCap;
function lineJoin(style) {
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
    });
}
exports.lineJoin = lineJoin;
function lineWidth(width) {
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
    });
}
exports.lineWidth = lineWidth;
function miterLimit(limit) {
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
    });
}
exports.miterLimit = miterLimit;
function rect(xy, width_height) {
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
    });
}
exports.rect = rect;
function fillRect(xy, width_height) {
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
    });
}
exports.fillRect = fillRect;
function strokeRect(xy, width_height) {
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
    });
}
exports.strokeRect = strokeRect;
function clearRect(xy, width_height) {
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
    });
}
exports.clearRect = clearRect;
function withinPath(inner) {
    return new PathAnimation(function (upstream) {
        if (exports.DEBUG)
            console.log("withinPath: attach");
        var beginPathBeforeInner = upstream.tapOnNext(function (tick) { tick.ctx.beginPath(); });
        return inner.attach(beginPathBeforeInner).tapOnNext(function (tick) { tick.ctx.closePath(); });
    });
}
exports.withinPath = withinPath;
function stroke() {
    return draw(function () {
        if (exports.DEBUG)
            console.log("stroke: attach");
        return function (tick) {
            if (exports.DEBUG)
                console.log("stroke: stroke");
            tick.ctx.stroke();
        };
    });
}
exports.stroke = stroke;
function fill() {
    return draw(function () {
        if (exports.DEBUG)
            console.log("fill: attach");
        return function (tick) {
            if (exports.DEBUG)
                console.log("fill: stroke");
            tick.ctx.fill();
        };
    });
}
exports.fill = fill;
function moveTo(xy) {
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
    });
}
exports.moveTo = moveTo;
function lineTo(xy) {
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
    });
}
exports.lineTo = lineTo;
function clip() {
    return draw(function () {
        if (exports.DEBUG)
            console.log("clip: attach");
        return function (tick) {
            if (exports.DEBUG)
                console.log("clip: clip");
            tick.ctx.clip();
        };
    });
}
exports.clip = clip;
function quadraticCurveTo(control, end) {
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
    });
}
exports.quadraticCurveTo = quadraticCurveTo;
/**
 * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
 */
function bezierCurveTo(control1, control2, end) {
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
    });
}
exports.bezierCurveTo = bezierCurveTo;
/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
function arc(center, radius, radStartAngle, radEndAngle, counterclockwise) {
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
    });
}
exports.arc = arc;
/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
function arcTo(tangent1, tangent2, radius) {
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
    });
}
exports.arcTo = arcTo;
/**
 * Dynamic chainable wrapper for scale in the canvas API.
 */
function scale(xy) {
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
    });
}
exports.scale = scale;
/**
 * Dynamic chainable wrapper for rotate in the canvas API.
 */
function rotate(rads) {
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
    });
}
exports.rotate = rotate;
/**
 * Dynamic chainable wrapper for translate in the canvas API.
 * [ a c e
 *   b d f
 *   0 0 1 ]
 */
function transform(a, b, c, d, e, f) {
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
    });
}
exports.transform = transform;
/**
 * Dynamic chainable wrapper for setTransform in the canvas API.
 */
function setTransform(a, b, c, d, e, f) {
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
    });
}
exports.setTransform = setTransform;
/**
 * Dynamic chainable wrapper for font in the canvas API.
 */
function font(style) {
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
    });
}
exports.font = font;
/**
 * Dynamic chainable wrapper for textAlign in the canvas API.
 */
function textAlign(style) {
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
    });
}
exports.textAlign = textAlign;
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
function textBaseline(style) {
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
    });
}
exports.textBaseline = textBaseline;
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
function fillText(text, xy, maxWidth) {
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
    });
}
exports.fillText = fillText;
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
function drawImage(img, xy) {
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
    });
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
function glow(decay) {
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
    });
}
exports.glow = glow;
function take(frames) {
    return new Animation(function (prev) {
        if (exports.DEBUG)
            console.log("take: attach");
        return prev.take(frames);
    });
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiVGljayIsIlRpY2suY29uc3RydWN0b3IiLCJhc3NlcnQiLCJzdGFja1RyYWNlIiwiQW5pbWF0aW9uIiwiQW5pbWF0aW9uLmNvbnN0cnVjdG9yIiwiQW5pbWF0aW9uLnBpcGUiLCJBbmltYXRpb24udGhlbiIsIkFuaW1hdGlvbi5sb29wIiwiQW5pbWF0aW9uLmVtaXQiLCJBbmltYXRpb24ucGFyYWxsZWwiLCJBbmltYXRpb24uY2xvbmUiLCJBbmltYXRpb24udHdlZW5fbGluZWFyIiwiQW5pbWF0aW9uLnRha2UiLCJBbmltYXRpb24uZHJhdyIsIkFuaW1hdGlvbi5zdHJva2VTdHlsZSIsIkFuaW1hdGlvbi5maWxsU3R5bGUiLCJBbmltYXRpb24uc2hhZG93Q29sb3IiLCJBbmltYXRpb24uc2hhZG93Qmx1ciIsIkFuaW1hdGlvbi5zaGFkb3dPZmZzZXQiLCJBbmltYXRpb24ubGluZUNhcCIsIkFuaW1hdGlvbi5saW5lSm9pbiIsIkFuaW1hdGlvbi5saW5lV2lkdGgiLCJBbmltYXRpb24ubWl0ZXJMaW1pdCIsIkFuaW1hdGlvbi5yZWN0IiwiQW5pbWF0aW9uLmZpbGxSZWN0IiwiQW5pbWF0aW9uLnN0cm9rZVJlY3QiLCJBbmltYXRpb24uY2xlYXJSZWN0IiwiQW5pbWF0aW9uLndpdGhpblBhdGgiLCJBbmltYXRpb24uZmlsbCIsIkFuaW1hdGlvbi5zdHJva2UiLCJBbmltYXRpb24ubW92ZVRvIiwiQW5pbWF0aW9uLmxpbmVUbyIsIkFuaW1hdGlvbi5jbGlwIiwiQW5pbWF0aW9uLnF1YWRyYXRpY0N1cnZlVG8iLCJBbmltYXRpb24uYmV6aWVyQ3VydmVUbyIsIkFuaW1hdGlvbi5hcmMiLCJBbmltYXRpb24uYXJjVG8iLCJBbmltYXRpb24uc2NhbGUiLCJBbmltYXRpb24ucm90YXRlIiwiQW5pbWF0aW9uLnRyYW5zbGF0ZSIsIkFuaW1hdGlvbi50cmFuc2Zvcm0iLCJBbmltYXRpb24uc2V0VHJhbnNmb3JtIiwiQW5pbWF0aW9uLmZvbnQiLCJBbmltYXRpb24udGV4dEFsaWduIiwiQW5pbWF0aW9uLnRleHRCYXNlbGluZSIsIkFuaW1hdGlvbi5maWxsVGV4dCIsIkFuaW1hdGlvbi5kcmF3SW1hZ2UiLCJBbmltYXRpb24uZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uIiwiQW5pbWF0aW9uLnZlbG9jaXR5IiwiQW5pbWF0aW9uLmdsb3ciLCJBbmltYXRvciIsIkFuaW1hdG9yLmNvbnN0cnVjdG9yIiwiQW5pbWF0b3IudGljayIsIkFuaW1hdG9yLnRpY2tlciIsIkFuaW1hdG9yLnBsYXkiLCJBbmltYXRvci5tb3VzZWRvd24iLCJBbmltYXRvci5tb3VzZXVwIiwiQW5pbWF0b3IucmVnaXN0ZXJFdmVudHMiLCJhc3NlcnREdCIsImFzc2VydENsb2NrIiwiY29tYmluZSIsInBhcmFsbGVsIiwiZGVjcmVtZW50QWN0aXZlIiwiUGF0aEFuaW1hdGlvbiIsIlBhdGhBbmltYXRpb24uY29uc3RydWN0b3IiLCJjbG9uZSIsImVtaXQiLCJsb29wIiwiYXR0YWNoTG9vcCIsImRyYXciLCJ0cmFuc2xhdGUiLCJnbG9iYWxDb21wb3NpdGVPcGVyYXRpb24iLCJ2ZWxvY2l0eSIsInR3ZWVuX2xpbmVhciIsImZpbGxTdHlsZSIsInN0cm9rZVN0eWxlIiwic2hhZG93Q29sb3IiLCJzaGFkb3dCbHVyIiwic2hhZG93T2Zmc2V0IiwibGluZUNhcCIsImxpbmVKb2luIiwibGluZVdpZHRoIiwibWl0ZXJMaW1pdCIsInJlY3QiLCJmaWxsUmVjdCIsInN0cm9rZVJlY3QiLCJjbGVhclJlY3QiLCJ3aXRoaW5QYXRoIiwic3Ryb2tlIiwiZmlsbCIsIm1vdmVUbyIsImxpbmVUbyIsImNsaXAiLCJxdWFkcmF0aWNDdXJ2ZVRvIiwiYmV6aWVyQ3VydmVUbyIsImFyYyIsImFyY1RvIiwic2NhbGUiLCJyb3RhdGUiLCJ0cmFuc2Zvcm0iLCJzZXRUcmFuc2Zvcm0iLCJmb250IiwidGV4dEFsaWduIiwidGV4dEJhc2VsaW5lIiwiZmlsbFRleHQiLCJkcmF3SW1hZ2Ui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QUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDOzRCQUM3QixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDOzRCQUM3QixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDOzRCQUM3QixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUUzQjs7Ozs4QkFJRTs0QkFFRiw0Q0FBNEM7NEJBRTVDLHFCQUFxQjs0QkFFckI7Ozs7OEJBSUU7NEJBRUYsOEJBQThCOzRCQUM5Qjs7Ozs7OEJBS0U7NEJBQ0Y7Ozs7OzhCQUtFOzRCQUVGLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7NEJBQ3RELFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7NEJBQ3RELFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7NEJB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LEVBQUVBLENBQUNBLElBQUlBLEdBQUdBLENBQUNBO0lBQzdCQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNyREEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7SUFFOUJBLEVBQUVBLENBQUFBLENBQUNBLEdBQUdBLElBQUlBLEdBQUdBLENBQUNBLENBQUFBLENBQUNBO1FBQ1hBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLGFBQWFBO0lBQzVCQSxDQUFDQTtJQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtRQUNKQSxJQUFJQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQTtRQUNsQkEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDcERBLE1BQU1BLENBQUFBLENBQUNBLEdBQUdBLENBQUNBLENBQUFBLENBQUNBO1lBQ1JBLEtBQUtBLENBQUNBO2dCQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFBQ0EsS0FBS0EsQ0FBQ0E7WUFDakRBLEtBQUtBLENBQUNBO2dCQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFBQ0EsS0FBS0EsQ0FBQ0E7WUFDbkNBLEtBQUtBLENBQUNBO2dCQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFBQ0EsS0FBS0EsQ0FBQ0E7UUFDdkNBLENBQUNBO1FBQ0RBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO0lBQ1hBLENBQUNBO0lBQ0RBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQU9BLGtCQUFrQkE7SUFDakRBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLFdBQVdBO0lBQ3BDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxXQUFXQTtJQUVwQ0EsNkNBQTZDQTtJQUU3Q0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7QUFDcEJBLENBQUNBO0FBRUQ7Ozs7Ozs7Ozs7R0FVRztBQUNILGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFrQztJQUN6REMsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7SUFDWkEsMkNBQTJDQTtJQUUzQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFDZEEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFDZEEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0E7SUFFZEEsRUFBRUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQUEsQ0FBQ0E7UUFDUEEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsYUFBYUE7SUFDaENBLENBQUNBO0lBQUFBLElBQUlBLENBQUFBLENBQUNBO1FBQ0ZBLElBQUlBLE9BQU9BLEdBQUdBLGlCQUFpQkEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7WUFDbENDLEVBQUVBLENBQUFBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUNqQkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFBQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQTtnQkFBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDdkNBLEVBQUVBLENBQUFBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBO2dCQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNyQkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLE1BQU1BLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQy9DQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNiQSxDQUFDQSxDQUFDRDtRQUVGQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUM5Q0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDbEJBLENBQUNBLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBLENBQUNBO1FBQzNCQSxDQUFDQSxHQUFHQSxPQUFPQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNyQkEsQ0FBQ0EsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDL0JBLENBQUNBO0lBRURBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBO0lBQ3RCQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQTtJQUN0QkEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0E7SUFFdEJBLHFDQUFxQ0E7SUFFckNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBO0FBQ3BCQSxDQUFDQSIsImZpbGUiOiJhbmltYXhlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL25vZGVfbW9kdWxlcy9yeC90cy9yeC5hbGwuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbmltcG9ydCBSeCA9IHJlcXVpcmUoJ3J4Jyk7XG5pbXBvcnQgZXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcbmltcG9ydCBQYXJhbWV0ZXIgPSByZXF1aXJlKCcuL3BhcmFtZXRlcicpO1xuXG5leHBvcnQgdmFyIERFQlVHX0xPT1AgPSBmYWxzZTtcbmV4cG9ydCB2YXIgREVCVUdfVEhFTiA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVR19FTUlUID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX0VWRU5UUyA9IHRydWU7XG5leHBvcnQgdmFyIERFQlVHID0gZmFsc2U7XG5cbmNvbnNvbGUubG9nKFwiQW5pbWF4ZSwgaHR0cHM6Ly9naXRodWIuY29tL3RvbWxhcmt3b3J0aHkvYW5pbWF4ZVwiKTtcblxuLyoqXG4gKiBBIHBhcmFtZXRlciBpcyB1c2VkIGZvciB0aW1lIHZhcnlpbmcgdmFsdWVzIHRvIGFuaW1hdGlvbiBmdW5jdGlvbnMuXG4gKiBCZWZvcmUgYSBwYXJhbWV0ZXIgaXMgdXNlZCwgdGhlIGVuY2xvc2luZyBhbmltYXRpb24gbXVzdCBjYWxsIGluaXQuIFRoaXMgcmV0dXJucyBhIGZ1bmN0aW9uIHdoaWNoXG4gKiBjYW4gYmUgdXNlZCB0byBmaW5kIHRoZSB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gZm9yIHNwZWNpZmljIHZhbHVlcyBvZiB0aW1lLiBUeXBpY2FsbHkgdGhpcyBpcyBkb25lIHdpdGhpbiB0aGVcbiAqIGFuaW1hdGlvbidzIGNsb3N1cmUuIEZvciBleGFtcGxlOlxuYGBgXG5mdW5jdGlvbiBtb3ZlVG8oXG4gICAgeHk6IFBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7IC8vIGluaXQgdG8gb2J0YWluICduZXh0J1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5ID0geHlfbmV4dCh0aWNrLmNsb2NrKTsgLy8gdXNlICduZXh0JyB0byBnZXQgdmFsdWVcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5tb3ZlVG8oeHlbMF0sIHh5WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5gYGBcbiAqXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyPFQ+IGV4dGVuZHMgUGFyYW1ldGVyLlBhcmFtZXRlcjxUPiB7fVxuXG4vLyB0b2RvIHdlIHNob3VsZCBtb3ZlIHRoZXNlIGludG8gYW4gRVM2IG1vZHVsZSBidXQgbXkgSURFIGRvZXMgbm90IHN1cHBvcnQgaXQgeWV0XG4vKipcbiAqIEEgY3NzIGVuY29kZWQgY29sb3IsIGUuZy4gXCJyZ2JhKDI1NSwgMTI1LCAzMiwgMC41KVwiIG9yIFwicmVkXCJcbiAqL1xuZXhwb3J0IHR5cGUgQ29sb3IgPSBzdHJpbmdcbi8qKlxuICogQSAyRCBhcnJheSBvZiBudW1iZXJzIHVzZWQgZm9yIHJlcHJlc2VudGluZyBwb2ludHMgb3IgdmVjdG9yc1xuICovXG5leHBvcnQgdHlwZSBQb2ludCAgICAgPSBbbnVtYmVyLCBudW1iZXJdXG4vKipcbiAqIEEgbGl0ZXJhbCBvciBhIGR5bmFtaWMgUGFyYW1ldGVyIGFsaWFzLCB1c2VkIGFzIGFyZ3VtZW50cyB0byBhbmltYXRpb25zLlxuICovXG5leHBvcnQgdHlwZSBOdW1iZXJBcmcgPSBudW1iZXIgfCBQYXJhbWV0ZXI8bnVtYmVyPlxuLyoqXG4gKiBBIGxpdGVyYWwgb3IgYSBkeW5hbWljIFBhcmFtZXRlciBhbGlhcywgdXNlZCBhcyBhcmd1bWVudHMgdG8gYW5pbWF0aW9ucy5cbiAqL1xuZXhwb3J0IHR5cGUgUG9pbnRBcmcgID0gUG9pbnQgfCBQYXJhbWV0ZXI8UG9pbnQ+XG4vKipcbiAqIEEgbGl0ZXJhbCBvciBhIGR5bmFtaWMgUGFyYW1ldGVyIGFsaWFzLCB1c2VkIGFzIGFyZ3VtZW50cyB0byBhbmltYXRpb25zLlxuICovXG5leHBvcnQgdHlwZSBDb2xvckFyZyAgPSBDb2xvciB8IFBhcmFtZXRlcjxDb2xvcj5cbi8qKlxuICogQSBsaXRlcmFsIG9yIGEgZHluYW1pYyBQYXJhbWV0ZXIgYWxpYXMsIHVzZWQgYXMgYXJndW1lbnRzIHRvIGFuaW1hdGlvbnMuXG4gKi9cbmV4cG9ydCB0eXBlIFN0cmluZ0FyZyA9IHN0cmluZyB8IFBhcmFtZXRlcjxzdHJpbmc+XG5cbi8qKlxuICogRWFjaCBmcmFtZSBhbiBhbmltYXRpb24gaXMgcHJvdmlkZWQgYSBUaWNrLiBUaGUgdGljayBleHBvc2VzIGFjY2VzcyB0byB0aGUgbG9jYWwgYW5pbWF0aW9uIHRpbWUsIHRoZVxuICogdGltZSBkZWx0YSBiZXR3ZWVuIHRoZSBwcmV2aW91cyBmcmFtZSAoZHQpIGFuZCB0aGUgZHJhd2luZyBjb250ZXh0LiBBbmltYXRvcnMgdHlwaWNhbGx5IHVzZSB0aGUgZHJhd2luZyBjb250ZXh0XG4gKiBkaXJlY3RseSwgYW5kIHBhc3MgdGhlIGNsb2NrIG9udG8gYW55IHRpbWUgdmFyeWluZyBwYXJhbWV0ZXJzLlxuICovXG5leHBvcnQgY2xhc3MgVGljayB7XG4gICAgY29uc3RydWN0b3IgKFxuICAgICAgICBwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQsXG4gICAgICAgIHB1YmxpYyBjbG9jazogbnVtYmVyLFxuICAgICAgICBwdWJsaWMgZHQ6IG51bWJlcixcbiAgICAgICAgcHVibGljIGV2ZW50czogZXZlbnRzLkV2ZW50cylcbiAgICB7fVxufVxuXG4vKipcbiAqIFRoZSBzdHJlYW0gb2YgVGljaydzIGFuIGFuaW1hdGlvbiBpcyBwcm92aWRlZCB3aXRoIGlzIHJlcHJlc2VudGVkIGJ5IGEgcmVhY3RpdmUgZXh0ZW5zaW9uIG9ic2VydmFibGUuXG4gKi9cbmV4cG9ydCB0eXBlIFRpY2tTdHJlYW0gPSBSeC5PYnNlcnZhYmxlPFRpY2s+O1xuXG5cbmZ1bmN0aW9uIGFzc2VydChwcmVkaWNhdGU6IGJvb2xlYW4sIG1lc3NhZ2UgPzogc3RyaW5nKSB7XG4gICAgaWYgKCFwcmVkaWNhdGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihzdGFja1RyYWNlKCkpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0YWNrVHJhY2UoKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIHJldHVybiAoPGFueT5lcnIpLnN0YWNrO1xufVxuXG4vKipcbiAqIEFuIGFuaW1hdGlvbiBpcyBwaXBlbGluZSB0aGF0IG1vZGlmaWVzIHRoZSBkcmF3aW5nIGNvbnRleHQgZm91bmQgaW4gYW4gYW5pbWF0aW9uIFRpY2suIEFuaW1hdGlvbnMgY2FuIGJlIGNoYWluZWRcbiAqIHRvZ2V0aGVyIHRvIGNyZWF0ZSBhIG1vcmUgY29tcGxpY2F0ZWQgQW5pbWF0aW9uLiBUaGV5IGFyZSBjb21wb3NlYWJsZSxcbiAqXG4gKiBlLmcuIGBgYGFuaW1hdGlvbjEgPSBBeC50cmFuc2xhdGUoWzUwLCA1MF0pLmZpbGxTdHlsZShcInJlZFwiKS5maWxsUmVjdChbMCwwXSwgWzIwLDIwXSlgYGBcbiAqIGlzIG9uZSBhbmltYXRpb24gd2hpY2ggaGFzIGJlZW4gZm9ybWVkIGZyb20gdGhyZWUgc3ViYW5pbWF0aW9ucy5cbiAqXG4gKiBBbmltYXRpb25zIGhhdmUgYSBsaWZlY3ljbGUsIHRoZXkgY2FuIGJlIGZpbml0ZSBvciBpbmZpbml0ZSBpbiBsZW5ndGguIFlvdSBjYW4gc3RhcnQgdGVtcG9yYWxseSBjb21wb3NlIGFuaW1hdGlvbnNcbiAqIHVzaW5nIGBgYGFuaW0xLnRoZW4oYW5pbTIpYGBgLCB3aGljaCBjcmVhdGVzIGEgbmV3IGFuaW1hdGlvbiB0aGF0IHBsYXlzIGFuaW1hdGlvbiAyIHdoZW4gYW5pbWF0aW9uIDEgZmluaXNoZXMuXG4gKlxuICogV2hlbiBhbiBhbmltYXRpb24gaXMgc2VxdWVuY2VkIGludG8gdGhlIGFuaW1hdGlvbiBwaXBlbGluZS4gSXRzIGF0dGFjaCBtZXRob2QgaXMgY2FsbGVkIHdoaWNoIGF0Y3VhbGx5IGJ1aWxkcyB0aGVcbiAqIFJ4SlMgcGlwZWxpbmUuIFRodXMgYW4gYW5pbWF0aW9uIGlzIG5vdCBsaXZlLCBidXQgcmVhbGx5IGEgZmFjdG9yeSBmb3IgYSBSeEpTIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBBbmltYXRpb24ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhdHRhY2g6ICh1cHN0cmVhbTogVGlja1N0cmVhbSkgPT4gVGlja1N0cmVhbSkge1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHNlbmQgdGhlIGRvd25zdHJlYW0gY29udGV4dCBvZiAndGhpcycgYW5pbWF0aW9uLCBhcyB0aGUgdXBzdHJlYW0gY29udGV4dCB0byBzdXBwbGllZCBhbmltYXRpb24uXG4gICAgICpcbiAgICAgKiBUaGlzIGFsbG93cyB5b3UgdG8gY2hhaW4gY3VzdG9tIGFuaW1hdGlvbnMuXG4gICAgICpcbiAgICAgKiBgYGBBeC5tb3ZlKC4uLikucGlwZShteUFuaW1hdGlvbigpKTtgYGBcbiAgICAgKi9cbiAgICBwaXBlPFQgZXh0ZW5kcyBBbmltYXRpb24+KGRvd25zdHJlYW06IFQpOiBUIHtcbiAgICAgICAgcmV0dXJuIGNvbWJpbmUodGhpcywgZG93bnN0cmVhbSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogZGVsaXZlcnMgdXBzdHJlYW0gZXZlbnRzIHRvICd0aGlzJyBmaXJzdCwgdGhlbiB3aGVuICd0aGlzJyBhbmltYXRpb24gaXMgZmluaXNoZWRcbiAgICAgKiB0aGUgdXBzdHJlYW0gaXMgc3dpdGNoZWQgdG8gdGhlIHRoZSBmb2xsb3dlciBhbmltYXRpb24uXG4gICAgICpcbiAgICAgKiBUaGlzIGFsbG93cyB5b3UgdG8gc2VxdWVuY2UgYW5pbWF0aW9ucyB0ZW1wb3JhbGx5LlxuICAgICAqIGZyYW1lMUFuaW1hdGlvbigpLnRoZW4oZnJhbWUyQW5pbWF0aW9uKS50aGVuKGZyYW1lM0FuaW1hdGlvbilcbiAgICAgKi9cbiAgICB0aGVuKGZvbGxvd2VyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IFRpY2tTdHJlYW0pIDogVGlja1N0cmVhbSB7XG4gICAgICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8VGljaz4oZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ICA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RUdXJuID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50ID0gZmlyc3Q7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogYXR0YWNoXCIpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZEF0dGFjaCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RBdHRhY2ggID0gc2VsZi5hdHRhY2goZmlyc3Quc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGZpcnN0IGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUdXJuID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaCA9IGZvbGxvd2VyLmF0dGFjaChzZWNvbmQuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcHJldlN1YnNjcmlwdGlvbiA9IHByZXYuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSB0byBmaXJzdCBPUiBzZWNvbmRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlyc3RUdXJuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3Qub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmQub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIC8vIG9uIGRpc3Bvc2VcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBkaXNwb3NlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0QXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlY29uZEF0dGFjaClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpOyAvL3RvZG8gcmVtb3ZlIHN1YnNjcmliZU9uc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhbmltYXRpb24gdGhhdCByZXBsYXlzIHRoZSBpbm5lciBhbmltYXRpb24gZWFjaCB0aW1lIHRoZSBpbm5lciBhbmltYXRpb24gY29tcGxldGVzLlxuICAgICAqXG4gICAgICogVGhlIHJlc3VsdGFudCBhbmltYXRpb24gaXMgYWx3YXlzIHJ1bnMgZm9yZXZlciB3aGlsZSB1cHN0cmVhbSBpcyBsaXZlLiBPbmx5IGEgc2luZ2xlIGlubmVyIGFuaW1hdGlvblxuICAgICAqIHBsYXlzIGF0IGEgdGltZSAodW5saWtlIGVtaXQoKSlcbiAgICAgKi9cbiAgICBsb29wKGlubmVyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGxvb3AoaW5uZXIpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhbmltYXRpb24gdGhhdCBzZXF1ZW5jZXMgdGhlIGlubmVyIGFuaW1hdGlvbiBldmVyeSB0aW1lIGZyYW1lLlxuICAgICAqXG4gICAgICogVGhlIHJlc3VsdGFudCBhbmltYXRpb24gaXMgYWx3YXlzIHJ1bnMgZm9yZXZlciB3aGlsZSB1cHN0cmVhbSBpcyBsaXZlLiBNdWx0aXBsZSBpbm5lciBhbmltYXRpb25zXG4gICAgICogY2FuIGJlIHBsYXlpbmcgYXQgdGhlIHNhbWUgdGltZSAodW5saWtlIGxvb3ApXG4gICAgICovXG4gICAgZW1pdChpbm5lcjogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShlbWl0KGlubmVyKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGxheXMgYWxsIHRoZSBpbm5lciBhbmltYXRpb25zIGF0IHRoZSBzYW1lIHRpbWUuIFBhcmFsbGVsIGNvbXBsZXRlcyB3aGVuIGFsbCBpbm5lciBhbmltYXRpb25zIGFyZSBvdmVyLlxuICAgICAqXG4gICAgICogVGhlIGNhbnZhcyBzdGF0ZXMgYXJlIHJlc3RvcmVkIGJlZm9yZSBlYWNoIGZvcmssIHNvIHN0eWxpbmcgYW5kIHRyYW5zZm9ybXMgb2YgZGlmZmVyZW50IGNoaWxkIGFuaW1hdGlvbnMgZG8gbm90XG4gICAgICogaW50ZXJhY3QgKGFsdGhvdWdoIG9ic3Zpb3VzbHkgdGhlIHBpeGVsIGJ1ZmZlciBpcyBhZmZlY3RlZCBieSBlYWNoIGFuaW1hdGlvbilcbiAgICAgKi9cbiAgICBwYXJhbGxlbChpbm5lcl9hbmltYXRpb25zOiBSeC5PYnNlcnZhYmxlPEFuaW1hdGlvbj4gfCBBbmltYXRpb25bXSk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUocGFyYWxsZWwoaW5uZXJfYW5pbWF0aW9ucykpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlcXVlbmNlcyBuIGNvcGllcyBvZiB0aGUgaW5uZXIgYW5pbWF0aW9uLiBDbG9uZSBjb21wbGV0ZXMgd2hlbiBhbGwgaW5uZXIgYW5pbWF0aW9ucyBhcmUgb3Zlci5cbiAgICAgKi9cbiAgICBjbG9uZShuOiBudW1iZXIsIGlubmVyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGNsb25lKG4sIGlubmVyKSk7XG4gICAgfVxuXG4gICAgdHdlZW5fbGluZWFyKFxuICAgICAgICBmcm9tOiBQb2ludEFyZyxcbiAgICAgICAgdG86ICAgUG9pbnRBcmcsXG4gICAgICAgIHRpbWU6IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodHdlZW5fbGluZWFyKGZyb20sIHRvLCB0aW1lKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhbmltYXRpb24gdGhhdCBpcyBhdCBtb3N0IG4gZnJhbWVzIGZyb20gJ3RoaXMnLlxuICAgICAqL1xuICAgIHRha2UoZnJhbWVzOiBudW1iZXIpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHRha2UoZnJhbWVzKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogaGVscGVyIG1ldGhvZCBmb3IgaW1wbGVtZW50aW5nIHNpbXBsZSBhbmltYXRpb25zICh0aGF0IGRvbid0IGZvcmsgdGhlIGFuaW1hdGlvbiB0cmVlKS5cbiAgICAgKiBZb3UganVzdCBoYXZlIHRvIHN1cHBseSBhIGZ1bmN0aW9uIHRoYXQgZG9lcyBzb21ldGhpbmcgd2l0aCB0aGUgZHJhdyB0aWNrLlxuICAgICAqL1xuICAgIGRyYXcoZHJhd0ZhY3Rvcnk6ICgpID0+ICgodGljazogVGljaykgPT4gdm9pZCkpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGRyYXcoZHJhd0ZhY3RvcnkpKTtcbiAgICB9XG5cbiAgICAvLyBDYW52YXMgQVBJXG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc3Ryb2tlU3R5bGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgc3Ryb2tlU3R5bGUoY29sb3I6IENvbG9yQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzdHJva2VTdHlsZShjb2xvcikpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBmaWxsU3R5bGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgZmlsbFN0eWxlKGNvbG9yOiBDb2xvckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZmlsbFN0eWxlKGNvbG9yKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNoYWRvd0NvbG9yIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHNoYWRvd0NvbG9yKGNvbG9yOiBDb2xvckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoc2hhZG93Q29sb3IoY29sb3IpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc2hhZG93Qmx1ciBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzaGFkb3dCbHVyKGxldmVsOiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHNoYWRvd0JsdXIobGV2ZWwpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc2hhZG93T2Zmc2V0WCBhbmQgc2hhZG93T2Zmc2V0WSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzaGFkb3dPZmZzZXQoeHk6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzaGFkb3dPZmZzZXQoeHkpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbGluZUNhcCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBsaW5lQ2FwKHN0eWxlOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGxpbmVDYXAoc3R5bGUpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbGluZUpvaW4gaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgbGluZUpvaW4oc3R5bGU6IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUobGluZUpvaW4oc3R5bGUpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbGluZVdpZHRoIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGxpbmVXaWR0aCh3aWR0aDogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShsaW5lV2lkdGgod2lkdGgpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbWl0ZXJMaW1pdCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBtaXRlckxpbWl0KGxpbWl0OiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKG1pdGVyTGltaXQobGltaXQpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgcmVjdCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICByZWN0KHh5OiBQb2ludEFyZywgd2lkdGhfaGVpZ2h0OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUocmVjdCh4eSwgd2lkdGhfaGVpZ2h0KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGZpbGxSZWN0IGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGZpbGxSZWN0KHh5OiBQb2ludEFyZywgd2lkdGhfaGVpZ2h0OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZmlsbFJlY3QoeHksIHdpZHRoX2hlaWdodCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBzdHJva2VSZWN0IGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHN0cm9rZVJlY3QoeHk6IFBvaW50QXJnLCB3aWR0aF9oZWlnaHQ6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzdHJva2VSZWN0KHh5LCB3aWR0aF9oZWlnaHQpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgY2xlYXJSZWN0IGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGNsZWFyUmVjdCh4eTogUG9pbnRBcmcsIHdpZHRoX2hlaWdodDogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGNsZWFyUmVjdCh4eSwgd2lkdGhfaGVpZ2h0KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIEVuY2xvc2VzIHRoZSBpbm5lciBhbmltYXRpb24gd2l0aCBhIGJlZ2lucGF0aCgpIGFuZCBlbmRwYXRoKCkgZnJvbSB0aGUgY2FudmFzIEFQSS5cbiAgICAgKlxuICAgICAqIFRoaXMgcmV0dXJucyBhIHBhdGggb2JqZWN0IHdoaWNoIGV2ZW50cyBjYW4gYmUgc3Vic2NyaWJlZCB0b1xuICAgICAqL1xuICAgIHdpdGhpblBhdGgoaW5uZXI6IEFuaW1hdGlvbik6IFBhdGhBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHdpdGhpblBhdGgoaW5uZXIpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgZmlsbCBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAgICAgKi9cbiAgICBmaWxsKCk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZmlsbCgpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc3Ryb2tlIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHN0cm9rZSgpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHN0cm9rZSgpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbW92ZVRvIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICAgICAqL1xuICAgIG1vdmVUbyh4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKG1vdmVUbyh4eSkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBsaW5lVG8gaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgbGluZVRvKHh5OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUobGluZVRvKHh5KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGNsaXAgaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgY2xpcCgpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGNsaXAoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHF1YWRyYXRpY0N1cnZlVG8gaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgcXVhZHJhdGljQ3VydmVUbyhjb250cm9sOiBQb2ludEFyZywgZW5kOiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUocXVhZHJhdGljQ3VydmVUbyhjb250cm9sLCBlbmQpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgYmV6aWVyQ3VydmVUbyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAgICAgKi9cbiAgICBiZXppZXJDdXJ2ZVRvKGNvbnRyb2wxOiBQb2ludEFyZywgY29udHJvbDI6IFBvaW50QXJnLCBlbmQ6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShiZXppZXJDdXJ2ZVRvKGNvbnRyb2wxLCBjb250cm9sMiwgZW5kKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGFyYyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAgICAgKi9cbiAgICBhcmMoY2VudGVyOiBQb2ludEFyZywgcmFkaXVzOiBOdW1iZXJBcmcsXG4gICAgICAgIHJhZFN0YXJ0QW5nbGU6IE51bWJlckFyZywgcmFkRW5kQW5nbGU6IE51bWJlckFyZyxcbiAgICAgICAgY291bnRlcmNsb2Nrd2lzZT86IGJvb2xlYW4pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGFyYyhjZW50ZXIsIHJhZGl1cywgcmFkU3RhcnRBbmdsZSwgcmFkRW5kQW5nbGUsIGNvdW50ZXJjbG9ja3dpc2UpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBhcmMgaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgYXJjVG8odGFuZ2VudDE6IFBvaW50QXJnLCB0YW5nZW50MjogUG9pbnRBcmcsIHJhZGl1czogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShhcmNUbyh0YW5nZW50MSwgdGFuZ2VudDIsIHJhZGl1cykpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBzY2FsZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzY2FsZSh4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHNjYWxlKHh5KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHJvdGF0ZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICByb3RhdGUocmFkczogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShyb3RhdGUocmFkcykpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciB0cmFuc2xhdGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgdHJhbnNsYXRlKHh5OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodHJhbnNsYXRlKHh5KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHRyYW5zbGF0ZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKiBbIGEgYyBlXG4gICAgICogICBiIGQgZlxuICAgICAqICAgMCAwIDEgXVxuICAgICAqL1xuICAgIHRyYW5zZm9ybShhOiBOdW1iZXJBcmcsIGI6IE51bWJlckFyZywgYzogTnVtYmVyQXJnLFxuICAgICAgICAgICAgICBkOiBOdW1iZXJBcmcsIGU6IE51bWJlckFyZywgZjogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh0cmFuc2Zvcm0oYSxiLGMsZCxlLGYpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc2V0VHJhbnNmb3JtIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHNldFRyYW5zZm9ybShhOiBOdW1iZXJBcmcsIGI6IE51bWJlckFyZywgYzogTnVtYmVyQXJnLFxuICAgICAgICAgICAgICAgICBkOiBOdW1iZXJBcmcsIGU6IE51bWJlckFyZywgZjogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzZXRUcmFuc2Zvcm0oYSxiLGMsZCxlLGYpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgZm9udCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBmb250KHN0eWxlOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGZvbnQoc3R5bGUpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEFsaWduIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHRleHRBbGlnbihzdHlsZTogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh0ZXh0QWxpZ24oc3R5bGUpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEJhc2VsaW5lIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHRleHRCYXNlbGluZShzdHlsZTogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh0ZXh0QmFzZWxpbmUoc3R5bGUpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEJhc2VsaW5lIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGZpbGxUZXh0KHRleHQ6IFN0cmluZ0FyZywgeHk6IFBvaW50QXJnLCBtYXhXaWR0aD86IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZmlsbFRleHQodGV4dCwgeHksIG1heFdpZHRoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGRyYXdJbWFnZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBkcmF3SW1hZ2UoaW1nLCB4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGRyYXdJbWFnZShpbWcsIHh5KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbihvcGVyYXRpb246IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uKG9wZXJhdGlvbikpO1xuICAgIH1cbiAgICAvLyBFbmQgQ2FudmFzIEFQSVxuXG5cbiAgICAvKipcbiAgICAgKiB0cmFuc2xhdGVzIHRoZSBkcmF3aW5nIGNvbnRleHQgYnkgdmVsb2NpdHkgKiB0aWNrLmNsb2NrXG4gICAgICovXG4gICAgdmVsb2NpdHkodmVjdG9yOiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodmVsb2NpdHkodmVjdG9yKSk7XG4gICAgfVxuXG4gICAgZ2xvdyhkZWNheTogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShnbG93KGRlY2F5KSk7XG4gICAgfVxuXG59XG5cbmV4cG9ydCBjbGFzcyBBbmltYXRvciB7XG4gICAgcm9vdDogUnguU3ViamVjdDxUaWNrPjtcbiAgICB0OiBudW1iZXIgPSAwO1xuICAgIGV2ZW50czogZXZlbnRzLkV2ZW50cyA9IG5ldyBldmVudHMuRXZlbnRzKCk7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQpIHtcbiAgICAgICAgdGhpcy5yb290ID0gbmV3IFJ4LlN1YmplY3Q8VGljaz4oKVxuICAgIH1cbiAgICB0aWNrKGR0OiBudW1iZXIpIHtcbiAgICAgICAgdmFyIHRpY2sgPSBuZXcgVGljayh0aGlzLmN0eCwgdGhpcy50LCBkdCwgdGhpcy5ldmVudHMpO1xuICAgICAgICB0aGlzLnQgKz0gZHQ7XG4gICAgICAgIHRoaXMucm9vdC5vbk5leHQodGljayk7XG4gICAgICAgIHRoaXMuZXZlbnRzLmNsZWFyKCk7XG4gICAgfVxuICAgIHRpY2tlcihkdHM6IFJ4Lk9ic2VydmFibGU8bnVtYmVyPik6IHZvaWQge1xuICAgICAgICAvLyB0b2RvIHRoaXMgaXMgYSBiaXQgeXVja1xuICAgICAgICBkdHMuc3Vic2NyaWJlKHRoaXMudGljay5iaW5kKHRoaXMpLCB0aGlzLnJvb3Qub25FcnJvci5iaW5kKHRoaXMucm9vdCksIHRoaXMucm9vdC5vbkNvbXBsZXRlZC5iaW5kKHRoaXMucm9vdCkpO1xuICAgIH1cbiAgICBwbGF5KGFuaW1hdGlvbjogQW5pbWF0aW9uKTogUnguSURpc3Bvc2FibGUge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhbmltYXRvcjogcGxheVwiKTtcbiAgICAgICAgdmFyIHNhdmVCZWZvcmVGcmFtZSA9IHRoaXMucm9vdC50YXBPbk5leHQoZnVuY3Rpb24odGljayl7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBzYXZlXCIpO1xuICAgICAgICAgICAgdGljay5jdHguc2F2ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGFuaW1hdGlvblxuICAgICAgICAgICAgLmF0dGFjaChzYXZlQmVmb3JlRnJhbWUpIC8vIHRvZG8sIGl0IGJlIG5pY2VyIGlmIHdlIGNvdWxkIGNoYWluIGF0dGFjaFxuICAgICAgICAgICAgLnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IG5leHQgcmVzdG9yZVwiKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggZXJyIHJlc3RvcmVcIiwgZXJyKTtcbiAgICAgICAgICAgICAgICBzZWxmLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9LGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggY29tcGxldGUgcmVzdG9yZVwiKTtcbiAgICAgICAgICAgICAgICBzZWxmLmN0eC5yZXN0b3JlKCk7XG4gICAgICAgICAgICB9KS5zdWJzY3JpYmUoKTtcbiAgICB9XG5cbiAgICBtb3VzZWRvd24gKHg6IG51bWJlciwgeTogbnVtYmVyKSB7XG4gICAgICAgIGlmIChERUJVR19FVkVOVFMpIGNvbnNvbGUubG9nKFwibW91c2Vkb3duXCIsIHgsIHkpO1xuICAgICAgICB0aGlzLmV2ZW50cy5tb3VzZWRvd25zLnB1c2goW3gsIHldKTtcbiAgICB9XG4gICAgbW91c2V1cCAoeDogbnVtYmVyLCB5OiBudW1iZXIpIHtcbiAgICAgICAgaWYgKERFQlVHX0VWRU5UUykgY29uc29sZS5sb2coXCJtb3VzZXVwXCIsIHgsIHkpO1xuICAgICAgICB0aGlzLmV2ZW50cy5tb3VzZXVwcy5wdXNoKFt4LCB5XSk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2hlcyBsaXN0ZW5lciBmb3IgYSBjYW52YXMgd2hpY2ggd2lsbCBiZSBwcm9wb2dhdGVkIGR1cmluZyB0aWNrcyB0byBhbmltYXRvcnMgdGhhdCB0YWtlIGlucHV0LCBlLmcuIFVJXG4gICAgICovXG4gICAgcmVnaXN0ZXJFdmVudHMoY2FudmFzOmFueSk6IHZvaWQge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpOyAvLyB5b3UgaGF2ZSB0byBjb3JyZWN0IGZvciBwYWRkaW5nLCB0b2RvIHRoaXMgbWlnaHQgZ2V0IHN0YWxlXG4gICAgICAgIGNhbnZhcy5vbm1vdXNlZG93biA9IGV2dCA9PiBzZWxmLm1vdXNlZG93bihldnQuY2xpZW50WCAtIHJlY3QubGVmdCwgZXZ0LmNsaWVudFkgLSByZWN0LnRvcCk7XG4gICAgICAgIGNhbnZhcy5vbm1vdXNldXAgPSBldnQgPT4gc2VsZi5tb3VzZXVwKGV2dC5jbGllbnRYIC0gcmVjdC5sZWZ0LCBldnQuY2xpZW50WSAtIHJlY3QudG9wKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBOT1RFOiBjdXJyZW50bHkgZmFpbHMgaWYgdGhlIHN0cmVhbXMgYXJlIGRpZmZlcmVudCBsZW5ndGhzXG4gKiBAcGFyYW0gZXhwZWN0ZWREdCB0aGUgZXhwZWN0ZWQgY2xvY2sgdGljayB2YWx1ZXNcbiAqIEBwYXJhbSBhZnRlclxuICogQHJldHVybnMge0FuaW1hdGlvbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydER0KGV4cGVjdGVkRHQ6IFJ4Lk9ic2VydmFibGU8bnVtYmVyPik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnppcChleHBlY3RlZER0LCBmdW5jdGlvbih0aWNrOiBUaWNrLCBleHBlY3RlZER0VmFsdWU6IG51bWJlcikge1xuICAgICAgICAgICAgaWYgKHRpY2suZHQgIT0gZXhwZWN0ZWREdFZhbHVlKSB0aHJvdyBuZXcgRXJyb3IoXCJ1bmV4cGVjdGVkIGR0IG9ic2VydmVkOiBcIiArIHRpY2suZHQgKyBcIiwgZXhwZWN0ZWQ6XCIgKyBleHBlY3RlZER0VmFsdWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG4vL3RvZG8gd291bGQgYmUgbmljZSBpZiB0aGlzIHRvb2sgYW4gaXRlcmFibGUgb3Igc29tZSBvdGhlciB0eXBlIG9mIHNpbXBsZSBwdWxsIHN0cmVhbVxuLy8gYW5kIHVzZWQgc3RyZWFtRXF1YWxzXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0Q2xvY2soYXNzZXJ0Q2xvY2s6IG51bWJlcltdKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgaW5kZXggPSAwO1xuXG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24odXBzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnRhcE9uTmV4dChmdW5jdGlvbih0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYXNzZXJ0Q2xvY2s6IFwiLCB0aWNrKTtcbiAgICAgICAgICAgIGlmICh0aWNrLmNsb2NrIDwgYXNzZXJ0Q2xvY2tbaW5kZXhdIC0gMC4wMDAwMSB8fCB0aWNrLmNsb2NrID4gYXNzZXJ0Q2xvY2tbaW5kZXhdICsgMC4wMDAwMSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvck1zZyA9IFwidW5leHBlY3RlZCBjbG9jayBvYnNlcnZlZDogXCIgKyB0aWNrLmNsb2NrICsgXCIsIGV4cGVjdGVkOlwiICsgYXNzZXJ0Q2xvY2tbaW5kZXhdXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyb3JNc2cpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbmRleCArKztcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBBbmltYXRpb24gYnkgcGlwaW5nIHRoZSBhbmltYXRpb24gZmxvdyBvZiBBIGludG8gQlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tYmluZTxUIGV4dGVuZHMgQW5pbWF0aW9uPihhOiBBbmltYXRpb24sIGI6IFQpOiBUIHtcbiAgICB2YXIgYl9wcmV2X2F0dGFjaCA9IGIuYXR0YWNoO1xuICAgIGIuYXR0YWNoID1cbiAgICAgICAgKHVwc3RyZWFtOiBUaWNrU3RyZWFtKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gYl9wcmV2X2F0dGFjaChhLmF0dGFjaCh1cHN0cmVhbSkpO1xuICAgICAgICB9O1xuICAgIHJldHVybiBiO1xufVxuXG4vKipcbiAqIHBsYXlzIHNldmVyYWwgYW5pbWF0aW9ucywgZmluaXNoZXMgd2hlbiB0aGV5IGFyZSBhbGwgZG9uZS5cbiAqIEBwYXJhbSBhbmltYXRpb25zXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICogdG9kbzogSSB0aGluayB0aGVyZSBhcmUgbG90cyBvZiBidWdzIHdoZW4gYW4gYW5pbWF0aW9uIHN0b3BzIHBhcnQgd2F5XG4gKiBJIHRoaW5rIGl0IGJlIGJldHRlciBpZiB0aGlzIHNwYXduZWQgaXRzIG93biBBbmltYXRvciB0byBoYW5kbGUgY3R4IHJlc3RvcmVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJhbGxlbChcbiAgICBhbmltYXRpb25zOiBSeC5PYnNlcnZhYmxlPEFuaW1hdGlvbj4gfCBBbmltYXRpb25bXVxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IFRpY2tTdHJlYW0pOiBUaWNrU3RyZWFtIHtcbiAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGluaXRpYWxpemluZ1wiKTtcblxuICAgICAgICB2YXIgYWN0aXZlQW5pbWF0aW9ucyA9IDA7XG4gICAgICAgIHZhciBhdHRhY2hQb2ludCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgZnVuY3Rpb24gZGVjcmVtZW50QWN0aXZlKCkge1xuICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGRlY3JlbWVudCBhY3RpdmVcIik7XG4gICAgICAgICAgICBhY3RpdmVBbmltYXRpb25zIC0tO1xuICAgICAgICB9XG5cbiAgICAgICAgYW5pbWF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGFuaW1hdGlvbjogQW5pbWF0aW9uKSB7XG4gICAgICAgICAgICBhY3RpdmVBbmltYXRpb25zKys7XG4gICAgICAgICAgICBhbmltYXRpb24uYXR0YWNoKGF0dGFjaFBvaW50LnRhcE9uTmV4dCh0aWNrID0+IHRpY2suY3R4LnNhdmUoKSkpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgdGljayA9PiB0aWNrLmN0eC5yZXN0b3JlKCksXG4gICAgICAgICAgICAgICAgZGVjcmVtZW50QWN0aXZlLFxuICAgICAgICAgICAgICAgIGRlY3JlbWVudEFjdGl2ZSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHByZXYudGFrZVdoaWxlKCgpID0+IGFjdGl2ZUFuaW1hdGlvbnMgPiAwKS50YXBPbk5leHQoZnVuY3Rpb24odGljazogVGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBlbWl0dGluZywgYW5pbWF0aW9uc1wiLCB0aWNrKTtcbiAgICAgICAgICAgICAgICBhdHRhY2hQb2ludC5vbk5leHQodGljayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGVtaXR0aW5nIGZpbmlzaGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgUGF0aEFuaW1hdGlvbiBleHRlbmRzIEFuaW1hdGlvbiB7XG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsb25lKFxuICAgIG46IG51bWJlciwgLy8gdG9kbyBtYWtlIGR5bmFtaWNcbiAgICBhbmltYXRpb246IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gcGFyYWxsZWwoUnguT2JzZXJ2YWJsZS5yZXR1cm4oYW5pbWF0aW9uKS5yZXBlYXQobikpO1xufVxuXG4vKipcbiAqIFRoZSBjaGlsZCBhbmltYXRpb24gaXMgc3RhcnRlZCBldmVyeSBmcmFtZVxuICogQHBhcmFtIGFuaW1hdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZW1pdChcbiAgICBhbmltYXRpb246IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IFRpY2tTdHJlYW0pOiBUaWNrU3RyZWFtIHtcbiAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwiZW1pdDogaW5pdGlhbGl6aW5nXCIpO1xuICAgICAgICB2YXIgYXR0YWNoUG9pbnQgPSBuZXcgUnguU3ViamVjdDxUaWNrPigpO1xuXG4gICAgICAgIHJldHVybiBwcmV2LnRhcE9uTmV4dChmdW5jdGlvbih0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0VNSVQpIGNvbnNvbGUubG9nKFwiZW1pdDogZW1taXR0aW5nXCIsIGFuaW1hdGlvbik7XG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uLmF0dGFjaChhdHRhY2hQb2ludCkuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgICAgYXR0YWNoUG9pbnQub25OZXh0KHRpY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0pO1xufVxuXG5cbi8qKlxuICogV2hlbiB0aGUgY2hpbGQgbG9vcCBmaW5pc2hlcywgaXQgaXMgc3Bhd25lZFxuICogQHBhcmFtIGFuaW1hdGlvblxuICogQHJldHVybnMge0FuaW1hdGlvbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvb3AoXG4gICAgYW5pbWF0aW9uOiBBbmltYXRpb25cbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2OiBUaWNrU3RyZWFtKTogVGlja1N0cmVhbSB7XG4gICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGluaXRpYWxpemluZ1wiKTtcblxuXG4gICAgICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmNyZWF0ZTxUaWNrPihmdW5jdGlvbihvYnNlcnZlcikge1xuICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogY3JlYXRlIG5ldyBsb29wXCIpO1xuICAgICAgICAgICAgdmFyIGxvb3BTdGFydCA9IG51bGw7XG4gICAgICAgICAgICB2YXIgbG9vcFN1YnNjcmlwdGlvbiA9IG51bGw7XG4gICAgICAgICAgICB2YXIgdCA9IDA7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGF0dGFjaExvb3AobmV4dCkgeyAvL3RvZG8gSSBmZWVsIGxpa2Ugd2UgY2FuIHJlbW92ZSBhIGxldmVsIGZyb20gdGhpcyBzb21laG93XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbmV3IGlubmVyIGxvb3Agc3RhcnRpbmcgYXRcIiwgdCk7XG5cbiAgICAgICAgICAgICAgICBsb29wU3RhcnQgPSBuZXcgUnguU3ViamVjdDxUaWNrPigpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN1YnNjcmlwdGlvbiA9IGFuaW1hdGlvbi5hdHRhY2gobG9vcFN0YXJ0KS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCBlcnIgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBwb3N0LWlubmVyIGNvbXBsZXRlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIGZpbmlzaGVkIGNvbnN0cnVjdGlvblwiKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcmV2LnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbm8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaExvb3AobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogdXBzdHJlYW0gdG8gaW5uZXIgbG9vcFwiKTtcbiAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0Lm9uTmV4dChuZXh0KTtcblxuICAgICAgICAgICAgICAgICAgICB0ICs9IG5leHQuZHQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSBlcnJvciB0byBkb3duc3RyZWFtXCIsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkLmJpbmQob2JzZXJ2ZXIpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy9kaXNwb3NlXG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogZGlzcG9zZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAobG9vcFN0YXJ0KSBsb29wU3RhcnQuZGlzcG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRyYXcoXG4gICAgZHJhd0ZhY3Rvcnk6ICgpID0+ICgodGljazogVGljaykgPT4gdm9pZClcbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uIChwcmV2aW91czogVGlja1N0cmVhbSk6IFRpY2tTdHJlYW0ge1xuICAgICAgICB2YXIgZHJhdzogKHRpY2s6IFRpY2spID0+IHZvaWQgPSBkcmF3RmFjdG9yeSgpO1xuICAgICAgICByZXR1cm4gcHJldmlvdXMudGFwT25OZXh0KGRyYXcpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNsYXRlKFxuICAgIGRlbHRhOiBQb2ludEFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidHJhbnNsYXRlOiBhdHRhY2hlZFwiKTtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgdmFyIHBvaW50X25leHQgPSBQYXJhbWV0ZXIuZnJvbShkZWx0YSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgcG9pbnQgPSBwb2ludF9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0cmFuc2xhdGU6XCIsIHBvaW50KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC50cmFuc2xhdGUocG9pbnRbMF0sIHBvaW50WzFdKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnbG9iYWxDb21wb3NpdGVPcGVyYXRpb24oXG4gICAgY29tcG9zaXRlX21vZGU6IHN0cmluZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHRpY2spIHtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBjb21wb3NpdGVfbW9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHZlbG9jaXR5KFxuICAgIHZlbG9jaXR5OiBQb2ludEFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidmVsb2NpdHk6IGF0dGFjaGVkXCIpO1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgcG9zOiBQb2ludCA9IFswLjAsMC4wXTtcbiAgICAgICAgICAgIHZhciB2ZWxvY2l0eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20odmVsb2NpdHkpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgdGljay5jdHgudHJhbnNmb3JtKDEsIDAsIDAsIDEsIHBvc1swXSwgcG9zWzFdKTtcbiAgICAgICAgICAgICAgICB2YXIgdmVsb2NpdHkgPSB2ZWxvY2l0eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHBvc1swXSArPSB2ZWxvY2l0eVswXSAqIHRpY2suZHQ7XG4gICAgICAgICAgICAgICAgcG9zWzFdICs9IHZlbG9jaXR5WzFdICogdGljay5kdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0d2Vlbl9saW5lYXIoXG4gICAgZnJvbTogUG9pbnRBcmcsXG4gICAgdG86ICAgUG9pbnRBcmcsXG4gICAgdGltZTogTnVtYmVyQXJnXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihcbiAgICAgICAgICAgIGZ1bmN0aW9uKHByZXY6IFRpY2tTdHJlYW0pOiBUaWNrU3RyZWFtIHtcbiAgICAgICAgICAgIHZhciB0ID0gMDtcbiAgICAgICAgICAgIHZhciBmcm9tX25leHQgPSBQYXJhbWV0ZXIuZnJvbShmcm9tKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgdG9fbmV4dCAgID0gUGFyYW1ldGVyLmZyb20odG8pLmluaXQoKTtcbiAgICAgICAgICAgIHZhciB0aW1lX25leHQgICA9IFBhcmFtZXRlci5mcm9tKHRpbWUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBwcmV2Lm1hcChmdW5jdGlvbih0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInR3ZWVuOiBpbm5lclwiKTtcbiAgICAgICAgICAgICAgICB2YXIgZnJvbSA9IGZyb21fbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgdG8gICA9IHRvX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWUgPSB0aW1lX25leHQodGljay5jbG9jayk7XG4gICAgXG4gICAgICAgICAgICAgICAgdCA9IHQgKyB0aWNrLmR0O1xuICAgICAgICAgICAgICAgIGlmICh0ID4gdGltZSkgdCA9IHRpbWU7XG4gICAgICAgICAgICAgICAgdmFyIHggPSBmcm9tWzBdICsgKHRvWzBdIC0gZnJvbVswXSkgKiB0IC8gdGltZTtcbiAgICAgICAgICAgICAgICB2YXIgeSA9IGZyb21bMV0gKyAodG9bMV0gLSBmcm9tWzFdKSAqIHQgLyB0aW1lO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCB4LCB5KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgICAgIH0pLnRha2VXaGlsZShmdW5jdGlvbih0aWNrKSB7cmV0dXJuIHQgPCB0aW1lO30pXG4gICAgICAgIH1cbiAgICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsbFN0eWxlKFxuICAgIGNvbG9yOiBDb2xvckFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGxTdHlsZTogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGNvbG9yX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjb2xvcikuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gY29sb3JfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFN0eWxlOiBmaWxsU3R5bGVcIiwgY29sb3IpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc3Ryb2tlU3R5bGUoXG4gICAgY29sb3I6IENvbG9yQXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlU3R5bGU6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBjb2xvcl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29sb3IpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBjb2xvciA9IGNvbG9yX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZVN0eWxlOiBzdHJva2VTdHlsZVwiLCBjb2xvcik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc3Ryb2tlU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaGFkb3dDb2xvcihcbiAgICBjb2xvcjogQ29sb3JBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzaGFkb3dDb2xvcjogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGNvbG9yX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjb2xvcikuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gY29sb3JfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2hhZG93Q29sb3I6IHNoYWRvd0NvbG9yXCIsIGNvbG9yKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zaGFkb3dDb2xvciA9IGNvbG9yO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBzaGFkb3dCbHVyKFxuICAgIGxldmVsOiBOdW1iZXJBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzaGFkb3dCbHVyOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgbGV2ZWxfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGxldmVsKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgbGV2ZWwgPSBsZXZlbF9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzaGFkb3dCbHVyOiBzaGFkb3dCbHVyXCIsIGxldmVsKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zaGFkb3dCbHVyID0gbGV2ZWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzaGFkb3dPZmZzZXQoXG4gICAgeHk6IFBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2hhZG93T2Zmc2V0OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHkgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzaGFkb3dPZmZzZXQ6IHNoYWRvd0JsdXJcIiwgeHkpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnNoYWRvd09mZnNldFggPSB4eVswXTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zaGFkb3dPZmZzZXRZID0geHlbMV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGluZUNhcChcbiAgICBzdHlsZTogU3RyaW5nQXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZUNhcDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZ19uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcgPSBhcmdfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZUNhcDogbGluZUNhcFwiLCBhcmcpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmxpbmVDYXAgPSBhcmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGxpbmVKb2luKFxuICAgIHN0eWxlOiBTdHJpbmdBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJsaW5lSm9pbjogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZ19uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcgPSBhcmdfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZUpvaW46IGxpbmVDYXBcIiwgYXJnKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5saW5lSm9pbiA9IGFyZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5lV2lkdGgoXG4gICAgd2lkdGg6IE51bWJlckFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVXaWR0aDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHdpZHRoX25leHQgPSBQYXJhbWV0ZXIuZnJvbSh3aWR0aCkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoID0gd2lkdGhfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZVdpZHRoOiBsaW5lV2lkdGhcIiwgd2lkdGgpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmxpbmVXaWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1pdGVyTGltaXQoXG4gICAgbGltaXQ6IE51bWJlckFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcIm1pdGVyTGltaXQ6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmdfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGxpbWl0KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnID0gYXJnX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcIm1pdGVyTGltaXQ6IG1pdGVyTGltaXRcIiwgYXJnKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5taXRlckxpbWl0ID0gYXJnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gcmVjdChcbiAgICB4eTogUG9pbnRBcmcsXG4gICAgd2lkdGhfaGVpZ2h0OiBQb2ludEFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInJlY3Q6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB4eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHdpZHRoX2hlaWdodCkuaW5pdCgpO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHk6IFBvaW50ID0geHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgd2lkdGhfaGVpZ2h0OiBQb2ludCA9IHdpZHRoX2hlaWdodF9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJyZWN0OiByZWN0XCIsIHh5LCB3aWR0aF9oZWlnaHQpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnJlY3QoeHlbMF0sIHh5WzFdLCB3aWR0aF9oZWlnaHRbMF0sIHdpZHRoX2hlaWdodFsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsbFJlY3QoXG4gICAgeHk6IFBvaW50QXJnLFxuICAgIHdpZHRoX2hlaWdodDogUG9pbnRBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmaWxsUmVjdDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodF9uZXh0ID0gUGFyYW1ldGVyLmZyb20od2lkdGhfaGVpZ2h0KS5pbml0KCk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eTogUG9pbnQgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHQ6IFBvaW50ID0gd2lkdGhfaGVpZ2h0X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGxSZWN0OiBmaWxsUmVjdFwiLCB4eSwgd2lkdGhfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5maWxsUmVjdCh4eVswXSwgeHlbMV0sIHdpZHRoX2hlaWdodFswXSwgd2lkdGhfaGVpZ2h0WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJva2VSZWN0KFxuICAgIHh5OiBQb2ludEFyZyxcbiAgICB3aWR0aF9oZWlnaHQ6IFBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlUmVjdDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodF9uZXh0ID0gUGFyYW1ldGVyLmZyb20od2lkdGhfaGVpZ2h0KS5pbml0KCk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eTogUG9pbnQgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHQ6IFBvaW50ID0gd2lkdGhfaGVpZ2h0X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZVJlY3Q6IHN0cm9rZVJlY3RcIiwgeHksIHdpZHRoX2hlaWdodCk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc3Ryb2tlUmVjdCh4eVswXSwgeHlbMV0sIHdpZHRoX2hlaWdodFswXSwgd2lkdGhfaGVpZ2h0WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5leHBvcnQgZnVuY3Rpb24gY2xlYXJSZWN0KFxuICAgIHh5OiBQb2ludEFyZyxcbiAgICB3aWR0aF9oZWlnaHQ6IFBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiY2xlYXJSZWN0OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgd2lkdGhfaGVpZ2h0X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh3aWR0aF9oZWlnaHQpLmluaXQoKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5OiBQb2ludCA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodDogUG9pbnQgPSB3aWR0aF9oZWlnaHRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiY2xlYXJSZWN0OiBjbGVhclJlY3RcIiwgeHksIHdpZHRoX2hlaWdodCk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguY2xlYXJSZWN0KHh5WzBdLCB4eVsxXSwgd2lkdGhfaGVpZ2h0WzBdLCB3aWR0aF9oZWlnaHRbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gd2l0aGluUGF0aChcbiAgICBpbm5lcjogQW5pbWF0aW9uXG4pOiBQYXRoQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gbmV3IFBhdGhBbmltYXRpb24oXG4gICAgICAgICh1cHN0cmVhbTogVGlja1N0cmVhbSkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcIndpdGhpblBhdGg6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBiZWdpblBhdGhCZWZvcmVJbm5lciA9IHVwc3RyZWFtLnRhcE9uTmV4dChcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAodGljazogVGljaykge3RpY2suY3R4LmJlZ2luUGF0aCgpO31cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gaW5uZXIuYXR0YWNoKGJlZ2luUGF0aEJlZm9yZUlubmVyKS50YXBPbk5leHQoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHRpY2s6IFRpY2spIHt0aWNrLmN0eC5jbG9zZVBhdGgoKTt9XG4gICAgICAgICAgICApXG4gICAgICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Ryb2tlKCk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzdHJva2U6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzdHJva2U6IHN0cm9rZVwiKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zdHJva2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWxsKCk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmaWxsOiBhdHRhY2hcIik7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbDogc3Ryb2tlXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3ZlVG8oXG4gICAgeHk6IFBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibW92ZVRvOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHkgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJtb3ZlVG86IG1vdmVUb1wiLCB4eSk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgubW92ZVRvKHh5WzBdLCB4eVsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGluZVRvKFxuICAgIHh5OiBQb2ludEFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVUbzogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5ID0geHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZVRvOiBsaW5lVG9cIiwgeHkpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmxpbmVUbyh4eVswXSwgeHlbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gY2xpcCgpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiY2xpcDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImNsaXA6IGNsaXBcIik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguY2xpcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHF1YWRyYXRpY0N1cnZlVG8oY29udHJvbDogUG9pbnRBcmcsIGVuZDogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwicXVhZHJhdGljQ3VydmVUbzogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGNvbnRyb2wpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmcyX25leHQgPSBQYXJhbWV0ZXIuZnJvbShlbmQpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmcyID0gYXJnMl9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJxdWFkcmF0aWNDdXJ2ZVRvOiBxdWFkcmF0aWNDdXJ2ZVRvXCIsIGFyZzEsIGFyZzIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnF1YWRyYXRpY0N1cnZlVG8oYXJnMVswXSwgYXJnMVsxXSwgYXJnMlswXSwgYXJnMlsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuLyoqXG4gKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBiZXppZXJDdXJ2ZVRvIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYmV6aWVyQ3VydmVUbyhjb250cm9sMTogUG9pbnRBcmcsIGNvbnRyb2wyOiBQb2ludEFyZywgZW5kOiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJiZXppZXJDdXJ2ZVRvOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29udHJvbDEpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmcyX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjb250cm9sMikuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzNfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGVuZCkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzMgPSBhcmczX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImJlemllckN1cnZlVG86IGJlemllckN1cnZlVG9cIiwgYXJnMSwgYXJnMiwgYXJnMyk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguYmV6aWVyQ3VydmVUbyhhcmcxWzBdLCBhcmcxWzFdLCBhcmcyWzBdLCBhcmcyWzFdLCBhcmczWzBdLCBhcmczWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGFyYyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFyYyhjZW50ZXI6IFBvaW50QXJnLCByYWRpdXM6IE51bWJlckFyZyxcbiAgICByYWRTdGFydEFuZ2xlOiBOdW1iZXJBcmcsIHJhZEVuZEFuZ2xlOiBOdW1iZXJBcmcsXG4gICAgY291bnRlcmNsb2Nrd2lzZT86IGJvb2xlYW4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYXJjOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY2VudGVyKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnMl9uZXh0ID0gUGFyYW1ldGVyLmZyb20ocmFkaXVzKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnM19uZXh0ID0gUGFyYW1ldGVyLmZyb20ocmFkU3RhcnRBbmdsZSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHJhZEVuZEFuZ2xlKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMiA9IGFyZzJfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMyA9IGFyZzNfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNCA9IGFyZzRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYXJjOiBhcmNcIiwgYXJnMSwgYXJnMiwgYXJnMywgYXJnNCk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguYXJjKGFyZzFbMF0sIGFyZzFbMV0sIGFyZzIsIGFyZzMsIGFyZzQsIGNvdW50ZXJjbG9ja3dpc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuLyoqXG4gKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBhcmMgaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcmNUbyh0YW5nZW50MTogUG9pbnRBcmcsIHRhbmdlbnQyOiBQb2ludEFyZywgcmFkaXVzOiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYXJjOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20odGFuZ2VudDEpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmcyX25leHQgPSBQYXJhbWV0ZXIuZnJvbSh0YW5nZW50MikuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzNfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHJhZGl1cykuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzMgPSBhcmczX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFyYzogYXJjXCIsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmFyY1RvKGFyZzFbMF0sIGFyZzFbMV0sIGFyZzJbMF0sIGFyZzJbMV0sIGFyZzMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc2NhbGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzY2FsZSh4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2NhbGU6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInNjYWxlOiBzY2FsZVwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zY2FsZShhcmcxWzBdLCBhcmcxWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHJvdGF0ZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJvdGF0ZShyYWRzOiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwicm90YXRlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20ocmFkcykuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInJvdGF0ZTogcm90YXRlXCIsIGFyZzEpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnNjYWxlKGFyZzFbMF0sIGFyZzFbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdHJhbnNsYXRlIGluIHRoZSBjYW52YXMgQVBJLlxuICogWyBhIGMgZVxuICogICBiIGQgZlxuICogICAwIDAgMSBdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2Zvcm0oYTogTnVtYmVyQXJnLCBiOiBOdW1iZXJBcmcsIGM6IE51bWJlckFyZyxcbiAgICAgICAgICBkOiBOdW1iZXJBcmcsIGU6IE51bWJlckFyZywgZjogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zZm9ybTogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGEpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmcyX25leHQgPSBQYXJhbWV0ZXIuZnJvbShiKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnM19uZXh0ID0gUGFyYW1ldGVyLmZyb20oYykuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGQpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmc1X25leHQgPSBQYXJhbWV0ZXIuZnJvbShlKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnNl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZikuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzMgPSBhcmczX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzQgPSBhcmc0X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzUgPSBhcmc1X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzYgPSBhcmc2X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zZm9ybTogdHJhbnNmb3JtXCIsIGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybShhcmcxLCBhcmcyLCBhcmczLCBhcmc0LCBhcmc1LCBhcmc2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNldFRyYW5zZm9ybSBpbiB0aGUgY2FudmFzIEFQSS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFRyYW5zZm9ybShhOiBOdW1iZXJBcmcsIGI6IE51bWJlckFyZywgYzogTnVtYmVyQXJnLFxuICAgICAgICAgICAgIGQ6IE51bWJlckFyZywgZTogTnVtYmVyQXJnLCBmOiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2V0VHJhbnNmb3JtOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oYSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGIpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmczX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnNF9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZCkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzVfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGUpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmc2X25leHQgPSBQYXJhbWV0ZXIuZnJvbShmKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMiA9IGFyZzJfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMyA9IGFyZzNfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNCA9IGFyZzRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNSA9IGFyZzVfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNiA9IGFyZzZfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2V0VHJhbnNmb3JtOiBzZXRUcmFuc2Zvcm1cIiwgYXJnMSwgYXJnMiwgYXJnMywgYXJnNCwgYXJnNSwgYXJnNik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc2V0VHJhbnNmb3JtKGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgZm9udCBpbiB0aGUgY2FudmFzIEFQSS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvbnQoc3R5bGU6IFN0cmluZ0FyZyk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmb250OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmb250OiBmb250XCIsIGFyZzEpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZvbnQgPSBhcmcxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEFsaWduIGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dEFsaWduKHN0eWxlOiBTdHJpbmdBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidGV4dEFsaWduOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0ZXh0QWxpZ246IHRleHRBbGlnblwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC50ZXh0QWxpZ24gPSBhcmcxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEJhc2VsaW5lIGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dEJhc2VsaW5lKHN0eWxlOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidGV4dEJhc2VsaW5lOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0ZXh0QmFzZWxpbmU6IHRleHRCYXNlbGluZVwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC50ZXh0QmFzZWxpbmUgPSBhcmcxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEJhc2VsaW5lIGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmlsbFRleHQodGV4dDogU3RyaW5nQXJnLCB4eTogUG9pbnRBcmcsIG1heFdpZHRoPzogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGxUZXh0OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20odGV4dCkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnM19uZXh0ID0gbWF4V2lkdGggPyBQYXJhbWV0ZXIuZnJvbShtYXhXaWR0aCkuaW5pdCgpOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMiA9IGFyZzJfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMyA9IG1heFdpZHRoPyBhcmczX25leHQodGljay5jbG9jayk6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFRleHQ6IGZpbGxUZXh0XCIsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICAgICAgICAgICAgICAgIGlmIChtYXhXaWR0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aWNrLmN0eC5maWxsVGV4dChhcmcxLCBhcmcyWzBdLCBhcmcyWzBdLCBhcmczKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aWNrLmN0eC5maWxsVGV4dChhcmcxLCBhcmcyWzBdLCBhcmcyWzBdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuLyoqXG4gKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciB0ZXh0QmFzZWxpbmUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcmF3SW1hZ2UoaW1nLCB4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZHJhd0ltYWdlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJkcmF3SW1hZ2U6IGRyYXdJbWFnZVwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5kcmF3SW1hZ2UoaW1nLCBhcmcxWzBdLCBhcmcxWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cblxuLy8gZm9yZWdyb3VuZCBjb2xvciB1c2VkIHRvIGRlZmluZSBlbW1pdHRlciByZWdpb25zIGFyb3VuZCB0aGUgY2FudmFzXG4vLyAgdGhlIGh1ZSwgaXMgcmV1c2VkIGluIHRoZSBwYXJ0aWNsZXNcbi8vICB0aGUgbGlnaHRuZXNzIGlzIHVzZSB0byBkZXNjcmliZSB0aGUgcXVhbnRpdHkgKG1heCBsaWdodG5lc3MgbGVhZHMgdG8gdG90YWwgc2F0dXJhdGlvbilcbi8vXG4vLyB0aGUgYWRkaXRpb25hbCBwYXJhbWV0ZXIgaW50ZXNpdHkgaXMgdXNlZCB0byBzY2FsZSB0aGUgZW1taXRlcnNcbi8vIGdlbmVyYWxseSB0aGUgY29sb3JzIHlvdSBwbGFjZSBvbiB0aGUgbWFwIHdpbGwgYmUgZXhjZWVkZWQgYnkgdGhlIHNhdHVyYXRpb25cbi8vXG4vLyBIb3cgYXJlIHR3byBkaWZmZXJlbnQgaHVlcyBzZW5zaWJseSBtaXhlZFxuXG4vLyBkZWNheSBvZiAwLjVcbi8vXG4vLyAgICAgICBIXG4vLyAxIDIgNCA5IDQgMiAxICAgICAgIC8vc2F0LCBhbHNvIGFscGhhXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vICAgICAgICAgMSAyIDQgMiAxICAgLy9zYXRcbi8vICAgICAgICAgICAgIEgyXG4vL1xuLy8gd2UgYWRkIHRoZSBjb250cmlidXRpb24gdG8gYW4gaW1hZ2Ugc2l6ZWQgYWNjdW11bGF0b3Jcbi8vIGFzIHRoZSBjb250cmlidXRpb25zIG5lZWQgdG8gc3VtIHBlcm11dGF0aW9uIGluZGVwZW5kZW50bHkgKGFsc28gcHJvYmFibHkgYXNzb2NpYXRpdmUpXG4vLyBibGVuZChyZ2JhMSwgcmdiYTIpID0gYmxlbmQocmdiYTIscmdiYTEpXG4vLyBhbHBoYSA9IGExICsgYTIgLSBhMWEyXG4vLyBpZiBhMSA9IDEgICBhbmQgYTIgPSAxLCAgIGFscGhhID0gMSAgICAgICAgID0gMVxuLy8gaWYgYTEgPSAwLjUgYW5kIGEyID0gMSwgICBhbHBoYSA9IDEuNSAtIDAuNSA9IDFcbi8vIGlmIGExID0gMC41IGFuZCBhMiA9IDAuNSwgYWxwaGEgPSAxIC0gMC4yNSAgPSAwLjc1XG5cbi8vIE5vcm1hbCBibGVuZGluZyBkb2Vzbid0IGNvbW11dGU6XG4vLyByZWQgPSAocjEgKiBhMSAgKyAocjIgKiBhMikgKiAoMSAtIGExKSkgLyBhbHBoYVxuXG4vLyBsaWdodGVuIGRvZXMsIHdoaWNoIGlzIGp1c3QgdGhlIG1heFxuLy8gcmVkID0gbWF4KHIxLCByMilcbi8vIG9yIGFkZGl0aW9uIHJlZCA9IHIxICsgcjJcbi8vIGh0dHA6Ly93d3cuZGVlcHNreWNvbG9ycy5jb20vYXJjaGl2ZS8yMDEwLzA0LzIxL2Zvcm11bGFzLWZvci1QaG90b3Nob3AtYmxlbmRpbmctbW9kZXMuaHRtbFxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnbG93KFxuICAgIGRlY2F5OiBOdW1iZXJBcmcgPSAwLjFcbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgZGVjYXlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGRlY2F5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGljay5jdHg7XG5cbiAgICAgICAgICAgICAgICAvLyBvdXIgc3JjIHBpeGVsIGRhdGFcbiAgICAgICAgICAgICAgICB2YXIgd2lkdGggPSBjdHguY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgICAgIHZhciBoZWlnaHQgPSBjdHguY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgICAgICB2YXIgcGl4ZWxzID0gd2lkdGggKiBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgdmFyIGltZ0RhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsMCx3aWR0aCxoZWlnaHQpO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gaW1nRGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgIHZhciBkZWNheSA9IGRlY2F5X25leHQodGljay5jbG9jayk7XG5cbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIm9yaWdpbmFsIGRhdGFcIiwgaW1nRGF0YS5kYXRhKVxuXG4gICAgICAgICAgICAgICAgLy8gb3VyIHRhcmdldCBkYXRhXG4gICAgICAgICAgICAgICAgLy8gdG9kbyBpZiB3ZSB1c2VkIGEgVHlwZWQgYXJyYXkgdGhyb3VnaG91dCB3ZSBjb3VsZCBzYXZlIHNvbWUgemVyb2luZyBhbmQgb3RoZXIgY3JhcHB5IGNvbnZlcnNpb25zXG4gICAgICAgICAgICAgICAgLy8gYWx0aG91Z2ggYXQgbGVhc3Qgd2UgYXJlIGNhbGN1bGF0aW5nIGF0IGEgaGlnaCBhY2N1cmFjeSwgbGV0cyBub3QgZG8gYSBieXRlIGFycmF5IGZyb20gdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICAgIHZhciBnbG93RGF0YTogbnVtYmVyW10gPSBuZXcgQXJyYXk8bnVtYmVyPihwaXhlbHMqNCk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBpeGVscyAqIDQ7IGkrKykgZ2xvd0RhdGFbaV0gPSAwO1xuXG4gICAgICAgICAgICAgICAgLy8gcGFzc2JhY2sgdG8gYXZvaWQgbG90cyBvZiBhcnJheSBhbGxvY2F0aW9ucyBpbiByZ2JUb0hzbCwgYW5kIGhzbFRvUmdiIGNhbGxzXG4gICAgICAgICAgICAgICAgdmFyIGhzbDogW251bWJlciwgbnVtYmVyLCBudW1iZXJdID0gWzAsMCwwXTtcbiAgICAgICAgICAgICAgICB2YXIgcmdiOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0gPSBbMCwwLDBdO1xuXG4gICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHRoZSBjb250cmlidXRpb24gb2YgZWFjaCBlbW1pdHRlciBvbiB0aGVpciBzdXJyb3VuZHNcbiAgICAgICAgICAgICAgICBmb3IodmFyIHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciB4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWQgICA9IGRhdGFbKCh3aWR0aCAqIHkpICsgeCkgKiA0XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBncmVlbiA9IGRhdGFbKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmx1ZSAgPSBkYXRhWygod2lkdGggKiB5KSArIHgpICogNCArIDJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFscGhhID0gZGF0YVsoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAzXTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IHRvIGhzbFxuICAgICAgICAgICAgICAgICAgICAgICAgcmdiVG9Ic2wocmVkLCBncmVlbiwgYmx1ZSwgaHNsKTtcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBodWUgPSBoc2xbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcXR5ID0gaHNsWzFdOyAvLyBxdHkgZGVjYXlzXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbG9jYWxfZGVjYXkgPSBoc2xbMl0gKyAxO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBvbmx5IG5lZWQgdG8gY2FsY3VsYXRlIGEgY29udHJpYnV0aW9uIG5lYXIgdGhlIHNvdXJjZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29udHJpYnV0aW9uID0gcXR5IGRlY2F5aW5nIGJ5IGludmVyc2Ugc3F1YXJlIGRpc3RhbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjID0gcSAvIChkXjIgKiBrKSwgd2Ugd2FudCB0byBmaW5kIHRoZSBjIDwgMC4wMSBwb2ludFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gMC4wMSA9IHEgLyAoZF4yICogaykgPT4gZF4yID0gcSAvICgwLjAxICogaylcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGQgPSBzcXJ0KDEwMCAqIHEgLyBrKSAobm90ZSAyIHNvbHV0aW9ucywgcmVwcmVzZW50aW5nIHRoZSB0d28gaGFsZndpZHRocylcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYWxmd2lkdGggPSBNYXRoLnNxcnQoMTAwMCAqIHF0eSAvIChkZWNheSAqIGxvY2FsX2RlY2F5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYWxmd2lkdGggKj0gMTAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxpID0gTWF0aC5tYXgoMCwgTWF0aC5mbG9vcih4IC0gaGFsZndpZHRoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdWkgPSBNYXRoLm1pbih3aWR0aCwgTWF0aC5jZWlsKHggKyBoYWxmd2lkdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsaiA9IE1hdGgubWF4KDAsIE1hdGguZmxvb3IoeSAtIGhhbGZ3aWR0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVqID0gTWF0aC5taW4oaGVpZ2h0LCBNYXRoLmNlaWwoeSArIGhhbGZ3aWR0aCkpO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaiA9IGxqOyBqIDwgdWo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IGxpOyBpIDwgdWk7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZHggPSBpIC0geDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGR5ID0gaiAtIHk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkX3NxdWFyZWQgPSBkeCAqIGR4ICsgZHkgKiBkeTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjIGlzIGluIHRoZSBzYW1lIHNjYWxlIGF0IHF0eSBpLmUuICgwIC0gMTAwLCBzYXR1cmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYyA9IChxdHkpIC8gKDEuMDAwMSArIE1hdGguc3FydChkX3NxdWFyZWQpICogZGVjYXkgKiBsb2NhbF9kZWNheSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGMgPD0gMTAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGMgPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJnYiA9IGhzbFRvUmdiKGh1ZSwgNTAsIGMsIHJnYik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJnYiA9IGh1c2wudG9SR0IoaHVlLCA1MCwgYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vZm9yICh2YXIgaHVzbGkgPSAwOyBodXNsaTwgMzsgaHVzbGkrKykgcmdiIFtodXNsaV0gKj0gMjU1O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY19hbHBoYSA9IGMgLyAxMDAuMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcl9pID0gKCh3aWR0aCAqIGopICsgaSkgKiA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ19pID0gKCh3aWR0aCAqIGopICsgaSkgKiA0ICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJfaSA9ICgod2lkdGggKiBqKSArIGkpICogNCArIDI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhX2kgPSAoKHdpZHRoICogaikgKyBpKSAqIDQgKyAzO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicmdiXCIsIHJnYik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiY1wiLCBjKTtcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByZV9hbHBoYSA9IGdsb3dEYXRhW2FfaV07XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoY19hbHBoYSA8PSAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGNfYWxwaGEgPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChwcmVfYWxwaGEgPD0gMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChwcmVfYWxwaGEgPj0gMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYmxlbmQgYWxwaGEgZmlyc3QgaW50byBhY2N1bXVsYXRvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnbG93RGF0YVthX2ldID0gZ2xvd0RhdGFbYV9pXSArIGNfYWxwaGEgLSBjX2FscGhhICogZ2xvd0RhdGFbYV9pXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ2xvd0RhdGFbYV9pXSA9IE1hdGgubWF4KGdsb3dEYXRhW2FfaV0sIGNfYWxwaGEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2FfaV0gPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVthX2ldIDw9IDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbYV9pXSA+PSAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW3JfaV0gPD0gMjU1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW3JfaV0gPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVtnX2ldIDw9IDI1NSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVtnX2ldID49IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbYl9pXSA8PSAyNTUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbYl9pXSA+PSAwKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gKHByZV9hbHBoYSArIHJnYlswXS8gMjU1LjAgLSBjX2FscGhhICogcmdiWzBdLyAyNTUuMCkgKiAyNTU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2dfaV0gPSAocHJlX2FscGhhICsgcmdiWzFdLyAyNTUuMCAtIGNfYWxwaGEgKiByZ2JbMV0vIDI1NS4wKSAqIDI1NTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbYl9pXSA9IChwcmVfYWxwaGEgKyByZ2JbMl0vIDI1NS4wIC0gY19hbHBoYSAqIHJnYlsyXS8gMjU1LjApICogMjU1O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicG9zdC1hbHBoYVwiLCBnbG93RGF0YVthX2ldKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBub3cgc2ltcGxlIGxpZ2h0ZW5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gTWF0aC5tYXgocmdiWzBdLCBnbG93RGF0YVtyX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IE1hdGgubWF4KHJnYlsxXSwgZ2xvd0RhdGFbZ19pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2JfaV0gPSBNYXRoLm1heChyZ2JbMl0sIGdsb3dEYXRhW2JfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1peCB0aGUgY29sb3JzIGxpa2UgcGlnbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdG90YWxfYWxwaGEgPSBjX2FscGhhICsgcHJlX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gKGNfYWxwaGEgKiByZ2JbMF0gKyBwcmVfYWxwaGEgKiBnbG93RGF0YVtyX2ldKSAvIHRvdGFsX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtnX2ldID0gKGNfYWxwaGEgKiByZ2JbMV0gKyBwcmVfYWxwaGEgKiBnbG93RGF0YVtnX2ldKSAvIHRvdGFsX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtiX2ldID0gKGNfYWxwaGEgKiByZ2JbMl0gKyBwcmVfYWxwaGEgKiBnbG93RGF0YVtiX2ldKSAvIHRvdGFsX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBSRUFMTFkgQ09PTCBFRkZFQ1RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbcl9pXSA9IHJnYlswXSArIGdsb3dEYXRhW3JfaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2dfaV0gPSByZ2JbMV0gKyBnbG93RGF0YVtnX2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtiX2ldID0gcmdiWzJdICsgZ2xvd0RhdGFbYl9pXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gTWF0aC5taW4ocmdiWzBdICsgZ2xvd0RhdGFbcl9pXSwgMjU1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IE1hdGgubWluKHJnYlsxXSArIGdsb3dEYXRhW2dfaV0sIDI1NSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2JfaV0gPSBNYXRoLm1pbihyZ2JbMl0gKyBnbG93RGF0YVtiX2ldLCAyNTUpO1xuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoeCA8IDIgJiYgaiA9PSAyMCAmJiBpID09IDIwICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdsb3dEYXRhW3JfaV0gPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicHJlLWFscGhhXCIsIGdsb3dEYXRhW2FfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkeFwiLCBkeCwgXCJkeVwiLCBkeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRfc3F1YXJlZFwiLCBkX3NxdWFyZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZWNheVwiLCBkZWNheSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImxvY2FsX2RlY2F5XCIsIGxvY2FsX2RlY2F5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY1wiLCBjKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY19hbHBoYVwiLCBjX2FscGhhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYV9pXCIsIGFfaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImh1ZVwiLCBodWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJxdHlcIiwgcXR5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVkXCIsIHJlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImdyZWVuXCIsIGdyZWVuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYmx1ZVwiLCBibHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmdiXCIsIHJnYik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImdsb3dEYXRhW3JfaV1cIiwgZ2xvd0RhdGFbcl9pXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImdsb3dcIiwgZ2xvd0RhdGEpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcihkYXRhLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgZm9yKHZhciB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcl9pID0gKCh3aWR0aCAqIHkpICsgeCkgKiA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdfaSA9ICgod2lkdGggKiB5KSArIHgpICogNCArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYl9pID0gKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgMjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhX2kgPSAoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAzO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbcl9pXSA9IE1hdGguZmxvb3IoZ2xvd0RhdGFbcl9pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbZ19pXSA9IE1hdGguZmxvb3IoZ2xvd0RhdGFbZ19pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbYl9pXSA9IE1hdGguZmxvb3IoZ2xvd0RhdGFbYl9pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbYV9pXSA9IDI1NTsgLy9NYXRoLmZsb29yKGdsb3dEYXRhW2FfaV0gKiAyNTUpO1xuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyAodG9kbykgbWF5YmUgd2UgY2FuIHNwZWVkIGJvb3N0IHNvbWUgb2YgdGhpc1xuICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vaGFja3MubW96aWxsYS5vcmcvMjAxMS8xMi9mYXN0ZXItY2FudmFzLXBpeGVsLW1hbmlwdWxhdGlvbi13aXRoLXR5cGVkLWFycmF5cy9cblxuICAgICAgICAgICAgICAgIC8vZmluYWxseSBvdmVyd3JpdGUgdGhlIHBpeGVsIGRhdGEgd2l0aCB0aGUgYWNjdW11bGF0b3JcbiAgICAgICAgICAgICAgICAoPGFueT5pbWdEYXRhLmRhdGEpLnNldChuZXcgVWludDhDbGFtcGVkQXJyYXkoYnVmKSk7XG5cbiAgICAgICAgICAgICAgICBjdHgucHV0SW1hZ2VEYXRhKGltZ0RhdGEsIDAsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRha2UoXG4gICAgZnJhbWVzOiBudW1iZXJcbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IFRpY2tTdHJlYW0pOiBUaWNrU3RyZWFtIHtcbiAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRha2U6IGF0dGFjaFwiKTtcbiAgICAgICAgcmV0dXJuIHByZXYudGFrZShmcmFtZXMpO1xuICAgIH0pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlciwgcGF0aDogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgR0lGRW5jb2RlciA9IHJlcXVpcmUoJ2dpZmVuY29kZXInKTtcbiAgICB2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuXG5cbiAgICB2YXIgZW5jb2RlciA9IG5ldyBHSUZFbmNvZGVyKHdpZHRoLCBoZWlnaHQpO1xuICAgIGVuY29kZXIuY3JlYXRlUmVhZFN0cmVhbSgpXG4gICAgICAucGlwZShlbmNvZGVyLmNyZWF0ZVdyaXRlU3RyZWFtKHsgcmVwZWF0OiAxMDAwMCwgZGVsYXk6IDEwMCwgcXVhbGl0eTogMSB9KSlcbiAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHBhdGgpKTtcbiAgICBlbmNvZGVyLnN0YXJ0KCk7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocGFyZW50OiBUaWNrU3RyZWFtKTogVGlja1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQudGFwKFxuICAgICAgICAgICAgZnVuY3Rpb24odGljazogVGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzYXZlOiB3cm90ZSBmcmFtZVwiKTtcbiAgICAgICAgICAgICAgICBlbmNvZGVyLmFkZEZyYW1lKHRpY2suY3R4KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmVycm9yKFwic2F2ZTogbm90IHNhdmVkXCIsIHBhdGgpO30sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmxvZyhcInNhdmU6IHNhdmVkXCIsIHBhdGgpOyBlbmNvZGVyLmZpbmlzaCgpO31cbiAgICAgICAgKVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogQ29udmVydHMgYW4gUkdCIGNvbG9yIHZhbHVlIHRvIEhTTC4gQ29udmVyc2lvbiBmb3JtdWxhXG4gKiBhZGFwdGVkIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IU0xfY29sb3Jfc3BhY2UuXG4gKiBBc3N1bWVzIHIsIGcsIGFuZCBiIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMjU1XSBhbmRcbiAqIHJldHVybnMgaCwgcywgYW5kIGwgaW4gdGhlIHNldCBbMCwgMV0uXG4gKlxuICogQHBhcmFtICAgTnVtYmVyICByICAgICAgIFRoZSByZWQgY29sb3IgdmFsdWVcbiAqIEBwYXJhbSAgIE51bWJlciAgZyAgICAgICBUaGUgZ3JlZW4gY29sb3IgdmFsdWVcbiAqIEBwYXJhbSAgIE51bWJlciAgYiAgICAgICBUaGUgYmx1ZSBjb2xvciB2YWx1ZVxuICogQHJldHVybiAgQXJyYXkgICAgICAgICAgIFRoZSBIU0wgcmVwcmVzZW50YXRpb25cbiAqL1xuZnVuY3Rpb24gcmdiVG9Ic2wociwgZywgYiwgcGFzc2JhY2s6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSk6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJyZ2JUb0hzbDogaW5wdXRcIiwgciwgZywgYik7XG5cbiAgICByIC89IDI1NSwgZyAvPSAyNTUsIGIgLz0gMjU1O1xuICAgIHZhciBtYXggPSBNYXRoLm1heChyLCBnLCBiKSwgbWluID0gTWF0aC5taW4ociwgZywgYik7XG4gICAgdmFyIGgsIHMsIGwgPSAobWF4ICsgbWluKSAvIDI7XG5cbiAgICBpZihtYXggPT0gbWluKXtcbiAgICAgICAgaCA9IHMgPSAwOyAvLyBhY2hyb21hdGljXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGQgPSBtYXggLSBtaW47XG4gICAgICAgIHMgPSBsID4gMC41ID8gZCAvICgyIC0gbWF4IC0gbWluKSA6IGQgLyAobWF4ICsgbWluKTtcbiAgICAgICAgc3dpdGNoKG1heCl7XG4gICAgICAgICAgICBjYXNlIHI6IGggPSAoZyAtIGIpIC8gZCArIChnIDwgYiA/IDYgOiAwKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGc6IGggPSAoYiAtIHIpIC8gZCArIDI7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBiOiBoID0gKHIgLSBnKSAvIGQgKyA0OyBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBoIC89IDY7XG4gICAgfVxuICAgIHBhc3NiYWNrWzBdID0gKGggKiAzNjApOyAgICAgICAvLyAwIC0gMzYwIGRlZ3JlZXNcbiAgICBwYXNzYmFja1sxXSA9IChzICogMTAwKTsgLy8gMCAtIDEwMCVcbiAgICBwYXNzYmFja1syXSA9IChsICogMTAwKTsgLy8gMCAtIDEwMCVcblxuICAgIC8vIGNvbnNvbGUubG9nKFwicmdiVG9Ic2w6IG91dHB1dFwiLCBwYXNzYmFjayk7XG5cbiAgICByZXR1cm4gcGFzc2JhY2s7XG59XG5cbi8qKlxuICogQ29udmVydHMgYW4gSFNMIGNvbG9yIHZhbHVlIHRvIFJHQi4gQ29udmVyc2lvbiBmb3JtdWxhXG4gKiBhZGFwdGVkIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IU0xfY29sb3Jfc3BhY2UuXG4gKiBBc3N1bWVzIGgsIHMsIGFuZCBsIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMV0gYW5kXG4gKiByZXR1cm5zIHIsIGcsIGFuZCBiIGluIHRoZSBzZXQgWzAsIDI1NV0uXG4gKlxuICogQHBhcmFtICAgTnVtYmVyICBoICAgICAgIFRoZSBodWVcbiAqIEBwYXJhbSAgIE51bWJlciAgcyAgICAgICBUaGUgc2F0dXJhdGlvblxuICogQHBhcmFtICAgTnVtYmVyICBsICAgICAgIFRoZSBsaWdodG5lc3NcbiAqIEByZXR1cm4gIEFycmF5ICAgICAgICAgICBUaGUgUkdCIHJlcHJlc2VudGF0aW9uXG4gKi9cbmZ1bmN0aW9uIGhzbFRvUmdiKGgsIHMsIGwsIHBhc3NiYWNrOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0pOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl17XG4gICAgdmFyIHIsIGcsIGI7XG4gICAgLy8gY29uc29sZS5sb2coXCJoc2xUb1JnYiBpbnB1dDpcIiwgaCwgcywgbCk7XG5cbiAgICBoID0gaCAvIDM2MC4wO1xuICAgIHMgPSBzIC8gMTAwLjA7XG4gICAgbCA9IGwgLyAxMDAuMDtcblxuICAgIGlmKHMgPT0gMCl7XG4gICAgICAgIHIgPSBnID0gYiA9IGw7IC8vIGFjaHJvbWF0aWNcbiAgICB9ZWxzZXtcbiAgICAgICAgdmFyIGh1ZTJyZ2IgPSBmdW5jdGlvbiBodWUycmdiKHAsIHEsIHQpe1xuICAgICAgICAgICAgaWYodCA8IDApIHQgKz0gMTtcbiAgICAgICAgICAgIGlmKHQgPiAxKSB0IC09IDE7XG4gICAgICAgICAgICBpZih0IDwgMS82KSByZXR1cm4gcCArIChxIC0gcCkgKiA2ICogdDtcbiAgICAgICAgICAgIGlmKHQgPCAxLzIpIHJldHVybiBxO1xuICAgICAgICAgICAgaWYodCA8IDIvMykgcmV0dXJuIHAgKyAocSAtIHApICogKDIvMyAtIHQpICogNjtcbiAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBxID0gbCA8IDAuNSA/IGwgKiAoMSArIHMpIDogbCArIHMgLSBsICogcztcbiAgICAgICAgdmFyIHAgPSAyICogbCAtIHE7XG4gICAgICAgIHIgPSBodWUycmdiKHAsIHEsIGggKyAxLzMpO1xuICAgICAgICBnID0gaHVlMnJnYihwLCBxLCBoKTtcbiAgICAgICAgYiA9IGh1ZTJyZ2IocCwgcSwgaCAtIDEvMyk7XG4gICAgfVxuXG4gICAgcGFzc2JhY2tbMF0gPSByICogMjU1O1xuICAgIHBhc3NiYWNrWzFdID0gZyAqIDI1NTtcbiAgICBwYXNzYmFja1syXSA9IGIgKiAyNTU7XG5cbiAgICAvLyBjb25zb2xlLmxvZyhcImhzbFRvUmdiXCIsIHBhc3NiYWNrKTtcblxuICAgIHJldHVybiBwYXNzYmFjaztcbn1cblxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
