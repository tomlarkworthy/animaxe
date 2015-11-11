var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
var Rx = require("rx");
var events = require("./events.ts");
var Parameter = require("./parameter.ts");
exports.DEBUG_LOOP = false;
exports.DEBUG_THEN = false;
exports.DEBUG_IF = false;
exports.DEBUG_EMIT = false;
exports.DEBUG_PARALLEL = false;
exports.DEBUG_EVENTS = false;
exports.DEBUG = false;
console.log("Animaxe, https://github.com/tomlarkworthy/animaxe");
var add = function (a, b) { return a + b; };
function foldr(init, fn, array) {
    var val = init;
    for (var i = 0; i < array.length; i++)
        val = fn(val, array[i]);
    return val;
}
var sum = foldr(0, add, [1, 2, 3, 4]);
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
    Animation.prototype.if = function (condition, animation) {
        return new If([[condition, animation]], this);
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
    Animation.prototype.rotate = function (clockwiseRadians) {
        return this.pipe(rotate(clockwiseRadians));
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
            console.log("Animator: mousedown", x, y);
        this.events.mousedowns.push([x, y]);
    };
    Animator.prototype.mouseup = function (x, y) {
        if (exports.DEBUG_EVENTS)
            console.log("Animator: mouseup", x, y);
        this.events.mouseups.push([x, y]);
    };
    Animator.prototype.onmousemove = function (x, y) {
        if (exports.DEBUG_EVENTS)
            console.log("Animator: mousemoved", x, y);
        this.events.mousemoves.push([x, y]);
    };
    /**
     * Attaches listener for a canvas which will be propogated during ticks to animators that take input, e.g. UI
     */
    Animator.prototype.registerEvents = function (canvas) {
        var self = this;
        var rect = canvas.getBoundingClientRect(); // you have to correct for padding, todo this might get stale
        canvas.onmousedown = function (evt) { return self.mousedown(evt.clientX - rect.left, evt.clientY - rect.top); };
        canvas.onmouseup = function (evt) { return self.mouseup(evt.clientX - rect.left, evt.clientY - rect.top); };
        canvas.onmousemove = function (evt) { return self.onmousemove(evt.clientX - rect.left, evt.clientY - rect.top); };
    };
    return Animator;
})();
exports.Animator = Animator;
exports.Empty = new Animation(function (upstream) { return upstream; });
function pipe(animation) {
    return animation;
}
exports.pipe = pipe;
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
        if (exports.DEBUG_PARALLEL)
            console.log("parallel: initializing");
        var activeAnimations = 0;
        var attachPoint = new Rx.Subject();
        function decrementActive(err) {
            if (exports.DEBUG_PARALLEL)
                console.log("parallel: decrement active");
            if (err)
                console.log("parallel error:", err);
            activeAnimations--;
        }
        animations.forEach(function (animation) {
            activeAnimations++;
            animation.attach(attachPoint.tapOnNext(function (tick) { return tick.ctx.save(); })).subscribe(function (tick) { return tick.ctx.restore(); }, decrementActive, decrementActive);
        });
        return prev.takeWhile(function () { return activeAnimations > 0; }).tapOnNext(function (tick) {
            if (exports.DEBUG_PARALLEL)
                console.log("parallel: emitting, animations", tick);
            attachPoint.onNext(tick);
            if (exports.DEBUG_PARALLEL)
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
/**
 * An if () elif() else() block. The semantics are subtle when considering animation lifecycles.
 * One intepretation is that an action is triggered until completion, before reevaluating the conditions. However,
 * as many animations are infinite in length, this would only ever select a single animation path.
 * So rather, this block reevaluates the condition every message. If an action completes, the block passes on the completion,
 * and the whole clause is over, so surround action animations with loop if you don't want that behaviour.
 * Whenever the active clause changes, the new active animation is reinitialised.
 */
var If = (function () {
    function If(conditions, preceeding) {
        if (preceeding === void 0) { preceeding = exports.Empty; }
        this.conditions = conditions;
        this.preceeding = preceeding;
    }
    If.prototype.elif = function (clause, action) {
        this.conditions.push([clause, action]);
        return this;
    };
    If.prototype.endif = function () {
        return this.preceeding.pipe(this.else(exports.Empty));
    };
    If.prototype.else = function (otherwise) {
        var _this = this;
        return this.preceeding.pipe(new Animation(function (upstream) {
            if (exports.DEBUG_IF)
                console.log("If: attach");
            var downstream = new Rx.Subject();
            var anchor = new Rx.Subject();
            var currentAnimation = otherwise;
            var activeSubscription = otherwise.attach(anchor).subscribe(downstream);
            // we initialise all the condition parameters
            var conditions_next = _this.conditions.map(function (condition) { return Parameter.from(condition[0]).init(); });
            var fork = upstream.subscribe(function (tick) {
                if (exports.DEBUG_IF)
                    console.log("If: upstream tick");
                // first, we find which animation should active, by using the conditions array
                var nextActiveAnimation = null;
                // ideally we would use find, but that is not in TS yet..
                for (var i = 0; i < _this.conditions.length && nextActiveAnimation == null; i++) {
                    if (conditions_next[i](tick.clock)) {
                        nextActiveAnimation = _this.conditions[i][1];
                    }
                }
                if (nextActiveAnimation == null)
                    nextActiveAnimation = otherwise;
                assert(nextActiveAnimation != null, "an animation should always be selected in an if block");
                // second, we see if this is the same as the current animation, or whether we have switched
                if (nextActiveAnimation != currentAnimation) {
                    // this is a new animation being sequenced, cancel the old one and add a new one
                    if (exports.DEBUG_IF)
                        console.log("If: new subscription");
                    if (activeSubscription != null)
                        activeSubscription.dispose();
                    activeSubscription = nextActiveAnimation.attach(anchor).subscribe(downstream);
                    currentAnimation = nextActiveAnimation;
                }
                else {
                }
                anchor.onNext(tick);
            }, function (err) { return anchor.onError(err); }, function () { return anchor.onCompleted(); });
            return downstream.tap(function (x) { if (exports.DEBUG_IF)
                console.log("If: downstream tick"); });
        }));
    };
    return If;
})();
exports.If = If;
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
        if (exports.DEBUG)
            console.log("globalCompositeOperation: attached");
        return function (tick) {
            if (exports.DEBUG)
                console.log("globalCompositeOperation: globalCompositeOperation");
            tick.ctx.globalCompositeOperation = composite_mode;
        };
    });
}
exports.globalCompositeOperation = globalCompositeOperation;
function velocity(velocity) {
    return draw(function () {
        if (exports.DEBUG)
            console.log("velocity: attached");
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
                console.log("fill: fill");
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
            tick.ctx.rotate(arg1);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuaW1heGUudHMiXSwibmFtZXMiOlsiZm9sZHIiLCJUaWNrIiwiVGljay5jb25zdHJ1Y3RvciIsImFzc2VydCIsInN0YWNrVHJhY2UiLCJBbmltYXRpb24iLCJBbmltYXRpb24uY29uc3RydWN0b3IiLCJBbmltYXRpb24ucGlwZSIsIkFuaW1hdGlvbi50aGVuIiwiQW5pbWF0aW9uLmxvb3AiLCJBbmltYXRpb24uZW1pdCIsIkFuaW1hdGlvbi5wYXJhbGxlbCIsIkFuaW1hdGlvbi5jbG9uZSIsIkFuaW1hdGlvbi50d2Vlbl9saW5lYXIiLCJBbmltYXRpb24udGFrZSIsIkFuaW1hdGlvbi5kcmF3IiwiQW5pbWF0aW9uLmlmIiwiQW5pbWF0aW9uLnN0cm9rZVN0eWxlIiwiQW5pbWF0aW9uLmZpbGxTdHlsZSIsIkFuaW1hdGlvbi5zaGFkb3dDb2xvciIsIkFuaW1hdGlvbi5zaGFkb3dCbHVyIiwiQW5pbWF0aW9uLnNoYWRvd09mZnNldCIsIkFuaW1hdGlvbi5saW5lQ2FwIiwiQW5pbWF0aW9uLmxpbmVKb2luIiwiQW5pbWF0aW9uLmxpbmVXaWR0aCIsIkFuaW1hdGlvbi5taXRlckxpbWl0IiwiQW5pbWF0aW9uLnJlY3QiLCJBbmltYXRpb24uZmlsbFJlY3QiLCJBbmltYXRpb24uc3Ryb2tlUmVjdCIsIkFuaW1hdGlvbi5jbGVhclJlY3QiLCJBbmltYXRpb24ud2l0aGluUGF0aCIsIkFuaW1hdGlvbi5maWxsIiwiQW5pbWF0aW9uLnN0cm9rZSIsIkFuaW1hdGlvbi5tb3ZlVG8iLCJBbmltYXRpb24ubGluZVRvIiwiQW5pbWF0aW9uLmNsaXAiLCJBbmltYXRpb24ucXVhZHJhdGljQ3VydmVUbyIsIkFuaW1hdGlvbi5iZXppZXJDdXJ2ZVRvIiwiQW5pbWF0aW9uLmFyYyIsIkFuaW1hdGlvbi5hcmNUbyIsIkFuaW1hdGlvbi5zY2FsZSIsIkFuaW1hdGlvbi5yb3RhdGUiLCJBbmltYXRpb24udHJhbnNsYXRlIiwiQW5pbWF0aW9uLnRyYW5zZm9ybSIsIkFuaW1hdGlvbi5zZXRUcmFuc2Zvcm0iLCJBbmltYXRpb24uZm9udCIsIkFuaW1hdGlvbi50ZXh0QWxpZ24iLCJBbmltYXRpb24udGV4dEJhc2VsaW5lIiwiQW5pbWF0aW9uLmZpbGxUZXh0IiwiQW5pbWF0aW9uLmRyYXdJbWFnZSIsIkFuaW1hdGlvbi5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24iLCJBbmltYXRpb24udmVsb2NpdHkiLCJBbmltYXRpb24uZ2xvdyIsIkFuaW1hdG9yIiwiQW5pbWF0b3IuY29uc3RydWN0b3IiLCJBbmltYXRvci50aWNrIiwiQW5pbWF0b3IudGlja2VyIiwiQW5pbWF0b3IucGxheSIsIkFuaW1hdG9yLm1vdXNlZG93biIsIkFuaW1hdG9yLm1vdXNldXAiLCJBbmltYXRvci5vbm1vdXNlbW92ZSIsIkFuaW1hdG9yLnJlZ2lzdGVyRXZlbnRzIiwicGlwZSIsImFzc2VydER0IiwiYXNzZXJ0Q2xvY2siLCJjb21iaW5lIiwicGFyYWxsZWwiLCJkZWNyZW1lbnRBY3RpdmUiLCJQYXRoQW5pbWF0aW9uIiwiUGF0aEFuaW1hdGlvbi5jb25zdHJ1Y3RvciIsImNsb25lIiwiZW1pdCIsImxvb3AiLCJhdHRhY2hMb29wIiwiSWYiLCJJZi5jb25zdHJ1Y3RvciIsIklmLmVsaWYiLCJJZi5lbmRpZiIsIklmLmVsc2UiLCJkcmF3IiwidHJhbnNsYXRlIiwiZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uIiwidmVsb2NpdHkiLCJ0d2Vlbl9saW5lYXIiLCJmaWxsU3R5bGUiLCJzdHJva2VTdHlsZSIsInNoYWRvd0NvbG9yIiwic2hhZG93Qmx1ciIsInNoYWRvd09mZnNldCIsImxpbmVDYXAiLCJsaW5lSm9pbiIsImxpbmVXaWR0aCIsIm1pdGVyTGltaXQiLCJyZWN0IiwiZmlsbFJlY3QiLCJzdHJva2VSZWN0IiwiY2xlYXJSZWN0Iiwid2l0aGluUGF0aCIsInN0cm9rZSIsImZpbGwiLCJtb3ZlVG8iLCJsaW5lVG8iLCJjbGlwIiwicXVhZHJhdGljQ3VydmVUbyIsImJlemllckN1cnZlVG8iLCJhcmMiLCJhcmNUbyIsInNjYWxlIiwicm90YXRlIiwidHJhbnNmb3JtIiwic2V0VHJhbnNmb3JtIiwiZm9udCIsInRleHRBbGlnbiIsInRleHRCYXNlbGluZSIsImZpbGxUZXh0IiwiZHJhd0ltYWdlIiwiZ2xvdyIsInRha2UiLCJzYXZlIiwicmdiVG9Ic2wiLCJoc2xUb1JnYiIsImhzbFRvUmdiLmh1ZTJyZ2IiXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsMERBQTBEO0FBQzFELDJDQUEyQztBQUMzQyxJQUFZLEVBQUUsV0FBTSxJQUFJLENBQUMsQ0FBQTtBQUN6QixJQUFZLE1BQU0sV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUN0QyxJQUFZLFNBQVMsV0FBTSxnQkFBZ0IsQ0FBQyxDQUFBO0FBRWpDLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLGdCQUFRLEdBQUcsS0FBSyxDQUFDO0FBQ2pCLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLHNCQUFjLEdBQUcsS0FBSyxDQUFDO0FBQ3ZCLG9CQUFZLEdBQUcsS0FBSyxDQUFDO0FBQ3JCLGFBQUssR0FBRyxLQUFLLENBQUM7QUFFekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO0FBZ0NqRSxJQUFJLEdBQUcsR0FBc0MsVUFBQyxDQUFRLEVBQUUsQ0FBUSxJQUFLLE9BQUEsQ0FBQyxHQUFHLENBQUMsRUFBTCxDQUFLLENBQUM7QUFFM0UsZUFBcUIsSUFBTyxFQUFFLEVBQXNCLEVBQUUsS0FBVTtJQUM1REEsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0E7SUFDZkEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBVUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsS0FBS0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsRUFBRUE7UUFBRUEsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFD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LE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7NEJBQzNCLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7NEJBQzNCLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7NEJBQzdCLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7NEJBQzNCLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7NEJBQzdCLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7NEJBQzNCLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7NEJBQzdCLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7NEJBRTNCOzs7OzhCQUlFOzRCQUVGLDRDQUE0Qzs0QkFFNUMscUJBQXFCOzRCQUVyQjs7Ozs4QkFJRTs0QkFFRiw4QkFBOEI7NEJBQzlCOzs7Ozs4QkFLRTs0QkFDRjs7Ozs7OEJBS0U7NEJBRUYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzs0QkFDdEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzs0QkFDdEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzs0QkFJdEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFHLENBQUMsQ0FBQyxDQUFDOzRCQUNuQyxDQUFDOzRCQUVELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dDQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dDQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztnQ0FDcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0NBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dDQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztnQ0FDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0NBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dDQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztnQ0FDeEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0NBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dDQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztnQ0FDNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0NBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dDQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQ0FFNUMsTUFBTSxJQUFJLEtBQUssRUFBRSxDQUFDOzRCQUV0QixDQUFDO3dCQUNMLENBQUM7b0JBQ0wsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQztZQUVELGlDQUFpQztZQUVqQyxJQUFJLEdBQUcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkMsR0FBRyxDQUFBLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM3QixHQUFHLENBQUEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzVCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNoQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3BDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDcEMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUVwQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDckMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ3JDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUNyQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsa0NBQWtDO2dCQUV0RCxDQUFDO1lBQ0wsQ0FBQztZQUVELCtDQUErQztZQUMvQyx3RkFBd0Y7WUFFeEYsdURBQXVEO1lBQ2pELE9BQU8sQ0FBQyxJQUFLLENBQUMsR0FBRyxDQUFDLElBQUksaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUVwRCxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUNYQSxDQUFDQTtBQTFNZSxZQUFJLE9BME1uQixDQUFBO0FBRUQsY0FDSSxNQUFjO0lBR2RDLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLFVBQVNBLElBQWdCQTtRQUMxQyxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7WUFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzdCLENBQUMsQ0FBQ0EsQ0FBQ0E7QUFDUEEsQ0FBQ0E7QUFSZSxZQUFJLE9BUW5CLENBQUE7QUFHRCxjQUFxQixLQUFZLEVBQUUsTUFBYSxFQUFFLElBQVk7SUFDMURDLElBQUlBLFVBQVVBLEdBQUdBLE9BQU9BLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO0lBQ3ZDQSxJQUFJQSxFQUFFQSxHQUFHQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtJQUd2QkEsSUFBSUEsT0FBT0EsR0FBR0EsSUFBSUEsVUFBVUEsQ0FBQ0EsS0FBS0EsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7SUFDNUNBLE9BQU9BLENBQUNBLGdCQUFnQkEsRUFBRUE7U0FDdkJBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLGlCQUFpQkEsQ0FBQ0EsRUFBRUEsTUFBTUEsRUFBRUEsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsR0FBR0EsRUFBRUEsT0FBT0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7U0FDMUVBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDcENBLE9BQU9BLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO0lBRWhCQSxNQUFNQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUFDQSxVQUFVQSxNQUFrQkE7UUFDN0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQ2IsVUFBUyxJQUFVO1lBQ2YsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUM1QyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvQixDQUFDLEVBQ0QsY0FBWSxPQUFPLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUEsQ0FBQyxFQUNwRCxjQUFZLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUEsQ0FBQyxDQUNuRSxDQUFBO0lBQ0wsQ0FBQyxDQUFDQSxDQUFDQTtBQUNQQSxDQUFDQTtBQXJCZSxZQUFJLE9BcUJuQixDQUFBO0FBR0Q7Ozs7Ozs7Ozs7R0FVRztBQUNILGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFrQztJQUN6REMsMkNBQTJDQTtJQUUzQ0EsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsSUFBSUEsR0FBR0EsQ0FBQ0E7SUFDN0JBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLEVBQUVBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO0lBQ3JEQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtJQUU5QkEsRUFBRUEsQ0FBQUEsQ0FBQ0EsR0FBR0EsSUFBSUEsR0FBR0EsQ0FBQ0EsQ0FBQUEsQ0FBQ0E7UUFDWEEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsYUFBYUE7SUFDNUJBLENBQUNBO0lBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBQ0pBLElBQUlBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBO1FBQ2xCQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNwREEsTUFBTUEsQ0FBQUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQUEsQ0FBQ0E7WUFDUkEsS0FBS0EsQ0FBQ0E7Z0JBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO2dCQUFDQSxLQUFLQSxDQUFDQTtZQUNqREEsS0FBS0EsQ0FBQ0E7Z0JBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUFDQSxLQUFLQSxDQUFDQTtZQUNuQ0EsS0FBS0EsQ0FBQ0E7Z0JBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUFDQSxLQUFLQSxDQUFDQTtRQUN2Q0EsQ0FBQ0E7UUFDREEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7SUFDWEEsQ0FBQ0E7SUFDREEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBT0Esa0JBQWtCQTtJQUNqREEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsV0FBV0E7SUFDcENBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLFdBQVdBO0lBRXBDQSw2Q0FBNkNBO0lBRTdDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQTtBQUNwQkEsQ0FBQ0E7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0gsa0JBQWtCLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQWtDO0lBQ3pEQyxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQTtJQUNaQSwyQ0FBMkNBO0lBRTNDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUNkQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUNkQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxLQUFLQSxDQUFDQTtJQUVkQSxFQUFFQSxDQUFBQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFBQSxDQUFDQTtRQUNQQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxhQUFhQTtJQUNoQ0EsQ0FBQ0E7SUFBQUEsSUFBSUEsQ0FBQUEsQ0FBQ0E7UUFDRkEsSUFBSUEsT0FBT0EsR0FBR0EsaUJBQWlCQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQTtZQUNsQ0MsRUFBRUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ2pCQSxFQUFFQSxDQUFBQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDakJBLEVBQUVBLENBQUFBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUNBLENBQUNBLENBQUNBO2dCQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUN2Q0EsRUFBRUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1lBQ3JCQSxFQUFFQSxDQUFBQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQTtnQkFBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDL0NBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1FBQ2JBLENBQUNBLENBQUNEO1FBRUZBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQzlDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNsQkEsQ0FBQ0EsR0FBR0EsT0FBT0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDM0JBLENBQUNBLEdBQUdBLE9BQU9BLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO1FBQ3JCQSxDQUFDQSxHQUFHQSxPQUFPQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUMvQkEsQ0FBQ0E7SUFFREEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0E7SUFDdEJBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBO0lBQ3RCQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQTtJQUV0QkEscUNBQXFDQTtJQUVyQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0E7QUFDcEJBLENBQUNBIiwiZmlsZSI6ImFuaW1heGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbm9kZV9tb2R1bGVzL3J4L3RzL3J4LmFsbC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9ub2RlLmQudHNcIiAvPlxuaW1wb3J0ICogYXMgUnggZnJvbSBcInJ4XCI7XG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSBcIi4vZXZlbnRzLnRzXCI7XG5pbXBvcnQgKiBhcyBQYXJhbWV0ZXIgZnJvbSBcIi4vcGFyYW1ldGVyLnRzXCI7XG5cbmV4cG9ydCB2YXIgREVCVUdfTE9PUCA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVR19USEVOID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX0lGID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX0VNSVQgPSBmYWxzZTtcbmV4cG9ydCB2YXIgREVCVUdfUEFSQUxMRUwgPSBmYWxzZTtcbmV4cG9ydCB2YXIgREVCVUdfRVZFTlRTID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHID0gZmFsc2U7XG5cbmNvbnNvbGUubG9nKFwiQW5pbWF4ZSwgaHR0cHM6Ly9naXRodWIuY29tL3RvbWxhcmt3b3J0aHkvYW5pbWF4ZVwiKTtcblxuLyoqXG4gKiBBIHBhcmFtZXRlciBpcyB1c2VkIGZvciB0aW1lIHZhcnlpbmcgdmFsdWVzIHRvIGFuaW1hdGlvbiBmdW5jdGlvbnMuXG4gKiBCZWZvcmUgYSBwYXJhbWV0ZXIgaXMgdXNlZCwgdGhlIGVuY2xvc2luZyBhbmltYXRpb24gbXVzdCBjYWxsIGluaXQuIFRoaXMgcmV0dXJucyBhIGZ1bmN0aW9uIHdoaWNoXG4gKiBjYW4gYmUgdXNlZCB0byBmaW5kIHRoZSB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gZm9yIHNwZWNpZmljIHZhbHVlcyBvZiB0aW1lLiBUeXBpY2FsbHkgdGhpcyBpcyBkb25lIHdpdGhpbiB0aGVcbiAqIGFuaW1hdGlvbidzIGNsb3N1cmUuIEZvciBleGFtcGxlOlxuYGBgXG5mdW5jdGlvbiBtb3ZlVG8oXG4gICAgeHk6IFBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7IC8vIGluaXQgdG8gb2J0YWluICduZXh0J1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IERyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5ID0geHlfbmV4dCh0aWNrLmNsb2NrKTsgLy8gdXNlICduZXh0JyB0byBnZXQgdmFsdWVcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5tb3ZlVG8oeHlbMF0sIHh5WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5gYGBcbiAqXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGFyYW1ldGVyPFQ+IGV4dGVuZHMgUGFyYW1ldGVyLlBhcmFtZXRlcjxUPiB7XG5cbn1cblxuaW50ZXJmYWNlIEZ1bmN0aW9uMjxBMSwgQTIsIFI+IGV4dGVuZHMgRnVuY3Rpb24ge1xuICAgIChhcmcxOiBBMSwgYXJnMjogQTIpOlI7XG59XG5cbnZhciBhZGQ6IEZ1bmN0aW9uMjxudW1iZXIsIG51bWJlciwgbnVtYmVyPiA9IChhOm51bWJlciwgYjpudW1iZXIpID0+IGEgKyBiO1xuXG5mdW5jdGlvbiBmb2xkcjxULCBWPihpbml0OiBULCBmbjogRnVuY3Rpb24yPFQsIFYsIFQ+LCBhcnJheTogVltdKTogVCB7XG4gICAgdmFyIHZhbCA9IGluaXQ7XG4gICAgZm9yICh2YXIgaTogbnVtYmVyID0wOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHZhbCA9IGZuKHZhbCwgYXJyYXlbaV0pO1xuICAgIHJldHVybiB2YWw7XG59XG5cbnZhciBzdW06IG51bWJlciA9IGZvbGRyKDAsIGFkZCwgWzEsMiwzLDRdKTtcblxuLy8gdG9kbyB3ZSBzaG91bGQgbW92ZSB0aGVzZSBpbnRvIGFuIEVTNiBtb2R1bGUgYnV0IG15IElERSBkb2VzIG5vdCBzdXBwb3J0IGl0IHlldFxuLyoqXG4gKiBBIGNzcyBlbmNvZGVkIGNvbG9yLCBlLmcuIFwicmdiYSgyNTUsIDEyNSwgMzIsIDAuNSlcIiBvciBcInJlZFwiXG4gKi9cbmV4cG9ydCB0eXBlIENvbG9yID0gc3RyaW5nXG4vKipcbiAqIEEgMkQgYXJyYXkgb2YgbnVtYmVycyB1c2VkIGZvciByZXByZXNlbnRpbmcgcG9pbnRzIG9yIHZlY3RvcnNcbiAqL1xuZXhwb3J0IHR5cGUgUG9pbnQgICAgID0gW251bWJlciwgbnVtYmVyXVxuLyoqXG4gKiBBIGxpdGVyYWwgb3IgYSBkeW5hbWljIFBhcmFtZXRlciBhbGlhcywgdXNlZCBhcyBhcmd1bWVudHMgdG8gYW5pbWF0aW9ucy5cbiAqL1xuZXhwb3J0IHR5cGUgTnVtYmVyQXJnID0gbnVtYmVyIHwgUGFyYW1ldGVyPG51bWJlcj5cbi8qKlxuICogQSBsaXRlcmFsIG9yIGEgZHluYW1pYyBQYXJhbWV0ZXIgYWxpYXMsIHVzZWQgYXMgYXJndW1lbnRzIHRvIGFuaW1hdGlvbnMuXG4gKi9cbmV4cG9ydCB0eXBlIFBvaW50QXJnICA9IFBvaW50IHwgUGFyYW1ldGVyPFBvaW50PlxuLyoqXG4gKiBBIGxpdGVyYWwgb3IgYSBkeW5hbWljIFBhcmFtZXRlciBhbGlhcywgdXNlZCBhcyBhcmd1bWVudHMgdG8gYW5pbWF0aW9ucy5cbiAqL1xuZXhwb3J0IHR5cGUgQ29sb3JBcmcgID0gQ29sb3IgfCBQYXJhbWV0ZXI8Q29sb3I+XG4vKipcbiAqIEEgbGl0ZXJhbCBvciBhIGR5bmFtaWMgUGFyYW1ldGVyIGFsaWFzLCB1c2VkIGFzIGFyZ3VtZW50cyB0byBhbmltYXRpb25zLlxuICovXG5leHBvcnQgdHlwZSBTdHJpbmdBcmcgPSBzdHJpbmcgfCBQYXJhbWV0ZXI8c3RyaW5nPlxuLyoqXG4gKiBBIGxpdGVyYWwgb3IgYSBkeW5hbWljIFBhcmFtZXRlciBhbGlhcywgdXNlZCBhcyBhcmd1bWVudHMgdG8gYW5pbWF0aW9ucy5cbiAqL1xuZXhwb3J0IHR5cGUgQm9vbGVhbkFyZyA9IGJvb2xlYW4gfCBQYXJhbWV0ZXI8Ym9vbGVhbj5cblxuLyoqXG4gKiBFYWNoIGZyYW1lIGFuIGFuaW1hdGlvbiBpcyBwcm92aWRlZCBhIFRpY2suIFRoZSB0aWNrIGV4cG9zZXMgYWNjZXNzIHRvIHRoZSBsb2NhbCBhbmltYXRpb24gdGltZSwgdGhlXG4gKiB0aW1lIGRlbHRhIGJldHdlZW4gdGhlIHByZXZpb3VzIGZyYW1lIChkdCkgYW5kIHRoZSBkcmF3aW5nIGNvbnRleHQuIEFuaW1hdG9ycyB0eXBpY2FsbHkgdXNlIHRoZSBkcmF3aW5nIGNvbnRleHRcbiAqIGRpcmVjdGx5LCBhbmQgcGFzcyB0aGUgY2xvY2sgb250byBhbnkgdGltZSB2YXJ5aW5nIHBhcmFtZXRlcnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBUaWNrIHtcbiAgICBjb25zdHJ1Y3RvciAoXG4gICAgICAgIHB1YmxpYyBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCxcbiAgICAgICAgcHVibGljIGNsb2NrOiBudW1iZXIsXG4gICAgICAgIHB1YmxpYyBkdDogbnVtYmVyLFxuICAgICAgICBwdWJsaWMgZXZlbnRzOiBldmVudHMuRXZlbnRzKVxuICAgIHt9XG59XG5cbi8qKlxuICogVGhlIHN0cmVhbSBvZiBUaWNrJ3MgYW4gYW5pbWF0aW9uIGlzIHByb3ZpZGVkIHdpdGggaXMgcmVwcmVzZW50ZWQgYnkgYSByZWFjdGl2ZSBleHRlbnNpb24gb2JzZXJ2YWJsZS5cbiAqL1xuZXhwb3J0IHR5cGUgVGlja1N0cmVhbSA9IFJ4Lk9ic2VydmFibGU8VGljaz47XG5cblxuZnVuY3Rpb24gYXNzZXJ0KHByZWRpY2F0ZTogYm9vbGVhbiwgbWVzc2FnZSA/OiBzdHJpbmcpIHtcbiAgICBpZiAoIXByZWRpY2F0ZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKHN0YWNrVHJhY2UoKSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3RhY2tUcmFjZSgpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG4gICAgcmV0dXJuICg8YW55PmVycikuc3RhY2s7XG59XG5cbi8qKlxuICogQW4gYW5pbWF0aW9uIGlzIHBpcGVsaW5lIHRoYXQgbW9kaWZpZXMgdGhlIGRyYXdpbmcgY29udGV4dCBmb3VuZCBpbiBhbiBhbmltYXRpb24gVGljay4gQW5pbWF0aW9ucyBjYW4gYmUgY2hhaW5lZFxuICogdG9nZXRoZXIgdG8gY3JlYXRlIGEgbW9yZSBjb21wbGljYXRlZCBBbmltYXRpb24uIFRoZXkgYXJlIGNvbXBvc2VhYmxlLFxuICpcbiAqIGUuZy4gYGBgYW5pbWF0aW9uMSA9IEF4LnRyYW5zbGF0ZShbNTAsIDUwXSkuZmlsbFN0eWxlKFwicmVkXCIpLmZpbGxSZWN0KFswLDBdLCBbMjAsMjBdKWBgYFxuICogaXMgb25lIGFuaW1hdGlvbiB3aGljaCBoYXMgYmVlbiBmb3JtZWQgZnJvbSB0aHJlZSBzdWJhbmltYXRpb25zLlxuICpcbiAqIEFuaW1hdGlvbnMgaGF2ZSBhIGxpZmVjeWNsZSwgdGhleSBjYW4gYmUgZmluaXRlIG9yIGluZmluaXRlIGluIGxlbmd0aC4gWW91IGNhbiBzdGFydCB0ZW1wb3JhbGx5IGNvbXBvc2UgYW5pbWF0aW9uc1xuICogdXNpbmcgYGBgYW5pbTEudGhlbihhbmltMilgYGAsIHdoaWNoIGNyZWF0ZXMgYSBuZXcgYW5pbWF0aW9uIHRoYXQgcGxheXMgYW5pbWF0aW9uIDIgd2hlbiBhbmltYXRpb24gMSBmaW5pc2hlcy5cbiAqXG4gKiBXaGVuIGFuIGFuaW1hdGlvbiBpcyBzZXF1ZW5jZWQgaW50byB0aGUgYW5pbWF0aW9uIHBpcGVsaW5lLiBJdHMgYXR0YWNoIG1ldGhvZCBpcyBjYWxsZWQgd2hpY2ggYXRjdWFsbHkgYnVpbGRzIHRoZVxuICogUnhKUyBwaXBlbGluZS4gVGh1cyBhbiBhbmltYXRpb24gaXMgbm90IGxpdmUsIGJ1dCByZWFsbHkgYSBmYWN0b3J5IGZvciBhIFJ4SlMgY29uZmlndXJhdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIEFuaW1hdGlvbiB7XG4gICAgY29uc3RydWN0b3IocHVibGljIGF0dGFjaDogKHVwc3RyZWFtOiBUaWNrU3RyZWFtKSA9PiBUaWNrU3RyZWFtKSB7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogc2VuZCB0aGUgZG93bnN0cmVhbSBjb250ZXh0IG9mICd0aGlzJyBhbmltYXRpb24sIGFzIHRoZSB1cHN0cmVhbSBjb250ZXh0IHRvIHN1cHBsaWVkIGFuaW1hdGlvbi5cbiAgICAgKlxuICAgICAqIFRoaXMgYWxsb3dzIHlvdSB0byBjaGFpbiBjdXN0b20gYW5pbWF0aW9ucy5cbiAgICAgKlxuICAgICAqIGBgYEF4Lm1vdmUoLi4uKS5waXBlKG15QW5pbWF0aW9uKCkpO2BgYFxuICAgICAqL1xuICAgIHBpcGU8VCBleHRlbmRzIEFuaW1hdGlvbj4oZG93bnN0cmVhbTogVCk6IFQge1xuICAgICAgICByZXR1cm4gY29tYmluZSh0aGlzLCBkb3duc3RyZWFtKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBkZWxpdmVycyB1cHN0cmVhbSBldmVudHMgdG8gJ3RoaXMnIGZpcnN0LCB0aGVuIHdoZW4gJ3RoaXMnIGFuaW1hdGlvbiBpcyBmaW5pc2hlZFxuICAgICAqIHRoZSB1cHN0cmVhbSBpcyBzd2l0Y2hlZCB0byB0aGUgdGhlIGZvbGxvd2VyIGFuaW1hdGlvbi5cbiAgICAgKlxuICAgICAqIFRoaXMgYWxsb3dzIHlvdSB0byBzZXF1ZW5jZSBhbmltYXRpb25zIHRlbXBvcmFsbHkuXG4gICAgICogZnJhbWUxQW5pbWF0aW9uKCkudGhlbihmcmFtZTJBbmltYXRpb24pLnRoZW4oZnJhbWUzQW5pbWF0aW9uKVxuICAgICAqL1xuICAgIHRoZW4oZm9sbG93ZXI6IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogVGlja1N0cmVhbSkgOiBUaWNrU3RyZWFtIHtcbiAgICAgICAgICAgIHJldHVybiBSeC5PYnNlcnZhYmxlLmNyZWF0ZTxUaWNrPihmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3QgID0gbmV3IFJ4LlN1YmplY3Q8VGljaz4oKTtcbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kID0gbmV3IFJ4LlN1YmplY3Q8VGljaz4oKTtcblxuICAgICAgICAgICAgICAgIHZhciBmaXJzdFR1cm4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnQgPSBmaXJzdDtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBhdHRhY2hcIik7XG5cbiAgICAgICAgICAgICAgICB2YXIgc2Vjb25kQXR0YWNoID0gbnVsbDtcblxuICAgICAgICAgICAgICAgIHZhciBmaXJzdEF0dGFjaCAgPSBzZWxmLmF0dGFjaChmaXJzdC5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBmaXJzdCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgY29tcGxldGVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFR1cm4gPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vjb25kQXR0YWNoID0gZm9sbG93ZXIuYXR0YWNoKHNlY29uZC5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogc2Vjb25kIHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IuYmluZChvYnNlcnZlciksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogc2Vjb25kIGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkNvbXBsZXRlZCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIHZhciBwcmV2U3Vic2NyaXB0aW9uID0gcHJldi5zdWJzY3JpYmVPbihSeC5TY2hlZHVsZXIuaW1tZWRpYXRlKS5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHVwc3RyZWFtIHRvIGZpcnN0IE9SIHNlY29uZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaXJzdFR1cm4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaXJzdC5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZC5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uRXJyb3IsXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHVwc3RyZWFtIGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgLy8gb24gZGlzcG9zZVxuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGRpc3Bvc2VyXCIpO1xuICAgICAgICAgICAgICAgICAgICBwcmV2U3Vic2NyaXB0aW9uLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RBdHRhY2guZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vjb25kQXR0YWNoKVxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vjb25kQXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSk7IC8vdG9kbyByZW1vdmUgc3Vic2NyaWJlT25zXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFuaW1hdGlvbiB0aGF0IHJlcGxheXMgdGhlIGlubmVyIGFuaW1hdGlvbiBlYWNoIHRpbWUgdGhlIGlubmVyIGFuaW1hdGlvbiBjb21wbGV0ZXMuXG4gICAgICpcbiAgICAgKiBUaGUgcmVzdWx0YW50IGFuaW1hdGlvbiBpcyBhbHdheXMgcnVucyBmb3JldmVyIHdoaWxlIHVwc3RyZWFtIGlzIGxpdmUuIE9ubHkgYSBzaW5nbGUgaW5uZXIgYW5pbWF0aW9uXG4gICAgICogcGxheXMgYXQgYSB0aW1lICh1bmxpa2UgZW1pdCgpKVxuICAgICAqL1xuICAgIGxvb3AoaW5uZXI6IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUobG9vcChpbm5lcikpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFuaW1hdGlvbiB0aGF0IHNlcXVlbmNlcyB0aGUgaW5uZXIgYW5pbWF0aW9uIGV2ZXJ5IHRpbWUgZnJhbWUuXG4gICAgICpcbiAgICAgKiBUaGUgcmVzdWx0YW50IGFuaW1hdGlvbiBpcyBhbHdheXMgcnVucyBmb3JldmVyIHdoaWxlIHVwc3RyZWFtIGlzIGxpdmUuIE11bHRpcGxlIGlubmVyIGFuaW1hdGlvbnNcbiAgICAgKiBjYW4gYmUgcGxheWluZyBhdCB0aGUgc2FtZSB0aW1lICh1bmxpa2UgbG9vcClcbiAgICAgKi9cbiAgICBlbWl0KGlubmVyOiBBbmltYXRpb24pOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGVtaXQoaW5uZXIpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQbGF5cyBhbGwgdGhlIGlubmVyIGFuaW1hdGlvbnMgYXQgdGhlIHNhbWUgdGltZS4gUGFyYWxsZWwgY29tcGxldGVzIHdoZW4gYWxsIGlubmVyIGFuaW1hdGlvbnMgYXJlIG92ZXIuXG4gICAgICpcbiAgICAgKiBUaGUgY2FudmFzIHN0YXRlcyBhcmUgcmVzdG9yZWQgYmVmb3JlIGVhY2ggZm9yaywgc28gc3R5bGluZyBhbmQgdHJhbnNmb3JtcyBvZiBkaWZmZXJlbnQgY2hpbGQgYW5pbWF0aW9ucyBkbyBub3RcbiAgICAgKiBpbnRlcmFjdCAoYWx0aG91Z2ggb2JzdmlvdXNseSB0aGUgcGl4ZWwgYnVmZmVyIGlzIGFmZmVjdGVkIGJ5IGVhY2ggYW5pbWF0aW9uKVxuICAgICAqL1xuICAgIHBhcmFsbGVsKGlubmVyX2FuaW1hdGlvbnM6IFJ4Lk9ic2VydmFibGU8QW5pbWF0aW9uPiB8IEFuaW1hdGlvbltdKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShwYXJhbGxlbChpbm5lcl9hbmltYXRpb25zKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2VxdWVuY2VzIG4gY29waWVzIG9mIHRoZSBpbm5lciBhbmltYXRpb24uIENsb25lIGNvbXBsZXRlcyB3aGVuIGFsbCBpbm5lciBhbmltYXRpb25zIGFyZSBvdmVyLlxuICAgICAqL1xuICAgIGNsb25lKG46IG51bWJlciwgaW5uZXI6IEFuaW1hdGlvbik6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoY2xvbmUobiwgaW5uZXIpKTtcbiAgICB9XG5cbiAgICB0d2Vlbl9saW5lYXIoXG4gICAgICAgIGZyb206IFBvaW50QXJnLFxuICAgICAgICB0bzogICBQb2ludEFyZyxcbiAgICAgICAgdGltZTogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh0d2Vlbl9saW5lYXIoZnJvbSwgdG8sIHRpbWUpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFuaW1hdGlvbiB0aGF0IGlzIGF0IG1vc3QgbiBmcmFtZXMgZnJvbSAndGhpcycuXG4gICAgICovXG4gICAgdGFrZShmcmFtZXM6IG51bWJlcik6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodGFrZShmcmFtZXMpKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBoZWxwZXIgbWV0aG9kIGZvciBpbXBsZW1lbnRpbmcgc2ltcGxlIGFuaW1hdGlvbnMgKHRoYXQgZG9uJ3QgZm9yayB0aGUgYW5pbWF0aW9uIHRyZWUpLlxuICAgICAqIFlvdSBqdXN0IGhhdmUgdG8gc3VwcGx5IGEgZnVuY3Rpb24gdGhhdCBkb2VzIHNvbWV0aGluZyB3aXRoIHRoZSBkcmF3IHRpY2suXG4gICAgICovXG4gICAgZHJhdyhkcmF3RmFjdG9yeTogKCkgPT4gKCh0aWNrOiBUaWNrKSA9PiB2b2lkKSk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZHJhdyhkcmF3RmFjdG9yeSkpO1xuICAgIH1cblxuICAgIGlmKGNvbmRpdGlvbjogQm9vbGVhbkFyZywgYW5pbWF0aW9uOkFuaW1hdGlvbik6IElme1xuICAgICAgICByZXR1cm4gbmV3IElmKFtbY29uZGl0aW9uLCBhbmltYXRpb25dXSwgdGhpcyk7XG4gICAgfVxuXG4gICAgLy8gQ2FudmFzIEFQSVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHN0cm9rZVN0eWxlIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHN0cm9rZVN0eWxlKGNvbG9yOiBDb2xvckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoc3Ryb2tlU3R5bGUoY29sb3IpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgZmlsbFN0eWxlIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGZpbGxTdHlsZShjb2xvcjogQ29sb3JBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGZpbGxTdHlsZShjb2xvcikpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBzaGFkb3dDb2xvciBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzaGFkb3dDb2xvcihjb2xvcjogQ29sb3JBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHNoYWRvd0NvbG9yKGNvbG9yKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNoYWRvd0JsdXIgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgc2hhZG93Qmx1cihsZXZlbDogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzaGFkb3dCbHVyKGxldmVsKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNoYWRvd09mZnNldFggYW5kIHNoYWRvd09mZnNldFkgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgc2hhZG93T2Zmc2V0KHh5OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoc2hhZG93T2Zmc2V0KHh5KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGxpbmVDYXAgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgbGluZUNhcChzdHlsZTogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShsaW5lQ2FwKHN0eWxlKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGxpbmVKb2luIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGxpbmVKb2luKHN0eWxlOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGxpbmVKb2luKHN0eWxlKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGxpbmVXaWR0aCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBsaW5lV2lkdGgod2lkdGg6IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUobGluZVdpZHRoKHdpZHRoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIG1pdGVyTGltaXQgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgbWl0ZXJMaW1pdChsaW1pdDogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShtaXRlckxpbWl0KGxpbWl0KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHJlY3QgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgcmVjdCh4eTogUG9pbnRBcmcsIHdpZHRoX2hlaWdodDogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHJlY3QoeHksIHdpZHRoX2hlaWdodCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBmaWxsUmVjdCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBmaWxsUmVjdCh4eTogUG9pbnRBcmcsIHdpZHRoX2hlaWdodDogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGZpbGxSZWN0KHh5LCB3aWR0aF9oZWlnaHQpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc3Ryb2tlUmVjdCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzdHJva2VSZWN0KHh5OiBQb2ludEFyZywgd2lkdGhfaGVpZ2h0OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoc3Ryb2tlUmVjdCh4eSwgd2lkdGhfaGVpZ2h0KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGNsZWFyUmVjdCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBjbGVhclJlY3QoeHk6IFBvaW50QXJnLCB3aWR0aF9oZWlnaHQ6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShjbGVhclJlY3QoeHksIHdpZHRoX2hlaWdodCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFbmNsb3NlcyB0aGUgaW5uZXIgYW5pbWF0aW9uIHdpdGggYSBiZWdpbnBhdGgoKSBhbmQgZW5kcGF0aCgpIGZyb20gdGhlIGNhbnZhcyBBUEkuXG4gICAgICpcbiAgICAgKiBUaGlzIHJldHVybnMgYSBwYXRoIG9iamVjdCB3aGljaCBldmVudHMgY2FuIGJlIHN1YnNjcmliZWQgdG9cbiAgICAgKi9cbiAgICB3aXRoaW5QYXRoKGlubmVyOiBBbmltYXRpb24pOiBQYXRoQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh3aXRoaW5QYXRoKGlubmVyKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGZpbGwgaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgZmlsbCgpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGZpbGwoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHN0cm9rZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzdHJva2UoKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzdHJva2UoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIG1vdmVUbyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAgICAgKi9cbiAgICBtb3ZlVG8oeHk6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShtb3ZlVG8oeHkpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbGluZVRvIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICAgICAqL1xuICAgIGxpbmVUbyh4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGxpbmVUbyh4eSkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBjbGlwIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICAgICAqL1xuICAgIGNsaXAoKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShjbGlwKCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBxdWFkcmF0aWNDdXJ2ZVRvIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICAgICAqL1xuICAgIHF1YWRyYXRpY0N1cnZlVG8oY29udHJvbDogUG9pbnRBcmcsIGVuZDogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHF1YWRyYXRpY0N1cnZlVG8oY29udHJvbCwgZW5kKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGJlemllckN1cnZlVG8gaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgYmV6aWVyQ3VydmVUbyhjb250cm9sMTogUG9pbnRBcmcsIGNvbnRyb2wyOiBQb2ludEFyZywgZW5kOiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoYmV6aWVyQ3VydmVUbyhjb250cm9sMSwgY29udHJvbDIsIGVuZCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBhcmMgaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgYXJjKGNlbnRlcjogUG9pbnRBcmcsIHJhZGl1czogTnVtYmVyQXJnLFxuICAgICAgICByYWRTdGFydEFuZ2xlOiBOdW1iZXJBcmcsIHJhZEVuZEFuZ2xlOiBOdW1iZXJBcmcsXG4gICAgICAgIGNvdW50ZXJjbG9ja3dpc2U/OiBib29sZWFuKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShhcmMoY2VudGVyLCByYWRpdXMsIHJhZFN0YXJ0QW5nbGUsIHJhZEVuZEFuZ2xlLCBjb3VudGVyY2xvY2t3aXNlKSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgYXJjIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICAgICAqL1xuICAgIGFyY1RvKHRhbmdlbnQxOiBQb2ludEFyZywgdGFuZ2VudDI6IFBvaW50QXJnLCByYWRpdXM6IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoYXJjVG8odGFuZ2VudDEsIHRhbmdlbnQyLCByYWRpdXMpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc2NhbGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgc2NhbGUoeHk6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzY2FsZSh4eSkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciByb3RhdGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgcm90YXRlKGNsb2Nrd2lzZVJhZGlhbnM6IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUocm90YXRlKGNsb2Nrd2lzZVJhZGlhbnMpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdHJhbnNsYXRlIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHRyYW5zbGF0ZSh4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHRyYW5zbGF0ZSh4eSkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciB0cmFuc2xhdGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICogWyBhIGMgZVxuICAgICAqICAgYiBkIGZcbiAgICAgKiAgIDAgMCAxIF1cbiAgICAgKi9cbiAgICB0cmFuc2Zvcm0oYTogTnVtYmVyQXJnLCBiOiBOdW1iZXJBcmcsIGM6IE51bWJlckFyZyxcbiAgICAgICAgICAgICAgZDogTnVtYmVyQXJnLCBlOiBOdW1iZXJBcmcsIGY6IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodHJhbnNmb3JtKGEsYixjLGQsZSxmKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNldFRyYW5zZm9ybSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzZXRUcmFuc2Zvcm0oYTogTnVtYmVyQXJnLCBiOiBOdW1iZXJBcmcsIGM6IE51bWJlckFyZyxcbiAgICAgICAgICAgICAgICAgZDogTnVtYmVyQXJnLCBlOiBOdW1iZXJBcmcsIGY6IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoc2V0VHJhbnNmb3JtKGEsYixjLGQsZSxmKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGZvbnQgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgZm9udChzdHlsZTogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShmb250KHN0eWxlKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHRleHRBbGlnbiBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICB0ZXh0QWxpZ24oc3R5bGU6IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodGV4dEFsaWduKHN0eWxlKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHRleHRCYXNlbGluZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICB0ZXh0QmFzZWxpbmUoc3R5bGU6IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodGV4dEJhc2VsaW5lKHN0eWxlKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHRleHRCYXNlbGluZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBmaWxsVGV4dCh0ZXh0OiBTdHJpbmdBcmcsIHh5OiBQb2ludEFyZywgbWF4V2lkdGg/OiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGZpbGxUZXh0KHRleHQsIHh5LCBtYXhXaWR0aCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBkcmF3SW1hZ2UgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgZHJhd0ltYWdlKGltZywgeHk6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShkcmF3SW1hZ2UoaW1nLCB4eSkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBnbG9iYWxDb21wb3NpdGVPcGVyYXRpb24ob3BlcmF0aW9uOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbihvcGVyYXRpb24pKTtcbiAgICB9XG4gICAgLy8gRW5kIENhbnZhcyBBUElcblxuXG4gICAgLyoqXG4gICAgICogdHJhbnNsYXRlcyB0aGUgZHJhd2luZyBjb250ZXh0IGJ5IHZlbG9jaXR5ICogdGljay5jbG9ja1xuICAgICAqL1xuICAgIHZlbG9jaXR5KHZlY3RvcjogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHZlbG9jaXR5KHZlY3RvcikpO1xuICAgIH1cblxuICAgIGdsb3coZGVjYXk6IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoZ2xvdyhkZWNheSkpO1xuICAgIH1cbn1cblxuXG5leHBvcnQgY2xhc3MgQW5pbWF0b3Ige1xuICAgIHJvb3Q6IFJ4LlN1YmplY3Q8VGljaz47XG4gICAgdDogbnVtYmVyID0gMDtcbiAgICBldmVudHM6IGV2ZW50cy5FdmVudHMgPSBuZXcgZXZlbnRzLkV2ZW50cygpO1xuXG4gICAgY29uc3RydWN0b3IocHVibGljIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEKSB7XG4gICAgICAgIHRoaXMucm9vdCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KClcbiAgICB9XG4gICAgdGljayhkdDogbnVtYmVyKSB7XG4gICAgICAgIHZhciB0aWNrID0gbmV3IFRpY2sodGhpcy5jdHgsIHRoaXMudCwgZHQsIHRoaXMuZXZlbnRzKTtcbiAgICAgICAgdGhpcy50ICs9IGR0O1xuICAgICAgICB0aGlzLnJvb3Qub25OZXh0KHRpY2spO1xuICAgICAgICB0aGlzLmV2ZW50cy5jbGVhcigpO1xuICAgIH1cbiAgICB0aWNrZXIoZHRzOiBSeC5PYnNlcnZhYmxlPG51bWJlcj4pOiB2b2lkIHtcbiAgICAgICAgLy8gdG9kbyB0aGlzIGlzIGEgYml0IHl1Y2tcbiAgICAgICAgZHRzLnN1YnNjcmliZSh0aGlzLnRpY2suYmluZCh0aGlzKSwgdGhpcy5yb290Lm9uRXJyb3IuYmluZCh0aGlzLnJvb3QpLCB0aGlzLnJvb3Qub25Db21wbGV0ZWQuYmluZCh0aGlzLnJvb3QpKTtcbiAgICB9XG4gICAgcGxheShhbmltYXRpb246IEFuaW1hdGlvbik6IFJ4LklEaXNwb3NhYmxlIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IHBsYXlcIik7XG4gICAgICAgIHZhciBzYXZlQmVmb3JlRnJhbWUgPSB0aGlzLnJvb3QudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2spe1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFuaW1hdG9yOiBjdHggc2F2ZVwiKTtcbiAgICAgICAgICAgIHRpY2suY3R4LnNhdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBhbmltYXRpb25cbiAgICAgICAgICAgIC5hdHRhY2goc2F2ZUJlZm9yZUZyYW1lKSAvLyB0b2RvLCBpdCBiZSBuaWNlciBpZiB3ZSBjb3VsZCBjaGFpbiBhdHRhY2hcbiAgICAgICAgICAgIC50YXAoXG4gICAgICAgICAgICBmdW5jdGlvbih0aWNrKXtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYW5pbWF0b3I6IGN0eCBuZXh0IHJlc3RvcmVcIik7XG4gICAgICAgICAgICAgICAgdGljay5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSxmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IGVyciByZXN0b3JlXCIsIGVycik7XG4gICAgICAgICAgICAgICAgc2VsZi5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSxmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhbmltYXRvcjogY3R4IGNvbXBsZXRlIHJlc3RvcmVcIik7XG4gICAgICAgICAgICAgICAgc2VsZi5jdHgucmVzdG9yZSgpO1xuICAgICAgICAgICAgfSkuc3Vic2NyaWJlKCk7XG4gICAgfVxuXG4gICAgbW91c2Vkb3duICh4OiBudW1iZXIsIHk6IG51bWJlcikge1xuICAgICAgICBpZiAoREVCVUdfRVZFTlRTKSBjb25zb2xlLmxvZyhcIkFuaW1hdG9yOiBtb3VzZWRvd25cIiwgeCwgeSk7XG4gICAgICAgIHRoaXMuZXZlbnRzLm1vdXNlZG93bnMucHVzaChbeCwgeV0pO1xuICAgIH1cbiAgICBtb3VzZXVwICh4OiBudW1iZXIsIHk6IG51bWJlcikge1xuICAgICAgICBpZiAoREVCVUdfRVZFTlRTKSBjb25zb2xlLmxvZyhcIkFuaW1hdG9yOiBtb3VzZXVwXCIsIHgsIHkpO1xuICAgICAgICB0aGlzLmV2ZW50cy5tb3VzZXVwcy5wdXNoKFt4LCB5XSk7XG4gICAgfVxuICAgIG9ubW91c2Vtb3ZlICh4OiBudW1iZXIsIHk6IG51bWJlcikge1xuICAgICAgICBpZiAoREVCVUdfRVZFTlRTKSBjb25zb2xlLmxvZyhcIkFuaW1hdG9yOiBtb3VzZW1vdmVkXCIsIHgsIHkpO1xuICAgICAgICB0aGlzLmV2ZW50cy5tb3VzZW1vdmVzLnB1c2goW3gsIHldKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEF0dGFjaGVzIGxpc3RlbmVyIGZvciBhIGNhbnZhcyB3aGljaCB3aWxsIGJlIHByb3BvZ2F0ZWQgZHVyaW5nIHRpY2tzIHRvIGFuaW1hdG9ycyB0aGF0IHRha2UgaW5wdXQsIGUuZy4gVUlcbiAgICAgKi9cbiAgICByZWdpc3RlckV2ZW50cyhjYW52YXM6YW55KTogdm9pZCB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7IC8vIHlvdSBoYXZlIHRvIGNvcnJlY3QgZm9yIHBhZGRpbmcsIHRvZG8gdGhpcyBtaWdodCBnZXQgc3RhbGVcbiAgICAgICAgY2FudmFzLm9ubW91c2Vkb3duICAgPSBldnQgPT4gc2VsZi5tb3VzZWRvd24gIChldnQuY2xpZW50WCAtIHJlY3QubGVmdCwgZXZ0LmNsaWVudFkgLSByZWN0LnRvcCk7XG4gICAgICAgIGNhbnZhcy5vbm1vdXNldXAgICAgID0gZXZ0ID0+IHNlbGYubW91c2V1cCAgICAoZXZ0LmNsaWVudFggLSByZWN0LmxlZnQsIGV2dC5jbGllbnRZIC0gcmVjdC50b3ApO1xuICAgICAgICBjYW52YXMub25tb3VzZW1vdmUgICA9IGV2dCA9PiBzZWxmLm9ubW91c2Vtb3ZlKGV2dC5jbGllbnRYIC0gcmVjdC5sZWZ0LCBldnQuY2xpZW50WSAtIHJlY3QudG9wKTtcbiAgICB9XG59XG5cblxuXG5leHBvcnQgdmFyIEVtcHR5OiBBbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uKHVwc3RyZWFtID0+IHVwc3RyZWFtKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHBpcGUoYW5pbWF0aW9uOiBBbmltYXRpb24pIHtcbiAgICByZXR1cm4gYW5pbWF0aW9uO1xufVxuXG4vKipcbiAqIE5PVEU6IGN1cnJlbnRseSBmYWlscyBpZiB0aGUgc3RyZWFtcyBhcmUgZGlmZmVyZW50IGxlbmd0aHNcbiAqIEBwYXJhbSBleHBlY3RlZER0IHRoZSBleHBlY3RlZCBjbG9jayB0aWNrIHZhbHVlc1xuICogQHBhcmFtIGFmdGVyXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RHQoZXhwZWN0ZWREdDogUnguT2JzZXJ2YWJsZTxudW1iZXI+KTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbih1cHN0cmVhbSkge1xuICAgICAgICByZXR1cm4gdXBzdHJlYW0uemlwKGV4cGVjdGVkRHQsIGZ1bmN0aW9uKHRpY2s6IFRpY2ssIGV4cGVjdGVkRHRWYWx1ZTogbnVtYmVyKSB7XG4gICAgICAgICAgICBpZiAodGljay5kdCAhPSBleHBlY3RlZER0VmFsdWUpIHRocm93IG5ldyBFcnJvcihcInVuZXhwZWN0ZWQgZHQgb2JzZXJ2ZWQ6IFwiICsgdGljay5kdCArIFwiLCBleHBlY3RlZDpcIiArIGV4cGVjdGVkRHRWYWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbi8vdG9kbyB3b3VsZCBiZSBuaWNlIGlmIHRoaXMgdG9vayBhbiBpdGVyYWJsZSBvciBzb21lIG90aGVyIHR5cGUgb2Ygc2ltcGxlIHB1bGwgc3RyZWFtXG4vLyBhbmQgdXNlZCBzdHJlYW1FcXVhbHNcbmV4cG9ydCBmdW5jdGlvbiBhc3NlcnRDbG9jayhhc3NlcnRDbG9jazogbnVtYmVyW10pOiBBbmltYXRpb24ge1xuICAgIHZhciBpbmRleCA9IDA7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbih1cHN0cmVhbSkge1xuICAgICAgICByZXR1cm4gdXBzdHJlYW0udGFwT25OZXh0KGZ1bmN0aW9uKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhc3NlcnRDbG9jazogXCIsIHRpY2spO1xuICAgICAgICAgICAgaWYgKHRpY2suY2xvY2sgPCBhc3NlcnRDbG9ja1tpbmRleF0gLSAwLjAwMDAxIHx8IHRpY2suY2xvY2sgPiBhc3NlcnRDbG9ja1tpbmRleF0gKyAwLjAwMDAxKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yTXNnID0gXCJ1bmV4cGVjdGVkIGNsb2NrIG9ic2VydmVkOiBcIiArIHRpY2suY2xvY2sgKyBcIiwgZXhwZWN0ZWQ6XCIgKyBhc3NlcnRDbG9ja1tpbmRleF1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvck1zZyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yTXNnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluZGV4ICsrO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IEFuaW1hdGlvbiBieSBwaXBpbmcgdGhlIGFuaW1hdGlvbiBmbG93IG9mIEEgaW50byBCXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21iaW5lPFQgZXh0ZW5kcyBBbmltYXRpb24+KGE6IEFuaW1hdGlvbiwgYjogVCk6IFQge1xuICAgIHZhciBiX3ByZXZfYXR0YWNoID0gYi5hdHRhY2g7XG4gICAgYi5hdHRhY2ggPVxuICAgICAgICAodXBzdHJlYW06IFRpY2tTdHJlYW0pID0+IHtcbiAgICAgICAgICAgIHJldHVybiBiX3ByZXZfYXR0YWNoKGEuYXR0YWNoKHVwc3RyZWFtKSk7XG4gICAgICAgIH07XG4gICAgcmV0dXJuIGI7XG59XG5cbi8qKlxuICogcGxheXMgc2V2ZXJhbCBhbmltYXRpb25zLCBmaW5pc2hlcyB3aGVuIHRoZXkgYXJlIGFsbCBkb25lLlxuICogQHBhcmFtIGFuaW1hdGlvbnNcbiAqIEByZXR1cm5zIHtBbmltYXRpb259XG4gKiB0b2RvOiBJIHRoaW5rIHRoZXJlIGFyZSBsb3RzIG9mIGJ1Z3Mgd2hlbiBhbiBhbmltYXRpb24gc3RvcHMgcGFydCB3YXlcbiAqIEkgdGhpbmsgaXQgYmUgYmV0dGVyIGlmIHRoaXMgc3Bhd25lZCBpdHMgb3duIEFuaW1hdG9yIHRvIGhhbmRsZSBjdHggcmVzdG9yZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcmFsbGVsKFxuICAgIGFuaW1hdGlvbnM6IFJ4Lk9ic2VydmFibGU8QW5pbWF0aW9uPiB8IEFuaW1hdGlvbltdXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogVGlja1N0cmVhbSk6IFRpY2tTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfUEFSQUxMRUwpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGluaXRpYWxpemluZ1wiKTtcblxuICAgICAgICB2YXIgYWN0aXZlQW5pbWF0aW9ucyA9IDA7XG4gICAgICAgIHZhciBhdHRhY2hQb2ludCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgZnVuY3Rpb24gZGVjcmVtZW50QWN0aXZlKGVyciA/OiBhbnkpIHtcbiAgICAgICAgICAgIGlmIChERUJVR19QQVJBTExFTCkgY29uc29sZS5sb2coXCJwYXJhbGxlbDogZGVjcmVtZW50IGFjdGl2ZVwiKTtcbiAgICAgICAgICAgIGlmIChlcnIpIGNvbnNvbGUubG9nKFwicGFyYWxsZWwgZXJyb3I6XCIsIGVycik7XG4gICAgICAgICAgICBhY3RpdmVBbmltYXRpb25zIC0tO1xuICAgICAgICB9XG5cbiAgICAgICAgYW5pbWF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGFuaW1hdGlvbjogQW5pbWF0aW9uKSB7XG4gICAgICAgICAgICBhY3RpdmVBbmltYXRpb25zKys7XG4gICAgICAgICAgICBhbmltYXRpb24uYXR0YWNoKGF0dGFjaFBvaW50LnRhcE9uTmV4dCh0aWNrID0+IHRpY2suY3R4LnNhdmUoKSkpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgdGljayA9PiB0aWNrLmN0eC5yZXN0b3JlKCksXG4gICAgICAgICAgICAgICAgZGVjcmVtZW50QWN0aXZlLFxuICAgICAgICAgICAgICAgIGRlY3JlbWVudEFjdGl2ZSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHByZXYudGFrZVdoaWxlKCgpID0+IGFjdGl2ZUFuaW1hdGlvbnMgPiAwKS50YXBPbk5leHQoZnVuY3Rpb24odGljazogVGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19QQVJBTExFTCkgY29uc29sZS5sb2coXCJwYXJhbGxlbDogZW1pdHRpbmcsIGFuaW1hdGlvbnNcIiwgdGljayk7XG4gICAgICAgICAgICAgICAgYXR0YWNoUG9pbnQub25OZXh0KHRpY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19QQVJBTExFTCkgY29uc29sZS5sb2coXCJwYXJhbGxlbDogZW1pdHRpbmcgZmluaXNoZWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBQYXRoQW5pbWF0aW9uIGV4dGVuZHMgQW5pbWF0aW9uIHtcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xvbmUoXG4gICAgbjogbnVtYmVyLCAvLyB0b2RvIG1ha2UgZHluYW1pY1xuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBwYXJhbGxlbChSeC5PYnNlcnZhYmxlLnJldHVybihhbmltYXRpb24pLnJlcGVhdChuKSk7XG59XG5cbi8qKlxuICogVGhlIGNoaWxkIGFuaW1hdGlvbiBpcyBzdGFydGVkIGV2ZXJ5IGZyYW1lXG4gKiBAcGFyYW0gYW5pbWF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbWl0KFxuICAgIGFuaW1hdGlvbjogQW5pbWF0aW9uXG4pOiBBbmltYXRpb25cbntcbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocHJldjogVGlja1N0cmVhbSk6IFRpY2tTdHJlYW0ge1xuICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJlbWl0OiBpbml0aWFsaXppbmdcIik7XG4gICAgICAgIHZhciBhdHRhY2hQb2ludCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgcmV0dXJuIHByZXYudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfRU1JVCkgY29uc29sZS5sb2coXCJlbWl0OiBlbW1pdHRpbmdcIiwgYW5pbWF0aW9uKTtcbiAgICAgICAgICAgICAgICBhbmltYXRpb24uYXR0YWNoKGF0dGFjaFBvaW50KS5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICBhdHRhY2hQb2ludC5vbk5leHQodGljayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfSk7XG59XG5cblxuLyoqXG4gKiBXaGVuIHRoZSBjaGlsZCBsb29wIGZpbmlzaGVzLCBpdCBpcyBzcGF3bmVkXG4gKiBAcGFyYW0gYW5pbWF0aW9uXG4gKiBAcmV0dXJucyB7QW5pbWF0aW9ufVxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9vcChcbiAgICBhbmltYXRpb246IEFuaW1hdGlvblxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXY6IFRpY2tTdHJlYW0pOiBUaWNrU3RyZWFtIHtcbiAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogaW5pdGlhbGl6aW5nXCIpO1xuXG5cbiAgICAgICAgcmV0dXJuIFJ4Lk9ic2VydmFibGUuY3JlYXRlPFRpY2s+KGZ1bmN0aW9uKG9ic2VydmVyKSB7XG4gICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBjcmVhdGUgbmV3IGxvb3BcIik7XG4gICAgICAgICAgICB2YXIgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBsb29wU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICAgICAgICAgIHZhciB0ID0gMDtcblxuXG4gICAgICAgICAgICBmdW5jdGlvbiBhdHRhY2hMb29wKG5leHQpIHsgLy90b2RvIEkgZmVlbCBsaWtlIHdlIGNhbiByZW1vdmUgYSBsZXZlbCBmcm9tIHRoaXMgc29tZWhvd1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIHN0YXJ0aW5nIGF0XCIsIHQpO1xuXG4gICAgICAgICAgICAgICAgbG9vcFN0YXJ0ID0gbmV3IFJ4LlN1YmplY3Q8VGljaz4oKTtcbiAgICAgICAgICAgICAgICBsb29wU3Vic2NyaXB0aW9uID0gYW5pbWF0aW9uLmF0dGFjaChsb29wU3RhcnQpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIHRvIGRvd25zdHJlYW1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIGVyciB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgY29tcGxldGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbmV3IGlubmVyIGxvb3AgZmluaXNoZWQgY29uc3RydWN0aW9uXCIpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByZXYuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKG5leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvb3BTdGFydCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBubyBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0YWNoTG9vcChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiB1cHN0cmVhbSB0byBpbm5lciBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICBsb29wU3RhcnQub25OZXh0KG5leHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHQgKz0gbmV4dC5kdDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGVycil7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHVwc3RyZWFtIGVycm9yIHRvIGRvd25zdHJlYW1cIiwgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQuYmluZChvYnNlcnZlcilcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvL2Rpc3Bvc2VcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfTE9PUCkgY29uc29sZS5sb2coXCJsb29wOiBkaXNwb3NlXCIpO1xuICAgICAgICAgICAgICAgIGlmIChsb29wU3RhcnQpIGxvb3BTdGFydC5kaXNwb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgdHlwZSBDb25kaXRpb25BY3Rpb25QYWlyID0gW0Jvb2xlYW5BcmcsIEFuaW1hdGlvbl07XG5cblxuLyoqXG4gKiBBbiBpZiAoKSBlbGlmKCkgZWxzZSgpIGJsb2NrLiBUaGUgc2VtYW50aWNzIGFyZSBzdWJ0bGUgd2hlbiBjb25zaWRlcmluZyBhbmltYXRpb24gbGlmZWN5Y2xlcy5cbiAqIE9uZSBpbnRlcHJldGF0aW9uIGlzIHRoYXQgYW4gYWN0aW9uIGlzIHRyaWdnZXJlZCB1bnRpbCBjb21wbGV0aW9uLCBiZWZvcmUgcmVldmFsdWF0aW5nIHRoZSBjb25kaXRpb25zLiBIb3dldmVyLFxuICogYXMgbWFueSBhbmltYXRpb25zIGFyZSBpbmZpbml0ZSBpbiBsZW5ndGgsIHRoaXMgd291bGQgb25seSBldmVyIHNlbGVjdCBhIHNpbmdsZSBhbmltYXRpb24gcGF0aC5cbiAqIFNvIHJhdGhlciwgdGhpcyBibG9jayByZWV2YWx1YXRlcyB0aGUgY29uZGl0aW9uIGV2ZXJ5IG1lc3NhZ2UuIElmIGFuIGFjdGlvbiBjb21wbGV0ZXMsIHRoZSBibG9jayBwYXNzZXMgb24gdGhlIGNvbXBsZXRpb24sXG4gKiBhbmQgdGhlIHdob2xlIGNsYXVzZSBpcyBvdmVyLCBzbyBzdXJyb3VuZCBhY3Rpb24gYW5pbWF0aW9ucyB3aXRoIGxvb3AgaWYgeW91IGRvbid0IHdhbnQgdGhhdCBiZWhhdmlvdXIuXG4gKiBXaGVuZXZlciB0aGUgYWN0aXZlIGNsYXVzZSBjaGFuZ2VzLCB0aGUgbmV3IGFjdGl2ZSBhbmltYXRpb24gaXMgcmVpbml0aWFsaXNlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIElmIHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgY29uZGl0aW9uczogQ29uZGl0aW9uQWN0aW9uUGFpcltdLCBwdWJsaWMgcHJlY2VlZGluZzogQW5pbWF0aW9uID0gRW1wdHkpIHt9XG5cbiAgICBlbGlmKGNsYXVzZTpCb29sZWFuQXJnLCBhY3Rpb246IEFuaW1hdGlvbik6IElmIHtcbiAgICAgICAgdGhpcy5jb25kaXRpb25zLnB1c2goW2NsYXVzZSwgYWN0aW9uXSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGVuZGlmKCk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnByZWNlZWRpbmcucGlwZSh0aGlzLmVsc2UoRW1wdHkpKTtcbiAgICB9XG5cbiAgICBlbHNlKG90aGVyd2lzZTogQW5pbWF0aW9uKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHJlY2VlZGluZy5waXBlKG5ldyBBbmltYXRpb24oXG4gICAgICAgICAgICAodXBzdHJlYW06IFRpY2tTdHJlYW0pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfSUYpIGNvbnNvbGUubG9nKFwiSWY6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgICAgICB2YXIgZG93bnN0cmVhbSA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG4gICAgICAgICAgICAgICAgdmFyIGFuY2hvciA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudEFuaW1hdGlvbiA9IG90aGVyd2lzZTtcbiAgICAgICAgICAgICAgICB2YXIgYWN0aXZlU3Vic2NyaXB0aW9uID0gb3RoZXJ3aXNlLmF0dGFjaChhbmNob3IpLnN1YnNjcmliZShkb3duc3RyZWFtKTtcblxuXG4gICAgICAgICAgICAgICAgLy8gd2UgaW5pdGlhbGlzZSBhbGwgdGhlIGNvbmRpdGlvbiBwYXJhbWV0ZXJzXG4gICAgICAgICAgICAgICAgdmFyIGNvbmRpdGlvbnNfbmV4dCA9IHRoaXMuY29uZGl0aW9ucy5tYXAoXG4gICAgICAgICAgICAgICAgICAgIChjb25kaXRpb246IENvbmRpdGlvbkFjdGlvblBhaXIpID0+IFBhcmFtZXRlci5mcm9tKGNvbmRpdGlvblswXSkuaW5pdCgpXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIHZhciBmb3JrID0gdXBzdHJlYW0uc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICAodGljazogVGljaykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0lGKSBjb25zb2xlLmxvZyhcIklmOiB1cHN0cmVhbSB0aWNrXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlyc3QsIHdlIGZpbmQgd2hpY2ggYW5pbWF0aW9uIHNob3VsZCBhY3RpdmUsIGJ5IHVzaW5nIHRoZSBjb25kaXRpb25zIGFycmF5XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dEFjdGl2ZUFuaW1hdGlvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZGVhbGx5IHdlIHdvdWxkIHVzZSBmaW5kLCBidXQgdGhhdCBpcyBub3QgaW4gVFMgeWV0Li5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwIDtpIDwgdGhpcy5jb25kaXRpb25zLmxlbmd0aCAmJiBuZXh0QWN0aXZlQW5pbWF0aW9uID09IG51bGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb25kaXRpb25zX25leHRbaV0odGljay5jbG9jaykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGl2ZUFuaW1hdGlvbiA9IHRoaXMuY29uZGl0aW9uc1tpXVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dEFjdGl2ZUFuaW1hdGlvbiA9PSBudWxsKSBuZXh0QWN0aXZlQW5pbWF0aW9uID0gb3RoZXJ3aXNlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQobmV4dEFjdGl2ZUFuaW1hdGlvbiAhPSBudWxsLCBcImFuIGFuaW1hdGlvbiBzaG91bGQgYWx3YXlzIGJlIHNlbGVjdGVkIGluIGFuIGlmIGJsb2NrXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZWNvbmQsIHdlIHNlZSBpZiB0aGlzIGlzIHRoZSBzYW1lIGFzIHRoZSBjdXJyZW50IGFuaW1hdGlvbiwgb3Igd2hldGhlciB3ZSBoYXZlIHN3aXRjaGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dEFjdGl2ZUFuaW1hdGlvbiAhPSBjdXJyZW50QW5pbWF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBhIG5ldyBhbmltYXRpb24gYmVpbmcgc2VxdWVuY2VkLCBjYW5jZWwgdGhlIG9sZCBvbmUgYW5kIGFkZCBhIG5ldyBvbmVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfSUYpIGNvbnNvbGUubG9nKFwiSWY6IG5ldyBzdWJzY3JpcHRpb25cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGl2ZVN1YnNjcmlwdGlvbiAhPSBudWxsKSBhY3RpdmVTdWJzY3JpcHRpb24uZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZVN1YnNjcmlwdGlvbiA9IG5leHRBY3RpdmVBbmltYXRpb24uYXR0YWNoKGFuY2hvcikuc3Vic2NyaWJlKGRvd25zdHJlYW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRBbmltYXRpb24gPSBuZXh0QWN0aXZlQW5pbWF0aW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL3dlIGRvbid0IG5lZWQgdG8gZG8gYW55dGhpbmcgYmVjdWFzZSB0aGUgc3Vic2NyaXB0aW9uIGlzIGFscmVhZHkgc3RyZWFtIGRvd25zdHJlbVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYW5jaG9yLm9uTmV4dCh0aWNrKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZXJyID0+IGFuY2hvci5vbkVycm9yKGVyciksXG4gICAgICAgICAgICAgICAgICAgICgpID0+IGFuY2hvci5vbkNvbXBsZXRlZCgpXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkb3duc3RyZWFtLnRhcCh4ID0+IHtpZiAoREVCVUdfSUYpIGNvbnNvbGUubG9nKFwiSWY6IGRvd25zdHJlYW0gdGlja1wiKX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICApKVxuICAgIH1cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZHJhdyhcbiAgICBkcmF3RmFjdG9yeTogKCkgPT4gKCh0aWNrOiBUaWNrKSA9PiB2b2lkKVxuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oZnVuY3Rpb24gKHByZXZpb3VzOiBUaWNrU3RyZWFtKTogVGlja1N0cmVhbSB7XG4gICAgICAgIHZhciBkcmF3OiAodGljazogVGljaykgPT4gdm9pZCA9IGRyYXdGYWN0b3J5KCk7XG4gICAgICAgIHJldHVybiBwcmV2aW91cy50YXBPbk5leHQoZHJhdyk7XG4gICAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2xhdGUoXG4gICAgZGVsdGE6IFBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0cmFuc2xhdGU6IGF0dGFjaGVkXCIpO1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgcG9pbnRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGRlbHRhKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odGljaykge1xuICAgICAgICAgICAgICAgIHZhciBwb2ludCA9IHBvaW50X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zbGF0ZTpcIiwgcG9pbnQpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zbGF0ZShwb2ludFswXSwgcG9pbnRbMV0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aWNrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbihcbiAgICBjb21wb3NpdGVfbW9kZTogc3RyaW5nXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uOiBhdHRhY2hlZFwiKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbjogZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4Lmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiA9IGNvbXBvc2l0ZV9tb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gdmVsb2NpdHkoXG4gICAgdmVsb2NpdHk6IFBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidmVsb2NpdHk6IGF0dGFjaGVkXCIpO1xuICAgICAgICAgICAgdmFyIHBvczogUG9pbnQgPSBbMC4wLDAuMF07XG4gICAgICAgICAgICB2YXIgdmVsb2NpdHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHZlbG9jaXR5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odGljaykge1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybSgxLCAwLCAwLCAxLCBwb3NbMF0sIHBvc1sxXSk7XG4gICAgICAgICAgICAgICAgdmFyIHZlbG9jaXR5ID0gdmVsb2NpdHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBwb3NbMF0gKz0gdmVsb2NpdHlbMF0gKiB0aWNrLmR0O1xuICAgICAgICAgICAgICAgIHBvc1sxXSArPSB2ZWxvY2l0eVsxXSAqIHRpY2suZHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHdlZW5fbGluZWFyKFxuICAgIGZyb206IFBvaW50QXJnLFxuICAgIHRvOiAgIFBvaW50QXJnLFxuICAgIHRpbWU6IE51bWJlckFyZ1xuKTogQW5pbWF0aW9uXG57XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oXG4gICAgICAgICAgICBmdW5jdGlvbihwcmV2OiBUaWNrU3RyZWFtKTogVGlja1N0cmVhbSB7XG4gICAgICAgICAgICB2YXIgdCA9IDA7XG4gICAgICAgICAgICB2YXIgZnJvbV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZnJvbSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIHRvX25leHQgICA9IFBhcmFtZXRlci5mcm9tKHRvKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgdGltZV9uZXh0ICAgPSBQYXJhbWV0ZXIuZnJvbSh0aW1lKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gcHJldi5tYXAoZnVuY3Rpb24odGljazogVGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0d2VlbjogaW5uZXJcIik7XG4gICAgICAgICAgICAgICAgdmFyIGZyb20gPSBmcm9tX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIHRvICAgPSB0b19uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciB0aW1lID0gdGltZV9uZXh0KHRpY2suY2xvY2spO1xuICAgIFxuICAgICAgICAgICAgICAgIHQgPSB0ICsgdGljay5kdDtcbiAgICAgICAgICAgICAgICBpZiAodCA+IHRpbWUpIHQgPSB0aW1lO1xuICAgICAgICAgICAgICAgIHZhciB4ID0gZnJvbVswXSArICh0b1swXSAtIGZyb21bMF0pICogdCAvIHRpbWU7XG4gICAgICAgICAgICAgICAgdmFyIHkgPSBmcm9tWzFdICsgKHRvWzFdIC0gZnJvbVsxXSkgKiB0IC8gdGltZTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC50cmFuc2Zvcm0oMSwgMCwgMCwgMSwgeCwgeSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRpY2s7XG4gICAgICAgICAgICB9KS50YWtlV2hpbGUoZnVuY3Rpb24odGljaykge3JldHVybiB0IDwgdGltZTt9KVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbGxTdHlsZShcbiAgICBjb2xvcjogQ29sb3JBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmaWxsU3R5bGU6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBjb2xvcl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29sb3IpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBjb2xvciA9IGNvbG9yX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGxTdHlsZTogZmlsbFN0eWxlXCIsIGNvbG9yKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5maWxsU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cm9rZVN0eWxlKFxuICAgIGNvbG9yOiBDb2xvckFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZVN0eWxlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgY29sb3JfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGNvbG9yKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sb3IgPSBjb2xvcl9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzdHJva2VTdHlsZTogc3Ryb2tlU3R5bGVcIiwgY29sb3IpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnN0cm9rZVN0eWxlID0gY29sb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2hhZG93Q29sb3IoXG4gICAgY29sb3I6IENvbG9yQXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2hhZG93Q29sb3I6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBjb2xvcl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29sb3IpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBjb2xvciA9IGNvbG9yX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInNoYWRvd0NvbG9yOiBzaGFkb3dDb2xvclwiLCBjb2xvcik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc2hhZG93Q29sb3IgPSBjb2xvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5leHBvcnQgZnVuY3Rpb24gc2hhZG93Qmx1cihcbiAgICBsZXZlbDogTnVtYmVyQXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2hhZG93Qmx1cjogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGxldmVsX25leHQgPSBQYXJhbWV0ZXIuZnJvbShsZXZlbCkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxldmVsID0gbGV2ZWxfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2hhZG93Qmx1cjogc2hhZG93Qmx1clwiLCBsZXZlbCk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc2hhZG93Qmx1ciA9IGxldmVsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc2hhZG93T2Zmc2V0KFxuICAgIHh5OiBQb2ludEFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInNoYWRvd09mZnNldDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5ID0geHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2hhZG93T2Zmc2V0OiBzaGFkb3dCbHVyXCIsIHh5KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zaGFkb3dPZmZzZXRYID0geHlbMF07XG4gICAgICAgICAgICAgICAgdGljay5jdHguc2hhZG93T2Zmc2V0WSA9IHh5WzFdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpbmVDYXAoXG4gICAgc3R5bGU6IFN0cmluZ0FyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVDYXA6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmdfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHN0eWxlKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnID0gYXJnX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVDYXA6IGxpbmVDYXBcIiwgYXJnKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5saW5lQ2FwID0gYXJnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBsaW5lSm9pbihcbiAgICBzdHlsZTogU3RyaW5nQXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZUpvaW46IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmdfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHN0eWxlKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnID0gYXJnX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVKb2luOiBsaW5lQ2FwXCIsIGFyZyk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgubGluZUpvaW4gPSBhcmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGluZVdpZHRoKFxuICAgIHdpZHRoOiBOdW1iZXJBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJsaW5lV2lkdGg6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB3aWR0aF9uZXh0ID0gUGFyYW1ldGVyLmZyb20od2lkdGgpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciB3aWR0aCA9IHdpZHRoX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVXaWR0aDogbGluZVdpZHRoXCIsIHdpZHRoKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5saW5lV2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtaXRlckxpbWl0KFxuICAgIGxpbWl0OiBOdW1iZXJBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJtaXRlckxpbWl0OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnX25leHQgPSBQYXJhbWV0ZXIuZnJvbShsaW1pdCkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ19uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJtaXRlckxpbWl0OiBtaXRlckxpbWl0XCIsIGFyZyk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgubWl0ZXJMaW1pdCA9IGFyZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlY3QoXG4gICAgeHk6IFBvaW50QXJnLFxuICAgIHdpZHRoX2hlaWdodDogUG9pbnRBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJyZWN0OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgd2lkdGhfaGVpZ2h0X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh3aWR0aF9oZWlnaHQpLmluaXQoKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5OiBQb2ludCA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodDogUG9pbnQgPSB3aWR0aF9oZWlnaHRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwicmVjdDogcmVjdFwiLCB4eSwgd2lkdGhfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5yZWN0KHh5WzBdLCB4eVsxXSwgd2lkdGhfaGVpZ2h0WzBdLCB3aWR0aF9oZWlnaHRbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbGxSZWN0KFxuICAgIHh5OiBQb2ludEFyZyxcbiAgICB3aWR0aF9oZWlnaHQ6IFBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFJlY3Q6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB4eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHdpZHRoX2hlaWdodCkuaW5pdCgpO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHk6IFBvaW50ID0geHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgd2lkdGhfaGVpZ2h0OiBQb2ludCA9IHdpZHRoX2hlaWdodF9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmaWxsUmVjdDogZmlsbFJlY3RcIiwgeHksIHdpZHRoX2hlaWdodCk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguZmlsbFJlY3QoeHlbMF0sIHh5WzFdLCB3aWR0aF9oZWlnaHRbMF0sIHdpZHRoX2hlaWdodFsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3Ryb2tlUmVjdChcbiAgICB4eTogUG9pbnRBcmcsXG4gICAgd2lkdGhfaGVpZ2h0OiBQb2ludEFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZVJlY3Q6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB4eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHdpZHRoX2hlaWdodCkuaW5pdCgpO1xuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHk6IFBvaW50ID0geHlfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgd2lkdGhfaGVpZ2h0OiBQb2ludCA9IHdpZHRoX2hlaWdodF9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzdHJva2VSZWN0OiBzdHJva2VSZWN0XCIsIHh5LCB3aWR0aF9oZWlnaHQpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnN0cm9rZVJlY3QoeHlbMF0sIHh5WzFdLCB3aWR0aF9oZWlnaHRbMF0sIHdpZHRoX2hlaWdodFsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyUmVjdChcbiAgICB4eTogUG9pbnRBcmcsXG4gICAgd2lkdGhfaGVpZ2h0OiBQb2ludEFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImNsZWFyUmVjdDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodF9uZXh0ID0gUGFyYW1ldGVyLmZyb20od2lkdGhfaGVpZ2h0KS5pbml0KCk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eTogUG9pbnQgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHQ6IFBvaW50ID0gd2lkdGhfaGVpZ2h0X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImNsZWFyUmVjdDogY2xlYXJSZWN0XCIsIHh5LCB3aWR0aF9oZWlnaHQpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmNsZWFyUmVjdCh4eVswXSwgeHlbMV0sIHdpZHRoX2hlaWdodFswXSwgd2lkdGhfaGVpZ2h0WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhpblBhdGgoXG4gICAgaW5uZXI6IEFuaW1hdGlvblxuKTogUGF0aEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBQYXRoQW5pbWF0aW9uKFxuICAgICAgICAodXBzdHJlYW06IFRpY2tTdHJlYW0pID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ3aXRoaW5QYXRoOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYmVnaW5QYXRoQmVmb3JlSW5uZXIgPSB1cHN0cmVhbS50YXBPbk5leHQoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHRpY2s6IFRpY2spIHt0aWNrLmN0eC5iZWdpblBhdGgoKTt9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIGlubmVyLmF0dGFjaChiZWdpblBhdGhCZWZvcmVJbm5lcikudGFwT25OZXh0KFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7dGljay5jdHguY2xvc2VQYXRoKCk7fVxuICAgICAgICAgICAgKVxuICAgICAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cm9rZSgpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlOiBzdHJva2VcIik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc3Ryb2tlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsbCgpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGw6IGZpbGxcIik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguZmlsbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1vdmVUbyhcbiAgICB4eTogUG9pbnRBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJtb3ZlVG86IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB4eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eSA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcIm1vdmVUbzogbW92ZVRvXCIsIHh5KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5tb3ZlVG8oeHlbMF0sIHh5WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5lVG8oXG4gICAgeHk6IFBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZVRvOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHkgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJsaW5lVG86IGxpbmVUb1wiLCB4eSk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgubGluZVRvKHh5WzBdLCB4eVsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjbGlwKCk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJjbGlwOiBhdHRhY2hcIik7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiY2xpcDogY2xpcFwiKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5jbGlwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcXVhZHJhdGljQ3VydmVUbyhjb250cm9sOiBQb2ludEFyZywgZW5kOiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJxdWFkcmF0aWNDdXJ2ZVRvOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29udHJvbCkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGVuZCkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInF1YWRyYXRpY0N1cnZlVG86IHF1YWRyYXRpY0N1cnZlVG9cIiwgYXJnMSwgYXJnMik7XG4gICAgICAgICAgICAgICAgdGljay5jdHgucXVhZHJhdGljQ3VydmVUbyhhcmcxWzBdLCBhcmcxWzFdLCBhcmcyWzBdLCBhcmcyWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGJlemllckN1cnZlVG8gaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiZXppZXJDdXJ2ZVRvKGNvbnRyb2wxOiBQb2ludEFyZywgY29udHJvbDI6IFBvaW50QXJnLCBlbmQ6IFBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImJlemllckN1cnZlVG86IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjb250cm9sMSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGNvbnRyb2wyKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnM19uZXh0ID0gUGFyYW1ldGVyLmZyb20oZW5kKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMiA9IGFyZzJfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMyA9IGFyZzNfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYmV6aWVyQ3VydmVUbzogYmV6aWVyQ3VydmVUb1wiLCBhcmcxLCBhcmcyLCBhcmczKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5iZXppZXJDdXJ2ZVRvKGFyZzFbMF0sIGFyZzFbMV0sIGFyZzJbMF0sIGFyZzJbMV0sIGFyZzNbMF0sIGFyZzNbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgYXJjIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXJjKGNlbnRlcjogUG9pbnRBcmcsIHJhZGl1czogTnVtYmVyQXJnLFxuICAgIHJhZFN0YXJ0QW5nbGU6IE51bWJlckFyZywgcmFkRW5kQW5nbGU6IE51bWJlckFyZyxcbiAgICBjb3VudGVyY2xvY2t3aXNlPzogYm9vbGVhbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhcmM6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjZW50ZXIpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmcyX25leHQgPSBQYXJhbWV0ZXIuZnJvbShyYWRpdXMpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmczX25leHQgPSBQYXJhbWV0ZXIuZnJvbShyYWRTdGFydEFuZ2xlKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnNF9uZXh0ID0gUGFyYW1ldGVyLmZyb20ocmFkRW5kQW5nbGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmcyID0gYXJnMl9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmczID0gYXJnM19uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmc0ID0gYXJnNF9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhcmM6IGFyY1wiLCBhcmcxLCBhcmcyLCBhcmczLCBhcmc0KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5hcmMoYXJnMVswXSwgYXJnMVsxXSwgYXJnMiwgYXJnMywgYXJnNCwgY291bnRlcmNsb2Nrd2lzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuXG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGFyYyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFyY1RvKHRhbmdlbnQxOiBQb2ludEFyZywgdGFuZ2VudDI6IFBvaW50QXJnLCByYWRpdXM6IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhcmM6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbSh0YW5nZW50MSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHRhbmdlbnQyKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnM19uZXh0ID0gUGFyYW1ldGVyLmZyb20ocmFkaXVzKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMiA9IGFyZzJfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMyA9IGFyZzNfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYXJjOiBhcmNcIiwgYXJnMSwgYXJnMiwgYXJnMyk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguYXJjVG8oYXJnMVswXSwgYXJnMVsxXSwgYXJnMlswXSwgYXJnMlsxXSwgYXJnMyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuLyoqXG4gKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBzY2FsZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNjYWxlKHh5OiBQb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzY2FsZTogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2NhbGU6IHNjYWxlXCIsIGFyZzEpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnNjYWxlKGFyZzFbMF0sIGFyZzFbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igcm90YXRlIGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcm90YXRlKHJhZHM6IE51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJyb3RhdGU6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbShyYWRzKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwicm90YXRlOiByb3RhdGVcIiwgYXJnMSk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgucm90YXRlKGFyZzEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdHJhbnNsYXRlIGluIHRoZSBjYW52YXMgQVBJLlxuICogWyBhIGMgZVxuICogICBiIGQgZlxuICogICAwIDAgMSBdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2Zvcm0oYTogTnVtYmVyQXJnLCBiOiBOdW1iZXJBcmcsIGM6IE51bWJlckFyZyxcbiAgICAgICAgICBkOiBOdW1iZXJBcmcsIGU6IE51bWJlckFyZywgZjogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zZm9ybTogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGEpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmcyX25leHQgPSBQYXJhbWV0ZXIuZnJvbShiKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnM19uZXh0ID0gUGFyYW1ldGVyLmZyb20oYykuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGQpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmc1X25leHQgPSBQYXJhbWV0ZXIuZnJvbShlKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnNl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZikuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzMgPSBhcmczX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzQgPSBhcmc0X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzUgPSBhcmc1X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzYgPSBhcmc2X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zZm9ybTogdHJhbnNmb3JtXCIsIGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybShhcmcxLCBhcmcyLCBhcmczLCBhcmc0LCBhcmc1LCBhcmc2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNldFRyYW5zZm9ybSBpbiB0aGUgY2FudmFzIEFQSS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFRyYW5zZm9ybShhOiBOdW1iZXJBcmcsIGI6IE51bWJlckFyZywgYzogTnVtYmVyQXJnLFxuICAgICAgICAgICAgIGQ6IE51bWJlckFyZywgZTogTnVtYmVyQXJnLCBmOiBOdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2V0VHJhbnNmb3JtOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oYSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGIpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmczX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnNF9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZCkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzVfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGUpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmc2X25leHQgPSBQYXJhbWV0ZXIuZnJvbShmKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMiA9IGFyZzJfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMyA9IGFyZzNfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNCA9IGFyZzRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNSA9IGFyZzVfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNiA9IGFyZzZfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2V0VHJhbnNmb3JtOiBzZXRUcmFuc2Zvcm1cIiwgYXJnMSwgYXJnMiwgYXJnMywgYXJnNCwgYXJnNSwgYXJnNik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc2V0VHJhbnNmb3JtKGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgZm9udCBpbiB0aGUgY2FudmFzIEFQSS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvbnQoc3R5bGU6IFN0cmluZ0FyZyk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIGRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmb250OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmb250OiBmb250XCIsIGFyZzEpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZvbnQgPSBhcmcxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEFsaWduIGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dEFsaWduKHN0eWxlOiBTdHJpbmdBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidGV4dEFsaWduOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0ZXh0QWxpZ246IHRleHRBbGlnblwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC50ZXh0QWxpZ24gPSBhcmcxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEJhc2VsaW5lIGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdGV4dEJhc2VsaW5lKHN0eWxlOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidGV4dEJhc2VsaW5lOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0ZXh0QmFzZWxpbmU6IHRleHRCYXNlbGluZVwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC50ZXh0QmFzZWxpbmUgPSBhcmcxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cbi8qKlxuICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEJhc2VsaW5lIGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmlsbFRleHQodGV4dDogU3RyaW5nQXJnLCB4eTogUG9pbnRBcmcsIG1heFdpZHRoPzogTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGxUZXh0OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20odGV4dCkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnM19uZXh0ID0gbWF4V2lkdGggPyBQYXJhbWV0ZXIuZnJvbShtYXhXaWR0aCkuaW5pdCgpOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMiA9IGFyZzJfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMyA9IG1heFdpZHRoPyBhcmczX25leHQodGljay5jbG9jayk6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFRleHQ6IGZpbGxUZXh0XCIsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICAgICAgICAgICAgICAgIGlmIChtYXhXaWR0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aWNrLmN0eC5maWxsVGV4dChhcmcxLCBhcmcyWzBdLCBhcmcyWzBdLCBhcmczKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aWNrLmN0eC5maWxsVGV4dChhcmcxLCBhcmcyWzBdLCBhcmcyWzBdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xufVxuLyoqXG4gKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciB0ZXh0QmFzZWxpbmUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkcmF3SW1hZ2UoaW1nLCB4eTogUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZHJhd0ltYWdlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJkcmF3SW1hZ2U6IGRyYXdJbWFnZVwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5kcmF3SW1hZ2UoaW1nLCBhcmcxWzBdLCBhcmcxWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG59XG5cblxuLy8gZm9yZWdyb3VuZCBjb2xvciB1c2VkIHRvIGRlZmluZSBlbW1pdHRlciByZWdpb25zIGFyb3VuZCB0aGUgY2FudmFzXG4vLyAgdGhlIGh1ZSwgaXMgcmV1c2VkIGluIHRoZSBwYXJ0aWNsZXNcbi8vICB0aGUgbGlnaHRuZXNzIGlzIHVzZSB0byBkZXNjcmliZSB0aGUgcXVhbnRpdHkgKG1heCBsaWdodG5lc3MgbGVhZHMgdG8gdG90YWwgc2F0dXJhdGlvbilcbi8vXG4vLyB0aGUgYWRkaXRpb25hbCBwYXJhbWV0ZXIgaW50ZXNpdHkgaXMgdXNlZCB0byBzY2FsZSB0aGUgZW1taXRlcnNcbi8vIGdlbmVyYWxseSB0aGUgY29sb3JzIHlvdSBwbGFjZSBvbiB0aGUgbWFwIHdpbGwgYmUgZXhjZWVkZWQgYnkgdGhlIHNhdHVyYXRpb25cbi8vXG4vLyBIb3cgYXJlIHR3byBkaWZmZXJlbnQgaHVlcyBzZW5zaWJseSBtaXhlZFxuXG4vLyBkZWNheSBvZiAwLjVcbi8vXG4vLyAgICAgICBIXG4vLyAxIDIgNCA5IDQgMiAxICAgICAgIC8vc2F0LCBhbHNvIGFscGhhXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vICAgICAgICAgMSAyIDQgMiAxICAgLy9zYXRcbi8vICAgICAgICAgICAgIEgyXG4vL1xuLy8gd2UgYWRkIHRoZSBjb250cmlidXRpb24gdG8gYW4gaW1hZ2Ugc2l6ZWQgYWNjdW11bGF0b3Jcbi8vIGFzIHRoZSBjb250cmlidXRpb25zIG5lZWQgdG8gc3VtIHBlcm11dGF0aW9uIGluZGVwZW5kZW50bHkgKGFsc28gcHJvYmFibHkgYXNzb2NpYXRpdmUpXG4vLyBibGVuZChyZ2JhMSwgcmdiYTIpID0gYmxlbmQocmdiYTIscmdiYTEpXG4vLyBhbHBoYSA9IGExICsgYTIgLSBhMWEyXG4vLyBpZiBhMSA9IDEgICBhbmQgYTIgPSAxLCAgIGFscGhhID0gMSAgICAgICAgID0gMVxuLy8gaWYgYTEgPSAwLjUgYW5kIGEyID0gMSwgICBhbHBoYSA9IDEuNSAtIDAuNSA9IDFcbi8vIGlmIGExID0gMC41IGFuZCBhMiA9IDAuNSwgYWxwaGEgPSAxIC0gMC4yNSAgPSAwLjc1XG5cbi8vIE5vcm1hbCBibGVuZGluZyBkb2Vzbid0IGNvbW11dGU6XG4vLyByZWQgPSAocjEgKiBhMSAgKyAocjIgKiBhMikgKiAoMSAtIGExKSkgLyBhbHBoYVxuXG4vLyBsaWdodGVuIGRvZXMsIHdoaWNoIGlzIGp1c3QgdGhlIG1heFxuLy8gcmVkID0gbWF4KHIxLCByMilcbi8vIG9yIGFkZGl0aW9uIHJlZCA9IHIxICsgcjJcbi8vIGh0dHA6Ly93d3cuZGVlcHNreWNvbG9ycy5jb20vYXJjaGl2ZS8yMDEwLzA0LzIxL2Zvcm11bGFzLWZvci1QaG90b3Nob3AtYmxlbmRpbmctbW9kZXMuaHRtbFxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnbG93KFxuICAgIGRlY2F5OiBOdW1iZXJBcmcgPSAwLjFcbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBkcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICB2YXIgZGVjYXlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGRlY2F5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGljay5jdHg7XG5cbiAgICAgICAgICAgICAgICAvLyBvdXIgc3JjIHBpeGVsIGRhdGFcbiAgICAgICAgICAgICAgICB2YXIgd2lkdGggPSBjdHguY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgICAgIHZhciBoZWlnaHQgPSBjdHguY2FudmFzLmhlaWdodDtcbiAgICAgICAgICAgICAgICB2YXIgcGl4ZWxzID0gd2lkdGggKiBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgdmFyIGltZ0RhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsMCx3aWR0aCxoZWlnaHQpO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gaW1nRGF0YS5kYXRhO1xuICAgICAgICAgICAgICAgIHZhciBkZWNheSA9IGRlY2F5X25leHQodGljay5jbG9jayk7XG5cbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIm9yaWdpbmFsIGRhdGFcIiwgaW1nRGF0YS5kYXRhKVxuXG4gICAgICAgICAgICAgICAgLy8gb3VyIHRhcmdldCBkYXRhXG4gICAgICAgICAgICAgICAgLy8gdG9kbyBpZiB3ZSB1c2VkIGEgVHlwZWQgYXJyYXkgdGhyb3VnaG91dCB3ZSBjb3VsZCBzYXZlIHNvbWUgemVyb2luZyBhbmQgb3RoZXIgY3JhcHB5IGNvbnZlcnNpb25zXG4gICAgICAgICAgICAgICAgLy8gYWx0aG91Z2ggYXQgbGVhc3Qgd2UgYXJlIGNhbGN1bGF0aW5nIGF0IGEgaGlnaCBhY2N1cmFjeSwgbGV0cyBub3QgZG8gYSBieXRlIGFycmF5IGZyb20gdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICAgIHZhciBnbG93RGF0YTogbnVtYmVyW10gPSBuZXcgQXJyYXk8bnVtYmVyPihwaXhlbHMqNCk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBpeGVscyAqIDQ7IGkrKykgZ2xvd0RhdGFbaV0gPSAwO1xuXG4gICAgICAgICAgICAgICAgLy8gcGFzc2JhY2sgdG8gYXZvaWQgbG90cyBvZiBhcnJheSBhbGxvY2F0aW9ucyBpbiByZ2JUb0hzbCwgYW5kIGhzbFRvUmdiIGNhbGxzXG4gICAgICAgICAgICAgICAgdmFyIGhzbDogW251bWJlciwgbnVtYmVyLCBudW1iZXJdID0gWzAsMCwwXTtcbiAgICAgICAgICAgICAgICB2YXIgcmdiOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0gPSBbMCwwLDBdO1xuXG4gICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHRoZSBjb250cmlidXRpb24gb2YgZWFjaCBlbW1pdHRlciBvbiB0aGVpciBzdXJyb3VuZHNcbiAgICAgICAgICAgICAgICBmb3IodmFyIHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yKHZhciB4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWQgICA9IGRhdGFbKCh3aWR0aCAqIHkpICsgeCkgKiA0XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBncmVlbiA9IGRhdGFbKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmx1ZSAgPSBkYXRhWygod2lkdGggKiB5KSArIHgpICogNCArIDJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFscGhhID0gZGF0YVsoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAzXTtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjb252ZXJ0IHRvIGhzbFxuICAgICAgICAgICAgICAgICAgICAgICAgcmdiVG9Ic2wocmVkLCBncmVlbiwgYmx1ZSwgaHNsKTtcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBodWUgPSBoc2xbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcXR5ID0gaHNsWzFdOyAvLyBxdHkgZGVjYXlzXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbG9jYWxfZGVjYXkgPSBoc2xbMl0gKyAxO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3ZSBvbmx5IG5lZWQgdG8gY2FsY3VsYXRlIGEgY29udHJpYnV0aW9uIG5lYXIgdGhlIHNvdXJjZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29udHJpYnV0aW9uID0gcXR5IGRlY2F5aW5nIGJ5IGludmVyc2Ugc3F1YXJlIGRpc3RhbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjID0gcSAvIChkXjIgKiBrKSwgd2Ugd2FudCB0byBmaW5kIHRoZSBjIDwgMC4wMSBwb2ludFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gMC4wMSA9IHEgLyAoZF4yICogaykgPT4gZF4yID0gcSAvICgwLjAxICogaylcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGQgPSBzcXJ0KDEwMCAqIHEgLyBrKSAobm90ZSAyIHNvbHV0aW9ucywgcmVwcmVzZW50aW5nIHRoZSB0d28gaGFsZndpZHRocylcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYWxmd2lkdGggPSBNYXRoLnNxcnQoMTAwMCAqIHF0eSAvIChkZWNheSAqIGxvY2FsX2RlY2F5KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYWxmd2lkdGggKj0gMTAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxpID0gTWF0aC5tYXgoMCwgTWF0aC5mbG9vcih4IC0gaGFsZndpZHRoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdWkgPSBNYXRoLm1pbih3aWR0aCwgTWF0aC5jZWlsKHggKyBoYWxmd2lkdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsaiA9IE1hdGgubWF4KDAsIE1hdGguZmxvb3IoeSAtIGhhbGZ3aWR0aCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVqID0gTWF0aC5taW4oaGVpZ2h0LCBNYXRoLmNlaWwoeSArIGhhbGZ3aWR0aCkpO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaiA9IGxqOyBqIDwgdWo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IGxpOyBpIDwgdWk7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZHggPSBpIC0geDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGR5ID0gaiAtIHk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkX3NxdWFyZWQgPSBkeCAqIGR4ICsgZHkgKiBkeTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjIGlzIGluIHRoZSBzYW1lIHNjYWxlIGF0IHF0eSBpLmUuICgwIC0gMTAwLCBzYXR1cmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYyA9IChxdHkpIC8gKDEuMDAwMSArIE1hdGguc3FydChkX3NxdWFyZWQpICogZGVjYXkgKiBsb2NhbF9kZWNheSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGMgPD0gMTAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGMgPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJnYiA9IGhzbFRvUmdiKGh1ZSwgNTAsIGMsIHJnYik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJnYiA9IGh1c2wudG9SR0IoaHVlLCA1MCwgYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vZm9yICh2YXIgaHVzbGkgPSAwOyBodXNsaTwgMzsgaHVzbGkrKykgcmdiIFtodXNsaV0gKj0gMjU1O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY19hbHBoYSA9IGMgLyAxMDAuMDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcl9pID0gKCh3aWR0aCAqIGopICsgaSkgKiA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ19pID0gKCh3aWR0aCAqIGopICsgaSkgKiA0ICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJfaSA9ICgod2lkdGggKiBqKSArIGkpICogNCArIDI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhX2kgPSAoKHdpZHRoICogaikgKyBpKSAqIDQgKyAzO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicmdiXCIsIHJnYik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiY1wiLCBjKTtcblxuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHByZV9hbHBoYSA9IGdsb3dEYXRhW2FfaV07XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoY19hbHBoYSA8PSAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGNfYWxwaGEgPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChwcmVfYWxwaGEgPD0gMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChwcmVfYWxwaGEgPj0gMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYmxlbmQgYWxwaGEgZmlyc3QgaW50byBhY2N1bXVsYXRvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBnbG93RGF0YVthX2ldID0gZ2xvd0RhdGFbYV9pXSArIGNfYWxwaGEgLSBjX2FscGhhICogZ2xvd0RhdGFbYV9pXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ2xvd0RhdGFbYV9pXSA9IE1hdGgubWF4KGdsb3dEYXRhW2FfaV0sIGNfYWxwaGEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2FfaV0gPSAxO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVthX2ldIDw9IDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbYV9pXSA+PSAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW3JfaV0gPD0gMjU1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGdsb3dEYXRhW3JfaV0gPj0gMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVtnX2ldIDw9IDI1NSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydChnbG93RGF0YVtnX2ldID49IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbYl9pXSA8PSAyNTUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NlcnQoZ2xvd0RhdGFbYl9pXSA+PSAwKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gKHByZV9hbHBoYSArIHJnYlswXS8gMjU1LjAgLSBjX2FscGhhICogcmdiWzBdLyAyNTUuMCkgKiAyNTU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2dfaV0gPSAocHJlX2FscGhhICsgcmdiWzFdLyAyNTUuMCAtIGNfYWxwaGEgKiByZ2JbMV0vIDI1NS4wKSAqIDI1NTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbYl9pXSA9IChwcmVfYWxwaGEgKyByZ2JbMl0vIDI1NS4wIC0gY19hbHBoYSAqIHJnYlsyXS8gMjU1LjApICogMjU1O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwicG9zdC1hbHBoYVwiLCBnbG93RGF0YVthX2ldKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBub3cgc2ltcGxlIGxpZ2h0ZW5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gTWF0aC5tYXgocmdiWzBdLCBnbG93RGF0YVtyX2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IE1hdGgubWF4KHJnYlsxXSwgZ2xvd0RhdGFbZ19pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2JfaV0gPSBNYXRoLm1heChyZ2JbMl0sIGdsb3dEYXRhW2JfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1peCB0aGUgY29sb3JzIGxpa2UgcGlnbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdG90YWxfYWxwaGEgPSBjX2FscGhhICsgcHJlX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gKGNfYWxwaGEgKiByZ2JbMF0gKyBwcmVfYWxwaGEgKiBnbG93RGF0YVtyX2ldKSAvIHRvdGFsX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtnX2ldID0gKGNfYWxwaGEgKiByZ2JbMV0gKyBwcmVfYWxwaGEgKiBnbG93RGF0YVtnX2ldKSAvIHRvdGFsX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtiX2ldID0gKGNfYWxwaGEgKiByZ2JbMl0gKyBwcmVfYWxwaGEgKiBnbG93RGF0YVtiX2ldKSAvIHRvdGFsX2FscGhhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBSRUFMTFkgQ09PTCBFRkZFQ1RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbcl9pXSA9IHJnYlswXSArIGdsb3dEYXRhW3JfaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2dfaV0gPSByZ2JbMV0gKyBnbG93RGF0YVtnX2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtiX2ldID0gcmdiWzJdICsgZ2xvd0RhdGFbYl9pXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG93RGF0YVtyX2ldID0gTWF0aC5taW4ocmdiWzBdICsgZ2xvd0RhdGFbcl9pXSwgMjU1KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvd0RhdGFbZ19pXSA9IE1hdGgubWluKHJnYlsxXSArIGdsb3dEYXRhW2dfaV0sIDI1NSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb3dEYXRhW2JfaV0gPSBNYXRoLm1pbihyZ2JbMl0gKyBnbG93RGF0YVtiX2ldLCAyNTUpO1xuXG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoeCA8IDIgJiYgaiA9PSAyMCAmJiBpID09IDIwICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdsb3dEYXRhW3JfaV0gPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicHJlLWFscGhhXCIsIGdsb3dEYXRhW2FfaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkeFwiLCBkeCwgXCJkeVwiLCBkeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRfc3F1YXJlZFwiLCBkX3NxdWFyZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZWNheVwiLCBkZWNheSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImxvY2FsX2RlY2F5XCIsIGxvY2FsX2RlY2F5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY1wiLCBjKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY19hbHBoYVwiLCBjX2FscGhhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYV9pXCIsIGFfaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImh1ZVwiLCBodWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJxdHlcIiwgcXR5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmVkXCIsIHJlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImdyZWVuXCIsIGdyZWVuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiYmx1ZVwiLCBibHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwicmdiXCIsIHJnYik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImdsb3dEYXRhW3JfaV1cIiwgZ2xvd0RhdGFbcl9pXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImdsb3dcIiwgZ2xvd0RhdGEpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcihkYXRhLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgZm9yKHZhciB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcih2YXIgeCA9IDA7IHggPCB3aWR0aDsgeCsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcl9pID0gKCh3aWR0aCAqIHkpICsgeCkgKiA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdfaSA9ICgod2lkdGggKiB5KSArIHgpICogNCArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYl9pID0gKCh3aWR0aCAqIHkpICsgeCkgKiA0ICsgMjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhX2kgPSAoKHdpZHRoICogeSkgKyB4KSAqIDQgKyAzO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbcl9pXSA9IE1hdGguZmxvb3IoZ2xvd0RhdGFbcl9pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbZ19pXSA9IE1hdGguZmxvb3IoZ2xvd0RhdGFbZ19pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbYl9pXSA9IE1hdGguZmxvb3IoZ2xvd0RhdGFbYl9pXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZbYV9pXSA9IDI1NTsgLy9NYXRoLmZsb29yKGdsb3dEYXRhW2FfaV0gKiAyNTUpO1xuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyAodG9kbykgbWF5YmUgd2UgY2FuIHNwZWVkIGJvb3N0IHNvbWUgb2YgdGhpc1xuICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vaGFja3MubW96aWxsYS5vcmcvMjAxMS8xMi9mYXN0ZXItY2FudmFzLXBpeGVsLW1hbmlwdWxhdGlvbi13aXRoLXR5cGVkLWFycmF5cy9cblxuICAgICAgICAgICAgICAgIC8vZmluYWxseSBvdmVyd3JpdGUgdGhlIHBpeGVsIGRhdGEgd2l0aCB0aGUgYWNjdW11bGF0b3JcbiAgICAgICAgICAgICAgICAoPGFueT5pbWdEYXRhLmRhdGEpLnNldChuZXcgVWludDhDbGFtcGVkQXJyYXkoYnVmKSk7XG5cbiAgICAgICAgICAgICAgICBjdHgucHV0SW1hZ2VEYXRhKGltZ0RhdGEsIDAsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRha2UoXG4gICAgZnJhbWVzOiBudW1iZXJcbik6IEFuaW1hdGlvblxue1xuICAgIHJldHVybiBuZXcgQW5pbWF0aW9uKGZ1bmN0aW9uKHByZXY6IFRpY2tTdHJlYW0pOiBUaWNrU3RyZWFtIHtcbiAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRha2U6IGF0dGFjaFwiKTtcbiAgICAgICAgcmV0dXJuIHByZXYudGFrZShmcmFtZXMpO1xuICAgIH0pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlciwgcGF0aDogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgR0lGRW5jb2RlciA9IHJlcXVpcmUoJ2dpZmVuY29kZXInKTtcbiAgICB2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuXG5cbiAgICB2YXIgZW5jb2RlciA9IG5ldyBHSUZFbmNvZGVyKHdpZHRoLCBoZWlnaHQpO1xuICAgIGVuY29kZXIuY3JlYXRlUmVhZFN0cmVhbSgpXG4gICAgICAucGlwZShlbmNvZGVyLmNyZWF0ZVdyaXRlU3RyZWFtKHsgcmVwZWF0OiAxMDAwMCwgZGVsYXk6IDEwMCwgcXVhbGl0eTogMSB9KSlcbiAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHBhdGgpKTtcbiAgICBlbmNvZGVyLnN0YXJ0KCk7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAocGFyZW50OiBUaWNrU3RyZWFtKTogVGlja1N0cmVhbSB7XG4gICAgICAgIHJldHVybiBwYXJlbnQudGFwKFxuICAgICAgICAgICAgZnVuY3Rpb24odGljazogVGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzYXZlOiB3cm90ZSBmcmFtZVwiKTtcbiAgICAgICAgICAgICAgICBlbmNvZGVyLmFkZEZyYW1lKHRpY2suY3R4KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmVycm9yKFwic2F2ZTogbm90IHNhdmVkXCIsIHBhdGgpO30sXG4gICAgICAgICAgICBmdW5jdGlvbigpIHtjb25zb2xlLmxvZyhcInNhdmU6IHNhdmVkXCIsIHBhdGgpOyBlbmNvZGVyLmZpbmlzaCgpO31cbiAgICAgICAgKVxuICAgIH0pO1xufVxuXG5cbi8qKlxuICogQ29udmVydHMgYW4gUkdCIGNvbG9yIHZhbHVlIHRvIEhTTC4gQ29udmVyc2lvbiBmb3JtdWxhXG4gKiBhZGFwdGVkIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IU0xfY29sb3Jfc3BhY2UuXG4gKiBBc3N1bWVzIHIsIGcsIGFuZCBiIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMjU1XSBhbmRcbiAqIHJldHVybnMgaCwgcywgYW5kIGwgaW4gdGhlIHNldCBbMCwgMV0uXG4gKlxuICogQHBhcmFtICAgTnVtYmVyICByICAgICAgIFRoZSByZWQgY29sb3IgdmFsdWVcbiAqIEBwYXJhbSAgIE51bWJlciAgZyAgICAgICBUaGUgZ3JlZW4gY29sb3IgdmFsdWVcbiAqIEBwYXJhbSAgIE51bWJlciAgYiAgICAgICBUaGUgYmx1ZSBjb2xvciB2YWx1ZVxuICogQHJldHVybiAgQXJyYXkgICAgICAgICAgIFRoZSBIU0wgcmVwcmVzZW50YXRpb25cbiAqL1xuZnVuY3Rpb24gcmdiVG9Ic2wociwgZywgYiwgcGFzc2JhY2s6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSk6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJyZ2JUb0hzbDogaW5wdXRcIiwgciwgZywgYik7XG5cbiAgICByIC89IDI1NSwgZyAvPSAyNTUsIGIgLz0gMjU1O1xuICAgIHZhciBtYXggPSBNYXRoLm1heChyLCBnLCBiKSwgbWluID0gTWF0aC5taW4ociwgZywgYik7XG4gICAgdmFyIGgsIHMsIGwgPSAobWF4ICsgbWluKSAvIDI7XG5cbiAgICBpZihtYXggPT0gbWluKXtcbiAgICAgICAgaCA9IHMgPSAwOyAvLyBhY2hyb21hdGljXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGQgPSBtYXggLSBtaW47XG4gICAgICAgIHMgPSBsID4gMC41ID8gZCAvICgyIC0gbWF4IC0gbWluKSA6IGQgLyAobWF4ICsgbWluKTtcbiAgICAgICAgc3dpdGNoKG1heCl7XG4gICAgICAgICAgICBjYXNlIHI6IGggPSAoZyAtIGIpIC8gZCArIChnIDwgYiA/IDYgOiAwKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIGc6IGggPSAoYiAtIHIpIC8gZCArIDI7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBiOiBoID0gKHIgLSBnKSAvIGQgKyA0OyBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBoIC89IDY7XG4gICAgfVxuICAgIHBhc3NiYWNrWzBdID0gKGggKiAzNjApOyAgICAgICAvLyAwIC0gMzYwIGRlZ3JlZXNcbiAgICBwYXNzYmFja1sxXSA9IChzICogMTAwKTsgLy8gMCAtIDEwMCVcbiAgICBwYXNzYmFja1syXSA9IChsICogMTAwKTsgLy8gMCAtIDEwMCVcblxuICAgIC8vIGNvbnNvbGUubG9nKFwicmdiVG9Ic2w6IG91dHB1dFwiLCBwYXNzYmFjayk7XG5cbiAgICByZXR1cm4gcGFzc2JhY2s7XG59XG5cbi8qKlxuICogQ29udmVydHMgYW4gSFNMIGNvbG9yIHZhbHVlIHRvIFJHQi4gQ29udmVyc2lvbiBmb3JtdWxhXG4gKiBhZGFwdGVkIGZyb20gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9IU0xfY29sb3Jfc3BhY2UuXG4gKiBBc3N1bWVzIGgsIHMsIGFuZCBsIGFyZSBjb250YWluZWQgaW4gdGhlIHNldCBbMCwgMV0gYW5kXG4gKiByZXR1cm5zIHIsIGcsIGFuZCBiIGluIHRoZSBzZXQgWzAsIDI1NV0uXG4gKlxuICogQHBhcmFtICAgTnVtYmVyICBoICAgICAgIFRoZSBodWVcbiAqIEBwYXJhbSAgIE51bWJlciAgcyAgICAgICBUaGUgc2F0dXJhdGlvblxuICogQHBhcmFtICAgTnVtYmVyICBsICAgICAgIFRoZSBsaWdodG5lc3NcbiAqIEByZXR1cm4gIEFycmF5ICAgICAgICAgICBUaGUgUkdCIHJlcHJlc2VudGF0aW9uXG4gKi9cbmZ1bmN0aW9uIGhzbFRvUmdiKGgsIHMsIGwsIHBhc3NiYWNrOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0pOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl17XG4gICAgdmFyIHIsIGcsIGI7XG4gICAgLy8gY29uc29sZS5sb2coXCJoc2xUb1JnYiBpbnB1dDpcIiwgaCwgcywgbCk7XG5cbiAgICBoID0gaCAvIDM2MC4wO1xuICAgIHMgPSBzIC8gMTAwLjA7XG4gICAgbCA9IGwgLyAxMDAuMDtcblxuICAgIGlmKHMgPT0gMCl7XG4gICAgICAgIHIgPSBnID0gYiA9IGw7IC8vIGFjaHJvbWF0aWNcbiAgICB9ZWxzZXtcbiAgICAgICAgdmFyIGh1ZTJyZ2IgPSBmdW5jdGlvbiBodWUycmdiKHAsIHEsIHQpe1xuICAgICAgICAgICAgaWYodCA8IDApIHQgKz0gMTtcbiAgICAgICAgICAgIGlmKHQgPiAxKSB0IC09IDE7XG4gICAgICAgICAgICBpZih0IDwgMS82KSByZXR1cm4gcCArIChxIC0gcCkgKiA2ICogdDtcbiAgICAgICAgICAgIGlmKHQgPCAxLzIpIHJldHVybiBxO1xuICAgICAgICAgICAgaWYodCA8IDIvMykgcmV0dXJuIHAgKyAocSAtIHApICogKDIvMyAtIHQpICogNjtcbiAgICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBxID0gbCA8IDAuNSA/IGwgKiAoMSArIHMpIDogbCArIHMgLSBsICogcztcbiAgICAgICAgdmFyIHAgPSAyICogbCAtIHE7XG4gICAgICAgIHIgPSBodWUycmdiKHAsIHEsIGggKyAxLzMpO1xuICAgICAgICBnID0gaHVlMnJnYihwLCBxLCBoKTtcbiAgICAgICAgYiA9IGh1ZTJyZ2IocCwgcSwgaCAtIDEvMyk7XG4gICAgfVxuXG4gICAgcGFzc2JhY2tbMF0gPSByICogMjU1O1xuICAgIHBhc3NiYWNrWzFdID0gZyAqIDI1NTtcbiAgICBwYXNzYmFja1syXSA9IGIgKiAyNTU7XG5cbiAgICAvLyBjb25zb2xlLmxvZyhcImhzbFRvUmdiXCIsIHBhc3NiYWNrKTtcblxuICAgIHJldHVybiBwYXNzYmFjaztcbn1cblxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
