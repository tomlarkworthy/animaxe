var events =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/// <reference path="../types/canvas.d.ts" />
	var Ax = __webpack_require__(2);
	/**
	 * Convert animation coordinates (e.g. a coordinate of moveTo) to global canvas coordinates, cooeffecients are:
	 * [ a c e
	 *   b d f
	 *   0 0 1 ]
	 * This is basically just a matrix multiplication of the context.transform
	 */
	function animation2Canvas(canvas, a, b, c, d, e, f) {
	    var x = a * canvas[0] + c * canvas[1] + e;
	    var y = b * canvas[0] + d * canvas[1] + f;
	    return [x, y];
	}
	exports.animation2Canvas = animation2Canvas;
	/**
	 * Convert canvas coordinates (e.g. mouse position on canvas) to local animation coordinates, cooeffecients are:
	 * [ a c e
	 *   b d f
	 *   0 0 1 ]
	 *  This is basically just an inverse matrix multiplication of the context.transform
	 */
	function canvas2Animation(canvasCoord, a, b, c, d, e, f) {
	    // see http://stackoverflow.com/questions/10892267/html5-canvas-transformation-algorithm-finding-object-coordinates-after-applyin
	    var M = (a * d - b * c);
	    return animation2Canvas(canvasCoord, d / M, -b / M, -c / M, a / M, (c * f - d * e) / M, (b * e - a * f) / M);
	}
	exports.canvas2Animation = canvas2Animation;
	function canvas2AnimationUsingContext(canvasCoord, ctx) {
	    var tx = ctx.getTransform();
	    return canvas2Animation(canvasCoord, tx[0], tx[1], tx[3], tx[4], tx[6], tx[7]);
	}
	/**
	 * Objects of this type are passed through the tick pipeline, and encapsulate potentially many concurrent system events
	 * originating from the canvas DOM. These have to be intepreted by UI components to see if they hit
	 */
	var Events = (function () {
	    function Events() {
	        this.mousedowns = [];
	        this.mouseups = [];
	        this.mousemoves = [];
	        this.mouseenters = [];
	        this.mouseleaves = [];
	    }
	    //onmouseover: Ax.Point[] = []; to implement these we need to think about heirarchy in components
	    //onmouseout: Ax.Point[] = [];
	    /**
	     * clear all the events, done by animator at the end of a tick
	     */
	    Events.prototype.clear = function () {
	        this.mousedowns = [];
	        this.mouseups = [];
	        this.mousemoves = [];
	        this.mouseenters = [];
	        this.mouseleaves = [];
	    };
	    return Events;
	})();
	exports.Events = Events;
	var ComponentMouseEvents = (function () {
	    function ComponentMouseEvents(source) {
	        this.source = source;
	        this.mousedown = new Rx.Subject();
	        this.mouseup = new Rx.Subject();
	        this.mousemove = new Rx.Subject();
	        this.mouseenter = new Rx.Subject();
	        this.mouseleave = new Rx.Subject();
	    }
	    return ComponentMouseEvents;
	})();
	exports.ComponentMouseEvents = ComponentMouseEvents;
	/**
	 * returns an animation that can be pipelined after a path, which used canvas isPointInPath to detect if a mouse event has
	 * occured over the source animation
	 */
	function ComponentMouseEventHandler(events) {
	    return Ax.draw(function () {
	        var mouseIsOver = false;
	        return function (tick) {
	            function processSystemMouseEvents(sourceEvents, componentEventStream) {
	                sourceEvents.forEach(function (evt) {
	                    if (componentEventStream.hasObservers() && tick.ctx.isPointInPath(evt[0], evt[1])) {
	                        // we have to figure out the global position of this component, so the x and y
	                        // have to go backward through the transform matrix
	                        var localEvent = new AxMouseEvent(events.source, canvas2AnimationUsingContext(evt, tick.ctx), evt);
	                        componentEventStream.onNext(localEvent);
	                    }
	                });
	            }
	            function processSystemMouseMoveEvents(sourceMoveEvents, mousemoveStream, mouseenterStream, mouseleaveStream) {
	                sourceMoveEvents.forEach(function (evt) {
	                    if (mousemoveStream.hasObservers() || mouseenterStream.hasObservers() || mouseleaveStream.hasObservers()) {
	                        var pointInPath = tick.ctx.isPointInPath(evt[0], evt[1]);
	                        var localEvent = new AxMouseEvent(events.source, canvas2AnimationUsingContext(evt, tick.ctx), evt);
	                        if (mouseenterStream.hasObservers() && pointInPath && !mouseIsOver) {
	                            mouseenterStream.onNext(localEvent);
	                        }
	                        if (mousemoveStream.hasObservers() && pointInPath) {
	                            mousemoveStream.onNext(localEvent);
	                        }
	                        if (mouseleaveStream.hasObservers() && !pointInPath && mouseIsOver) {
	                            mouseleaveStream.onNext(localEvent);
	                        }
	                        mouseIsOver = pointInPath;
	                    }
	                });
	            }
	            processSystemMouseEvents(tick.events.mousedowns, events.mousedown);
	            processSystemMouseEvents(tick.events.mouseups, events.mouseup);
	            processSystemMouseMoveEvents(tick.events.mousemoves, events.mousemove, events.mouseenter, events.mouseleave);
	        };
	    });
	}
	exports.ComponentMouseEventHandler = ComponentMouseEventHandler;
	var AxMouseEvent = (function () {
	    function AxMouseEvent(source, animationCoord, canvasCoord) {
	        this.source = source;
	        this.animationCoord = animationCoord;
	        this.canvasCoord = canvasCoord;
	    }
	    return AxMouseEvent;
	})();
	exports.AxMouseEvent = AxMouseEvent;


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
	/// <reference path="../types/node.d.ts" />
	var Rx = __webpack_require__(3);
	var events = __webpack_require__(1);
	var Parameter = __webpack_require__(4);
	exports.DEBUG_LOOP = false;
	exports.DEBUG_THEN = false;
	exports.DEBUG_EMIT = false;
	exports.DEBUG_EVENTS = false;
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
	    var GIFEncoder = __webpack_require__(5);
	    var fs = __webpack_require__(32);
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


/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = Rx;

/***/ },
/* 4 */
/***/ function(module, exports) {

	exports.DEBUG = false;
	var Parameter = (function () {
	    /**
	     * Before a parameter is used, the enclosing animation must call init. This returns a function which
	     * can be used to find the value of the function for specific values of time.
	     */
	    function Parameter(init) {
	        this.init = init;
	    }
	    /**
	     * Before a parameter is used, the enclosing animation must call init. This returns a function which
	     * can be used to find the value of the function for specific values of time.
	     */
	    Parameter.prototype.init = function () { throw new Error('This method is abstract'); };
	    /**
	     * map the value of 'this' to a new parameter
	     */
	    Parameter.prototype.map = function (fn) {
	        var base = this;
	        return new Parameter(function () {
	            var base_next = base.init();
	            return function (t) {
	                return fn(base_next(t));
	            };
	        });
	    };
	    /**
	     * Returns a parameter whose value is forever the first value next picked from this.
	     * @returns {Parameter<T>}
	     */
	    Parameter.prototype.first = function () {
	        var self = this;
	        return new Parameter(function () {
	            var generate = true;
	            var next = self.init();
	            var value = null;
	            return function (clock) {
	                if (generate) {
	                    generate = false;
	                    value = next(clock);
	                }
	                // console.log("fixed: val from parameter", value);
	                return value;
	            };
	        });
	    };
	    return Parameter;
	})();
	exports.Parameter = Parameter;
	function from(source) {
	    if (typeof source.init == 'function')
	        return source;
	    else
	        return constant(source);
	}
	exports.from = from;
	function point(x, y) {
	    return new Parameter(function () {
	        var x_next = from(x).init();
	        var y_next = from(y).init();
	        return function (t) {
	            var result = [x_next(t), y_next(t)];
	            //if (DEBUG) console.log("point: next", result);
	            return result;
	        };
	    });
	}
	exports.point = point;
	function displaceT(displacement, value) {
	    return new Parameter(function () {
	        var dt_next = from(displacement).init();
	        var value_next = from(value).init();
	        return function (t) {
	            var dt = dt_next(t);
	            if (exports.DEBUG)
	                console.log("displaceT: ", dt);
	            return value_next(t + dt);
	        };
	    });
	}
	exports.displaceT = displaceT;
	/*
	    RGB between 0 and 255
	    a between 0 - 1
	 */
	function rgba(r, g, b, a) {
	    return new Parameter(function () {
	        var r_next = from(r).init();
	        var g_next = from(g).init();
	        var b_next = from(b).init();
	        var a_next = from(a).init();
	        return function (t) {
	            var r_val = Math.floor(r_next(t));
	            var g_val = Math.floor(g_next(t));
	            var b_val = Math.floor(b_next(t));
	            var a_val = a_next(t);
	            var val = "rgba(" + r_val + "," + g_val + "," + b_val + "," + a_val + ")";
	            if (exports.DEBUG)
	                console.log("color: ", val);
	            return val;
	        };
	    });
	}
	exports.rgba = rgba;
	function hsl(h, s, l) {
	    return new Parameter(function () {
	        var h_next = from(h).init();
	        var s_next = from(s).init();
	        var l_next = from(l).init();
	        return function (t) {
	            var h_val = Math.floor(h_next(t));
	            var s_val = Math.floor(s_next(t));
	            var l_val = Math.floor(l_next(t));
	            var val = "hsl(" + h_val + "," + s_val + "%," + l_val + "%)";
	            // if (DEBUG) console.log("hsl: ", val);
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
	function constant(val) {
	    return new Parameter(function () { return function (t) {
	        return val;
	    }; });
	}
	exports.constant = constant;
	function rndNormal(scale) {
	    if (scale === void 0) { scale = 1; }
	    return new Parameter(function () {
	        if (exports.DEBUG)
	            console.log("rndNormal: init");
	        var scale_next = from(scale).init();
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
	            if (exports.DEBUG)
	                console.log("rndNormal: val", val);
	            return val;
	        };
	    });
	}
	exports.rndNormal = rndNormal;
	//todo: should be t as a parameter to a non tempor
	function sin(period) {
	    if (exports.DEBUG)
	        console.log("sin: new");
	    return new Parameter(function () {
	        var period_next = from(period).init();
	        return function (t) {
	            var value = Math.sin(t * (Math.PI * 2) / period_next(t));
	            if (exports.DEBUG)
	                console.log("sin: tick", t, value);
	            return value;
	        };
	    });
	}
	exports.sin = sin;
	function cos(period) {
	    if (exports.DEBUG)
	        console.log("cos: new");
	    return new Parameter(function () {
	        var period_next = from(period).init();
	        return function (t) {
	            var value = Math.cos(t * (Math.PI * 2) / period_next(t));
	            if (exports.DEBUG)
	                console.log("cos: tick", t, value);
	            return value;
	        };
	    });
	}
	exports.cos = cos;


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(6);


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {/*
	  GIFEncoder.js

	  Authors
	  Kevin Weiner (original Java version - kweiner@fmsware.com)
	  Thibault Imbert (AS3 version - bytearray.org)
	  Johan Nordberg (JS version - code@johan-nordberg.com)
	  Eugene Ware (node.js streaming version - eugene@noblesmaurai.com)
	*/

	var stream = __webpack_require__(11);
	var NeuQuant = __webpack_require__(30);
	var LZWEncoder = __webpack_require__(31);

	function ByteArray() {
	  this.data = [];
	}

	ByteArray.prototype.getData = function() {
	  return new Buffer(this.data);
	};

	ByteArray.prototype.writeByte = function(val) {
	  this.data.push(val);
	};

	ByteArray.prototype.writeUTFBytes = function(string) {
	  for (var l = string.length, i = 0; i < l; i++)
	    this.writeByte(string.charCodeAt(i));
	};

	ByteArray.prototype.writeBytes = function(array, offset, length) {
	  for (var l = length || array.length, i = offset || 0; i < l; i++)
	    this.writeByte(array[i]);
	};

	function GIFEncoder(width, height) {
	  // image size
	  this.width = ~~width;
	  this.height = ~~height;

	  // transparent color if given
	  this.transparent = null;

	  // transparent index in color table
	  this.transIndex = 0;

	  // -1 = no repeat, 0 = forever. anything else is repeat count
	  this.repeat = -1;

	  // frame delay (hundredths)
	  this.delay = 0;

	  this.image = null; // current frame
	  this.pixels = null; // BGR byte array from frame
	  this.indexedPixels = null; // converted frame indexed to palette
	  this.colorDepth = null; // number of bit planes
	  this.colorTab = null; // RGB palette
	  this.usedEntry = new Array(); // active palette entries
	  this.palSize = 7; // color table size (bits-1)
	  this.dispose = -1; // disposal code (-1 = use default)
	  this.firstFrame = true;
	  this.sample = 10; // default sample interval for quantizer

	  this.started = false; // started encoding

	  this.readStreams = [];

	  this.out = new ByteArray();
	}

	GIFEncoder.prototype.createReadStream = function (rs) {
	  if (!rs) {
	    rs = new stream.Readable();
	    rs._read = function () {};
	  }
	  this.readStreams.push(rs);
	  return rs;
	};

	GIFEncoder.prototype.createWriteStream = function (options) {
	  var self = this;
	  if (options) {
	    Object.keys(options).forEach(function (option) {
	      var fn = 'set' + option[0].toUpperCase() + option.substr(1);
	      if (~['setDelay', 'setFrameRate', 'setDispose', 'setRepeat',
	           'setTransparent', 'setQuality'].indexOf(fn)) {
	        self[fn].call(self, options[option]);
	      }
	    });
	  }

	  var ws = new stream.Duplex({ objectMode: true });
	  ws._read = function () {};
	  this.createReadStream(ws);

	  var self = this;
	  ws._write = function (data, enc, next) {
	    if (!self.started) self.start();
	    self.addFrame(data);
	    next();
	  };
	  var end = ws.end;
	  ws.end = function () {
	    end.apply(ws, [].slice.call(arguments));
	    self.finish();
	  };
	  return ws;
	};

	GIFEncoder.prototype.emit = function() {
	  var self = this;
	  if (this.readStreams.length === 0) return;
	  if (this.out.data.length) {
	    this.readStreams.forEach(function (rs) {
	      rs.push(new Buffer(self.out.data));
	    });
	    this.out.data = [];
	  }
	};

	GIFEncoder.prototype.end = function() {
	  if (this.readStreams.length === null) return;
	  this.emit();
	  this.readStreams.forEach(function (rs) {
	    rs.push(null);
	  });
	  this.readStreams = [];
	};

	/*
	  Sets the delay time between each frame, or changes it for subsequent frames
	  (applies to the next frame added)
	*/
	GIFEncoder.prototype.setDelay = function(milliseconds) {
	  this.delay = Math.round(milliseconds / 10);
	};

	/*
	  Sets frame rate in frames per second.
	*/
	GIFEncoder.prototype.setFrameRate = function(fps) {
	  this.delay = Math.round(100 / fps);
	};

	/*
	  Sets the GIF frame disposal code for the last added frame and any
	  subsequent frames.

	  Default is 0 if no transparent color has been set, otherwise 2.
	*/
	GIFEncoder.prototype.setDispose = function(disposalCode) {
	  if (disposalCode >= 0) this.dispose = disposalCode;
	};

	/*
	  Sets the number of times the set of GIF frames should be played.

	  -1 = play once
	  0 = repeat indefinitely

	  Default is -1

	  Must be invoked before the first image is added
	*/

	GIFEncoder.prototype.setRepeat = function(repeat) {
	  this.repeat = repeat;
	};

	/*
	  Sets the transparent color for the last added frame and any subsequent
	  frames. Since all colors are subject to modification in the quantization
	  process, the color in the final palette for each frame closest to the given
	  color becomes the transparent color for that frame. May be set to null to
	  indicate no transparent color.
	*/
	GIFEncoder.prototype.setTransparent = function(color) {
	  this.transparent = color;
	};

	/*
	  Adds next GIF frame. The frame is not written immediately, but is
	  actually deferred until the next frame is received so that timing
	  data can be inserted.  Invoking finish() flushes all frames.
	*/
	GIFEncoder.prototype.addFrame = function(imageData) {
	  // HTML Canvas 2D Context Passed In
	  if (imageData && imageData.getImageData) {
	    this.image = imageData.getImageData(0, 0, this.width, this.height).data;
	  } else {
	    this.image = imageData;
	  }

	  this.getImagePixels(); // convert to correct format if necessary
	  this.analyzePixels(); // build color table & map pixels

	  if (this.firstFrame) {
	    this.writeLSD(); // logical screen descriptior
	    this.writePalette(); // global color table
	    if (this.repeat >= 0) {
	      // use NS app extension to indicate reps
	      this.writeNetscapeExt();
	    }
	  }

	  this.writeGraphicCtrlExt(); // write graphic control extension
	  this.writeImageDesc(); // image descriptor
	  if (!this.firstFrame) this.writePalette(); // local color table
	  this.writePixels(); // encode and write pixel data

	  this.firstFrame = false;
	  this.emit();
	};

	/*
	  Adds final trailer to the GIF stream, if you don't call the finish method
	  the GIF stream will not be valid.
	*/
	GIFEncoder.prototype.finish = function() {
	  this.out.writeByte(0x3b); // gif trailer
	  this.end();
	};

	/*
	  Sets quality of color quantization (conversion of images to the maximum 256
	  colors allowed by the GIF specification). Lower values (minimum = 1)
	  produce better colors, but slow processing significantly. 10 is the
	  default, and produces good color mapping at reasonable speeds. Values
	  greater than 20 do not yield significant improvements in speed.
	*/
	GIFEncoder.prototype.setQuality = function(quality) {
	  if (quality < 1) quality = 1;
	  this.sample = quality;
	};

	/*
	  Writes GIF file header
	*/
	GIFEncoder.prototype.start = function() {
	  this.out.writeUTFBytes("GIF89a");
	  this.started = true;
	  this.emit();
	};

	/*
	  Analyzes current frame colors and creates color map.
	*/
	GIFEncoder.prototype.analyzePixels = function() {
	  var len = this.pixels.length;
	  var nPix = len / 3;

	  this.indexedPixels = new Uint8Array(nPix);

	  var imgq = new NeuQuant(this.pixels, this.sample);
	  imgq.buildColormap(); // create reduced palette
	  this.colorTab = imgq.getColormap();

	  // map image pixels to new palette
	  var k = 0;
	  for (var j = 0; j < nPix; j++) {
	    var index = imgq.lookupRGB(
	      this.pixels[k++] & 0xff,
	      this.pixels[k++] & 0xff,
	      this.pixels[k++] & 0xff
	    );
	    this.usedEntry[index] = true;
	    this.indexedPixels[j] = index;
	  }

	  this.pixels = null;
	  this.colorDepth = 8;
	  this.palSize = 7;

	  // get closest match to transparent color if specified
	  if (this.transparent !== null) {
	    this.transIndex = this.findClosest(this.transparent);
	  }
	};

	/*
	  Returns index of palette color closest to c
	*/
	GIFEncoder.prototype.findClosest = function(c) {
	  if (this.colorTab === null) return -1;

	  var r = (c & 0xFF0000) >> 16;
	  var g = (c & 0x00FF00) >> 8;
	  var b = (c & 0x0000FF);
	  var minpos = 0;
	  var dmin = 256 * 256 * 256;
	  var len = this.colorTab.length;

	  for (var i = 0; i < len;) {
	    var dr = r - (this.colorTab[i++] & 0xff);
	    var dg = g - (this.colorTab[i++] & 0xff);
	    var db = b - (this.colorTab[i] & 0xff);
	    var d = dr * dr + dg * dg + db * db;
	    var index = i / 3;
	    if (this.usedEntry[index] && (d < dmin)) {
	      dmin = d;
	      minpos = index;
	    }
	    i++;
	  }

	  return minpos;
	};

	/*
	  Extracts image pixels into byte array pixels
	  (removes alphachannel from canvas imagedata)
	*/
	GIFEncoder.prototype.getImagePixels = function() {
	  var w = this.width;
	  var h = this.height;
	  this.pixels = new Uint8Array(w * h * 3);

	  var data = this.image;
	  var count = 0;

	  for (var i = 0; i < h; i++) {
	    for (var j = 0; j < w; j++) {
	      var b = (i * w * 4) + j * 4;
	      this.pixels[count++] = data[b];
	      this.pixels[count++] = data[b+1];
	      this.pixels[count++] = data[b+2];
	    }
	  }
	};

	/*
	  Writes Graphic Control Extension
	*/
	GIFEncoder.prototype.writeGraphicCtrlExt = function() {
	  this.out.writeByte(0x21); // extension introducer
	  this.out.writeByte(0xf9); // GCE label
	  this.out.writeByte(4); // data block size

	  var transp, disp;
	  if (this.transparent === null) {
	    transp = 0;
	    disp = 0; // dispose = no action
	  } else {
	    transp = 1;
	    disp = 2; // force clear if using transparent color
	  }

	  if (this.dispose >= 0) {
	    disp = this.dispose & 7; // user override
	  }
	  disp <<= 2;

	  // packed fields
	  this.out.writeByte(
	    0 | // 1:3 reserved
	    disp | // 4:6 disposal
	    0 | // 7 user input - 0 = none
	    transp // 8 transparency flag
	  );

	  this.writeShort(this.delay); // delay x 1/100 sec
	  this.out.writeByte(this.transIndex); // transparent color index
	  this.out.writeByte(0); // block terminator
	};

	/*
	  Writes Image Descriptor
	*/
	GIFEncoder.prototype.writeImageDesc = function() {
	  this.out.writeByte(0x2c); // image separator
	  this.writeShort(0); // image position x,y = 0,0
	  this.writeShort(0);
	  this.writeShort(this.width); // image size
	  this.writeShort(this.height);

	  // packed fields
	  if (this.firstFrame) {
	    // no LCT - GCT is used for first (or only) frame
	    this.out.writeByte(0);
	  } else {
	    // specify normal LCT
	    this.out.writeByte(
	      0x80 | // 1 local color table 1=yes
	      0 | // 2 interlace - 0=no
	      0 | // 3 sorted - 0=no
	      0 | // 4-5 reserved
	      this.palSize // 6-8 size of color table
	    );
	  }
	};

	/*
	  Writes Logical Screen Descriptor
	*/
	GIFEncoder.prototype.writeLSD = function() {
	  // logical screen size
	  this.writeShort(this.width);
	  this.writeShort(this.height);

	  // packed fields
	  this.out.writeByte(
	    0x80 | // 1 : global color table flag = 1 (gct used)
	    0x70 | // 2-4 : color resolution = 7
	    0x00 | // 5 : gct sort flag = 0
	    this.palSize // 6-8 : gct size
	  );

	  this.out.writeByte(0); // background color index
	  this.out.writeByte(0); // pixel aspect ratio - assume 1:1
	};

	/*
	  Writes Netscape application extension to define repeat count.
	*/
	GIFEncoder.prototype.writeNetscapeExt = function() {
	  this.out.writeByte(0x21); // extension introducer
	  this.out.writeByte(0xff); // app extension label
	  this.out.writeByte(11); // block size
	  this.out.writeUTFBytes('NETSCAPE2.0'); // app id + auth code
	  this.out.writeByte(3); // sub-block size
	  this.out.writeByte(1); // loop sub-block id
	  this.writeShort(this.repeat); // loop count (extra iterations, 0=repeat forever)
	  this.out.writeByte(0); // block terminator
	};

	/*
	  Writes color table
	*/
	GIFEncoder.prototype.writePalette = function() {
	  this.out.writeBytes(this.colorTab);
	  var n = (3 * 256) - this.colorTab.length;
	  for (var i = 0; i < n; i++)
	    this.out.writeByte(0);
	};

	GIFEncoder.prototype.writeShort = function(pValue) {
	  this.out.writeByte(pValue & 0xFF);
	  this.out.writeByte((pValue >> 8) & 0xFF);
	};

	/*
	  Encodes and writes pixel data
	*/
	GIFEncoder.prototype.writePixels = function() {
	  var enc = new LZWEncoder(this.width, this.height, this.indexedPixels, this.colorDepth);
	  enc.encode(this.out);
	};

	module.exports = GIFEncoder;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(7).Buffer))

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer, global) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
	/* eslint-disable no-proto */

	var base64 = __webpack_require__(8)
	var ieee754 = __webpack_require__(9)
	var isArray = __webpack_require__(10)

	exports.Buffer = Buffer
	exports.SlowBuffer = SlowBuffer
	exports.INSPECT_MAX_BYTES = 50
	Buffer.poolSize = 8192 // not used by this implementation

	var rootParent = {}

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Due to various browser bugs, sometimes the Object implementation will be used even
	 * when the browser supports typed arrays.
	 *
	 * Note:
	 *
	 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
	 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
	 *     on objects.
	 *
	 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *     incorrect length in some situations.

	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
	 * get the Object implementation, which is slower but behaves correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
	  ? global.TYPED_ARRAY_SUPPORT
	  : typedArraySupport()

	function typedArraySupport () {
	  function Bar () {}
	  try {
	    var arr = new Uint8Array(1)
	    arr.foo = function () { return 42 }
	    arr.constructor = Bar
	    return arr.foo() === 42 && // typed array instances can be augmented
	        arr.constructor === Bar && // constructor can be set
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	}

	function kMaxLength () {
	  return Buffer.TYPED_ARRAY_SUPPORT
	    ? 0x7fffffff
	    : 0x3fffffff
	}

	/**
	 * Class: Buffer
	 * =============
	 *
	 * The Buffer constructor returns instances of `Uint8Array` that are augmented
	 * with function properties for all the node `Buffer` API functions. We use
	 * `Uint8Array` so that square bracket notation works as expected -- it returns
	 * a single octet.
	 *
	 * By augmenting the instances, we can avoid modifying the `Uint8Array`
	 * prototype.
	 */
	function Buffer (arg) {
	  if (!(this instanceof Buffer)) {
	    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
	    if (arguments.length > 1) return new Buffer(arg, arguments[1])
	    return new Buffer(arg)
	  }

	  this.length = 0
	  this.parent = undefined

	  // Common case.
	  if (typeof arg === 'number') {
	    return fromNumber(this, arg)
	  }

	  // Slightly less common case.
	  if (typeof arg === 'string') {
	    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
	  }

	  // Unusual.
	  return fromObject(this, arg)
	}

	function fromNumber (that, length) {
	  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < length; i++) {
	      that[i] = 0
	    }
	  }
	  return that
	}

	function fromString (that, string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

	  // Assumption: byteLength() return value is always < kMaxLength.
	  var length = byteLength(string, encoding) | 0
	  that = allocate(that, length)

	  that.write(string, encoding)
	  return that
	}

	function fromObject (that, object) {
	  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

	  if (isArray(object)) return fromArray(that, object)

	  if (object == null) {
	    throw new TypeError('must start with number, buffer, array or string')
	  }

	  if (typeof ArrayBuffer !== 'undefined') {
	    if (object.buffer instanceof ArrayBuffer) {
	      return fromTypedArray(that, object)
	    }
	    if (object instanceof ArrayBuffer) {
	      return fromArrayBuffer(that, object)
	    }
	  }

	  if (object.length) return fromArrayLike(that, object)

	  return fromJsonObject(that, object)
	}

	function fromBuffer (that, buffer) {
	  var length = checked(buffer.length) | 0
	  that = allocate(that, length)
	  buffer.copy(that, 0, 0, length)
	  return that
	}

	function fromArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Duplicate of fromArray() to keep fromArray() monomorphic.
	function fromTypedArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  // Truncating the elements is probably not what people expect from typed
	  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
	  // of the old Buffer constructor.
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	function fromArrayBuffer (that, array) {
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    array.byteLength
	    that = Buffer._augment(new Uint8Array(array))
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that = fromTypedArray(that, new Uint8Array(array))
	  }
	  return that
	}

	function fromArrayLike (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
	// Returns a zero-length buffer for inputs that don't conform to the spec.
	function fromJsonObject (that, object) {
	  var array
	  var length = 0

	  if (object.type === 'Buffer' && isArray(object.data)) {
	    array = object.data
	    length = checked(array.length) | 0
	  }
	  that = allocate(that, length)

	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	if (Buffer.TYPED_ARRAY_SUPPORT) {
	  Buffer.prototype.__proto__ = Uint8Array.prototype
	  Buffer.__proto__ = Uint8Array
	}

	function allocate (that, length) {
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = Buffer._augment(new Uint8Array(length))
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that.length = length
	    that._isBuffer = true
	  }

	  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
	  if (fromPool) that.parent = rootParent

	  return that
	}

	function checked (length) {
	  // Note: cannot use `length < kMaxLength` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= kMaxLength()) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (subject, encoding) {
	  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

	  var buf = new Buffer(subject, encoding)
	  delete buf.parent
	  return buf
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function compare (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError('Arguments must be Buffers')
	  }

	  if (a === b) return 0

	  var x = a.length
	  var y = b.length

	  var i = 0
	  var len = Math.min(x, y)
	  while (i < len) {
	    if (a[i] !== b[i]) break

	    ++i
	  }

	  if (i !== len) {
	    x = a[i]
	    y = b[i]
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'binary':
	    case 'base64':
	    case 'raw':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function concat (list, length) {
	  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

	  if (list.length === 0) {
	    return new Buffer(0)
	  }

	  var i
	  if (length === undefined) {
	    length = 0
	    for (i = 0; i < list.length; i++) {
	      length += list[i].length
	    }
	  }

	  var buf = new Buffer(length)
	  var pos = 0
	  for (i = 0; i < list.length; i++) {
	    var item = list[i]
	    item.copy(buf, pos)
	    pos += item.length
	  }
	  return buf
	}

	function byteLength (string, encoding) {
	  if (typeof string !== 'string') string = '' + string

	  var len = string.length
	  if (len === 0) return 0

	  // Use a for loop to avoid recursion
	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'binary':
	      // Deprecated
	      case 'raw':
	      case 'raws':
	        return len
	      case 'utf8':
	      case 'utf-8':
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) return utf8ToBytes(string).length // assume utf8
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}
	Buffer.byteLength = byteLength

	// pre-set for values that may exist in the future
	Buffer.prototype.length = undefined
	Buffer.prototype.parent = undefined

	function slowToString (encoding, start, end) {
	  var loweredCase = false

	  start = start | 0
	  end = end === undefined || end === Infinity ? this.length : end | 0

	  if (!encoding) encoding = 'utf8'
	  if (start < 0) start = 0
	  if (end > this.length) end = this.length
	  if (end <= start) return ''

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'binary':
	        return binarySlice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toString = function toString () {
	  var length = this.length | 0
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	}

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function inspect () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max) str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function compare (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return 0
	  return Buffer.compare(this, b)
	}

	Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
	  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
	  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
	  byteOffset >>= 0

	  if (this.length === 0) return -1
	  if (byteOffset >= this.length) return -1

	  // Negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

	  if (typeof val === 'string') {
	    if (val.length === 0) return -1 // special case: looking for empty string always fails
	    return String.prototype.indexOf.call(this, val, byteOffset)
	  }
	  if (Buffer.isBuffer(val)) {
	    return arrayIndexOf(this, val, byteOffset)
	  }
	  if (typeof val === 'number') {
	    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
	      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
	    }
	    return arrayIndexOf(this, [ val ], byteOffset)
	  }

	  function arrayIndexOf (arr, val, byteOffset) {
	    var foundIndex = -1
	    for (var i = 0; byteOffset + i < arr.length; i++) {
	      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
	        if (foundIndex === -1) foundIndex = i
	        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
	      } else {
	        foundIndex = -1
	      }
	    }
	    return -1
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	// `get` is deprecated
	Buffer.prototype.get = function get (offset) {
	  console.log('.get() is deprecated. Access using array indexes instead.')
	  return this.readUInt8(offset)
	}

	// `set` is deprecated
	Buffer.prototype.set = function set (v, offset) {
	  console.log('.set() is deprecated. Access using array indexes instead.')
	  return this.writeUInt8(v, offset)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; i++) {
	    var parsed = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(parsed)) throw new Error('Invalid hex string')
	    buf[offset + i] = parsed
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function binaryWrite (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8'
	    length = this.length
	    offset = 0
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset
	    length = this.length
	    offset = 0
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset | 0
	    if (isFinite(length)) {
	      length = length | 0
	      if (encoding === undefined) encoding = 'utf8'
	    } else {
	      encoding = length
	      length = undefined
	    }
	  // legacy write(string, encoding, offset, length) - remove in v0.13
	  } else {
	    var swap = encoding
	    encoding = offset
	    offset = length | 0
	    length = swap
	  }

	  var remaining = this.length - offset
	  if (length === undefined || length > remaining) length = remaining

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8'

	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	        return asciiWrite(this, string, offset, length)

	      case 'binary':
	        return binaryWrite(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end)
	  var res = []

	  var i = start
	  while (i < end) {
	    var firstByte = buf[i]
	    var codePoint = null
	    var bytesPerSequence = (firstByte > 0xEF) ? 4
	      : (firstByte > 0xDF) ? 3
	      : (firstByte > 0xBF) ? 2
	      : 1

	    if (i + bytesPerSequence <= end) {
	      var secondByte, thirdByte, fourthByte, tempCodePoint

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1]
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          fourthByte = buf[i + 3]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD
	      bytesPerSequence = 1
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
	      codePoint = 0xDC00 | codePoint & 0x3FF
	    }

	    res.push(codePoint)
	    i += bytesPerSequence
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	var MAX_ARGUMENTS_LENGTH = 0x1000

	function decodeCodePointsArray (codePoints) {
	  var len = codePoints.length
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  var res = ''
	  var i = 0
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    )
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i] & 0x7F)
	  }
	  return ret
	}

	function binarySlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; i++) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len
	    if (start < 0) start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0) end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start) end = start

	  var newBuf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    newBuf = Buffer._augment(this.subarray(start, end))
	  } else {
	    var sliceLen = end - start
	    newBuf = new Buffer(sliceLen, undefined)
	    for (var i = 0; i < sliceLen; i++) {
	      newBuf[i] = this[i + start]
	    }
	  }

	  if (newBuf.length) newBuf.parent = this.parent || this

	  return newBuf
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }

	  return val
	}

	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length)
	  }

	  var val = this[offset + --byteLength]
	  var mul = 1
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul
	  }

	  return val
	}

	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	}

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var i = byteLength
	  var mul = 1
	  var val = this[offset + --i]
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var mul = 1
	  var i = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var i = byteLength - 1
	  var mul = 1
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = 0
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	  if (offset < 0) throw new RangeError('index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (targetStart >= target.length) targetStart = target.length
	  if (!targetStart) targetStart = 0
	  if (end > 0 && end < start) end = start

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start
	  }

	  var len = end - start
	  var i

	  if (this === target && start < targetStart && targetStart < end) {
	    // descending copy from end
	    for (i = len - 1; i >= 0; i--) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    // ascending copy from start
	    for (i = 0; i < len; i++) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else {
	    target._set(this.subarray(start, start + len), targetStart)
	  }

	  return len
	}

	// fill(value, start=0, end=buffer.length)
	Buffer.prototype.fill = function fill (value, start, end) {
	  if (!value) value = 0
	  if (!start) start = 0
	  if (!end) end = this.length

	  if (end < start) throw new RangeError('end < start')

	  // Fill 0 bytes; we're done
	  if (end === start) return
	  if (this.length === 0) return

	  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
	  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

	  var i
	  if (typeof value === 'number') {
	    for (i = start; i < end; i++) {
	      this[i] = value
	    }
	  } else {
	    var bytes = utf8ToBytes(value.toString())
	    var len = bytes.length
	    for (i = start; i < end; i++) {
	      this[i] = bytes[i % len]
	    }
	  }

	  return this
	}

	/**
	 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
	 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
	 */
	Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
	  if (typeof Uint8Array !== 'undefined') {
	    if (Buffer.TYPED_ARRAY_SUPPORT) {
	      return (new Buffer(this)).buffer
	    } else {
	      var buf = new Uint8Array(this.length)
	      for (var i = 0, len = buf.length; i < len; i += 1) {
	        buf[i] = this[i]
	      }
	      return buf.buffer
	    }
	  } else {
	    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
	  }
	}

	// HELPER FUNCTIONS
	// ================

	var BP = Buffer.prototype

	/**
	 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
	 */
	Buffer._augment = function _augment (arr) {
	  arr.constructor = Buffer
	  arr._isBuffer = true

	  // save reference to original Uint8Array set method before overwriting
	  arr._set = arr.set

	  // deprecated
	  arr.get = BP.get
	  arr.set = BP.set

	  arr.write = BP.write
	  arr.toString = BP.toString
	  arr.toLocaleString = BP.toString
	  arr.toJSON = BP.toJSON
	  arr.equals = BP.equals
	  arr.compare = BP.compare
	  arr.indexOf = BP.indexOf
	  arr.copy = BP.copy
	  arr.slice = BP.slice
	  arr.readUIntLE = BP.readUIntLE
	  arr.readUIntBE = BP.readUIntBE
	  arr.readUInt8 = BP.readUInt8
	  arr.readUInt16LE = BP.readUInt16LE
	  arr.readUInt16BE = BP.readUInt16BE
	  arr.readUInt32LE = BP.readUInt32LE
	  arr.readUInt32BE = BP.readUInt32BE
	  arr.readIntLE = BP.readIntLE
	  arr.readIntBE = BP.readIntBE
	  arr.readInt8 = BP.readInt8
	  arr.readInt16LE = BP.readInt16LE
	  arr.readInt16BE = BP.readInt16BE
	  arr.readInt32LE = BP.readInt32LE
	  arr.readInt32BE = BP.readInt32BE
	  arr.readFloatLE = BP.readFloatLE
	  arr.readFloatBE = BP.readFloatBE
	  arr.readDoubleLE = BP.readDoubleLE
	  arr.readDoubleBE = BP.readDoubleBE
	  arr.writeUInt8 = BP.writeUInt8
	  arr.writeUIntLE = BP.writeUIntLE
	  arr.writeUIntBE = BP.writeUIntBE
	  arr.writeUInt16LE = BP.writeUInt16LE
	  arr.writeUInt16BE = BP.writeUInt16BE
	  arr.writeUInt32LE = BP.writeUInt32LE
	  arr.writeUInt32BE = BP.writeUInt32BE
	  arr.writeIntLE = BP.writeIntLE
	  arr.writeIntBE = BP.writeIntBE
	  arr.writeInt8 = BP.writeInt8
	  arr.writeInt16LE = BP.writeInt16LE
	  arr.writeInt16BE = BP.writeInt16BE
	  arr.writeInt32LE = BP.writeInt32LE
	  arr.writeInt32BE = BP.writeInt32BE
	  arr.writeFloatLE = BP.writeFloatLE
	  arr.writeFloatBE = BP.writeFloatBE
	  arr.writeDoubleLE = BP.writeDoubleLE
	  arr.writeDoubleBE = BP.writeDoubleBE
	  arr.fill = BP.fill
	  arr.inspect = BP.inspect
	  arr.toArrayBuffer = BP.toArrayBuffer

	  return arr
	}

	var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity
	  var codePoint
	  var length = string.length
	  var leadSurrogate = null
	  var bytes = []

	  for (var i = 0; i < length; i++) {
	    codePoint = string.charCodeAt(i)

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	        leadSurrogate = codePoint
	        continue
	      }

	      // valid surrogate pair
	      codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	    }

	    leadSurrogate = null

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint)
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; i++) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(7).Buffer, (function() { return this; }())))

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	;(function (exports) {
		'use strict';

	  var Arr = (typeof Uint8Array !== 'undefined')
	    ? Uint8Array
	    : Array

		var PLUS   = '+'.charCodeAt(0)
		var SLASH  = '/'.charCodeAt(0)
		var NUMBER = '0'.charCodeAt(0)
		var LOWER  = 'a'.charCodeAt(0)
		var UPPER  = 'A'.charCodeAt(0)
		var PLUS_URL_SAFE = '-'.charCodeAt(0)
		var SLASH_URL_SAFE = '_'.charCodeAt(0)

		function decode (elt) {
			var code = elt.charCodeAt(0)
			if (code === PLUS ||
			    code === PLUS_URL_SAFE)
				return 62 // '+'
			if (code === SLASH ||
			    code === SLASH_URL_SAFE)
				return 63 // '/'
			if (code < NUMBER)
				return -1 //no match
			if (code < NUMBER + 10)
				return code - NUMBER + 26 + 26
			if (code < UPPER + 26)
				return code - UPPER
			if (code < LOWER + 26)
				return code - LOWER + 26
		}

		function b64ToByteArray (b64) {
			var i, j, l, tmp, placeHolders, arr

			if (b64.length % 4 > 0) {
				throw new Error('Invalid string. Length must be a multiple of 4')
			}

			// the number of equal signs (place holders)
			// if there are two placeholders, than the two characters before it
			// represent one byte
			// if there is only one, then the three characters before it represent 2 bytes
			// this is just a cheap hack to not do indexOf twice
			var len = b64.length
			placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

			// base64 is 4/3 + up to two characters of the original data
			arr = new Arr(b64.length * 3 / 4 - placeHolders)

			// if there are placeholders, only get up to the last complete 4 chars
			l = placeHolders > 0 ? b64.length - 4 : b64.length

			var L = 0

			function push (v) {
				arr[L++] = v
			}

			for (i = 0, j = 0; i < l; i += 4, j += 3) {
				tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
				push((tmp & 0xFF0000) >> 16)
				push((tmp & 0xFF00) >> 8)
				push(tmp & 0xFF)
			}

			if (placeHolders === 2) {
				tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
				push(tmp & 0xFF)
			} else if (placeHolders === 1) {
				tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
				push((tmp >> 8) & 0xFF)
				push(tmp & 0xFF)
			}

			return arr
		}

		function uint8ToBase64 (uint8) {
			var i,
				extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
				output = "",
				temp, length

			function encode (num) {
				return lookup.charAt(num)
			}

			function tripletToBase64 (num) {
				return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
			}

			// go through the array every three bytes, we'll deal with trailing stuff later
			for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
				temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
				output += tripletToBase64(temp)
			}

			// pad the end with zeros, but make sure to not forget the extra bytes
			switch (extraBytes) {
				case 1:
					temp = uint8[uint8.length - 1]
					output += encode(temp >> 2)
					output += encode((temp << 4) & 0x3F)
					output += '=='
					break
				case 2:
					temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
					output += encode(temp >> 10)
					output += encode((temp >> 4) & 0x3F)
					output += encode((temp << 2) & 0x3F)
					output += '='
					break
			}

			return output
		}

		exports.toByteArray = b64ToByteArray
		exports.fromByteArray = uint8ToBase64
	}( false ? (this.base64js = {}) : exports))


/***/ },
/* 9 */
/***/ function(module, exports) {

	exports.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var nBits = -7
	  var i = isLE ? (nBytes - 1) : 0
	  var d = isLE ? -1 : 1
	  var s = buffer[offset + i]

	  i += d

	  e = s & ((1 << (-nBits)) - 1)
	  s >>= (-nBits)
	  nBits += eLen
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1)
	  e >>= (-nBits)
	  nBits += mLen
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen)
	    e = e - eBias
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
	  var i = isLE ? 0 : (nBytes - 1)
	  var d = isLE ? 1 : -1
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

	  value = Math.abs(value)

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0
	    e = eMax
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2)
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--
	      c *= 2
	    }
	    if (e + eBias >= 1) {
	      value += rt / c
	    } else {
	      value += rt * Math.pow(2, 1 - eBias)
	    }
	    if (value * c >= 2) {
	      e++
	      c /= 2
	    }

	    if (e + eBias >= eMax) {
	      m = 0
	      e = eMax
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen)
	      e = e + eBias
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
	      e = 0
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m
	  eLen += mLen
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128
	}


/***/ },
/* 10 */
/***/ function(module, exports) {

	
	/**
	 * isArray
	 */

	var isArray = Array.isArray;

	/**
	 * toString
	 */

	var str = Object.prototype.toString;

	/**
	 * Whether or not the given `val`
	 * is an array.
	 *
	 * example:
	 *
	 *        isArray([]);
	 *        // > true
	 *        isArray(arguments);
	 *        // > false
	 *        isArray('');
	 *        // > false
	 *
	 * @param {mixed} val
	 * @return {bool}
	 */

	module.exports = isArray || function (val) {
	  return !! val && '[object Array]' == str.call(val);
	};


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Stream;

	var EE = __webpack_require__(12).EventEmitter;
	var inherits = __webpack_require__(13);

	inherits(Stream, EE);
	Stream.Readable = __webpack_require__(14);
	Stream.Writable = __webpack_require__(26);
	Stream.Duplex = __webpack_require__(27);
	Stream.Transform = __webpack_require__(28);
	Stream.PassThrough = __webpack_require__(29);

	// Backwards-compat with node 0.4.x
	Stream.Stream = Stream;



	// old-style streams.  Note that the pipe method (the only relevant
	// part of this class) is overridden in the Readable class.

	function Stream() {
	  EE.call(this);
	}

	Stream.prototype.pipe = function(dest, options) {
	  var source = this;

	  function ondata(chunk) {
	    if (dest.writable) {
	      if (false === dest.write(chunk) && source.pause) {
	        source.pause();
	      }
	    }
	  }

	  source.on('data', ondata);

	  function ondrain() {
	    if (source.readable && source.resume) {
	      source.resume();
	    }
	  }

	  dest.on('drain', ondrain);

	  // If the 'end' option is not supplied, dest.end() will be called when
	  // source gets the 'end' or 'close' events.  Only dest.end() once.
	  if (!dest._isStdio && (!options || options.end !== false)) {
	    source.on('end', onend);
	    source.on('close', onclose);
	  }

	  var didOnEnd = false;
	  function onend() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    dest.end();
	  }


	  function onclose() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    if (typeof dest.destroy === 'function') dest.destroy();
	  }

	  // don't leave dangling pipes when there are errors.
	  function onerror(er) {
	    cleanup();
	    if (EE.listenerCount(this, 'error') === 0) {
	      throw er; // Unhandled stream error in pipe.
	    }
	  }

	  source.on('error', onerror);
	  dest.on('error', onerror);

	  // remove all the event listeners that were added.
	  function cleanup() {
	    source.removeListener('data', ondata);
	    dest.removeListener('drain', ondrain);

	    source.removeListener('end', onend);
	    source.removeListener('close', onclose);

	    source.removeListener('error', onerror);
	    dest.removeListener('error', onerror);

	    source.removeListener('end', cleanup);
	    source.removeListener('close', cleanup);

	    dest.removeListener('close', cleanup);
	  }

	  source.on('end', cleanup);
	  source.on('close', cleanup);

	  dest.on('close', cleanup);

	  dest.emit('pipe', source);

	  // Allow for unix-like usage: A.pipe(B).pipe(C)
	  return dest;
	};


/***/ },
/* 12 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      }
	      throw TypeError('Uncaught, unspecified "error" event.');
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    args = Array.prototype.slice.call(arguments, 1);
	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else if (listeners) {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.prototype.listenerCount = function(type) {
	  if (this._events) {
	    var evlistener = this._events[type];

	    if (isFunction(evlistener))
	      return 1;
	    else if (evlistener)
	      return evlistener.length;
	  }
	  return 0;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  return emitter.listenerCount(type);
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ },
/* 13 */
/***/ function(module, exports) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(15);
	exports.Stream = __webpack_require__(11);
	exports.Readable = exports;
	exports.Writable = __webpack_require__(22);
	exports.Duplex = __webpack_require__(21);
	exports.Transform = __webpack_require__(24);
	exports.PassThrough = __webpack_require__(25);


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Readable;

	/*<replacement>*/
	var isArray = __webpack_require__(17);
	/*</replacement>*/


	/*<replacement>*/
	var Buffer = __webpack_require__(7).Buffer;
	/*</replacement>*/

	Readable.ReadableState = ReadableState;

	var EE = __webpack_require__(12).EventEmitter;

	/*<replacement>*/
	if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
	  return emitter.listeners(type).length;
	};
	/*</replacement>*/

	var Stream = __webpack_require__(11);

	/*<replacement>*/
	var util = __webpack_require__(18);
	util.inherits = __webpack_require__(19);
	/*</replacement>*/

	var StringDecoder;


	/*<replacement>*/
	var debug = __webpack_require__(20);
	if (debug && debug.debuglog) {
	  debug = debug.debuglog('stream');
	} else {
	  debug = function () {};
	}
	/*</replacement>*/


	util.inherits(Readable, Stream);

	function ReadableState(options, stream) {
	  var Duplex = __webpack_require__(21);

	  options = options || {};

	  // the point at which it stops calling _read() to fill the buffer
	  // Note: 0 is a valid value, means "don't call _read preemptively ever"
	  var hwm = options.highWaterMark;
	  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.buffer = [];
	  this.length = 0;
	  this.pipes = null;
	  this.pipesCount = 0;
	  this.flowing = null;
	  this.ended = false;
	  this.endEmitted = false;
	  this.reading = false;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // whenever we return null, then we set a flag to say
	  // that we're awaiting a 'readable' event emission.
	  this.needReadable = false;
	  this.emittedReadable = false;
	  this.readableListening = false;


	  // object stream flag. Used to make read(n) ignore n and to
	  // make all the buffer merging and length checks go away
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex)
	    this.objectMode = this.objectMode || !!options.readableObjectMode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // when piping, we only care about 'readable' events that happen
	  // after read()ing all the bytes and not getting any pushback.
	  this.ranOut = false;

	  // the number of writers that are awaiting a drain event in .pipe()s
	  this.awaitDrain = 0;

	  // if true, a maybeReadMore has been scheduled
	  this.readingMore = false;

	  this.decoder = null;
	  this.encoding = null;
	  if (options.encoding) {
	    if (!StringDecoder)
	      StringDecoder = __webpack_require__(23).StringDecoder;
	    this.decoder = new StringDecoder(options.encoding);
	    this.encoding = options.encoding;
	  }
	}

	function Readable(options) {
	  var Duplex = __webpack_require__(21);

	  if (!(this instanceof Readable))
	    return new Readable(options);

	  this._readableState = new ReadableState(options, this);

	  // legacy
	  this.readable = true;

	  Stream.call(this);
	}

	// Manually shove something into the read() buffer.
	// This returns true if the highWaterMark has not been hit yet,
	// similar to how Writable.write() returns true if you should
	// write() some more.
	Readable.prototype.push = function(chunk, encoding) {
	  var state = this._readableState;

	  if (util.isString(chunk) && !state.objectMode) {
	    encoding = encoding || state.defaultEncoding;
	    if (encoding !== state.encoding) {
	      chunk = new Buffer(chunk, encoding);
	      encoding = '';
	    }
	  }

	  return readableAddChunk(this, state, chunk, encoding, false);
	};

	// Unshift should *always* be something directly out of read()
	Readable.prototype.unshift = function(chunk) {
	  var state = this._readableState;
	  return readableAddChunk(this, state, chunk, '', true);
	};

	function readableAddChunk(stream, state, chunk, encoding, addToFront) {
	  var er = chunkInvalid(state, chunk);
	  if (er) {
	    stream.emit('error', er);
	  } else if (util.isNullOrUndefined(chunk)) {
	    state.reading = false;
	    if (!state.ended)
	      onEofChunk(stream, state);
	  } else if (state.objectMode || chunk && chunk.length > 0) {
	    if (state.ended && !addToFront) {
	      var e = new Error('stream.push() after EOF');
	      stream.emit('error', e);
	    } else if (state.endEmitted && addToFront) {
	      var e = new Error('stream.unshift() after end event');
	      stream.emit('error', e);
	    } else {
	      if (state.decoder && !addToFront && !encoding)
	        chunk = state.decoder.write(chunk);

	      if (!addToFront)
	        state.reading = false;

	      // if we want the data now, just emit it.
	      if (state.flowing && state.length === 0 && !state.sync) {
	        stream.emit('data', chunk);
	        stream.read(0);
	      } else {
	        // update the buffer info.
	        state.length += state.objectMode ? 1 : chunk.length;
	        if (addToFront)
	          state.buffer.unshift(chunk);
	        else
	          state.buffer.push(chunk);

	        if (state.needReadable)
	          emitReadable(stream);
	      }

	      maybeReadMore(stream, state);
	    }
	  } else if (!addToFront) {
	    state.reading = false;
	  }

	  return needMoreData(state);
	}



	// if it's past the high water mark, we can push in some more.
	// Also, if we have no data yet, we can stand some
	// more bytes.  This is to work around cases where hwm=0,
	// such as the repl.  Also, if the push() triggered a
	// readable event, and the user called read(largeNumber) such that
	// needReadable was set, then we ought to push more, so that another
	// 'readable' event will be triggered.
	function needMoreData(state) {
	  return !state.ended &&
	         (state.needReadable ||
	          state.length < state.highWaterMark ||
	          state.length === 0);
	}

	// backwards compatibility.
	Readable.prototype.setEncoding = function(enc) {
	  if (!StringDecoder)
	    StringDecoder = __webpack_require__(23).StringDecoder;
	  this._readableState.decoder = new StringDecoder(enc);
	  this._readableState.encoding = enc;
	  return this;
	};

	// Don't raise the hwm > 128MB
	var MAX_HWM = 0x800000;
	function roundUpToNextPowerOf2(n) {
	  if (n >= MAX_HWM) {
	    n = MAX_HWM;
	  } else {
	    // Get the next highest power of 2
	    n--;
	    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
	    n++;
	  }
	  return n;
	}

	function howMuchToRead(n, state) {
	  if (state.length === 0 && state.ended)
	    return 0;

	  if (state.objectMode)
	    return n === 0 ? 0 : 1;

	  if (isNaN(n) || util.isNull(n)) {
	    // only flow one buffer at a time
	    if (state.flowing && state.buffer.length)
	      return state.buffer[0].length;
	    else
	      return state.length;
	  }

	  if (n <= 0)
	    return 0;

	  // If we're asking for more than the target buffer level,
	  // then raise the water mark.  Bump up to the next highest
	  // power of 2, to prevent increasing it excessively in tiny
	  // amounts.
	  if (n > state.highWaterMark)
	    state.highWaterMark = roundUpToNextPowerOf2(n);

	  // don't have that much.  return null, unless we've ended.
	  if (n > state.length) {
	    if (!state.ended) {
	      state.needReadable = true;
	      return 0;
	    } else
	      return state.length;
	  }

	  return n;
	}

	// you can override either this method, or the async _read(n) below.
	Readable.prototype.read = function(n) {
	  debug('read', n);
	  var state = this._readableState;
	  var nOrig = n;

	  if (!util.isNumber(n) || n > 0)
	    state.emittedReadable = false;

	  // if we're doing read(0) to trigger a readable event, but we
	  // already have a bunch of data in the buffer, then just trigger
	  // the 'readable' event and move on.
	  if (n === 0 &&
	      state.needReadable &&
	      (state.length >= state.highWaterMark || state.ended)) {
	    debug('read: emitReadable', state.length, state.ended);
	    if (state.length === 0 && state.ended)
	      endReadable(this);
	    else
	      emitReadable(this);
	    return null;
	  }

	  n = howMuchToRead(n, state);

	  // if we've ended, and we're now clear, then finish it up.
	  if (n === 0 && state.ended) {
	    if (state.length === 0)
	      endReadable(this);
	    return null;
	  }

	  // All the actual chunk generation logic needs to be
	  // *below* the call to _read.  The reason is that in certain
	  // synthetic stream cases, such as passthrough streams, _read
	  // may be a completely synchronous operation which may change
	  // the state of the read buffer, providing enough data when
	  // before there was *not* enough.
	  //
	  // So, the steps are:
	  // 1. Figure out what the state of things will be after we do
	  // a read from the buffer.
	  //
	  // 2. If that resulting state will trigger a _read, then call _read.
	  // Note that this may be asynchronous, or synchronous.  Yes, it is
	  // deeply ugly to write APIs this way, but that still doesn't mean
	  // that the Readable class should behave improperly, as streams are
	  // designed to be sync/async agnostic.
	  // Take note if the _read call is sync or async (ie, if the read call
	  // has returned yet), so that we know whether or not it's safe to emit
	  // 'readable' etc.
	  //
	  // 3. Actually pull the requested chunks out of the buffer and return.

	  // if we need a readable event, then we need to do some reading.
	  var doRead = state.needReadable;
	  debug('need readable', doRead);

	  // if we currently have less than the highWaterMark, then also read some
	  if (state.length === 0 || state.length - n < state.highWaterMark) {
	    doRead = true;
	    debug('length less than watermark', doRead);
	  }

	  // however, if we've ended, then there's no point, and if we're already
	  // reading, then it's unnecessary.
	  if (state.ended || state.reading) {
	    doRead = false;
	    debug('reading or ended', doRead);
	  }

	  if (doRead) {
	    debug('do read');
	    state.reading = true;
	    state.sync = true;
	    // if the length is currently zero, then we *need* a readable event.
	    if (state.length === 0)
	      state.needReadable = true;
	    // call internal read method
	    this._read(state.highWaterMark);
	    state.sync = false;
	  }

	  // If _read pushed data synchronously, then `reading` will be false,
	  // and we need to re-evaluate how much data we can return to the user.
	  if (doRead && !state.reading)
	    n = howMuchToRead(nOrig, state);

	  var ret;
	  if (n > 0)
	    ret = fromList(n, state);
	  else
	    ret = null;

	  if (util.isNull(ret)) {
	    state.needReadable = true;
	    n = 0;
	  }

	  state.length -= n;

	  // If we have nothing in the buffer, then we want to know
	  // as soon as we *do* get something into the buffer.
	  if (state.length === 0 && !state.ended)
	    state.needReadable = true;

	  // If we tried to read() past the EOF, then emit end on the next tick.
	  if (nOrig !== n && state.ended && state.length === 0)
	    endReadable(this);

	  if (!util.isNull(ret))
	    this.emit('data', ret);

	  return ret;
	};

	function chunkInvalid(state, chunk) {
	  var er = null;
	  if (!util.isBuffer(chunk) &&
	      !util.isString(chunk) &&
	      !util.isNullOrUndefined(chunk) &&
	      !state.objectMode) {
	    er = new TypeError('Invalid non-string/buffer chunk');
	  }
	  return er;
	}


	function onEofChunk(stream, state) {
	  if (state.decoder && !state.ended) {
	    var chunk = state.decoder.end();
	    if (chunk && chunk.length) {
	      state.buffer.push(chunk);
	      state.length += state.objectMode ? 1 : chunk.length;
	    }
	  }
	  state.ended = true;

	  // emit 'readable' now to make sure it gets picked up.
	  emitReadable(stream);
	}

	// Don't emit readable right away in sync mode, because this can trigger
	// another read() call => stack overflow.  This way, it might trigger
	// a nextTick recursion warning, but that's not so bad.
	function emitReadable(stream) {
	  var state = stream._readableState;
	  state.needReadable = false;
	  if (!state.emittedReadable) {
	    debug('emitReadable', state.flowing);
	    state.emittedReadable = true;
	    if (state.sync)
	      process.nextTick(function() {
	        emitReadable_(stream);
	      });
	    else
	      emitReadable_(stream);
	  }
	}

	function emitReadable_(stream) {
	  debug('emit readable');
	  stream.emit('readable');
	  flow(stream);
	}


	// at this point, the user has presumably seen the 'readable' event,
	// and called read() to consume some data.  that may have triggered
	// in turn another _read(n) call, in which case reading = true if
	// it's in progress.
	// However, if we're not ended, or reading, and the length < hwm,
	// then go ahead and try to read some more preemptively.
	function maybeReadMore(stream, state) {
	  if (!state.readingMore) {
	    state.readingMore = true;
	    process.nextTick(function() {
	      maybeReadMore_(stream, state);
	    });
	  }
	}

	function maybeReadMore_(stream, state) {
	  var len = state.length;
	  while (!state.reading && !state.flowing && !state.ended &&
	         state.length < state.highWaterMark) {
	    debug('maybeReadMore read 0');
	    stream.read(0);
	    if (len === state.length)
	      // didn't get any data, stop spinning.
	      break;
	    else
	      len = state.length;
	  }
	  state.readingMore = false;
	}

	// abstract method.  to be overridden in specific implementation classes.
	// call cb(er, data) where data is <= n in length.
	// for virtual (non-string, non-buffer) streams, "length" is somewhat
	// arbitrary, and perhaps not very meaningful.
	Readable.prototype._read = function(n) {
	  this.emit('error', new Error('not implemented'));
	};

	Readable.prototype.pipe = function(dest, pipeOpts) {
	  var src = this;
	  var state = this._readableState;

	  switch (state.pipesCount) {
	    case 0:
	      state.pipes = dest;
	      break;
	    case 1:
	      state.pipes = [state.pipes, dest];
	      break;
	    default:
	      state.pipes.push(dest);
	      break;
	  }
	  state.pipesCount += 1;
	  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

	  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
	              dest !== process.stdout &&
	              dest !== process.stderr;

	  var endFn = doEnd ? onend : cleanup;
	  if (state.endEmitted)
	    process.nextTick(endFn);
	  else
	    src.once('end', endFn);

	  dest.on('unpipe', onunpipe);
	  function onunpipe(readable) {
	    debug('onunpipe');
	    if (readable === src) {
	      cleanup();
	    }
	  }

	  function onend() {
	    debug('onend');
	    dest.end();
	  }

	  // when the dest drains, it reduces the awaitDrain counter
	  // on the source.  This would be more elegant with a .once()
	  // handler in flow(), but adding and removing repeatedly is
	  // too slow.
	  var ondrain = pipeOnDrain(src);
	  dest.on('drain', ondrain);

	  function cleanup() {
	    debug('cleanup');
	    // cleanup event handlers once the pipe is broken
	    dest.removeListener('close', onclose);
	    dest.removeListener('finish', onfinish);
	    dest.removeListener('drain', ondrain);
	    dest.removeListener('error', onerror);
	    dest.removeListener('unpipe', onunpipe);
	    src.removeListener('end', onend);
	    src.removeListener('end', cleanup);
	    src.removeListener('data', ondata);

	    // if the reader is waiting for a drain event from this
	    // specific writer, then it would cause it to never start
	    // flowing again.
	    // So, if this is awaiting a drain, then we just call it now.
	    // If we don't know, then assume that we are waiting for one.
	    if (state.awaitDrain &&
	        (!dest._writableState || dest._writableState.needDrain))
	      ondrain();
	  }

	  src.on('data', ondata);
	  function ondata(chunk) {
	    debug('ondata');
	    var ret = dest.write(chunk);
	    if (false === ret) {
	      debug('false write response, pause',
	            src._readableState.awaitDrain);
	      src._readableState.awaitDrain++;
	      src.pause();
	    }
	  }

	  // if the dest has an error, then stop piping into it.
	  // however, don't suppress the throwing behavior for this.
	  function onerror(er) {
	    debug('onerror', er);
	    unpipe();
	    dest.removeListener('error', onerror);
	    if (EE.listenerCount(dest, 'error') === 0)
	      dest.emit('error', er);
	  }
	  // This is a brutally ugly hack to make sure that our error handler
	  // is attached before any userland ones.  NEVER DO THIS.
	  if (!dest._events || !dest._events.error)
	    dest.on('error', onerror);
	  else if (isArray(dest._events.error))
	    dest._events.error.unshift(onerror);
	  else
	    dest._events.error = [onerror, dest._events.error];



	  // Both close and finish should trigger unpipe, but only once.
	  function onclose() {
	    dest.removeListener('finish', onfinish);
	    unpipe();
	  }
	  dest.once('close', onclose);
	  function onfinish() {
	    debug('onfinish');
	    dest.removeListener('close', onclose);
	    unpipe();
	  }
	  dest.once('finish', onfinish);

	  function unpipe() {
	    debug('unpipe');
	    src.unpipe(dest);
	  }

	  // tell the dest that it's being piped to
	  dest.emit('pipe', src);

	  // start the flow if it hasn't been started already.
	  if (!state.flowing) {
	    debug('pipe resume');
	    src.resume();
	  }

	  return dest;
	};

	function pipeOnDrain(src) {
	  return function() {
	    var state = src._readableState;
	    debug('pipeOnDrain', state.awaitDrain);
	    if (state.awaitDrain)
	      state.awaitDrain--;
	    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
	      state.flowing = true;
	      flow(src);
	    }
	  };
	}


	Readable.prototype.unpipe = function(dest) {
	  var state = this._readableState;

	  // if we're not piping anywhere, then do nothing.
	  if (state.pipesCount === 0)
	    return this;

	  // just one destination.  most common case.
	  if (state.pipesCount === 1) {
	    // passed in one, but it's not the right one.
	    if (dest && dest !== state.pipes)
	      return this;

	    if (!dest)
	      dest = state.pipes;

	    // got a match.
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;
	    if (dest)
	      dest.emit('unpipe', this);
	    return this;
	  }

	  // slow case. multiple pipe destinations.

	  if (!dest) {
	    // remove all.
	    var dests = state.pipes;
	    var len = state.pipesCount;
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;

	    for (var i = 0; i < len; i++)
	      dests[i].emit('unpipe', this);
	    return this;
	  }

	  // try to find the right one.
	  var i = indexOf(state.pipes, dest);
	  if (i === -1)
	    return this;

	  state.pipes.splice(i, 1);
	  state.pipesCount -= 1;
	  if (state.pipesCount === 1)
	    state.pipes = state.pipes[0];

	  dest.emit('unpipe', this);

	  return this;
	};

	// set up data events if they are asked for
	// Ensure readable listeners eventually get something
	Readable.prototype.on = function(ev, fn) {
	  var res = Stream.prototype.on.call(this, ev, fn);

	  // If listening to data, and it has not explicitly been paused,
	  // then call resume to start the flow of data on the next tick.
	  if (ev === 'data' && false !== this._readableState.flowing) {
	    this.resume();
	  }

	  if (ev === 'readable' && this.readable) {
	    var state = this._readableState;
	    if (!state.readableListening) {
	      state.readableListening = true;
	      state.emittedReadable = false;
	      state.needReadable = true;
	      if (!state.reading) {
	        var self = this;
	        process.nextTick(function() {
	          debug('readable nexttick read 0');
	          self.read(0);
	        });
	      } else if (state.length) {
	        emitReadable(this, state);
	      }
	    }
	  }

	  return res;
	};
	Readable.prototype.addListener = Readable.prototype.on;

	// pause() and resume() are remnants of the legacy readable stream API
	// If the user uses them, then switch into old mode.
	Readable.prototype.resume = function() {
	  var state = this._readableState;
	  if (!state.flowing) {
	    debug('resume');
	    state.flowing = true;
	    if (!state.reading) {
	      debug('resume read 0');
	      this.read(0);
	    }
	    resume(this, state);
	  }
	  return this;
	};

	function resume(stream, state) {
	  if (!state.resumeScheduled) {
	    state.resumeScheduled = true;
	    process.nextTick(function() {
	      resume_(stream, state);
	    });
	  }
	}

	function resume_(stream, state) {
	  state.resumeScheduled = false;
	  stream.emit('resume');
	  flow(stream);
	  if (state.flowing && !state.reading)
	    stream.read(0);
	}

	Readable.prototype.pause = function() {
	  debug('call pause flowing=%j', this._readableState.flowing);
	  if (false !== this._readableState.flowing) {
	    debug('pause');
	    this._readableState.flowing = false;
	    this.emit('pause');
	  }
	  return this;
	};

	function flow(stream) {
	  var state = stream._readableState;
	  debug('flow', state.flowing);
	  if (state.flowing) {
	    do {
	      var chunk = stream.read();
	    } while (null !== chunk && state.flowing);
	  }
	}

	// wrap an old-style stream as the async data source.
	// This is *not* part of the readable stream interface.
	// It is an ugly unfortunate mess of history.
	Readable.prototype.wrap = function(stream) {
	  var state = this._readableState;
	  var paused = false;

	  var self = this;
	  stream.on('end', function() {
	    debug('wrapped end');
	    if (state.decoder && !state.ended) {
	      var chunk = state.decoder.end();
	      if (chunk && chunk.length)
	        self.push(chunk);
	    }

	    self.push(null);
	  });

	  stream.on('data', function(chunk) {
	    debug('wrapped data');
	    if (state.decoder)
	      chunk = state.decoder.write(chunk);
	    if (!chunk || !state.objectMode && !chunk.length)
	      return;

	    var ret = self.push(chunk);
	    if (!ret) {
	      paused = true;
	      stream.pause();
	    }
	  });

	  // proxy all the other methods.
	  // important when wrapping filters and duplexes.
	  for (var i in stream) {
	    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
	      this[i] = function(method) { return function() {
	        return stream[method].apply(stream, arguments);
	      }}(i);
	    }
	  }

	  // proxy certain important events.
	  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
	  forEach(events, function(ev) {
	    stream.on(ev, self.emit.bind(self, ev));
	  });

	  // when we try to consume some more bytes, simply unpause the
	  // underlying stream.
	  self._read = function(n) {
	    debug('wrapped _read', n);
	    if (paused) {
	      paused = false;
	      stream.resume();
	    }
	  };

	  return self;
	};



	// exposed for testing purposes only.
	Readable._fromList = fromList;

	// Pluck off n bytes from an array of buffers.
	// Length is the combined lengths of all the buffers in the list.
	function fromList(n, state) {
	  var list = state.buffer;
	  var length = state.length;
	  var stringMode = !!state.decoder;
	  var objectMode = !!state.objectMode;
	  var ret;

	  // nothing in the list, definitely empty.
	  if (list.length === 0)
	    return null;

	  if (length === 0)
	    ret = null;
	  else if (objectMode)
	    ret = list.shift();
	  else if (!n || n >= length) {
	    // read it all, truncate the array.
	    if (stringMode)
	      ret = list.join('');
	    else
	      ret = Buffer.concat(list, length);
	    list.length = 0;
	  } else {
	    // read just some of it.
	    if (n < list[0].length) {
	      // just take a part of the first list item.
	      // slice is the same for buffers and strings.
	      var buf = list[0];
	      ret = buf.slice(0, n);
	      list[0] = buf.slice(n);
	    } else if (n === list[0].length) {
	      // first list is a perfect match
	      ret = list.shift();
	    } else {
	      // complex case.
	      // we have enough to cover it, but it spans past the first buffer.
	      if (stringMode)
	        ret = '';
	      else
	        ret = new Buffer(n);

	      var c = 0;
	      for (var i = 0, l = list.length; i < l && c < n; i++) {
	        var buf = list[0];
	        var cpy = Math.min(n - c, buf.length);

	        if (stringMode)
	          ret += buf.slice(0, cpy);
	        else
	          buf.copy(ret, c, 0, cpy);

	        if (cpy < buf.length)
	          list[0] = buf.slice(cpy);
	        else
	          list.shift();

	        c += cpy;
	      }
	    }
	  }

	  return ret;
	}

	function endReadable(stream) {
	  var state = stream._readableState;

	  // If we get here before consuming all the bytes, then that is a
	  // bug in node.  Should never happen.
	  if (state.length > 0)
	    throw new Error('endReadable called on non-empty stream');

	  if (!state.endEmitted) {
	    state.ended = true;
	    process.nextTick(function() {
	      // Check that we didn't get one last unshift.
	      if (!state.endEmitted && state.length === 0) {
	        state.endEmitted = true;
	        stream.readable = false;
	        stream.emit('end');
	      }
	    });
	  }
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

	function indexOf (xs, x) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    if (xs[i] === x) return i;
	  }
	  return -1;
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)))

/***/ },
/* 16 */
/***/ function(module, exports) {

	// shim for using process in browser

	var process = module.exports = {};
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = setTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    clearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        setTimeout(drainQueue, 0);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 17 */
/***/ function(module, exports) {

	module.exports = Array.isArray || function (arr) {
	  return Object.prototype.toString.call(arr) == '[object Array]';
	};


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	function isBuffer(arg) {
	  return Buffer.isBuffer(arg);
	}
	exports.isBuffer = isBuffer;

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(7).Buffer))

/***/ },
/* 19 */
/***/ function(module, exports) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 20 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a duplex stream is just a stream that is both readable and writable.
	// Since JS doesn't have multiple prototypal inheritance, this class
	// prototypally inherits from Readable, and then parasitically from
	// Writable.

	module.exports = Duplex;

	/*<replacement>*/
	var objectKeys = Object.keys || function (obj) {
	  var keys = [];
	  for (var key in obj) keys.push(key);
	  return keys;
	}
	/*</replacement>*/


	/*<replacement>*/
	var util = __webpack_require__(18);
	util.inherits = __webpack_require__(19);
	/*</replacement>*/

	var Readable = __webpack_require__(15);
	var Writable = __webpack_require__(22);

	util.inherits(Duplex, Readable);

	forEach(objectKeys(Writable.prototype), function(method) {
	  if (!Duplex.prototype[method])
	    Duplex.prototype[method] = Writable.prototype[method];
	});

	function Duplex(options) {
	  if (!(this instanceof Duplex))
	    return new Duplex(options);

	  Readable.call(this, options);
	  Writable.call(this, options);

	  if (options && options.readable === false)
	    this.readable = false;

	  if (options && options.writable === false)
	    this.writable = false;

	  this.allowHalfOpen = true;
	  if (options && options.allowHalfOpen === false)
	    this.allowHalfOpen = false;

	  this.once('end', onend);
	}

	// the no-half-open enforcer
	function onend() {
	  // if we allow half-open state, or if the writable side ended,
	  // then we're ok.
	  if (this.allowHalfOpen || this._writableState.ended)
	    return;

	  // no more data can be written.
	  // But allow more writes to happen in this tick.
	  process.nextTick(this.end.bind(this));
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)))

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// A bit simpler than readable streams.
	// Implement an async ._write(chunk, cb), and it'll handle all
	// the drain event emission and buffering.

	module.exports = Writable;

	/*<replacement>*/
	var Buffer = __webpack_require__(7).Buffer;
	/*</replacement>*/

	Writable.WritableState = WritableState;


	/*<replacement>*/
	var util = __webpack_require__(18);
	util.inherits = __webpack_require__(19);
	/*</replacement>*/

	var Stream = __webpack_require__(11);

	util.inherits(Writable, Stream);

	function WriteReq(chunk, encoding, cb) {
	  this.chunk = chunk;
	  this.encoding = encoding;
	  this.callback = cb;
	}

	function WritableState(options, stream) {
	  var Duplex = __webpack_require__(21);

	  options = options || {};

	  // the point at which write() starts returning false
	  // Note: 0 is a valid value, means that we always return false if
	  // the entire buffer is not flushed immediately on write()
	  var hwm = options.highWaterMark;
	  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

	  // object stream flag to indicate whether or not this stream
	  // contains buffers or objects.
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex)
	    this.objectMode = this.objectMode || !!options.writableObjectMode;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.needDrain = false;
	  // at the start of calling end()
	  this.ending = false;
	  // when end() has been called, and returned
	  this.ended = false;
	  // when 'finish' is emitted
	  this.finished = false;

	  // should we decode strings into buffers before passing to _write?
	  // this is here so that some node-core streams can optimize string
	  // handling at a lower level.
	  var noDecode = options.decodeStrings === false;
	  this.decodeStrings = !noDecode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // not an actual buffer we keep track of, but a measurement
	  // of how much we're waiting to get pushed to some underlying
	  // socket or file.
	  this.length = 0;

	  // a flag to see when we're in the middle of a write.
	  this.writing = false;

	  // when true all writes will be buffered until .uncork() call
	  this.corked = 0;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // a flag to know if we're processing previously buffered items, which
	  // may call the _write() callback in the same tick, so that we don't
	  // end up in an overlapped onwrite situation.
	  this.bufferProcessing = false;

	  // the callback that's passed to _write(chunk,cb)
	  this.onwrite = function(er) {
	    onwrite(stream, er);
	  };

	  // the callback that the user supplies to write(chunk,encoding,cb)
	  this.writecb = null;

	  // the amount that is being written when _write is called.
	  this.writelen = 0;

	  this.buffer = [];

	  // number of pending user-supplied write callbacks
	  // this must be 0 before 'finish' can be emitted
	  this.pendingcb = 0;

	  // emit prefinish if the only thing we're waiting for is _write cbs
	  // This is relevant for synchronous Transform streams
	  this.prefinished = false;

	  // True if the error was already emitted and should not be thrown again
	  this.errorEmitted = false;
	}

	function Writable(options) {
	  var Duplex = __webpack_require__(21);

	  // Writable ctor is applied to Duplexes, though they're not
	  // instanceof Writable, they're instanceof Readable.
	  if (!(this instanceof Writable) && !(this instanceof Duplex))
	    return new Writable(options);

	  this._writableState = new WritableState(options, this);

	  // legacy.
	  this.writable = true;

	  Stream.call(this);
	}

	// Otherwise people can pipe Writable streams, which is just wrong.
	Writable.prototype.pipe = function() {
	  this.emit('error', new Error('Cannot pipe. Not readable.'));
	};


	function writeAfterEnd(stream, state, cb) {
	  var er = new Error('write after end');
	  // TODO: defer error events consistently everywhere, not just the cb
	  stream.emit('error', er);
	  process.nextTick(function() {
	    cb(er);
	  });
	}

	// If we get something that is not a buffer, string, null, or undefined,
	// and we're not in objectMode, then that's an error.
	// Otherwise stream chunks are all considered to be of length=1, and the
	// watermarks determine how many objects to keep in the buffer, rather than
	// how many bytes or characters.
	function validChunk(stream, state, chunk, cb) {
	  var valid = true;
	  if (!util.isBuffer(chunk) &&
	      !util.isString(chunk) &&
	      !util.isNullOrUndefined(chunk) &&
	      !state.objectMode) {
	    var er = new TypeError('Invalid non-string/buffer chunk');
	    stream.emit('error', er);
	    process.nextTick(function() {
	      cb(er);
	    });
	    valid = false;
	  }
	  return valid;
	}

	Writable.prototype.write = function(chunk, encoding, cb) {
	  var state = this._writableState;
	  var ret = false;

	  if (util.isFunction(encoding)) {
	    cb = encoding;
	    encoding = null;
	  }

	  if (util.isBuffer(chunk))
	    encoding = 'buffer';
	  else if (!encoding)
	    encoding = state.defaultEncoding;

	  if (!util.isFunction(cb))
	    cb = function() {};

	  if (state.ended)
	    writeAfterEnd(this, state, cb);
	  else if (validChunk(this, state, chunk, cb)) {
	    state.pendingcb++;
	    ret = writeOrBuffer(this, state, chunk, encoding, cb);
	  }

	  return ret;
	};

	Writable.prototype.cork = function() {
	  var state = this._writableState;

	  state.corked++;
	};

	Writable.prototype.uncork = function() {
	  var state = this._writableState;

	  if (state.corked) {
	    state.corked--;

	    if (!state.writing &&
	        !state.corked &&
	        !state.finished &&
	        !state.bufferProcessing &&
	        state.buffer.length)
	      clearBuffer(this, state);
	  }
	};

	function decodeChunk(state, chunk, encoding) {
	  if (!state.objectMode &&
	      state.decodeStrings !== false &&
	      util.isString(chunk)) {
	    chunk = new Buffer(chunk, encoding);
	  }
	  return chunk;
	}

	// if we're already writing something, then just put this
	// in the queue, and wait our turn.  Otherwise, call _write
	// If we return false, then we need a drain event, so set that flag.
	function writeOrBuffer(stream, state, chunk, encoding, cb) {
	  chunk = decodeChunk(state, chunk, encoding);
	  if (util.isBuffer(chunk))
	    encoding = 'buffer';
	  var len = state.objectMode ? 1 : chunk.length;

	  state.length += len;

	  var ret = state.length < state.highWaterMark;
	  // we must ensure that previous needDrain will not be reset to false.
	  if (!ret)
	    state.needDrain = true;

	  if (state.writing || state.corked)
	    state.buffer.push(new WriteReq(chunk, encoding, cb));
	  else
	    doWrite(stream, state, false, len, chunk, encoding, cb);

	  return ret;
	}

	function doWrite(stream, state, writev, len, chunk, encoding, cb) {
	  state.writelen = len;
	  state.writecb = cb;
	  state.writing = true;
	  state.sync = true;
	  if (writev)
	    stream._writev(chunk, state.onwrite);
	  else
	    stream._write(chunk, encoding, state.onwrite);
	  state.sync = false;
	}

	function onwriteError(stream, state, sync, er, cb) {
	  if (sync)
	    process.nextTick(function() {
	      state.pendingcb--;
	      cb(er);
	    });
	  else {
	    state.pendingcb--;
	    cb(er);
	  }

	  stream._writableState.errorEmitted = true;
	  stream.emit('error', er);
	}

	function onwriteStateUpdate(state) {
	  state.writing = false;
	  state.writecb = null;
	  state.length -= state.writelen;
	  state.writelen = 0;
	}

	function onwrite(stream, er) {
	  var state = stream._writableState;
	  var sync = state.sync;
	  var cb = state.writecb;

	  onwriteStateUpdate(state);

	  if (er)
	    onwriteError(stream, state, sync, er, cb);
	  else {
	    // Check if we're actually ready to finish, but don't emit yet
	    var finished = needFinish(stream, state);

	    if (!finished &&
	        !state.corked &&
	        !state.bufferProcessing &&
	        state.buffer.length) {
	      clearBuffer(stream, state);
	    }

	    if (sync) {
	      process.nextTick(function() {
	        afterWrite(stream, state, finished, cb);
	      });
	    } else {
	      afterWrite(stream, state, finished, cb);
	    }
	  }
	}

	function afterWrite(stream, state, finished, cb) {
	  if (!finished)
	    onwriteDrain(stream, state);
	  state.pendingcb--;
	  cb();
	  finishMaybe(stream, state);
	}

	// Must force callback to be called on nextTick, so that we don't
	// emit 'drain' before the write() consumer gets the 'false' return
	// value, and has a chance to attach a 'drain' listener.
	function onwriteDrain(stream, state) {
	  if (state.length === 0 && state.needDrain) {
	    state.needDrain = false;
	    stream.emit('drain');
	  }
	}


	// if there's something in the buffer waiting, then process it
	function clearBuffer(stream, state) {
	  state.bufferProcessing = true;

	  if (stream._writev && state.buffer.length > 1) {
	    // Fast case, write everything using _writev()
	    var cbs = [];
	    for (var c = 0; c < state.buffer.length; c++)
	      cbs.push(state.buffer[c].callback);

	    // count the one we are adding, as well.
	    // TODO(isaacs) clean this up
	    state.pendingcb++;
	    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
	      for (var i = 0; i < cbs.length; i++) {
	        state.pendingcb--;
	        cbs[i](err);
	      }
	    });

	    // Clear buffer
	    state.buffer = [];
	  } else {
	    // Slow case, write chunks one-by-one
	    for (var c = 0; c < state.buffer.length; c++) {
	      var entry = state.buffer[c];
	      var chunk = entry.chunk;
	      var encoding = entry.encoding;
	      var cb = entry.callback;
	      var len = state.objectMode ? 1 : chunk.length;

	      doWrite(stream, state, false, len, chunk, encoding, cb);

	      // if we didn't call the onwrite immediately, then
	      // it means that we need to wait until it does.
	      // also, that means that the chunk and cb are currently
	      // being processed, so move the buffer counter past them.
	      if (state.writing) {
	        c++;
	        break;
	      }
	    }

	    if (c < state.buffer.length)
	      state.buffer = state.buffer.slice(c);
	    else
	      state.buffer.length = 0;
	  }

	  state.bufferProcessing = false;
	}

	Writable.prototype._write = function(chunk, encoding, cb) {
	  cb(new Error('not implemented'));

	};

	Writable.prototype._writev = null;

	Writable.prototype.end = function(chunk, encoding, cb) {
	  var state = this._writableState;

	  if (util.isFunction(chunk)) {
	    cb = chunk;
	    chunk = null;
	    encoding = null;
	  } else if (util.isFunction(encoding)) {
	    cb = encoding;
	    encoding = null;
	  }

	  if (!util.isNullOrUndefined(chunk))
	    this.write(chunk, encoding);

	  // .end() fully uncorks
	  if (state.corked) {
	    state.corked = 1;
	    this.uncork();
	  }

	  // ignore unnecessary end() calls.
	  if (!state.ending && !state.finished)
	    endWritable(this, state, cb);
	};


	function needFinish(stream, state) {
	  return (state.ending &&
	          state.length === 0 &&
	          !state.finished &&
	          !state.writing);
	}

	function prefinish(stream, state) {
	  if (!state.prefinished) {
	    state.prefinished = true;
	    stream.emit('prefinish');
	  }
	}

	function finishMaybe(stream, state) {
	  var need = needFinish(stream, state);
	  if (need) {
	    if (state.pendingcb === 0) {
	      prefinish(stream, state);
	      state.finished = true;
	      stream.emit('finish');
	    } else
	      prefinish(stream, state);
	  }
	  return need;
	}

	function endWritable(stream, state, cb) {
	  state.ending = true;
	  finishMaybe(stream, state);
	  if (cb) {
	    if (state.finished)
	      process.nextTick(cb);
	    else
	      stream.once('finish', cb);
	  }
	  state.ended = true;
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(16)))

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var Buffer = __webpack_require__(7).Buffer;

	var isBufferEncoding = Buffer.isEncoding
	  || function(encoding) {
	       switch (encoding && encoding.toLowerCase()) {
	         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
	         default: return false;
	       }
	     }


	function assertEncoding(encoding) {
	  if (encoding && !isBufferEncoding(encoding)) {
	    throw new Error('Unknown encoding: ' + encoding);
	  }
	}

	// StringDecoder provides an interface for efficiently splitting a series of
	// buffers into a series of JS strings without breaking apart multi-byte
	// characters. CESU-8 is handled as part of the UTF-8 encoding.
	//
	// @TODO Handling all encodings inside a single object makes it very difficult
	// to reason about this code, so it should be split up in the future.
	// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
	// points as used by CESU-8.
	var StringDecoder = exports.StringDecoder = function(encoding) {
	  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
	  assertEncoding(encoding);
	  switch (this.encoding) {
	    case 'utf8':
	      // CESU-8 represents each of Surrogate Pair by 3-bytes
	      this.surrogateSize = 3;
	      break;
	    case 'ucs2':
	    case 'utf16le':
	      // UTF-16 represents each of Surrogate Pair by 2-bytes
	      this.surrogateSize = 2;
	      this.detectIncompleteChar = utf16DetectIncompleteChar;
	      break;
	    case 'base64':
	      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
	      this.surrogateSize = 3;
	      this.detectIncompleteChar = base64DetectIncompleteChar;
	      break;
	    default:
	      this.write = passThroughWrite;
	      return;
	  }

	  // Enough space to store all bytes of a single character. UTF-8 needs 4
	  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
	  this.charBuffer = new Buffer(6);
	  // Number of bytes received for the current incomplete multi-byte character.
	  this.charReceived = 0;
	  // Number of bytes expected for the current incomplete multi-byte character.
	  this.charLength = 0;
	};


	// write decodes the given buffer and returns it as JS string that is
	// guaranteed to not contain any partial multi-byte characters. Any partial
	// character found at the end of the buffer is buffered up, and will be
	// returned when calling write again with the remaining bytes.
	//
	// Note: Converting a Buffer containing an orphan surrogate to a String
	// currently works, but converting a String to a Buffer (via `new Buffer`, or
	// Buffer#write) will replace incomplete surrogates with the unicode
	// replacement character. See https://codereview.chromium.org/121173009/ .
	StringDecoder.prototype.write = function(buffer) {
	  var charStr = '';
	  // if our last write ended with an incomplete multibyte character
	  while (this.charLength) {
	    // determine how many remaining bytes this buffer has to offer for this char
	    var available = (buffer.length >= this.charLength - this.charReceived) ?
	        this.charLength - this.charReceived :
	        buffer.length;

	    // add the new bytes to the char buffer
	    buffer.copy(this.charBuffer, this.charReceived, 0, available);
	    this.charReceived += available;

	    if (this.charReceived < this.charLength) {
	      // still not enough chars in this buffer? wait for more ...
	      return '';
	    }

	    // remove bytes belonging to the current character from the buffer
	    buffer = buffer.slice(available, buffer.length);

	    // get the character that was split
	    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

	    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	    var charCode = charStr.charCodeAt(charStr.length - 1);
	    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	      this.charLength += this.surrogateSize;
	      charStr = '';
	      continue;
	    }
	    this.charReceived = this.charLength = 0;

	    // if there are no more bytes in this buffer, just emit our char
	    if (buffer.length === 0) {
	      return charStr;
	    }
	    break;
	  }

	  // determine and set charLength / charReceived
	  this.detectIncompleteChar(buffer);

	  var end = buffer.length;
	  if (this.charLength) {
	    // buffer the incomplete character bytes we got
	    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
	    end -= this.charReceived;
	  }

	  charStr += buffer.toString(this.encoding, 0, end);

	  var end = charStr.length - 1;
	  var charCode = charStr.charCodeAt(end);
	  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	    var size = this.surrogateSize;
	    this.charLength += size;
	    this.charReceived += size;
	    this.charBuffer.copy(this.charBuffer, size, 0, size);
	    buffer.copy(this.charBuffer, 0, 0, size);
	    return charStr.substring(0, end);
	  }

	  // or just emit the charStr
	  return charStr;
	};

	// detectIncompleteChar determines if there is an incomplete UTF-8 character at
	// the end of the given buffer. If so, it sets this.charLength to the byte
	// length that character, and sets this.charReceived to the number of bytes
	// that are available for this character.
	StringDecoder.prototype.detectIncompleteChar = function(buffer) {
	  // determine how many bytes we have to check at the end of this buffer
	  var i = (buffer.length >= 3) ? 3 : buffer.length;

	  // Figure out if one of the last i bytes of our buffer announces an
	  // incomplete char.
	  for (; i > 0; i--) {
	    var c = buffer[buffer.length - i];

	    // See http://en.wikipedia.org/wiki/UTF-8#Description

	    // 110XXXXX
	    if (i == 1 && c >> 5 == 0x06) {
	      this.charLength = 2;
	      break;
	    }

	    // 1110XXXX
	    if (i <= 2 && c >> 4 == 0x0E) {
	      this.charLength = 3;
	      break;
	    }

	    // 11110XXX
	    if (i <= 3 && c >> 3 == 0x1E) {
	      this.charLength = 4;
	      break;
	    }
	  }
	  this.charReceived = i;
	};

	StringDecoder.prototype.end = function(buffer) {
	  var res = '';
	  if (buffer && buffer.length)
	    res = this.write(buffer);

	  if (this.charReceived) {
	    var cr = this.charReceived;
	    var buf = this.charBuffer;
	    var enc = this.encoding;
	    res += buf.slice(0, cr).toString(enc);
	  }

	  return res;
	};

	function passThroughWrite(buffer) {
	  return buffer.toString(this.encoding);
	}

	function utf16DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 2;
	  this.charLength = this.charReceived ? 2 : 0;
	}

	function base64DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 3;
	  this.charLength = this.charReceived ? 3 : 0;
	}


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.


	// a transform stream is a readable/writable stream where you do
	// something with the data.  Sometimes it's called a "filter",
	// but that's not a great name for it, since that implies a thing where
	// some bits pass through, and others are simply ignored.  (That would
	// be a valid example of a transform, of course.)
	//
	// While the output is causally related to the input, it's not a
	// necessarily symmetric or synchronous transformation.  For example,
	// a zlib stream might take multiple plain-text writes(), and then
	// emit a single compressed chunk some time in the future.
	//
	// Here's how this works:
	//
	// The Transform stream has all the aspects of the readable and writable
	// stream classes.  When you write(chunk), that calls _write(chunk,cb)
	// internally, and returns false if there's a lot of pending writes
	// buffered up.  When you call read(), that calls _read(n) until
	// there's enough pending readable data buffered up.
	//
	// In a transform stream, the written data is placed in a buffer.  When
	// _read(n) is called, it transforms the queued up data, calling the
	// buffered _write cb's as it consumes chunks.  If consuming a single
	// written chunk would result in multiple output chunks, then the first
	// outputted bit calls the readcb, and subsequent chunks just go into
	// the read buffer, and will cause it to emit 'readable' if necessary.
	//
	// This way, back-pressure is actually determined by the reading side,
	// since _read has to be called to start processing a new chunk.  However,
	// a pathological inflate type of transform can cause excessive buffering
	// here.  For example, imagine a stream where every byte of input is
	// interpreted as an integer from 0-255, and then results in that many
	// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
	// 1kb of data being output.  In this case, you could write a very small
	// amount of input, and end up with a very large amount of output.  In
	// such a pathological inflating mechanism, there'd be no way to tell
	// the system to stop doing the transform.  A single 4MB write could
	// cause the system to run out of memory.
	//
	// However, even in such a pathological case, only a single written chunk
	// would be consumed, and then the rest would wait (un-transformed) until
	// the results of the previous transformed chunk were consumed.

	module.exports = Transform;

	var Duplex = __webpack_require__(21);

	/*<replacement>*/
	var util = __webpack_require__(18);
	util.inherits = __webpack_require__(19);
	/*</replacement>*/

	util.inherits(Transform, Duplex);


	function TransformState(options, stream) {
	  this.afterTransform = function(er, data) {
	    return afterTransform(stream, er, data);
	  };

	  this.needTransform = false;
	  this.transforming = false;
	  this.writecb = null;
	  this.writechunk = null;
	}

	function afterTransform(stream, er, data) {
	  var ts = stream._transformState;
	  ts.transforming = false;

	  var cb = ts.writecb;

	  if (!cb)
	    return stream.emit('error', new Error('no writecb in Transform class'));

	  ts.writechunk = null;
	  ts.writecb = null;

	  if (!util.isNullOrUndefined(data))
	    stream.push(data);

	  if (cb)
	    cb(er);

	  var rs = stream._readableState;
	  rs.reading = false;
	  if (rs.needReadable || rs.length < rs.highWaterMark) {
	    stream._read(rs.highWaterMark);
	  }
	}


	function Transform(options) {
	  if (!(this instanceof Transform))
	    return new Transform(options);

	  Duplex.call(this, options);

	  this._transformState = new TransformState(options, this);

	  // when the writable side finishes, then flush out anything remaining.
	  var stream = this;

	  // start out asking for a readable event once data is transformed.
	  this._readableState.needReadable = true;

	  // we have implemented the _read method, and done the other things
	  // that Readable wants before the first _read call, so unset the
	  // sync guard flag.
	  this._readableState.sync = false;

	  this.once('prefinish', function() {
	    if (util.isFunction(this._flush))
	      this._flush(function(er) {
	        done(stream, er);
	      });
	    else
	      done(stream);
	  });
	}

	Transform.prototype.push = function(chunk, encoding) {
	  this._transformState.needTransform = false;
	  return Duplex.prototype.push.call(this, chunk, encoding);
	};

	// This is the part where you do stuff!
	// override this function in implementation classes.
	// 'chunk' is an input chunk.
	//
	// Call `push(newChunk)` to pass along transformed output
	// to the readable side.  You may call 'push' zero or more times.
	//
	// Call `cb(err)` when you are done with this chunk.  If you pass
	// an error, then that'll put the hurt on the whole operation.  If you
	// never call cb(), then you'll never get another chunk.
	Transform.prototype._transform = function(chunk, encoding, cb) {
	  throw new Error('not implemented');
	};

	Transform.prototype._write = function(chunk, encoding, cb) {
	  var ts = this._transformState;
	  ts.writecb = cb;
	  ts.writechunk = chunk;
	  ts.writeencoding = encoding;
	  if (!ts.transforming) {
	    var rs = this._readableState;
	    if (ts.needTransform ||
	        rs.needReadable ||
	        rs.length < rs.highWaterMark)
	      this._read(rs.highWaterMark);
	  }
	};

	// Doesn't matter what the args are here.
	// _transform does all the work.
	// That we got here means that the readable side wants more data.
	Transform.prototype._read = function(n) {
	  var ts = this._transformState;

	  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
	    ts.transforming = true;
	    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
	  } else {
	    // mark that we need a transform, so that any data that comes in
	    // will get processed, now that we've asked for it.
	    ts.needTransform = true;
	  }
	};


	function done(stream, er) {
	  if (er)
	    return stream.emit('error', er);

	  // if there's nothing in the write buffer, then that means
	  // that nothing more will ever be provided
	  var ws = stream._writableState;
	  var ts = stream._transformState;

	  if (ws.length)
	    throw new Error('calling transform done when ws.length != 0');

	  if (ts.transforming)
	    throw new Error('calling transform done when still transforming');

	  return stream.push(null);
	}


/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a passthrough stream.
	// basically just the most minimal sort of Transform stream.
	// Every written chunk gets output as-is.

	module.exports = PassThrough;

	var Transform = __webpack_require__(24);

	/*<replacement>*/
	var util = __webpack_require__(18);
	util.inherits = __webpack_require__(19);
	/*</replacement>*/

	util.inherits(PassThrough, Transform);

	function PassThrough(options) {
	  if (!(this instanceof PassThrough))
	    return new PassThrough(options);

	  Transform.call(this, options);
	}

	PassThrough.prototype._transform = function(chunk, encoding, cb) {
	  cb(null, chunk);
	};


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(22)


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(21)


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(24)


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(25)


/***/ },
/* 30 */
/***/ function(module, exports) {

	/* NeuQuant Neural-Net Quantization Algorithm
	 * ------------------------------------------
	 *
	 * Copyright (c) 1994 Anthony Dekker
	 *
	 * NEUQUANT Neural-Net quantization algorithm by Anthony Dekker, 1994.
	 * See "Kohonen neural networks for optimal colour quantization"
	 * in "Network: Computation in Neural Systems" Vol. 5 (1994) pp 351-367.
	 * for a discussion of the algorithm.
	 * See also  http://members.ozemail.com.au/~dekker/NEUQUANT.HTML
	 *
	 * Any party obtaining a copy of these files from the author, directly or
	 * indirectly, is granted, free of charge, a full and unrestricted irrevocable,
	 * world-wide, paid up, royalty-free, nonexclusive right and license to deal
	 * in this software and documentation files (the "Software"), including without
	 * limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
	 * and/or sell copies of the Software, and to permit persons who receive
	 * copies from any such party to do so, with the only requirement being
	 * that this copyright notice remain intact.
	 *
	 * (JavaScript port 2012 by Johan Nordberg)
	 */

	var ncycles = 100; // number of learning cycles
	var netsize = 256; // number of colors used
	var maxnetpos = netsize - 1;

	// defs for freq and bias
	var netbiasshift = 4; // bias for colour values
	var intbiasshift = 16; // bias for fractions
	var intbias = (1 << intbiasshift);
	var gammashift = 10;
	var gamma = (1 << gammashift);
	var betashift = 10;
	var beta = (intbias >> betashift); /* beta = 1/1024 */
	var betagamma = (intbias << (gammashift - betashift));

	// defs for decreasing radius factor
	var initrad = (netsize >> 3); // for 256 cols, radius starts
	var radiusbiasshift = 6; // at 32.0 biased by 6 bits
	var radiusbias = (1 << radiusbiasshift);
	var initradius = (initrad * radiusbias); //and decreases by a
	var radiusdec = 30; // factor of 1/30 each cycle

	// defs for decreasing alpha factor
	var alphabiasshift = 10; // alpha starts at 1.0
	var initalpha = (1 << alphabiasshift);
	var alphadec; // biased by 10 bits

	/* radbias and alpharadbias used for radpower calculation */
	var radbiasshift = 8;
	var radbias = (1 << radbiasshift);
	var alpharadbshift = (alphabiasshift + radbiasshift);
	var alpharadbias = (1 << alpharadbshift);

	// four primes near 500 - assume no image has a length so large that it is
	// divisible by all four primes
	var prime1 = 499;
	var prime2 = 491;
	var prime3 = 487;
	var prime4 = 503;
	var minpicturebytes = (3 * prime4);

	/*
	  Constructor: NeuQuant

	  Arguments:

	  pixels - array of pixels in RGB format
	  samplefac - sampling factor 1 to 30 where lower is better quality

	  >
	  > pixels = [r, g, b, r, g, b, r, g, b, ..]
	  >
	*/
	function NeuQuant(pixels, samplefac) {
	  var network; // int[netsize][4]
	  var netindex; // for network lookup - really 256

	  // bias and freq arrays for learning
	  var bias;
	  var freq;
	  var radpower;

	  /*
	    Private Method: init

	    sets up arrays
	  */
	  function init() {
	    network = [];
	    netindex = new Int32Array(256);
	    bias = new Int32Array(netsize);
	    freq = new Int32Array(netsize);
	    radpower = new Int32Array(netsize >> 3);

	    var i, v;
	    for (i = 0; i < netsize; i++) {
	      v = (i << (netbiasshift + 8)) / netsize;
	      network[i] = new Float64Array([v, v, v, 0]);
	      //network[i] = [v, v, v, 0]
	      freq[i] = intbias / netsize;
	      bias[i] = 0;
	    }
	  }

	  /*
	    Private Method: unbiasnet

	    unbiases network to give byte values 0..255 and record position i to prepare for sort
	  */
	  function unbiasnet() {
	    for (var i = 0; i < netsize; i++) {
	      network[i][0] >>= netbiasshift;
	      network[i][1] >>= netbiasshift;
	      network[i][2] >>= netbiasshift;
	      network[i][3] = i; // record color number
	    }
	  }

	  /*
	    Private Method: altersingle

	    moves neuron *i* towards biased (b,g,r) by factor *alpha*
	  */
	  function altersingle(alpha, i, b, g, r) {
	    network[i][0] -= (alpha * (network[i][0] - b)) / initalpha;
	    network[i][1] -= (alpha * (network[i][1] - g)) / initalpha;
	    network[i][2] -= (alpha * (network[i][2] - r)) / initalpha;
	  }

	  /*
	    Private Method: alterneigh

	    moves neurons in *radius* around index *i* towards biased (b,g,r) by factor *alpha*
	  */
	  function alterneigh(radius, i, b, g, r) {
	    var lo = Math.abs(i - radius);
	    var hi = Math.min(i + radius, netsize);

	    var j = i + 1;
	    var k = i - 1;
	    var m = 1;

	    var p, a;
	    while ((j < hi) || (k > lo)) {
	      a = radpower[m++];

	      if (j < hi) {
	        p = network[j++];
	        p[0] -= (a * (p[0] - b)) / alpharadbias;
	        p[1] -= (a * (p[1] - g)) / alpharadbias;
	        p[2] -= (a * (p[2] - r)) / alpharadbias;
	      }

	      if (k > lo) {
	        p = network[k--];
	        p[0] -= (a * (p[0] - b)) / alpharadbias;
	        p[1] -= (a * (p[1] - g)) / alpharadbias;
	        p[2] -= (a * (p[2] - r)) / alpharadbias;
	      }
	    }
	  }

	  /*
	    Private Method: contest

	    searches for biased BGR values
	  */
	  function contest(b, g, r) {
	    /*
	      finds closest neuron (min dist) and updates freq
	      finds best neuron (min dist-bias) and returns position
	      for frequently chosen neurons, freq[i] is high and bias[i] is negative
	      bias[i] = gamma * ((1 / netsize) - freq[i])
	    */

	    var bestd = ~(1 << 31);
	    var bestbiasd = bestd;
	    var bestpos = -1;
	    var bestbiaspos = bestpos;

	    var i, n, dist, biasdist, betafreq;
	    for (i = 0; i < netsize; i++) {
	      n = network[i];

	      dist = Math.abs(n[0] - b) + Math.abs(n[1] - g) + Math.abs(n[2] - r);
	      if (dist < bestd) {
	        bestd = dist;
	        bestpos = i;
	      }

	      biasdist = dist - ((bias[i]) >> (intbiasshift - netbiasshift));
	      if (biasdist < bestbiasd) {
	        bestbiasd = biasdist;
	        bestbiaspos = i;
	      }

	      betafreq = (freq[i] >> betashift);
	      freq[i] -= betafreq;
	      bias[i] += (betafreq << gammashift);
	    }

	    freq[bestpos] += beta;
	    bias[bestpos] -= betagamma;

	    return bestbiaspos;
	  }

	  /*
	    Private Method: inxbuild

	    sorts network and builds netindex[0..255]
	  */
	  function inxbuild() {
	    var i, j, p, q, smallpos, smallval, previouscol = 0, startpos = 0;
	    for (i = 0; i < netsize; i++) {
	      p = network[i];
	      smallpos = i;
	      smallval = p[1]; // index on g
	      // find smallest in i..netsize-1
	      for (j = i + 1; j < netsize; j++) {
	        q = network[j];
	        if (q[1] < smallval) { // index on g
	          smallpos = j;
	          smallval = q[1]; // index on g
	        }
	      }
	      q = network[smallpos];
	      // swap p (i) and q (smallpos) entries
	      if (i != smallpos) {
	        j = q[0];   q[0] = p[0];   p[0] = j;
	        j = q[1];   q[1] = p[1];   p[1] = j;
	        j = q[2];   q[2] = p[2];   p[2] = j;
	        j = q[3];   q[3] = p[3];   p[3] = j;
	      }
	      // smallval entry is now in position i

	      if (smallval != previouscol) {
	        netindex[previouscol] = (startpos + i) >> 1;
	        for (j = previouscol + 1; j < smallval; j++)
	          netindex[j] = i;
	        previouscol = smallval;
	        startpos = i;
	      }
	    }
	    netindex[previouscol] = (startpos + maxnetpos) >> 1;
	    for (j = previouscol + 1; j < 256; j++)
	      netindex[j] = maxnetpos; // really 256
	  }

	  /*
	    Private Method: inxsearch

	    searches for BGR values 0..255 and returns a color index
	  */
	  function inxsearch(b, g, r) {
	    var a, p, dist;

	    var bestd = 1000; // biggest possible dist is 256*3
	    var best = -1;

	    var i = netindex[g]; // index on g
	    var j = i - 1; // start at netindex[g] and work outwards

	    while ((i < netsize) || (j >= 0)) {
	      if (i < netsize) {
	        p = network[i];
	        dist = p[1] - g; // inx key
	        if (dist >= bestd) i = netsize; // stop iter
	        else {
	          i++;
	          if (dist < 0) dist = -dist;
	          a = p[0] - b; if (a < 0) a = -a;
	          dist += a;
	          if (dist < bestd) {
	            a = p[2] - r; if (a < 0) a = -a;
	            dist += a;
	            if (dist < bestd) {
	              bestd = dist;
	              best = p[3];
	            }
	          }
	        }
	      }
	      if (j >= 0) {
	        p = network[j];
	        dist = g - p[1]; // inx key - reverse dif
	        if (dist >= bestd) j = -1; // stop iter
	        else {
	          j--;
	          if (dist < 0) dist = -dist;
	          a = p[0] - b; if (a < 0) a = -a;
	          dist += a;
	          if (dist < bestd) {
	            a = p[2] - r; if (a < 0) a = -a;
	            dist += a;
	            if (dist < bestd) {
	              bestd = dist;
	              best = p[3];
	            }
	          }
	        }
	      }
	    }

	    return best;
	  }

	  /*
	    Private Method: learn

	    "Main Learning Loop"
	  */
	  function learn() {
	    var i;

	    var lengthcount = pixels.length;
	    var alphadec = 30 + ((samplefac - 1) / 3);
	    var samplepixels = lengthcount / (3 * samplefac);
	    var delta = ~~(samplepixels / ncycles);
	    var alpha = initalpha;
	    var radius = initradius;

	    var rad = radius >> radiusbiasshift;

	    if (rad <= 1) rad = 0;
	    for (i = 0; i < rad; i++)
	      radpower[i] = alpha * (((rad * rad - i * i) * radbias) / (rad * rad));

	    var step;
	    if (lengthcount < minpicturebytes) {
	      samplefac = 1;
	      step = 3;
	    } else if ((lengthcount % prime1) !== 0) {
	      step = 3 * prime1;
	    } else if ((lengthcount % prime2) !== 0) {
	      step = 3 * prime2;
	    } else if ((lengthcount % prime3) !== 0)  {
	      step = 3 * prime3;
	    } else {
	      step = 3 * prime4;
	    }

	    var b, g, r, j;
	    var pix = 0; // current pixel

	    i = 0;
	    while (i < samplepixels) {
	      b = (pixels[pix] & 0xff) << netbiasshift;
	      g = (pixels[pix + 1] & 0xff) << netbiasshift;
	      r = (pixels[pix + 2] & 0xff) << netbiasshift;

	      j = contest(b, g, r);

	      altersingle(alpha, j, b, g, r);
	      if (rad !== 0) alterneigh(rad, j, b, g, r); // alter neighbours

	      pix += step;
	      if (pix >= lengthcount) pix -= lengthcount;

	      i++;

	      if (delta === 0) delta = 1;
	      if (i % delta === 0) {
	        alpha -= alpha / alphadec;
	        radius -= radius / radiusdec;
	        rad = radius >> radiusbiasshift;

	        if (rad <= 1) rad = 0;
	        for (j = 0; j < rad; j++)
	          radpower[j] = alpha * (((rad * rad - j * j) * radbias) / (rad * rad));
	      }
	    }
	  }

	  /*
	    Method: buildColormap

	    1. initializes network
	    2. trains it
	    3. removes misconceptions
	    4. builds colorindex
	  */
	  function buildColormap() {
	    init();
	    learn();
	    unbiasnet();
	    inxbuild();
	  }
	  this.buildColormap = buildColormap;

	  /*
	    Method: getColormap

	    builds colormap from the index

	    returns array in the format:

	    >
	    > [r, g, b, r, g, b, r, g, b, ..]
	    >
	  */
	  function getColormap() {
	    var map = [];
	    var index = [];

	    for (var i = 0; i < netsize; i++)
	      index[network[i][3]] = i;

	    var k = 0;
	    for (var l = 0; l < netsize; l++) {
	      var j = index[l];
	      map[k++] = (network[j][0]);
	      map[k++] = (network[j][1]);
	      map[k++] = (network[j][2]);
	    }
	    return map;
	  }
	  this.getColormap = getColormap;

	  /*
	    Method: lookupRGB

	    looks for the closest *r*, *g*, *b* color in the map and
	    returns its index
	  */
	  this.lookupRGB = inxsearch;
	}

	module.exports = NeuQuant;


/***/ },
/* 31 */
/***/ function(module, exports) {

	/*
	  LZWEncoder.js

	  Authors
	  Kevin Weiner (original Java version - kweiner@fmsware.com)
	  Thibault Imbert (AS3 version - bytearray.org)
	  Johan Nordberg (JS version - code@johan-nordberg.com)

	  Acknowledgements
	  GIFCOMPR.C - GIF Image compression routines
	  Lempel-Ziv compression based on 'compress'. GIF modifications by
	  David Rowley (mgardi@watdcsu.waterloo.edu)
	  GIF Image compression - modified 'compress'
	  Based on: compress.c - File compression ala IEEE Computer, June 1984.
	  By Authors: Spencer W. Thomas (decvax!harpo!utah-cs!utah-gr!thomas)
	  Jim McKie (decvax!mcvax!jim)
	  Steve Davies (decvax!vax135!petsd!peora!srd)
	  Ken Turkowski (decvax!decwrl!turtlevax!ken)
	  James A. Woods (decvax!ihnp4!ames!jaw)
	  Joe Orost (decvax!vax135!petsd!joe)
	*/

	var EOF = -1;
	var BITS = 12;
	var HSIZE = 5003; // 80% occupancy
	var masks = [0x0000, 0x0001, 0x0003, 0x0007, 0x000F, 0x001F,
	             0x003F, 0x007F, 0x00FF, 0x01FF, 0x03FF, 0x07FF,
	             0x0FFF, 0x1FFF, 0x3FFF, 0x7FFF, 0xFFFF];

	function LZWEncoder(width, height, pixels, colorDepth) {
	  var initCodeSize = Math.max(2, colorDepth);

	  var accum = new Uint8Array(256);
	  var htab = new Int32Array(HSIZE);
	  var codetab = new Int32Array(HSIZE);

	  var cur_accum, cur_bits = 0;
	  var a_count;
	  var free_ent = 0; // first unused entry
	  var maxcode;

	  // block compression parameters -- after all codes are used up,
	  // and compression rate changes, start over.
	  var clear_flg = false;

	  // Algorithm: use open addressing double hashing (no chaining) on the
	  // prefix code / next character combination. We do a variant of Knuth's
	  // algorithm D (vol. 3, sec. 6.4) along with G. Knott's relatively-prime
	  // secondary probe. Here, the modular division first probe is gives way
	  // to a faster exclusive-or manipulation. Also do block compression with
	  // an adaptive reset, whereby the code table is cleared when the compression
	  // ratio decreases, but after the table fills. The variable-length output
	  // codes are re-sized at this point, and a special CLEAR code is generated
	  // for the decompressor. Late addition: construct the table according to
	  // file size for noticeable speed improvement on small files. Please direct
	  // questions about this implementation to ames!jaw.
	  var g_init_bits, ClearCode, EOFCode;

	  // Add a character to the end of the current packet, and if it is 254
	  // characters, flush the packet to disk.
	  function char_out(c, outs) {
	    accum[a_count++] = c;
	    if (a_count >= 254) flush_char(outs);
	  }

	  // Clear out the hash table
	  // table clear for block compress
	  function cl_block(outs) {
	    cl_hash(HSIZE);
	    free_ent = ClearCode + 2;
	    clear_flg = true;
	    output(ClearCode, outs);
	  }

	  // Reset code table
	  function cl_hash(hsize) {
	    for (var i = 0; i < hsize; ++i) htab[i] = -1;
	  }

	  function compress(init_bits, outs) {
	    var fcode, c, i, ent, disp, hsize_reg, hshift;

	    // Set up the globals: g_init_bits - initial number of bits
	    g_init_bits = init_bits;

	    // Set up the necessary values
	    clear_flg = false;
	    n_bits = g_init_bits;
	    maxcode = MAXCODE(n_bits);

	    ClearCode = 1 << (init_bits - 1);
	    EOFCode = ClearCode + 1;
	    free_ent = ClearCode + 2;

	    a_count = 0; // clear packet

	    ent = nextPixel();

	    hshift = 0;
	    for (fcode = HSIZE; fcode < 65536; fcode *= 2) ++hshift;
	    hshift = 8 - hshift; // set hash code range bound
	    hsize_reg = HSIZE;
	    cl_hash(hsize_reg); // clear hash table

	    output(ClearCode, outs);

	    outer_loop: while ((c = nextPixel()) != EOF) {
	      fcode = (c << BITS) + ent;
	      i = (c << hshift) ^ ent; // xor hashing
	      if (htab[i] === fcode) {
	        ent = codetab[i];
	        continue;
	      } else if (htab[i] >= 0) { // non-empty slot
	        disp = hsize_reg - i; // secondary hash (after G. Knott)
	        if (i === 0) disp = 1;
	        do {
	          if ((i -= disp) < 0) i += hsize_reg;
	          if (htab[i] === fcode) {
	            ent = codetab[i];
	            continue outer_loop;
	          }
	        } while (htab[i] >= 0);
	      }
	      output(ent, outs);
	      ent = c;
	      if (free_ent < 1 << BITS) {
	        codetab[i] = free_ent++; // code -> hashtable
	        htab[i] = fcode;
	      } else {
	        cl_block(outs);
	      }
	    }

	    // Put out the final code.
	    output(ent, outs);
	    output(EOFCode, outs);
	  }

	  function encode(outs) {
	    outs.writeByte(initCodeSize); // write "initial code size" byte
	    remaining = width * height; // reset navigation variables
	    curPixel = 0;
	    compress(initCodeSize + 1, outs); // compress and write the pixel data
	    outs.writeByte(0); // write block terminator
	  }

	  // Flush the packet to disk, and reset the accumulator
	  function flush_char(outs) {
	    if (a_count > 0) {
	      outs.writeByte(a_count);
	      outs.writeBytes(accum, 0, a_count);
	      a_count = 0;
	    }
	  }

	  function MAXCODE(n_bits) {
	    return (1 << n_bits) - 1;
	  }

	  // Return the next pixel from the image
	  function nextPixel() {
	    if (remaining === 0) return EOF;
	    --remaining;
	    var pix = pixels[curPixel++];
	    return pix & 0xff;
	  }

	  function output(code, outs) {
	    cur_accum &= masks[cur_bits];

	    if (cur_bits > 0) cur_accum |= (code << cur_bits);
	    else cur_accum = code;

	    cur_bits += n_bits;

	    while (cur_bits >= 8) {
	      char_out((cur_accum & 0xff), outs);
	      cur_accum >>= 8;
	      cur_bits -= 8;
	    }

	    // If the next entry is going to be too big for the code size,
	    // then increase it, if possible.
	    if (free_ent > maxcode || clear_flg) {
	      if (clear_flg) {
	        maxcode = MAXCODE(n_bits = g_init_bits);
	        clear_flg = false;
	      } else {
	        ++n_bits;
	        if (n_bits == BITS) maxcode = 1 << BITS;
	        else maxcode = MAXCODE(n_bits);
	      }
	    }

	    if (code == EOFCode) {
	      // At EOF, write the rest of the buffer.
	      while (cur_bits > 0) {
	        char_out((cur_accum & 0xff), outs);
	        cur_accum >>= 8;
	        cur_bits -= 8;
	      }
	      flush_char(outs);
	    }
	  }

	  this.encode = encode;
	}

	module.exports = LZWEncoder;


/***/ },
/* 32 */
/***/ function(module, exports) {

	

/***/ }
/******/ ]);