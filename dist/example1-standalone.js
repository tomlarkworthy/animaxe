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

	/// <reference path="../types/should.d.ts" />
	/// <reference path="../types/mocha.d.ts" />
	/// <reference path="../types/node.d.ts" />
	/// <reference path="../dist/animaxe.d.ts" />
	/// <reference path="./helper.ts" />
	__webpack_require__(34);
	var Ax = __webpack_require__(1);
	var helper = __webpack_require__(58);
	var animator = helper.getExampleAnimator();
	//2 frame animated glow
	function spark(css_color) {
	    var css = Ax.toStreamColor(css_color);
	    return Ax.take(1, Ax.draw(function () {
	        var css_next = css.init();
	        return function (tick) {
	            console.log("spark: frame1", css_next(tick.clock));
	            tick.ctx.fillStyle = css_next(tick.clock);
	            tick.ctx.fillRect(-2, -2, 5, 5);
	        };
	    })).then(Ax.take(1, Ax.draw(function () {
	        var css_next = css.init();
	        return function (tick) {
	            console.log("spark: frame2", css_next(tick.clock));
	            tick.ctx.fillStyle = css_next(tick.clock);
	            tick.ctx.fillRect(-1, -1, 3, 3);
	        };
	    })));
	}
	function sparkLong(css_color) {
	    return Ax.draw(function () {
	        return function (tick) {
	            console.log("sparkLong", css_color);
	            tick.ctx.fillStyle = css_color;
	            tick.ctx.fillRect(-1, -1, 3, 3);
	        };
	    });
	}
	//large circle funcitons
	var bigSin = Ax.sin(1).map(function (x) { return x * 40 + 50; });
	var bigCos = Ax.cos(1).map(function (x) { return x * 40 + 50; });
	var red = Ax.sin(2).map(function (x) { return x * 125 + 125; });
	var green = Ax.sin(2).map(function (x) { return x * 55 + 200; });
	animator.play(Ax.changeColor("#000000", Ax.rect([0, 0], [100, 100]))); //draw black background
	animator.play(Ax.loop(Ax.move(Ax.point(bigSin, bigCos), spark(Ax.rgba(red, green, 0, 1))))); //spinning spark forever
	animator.play(Ax.move([50, 50], Ax.velocity([50, 0], Ax.loop(spark("#FFFFFF"))))); //constant move
	animator.play(Ax.tween_linear([50, 50], Ax.point(bigSin, bigCos), 1, Ax.loop(spark("red")))); //spiral 1 second
	helper.playExample("example1", 20, animator, 100, 100);
	describe('example1', function () {
	    it('should match the reference', function (done) {
	        helper.sameExample("example1", "ref1", function (same) {
	            same.should.equal(true);
	            done();
	        });
	    });
	});


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
	/// <reference path="../types/node.d.ts" />
	var Rx = __webpack_require__(2);
	exports.DEBUG_LOOP = false;
	exports.DEBUG_THEN = false;
	exports.DEBUG_EMIT = true;
	var husl = __webpack_require__(5);
	console.log("Animaxe, https://github.com/tomlarkworthy/animaxe");
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
	                // console.log("fixed: val from parameter", value);
	                return value;
	            };
	        });
	    }
	    else {
	        return new Parameter(function () {
	            return function (clock) {
	                // console.log("fixed: val from constant", val);
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
	            // console.log("hsl: ", val);
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
	            tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
	            var velocity = velocity_next(tick.clock);
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
	function take(iterations, animation) {
	    return new Animation(function (prev) {
	        return prev.take(iterations);
	    }, animation);
	}
	exports.take = take;
	function save(width, height, path) {
	    var GIFEncoder = __webpack_require__(7);
	    var fs = __webpack_require__(33);
	    var encoder = new GIFEncoder(width, height);
	    encoder.createReadStream()
	        .pipe(encoder.createWriteStream({ repeat: 10000, delay: 100, quality: 1 }))
	        .pipe(fs.createWriteStream(path));
	    encoder.start();
	    return new Animation(function (parent) {
	        return parent.tap(function (tick) {
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
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module, global, process) {// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

	;(function (undefined) {

	  var objectTypes = {
	    'function': true,
	    'object': true
	  };

	  var
	    freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
	    freeSelf = objectTypes[typeof self] && self.Object && self,
	    freeWindow = objectTypes[typeof window] && window && window.Object && window,
	    freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
	    moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
	    freeGlobal = freeExports && freeModule && typeof global == 'object' && global && global.Object && global;

	  var root = root = freeGlobal || ((freeWindow !== (this && this.window)) && freeWindow) || freeSelf || this;

	  var Rx = {
	    internals: {},
	    config: {
	      Promise: root.Promise
	    },
	    helpers: { }
	  };

	  // Defaults
	  var noop = Rx.helpers.noop = function () { },
	    identity = Rx.helpers.identity = function (x) { return x; },
	    defaultNow = Rx.helpers.defaultNow = Date.now,
	    defaultComparer = Rx.helpers.defaultComparer = function (x, y) { return isEqual(x, y); },
	    defaultSubComparer = Rx.helpers.defaultSubComparer = function (x, y) { return x > y ? 1 : (x < y ? -1 : 0); },
	    defaultKeySerializer = Rx.helpers.defaultKeySerializer = function (x) { return x.toString(); },
	    defaultError = Rx.helpers.defaultError = function (err) { throw err; },
	    isPromise = Rx.helpers.isPromise = function (p) { return !!p && typeof p.subscribe !== 'function' && typeof p.then === 'function'; },
	    isFunction = Rx.helpers.isFunction = (function () {

	      var isFn = function (value) {
	        return typeof value == 'function' || false;
	      }

	      // fallback for older versions of Chrome and Safari
	      if (isFn(/x/)) {
	        isFn = function(value) {
	          return typeof value == 'function' && toString.call(value) == '[object Function]';
	        };
	      }

	      return isFn;
	    }());

	  function cloneArray(arr) { for(var a = [], i = 0, len = arr.length; i < len; i++) { a.push(arr[i]); } return a;}

	  var errorObj = {e: {}};
	  function tryCatcherGen(tryCatchTarget) {
	    return function tryCatcher() {
	      try {
	        return tryCatchTarget.apply(this, arguments);
	      } catch (e) {
	        errorObj.e = e;
	        return errorObj;
	      }
	    }
	  }
	  var tryCatch = Rx.internals.tryCatch = function tryCatch(fn) {
	    if (!isFunction(fn)) { throw new TypeError('fn must be a function'); }
	    return tryCatcherGen(fn);
	  }
	  function thrower(e) {
	    throw e;
	  }

	  Rx.config.longStackSupport = false;
	  var hasStacks = false, stacks = tryCatch(function () { throw new Error(); })();
	  hasStacks = !!stacks.e && !!stacks.e.stack;

	  // All code after this point will be filtered from stack traces reported by RxJS
	  var rStartingLine = captureLine(), rFileName;

	  var STACK_JUMP_SEPARATOR = 'From previous event:';

	  function makeStackTraceLong(error, observable) {
	    // If possible, transform the error stack trace by removing Node and RxJS
	    // cruft, then concatenating with the stack trace of `observable`.
	    if (hasStacks &&
	        observable.stack &&
	        typeof error === 'object' &&
	        error !== null &&
	        error.stack &&
	        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
	    ) {
	      var stacks = [];
	      for (var o = observable; !!o; o = o.source) {
	        if (o.stack) {
	          stacks.unshift(o.stack);
	        }
	      }
	      stacks.unshift(error.stack);

	      var concatedStacks = stacks.join('\n' + STACK_JUMP_SEPARATOR + '\n');
	      error.stack = filterStackString(concatedStacks);
	    }
	  }

	  function filterStackString(stackString) {
	    var lines = stackString.split('\n'), desiredLines = [];
	    for (var i = 0, len = lines.length; i < len; i++) {
	      var line = lines[i];

	      if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
	        desiredLines.push(line);
	      }
	    }
	    return desiredLines.join('\n');
	  }

	  function isInternalFrame(stackLine) {
	    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);
	    if (!fileNameAndLineNumber) {
	      return false;
	    }
	    var fileName = fileNameAndLineNumber[0], lineNumber = fileNameAndLineNumber[1];

	    return fileName === rFileName &&
	      lineNumber >= rStartingLine &&
	      lineNumber <= rEndingLine;
	  }

	  function isNodeFrame(stackLine) {
	    return stackLine.indexOf('(module.js:') !== -1 ||
	      stackLine.indexOf('(node.js:') !== -1;
	  }

	  function captureLine() {
	    if (!hasStacks) { return; }

	    try {
	      throw new Error();
	    } catch (e) {
	      var lines = e.stack.split('\n');
	      var firstLine = lines[0].indexOf('@') > 0 ? lines[1] : lines[2];
	      var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
	      if (!fileNameAndLineNumber) { return; }

	      rFileName = fileNameAndLineNumber[0];
	      return fileNameAndLineNumber[1];
	    }
	  }

	  function getFileNameAndLineNumber(stackLine) {
	    // Named functions: 'at functionName (filename:lineNumber:columnNumber)'
	    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
	    if (attempt1) { return [attempt1[1], Number(attempt1[2])]; }

	    // Anonymous functions: 'at filename:lineNumber:columnNumber'
	    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
	    if (attempt2) { return [attempt2[1], Number(attempt2[2])]; }

	    // Firefox style: 'function@filename:lineNumber or @filename:lineNumber'
	    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
	    if (attempt3) { return [attempt3[1], Number(attempt3[2])]; }
	  }

	  var EmptyError = Rx.EmptyError = function() {
	    this.message = 'Sequence contains no elements.';
	    this.name = 'EmptyError';
	    Error.call(this);
	  };
	  EmptyError.prototype = Object.create(Error.prototype);

	  var ObjectDisposedError = Rx.ObjectDisposedError = function() {
	    this.message = 'Object has been disposed';
	    this.name = 'ObjectDisposedError';
	    Error.call(this);
	  };
	  ObjectDisposedError.prototype = Object.create(Error.prototype);

	  var ArgumentOutOfRangeError = Rx.ArgumentOutOfRangeError = function () {
	    this.message = 'Argument out of range';
	    this.name = 'ArgumentOutOfRangeError';
	    Error.call(this);
	  };
	  ArgumentOutOfRangeError.prototype = Object.create(Error.prototype);

	  var NotSupportedError = Rx.NotSupportedError = function (message) {
	    this.message = message || 'This operation is not supported';
	    this.name = 'NotSupportedError';
	    Error.call(this);
	  };
	  NotSupportedError.prototype = Object.create(Error.prototype);

	  var NotImplementedError = Rx.NotImplementedError = function (message) {
	    this.message = message || 'This operation is not implemented';
	    this.name = 'NotImplementedError';
	    Error.call(this);
	  };
	  NotImplementedError.prototype = Object.create(Error.prototype);

	  var notImplemented = Rx.helpers.notImplemented = function () {
	    throw new NotImplementedError();
	  };

	  var notSupported = Rx.helpers.notSupported = function () {
	    throw new NotSupportedError();
	  };

	  // Shim in iterator support
	  var $iterator$ = (typeof Symbol === 'function' && Symbol.iterator) ||
	    '_es6shim_iterator_';
	  // Bug for mozilla version
	  if (root.Set && typeof new root.Set()['@@iterator'] === 'function') {
	    $iterator$ = '@@iterator';
	  }

	  var doneEnumerator = Rx.doneEnumerator = { done: true, value: undefined };

	  var isIterable = Rx.helpers.isIterable = function (o) {
	    return o[$iterator$] !== undefined;
	  }

	  var isArrayLike = Rx.helpers.isArrayLike = function (o) {
	    return o && o.length !== undefined;
	  }

	  Rx.helpers.iterator = $iterator$;

	  var bindCallback = Rx.internals.bindCallback = function (func, thisArg, argCount) {
	    if (typeof thisArg === 'undefined') { return func; }
	    switch(argCount) {
	      case 0:
	        return function() {
	          return func.call(thisArg)
	        };
	      case 1:
	        return function(arg) {
	          return func.call(thisArg, arg);
	        }
	      case 2:
	        return function(value, index) {
	          return func.call(thisArg, value, index);
	        };
	      case 3:
	        return function(value, index, collection) {
	          return func.call(thisArg, value, index, collection);
	        };
	    }

	    return function() {
	      return func.apply(thisArg, arguments);
	    };
	  };

	  /** Used to determine if values are of the language type Object */
	  var dontEnums = ['toString',
	    'toLocaleString',
	    'valueOf',
	    'hasOwnProperty',
	    'isPrototypeOf',
	    'propertyIsEnumerable',
	    'constructor'],
	  dontEnumsLength = dontEnums.length;

	  /** `Object#toString` result shortcuts */
	  var argsClass = '[object Arguments]',
	    arrayClass = '[object Array]',
	    boolClass = '[object Boolean]',
	    dateClass = '[object Date]',
	    errorClass = '[object Error]',
	    funcClass = '[object Function]',
	    numberClass = '[object Number]',
	    objectClass = '[object Object]',
	    regexpClass = '[object RegExp]',
	    stringClass = '[object String]';

	  var toString = Object.prototype.toString,
	    hasOwnProperty = Object.prototype.hasOwnProperty,
	    supportsArgsClass = toString.call(arguments) == argsClass, // For less <IE9 && FF<4
	    supportNodeClass,
	    errorProto = Error.prototype,
	    objectProto = Object.prototype,
	    stringProto = String.prototype,
	    propertyIsEnumerable = objectProto.propertyIsEnumerable;

	  try {
	    supportNodeClass = !(toString.call(document) == objectClass && !({ 'toString': 0 } + ''));
	  } catch (e) {
	    supportNodeClass = true;
	  }

	  var nonEnumProps = {};
	  nonEnumProps[arrayClass] = nonEnumProps[dateClass] = nonEnumProps[numberClass] = { 'constructor': true, 'toLocaleString': true, 'toString': true, 'valueOf': true };
	  nonEnumProps[boolClass] = nonEnumProps[stringClass] = { 'constructor': true, 'toString': true, 'valueOf': true };
	  nonEnumProps[errorClass] = nonEnumProps[funcClass] = nonEnumProps[regexpClass] = { 'constructor': true, 'toString': true };
	  nonEnumProps[objectClass] = { 'constructor': true };

	  var support = {};
	  (function () {
	    var ctor = function() { this.x = 1; },
	      props = [];

	    ctor.prototype = { 'valueOf': 1, 'y': 1 };
	    for (var key in new ctor) { props.push(key); }
	    for (key in arguments) { }

	    // Detect if `name` or `message` properties of `Error.prototype` are enumerable by default.
	    support.enumErrorProps = propertyIsEnumerable.call(errorProto, 'message') || propertyIsEnumerable.call(errorProto, 'name');

	    // Detect if `prototype` properties are enumerable by default.
	    support.enumPrototypes = propertyIsEnumerable.call(ctor, 'prototype');

	    // Detect if `arguments` object indexes are non-enumerable
	    support.nonEnumArgs = key != 0;

	    // Detect if properties shadowing those on `Object.prototype` are non-enumerable.
	    support.nonEnumShadows = !/valueOf/.test(props);
	  }(1));

	  var isObject = Rx.internals.isObject = function(value) {
	    var type = typeof value;
	    return value && (type == 'function' || type == 'object') || false;
	  };

	  function keysIn(object) {
	    var result = [];
	    if (!isObject(object)) {
	      return result;
	    }
	    if (support.nonEnumArgs && object.length && isArguments(object)) {
	      object = slice.call(object);
	    }
	    var skipProto = support.enumPrototypes && typeof object == 'function',
	        skipErrorProps = support.enumErrorProps && (object === errorProto || object instanceof Error);

	    for (var key in object) {
	      if (!(skipProto && key == 'prototype') &&
	          !(skipErrorProps && (key == 'message' || key == 'name'))) {
	        result.push(key);
	      }
	    }

	    if (support.nonEnumShadows && object !== objectProto) {
	      var ctor = object.constructor,
	          index = -1,
	          length = dontEnumsLength;

	      if (object === (ctor && ctor.prototype)) {
	        var className = object === stringProto ? stringClass : object === errorProto ? errorClass : toString.call(object),
	            nonEnum = nonEnumProps[className];
	      }
	      while (++index < length) {
	        key = dontEnums[index];
	        if (!(nonEnum && nonEnum[key]) && hasOwnProperty.call(object, key)) {
	          result.push(key);
	        }
	      }
	    }
	    return result;
	  }

	  function internalFor(object, callback, keysFunc) {
	    var index = -1,
	      props = keysFunc(object),
	      length = props.length;

	    while (++index < length) {
	      var key = props[index];
	      if (callback(object[key], key, object) === false) {
	        break;
	      }
	    }
	    return object;
	  }

	  function internalForIn(object, callback) {
	    return internalFor(object, callback, keysIn);
	  }

	  function isNode(value) {
	    // IE < 9 presents DOM nodes as `Object` objects except they have `toString`
	    // methods that are `typeof` "string" and still can coerce nodes to strings
	    return typeof value.toString != 'function' && typeof (value + '') == 'string';
	  }

	  var isArguments = function(value) {
	    return (value && typeof value == 'object') ? toString.call(value) == argsClass : false;
	  }

	  // fallback for browsers that can't detect `arguments` objects by [[Class]]
	  if (!supportsArgsClass) {
	    isArguments = function(value) {
	      return (value && typeof value == 'object') ? hasOwnProperty.call(value, 'callee') : false;
	    };
	  }

	  var isEqual = Rx.internals.isEqual = function (x, y) {
	    return deepEquals(x, y, [], []);
	  };

	  /** @private
	   * Used for deep comparison
	   **/
	  function deepEquals(a, b, stackA, stackB) {
	    // exit early for identical values
	    if (a === b) {
	      // treat `+0` vs. `-0` as not equal
	      return a !== 0 || (1 / a == 1 / b);
	    }

	    var type = typeof a,
	        otherType = typeof b;

	    // exit early for unlike primitive values
	    if (a === a && (a == null || b == null ||
	        (type != 'function' && type != 'object' && otherType != 'function' && otherType != 'object'))) {
	      return false;
	    }

	    // compare [[Class]] names
	    var className = toString.call(a),
	        otherClass = toString.call(b);

	    if (className == argsClass) {
	      className = objectClass;
	    }
	    if (otherClass == argsClass) {
	      otherClass = objectClass;
	    }
	    if (className != otherClass) {
	      return false;
	    }
	    switch (className) {
	      case boolClass:
	      case dateClass:
	        // coerce dates and booleans to numbers, dates to milliseconds and booleans
	        // to `1` or `0` treating invalid dates coerced to `NaN` as not equal
	        return +a == +b;

	      case numberClass:
	        // treat `NaN` vs. `NaN` as equal
	        return (a != +a) ?
	          b != +b :
	          // but treat `-0` vs. `+0` as not equal
	          (a == 0 ? (1 / a == 1 / b) : a == +b);

	      case regexpClass:
	      case stringClass:
	        // coerce regexes to strings (http://es5.github.io/#x15.10.6.4)
	        // treat string primitives and their corresponding object instances as equal
	        return a == String(b);
	    }
	    var isArr = className == arrayClass;
	    if (!isArr) {

	      // exit for functions and DOM nodes
	      if (className != objectClass || (!support.nodeClass && (isNode(a) || isNode(b)))) {
	        return false;
	      }
	      // in older versions of Opera, `arguments` objects have `Array` constructors
	      var ctorA = !support.argsObject && isArguments(a) ? Object : a.constructor,
	          ctorB = !support.argsObject && isArguments(b) ? Object : b.constructor;

	      // non `Object` object instances with different constructors are not equal
	      if (ctorA != ctorB &&
	            !(hasOwnProperty.call(a, 'constructor') && hasOwnProperty.call(b, 'constructor')) &&
	            !(isFunction(ctorA) && ctorA instanceof ctorA && isFunction(ctorB) && ctorB instanceof ctorB) &&
	            ('constructor' in a && 'constructor' in b)
	          ) {
	        return false;
	      }
	    }
	    // assume cyclic structures are equal
	    // the algorithm for detecting cyclic structures is adapted from ES 5.1
	    // section 15.12.3, abstract operation `JO` (http://es5.github.io/#x15.12.3)
	    var initedStack = !stackA;
	    stackA || (stackA = []);
	    stackB || (stackB = []);

	    var length = stackA.length;
	    while (length--) {
	      if (stackA[length] == a) {
	        return stackB[length] == b;
	      }
	    }
	    var size = 0;
	    var result = true;

	    // add `a` and `b` to the stack of traversed objects
	    stackA.push(a);
	    stackB.push(b);

	    // recursively compare objects and arrays (susceptible to call stack limits)
	    if (isArr) {
	      // compare lengths to determine if a deep comparison is necessary
	      length = a.length;
	      size = b.length;
	      result = size == length;

	      if (result) {
	        // deep compare the contents, ignoring non-numeric properties
	        while (size--) {
	          var index = length,
	              value = b[size];

	          if (!(result = deepEquals(a[size], value, stackA, stackB))) {
	            break;
	          }
	        }
	      }
	    }
	    else {
	      // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
	      // which, in this case, is more costly
	      internalForIn(b, function(value, key, b) {
	        if (hasOwnProperty.call(b, key)) {
	          // count the number of properties.
	          size++;
	          // deep compare each property value.
	          return (result = hasOwnProperty.call(a, key) && deepEquals(a[key], value, stackA, stackB));
	        }
	      });

	      if (result) {
	        // ensure both objects have the same number of properties
	        internalForIn(a, function(value, key, a) {
	          if (hasOwnProperty.call(a, key)) {
	            // `size` will be `-1` if `a` has more properties than `b`
	            return (result = --size > -1);
	          }
	        });
	      }
	    }
	    stackA.pop();
	    stackB.pop();

	    return result;
	  }

	  var hasProp = {}.hasOwnProperty,
	      slice = Array.prototype.slice;

	  var inherits = Rx.internals.inherits = function (child, parent) {
	    function __() { this.constructor = child; }
	    __.prototype = parent.prototype;
	    child.prototype = new __();
	  };

	  var addProperties = Rx.internals.addProperties = function (obj) {
	    for(var sources = [], i = 1, len = arguments.length; i < len; i++) { sources.push(arguments[i]); }
	    for (var idx = 0, ln = sources.length; idx < ln; idx++) {
	      var source = sources[idx];
	      for (var prop in source) {
	        obj[prop] = source[prop];
	      }
	    }
	  };

	  // Rx Utils
	  var addRef = Rx.internals.addRef = function (xs, r) {
	    return new AnonymousObservable(function (observer) {
	      return new CompositeDisposable(r.getDisposable(), xs.subscribe(observer));
	    });
	  };

	  function arrayInitialize(count, factory) {
	    var a = new Array(count);
	    for (var i = 0; i < count; i++) {
	      a[i] = factory();
	    }
	    return a;
	  }

	  // Collections
	  function IndexedItem(id, value) {
	    this.id = id;
	    this.value = value;
	  }

	  IndexedItem.prototype.compareTo = function (other) {
	    var c = this.value.compareTo(other.value);
	    c === 0 && (c = this.id - other.id);
	    return c;
	  };

	  // Priority Queue for Scheduling
	  var PriorityQueue = Rx.internals.PriorityQueue = function (capacity) {
	    this.items = new Array(capacity);
	    this.length = 0;
	  };

	  var priorityProto = PriorityQueue.prototype;
	  priorityProto.isHigherPriority = function (left, right) {
	    return this.items[left].compareTo(this.items[right]) < 0;
	  };

	  priorityProto.percolate = function (index) {
	    if (index >= this.length || index < 0) { return; }
	    var parent = index - 1 >> 1;
	    if (parent < 0 || parent === index) { return; }
	    if (this.isHigherPriority(index, parent)) {
	      var temp = this.items[index];
	      this.items[index] = this.items[parent];
	      this.items[parent] = temp;
	      this.percolate(parent);
	    }
	  };

	  priorityProto.heapify = function (index) {
	    +index || (index = 0);
	    if (index >= this.length || index < 0) { return; }
	    var left = 2 * index + 1,
	        right = 2 * index + 2,
	        first = index;
	    if (left < this.length && this.isHigherPriority(left, first)) {
	      first = left;
	    }
	    if (right < this.length && this.isHigherPriority(right, first)) {
	      first = right;
	    }
	    if (first !== index) {
	      var temp = this.items[index];
	      this.items[index] = this.items[first];
	      this.items[first] = temp;
	      this.heapify(first);
	    }
	  };

	  priorityProto.peek = function () { return this.items[0].value; };

	  priorityProto.removeAt = function (index) {
	    this.items[index] = this.items[--this.length];
	    this.items[this.length] = undefined;
	    this.heapify();
	  };

	  priorityProto.dequeue = function () {
	    var result = this.peek();
	    this.removeAt(0);
	    return result;
	  };

	  priorityProto.enqueue = function (item) {
	    var index = this.length++;
	    this.items[index] = new IndexedItem(PriorityQueue.count++, item);
	    this.percolate(index);
	  };

	  priorityProto.remove = function (item) {
	    for (var i = 0; i < this.length; i++) {
	      if (this.items[i].value === item) {
	        this.removeAt(i);
	        return true;
	      }
	    }
	    return false;
	  };
	  PriorityQueue.count = 0;

	  /**
	   * Represents a group of disposable resources that are disposed together.
	   * @constructor
	   */
	  var CompositeDisposable = Rx.CompositeDisposable = function () {
	    var args = [], i, len;
	    if (Array.isArray(arguments[0])) {
	      args = arguments[0];
	      len = args.length;
	    } else {
	      len = arguments.length;
	      args = new Array(len);
	      for(i = 0; i < len; i++) { args[i] = arguments[i]; }
	    }
	    for(i = 0; i < len; i++) {
	      if (!isDisposable(args[i])) { throw new TypeError('Not a disposable'); }
	    }
	    this.disposables = args;
	    this.isDisposed = false;
	    this.length = args.length;
	  };

	  var CompositeDisposablePrototype = CompositeDisposable.prototype;

	  /**
	   * Adds a disposable to the CompositeDisposable or disposes the disposable if the CompositeDisposable is disposed.
	   * @param {Mixed} item Disposable to add.
	   */
	  CompositeDisposablePrototype.add = function (item) {
	    if (this.isDisposed) {
	      item.dispose();
	    } else {
	      this.disposables.push(item);
	      this.length++;
	    }
	  };

	  /**
	   * Removes and disposes the first occurrence of a disposable from the CompositeDisposable.
	   * @param {Mixed} item Disposable to remove.
	   * @returns {Boolean} true if found; false otherwise.
	   */
	  CompositeDisposablePrototype.remove = function (item) {
	    var shouldDispose = false;
	    if (!this.isDisposed) {
	      var idx = this.disposables.indexOf(item);
	      if (idx !== -1) {
	        shouldDispose = true;
	        this.disposables.splice(idx, 1);
	        this.length--;
	        item.dispose();
	      }
	    }
	    return shouldDispose;
	  };

	  /**
	   *  Disposes all disposables in the group and removes them from the group.
	   */
	  CompositeDisposablePrototype.dispose = function () {
	    if (!this.isDisposed) {
	      this.isDisposed = true;
	      var len = this.disposables.length, currentDisposables = new Array(len);
	      for(var i = 0; i < len; i++) { currentDisposables[i] = this.disposables[i]; }
	      this.disposables = [];
	      this.length = 0;

	      for (i = 0; i < len; i++) {
	        currentDisposables[i].dispose();
	      }
	    }
	  };

	  /**
	   * Provides a set of static methods for creating Disposables.
	   * @param {Function} dispose Action to run during the first call to dispose. The action is guaranteed to be run at most once.
	   */
	  var Disposable = Rx.Disposable = function (action) {
	    this.isDisposed = false;
	    this.action = action || noop;
	  };

	  /** Performs the task of cleaning up resources. */
	  Disposable.prototype.dispose = function () {
	    if (!this.isDisposed) {
	      this.action();
	      this.isDisposed = true;
	    }
	  };

	  /**
	   * Creates a disposable object that invokes the specified action when disposed.
	   * @param {Function} dispose Action to run during the first call to dispose. The action is guaranteed to be run at most once.
	   * @return {Disposable} The disposable object that runs the given action upon disposal.
	   */
	  var disposableCreate = Disposable.create = function (action) { return new Disposable(action); };

	  /**
	   * Gets the disposable that does nothing when disposed.
	   */
	  var disposableEmpty = Disposable.empty = { dispose: noop };

	  /**
	   * Validates whether the given object is a disposable
	   * @param {Object} Object to test whether it has a dispose method
	   * @returns {Boolean} true if a disposable object, else false.
	   */
	  var isDisposable = Disposable.isDisposable = function (d) {
	    return d && isFunction(d.dispose);
	  };

	  var checkDisposed = Disposable.checkDisposed = function (disposable) {
	    if (disposable.isDisposed) { throw new ObjectDisposedError(); }
	  };

	  // Single assignment
	  var SingleAssignmentDisposable = Rx.SingleAssignmentDisposable = function () {
	    this.isDisposed = false;
	    this.current = null;
	  };
	  SingleAssignmentDisposable.prototype.getDisposable = function () {
	    return this.current;
	  };
	  SingleAssignmentDisposable.prototype.setDisposable = function (value) {
	    if (this.current) { throw new Error('Disposable has already been assigned'); }
	    var shouldDispose = this.isDisposed;
	    !shouldDispose && (this.current = value);
	    shouldDispose && value && value.dispose();
	  };
	  SingleAssignmentDisposable.prototype.dispose = function () {
	    if (!this.isDisposed) {
	      this.isDisposed = true;
	      var old = this.current;
	      this.current = null;
	    }
	    old && old.dispose();
	  };

	  // Multiple assignment disposable
	  var SerialDisposable = Rx.SerialDisposable = function () {
	    this.isDisposed = false;
	    this.current = null;
	  };
	  SerialDisposable.prototype.getDisposable = function () {
	    return this.current;
	  };
	  SerialDisposable.prototype.setDisposable = function (value) {
	    var shouldDispose = this.isDisposed;
	    if (!shouldDispose) {
	      var old = this.current;
	      this.current = value;
	    }
	    old && old.dispose();
	    shouldDispose && value && value.dispose();
	  };
	  SerialDisposable.prototype.dispose = function () {
	    if (!this.isDisposed) {
	      this.isDisposed = true;
	      var old = this.current;
	      this.current = null;
	    }
	    old && old.dispose();
	  };

	  /**
	   * Represents a disposable resource that only disposes its underlying disposable resource when all dependent disposable objects have been disposed.
	   */
	  var RefCountDisposable = Rx.RefCountDisposable = (function () {

	    function InnerDisposable(disposable) {
	      this.disposable = disposable;
	      this.disposable.count++;
	      this.isInnerDisposed = false;
	    }

	    InnerDisposable.prototype.dispose = function () {
	      if (!this.disposable.isDisposed && !this.isInnerDisposed) {
	        this.isInnerDisposed = true;
	        this.disposable.count--;
	        if (this.disposable.count === 0 && this.disposable.isPrimaryDisposed) {
	          this.disposable.isDisposed = true;
	          this.disposable.underlyingDisposable.dispose();
	        }
	      }
	    };

	    /**
	     * Initializes a new instance of the RefCountDisposable with the specified disposable.
	     * @constructor
	     * @param {Disposable} disposable Underlying disposable.
	      */
	    function RefCountDisposable(disposable) {
	      this.underlyingDisposable = disposable;
	      this.isDisposed = false;
	      this.isPrimaryDisposed = false;
	      this.count = 0;
	    }

	    /**
	     * Disposes the underlying disposable only when all dependent disposables have been disposed
	     */
	    RefCountDisposable.prototype.dispose = function () {
	      if (!this.isDisposed && !this.isPrimaryDisposed) {
	        this.isPrimaryDisposed = true;
	        if (this.count === 0) {
	          this.isDisposed = true;
	          this.underlyingDisposable.dispose();
	        }
	      }
	    };

	    /**
	     * Returns a dependent disposable that when disposed decreases the refcount on the underlying disposable.
	     * @returns {Disposable} A dependent disposable contributing to the reference count that manages the underlying disposable's lifetime.
	     */
	    RefCountDisposable.prototype.getDisposable = function () {
	      return this.isDisposed ? disposableEmpty : new InnerDisposable(this);
	    };

	    return RefCountDisposable;
	  })();

	  function ScheduledDisposable(scheduler, disposable) {
	    this.scheduler = scheduler;
	    this.disposable = disposable;
	    this.isDisposed = false;
	  }

	  function scheduleItem(s, self) {
	    if (!self.isDisposed) {
	      self.isDisposed = true;
	      self.disposable.dispose();
	    }
	  }

	  ScheduledDisposable.prototype.dispose = function () {
	    this.scheduler.scheduleWithState(this, scheduleItem);
	  };

	  var ScheduledItem = Rx.internals.ScheduledItem = function (scheduler, state, action, dueTime, comparer) {
	    this.scheduler = scheduler;
	    this.state = state;
	    this.action = action;
	    this.dueTime = dueTime;
	    this.comparer = comparer || defaultSubComparer;
	    this.disposable = new SingleAssignmentDisposable();
	  }

	  ScheduledItem.prototype.invoke = function () {
	    this.disposable.setDisposable(this.invokeCore());
	  };

	  ScheduledItem.prototype.compareTo = function (other) {
	    return this.comparer(this.dueTime, other.dueTime);
	  };

	  ScheduledItem.prototype.isCancelled = function () {
	    return this.disposable.isDisposed;
	  };

	  ScheduledItem.prototype.invokeCore = function () {
	    return this.action(this.scheduler, this.state);
	  };

	  /** Provides a set of static properties to access commonly used schedulers. */
	  var Scheduler = Rx.Scheduler = (function () {

	    function Scheduler(now, schedule, scheduleRelative, scheduleAbsolute) {
	      this.now = now;
	      this._schedule = schedule;
	      this._scheduleRelative = scheduleRelative;
	      this._scheduleAbsolute = scheduleAbsolute;
	    }

	    /** Determines whether the given object is a scheduler */
	    Scheduler.isScheduler = function (s) {
	      return s instanceof Scheduler;
	    }

	    function invokeAction(scheduler, action) {
	      action();
	      return disposableEmpty;
	    }

	    var schedulerProto = Scheduler.prototype;

	    /**
	     * Schedules an action to be executed.
	     * @param {Function} action Action to execute.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    schedulerProto.schedule = function (action) {
	      return this._schedule(action, invokeAction);
	    };

	    /**
	     * Schedules an action to be executed.
	     * @param state State passed to the action to be executed.
	     * @param {Function} action Action to be executed.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    schedulerProto.scheduleWithState = function (state, action) {
	      return this._schedule(state, action);
	    };

	    /**
	     * Schedules an action to be executed after the specified relative due time.
	     * @param {Function} action Action to execute.
	     * @param {Number} dueTime Relative time after which to execute the action.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    schedulerProto.scheduleWithRelative = function (dueTime, action) {
	      return this._scheduleRelative(action, dueTime, invokeAction);
	    };

	    /**
	     * Schedules an action to be executed after dueTime.
	     * @param state State passed to the action to be executed.
	     * @param {Function} action Action to be executed.
	     * @param {Number} dueTime Relative time after which to execute the action.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    schedulerProto.scheduleWithRelativeAndState = function (state, dueTime, action) {
	      return this._scheduleRelative(state, dueTime, action);
	    };

	    /**
	     * Schedules an action to be executed at the specified absolute due time.
	     * @param {Function} action Action to execute.
	     * @param {Number} dueTime Absolute time at which to execute the action.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	      */
	    schedulerProto.scheduleWithAbsolute = function (dueTime, action) {
	      return this._scheduleAbsolute(action, dueTime, invokeAction);
	    };

	    /**
	     * Schedules an action to be executed at dueTime.
	     * @param {Mixed} state State passed to the action to be executed.
	     * @param {Function} action Action to be executed.
	     * @param {Number}dueTime Absolute time at which to execute the action.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    schedulerProto.scheduleWithAbsoluteAndState = function (state, dueTime, action) {
	      return this._scheduleAbsolute(state, dueTime, action);
	    };

	    /** Gets the current time according to the local machine's system clock. */
	    Scheduler.now = defaultNow;

	    /**
	     * Normalizes the specified TimeSpan value to a positive value.
	     * @param {Number} timeSpan The time span value to normalize.
	     * @returns {Number} The specified TimeSpan value if it is zero or positive; otherwise, 0
	     */
	    Scheduler.normalize = function (timeSpan) {
	      timeSpan < 0 && (timeSpan = 0);
	      return timeSpan;
	    };

	    return Scheduler;
	  }());

	  var normalizeTime = Scheduler.normalize, isScheduler = Scheduler.isScheduler;

	  (function (schedulerProto) {

	    function invokeRecImmediate(scheduler, pair) {
	      var state = pair[0], action = pair[1], group = new CompositeDisposable();
	      action(state, innerAction);
	      return group;

	      function innerAction(state2) {
	        var isAdded = false, isDone = false;

	        var d = scheduler.scheduleWithState(state2, scheduleWork);
	        if (!isDone) {
	          group.add(d);
	          isAdded = true;
	        }

	        function scheduleWork(_, state3) {
	          if (isAdded) {
	            group.remove(d);
	          } else {
	            isDone = true;
	          }
	          action(state3, innerAction);
	          return disposableEmpty;
	        }
	      }
	    }

	    function invokeRecDate(scheduler, pair, method) {
	      var state = pair[0], action = pair[1], group = new CompositeDisposable();
	      action(state, innerAction);
	      return group;

	      function innerAction(state2, dueTime1) {
	        var isAdded = false, isDone = false;

	        var d = scheduler[method](state2, dueTime1, scheduleWork);
	        if (!isDone) {
	          group.add(d);
	          isAdded = true;
	        }

	        function scheduleWork(_, state3) {
	          if (isAdded) {
	            group.remove(d);
	          } else {
	            isDone = true;
	          }
	          action(state3, innerAction);
	          return disposableEmpty;
	        }
	      }
	    }

	    function invokeRecDateRelative(s, p) {
	      return invokeRecDate(s, p, 'scheduleWithRelativeAndState');
	    }

	    function invokeRecDateAbsolute(s, p) {
	      return invokeRecDate(s, p, 'scheduleWithAbsoluteAndState');
	    }

	    function scheduleInnerRecursive(action, self) {
	      action(function(dt) { self(action, dt); });
	    }

	    /**
	     * Schedules an action to be executed recursively.
	     * @param {Function} action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    schedulerProto.scheduleRecursive = function (action) {
	      return this.scheduleRecursiveWithState(action, scheduleInnerRecursive);
	    };

	    /**
	     * Schedules an action to be executed recursively.
	     * @param {Mixed} state State passed to the action to be executed.
	     * @param {Function} action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in recursive invocation state.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    schedulerProto.scheduleRecursiveWithState = function (state, action) {
	      return this.scheduleWithState([state, action], invokeRecImmediate);
	    };

	    /**
	     * Schedules an action to be executed recursively after a specified relative due time.
	     * @param {Function} action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action at the specified relative time.
	     * @param {Number}dueTime Relative time after which to execute the action for the first time.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    schedulerProto.scheduleRecursiveWithRelative = function (dueTime, action) {
	      return this.scheduleRecursiveWithRelativeAndState(action, dueTime, scheduleInnerRecursive);
	    };

	    /**
	     * Schedules an action to be executed recursively after a specified relative due time.
	     * @param {Mixed} state State passed to the action to be executed.
	     * @param {Function} action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in the recursive due time and invocation state.
	     * @param {Number}dueTime Relative time after which to execute the action for the first time.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    schedulerProto.scheduleRecursiveWithRelativeAndState = function (state, dueTime, action) {
	      return this._scheduleRelative([state, action], dueTime, invokeRecDateRelative);
	    };

	    /**
	     * Schedules an action to be executed recursively at a specified absolute due time.
	     * @param {Function} action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action at the specified absolute time.
	     * @param {Number}dueTime Absolute time at which to execute the action for the first time.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    schedulerProto.scheduleRecursiveWithAbsolute = function (dueTime, action) {
	      return this.scheduleRecursiveWithAbsoluteAndState(action, dueTime, scheduleInnerRecursive);
	    };

	    /**
	     * Schedules an action to be executed recursively at a specified absolute due time.
	     * @param {Mixed} state State passed to the action to be executed.
	     * @param {Function} action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in the recursive due time and invocation state.
	     * @param {Number}dueTime Absolute time at which to execute the action for the first time.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    schedulerProto.scheduleRecursiveWithAbsoluteAndState = function (state, dueTime, action) {
	      return this._scheduleAbsolute([state, action], dueTime, invokeRecDateAbsolute);
	    };
	  }(Scheduler.prototype));

	  (function (schedulerProto) {

	    /**
	     * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be scheduled using window.setInterval for the base implementation.
	     * @param {Number} period Period for running the work periodically.
	     * @param {Function} action Action to be executed.
	     * @returns {Disposable} The disposable object used to cancel the scheduled recurring action (best effort).
	     */
	    Scheduler.prototype.schedulePeriodic = function (period, action) {
	      return this.schedulePeriodicWithState(null, period, action);
	    };

	    /**
	     * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be scheduled using window.setInterval for the base implementation.
	     * @param {Mixed} state Initial state passed to the action upon the first iteration.
	     * @param {Number} period Period for running the work periodically.
	     * @param {Function} action Action to be executed, potentially updating the state.
	     * @returns {Disposable} The disposable object used to cancel the scheduled recurring action (best effort).
	     */
	    Scheduler.prototype.schedulePeriodicWithState = function(state, period, action) {
	      if (typeof root.setInterval === 'undefined') { throw new NotSupportedError(); }
	      period = normalizeTime(period);
	      var s = state, id = root.setInterval(function () { s = action(s); }, period);
	      return disposableCreate(function () { root.clearInterval(id); });
	    };

	  }(Scheduler.prototype));

	  (function (schedulerProto) {
	    /**
	     * Returns a scheduler that wraps the original scheduler, adding exception handling for scheduled actions.
	     * @param {Function} handler Handler that's run if an exception is caught. The exception will be rethrown if the handler returns false.
	     * @returns {Scheduler} Wrapper around the original scheduler, enforcing exception handling.
	     */
	    schedulerProto.catchError = schedulerProto['catch'] = function (handler) {
	      return new CatchScheduler(this, handler);
	    };
	  }(Scheduler.prototype));

	  var SchedulePeriodicRecursive = Rx.internals.SchedulePeriodicRecursive = (function () {
	    function tick(command, recurse) {
	      recurse(0, this._period);
	      try {
	        this._state = this._action(this._state);
	      } catch (e) {
	        this._cancel.dispose();
	        throw e;
	      }
	    }

	    function SchedulePeriodicRecursive(scheduler, state, period, action) {
	      this._scheduler = scheduler;
	      this._state = state;
	      this._period = period;
	      this._action = action;
	    }

	    SchedulePeriodicRecursive.prototype.start = function () {
	      var d = new SingleAssignmentDisposable();
	      this._cancel = d;
	      d.setDisposable(this._scheduler.scheduleRecursiveWithRelativeAndState(0, this._period, tick.bind(this)));

	      return d;
	    };

	    return SchedulePeriodicRecursive;
	  }());

	  /** Gets a scheduler that schedules work immediately on the current thread. */
	  var immediateScheduler = Scheduler.immediate = (function () {
	    function scheduleNow(state, action) { return action(this, state); }
	    return new Scheduler(defaultNow, scheduleNow, notSupported, notSupported);
	  }());

	  /**
	   * Gets a scheduler that schedules work as soon as possible on the current thread.
	   */
	  var currentThreadScheduler = Scheduler.currentThread = (function () {
	    var queue;

	    function runTrampoline () {
	      while (queue.length > 0) {
	        var item = queue.shift();
	        !item.isCancelled() && item.invoke();
	      }
	    }

	    function scheduleNow(state, action) {
	      var si = new ScheduledItem(this, state, action, this.now());

	      if (!queue) {
	        queue = [si];

	        var result = tryCatch(runTrampoline)();
	        queue = null;
	        if (result === errorObj) { return thrower(result.e); }
	      } else {
	        queue.push(si);
	      }
	      return si.disposable;
	    }

	    var currentScheduler = new Scheduler(defaultNow, scheduleNow, notSupported, notSupported);
	    currentScheduler.scheduleRequired = function () { return !queue; };

	    return currentScheduler;
	  }());

	  var scheduleMethod, clearMethod;

	  var localTimer = (function () {
	    var localSetTimeout, localClearTimeout = noop;
	    if (!!root.setTimeout) {
	      localSetTimeout = root.setTimeout;
	      localClearTimeout = root.clearTimeout;
	    } else if (!!root.WScript) {
	      localSetTimeout = function (fn, time) {
	        root.WScript.Sleep(time);
	        fn();
	      };
	    } else {
	      throw new NotSupportedError();
	    }

	    return {
	      setTimeout: localSetTimeout,
	      clearTimeout: localClearTimeout
	    };
	  }());
	  var localSetTimeout = localTimer.setTimeout,
	    localClearTimeout = localTimer.clearTimeout;

	  (function () {

	    var nextHandle = 1, tasksByHandle = {}, currentlyRunning = false;

	    clearMethod = function (handle) {
	      delete tasksByHandle[handle];
	    };

	    function runTask(handle) {
	      if (currentlyRunning) {
	        localSetTimeout(function () { runTask(handle) }, 0);
	      } else {
	        var task = tasksByHandle[handle];
	        if (task) {
	          currentlyRunning = true;
	          var result = tryCatch(task)();
	          clearMethod(handle);
	          currentlyRunning = false;
	          if (result === errorObj) { return thrower(result.e); }
	        }
	      }
	    }

	    var reNative = RegExp('^' +
	      String(toString)
	        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	        .replace(/toString| for [^\]]+/g, '.*?') + '$'
	    );

	    var setImmediate = typeof (setImmediate = freeGlobal && moduleExports && freeGlobal.setImmediate) == 'function' &&
	      !reNative.test(setImmediate) && setImmediate;

	    function postMessageSupported () {
	      // Ensure not in a worker
	      if (!root.postMessage || root.importScripts) { return false; }
	      var isAsync = false, oldHandler = root.onmessage;
	      // Test for async
	      root.onmessage = function () { isAsync = true; };
	      root.postMessage('', '*');
	      root.onmessage = oldHandler;

	      return isAsync;
	    }

	    // Use in order, setImmediate, nextTick, postMessage, MessageChannel, script readystatechanged, setTimeout
	    if (isFunction(setImmediate)) {
	      scheduleMethod = function (action) {
	        var id = nextHandle++;
	        tasksByHandle[id] = action;
	        setImmediate(function () { runTask(id); });

	        return id;
	      };
	    } else if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
	      scheduleMethod = function (action) {
	        var id = nextHandle++;
	        tasksByHandle[id] = action;
	        process.nextTick(function () { runTask(id); });

	        return id;
	      };
	    } else if (postMessageSupported()) {
	      var MSG_PREFIX = 'ms.rx.schedule' + Math.random();

	      function onGlobalPostMessage(event) {
	        // Only if we're a match to avoid any other global events
	        if (typeof event.data === 'string' && event.data.substring(0, MSG_PREFIX.length) === MSG_PREFIX) {
	          runTask(event.data.substring(MSG_PREFIX.length));
	        }
	      }

	      if (root.addEventListener) {
	        root.addEventListener('message', onGlobalPostMessage, false);
	      } else if (root.attachEvent) {
	        root.attachEvent('onmessage', onGlobalPostMessage);
	      } else {
	        root.onmessage = onGlobalPostMessage;
	      }

	      scheduleMethod = function (action) {
	        var id = nextHandle++;
	        tasksByHandle[id] = action;
	        root.postMessage(MSG_PREFIX + currentId, '*');
	        return id;
	      };
	    } else if (!!root.MessageChannel) {
	      var channel = new root.MessageChannel();

	      channel.port1.onmessage = function (e) { runTask(e.data); };

	      scheduleMethod = function (action) {
	        var id = nextHandle++;
	        tasksByHandle[id] = action;
	        channel.port2.postMessage(id);
	        return id;
	      };
	    } else if ('document' in root && 'onreadystatechange' in root.document.createElement('script')) {

	      scheduleMethod = function (action) {
	        var scriptElement = root.document.createElement('script');
	        var id = nextHandle++;
	        tasksByHandle[id] = action;

	        scriptElement.onreadystatechange = function () {
	          runTask(id);
	          scriptElement.onreadystatechange = null;
	          scriptElement.parentNode.removeChild(scriptElement);
	          scriptElement = null;
	        };
	        root.document.documentElement.appendChild(scriptElement);
	        return id;
	      };

	    } else {
	      scheduleMethod = function (action) {
	        var id = nextHandle++;
	        tasksByHandle[id] = action;
	        localSetTimeout(function () {
	          runTask(id);
	        }, 0);

	        return id;
	      };
	    }
	  }());

	  /**
	   * Gets a scheduler that schedules work via a timed callback based upon platform.
	   */
	  var timeoutScheduler = Scheduler.timeout = Scheduler['default'] = (function () {

	    function scheduleNow(state, action) {
	      var scheduler = this, disposable = new SingleAssignmentDisposable();
	      var id = scheduleMethod(function () {
	        !disposable.isDisposed && disposable.setDisposable(action(scheduler, state));
	      });
	      return new CompositeDisposable(disposable, disposableCreate(function () {
	        clearMethod(id);
	      }));
	    }

	    function scheduleRelative(state, dueTime, action) {
	      var scheduler = this, dt = Scheduler.normalize(dueTime), disposable = new SingleAssignmentDisposable();
	      if (dt === 0) { return scheduler.scheduleWithState(state, action); }
	      var id = localSetTimeout(function () {
	        !disposable.isDisposed && disposable.setDisposable(action(scheduler, state));
	      }, dt);
	      return new CompositeDisposable(disposable, disposableCreate(function () {
	        localClearTimeout(id);
	      }));
	    }

	    function scheduleAbsolute(state, dueTime, action) {
	      return this.scheduleWithRelativeAndState(state, dueTime - this.now(), action);
	    }

	    return new Scheduler(defaultNow, scheduleNow, scheduleRelative, scheduleAbsolute);
	  })();

	  var CatchScheduler = (function (__super__) {

	    function scheduleNow(state, action) {
	      return this._scheduler.scheduleWithState(state, this._wrap(action));
	    }

	    function scheduleRelative(state, dueTime, action) {
	      return this._scheduler.scheduleWithRelativeAndState(state, dueTime, this._wrap(action));
	    }

	    function scheduleAbsolute(state, dueTime, action) {
	      return this._scheduler.scheduleWithAbsoluteAndState(state, dueTime, this._wrap(action));
	    }

	    inherits(CatchScheduler, __super__);

	    function CatchScheduler(scheduler, handler) {
	      this._scheduler = scheduler;
	      this._handler = handler;
	      this._recursiveOriginal = null;
	      this._recursiveWrapper = null;
	      __super__.call(this, this._scheduler.now.bind(this._scheduler), scheduleNow, scheduleRelative, scheduleAbsolute);
	    }

	    CatchScheduler.prototype._clone = function (scheduler) {
	        return new CatchScheduler(scheduler, this._handler);
	    };

	    CatchScheduler.prototype._wrap = function (action) {
	      var parent = this;
	      return function (self, state) {
	        try {
	          return action(parent._getRecursiveWrapper(self), state);
	        } catch (e) {
	          if (!parent._handler(e)) { throw e; }
	          return disposableEmpty;
	        }
	      };
	    };

	    CatchScheduler.prototype._getRecursiveWrapper = function (scheduler) {
	      if (this._recursiveOriginal !== scheduler) {
	        this._recursiveOriginal = scheduler;
	        var wrapper = this._clone(scheduler);
	        wrapper._recursiveOriginal = scheduler;
	        wrapper._recursiveWrapper = wrapper;
	        this._recursiveWrapper = wrapper;
	      }
	      return this._recursiveWrapper;
	    };

	    CatchScheduler.prototype.schedulePeriodicWithState = function (state, period, action) {
	      var self = this, failed = false, d = new SingleAssignmentDisposable();

	      d.setDisposable(this._scheduler.schedulePeriodicWithState(state, period, function (state1) {
	        if (failed) { return null; }
	        try {
	          return action(state1);
	        } catch (e) {
	          failed = true;
	          if (!self._handler(e)) { throw e; }
	          d.dispose();
	          return null;
	        }
	      }));

	      return d;
	    };

	    return CatchScheduler;
	  }(Scheduler));

	  /**
	   *  Represents a notification to an observer.
	   */
	  var Notification = Rx.Notification = (function () {
	    function Notification(kind, value, exception, accept, acceptObservable, toString) {
	      this.kind = kind;
	      this.value = value;
	      this.exception = exception;
	      this._accept = accept;
	      this._acceptObservable = acceptObservable;
	      this.toString = toString;
	    }

	    /**
	     * Invokes the delegate corresponding to the notification or the observer's method corresponding to the notification and returns the produced result.
	     *
	     * @memberOf Notification
	     * @param {Any} observerOrOnNext Delegate to invoke for an OnNext notification or Observer to invoke the notification on..
	     * @param {Function} onError Delegate to invoke for an OnError notification.
	     * @param {Function} onCompleted Delegate to invoke for an OnCompleted notification.
	     * @returns {Any} Result produced by the observation.
	     */
	    Notification.prototype.accept = function (observerOrOnNext, onError, onCompleted) {
	      return observerOrOnNext && typeof observerOrOnNext === 'object' ?
	        this._acceptObservable(observerOrOnNext) :
	        this._accept(observerOrOnNext, onError, onCompleted);
	    };

	    /**
	     * Returns an observable sequence with a single notification.
	     *
	     * @memberOf Notifications
	     * @param {Scheduler} [scheduler] Scheduler to send out the notification calls on.
	     * @returns {Observable} The observable sequence that surfaces the behavior of the notification upon subscription.
	     */
	    Notification.prototype.toObservable = function (scheduler) {
	      var self = this;
	      isScheduler(scheduler) || (scheduler = immediateScheduler);
	      return new AnonymousObservable(function (observer) {
	        return scheduler.scheduleWithState(self, function (_, notification) {
	          notification._acceptObservable(observer);
	          notification.kind === 'N' && observer.onCompleted();
	        });
	      });
	    };

	    return Notification;
	  })();

	  /**
	   * Creates an object that represents an OnNext notification to an observer.
	   * @param {Any} value The value contained in the notification.
	   * @returns {Notification} The OnNext notification containing the value.
	   */
	  var notificationCreateOnNext = Notification.createOnNext = (function () {
	      function _accept(onNext) { return onNext(this.value); }
	      function _acceptObservable(observer) { return observer.onNext(this.value); }
	      function toString() { return 'OnNext(' + this.value + ')'; }

	      return function (value) {
	        return new Notification('N', value, null, _accept, _acceptObservable, toString);
	      };
	  }());

	  /**
	   * Creates an object that represents an OnError notification to an observer.
	   * @param {Any} error The exception contained in the notification.
	   * @returns {Notification} The OnError notification containing the exception.
	   */
	  var notificationCreateOnError = Notification.createOnError = (function () {
	    function _accept (onNext, onError) { return onError(this.exception); }
	    function _acceptObservable(observer) { return observer.onError(this.exception); }
	    function toString () { return 'OnError(' + this.exception + ')'; }

	    return function (e) {
	      return new Notification('E', null, e, _accept, _acceptObservable, toString);
	    };
	  }());

	  /**
	   * Creates an object that represents an OnCompleted notification to an observer.
	   * @returns {Notification} The OnCompleted notification.
	   */
	  var notificationCreateOnCompleted = Notification.createOnCompleted = (function () {
	    function _accept (onNext, onError, onCompleted) { return onCompleted(); }
	    function _acceptObservable(observer) { return observer.onCompleted(); }
	    function toString () { return 'OnCompleted()'; }

	    return function () {
	      return new Notification('C', null, null, _accept, _acceptObservable, toString);
	    };
	  }());

	  /**
	   * Supports push-style iteration over an observable sequence.
	   */
	  var Observer = Rx.Observer = function () { };

	  /**
	   *  Creates a notification callback from an observer.
	   * @returns The action that forwards its input notification to the underlying observer.
	   */
	  Observer.prototype.toNotifier = function () {
	    var observer = this;
	    return function (n) { return n.accept(observer); };
	  };

	  /**
	   *  Hides the identity of an observer.
	   * @returns An observer that hides the identity of the specified observer.
	   */
	  Observer.prototype.asObserver = function () {
	    var self = this;
	    return new AnonymousObserver(
	      function (x) { self.onNext(x); },
	      function (err) { self.onError(err); },
	      function () { self.onCompleted(); });
	  };

	  /**
	   *  Checks access to the observer for grammar violations. This includes checking for multiple OnError or OnCompleted calls, as well as reentrancy in any of the observer methods.
	   *  If a violation is detected, an Error is thrown from the offending observer method call.
	   * @returns An observer that checks callbacks invocations against the observer grammar and, if the checks pass, forwards those to the specified observer.
	   */
	  Observer.prototype.checked = function () { return new CheckedObserver(this); };

	  /**
	   *  Creates an observer from the specified OnNext, along with optional OnError, and OnCompleted actions.
	   * @param {Function} [onNext] Observer's OnNext action implementation.
	   * @param {Function} [onError] Observer's OnError action implementation.
	   * @param {Function} [onCompleted] Observer's OnCompleted action implementation.
	   * @returns {Observer} The observer object implemented using the given actions.
	   */
	  var observerCreate = Observer.create = function (onNext, onError, onCompleted) {
	    onNext || (onNext = noop);
	    onError || (onError = defaultError);
	    onCompleted || (onCompleted = noop);
	    return new AnonymousObserver(onNext, onError, onCompleted);
	  };

	  /**
	   *  Creates an observer from a notification callback.
	   *
	   * @static
	   * @memberOf Observer
	   * @param {Function} handler Action that handles a notification.
	   * @returns The observer object that invokes the specified handler using a notification corresponding to each message it receives.
	   */
	  Observer.fromNotifier = function (handler, thisArg) {
	    var cb = bindCallback(handler, thisArg, 1);
	    return new AnonymousObserver(function (x) {
	      return cb(notificationCreateOnNext(x));
	    }, function (e) {
	      return cb(notificationCreateOnError(e));
	    }, function () {
	      return cb(notificationCreateOnCompleted());
	    });
	  };

	  /**
	   * Schedules the invocation of observer methods on the given scheduler.
	   * @param {Scheduler} scheduler Scheduler to schedule observer messages on.
	   * @returns {Observer} Observer whose messages are scheduled on the given scheduler.
	   */
	  Observer.prototype.notifyOn = function (scheduler) {
	    return new ObserveOnObserver(scheduler, this);
	  };

	  Observer.prototype.makeSafe = function(disposable) {
	    return new AnonymousSafeObserver(this._onNext, this._onError, this._onCompleted, disposable);
	  };

	  /**
	   * Abstract base class for implementations of the Observer class.
	   * This base class enforces the grammar of observers where OnError and OnCompleted are terminal messages.
	   */
	  var AbstractObserver = Rx.internals.AbstractObserver = (function (__super__) {
	    inherits(AbstractObserver, __super__);

	    /**
	     * Creates a new observer in a non-stopped state.
	     */
	    function AbstractObserver() {
	      this.isStopped = false;
	    }

	    // Must be implemented by other observers
	    AbstractObserver.prototype.next = notImplemented;
	    AbstractObserver.prototype.error = notImplemented;
	    AbstractObserver.prototype.completed = notImplemented;

	    /**
	     * Notifies the observer of a new element in the sequence.
	     * @param {Any} value Next element in the sequence.
	     */
	    AbstractObserver.prototype.onNext = function (value) {
	      !this.isStopped && this.next(value);
	    };

	    /**
	     * Notifies the observer that an exception has occurred.
	     * @param {Any} error The error that has occurred.
	     */
	    AbstractObserver.prototype.onError = function (error) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.error(error);
	      }
	    };

	    /**
	     * Notifies the observer of the end of the sequence.
	     */
	    AbstractObserver.prototype.onCompleted = function () {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.completed();
	      }
	    };

	    /**
	     * Disposes the observer, causing it to transition to the stopped state.
	     */
	    AbstractObserver.prototype.dispose = function () { this.isStopped = true; };

	    AbstractObserver.prototype.fail = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.error(e);
	        return true;
	      }

	      return false;
	    };

	    return AbstractObserver;
	  }(Observer));

	  /**
	   * Class to create an Observer instance from delegate-based implementations of the on* methods.
	   */
	  var AnonymousObserver = Rx.AnonymousObserver = (function (__super__) {
	    inherits(AnonymousObserver, __super__);

	    /**
	     * Creates an observer from the specified OnNext, OnError, and OnCompleted actions.
	     * @param {Any} onNext Observer's OnNext action implementation.
	     * @param {Any} onError Observer's OnError action implementation.
	     * @param {Any} onCompleted Observer's OnCompleted action implementation.
	     */
	    function AnonymousObserver(onNext, onError, onCompleted) {
	      __super__.call(this);
	      this._onNext = onNext;
	      this._onError = onError;
	      this._onCompleted = onCompleted;
	    }

	    /**
	     * Calls the onNext action.
	     * @param {Any} value Next element in the sequence.
	     */
	    AnonymousObserver.prototype.next = function (value) {
	      this._onNext(value);
	    };

	    /**
	     * Calls the onError action.
	     * @param {Any} error The error that has occurred.
	     */
	    AnonymousObserver.prototype.error = function (error) {
	      this._onError(error);
	    };

	    /**
	     *  Calls the onCompleted action.
	     */
	    AnonymousObserver.prototype.completed = function () {
	      this._onCompleted();
	    };

	    return AnonymousObserver;
	  }(AbstractObserver));

	  var CheckedObserver = (function (__super__) {
	    inherits(CheckedObserver, __super__);

	    function CheckedObserver(observer) {
	      __super__.call(this);
	      this._observer = observer;
	      this._state = 0; // 0 - idle, 1 - busy, 2 - done
	    }

	    var CheckedObserverPrototype = CheckedObserver.prototype;

	    CheckedObserverPrototype.onNext = function (value) {
	      this.checkAccess();
	      var res = tryCatch(this._observer.onNext).call(this._observer, value);
	      this._state = 0;
	      res === errorObj && thrower(res.e);
	    };

	    CheckedObserverPrototype.onError = function (err) {
	      this.checkAccess();
	      var res = tryCatch(this._observer.onError).call(this._observer, err);
	      this._state = 2;
	      res === errorObj && thrower(res.e);
	    };

	    CheckedObserverPrototype.onCompleted = function () {
	      this.checkAccess();
	      var res = tryCatch(this._observer.onCompleted).call(this._observer);
	      this._state = 2;
	      res === errorObj && thrower(res.e);
	    };

	    CheckedObserverPrototype.checkAccess = function () {
	      if (this._state === 1) { throw new Error('Re-entrancy detected'); }
	      if (this._state === 2) { throw new Error('Observer completed'); }
	      if (this._state === 0) { this._state = 1; }
	    };

	    return CheckedObserver;
	  }(Observer));

	  var ScheduledObserver = Rx.internals.ScheduledObserver = (function (__super__) {
	    inherits(ScheduledObserver, __super__);

	    function ScheduledObserver(scheduler, observer) {
	      __super__.call(this);
	      this.scheduler = scheduler;
	      this.observer = observer;
	      this.isAcquired = false;
	      this.hasFaulted = false;
	      this.queue = [];
	      this.disposable = new SerialDisposable();
	    }

	    ScheduledObserver.prototype.next = function (value) {
	      var self = this;
	      this.queue.push(function () { self.observer.onNext(value); });
	    };

	    ScheduledObserver.prototype.error = function (e) {
	      var self = this;
	      this.queue.push(function () { self.observer.onError(e); });
	    };

	    ScheduledObserver.prototype.completed = function () {
	      var self = this;
	      this.queue.push(function () { self.observer.onCompleted(); });
	    };

	    ScheduledObserver.prototype.ensureActive = function () {
	      var isOwner = false;
	      if (!this.hasFaulted && this.queue.length > 0) {
	        isOwner = !this.isAcquired;
	        this.isAcquired = true;
	      }
	      if (isOwner) {
	        this.disposable.setDisposable(this.scheduler.scheduleRecursiveWithState(this, function (parent, self) {
	          var work;
	          if (parent.queue.length > 0) {
	            work = parent.queue.shift();
	          } else {
	            parent.isAcquired = false;
	            return;
	          }
	          var res = tryCatch(work)();
	          if (res === errorObj) {
	            parent.queue = [];
	            parent.hasFaulted = true;
	            return thrower(res.e);
	          }
	          self(parent);
	        }));
	      }
	    };

	    ScheduledObserver.prototype.dispose = function () {
	      __super__.prototype.dispose.call(this);
	      this.disposable.dispose();
	    };

	    return ScheduledObserver;
	  }(AbstractObserver));

	  var ObserveOnObserver = (function (__super__) {
	    inherits(ObserveOnObserver, __super__);

	    function ObserveOnObserver(scheduler, observer, cancel) {
	      __super__.call(this, scheduler, observer);
	      this._cancel = cancel;
	    }

	    ObserveOnObserver.prototype.next = function (value) {
	      __super__.prototype.next.call(this, value);
	      this.ensureActive();
	    };

	    ObserveOnObserver.prototype.error = function (e) {
	      __super__.prototype.error.call(this, e);
	      this.ensureActive();
	    };

	    ObserveOnObserver.prototype.completed = function () {
	      __super__.prototype.completed.call(this);
	      this.ensureActive();
	    };

	    ObserveOnObserver.prototype.dispose = function () {
	      __super__.prototype.dispose.call(this);
	      this._cancel && this._cancel.dispose();
	      this._cancel = null;
	    };

	    return ObserveOnObserver;
	  })(ScheduledObserver);

	  var observableProto;

	  /**
	   * Represents a push-style collection.
	   */
	  var Observable = Rx.Observable = (function () {

	    function makeSubscribe(self, subscribe) {
	      return function (o) {
	        var oldOnError = o.onError;
	        o.onError = function (e) {
	          makeStackTraceLong(e, self);
	          oldOnError.call(o, e);
	        };

	        return subscribe.call(self, o);
	      };
	    }

	    function Observable(subscribe) {
	      if (Rx.config.longStackSupport && hasStacks) {
	        var e = tryCatch(thrower)(new Error()).e;
	        this.stack = e.stack.substring(e.stack.indexOf('\n') + 1);
	        this._subscribe = makeSubscribe(this, subscribe);
	      } else {
	        this._subscribe = subscribe;
	      }
	    }

	    observableProto = Observable.prototype;

	    /**
	    * Determines whether the given object is an Observable
	    * @param {Any} An object to determine whether it is an Observable
	    * @returns {Boolean} true if an Observable, else false.
	    */
	    Observable.isObservable = function (o) {
	      return o && isFunction(o.subscribe);
	    }

	    /**
	     *  Subscribes an o to the observable sequence.
	     *  @param {Mixed} [oOrOnNext] The object that is to receive notifications or an action to invoke for each element in the observable sequence.
	     *  @param {Function} [onError] Action to invoke upon exceptional termination of the observable sequence.
	     *  @param {Function} [onCompleted] Action to invoke upon graceful termination of the observable sequence.
	     *  @returns {Diposable} A disposable handling the subscriptions and unsubscriptions.
	     */
	    observableProto.subscribe = observableProto.forEach = function (oOrOnNext, onError, onCompleted) {
	      return this._subscribe(typeof oOrOnNext === 'object' ?
	        oOrOnNext :
	        observerCreate(oOrOnNext, onError, onCompleted));
	    };

	    /**
	     * Subscribes to the next value in the sequence with an optional "this" argument.
	     * @param {Function} onNext The function to invoke on each element in the observable sequence.
	     * @param {Any} [thisArg] Object to use as this when executing callback.
	     * @returns {Disposable} A disposable handling the subscriptions and unsubscriptions.
	     */
	    observableProto.subscribeOnNext = function (onNext, thisArg) {
	      return this._subscribe(observerCreate(typeof thisArg !== 'undefined' ? function(x) { onNext.call(thisArg, x); } : onNext));
	    };

	    /**
	     * Subscribes to an exceptional condition in the sequence with an optional "this" argument.
	     * @param {Function} onError The function to invoke upon exceptional termination of the observable sequence.
	     * @param {Any} [thisArg] Object to use as this when executing callback.
	     * @returns {Disposable} A disposable handling the subscriptions and unsubscriptions.
	     */
	    observableProto.subscribeOnError = function (onError, thisArg) {
	      return this._subscribe(observerCreate(null, typeof thisArg !== 'undefined' ? function(e) { onError.call(thisArg, e); } : onError));
	    };

	    /**
	     * Subscribes to the next value in the sequence with an optional "this" argument.
	     * @param {Function} onCompleted The function to invoke upon graceful termination of the observable sequence.
	     * @param {Any} [thisArg] Object to use as this when executing callback.
	     * @returns {Disposable} A disposable handling the subscriptions and unsubscriptions.
	     */
	    observableProto.subscribeOnCompleted = function (onCompleted, thisArg) {
	      return this._subscribe(observerCreate(null, null, typeof thisArg !== 'undefined' ? function() { onCompleted.call(thisArg); } : onCompleted));
	    };

	    return Observable;
	  })();

	  var ObservableBase = Rx.ObservableBase = (function (__super__) {
	    inherits(ObservableBase, __super__);

	    function fixSubscriber(subscriber) {
	      return subscriber && isFunction(subscriber.dispose) ? subscriber :
	        isFunction(subscriber) ? disposableCreate(subscriber) : disposableEmpty;
	    }

	    function setDisposable(s, state) {
	      var ado = state[0], self = state[1];
	      var sub = tryCatch(self.subscribeCore).call(self, ado);

	      if (sub === errorObj) {
	        if(!ado.fail(errorObj.e)) { return thrower(errorObj.e); }
	      }
	      ado.setDisposable(fixSubscriber(sub));
	    }

	    function subscribe(observer) {
	      var ado = new AutoDetachObserver(observer), state = [ado, this];

	      if (currentThreadScheduler.scheduleRequired()) {
	        currentThreadScheduler.scheduleWithState(state, setDisposable);
	      } else {
	        setDisposable(null, state);
	      }
	      return ado;
	    }

	    function ObservableBase() {
	      __super__.call(this, subscribe);
	    }

	    ObservableBase.prototype.subscribeCore = notImplemented;

	    return ObservableBase;
	  }(Observable));

	var FlatMapObservable = (function(__super__){

	    inherits(FlatMapObservable, __super__);

	    function FlatMapObservable(source, selector, resultSelector, thisArg) {
	        this.resultSelector = Rx.helpers.isFunction(resultSelector) ?
	            resultSelector : null;

	        this.selector = Rx.internals.bindCallback(Rx.helpers.isFunction(selector) ? selector : function() { return selector; }, thisArg, 3);
	        this.source = source;

	        __super__.call(this);

	    }

	    FlatMapObservable.prototype.subscribeCore = function(o) {
	        return this.source.subscribe(new InnerObserver(o, this.selector, this.resultSelector, this));
	    };

	    function InnerObserver(observer, selector, resultSelector, source) {
	        this.i = 0;
	        this.selector = selector;
	        this.resultSelector = resultSelector;
	        this.source = source;
	        this.isStopped = false;
	        this.o = observer;
	    }

	    InnerObserver.prototype._wrapResult = function(result, x, i) {
	        return this.resultSelector ?
	            result.map(function(y, i2) { return this.resultSelector(x, y, i, i2); }, this) :
	            result;
	    };

	    InnerObserver.prototype.onNext = function(x) {

	        if (this.isStopped) return;

	        var i = this.i++;
	        var result = tryCatch(this.selector)(x, i, this.source);

	        if (result === errorObj) {
	            return this.o.onError(result.e);
	        }

	        Rx.helpers.isPromise(result) && (result = Rx.Observable.fromPromise(result));
	        (Rx.helpers.isArrayLike(result) || Rx.helpers.isIterable(result)) && (result = Rx.Observable.from(result));

	        this.o.onNext(this._wrapResult(result, x, i));

	    };

	    InnerObserver.prototype.onError = function(e) {
	        if(!this.isStopped) { this.isStopped = true; this.o.onError(e); }
	    };

	    InnerObserver.prototype.onCompleted = function() {
	        if (!this.isStopped) {this.isStopped = true; this.o.onCompleted(); }
	    };

	    return FlatMapObservable;

	}(ObservableBase));

	  var Enumerable = Rx.internals.Enumerable = function () { };

	  var ConcatEnumerableObservable = (function(__super__) {
	    inherits(ConcatEnumerableObservable, __super__);
	    function ConcatEnumerableObservable(sources) {
	      this.sources = sources;
	      __super__.call(this);
	    }
	    
	    ConcatEnumerableObservable.prototype.subscribeCore = function (o) {
	      var isDisposed, subscription = new SerialDisposable();
	      var cancelable = immediateScheduler.scheduleRecursiveWithState(this.sources[$iterator$](), function (e, self) {
	        if (isDisposed) { return; }
	        var currentItem = tryCatch(e.next).call(e);
	        if (currentItem === errorObj) { return o.onError(currentItem.e); }

	        if (currentItem.done) {
	          return o.onCompleted();
	        }

	        // Check if promise
	        var currentValue = currentItem.value;
	        isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));

	        var d = new SingleAssignmentDisposable();
	        subscription.setDisposable(d);
	        d.setDisposable(currentValue.subscribe(new InnerObserver(o, self, e)));
	      });

	      return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
	        isDisposed = true;
	      }));
	    };
	    
	    function InnerObserver(o, s, e) {
	      this.o = o;
	      this.s = s;
	      this.e = e;
	      this.isStopped = false;
	    }
	    InnerObserver.prototype.onNext = function (x) { if(!this.isStopped) { this.o.onNext(x); } };
	    InnerObserver.prototype.onError = function (err) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(err);
	      }
	    };
	    InnerObserver.prototype.onCompleted = function () {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.s(this.e);
	      }
	    };
	    InnerObserver.prototype.dispose = function () { this.isStopped = true; };
	    InnerObserver.prototype.fail = function (err) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(err);
	        return true;
	      }
	      return false;
	    };
	    
	    return ConcatEnumerableObservable;
	  }(ObservableBase));

	  Enumerable.prototype.concat = function () {
	    return new ConcatEnumerableObservable(this);
	  };
	  
	  var CatchErrorObservable = (function(__super__) {
	    inherits(CatchErrorObservable, __super__);
	    function CatchErrorObservable(sources) {
	      this.sources = sources;
	      __super__.call(this);
	    }
	    
	    CatchErrorObservable.prototype.subscribeCore = function (o) {
	      var e = this.sources[$iterator$]();

	      var isDisposed, subscription = new SerialDisposable();
	      var cancelable = immediateScheduler.scheduleRecursiveWithState(null, function (lastException, self) {
	        if (isDisposed) { return; }
	        var currentItem = tryCatch(e.next).call(e);
	        if (currentItem === errorObj) { return o.onError(currentItem.e); }

	        if (currentItem.done) {
	          return lastException !== null ? o.onError(lastException) : o.onCompleted();
	        }

	        // Check if promise
	        var currentValue = currentItem.value;
	        isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));

	        var d = new SingleAssignmentDisposable();
	        subscription.setDisposable(d);
	        d.setDisposable(currentValue.subscribe(
	          function(x) { o.onNext(x); },
	          self,
	          function() { o.onCompleted(); }));
	      });
	      return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
	        isDisposed = true;
	      }));
	    };
	    
	    return CatchErrorObservable;
	  }(ObservableBase));

	  Enumerable.prototype.catchError = function () {
	    return new CatchErrorObservable(this);
	  };

	  Enumerable.prototype.catchErrorWhen = function (notificationHandler) {
	    var sources = this;
	    return new AnonymousObservable(function (o) {
	      var exceptions = new Subject(),
	        notifier = new Subject(),
	        handled = notificationHandler(exceptions),
	        notificationDisposable = handled.subscribe(notifier);

	      var e = sources[$iterator$]();

	      var isDisposed,
	        lastException,
	        subscription = new SerialDisposable();
	      var cancelable = immediateScheduler.scheduleRecursive(function (self) {
	        if (isDisposed) { return; }
	        var currentItem = tryCatch(e.next).call(e);
	        if (currentItem === errorObj) { return o.onError(currentItem.e); }

	        if (currentItem.done) {
	          if (lastException) {
	            o.onError(lastException);
	          } else {
	            o.onCompleted();
	          }
	          return;
	        }

	        // Check if promise
	        var currentValue = currentItem.value;
	        isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));

	        var outer = new SingleAssignmentDisposable();
	        var inner = new SingleAssignmentDisposable();
	        subscription.setDisposable(new CompositeDisposable(inner, outer));
	        outer.setDisposable(currentValue.subscribe(
	          function(x) { o.onNext(x); },
	          function (exn) {
	            inner.setDisposable(notifier.subscribe(self, function(ex) {
	              o.onError(ex);
	            }, function() {
	              o.onCompleted();
	            }));

	            exceptions.onNext(exn);
	          },
	          function() { o.onCompleted(); }));
	      });

	      return new CompositeDisposable(notificationDisposable, subscription, cancelable, disposableCreate(function () {
	        isDisposed = true;
	      }));
	    });
	  };
	  
	  var RepeatEnumerable = (function (__super__) {
	    inherits(RepeatEnumerable, __super__);
	    
	    function RepeatEnumerable(v, c) {
	      this.v = v;
	      this.c = c == null ? -1 : c;
	    }
	    RepeatEnumerable.prototype[$iterator$] = function () {
	      return new RepeatEnumerator(this); 
	    };
	    
	    function RepeatEnumerator(p) {
	      this.v = p.v;
	      this.l = p.c;
	    }
	    RepeatEnumerator.prototype.next = function () {
	      if (this.l === 0) { return doneEnumerator; }
	      if (this.l > 0) { this.l--; }
	      return { done: false, value: this.v }; 
	    };
	    
	    return RepeatEnumerable;
	  }(Enumerable));

	  var enumerableRepeat = Enumerable.repeat = function (value, repeatCount) {
	    return new RepeatEnumerable(value, repeatCount);
	  };
	  
	  var OfEnumerable = (function(__super__) {
	    inherits(OfEnumerable, __super__);
	    function OfEnumerable(s, fn, thisArg) {
	      this.s = s;
	      this.fn = fn ? bindCallback(fn, thisArg, 3) : null;
	    }
	    OfEnumerable.prototype[$iterator$] = function () {
	      return new OfEnumerator(this);
	    };
	    
	    function OfEnumerator(p) {
	      this.i = -1;
	      this.s = p.s;
	      this.l = this.s.length;
	      this.fn = p.fn;
	    }
	    OfEnumerator.prototype.next = function () {
	     return ++this.i < this.l ?
	       { done: false, value: !this.fn ? this.s[this.i] : this.fn(this.s[this.i], this.i, this.s) } :
	       doneEnumerator; 
	    };
	    
	    return OfEnumerable;
	  }(Enumerable));

	  var enumerableOf = Enumerable.of = function (source, selector, thisArg) {
	    return new OfEnumerable(source, selector, thisArg);
	  };

	   /**
	   *  Wraps the source sequence in order to run its observer callbacks on the specified scheduler.
	   *
	   *  This only invokes observer callbacks on a scheduler. In case the subscription and/or unsubscription actions have side-effects
	   *  that require to be run on a scheduler, use subscribeOn.
	   *
	   *  @param {Scheduler} scheduler Scheduler to notify observers on.
	   *  @returns {Observable} The source sequence whose observations happen on the specified scheduler.
	   */
	  observableProto.observeOn = function (scheduler) {
	    var source = this;
	    return new AnonymousObservable(function (observer) {
	      return source.subscribe(new ObserveOnObserver(scheduler, observer));
	    }, source);
	  };

	   /**
	   *  Wraps the source sequence in order to run its subscription and unsubscription logic on the specified scheduler. This operation is not commonly used;
	   *  see the remarks section for more information on the distinction between subscribeOn and observeOn.

	   *  This only performs the side-effects of subscription and unsubscription on the specified scheduler. In order to invoke observer
	   *  callbacks on a scheduler, use observeOn.

	   *  @param {Scheduler} scheduler Scheduler to perform subscription and unsubscription actions on.
	   *  @returns {Observable} The source sequence whose subscriptions and unsubscriptions happen on the specified scheduler.
	   */
	  observableProto.subscribeOn = function (scheduler) {
	    var source = this;
	    return new AnonymousObservable(function (observer) {
	      var m = new SingleAssignmentDisposable(), d = new SerialDisposable();
	      d.setDisposable(m);
	      m.setDisposable(scheduler.schedule(function () {
	        d.setDisposable(new ScheduledDisposable(scheduler, source.subscribe(observer)));
	      }));
	      return d;
	    }, source);
	  };

	  var FromPromiseObservable = (function(__super__) {
	    inherits(FromPromiseObservable, __super__);
	    function FromPromiseObservable(p) {
	      this.p = p;
	      __super__.call(this);
	    }

	    FromPromiseObservable.prototype.subscribeCore = function(o) {
	      this.p.then(function (data) {
	        o.onNext(data);
	        o.onCompleted();
	      }, function (err) { o.onError(err); });
	      return disposableEmpty;
	    };

	    return FromPromiseObservable;
	  }(ObservableBase));

	  /**
	  * Converts a Promise to an Observable sequence
	  * @param {Promise} An ES6 Compliant promise.
	  * @returns {Observable} An Observable sequence which wraps the existing promise success and failure.
	  */
	  var observableFromPromise = Observable.fromPromise = function (promise) {
	    return new FromPromiseObservable(promise);
	  };
	  /*
	   * Converts an existing observable sequence to an ES6 Compatible Promise
	   * @example
	   * var promise = Rx.Observable.return(42).toPromise(RSVP.Promise);
	   *
	   * // With config
	   * Rx.config.Promise = RSVP.Promise;
	   * var promise = Rx.Observable.return(42).toPromise();
	   * @param {Function} [promiseCtor] The constructor of the promise. If not provided, it looks for it in Rx.config.Promise.
	   * @returns {Promise} An ES6 compatible promise with the last value from the observable sequence.
	   */
	  observableProto.toPromise = function (promiseCtor) {
	    promiseCtor || (promiseCtor = Rx.config.Promise);
	    if (!promiseCtor) { throw new NotSupportedError('Promise type not provided nor in Rx.config.Promise'); }
	    var source = this;
	    return new promiseCtor(function (resolve, reject) {
	      // No cancellation can be done
	      var value, hasValue = false;
	      source.subscribe(function (v) {
	        value = v;
	        hasValue = true;
	      }, reject, function () {
	        hasValue && resolve(value);
	      });
	    });
	  };

	  var ToArrayObservable = (function(__super__) {
	    inherits(ToArrayObservable, __super__);
	    function ToArrayObservable(source) {
	      this.source = source;
	      __super__.call(this);
	    }

	    ToArrayObservable.prototype.subscribeCore = function(o) {
	      return this.source.subscribe(new InnerObserver(o));
	    };

	    function InnerObserver(o) {
	      this.o = o;
	      this.a = [];
	      this.isStopped = false;
	    }
	    InnerObserver.prototype.onNext = function (x) { if(!this.isStopped) { this.a.push(x); } };
	    InnerObserver.prototype.onError = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	      }
	    };
	    InnerObserver.prototype.onCompleted = function () {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onNext(this.a);
	        this.o.onCompleted();
	      }
	    };
	    InnerObserver.prototype.dispose = function () { this.isStopped = true; }
	    InnerObserver.prototype.fail = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	        return true;
	      }
	 
	      return false;
	    };

	    return ToArrayObservable;
	  }(ObservableBase));

	  /**
	  * Creates an array from an observable sequence.
	  * @returns {Observable} An observable sequence containing a single element with a list containing all the elements of the source sequence.
	  */
	  observableProto.toArray = function () {
	    return new ToArrayObservable(this);
	  };

	  /**
	   *  Creates an observable sequence from a specified subscribe method implementation.
	   * @example
	   *  var res = Rx.Observable.create(function (observer) { return function () { } );
	   *  var res = Rx.Observable.create(function (observer) { return Rx.Disposable.empty; } );
	   *  var res = Rx.Observable.create(function (observer) { } );
	   * @param {Function} subscribe Implementation of the resulting observable sequence's subscribe method, returning a function that will be wrapped in a Disposable.
	   * @returns {Observable} The observable sequence with the specified implementation for the Subscribe method.
	   */
	  Observable.create = function (subscribe, parent) {
	    return new AnonymousObservable(subscribe, parent);
	  };

	  /**
	   *  Returns an observable sequence that invokes the specified factory function whenever a new observer subscribes.
	   *
	   * @example
	   *  var res = Rx.Observable.defer(function () { return Rx.Observable.fromArray([1,2,3]); });
	   * @param {Function} observableFactory Observable factory function to invoke for each observer that subscribes to the resulting sequence or Promise.
	   * @returns {Observable} An observable sequence whose observers trigger an invocation of the given observable factory function.
	   */
	  var observableDefer = Observable.defer = function (observableFactory) {
	    return new AnonymousObservable(function (observer) {
	      var result;
	      try {
	        result = observableFactory();
	      } catch (e) {
	        return observableThrow(e).subscribe(observer);
	      }
	      isPromise(result) && (result = observableFromPromise(result));
	      return result.subscribe(observer);
	    });
	  };

	  var EmptyObservable = (function(__super__) {
	    inherits(EmptyObservable, __super__);
	    function EmptyObservable(scheduler) {
	      this.scheduler = scheduler;
	      __super__.call(this);
	    }

	    EmptyObservable.prototype.subscribeCore = function (observer) {
	      var sink = new EmptySink(observer, this.scheduler);
	      return sink.run();
	    };

	    function EmptySink(observer, scheduler) {
	      this.observer = observer;
	      this.scheduler = scheduler;
	    }

	    function scheduleItem(s, state) {
	      state.onCompleted();
	      return disposableEmpty;
	    }

	    EmptySink.prototype.run = function () {
	      return this.scheduler.scheduleWithState(this.observer, scheduleItem);
	    };

	    return EmptyObservable;
	  }(ObservableBase));

	  var EMPTY_OBSERVABLE = new EmptyObservable(immediateScheduler);

	  /**
	   *  Returns an empty observable sequence, using the specified scheduler to send out the single OnCompleted message.
	   *
	   * @example
	   *  var res = Rx.Observable.empty();
	   *  var res = Rx.Observable.empty(Rx.Scheduler.timeout);
	   * @param {Scheduler} [scheduler] Scheduler to send the termination call on.
	   * @returns {Observable} An observable sequence with no elements.
	   */
	  var observableEmpty = Observable.empty = function (scheduler) {
	    isScheduler(scheduler) || (scheduler = immediateScheduler);
	    return scheduler === immediateScheduler ? EMPTY_OBSERVABLE : new EmptyObservable(scheduler);
	  };

	  var FromObservable = (function(__super__) {
	    inherits(FromObservable, __super__);
	    function FromObservable(iterable, mapper, scheduler) {
	      this.iterable = iterable;
	      this.mapper = mapper;
	      this.scheduler = scheduler;
	      __super__.call(this);
	    }

	    FromObservable.prototype.subscribeCore = function (o) {
	      var sink = new FromSink(o, this);
	      return sink.run();
	    };

	    return FromObservable;
	  }(ObservableBase));

	  var FromSink = (function () {
	    function FromSink(o, parent) {
	      this.o = o;
	      this.parent = parent;
	    }

	    FromSink.prototype.run = function () {
	      var list = Object(this.parent.iterable),
	          it = getIterable(list),
	          o = this.o,
	          mapper = this.parent.mapper;

	      function loopRecursive(i, recurse) {
	        var next = tryCatch(it.next).call(it);
	        if (next === errorObj) { return o.onError(next.e); }
	        if (next.done) { return o.onCompleted(); }

	        var result = next.value;

	        if (isFunction(mapper)) {
	          result = tryCatch(mapper)(result, i);
	          if (result === errorObj) { return o.onError(result.e); }
	        }

	        o.onNext(result);
	        recurse(i + 1);
	      }

	      return this.parent.scheduler.scheduleRecursiveWithState(0, loopRecursive);
	    };

	    return FromSink;
	  }());

	  var maxSafeInteger = Math.pow(2, 53) - 1;

	  function StringIterable(s) {
	    this._s = s;
	  }

	  StringIterable.prototype[$iterator$] = function () {
	    return new StringIterator(this._s);
	  };

	  function StringIterator(s) {
	    this._s = s;
	    this._l = s.length;
	    this._i = 0;
	  }

	  StringIterator.prototype[$iterator$] = function () {
	    return this;
	  };

	  StringIterator.prototype.next = function () {
	    return this._i < this._l ? { done: false, value: this._s.charAt(this._i++) } : doneEnumerator;
	  };

	  function ArrayIterable(a) {
	    this._a = a;
	  }

	  ArrayIterable.prototype[$iterator$] = function () {
	    return new ArrayIterator(this._a);
	  };

	  function ArrayIterator(a) {
	    this._a = a;
	    this._l = toLength(a);
	    this._i = 0;
	  }

	  ArrayIterator.prototype[$iterator$] = function () {
	    return this;
	  };

	  ArrayIterator.prototype.next = function () {
	    return this._i < this._l ? { done: false, value: this._a[this._i++] } : doneEnumerator;
	  };

	  function numberIsFinite(value) {
	    return typeof value === 'number' && root.isFinite(value);
	  }

	  function isNan(n) {
	    return n !== n;
	  }

	  function getIterable(o) {
	    var i = o[$iterator$], it;
	    if (!i && typeof o === 'string') {
	      it = new StringIterable(o);
	      return it[$iterator$]();
	    }
	    if (!i && o.length !== undefined) {
	      it = new ArrayIterable(o);
	      return it[$iterator$]();
	    }
	    if (!i) { throw new TypeError('Object is not iterable'); }
	    return o[$iterator$]();
	  }

	  function sign(value) {
	    var number = +value;
	    if (number === 0) { return number; }
	    if (isNaN(number)) { return number; }
	    return number < 0 ? -1 : 1;
	  }

	  function toLength(o) {
	    var len = +o.length;
	    if (isNaN(len)) { return 0; }
	    if (len === 0 || !numberIsFinite(len)) { return len; }
	    len = sign(len) * Math.floor(Math.abs(len));
	    if (len <= 0) { return 0; }
	    if (len > maxSafeInteger) { return maxSafeInteger; }
	    return len;
	  }

	  /**
	  * This method creates a new Observable sequence from an array-like or iterable object.
	  * @param {Any} arrayLike An array-like or iterable object to convert to an Observable sequence.
	  * @param {Function} [mapFn] Map function to call on every element of the array.
	  * @param {Any} [thisArg] The context to use calling the mapFn if provided.
	  * @param {Scheduler} [scheduler] Optional scheduler to use for scheduling.  If not provided, defaults to Scheduler.currentThread.
	  */
	  var observableFrom = Observable.from = function (iterable, mapFn, thisArg, scheduler) {
	    if (iterable == null) {
	      throw new Error('iterable cannot be null.')
	    }
	    if (mapFn && !isFunction(mapFn)) {
	      throw new Error('mapFn when provided must be a function');
	    }
	    if (mapFn) {
	      var mapper = bindCallback(mapFn, thisArg, 2);
	    }
	    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
	    return new FromObservable(iterable, mapper, scheduler);
	  }

	  var FromArrayObservable = (function(__super__) {
	    inherits(FromArrayObservable, __super__);
	    function FromArrayObservable(args, scheduler) {
	      this.args = args;
	      this.scheduler = scheduler;
	      __super__.call(this);
	    }

	    FromArrayObservable.prototype.subscribeCore = function (observer) {
	      var sink = new FromArraySink(observer, this);
	      return sink.run();
	    };

	    return FromArrayObservable;
	  }(ObservableBase));

	  function FromArraySink(observer, parent) {
	    this.observer = observer;
	    this.parent = parent;
	  }

	  FromArraySink.prototype.run = function () {
	    var observer = this.observer, args = this.parent.args, len = args.length;
	    function loopRecursive(i, recurse) {
	      if (i < len) {
	        observer.onNext(args[i]);
	        recurse(i + 1);
	      } else {
	        observer.onCompleted();
	      }
	    }

	    return this.parent.scheduler.scheduleRecursiveWithState(0, loopRecursive);
	  };

	  /**
	  *  Converts an array to an observable sequence, using an optional scheduler to enumerate the array.
	  * @deprecated use Observable.from or Observable.of
	  * @param {Scheduler} [scheduler] Scheduler to run the enumeration of the input sequence on.
	  * @returns {Observable} The observable sequence whose elements are pulled from the given enumerable sequence.
	  */
	  var observableFromArray = Observable.fromArray = function (array, scheduler) {
	    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
	    return new FromArrayObservable(array, scheduler)
	  };

	  /**
	   *  Generates an observable sequence by running a state-driven loop producing the sequence's elements, using the specified scheduler to send out observer messages.
	   *
	   * @example
	   *  var res = Rx.Observable.generate(0, function (x) { return x < 10; }, function (x) { return x + 1; }, function (x) { return x; });
	   *  var res = Rx.Observable.generate(0, function (x) { return x < 10; }, function (x) { return x + 1; }, function (x) { return x; }, Rx.Scheduler.timeout);
	   * @param {Mixed} initialState Initial state.
	   * @param {Function} condition Condition to terminate generation (upon returning false).
	   * @param {Function} iterate Iteration step function.
	   * @param {Function} resultSelector Selector function for results produced in the sequence.
	   * @param {Scheduler} [scheduler] Scheduler on which to run the generator loop. If not provided, defaults to Scheduler.currentThread.
	   * @returns {Observable} The generated sequence.
	   */
	  Observable.generate = function (initialState, condition, iterate, resultSelector, scheduler) {
	    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
	    return new AnonymousObservable(function (o) {
	      var first = true;
	      return scheduler.scheduleRecursiveWithState(initialState, function (state, self) {
	        var hasResult, result;
	        try {
	          if (first) {
	            first = false;
	          } else {
	            state = iterate(state);
	          }
	          hasResult = condition(state);
	          hasResult && (result = resultSelector(state));
	        } catch (e) {
	          return o.onError(e);
	        }
	        if (hasResult) {
	          o.onNext(result);
	          self(state);
	        } else {
	          o.onCompleted();
	        }
	      });
	    });
	  };

	  function observableOf (scheduler, array) {
	    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
	    return new FromArrayObservable(array, scheduler);
	  }

	  /**
	  *  This method creates a new Observable instance with a variable number of arguments, regardless of number or type of the arguments.
	  * @returns {Observable} The observable sequence whose elements are pulled from the given arguments.
	  */
	  Observable.of = function () {
	    var len = arguments.length, args = new Array(len);
	    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    return new FromArrayObservable(args, currentThreadScheduler);
	  };

	  /**
	  *  This method creates a new Observable instance with a variable number of arguments, regardless of number or type of the arguments.
	  * @param {Scheduler} scheduler A scheduler to use for scheduling the arguments.
	  * @returns {Observable} The observable sequence whose elements are pulled from the given arguments.
	  */
	  Observable.ofWithScheduler = function (scheduler) {
	    var len = arguments.length, args = new Array(len - 1);
	    for(var i = 1; i < len; i++) { args[i - 1] = arguments[i]; }
	    return new FromArrayObservable(args, scheduler);
	  };

	  /**
	   * Creates an Observable sequence from changes to an array using Array.observe.
	   * @param {Array} array An array to observe changes.
	   * @returns {Observable} An observable sequence containing changes to an array from Array.observe.
	   */
	  Observable.ofArrayChanges = function(array) {
	    if (!Array.isArray(array)) { throw new TypeError('Array.observe only accepts arrays.'); }
	    if (typeof Array.observe !== 'function' && typeof Array.unobserve !== 'function') { throw new TypeError('Array.observe is not supported on your platform') }
	    return new AnonymousObservable(function(observer) {
	      function observerFn(changes) {
	        for(var i = 0, len = changes.length; i < len; i++) {
	          observer.onNext(changes[i]);
	        }
	      }
	      
	      Array.observe(array, observerFn);

	      return function () {
	        Array.unobserve(array, observerFn);
	      };
	    });
	  };

	  /**
	   * Creates an Observable sequence from changes to an object using Object.observe.
	   * @param {Object} obj An object to observe changes.
	   * @returns {Observable} An observable sequence containing changes to an object from Object.observe.
	   */
	  Observable.ofObjectChanges = function(obj) {
	    if (obj == null) { throw new TypeError('object must not be null or undefined.'); }
	    if (typeof Object.observe !== 'function' && typeof Object.unobserve !== 'function') { throw new TypeError('Object.observe is not supported on your platform') }
	    return new AnonymousObservable(function(observer) {
	      function observerFn(changes) {
	        for(var i = 0, len = changes.length; i < len; i++) {
	          observer.onNext(changes[i]);
	        }
	      }

	      Object.observe(obj, observerFn);

	      return function () {
	        Object.unobserve(obj, observerFn);
	      };
	    });
	  };

	  var NeverObservable = (function(__super__) {
	    inherits(NeverObservable, __super__);
	    function NeverObservable() {
	      __super__.call(this);
	    }

	    NeverObservable.prototype.subscribeCore = function (observer) {
	      return disposableEmpty;
	    };

	    return NeverObservable;
	  }(ObservableBase));

	  var NEVER_OBSERVABLE = new NeverObservable();

	  /**
	   * Returns a non-terminating observable sequence, which can be used to denote an infinite duration (e.g. when using reactive joins).
	   * @returns {Observable} An observable sequence whose observers will never get called.
	   */
	  var observableNever = Observable.never = function () {
	    return NEVER_OBSERVABLE;
	  };

	  var PairsObservable = (function(__super__) {
	    inherits(PairsObservable, __super__);
	    function PairsObservable(obj, scheduler) {
	      this.obj = obj;
	      this.keys = Object.keys(obj);
	      this.scheduler = scheduler;
	      __super__.call(this);
	    }

	    PairsObservable.prototype.subscribeCore = function (observer) {
	      var sink = new PairsSink(observer, this);
	      return sink.run();
	    };

	    return PairsObservable;
	  }(ObservableBase));

	  function PairsSink(observer, parent) {
	    this.observer = observer;
	    this.parent = parent;
	  }

	  PairsSink.prototype.run = function () {
	    var observer = this.observer, obj = this.parent.obj, keys = this.parent.keys, len = keys.length;
	    function loopRecursive(i, recurse) {
	      if (i < len) {
	        var key = keys[i];
	        observer.onNext([key, obj[key]]);
	        recurse(i + 1);
	      } else {
	        observer.onCompleted();
	      }
	    }

	    return this.parent.scheduler.scheduleRecursiveWithState(0, loopRecursive);
	  };

	  /**
	   * Convert an object into an observable sequence of [key, value] pairs.
	   * @param {Object} obj The object to inspect.
	   * @param {Scheduler} [scheduler] Scheduler to run the enumeration of the input sequence on.
	   * @returns {Observable} An observable sequence of [key, value] pairs from the object.
	   */
	  Observable.pairs = function (obj, scheduler) {
	    scheduler || (scheduler = currentThreadScheduler);
	    return new PairsObservable(obj, scheduler);
	  };

	    var RangeObservable = (function(__super__) {
	    inherits(RangeObservable, __super__);
	    function RangeObservable(start, count, scheduler) {
	      this.start = start;
	      this.rangeCount = count;
	      this.scheduler = scheduler;
	      __super__.call(this);
	    }

	    RangeObservable.prototype.subscribeCore = function (observer) {
	      var sink = new RangeSink(observer, this);
	      return sink.run();
	    };

	    return RangeObservable;
	  }(ObservableBase));

	  var RangeSink = (function () {
	    function RangeSink(observer, parent) {
	      this.observer = observer;
	      this.parent = parent;
	    }

	    RangeSink.prototype.run = function () {
	      var start = this.parent.start, count = this.parent.rangeCount, observer = this.observer;
	      function loopRecursive(i, recurse) {
	        if (i < count) {
	          observer.onNext(start + i);
	          recurse(i + 1);
	        } else {
	          observer.onCompleted();
	        }
	      }

	      return this.parent.scheduler.scheduleRecursiveWithState(0, loopRecursive);
	    };

	    return RangeSink;
	  }());

	  /**
	  *  Generates an observable sequence of integral numbers within a specified range, using the specified scheduler to send out observer messages.
	  * @param {Number} start The value of the first integer in the sequence.
	  * @param {Number} count The number of sequential integers to generate.
	  * @param {Scheduler} [scheduler] Scheduler to run the generator loop on. If not specified, defaults to Scheduler.currentThread.
	  * @returns {Observable} An observable sequence that contains a range of sequential integral numbers.
	  */
	  Observable.range = function (start, count, scheduler) {
	    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
	    return new RangeObservable(start, count, scheduler);
	  };

	  var RepeatObservable = (function(__super__) {
	    inherits(RepeatObservable, __super__);
	    function RepeatObservable(value, repeatCount, scheduler) {
	      this.value = value;
	      this.repeatCount = repeatCount == null ? -1 : repeatCount;
	      this.scheduler = scheduler;
	      __super__.call(this);
	    }

	    RepeatObservable.prototype.subscribeCore = function (observer) {
	      var sink = new RepeatSink(observer, this);
	      return sink.run();
	    };

	    return RepeatObservable;
	  }(ObservableBase));

	  function RepeatSink(observer, parent) {
	    this.observer = observer;
	    this.parent = parent;
	  }

	  RepeatSink.prototype.run = function () {
	    var observer = this.observer, value = this.parent.value;
	    function loopRecursive(i, recurse) {
	      if (i === -1 || i > 0) {
	        observer.onNext(value);
	        i > 0 && i--;
	      }
	      if (i === 0) { return observer.onCompleted(); }
	      recurse(i);
	    }

	    return this.parent.scheduler.scheduleRecursiveWithState(this.parent.repeatCount, loopRecursive);
	  };

	  /**
	   *  Generates an observable sequence that repeats the given element the specified number of times, using the specified scheduler to send out observer messages.
	   * @param {Mixed} value Element to repeat.
	   * @param {Number} repeatCount [Optiona] Number of times to repeat the element. If not specified, repeats indefinitely.
	   * @param {Scheduler} scheduler Scheduler to run the producer loop on. If not specified, defaults to Scheduler.immediate.
	   * @returns {Observable} An observable sequence that repeats the given element the specified number of times.
	   */
	  Observable.repeat = function (value, repeatCount, scheduler) {
	    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
	    return new RepeatObservable(value, repeatCount, scheduler);
	  };

	  var JustObservable = (function(__super__) {
	    inherits(JustObservable, __super__);
	    function JustObservable(value, scheduler) {
	      this.value = value;
	      this.scheduler = scheduler;
	      __super__.call(this);
	    }

	    JustObservable.prototype.subscribeCore = function (observer) {
	      var sink = new JustSink(observer, this.value, this.scheduler);
	      return sink.run();
	    };

	    function JustSink(observer, value, scheduler) {
	      this.observer = observer;
	      this.value = value;
	      this.scheduler = scheduler;
	    }

	    function scheduleItem(s, state) {
	      var value = state[0], observer = state[1];
	      observer.onNext(value);
	      observer.onCompleted();
	      return disposableEmpty;
	    }

	    JustSink.prototype.run = function () {
	      var state = [this.value, this.observer];
	      return this.scheduler === immediateScheduler ?
	        scheduleItem(null, state) :
	        this.scheduler.scheduleWithState(state, scheduleItem);
	    };

	    return JustObservable;
	  }(ObservableBase));

	  /**
	   *  Returns an observable sequence that contains a single element, using the specified scheduler to send out observer messages.
	   *  There is an alias called 'just' or browsers <IE9.
	   * @param {Mixed} value Single element in the resulting observable sequence.
	   * @param {Scheduler} scheduler Scheduler to send the single element on. If not specified, defaults to Scheduler.immediate.
	   * @returns {Observable} An observable sequence containing the single specified element.
	   */
	  var observableReturn = Observable['return'] = Observable.just = function (value, scheduler) {
	    isScheduler(scheduler) || (scheduler = immediateScheduler);
	    return new JustObservable(value, scheduler);
	  };

	  var ThrowObservable = (function(__super__) {
	    inherits(ThrowObservable, __super__);
	    function ThrowObservable(error, scheduler) {
	      this.error = error;
	      this.scheduler = scheduler;
	      __super__.call(this);
	    }

	    ThrowObservable.prototype.subscribeCore = function (o) {
	      var sink = new ThrowSink(o, this);
	      return sink.run();
	    };

	    function ThrowSink(o, p) {
	      this.o = o;
	      this.p = p;
	    }

	    function scheduleItem(s, state) {
	      var e = state[0], o = state[1];
	      o.onError(e);
	    }

	    ThrowSink.prototype.run = function () {
	      return this.p.scheduler.scheduleWithState([this.p.error, this.o], scheduleItem);
	    };

	    return ThrowObservable;
	  }(ObservableBase));

	  /**
	   *  Returns an observable sequence that terminates with an exception, using the specified scheduler to send out the single onError message.
	   *  There is an alias to this method called 'throwError' for browsers <IE9.
	   * @param {Mixed} error An object used for the sequence's termination.
	   * @param {Scheduler} scheduler Scheduler to send the exceptional termination call on. If not specified, defaults to Scheduler.immediate.
	   * @returns {Observable} The observable sequence that terminates exceptionally with the specified exception object.
	   */
	  var observableThrow = Observable['throw'] = function (error, scheduler) {
	    isScheduler(scheduler) || (scheduler = immediateScheduler);
	    return new ThrowObservable(error, scheduler);
	  };

	  /**
	   * Constructs an observable sequence that depends on a resource object, whose lifetime is tied to the resulting observable sequence's lifetime.
	   * @param {Function} resourceFactory Factory function to obtain a resource object.
	   * @param {Function} observableFactory Factory function to obtain an observable sequence that depends on the obtained resource.
	   * @returns {Observable} An observable sequence whose lifetime controls the lifetime of the dependent resource object.
	   */
	  Observable.using = function (resourceFactory, observableFactory) {
	    return new AnonymousObservable(function (o) {
	      var disposable = disposableEmpty;
	      var resource = tryCatch(resourceFactory)();
	      if (resource === errorObj) {
	        return new CompositeDisposable(observableThrow(resource.e).subscribe(o), disposable);
	      }
	      resource && (disposable = resource);
	      var source = tryCatch(observableFactory)(resource);
	      if (source === errorObj) {
	        return new CompositeDisposable(observableThrow(source.e).subscribe(o), disposable);
	      }
	      return new CompositeDisposable(source.subscribe(o), disposable);
	    });
	  };

	  /**
	   * Propagates the observable sequence or Promise that reacts first.
	   * @param {Observable} rightSource Second observable sequence or Promise.
	   * @returns {Observable} {Observable} An observable sequence that surfaces either of the given sequences, whichever reacted first.
	   */
	  observableProto.amb = function (rightSource) {
	    var leftSource = this;
	    return new AnonymousObservable(function (observer) {
	      var choice,
	        leftChoice = 'L', rightChoice = 'R',
	        leftSubscription = new SingleAssignmentDisposable(),
	        rightSubscription = new SingleAssignmentDisposable();

	      isPromise(rightSource) && (rightSource = observableFromPromise(rightSource));

	      function choiceL() {
	        if (!choice) {
	          choice = leftChoice;
	          rightSubscription.dispose();
	        }
	      }

	      function choiceR() {
	        if (!choice) {
	          choice = rightChoice;
	          leftSubscription.dispose();
	        }
	      }

	      var leftSubscribe = observerCreate(
	        function (left) {
	          choiceL();
	          choice === leftChoice && observer.onNext(left);
	        },
	        function (e) {
	          choiceL();
	          choice === leftChoice && observer.onError(e);
	        },
	        function () {
	          choiceL();
	          choice === leftChoice && observer.onCompleted();
	        }
	      );
	      var rightSubscribe = observerCreate(
	        function (right) {
	          choiceR();
	          choice === rightChoice && observer.onNext(right);
	        },
	        function (e) {
	          choiceR();
	          choice === rightChoice && observer.onError(e);
	        },
	        function () {
	          choiceR();
	          choice === rightChoice && observer.onCompleted();
	        }
	      );

	      leftSubscription.setDisposable(leftSource.subscribe(leftSubscribe));
	      rightSubscription.setDisposable(rightSource.subscribe(rightSubscribe));

	      return new CompositeDisposable(leftSubscription, rightSubscription);
	    });
	  };

	  function amb(p, c) { return p.amb(c); }

	  /**
	   * Propagates the observable sequence or Promise that reacts first.
	   * @returns {Observable} An observable sequence that surfaces any of the given sequences, whichever reacted first.
	   */
	  Observable.amb = function () {
	    var acc = observableNever(), items;
	    if (Array.isArray(arguments[0])) {
	      items = arguments[0];
	    } else {
	      var len = arguments.length;
	      items = new Array(items);
	      for(var i = 0; i < len; i++) { items[i] = arguments[i]; }
	    }
	    for (var i = 0, len = items.length; i < len; i++) {
	      acc = amb(acc, items[i]);
	    }
	    return acc;
	  };

	  var CatchObserver = (function(__super__) {
	    inherits(CatchObserver, __super__);
	    function CatchObserver(o, s, fn) {
	      this._o = o;
	      this._s = s;
	      this._fn = fn;
	      __super__.call(this);
	    }

	    CatchObserver.prototype.next = function (x) { this._o.onNext(x); };
	    CatchObserver.prototype.completed = function () { return this._o.onCompleted(); };
	    CatchObserver.prototype.error = function (e) {
	      var result = tryCatch(this._fn)(e);
	      if (result === errorObj) { return this._o.onError(result.e); }
	      isPromise(result) && (result = observableFromPromise(result));

	      var d = new SingleAssignmentDisposable();
	      this._s.setDisposable(d);
	      d.setDisposable(result.subscribe(this._o));
	    };

	    return CatchObserver;
	  }(AbstractObserver));

	  function observableCatchHandler(source, handler) {
	    return new AnonymousObservable(function (o) {
	      var d1 = new SingleAssignmentDisposable(), subscription = new SerialDisposable();
	      subscription.setDisposable(d1);
	      d1.setDisposable(source.subscribe(new CatchObserver(o, subscription, handler)));
	      return subscription;
	    }, source);
	  }

	  /**
	   * Continues an observable sequence that is terminated by an exception with the next observable sequence.
	   * @param {Mixed} handlerOrSecond Exception handler function that returns an observable sequence given the error that occurred in the first sequence, or a second observable sequence used to produce results when an error occurred in the first sequence.
	   * @returns {Observable} An observable sequence containing the first sequence's elements, followed by the elements of the handler sequence in case an exception occurred.
	   */
	  observableProto['catch'] = function (handlerOrSecond) {
	    return isFunction(handlerOrSecond) ? observableCatchHandler(this, handlerOrSecond) : observableCatch([this, handlerOrSecond]);
	  };

	  /**
	   * Continues an observable sequence that is terminated by an exception with the next observable sequence.
	   * @param {Array | Arguments} args Arguments or an array to use as the next sequence if an error occurs.
	   * @returns {Observable} An observable sequence containing elements from consecutive source sequences until a source sequence terminates successfully.
	   */
	  var observableCatch = Observable['catch'] = function () {
	    var items;
	    if (Array.isArray(arguments[0])) {
	      items = arguments[0];
	    } else {
	      var len = arguments.length;
	      items = new Array(len);
	      for(var i = 0; i < len; i++) { items[i] = arguments[i]; }
	    }
	    return enumerableOf(items).catchError();
	  };

	  /**
	   * Merges the specified observable sequences into one observable sequence by using the selector function whenever any of the observable sequences or Promises produces an element.
	   * This can be in the form of an argument list of observables or an array.
	   *
	   * @example
	   * 1 - obs = observable.combineLatest(obs1, obs2, obs3, function (o1, o2, o3) { return o1 + o2 + o3; });
	   * 2 - obs = observable.combineLatest([obs1, obs2, obs3], function (o1, o2, o3) { return o1 + o2 + o3; });
	   * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
	   */
	  observableProto.combineLatest = function () {
	    var len = arguments.length, args = new Array(len);
	    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    if (Array.isArray(args[0])) {
	      args[0].unshift(this);
	    } else {
	      args.unshift(this);
	    }
	    return combineLatest.apply(this, args);
	  };

	  function falseFactory() { return false; }
	  function argumentsToArray() {
	    var len = arguments.length, args = new Array(len);
	    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    return args;
	  }

	  /**
	   * Merges the specified observable sequences into one observable sequence by using the selector function whenever any of the observable sequences or Promises produces an element.
	   *
	   * @example
	   * 1 - obs = Rx.Observable.combineLatest(obs1, obs2, obs3, function (o1, o2, o3) { return o1 + o2 + o3; });
	   * 2 - obs = Rx.Observable.combineLatest([obs1, obs2, obs3], function (o1, o2, o3) { return o1 + o2 + o3; });
	   * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
	   */
	  var combineLatest = Observable.combineLatest = function () {
	    var len = arguments.length, args = new Array(len);
	    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;
	    Array.isArray(args[0]) && (args = args[0]);

	    return new AnonymousObservable(function (o) {
	      var n = args.length,
	        hasValue = arrayInitialize(n, falseFactory),
	        hasValueAll = false,
	        isDone = arrayInitialize(n, falseFactory),
	        values = new Array(n);

	      function next(i) {
	        hasValue[i] = true;
	        if (hasValueAll || (hasValueAll = hasValue.every(identity))) {
	          try {
	            var res = resultSelector.apply(null, values);
	          } catch (e) {
	            return o.onError(e);
	          }
	          o.onNext(res);
	        } else if (isDone.filter(function (x, j) { return j !== i; }).every(identity)) {
	          o.onCompleted();
	        }
	      }

	      function done (i) {
	        isDone[i] = true;
	        isDone.every(identity) && o.onCompleted();
	      }

	      var subscriptions = new Array(n);
	      for (var idx = 0; idx < n; idx++) {
	        (function (i) {
	          var source = args[i], sad = new SingleAssignmentDisposable();
	          isPromise(source) && (source = observableFromPromise(source));
	          sad.setDisposable(source.subscribe(function (x) {
	              values[i] = x;
	              next(i);
	            },
	            function(e) { o.onError(e); },
	            function () { done(i); }
	          ));
	          subscriptions[i] = sad;
	        }(idx));
	      }

	      return new CompositeDisposable(subscriptions);
	    }, this);
	  };

	  /**
	   * Concatenates all the observable sequences.  This takes in either an array or variable arguments to concatenate.
	   * @returns {Observable} An observable sequence that contains the elements of each given sequence, in sequential order.
	   */
	  observableProto.concat = function () {
	    for(var args = [], i = 0, len = arguments.length; i < len; i++) { args.push(arguments[i]); }
	    args.unshift(this);
	    return observableConcat.apply(null, args);
	  };

	  var ConcatObservable = (function(__super__) {
	    inherits(ConcatObservable, __super__);
	    function ConcatObservable(sources) {
	      this.sources = sources;
	      __super__.call(this);
	    }

	    ConcatObservable.prototype.subscribeCore = function(o) {
	      var sink = new ConcatSink(this.sources, o);
	      return sink.run();
	    };

	    function ConcatSink(sources, o) {
	      this.sources = sources;
	      this.o = o;
	    }
	    ConcatSink.prototype.run = function () {
	      var isDisposed, subscription = new SerialDisposable(), sources = this.sources, length = sources.length, o = this.o;
	      var cancelable = immediateScheduler.scheduleRecursiveWithState(0, function (i, self) {
	        if (isDisposed) { return; }
	        if (i === length) {
	          return o.onCompleted();
	        }

	        // Check if promise
	        var currentValue = sources[i];
	        isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));

	        var d = new SingleAssignmentDisposable();
	        subscription.setDisposable(d);
	        d.setDisposable(currentValue.subscribe(
	          function (x) { o.onNext(x); },
	          function (e) { o.onError(e); },
	          function () { self(i + 1); }
	        ));
	      });

	      return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
	        isDisposed = true;
	      }));
	    };


	    return ConcatObservable;
	  }(ObservableBase));

	  /**
	   * Concatenates all the observable sequences.
	   * @param {Array | Arguments} args Arguments or an array to concat to the observable sequence.
	   * @returns {Observable} An observable sequence that contains the elements of each given sequence, in sequential order.
	   */
	  var observableConcat = Observable.concat = function () {
	    var args;
	    if (Array.isArray(arguments[0])) {
	      args = arguments[0];
	    } else {
	      args = new Array(arguments.length);
	      for(var i = 0, len = arguments.length; i < len; i++) { args[i] = arguments[i]; }
	    }
	    return new ConcatObservable(args);
	  };

	  /**
	   * Concatenates an observable sequence of observable sequences.
	   * @returns {Observable} An observable sequence that contains the elements of each observed inner sequence, in sequential order.
	   */
	  observableProto.concatAll = function () {
	    return this.merge(1);
	  };

	  var MergeObservable = (function (__super__) {
	    inherits(MergeObservable, __super__);

	    function MergeObservable(source, maxConcurrent) {
	      this.source = source;
	      this.maxConcurrent = maxConcurrent;
	      __super__.call(this);
	    }

	    MergeObservable.prototype.subscribeCore = function(observer) {
	      var g = new CompositeDisposable();
	      g.add(this.source.subscribe(new MergeObserver(observer, this.maxConcurrent, g)));
	      return g;
	    };

	    return MergeObservable;

	  }(ObservableBase));

	  var MergeObserver = (function () {
	    function MergeObserver(o, max, g) {
	      this.o = o;
	      this.max = max;
	      this.g = g;
	      this.done = false;
	      this.q = [];
	      this.activeCount = 0;
	      this.isStopped = false;
	    }
	    MergeObserver.prototype.handleSubscribe = function (xs) {
	      var sad = new SingleAssignmentDisposable();
	      this.g.add(sad);
	      isPromise(xs) && (xs = observableFromPromise(xs));
	      sad.setDisposable(xs.subscribe(new InnerObserver(this, sad)));
	    };
	    MergeObserver.prototype.onNext = function (innerSource) {
	      if (this.isStopped) { return; }
	        if(this.activeCount < this.max) {
	          this.activeCount++;
	          this.handleSubscribe(innerSource);
	        } else {
	          this.q.push(innerSource);
	        }
	      };
	      MergeObserver.prototype.onError = function (e) {
	        if (!this.isStopped) {
	          this.isStopped = true;
	          this.o.onError(e);
	        }
	      };
	      MergeObserver.prototype.onCompleted = function () {
	        if (!this.isStopped) {
	          this.isStopped = true;
	          this.done = true;
	          this.activeCount === 0 && this.o.onCompleted();
	        }
	      };
	      MergeObserver.prototype.dispose = function() { this.isStopped = true; };
	      MergeObserver.prototype.fail = function (e) {
	        if (!this.isStopped) {
	          this.isStopped = true;
	          this.o.onError(e);
	          return true;
	        }

	        return false;
	      };

	      function InnerObserver(parent, sad) {
	        this.parent = parent;
	        this.sad = sad;
	        this.isStopped = false;
	      }
	      InnerObserver.prototype.onNext = function (x) { if(!this.isStopped) { this.parent.o.onNext(x); } };
	      InnerObserver.prototype.onError = function (e) {
	        if (!this.isStopped) {
	          this.isStopped = true;
	          this.parent.o.onError(e);
	        }
	      };
	      InnerObserver.prototype.onCompleted = function () {
	        if(!this.isStopped) {
	          this.isStopped = true;
	          var parent = this.parent;
	          parent.g.remove(this.sad);
	          if (parent.q.length > 0) {
	            parent.handleSubscribe(parent.q.shift());
	          } else {
	            parent.activeCount--;
	            parent.done && parent.activeCount === 0 && parent.o.onCompleted();
	          }
	        }
	      };
	      InnerObserver.prototype.dispose = function() { this.isStopped = true; };
	      InnerObserver.prototype.fail = function (e) {
	        if (!this.isStopped) {
	          this.isStopped = true;
	          this.parent.o.onError(e);
	          return true;
	        }

	        return false;
	      };

	      return MergeObserver;
	  }());





	  /**
	  * Merges an observable sequence of observable sequences into an observable sequence, limiting the number of concurrent subscriptions to inner sequences.
	  * Or merges two observable sequences into a single observable sequence.
	  *
	  * @example
	  * 1 - merged = sources.merge(1);
	  * 2 - merged = source.merge(otherSource);
	  * @param {Mixed} [maxConcurrentOrOther] Maximum number of inner observable sequences being subscribed to concurrently or the second observable sequence.
	  * @returns {Observable} The observable sequence that merges the elements of the inner sequences.
	  */
	  observableProto.merge = function (maxConcurrentOrOther) {
	    return typeof maxConcurrentOrOther !== 'number' ?
	      observableMerge(this, maxConcurrentOrOther) :
	      new MergeObservable(this, maxConcurrentOrOther);
	  };

	  /**
	   * Merges all the observable sequences into a single observable sequence.
	   * The scheduler is optional and if not specified, the immediate scheduler is used.
	   * @returns {Observable} The observable sequence that merges the elements of the observable sequences.
	   */
	  var observableMerge = Observable.merge = function () {
	    var scheduler, sources = [], i, len = arguments.length;
	    if (!arguments[0]) {
	      scheduler = immediateScheduler;
	      for(i = 1; i < len; i++) { sources.push(arguments[i]); }
	    } else if (isScheduler(arguments[0])) {
	      scheduler = arguments[0];
	      for(i = 1; i < len; i++) { sources.push(arguments[i]); }
	    } else {
	      scheduler = immediateScheduler;
	      for(i = 0; i < len; i++) { sources.push(arguments[i]); }
	    }
	    if (Array.isArray(sources[0])) {
	      sources = sources[0];
	    }
	    return observableOf(scheduler, sources).mergeAll();
	  };

	  var MergeAllObservable = (function (__super__) {
	    inherits(MergeAllObservable, __super__);

	    function MergeAllObservable(source) {
	      this.source = source;
	      __super__.call(this);
	    }

	    MergeAllObservable.prototype.subscribeCore = function (observer) {
	      var g = new CompositeDisposable(), m = new SingleAssignmentDisposable();
	      g.add(m);
	      m.setDisposable(this.source.subscribe(new MergeAllObserver(observer, g)));
	      return g;
	    };

	    function MergeAllObserver(o, g) {
	      this.o = o;
	      this.g = g;
	      this.isStopped = false;
	      this.done = false;
	    }
	    MergeAllObserver.prototype.onNext = function(innerSource) {
	      if(this.isStopped) { return; }
	      var sad = new SingleAssignmentDisposable();
	      this.g.add(sad);

	      isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));

	      sad.setDisposable(innerSource.subscribe(new InnerObserver(this, sad)));
	    };
	    MergeAllObserver.prototype.onError = function (e) {
	      if(!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	      }
	    };
	    MergeAllObserver.prototype.onCompleted = function () {
	      if(!this.isStopped) {
	        this.isStopped = true;
	        this.done = true;
	        this.g.length === 1 && this.o.onCompleted();
	      }
	    };
	    MergeAllObserver.prototype.dispose = function() { this.isStopped = true; };
	    MergeAllObserver.prototype.fail = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	        return true;
	      }

	      return false;
	    };

	    function InnerObserver(parent, sad) {
	      this.parent = parent;
	      this.sad = sad;
	      this.isStopped = false;
	    }
	    InnerObserver.prototype.onNext = function (x) { if (!this.isStopped) { this.parent.o.onNext(x); } };
	    InnerObserver.prototype.onError = function (e) {
	      if(!this.isStopped) {
	        this.isStopped = true;
	        this.parent.o.onError(e);
	      }
	    };
	    InnerObserver.prototype.onCompleted = function () {
	      if(!this.isStopped) {
	        var parent = this.parent;
	        this.isStopped = true;
	        parent.g.remove(this.sad);
	        parent.done && parent.g.length === 1 && parent.o.onCompleted();
	      }
	    };
	    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
	    InnerObserver.prototype.fail = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.parent.o.onError(e);
	        return true;
	      }

	      return false;
	    };

	    return MergeAllObservable;
	  }(ObservableBase));

	  /**
	  * Merges an observable sequence of observable sequences into an observable sequence.
	  * @returns {Observable} The observable sequence that merges the elements of the inner sequences.
	  */
	  observableProto.mergeAll = function () {
	    return new MergeAllObservable(this);
	  };

	  var CompositeError = Rx.CompositeError = function(errors) {
	    this.name = "NotImplementedError";
	    this.innerErrors = errors;
	    this.message = 'This contains multiple errors. Check the innerErrors';
	    Error.call(this);
	  }
	  CompositeError.prototype = Error.prototype;

	  /**
	  * Flattens an Observable that emits Observables into one Observable, in a way that allows an Observer to
	  * receive all successfully emitted items from all of the source Observables without being interrupted by
	  * an error notification from one of them.
	  *
	  * This behaves like Observable.prototype.mergeAll except that if any of the merged Observables notify of an
	  * error via the Observer's onError, mergeDelayError will refrain from propagating that
	  * error notification until all of the merged Observables have finished emitting items.
	  * @param {Array | Arguments} args Arguments or an array to merge.
	  * @returns {Observable} an Observable that emits all of the items emitted by the Observables emitted by the Observable
	  */
	  Observable.mergeDelayError = function() {
	    var args;
	    if (Array.isArray(arguments[0])) {
	      args = arguments[0];
	    } else {
	      var len = arguments.length;
	      args = new Array(len);
	      for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    }
	    var source = observableOf(null, args);

	    return new AnonymousObservable(function (o) {
	      var group = new CompositeDisposable(),
	        m = new SingleAssignmentDisposable(),
	        isStopped = false,
	        errors = [];

	      function setCompletion() {
	        if (errors.length === 0) {
	          o.onCompleted();
	        } else if (errors.length === 1) {
	          o.onError(errors[0]);
	        } else {
	          o.onError(new CompositeError(errors));
	        }
	      }

	      group.add(m);

	      m.setDisposable(source.subscribe(
	        function (innerSource) {
	          var innerSubscription = new SingleAssignmentDisposable();
	          group.add(innerSubscription);

	          // Check for promises support
	          isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));

	          innerSubscription.setDisposable(innerSource.subscribe(
	            function (x) { o.onNext(x); },
	            function (e) {
	              errors.push(e);
	              group.remove(innerSubscription);
	              isStopped && group.length === 1 && setCompletion();
	            },
	            function () {
	              group.remove(innerSubscription);
	              isStopped && group.length === 1 && setCompletion();
	          }));
	        },
	        function (e) {
	          errors.push(e);
	          isStopped = true;
	          group.length === 1 && setCompletion();
	        },
	        function () {
	          isStopped = true;
	          group.length === 1 && setCompletion();
	        }));
	      return group;
	    });
	  };

	  /**
	   * Continues an observable sequence that is terminated normally or by an exception with the next observable sequence.
	   * @param {Observable} second Second observable sequence used to produce results after the first sequence terminates.
	   * @returns {Observable} An observable sequence that concatenates the first and second sequence, even if the first sequence terminates exceptionally.
	   */
	  observableProto.onErrorResumeNext = function (second) {
	    if (!second) { throw new Error('Second observable is required'); }
	    return onErrorResumeNext([this, second]);
	  };

	  /**
	   * Continues an observable sequence that is terminated normally or by an exception with the next observable sequence.
	   *
	   * @example
	   * 1 - res = Rx.Observable.onErrorResumeNext(xs, ys, zs);
	   * 1 - res = Rx.Observable.onErrorResumeNext([xs, ys, zs]);
	   * @returns {Observable} An observable sequence that concatenates the source sequences, even if a sequence terminates exceptionally.
	   */
	  var onErrorResumeNext = Observable.onErrorResumeNext = function () {
	    var sources = [];
	    if (Array.isArray(arguments[0])) {
	      sources = arguments[0];
	    } else {
	      for(var i = 0, len = arguments.length; i < len; i++) { sources.push(arguments[i]); }
	    }
	    return new AnonymousObservable(function (observer) {
	      var pos = 0, subscription = new SerialDisposable(),
	      cancelable = immediateScheduler.scheduleRecursive(function (self) {
	        var current, d;
	        if (pos < sources.length) {
	          current = sources[pos++];
	          isPromise(current) && (current = observableFromPromise(current));
	          d = new SingleAssignmentDisposable();
	          subscription.setDisposable(d);
	          d.setDisposable(current.subscribe(observer.onNext.bind(observer), self, self));
	        } else {
	          observer.onCompleted();
	        }
	      });
	      return new CompositeDisposable(subscription, cancelable);
	    });
	  };

	  /**
	   * Returns the values from the source observable sequence only after the other observable sequence produces a value.
	   * @param {Observable | Promise} other The observable sequence or Promise that triggers propagation of elements of the source sequence.
	   * @returns {Observable} An observable sequence containing the elements of the source sequence starting from the point the other sequence triggered propagation.
	   */
	  observableProto.skipUntil = function (other) {
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var isOpen = false;
	      var disposables = new CompositeDisposable(source.subscribe(function (left) {
	        isOpen && o.onNext(left);
	      }, function (e) { o.onError(e); }, function () {
	        isOpen && o.onCompleted();
	      }));

	      isPromise(other) && (other = observableFromPromise(other));

	      var rightSubscription = new SingleAssignmentDisposable();
	      disposables.add(rightSubscription);
	      rightSubscription.setDisposable(other.subscribe(function () {
	        isOpen = true;
	        rightSubscription.dispose();
	      }, function (e) { o.onError(e); }, function () {
	        rightSubscription.dispose();
	      }));

	      return disposables;
	    }, source);
	  };

	  var SwitchObservable = (function(__super__) {
	    inherits(SwitchObservable, __super__);
	    function SwitchObservable(source) {
	      this.source = source;
	      __super__.call(this);
	    }

	    SwitchObservable.prototype.subscribeCore = function (o) {
	      var inner = new SerialDisposable(), s = this.source.subscribe(new SwitchObserver(o, inner));
	      return new CompositeDisposable(s, inner);
	    };

	    function SwitchObserver(o, inner) {
	      this.o = o;
	      this.inner = inner;
	      this.stopped = false;
	      this.latest = 0;
	      this.hasLatest = false;
	      this.isStopped = false;
	    }
	    SwitchObserver.prototype.onNext = function (innerSource) {
	      if (this.isStopped) { return; }
	      var d = new SingleAssignmentDisposable(), id = ++this.latest;
	      this.hasLatest = true;
	      this.inner.setDisposable(d);
	      isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));
	      d.setDisposable(innerSource.subscribe(new InnerObserver(this, id)));
	    };
	    SwitchObserver.prototype.onError = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	      }
	    };
	    SwitchObserver.prototype.onCompleted = function () {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.stopped = true;
	        !this.hasLatest && this.o.onCompleted();
	      }
	    };
	    SwitchObserver.prototype.dispose = function () { this.isStopped = true; };
	    SwitchObserver.prototype.fail = function (e) {
	      if(!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	        return true;
	      }
	      return false;
	    };

	    function InnerObserver(parent, id) {
	      this.parent = parent;
	      this.id = id;
	      this.isStopped = false;
	    }
	    InnerObserver.prototype.onNext = function (x) {
	      if (this.isStopped) { return; }
	      this.parent.latest === this.id && this.parent.o.onNext(x);
	    };
	    InnerObserver.prototype.onError = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.parent.latest === this.id && this.parent.o.onError(e);
	      }
	    };
	    InnerObserver.prototype.onCompleted = function () {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        if (this.parent.latest === this.id) {
	          this.parent.hasLatest = false;
	          this.parent.isStopped && this.parent.o.onCompleted();
	        }
	      }
	    };
	    InnerObserver.prototype.dispose = function () { this.isStopped = true; }
	    InnerObserver.prototype.fail = function (e) {
	      if(!this.isStopped) {
	        this.isStopped = true;
	        this.parent.o.onError(e);
	        return true;
	      }
	      return false;
	    };

	    return SwitchObservable;
	  }(ObservableBase));

	  /**
	  * Transforms an observable sequence of observable sequences into an observable sequence producing values only from the most recent observable sequence.
	  * @returns {Observable} The observable sequence that at any point in time produces the elements of the most recent inner observable sequence that has been received.
	  */
	  observableProto['switch'] = observableProto.switchLatest = function () {
	    return new SwitchObservable(this);
	  };

	  var TakeUntilObservable = (function(__super__) {
	    inherits(TakeUntilObservable, __super__);

	    function TakeUntilObservable(source, other) {
	      this.source = source;
	      this.other = isPromise(other) ? observableFromPromise(other) : other;
	      __super__.call(this);
	    }

	    TakeUntilObservable.prototype.subscribeCore = function(o) {
	      return new CompositeDisposable(
	        this.source.subscribe(o),
	        this.other.subscribe(new InnerObserver(o))
	      );
	    };

	    function InnerObserver(o) {
	      this.o = o;
	      this.isStopped = false;
	    }
	    InnerObserver.prototype.onNext = function (x) {
	      if (this.isStopped) { return; }
	      this.o.onCompleted();
	    };
	    InnerObserver.prototype.onError = function (err) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(err);
	      }
	    };
	    InnerObserver.prototype.onCompleted = function () {
	      !this.isStopped && (this.isStopped = true);
	    };
	    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
	    InnerObserver.prototype.fail = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	        return true;
	      }
	      return false;
	    };

	    return TakeUntilObservable;
	  }(ObservableBase));

	  /**
	   * Returns the values from the source observable sequence until the other observable sequence produces a value.
	   * @param {Observable | Promise} other Observable sequence or Promise that terminates propagation of elements of the source sequence.
	   * @returns {Observable} An observable sequence containing the elements of the source sequence up to the point the other sequence interrupted further propagation.
	   */
	  observableProto.takeUntil = function (other) {
	    return new TakeUntilObservable(this, other);
	  };

	  function falseFactory() { return false; }

	  /**
	   * Merges the specified observable sequences into one observable sequence by using the selector function only when the (first) source observable sequence produces an element.
	   * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
	   */
	  observableProto.withLatestFrom = function () {
	    var len = arguments.length, args = new Array(len)
	    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    var resultSelector = args.pop(), source = this;
	    Array.isArray(args[0]) && (args = args[0]);

	    return new AnonymousObservable(function (observer) {
	      var n = args.length,
	        hasValue = arrayInitialize(n, falseFactory),
	        hasValueAll = false,
	        values = new Array(n);

	      var subscriptions = new Array(n + 1);
	      for (var idx = 0; idx < n; idx++) {
	        (function (i) {
	          var other = args[i], sad = new SingleAssignmentDisposable();
	          isPromise(other) && (other = observableFromPromise(other));
	          sad.setDisposable(other.subscribe(function (x) {
	            values[i] = x;
	            hasValue[i] = true;
	            hasValueAll = hasValue.every(identity);
	          }, function (e) { observer.onError(e); }, noop));
	          subscriptions[i] = sad;
	        }(idx));
	      }

	      var sad = new SingleAssignmentDisposable();
	      sad.setDisposable(source.subscribe(function (x) {
	        var allValues = [x].concat(values);
	        if (!hasValueAll) { return; }
	        var res = tryCatch(resultSelector).apply(null, allValues);
	        if (res === errorObj) { return observer.onError(res.e); }
	        observer.onNext(res);
	      }, function (e) { observer.onError(e); }, function () {
	        observer.onCompleted();
	      }));
	      subscriptions[n] = sad;

	      return new CompositeDisposable(subscriptions);
	    }, this);
	  };

	  function falseFactory() { return false; }
	  function emptyArrayFactory() { return []; }
	  function argumentsToArray() {
	    var len = arguments.length, args = new Array(len);
	    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    return args;
	  }

	  /**
	   * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences or an array have produced an element at a corresponding index.
	   * The last element in the arguments must be a function to invoke for each series of elements at corresponding indexes in the args.
	   * @returns {Observable} An observable sequence containing the result of combining elements of the args using the specified result selector function.
	   */
	  observableProto.zip = function () {
	    if (arguments.length === 0) { throw new Error('invalid arguments'); }

	    var len = arguments.length, args = new Array(len);
	    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;
	    Array.isArray(args[0]) && (args = args[0]);

	    var parent = this;
	    args.unshift(parent);
	    return new AnonymousObservable(function (o) {
	      var n = args.length,
	        queues = arrayInitialize(n, emptyArrayFactory),
	        isDone = arrayInitialize(n, falseFactory);

	      var subscriptions = new Array(n);
	      for (var idx = 0; idx < n; idx++) {
	        (function (i) {
	          var source = args[i], sad = new SingleAssignmentDisposable();

	          isPromise(source) && (source = observableFromPromise(source));

	          sad.setDisposable(source.subscribe(function (x) {
	            queues[i].push(x);
	            if (queues.every(function (x) { return x.length > 0; })) {
	              var queuedValues = queues.map(function (x) { return x.shift(); }),
	                  res = tryCatch(resultSelector).apply(parent, queuedValues);
	              if (res === errorObj) { return o.onError(res.e); }
	              o.onNext(res);
	            } else if (isDone.filter(function (x, j) { return j !== i; }).every(identity)) {
	              o.onCompleted();
	            }
	          }, function (e) { o.onError(e); }, function () {
	            isDone[i] = true;
	            isDone.every(identity) && o.onCompleted();
	          }));
	          subscriptions[i] = sad;
	        })(idx);
	      }

	      return new CompositeDisposable(subscriptions);
	    }, parent);
	  };

	  /**
	   * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences have produced an element at a corresponding index.
	   * @param arguments Observable sources.
	   * @param {Function} resultSelector Function to invoke for each series of elements at corresponding indexes in the sources.
	   * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
	   */
	  Observable.zip = function () {
	    var len = arguments.length, args = new Array(len);
	    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    if (Array.isArray(args[0])) {
	      args = isFunction(args[1]) ? args[0].concat(args[1]) : args[0];
	    }
	    var first = args.shift();
	    return first.zip.apply(first, args);
	  };

	function falseFactory() { return false; }
	function emptyArrayFactory() { return []; }
	function argumentsToArray() {
	  var len = arguments.length, args = new Array(len);
	  for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	  return args;
	}

	/**
	 * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences or an array have produced an element at a corresponding index.
	 * The last element in the arguments must be a function to invoke for each series of elements at corresponding indexes in the args.
	 * @returns {Observable} An observable sequence containing the result of combining elements of the args using the specified result selector function.
	 */
	observableProto.zipIterable = function () {
	  if (arguments.length === 0) { throw new Error('invalid arguments'); }

	  var len = arguments.length, args = new Array(len);
	  for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	  var resultSelector = isFunction(args[len - 1]) ? args.pop() : argumentsToArray;

	  var parent = this;
	  args.unshift(parent);
	  return new AnonymousObservable(function (o) {
	    var n = args.length,
	      queues = arrayInitialize(n, emptyArrayFactory),
	      isDone = arrayInitialize(n, falseFactory);

	    var subscriptions = new Array(n);
	    for (var idx = 0; idx < n; idx++) {
	      (function (i) {
	        var source = args[i], sad = new SingleAssignmentDisposable();

	        (isArrayLike(source) || isIterable(source)) && (source = observableFrom(source));

	        sad.setDisposable(source.subscribe(function (x) {
	          queues[i].push(x);
	          if (queues.every(function (x) { return x.length > 0; })) {
	            var queuedValues = queues.map(function (x) { return x.shift(); }),
	                res = tryCatch(resultSelector).apply(parent, queuedValues);
	            if (res === errorObj) { return o.onError(res.e); }
	            o.onNext(res);
	          } else if (isDone.filter(function (x, j) { return j !== i; }).every(identity)) {
	            o.onCompleted();
	          }
	        }, function (e) { o.onError(e); }, function () {
	          isDone[i] = true;
	          isDone.every(identity) && o.onCompleted();
	        }));
	        subscriptions[i] = sad;
	      })(idx);
	    }

	    return new CompositeDisposable(subscriptions);
	  }, parent);
	};

	  function asObservable(source) {
	    return function subscribe(o) { return source.subscribe(o); };
	  }

	  /**
	   *  Hides the identity of an observable sequence.
	   * @returns {Observable} An observable sequence that hides the identity of the source sequence.
	   */
	  observableProto.asObservable = function () {
	    return new AnonymousObservable(asObservable(this), this);
	  };

	  function toArray(x) { return x.toArray(); }
	  function notEmpty(x) { return x.length > 0; }

	  /**
	   *  Projects each element of an observable sequence into zero or more buffers which are produced based on element count information.
	   * @param {Number} count Length of each buffer.
	   * @param {Number} [skip] Number of elements to skip between creation of consecutive buffers. If not provided, defaults to the count.
	   * @returns {Observable} An observable sequence of buffers.
	   */
	  observableProto.bufferWithCount = function (count, skip) {
	    typeof skip !== 'number' && (skip = count);
	    return this.windowWithCount(count, skip)
	      .flatMap(toArray)
	      .filter(notEmpty);
	  };

	  /**
	   * Dematerializes the explicit notification values of an observable sequence as implicit notifications.
	   * @returns {Observable} An observable sequence exhibiting the behavior corresponding to the source sequence's notification values.
	   */
	  observableProto.dematerialize = function () {
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      return source.subscribe(function (x) { return x.accept(o); }, function(e) { o.onError(e); }, function () { o.onCompleted(); });
	    }, this);
	  };

	  var DistinctUntilChangedObservable = (function(__super__) {
	    inherits(DistinctUntilChangedObservable, __super__);
	    function DistinctUntilChangedObservable(source, keyFn, comparer) {
	      this.source = source;
	      this.keyFn = keyFn;
	      this.comparer = comparer;
	      __super__.call(this);
	    }

	    DistinctUntilChangedObservable.prototype.subscribeCore = function (o) {
	      return this.source.subscribe(new DistinctUntilChangedObserver(o, this.keyFn, this.comparer));
	    };

	    return DistinctUntilChangedObservable;
	  }(ObservableBase));

	  var DistinctUntilChangedObserver = (function(__super__) {
	    inherits(DistinctUntilChangedObserver, __super__);
	    function DistinctUntilChangedObserver(o, keyFn, comparer) {
	      this.o = o;
	      this.keyFn = keyFn;
	      this.comparer = comparer;
	      this.hasCurrentKey = false;
	      this.currentKey = null;
	      __super__.call(this);
	    }

	    DistinctUntilChangedObserver.prototype.next = function (x) {
	      var key = x, comparerEquals;
	      if (isFunction(this.keyFn)) {
	        key = tryCatch(this.keyFn)(x);
	        if (key === errorObj) { return this.o.onError(key.e); }
	      }
	      if (this.hasCurrentKey) {
	        comparerEquals = tryCatch(this.comparer)(this.currentKey, key);
	        if (comparerEquals === errorObj) { return this.o.onError(comparerEquals.e); }
	      }
	      if (!this.hasCurrentKey || !comparerEquals) {
	        this.hasCurrentKey = true;
	        this.currentKey = key;
	        this.o.onNext(x);
	      }
	    };
	    DistinctUntilChangedObserver.prototype.error = function(e) {
	      this.o.onError(e);
	    };
	    DistinctUntilChangedObserver.prototype.completed = function () {
	      this.o.onCompleted();
	    };

	    return DistinctUntilChangedObserver;
	  }(AbstractObserver));

	  /**
	  *  Returns an observable sequence that contains only distinct contiguous elements according to the keyFn and the comparer.
	  * @param {Function} [keyFn] A function to compute the comparison key for each element. If not provided, it projects the value.
	  * @param {Function} [comparer] Equality comparer for computed key values. If not provided, defaults to an equality comparer function.
	  * @returns {Observable} An observable sequence only containing the distinct contiguous elements, based on a computed key value, from the source sequence.
	  */
	  observableProto.distinctUntilChanged = function (keyFn, comparer) {
	    comparer || (comparer = defaultComparer);
	    return new DistinctUntilChangedObservable(this, keyFn, comparer);
	  };

	  var TapObservable = (function(__super__) {
	    inherits(TapObservable,__super__);
	    function TapObservable(source, observerOrOnNext, onError, onCompleted) {
	      this.source = source;
	      this._oN = observerOrOnNext;
	      this._oE = onError;
	      this._oC = onCompleted;
	      __super__.call(this);
	    }

	    TapObservable.prototype.subscribeCore = function(o) {
	      return this.source.subscribe(new InnerObserver(o, this));
	    };

	    function InnerObserver(o, p) {
	      this.o = o;
	      this.t = !p._oN || isFunction(p._oN) ?
	        observerCreate(p._oN || noop, p._oE || noop, p._oC || noop) :
	        p._oN;
	      this.isStopped = false;
	    }
	    InnerObserver.prototype.onNext = function(x) {
	      if (this.isStopped) { return; }
	      var res = tryCatch(this.t.onNext).call(this.t, x);
	      if (res === errorObj) { this.o.onError(res.e); }
	      this.o.onNext(x);
	    };
	    InnerObserver.prototype.onError = function(err) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        var res = tryCatch(this.t.onError).call(this.t, err);
	        if (res === errorObj) { return this.o.onError(res.e); }
	        this.o.onError(err);
	      }
	    };
	    InnerObserver.prototype.onCompleted = function() {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        var res = tryCatch(this.t.onCompleted).call(this.t);
	        if (res === errorObj) { return this.o.onError(res.e); }
	        this.o.onCompleted();
	      }
	    };
	    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
	    InnerObserver.prototype.fail = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	        return true;
	      }
	      return false;
	    };

	    return TapObservable;
	  }(ObservableBase));

	  /**
	  *  Invokes an action for each element in the observable sequence and invokes an action upon graceful or exceptional termination of the observable sequence.
	  *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
	  * @param {Function | Observer} observerOrOnNext Action to invoke for each element in the observable sequence or an o.
	  * @param {Function} [onError]  Action to invoke upon exceptional termination of the observable sequence. Used if only the observerOrOnNext parameter is also a function.
	  * @param {Function} [onCompleted]  Action to invoke upon graceful termination of the observable sequence. Used if only the observerOrOnNext parameter is also a function.
	  * @returns {Observable} The source sequence with the side-effecting behavior applied.
	  */
	  observableProto['do'] = observableProto.tap = observableProto.doAction = function (observerOrOnNext, onError, onCompleted) {
	    return new TapObservable(this, observerOrOnNext, onError, onCompleted);
	  };

	  /**
	  *  Invokes an action for each element in the observable sequence.
	  *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
	  * @param {Function} onNext Action to invoke for each element in the observable sequence.
	  * @param {Any} [thisArg] Object to use as this when executing callback.
	  * @returns {Observable} The source sequence with the side-effecting behavior applied.
	  */
	  observableProto.doOnNext = observableProto.tapOnNext = function (onNext, thisArg) {
	    return this.tap(typeof thisArg !== 'undefined' ? function (x) { onNext.call(thisArg, x); } : onNext);
	  };

	  /**
	  *  Invokes an action upon exceptional termination of the observable sequence.
	  *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
	  * @param {Function} onError Action to invoke upon exceptional termination of the observable sequence.
	  * @param {Any} [thisArg] Object to use as this when executing callback.
	  * @returns {Observable} The source sequence with the side-effecting behavior applied.
	  */
	  observableProto.doOnError = observableProto.tapOnError = function (onError, thisArg) {
	    return this.tap(noop, typeof thisArg !== 'undefined' ? function (e) { onError.call(thisArg, e); } : onError);
	  };

	  /**
	  *  Invokes an action upon graceful termination of the observable sequence.
	  *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
	  * @param {Function} onCompleted Action to invoke upon graceful termination of the observable sequence.
	  * @param {Any} [thisArg] Object to use as this when executing callback.
	  * @returns {Observable} The source sequence with the side-effecting behavior applied.
	  */
	  observableProto.doOnCompleted = observableProto.tapOnCompleted = function (onCompleted, thisArg) {
	    return this.tap(noop, null, typeof thisArg !== 'undefined' ? function () { onCompleted.call(thisArg); } : onCompleted);
	  };

	  /**
	   *  Invokes a specified action after the source observable sequence terminates gracefully or exceptionally.
	   * @param {Function} finallyAction Action to invoke after the source observable sequence terminates.
	   * @returns {Observable} Source sequence with the action-invoking termination behavior applied.
	   */
	  observableProto['finally'] = function (action) {
	    var source = this;
	    return new AnonymousObservable(function (observer) {
	      var subscription = tryCatch(source.subscribe).call(source, observer);
	      if (subscription === errorObj) {
	        action();
	        return thrower(subscription.e);
	      }
	      return disposableCreate(function () {
	        var r = tryCatch(subscription.dispose).call(subscription);
	        action();
	        r === errorObj && thrower(r.e);
	      });
	    }, this);
	  };

	  var IgnoreElementsObservable = (function(__super__) {
	    inherits(IgnoreElementsObservable, __super__);

	    function IgnoreElementsObservable(source) {
	      this.source = source;
	      __super__.call(this);
	    }

	    IgnoreElementsObservable.prototype.subscribeCore = function (o) {
	      return this.source.subscribe(new InnerObserver(o));
	    };

	    function InnerObserver(o) {
	      this.o = o;
	      this.isStopped = false;
	    }
	    InnerObserver.prototype.onNext = noop;
	    InnerObserver.prototype.onError = function (err) {
	      if(!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(err);
	      }
	    };
	    InnerObserver.prototype.onCompleted = function () {
	      if(!this.isStopped) {
	        this.isStopped = true;
	        this.o.onCompleted();
	      }
	    };
	    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
	    InnerObserver.prototype.fail = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.observer.onError(e);
	        return true;
	      }

	      return false;
	    };

	    return IgnoreElementsObservable;
	  }(ObservableBase));

	  /**
	   *  Ignores all elements in an observable sequence leaving only the termination messages.
	   * @returns {Observable} An empty observable sequence that signals termination, successful or exceptional, of the source sequence.
	   */
	  observableProto.ignoreElements = function () {
	    return new IgnoreElementsObservable(this);
	  };

	  /**
	   *  Materializes the implicit notifications of an observable sequence as explicit notification values.
	   * @returns {Observable} An observable sequence containing the materialized notification values from the source sequence.
	   */
	  observableProto.materialize = function () {
	    var source = this;
	    return new AnonymousObservable(function (observer) {
	      return source.subscribe(function (value) {
	        observer.onNext(notificationCreateOnNext(value));
	      }, function (e) {
	        observer.onNext(notificationCreateOnError(e));
	        observer.onCompleted();
	      }, function () {
	        observer.onNext(notificationCreateOnCompleted());
	        observer.onCompleted();
	      });
	    }, source);
	  };

	  /**
	   *  Repeats the observable sequence a specified number of times. If the repeat count is not specified, the sequence repeats indefinitely.
	   * @param {Number} [repeatCount]  Number of times to repeat the sequence. If not provided, repeats the sequence indefinitely.
	   * @returns {Observable} The observable sequence producing the elements of the given sequence repeatedly.
	   */
	  observableProto.repeat = function (repeatCount) {
	    return enumerableRepeat(this, repeatCount).concat();
	  };

	  /**
	   *  Repeats the source observable sequence the specified number of times or until it successfully terminates. If the retry count is not specified, it retries indefinitely.
	   *  Note if you encounter an error and want it to retry once, then you must use .retry(2);
	   *
	   * @example
	   *  var res = retried = retry.repeat();
	   *  var res = retried = retry.repeat(2);
	   * @param {Number} [retryCount]  Number of times to retry the sequence. If not provided, retry the sequence indefinitely.
	   * @returns {Observable} An observable sequence producing the elements of the given sequence repeatedly until it terminates successfully.
	   */
	  observableProto.retry = function (retryCount) {
	    return enumerableRepeat(this, retryCount).catchError();
	  };

	  /**
	   *  Repeats the source observable sequence upon error each time the notifier emits or until it successfully terminates. 
	   *  if the notifier completes, the observable sequence completes.
	   *
	   * @example
	   *  var timer = Observable.timer(500);
	   *  var source = observable.retryWhen(timer);
	   * @param {Observable} [notifier] An observable that triggers the retries or completes the observable with onNext or onCompleted respectively.
	   * @returns {Observable} An observable sequence producing the elements of the given sequence repeatedly until it terminates successfully.
	   */
	  observableProto.retryWhen = function (notifier) {
	    return enumerableRepeat(this).catchErrorWhen(notifier);
	  };
	  var ScanObservable = (function(__super__) {
	    inherits(ScanObservable, __super__);
	    function ScanObservable(source, accumulator, hasSeed, seed) {
	      this.source = source;
	      this.accumulator = accumulator;
	      this.hasSeed = hasSeed;
	      this.seed = seed;
	      __super__.call(this);
	    }

	    ScanObservable.prototype.subscribeCore = function(o) {
	      return this.source.subscribe(new InnerObserver(o,this));
	    };

	    return ScanObservable;
	  }(ObservableBase));

	  function InnerObserver(o, parent) {
	    this.o = o;
	    this.accumulator = parent.accumulator;
	    this.hasSeed = parent.hasSeed;
	    this.seed = parent.seed;
	    this.hasAccumulation = false;
	    this.accumulation = null;
	    this.hasValue = false;
	    this.isStopped = false;
	  }
	  InnerObserver.prototype = {
	    onNext: function (x) {
	      if (this.isStopped) { return; }
	      !this.hasValue && (this.hasValue = true);
	      if (this.hasAccumulation) {
	        this.accumulation = tryCatch(this.accumulator)(this.accumulation, x);
	      } else {
	        this.accumulation = this.hasSeed ? tryCatch(this.accumulator)(this.seed, x) : x;
	        this.hasAccumulation = true;
	      }
	      if (this.accumulation === errorObj) { return this.o.onError(this.accumulation.e); }
	      this.o.onNext(this.accumulation);
	    },
	    onError: function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	      }
	    },
	    onCompleted: function () {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        !this.hasValue && this.hasSeed && this.o.onNext(this.seed);
	        this.o.onCompleted();
	      }
	    },
	    dispose: function() { this.isStopped = true; },
	    fail: function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	        return true;
	      }
	      return false;
	    }
	  };

	  /**
	  *  Applies an accumulator function over an observable sequence and returns each intermediate result. The optional seed value is used as the initial accumulator value.
	  *  For aggregation behavior with no intermediate results, see Observable.aggregate.
	  * @param {Mixed} [seed] The initial accumulator value.
	  * @param {Function} accumulator An accumulator function to be invoked on each element.
	  * @returns {Observable} An observable sequence containing the accumulated values.
	  */
	  observableProto.scan = function () {
	    var hasSeed = false, seed, accumulator = arguments[0];
	    if (arguments.length === 2) {
	      hasSeed = true;
	      seed = arguments[1];
	    }
	    return new ScanObservable(this, accumulator, hasSeed, seed);
	  };

	  /**
	   *  Bypasses a specified number of elements at the end of an observable sequence.
	   * @description
	   *  This operator accumulates a queue with a length enough to store the first `count` elements. As more elements are
	   *  received, elements are taken from the front of the queue and produced on the result sequence. This causes elements to be delayed.
	   * @param count Number of elements to bypass at the end of the source sequence.
	   * @returns {Observable} An observable sequence containing the source sequence elements except for the bypassed ones at the end.
	   */
	  observableProto.skipLast = function (count) {
	    if (count < 0) { throw new ArgumentOutOfRangeError(); }
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var q = [];
	      return source.subscribe(function (x) {
	        q.push(x);
	        q.length > count && o.onNext(q.shift());
	      }, function (e) { o.onError(e); }, function () { o.onCompleted(); });
	    }, source);
	  };

	  /**
	   *  Prepends a sequence of values to an observable sequence with an optional scheduler and an argument list of values to prepend.
	   *  @example
	   *  var res = source.startWith(1, 2, 3);
	   *  var res = source.startWith(Rx.Scheduler.timeout, 1, 2, 3);
	   * @param {Arguments} args The specified values to prepend to the observable sequence
	   * @returns {Observable} The source sequence prepended with the specified values.
	   */
	  observableProto.startWith = function () {
	    var values, scheduler, start = 0;
	    if (!!arguments.length && isScheduler(arguments[0])) {
	      scheduler = arguments[0];
	      start = 1;
	    } else {
	      scheduler = immediateScheduler;
	    }
	    for(var args = [], i = start, len = arguments.length; i < len; i++) { args.push(arguments[i]); }
	    return enumerableOf([observableFromArray(args, scheduler), this]).concat();
	  };

	  /**
	   *  Returns a specified number of contiguous elements from the end of an observable sequence.
	   * @description
	   *  This operator accumulates a buffer with a length enough to store elements count elements. Upon completion of
	   *  the source sequence, this buffer is drained on the result sequence. This causes the elements to be delayed.
	   * @param {Number} count Number of elements to take from the end of the source sequence.
	   * @returns {Observable} An observable sequence containing the specified number of elements from the end of the source sequence.
	   */
	  observableProto.takeLast = function (count) {
	    if (count < 0) { throw new ArgumentOutOfRangeError(); }
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var q = [];
	      return source.subscribe(function (x) {
	        q.push(x);
	        q.length > count && q.shift();
	      }, function (e) { o.onError(e); }, function () {
	        while (q.length > 0) { o.onNext(q.shift()); }
	        o.onCompleted();
	      });
	    }, source);
	  };

	  /**
	   *  Returns an array with the specified number of contiguous elements from the end of an observable sequence.
	   *
	   * @description
	   *  This operator accumulates a buffer with a length enough to store count elements. Upon completion of the
	   *  source sequence, this buffer is produced on the result sequence.
	   * @param {Number} count Number of elements to take from the end of the source sequence.
	   * @returns {Observable} An observable sequence containing a single array with the specified number of elements from the end of the source sequence.
	   */
	  observableProto.takeLastBuffer = function (count) {
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var q = [];
	      return source.subscribe(function (x) {
	        q.push(x);
	        q.length > count && q.shift();
	      }, function (e) { o.onError(e); }, function () {
	        o.onNext(q);
	        o.onCompleted();
	      });
	    }, source);
	  };

	  /**
	   *  Projects each element of an observable sequence into zero or more windows which are produced based on element count information.
	   *
	   *  var res = xs.windowWithCount(10);
	   *  var res = xs.windowWithCount(10, 1);
	   * @param {Number} count Length of each window.
	   * @param {Number} [skip] Number of elements to skip between creation of consecutive windows. If not specified, defaults to the count.
	   * @returns {Observable} An observable sequence of windows.
	   */
	  observableProto.windowWithCount = function (count, skip) {
	    var source = this;
	    +count || (count = 0);
	    Math.abs(count) === Infinity && (count = 0);
	    if (count <= 0) { throw new ArgumentOutOfRangeError(); }
	    skip == null && (skip = count);
	    +skip || (skip = 0);
	    Math.abs(skip) === Infinity && (skip = 0);

	    if (skip <= 0) { throw new ArgumentOutOfRangeError(); }
	    return new AnonymousObservable(function (observer) {
	      var m = new SingleAssignmentDisposable(),
	        refCountDisposable = new RefCountDisposable(m),
	        n = 0,
	        q = [];

	      function createWindow () {
	        var s = new Subject();
	        q.push(s);
	        observer.onNext(addRef(s, refCountDisposable));
	      }

	      createWindow();

	      m.setDisposable(source.subscribe(
	        function (x) {
	          for (var i = 0, len = q.length; i < len; i++) { q[i].onNext(x); }
	          var c = n - count + 1;
	          c >= 0 && c % skip === 0 && q.shift().onCompleted();
	          ++n % skip === 0 && createWindow();
	        },
	        function (e) {
	          while (q.length > 0) { q.shift().onError(e); }
	          observer.onError(e);
	        },
	        function () {
	          while (q.length > 0) { q.shift().onCompleted(); }
	          observer.onCompleted();
	        }
	      ));
	      return refCountDisposable;
	    }, source);
	  };

	  function concatMap(source, selector, thisArg) {
	    var selectorFunc = bindCallback(selector, thisArg, 3);
	    return source.map(function (x, i) {
	      var result = selectorFunc(x, i, source);
	      isPromise(result) && (result = observableFromPromise(result));
	      (isArrayLike(result) || isIterable(result)) && (result = observableFrom(result));
	      return result;
	    }).concatAll();
	  }

	  /**
	   *  One of the Following:
	   *  Projects each element of an observable sequence to an observable sequence and merges the resulting observable sequences into one observable sequence.
	   *
	   * @example
	   *  var res = source.concatMap(function (x) { return Rx.Observable.range(0, x); });
	   *  Or:
	   *  Projects each element of an observable sequence to an observable sequence, invokes the result selector for the source element and each of the corresponding inner sequence's elements, and merges the results into one observable sequence.
	   *
	   *  var res = source.concatMap(function (x) { return Rx.Observable.range(0, x); }, function (x, y) { return x + y; });
	   *  Or:
	   *  Projects each element of the source observable sequence to the other observable sequence and merges the resulting observable sequences into one observable sequence.
	   *
	   *  var res = source.concatMap(Rx.Observable.fromArray([1,2,3]));
	   * @param {Function} selector A transform function to apply to each element or an observable sequence to project each element from the
	   * source sequence onto which could be either an observable or Promise.
	   * @param {Function} [resultSelector]  A transform function to apply to each element of the intermediate sequence.
	   * @returns {Observable} An observable sequence whose elements are the result of invoking the one-to-many transform function collectionSelector on each element of the input sequence and then mapping each of those sequence elements and their corresponding source element to a result element.
	   */
	  observableProto.selectConcat = observableProto.concatMap = function (selector, resultSelector, thisArg) {
	    if (isFunction(selector) && isFunction(resultSelector)) {
	      return this.concatMap(function (x, i) {
	        var selectorResult = selector(x, i);
	        isPromise(selectorResult) && (selectorResult = observableFromPromise(selectorResult));
	        (isArrayLike(selectorResult) || isIterable(selectorResult)) && (selectorResult = observableFrom(selectorResult));

	        return selectorResult.map(function (y, i2) {
	          return resultSelector(x, y, i, i2);
	        });
	      });
	    }
	    return isFunction(selector) ?
	      concatMap(this, selector, thisArg) :
	      concatMap(this, function () { return selector; });
	  };

	  /**
	   * Projects each notification of an observable sequence to an observable sequence and concats the resulting observable sequences into one observable sequence.
	   * @param {Function} onNext A transform function to apply to each element; the second parameter of the function represents the index of the source element.
	   * @param {Function} onError A transform function to apply when an error occurs in the source sequence.
	   * @param {Function} onCompleted A transform function to apply when the end of the source sequence is reached.
	   * @param {Any} [thisArg] An optional "this" to use to invoke each transform.
	   * @returns {Observable} An observable sequence whose elements are the result of invoking the one-to-many transform function corresponding to each notification in the input sequence.
	   */
	  observableProto.concatMapObserver = observableProto.selectConcatObserver = function(onNext, onError, onCompleted, thisArg) {
	    var source = this,
	        onNextFunc = bindCallback(onNext, thisArg, 2),
	        onErrorFunc = bindCallback(onError, thisArg, 1),
	        onCompletedFunc = bindCallback(onCompleted, thisArg, 0);
	    return new AnonymousObservable(function (observer) {
	      var index = 0;
	      return source.subscribe(
	        function (x) {
	          var result;
	          try {
	            result = onNextFunc(x, index++);
	          } catch (e) {
	            observer.onError(e);
	            return;
	          }
	          isPromise(result) && (result = observableFromPromise(result));
	          observer.onNext(result);
	        },
	        function (err) {
	          var result;
	          try {
	            result = onErrorFunc(err);
	          } catch (e) {
	            observer.onError(e);
	            return;
	          }
	          isPromise(result) && (result = observableFromPromise(result));
	          observer.onNext(result);
	          observer.onCompleted();
	        },
	        function () {
	          var result;
	          try {
	            result = onCompletedFunc();
	          } catch (e) {
	            observer.onError(e);
	            return;
	          }
	          isPromise(result) && (result = observableFromPromise(result));
	          observer.onNext(result);
	          observer.onCompleted();
	        });
	    }, this).concatAll();
	  };

	    /**
	     *  Returns the elements of the specified sequence or the specified value in a singleton sequence if the sequence is empty.
	     *
	     *  var res = obs = xs.defaultIfEmpty();
	     *  2 - obs = xs.defaultIfEmpty(false);
	     *
	     * @memberOf Observable#
	     * @param defaultValue The value to return if the sequence is empty. If not provided, this defaults to null.
	     * @returns {Observable} An observable sequence that contains the specified default value if the source is empty; otherwise, the elements of the source itself.
	     */
	    observableProto.defaultIfEmpty = function (defaultValue) {
	      var source = this;
	      defaultValue === undefined && (defaultValue = null);
	      return new AnonymousObservable(function (observer) {
	        var found = false;
	        return source.subscribe(function (x) {
	          found = true;
	          observer.onNext(x);
	        },
	        function (e) { observer.onError(e); }, 
	        function () {
	          !found && observer.onNext(defaultValue);
	          observer.onCompleted();
	        });
	      }, source);
	    };

	  // Swap out for Array.findIndex
	  function arrayIndexOfComparer(array, item, comparer) {
	    for (var i = 0, len = array.length; i < len; i++) {
	      if (comparer(array[i], item)) { return i; }
	    }
	    return -1;
	  }

	  function HashSet(comparer) {
	    this.comparer = comparer;
	    this.set = [];
	  }
	  HashSet.prototype.push = function(value) {
	    var retValue = arrayIndexOfComparer(this.set, value, this.comparer) === -1;
	    retValue && this.set.push(value);
	    return retValue;
	  };

	  /**
	   *  Returns an observable sequence that contains only distinct elements according to the keySelector and the comparer.
	   *  Usage of this operator should be considered carefully due to the maintenance of an internal lookup structure which can grow large.
	   *
	   * @example
	   *  var res = obs = xs.distinct();
	   *  2 - obs = xs.distinct(function (x) { return x.id; });
	   *  2 - obs = xs.distinct(function (x) { return x.id; }, function (a,b) { return a === b; });
	   * @param {Function} [keySelector]  A function to compute the comparison key for each element.
	   * @param {Function} [comparer]  Used to compare items in the collection.
	   * @returns {Observable} An observable sequence only containing the distinct elements, based on a computed key value, from the source sequence.
	   */
	  observableProto.distinct = function (keySelector, comparer) {
	    var source = this;
	    comparer || (comparer = defaultComparer);
	    return new AnonymousObservable(function (o) {
	      var hashSet = new HashSet(comparer);
	      return source.subscribe(function (x) {
	        var key = x;

	        if (keySelector) {
	          try {
	            key = keySelector(x);
	          } catch (e) {
	            o.onError(e);
	            return;
	          }
	        }
	        hashSet.push(key) && o.onNext(x);
	      },
	      function (e) { o.onError(e); }, function () { o.onCompleted(); });
	    }, this);
	  };

	  /**
	   *  Groups the elements of an observable sequence according to a specified key selector function and comparer and selects the resulting elements by using a specified function.
	   *
	   * @example
	   *  var res = observable.groupBy(function (x) { return x.id; });
	   *  2 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; });
	   *  3 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; }, function (x) { return x.toString(); });
	   * @param {Function} keySelector A function to extract the key for each element.
	   * @param {Function} [elementSelector]  A function to map each source element to an element in an observable group.
	   * @returns {Observable} A sequence of observable groups, each of which corresponds to a unique key value, containing all elements that share that same key value.
	   */
	  observableProto.groupBy = function (keySelector, elementSelector) {
	    return this.groupByUntil(keySelector, elementSelector, observableNever);
	  };

	    /**
	     *  Groups the elements of an observable sequence according to a specified key selector function.
	     *  A duration selector function is used to control the lifetime of groups. When a group expires, it receives an OnCompleted notification. When a new element with the same
	     *  key value as a reclaimed group occurs, the group will be reborn with a new lifetime request.
	     *
	     * @example
	     *  var res = observable.groupByUntil(function (x) { return x.id; }, null,  function () { return Rx.Observable.never(); });
	     *  2 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; },  function () { return Rx.Observable.never(); });
	     *  3 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; },  function () { return Rx.Observable.never(); }, function (x) { return x.toString(); });
	     * @param {Function} keySelector A function to extract the key for each element.
	     * @param {Function} durationSelector A function to signal the expiration of a group.
	     * @returns {Observable}
	     *  A sequence of observable groups, each of which corresponds to a unique key value, containing all elements that share that same key value.
	     *  If a group's lifetime expires, a new group with the same key value can be created once an element with such a key value is encoutered.
	     *
	     */
	    observableProto.groupByUntil = function (keySelector, elementSelector, durationSelector) {
	      var source = this;
	      return new AnonymousObservable(function (o) {
	        var map = new Map(),
	          groupDisposable = new CompositeDisposable(),
	          refCountDisposable = new RefCountDisposable(groupDisposable),
	          handleError = function (e) { return function (item) { item.onError(e); }; };

	        groupDisposable.add(
	          source.subscribe(function (x) {
	            var key = tryCatch(keySelector)(x);
	            if (key === errorObj) {
	              map.forEach(handleError(key.e));
	              return o.onError(key.e);
	            }

	            var fireNewMapEntry = false, writer = map.get(key);
	            if (writer === undefined) {
	              writer = new Subject();
	              map.set(key, writer);
	              fireNewMapEntry = true;
	            }

	            if (fireNewMapEntry) {
	              var group = new GroupedObservable(key, writer, refCountDisposable),
	                durationGroup = new GroupedObservable(key, writer);
	              var duration = tryCatch(durationSelector)(durationGroup);
	              if (duration === errorObj) {
	                map.forEach(handleError(duration.e));
	                return o.onError(duration.e);
	              }

	              o.onNext(group);

	              var md = new SingleAssignmentDisposable();
	              groupDisposable.add(md);

	              md.setDisposable(duration.take(1).subscribe(
	                noop,
	                function (e) {
	                  map.forEach(handleError(e));
	                  o.onError(e);
	                },
	                function () {
	                  if (map['delete'](key)) { writer.onCompleted(); }
	                  groupDisposable.remove(md);
	                }));
	            }

	            var element = x;
	            if (isFunction(elementSelector)) {
	              element = tryCatch(elementSelector)(x);
	              if (element === errorObj) {
	                map.forEach(handleError(element.e));
	                return o.onError(element.e);
	              }
	            }

	            writer.onNext(element);
	        }, function (e) {
	          map.forEach(handleError(e));
	          o.onError(e);
	        }, function () {
	          map.forEach(function (item) { item.onCompleted(); });
	          o.onCompleted();
	        }));

	      return refCountDisposable;
	    }, source);
	  };

	  var MapObservable = (function (__super__) {
	    inherits(MapObservable, __super__);

	    function MapObservable(source, selector, thisArg) {
	      this.source = source;
	      this.selector = bindCallback(selector, thisArg, 3);
	      __super__.call(this);
	    }

	    function innerMap(selector, self) {
	      return function (x, i, o) { return selector.call(this, self.selector(x, i, o), i, o); }
	    }

	    MapObservable.prototype.internalMap = function (selector, thisArg) {
	      return new MapObservable(this.source, innerMap(selector, this), thisArg);
	    };

	    MapObservable.prototype.subscribeCore = function (o) {
	      return this.source.subscribe(new InnerObserver(o, this.selector, this));
	    };

	    function InnerObserver(o, selector, source) {
	      this.o = o;
	      this.selector = selector;
	      this.source = source;
	      this.i = 0;
	      this.isStopped = false;
	    }

	    InnerObserver.prototype.onNext = function(x) {
	      if (this.isStopped) { return; }
	      var result = tryCatch(this.selector)(x, this.i++, this.source);
	      if (result === errorObj) { return this.o.onError(result.e); }
	      this.o.onNext(result);
	    };
	    InnerObserver.prototype.onError = function (e) {
	      if(!this.isStopped) { this.isStopped = true; this.o.onError(e); }
	    };
	    InnerObserver.prototype.onCompleted = function () {
	      if(!this.isStopped) { this.isStopped = true; this.o.onCompleted(); }
	    };
	    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
	    InnerObserver.prototype.fail = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	        return true;
	      }

	      return false;
	    };

	    return MapObservable;

	  }(ObservableBase));

	  /**
	  * Projects each element of an observable sequence into a new form by incorporating the element's index.
	  * @param {Function} selector A transform function to apply to each source element; the second parameter of the function represents the index of the source element.
	  * @param {Any} [thisArg] Object to use as this when executing callback.
	  * @returns {Observable} An observable sequence whose elements are the result of invoking the transform function on each element of source.
	  */
	  observableProto.map = observableProto.select = function (selector, thisArg) {
	    var selectorFn = typeof selector === 'function' ? selector : function () { return selector; };
	    return this instanceof MapObservable ?
	      this.internalMap(selectorFn, thisArg) :
	      new MapObservable(this, selectorFn, thisArg);
	  };

	  function plucker(args, len) {
	    return function mapper(x) {
	      var currentProp = x;
	      for (var i = 0; i < len; i++) {
	        var p = currentProp[args[i]];
	        if (typeof p !== 'undefined') {
	          currentProp = p;
	        } else {
	          return undefined;
	        }
	      }
	      return currentProp;
	    }
	  }

	  /**
	   * Retrieves the value of a specified nested property from all elements in
	   * the Observable sequence.
	   * @param {Arguments} arguments The nested properties to pluck.
	   * @returns {Observable} Returns a new Observable sequence of property values.
	   */
	  observableProto.pluck = function () {
	    var len = arguments.length, args = new Array(len);
	    if (len === 0) { throw new Error('List of properties cannot be empty.'); }
	    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    return this.map(plucker(args, len));
	  };

	observableProto.flatMap = observableProto.selectMany = function(selector, resultSelector, thisArg) {
	    return new FlatMapObservable(this, selector, resultSelector, thisArg).mergeAll();
	};


	//
	//Rx.Observable.prototype.flatMapWithMaxConcurrent = function(limit, selector, resultSelector, thisArg) {
	//    return new FlatMapObservable(this, selector, resultSelector, thisArg).merge(limit);
	//};
	//

	  /**
	   * Projects each notification of an observable sequence to an observable sequence and merges the resulting observable sequences into one observable sequence.
	   * @param {Function} onNext A transform function to apply to each element; the second parameter of the function represents the index of the source element.
	   * @param {Function} onError A transform function to apply when an error occurs in the source sequence.
	   * @param {Function} onCompleted A transform function to apply when the end of the source sequence is reached.
	   * @param {Any} [thisArg] An optional "this" to use to invoke each transform.
	   * @returns {Observable} An observable sequence whose elements are the result of invoking the one-to-many transform function corresponding to each notification in the input sequence.
	   */
	  observableProto.flatMapObserver = observableProto.selectManyObserver = function (onNext, onError, onCompleted, thisArg) {
	    var source = this;
	    return new AnonymousObservable(function (observer) {
	      var index = 0;

	      return source.subscribe(
	        function (x) {
	          var result;
	          try {
	            result = onNext.call(thisArg, x, index++);
	          } catch (e) {
	            observer.onError(e);
	            return;
	          }
	          isPromise(result) && (result = observableFromPromise(result));
	          observer.onNext(result);
	        },
	        function (err) {
	          var result;
	          try {
	            result = onError.call(thisArg, err);
	          } catch (e) {
	            observer.onError(e);
	            return;
	          }
	          isPromise(result) && (result = observableFromPromise(result));
	          observer.onNext(result);
	          observer.onCompleted();
	        },
	        function () {
	          var result;
	          try {
	            result = onCompleted.call(thisArg);
	          } catch (e) {
	            observer.onError(e);
	            return;
	          }
	          isPromise(result) && (result = observableFromPromise(result));
	          observer.onNext(result);
	          observer.onCompleted();
	        });
	    }, source).mergeAll();
	  };

	Rx.Observable.prototype.flatMapLatest = function(selector, resultSelector, thisArg) {
	    return new FlatMapObservable(this, selector, resultSelector, thisArg).switchLatest();
	};
	  var SkipObservable = (function(__super__) {
	    inherits(SkipObservable, __super__);
	    function SkipObservable(source, count) {
	      this.source = source;
	      this.skipCount = count;
	      __super__.call(this);
	    }
	    
	    SkipObservable.prototype.subscribeCore = function (o) {
	      return this.source.subscribe(new InnerObserver(o, this.skipCount));
	    };
	    
	    function InnerObserver(o, c) {
	      this.c = c;
	      this.r = c;
	      this.o = o;
	      this.isStopped = false;
	    }
	    InnerObserver.prototype.onNext = function (x) {
	      if (this.isStopped) { return; }
	      if (this.r <= 0) { 
	        this.o.onNext(x);
	      } else {
	        this.r--;
	      }
	    };
	    InnerObserver.prototype.onError = function(e) {
	      if (!this.isStopped) { this.isStopped = true; this.o.onError(e); }
	    };
	    InnerObserver.prototype.onCompleted = function() {
	      if (!this.isStopped) { this.isStopped = true; this.o.onCompleted(); }
	    };
	    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
	    InnerObserver.prototype.fail = function(e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	        return true;
	      }
	      return false;
	    };
	    
	    return SkipObservable;
	  }(ObservableBase));  
	  
	  /**
	   * Bypasses a specified number of elements in an observable sequence and then returns the remaining elements.
	   * @param {Number} count The number of elements to skip before returning the remaining elements.
	   * @returns {Observable} An observable sequence that contains the elements that occur after the specified index in the input sequence.
	   */
	  observableProto.skip = function (count) {
	    if (count < 0) { throw new ArgumentOutOfRangeError(); }
	    return new SkipObservable(this, count);
	  };
	  /**
	   *  Bypasses elements in an observable sequence as long as a specified condition is true and then returns the remaining elements.
	   *  The element's index is used in the logic of the predicate function.
	   *
	   *  var res = source.skipWhile(function (value) { return value < 10; });
	   *  var res = source.skipWhile(function (value, index) { return value < 10 || index < 10; });
	   * @param {Function} predicate A function to test each element for a condition; the second parameter of the function represents the index of the source element.
	   * @param {Any} [thisArg] Object to use as this when executing callback.
	   * @returns {Observable} An observable sequence that contains the elements from the input sequence starting at the first element in the linear series that does not pass the test specified by predicate.
	   */
	  observableProto.skipWhile = function (predicate, thisArg) {
	    var source = this,
	        callback = bindCallback(predicate, thisArg, 3);
	    return new AnonymousObservable(function (o) {
	      var i = 0, running = false;
	      return source.subscribe(function (x) {
	        if (!running) {
	          try {
	            running = !callback(x, i++, source);
	          } catch (e) {
	            o.onError(e);
	            return;
	          }
	        }
	        running && o.onNext(x);
	      }, function (e) { o.onError(e); }, function () { o.onCompleted(); });
	    }, source);
	  };

	  /**
	   *  Returns a specified number of contiguous elements from the start of an observable sequence, using the specified scheduler for the edge case of take(0).
	   *
	   *  var res = source.take(5);
	   *  var res = source.take(0, Rx.Scheduler.timeout);
	   * @param {Number} count The number of elements to return.
	   * @param {Scheduler} [scheduler] Scheduler used to produce an OnCompleted message in case <paramref name="count count</paramref> is set to 0.
	   * @returns {Observable} An observable sequence that contains the specified number of elements from the start of the input sequence.
	   */
	  observableProto.take = function (count, scheduler) {
	    if (count < 0) { throw new ArgumentOutOfRangeError(); }
	    if (count === 0) { return observableEmpty(scheduler); }
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var remaining = count;
	      return source.subscribe(function (x) {
	        if (remaining-- > 0) {
	          o.onNext(x);
	          remaining <= 0 && o.onCompleted();
	        }
	      }, function (e) { o.onError(e); }, function () { o.onCompleted(); });
	    }, source);
	  };

	  /**
	   *  Returns elements from an observable sequence as long as a specified condition is true.
	   *  The element's index is used in the logic of the predicate function.
	   * @param {Function} predicate A function to test each element for a condition; the second parameter of the function represents the index of the source element.
	   * @param {Any} [thisArg] Object to use as this when executing callback.
	   * @returns {Observable} An observable sequence that contains the elements from the input sequence that occur before the element at which the test no longer passes.
	   */
	  observableProto.takeWhile = function (predicate, thisArg) {
	    var source = this,
	        callback = bindCallback(predicate, thisArg, 3);
	    return new AnonymousObservable(function (o) {
	      var i = 0, running = true;
	      return source.subscribe(function (x) {
	        if (running) {
	          try {
	            running = callback(x, i++, source);
	          } catch (e) {
	            o.onError(e);
	            return;
	          }
	          if (running) {
	            o.onNext(x);
	          } else {
	            o.onCompleted();
	          }
	        }
	      }, function (e) { o.onError(e); }, function () { o.onCompleted(); });
	    }, source);
	  };

	  var FilterObservable = (function (__super__) {
	    inherits(FilterObservable, __super__);

	    function FilterObservable(source, predicate, thisArg) {
	      this.source = source;
	      this.predicate = bindCallback(predicate, thisArg, 3);
	      __super__.call(this);
	    }

	    FilterObservable.prototype.subscribeCore = function (o) {
	      return this.source.subscribe(new InnerObserver(o, this.predicate, this));
	    };
	    
	    function innerPredicate(predicate, self) {
	      return function(x, i, o) { return self.predicate(x, i, o) && predicate.call(this, x, i, o); }
	    }

	    FilterObservable.prototype.internalFilter = function(predicate, thisArg) {
	      return new FilterObservable(this.source, innerPredicate(predicate, this), thisArg);
	    };
	    
	    function InnerObserver(o, predicate, source) {
	      this.o = o;
	      this.predicate = predicate;
	      this.source = source;
	      this.i = 0;
	      this.isStopped = false;
	    }
	  
	    InnerObserver.prototype.onNext = function(x) {
	      if (this.isStopped) { return; }
	      var shouldYield = tryCatch(this.predicate)(x, this.i++, this.source);
	      if (shouldYield === errorObj) {
	        return this.o.onError(shouldYield.e);
	      }
	      shouldYield && this.o.onNext(x);
	    };
	    InnerObserver.prototype.onError = function (e) {
	      if(!this.isStopped) { this.isStopped = true; this.o.onError(e); }
	    };
	    InnerObserver.prototype.onCompleted = function () {
	      if(!this.isStopped) { this.isStopped = true; this.o.onCompleted(); }
	    };
	    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
	    InnerObserver.prototype.fail = function (e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	        return true;
	      }
	      return false;
	    };

	    return FilterObservable;

	  }(ObservableBase));

	  /**
	  *  Filters the elements of an observable sequence based on a predicate by incorporating the element's index.
	  * @param {Function} predicate A function to test each source element for a condition; the second parameter of the function represents the index of the source element.
	  * @param {Any} [thisArg] Object to use as this when executing callback.
	  * @returns {Observable} An observable sequence that contains elements from the input sequence that satisfy the condition.
	  */
	  observableProto.filter = observableProto.where = function (predicate, thisArg) {
	    return this instanceof FilterObservable ? this.internalFilter(predicate, thisArg) :
	      new FilterObservable(this, predicate, thisArg);
	  };

	  function extremaBy(source, keySelector, comparer) {
	    return new AnonymousObservable(function (o) {
	      var hasValue = false, lastKey = null, list = [];
	      return source.subscribe(function (x) {
	        var comparison, key;
	        try {
	          key = keySelector(x);
	        } catch (ex) {
	          o.onError(ex);
	          return;
	        }
	        comparison = 0;
	        if (!hasValue) {
	          hasValue = true;
	          lastKey = key;
	        } else {
	          try {
	            comparison = comparer(key, lastKey);
	          } catch (ex1) {
	            o.onError(ex1);
	            return;
	          }
	        }
	        if (comparison > 0) {
	          lastKey = key;
	          list = [];
	        }
	        if (comparison >= 0) { list.push(x); }
	      }, function (e) { o.onError(e); }, function () {
	        o.onNext(list);
	        o.onCompleted();
	      });
	    }, source);
	  }

	  function firstOnly(x) {
	    if (x.length === 0) { throw new EmptyError(); }
	    return x[0];
	  }

	  var ReduceObservable = (function(__super__) {
	    inherits(ReduceObservable, __super__);
	    function ReduceObservable(source, acc, hasSeed, seed) {
	      this.source = source;
	      this.acc = acc;
	      this.hasSeed = hasSeed;
	      this.seed = seed;
	      __super__.call(this);
	    }

	    ReduceObservable.prototype.subscribeCore = function(observer) {
	      return this.source.subscribe(new InnerObserver(observer,this));
	    };

	    function InnerObserver(o, parent) {
	      this.o = o;
	      this.acc = parent.acc;
	      this.hasSeed = parent.hasSeed;
	      this.seed = parent.seed;
	      this.hasAccumulation = false;
	      this.result = null;
	      this.hasValue = false;
	      this.isStopped = false;
	    }
	    InnerObserver.prototype.onNext = function (x) {
	      if (this.isStopped) { return; }
	      !this.hasValue && (this.hasValue = true);
	      if (this.hasAccumulation) {
	        this.result = tryCatch(this.acc)(this.result, x);
	      } else {
	        this.result = this.hasSeed ? tryCatch(this.acc)(this.seed, x) : x;
	        this.hasAccumulation = true;
	      }
	      if (this.result === errorObj) { this.o.onError(this.result.e); }
	    };
	    InnerObserver.prototype.onError = function (e) { 
	      if (!this.isStopped) { this.isStopped = true; this.o.onError(e); } 
	    };
	    InnerObserver.prototype.onCompleted = function () {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.hasValue && this.o.onNext(this.result);
	        !this.hasValue && this.hasSeed && this.o.onNext(this.seed);
	        !this.hasValue && !this.hasSeed && this.o.onError(new EmptyError());
	        this.o.onCompleted();
	      }
	    };
	    InnerObserver.prototype.dispose = function () { this.isStopped = true; };
	    InnerObserver.prototype.fail = function(e) {
	      if (!this.isStopped) {
	        this.isStopped = true;
	        this.o.onError(e);
	        return true;
	      }
	      return false;
	    };

	    return ReduceObservable;
	  }(ObservableBase));

	  /**
	  * Applies an accumulator function over an observable sequence, returning the result of the aggregation as a single element in the result sequence. The specified seed value is used as the initial accumulator value.
	  * For aggregation behavior with incremental intermediate results, see Observable.scan.
	  * @param {Function} accumulator An accumulator function to be invoked on each element.
	  * @param {Any} [seed] The initial accumulator value.
	  * @returns {Observable} An observable sequence containing a single element with the final accumulator value.
	  */
	  observableProto.reduce = function (accumulator) {
	    var hasSeed = false;
	    if (arguments.length === 2) {
	      hasSeed = true;
	      var seed = arguments[1];
	    }
	    return new ReduceObservable(this, accumulator, hasSeed, seed);
	  };

	  var SomeObserver = (function (__super__) {
	    inherits(SomeObserver, __super__);

	    function SomeObserver(o, fn, s) {
	      this._o = o;
	      this._fn = fn;
	      this._s = s;
	      this._i = 0;
	      __super__.call(this);
	    }

	    SomeObserver.prototype.next = function (x) {
	      var result = tryCatch(this._fn)(x, this._i++, this._s);
	      if (result === errorObj) { return this._o.onError(result.e); }
	      if (Boolean(result)) {
	        this._o.onNext(true);
	        this._o.onCompleted();
	      }
	    };
	    SomeObserver.prototype.error = function (e) { this._o.onError(e); };
	    SomeObserver.prototype.completed = function () {
	      this._o.onNext(false);
	      this._o.onCompleted();
	    };

	    return SomeObserver;
	  }(AbstractObserver));

	  /**
	   * Determines whether any element of an observable sequence satisfies a condition if present, else if any items are in the sequence.
	   * @param {Function} [predicate] A function to test each element for a condition.
	   * @returns {Observable} An observable sequence containing a single element determining whether any elements in the source sequence pass the test in the specified predicate if given, else if any items are in the sequence.
	   */
	  observableProto.some = function (predicate, thisArg) {
	    var source = this, fn = bindCallback(predicate, thisArg, 3);
	    return new AnonymousObservable(function (o) {
	      return source.subscribe(new SomeObserver(o, fn, source));
	    });
	  };

	  var IsEmptyObserver = (function(__super__) {
	    inherits(IsEmptyObserver, __super__);
	    function IsEmptyObserver(o) {
	      this._o = o;
	      __super__.call(this);
	    }

	    IsEmptyObserver.prototype.next = function () {
	      this._o.onNext(false);
	      this._o.onCompleted();
	    };
	    IsEmptyObserver.prototype.error = function (e) { this._o.onError(e); };
	    IsEmptyObserver.prototype.completed = function () {
	      this._o.onNext(true);
	      this._o.onCompleted();
	    };

	    return IsEmptyObserver;
	  }(AbstractObserver));

	  /**
	   * Determines whether an observable sequence is empty.
	   * @returns {Observable} An observable sequence containing a single element determining whether the source sequence is empty.
	   */
	  observableProto.isEmpty = function () {
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      return source.subscribe(new IsEmptyObserver(o));
	    }, source);
	  };

	  var EveryObserver = (function (__super__) {
	    inherits(EveryObserver, __super__);

	    function EveryObserver(o, fn, s) {
	      this._o = o;
	      this._fn = fn;
	      this._s = s;
	      this._i = 0;
	      __super__.call(this);
	    }

	    EveryObserver.prototype.next = function (x) {
	      var result = tryCatch(this._fn)(x, this._i++, this._s);
	      if (result === errorObj) { return this._o.onError(result.e); }
	      if (!Boolean(result)) {
	        this._o.onNext(false);
	        this._o.onCompleted();
	      }
	    };
	    EveryObserver.prototype.error = function (e) { this._o.onError(e); };
	    EveryObserver.prototype.completed = function () {
	      this._o.onNext(true);
	      this._o.onCompleted();
	    };

	    return EveryObserver;
	  }(AbstractObserver));

	  /**
	   * Determines whether all elements of an observable sequence satisfy a condition.
	   * @param {Function} [predicate] A function to test each element for a condition.
	   * @param {Any} [thisArg] Object to use as this when executing callback.
	   * @returns {Observable} An observable sequence containing a single element determining whether all elements in the source sequence pass the test in the specified predicate.
	   */
	  observableProto.every = function (predicate, thisArg) {
	    var source = this, fn = bindCallback(predicate, thisArg, 3);
	    return new AnonymousObservable(function (o) {
	      return source.subscribe(new EveryObserver(o, fn, source));
	    }, this);
	  };

	  /**
	   * Determines whether an observable sequence includes a specified element with an optional equality comparer.
	   * @param searchElement The value to locate in the source sequence.
	   * @param {Number} [fromIndex] An equality comparer to compare elements.
	   * @returns {Observable} An observable sequence containing a single element determining whether the source sequence includes an element that has the specified value from the given index.
	   */
	  observableProto.includes = function (searchElement, fromIndex) {
	    var source = this;
	    function comparer(a, b) {
	      return (a === 0 && b === 0) || (a === b || (isNaN(a) && isNaN(b)));
	    }
	    return new AnonymousObservable(function (o) {
	      var i = 0, n = +fromIndex || 0;
	      Math.abs(n) === Infinity && (n = 0);
	      if (n < 0) {
	        o.onNext(false);
	        o.onCompleted();
	        return disposableEmpty;
	      }
	      return source.subscribe(
	        function (x) {
	          if (i++ >= n && comparer(x, searchElement)) {
	            o.onNext(true);
	            o.onCompleted();
	          }
	        },
	        function (e) { o.onError(e); },
	        function () {
	          o.onNext(false);
	          o.onCompleted();
	        });
	    }, this);
	  };

	  /**
	   * @deprecated use #includes instead.
	   */
	  observableProto.contains = function (searchElement, fromIndex) {
	    //deprecate('contains', 'includes');
	    observableProto.includes(searchElement, fromIndex);
	  };

	  /**
	   * Returns an observable sequence containing a value that represents how many elements in the specified observable sequence satisfy a condition if provided, else the count of items.
	   * @example
	   * res = source.count();
	   * res = source.count(function (x) { return x > 3; });
	   * @param {Function} [predicate]A function to test each element for a condition.
	   * @param {Any} [thisArg] Object to use as this when executing callback.
	   * @returns {Observable} An observable sequence containing a single element with a number that represents how many elements in the input sequence satisfy the condition in the predicate function if provided, else the count of items in the sequence.
	   */
	  observableProto.count = function (predicate, thisArg) {
	    return predicate ?
	      this.filter(predicate, thisArg).count() :
	      this.reduce(function (count) { return count + 1; }, 0);
	  };

	  /**
	   * Returns the first index at which a given element can be found in the observable sequence, or -1 if it is not present.
	   * @param {Any} searchElement Element to locate in the array.
	   * @param {Number} [fromIndex] The index to start the search.  If not specified, defaults to 0.
	   * @returns {Observable} And observable sequence containing the first index at which a given element can be found in the observable sequence, or -1 if it is not present.
	   */
	  observableProto.indexOf = function(searchElement, fromIndex) {
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var i = 0, n = +fromIndex || 0;
	      Math.abs(n) === Infinity && (n = 0);
	      if (n < 0) {
	        o.onNext(-1);
	        o.onCompleted();
	        return disposableEmpty;
	      }
	      return source.subscribe(
	        function (x) {
	          if (i >= n && x === searchElement) {
	            o.onNext(i);
	            o.onCompleted();
	          }
	          i++;
	        },
	        function (e) { o.onError(e); },
	        function () {
	          o.onNext(-1);
	          o.onCompleted();
	        });
	    }, source);
	  };

	  /**
	   * Computes the sum of a sequence of values that are obtained by invoking an optional transform function on each element of the input sequence, else if not specified computes the sum on each item in the sequence.
	   * @param {Function} [selector] A transform function to apply to each element.
	   * @param {Any} [thisArg] Object to use as this when executing callback.
	   * @returns {Observable} An observable sequence containing a single element with the sum of the values in the source sequence.
	   */
	  observableProto.sum = function (keySelector, thisArg) {
	    return keySelector && isFunction(keySelector) ?
	      this.map(keySelector, thisArg).sum() :
	      this.reduce(function (prev, curr) { return prev + curr; }, 0);
	  };

	  /**
	   * Returns the elements in an observable sequence with the minimum key value according to the specified comparer.
	   * @example
	   * var res = source.minBy(function (x) { return x.value; });
	   * var res = source.minBy(function (x) { return x.value; }, function (x, y) { return x - y; });
	   * @param {Function} keySelector Key selector function.
	   * @param {Function} [comparer] Comparer used to compare key values.
	   * @returns {Observable} An observable sequence containing a list of zero or more elements that have a minimum key value.
	   */
	  observableProto.minBy = function (keySelector, comparer) {
	    comparer || (comparer = defaultSubComparer);
	    return extremaBy(this, keySelector, function (x, y) { return comparer(x, y) * -1; });
	  };

	  /**
	   * Returns the minimum element in an observable sequence according to the optional comparer else a default greater than less than check.
	   * @example
	   * var res = source.min();
	   * var res = source.min(function (x, y) { return x.value - y.value; });
	   * @param {Function} [comparer] Comparer used to compare elements.
	   * @returns {Observable} An observable sequence containing a single element with the minimum element in the source sequence.
	   */
	  observableProto.min = function (comparer) {
	    return this.minBy(identity, comparer).map(function (x) { return firstOnly(x); });
	  };

	  /**
	   * Returns the elements in an observable sequence with the maximum  key value according to the specified comparer.
	   * @example
	   * var res = source.maxBy(function (x) { return x.value; });
	   * var res = source.maxBy(function (x) { return x.value; }, function (x, y) { return x - y;; });
	   * @param {Function} keySelector Key selector function.
	   * @param {Function} [comparer]  Comparer used to compare key values.
	   * @returns {Observable} An observable sequence containing a list of zero or more elements that have a maximum key value.
	   */
	  observableProto.maxBy = function (keySelector, comparer) {
	    comparer || (comparer = defaultSubComparer);
	    return extremaBy(this, keySelector, comparer);
	  };

	  /**
	   * Returns the maximum value in an observable sequence according to the specified comparer.
	   * @example
	   * var res = source.max();
	   * var res = source.max(function (x, y) { return x.value - y.value; });
	   * @param {Function} [comparer] Comparer used to compare elements.
	   * @returns {Observable} An observable sequence containing a single element with the maximum element in the source sequence.
	   */
	  observableProto.max = function (comparer) {
	    return this.maxBy(identity, comparer).map(function (x) { return firstOnly(x); });
	  };

	  var AverageObserver = (function(__super__) {
	    inherits(AverageObserver, __super__);
	    function AverageObserver(o, fn, s) {
	      this._o = o;
	      this._fn = fn;
	      this._s = s;
	      this._c = 0;
	      this._t = 0;
	      __super__.call(this);
	    }

	    AverageObserver.prototype.next = function (x) {
	      if(this._fn) {
	        var r = tryCatch(this._fn)(x, this._c++, this._s);
	        if (r === errorObj) { return this._o.onError(r.e); }
	        this._t += r;
	      } else {
	        this._c++;
	        this._t += x;
	      }
	    };
	    AverageObserver.prototype.error = function (e) { this._o.onError(e); };
	    AverageObserver.prototype.completed = function () {
	      if (this._c === 0) { return this._o.onError(new EmptyError()); }
	      this._o.onNext(this._t / this._c);
	      this._o.onCompleted();
	    };

	    return AverageObserver;
	  }(AbstractObserver));

	  /**
	   * Computes the average of an observable sequence of values that are in the sequence or obtained by invoking a transform function on each element of the input sequence if present.
	   * @param {Function} [selector] A transform function to apply to each element.
	   * @param {Any} [thisArg] Object to use as this when executing callback.
	   * @returns {Observable} An observable sequence containing a single element with the average of the sequence of values.
	   */
	  observableProto.average = function (keySelector, thisArg) {
	    var source = this, fn;
	    if (isFunction(keySelector)) {
	      fn = bindCallback(keySelector, thisArg, 3);
	    }
	    return new AnonymousObservable(function (o) {
	      return source.subscribe(new AverageObserver(o, fn, source));
	    }, source);
	  };

	  /**
	   *  Determines whether two sequences are equal by comparing the elements pairwise using a specified equality comparer.
	   *
	   * @example
	   * var res = res = source.sequenceEqual([1,2,3]);
	   * var res = res = source.sequenceEqual([{ value: 42 }], function (x, y) { return x.value === y.value; });
	   * 3 - res = source.sequenceEqual(Rx.Observable.returnValue(42));
	   * 4 - res = source.sequenceEqual(Rx.Observable.returnValue({ value: 42 }), function (x, y) { return x.value === y.value; });
	   * @param {Observable} second Second observable sequence or array to compare.
	   * @param {Function} [comparer] Comparer used to compare elements of both sequences.
	   * @returns {Observable} An observable sequence that contains a single element which indicates whether both sequences are of equal length and their corresponding elements are equal according to the specified equality comparer.
	   */
	  observableProto.sequenceEqual = function (second, comparer) {
	    var first = this;
	    comparer || (comparer = defaultComparer);
	    return new AnonymousObservable(function (o) {
	      var donel = false, doner = false, ql = [], qr = [];
	      var subscription1 = first.subscribe(function (x) {
	        var equal, v;
	        if (qr.length > 0) {
	          v = qr.shift();
	          try {
	            equal = comparer(v, x);
	          } catch (e) {
	            o.onError(e);
	            return;
	          }
	          if (!equal) {
	            o.onNext(false);
	            o.onCompleted();
	          }
	        } else if (doner) {
	          o.onNext(false);
	          o.onCompleted();
	        } else {
	          ql.push(x);
	        }
	      }, function(e) { o.onError(e); }, function () {
	        donel = true;
	        if (ql.length === 0) {
	          if (qr.length > 0) {
	            o.onNext(false);
	            o.onCompleted();
	          } else if (doner) {
	            o.onNext(true);
	            o.onCompleted();
	          }
	        }
	      });

	      (isArrayLike(second) || isIterable(second)) && (second = observableFrom(second));
	      isPromise(second) && (second = observableFromPromise(second));
	      var subscription2 = second.subscribe(function (x) {
	        var equal;
	        if (ql.length > 0) {
	          var v = ql.shift();
	          try {
	            equal = comparer(v, x);
	          } catch (exception) {
	            o.onError(exception);
	            return;
	          }
	          if (!equal) {
	            o.onNext(false);
	            o.onCompleted();
	          }
	        } else if (donel) {
	          o.onNext(false);
	          o.onCompleted();
	        } else {
	          qr.push(x);
	        }
	      }, function(e) { o.onError(e); }, function () {
	        doner = true;
	        if (qr.length === 0) {
	          if (ql.length > 0) {
	            o.onNext(false);
	            o.onCompleted();
	          } else if (donel) {
	            o.onNext(true);
	            o.onCompleted();
	          }
	        }
	      });
	      return new CompositeDisposable(subscription1, subscription2);
	    }, first);
	  };

	  /**
	   * Returns the element at a specified index in a sequence or default value if not found.
	   * @param {Number} index The zero-based index of the element to retrieve.
	   * @param {Any} [defaultValue] The default value to use if elementAt does not find a value.
	   * @returns {Observable} An observable sequence that produces the element at the specified position in the source sequence.
	   */
	  observableProto.elementAt =  function (index, defaultValue) {
	    if (index < 0) { throw new ArgumentOutOfRangeError(); }
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var i = index;
	      return source.subscribe(
	        function (x) {
	          if (i-- === 0) {
	            o.onNext(x);
	            o.onCompleted();
	          }
	        },
	        function (e) { o.onError(e); },
	        function () {
	          if (defaultValue === undefined) {
	            o.onError(new ArgumentOutOfRangeError());
	          } else {
	            o.onNext(defaultValue);
	            o.onCompleted();
	          }
	      });
	    }, source);
	  };

	  /**
	   * Returns the only element of an observable sequence that satisfies the condition in the optional predicate, and reports an exception if there is not exactly one element in the observable sequence.
	   * @param {Function} [predicate] A predicate function to evaluate for elements in the source sequence.
	   * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
	   * @returns {Observable} Sequence containing the single element in the observable sequence that satisfies the condition in the predicate.
	   */
	  observableProto.single = function (predicate, thisArg) {
	    if (isFunction(predicate)) { return this.filter(predicate, thisArg).single(); }
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var value, seenValue = false;
	      return source.subscribe(function (x) {
	        if (seenValue) {
	          o.onError(new Error('Sequence contains more than one element'));
	        } else {
	          value = x;
	          seenValue = true;
	        }
	      }, function (e) { o.onError(e); }, function () {
	        o.onNext(value);
	        o.onCompleted();
	      });
	    }, source);
	  };

	  var FirstObserver = (function(__super__) {
	    inherits(FirstObserver, __super__);
	    function FirstObserver(o, obj, s) {
	      this._o = o;
	      this._obj = obj;
	      this._s = s;
	      this._i = 0;
	      __super__.call(this);
	    }

	    FirstObserver.prototype.next = function (x) {
	      if (this._obj.predicate) {
	        var res = tryCatch(this._obj.predicate)(x, this._i++, this._s);
	        if (res === errorObj) { return this._o.onError(res.e); }
	        if (Boolean(res)) {
	          this._o.onNext(x);
	          this._o.onCompleted();
	        }
	      } else if (!this._obj.predicate) {
	        this._o.onNext(x);
	        this._o.onCompleted();
	      }
	    };
	    FirstObserver.prototype.error = function (e) { this._o.onError(e); };
	    FirstObserver.prototype.completed = function () {
	      if (this._obj.defaultValue === undefined) {
	        this._o.onError(new EmptyError());
	      } else {
	        this._o.onNext(this._obj.defaultValue);
	        this._o.onCompleted();
	      }
	    };

	    return FirstObserver;
	  }(AbstractObserver));

	  /**
	   * Returns the first element of an observable sequence that satisfies the condition in the predicate if present else the first item in the sequence.
	   * @returns {Observable} Sequence containing the first element in the observable sequence that satisfies the condition in the predicate if provided, else the first item in the sequence.
	   */
	  observableProto.first = function () {
	    var obj = {}, source = this;
	    if (typeof arguments[0] === 'object') {
	      obj = arguments[0];
	    } else {
	      obj = {
	        predicate: arguments[0],
	        thisArg: arguments[1],
	        defaultValue: arguments[2]
	      };
	    }
	    if (isFunction (obj.predicate)) {
	      var fn = obj.predicate;
	      obj.predicate = bindCallback(fn, obj.thisArg, 3);
	    }
	    return new AnonymousObservable(function (o) {
	      return source.subscribe(new FirstObserver(o, obj, source));
	    }, source);
	  };

	  /**
	   * Returns the last element of an observable sequence that satisfies the condition in the predicate if specified, else the last element.
	   * @returns {Observable} Sequence containing the last element in the observable sequence that satisfies the condition in the predicate.
	   */
	  observableProto.last = function () {
	    var obj = {}, source = this;
	    if (typeof arguments[0] === 'object') {
	      obj = arguments[0];
	    } else {
	      obj = {
	        predicate: arguments[0],
	        thisArg: arguments[1],
	        defaultValue: arguments[2]
	      };
	    }
	    if (isFunction (obj.predicate)) {
	      var fn = obj.predicate;
	      obj.predicate = bindCallback(fn, obj.thisArg, 3);
	    }
	    return new AnonymousObservable(function (o) {
	      var value, seenValue = false, i = 0;
	      return source.subscribe(
	        function (x) {
	          if (obj.predicate) {
	            var res = tryCatch(obj.predicate)(x, i++, source);
	            if (res === errorObj) { return o.onError(res.e); }
	            if (res) {
	              seenValue = true;
	              value = x;
	            }
	          } else if (!obj.predicate) {
	            seenValue = true;
	            value = x;
	          }
	        },
	        function (e) { o.onError(e); },
	        function () {
	          if (seenValue) {
	            o.onNext(value);
	            o.onCompleted();
	          }
	          else if (obj.defaultValue === undefined) {
	            o.onError(new EmptyError());
	          } else {
	            o.onNext(obj.defaultValue);
	            o.onCompleted();
	          }
	        });
	    }, source);
	  };

	  function findValue (source, predicate, thisArg, yieldIndex) {
	    var callback = bindCallback(predicate, thisArg, 3);
	    return new AnonymousObservable(function (o) {
	      var i = 0;
	      return source.subscribe(function (x) {
	        var shouldRun;
	        try {
	          shouldRun = callback(x, i, source);
	        } catch (e) {
	          o.onError(e);
	          return;
	        }
	        if (shouldRun) {
	          o.onNext(yieldIndex ? i : x);
	          o.onCompleted();
	        } else {
	          i++;
	        }
	      }, function (e) { o.onError(e); }, function () {
	        o.onNext(yieldIndex ? -1 : undefined);
	        o.onCompleted();
	      });
	    }, source);
	  }

	  /**
	   * Searches for an element that matches the conditions defined by the specified predicate, and returns the first occurrence within the entire Observable sequence.
	   * @param {Function} predicate The predicate that defines the conditions of the element to search for.
	   * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
	   * @returns {Observable} An Observable sequence with the first element that matches the conditions defined by the specified predicate, if found; otherwise, undefined.
	   */
	  observableProto.find = function (predicate, thisArg) {
	    return findValue(this, predicate, thisArg, false);
	  };

	  /**
	   * Searches for an element that matches the conditions defined by the specified predicate, and returns
	   * an Observable sequence with the zero-based index of the first occurrence within the entire Observable sequence.
	   * @param {Function} predicate The predicate that defines the conditions of the element to search for.
	   * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
	   * @returns {Observable} An Observable sequence with the zero-based index of the first occurrence of an element that matches the conditions defined by match, if found; otherwise, –1.
	  */
	  observableProto.findIndex = function (predicate, thisArg) {
	    return findValue(this, predicate, thisArg, true);
	  };

	  /**
	   * Converts the observable sequence to a Set if it exists.
	   * @returns {Observable} An observable sequence with a single value of a Set containing the values from the observable sequence.
	   */
	  observableProto.toSet = function () {
	    if (typeof root.Set === 'undefined') { throw new TypeError(); }
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var s = new root.Set();
	      return source.subscribe(
	        function (x) { s.add(x); },
	        function (e) { o.onError(e); },
	        function () {
	          o.onNext(s);
	          o.onCompleted();
	        });
	    }, source);
	  };

	  /**
	  * Converts the observable sequence to a Map if it exists.
	  * @param {Function} keySelector A function which produces the key for the Map.
	  * @param {Function} [elementSelector] An optional function which produces the element for the Map. If not present, defaults to the value from the observable sequence.
	  * @returns {Observable} An observable sequence with a single value of a Map containing the values from the observable sequence.
	  */
	  observableProto.toMap = function (keySelector, elementSelector) {
	    if (typeof root.Map === 'undefined') { throw new TypeError(); }
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var m = new root.Map();
	      return source.subscribe(
	        function (x) {
	          var key;
	          try {
	            key = keySelector(x);
	          } catch (e) {
	            o.onError(e);
	            return;
	          }

	          var element = x;
	          if (elementSelector) {
	            try {
	              element = elementSelector(x);
	            } catch (e) {
	              o.onError(e);
	              return;
	            }
	          }

	          m.set(key, element);
	        },
	        function (e) { o.onError(e); },
	        function () {
	          o.onNext(m);
	          o.onCompleted();
	        });
	    }, source);
	  };

	  Observable.wrap = function (fn) {
	    createObservable.__generatorFunction__ = fn;
	    return createObservable;

	    function createObservable() {
	      return Observable.spawn.call(this, fn.apply(this, arguments));
	    }
	  };

	  var spawn = Observable.spawn = function () {
	    var gen = arguments[0], self = this, args = [];
	    for (var i = 1, len = arguments.length; i < len; i++) { args.push(arguments[i]); }

	    return new AnonymousObservable(function (o) {
	      var g = new CompositeDisposable();

	      if (isFunction(gen)) { gen = gen.apply(self, args); }
	      if (!gen || !isFunction(gen.next)) {
	        o.onNext(gen);
	        return o.onCompleted();
	      }

	      processGenerator();

	      function processGenerator(res) {
	        var ret = tryCatch(gen.next).call(gen, res);
	        if (ret === errorObj) { return o.onError(ret.e); }
	        next(ret);
	      }

	      function onError(err) {
	        var ret = tryCatch(gen.next).call(gen, err);
	        if (ret === errorObj) { return o.onError(ret.e); }
	        next(ret);
	      }

	      function next(ret) {
	        if (ret.done) {
	          o.onNext(ret.value);
	          o.onCompleted();
	          return;
	        }
	        var value = toObservable.call(self, ret.value);
	        if (Observable.isObservable(value)) {
	          g.add(value.subscribe(processGenerator, onError));
	        } else {
	          onError(new TypeError('type not supported'));
	        }
	      }

	      return g;
	    });
	  }

	function toObservable(obj) {
	  if (!obj) { return obj; }
	  if (Observable.isObservable(obj)) { return obj; }
	  if (isPromise(obj)) { return Observable.fromPromise(obj); }
	  if (isGeneratorFunction(obj) || isGenerator(obj)) { return spawn.call(this, obj); }
	  if (isFunction(obj)) { return thunkToObservable.call(this, obj); }
	  if (isArrayLike(obj) || isIterable(obj)) { return arrayToObservable.call(this, obj); }
	  if (isObject(obj)) {return objectToObservable.call(this, obj);}
	  return obj;
	}

	function arrayToObservable (obj) {
	  return Observable.from(obj)
	      .flatMap(toObservable)
	      .toArray();
	}

	function objectToObservable (obj) {
	  var results = new obj.constructor(), keys = Object.keys(obj), observables = [];
	  for (var i = 0, len = keys.length; i < len; i++) {
	    var key = keys[i];
	    var observable = toObservable.call(this, obj[key]);

	    if(observable && Observable.isObservable(observable)) {
	      defer(observable, key);
	    } else {
	      results[key] = obj[key];
	    }
	  }

	  return Observable.forkJoin.apply(Observable, observables).map(function() {
	    return results;
	  });


	  function defer (observable, key) {
	    results[key] = undefined;
	    observables.push(observable.map(function (next) {
	      results[key] = next;
	    }));
	  }
	}

	function thunkToObservable(fn) {
	  var self = this;
	  return new AnonymousObservable(function (o) {
	    fn.call(self, function () {
	      var err = arguments[0], res = arguments[1];
	      if (err) { return o.onError(err); }
	      if (arguments.length > 2) {
	        var args = [];
	        for (var i = 1, len = arguments.length; i < len; i++) { args.push(arguments[i]); }
	        res = args;
	      }
	      o.onNext(res);
	      o.onCompleted();
	    });
	  });
	}

	function isGenerator(obj) {
	  return isFunction (obj.next) && isFunction (obj.throw);
	}

	function isGeneratorFunction(obj) {
	  var ctor = obj.constructor;
	  if (!ctor) { return false; }
	  if (ctor.name === 'GeneratorFunction' || ctor.displayName === 'GeneratorFunction') { return true; }
	  return isGenerator(ctor.prototype);
	}

	  /**
	   * Invokes the specified function asynchronously on the specified scheduler, surfacing the result through an observable sequence.
	   *
	   * @example
	   * var res = Rx.Observable.start(function () { console.log('hello'); });
	   * var res = Rx.Observable.start(function () { console.log('hello'); }, Rx.Scheduler.timeout);
	   * var res = Rx.Observable.start(function () { this.log('hello'); }, Rx.Scheduler.timeout, console);
	   *
	   * @param {Function} func Function to run asynchronously.
	   * @param {Scheduler} [scheduler]  Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
	   * @param [context]  The context for the func parameter to be executed.  If not specified, defaults to undefined.
	   * @returns {Observable} An observable sequence exposing the function's result value, or an exception.
	   *
	   * Remarks
	   * * The function is called immediately, not during the subscription of the resulting sequence.
	   * * Multiple subscriptions to the resulting sequence can observe the function's result.
	   */
	  Observable.start = function (func, context, scheduler) {
	    return observableToAsync(func, context, scheduler)();
	  };

	  /**
	   * Converts the function into an asynchronous function. Each invocation of the resulting asynchronous function causes an invocation of the original synchronous function on the specified scheduler.
	   * @param {Function} function Function to convert to an asynchronous function.
	   * @param {Scheduler} [scheduler] Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
	   * @param {Mixed} [context] The context for the func parameter to be executed.  If not specified, defaults to undefined.
	   * @returns {Function} Asynchronous function.
	   */
	  var observableToAsync = Observable.toAsync = function (func, context, scheduler) {
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return function () {
	      var args = arguments,
	        subject = new AsyncSubject();

	      scheduler.schedule(function () {
	        var result;
	        try {
	          result = func.apply(context, args);
	        } catch (e) {
	          subject.onError(e);
	          return;
	        }
	        subject.onNext(result);
	        subject.onCompleted();
	      });
	      return subject.asObservable();
	    };
	  };

	function createCbObservable(fn, ctx, selector, args) {
	  var o = new AsyncSubject();

	  args.push(createCbHandler(o, ctx, selector));
	  fn.apply(ctx, args);

	  return o.asObservable();
	}

	function createCbHandler(o, ctx, selector) {
	  return function handler () {
	    var len = arguments.length, results = new Array(len);
	    for(var i = 0; i < len; i++) { results[i] = arguments[i]; }

	    if (isFunction(selector)) {
	      results = tryCatch(selector).apply(ctx, results);
	      if (results === errorObj) { return o.onError(results.e); }
	      o.onNext(results);
	    } else {
	      if (results.length <= 1) {
	        o.onNext(results[0]);
	      } else {
	        o.onNext(results);
	      }
	    }

	    o.onCompleted();
	  };
	}

	/**
	 * Converts a callback function to an observable sequence.
	 *
	 * @param {Function} fn Function with a callback as the last parameter to convert to an Observable sequence.
	 * @param {Mixed} [ctx] The context for the func parameter to be executed.  If not specified, defaults to undefined.
	 * @param {Function} [selector] A selector which takes the arguments from the callback to produce a single item to yield on next.
	 * @returns {Function} A function, when executed with the required parameters minus the callback, produces an Observable sequence with a single value of the arguments to the callback as an array.
	 */
	Observable.fromCallback = function (fn, ctx, selector) {
	  return function () {
	    typeof ctx === 'undefined' && (ctx = this); 

	    var len = arguments.length, args = new Array(len)
	    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    return createCbObservable(fn, ctx, selector, args);
	  };
	};

	function createNodeObservable(fn, ctx, selector, args) {
	  var o = new AsyncSubject();

	  args.push(createNodeHandler(o, ctx, selector));
	  fn.apply(ctx, args);

	  return o.asObservable();
	}

	function createNodeHandler(o, ctx, selector) {
	  return function handler () {
	    var err = arguments[0];
	    if (err) { return o.onError(err); }

	    var len = arguments.length, results = [];
	    for(var i = 1; i < len; i++) { results[i - 1] = arguments[i]; }

	    if (isFunction(selector)) {
	      var results = tryCatch(selector).apply(ctx, results);
	      if (results === errorObj) { return o.onError(results.e); }
	      o.onNext(results);
	    } else {
	      if (results.length <= 1) {
	        o.onNext(results[0]);
	      } else {
	        o.onNext(results);
	      }
	    }

	    o.onCompleted();
	  };
	}

	/**
	 * Converts a Node.js callback style function to an observable sequence.  This must be in function (err, ...) format.
	 * @param {Function} fn The function to call
	 * @param {Mixed} [ctx] The context for the func parameter to be executed.  If not specified, defaults to undefined.
	 * @param {Function} [selector] A selector which takes the arguments from the callback minus the error to produce a single item to yield on next.
	 * @returns {Function} An async function which when applied, returns an observable sequence with the callback arguments as an array.
	 */
	Observable.fromNodeCallback = function (fn, ctx, selector) {
	  return function () {
	    typeof ctx === 'undefined' && (ctx = this); 
	    var len = arguments.length, args = new Array(len);
	    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
	    return createNodeObservable(fn, ctx, selector, args);
	  };
	};

	  function ListenDisposable(e, n, fn) {
	    this._e = e;
	    this._n = n;
	    this._fn = fn;
	    this._e.addEventListener(this._n, this._fn, false);
	    this.isDisposed = false;
	  }
	  ListenDisposable.prototype.dispose = function () {
	    if (!this.isDisposed) {
	      this._e.removeEventListener(this._n, this._fn, false);
	      this.isDisposed = true;
	    }
	  };

	  function createEventListener (el, eventName, handler) {
	    var disposables = new CompositeDisposable();

	    // Asume NodeList or HTMLCollection
	    var elemToString = Object.prototype.toString.call(el);
	    if (elemToString === '[object NodeList]' || elemToString === '[object HTMLCollection]') {
	      for (var i = 0, len = el.length; i < len; i++) {
	        disposables.add(createEventListener(el.item(i), eventName, handler));
	      }
	    } else if (el) {
	      disposables.add(new ListenDisposable(el, eventName, handler));
	    }

	    return disposables;
	  }

	  /**
	   * Configuration option to determine whether to use native events only
	   */
	  Rx.config.useNativeEvents = false;

	  function eventHandler(o, selector) {
	    return function handler () {
	      var results = arguments[0];
	      if (isFunction(selector)) {
	        results = tryCatch(selector).apply(null, arguments);
	        if (results === errorObj) { return o.onError(results.e); }
	      }
	      o.onNext(results);
	    };
	  }

	  /**
	   * Creates an observable sequence by adding an event listener to the matching DOMElement or each item in the NodeList.
	   * @param {Object} element The DOMElement or NodeList to attach a listener.
	   * @param {String} eventName The event name to attach the observable sequence.
	   * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.
	   * @returns {Observable} An observable sequence of events from the specified element and the specified event.
	   */
	  Observable.fromEvent = function (element, eventName, selector) {
	    // Node.js specific
	    if (element.addListener) {
	      return fromEventPattern(
	        function (h) { element.addListener(eventName, h); },
	        function (h) { element.removeListener(eventName, h); },
	        selector);
	    }

	    // Use only if non-native events are allowed
	    if (!Rx.config.useNativeEvents) {
	      // Handles jq, Angular.js, Zepto, Marionette, Ember.js
	      if (typeof element.on === 'function' && typeof element.off === 'function') {
	        return fromEventPattern(
	          function (h) { element.on(eventName, h); },
	          function (h) { element.off(eventName, h); },
	          selector);
	      }
	    }

	    return new AnonymousObservable(function (o) {
	      return createEventListener(
	        element,
	        eventName,
	        eventHandler(o, selector));
	    }).publish().refCount();
	  };

	  /**
	   * Creates an observable sequence from an event emitter via an addHandler/removeHandler pair.
	   * @param {Function} addHandler The function to add a handler to the emitter.
	   * @param {Function} [removeHandler] The optional function to remove a handler from an emitter.
	   * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.
	   * @param {Scheduler} [scheduler] A scheduler used to schedule the remove handler.
	   * @returns {Observable} An observable sequence which wraps an event from an event emitter
	   */
	  var fromEventPattern = Observable.fromEventPattern = function (addHandler, removeHandler, selector, scheduler) {
	    isScheduler(scheduler) || (scheduler = immediateScheduler);
	    return new AnonymousObservable(function (o) {
	      function innerHandler () {
	        var result = arguments[0];
	        if (isFunction(selector)) {
	          result = tryCatch(selector).apply(null, arguments);
	          if (result === errorObj) { return o.onError(result.e); }
	        }
	        o.onNext(result);
	      }

	      var returnValue = addHandler(innerHandler);
	      return disposableCreate(function () {
	        isFunction(removeHandler) && removeHandler(innerHandler, returnValue);
	      });
	    }).publish().refCount();
	  };

	  /**
	   * Invokes the asynchronous function, surfacing the result through an observable sequence.
	   * @param {Function} functionAsync Asynchronous function which returns a Promise to run.
	   * @returns {Observable} An observable sequence exposing the function's result value, or an exception.
	   */
	  Observable.startAsync = function (functionAsync) {
	    var promise;
	    try {
	      promise = functionAsync();
	    } catch (e) {
	      return observableThrow(e);
	    }
	    return observableFromPromise(promise);
	  }

	  var PausableObservable = (function (__super__) {

	    inherits(PausableObservable, __super__);

	    function subscribe(observer) {
	      var conn = this.source.publish(),
	        subscription = conn.subscribe(observer),
	        connection = disposableEmpty;

	      var pausable = this.pauser.distinctUntilChanged().subscribe(function (b) {
	        if (b) {
	          connection = conn.connect();
	        } else {
	          connection.dispose();
	          connection = disposableEmpty;
	        }
	      });

	      return new CompositeDisposable(subscription, connection, pausable);
	    }

	    function PausableObservable(source, pauser) {
	      this.source = source;
	      this.controller = new Subject();

	      if (pauser && pauser.subscribe) {
	        this.pauser = this.controller.merge(pauser);
	      } else {
	        this.pauser = this.controller;
	      }

	      __super__.call(this, subscribe, source);
	    }

	    PausableObservable.prototype.pause = function () {
	      this.controller.onNext(false);
	    };

	    PausableObservable.prototype.resume = function () {
	      this.controller.onNext(true);
	    };

	    return PausableObservable;

	  }(Observable));

	  /**
	   * Pauses the underlying observable sequence based upon the observable sequence which yields true/false.
	   * @example
	   * var pauser = new Rx.Subject();
	   * var source = Rx.Observable.interval(100).pausable(pauser);
	   * @param {Observable} pauser The observable sequence used to pause the underlying sequence.
	   * @returns {Observable} The observable sequence which is paused based upon the pauser.
	   */
	  observableProto.pausable = function (pauser) {
	    return new PausableObservable(this, pauser);
	  };

	  function combineLatestSource(source, subject, resultSelector) {
	    return new AnonymousObservable(function (o) {
	      var hasValue = [false, false],
	        hasValueAll = false,
	        isDone = false,
	        values = new Array(2),
	        err;

	      function next(x, i) {
	        values[i] = x;
	        hasValue[i] = true;
	        if (hasValueAll || (hasValueAll = hasValue.every(identity))) {
	          if (err) { return o.onError(err); }
	          var res = tryCatch(resultSelector).apply(null, values);
	          if (res === errorObj) { return o.onError(res.e); }
	          o.onNext(res);
	        }
	        isDone && values[1] && o.onCompleted();
	      }

	      return new CompositeDisposable(
	        source.subscribe(
	          function (x) {
	            next(x, 0);
	          },
	          function (e) {
	            if (values[1]) {
	              o.onError(e);
	            } else {
	              err = e;
	            }
	          },
	          function () {
	            isDone = true;
	            values[1] && o.onCompleted();
	          }),
	        subject.subscribe(
	          function (x) {
	            next(x, 1);
	          },
	          function (e) { o.onError(e); },
	          function () {
	            isDone = true;
	            next(true, 1);
	          })
	        );
	    }, source);
	  }

	  var PausableBufferedObservable = (function (__super__) {

	    inherits(PausableBufferedObservable, __super__);

	    function subscribe(o) {
	      var q = [], previousShouldFire;

	      function drainQueue() { while (q.length > 0) { o.onNext(q.shift()); } }

	      var subscription =
	        combineLatestSource(
	          this.source,
	          this.pauser.startWith(false).distinctUntilChanged(),
	          function (data, shouldFire) {
	            return { data: data, shouldFire: shouldFire };
	          })
	          .subscribe(
	            function (results) {
	              if (previousShouldFire !== undefined && results.shouldFire != previousShouldFire) {
	                previousShouldFire = results.shouldFire;
	                // change in shouldFire
	                if (results.shouldFire) { drainQueue(); }
	              } else {
	                previousShouldFire = results.shouldFire;
	                // new data
	                if (results.shouldFire) {
	                  o.onNext(results.data);
	                } else {
	                  q.push(results.data);
	                }
	              }
	            },
	            function (err) {
	              drainQueue();
	              o.onError(err);
	            },
	            function () {
	              drainQueue();
	              o.onCompleted();
	            }
	          );
	      return subscription;
	    }

	    function PausableBufferedObservable(source, pauser) {
	      this.source = source;
	      this.controller = new Subject();

	      if (pauser && pauser.subscribe) {
	        this.pauser = this.controller.merge(pauser);
	      } else {
	        this.pauser = this.controller;
	      }

	      __super__.call(this, subscribe, source);
	    }

	    PausableBufferedObservable.prototype.pause = function () {
	      this.controller.onNext(false);
	    };

	    PausableBufferedObservable.prototype.resume = function () {
	      this.controller.onNext(true);
	    };

	    return PausableBufferedObservable;

	  }(Observable));

	  /**
	   * Pauses the underlying observable sequence based upon the observable sequence which yields true/false,
	   * and yields the values that were buffered while paused.
	   * @example
	   * var pauser = new Rx.Subject();
	   * var source = Rx.Observable.interval(100).pausableBuffered(pauser);
	   * @param {Observable} pauser The observable sequence used to pause the underlying sequence.
	   * @returns {Observable} The observable sequence which is paused based upon the pauser.
	   */
	  observableProto.pausableBuffered = function (subject) {
	    return new PausableBufferedObservable(this, subject);
	  };

	var ControlledObservable = (function (__super__) {

	  inherits(ControlledObservable, __super__);

	  function subscribe (observer) {
	    return this.source.subscribe(observer);
	  }

	  function ControlledObservable (source, enableQueue, scheduler) {
	    __super__.call(this, subscribe, source);
	    this.subject = new ControlledSubject(enableQueue, scheduler);
	    this.source = source.multicast(this.subject).refCount();
	  }

	  ControlledObservable.prototype.request = function (numberOfItems) {
	    return this.subject.request(numberOfItems == null ? -1 : numberOfItems);
	  };

	  return ControlledObservable;

	}(Observable));

	var ControlledSubject = (function (__super__) {

	  function subscribe (observer) {
	    return this.subject.subscribe(observer);
	  }

	  inherits(ControlledSubject, __super__);

	  function ControlledSubject(enableQueue, scheduler) {
	    enableQueue == null && (enableQueue = true);

	    __super__.call(this, subscribe);
	    this.subject = new Subject();
	    this.enableQueue = enableQueue;
	    this.queue = enableQueue ? [] : null;
	    this.requestedCount = 0;
	    this.requestedDisposable = null;
	    this.error = null;
	    this.hasFailed = false;
	    this.hasCompleted = false;
	    this.scheduler = scheduler || currentThreadScheduler;
	  }

	  addProperties(ControlledSubject.prototype, Observer, {
	    onCompleted: function () {
	      this.hasCompleted = true;
	      if (!this.enableQueue || this.queue.length === 0) {
	        this.subject.onCompleted();
	        this.disposeCurrentRequest()
	      } else {
	        this.queue.push(Notification.createOnCompleted());
	      }
	    },
	    onError: function (error) {
	      this.hasFailed = true;
	      this.error = error;
	      if (!this.enableQueue || this.queue.length === 0) {
	        this.subject.onError(error);
	        this.disposeCurrentRequest()
	      } else {
	        this.queue.push(Notification.createOnError(error));
	      }
	    },
	    onNext: function (value) {
	      if (this.requestedCount <= 0) {
	        this.enableQueue && this.queue.push(Notification.createOnNext(value));
	      } else {
	        (this.requestedCount-- === 0) && this.disposeCurrentRequest();
	        this.subject.onNext(value);
	      }
	    },
	    _processRequest: function (numberOfItems) {
	      if (this.enableQueue) {
	        while (this.queue.length > 0 && (numberOfItems > 0 || this.queue[0].kind !== 'N')) {
	          var first = this.queue.shift();
	          first.accept(this.subject);
	          if (first.kind === 'N') {
	            numberOfItems--;
	          } else {
	            this.disposeCurrentRequest();
	            this.queue = [];
	          }
	        }
	      }

	      return numberOfItems;
	    },
	    request: function (number) {
	      this.disposeCurrentRequest();
	      var self = this;

	      this.requestedDisposable = this.scheduler.scheduleWithState(number,
	      function(s, i) {
	        var remaining = self._processRequest(i);
	        var stopped = self.hasCompleted || self.hasFailed
	        if (!stopped && remaining > 0) {
	          self.requestedCount = remaining;

	          return disposableCreate(function () {
	            self.requestedCount = 0;
	          });
	            // Scheduled item is still in progress. Return a new
	            // disposable to allow the request to be interrupted
	            // via dispose.
	        }
	      });

	      return this.requestedDisposable;
	    },
	    disposeCurrentRequest: function () {
	      if (this.requestedDisposable) {
	        this.requestedDisposable.dispose();
	        this.requestedDisposable = null;
	      }
	    }
	  });

	  return ControlledSubject;
	}(Observable));

	/**
	 * Attaches a controller to the observable sequence with the ability to queue.
	 * @example
	 * var source = Rx.Observable.interval(100).controlled();
	 * source.request(3); // Reads 3 values
	 * @param {bool} enableQueue truthy value to determine if values should be queued pending the next request
	 * @param {Scheduler} scheduler determines how the requests will be scheduled
	 * @returns {Observable} The observable sequence which only propagates values on request.
	 */
	observableProto.controlled = function (enableQueue, scheduler) {

	  if (enableQueue && isScheduler(enableQueue)) {
	      scheduler = enableQueue;
	      enableQueue = true;
	  }

	  if (enableQueue == null) {  enableQueue = true; }
	  return new ControlledObservable(this, enableQueue, scheduler);
	};

	  var StopAndWaitObservable = (function (__super__) {

	    function subscribe (observer) {
	      this.subscription = this.source.subscribe(new StopAndWaitObserver(observer, this, this.subscription));

	      var self = this;
	      timeoutScheduler.schedule(function () { self.source.request(1); });

	      return this.subscription;
	    }

	    inherits(StopAndWaitObservable, __super__);

	    function StopAndWaitObservable (source) {
	      __super__.call(this, subscribe, source);
	      this.source = source;
	    }

	    var StopAndWaitObserver = (function (__sub__) {

	      inherits(StopAndWaitObserver, __sub__);

	      function StopAndWaitObserver (observer, observable, cancel) {
	        __sub__.call(this);
	        this.observer = observer;
	        this.observable = observable;
	        this.cancel = cancel;
	      }

	      var stopAndWaitObserverProto = StopAndWaitObserver.prototype;

	      stopAndWaitObserverProto.completed = function () {
	        this.observer.onCompleted();
	        this.dispose();
	      };

	      stopAndWaitObserverProto.error = function (error) {
	        this.observer.onError(error);
	        this.dispose();
	      }

	      stopAndWaitObserverProto.next = function (value) {
	        this.observer.onNext(value);

	        var self = this;
	        timeoutScheduler.schedule(function () {
	          self.observable.source.request(1);
	        });
	      };

	      stopAndWaitObserverProto.dispose = function () {
	        this.observer = null;
	        if (this.cancel) {
	          this.cancel.dispose();
	          this.cancel = null;
	        }
	        __sub__.prototype.dispose.call(this);
	      };

	      return StopAndWaitObserver;
	    }(AbstractObserver));

	    return StopAndWaitObservable;
	  }(Observable));


	  /**
	   * Attaches a stop and wait observable to the current observable.
	   * @returns {Observable} A stop and wait observable.
	   */
	  ControlledObservable.prototype.stopAndWait = function () {
	    return new StopAndWaitObservable(this);
	  };

	  var WindowedObservable = (function (__super__) {

	    function subscribe (observer) {
	      this.subscription = this.source.subscribe(new WindowedObserver(observer, this, this.subscription));

	      var self = this;
	      timeoutScheduler.schedule(function () {
	        self.source.request(self.windowSize);
	      });

	      return this.subscription;
	    }

	    inherits(WindowedObservable, __super__);

	    function WindowedObservable(source, windowSize) {
	      __super__.call(this, subscribe, source);
	      this.source = source;
	      this.windowSize = windowSize;
	    }

	    var WindowedObserver = (function (__sub__) {

	      inherits(WindowedObserver, __sub__);

	      function WindowedObserver(observer, observable, cancel) {
	        this.observer = observer;
	        this.observable = observable;
	        this.cancel = cancel;
	        this.received = 0;
	      }

	      var windowedObserverPrototype = WindowedObserver.prototype;

	      windowedObserverPrototype.completed = function () {
	        this.observer.onCompleted();
	        this.dispose();
	      };

	      windowedObserverPrototype.error = function (error) {
	        this.observer.onError(error);
	        this.dispose();
	      };

	      windowedObserverPrototype.next = function (value) {
	        this.observer.onNext(value);

	        this.received = ++this.received % this.observable.windowSize;
	        if (this.received === 0) {
	          var self = this;
	          timeoutScheduler.schedule(function () {
	            self.observable.source.request(self.observable.windowSize);
	          });
	        }
	      };

	      windowedObserverPrototype.dispose = function () {
	        this.observer = null;
	        if (this.cancel) {
	          this.cancel.dispose();
	          this.cancel = null;
	        }
	        __sub__.prototype.dispose.call(this);
	      };

	      return WindowedObserver;
	    }(AbstractObserver));

	    return WindowedObservable;
	  }(Observable));

	  /**
	   * Creates a sliding windowed observable based upon the window size.
	   * @param {Number} windowSize The number of items in the window
	   * @returns {Observable} A windowed observable based upon the window size.
	   */
	  ControlledObservable.prototype.windowed = function (windowSize) {
	    return new WindowedObservable(this, windowSize);
	  };

	  /**
	   * Pipes the existing Observable sequence into a Node.js Stream.
	   * @param {Stream} dest The destination Node.js stream.
	   * @returns {Stream} The destination stream.
	   */
	  observableProto.pipe = function (dest) {
	    var source = this.pausableBuffered();

	    function onDrain() {
	      source.resume();
	    }

	    dest.addListener('drain', onDrain);

	    source.subscribe(
	      function (x) {
	        !dest.write(String(x)) && source.pause();
	      },
	      function (err) {
	        dest.emit('error', err);
	      },
	      function () {
	        // Hack check because STDIO is not closable
	        !dest._isStdio && dest.end();
	        dest.removeListener('drain', onDrain);
	      });

	    source.resume();

	    return dest;
	  };

	  /**
	   * Multicasts the source sequence notifications through an instantiated subject into all uses of the sequence within a selector function. Each
	   * subscription to the resulting sequence causes a separate multicast invocation, exposing the sequence resulting from the selector function's
	   * invocation. For specializations with fixed subject types, see Publish, PublishLast, and Replay.
	   *
	   * @example
	   * 1 - res = source.multicast(observable);
	   * 2 - res = source.multicast(function () { return new Subject(); }, function (x) { return x; });
	   *
	   * @param {Function|Subject} subjectOrSubjectSelector
	   * Factory function to create an intermediate subject through which the source sequence's elements will be multicast to the selector function.
	   * Or:
	   * Subject to push source elements into.
	   *
	   * @param {Function} [selector] Optional selector function which can use the multicasted source sequence subject to the policies enforced by the created subject. Specified only if <paramref name="subjectOrSubjectSelector" is a factory function.
	   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
	   */
	  observableProto.multicast = function (subjectOrSubjectSelector, selector) {
	    var source = this;
	    return typeof subjectOrSubjectSelector === 'function' ?
	      new AnonymousObservable(function (observer) {
	        var connectable = source.multicast(subjectOrSubjectSelector());
	        return new CompositeDisposable(selector(connectable).subscribe(observer), connectable.connect());
	      }, source) :
	      new ConnectableObservable(source, subjectOrSubjectSelector);
	  };

	  /**
	   * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence.
	   * This operator is a specialization of Multicast using a regular Subject.
	   *
	   * @example
	   * var resres = source.publish();
	   * var res = source.publish(function (x) { return x; });
	   *
	   * @param {Function} [selector] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive all notifications of the source from the time of the subscription on.
	   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
	   */
	  observableProto.publish = function (selector) {
	    return selector && isFunction(selector) ?
	      this.multicast(function () { return new Subject(); }, selector) :
	      this.multicast(new Subject());
	  };

	  /**
	   * Returns an observable sequence that shares a single subscription to the underlying sequence.
	   * This operator is a specialization of publish which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
	   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
	   */
	  observableProto.share = function () {
	    return this.publish().refCount();
	  };

	  /**
	   * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence containing only the last notification.
	   * This operator is a specialization of Multicast using a AsyncSubject.
	   *
	   * @example
	   * var res = source.publishLast();
	   * var res = source.publishLast(function (x) { return x; });
	   *
	   * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will only receive the last notification of the source.
	   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
	   */
	  observableProto.publishLast = function (selector) {
	    return selector && isFunction(selector) ?
	      this.multicast(function () { return new AsyncSubject(); }, selector) :
	      this.multicast(new AsyncSubject());
	  };

	  /**
	   * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence and starts with initialValue.
	   * This operator is a specialization of Multicast using a BehaviorSubject.
	   *
	   * @example
	   * var res = source.publishValue(42);
	   * var res = source.publishValue(function (x) { return x.select(function (y) { return y * y; }) }, 42);
	   *
	   * @param {Function} [selector] Optional selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive immediately receive the initial value, followed by all notifications of the source from the time of the subscription on.
	   * @param {Mixed} initialValue Initial value received by observers upon subscription.
	   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
	   */
	  observableProto.publishValue = function (initialValueOrSelector, initialValue) {
	    return arguments.length === 2 ?
	      this.multicast(function () {
	        return new BehaviorSubject(initialValue);
	      }, initialValueOrSelector) :
	      this.multicast(new BehaviorSubject(initialValueOrSelector));
	  };

	  /**
	   * Returns an observable sequence that shares a single subscription to the underlying sequence and starts with an initialValue.
	   * This operator is a specialization of publishValue which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
	   * @param {Mixed} initialValue Initial value received by observers upon subscription.
	   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
	   */
	  observableProto.shareValue = function (initialValue) {
	    return this.publishValue(initialValue).refCount();
	  };

	  /**
	   * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence replaying notifications subject to a maximum time length for the replay buffer.
	   * This operator is a specialization of Multicast using a ReplaySubject.
	   *
	   * @example
	   * var res = source.replay(null, 3);
	   * var res = source.replay(null, 3, 500);
	   * var res = source.replay(null, 3, 500, scheduler);
	   * var res = source.replay(function (x) { return x.take(6).repeat(); }, 3, 500, scheduler);
	   *
	   * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive all the notifications of the source subject to the specified replay buffer trimming policy.
	   * @param bufferSize [Optional] Maximum element count of the replay buffer.
	   * @param windowSize [Optional] Maximum time length of the replay buffer.
	   * @param scheduler [Optional] Scheduler where connected observers within the selector function will be invoked on.
	   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
	   */
	  observableProto.replay = function (selector, bufferSize, windowSize, scheduler) {
	    return selector && isFunction(selector) ?
	      this.multicast(function () { return new ReplaySubject(bufferSize, windowSize, scheduler); }, selector) :
	      this.multicast(new ReplaySubject(bufferSize, windowSize, scheduler));
	  };

	  /**
	   * Returns an observable sequence that shares a single subscription to the underlying sequence replaying notifications subject to a maximum time length for the replay buffer.
	   * This operator is a specialization of replay which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
	   *
	   * @example
	   * var res = source.shareReplay(3);
	   * var res = source.shareReplay(3, 500);
	   * var res = source.shareReplay(3, 500, scheduler);
	   *

	   * @param bufferSize [Optional] Maximum element count of the replay buffer.
	   * @param window [Optional] Maximum time length of the replay buffer.
	   * @param scheduler [Optional] Scheduler where connected observers within the selector function will be invoked on.
	   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
	   */
	  observableProto.shareReplay = function (bufferSize, windowSize, scheduler) {
	    return this.replay(null, bufferSize, windowSize, scheduler).refCount();
	  };

	  var InnerSubscription = function (subject, observer) {
	    this.subject = subject;
	    this.observer = observer;
	  };

	  InnerSubscription.prototype.dispose = function () {
	    if (!this.subject.isDisposed && this.observer !== null) {
	      var idx = this.subject.observers.indexOf(this.observer);
	      this.subject.observers.splice(idx, 1);
	      this.observer = null;
	    }
	  };

	  /**
	   *  Represents a value that changes over time.
	   *  Observers can subscribe to the subject to receive the last (or initial) value and all subsequent notifications.
	   */
	  var BehaviorSubject = Rx.BehaviorSubject = (function (__super__) {
	    function subscribe(observer) {
	      checkDisposed(this);
	      if (!this.isStopped) {
	        this.observers.push(observer);
	        observer.onNext(this.value);
	        return new InnerSubscription(this, observer);
	      }
	      if (this.hasError) {
	        observer.onError(this.error);
	      } else {
	        observer.onCompleted();
	      }
	      return disposableEmpty;
	    }

	    inherits(BehaviorSubject, __super__);

	    /**
	     *  Initializes a new instance of the BehaviorSubject class which creates a subject that caches its last value and starts with the specified value.
	     *  @param {Mixed} value Initial value sent to observers when no other value has been received by the subject yet.
	     */
	    function BehaviorSubject(value) {
	      __super__.call(this, subscribe);
	      this.value = value,
	      this.observers = [],
	      this.isDisposed = false,
	      this.isStopped = false,
	      this.hasError = false;
	    }

	    addProperties(BehaviorSubject.prototype, Observer, {
	      /**
	       * Gets the current value or throws an exception.
	       * Value is frozen after onCompleted is called.
	       * After onError is called always throws the specified exception.
	       * An exception is always thrown after dispose is called.
	       * @returns {Mixed} The initial value passed to the constructor until onNext is called; after which, the last value passed to onNext.
	       */
	      getValue: function () {
	          checkDisposed(this);
	          if (this.hasError) {
	              throw this.error;
	          }
	          return this.value;
	      },
	      /**
	       * Indicates whether the subject has observers subscribed to it.
	       * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
	       */
	      hasObservers: function () { return this.observers.length > 0; },
	      /**
	       * Notifies all subscribed observers about the end of the sequence.
	       */
	      onCompleted: function () {
	        checkDisposed(this);
	        if (this.isStopped) { return; }
	        this.isStopped = true;
	        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
	          os[i].onCompleted();
	        }

	        this.observers.length = 0;
	      },
	      /**
	       * Notifies all subscribed observers about the exception.
	       * @param {Mixed} error The exception to send to all observers.
	       */
	      onError: function (error) {
	        checkDisposed(this);
	        if (this.isStopped) { return; }
	        this.isStopped = true;
	        this.hasError = true;
	        this.error = error;

	        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
	          os[i].onError(error);
	        }

	        this.observers.length = 0;
	      },
	      /**
	       * Notifies all subscribed observers about the arrival of the specified element in the sequence.
	       * @param {Mixed} value The value to send to all observers.
	       */
	      onNext: function (value) {
	        checkDisposed(this);
	        if (this.isStopped) { return; }
	        this.value = value;
	        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
	          os[i].onNext(value);
	        }
	      },
	      /**
	       * Unsubscribe all observers and release resources.
	       */
	      dispose: function () {
	        this.isDisposed = true;
	        this.observers = null;
	        this.value = null;
	        this.exception = null;
	      }
	    });

	    return BehaviorSubject;
	  }(Observable));

	  /**
	   * Represents an object that is both an observable sequence as well as an observer.
	   * Each notification is broadcasted to all subscribed and future observers, subject to buffer trimming policies.
	   */
	  var ReplaySubject = Rx.ReplaySubject = (function (__super__) {

	    var maxSafeInteger = Math.pow(2, 53) - 1;

	    function createRemovableDisposable(subject, observer) {
	      return disposableCreate(function () {
	        observer.dispose();
	        !subject.isDisposed && subject.observers.splice(subject.observers.indexOf(observer), 1);
	      });
	    }

	    function subscribe(observer) {
	      var so = new ScheduledObserver(this.scheduler, observer),
	        subscription = createRemovableDisposable(this, so);
	      checkDisposed(this);
	      this._trim(this.scheduler.now());
	      this.observers.push(so);

	      for (var i = 0, len = this.q.length; i < len; i++) {
	        so.onNext(this.q[i].value);
	      }

	      if (this.hasError) {
	        so.onError(this.error);
	      } else if (this.isStopped) {
	        so.onCompleted();
	      }

	      so.ensureActive();
	      return subscription;
	    }

	    inherits(ReplaySubject, __super__);

	    /**
	     *  Initializes a new instance of the ReplaySubject class with the specified buffer size, window size and scheduler.
	     *  @param {Number} [bufferSize] Maximum element count of the replay buffer.
	     *  @param {Number} [windowSize] Maximum time length of the replay buffer.
	     *  @param {Scheduler} [scheduler] Scheduler the observers are invoked on.
	     */
	    function ReplaySubject(bufferSize, windowSize, scheduler) {
	      this.bufferSize = bufferSize == null ? maxSafeInteger : bufferSize;
	      this.windowSize = windowSize == null ? maxSafeInteger : windowSize;
	      this.scheduler = scheduler || currentThreadScheduler;
	      this.q = [];
	      this.observers = [];
	      this.isStopped = false;
	      this.isDisposed = false;
	      this.hasError = false;
	      this.error = null;
	      __super__.call(this, subscribe);
	    }

	    addProperties(ReplaySubject.prototype, Observer.prototype, {
	      /**
	       * Indicates whether the subject has observers subscribed to it.
	       * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
	       */
	      hasObservers: function () {
	        return this.observers.length > 0;
	      },
	      _trim: function (now) {
	        while (this.q.length > this.bufferSize) {
	          this.q.shift();
	        }
	        while (this.q.length > 0 && (now - this.q[0].interval) > this.windowSize) {
	          this.q.shift();
	        }
	      },
	      /**
	       * Notifies all subscribed observers about the arrival of the specified element in the sequence.
	       * @param {Mixed} value The value to send to all observers.
	       */
	      onNext: function (value) {
	        checkDisposed(this);
	        if (this.isStopped) { return; }
	        var now = this.scheduler.now();
	        this.q.push({ interval: now, value: value });
	        this._trim(now);

	        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
	          var observer = os[i];
	          observer.onNext(value);
	          observer.ensureActive();
	        }
	      },
	      /**
	       * Notifies all subscribed observers about the exception.
	       * @param {Mixed} error The exception to send to all observers.
	       */
	      onError: function (error) {
	        checkDisposed(this);
	        if (this.isStopped) { return; }
	        this.isStopped = true;
	        this.error = error;
	        this.hasError = true;
	        var now = this.scheduler.now();
	        this._trim(now);
	        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
	          var observer = os[i];
	          observer.onError(error);
	          observer.ensureActive();
	        }
	        this.observers.length = 0;
	      },
	      /**
	       * Notifies all subscribed observers about the end of the sequence.
	       */
	      onCompleted: function () {
	        checkDisposed(this);
	        if (this.isStopped) { return; }
	        this.isStopped = true;
	        var now = this.scheduler.now();
	        this._trim(now);
	        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
	          var observer = os[i];
	          observer.onCompleted();
	          observer.ensureActive();
	        }
	        this.observers.length = 0;
	      },
	      /**
	       * Unsubscribe all observers and release resources.
	       */
	      dispose: function () {
	        this.isDisposed = true;
	        this.observers = null;
	      }
	    });

	    return ReplaySubject;
	  }(Observable));

	  var ConnectableObservable = Rx.ConnectableObservable = (function (__super__) {
	    inherits(ConnectableObservable, __super__);

	    function ConnectableObservable(source, subject) {
	      var hasSubscription = false,
	        subscription,
	        sourceObservable = source.asObservable();

	      this.connect = function () {
	        if (!hasSubscription) {
	          hasSubscription = true;
	          subscription = new CompositeDisposable(sourceObservable.subscribe(subject), disposableCreate(function () {
	            hasSubscription = false;
	          }));
	        }
	        return subscription;
	      };

	      __super__.call(this, function (o) { return subject.subscribe(o); });
	    }

	    ConnectableObservable.prototype.refCount = function () {
	      var connectableSubscription, count = 0, source = this;
	      return new AnonymousObservable(function (observer) {
	          var shouldConnect = ++count === 1,
	            subscription = source.subscribe(observer);
	          shouldConnect && (connectableSubscription = source.connect());
	          return function () {
	            subscription.dispose();
	            --count === 0 && connectableSubscription.dispose();
	          };
	      });
	    };

	    return ConnectableObservable;
	  }(Observable));

	  /**
	   * Returns an observable sequence that shares a single subscription to the underlying sequence. This observable sequence
	   * can be resubscribed to, even if all prior subscriptions have ended. (unlike `.publish().refCount()`)
	   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source.
	   */
	  observableProto.singleInstance = function() {
	    var source = this, hasObservable = false, observable;

	    function getObservable() {
	      if (!hasObservable) {
	        hasObservable = true;
	        observable = source.finally(function() { hasObservable = false; }).publish().refCount();
	      }
	      return observable;
	    };

	    return new AnonymousObservable(function(o) {
	      return getObservable().subscribe(o);
	    });
	  };

	  /**
	   *  Correlates the elements of two sequences based on overlapping durations.
	   *
	   *  @param {Observable} right The right observable sequence to join elements for.
	   *  @param {Function} leftDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the left observable sequence, used to determine overlap.
	   *  @param {Function} rightDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the right observable sequence, used to determine overlap.
	   *  @param {Function} resultSelector A function invoked to compute a result element for any two overlapping elements of the left and right observable sequences. The parameters passed to the function correspond with the elements from the left and right source sequences for which overlap occurs.
	   *  @returns {Observable} An observable sequence that contains result elements computed from source elements that have an overlapping duration.
	   */
	  observableProto.join = function (right, leftDurationSelector, rightDurationSelector, resultSelector) {
	    var left = this;
	    return new AnonymousObservable(function (o) {
	      var group = new CompositeDisposable();
	      var leftDone = false, rightDone = false;
	      var leftId = 0, rightId = 0;
	      var leftMap = new Map(), rightMap = new Map();
	      var handleError = function (e) { o.onError(e); };

	      group.add(left.subscribe(
	        function (value) {
	          var id = leftId++, md = new SingleAssignmentDisposable();

	          leftMap.set(id, value);
	          group.add(md);

	          var duration = tryCatch(leftDurationSelector)(value);
	          if (duration === errorObj) { return o.onError(duration.e); }

	          md.setDisposable(duration.take(1).subscribe(
	            noop,
	            handleError,
	            function () {
	              leftMap['delete'](id) && leftMap.size === 0 && leftDone && o.onCompleted();
	              group.remove(md);
	            }));

	          rightMap.forEach(function (v) {
	            var result = tryCatch(resultSelector)(value, v);
	            if (result === errorObj) { return o.onError(result.e); }
	            o.onNext(result);
	          });
	        },
	        handleError,
	        function () {
	          leftDone = true;
	          (rightDone || leftMap.size === 0) && o.onCompleted();
	        })
	      );

	      group.add(right.subscribe(
	        function (value) {
	          var id = rightId++, md = new SingleAssignmentDisposable();

	          rightMap.set(id, value);
	          group.add(md);

	          var duration = tryCatch(rightDurationSelector)(value);
	          if (duration === errorObj) { return o.onError(duration.e); }

	          md.setDisposable(duration.take(1).subscribe(
	            noop,
	            handleError,
	            function () {
	              rightMap['delete'](id) && rightMap.size === 0 && rightDone && o.onCompleted();
	              group.remove(md);
	            }));

	          leftMap.forEach(function (v) {
	            var result = tryCatch(resultSelector)(v, value);
	            if (result === errorObj) { return o.onError(result.e); }
	            o.onNext(result);
	          });
	        },
	        handleError,
	        function () {
	          rightDone = true;
	          (leftDone || rightMap.size === 0) && o.onCompleted();
	        })
	      );
	      return group;
	    }, left);
	  };

	  /**
	   *  Correlates the elements of two sequences based on overlapping durations, and groups the results.
	   *
	   *  @param {Observable} right The right observable sequence to join elements for.
	   *  @param {Function} leftDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the left observable sequence, used to determine overlap.
	   *  @param {Function} rightDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the right observable sequence, used to determine overlap.
	   *  @param {Function} resultSelector A function invoked to compute a result element for any element of the left sequence with overlapping elements from the right observable sequence. The first parameter passed to the function is an element of the left sequence. The second parameter passed to the function is an observable sequence with elements from the right sequence that overlap with the left sequence's element.
	   *  @returns {Observable} An observable sequence that contains result elements computed from source elements that have an overlapping duration.
	   */
	  observableProto.groupJoin = function (right, leftDurationSelector, rightDurationSelector, resultSelector) {
	    var left = this;
	    return new AnonymousObservable(function (o) {
	      var group = new CompositeDisposable();
	      var r = new RefCountDisposable(group);
	      var leftMap = new Map(), rightMap = new Map();
	      var leftId = 0, rightId = 0;
	      var handleError = function (e) { return function (v) { v.onError(e); }; };

	      function handleError(e) { };

	      group.add(left.subscribe(
	        function (value) {
	          var s = new Subject();
	          var id = leftId++;
	          leftMap.set(id, s);

	          var result = tryCatch(resultSelector)(value, addRef(s, r));
	          if (result === errorObj) {
	            leftMap.forEach(handleError(result.e));
	            return o.onError(result.e);
	          }
	          o.onNext(result);

	          rightMap.forEach(function (v) { s.onNext(v); });

	          var md = new SingleAssignmentDisposable();
	          group.add(md);

	          var duration = tryCatch(leftDurationSelector)(value);
	          if (duration === errorObj) {
	            leftMap.forEach(handleError(duration.e));
	            return o.onError(duration.e);
	          }

	          md.setDisposable(duration.take(1).subscribe(
	            noop,
	            function (e) {
	              leftMap.forEach(handleError(e));
	              o.onError(e);
	            },
	            function () {
	              leftMap['delete'](id) && s.onCompleted();
	              group.remove(md);
	            }));
	        },
	        function (e) {
	          leftMap.forEach(handleError(e));
	          o.onError(e);
	        },
	        function () { o.onCompleted(); })
	      );

	      group.add(right.subscribe(
	        function (value) {
	          var id = rightId++;
	          rightMap.set(id, value);

	          var md = new SingleAssignmentDisposable();
	          group.add(md);

	          var duration = tryCatch(rightDurationSelector)(value);
	          if (duration === errorObj) {
	            leftMap.forEach(handleError(duration.e));
	            return o.onError(duration.e);
	          }

	          md.setDisposable(duration.take(1).subscribe(
	            noop,
	            function (e) {
	              leftMap.forEach(handleError(e));
	              o.onError(e);
	            },
	            function () {
	              rightMap['delete'](id);
	              group.remove(md);
	            }));

	          leftMap.forEach(function (v) { v.onNext(value); });
	        },
	        function (e) {
	          leftMap.forEach(handleError(e));
	          o.onError(e);
	        })
	      );

	      return r;
	    }, left);
	  };

	  function toArray(x) { return x.toArray(); }

	  /**
	   *  Projects each element of an observable sequence into zero or more buffers.
	   *  @param {Mixed} bufferOpeningsOrClosingSelector Observable sequence whose elements denote the creation of new windows, or, a function invoked to define the boundaries of the produced windows (a new window is started when the previous one is closed, resulting in non-overlapping windows).
	   *  @param {Function} [bufferClosingSelector] A function invoked to define the closing of each produced window. If a closing selector function is specified for the first parameter, this parameter is ignored.
	   *  @returns {Observable} An observable sequence of windows.
	   */
	  observableProto.buffer = function () {
	    return this.window.apply(this, arguments)
	      .flatMap(toArray);
	  };

	  /**
	   *  Projects each element of an observable sequence into zero or more windows.
	   *
	   *  @param {Mixed} windowOpeningsOrClosingSelector Observable sequence whose elements denote the creation of new windows, or, a function invoked to define the boundaries of the produced windows (a new window is started when the previous one is closed, resulting in non-overlapping windows).
	   *  @param {Function} [windowClosingSelector] A function invoked to define the closing of each produced window. If a closing selector function is specified for the first parameter, this parameter is ignored.
	   *  @returns {Observable} An observable sequence of windows.
	   */
	  observableProto.window = function (windowOpeningsOrClosingSelector, windowClosingSelector) {
	    if (arguments.length === 1 && typeof arguments[0] !== 'function') {
	      return observableWindowWithBoundaries.call(this, windowOpeningsOrClosingSelector);
	    }
	    return typeof windowOpeningsOrClosingSelector === 'function' ?
	      observableWindowWithClosingSelector.call(this, windowOpeningsOrClosingSelector) :
	      observableWindowWithOpenings.call(this, windowOpeningsOrClosingSelector, windowClosingSelector);
	  };

	  function observableWindowWithOpenings(windowOpenings, windowClosingSelector) {
	    return windowOpenings.groupJoin(this, windowClosingSelector, observableEmpty, function (_, win) {
	      return win;
	    });
	  }

	  function observableWindowWithBoundaries(windowBoundaries) {
	    var source = this;
	    return new AnonymousObservable(function (observer) {
	      var win = new Subject(),
	        d = new CompositeDisposable(),
	        r = new RefCountDisposable(d);

	      observer.onNext(addRef(win, r));

	      d.add(source.subscribe(function (x) {
	        win.onNext(x);
	      }, function (err) {
	        win.onError(err);
	        observer.onError(err);
	      }, function () {
	        win.onCompleted();
	        observer.onCompleted();
	      }));

	      isPromise(windowBoundaries) && (windowBoundaries = observableFromPromise(windowBoundaries));

	      d.add(windowBoundaries.subscribe(function (w) {
	        win.onCompleted();
	        win = new Subject();
	        observer.onNext(addRef(win, r));
	      }, function (err) {
	        win.onError(err);
	        observer.onError(err);
	      }, function () {
	        win.onCompleted();
	        observer.onCompleted();
	      }));

	      return r;
	    }, source);
	  }

	  function observableWindowWithClosingSelector(windowClosingSelector) {
	    var source = this;
	    return new AnonymousObservable(function (observer) {
	      var m = new SerialDisposable(),
	        d = new CompositeDisposable(m),
	        r = new RefCountDisposable(d),
	        win = new Subject();
	      observer.onNext(addRef(win, r));
	      d.add(source.subscribe(function (x) {
	          win.onNext(x);
	      }, function (err) {
	          win.onError(err);
	          observer.onError(err);
	      }, function () {
	          win.onCompleted();
	          observer.onCompleted();
	      }));

	      function createWindowClose () {
	        var windowClose;
	        try {
	          windowClose = windowClosingSelector();
	        } catch (e) {
	          observer.onError(e);
	          return;
	        }

	        isPromise(windowClose) && (windowClose = observableFromPromise(windowClose));

	        var m1 = new SingleAssignmentDisposable();
	        m.setDisposable(m1);
	        m1.setDisposable(windowClose.take(1).subscribe(noop, function (err) {
	          win.onError(err);
	          observer.onError(err);
	        }, function () {
	          win.onCompleted();
	          win = new Subject();
	          observer.onNext(addRef(win, r));
	          createWindowClose();
	        }));
	      }

	      createWindowClose();
	      return r;
	    }, source);
	  }

	  /**
	   * Returns a new observable that triggers on the second and subsequent triggerings of the input observable.
	   * The Nth triggering of the input observable passes the arguments from the N-1th and Nth triggering as a pair.
	   * The argument passed to the N-1th triggering is held in hidden internal state until the Nth triggering occurs.
	   * @returns {Observable} An observable that triggers on successive pairs of observations from the input observable as an array.
	   */
	  observableProto.pairwise = function () {
	    var source = this;
	    return new AnonymousObservable(function (observer) {
	      var previous, hasPrevious = false;
	      return source.subscribe(
	        function (x) {
	          if (hasPrevious) {
	            observer.onNext([previous, x]);
	          } else {
	            hasPrevious = true;
	          }
	          previous = x;
	        },
	        observer.onError.bind(observer),
	        observer.onCompleted.bind(observer));
	    }, source);
	  };

	  /**
	   * Returns two observables which partition the observations of the source by the given function.
	   * The first will trigger observations for those values for which the predicate returns true.
	   * The second will trigger observations for those values where the predicate returns false.
	   * The predicate is executed once for each subscribed observer.
	   * Both also propagate all error observations arising from the source and each completes
	   * when the source completes.
	   * @param {Function} predicate
	   *    The function to determine which output Observable will trigger a particular observation.
	   * @returns {Array}
	   *    An array of observables. The first triggers when the predicate returns true,
	   *    and the second triggers when the predicate returns false.
	  */
	  observableProto.partition = function(predicate, thisArg) {
	    return [
	      this.filter(predicate, thisArg),
	      this.filter(function (x, i, o) { return !predicate.call(thisArg, x, i, o); })
	    ];
	  };

	  var WhileEnumerable = (function(__super__) {
	    inherits(WhileEnumerable, __super__);
	    function WhileEnumerable(c, s) {
	      this.c = c;
	      this.s = s;
	    }
	    WhileEnumerable.prototype[$iterator$] = function () {
	      var self = this;
	      return {
	        next: function () {
	          return self.c() ?
	           { done: false, value: self.s } :
	           { done: true, value: void 0 };
	        }
	      };
	    };
	    return WhileEnumerable;
	  }(Enumerable));
	  
	  function enumerableWhile(condition, source) {
	    return new WhileEnumerable(condition, source);
	  }  

	   /**
	   *  Returns an observable sequence that is the result of invoking the selector on the source sequence, without sharing subscriptions.
	   *  This operator allows for a fluent style of writing queries that use the same sequence multiple times.
	   *
	   * @param {Function} selector Selector function which can use the source sequence as many times as needed, without sharing subscriptions to the source sequence.
	   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
	   */
	  observableProto.letBind = observableProto['let'] = function (func) {
	    return func(this);
	  };

	   /**
	   *  Determines whether an observable collection contains values. 
	   *
	   * @example
	   *  1 - res = Rx.Observable.if(condition, obs1);
	   *  2 - res = Rx.Observable.if(condition, obs1, obs2);
	   *  3 - res = Rx.Observable.if(condition, obs1, scheduler);
	   * @param {Function} condition The condition which determines if the thenSource or elseSource will be run.
	   * @param {Observable} thenSource The observable sequence or Promise that will be run if the condition function returns true.
	   * @param {Observable} [elseSource] The observable sequence or Promise that will be run if the condition function returns false. If this is not provided, it defaults to Rx.Observabe.Empty with the specified scheduler.
	   * @returns {Observable} An observable sequence which is either the thenSource or elseSource.
	   */
	  Observable['if'] = function (condition, thenSource, elseSourceOrScheduler) {
	    return observableDefer(function () {
	      elseSourceOrScheduler || (elseSourceOrScheduler = observableEmpty());

	      isPromise(thenSource) && (thenSource = observableFromPromise(thenSource));
	      isPromise(elseSourceOrScheduler) && (elseSourceOrScheduler = observableFromPromise(elseSourceOrScheduler));

	      // Assume a scheduler for empty only
	      typeof elseSourceOrScheduler.now === 'function' && (elseSourceOrScheduler = observableEmpty(elseSourceOrScheduler));
	      return condition() ? thenSource : elseSourceOrScheduler;
	    });
	  };

	   /**
	   *  Concatenates the observable sequences obtained by running the specified result selector for each element in source.
	   * There is an alias for this method called 'forIn' for browsers <IE9
	   * @param {Array} sources An array of values to turn into an observable sequence.
	   * @param {Function} resultSelector A function to apply to each item in the sources array to turn it into an observable sequence.
	   * @returns {Observable} An observable sequence from the concatenated observable sequences.
	   */
	  Observable['for'] = Observable.forIn = function (sources, resultSelector, thisArg) {
	    return enumerableOf(sources, resultSelector, thisArg).concat();
	  };

	   /**
	   *  Repeats source as long as condition holds emulating a while loop.
	   * There is an alias for this method called 'whileDo' for browsers <IE9
	   *
	   * @param {Function} condition The condition which determines if the source will be repeated.
	   * @param {Observable} source The observable sequence that will be run if the condition function returns true.
	   * @returns {Observable} An observable sequence which is repeated as long as the condition holds.
	   */
	  var observableWhileDo = Observable['while'] = Observable.whileDo = function (condition, source) {
	    isPromise(source) && (source = observableFromPromise(source));
	    return enumerableWhile(condition, source).concat();
	  };

	   /**
	   *  Repeats source as long as condition holds emulating a do while loop.
	   *
	   * @param {Function} condition The condition which determines if the source will be repeated.
	   * @param {Observable} source The observable sequence that will be run if the condition function returns true.
	   * @returns {Observable} An observable sequence which is repeated as long as the condition holds.
	   */
	  observableProto.doWhile = function (condition) {
	    return observableConcat([this, observableWhileDo(condition, this)]);
	  };

	   /**
	   *  Uses selector to determine which source in sources to use.

	   * @param {Function} selector The function which extracts the value for to test in a case statement.
	   * @param {Array} sources A object which has keys which correspond to the case statement labels.
	   * @param {Observable} [elseSource] The observable sequence or Promise that will be run if the sources are not matched. If this is not provided, it defaults to Rx.Observabe.empty with the specified scheduler.
	   *
	   * @returns {Observable} An observable sequence which is determined by a case statement.
	   */
	  Observable['case'] = function (selector, sources, defaultSourceOrScheduler) {
	    return observableDefer(function () {
	      isPromise(defaultSourceOrScheduler) && (defaultSourceOrScheduler = observableFromPromise(defaultSourceOrScheduler));
	      defaultSourceOrScheduler || (defaultSourceOrScheduler = observableEmpty());

	      isScheduler(defaultSourceOrScheduler) && (defaultSourceOrScheduler = observableEmpty(defaultSourceOrScheduler));

	      var result = sources[selector()];
	      isPromise(result) && (result = observableFromPromise(result));

	      return result || defaultSourceOrScheduler;
	    });
	  };

	   /**
	   *  Expands an observable sequence by recursively invoking selector.
	   *
	   * @param {Function} selector Selector function to invoke for each produced element, resulting in another sequence to which the selector will be invoked recursively again.
	   * @param {Scheduler} [scheduler] Scheduler on which to perform the expansion. If not provided, this defaults to the current thread scheduler.
	   * @returns {Observable} An observable sequence containing all the elements produced by the recursive expansion.
	   */
	  observableProto.expand = function (selector, scheduler) {
	    isScheduler(scheduler) || (scheduler = immediateScheduler);
	    var source = this;
	    return new AnonymousObservable(function (observer) {
	      var q = [],
	        m = new SerialDisposable(),
	        d = new CompositeDisposable(m),
	        activeCount = 0,
	        isAcquired = false;

	      var ensureActive = function () {
	        var isOwner = false;
	        if (q.length > 0) {
	          isOwner = !isAcquired;
	          isAcquired = true;
	        }
	        if (isOwner) {
	          m.setDisposable(scheduler.scheduleRecursive(function (self) {
	            var work;
	            if (q.length > 0) {
	              work = q.shift();
	            } else {
	              isAcquired = false;
	              return;
	            }
	            var m1 = new SingleAssignmentDisposable();
	            d.add(m1);
	            m1.setDisposable(work.subscribe(function (x) {
	              observer.onNext(x);
	              var result = null;
	              try {
	                result = selector(x);
	              } catch (e) {
	                observer.onError(e);
	              }
	              q.push(result);
	              activeCount++;
	              ensureActive();
	            }, observer.onError.bind(observer), function () {
	              d.remove(m1);
	              activeCount--;
	              if (activeCount === 0) {
	                observer.onCompleted();
	              }
	            }));
	            self();
	          }));
	        }
	      };

	      q.push(source);
	      activeCount++;
	      ensureActive();
	      return d;
	    }, this);
	  };

	   /**
	   *  Runs all observable sequences in parallel and collect their last elements.
	   *
	   * @example
	   *  1 - res = Rx.Observable.forkJoin([obs1, obs2]);
	   *  1 - res = Rx.Observable.forkJoin(obs1, obs2, ...);
	   * @returns {Observable} An observable sequence with an array collecting the last elements of all the input sequences.
	   */
	  Observable.forkJoin = function () {
	    var allSources = [];
	    if (Array.isArray(arguments[0])) {
	      allSources = arguments[0];
	    } else {
	      for(var i = 0, len = arguments.length; i < len; i++) { allSources.push(arguments[i]); }
	    }
	    return new AnonymousObservable(function (subscriber) {
	      var count = allSources.length;
	      if (count === 0) {
	        subscriber.onCompleted();
	        return disposableEmpty;
	      }
	      var group = new CompositeDisposable(),
	        finished = false,
	        hasResults = new Array(count),
	        hasCompleted = new Array(count),
	        results = new Array(count);

	      for (var idx = 0; idx < count; idx++) {
	        (function (i) {
	          var source = allSources[i];
	          isPromise(source) && (source = observableFromPromise(source));
	          group.add(
	            source.subscribe(
	              function (value) {
	              if (!finished) {
	                hasResults[i] = true;
	                results[i] = value;
	              }
	            },
	            function (e) {
	              finished = true;
	              subscriber.onError(e);
	              group.dispose();
	            },
	            function () {
	              if (!finished) {
	                if (!hasResults[i]) {
	                    subscriber.onCompleted();
	                    return;
	                }
	                hasCompleted[i] = true;
	                for (var ix = 0; ix < count; ix++) {
	                  if (!hasCompleted[ix]) { return; }
	                }
	                finished = true;
	                subscriber.onNext(results);
	                subscriber.onCompleted();
	              }
	            }));
	        })(idx);
	      }

	      return group;
	    });
	  };

	   /**
	   *  Runs two observable sequences in parallel and combines their last elemenets.
	   *
	   * @param {Observable} second Second observable sequence.
	   * @param {Function} resultSelector Result selector function to invoke with the last elements of both sequences.
	   * @returns {Observable} An observable sequence with the result of calling the selector function with the last elements of both input sequences.
	   */
	  observableProto.forkJoin = function (second, resultSelector) {
	    var first = this;
	    return new AnonymousObservable(function (observer) {
	      var leftStopped = false, rightStopped = false,
	        hasLeft = false, hasRight = false,
	        lastLeft, lastRight,
	        leftSubscription = new SingleAssignmentDisposable(), rightSubscription = new SingleAssignmentDisposable();

	      isPromise(second) && (second = observableFromPromise(second));

	      leftSubscription.setDisposable(
	          first.subscribe(function (left) {
	            hasLeft = true;
	            lastLeft = left;
	          }, function (err) {
	            rightSubscription.dispose();
	            observer.onError(err);
	          }, function () {
	            leftStopped = true;
	            if (rightStopped) {
	              if (!hasLeft) {
	                  observer.onCompleted();
	              } else if (!hasRight) {
	                  observer.onCompleted();
	              } else {
	                var result;
	                try {
	                  result = resultSelector(lastLeft, lastRight);
	                } catch (e) {
	                  observer.onError(e);
	                  return;
	                }
	                observer.onNext(result);
	                observer.onCompleted();
	              }
	            }
	          })
	      );

	      rightSubscription.setDisposable(
	        second.subscribe(function (right) {
	          hasRight = true;
	          lastRight = right;
	        }, function (err) {
	          leftSubscription.dispose();
	          observer.onError(err);
	        }, function () {
	          rightStopped = true;
	          if (leftStopped) {
	            if (!hasLeft) {
	              observer.onCompleted();
	            } else if (!hasRight) {
	              observer.onCompleted();
	            } else {
	              var result;
	              try {
	                result = resultSelector(lastLeft, lastRight);
	              } catch (e) {
	                observer.onError(e);
	                return;
	              }
	              observer.onNext(result);
	              observer.onCompleted();
	            }
	          }
	        })
	      );

	      return new CompositeDisposable(leftSubscription, rightSubscription);
	    }, first);
	  };

	  /**
	   * Comonadic bind operator.
	   * @param {Function} selector A transform function to apply to each element.
	   * @param {Object} scheduler Scheduler used to execute the operation. If not specified, defaults to the ImmediateScheduler.
	   * @returns {Observable} An observable sequence which results from the comonadic bind operation.
	   */
	  observableProto.manySelect = observableProto.extend = function (selector, scheduler) {
	    isScheduler(scheduler) || (scheduler = immediateScheduler);
	    var source = this;
	    return observableDefer(function () {
	      var chain;

	      return source
	        .map(function (x) {
	          var curr = new ChainObservable(x);

	          chain && chain.onNext(x);
	          chain = curr;

	          return curr;
	        })
	        .tap(
	          noop,
	          function (e) { chain && chain.onError(e); },
	          function () { chain && chain.onCompleted(); }
	        )
	        .observeOn(scheduler)
	        .map(selector);
	    }, source);
	  };

	  var ChainObservable = (function (__super__) {

	    function subscribe (observer) {
	      var self = this, g = new CompositeDisposable();
	      g.add(currentThreadScheduler.schedule(function () {
	        observer.onNext(self.head);
	        g.add(self.tail.mergeAll().subscribe(observer));
	      }));

	      return g;
	    }

	    inherits(ChainObservable, __super__);

	    function ChainObservable(head) {
	      __super__.call(this, subscribe);
	      this.head = head;
	      this.tail = new AsyncSubject();
	    }

	    addProperties(ChainObservable.prototype, Observer, {
	      onCompleted: function () {
	        this.onNext(Observable.empty());
	      },
	      onError: function (e) {
	        this.onNext(Observable['throw'](e));
	      },
	      onNext: function (v) {
	        this.tail.onNext(v);
	        this.tail.onCompleted();
	      }
	    });

	    return ChainObservable;

	  }(Observable));

	  var Map = root.Map || (function () {
	    function Map() {
	      this.size = 0;
	      this._values = [];
	      this._keys = [];
	    }

	    Map.prototype['delete'] = function (key) {
	      var i = this._keys.indexOf(key);
	      if (i === -1) { return false }
	      this._values.splice(i, 1);
	      this._keys.splice(i, 1);
	      this.size--;
	      return true;
	    };

	    Map.prototype.get = function (key) {
	      var i = this._keys.indexOf(key);
	      return i === -1 ? undefined : this._values[i];
	    };

	    Map.prototype.set = function (key, value) {
	      var i = this._keys.indexOf(key);
	      if (i === -1) {
	        this._keys.push(key);
	        this._values.push(value);
	        this.size++;
	      } else {
	        this._values[i] = value;
	      }
	      return this;
	    };

	    Map.prototype.forEach = function (cb, thisArg) {
	      for (var i = 0; i < this.size; i++) {
	        cb.call(thisArg, this._values[i], this._keys[i]);
	      }
	    };

	    return Map;
	  }());

	  /**
	   * @constructor
	   * Represents a join pattern over observable sequences.
	   */
	  function Pattern(patterns) {
	    this.patterns = patterns;
	  }

	  /**
	   *  Creates a pattern that matches the current plan matches and when the specified observable sequences has an available value.
	   *  @param other Observable sequence to match in addition to the current pattern.
	   *  @return {Pattern} Pattern object that matches when all observable sequences in the pattern have an available value.
	   */
	  Pattern.prototype.and = function (other) {
	    return new Pattern(this.patterns.concat(other));
	  };

	  /**
	   *  Matches when all observable sequences in the pattern (specified using a chain of and operators) have an available value and projects the values.
	   *  @param {Function} selector Selector that will be invoked with available values from the source sequences, in the same order of the sequences in the pattern.
	   *  @return {Plan} Plan that produces the projected values, to be fed (with other plans) to the when operator.
	   */
	  Pattern.prototype.thenDo = function (selector) {
	    return new Plan(this, selector);
	  };

	  function Plan(expression, selector) {
	      this.expression = expression;
	      this.selector = selector;
	  }

	  Plan.prototype.activate = function (externalSubscriptions, observer, deactivate) {
	    var self = this;
	    var joinObservers = [];
	    for (var i = 0, len = this.expression.patterns.length; i < len; i++) {
	      joinObservers.push(planCreateObserver(externalSubscriptions, this.expression.patterns[i], observer.onError.bind(observer)));
	    }
	    var activePlan = new ActivePlan(joinObservers, function () {
	      var result;
	      try {
	        result = self.selector.apply(self, arguments);
	      } catch (e) {
	        observer.onError(e);
	        return;
	      }
	      observer.onNext(result);
	    }, function () {
	      for (var j = 0, jlen = joinObservers.length; j < jlen; j++) {
	        joinObservers[j].removeActivePlan(activePlan);
	      }
	      deactivate(activePlan);
	    });
	    for (i = 0, len = joinObservers.length; i < len; i++) {
	      joinObservers[i].addActivePlan(activePlan);
	    }
	    return activePlan;
	  };

	  function planCreateObserver(externalSubscriptions, observable, onError) {
	    var entry = externalSubscriptions.get(observable);
	    if (!entry) {
	      var observer = new JoinObserver(observable, onError);
	      externalSubscriptions.set(observable, observer);
	      return observer;
	    }
	    return entry;
	  }

	  function ActivePlan(joinObserverArray, onNext, onCompleted) {
	    this.joinObserverArray = joinObserverArray;
	    this.onNext = onNext;
	    this.onCompleted = onCompleted;
	    this.joinObservers = new Map();
	    for (var i = 0, len = this.joinObserverArray.length; i < len; i++) {
	      var joinObserver = this.joinObserverArray[i];
	      this.joinObservers.set(joinObserver, joinObserver);
	    }
	  }

	  ActivePlan.prototype.dequeue = function () {
	    this.joinObservers.forEach(function (v) { v.queue.shift(); });
	  };

	  ActivePlan.prototype.match = function () {
	    var i, len, hasValues = true;
	    for (i = 0, len = this.joinObserverArray.length; i < len; i++) {
	      if (this.joinObserverArray[i].queue.length === 0) {
	        hasValues = false;
	        break;
	      }
	    }
	    if (hasValues) {
	      var firstValues = [],
	          isCompleted = false;
	      for (i = 0, len = this.joinObserverArray.length; i < len; i++) {
	        firstValues.push(this.joinObserverArray[i].queue[0]);
	        this.joinObserverArray[i].queue[0].kind === 'C' && (isCompleted = true);
	      }
	      if (isCompleted) {
	        this.onCompleted();
	      } else {
	        this.dequeue();
	        var values = [];
	        for (i = 0, len = firstValues.length; i < firstValues.length; i++) {
	          values.push(firstValues[i].value);
	        }
	        this.onNext.apply(this, values);
	      }
	    }
	  };

	  var JoinObserver = (function (__super__) {
	    inherits(JoinObserver, __super__);

	    function JoinObserver(source, onError) {
	      __super__.call(this);
	      this.source = source;
	      this.onError = onError;
	      this.queue = [];
	      this.activePlans = [];
	      this.subscription = new SingleAssignmentDisposable();
	      this.isDisposed = false;
	    }

	    var JoinObserverPrototype = JoinObserver.prototype;

	    JoinObserverPrototype.next = function (notification) {
	      if (!this.isDisposed) {
	        if (notification.kind === 'E') {
	          return this.onError(notification.exception);
	        }
	        this.queue.push(notification);
	        var activePlans = this.activePlans.slice(0);
	        for (var i = 0, len = activePlans.length; i < len; i++) {
	          activePlans[i].match();
	        }
	      }
	    };

	    JoinObserverPrototype.error = noop;
	    JoinObserverPrototype.completed = noop;

	    JoinObserverPrototype.addActivePlan = function (activePlan) {
	      this.activePlans.push(activePlan);
	    };

	    JoinObserverPrototype.subscribe = function () {
	      this.subscription.setDisposable(this.source.materialize().subscribe(this));
	    };

	    JoinObserverPrototype.removeActivePlan = function (activePlan) {
	      this.activePlans.splice(this.activePlans.indexOf(activePlan), 1);
	      this.activePlans.length === 0 && this.dispose();
	    };

	    JoinObserverPrototype.dispose = function () {
	      __super__.prototype.dispose.call(this);
	      if (!this.isDisposed) {
	        this.isDisposed = true;
	        this.subscription.dispose();
	      }
	    };

	    return JoinObserver;
	  } (AbstractObserver));

	  /**
	   *  Creates a pattern that matches when both observable sequences have an available value.
	   *
	   *  @param right Observable sequence to match with the current sequence.
	   *  @return {Pattern} Pattern object that matches when both observable sequences have an available value.
	   */
	  observableProto.and = function (right) {
	    return new Pattern([this, right]);
	  };

	  /**
	   *  Matches when the observable sequence has an available value and projects the value.
	   *
	   *  @param {Function} selector Selector that will be invoked for values in the source sequence.
	   *  @returns {Plan} Plan that produces the projected values, to be fed (with other plans) to the when operator.
	   */
	  observableProto.thenDo = function (selector) {
	    return new Pattern([this]).thenDo(selector);
	  };

	  /**
	   *  Joins together the results from several patterns.
	   *
	   *  @param plans A series of plans (specified as an Array of as a series of arguments) created by use of the Then operator on patterns.
	   *  @returns {Observable} Observable sequence with the results form matching several patterns.
	   */
	  Observable.when = function () {
	    var len = arguments.length, plans;
	    if (Array.isArray(arguments[0])) {
	      plans = arguments[0];
	    } else {
	      plans = new Array(len);
	      for(var i = 0; i < len; i++) { plans[i] = arguments[i]; }
	    }
	    return new AnonymousObservable(function (o) {
	      var activePlans = [],
	          externalSubscriptions = new Map();
	      var outObserver = observerCreate(
	        function (x) { o.onNext(x); },
	        function (err) {
	          externalSubscriptions.forEach(function (v) { v.onError(err); });
	          o.onError(err);
	        },
	        function (x) { o.onCompleted(); }
	      );
	      try {
	        for (var i = 0, len = plans.length; i < len; i++) {
	          activePlans.push(plans[i].activate(externalSubscriptions, outObserver, function (activePlan) {
	            var idx = activePlans.indexOf(activePlan);
	            activePlans.splice(idx, 1);
	            activePlans.length === 0 && o.onCompleted();
	          }));
	        }
	      } catch (e) {
	        observableThrow(e).subscribe(o);
	      }
	      var group = new CompositeDisposable();
	      externalSubscriptions.forEach(function (joinObserver) {
	        joinObserver.subscribe();
	        group.add(joinObserver);
	      });

	      return group;
	    });
	  };

	  function observableTimerDate(dueTime, scheduler) {
	    return new AnonymousObservable(function (observer) {
	      return scheduler.scheduleWithAbsolute(dueTime, function () {
	        observer.onNext(0);
	        observer.onCompleted();
	      });
	    });
	  }

	  function observableTimerDateAndPeriod(dueTime, period, scheduler) {
	    return new AnonymousObservable(function (observer) {
	      var d = dueTime, p = normalizeTime(period);
	      return scheduler.scheduleRecursiveWithAbsoluteAndState(0, d, function (count, self) {
	        if (p > 0) {
	          var now = scheduler.now();
	          d = d + p;
	          d <= now && (d = now + p);
	        }
	        observer.onNext(count);
	        self(count + 1, d);
	      });
	    });
	  }

	  function observableTimerTimeSpan(dueTime, scheduler) {
	    return new AnonymousObservable(function (observer) {
	      return scheduler.scheduleWithRelative(normalizeTime(dueTime), function () {
	        observer.onNext(0);
	        observer.onCompleted();
	      });
	    });
	  }

	  function observableTimerTimeSpanAndPeriod(dueTime, period, scheduler) {
	    return dueTime === period ?
	      new AnonymousObservable(function (observer) {
	        return scheduler.schedulePeriodicWithState(0, period, function (count) {
	          observer.onNext(count);
	          return count + 1;
	        });
	      }) :
	      observableDefer(function () {
	        return observableTimerDateAndPeriod(scheduler.now() + dueTime, period, scheduler);
	      });
	  }

	  /**
	   *  Returns an observable sequence that produces a value after each period.
	   *
	   * @example
	   *  1 - res = Rx.Observable.interval(1000);
	   *  2 - res = Rx.Observable.interval(1000, Rx.Scheduler.timeout);
	   *
	   * @param {Number} period Period for producing the values in the resulting sequence (specified as an integer denoting milliseconds).
	   * @param {Scheduler} [scheduler] Scheduler to run the timer on. If not specified, Rx.Scheduler.timeout is used.
	   * @returns {Observable} An observable sequence that produces a value after each period.
	   */
	  var observableinterval = Observable.interval = function (period, scheduler) {
	    return observableTimerTimeSpanAndPeriod(period, period, isScheduler(scheduler) ? scheduler : timeoutScheduler);
	  };

	  /**
	   *  Returns an observable sequence that produces a value after dueTime has elapsed and then after each period.
	   * @param {Number} dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) at which to produce the first value.
	   * @param {Mixed} [periodOrScheduler]  Period to produce subsequent values (specified as an integer denoting milliseconds), or the scheduler to run the timer on. If not specified, the resulting timer is not recurring.
	   * @param {Scheduler} [scheduler]  Scheduler to run the timer on. If not specified, the timeout scheduler is used.
	   * @returns {Observable} An observable sequence that produces a value after due time has elapsed and then each period.
	   */
	  var observableTimer = Observable.timer = function (dueTime, periodOrScheduler, scheduler) {
	    var period;
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    if (periodOrScheduler != null && typeof periodOrScheduler === 'number') {
	      period = periodOrScheduler;
	    } else if (isScheduler(periodOrScheduler)) {
	      scheduler = periodOrScheduler;
	    }
	    if (dueTime instanceof Date && period === undefined) {
	      return observableTimerDate(dueTime.getTime(), scheduler);
	    }
	    if (dueTime instanceof Date && period !== undefined) {
	      return observableTimerDateAndPeriod(dueTime.getTime(), periodOrScheduler, scheduler);
	    }
	    return period === undefined ?
	      observableTimerTimeSpan(dueTime, scheduler) :
	      observableTimerTimeSpanAndPeriod(dueTime, period, scheduler);
	  };

	  function observableDelayRelative(source, dueTime, scheduler) {
	    return new AnonymousObservable(function (o) {
	      var active = false,
	        cancelable = new SerialDisposable(),
	        exception = null,
	        q = [],
	        running = false,
	        subscription;
	      subscription = source.materialize().timestamp(scheduler).subscribe(function (notification) {
	        var d, shouldRun;
	        if (notification.value.kind === 'E') {
	          q = [];
	          q.push(notification);
	          exception = notification.value.exception;
	          shouldRun = !running;
	        } else {
	          q.push({ value: notification.value, timestamp: notification.timestamp + dueTime });
	          shouldRun = !active;
	          active = true;
	        }
	        if (shouldRun) {
	          if (exception !== null) {
	            o.onError(exception);
	          } else {
	            d = new SingleAssignmentDisposable();
	            cancelable.setDisposable(d);
	            d.setDisposable(scheduler.scheduleRecursiveWithRelative(dueTime, function (self) {
	              var e, recurseDueTime, result, shouldRecurse;
	              if (exception !== null) {
	                return;
	              }
	              running = true;
	              do {
	                result = null;
	                if (q.length > 0 && q[0].timestamp - scheduler.now() <= 0) {
	                  result = q.shift().value;
	                }
	                if (result !== null) {
	                  result.accept(o);
	                }
	              } while (result !== null);
	              shouldRecurse = false;
	              recurseDueTime = 0;
	              if (q.length > 0) {
	                shouldRecurse = true;
	                recurseDueTime = Math.max(0, q[0].timestamp - scheduler.now());
	              } else {
	                active = false;
	              }
	              e = exception;
	              running = false;
	              if (e !== null) {
	                o.onError(e);
	              } else if (shouldRecurse) {
	                self(recurseDueTime);
	              }
	            }));
	          }
	        }
	      });
	      return new CompositeDisposable(subscription, cancelable);
	    }, source);
	  }

	  function observableDelayAbsolute(source, dueTime, scheduler) {
	    return observableDefer(function () {
	      return observableDelayRelative(source, dueTime - scheduler.now(), scheduler);
	    });
	  }

	  function delayWithSelector(source, subscriptionDelay, delayDurationSelector) {
	    var subDelay, selector;
	    if (isFunction(subscriptionDelay)) {
	      selector = subscriptionDelay;
	    } else {
	      subDelay = subscriptionDelay;
	      selector = delayDurationSelector;
	    }
	    return new AnonymousObservable(function (o) {
	      var delays = new CompositeDisposable(), atEnd = false, subscription = new SerialDisposable();

	      function start() {
	        subscription.setDisposable(source.subscribe(
	          function (x) {
	            var delay = tryCatch(selector)(x);
	            if (delay === errorObj) { return o.onError(delay.e); }
	            var d = new SingleAssignmentDisposable();
	            delays.add(d);
	            d.setDisposable(delay.subscribe(
	              function () {
	                o.onNext(x);
	                delays.remove(d);
	                done();
	              },
	              function (e) { o.onError(e); },
	              function () {
	                o.onNext(x);
	                delays.remove(d);
	                done();
	              }
	            ));
	          },
	          function (e) { o.onError(e); },
	          function () {
	            atEnd = true;
	            subscription.dispose();
	            done();
	          }
	        ));
	      }

	      function done () {
	        atEnd && delays.length === 0 && o.onCompleted();
	      }

	      if (!subDelay) {
	        start();
	      } else {
	        subscription.setDisposable(subDelay.subscribe(start, function (e) { o.onError(e); }, start));
	      }

	      return new CompositeDisposable(subscription, delays);
	    }, this);
	  }

	  /**
	   *  Time shifts the observable sequence by dueTime.
	   *  The relative time intervals between the values are preserved.
	   *
	   * @param {Number} dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) by which to shift the observable sequence.
	   * @param {Scheduler} [scheduler] Scheduler to run the delay timers on. If not specified, the timeout scheduler is used.
	   * @returns {Observable} Time-shifted sequence.
	   */
	  observableProto.delay = function () {
	    if (typeof arguments[0] === 'number' || arguments[0] instanceof Date) {
	      var dueTime = arguments[0], scheduler = arguments[1];
	      isScheduler(scheduler) || (scheduler = timeoutScheduler);
	      return dueTime instanceof Date ?
	        observableDelayAbsolute(this, dueTime, scheduler) :
	        observableDelayRelative(this, dueTime, scheduler);
	    } else if (isFunction(arguments[0])) {
	      return delayWithSelector(this, arguments[0], arguments[1]);
	    } else {
	      throw new Error('Invalid arguments');
	    }
	  };

	  function debounce(source, dueTime, scheduler) {
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return new AnonymousObservable(function (observer) {
	      var cancelable = new SerialDisposable(), hasvalue = false, value, id = 0;
	      var subscription = source.subscribe(
	        function (x) {
	          hasvalue = true;
	          value = x;
	          id++;
	          var currentId = id,
	            d = new SingleAssignmentDisposable();
	          cancelable.setDisposable(d);
	          d.setDisposable(scheduler.scheduleWithRelative(dueTime, function () {
	            hasvalue && id === currentId && observer.onNext(value);
	            hasvalue = false;
	          }));
	        },
	        function (e) {
	          cancelable.dispose();
	          observer.onError(e);
	          hasvalue = false;
	          id++;
	        },
	        function () {
	          cancelable.dispose();
	          hasvalue && observer.onNext(value);
	          observer.onCompleted();
	          hasvalue = false;
	          id++;
	        });
	      return new CompositeDisposable(subscription, cancelable);
	    }, this);
	  }

	  function debounceWithSelector(source, durationSelector) {
	    return new AnonymousObservable(function (o) {
	      var value, hasValue = false, cancelable = new SerialDisposable(), id = 0;
	      var subscription = source.subscribe(
	        function (x) {
	          var throttle = tryCatch(durationSelector)(x);
	          if (throttle === errorObj) { return o.onError(throttle.e); }

	          isPromise(throttle) && (throttle = observableFromPromise(throttle));

	          hasValue = true;
	          value = x;
	          id++;
	          var currentid = id, d = new SingleAssignmentDisposable();
	          cancelable.setDisposable(d);
	          d.setDisposable(throttle.subscribe(
	            function () {
	              hasValue && id === currentid && o.onNext(value);
	              hasValue = false;
	              d.dispose();
	            },
	            function (e) { o.onError(e); },
	            function () {
	              hasValue && id === currentid && o.onNext(value);
	              hasValue = false;
	              d.dispose();
	            }
	          ));
	        },
	        function (e) {
	          cancelable.dispose();
	          o.onError(e);
	          hasValue = false;
	          id++;
	        },
	        function () {
	          cancelable.dispose();
	          hasValue && o.onNext(value);
	          o.onCompleted();
	          hasValue = false;
	          id++;
	        }
	      );
	      return new CompositeDisposable(subscription, cancelable);
	    }, source);
	  }

	  observableProto.debounce = function () {
	    if (isFunction (arguments[0])) {
	      return debounceWithSelector(this, arguments[0]);
	    } else if (typeof arguments[0] === 'number') {
	      return debounce(this, arguments[0], arguments[1]);
	    } else {
	      throw new Error('Invalid arguments');
	    }
	  };

	  /**
	   *  Projects each element of an observable sequence into zero or more windows which are produced based on timing information.
	   * @param {Number} timeSpan Length of each window (specified as an integer denoting milliseconds).
	   * @param {Mixed} [timeShiftOrScheduler]  Interval between creation of consecutive windows (specified as an integer denoting milliseconds), or an optional scheduler parameter. If not specified, the time shift corresponds to the timeSpan parameter, resulting in non-overlapping adjacent windows.
	   * @param {Scheduler} [scheduler]  Scheduler to run windowing timers on. If not specified, the timeout scheduler is used.
	   * @returns {Observable} An observable sequence of windows.
	   */
	  observableProto.windowWithTime = function (timeSpan, timeShiftOrScheduler, scheduler) {
	    var source = this, timeShift;
	    timeShiftOrScheduler == null && (timeShift = timeSpan);
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    if (typeof timeShiftOrScheduler === 'number') {
	      timeShift = timeShiftOrScheduler;
	    } else if (isScheduler(timeShiftOrScheduler)) {
	      timeShift = timeSpan;
	      scheduler = timeShiftOrScheduler;
	    }
	    return new AnonymousObservable(function (observer) {
	      var groupDisposable,
	        nextShift = timeShift,
	        nextSpan = timeSpan,
	        q = [],
	        refCountDisposable,
	        timerD = new SerialDisposable(),
	        totalTime = 0;
	        groupDisposable = new CompositeDisposable(timerD),
	        refCountDisposable = new RefCountDisposable(groupDisposable);

	       function createTimer () {
	        var m = new SingleAssignmentDisposable(),
	          isSpan = false,
	          isShift = false;
	        timerD.setDisposable(m);
	        if (nextSpan === nextShift) {
	          isSpan = true;
	          isShift = true;
	        } else if (nextSpan < nextShift) {
	            isSpan = true;
	        } else {
	          isShift = true;
	        }
	        var newTotalTime = isSpan ? nextSpan : nextShift,
	          ts = newTotalTime - totalTime;
	        totalTime = newTotalTime;
	        if (isSpan) {
	          nextSpan += timeShift;
	        }
	        if (isShift) {
	          nextShift += timeShift;
	        }
	        m.setDisposable(scheduler.scheduleWithRelative(ts, function () {
	          if (isShift) {
	            var s = new Subject();
	            q.push(s);
	            observer.onNext(addRef(s, refCountDisposable));
	          }
	          isSpan && q.shift().onCompleted();
	          createTimer();
	        }));
	      };
	      q.push(new Subject());
	      observer.onNext(addRef(q[0], refCountDisposable));
	      createTimer();
	      groupDisposable.add(source.subscribe(
	        function (x) {
	          for (var i = 0, len = q.length; i < len; i++) { q[i].onNext(x); }
	        },
	        function (e) {
	          for (var i = 0, len = q.length; i < len; i++) { q[i].onError(e); }
	          observer.onError(e);
	        },
	        function () {
	          for (var i = 0, len = q.length; i < len; i++) { q[i].onCompleted(); }
	          observer.onCompleted();
	        }
	      ));
	      return refCountDisposable;
	    }, source);
	  };

	  /**
	   *  Projects each element of an observable sequence into a window that is completed when either it's full or a given amount of time has elapsed.
	   * @param {Number} timeSpan Maximum time length of a window.
	   * @param {Number} count Maximum element count of a window.
	   * @param {Scheduler} [scheduler]  Scheduler to run windowing timers on. If not specified, the timeout scheduler is used.
	   * @returns {Observable} An observable sequence of windows.
	   */
	  observableProto.windowWithTimeOrCount = function (timeSpan, count, scheduler) {
	    var source = this;
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return new AnonymousObservable(function (observer) {
	      var timerD = new SerialDisposable(),
	          groupDisposable = new CompositeDisposable(timerD),
	          refCountDisposable = new RefCountDisposable(groupDisposable),
	          n = 0,
	          windowId = 0,
	          s = new Subject();

	      function createTimer(id) {
	        var m = new SingleAssignmentDisposable();
	        timerD.setDisposable(m);
	        m.setDisposable(scheduler.scheduleWithRelative(timeSpan, function () {
	          if (id !== windowId) { return; }
	          n = 0;
	          var newId = ++windowId;
	          s.onCompleted();
	          s = new Subject();
	          observer.onNext(addRef(s, refCountDisposable));
	          createTimer(newId);
	        }));
	      }

	      observer.onNext(addRef(s, refCountDisposable));
	      createTimer(0);

	      groupDisposable.add(source.subscribe(
	        function (x) {
	          var newId = 0, newWindow = false;
	          s.onNext(x);
	          if (++n === count) {
	            newWindow = true;
	            n = 0;
	            newId = ++windowId;
	            s.onCompleted();
	            s = new Subject();
	            observer.onNext(addRef(s, refCountDisposable));
	          }
	          newWindow && createTimer(newId);
	        },
	        function (e) {
	          s.onError(e);
	          observer.onError(e);
	        }, function () {
	          s.onCompleted();
	          observer.onCompleted();
	        }
	      ));
	      return refCountDisposable;
	    }, source);
	  };

	  function toArray(x) { return x.toArray(); }

	  /**
	   *  Projects each element of an observable sequence into zero or more buffers which are produced based on timing information.
	   * @param {Number} timeSpan Length of each buffer (specified as an integer denoting milliseconds).
	   * @param {Mixed} [timeShiftOrScheduler]  Interval between creation of consecutive buffers (specified as an integer denoting milliseconds), or an optional scheduler parameter. If not specified, the time shift corresponds to the timeSpan parameter, resulting in non-overlapping adjacent buffers.
	   * @param {Scheduler} [scheduler]  Scheduler to run buffer timers on. If not specified, the timeout scheduler is used.
	   * @returns {Observable} An observable sequence of buffers.
	   */
	  observableProto.bufferWithTime = function (timeSpan, timeShiftOrScheduler, scheduler) {
	    return this.windowWithTime(timeSpan, timeShiftOrScheduler, scheduler).flatMap(toArray);
	  };

	  function toArray(x) { return x.toArray(); }

	  /**
	   *  Projects each element of an observable sequence into a buffer that is completed when either it's full or a given amount of time has elapsed.
	   * @param {Number} timeSpan Maximum time length of a buffer.
	   * @param {Number} count Maximum element count of a buffer.
	   * @param {Scheduler} [scheduler]  Scheduler to run bufferin timers on. If not specified, the timeout scheduler is used.
	   * @returns {Observable} An observable sequence of buffers.
	   */
	  observableProto.bufferWithTimeOrCount = function (timeSpan, count, scheduler) {
	    return this.windowWithTimeOrCount(timeSpan, count, scheduler).flatMap(toArray);
	  };

	  /**
	   *  Records the time interval between consecutive values in an observable sequence.
	   *
	   * @example
	   *  1 - res = source.timeInterval();
	   *  2 - res = source.timeInterval(Rx.Scheduler.timeout);
	   *
	   * @param [scheduler]  Scheduler used to compute time intervals. If not specified, the timeout scheduler is used.
	   * @returns {Observable} An observable sequence with time interval information on values.
	   */
	  observableProto.timeInterval = function (scheduler) {
	    var source = this;
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return observableDefer(function () {
	      var last = scheduler.now();
	      return source.map(function (x) {
	        var now = scheduler.now(), span = now - last;
	        last = now;
	        return { value: x, interval: span };
	      });
	    });
	  };

	  /**
	   *  Records the timestamp for each value in an observable sequence.
	   *
	   * @example
	   *  1 - res = source.timestamp(); // produces { value: x, timestamp: ts }
	   *  2 - res = source.timestamp(Rx.Scheduler.default);
	   *
	   * @param {Scheduler} [scheduler]  Scheduler used to compute timestamps. If not specified, the default scheduler is used.
	   * @returns {Observable} An observable sequence with timestamp information on values.
	   */
	  observableProto.timestamp = function (scheduler) {
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return this.map(function (x) {
	      return { value: x, timestamp: scheduler.now() };
	    });
	  };

	  function sampleObservable(source, sampler) {
	    return new AnonymousObservable(function (o) {
	      var atEnd = false, value, hasValue = false;

	      function sampleSubscribe() {
	        if (hasValue) {
	          hasValue = false;
	          o.onNext(value);
	        }
	        atEnd && o.onCompleted();
	      }

	      var sourceSubscription = new SingleAssignmentDisposable();
	      sourceSubscription.setDisposable(source.subscribe(
	        function (newValue) {
	          hasValue = true;
	          value = newValue;
	        },
	        function (e) { o.onError(e); },
	        function () {
	          atEnd = true;
	          sourceSubscription.dispose(); 
	        }
	      ));

	      return new CompositeDisposable(
	        sourceSubscription,
	        sampler.subscribe(sampleSubscribe, function (e) { o.onError(e); }, sampleSubscribe)
	      );
	    }, source);
	  }

	  /**
	   *  Samples the observable sequence at each interval.
	   *
	   * @example
	   *  1 - res = source.sample(sampleObservable); // Sampler tick sequence
	   *  2 - res = source.sample(5000); // 5 seconds
	   *  2 - res = source.sample(5000, Rx.Scheduler.timeout); // 5 seconds
	   *
	   * @param {Mixed} intervalOrSampler Interval at which to sample (specified as an integer denoting milliseconds) or Sampler Observable.
	   * @param {Scheduler} [scheduler]  Scheduler to run the sampling timer on. If not specified, the timeout scheduler is used.
	   * @returns {Observable} Sampled observable sequence.
	   */
	  observableProto.sample = observableProto.throttleLatest = function (intervalOrSampler, scheduler) {
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return typeof intervalOrSampler === 'number' ?
	      sampleObservable(this, observableinterval(intervalOrSampler, scheduler)) :
	      sampleObservable(this, intervalOrSampler);
	  };

	  var TimeoutError = Rx.TimeoutError = function(message) {
	    this.message = message || 'Timeout has occurred';
	    this.name = 'TimeoutError';
	    Error.call(this);
	  };
	  TimeoutError.prototype = Object.create(Error.prototype);

	  function timeoutWithSelector(source, firstTimeout, timeoutDurationSelector, other) {
	    if (isFunction(firstTimeout)) {
	      other = timeoutDurationSelector;
	      timeoutDurationSelector = firstTimeout;
	      firstTimeout = observableNever();
	    }
	    other || (other = observableThrow(new TimeoutError()));
	    return new AnonymousObservable(function (o) {
	      var subscription = new SerialDisposable(), timer = new SerialDisposable(), original = new SingleAssignmentDisposable();

	      subscription.setDisposable(original);

	      var id = 0, switched = false;

	      function setTimer(timeout) {
	        var myId = id, d = new SingleAssignmentDisposable();
	        timer.setDisposable(d);
	        d.setDisposable(timeout.subscribe(function () {
	          id === myId && subscription.setDisposable(other.subscribe(o));
	          d.dispose();
	        }, function (e) {
	          id === myId && o.onError(e);
	        }, function () {
	          id === myId && subscription.setDisposable(other.subscribe(o));
	        }));
	      };

	      setTimer(firstTimeout);

	      function oWins() {
	        var res = !switched;
	        if (res) { id++; }
	        return res;
	      }

	      original.setDisposable(source.subscribe(function (x) {
	        if (oWins()) {
	          o.onNext(x);
	          var timeout = tryCatch(timeoutDurationSelector)(x);
	          if (timeout === errorObj) { return o.onError(timeout.e); }
	          setTimer(isPromise(timeout) ? observableFromPromise(timeout) : timeout);
	        }
	      }, function (e) {
	        oWins() && o.onError(e);
	      }, function () {
	        oWins() && o.onCompleted();
	      }));
	      return new CompositeDisposable(subscription, timer);
	    }, source);
	  }

	  function timeout(source, dueTime, other, scheduler) {
	    if (other == null) { throw new Error('other or scheduler must be specified'); }
	    if (isScheduler(other)) {
	      scheduler = other;
	      other = observableThrow(new TimeoutError());
	    }
	    if (other instanceof Error) { other = observableThrow(other); }
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);

	    var schedulerMethod = dueTime instanceof Date ?
	      'scheduleWithAbsolute' :
	      'scheduleWithRelative';

	    return new AnonymousObservable(function (o) {
	      var id = 0,
	        original = new SingleAssignmentDisposable(),
	        subscription = new SerialDisposable(),
	        switched = false,
	        timer = new SerialDisposable();

	      subscription.setDisposable(original);

	      function createTimer() {
	        var myId = id;
	        timer.setDisposable(scheduler[schedulerMethod](dueTime, function () {
	          if (id === myId) {
	            isPromise(other) && (other = observableFromPromise(other));
	            subscription.setDisposable(other.subscribe(o));
	          }
	        }));
	      }

	      createTimer();

	      original.setDisposable(source.subscribe(function (x) {
	        if (!switched) {
	          id++;
	          o.onNext(x);
	          createTimer();
	        }
	      }, function (e) {
	        if (!switched) {
	          id++;
	          o.onError(e);
	        }
	      }, function () {
	        if (!switched) {
	          id++;
	          o.onCompleted();
	        }
	      }));
	      return new CompositeDisposable(subscription, timer);
	    }, source);
	  }

	  observableProto.timeout = function () {
	    var firstArg = arguments[0];
	    if (firstArg instanceof Date || typeof firstArg === 'number') {
	      return timeout(this, firstArg, arguments[1], arguments[2]);
	    } else if (Observable.isObservable(firstArg) || isFunction(firstArg)) {
	      return timeoutWithSelector(this, firstArg, arguments[1], arguments[2]);
	    } else {
	      throw new Error('Invalid arguments');
	    }
	  };

	  /**
	   *  Generates an observable sequence by iterating a state from an initial state until the condition fails.
	   *
	   * @example
	   *  res = source.generateWithAbsoluteTime(0,
	   *      function (x) { return return true; },
	   *      function (x) { return x + 1; },
	   *      function (x) { return x; },
	   *      function (x) { return new Date(); }
	   *  });
	   *
	   * @param {Mixed} initialState Initial state.
	   * @param {Function} condition Condition to terminate generation (upon returning false).
	   * @param {Function} iterate Iteration step function.
	   * @param {Function} resultSelector Selector function for results produced in the sequence.
	   * @param {Function} timeSelector Time selector function to control the speed of values being produced each iteration, returning Date values.
	   * @param {Scheduler} [scheduler]  Scheduler on which to run the generator loop. If not specified, the timeout scheduler is used.
	   * @returns {Observable} The generated sequence.
	   */
	  Observable.generateWithAbsoluteTime = function (initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return new AnonymousObservable(function (observer) {
	      var first = true,
	        hasResult = false;
	      return scheduler.scheduleRecursiveWithAbsoluteAndState(initialState, scheduler.now(), function (state, self) {
	        hasResult && observer.onNext(state);

	        try {
	          if (first) {
	            first = false;
	          } else {
	            state = iterate(state);
	          }
	          hasResult = condition(state);
	          if (hasResult) {
	            var result = resultSelector(state);
	            var time = timeSelector(state);
	          }
	        } catch (e) {
	          observer.onError(e);
	          return;
	        }
	        if (hasResult) {
	          self(result, time);
	        } else {
	          observer.onCompleted();
	        }
	      });
	    });
	  };

	  /**
	   *  Generates an observable sequence by iterating a state from an initial state until the condition fails.
	   *
	   * @example
	   *  res = source.generateWithRelativeTime(0,
	   *      function (x) { return return true; },
	   *      function (x) { return x + 1; },
	   *      function (x) { return x; },
	   *      function (x) { return 500; }
	   *  );
	   *
	   * @param {Mixed} initialState Initial state.
	   * @param {Function} condition Condition to terminate generation (upon returning false).
	   * @param {Function} iterate Iteration step function.
	   * @param {Function} resultSelector Selector function for results produced in the sequence.
	   * @param {Function} timeSelector Time selector function to control the speed of values being produced each iteration, returning integer values denoting milliseconds.
	   * @param {Scheduler} [scheduler]  Scheduler on which to run the generator loop. If not specified, the timeout scheduler is used.
	   * @returns {Observable} The generated sequence.
	   */
	  Observable.generateWithRelativeTime = function (initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return new AnonymousObservable(function (observer) {
	      var first = true,
	        hasResult = false;
	      return scheduler.scheduleRecursiveWithRelativeAndState(initialState, 0, function (state, self) {
	        hasResult && observer.onNext(state);

	        try {
	          if (first) {
	            first = false;
	          } else {
	            state = iterate(state);
	          }
	          hasResult = condition(state);
	          if (hasResult) {
	            var result = resultSelector(state);
	            var time = timeSelector(state);
	          }
	        } catch (e) {
	          observer.onError(e);
	          return;
	        }
	        if (hasResult) {
	          self(result, time);
	        } else {
	          observer.onCompleted();
	        }
	      });
	    });
	  };

	  /**
	   *  Time shifts the observable sequence by delaying the subscription with the specified relative time duration, using the specified scheduler to run timers.
	   *
	   * @example
	   *  1 - res = source.delaySubscription(5000); // 5s
	   *  2 - res = source.delaySubscription(5000, Rx.Scheduler.default); // 5 seconds
	   *
	   * @param {Number} dueTime Relative or absolute time shift of the subscription.
	   * @param {Scheduler} [scheduler]  Scheduler to run the subscription delay timer on. If not specified, the timeout scheduler is used.
	   * @returns {Observable} Time-shifted sequence.
	   */
	  observableProto.delaySubscription = function (dueTime, scheduler) {
	    var scheduleMethod = dueTime instanceof Date ? 'scheduleWithAbsolute' : 'scheduleWithRelative';
	    var source = this;
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return new AnonymousObservable(function (o) {
	      var d = new SerialDisposable();

	      d.setDisposable(scheduler[scheduleMethod](dueTime, function() {
	        d.setDisposable(source.subscribe(o));
	      }));

	      return d;
	    }, this);
	  };

	  /**
	   *  Skips elements for the specified duration from the end of the observable source sequence, using the specified scheduler to run timers.
	   *
	   *  1 - res = source.skipLastWithTime(5000);
	   *  2 - res = source.skipLastWithTime(5000, scheduler);
	   *
	   * @description
	   *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
	   *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
	   *  result sequence. This causes elements to be delayed with duration.
	   * @param {Number} duration Duration for skipping elements from the end of the sequence.
	   * @param {Scheduler} [scheduler]  Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout
	   * @returns {Observable} An observable sequence with the elements skipped during the specified duration from the end of the source sequence.
	   */
	  observableProto.skipLastWithTime = function (duration, scheduler) {
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var q = [];
	      return source.subscribe(function (x) {
	        var now = scheduler.now();
	        q.push({ interval: now, value: x });
	        while (q.length > 0 && now - q[0].interval >= duration) {
	          o.onNext(q.shift().value);
	        }
	      }, function (e) { o.onError(e); }, function () {
	        var now = scheduler.now();
	        while (q.length > 0 && now - q[0].interval >= duration) {
	          o.onNext(q.shift().value);
	        }
	        o.onCompleted();
	      });
	    }, source);
	  };

	  /**
	   *  Returns elements within the specified duration from the end of the observable source sequence, using the specified schedulers to run timers and to drain the collected elements.
	   * @description
	   *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
	   *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
	   *  result sequence. This causes elements to be delayed with duration.
	   * @param {Number} duration Duration for taking elements from the end of the sequence.
	   * @param {Scheduler} [scheduler]  Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
	   * @returns {Observable} An observable sequence with the elements taken during the specified duration from the end of the source sequence.
	   */
	  observableProto.takeLastWithTime = function (duration, scheduler) {
	    var source = this;
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return new AnonymousObservable(function (o) {
	      var q = [];
	      return source.subscribe(function (x) {
	        var now = scheduler.now();
	        q.push({ interval: now, value: x });
	        while (q.length > 0 && now - q[0].interval >= duration) {
	          q.shift();
	        }
	      }, function (e) { o.onError(e); }, function () {
	        var now = scheduler.now();
	        while (q.length > 0) {
	          var next = q.shift();
	          if (now - next.interval <= duration) { o.onNext(next.value); }
	        }
	        o.onCompleted();
	      });
	    }, source);
	  };

	  /**
	   *  Returns an array with the elements within the specified duration from the end of the observable source sequence, using the specified scheduler to run timers.
	   * @description
	   *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
	   *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
	   *  result sequence. This causes elements to be delayed with duration.
	   * @param {Number} duration Duration for taking elements from the end of the sequence.
	   * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
	   * @returns {Observable} An observable sequence containing a single array with the elements taken during the specified duration from the end of the source sequence.
	   */
	  observableProto.takeLastBufferWithTime = function (duration, scheduler) {
	    var source = this;
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return new AnonymousObservable(function (o) {
	      var q = [];
	      return source.subscribe(function (x) {
	        var now = scheduler.now();
	        q.push({ interval: now, value: x });
	        while (q.length > 0 && now - q[0].interval >= duration) {
	          q.shift();
	        }
	      }, function (e) { o.onError(e); }, function () {
	        var now = scheduler.now(), res = [];
	        while (q.length > 0) {
	          var next = q.shift();
	          now - next.interval <= duration && res.push(next.value);
	        }
	        o.onNext(res);
	        o.onCompleted();
	      });
	    }, source);
	  };

	  /**
	   *  Takes elements for the specified duration from the start of the observable source sequence, using the specified scheduler to run timers.
	   *
	   * @example
	   *  1 - res = source.takeWithTime(5000,  [optional scheduler]);
	   * @description
	   *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
	   *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
	   *  result sequence. This causes elements to be delayed with duration.
	   * @param {Number} duration Duration for taking elements from the start of the sequence.
	   * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
	   * @returns {Observable} An observable sequence with the elements taken during the specified duration from the start of the source sequence.
	   */
	  observableProto.takeWithTime = function (duration, scheduler) {
	    var source = this;
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return new AnonymousObservable(function (o) {
	      return new CompositeDisposable(scheduler.scheduleWithRelative(duration, function () { o.onCompleted(); }), source.subscribe(o));
	    }, source);
	  };

	  /**
	   *  Skips elements for the specified duration from the start of the observable source sequence, using the specified scheduler to run timers.
	   *
	   * @example
	   *  1 - res = source.skipWithTime(5000, [optional scheduler]);
	   *
	   * @description
	   *  Specifying a zero value for duration doesn't guarantee no elements will be dropped from the start of the source sequence.
	   *  This is a side-effect of the asynchrony introduced by the scheduler, where the action that causes callbacks from the source sequence to be forwarded
	   *  may not execute immediately, despite the zero due time.
	   *
	   *  Errors produced by the source sequence are always forwarded to the result sequence, even if the error occurs before the duration.
	   * @param {Number} duration Duration for skipping elements from the start of the sequence.
	   * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
	   * @returns {Observable} An observable sequence with the elements skipped during the specified duration from the start of the source sequence.
	   */
	  observableProto.skipWithTime = function (duration, scheduler) {
	    var source = this;
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    return new AnonymousObservable(function (observer) {
	      var open = false;
	      return new CompositeDisposable(
	        scheduler.scheduleWithRelative(duration, function () { open = true; }),
	        source.subscribe(function (x) { open && observer.onNext(x); }, observer.onError.bind(observer), observer.onCompleted.bind(observer)));
	    }, source);
	  };

	  /**
	   *  Skips elements from the observable source sequence until the specified start time, using the specified scheduler to run timers.
	   *  Errors produced by the source sequence are always forwarded to the result sequence, even if the error occurs before the start time.
	   *
	   * @examples
	   *  1 - res = source.skipUntilWithTime(new Date(), [scheduler]);
	   *  2 - res = source.skipUntilWithTime(5000, [scheduler]);
	   * @param {Date|Number} startTime Time to start taking elements from the source sequence. If this value is less than or equal to Date(), no elements will be skipped.
	   * @param {Scheduler} [scheduler] Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
	   * @returns {Observable} An observable sequence with the elements skipped until the specified start time.
	   */
	  observableProto.skipUntilWithTime = function (startTime, scheduler) {
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    var source = this, schedulerMethod = startTime instanceof Date ?
	      'scheduleWithAbsolute' :
	      'scheduleWithRelative';
	    return new AnonymousObservable(function (o) {
	      var open = false;

	      return new CompositeDisposable(
	        scheduler[schedulerMethod](startTime, function () { open = true; }),
	        source.subscribe(
	          function (x) { open && o.onNext(x); },
	          function (e) { o.onError(e); }, function () { o.onCompleted(); }));
	    }, source);
	  };

	  /**
	   *  Takes elements for the specified duration until the specified end time, using the specified scheduler to run timers.
	   * @param {Number | Date} endTime Time to stop taking elements from the source sequence. If this value is less than or equal to new Date(), the result stream will complete immediately.
	   * @param {Scheduler} [scheduler] Scheduler to run the timer on.
	   * @returns {Observable} An observable sequence with the elements taken until the specified end time.
	   */
	  observableProto.takeUntilWithTime = function (endTime, scheduler) {
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    var source = this, schedulerMethod = endTime instanceof Date ?
	      'scheduleWithAbsolute' :
	      'scheduleWithRelative';
	    return new AnonymousObservable(function (o) {
	      return new CompositeDisposable(
	        scheduler[schedulerMethod](endTime, function () { o.onCompleted(); }),
	        source.subscribe(o));
	    }, source);
	  };

	  /**
	   * Returns an Observable that emits only the first item emitted by the source Observable during sequential time windows of a specified duration.
	   * @param {Number} windowDuration time to wait before emitting another item after emitting the last item
	   * @param {Scheduler} [scheduler] the Scheduler to use internally to manage the timers that handle timeout for each item. If not provided, defaults to Scheduler.timeout.
	   * @returns {Observable} An Observable that performs the throttle operation.
	   */
	  observableProto.throttle = function (windowDuration, scheduler) {
	    isScheduler(scheduler) || (scheduler = timeoutScheduler);
	    var duration = +windowDuration || 0;
	    if (duration <= 0) { throw new RangeError('windowDuration cannot be less or equal zero.'); }
	    var source = this;
	    return new AnonymousObservable(function (o) {
	      var lastOnNext = 0;
	      return source.subscribe(
	        function (x) {
	          var now = scheduler.now();
	          if (lastOnNext === 0 || now - lastOnNext >= duration) {
	            lastOnNext = now;
	            o.onNext(x);
	          }
	        },function (e) { o.onError(e); }, function () { o.onCompleted(); }
	      );
	    }, source);
	  };

	  /**
	   * Executes a transducer to transform the observable sequence
	   * @param {Transducer} transducer A transducer to execute
	   * @returns {Observable} An Observable sequence containing the results from the transducer.
	   */
	  observableProto.transduce = function(transducer) {
	    var source = this;

	    function transformForObserver(o) {
	      return {
	        '@@transducer/init': function() {
	          return o;
	        },
	        '@@transducer/step': function(obs, input) {
	          return obs.onNext(input);
	        },
	        '@@transducer/result': function(obs) {
	          return obs.onCompleted();
	        }
	      };
	    }

	    return new AnonymousObservable(function(o) {
	      var xform = transducer(transformForObserver(o));
	      return source.subscribe(
	        function(v) {
	          var res = tryCatch(xform['@@transducer/step']).call(xform, o, v);
	          if (res === errorObj) { o.onError(res.e); }
	        },
	        function (e) { o.onError(e); },
	        function() { xform['@@transducer/result'](o); }
	      );
	    }, source);
	  };

	  /**
	   * Performs a exclusive waiting for the first to finish before subscribing to another observable.
	   * Observables that come in between subscriptions will be dropped on the floor.
	   * @returns {Observable} A exclusive observable with only the results that happen when subscribed.
	   */
	  observableProto.switchFirst = function () {
	    var sources = this;
	    return new AnonymousObservable(function (o) {
	      var hasCurrent = false,
	        isStopped = false,
	        m = new SingleAssignmentDisposable(),
	        g = new CompositeDisposable();

	      g.add(m);

	      m.setDisposable(sources.subscribe(
	        function (innerSource) {
	          if (!hasCurrent) {
	            hasCurrent = true;

	            isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));

	            var innerSubscription = new SingleAssignmentDisposable();
	            g.add(innerSubscription);

	            innerSubscription.setDisposable(innerSource.subscribe(
	              function (x) { o.onNext(x); },
	              function (e) { o.onError(e); },
	              function () {
	                g.remove(innerSubscription);
	                hasCurrent = false;
	                isStopped && g.length === 1 && o.onCompleted();
	            }));
	          }
	        },
	        function (e) { o.onError(e); },
	        function () {
	          isStopped = true;
	          !hasCurrent && g.length === 1 && o.onCompleted();
	        }));

	      return g;
	    }, this);
	  };

	observableProto.flatMapFirst = observableProto.selectManyFirst = function(selector, resultSelector, thisArg) {
	    return new FlatMapObservable(this, selector, resultSelector, thisArg).switchFirst();
	};

	Rx.Observable.prototype.flatMapWithMaxConcurrent = function(limit, selector, resultSelector, thisArg) {
	    return new FlatMapObservable(this, selector, resultSelector, thisArg).merge(limit);
	};
	  /** Provides a set of extension methods for virtual time scheduling. */
	  var VirtualTimeScheduler = Rx.VirtualTimeScheduler = (function (__super__) {

	    function localNow() {
	      return this.toDateTimeOffset(this.clock);
	    }

	    function scheduleNow(state, action) {
	      return this.scheduleAbsoluteWithState(state, this.clock, action);
	    }

	    function scheduleRelative(state, dueTime, action) {
	      return this.scheduleRelativeWithState(state, this.toRelative(dueTime), action);
	    }

	    function scheduleAbsolute(state, dueTime, action) {
	      return this.scheduleRelativeWithState(state, this.toRelative(dueTime - this.now()), action);
	    }

	    function invokeAction(scheduler, action) {
	      action();
	      return disposableEmpty;
	    }

	    inherits(VirtualTimeScheduler, __super__);

	    /**
	     * Creates a new virtual time scheduler with the specified initial clock value and absolute time comparer.
	     *
	     * @constructor
	     * @param {Number} initialClock Initial value for the clock.
	     * @param {Function} comparer Comparer to determine causality of events based on absolute time.
	     */
	    function VirtualTimeScheduler(initialClock, comparer) {
	      this.clock = initialClock;
	      this.comparer = comparer;
	      this.isEnabled = false;
	      this.queue = new PriorityQueue(1024);
	      __super__.call(this, localNow, scheduleNow, scheduleRelative, scheduleAbsolute);
	    }

	    var VirtualTimeSchedulerPrototype = VirtualTimeScheduler.prototype;

	    /**
	     * Adds a relative time value to an absolute time value.
	     * @param {Number} absolute Absolute virtual time value.
	     * @param {Number} relative Relative virtual time value to add.
	     * @return {Number} Resulting absolute virtual time sum value.
	     */
	    VirtualTimeSchedulerPrototype.add = notImplemented;

	    /**
	     * Converts an absolute time to a number
	     * @param {Any} The absolute time.
	     * @returns {Number} The absolute time in ms
	     */
	    VirtualTimeSchedulerPrototype.toDateTimeOffset = notImplemented;

	    /**
	     * Converts the TimeSpan value to a relative virtual time value.
	     * @param {Number} timeSpan TimeSpan value to convert.
	     * @return {Number} Corresponding relative virtual time value.
	     */
	    VirtualTimeSchedulerPrototype.toRelative = notImplemented;

	    /**
	     * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be emulated using recursive scheduling.
	     * @param {Mixed} state Initial state passed to the action upon the first iteration.
	     * @param {Number} period Period for running the work periodically.
	     * @param {Function} action Action to be executed, potentially updating the state.
	     * @returns {Disposable} The disposable object used to cancel the scheduled recurring action (best effort).
	     */
	    VirtualTimeSchedulerPrototype.schedulePeriodicWithState = function (state, period, action) {
	      var s = new SchedulePeriodicRecursive(this, state, period, action);
	      return s.start();
	    };

	    /**
	     * Schedules an action to be executed after dueTime.
	     * @param {Mixed} state State passed to the action to be executed.
	     * @param {Number} dueTime Relative time after which to execute the action.
	     * @param {Function} action Action to be executed.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    VirtualTimeSchedulerPrototype.scheduleRelativeWithState = function (state, dueTime, action) {
	      var runAt = this.add(this.clock, dueTime);
	      return this.scheduleAbsoluteWithState(state, runAt, action);
	    };

	    /**
	     * Schedules an action to be executed at dueTime.
	     * @param {Number} dueTime Relative time after which to execute the action.
	     * @param {Function} action Action to be executed.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    VirtualTimeSchedulerPrototype.scheduleRelative = function (dueTime, action) {
	      return this.scheduleRelativeWithState(action, dueTime, invokeAction);
	    };

	    /**
	     * Starts the virtual time scheduler.
	     */
	    VirtualTimeSchedulerPrototype.start = function () {
	      if (!this.isEnabled) {
	        this.isEnabled = true;
	        do {
	          var next = this.getNext();
	          if (next !== null) {
	            this.comparer(next.dueTime, this.clock) > 0 && (this.clock = next.dueTime);
	            next.invoke();
	          } else {
	            this.isEnabled = false;
	          }
	        } while (this.isEnabled);
	      }
	    };

	    /**
	     * Stops the virtual time scheduler.
	     */
	    VirtualTimeSchedulerPrototype.stop = function () {
	      this.isEnabled = false;
	    };

	    /**
	     * Advances the scheduler's clock to the specified time, running all work till that point.
	     * @param {Number} time Absolute time to advance the scheduler's clock to.
	     */
	    VirtualTimeSchedulerPrototype.advanceTo = function (time) {
	      var dueToClock = this.comparer(this.clock, time);
	      if (this.comparer(this.clock, time) > 0) { throw new ArgumentOutOfRangeError(); }
	      if (dueToClock === 0) { return; }
	      if (!this.isEnabled) {
	        this.isEnabled = true;
	        do {
	          var next = this.getNext();
	          if (next !== null && this.comparer(next.dueTime, time) <= 0) {
	            this.comparer(next.dueTime, this.clock) > 0 && (this.clock = next.dueTime);
	            next.invoke();
	          } else {
	            this.isEnabled = false;
	          }
	        } while (this.isEnabled);
	        this.clock = time;
	      }
	    };

	    /**
	     * Advances the scheduler's clock by the specified relative time, running all work scheduled for that timespan.
	     * @param {Number} time Relative time to advance the scheduler's clock by.
	     */
	    VirtualTimeSchedulerPrototype.advanceBy = function (time) {
	      var dt = this.add(this.clock, time),
	          dueToClock = this.comparer(this.clock, dt);
	      if (dueToClock > 0) { throw new ArgumentOutOfRangeError(); }
	      if (dueToClock === 0) {  return; }

	      this.advanceTo(dt);
	    };

	    /**
	     * Advances the scheduler's clock by the specified relative time.
	     * @param {Number} time Relative time to advance the scheduler's clock by.
	     */
	    VirtualTimeSchedulerPrototype.sleep = function (time) {
	      var dt = this.add(this.clock, time);
	      if (this.comparer(this.clock, dt) >= 0) { throw new ArgumentOutOfRangeError(); }

	      this.clock = dt;
	    };

	    /**
	     * Gets the next scheduled item to be executed.
	     * @returns {ScheduledItem} The next scheduled item.
	     */
	    VirtualTimeSchedulerPrototype.getNext = function () {
	      while (this.queue.length > 0) {
	        var next = this.queue.peek();
	        if (next.isCancelled()) {
	          this.queue.dequeue();
	        } else {
	          return next;
	        }
	      }
	      return null;
	    };

	    /**
	     * Schedules an action to be executed at dueTime.
	     * @param {Scheduler} scheduler Scheduler to execute the action on.
	     * @param {Number} dueTime Absolute time at which to execute the action.
	     * @param {Function} action Action to be executed.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    VirtualTimeSchedulerPrototype.scheduleAbsolute = function (dueTime, action) {
	      return this.scheduleAbsoluteWithState(action, dueTime, invokeAction);
	    };

	    /**
	     * Schedules an action to be executed at dueTime.
	     * @param {Mixed} state State passed to the action to be executed.
	     * @param {Number} dueTime Absolute time at which to execute the action.
	     * @param {Function} action Action to be executed.
	     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
	     */
	    VirtualTimeSchedulerPrototype.scheduleAbsoluteWithState = function (state, dueTime, action) {
	      var self = this;

	      function run(scheduler, state1) {
	        self.queue.remove(si);
	        return action(scheduler, state1);
	      }

	      var si = new ScheduledItem(this, state, run, dueTime, this.comparer);
	      this.queue.enqueue(si);

	      return si.disposable;
	    };

	    return VirtualTimeScheduler;
	  }(Scheduler));

	  /** Provides a virtual time scheduler that uses Date for absolute time and number for relative time. */
	  Rx.HistoricalScheduler = (function (__super__) {
	    inherits(HistoricalScheduler, __super__);

	    /**
	     * Creates a new historical scheduler with the specified initial clock value.
	     * @constructor
	     * @param {Number} initialClock Initial value for the clock.
	     * @param {Function} comparer Comparer to determine causality of events based on absolute time.
	     */
	    function HistoricalScheduler(initialClock, comparer) {
	      var clock = initialClock == null ? 0 : initialClock;
	      var cmp = comparer || defaultSubComparer;
	      __super__.call(this, clock, cmp);
	    }

	    var HistoricalSchedulerProto = HistoricalScheduler.prototype;

	    /**
	     * Adds a relative time value to an absolute time value.
	     * @param {Number} absolute Absolute virtual time value.
	     * @param {Number} relative Relative virtual time value to add.
	     * @return {Number} Resulting absolute virtual time sum value.
	     */
	    HistoricalSchedulerProto.add = function (absolute, relative) {
	      return absolute + relative;
	    };

	    HistoricalSchedulerProto.toDateTimeOffset = function (absolute) {
	      return new Date(absolute).getTime();
	    };

	    /**
	     * Converts the TimeSpan value to a relative virtual time value.
	     * @memberOf HistoricalScheduler
	     * @param {Number} timeSpan TimeSpan value to convert.
	     * @return {Number} Corresponding relative virtual time value.
	     */
	    HistoricalSchedulerProto.toRelative = function (timeSpan) {
	      return timeSpan;
	    };

	    return HistoricalScheduler;
	  }(Rx.VirtualTimeScheduler));

	  var AnonymousObservable = Rx.AnonymousObservable = (function (__super__) {
	    inherits(AnonymousObservable, __super__);

	    // Fix subscriber to check for undefined or function returned to decorate as Disposable
	    function fixSubscriber(subscriber) {
	      return subscriber && isFunction(subscriber.dispose) ? subscriber :
	        isFunction(subscriber) ? disposableCreate(subscriber) : disposableEmpty;
	    }

	    function setDisposable(s, state) {
	      var ado = state[0], self = state[1];
	      var sub = tryCatch(self.__subscribe).call(self, ado);

	      if (sub === errorObj) {
	        if(!ado.fail(errorObj.e)) { return thrower(errorObj.e); }
	      }
	      ado.setDisposable(fixSubscriber(sub));
	    }

	    function innerSubscribe(observer) {
	      var ado = new AutoDetachObserver(observer), state = [ado, this];

	      if (currentThreadScheduler.scheduleRequired()) {
	        currentThreadScheduler.scheduleWithState(state, setDisposable);
	      } else {
	        setDisposable(null, state);
	      }
	      return ado;
	    }

	    function AnonymousObservable(subscribe, parent) {
	      this.source = parent;
	      this.__subscribe = subscribe;
	      __super__.call(this, innerSubscribe);
	    }

	    return AnonymousObservable;

	  }(Observable));

	  var AutoDetachObserver = (function (__super__) {
	    inherits(AutoDetachObserver, __super__);

	    function AutoDetachObserver(observer) {
	      __super__.call(this);
	      this.observer = observer;
	      this.m = new SingleAssignmentDisposable();
	    }

	    var AutoDetachObserverPrototype = AutoDetachObserver.prototype;

	    AutoDetachObserverPrototype.next = function (value) {
	      var result = tryCatch(this.observer.onNext).call(this.observer, value);
	      if (result === errorObj) {
	        this.dispose();
	        thrower(result.e);
	      }
	    };

	    AutoDetachObserverPrototype.error = function (err) {
	      var result = tryCatch(this.observer.onError).call(this.observer, err);
	      this.dispose();
	      result === errorObj && thrower(result.e);
	    };

	    AutoDetachObserverPrototype.completed = function () {
	      var result = tryCatch(this.observer.onCompleted).call(this.observer);
	      this.dispose();
	      result === errorObj && thrower(result.e);
	    };

	    AutoDetachObserverPrototype.setDisposable = function (value) { this.m.setDisposable(value); };
	    AutoDetachObserverPrototype.getDisposable = function () { return this.m.getDisposable(); };

	    AutoDetachObserverPrototype.dispose = function () {
	      __super__.prototype.dispose.call(this);
	      this.m.dispose();
	    };

	    return AutoDetachObserver;
	  }(AbstractObserver));

	  var GroupedObservable = (function (__super__) {
	    inherits(GroupedObservable, __super__);

	    function subscribe(observer) {
	      return this.underlyingObservable.subscribe(observer);
	    }

	    function GroupedObservable(key, underlyingObservable, mergedDisposable) {
	      __super__.call(this, subscribe);
	      this.key = key;
	      this.underlyingObservable = !mergedDisposable ?
	        underlyingObservable :
	        new AnonymousObservable(function (observer) {
	          return new CompositeDisposable(mergedDisposable.getDisposable(), underlyingObservable.subscribe(observer));
	        });
	    }

	    return GroupedObservable;
	  }(Observable));

	  /**
	   *  Represents an object that is both an observable sequence as well as an observer.
	   *  Each notification is broadcasted to all subscribed observers.
	   */
	  var Subject = Rx.Subject = (function (__super__) {
	    function subscribe(observer) {
	      checkDisposed(this);
	      if (!this.isStopped) {
	        this.observers.push(observer);
	        return new InnerSubscription(this, observer);
	      }
	      if (this.hasError) {
	        observer.onError(this.error);
	        return disposableEmpty;
	      }
	      observer.onCompleted();
	      return disposableEmpty;
	    }

	    inherits(Subject, __super__);

	    /**
	     * Creates a subject.
	     */
	    function Subject() {
	      __super__.call(this, subscribe);
	      this.isDisposed = false,
	      this.isStopped = false,
	      this.observers = [];
	      this.hasError = false;
	    }

	    addProperties(Subject.prototype, Observer.prototype, {
	      /**
	       * Indicates whether the subject has observers subscribed to it.
	       * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
	       */
	      hasObservers: function () { return this.observers.length > 0; },
	      /**
	       * Notifies all subscribed observers about the end of the sequence.
	       */
	      onCompleted: function () {
	        checkDisposed(this);
	        if (!this.isStopped) {
	          this.isStopped = true;
	          for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
	            os[i].onCompleted();
	          }

	          this.observers.length = 0;
	        }
	      },
	      /**
	       * Notifies all subscribed observers about the exception.
	       * @param {Mixed} error The exception to send to all observers.
	       */
	      onError: function (error) {
	        checkDisposed(this);
	        if (!this.isStopped) {
	          this.isStopped = true;
	          this.error = error;
	          this.hasError = true;
	          for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
	            os[i].onError(error);
	          }

	          this.observers.length = 0;
	        }
	      },
	      /**
	       * Notifies all subscribed observers about the arrival of the specified element in the sequence.
	       * @param {Mixed} value The value to send to all observers.
	       */
	      onNext: function (value) {
	        checkDisposed(this);
	        if (!this.isStopped) {
	          for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
	            os[i].onNext(value);
	          }
	        }
	      },
	      /**
	       * Unsubscribe all observers and release resources.
	       */
	      dispose: function () {
	        this.isDisposed = true;
	        this.observers = null;
	      }
	    });

	    /**
	     * Creates a subject from the specified observer and observable.
	     * @param {Observer} observer The observer used to send messages to the subject.
	     * @param {Observable} observable The observable used to subscribe to messages sent from the subject.
	     * @returns {Subject} Subject implemented using the given observer and observable.
	     */
	    Subject.create = function (observer, observable) {
	      return new AnonymousSubject(observer, observable);
	    };

	    return Subject;
	  }(Observable));

	  /**
	   *  Represents the result of an asynchronous operation.
	   *  The last value before the OnCompleted notification, or the error received through OnError, is sent to all subscribed observers.
	   */
	  var AsyncSubject = Rx.AsyncSubject = (function (__super__) {

	    function subscribe(observer) {
	      checkDisposed(this);

	      if (!this.isStopped) {
	        this.observers.push(observer);
	        return new InnerSubscription(this, observer);
	      }

	      if (this.hasError) {
	        observer.onError(this.error);
	      } else if (this.hasValue) {
	        observer.onNext(this.value);
	        observer.onCompleted();
	      } else {
	        observer.onCompleted();
	      }

	      return disposableEmpty;
	    }

	    inherits(AsyncSubject, __super__);

	    /**
	     * Creates a subject that can only receive one value and that value is cached for all future observations.
	     * @constructor
	     */
	    function AsyncSubject() {
	      __super__.call(this, subscribe);

	      this.isDisposed = false;
	      this.isStopped = false;
	      this.hasValue = false;
	      this.observers = [];
	      this.hasError = false;
	    }

	    addProperties(AsyncSubject.prototype, Observer, {
	      /**
	       * Indicates whether the subject has observers subscribed to it.
	       * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
	       */
	      hasObservers: function () {
	        checkDisposed(this);
	        return this.observers.length > 0;
	      },
	      /**
	       * Notifies all subscribed observers about the end of the sequence, also causing the last received value to be sent out (if any).
	       */
	      onCompleted: function () {
	        var i, len;
	        checkDisposed(this);
	        if (!this.isStopped) {
	          this.isStopped = true;
	          var os = cloneArray(this.observers), len = os.length;

	          if (this.hasValue) {
	            for (i = 0; i < len; i++) {
	              var o = os[i];
	              o.onNext(this.value);
	              o.onCompleted();
	            }
	          } else {
	            for (i = 0; i < len; i++) {
	              os[i].onCompleted();
	            }
	          }

	          this.observers.length = 0;
	        }
	      },
	      /**
	       * Notifies all subscribed observers about the error.
	       * @param {Mixed} error The Error to send to all observers.
	       */
	      onError: function (error) {
	        checkDisposed(this);
	        if (!this.isStopped) {
	          this.isStopped = true;
	          this.hasError = true;
	          this.error = error;

	          for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
	            os[i].onError(error);
	          }

	          this.observers.length = 0;
	        }
	      },
	      /**
	       * Sends a value to the subject. The last value received before successful termination will be sent to all subscribed and future observers.
	       * @param {Mixed} value The value to store in the subject.
	       */
	      onNext: function (value) {
	        checkDisposed(this);
	        if (this.isStopped) { return; }
	        this.value = value;
	        this.hasValue = true;
	      },
	      /**
	       * Unsubscribe all observers and release resources.
	       */
	      dispose: function () {
	        this.isDisposed = true;
	        this.observers = null;
	        this.exception = null;
	        this.value = null;
	      }
	    });

	    return AsyncSubject;
	  }(Observable));

	  var AnonymousSubject = Rx.AnonymousSubject = (function (__super__) {
	    inherits(AnonymousSubject, __super__);

	    function subscribe(observer) {
	      return this.observable.subscribe(observer);
	    }

	    function AnonymousSubject(observer, observable) {
	      this.observer = observer;
	      this.observable = observable;
	      __super__.call(this, subscribe);
	    }

	    addProperties(AnonymousSubject.prototype, Observer.prototype, {
	      onCompleted: function () {
	        this.observer.onCompleted();
	      },
	      onError: function (error) {
	        this.observer.onError(error);
	      },
	      onNext: function (value) {
	        this.observer.onNext(value);
	      }
	    });

	    return AnonymousSubject;
	  }(Observable));

	  /**
	  * Used to pause and resume streams.
	  */
	  Rx.Pauser = (function (__super__) {
	    inherits(Pauser, __super__);

	    function Pauser() {
	      __super__.call(this);
	    }

	    /**
	     * Pauses the underlying sequence.
	     */
	    Pauser.prototype.pause = function () { this.onNext(false); };

	    /**
	    * Resumes the underlying sequence.
	    */
	    Pauser.prototype.resume = function () { this.onNext(true); };

	    return Pauser;
	  }(Subject));

	  if (true) {
	    root.Rx = Rx;

	    !(__WEBPACK_AMD_DEFINE_RESULT__ = function() {
	      return Rx;
	    }.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	  } else if (freeExports && freeModule) {
	    // in Node.js or RingoJS
	    if (moduleExports) {
	      (freeModule.exports = Rx).Rx = Rx;
	    } else {
	      freeExports.Rx = Rx;
	    }
	  } else {
	    // in a browser or Rhino
	    root.Rx = Rx;
	  }

	  // All code before this point will be filtered from stack traces.
	  var rEndingLine = captureLine();

	}.call(this));

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)(module), (function() { return this; }()), __webpack_require__(4)))

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ },
/* 4 */
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
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module) {// Generated by CoffeeScript 1.9.3
	(function() {
	  var L_to_Y, Y_to_L, conv, distanceFromPole, dotProduct, epsilon, fromLinear, getBounds, intersectLineLine, kappa, lengthOfRayUntilIntersect, m, m_inv, maxChromaForLH, maxSafeChromaForL, refU, refV, root, toLinear;

	  m = {
	    R: [3.2409699419045214, -1.5373831775700935, -0.49861076029300328],
	    G: [-0.96924363628087983, 1.8759675015077207, 0.041555057407175613],
	    B: [0.055630079696993609, -0.20397695888897657, 1.0569715142428786]
	  };

	  m_inv = {
	    X: [0.41239079926595948, 0.35758433938387796, 0.18048078840183429],
	    Y: [0.21263900587151036, 0.71516867876775593, 0.072192315360733715],
	    Z: [0.019330818715591851, 0.11919477979462599, 0.95053215224966058]
	  };

	  refU = 0.19783000664283681;

	  refV = 0.468319994938791;

	  kappa = 903.2962962962963;

	  epsilon = 0.0088564516790356308;

	  getBounds = function(L) {
	    var bottom, channel, j, k, len1, len2, m1, m2, m3, ref, ref1, ref2, ret, sub1, sub2, t, top1, top2;
	    sub1 = Math.pow(L + 16, 3) / 1560896;
	    sub2 = sub1 > epsilon ? sub1 : L / kappa;
	    ret = [];
	    ref = ['R', 'G', 'B'];
	    for (j = 0, len1 = ref.length; j < len1; j++) {
	      channel = ref[j];
	      ref1 = m[channel], m1 = ref1[0], m2 = ref1[1], m3 = ref1[2];
	      ref2 = [0, 1];
	      for (k = 0, len2 = ref2.length; k < len2; k++) {
	        t = ref2[k];
	        top1 = (284517 * m1 - 94839 * m3) * sub2;
	        top2 = (838422 * m3 + 769860 * m2 + 731718 * m1) * L * sub2 - 769860 * t * L;
	        bottom = (632260 * m3 - 126452 * m2) * sub2 + 126452 * t;
	        ret.push([top1 / bottom, top2 / bottom]);
	      }
	    }
	    return ret;
	  };

	  intersectLineLine = function(line1, line2) {
	    return (line1[1] - line2[1]) / (line2[0] - line1[0]);
	  };

	  distanceFromPole = function(point) {
	    return Math.sqrt(Math.pow(point[0], 2) + Math.pow(point[1], 2));
	  };

	  lengthOfRayUntilIntersect = function(theta, line) {
	    var b1, len, m1;
	    m1 = line[0], b1 = line[1];
	    len = b1 / (Math.sin(theta) - m1 * Math.cos(theta));
	    if (len < 0) {
	      return null;
	    }
	    return len;
	  };

	  maxSafeChromaForL = function(L) {
	    var b1, j, len1, lengths, m1, ref, ref1, x;
	    lengths = [];
	    ref = getBounds(L);
	    for (j = 0, len1 = ref.length; j < len1; j++) {
	      ref1 = ref[j], m1 = ref1[0], b1 = ref1[1];
	      x = intersectLineLine([m1, b1], [-1 / m1, 0]);
	      lengths.push(distanceFromPole([x, b1 + x * m1]));
	    }
	    return Math.min.apply(Math, lengths);
	  };

	  maxChromaForLH = function(L, H) {
	    var hrad, j, l, len1, lengths, line, ref;
	    hrad = H / 360 * Math.PI * 2;
	    lengths = [];
	    ref = getBounds(L);
	    for (j = 0, len1 = ref.length; j < len1; j++) {
	      line = ref[j];
	      l = lengthOfRayUntilIntersect(hrad, line);
	      if (l !== null) {
	        lengths.push(l);
	      }
	    }
	    return Math.min.apply(Math, lengths);
	  };

	  dotProduct = function(a, b) {
	    var i, j, ref, ret;
	    ret = 0;
	    for (i = j = 0, ref = a.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
	      ret += a[i] * b[i];
	    }
	    return ret;
	  };

	  fromLinear = function(c) {
	    if (c <= 0.0031308) {
	      return 12.92 * c;
	    } else {
	      return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
	    }
	  };

	  toLinear = function(c) {
	    var a;
	    a = 0.055;
	    if (c > 0.04045) {
	      return Math.pow((c + a) / (1 + a), 2.4);
	    } else {
	      return c / 12.92;
	    }
	  };

	  conv = {
	    'xyz': {},
	    'luv': {},
	    'lch': {},
	    'husl': {},
	    'huslp': {},
	    'rgb': {},
	    'hex': {}
	  };

	  conv.xyz.rgb = function(tuple) {
	    var B, G, R;
	    R = fromLinear(dotProduct(m.R, tuple));
	    G = fromLinear(dotProduct(m.G, tuple));
	    B = fromLinear(dotProduct(m.B, tuple));
	    return [R, G, B];
	  };

	  conv.rgb.xyz = function(tuple) {
	    var B, G, R, X, Y, Z, rgbl;
	    R = tuple[0], G = tuple[1], B = tuple[2];
	    rgbl = [toLinear(R), toLinear(G), toLinear(B)];
	    X = dotProduct(m_inv.X, rgbl);
	    Y = dotProduct(m_inv.Y, rgbl);
	    Z = dotProduct(m_inv.Z, rgbl);
	    return [X, Y, Z];
	  };

	  Y_to_L = function(Y) {
	    if (Y <= epsilon) {
	      return Y * kappa;
	    } else {
	      return 116 * Math.pow(Y, 1 / 3) - 16;
	    }
	  };

	  L_to_Y = function(L) {
	    if (L <= 8) {
	      return L / kappa;
	    } else {
	      return Math.pow((L + 16) / 116, 3);
	    }
	  };

	  conv.xyz.luv = function(tuple) {
	    var L, U, V, X, Y, Z, varU, varV;
	    X = tuple[0], Y = tuple[1], Z = tuple[2];
	    if (Y === 0) {
	      return [0, 0, 0];
	    }
	    L = Y_to_L(Y);
	    varU = (4 * X) / (X + (15 * Y) + (3 * Z));
	    varV = (9 * Y) / (X + (15 * Y) + (3 * Z));
	    U = 13 * L * (varU - refU);
	    V = 13 * L * (varV - refV);
	    return [L, U, V];
	  };

	  conv.luv.xyz = function(tuple) {
	    var L, U, V, X, Y, Z, varU, varV;
	    L = tuple[0], U = tuple[1], V = tuple[2];
	    if (L === 0) {
	      return [0, 0, 0];
	    }
	    varU = U / (13 * L) + refU;
	    varV = V / (13 * L) + refV;
	    Y = L_to_Y(L);
	    X = 0 - (9 * Y * varU) / ((varU - 4) * varV - varU * varV);
	    Z = (9 * Y - (15 * varV * Y) - (varV * X)) / (3 * varV);
	    return [X, Y, Z];
	  };

	  conv.luv.lch = function(tuple) {
	    var C, H, Hrad, L, U, V;
	    L = tuple[0], U = tuple[1], V = tuple[2];
	    C = Math.sqrt(Math.pow(U, 2) + Math.pow(V, 2));
	    if (C < 0.00000001) {
	      H = 0;
	    } else {
	      Hrad = Math.atan2(V, U);
	      H = Hrad * 360 / 2 / Math.PI;
	      if (H < 0) {
	        H = 360 + H;
	      }
	    }
	    return [L, C, H];
	  };

	  conv.lch.luv = function(tuple) {
	    var C, H, Hrad, L, U, V;
	    L = tuple[0], C = tuple[1], H = tuple[2];
	    Hrad = H / 360 * 2 * Math.PI;
	    U = Math.cos(Hrad) * C;
	    V = Math.sin(Hrad) * C;
	    return [L, U, V];
	  };

	  conv.husl.lch = function(tuple) {
	    var C, H, L, S, max;
	    H = tuple[0], S = tuple[1], L = tuple[2];
	    if (L > 99.9999999 || L < 0.00000001) {
	      C = 0;
	    } else {
	      max = maxChromaForLH(L, H);
	      C = max / 100 * S;
	    }
	    return [L, C, H];
	  };

	  conv.lch.husl = function(tuple) {
	    var C, H, L, S, max;
	    L = tuple[0], C = tuple[1], H = tuple[2];
	    if (L > 99.9999999 || L < 0.00000001) {
	      S = 0;
	    } else {
	      max = maxChromaForLH(L, H);
	      S = C / max * 100;
	    }
	    return [H, S, L];
	  };

	  conv.huslp.lch = function(tuple) {
	    var C, H, L, S, max;
	    H = tuple[0], S = tuple[1], L = tuple[2];
	    if (L > 99.9999999 || L < 0.00000001) {
	      C = 0;
	    } else {
	      max = maxSafeChromaForL(L);
	      C = max / 100 * S;
	    }
	    return [L, C, H];
	  };

	  conv.lch.huslp = function(tuple) {
	    var C, H, L, S, max;
	    L = tuple[0], C = tuple[1], H = tuple[2];
	    if (L > 99.9999999 || L < 0.00000001) {
	      S = 0;
	    } else {
	      max = maxSafeChromaForL(L);
	      S = C / max * 100;
	    }
	    return [H, S, L];
	  };

	  conv.rgb.hex = function(tuple) {
	    var ch, hex, j, len1;
	    hex = "#";
	    for (j = 0, len1 = tuple.length; j < len1; j++) {
	      ch = tuple[j];
	      ch = Math.round(ch * 1e6) / 1e6;
	      if (ch < 0 || ch > 1) {
	        throw new Error("Illegal rgb value: " + ch);
	      }
	      ch = Math.round(ch * 255).toString(16);
	      if (ch.length === 1) {
	        ch = "0" + ch;
	      }
	      hex += ch;
	    }
	    return hex;
	  };

	  conv.hex.rgb = function(hex) {
	    var b, g, j, len1, n, r, ref, results;
	    if (hex.charAt(0) === "#") {
	      hex = hex.substring(1, 7);
	    }
	    r = hex.substring(0, 2);
	    g = hex.substring(2, 4);
	    b = hex.substring(4, 6);
	    ref = [r, g, b];
	    results = [];
	    for (j = 0, len1 = ref.length; j < len1; j++) {
	      n = ref[j];
	      results.push(parseInt(n, 16) / 255);
	    }
	    return results;
	  };

	  conv.lch.rgb = function(tuple) {
	    return conv.xyz.rgb(conv.luv.xyz(conv.lch.luv(tuple)));
	  };

	  conv.rgb.lch = function(tuple) {
	    return conv.luv.lch(conv.xyz.luv(conv.rgb.xyz(tuple)));
	  };

	  conv.husl.rgb = function(tuple) {
	    return conv.lch.rgb(conv.husl.lch(tuple));
	  };

	  conv.rgb.husl = function(tuple) {
	    return conv.lch.husl(conv.rgb.lch(tuple));
	  };

	  conv.huslp.rgb = function(tuple) {
	    return conv.lch.rgb(conv.huslp.lch(tuple));
	  };

	  conv.rgb.huslp = function(tuple) {
	    return conv.lch.huslp(conv.rgb.lch(tuple));
	  };

	  root = {};

	  root.fromRGB = function(R, G, B) {
	    return conv.rgb.husl([R, G, B]);
	  };

	  root.fromHex = function(hex) {
	    return conv.rgb.husl(conv.hex.rgb(hex));
	  };

	  root.toRGB = function(H, S, L) {
	    return conv.husl.rgb([H, S, L]);
	  };

	  root.toHex = function(H, S, L) {
	    return conv.rgb.hex(conv.husl.rgb([H, S, L]));
	  };

	  root.p = {};

	  root.p.toRGB = function(H, S, L) {
	    return conv.xyz.rgb(conv.luv.xyz(conv.lch.luv(conv.huslp.lch([H, S, L]))));
	  };

	  root.p.toHex = function(H, S, L) {
	    return conv.rgb.hex(conv.xyz.rgb(conv.luv.xyz(conv.lch.luv(conv.huslp.lch([H, S, L])))));
	  };

	  root.p.fromRGB = function(R, G, B) {
	    return conv.lch.huslp(conv.luv.lch(conv.xyz.luv(conv.rgb.xyz([R, G, B]))));
	  };

	  root.p.fromHex = function(hex) {
	    return conv.lch.huslp(conv.luv.lch(conv.xyz.luv(conv.rgb.xyz(conv.hex.rgb(hex)))));
	  };

	  root._conv = conv;

	  root._getBounds = getBounds;

	  root._maxChromaForLH = maxChromaForLH;

	  root._maxSafeChromaForL = maxSafeChromaForL;

	  if (!((typeof module !== "undefined" && module !== null) || (typeof jQuery !== "undefined" && jQuery !== null) || (typeof requirejs !== "undefined" && requirejs !== null))) {
	    this.HUSL = root;
	  }

	  if (typeof module !== "undefined" && module !== null) {
	    module.exports = root;
	  }

	  if (typeof jQuery !== "undefined" && jQuery !== null) {
	    jQuery.husl = root;
	  }

	  if ((typeof requirejs !== "undefined" && requirejs !== null) && ("function" !== "undefined" && __webpack_require__(6) !== null)) {
	    !(__WEBPACK_AMD_DEFINE_FACTORY__ = (root), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	  }

	}).call(this);

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)(module)))

/***/ },
/* 6 */
/***/ function(module, exports) {

	module.exports = function() { throw new Error("define cannot be used indirect"); };


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(8);


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {/*
	  GIFEncoder.js

	  Authors
	  Kevin Weiner (original Java version - kweiner@fmsware.com)
	  Thibault Imbert (AS3 version - bytearray.org)
	  Johan Nordberg (JS version - code@johan-nordberg.com)
	  Eugene Ware (node.js streaming version - eugene@noblesmaurai.com)
	*/

	var stream = __webpack_require__(13);
	var NeuQuant = __webpack_require__(31);
	var LZWEncoder = __webpack_require__(32);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9).Buffer))

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer, global) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
	/* eslint-disable no-proto */

	var base64 = __webpack_require__(10)
	var ieee754 = __webpack_require__(11)
	var isArray = __webpack_require__(12)

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9).Buffer, (function() { return this; }())))

/***/ },
/* 10 */
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
/* 11 */
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
/* 12 */
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
/* 13 */
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

	var EE = __webpack_require__(14).EventEmitter;
	var inherits = __webpack_require__(15);

	inherits(Stream, EE);
	Stream.Readable = __webpack_require__(16);
	Stream.Writable = __webpack_require__(27);
	Stream.Duplex = __webpack_require__(28);
	Stream.Transform = __webpack_require__(29);
	Stream.PassThrough = __webpack_require__(30);

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
/* 14 */
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
/* 15 */
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
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(17);
	exports.Stream = __webpack_require__(13);
	exports.Readable = exports;
	exports.Writable = __webpack_require__(23);
	exports.Duplex = __webpack_require__(22);
	exports.Transform = __webpack_require__(25);
	exports.PassThrough = __webpack_require__(26);


/***/ },
/* 17 */
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
	var isArray = __webpack_require__(18);
	/*</replacement>*/


	/*<replacement>*/
	var Buffer = __webpack_require__(9).Buffer;
	/*</replacement>*/

	Readable.ReadableState = ReadableState;

	var EE = __webpack_require__(14).EventEmitter;

	/*<replacement>*/
	if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
	  return emitter.listeners(type).length;
	};
	/*</replacement>*/

	var Stream = __webpack_require__(13);

	/*<replacement>*/
	var util = __webpack_require__(19);
	util.inherits = __webpack_require__(20);
	/*</replacement>*/

	var StringDecoder;


	/*<replacement>*/
	var debug = __webpack_require__(21);
	if (debug && debug.debuglog) {
	  debug = debug.debuglog('stream');
	} else {
	  debug = function () {};
	}
	/*</replacement>*/


	util.inherits(Readable, Stream);

	function ReadableState(options, stream) {
	  var Duplex = __webpack_require__(22);

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
	      StringDecoder = __webpack_require__(24).StringDecoder;
	    this.decoder = new StringDecoder(options.encoding);
	    this.encoding = options.encoding;
	  }
	}

	function Readable(options) {
	  var Duplex = __webpack_require__(22);

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
	    StringDecoder = __webpack_require__(24).StringDecoder;
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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ },
/* 18 */
/***/ function(module, exports) {

	module.exports = Array.isArray || function (arr) {
	  return Object.prototype.toString.call(arr) == '[object Array]';
	};


/***/ },
/* 19 */
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
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9).Buffer))

/***/ },
/* 20 */
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
/* 21 */
/***/ function(module, exports) {

	/* (ignored) */

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
	var util = __webpack_require__(19);
	util.inherits = __webpack_require__(20);
	/*</replacement>*/

	var Readable = __webpack_require__(17);
	var Writable = __webpack_require__(23);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ },
/* 23 */
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
	var Buffer = __webpack_require__(9).Buffer;
	/*</replacement>*/

	Writable.WritableState = WritableState;


	/*<replacement>*/
	var util = __webpack_require__(19);
	util.inherits = __webpack_require__(20);
	/*</replacement>*/

	var Stream = __webpack_require__(13);

	util.inherits(Writable, Stream);

	function WriteReq(chunk, encoding, cb) {
	  this.chunk = chunk;
	  this.encoding = encoding;
	  this.callback = cb;
	}

	function WritableState(options, stream) {
	  var Duplex = __webpack_require__(22);

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
	  var Duplex = __webpack_require__(22);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

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

	var Buffer = __webpack_require__(9).Buffer;

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

	var Duplex = __webpack_require__(22);

	/*<replacement>*/
	var util = __webpack_require__(19);
	util.inherits = __webpack_require__(20);
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
/* 26 */
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

	var Transform = __webpack_require__(25);

	/*<replacement>*/
	var util = __webpack_require__(19);
	util.inherits = __webpack_require__(20);
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
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(23)


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(22)


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(25)


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(26)


/***/ },
/* 31 */
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
/* 32 */
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
/* 33 */
/***/ function(module, exports) {

	

/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	var should = __webpack_require__(35);

	var defaultProto = Object.prototype;
	var defaultProperty = 'should';

	//Expose api via `Object#should`.
	try {
	  var prevShould = should.extend(defaultProperty, defaultProto);
	  should._prevShould = prevShould;
	} catch(e) {
	  //ignore errors
	}

	module.exports = should;


/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */


	var util = __webpack_require__(36);

	/**
	 * Our function should
	 *
	 * @param {*} obj Object to assert
	 * @returns {should.Assertion} Returns new Assertion for beginning assertion chain
	 * @example
	 *
	 * var should = require('should');
	 * should('abc').be.a.String();
	 */
	var should = function should(obj) {
	  return (new should.Assertion(obj));
	};

	should.AssertionError = __webpack_require__(42);
	should.Assertion = __webpack_require__(43);

	should.format = util.format;
	should.type = __webpack_require__(37);
	should.util = util;

	/**
	 * Object with configuration.
	 * It contains such properties:
	 * * `checkProtoEql` boolean - Affect if `.eql` will check objects prototypes
	 * Also it can contain options for should-format.
	 *
	 * @type {Object}
	 * @memberOf should
	 * @static
	 * @example
	 *
	 * var a = { a: 10 }, b = Object.create(null);
	 * b.a = 10;
	 *
	 * a.should.be.eql(b);
	 * //not throws
	 *
	 * should.config.checkProtoEql = true;
	 * a.should.be.eql(b);
	 * //throws AssertionError: expected { a: 10 } to equal { a: 10 } (because A and B have different prototypes)
	 */
	should.config = __webpack_require__(39);

	//Expose should to external world.
	exports = module.exports = should;

	/**
	 * Allow to extend given prototype with should property using given name. This getter will **unwrap** all standard wrappers like `Number`, `Boolean`, `String`.
	 * Using `should(obj)` is the equivalent of using `obj.should` with known issues (like nulls and method calls etc).
	 *
	 * @param {string} [propertyName] Name of property to add. Default is `'should'`.
	 * @param {Object} [proto] Prototype to extend with. Default is `Object.prototype`.
	 * @memberOf should
	 * @returns {{ name: string, descriptor: Object, proto: Object }} Descriptor enough to return all back
	 * @static
	 * @example
	 *
	 * var prev = should.extend('must', Object.prototype);
	 *
	 * 'abc'.must.startWith('a');
	 *
	 * var should = should.noConflict(prev);
	 * should.not.exist(Object.prototype.must);
	 */
	should.extend = function(propertyName, proto) {
	  propertyName = propertyName || 'should';
	  proto = proto || Object.prototype;

	  var prevDescriptor = Object.getOwnPropertyDescriptor(proto, propertyName);

	  Object.defineProperty(proto, propertyName, {
	    set: function() {
	    },
	    get: function() {
	      return should(util.isWrapperType(this) ? this.valueOf() : this);
	    },
	    configurable: true
	  });

	  return { name: propertyName, descriptor: prevDescriptor, proto: proto };
	};

	/**
	 * Delete previous extension. If `desc` missing it will remove default extension.
	 *
	 * @param {{ name: string, descriptor: Object, proto: Object }} [desc] Returned from `should.extend` object
	 * @memberOf should
	 * @returns {Function} Returns should function
	 * @static
	 * @example
	 *
	 * var should = require('should').noConflict();
	 *
	 * should(Object.prototype).not.have.property('should');
	 *
	 * var prev = should.extend('must', Object.prototype);
	 * 'abc'.must.startWith('a');
	 * should.noConflict(prev);
	 *
	 * should(Object.prototype).not.have.property('must');
	 */
	should.noConflict = function(desc) {
	  desc = desc || should._prevShould;

	  if(desc) {
	    delete desc.proto[desc.name];

	    if(desc.descriptor) {
	      Object.defineProperty(desc.proto, desc.name, desc.descriptor);
	    }
	  }
	  return should;
	};

	/**
	 * Simple utility function for a bit more easier should assertion extension
	 * @param {Function} f So called plugin function. It should accept 2 arguments: `should` function and `Assertion` constructor
	 * @memberOf should
	 * @returns {Function} Returns `should` function
	 * @static
	 * @example
	 *
	 * should.use(function(should, Assertion) {
	 *   Assertion.add('asset', function() {
	 *      this.params = { operator: 'to be asset' };
	 *
	 *      this.obj.should.have.property('id').which.is.a.Number();
	 *      this.obj.should.have.property('path');
	 *  })
	 * })
	 */
	should.use = function(f) {
	  f(should, should.Assertion);
	  return this;
	};

	should
	  .use(__webpack_require__(44))
	  .use(__webpack_require__(48))
	  .use(__webpack_require__(49))
	  .use(__webpack_require__(50))
	  .use(__webpack_require__(51))
	  .use(__webpack_require__(52))
	  .use(__webpack_require__(53))
	  .use(__webpack_require__(54))
	  .use(__webpack_require__(55))
	  .use(__webpack_require__(56))
	  .use(__webpack_require__(57));


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */

	var type = __webpack_require__(37);
	var config = __webpack_require__(39);

	/**
	 * Check if given obj just a primitive type wrapper
	 * @param {Object} obj
	 * @returns {boolean}
	 * @private
	 */
	exports.isWrapperType = function(obj) {
	  return obj instanceof Number || obj instanceof String || obj instanceof Boolean;
	};

	exports.merge = function(a, b) {
	  if(a && b) {
	    for(var key in b) {
	      a[key] = b[key];
	    }
	  }
	  return a;
	};

	var hasOwnProperty = Object.prototype.hasOwnProperty;

	exports.forEach = function forEach(obj, f, context) {
	  if(exports.isGeneratorFunction(obj)) {
	    return forEach(obj(), f, context);
	  } else if (exports.isGeneratorObject(obj)) {
	    var value = obj.next();
	    while(!value.done) {
	      if(f.call(context, value.value, 'value', obj) === false)
	        return;
	      value = obj.next();
	    }
	  } else {
	    for(var prop in obj) {
	      if(hasOwnProperty.call(obj, prop)) {
	        if(f.call(context, obj[prop], prop, obj) === false)
	          return;
	      }
	    }
	  }
	};

	exports.some = function(obj, f, context) {
	  var res = false;
	  exports.forEach(obj, function(value, key) {
	    if(f.call(context, value, key, obj)) {
	      res = true;
	      return false;
	    }
	  }, context);
	  return res;
	};

	exports.isEmptyObject = function(obj) {
	  for(var prop in obj) {
	    if(hasOwnProperty.call(obj, prop)) {
	      return false;
	    }
	  }
	  return true;
	};

	exports.isIndexable = function(obj) {
	  var t = type(obj);
	  return (t.type === type.OBJECT && t.cls === type.ARRAY) ||
	   (t.type === type.OBJECT && t.cls === type.BUFFER) ||
	   (t.type === type.OBJECT && t.cls === type.ARGUMENTS) ||
	   (t.type === type.OBJECT && t.cls === type.ARRAY_BUFFER) ||
	   (t.type === type.OBJECT && t.cls === type.TYPED_ARRAY) ||
	   (t.type === type.OBJECT && t.cls === type.DATA_VIEW) ||
	   (t.type === type.OBJECT && t.cls === type.STRING) ||
	   (t.type === type.STRING);
	};

	exports.length = function(obj) {
	  var t = type(obj);
	  switch(t.type) {
	    case type.STRING:
	      return obj.length;
	    case type.OBJECT:
	      switch(t.cls) {
	        case type.ARRAY_BUFFER:
	        case type.TYPED_ARRAY:
	        case type.DATA_VIEW:
	          return obj.byteLength;

	        case type.ARRAY:
	        case type.BUFFER:
	        case type.ARGUMENTS:
	        case type.FUNCTION:
	          return obj.length;
	      }
	  }
	};

	exports.convertPropertyName = function(name) {
	  if(typeof name == 'symbol') {
	    return name;
	  } else {
	    return String(name);
	  }
	};

	exports.isGeneratorObject = function(obj) {
	  if(!obj) return false;

	  return typeof obj.next == 'function' &&
	          typeof obj[Symbol.iterator] == 'function' &&
	          obj[Symbol.iterator]() === obj;
	};

	//TODO find better way
	exports.isGeneratorFunction = function(f) {
	  if(typeof f != 'function') return false;

	  return /^function\s*\*\s*/.test(f.toString());
	};

	exports.format = function(value, opts) {
	  return config.getFormatter(opts).format(value);
	};

	exports.functionName = __webpack_require__(40).Formatter.functionName;

	exports.formatProp = function(value) {
	  return config.getFormatter().formatPropertyName(String(value));
	};


/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var toString = Object.prototype.toString;

	var types = __webpack_require__(38);

	/**
	 * Simple data function to store type information
	 * @param {string} type Usually what is returned from typeof
	 * @param {string} cls  Sanitized @Class via Object.prototype.toString
	 * @param {string} sub  If type and cls the same, and need to specify somehow
	 * @private
	 * @example
	 *
	 * //for null
	 * new Type('null');
	 *
	 * //for Date
	 * new Type('object', 'date');
	 *
	 * //for Uint8Array
	 *
	 * new Type('object', 'typed-array', 'uint8');
	 */
	function Type(type, cls, sub) {
	  this.type = type;
	  this.cls = cls;
	  this.sub = sub;
	}

	/**
	 * Function to store type checks
	 * @private
	 */
	function TypeChecker() {
	  this.checks = [];
	}

	TypeChecker.prototype = {
	  add: function(func) {
	    this.checks.push(func);
	    return this;
	  },

	  addTypeOf: function(type, res) {
	    return this.add(function(obj, tpeOf) {
	      if(tpeOf === type) {
	        return new Type(res);
	      }
	    });
	  },

	  addClass: function(cls, res, sub) {
	    return this.add(function(obj, tpeOf, objCls) {
	      if(objCls === cls) {
	        return new Type(types.OBJECT, res, sub);
	      }
	    });
	  },

	  getType: function(obj) {
	    var typeOf = typeof obj;
	    var cls = toString.call(obj);

	    for(var i = 0, l = this.checks.length; i < l; i++) {
	      var res = this.checks[i].call(this, obj, typeOf, cls);
	      if(typeof res !== 'undefined') return res;
	    }

	  }
	};

	var main = new TypeChecker();

	//TODO add iterators

	main
	  .addTypeOf(types.NUMBER, types.NUMBER)
	  .addTypeOf(types.UNDEFINED, types.UNDEFINED)
	  .addTypeOf(types.STRING, types.STRING)
	  .addTypeOf(types.BOOLEAN, types.BOOLEAN)
	  .addTypeOf(types.FUNCTION, types.FUNCTION)
	  .addTypeOf(types.SYMBOL, types.SYMBOL)
	  .add(function(obj, tpeOf) {
	    if(obj === null) return new Type(types.NULL);
	  })
	  .addClass('[object String]', types.STRING)
	  .addClass('[object Boolean]', types.BOOLEAN)
	  .addClass('[object Number]', types.NUMBER)
	  .addClass('[object Array]', types.ARRAY)
	  .addClass('[object RegExp]', types.REGEXP)
	  .addClass('[object Error]', types.ERROR)
	  .addClass('[object Date]', types.DATE)
	  .addClass('[object Arguments]', types.ARGUMENTS)
	  .addClass('[object Math]')
	  .addClass('[object JSON]')
	  .addClass('[object ArrayBuffer]', types.ARRAY_BUFFER)
	  .addClass('[object Int8Array]', types.TYPED_ARRAY, 'int8')
	  .addClass('[object Uint8Array]', types.TYPED_ARRAY, 'uint8')
	  .addClass('[object Uint8ClampedArray]', types.TYPED_ARRAY, 'uint8clamped')
	  .addClass('[object Int16Array]', types.TYPED_ARRAY, 'int16')
	  .addClass('[object Uint16Array]', types.TYPED_ARRAY, 'uint16')
	  .addClass('[object Int32Array]', types.TYPED_ARRAY, 'int32')
	  .addClass('[object Uint32Array]', types.TYPED_ARRAY, 'uint32')
	  .addClass('[object Float32Array]', types.TYPED_ARRAY, 'float32')
	  .addClass('[object Float64Array]', types.TYPED_ARRAY, 'float64')
	  .addClass('[object DataView]', types.DATA_VIEW)
	  .addClass('[object Map]', types.MAP)
	  .addClass('[object WeakMap]', types.WEAK_MAP)
	  .addClass('[object Set]', types.SET)
	  .addClass('[object WeakSet]', types.WEAK_SET)
	  .addClass('[object Promise]', types.PROMISE)
	  .addClass('[object Blob]', types.BLOB)
	  .addClass('[object File]', types.FILE)
	  .addClass('[object FileList]', types.FILE_LIST)
	  .addClass('[object XMLHttpRequest]', types.XHR)
	  .add(function(obj) {
	    if((typeof Promise === types.FUNCTION && obj instanceof Promise) ||
	        (typeof obj.then === types.FUNCTION)) {
	          return new Type(types.OBJECT, types.PROMISE);
	        }
	  })
	  .add(function(obj) {
	    if(typeof Buffer !== 'undefined' && obj instanceof Buffer) {
	      return new Type(types.OBJECT, types.BUFFER);
	    }
	  })
	  .add(function(obj) {
	    if(typeof Node !== 'undefined' && obj instanceof Node) {
	      return new Type(types.OBJECT, types.HTML_ELEMENT, obj.nodeName);
	    }
	  })
	  .add(function(obj) {
	    // probably at the begginging should be enough these checks
	    if(obj.Boolean === Boolean && obj.Number === Number && obj.String === String && obj.Date === Date) {
	      return new Type(types.OBJECT, types.HOST);
	    }
	  })
	  .add(function() {
	    return new Type(types.OBJECT);
	  });

	/**
	 * Get type information of anything
	 *
	 * @param  {any} obj Anything that could require type information
	 * @return {Type}    type info
	 */
	function getGlobalType(obj) {
	  return main.getType(obj);
	}

	getGlobalType.checker = main;
	getGlobalType.TypeChecker = TypeChecker;
	getGlobalType.Type = Type;

	Object.keys(types).forEach(function(typeName) {
	  getGlobalType[typeName] = types[typeName];
	});

	module.exports = getGlobalType;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9).Buffer))

/***/ },
/* 38 */
/***/ function(module, exports) {

	var types = {
	  NUMBER: 'number',
	  UNDEFINED: 'undefined',
	  STRING: 'string',
	  BOOLEAN: 'boolean',
	  OBJECT: 'object',
	  FUNCTION: 'function',
	  NULL: 'null',
	  ARRAY: 'array',
	  REGEXP: 'regexp',
	  DATE: 'date',
	  ERROR: 'error',
	  ARGUMENTS: 'arguments',
	  SYMBOL: 'symbol',
	  ARRAY_BUFFER: 'array-buffer',
	  TYPED_ARRAY: 'typed-array',
	  DATA_VIEW: 'data-view',
	  MAP: 'map',
	  SET: 'set',
	  WEAK_SET: 'weak-set',
	  WEAK_MAP: 'weak-map',
	  PROMISE: 'promise',

	// node buffer
	  BUFFER: 'buffer',

	// dom html element
	  HTML_ELEMENT: 'html-element',
	  HTML_ELEMENT_TEXT: 'html-element-text',
	  DOCUMENT: 'document',
	  WINDOW: 'window',
	  FILE: 'file',
	  FILE_LIST: 'file-list',
	  BLOB: 'blob',

	  HOST: 'host',

	  XHR: 'xhr'
	};

	module.exports = types;


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	var Formatter = __webpack_require__(40).Formatter;

	var config = {
	  checkProtoEql: false,

	  getFormatter: function(opts) {
	    return new Formatter(opts || config);
	  }
	};

	module.exports = config;


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	var getType = __webpack_require__(37);
	var util = __webpack_require__(41);

	function genKeysFunc(f) {
	  return function(value) {
	    var k = f(value);
	    k.sort();
	    return k;
	  };
	}


	function Formatter(opts) {
	  opts = opts || {};

	  this.seen = [];
	  this.keys = genKeysFunc(opts.keys === false ? Object.getOwnPropertyNames : Object.keys);

	  this.maxLineLength = typeof opts.maxLineLength === 'number' ? opts.maxLineLength : 60;
	  this.propSep = opts.propSep || ',';

	  this.isUTCdate = !!opts.isUTCdate;
	}

	Formatter.prototype = {
	  constructor: Formatter,

	  format: function(value) {
	    var t = getType(value);
	    var name1 = t.type, name2 = t.type;
	    if(t.cls) {
	      name1 += '_' + t.cls;
	      name2 += '_' + t.cls;
	    }
	    if(t.sub) {
	      name2 += '_' + t.sub;
	    }
	    var f = this['_format_' + name2] || this['_format_' + name1] || this['_format_' + t.type] || this.defaultFormat;
	    return f.call(this, value).trim();
	  },

	  _formatObject: function(value, opts) {
	    opts = opts || {};
	    var mainKeys = opts.keys || this.keys(value);

	    var len = 0;

	    var formatPropertyValue = opts.formatPropertyValue || this.formatPropertyValue;
	    var formatPropertyName = opts.formatPropertyName || this.formatPropertyName;
	    var keyValueSep = opts.keyValueSep || ': ';
	    var keyFilter = opts.keyFilter || function() { return true; };

	    this.seen.push(value);
	    var keys = [];

	    mainKeys.forEach(function(key) {
	      if(!keyFilter(key)) return;

	      var fName = formatPropertyName.call(this, key);

	      var f = (fName ? fName + keyValueSep : '') + formatPropertyValue.call(this, value, key);
	      len += f.length;
	      keys.push(f);
	    }, this);
	    this.seen.pop();

	    (opts.additionalProperties || []).forEach(function(keyValue) {
	      var f = keyValue[0] + keyValueSep + this.format(keyValue[1]);
	      len += f.length;
	      keys.push(f);
	    }, this);

	    var prefix = opts.prefix || Formatter.constructorName(value) || '';
	    if(prefix.length > 0) prefix += ' ';

	    var lbracket, rbracket;
	    if(Array.isArray(opts.brackets)) {
	      lbracket = opts.brackets && opts.brackets[0];
	      rbracket = opts.brackets && opts.brackets[1];
	    } else {
	      lbracket = '{';
	      rbracket = '}';
	    }

	    var rootValue = opts.value || '';

	    if(keys.length === 0)
	      return rootValue || (prefix + lbracket + rbracket);

	    if(len <= this.maxLineLength) {
	      return prefix + lbracket + ' ' + (rootValue ? rootValue + ' ' : '') + keys.join(this.propSep + ' ') + ' ' + rbracket;
	    } else {
	      return prefix + lbracket + '\n' + (rootValue ? '  ' + rootValue + '\n' : '') + keys.map(util.addSpaces).join(this.propSep + '\n') + '\n' + rbracket;
	    }
	  },

	  formatObject: function(value, prefix, props) {
	    props = props || this.keys(value);

	    var len = 0;

	    this.seen.push(value);
	    props = props.map(function(prop) {
	      var f = this.formatProperty(value, prop);
	      len += f.length;
	      return f;
	    }, this);
	    this.seen.pop();

	    if(props.length === 0) return '{}';

	    if(len <= this.maxLineLength) {
	      return '{ ' + (prefix ? prefix + ' ' : '') + props.join(this.propSep + ' ') + ' }';
	    } else {
	      return '{' + '\n' + (prefix ? '  ' + prefix + '\n' : '') + props.map(util.addSpaces).join(this.propSep + '\n') + '\n' + '}';
	    }
	  },

	  formatPropertyName: function(name) {
	    return name.match(/^[a-zA-Z_$][a-zA-Z_$0-9]*$/) ? name : this.format(name);
	  },

	  formatProperty: function(value, prop) {
	    var desc = Formatter.getPropertyDescriptor(value, prop);

	    var propName = this.formatPropertyName(prop);

	    var propValue = desc.get && desc.set ?
	      '[Getter/Setter]' : desc.get ?
	      '[Getter]' : desc.set ?
	      '[Setter]' : this.seen.indexOf(desc.value) >= 0 ?
	      '[Circular]' :
	      this.format(desc.value);

	    return propName + ': ' + propValue;
	  },

	  formatPropertyValue: function(value, prop) {
	    var desc = Formatter.getPropertyDescriptor(value, prop);

	    var propValue = desc.get && desc.set ?
	      '[Getter/Setter]' : desc.get ?
	      '[Getter]' : desc.set ?
	      '[Setter]' : this.seen.indexOf(desc.value) >= 0 ?
	      '[Circular]' :
	      this.format(desc.value);

	    return propValue;
	  }
	};

	Formatter.add = function add(type, cls, sub, f) {
	  var args = Array.prototype.slice.call(arguments);
	  f = args.pop();
	  Formatter.prototype['_format_' + args.join('_')] = f;
	};

	Formatter.formatObjectWithPrefix = function formatObjectWithPrefix(f) {
	  return function(value) {
	    var prefix = f.call(this, value);
	    var props = this.keys(value);
	    if(props.length == 0) return prefix;
	    else return this.formatObject(value, prefix, props);
	  };
	};

	var functionNameRE = /^\s*function\s*(\S*)\s*\(/;

	Formatter.functionName = function functionName(f) {
	  if(f.name) {
	    return f.name;
	  }
	  var name = f.toString().match(functionNameRE)[1];
	  return name;
	};

	Formatter.constructorName = function(obj) {
	  while (obj) {
	    var descriptor = Object.getOwnPropertyDescriptor(obj, 'constructor');
	    if (descriptor !== undefined &&
	        typeof descriptor.value === 'function') {

	        var name = Formatter.functionName(descriptor.value);
	        if(name !== '') {
	          return name;
	        }
	    }

	    obj = Object.getPrototypeOf(obj);
	  }
	};

	Formatter.getPropertyDescriptor = function(obj, value) {
	  var desc;
	  try {
	    desc = Object.getOwnPropertyDescriptor(obj, value) || {value: obj[value]};
	  } catch(e) {
	    desc = {value: e};
	  }
	  return desc;
	};

	Formatter.generateFunctionForIndexedArray = function generateFunctionForIndexedArray(lengthProp, name, padding) {
	  return function(value) {
	    var max = this.byteArrayMaxLength || 50;
	    var length = value[lengthProp];
	    var formattedValues = [];
	    var len = 0;
	    for(var i = 0; i < max && i < length; i++) {
	      var b = value[i] || 0;
	      var v = util.pad0(b.toString(16), padding);
	      len += v.length;
	      formattedValues.push(v);
	    }
	    var prefix = value.constructor.name || name || '';
	    if(prefix) prefix += ' ';

	    if(formattedValues.length === 0)
	      return prefix + '[]';

	    if(len <= this.maxLineLength) {
	      return prefix + '[ ' + formattedValues.join(this.propSep + ' ') + ' ' + ']';
	    } else {
	      return prefix + '[\n' + formattedValues.map(util.addSpaces).join(this.propSep + '\n') + '\n' + ']';
	    }
	  };
	};

	['undefined', 'boolean', 'null', 'symbol'].forEach(function(name) {
	  Formatter.add(name, String);
	});

	['number', 'boolean'].forEach(function(name) {
	  Formatter.add('object', name, function(value) {
	    return this._formatObject(value, {
	      additionalProperties: [['[[PrimitiveValue]]', value.valueOf()]]
	    });
	  });
	});

	Formatter.add('object', 'string', function(value) {
	  var realValue = value.valueOf();

	  return this._formatObject(value, {
	    keyFilter: function(key) {
	      //skip useless indexed properties
	      return !(key.match(/\d+/) && parseInt(key, 10) < realValue.length);
	    },
	    additionalProperties: [['[[PrimitiveValue]]', realValue]]
	  });
	});

	Formatter.add('object', 'regexp', function(value) {
	  return this._formatObject(value, {
	    value: String(value)
	  });
	});

	Formatter.add('number', function(value) {
	  if(value === 0 && 1 / value < 0) return '-0';
	  return String(value);
	});

	Formatter.add('string', function(value) {
	  return '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
	      .replace(/'/g, "\\'")
	      .replace(/\\"/g, '"') + '\'';
	});

	Formatter.add('object', function(value) {
	  return this._formatObject(value);
	});

	Formatter.add('object', 'arguments', function(value) {
	  return this._formatObject(value, {
	    prefix: 'Arguments',
	    formatPropertyName: function(key) {
	      if(!key.match(/\d+/)) {
	        return this.formatPropertyName(key);
	      }
	    },
	    brackets: ['[', ']']
	  });
	});

	Formatter.add('object', 'array', function(value) {
	  return this._formatObject(value, {
	    formatPropertyName: function(key) {
	      if(!key.match(/\d+/)) {
	        return this.formatPropertyName(key);
	      }
	    },
	    brackets: ['[', ']']
	  });
	});


	function formatDate(value, isUTC) {
	  var prefix = isUTC ? 'UTC' : '';

	  var date = value['get' + prefix + 'FullYear']() +
	    '-' +
	    util.pad0(value['get' + prefix + 'Month']() + 1, 2) +
	    '-' +
	    util.pad0(value['get' + prefix + 'Date'](), 2);

	  var time = util.pad0(value['get' + prefix + 'Hours'](), 2) +
	    ':' +
	    util.pad0(value['get' + prefix + 'Minutes'](), 2) +
	    ':' +
	    util.pad0(value['get' + prefix + 'Seconds'](), 2) +
	    '.' +
	    util.pad0(value['get' + prefix + 'Milliseconds'](), 3);

	  var to = value.getTimezoneOffset();
	  var absTo = Math.abs(to);
	  var hours = Math.floor(absTo / 60);
	  var minutes = absTo - hours * 60;
	  var tzFormat = (to < 0 ? '+' : '-') + util.pad0(hours, 2) + util.pad0(minutes, 2);

	  return date + ' ' + time + (isUTC ? '' : ' ' + tzFormat);
	}

	Formatter.add('object', 'date', function(value) {
	  return this._formatObject(value, { value: formatDate(value, this.isUTCdate) });
	});

	Formatter.add('function', function(value) {
	  return this._formatObject(value, {
	    additionalProperties: [['name', Formatter.functionName(value)]]
	  });
	});

	Formatter.add('object', 'error', function(value) {
	  return this._formatObject(value, {
	    prefix: value.name,
	    additionalProperties: [['message', value.message]]
	  });
	});

	Formatter.add('object', 'buffer', Formatter.generateFunctionForIndexedArray('length', 'Buffer', 2));

	Formatter.add('object', 'array-buffer', Formatter.generateFunctionForIndexedArray('byteLength', 'ArrayBuffer', 2));

	Formatter.add('object', 'typed-array', 'int8', Formatter.generateFunctionForIndexedArray('length', 'Int8Array', 2));
	Formatter.add('object', 'typed-array', 'uint8', Formatter.generateFunctionForIndexedArray('length', 'Uint8Array', 2));
	Formatter.add('object', 'typed-array', 'uint8clamped', Formatter.generateFunctionForIndexedArray('length', 'Uint8ClampedArray', 2));

	Formatter.add('object', 'typed-array', 'int16', Formatter.generateFunctionForIndexedArray('length', 'Int16Array', 4));
	Formatter.add('object', 'typed-array', 'uint16', Formatter.generateFunctionForIndexedArray('length', 'Uint16Array', 4));

	Formatter.add('object', 'typed-array', 'int32', Formatter.generateFunctionForIndexedArray('length', 'Int32Array', 8));
	Formatter.add('object', 'typed-array', 'uint32', Formatter.generateFunctionForIndexedArray('length', 'Uint32Array', 8));

	//TODO add float32 and float64

	Formatter.add('object', 'promise', function() {
	  return '[Promise]';//TODO it could be nice to inspect its state and value
	});

	Formatter.add('object', 'xhr', function() {
	  return '[XMLHttpRequest]';//TODO it could be nice to inspect its state
	});

	Formatter.add('object', 'html-element', function(value) {
	  return value.outerHTML;
	});

	Formatter.add('object', 'html-element', '#text', function(value) {
	  return value.nodeValue;
	});

	Formatter.add('object', 'html-element', '#document', function(value) {
	  return value.documentElement.outerHTML;
	});

	Formatter.add('object', 'host', function() {
	  return '[Host]';
	});

	Formatter.add('object', 'set', function(value) {
	  var iter = value.values();
	  var len = 0;

	  this.seen.push(value);

	  var props = [];

	  var next = iter.next();
	  while(!next.done) {
	    var val = next.value;
	    var f = this.format(val);
	    len += f.length;
	    props.push(f);

	    next = iter.next();
	  }

	  this.seen.pop();

	  if(props.length === 0) return 'Set {}';

	  if(len <= this.maxLineLength) {
	    return 'Set { ' + props.join(this.propSep + ' ') + ' }';
	  } else {
	    return 'Set {\n' + props.map(util.addSpaces).join(this.propSep + '\n') + '\n' + '}';
	  }
	});

	Formatter.add('object', 'map', function(value) {
	  var iter = value.entries();
	  var len = 0;

	  this.seen.push(value);

	  var props = [];

	  var next = iter.next();
	  while(!next.done) {
	    var val = next.value;
	    var fK = this.format(val[0]);
	    var fV = this.format(val[1]);

	    var f;
	    if((fK.length + fV.length + 4) <= this.maxLineLength) {
	      f = fK + ' => ' + fV;
	    } else {
	      f = fK + ' =>\n' + fV;
	    }

	    len += fK.length + fV.length + 4;
	    props.push(f);

	    next = iter.next();
	  }

	  this.seen.pop();

	  if(props.length === 0) return 'Map {}';

	  if(len <= this.maxLineLength) {
	    return 'Map { ' + props.join(this.propSep + ' ') + ' }';
	  } else {
	    return 'Map {\n' + props.map(util.addSpaces).join(this.propSep + '\n') + '\n' + '}';
	  }
	});

	Formatter.prototype.defaultFormat = Formatter.prototype._format_object;

	function defaultFormat(value, opts) {
	  return new Formatter(opts).format(value);
	}

	defaultFormat.Formatter = Formatter;
	module.exports = defaultFormat;


/***/ },
/* 41 */
/***/ function(module, exports) {

	function addSpaces(v) {
	  return v.split('\n').map(function(vv) { return '  ' + vv; }).join('\n');
	}

	function pad(str, value, filler) {
	  str = String(str)
	  var isRight = false;

	  if(value < 0) {
	    isRight = true;
	    value = -value;
	  }

	  if(str.length < value) {
	    var padding = new Array(value - str.length + 1).join(filler);
	    return isRight ? str + padding : padding + str;
	  } else{
	    return str;
	  }
	}

	module.exports = {
	  addSpaces: addSpaces,
	  pad: pad,
	  pad0: function(str, value) {
	    return pad(str, value, '0');
	  }
	};


/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	var util = __webpack_require__(36);

	/**
	 * should AssertionError
	 * @param {Object} options
	 * @constructor
	 * @memberOf should
	 * @static
	 */
	var AssertionError = function AssertionError(options) {
	  util.merge(this, options);

	  if(!options.message) {
	    Object.defineProperty(this, 'message', {
	        get: function() {
	          if(!this._message) {
	            this._message = this.generateMessage();
	            this.generatedMessage = true;
	          }
	          return this._message;
	        },
	        configurable: true,
	        enumerable: false
	      }
	    );
	  }

	  if(Error.captureStackTrace) {
	    Error.captureStackTrace(this, this.stackStartFunction);
	  } else {
	    // non v8 browsers so we can have a stacktrace
	    var err = new Error();
	    if(err.stack) {
	      var out = err.stack;

	      if(this.stackStartFunction) {
	        // try to strip useless frames
	        var fn_name = util.functionName(this.stackStartFunction);
	        var idx = out.indexOf('\n' + fn_name);
	        if(idx >= 0) {
	          // once we have located the function frame
	          // we need to strip out everything before it (and its line)
	          var next_line = out.indexOf('\n', idx + 1);
	          out = out.substring(next_line + 1);
	        }
	      }

	      this.stack = out;
	    }
	  }
	};


	var indent = '    ';
	function prependIndent(line) {
	  return indent + line;
	}

	function indentLines(text) {
	  return text.split('\n').map(prependIndent).join('\n');
	}


	// assert.AssertionError instanceof Error
	AssertionError.prototype = Object.create(Error.prototype, {
	  name: {
	    value: 'AssertionError'
	  },

	  generateMessage: {
	    value: function() {
	      if(!this.operator && this.previous) {
	        return this.previous.message;
	      }
	      var actual = util.format(this.actual);
	      var expected = 'expected' in this ? ' ' + util.format(this.expected) : '';
	      var details = 'details' in this && this.details ? ' (' + this.details + ')' : '';

	      var previous = this.previous ? '\n' + indentLines(this.previous.message) : '';

	      return 'expected ' + actual + (this.negate ? ' not ' : ' ') + this.operator + expected + details + previous;
	    }
	  }
	});

	module.exports = AssertionError;


/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	var AssertionError = __webpack_require__(42);
	var util = __webpack_require__(36);

	/**
	 * should Assertion
	 * @param {*} obj Given object for assertion
	 * @constructor
	 * @memberOf should
	 * @static
	 */
	function Assertion(obj) {
	  this.obj = obj;

	  this.anyOne = false;
	  this.negate = false;

	  this.params = {actual: obj};
	}

	/**
	 * Way to extend Assertion function. It uses some logic
	 * to define only positive assertions and itself rule with negative assertion.
	 *
	 * All actions happen in subcontext and this method take care about negation.
	 * Potentially we can add some more modifiers that does not depends from state of assertion.
	 * @memberOf Assertion
	 * @category assertion
	 * @static
	 * @param {String} name Name of assertion. It will be used for defining method or getter on Assertion.prototype
	 * @param {Function} func Function that will be called on executing assertion
	 * @example
	 *
	 * Assertion.add('asset', function() {
	 *      this.params = { operator: 'to be asset' };
	 *
	 *      this.obj.should.have.property('id').which.is.a.Number();
	 *      this.obj.should.have.property('path');
	 * });
	 */
	Assertion.add = function(name, func) {
	  var prop = {enumerable: true, configurable: true};

	  prop.value = function() {
	    var context = new Assertion(this.obj, this, name);
	    context.anyOne = this.anyOne;

	    try {
	      func.apply(context, arguments);
	    } catch(e) {
	      //check for fail
	      if(e instanceof AssertionError) {
	        //negative fail
	        if(this.negate) {
	          this.obj = context.obj;
	          this.negate = false;
	          return this;
	        }

	        if(context !== e.assertion) {
	          context.params.previous = e;
	        }

	        //positive fail
	        context.negate = false;
	        context.fail();
	      }
	      // throw if it is another exception
	      throw e;
	    }

	    //negative pass
	    if(this.negate) {
	      context.negate = true;//because .fail will set negate
	      context.params.details = 'false negative fail';
	      context.fail();
	    }

	    //positive pass
	    if(!this.params.operator) this.params = context.params;//shortcut
	    this.obj = context.obj;
	    this.negate = false;
	    return this;
	  };

	  Object.defineProperty(Assertion.prototype, name, prop);
	};

	Assertion.addChain = function(name, onCall) {
	  onCall = onCall || function() {
	  };
	  Object.defineProperty(Assertion.prototype, name, {
	    get: function() {
	      onCall();
	      return this;
	    },
	    enumerable: true
	  });
	};

	/**
	 * Create alias for some `Assertion` property
	 *
	 * @memberOf Assertion
	 * @category assertion
	 * @static
	 * @param {String} from Name of to map
	 * @param {String} to Name of alias
	 * @example
	 *
	 * Assertion.alias('true', 'True');
	 */
	Assertion.alias = function(from, to) {
	  var desc = Object.getOwnPropertyDescriptor(Assertion.prototype, from);
	  if(!desc) throw new Error('Alias ' + from + ' -> ' + to + ' could not be created as ' + from + ' not defined');
	  Object.defineProperty(Assertion.prototype, to, desc);
	};

	Assertion.prototype = {
	  constructor: Assertion,

	  /**
	   * Base method for assertions. Before calling this method need to fill Assertion#params object. This method usually called from other assertion methods.
	   * `Assertion#params` can contain such properties:
	   * * `operator` - required string containing description of this assertion
	   * * `obj` - optional replacement for this.obj, it usefull if you prepare more clear object then given
	   * * `message` - if this property filled with string any others will be ignored and this one used as assertion message
	   * * `expected` - any object used when you need to assert relation between given object and expected. Like given == expected (== is a relation)
	   * * `details` - additional string with details to generated message
	   *
	   * @memberOf Assertion
	   * @category assertion
	   * @param {*} expr Any expression that will be used as a condition for asserting.
	   * @example
	   *
	   * var a = new should.Assertion(42);
	   *
	   * a.params = {
	   *  operator: 'to be magic number',
	   * }
	   *
	   * a.assert(false);
	   * //throws AssertionError: expected 42 to be magic number
	   */
	  assert: function(expr) {
	    if(expr) return this;

	    var params = this.params;

	    if('obj' in params && !('actual' in params)) {
	      params.actual = params.obj;
	    } else if(!('obj' in params) && !('actual' in params)) {
	      params.actual = this.obj;
	    }

	    params.stackStartFunction = params.stackStartFunction || this.assert;
	    params.negate = this.negate;

	    params.assertion = this;

	    throw new AssertionError(params);
	  },

	  /**
	   * Shortcut for `Assertion#assert(false)`.
	   *
	   * @memberOf Assertion
	   * @category assertion
	   * @example
	   *
	   * var a = new should.Assertion(42);
	   *
	   * a.params = {
	   *  operator: 'to be magic number',
	   * }
	   *
	   * a.fail();
	   * //throws AssertionError: expected 42 to be magic number
	   */
	  fail: function() {
	    return this.assert(false);
	  },

	  /**
	   * Negation modifier. Current assertion chain become negated. Each call invert negation on current assertion.
	   *
	   * @memberOf Assertion
	   * @category assertion
	   */
	  get not() {
	    this.negate = !this.negate;
	    return this;
	  },

	  /**
	   * Any modifier - it affect on execution of sequenced assertion to do not `check all`, but `check any of`.
	   *
	   * @memberOf Assertion
	   * @category assertion
	   */
	  get any() {
	    this.anyOne = true;
	    return this;
	  }
	};

	module.exports = Assertion;


/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */

	var util = __webpack_require__(36)
	  , assert = __webpack_require__(45)
	  , AssertionError = __webpack_require__(42);

	module.exports = function(should) {
	  var i = should.format;

	  /*
	   * Expose assert to should
	   *
	   * This allows you to do things like below
	   * without require()ing the assert module.
	   *
	   *    should.equal(foo.bar, undefined);
	   *
	   */
	  util.merge(should, assert);

	  /**
	   * Assert _obj_ exists, with optional message.
	   *
	   * @static
	   * @memberOf should
	   * @category assertion assert
	   * @alias should.exists
	   * @param {*} obj
	   * @param {String} [msg]
	   * @example
	   *
	   * should.exist(1);
	   * should.exist(new Date());
	   */
	  should.exist = should.exists = function(obj, msg) {
	    if(null == obj) {
	      throw new AssertionError({
	        message: msg || ('expected ' + i(obj) + ' to exist'), stackStartFunction: should.exist
	      });
	    }
	  };

	  should.not = {};
	  /**
	   * Asserts _obj_ does not exist, with optional message.
	   *
	   * @name not.exist
	   * @static
	   * @memberOf should
	   * @category assertion assert
	   * @alias should.not.exists
	   * @param {*} obj
	   * @param {String} [msg]
	   * @example
	   *
	   * should.not.exist(null);
	   * should.not.exist(void 0);
	   */
	  should.not.exist = should.not.exists = function(obj, msg) {
	    if(null != obj) {
	      throw new AssertionError({
	        message: msg || ('expected ' + i(obj) + ' to not exist'), stackStartFunction: should.not.exist
	      });
	    }
	  };
	};

/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	// implement assert interface using already written peaces of should.js

	// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
	//
	// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
	//
	// Originally from narwhal.js (http://narwhaljs.org)
	// Copyright (c) 2009 Thomas Robinson <280north.com>
	//
	// Permission is hereby granted, free of charge, to any person obtaining a copy
	// of this software and associated documentation files (the 'Software'), to
	// deal in the Software without restriction, including without limitation the
	// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
	// sell copies of the Software, and to permit persons to whom the Software is
	// furnished to do so, subject to the following conditions:
	//
	// The above copyright notice and this permission notice shall be included in
	// all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
	// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
	// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

	// when used in node, this will actually load the util module we depend on
	// versus loading the builtin util module as happens otherwise
	// this is a bug in node module loading as far as I am concerned
	var Assertion = __webpack_require__(43);

	var _deepEqual = __webpack_require__(46);

	var pSlice = Array.prototype.slice;

	// 1. The assert module provides functions that throw
	// AssertionError's when particular conditions are not met. The
	// assert module must conform to the following interface.

	var assert = module.exports = ok;

	// 3. All of the following functions must throw an AssertionError
	// when a corresponding condition is not met, with a message that
	// may be undefined if not provided.  All assertion methods provide
	// both the actual and expected values to the assertion error for
	// display purposes.
	/**
	 * Node.js standard [`assert.fail`](http://nodejs.org/api/assert.html#assert_assert_fail_actual_expected_message_operator).
	 * @static
	 * @memberOf should
	 * @category assertion assert
	 * @param {*} actual Actual object
	 * @param {*} expected Expected object
	 * @param {string} message Message for assertion
	 * @param {string} operator Operator text
	 */
	function fail(actual, expected, message, operator, stackStartFunction) {
	  var a = new Assertion(actual);
	  a.params = {
	    operator: operator,
	    expected: expected,
	    message: message,
	    stackStartFunction: stackStartFunction || fail
	  };

	  a.fail();
	}

	// EXTENSION! allows for well behaved errors defined elsewhere.
	assert.fail = fail;

	// 4. Pure assertion tests whether a value is truthy, as determined
	// by !!guard.
	// assert.ok(guard, message_opt);
	// This statement is equivalent to assert.equal(true, !!guard,
	// message_opt);. To test strictly for the value true, use
	// assert.strictEqual(true, guard, message_opt);.
	/**
	 * Node.js standard [`assert.ok`](http://nodejs.org/api/assert.html#assert_assert_value_message_assert_ok_value_message).
	 * @static
	 * @memberOf should
	 * @category assertion assert
	 * @param {*} value
	 * @param {string} [message]
	 */
	function ok(value, message) {
	  if(!value) fail(value, true, message, '==', assert.ok);
	}
	assert.ok = ok;

	// 5. The equality assertion tests shallow, coercive equality with
	// ==.
	// assert.equal(actual, expected, message_opt);

	/**
	 * Node.js standard [`assert.equal`](http://nodejs.org/api/assert.html#assert_assert_equal_actual_expected_message).
	 * @static
	 * @memberOf should
	 * @category assertion assert
	 * @param {*} actual
	 * @param {*} expected
	 * @param {string} [message]
	 */
	assert.equal = function equal(actual, expected, message) {
	  if(actual != expected) fail(actual, expected, message, '==', assert.equal);
	};

	// 6. The non-equality assertion tests for whether two objects are not equal
	// with != assert.notEqual(actual, expected, message_opt);
	/**
	 * Node.js standard [`assert.notEqual`](http://nodejs.org/api/assert.html#assert_assert_notequal_actual_expected_message).
	 * @static
	 * @memberOf should
	 * @category assertion assert
	 * @param {*} actual
	 * @param {*} expected
	 * @param {string} [message]
	 */
	assert.notEqual = function notEqual(actual, expected, message) {
	  if(actual == expected) {
	    fail(actual, expected, message, '!=', assert.notEqual);
	  }
	};

	// 7. The equivalence assertion tests a deep equality relation.
	// assert.deepEqual(actual, expected, message_opt);
	/**
	 * Node.js standard [`assert.deepEqual`](http://nodejs.org/api/assert.html#assert_assert_deepequal_actual_expected_message).
	 * @static
	 * @memberOf should
	 * @category assertion assert
	 * @param {*} actual
	 * @param {*} expected
	 * @param {string} [message]
	 */
	assert.deepEqual = function deepEqual(actual, expected, message) {
	  if(!_deepEqual(actual, expected).result) {
	    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
	  }
	};


	// 8. The non-equivalence assertion tests for any deep inequality.
	// assert.notDeepEqual(actual, expected, message_opt);
	/**
	 * Node.js standard [`assert.notDeepEqual`](http://nodejs.org/api/assert.html#assert_assert_notdeepequal_actual_expected_message).
	 * @static
	 * @memberOf should
	 * @category assertion assert
	 * @param {*} actual
	 * @param {*} expected
	 * @param {string} [message]
	 */
	assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
	  if(_deepEqual(actual, expected).result) {
	    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
	  }
	};

	// 9. The strict equality assertion tests strict equality, as determined by ===.
	// assert.strictEqual(actual, expected, message_opt);
	/**
	 * Node.js standard [`assert.strictEqual`](http://nodejs.org/api/assert.html#assert_assert_strictequal_actual_expected_message).
	 * @static
	 * @memberOf should
	 * @category assertion assert
	 * @param {*} actual
	 * @param {*} expected
	 * @param {string} [message]
	 */
	assert.strictEqual = function strictEqual(actual, expected, message) {
	  if(actual !== expected) {
	    fail(actual, expected, message, '===', assert.strictEqual);
	  }
	};

	// 10. The strict non-equality assertion tests for strict inequality, as
	// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);
	/**
	 * Node.js standard [`assert.notStrictEqual`](http://nodejs.org/api/assert.html#assert_assert_notstrictequal_actual_expected_message).
	 * @static
	 * @memberOf should
	 * @category assertion assert
	 * @param {*} actual
	 * @param {*} expected
	 * @param {string} [message]
	 */
	assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
	  if(actual === expected) {
	    fail(actual, expected, message, '!==', assert.notStrictEqual);
	  }
	};

	function expectedException(actual, expected) {
	  if(!actual || !expected) {
	    return false;
	  }

	  if(Object.prototype.toString.call(expected) == '[object RegExp]') {
	    return expected.test(actual);
	  } else if(actual instanceof expected) {
	    return true;
	  } else if(expected.call({}, actual) === true) {
	    return true;
	  }

	  return false;
	}

	function _throws(shouldThrow, block, expected, message) {
	  var actual;

	  if(typeof expected == 'string') {
	    message = expected;
	    expected = null;
	  }

	  try {
	    block();
	  } catch(e) {
	    actual = e;
	  }

	  message = (expected && expected.name ? ' (' + expected.name + ')' : '.') +
	  (message ? ' ' + message : '.');

	  if(shouldThrow && !actual) {
	    fail(actual, expected, 'Missing expected exception' + message);
	  }

	  if(!shouldThrow && expectedException(actual, expected)) {
	    fail(actual, expected, 'Got unwanted exception' + message);
	  }

	  if((shouldThrow && actual && expected && !expectedException(actual, expected)) || (!shouldThrow && actual)) {
	    throw actual;
	  }
	}

	// 11. Expected to throw an error:
	// assert.throws(block, Error_opt, message_opt);
	/**
	 * Node.js standard [`assert.throws`](http://nodejs.org/api/assert.html#assert_assert_throws_block_error_message).
	 * @static
	 * @memberOf should
	 * @category assertion assert
	 * @param {Function} block
	 * @param {Function} [error]
	 * @param {String} [message]
	 */
	assert.throws = function(block, /*optional*/error, /*optional*/message) {
	  _throws.apply(this, [true].concat(pSlice.call(arguments)));
	};

	// EXTENSION! This is annoying to write outside this module.
	/**
	 * Node.js standard [`assert.doesNotThrow`](http://nodejs.org/api/assert.html#assert_assert_doesnotthrow_block_message).
	 * @static
	 * @memberOf should
	 * @category assertion assert
	 * @param {Function} block
	 * @param {String} [message]
	 */
	assert.doesNotThrow = function(block, /*optional*/message) {
	  _throws.apply(this, [false].concat(pSlice.call(arguments)));
	};

	/**
	 * Node.js standard [`assert.ifError`](http://nodejs.org/api/assert.html#assert_assert_iferror_value).
	 * @static
	 * @memberOf should
	 * @category assertion assert
	 * @param {Error} err
	 */
	assert.ifError = function(err) {
	  if(err) {
	    throw err;
	  }
	};


/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	var getType = __webpack_require__(37);
	var format = __webpack_require__(47);
	var hasOwnProperty = Object.prototype.hasOwnProperty;

	function makeResult(r, path, reason, a, b) {
	  var o = {result: r};
	  if(!r) {
	    o.path = path;
	    o.reason = reason;
	    o.a = a;
	    o.b = b;
	  }
	  return o;
	}

	var EQUALS = makeResult(true);

	function typeToString(t) {
	  return t.type + (t.cls ? '(' + t.cls + (t.sub ? ' ' + t.sub : '') + ')' : '');
	}



	var REASON = {
	  PLUS_0_AND_MINUS_0: '+0 is not equal to -0',
	  DIFFERENT_TYPES: 'A has type %s and B has type %s',
	  NAN_NUMBER: 'NaN is not equal to any number',
	  EQUALITY: 'A is not equal to B',
	  EQUALITY_PROTOTYPE: 'A and B have different prototypes',
	  WRAPPED_VALUE: 'A wrapped value is not equal to B wrapped value',
	  FUNCTION_SOURCES: 'function A is not equal to B by source code value (via .toString call)',
	  MISSING_KEY: '%s has no key %s',
	  CIRCULAR_VALUES: 'A has circular reference that was visited not in the same time as B',
	  SET_MAP_MISSING_KEY: 'Set/Map missing key',
	  MAP_VALUE_EQUALITY: 'Values of the same key in A and B is not equal'
	};

	function eqInternal(a, b, opts, stackA, stackB, path) {
	  var r = EQUALS;

	  function result(comparison, reason) {
	    return makeResult(comparison, path, reason, a, b);
	  }

	  function checkPropertyEquality(property) {
	    return eqInternal(a[property], b[property], opts, stackA, stackB, path.concat([property]));
	  }


	  // equal a and b exit early
	  if(a === b) {
	    // check for +0 !== -0;
	    return result(a !== 0 || (1 / a == 1 / b), REASON.PLUS_0_AND_MINUS_0);
	  }

	  var l, p;

	  var typeA = getType(a),
	    typeB = getType(b);

	  // if objects has different types they are not equals
	  var typeDifferents = typeA.type !== typeB.type || typeA.cls !== typeB.cls;

	  if(typeDifferents || ((opts.checkSubType && typeA.sub !== typeB.sub) || !opts.checkSubType)) {
	    return result(false, format(REASON.DIFFERENT_TYPES, typeToString(typeA), typeToString(typeB)));
	  }

	  //early checks for types
	  switch(typeA.type) {
	    case 'number':
	      // NaN !== NaN
	      return (a !== a) ? result(b !== b, REASON.NAN_NUMBER)
	        // but treat `+0` vs. `-0` as not equal
	        : (a === 0 ? result(1 / a === 1 / b, REASON.PLUS_0_AND_MINUS_0) : result(a === b, REASON.EQUALITY));

	    case 'boolean':
	    case 'string':
	      return result(a === b, REASON.EQUALITY);

	    case 'function':
	      var fA = a.toString(), fB = b.toString();
	      r = eqInternal(fA, fB, opts, stackA, stackB, path);
	      if(!r.result) {
	        r.reason = REASON.FUNCTION_SOURCES;
	        return r;
	      }

	      break;//check user properties

	    case 'object':
	      // additional checks for object instances
	      switch(typeA.cls) {
	        // check regexp flags
	        // TODO add es6 flags
	        case 'regexp':
	          p = ['source', 'global', 'multiline', 'lastIndex', 'ignoreCase'];
	          while(p.length) {
	            r = checkPropertyEquality(p.shift());
	            if(!r.result) return r;
	          }
	          break;//check user properties

	        //check by timestamp only
	        case 'date':
	          if(+a !== +b) {
	            return result(false, REASON.EQUALITY);
	          }
	          break;//check user properties

	        //primitive type wrappers
	        case 'number':
	        case 'boolean':
	        case 'string':
	          r = eqInternal(a.valueOf(), b.valueOf(), opts, stackA, stackB, path);
	          if(!r.result) {
	            r.reason = REASON.WRAPPED_VALUE;
	            return r;
	          }
	          break;//check user properties

	        //node buffer
	        case 'buffer':
	          //if length different it is obviously different
	          r = checkPropertyEquality('length');
	          if(!r.result) return r;

	          l = a.length;
	          while(l--) {
	            r = checkPropertyEquality(l);
	            if(!r.result) return r;
	          }

	          //we do not check for user properties because
	          //node Buffer have some strange hidden properties
	          return EQUALS;

	        case 'error':
	          //check defined properties
	          p = ['name', 'message'];
	          while(p.length) {
	            r = checkPropertyEquality(p.shift());
	            if(!r.result) return r;
	          }

	          break;//check user properties

	        case 'array':
	        case 'arguments':
	        case 'typed-array':
	          r = checkPropertyEquality('length');
	          if(!r.result) return r;

	          break;//check user properties

	        case 'array-buffer':
	          r = checkPropertyEquality('byteLength');
	          if(!r.result) return r;

	          break;//check user properties

	        case 'map':
	        case 'set':
	          r = checkPropertyEquality('size');
	          if(!r.result) return r;

	          stackA.push(a);
	          stackB.push(b);

	          var itA = a.entries();
	          var nextA = itA.next();

	          while(!nextA.done) {
	            var key = nextA.value[0];
	            //first check for primitive key if we can do light check
	            //using .has and .get
	            if(getType(key).type != 'object') {
	              if(b.has(key)) {
	                if(typeA.cls == 'map') {
	                  //for map we also check its value to be equal
	                  var value = b.get(key);
	                  r = eqInternal(nextA.value[1], value, opts, stackA, stackB, path);
	                  if(!r.result) {
	                    r.a = nextA.value;
	                    r.b = value;
	                    r.reason = REASON.MAP_VALUE_EQUALITY;

	                    break;
	                  }
	                }

	              } else {
	                r = result(false, REASON.SET_MAP_MISSING_KEY);
	                r.a = key;
	                r.b = key;

	                break;
	              }
	            } else {
	              //heavy check
	              //we search by iterator for key equality using equal
	              var itB = b.entries();
	              var nextB = itB.next();

	              while(!nextB.done) {
	                //first check for keys
	                r = eqInternal(nextA.value[0], nextB.value[0], opts, stackA, stackB, path);

	                if(!r.result) {
	                  r.reason = REASON.SET_MAP_MISSING_KEY;
	                  r.a = key;
	                  r.b = key;
	                } else {
	                  if(typeA.cls == 'map') {
	                    r = eqInternal(nextA.value[1], nextB.value[1], opts, stackA, stackB, path);

	                    if(!r.result) {
	                      r.a = nextA.value;
	                      r.b = nextB.value;
	                      r.reason = REASON.MAP_VALUE_EQUALITY;
	                    }
	                  }

	                  break;
	                }

	                nextB = itB.next();
	              }
	            }

	            if(!r.result) {
	              break;
	            }

	            nextA = itA.next();
	          }

	          stackA.pop();
	          stackB.pop();

	          if(!r.result) {
	            r.reason = REASON.SET_MAP_MISSING_ENTRY;
	            return r;
	          }

	          break; //check user properties
	      }
	  }

	  // compare deep objects and arrays
	  // stacks contain references only
	  //

	  l = stackA.length;
	  while(l--) {
	    if(stackA[l] == a) {
	      return result(stackB[l] == b, REASON.CIRCULAR_VALUES);
	    }
	  }

	  // add `a` and `b` to the stack of traversed objects
	  stackA.push(a);
	  stackB.push(b);

	  var key;

	  for(key in b) {
	    if(hasOwnProperty.call(b, key)) {
	      r = result(hasOwnProperty.call(a, key), format(REASON.MISSING_KEY, 'A', key));
	      if(!r.result) {
	        break;
	      }

	      if(r.result) {
	        r = checkPropertyEquality(key);
	        if(!r.result) {
	          break;
	        }
	      }
	    }
	  }

	  if(r.result) {
	    // ensure both objects have the same number of properties
	    for(key in a) {
	      if(hasOwnProperty.call(a, key)) {
	        r = result(hasOwnProperty.call(b, key), format(REASON.MISSING_KEY, 'B', key));
	        if(!r.result) {
	          return r;
	        }
	      }
	    }
	  }

	  stackA.pop();
	  stackB.pop();

	  if(!r.result) return r;

	  var prototypesEquals = false, canComparePrototypes = false;

	  if(opts.checkProtoEql) {
	    if(Object.getPrototypeOf) {//TODO should i check prototypes for === or use eq?
	      prototypesEquals = Object.getPrototypeOf(a) === Object.getPrototypeOf(b);
	      canComparePrototypes = true;
	    } else if(a.__proto__ && b.__proto__) {
	      prototypesEquals = a.__proto__ === b.__proto__;
	      canComparePrototypes = true;
	    }

	    if(canComparePrototypes && !prototypesEquals) {
	      r = result(prototypesEquals, REASON.EQUALITY_PROTOTYPE);
	      r.showReason = true;
	      if(!r.result) {
	        return r;
	      }
	    }
	  }

	  return EQUALS;
	}

	var defaultOptions = {
	  checkProtoEql: true,
	  checkSubType: true
	};

	function eq(a, b, opts) {
	  opts = opts || {};
	  if(typeof opts.checkProtoEql !== 'boolean')
	    opts.checkProtoEql = defaultOptions.checkProtoEql;
	  if(typeof opts.checkSubType !== 'boolean')
	    opts.checkSubType = defaultOptions.checkSubType;

	  var r = eqInternal(a, b, opts, [], [], []);
	  return r;
	}

	module.exports = eq;

	eq.r = REASON;


/***/ },
/* 47 */
/***/ function(module, exports) {

	module.exports = function format(msg) {
	  var args = arguments;
	  for(var i = 1, l = args.length; i < l; i++) {
	    msg = msg.replace(/%s/, args[i]);
	  }
	  return msg;
	}


/***/ },
/* 48 */
/***/ function(module, exports) {

	module.exports = function(should, Assertion) {
	  /**
	   * Simple chaining. It actually do nothing.
	   *
	   * @memberOf Assertion
	   * @name be
	   * @property {should.Assertion} be
	   * @alias Assertion#an
	   * @alias Assertion#of
	   * @alias Assertion#a
	   * @alias Assertion#and
	   * @alias Assertion#have
	   * @alias Assertion#has
	   * @alias Assertion#with
	   * @alias Assertion#is
	   * @alias Assertion#which
	   * @alias Assertion#the
	   * @alias Assertion#it
	   * @category assertion chaining
	   */
	  ['an', 'of', 'a', 'and', 'be', 'has', 'have', 'with', 'is', 'which', 'the', 'it'].forEach(function(name) {
	    Assertion.addChain(name);
	  });
	};


/***/ },
/* 49 */
/***/ function(module, exports) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */

	module.exports = function(should, Assertion) {
	  /**
	   * Assert given object is exactly `true`.
	   *
	   * @name true
	   * @memberOf Assertion
	   * @category assertion bool
	   * @alias Assertion#True
	   * @example
	   *
	   * (true).should.be.true();
	   * false.should.not.be.true();
	   *
	   * ({ a: 10}).should.not.be.true();
	   */
	  Assertion.add('true', function() {
	    this.is.exactly(true);
	  });

	  Assertion.alias('true', 'True');

	  /**
	   * Assert given object is exactly `false`.
	   *
	   * @name false
	   * @memberOf Assertion
	   * @category assertion bool
	   * @alias Assertion#False
	   * @example
	   *
	   * (true).should.not.be.false();
	   * false.should.be.false();
	   */
	  Assertion.add('false', function() {
	    this.is.exactly(false);
	  });

	  Assertion.alias('false', 'False');

	  /**
	   * Assert given object is thuthy according javascript type conversions.
	   *
	   * @name ok
	   * @memberOf Assertion
	   * @category assertion bool
	   * @example
	   *
	   * (true).should.be.ok();
	   * ''.should.not.be.ok();
	   * should(null).not.be.ok();
	   * should(void 0).not.be.ok();
	   *
	   * (10).should.be.ok();
	   * (0).should.not.be.ok();
	   */
	  Assertion.add('ok', function() {
	    this.params = { operator: 'to be truthy' };

	    this.assert(this.obj);
	  });
	};


/***/ },
/* 50 */
/***/ function(module, exports) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */

	module.exports = function(should, Assertion) {

	  /**
	   * Assert given object is NaN
	   * @name NaN
	   * @memberOf Assertion
	   * @category assertion numbers
	   * @example
	   *
	   * (10).should.not.be.NaN();
	   * NaN.should.be.NaN();
	   */
	  Assertion.add('NaN', function() {
	    this.params = { operator: 'to be NaN' };

	    this.assert(this.obj !== this.obj);
	  });

	  /**
	   * Assert given object is not finite (positive or negative)
	   *
	   * @name Infinity
	   * @memberOf Assertion
	   * @category assertion numbers
	   * @example
	   *
	   * (10).should.not.be.Infinity();
	   * NaN.should.not.be.Infinity();
	   */
	  Assertion.add('Infinity', function() {
	    this.params = { operator: 'to be Infinity' };

	    this.is.a.Number()
	      .and.not.a.NaN()
	      .and.assert(!isFinite(this.obj));
	  });

	  /**
	   * Assert given number between `start` and `finish` or equal one of them.
	   *
	   * @name within
	   * @memberOf Assertion
	   * @category assertion numbers
	   * @param {number} start Start number
	   * @param {number} finish Finish number
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * (10).should.be.within(0, 20);
	   */
	  Assertion.add('within', function(start, finish, description) {
	    this.params = { operator: 'to be within ' + start + '..' + finish, message: description };

	    this.assert(this.obj >= start && this.obj <= finish);
	  });

	  /**
	   * Assert given number near some other `value` within `delta`
	   *
	   * @name approximately
	   * @memberOf Assertion
	   * @category assertion numbers
	   * @param {number} value Center number
	   * @param {number} delta Radius
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * (9.99).should.be.approximately(10, 0.1);
	   */
	  Assertion.add('approximately', function(value, delta, description) {
	    this.params = { operator: 'to be approximately ' + value + ' ±' + delta, message: description };

	    this.assert(Math.abs(this.obj - value) <= delta);
	  });

	  /**
	   * Assert given number above `n`.
	   *
	   * @name above
	   * @alias Assertion#greaterThan
	   * @memberOf Assertion
	   * @category assertion numbers
	   * @param {number} n Margin number
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * (10).should.be.above(0);
	   */
	  Assertion.add('above', function(n, description) {
	    this.params = { operator: 'to be above ' + n, message: description };

	    this.assert(this.obj > n);
	  });

	  /**
	   * Assert given number below `n`.
	   *
	   * @name below
	   * @alias Assertion#lessThan
	   * @memberOf Assertion
	   * @category assertion numbers
	   * @param {number} n Margin number
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * (0).should.be.below(10);
	   */
	  Assertion.add('below', function(n, description) {
	    this.params = { operator: 'to be below ' + n, message: description };

	    this.assert(this.obj < n);
	  });

	  Assertion.alias('above', 'greaterThan');
	  Assertion.alias('below', 'lessThan');

	  /**
	   * Assert given number above `n`.
	   *
	   * @name aboveOrEqual
	   * @alias Assertion#greaterThanOrEqual
	   * @memberOf Assertion
	   * @category assertion numbers
	   * @param {number} n Margin number
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * (10).should.be.aboveOrEqual(0);
	   * (10).should.be.aboveOrEqual(10);
	   */
	  Assertion.add('aboveOrEqual', function(n, description) {
	    this.params = { operator: 'to be above or equal' + n, message: description };

	    this.assert(this.obj >= n);
	  });

	  /**
	   * Assert given number below `n`.
	   *
	   * @name belowOrEqual
	   * @alias Assertion#lessThanOrEqual
	   * @memberOf Assertion
	   * @category assertion numbers
	   * @param {number} n Margin number
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * (0).should.be.belowOrEqual(10);
	   * (0).should.be.belowOrEqual(0);
	   */
	  Assertion.add('belowOrEqual', function(n, description) {
	    this.params = { operator: 'to be below or equal' + n, message: description };

	    this.assert(this.obj <= n);
	  });

	  Assertion.alias('aboveOrEqual', 'greaterThanOrEqual');
	  Assertion.alias('belowOrEqual', 'lessThanOrEqual');

	};


/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */

	var eql = __webpack_require__(46);
	var type = __webpack_require__(37);
	var util = __webpack_require__(36);

	function formatEqlResult(r, a, b) {
	  return ((r.path.length > 0 ? 'at ' + r.path.map(util.formatProp).join(' -> ') : '') +
	  (r.a === a ? '' : ', A has ' + util.format(r.a)) +
	  (r.b === b ? '' : ' and B has ' + util.format(r.b)) +
	  (r.showReason ? ' because ' + r.reason : '')).trim();
	}

	module.exports = function(should, Assertion) {

	  /**
	   * Deep object equality comparison. For full spec see [`should-equal tests`](https://github.com/shouldjs/equal/blob/master/test.js).
	   *
	   * @name eql
	   * @memberOf Assertion
	   * @category assertion equality
	   * @alias Assertion#deepEqual
	   * @param {*} val Expected value
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * (10).should.be.eql(10);
	   * ('10').should.not.be.eql(10);
	   * (-0).should.not.be.eql(+0);
	   *
	   * NaN.should.be.eql(NaN);
	   *
	   * ({ a: 10}).should.be.eql({ a: 10 });
	   * [ 'a' ].should.not.be.eql({ '0': 'a' });
	   */
	  Assertion.add('eql', function(val, description) {
	    this.params = {operator: 'to equal', expected: val, message: description};

	    var result = eql(this.obj, val, should.config);
	    this.params.details = result.result ? '' : formatEqlResult(result, this.obj, val);

	    this.params.showDiff = eql(type(this.obj), type(val)).result;

	    this.assert(result.result);
	  });

	  /**
	   * Exact comparison using ===.
	   *
	   * @name equal
	   * @memberOf Assertion
	   * @category assertion equality
	   * @alias Assertion#exactly
	   * @param {*} val Expected value
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * 10.should.be.equal(10);
	   * 'a'.should.be.exactly('a');
	   *
	   * should(null).be.exactly(null);
	   */
	  Assertion.add('equal', function(val, description) {
	    this.params = {operator: 'to be', expected: val, message: description};

	    this.params.showDiff = eql(type(this.obj), type(val)).result;

	    this.assert(val === this.obj);
	  });

	  Assertion.alias('equal', 'exactly');
	  Assertion.alias('eql', 'deepEqual');

	  function addOneOf(name, message, method) {
	    Assertion.add(name, function(vals) {
	      if(arguments.length !== 1) {
	        vals = Array.prototype.slice.call(arguments);
	      } else {
	        should(vals).be.Array();
	      }

	      this.params = {operator: message, expected: vals};

	      var obj = this.obj;
	      var found = false;

	      util.forEach(vals, function(val) {
	        try {
	          should(val)[method](obj);
	          found = true;
	          return false;
	        } catch(e) {
	          if(e instanceof should.AssertionError) {
	            return;//do nothing
	          }
	          throw e;
	        }
	      });

	      this.assert(found);
	    });
	  }

	  /**
	   * Exact comparison using === to be one of supplied objects.
	   *
	   * @name equalOneOf
	   * @memberOf Assertion
	   * @category assertion equality
	   * @param {Array|*} vals Expected values
	   * @example
	   *
	   * 'ab'.should.be.equalOneOf('a', 10, 'ab');
	   * 'ab'.should.be.equalOneOf(['a', 10, 'ab']);
	   */
	  addOneOf('equalOneOf', 'to be equals one of', 'equal');

	  /**
	   * Exact comparison using .eql to be one of supplied objects.
	   *
	   * @name oneOf
	   * @memberOf Assertion
	   * @category assertion equality
	   * @param {Array|*} vals Expected values
	   * @example
	   *
	   * ({a: 10}).should.be.oneOf('a', 10, 'ab', {a: 10});
	   * ({a: 10}).should.be.oneOf(['a', 10, 'ab', {a: 10}]);
	   */
	  addOneOf('oneOf', 'to be one of', 'eql');

	};


/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */

	var util = __webpack_require__(36);

	module.exports = function(should, Assertion) {
	  /**
	   * Assert given object is number
	   * @name Number
	   * @memberOf Assertion
	   * @category assertion types
	   */
	  Assertion.add('Number', function() {
	    this.params = {operator: 'to be a number'};

	    this.have.type('number');
	  });

	  /**
	   * Assert given object is arguments
	   * @name arguments
	   * @alias Assertion#Arguments
	   * @memberOf Assertion
	   * @category assertion types
	   */
	  Assertion.add('arguments', function() {
	    this.params = {operator: 'to be arguments'};

	    this.have.class('Arguments');
	  });

	  Assertion.alias('arguments', 'Arguments');

	  /**
	   * Assert given object has some type using `typeof`
	   * @name type
	   * @memberOf Assertion
	   * @param {string} type Type name
	   * @param {string} [description] Optional message
	   * @category assertion types
	   */
	  Assertion.add('type', function(type, description) {
	    this.params = {operator: 'to have type ' + type, message: description};

	    should(typeof this.obj).be.exactly(type);
	  });

	  /**
	   * Assert given object is instance of `constructor`
	   * @name instanceof
	   * @alias Assertion#instanceOf
	   * @memberOf Assertion
	   * @param {Function} constructor Constructor function
	   * @param {string} [description] Optional message
	   * @category assertion types
	   */
	  Assertion.add('instanceof', function(constructor, description) {
	    this.params = {operator: 'to be an instance of ' + util.functionName(constructor), message: description};

	    this.assert(Object(this.obj) instanceof constructor);
	  });

	  Assertion.alias('instanceof', 'instanceOf');

	  /**
	   * Assert given object is function
	   * @name Function
	   * @memberOf Assertion
	   * @category assertion types
	   */
	  Assertion.add('Function', function() {
	    this.params = {operator: 'to be a function'};

	    this.have.type('function');
	  });

	  /**
	   * Assert given object is object
	   * @name Object
	   * @memberOf Assertion
	   * @category assertion types
	   */
	  Assertion.add('Object', function() {
	    this.params = {operator: 'to be an object'};

	    this.is.not.null().and.have.type('object');
	  });

	  /**
	   * Assert given object is string
	   * @name String
	   * @memberOf Assertion
	   * @category assertion types
	   */
	  Assertion.add('String', function() {
	    this.params = {operator: 'to be a string'};

	    this.have.type('string');
	  });

	  /**
	   * Assert given object is array
	   * @name Array
	   * @memberOf Assertion
	   * @category assertion types
	   */
	  Assertion.add('Array', function() {
	    this.params = {operator: 'to be an array'};

	    this.have.class('Array');
	  });

	  /**
	   * Assert given object is boolean
	   * @name Boolean
	   * @memberOf Assertion
	   * @category assertion types
	   */
	  Assertion.add('Boolean', function() {
	    this.params = {operator: 'to be a boolean'};

	    this.have.type('boolean');
	  });

	  /**
	   * Assert given object is error
	   * @name Error
	   * @memberOf Assertion
	   * @category assertion types
	   */
	  Assertion.add('Error', function() {
	    this.params = {operator: 'to be an error'};

	    this.have.instanceOf(Error);
	  });

	  /**
	   * Assert given object is null
	   * @name null
	   * @alias Assertion#Null
	   * @memberOf Assertion
	   * @category assertion types
	   */
	  Assertion.add('null', function() {
	    this.params = {operator: 'to be null'};

	    this.assert(this.obj === null);
	  });

	  Assertion.alias('null', 'Null');

	  /**
	   * Assert given object has some internal [[Class]], via Object.prototype.toString call
	   * @name class
	   * @alias Assertion#Class
	   * @memberOf Assertion
	   * @category assertion types
	   */
	  Assertion.add('class', function(cls) {
	    this.params = {operator: 'to have [[Class]] ' + cls};

	    this.assert(Object.prototype.toString.call(this.obj) === '[object ' + cls + ']');
	  });

	  Assertion.alias('class', 'Class');

	  /**
	   * Assert given object is undefined
	   * @name undefined
	   * @alias Assertion#Undefined
	   * @memberOf Assertion
	   * @category assertion types
	   */
	  Assertion.add('undefined', function() {
	    this.params = {operator: 'to be undefined'};

	    this.assert(this.obj === void 0);
	  });

	  Assertion.alias('undefined', 'Undefined');

	  /**
	   * Assert given object supports es6 iterable protocol (just check
	   * that object has property Symbol.iterator, which is a function)
	   * @name iterable
	   * @memberOf Assertion
	   * @category assertion es6
	   */
	  Assertion.add('iterable', function() {
	    this.params = {operator: 'to be iterable'};

	    should(this.obj).have.property(Symbol.iterator).which.is.a.Function();
	  });

	  /**
	   * Assert given object supports es6 iterator protocol (just check
	   * that object has property next, which is a function)
	   * @name iterator
	   * @memberOf Assertion
	   * @category assertion es6
	   */
	  Assertion.add('iterator', function() {
	    this.params = {operator: 'to be iterator'};

	    should(this.obj).have.property('next').which.is.a.Function();
	  });

	  /**
	   * Assert given object is a generator object
	   * @name generator
	   * @memberOf Assertion
	   * @category assertion es6
	   */
	  Assertion.add('generator', function() {
	    this.params = {operator: 'to be generator'};

	    should(this.obj).be.iterable
	      .and.iterator
	      .and.it.is.equal(this.obj[Symbol.iterator]());
	  });
	};


/***/ },
/* 53 */
/***/ function(module, exports) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */

	module.exports = function(should, Assertion) {
	  /**
	   * Assert given string starts with prefix
	   * @name startWith
	   * @memberOf Assertion
	   * @category assertion strings
	   * @param {string} str Prefix
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * 'abc'.should.startWith('a');
	   */
	  Assertion.add('startWith', function(str, description) {
	    this.params = { operator: 'to start with ' + should.format(str), message: description };

	    this.assert(0 === this.obj.indexOf(str));
	  });

	  /**
	   * Assert given string starts with prefix
	   * @name endWith
	   * @memberOf Assertion
	   * @category assertion strings
	   * @param {string} str Prefix
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * 'abca'.should.endWith('a');
	   */
	  Assertion.add('endWith', function(str, description) {
	    this.params = { operator: 'to end with ' + should.format(str), message: description };

	    this.assert(this.obj.indexOf(str, this.obj.length - str.length) >= 0);
	  });
	};


/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */

	var util = __webpack_require__(36);
	var eql = __webpack_require__(46);

	var aSlice = Array.prototype.slice;

	module.exports = function(should, Assertion) {
	  var i = should.format;
	  /**
	   * Asserts given object has some descriptor. **On success it change given object to be value of property**.
	   *
	   * @name propertyWithDescriptor
	   * @memberOf Assertion
	   * @category assertion property
	   * @param {string} name Name of property
	   * @param {Object} desc Descriptor like used in Object.defineProperty (not required to add all properties)
	   * @example
	   *
	   * ({ a: 10 }).should.have.propertyWithDescriptor('a', { enumerable: true });
	   */
	  Assertion.add('propertyWithDescriptor', function(name, desc) {
	    this.params = {actual: this.obj, operator: 'to have own property with descriptor ' + i(desc)};
	    var obj = this.obj;
	    this.have.ownProperty(name);
	    should(Object.getOwnPropertyDescriptor(Object(obj), name)).have.properties(desc);
	  });

	  function processPropsArgs() {
	    var args = {};
	    if(arguments.length > 1) {
	      args.names = aSlice.call(arguments);
	    } else {
	      var arg = arguments[0];
	      if(typeof arg === 'string') {
	        args.names = [arg];
	      } else if(util.isIndexable(arg)) {
	        args.names = arg;
	      } else {
	        args.names = Object.keys(arg);
	        args.values = arg;
	      }
	    }
	    return args;
	  }


	  /**
	   * Asserts given object has enumerable property with optionally value. **On success it change given object to be value of property**.
	   *
	   * @name enumerable
	   * @memberOf Assertion
	   * @category assertion property
	   * @param {string} name Name of property
	   * @param {*} [val] Optional property value to check
	   * @example
	   *
	   * ({ a: 10 }).should.have.enumerable('a');
	   */
	  Assertion.add('enumerable', function(name, val) {
	    name = util.convertPropertyName(name);

	    this.params = {
	      operator: "to have enumerable property " + util.formatProp(name) + (arguments.length > 1 ? " equal to " + i(val): "")
	    };

	    var desc = { enumerable: true };
	    if(arguments.length > 1) desc.value = val;
	    this.have.propertyWithDescriptor(name, desc);
	  });

	  /**
	   * Asserts given object has enumerable properties
	   *
	   * @name enumerables
	   * @memberOf Assertion
	   * @category assertion property
	   * @param {Array|...string|Object} names Names of property
	   * @example
	   *
	   * ({ a: 10, b: 10 }).should.have.enumerables('a');
	   */
	  Assertion.add('enumerables', function(names) {
	    var args = processPropsArgs.apply(null, arguments);

	    this.params = {
	      operator: "to have enumerables " + args.names.map(util.formatProp)
	    };

	    var obj = this.obj;
	    args.names.forEach(function(name) {
	      should(obj).have.enumerable(name);
	    });
	  });

	  /**
	   * Asserts given object has property with optionally value. **On success it change given object to be value of property**.
	   *
	   * @name property
	   * @memberOf Assertion
	   * @category assertion property
	   * @param {string} name Name of property
	   * @param {*} [val] Optional property value to check
	   * @example
	   *
	   * ({ a: 10 }).should.have.property('a');
	   */
	  Assertion.add('property', function(name, val) {
	    name = util.convertPropertyName(name);
	    if(arguments.length > 1) {
	      var p = {};
	      p[name] = val;
	      this.have.properties(p);
	    } else {
	      this.have.properties(name);
	    }
	    this.obj = this.obj[name];
	  });

	  /**
	   * Asserts given object has properties. On this method affect .any modifier, which allow to check not all properties.
	   *
	   * @name properties
	   * @memberOf Assertion
	   * @category assertion property
	   * @param {Array|...string|Object} names Names of property
	   * @example
	   *
	   * ({ a: 10 }).should.have.properties('a');
	   * ({ a: 10, b: 20 }).should.have.properties([ 'a' ]);
	   * ({ a: 10, b: 20 }).should.have.properties({ b: 20 });
	   */
	  Assertion.add('properties', function(names) {
	    var values = {};
	    if(arguments.length > 1) {
	      names = aSlice.call(arguments);
	    } else if(!Array.isArray(names)) {
	      if(typeof names == 'string' || typeof names == 'symbol') {
	        names = [names];
	      } else {
	        values = names;
	        names = Object.keys(names);
	      }
	    }

	    var obj = Object(this.obj), missingProperties = [];

	    //just enumerate properties and check if they all present
	    names.forEach(function(name) {
	      if(!(name in obj)) missingProperties.push(util.formatProp(name));
	    });

	    var props = missingProperties;
	    if(props.length === 0) {
	      props = names.map(util.formatProp);
	    } else if(this.anyOne) {
	      props = names.filter(function(name) {
	        return missingProperties.indexOf(util.formatProp(name)) < 0;
	      }).map(util.formatProp);
	    }

	    var operator = (props.length === 1 ?
	        'to have property ' : 'to have ' + (this.anyOne ? 'any of ' : '') + 'properties ') + props.join(', ');

	    this.params = {obj: this.obj, operator: operator};

	    //check that all properties presented
	    //or if we request one of them that at least one them presented
	    this.assert(missingProperties.length === 0 || (this.anyOne && missingProperties.length != names.length));

	    // check if values in object matched expected
	    var valueCheckNames = Object.keys(values);
	    if(valueCheckNames.length) {
	      var wrongValues = [];
	      props = [];

	      // now check values, as there we have all properties
	      valueCheckNames.forEach(function(name) {
	        var value = values[name];
	        if(!eql(obj[name], value).result) {
	          wrongValues.push(util.formatProp(name) + ' of ' + i(value) + ' (got ' + i(obj[name]) + ')');
	        } else {
	          props.push(util.formatProp(name) + ' of ' + i(value));
	        }
	      });

	      if((wrongValues.length !== 0 && !this.anyOne) || (this.anyOne && props.length === 0)) {
	        props = wrongValues;
	      }

	      operator = (props.length === 1 ?
	        'to have property ' : 'to have ' + (this.anyOne ? 'any of ' : '') + 'properties ') + props.join(', ');

	      this.params = {obj: this.obj, operator: operator};

	      //if there is no not matched values
	      //or there is at least one matched
	      this.assert(wrongValues.length === 0 || (this.anyOne && wrongValues.length != valueCheckNames.length));
	    }
	  });

	  /**
	   * Asserts given object has property `length` with given value `n`
	   *
	   * @name length
	   * @alias Assertion#lengthOf
	   * @memberOf Assertion
	   * @category assertion property
	   * @param {number} n Expected length
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * [1, 2].should.have.length(2);
	   */
	  Assertion.add('length', function(n, description) {
	    this.have.property('length', n, description);
	  });

	  Assertion.alias('length', 'lengthOf');

	  var hasOwnProperty = Object.prototype.hasOwnProperty;

	  /**
	   * Asserts given object has own property. **On success it change given object to be value of property**.
	   *
	   * @name ownProperty
	   * @alias Assertion#hasOwnProperty
	   * @memberOf Assertion
	   * @category assertion property
	   * @param {string} name Name of property
	   * @param {string} [description] Optional message
	   * @example
	   *
	   * ({ a: 10 }).should.have.ownProperty('a');
	   */
	  Assertion.add('ownProperty', function(name, description) {
	    name = util.convertPropertyName(name);
	    this.params = {
	      actual: this.obj,
	      operator: 'to have own property ' + util.formatProp(name),
	      message: description
	    };

	    this.assert(hasOwnProperty.call(this.obj, name));

	    this.obj = this.obj[name];
	  });

	  Assertion.alias('ownProperty', 'hasOwnProperty');

	  /**
	   * Asserts given object is empty. For strings, arrays and arguments it checks .length property, for objects it checks keys.
	   *
	   * @name empty
	   * @memberOf Assertion
	   * @category assertion property
	   * @example
	   *
	   * ''.should.be.empty();
	   * [].should.be.empty();
	   * ({}).should.be.empty();
	   */
	  Assertion.add('empty', function() {
	    this.params = {operator: 'to be empty'};

	    if(util.length(this.obj) !== void 0) {
	      should(this.obj).have.property('length', 0);
	    } else {
	      var obj = Object(this.obj); // wrap to reference for booleans and numbers
	      for(var prop in obj) {
	        should(this.obj).not.have.ownProperty(prop);
	      }
	    }
	  }, true);

	  /**
	   * Asserts given object has exact keys. Compared to `properties`, `keys` does not accept Object as a argument.
	   *
	   * @name keys
	   * @alias Assertion#key
	   * @memberOf Assertion
	   * @category assertion property
	   * @param {Array|...string} [keys] Keys to check
	   * @example
	   *
	   * ({ a: 10 }).should.have.keys('a');
	   * ({ a: 10, b: 20 }).should.have.keys('a', 'b');
	   * ({ a: 10, b: 20 }).should.have.keys([ 'a', 'b' ]);
	   * ({}).should.have.keys();
	   */
	  Assertion.add('keys', function(keys) {
	    if(arguments.length > 1) keys = aSlice.call(arguments);
	    else if(arguments.length === 1 && typeof keys === 'string') keys = [keys];
	    else if(arguments.length === 0) keys = [];

	    keys = keys.map(String);

	    var obj = Object(this.obj);

	    // first check if some keys are missing
	    var missingKeys = [];
	    keys.forEach(function(key) {
	      if(!hasOwnProperty.call(this.obj, key))
	        missingKeys.push(util.formatProp(key));
	    }, this);

	    // second check for extra keys
	    var extraKeys = [];
	    Object.keys(obj).forEach(function(key) {
	      if(keys.indexOf(key) < 0) {
	        extraKeys.push(util.formatProp(key));
	      }
	    });

	    var verb = keys.length === 0 ? 'to be empty' :
	    'to have ' + (keys.length === 1 ? 'key ' : 'keys ');

	    this.params = {operator: verb + keys.map(util.formatProp).join(', ')};

	    if(missingKeys.length > 0)
	      this.params.operator += '\n\tmissing keys: ' + missingKeys.join(', ');

	    if(extraKeys.length > 0)
	      this.params.operator += '\n\textra keys: ' + extraKeys.join(', ');

	    this.assert(missingKeys.length === 0 && extraKeys.length === 0);
	  });

	  Assertion.alias("keys", "key");

	  /**
	   * Asserts given object has nested property in depth by path. **On success it change given object to be value of final property**.
	   *
	   * @name propertyByPath
	   * @memberOf Assertion
	   * @category assertion property
	   * @param {Array|...string} properties Properties path to search
	   * @example
	   *
	   * ({ a: {b: 10}}).should.have.propertyByPath('a', 'b').eql(10);
	   */
	  Assertion.add('propertyByPath', function(properties) {
	    if(arguments.length > 1) properties = aSlice.call(arguments);
	    else if(arguments.length === 1 && typeof properties == 'string') properties = [properties];
	    else if(arguments.length === 0) properties = [];

	    var allProps = properties.map(util.formatProp);

	    properties = properties.map(String);

	    var obj = should(Object(this.obj));

	    var foundProperties = [];

	    var currentProperty;
	    while(currentProperty = properties.shift()) {
	      this.params = {operator: 'to have property by path ' + allProps.join(', ') + ' - failed on ' + util.formatProp(currentProperty)};
	      obj = obj.have.property(currentProperty);
	      foundProperties.push(currentProperty);
	    }

	    this.params = {obj: this.obj, operator: 'to have property by path ' + allProps.join(', ')};

	    this.obj = obj.obj;
	  });
	};


/***/ },
/* 55 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */
	var util = __webpack_require__(36);

	module.exports = function(should, Assertion) {
	  var i = should.format;

	  /**
	   * Assert given function throws error with such message.
	   *
	   * @name throw
	   * @memberOf Assertion
	   * @category assertion errors
	   * @alias Assertion#throwError
	   * @param {string|RegExp|Function|Object|GeneratorFunction|GeneratorObject} [message] Message to match or properties
	   * @param {Object} [properties] Optional properties that will be matched to thrown error
	   * @example
	   *
	   * (function(){ throw new Error('fail') }).should.throw();
	   * (function(){ throw new Error('fail') }).should.throw('fail');
	   * (function(){ throw new Error('fail') }).should.throw(/fail/);
	   *
	   * (function(){ throw new Error('fail') }).should.throw(Error);
	   * var error = new Error();
	   * error.a = 10;
	   * (function(){ throw error; }).should.throw(Error, { a: 10 });
	   * (function(){ throw error; }).should.throw({ a: 10 });
	   * (function*() {
	   *   yield throwError();
	   * }).should.throw();
	   */
	  Assertion.add('throw', function(message, properties) {
	    var fn = this.obj
	      , err = {}
	      , errorInfo = ''
	      , thrown = false;

	    if(util.isGeneratorFunction(fn)) {
	      return should(fn()).throw(message, properties);
	    } else if(util.isGeneratorObject(fn)) {
	      return should(fn.next.bind(fn)).throw(message, properties);
	    }

	    this.is.a.Function();

	    var errorMatched = true;

	    try {
	      fn();
	    } catch(e) {
	      thrown = true;
	      err = e;
	    }

	    if(thrown) {
	      if(message) {
	        if('string' == typeof message) {
	          errorMatched = message == err.message;
	        } else if(message instanceof RegExp) {
	          errorMatched = message.test(err.message);
	        } else if('function' == typeof message) {
	          errorMatched = err instanceof message;
	        } else if(null != message) {
	          try {
	            should(err).match(message);
	          } catch(e) {
	            if(e instanceof should.AssertionError) {
	              errorInfo = ": " + e.message;
	              errorMatched = false;
	            } else {
	              throw e;
	            }
	          }
	        }

	        if(!errorMatched) {
	          if('string' == typeof message || message instanceof RegExp) {
	            errorInfo = " with a message matching " + i(message) + ", but got '" + err.message + "'";
	          } else if('function' == typeof message) {
	            errorInfo = " of type " + util.functionName(message) + ", but got " + util.functionName(err.constructor);
	          }
	        } else if('function' == typeof message && properties) {
	          try {
	            should(err).match(properties);
	          } catch(e) {
	            if(e instanceof should.AssertionError) {
	              errorInfo = ": " + e.message;
	              errorMatched = false;
	            } else {
	              throw e;
	            }
	          }
	        }
	      } else {
	        errorInfo = " (got " + i(err) + ")";
	      }
	    }

	    this.params = { operator: 'to throw exception' + errorInfo };

	    this.assert(thrown);
	    this.assert(errorMatched);
	  });

	  Assertion.alias('throw', 'throwError');
	};


/***/ },
/* 56 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */

	var util = __webpack_require__(36);
	var eql = __webpack_require__(46);

	module.exports = function(should, Assertion) {
	  var i = should.format;

	  /**
	   * Asserts if given object match `other` object, using some assumptions:
	   * First object matched if they are equal,
	   * If `other` is a regexp and given object is a string check on matching with regexp
	   * If `other` is a regexp and given object is an array check if all elements matched regexp
	   * If `other` is a regexp and given object is an object check values on matching regexp
	   * If `other` is a function check if this function throws AssertionError on given object or return false - it will be assumed as not matched
	   * If `other` is an object check if the same keys matched with above rules
	   * All other cases failed
	   *
	   * @name match
	   * @memberOf Assertion
	   * @category assertion matching
	   * @param {*} other Object to match
	   * @param {string} [description] Optional message
	   * @example
	   * 'foobar'.should.match(/^foo/);
	   * 'foobar'.should.not.match(/^bar/);
	   *
	   * ({ a: 'foo', c: 'barfoo' }).should.match(/foo$/);
	   *
	   * ['a', 'b', 'c'].should.match(/[a-z]/);
	   *
	   * (5).should.not.match(function(n) {
	   *   return n < 0;
	   * });
	   * (5).should.not.match(function(it) {
	   *    it.should.be.an.Array();
	   * });
	   * ({ a: 10, b: 'abc', c: { d: 10 }, d: 0 }).should
	   * .match({ a: 10, b: /c$/, c: function(it) {
	   *    return it.should.have.property('d', 10);
	   * }});
	   *
	   * [10, 'abc', { d: 10 }, 0].should
	   * .match({ '0': 10, '1': /c$/, '2': function(it) {
	   *    return it.should.have.property('d', 10);
	   * }});
	   */
	  Assertion.add('match', function(other, description) {
	    this.params = {operator: 'to match ' + i(other), message: description};

	    if(!eql(this.obj, other).result) {
	      if(other instanceof RegExp) { // something - regex

	        if(typeof this.obj == 'string') {

	          this.assert(other.exec(this.obj));
	        } else if(util.isIndexable(this.obj)) {
	          util.forEach(this.obj, function(item) {
	            this.assert(other.exec(item));// should we try to convert to String and exec?
	          }, this);
	        } else if(null != this.obj && typeof this.obj == 'object') {

	          var notMatchedProps = [], matchedProps = [];
	          util.forEach(this.obj, function(value, name) {
	            if(other.exec(value)) matchedProps.push(util.formatProp(name));
	            else notMatchedProps.push(util.formatProp(name) + ' (' + i(value) + ')');
	          }, this);

	          if(notMatchedProps.length)
	            this.params.operator += '\n    not matched properties: ' + notMatchedProps.join(', ');
	          if(matchedProps.length)
	            this.params.operator += '\n    matched properties: ' + matchedProps.join(', ');

	          this.assert(notMatchedProps.length === 0);
	        } // should we try to convert to String and exec?
	      } else if(typeof other == 'function') {
	        var res;

	        res = other(this.obj);

	        //if(res instanceof Assertion) {
	        //  this.params.operator += '\n    ' + res.getMessage();
	        //}

	        //if we throw exception ok - it is used .should inside
	        if(typeof res == 'boolean') {
	          this.assert(res); // if it is just boolean function assert on it
	        }
	      } else if(other != null && typeof other == 'object') { // try to match properties (for Object and Array)
	        notMatchedProps = [];
	        matchedProps = [];

	        util.forEach(other, function(value, key) {
	          try {
	            should(this.obj).have.property(key).which.match(value);
	            matchedProps.push(util.formatProp(key));
	          } catch(e) {
	            if(e instanceof should.AssertionError) {
	              notMatchedProps.push(util.formatProp(key) + ' (' + i(this.obj[key]) + ')');
	            } else {
	              throw e;
	            }
	          }
	        }, this);

	        if(notMatchedProps.length)
	          this.params.operator += '\n    not matched properties: ' + notMatchedProps.join(', ');
	        if(matchedProps.length)
	          this.params.operator += '\n    matched properties: ' + matchedProps.join(', ');

	        this.assert(notMatchedProps.length === 0);
	      } else {
	        this.assert(false);
	      }
	    }
	  });

	  /**
	   * Asserts if given object values or array elements all match `other` object, using some assumptions:
	   * First object matched if they are equal,
	   * If `other` is a regexp - matching with regexp
	   * If `other` is a function check if this function throws AssertionError on given object or return false - it will be assumed as not matched
	   * All other cases check if this `other` equal to each element
	   *
	   * @name matchEach
	   * @memberOf Assertion
	   * @category assertion matching
	   * @alias Assertion#matchSome
	   * @param {*} other Object to match
	   * @param {string} [description] Optional message
	   * @example
	   * [ 'a', 'b', 'c'].should.matchEach(/\w+/);
	   * [ 'a', 'a', 'a'].should.matchEach('a');
	   *
	   * [ 'a', 'a', 'a'].should.matchEach(function(value) { value.should.be.eql('a') });
	   *
	   * { a: 'a', b: 'a', c: 'a' }.should.matchEach(function(value) { value.should.be.eql('a') });
	   */
	  Assertion.add('matchEach', function(other, description) {
	    this.params = {operator: 'to match each ' + i(other), message: description};

	    util.forEach(this.obj, function(value) {
	      should(value).match(other);
	    }, this);
	  });

	  /**
	  * Asserts if any of given object values or array elements match `other` object, using some assumptions:
	  * First object matched if they are equal,
	  * If `other` is a regexp - matching with regexp
	  * If `other` is a function check if this function throws AssertionError on given object or return false - it will be assumed as not matched
	  * All other cases check if this `other` equal to each element
	  *
	  * @name matchAny
	  * @memberOf Assertion
	  * @category assertion matching
	  * @param {*} other Object to match
	  * @alias Assertion#matchEvery
	  * @param {string} [description] Optional message
	  * @example
	  * [ 'a', 'b', 'c'].should.matchAny(/\w+/);
	  * [ 'a', 'b', 'c'].should.matchAny('a');
	  *
	  * [ 'a', 'b', 'c'].should.matchAny(function(value) { value.should.be.eql('a') });
	  *
	  * { a: 'a', b: 'b', c: 'c' }.should.matchAny(function(value) { value.should.be.eql('a') });
	  */
	  Assertion.add('matchAny', function(other, description) {
	    this.params = {operator: 'to match any ' + i(other), message: description};

	    this.assert(util.some(this.obj, function(value) {
	      try {
	        should(value).match(other);
	        return true;
	      } catch(e) {
	        if(e instanceof should.AssertionError) {
	          // Caught an AssertionError, return false to the iterator
	          return false;
	        }
	        throw e;
	      }
	    }));
	  });

	  Assertion.alias('matchAny', 'matchSome');
	  Assertion.alias('matchEach', 'matchEvery');
	};


/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * Should
	 * Copyright(c) 2010-2014 TJ Holowaychuk <tj@vision-media.ca>
	 * MIT Licensed
	 */

	var util = __webpack_require__(36);
	var eql = __webpack_require__(46);

	module.exports = function(should, Assertion) {
	  var i = should.format;

	  /**
	   * Assert that given object contain something that equal to `other`. It uses `should-equal` for equality checks.
	   * If given object is array it search that one of elements was equal to `other`.
	   * If given object is string it checks if `other` is a substring - expected that `other` is a string.
	   * If given object is Object it checks that `other` is a subobject - expected that `other` is a object.
	   *
	   * @name containEql
	   * @memberOf Assertion
	   * @category assertion contain
	   * @param {*} other Nested object
	   * @example
	   *
	   * [1, 2, 3].should.containEql(1);
	   * [{ a: 1 }, 'a', 10].should.containEql({ a: 1 });
	   *
	   * 'abc'.should.containEql('b');
	   * 'ab1c'.should.containEql(1);
	   *
	   * ({ a: 10, c: { d: 10 }}).should.containEql({ a: 10 });
	   * ({ a: 10, c: { d: 10 }}).should.containEql({ c: { d: 10 }});
	   * ({ a: 10, c: { d: 10 }}).should.containEql({ b: 10 });
	   * // throws AssertionError: expected { a: 10, c: { d: 10 } } to contain { b: 10 }
	   * //            expected { a: 10, c: { d: 10 } } to have property b
	   */
	  Assertion.add('containEql', function(other) {
	    this.params = {operator: 'to contain ' + i(other)};

	    this.is.not.null().and.not.undefined();

	    var obj = this.obj;

	    if(typeof obj == 'string') {
	      this.assert(obj.indexOf(String(other)) >= 0);
	    } else if(util.isIndexable(obj)) {
	      this.assert(util.some(obj, function(v) {
	        return eql(v, other).result;
	      }));
	    } else {
	      this.have.properties(other);
	    }
	  });

	  /**
	   * Assert that given object is contain equally structured object on the same depth level.
	   * If given object is an array and `other` is an array it checks that the eql elements is going in the same sequence in given array (recursive)
	   * If given object is an object it checks that the same keys contain deep equal values (recursive)
	   * On other cases it try to check with `.eql`
	   *
	   * @name containDeepOrdered
	   * @memberOf Assertion
	   * @category assertion contain
	   * @param {*} other Nested object
	   * @example
	   *
	   * [ 1, 2, 3].should.containDeepOrdered([1, 2]);
	   * [ 1, 2, [ 1, 2, 3 ]].should.containDeepOrdered([ 1, [ 2, 3 ]]);
	   *
	   * ({ a: 10, b: { c: 10, d: [1, 2, 3] }}).should.containDeepOrdered({a: 10});
	   * ({ a: 10, b: { c: 10, d: [1, 2, 3] }}).should.containDeepOrdered({b: {c: 10}});
	   * ({ a: 10, b: { c: 10, d: [1, 2, 3] }}).should.containDeepOrdered({b: {d: [1, 3]}});
	   */
	  Assertion.add('containDeepOrdered', function(other) {
	    this.params = {operator: 'to contain ' + i(other)};

	    var obj = this.obj;
	    if(typeof obj == 'string') {// expect other to be string
	      this.is.equal(String(other));
	    } else if(util.isIndexable(obj) && util.isIndexable(other)) {
	      for(var objIdx = 0, otherIdx = 0, objLength = util.length(obj), otherLength = util.length(other); objIdx < objLength && otherIdx < otherLength; objIdx++) {
	        try {
	          should(obj[objIdx]).containDeepOrdered(other[otherIdx]);
	          otherIdx++;
	        } catch(e) {
	          if(e instanceof should.AssertionError) {
	            continue;
	          }
	          throw e;
	        }
	      }

	      this.assert(otherIdx === otherLength);
	    } else if(obj != null && other != null && typeof obj == 'object' && typeof other == 'object') {// object contains object case
	      util.forEach(other, function(value, key) {
	        should(obj[key]).containDeepOrdered(value);
	      });

	      // if both objects is empty means we finish traversing - and we need to compare for hidden values
	      if(util.isEmptyObject(other)) {
	        this.eql(other);
	      }
	    } else {
	      this.eql(other);
	    }
	  });

	  /**
	   * The same like `Assertion#containDeepOrdered` but all checks on arrays without order.
	   *
	   * @name containDeep
	   * @memberOf Assertion
	   * @category assertion contain
	   * @param {*} other Nested object
	   * @example
	   *
	   * [ 1, 2, 3].should.containDeep([2, 1]);
	   * [ 1, 2, [ 1, 2, 3 ]].should.containDeep([ 1, [ 3, 1 ]]);
	   */
	  Assertion.add('containDeep', function(other) {
	    this.params = {operator: 'to contain ' + i(other)};

	    var obj = this.obj;
	    if(typeof obj == 'string') {// expect other to be string
	      this.is.equal(String(other));
	    } else if(util.isIndexable(obj) && util.isIndexable(other)) {
	      var usedKeys = {};
	      util.forEach(other, function(otherItem) {
	        this.assert(util.some(obj, function(item, index) {
	          if(index in usedKeys) return false;

	          try {
	            should(item).containDeep(otherItem);
	            usedKeys[index] = true;
	            return true;
	          } catch(e) {
	            if(e instanceof should.AssertionError) {
	              return false;
	            }
	            throw e;
	          }
	        }));
	      }, this);
	    } else if(obj != null && other != null && typeof obj == 'object' && typeof other == 'object') {// object contains object case
	      util.forEach(other, function(value, key) {
	        should(obj[key]).containDeep(value);
	      });

	      // if both objects is empty means we finish traversing - and we need to compare for hidden values
	      if(util.isEmptyObject(other)) {
	        this.eql(other);
	      }
	    } else {
	      this.eql(other);
	    }
	  });

	};


/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

	/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
	/// <reference path="../types/node.d.ts" />
	/// <reference path="../types/should.d.ts" />
	var Ax = __webpack_require__(1);
	var Rx = __webpack_require__(2);
	function getExampleAnimator(width, height) {
	    if (width === void 0) { width = 100; }
	    if (height === void 0) { height = 100; }
	    try {
	        // In a browser environment, find a canvas
	        var canvas = document.getElementById("canvas");
	        console.log("browser", canvas);
	    }
	    catch (err) {
	        // in a node.js environment, load a fake canvas
	        console.log(err);
	        var Canvas = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"canvas\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));
	        var canvas = new Canvas(width, height);
	        console.log("node", canvas);
	    }
	    var context = canvas.getContext('2d');
	    return new Ax.Animator(context);
	}
	exports.getExampleAnimator = getExampleAnimator;
	function playExample(name, frames, animator, width, height) {
	    try {
	        //browser
	        var time;
	        var render = function () {
	            window.requestAnimationFrame(render);
	            var now = new Date().getTime(), dt = now - (time || now);
	            time = now;
	            animator.root.onNext(new Ax.DrawTick(animator.ctx, 0, dt * 0.001));
	        };
	        render();
	    }
	    catch (err) {
	        //node.js
	        animator.play(Ax.save(width, height, "images/" + name + ".gif"));
	        animator.ticker(Rx.Observable.return(0.1).repeat(frames));
	    }
	}
	exports.playExample = playExample;
	function sameExample(name, ref, cb) {
	    try {
	        throw new Error("not implemented");
	    }
	    catch (err) {
	        //node.js
	        var cmp = __webpack_require__(59);
	        var file1 = "images/" + name + ".gif";
	        var file2 = "images/" + ref + ".gif";
	        return cmp.compare(file1, file2, cb);
	    }
	}
	exports.sameExample = sameExample;


/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Compare two files base on their computed hash rather than just size or timestamp
	 * usage: compare(file1, file2, [algo], callback);
	 * where:
	 *    file1 - required string path to file 1
	 *    file2 - required string path to file 2
	 *    algo - option string algorithm for hash computation
	 *    callback - required callaback(copied, err)
	 *    where: 
	 *       copied - boolean indicating if compare succeeded
	 *       err - Error if there was a problem with the compare
	 */
	exports.compare = function() {
	    var Args = __webpack_require__(60).Constructor;

	    /**
	     * Common argument checking for crop and resize
	     */
	    function checkCommonArgs(args) {
	        if (args.length < 2) throw new Error("File1, File2, and callback required");
	        if (typeof args.at(1) != "string") throw new Error("File2 required");
	        if (typeof args.at(0) != "string") throw new Error("File1 required");
	        if (!args.callbackGiven()) throw new Error("Callback required");
	    }
	    var args = new Args(arguments);
	    checkCommonArgs(args);
	    var file1 = args.at(0);
	    var file2 = args.at(1);
	    var algo = "sha1";
	    var callback = args.callback;
	    if (args.length === 3) {
	        if (typeof args.at(2) !== "string") throw new Error("Algorithm must be a string");
	        algo = args.at(2);
	    } else if (args.length > 3) {
	        throw new Error("Invalid args length: " + args.length);
	    }
	    /**
	    * Call the hash algorithms for each file, and send result to callback
	    */
	    computeHash(file2, algo, function (file2hash, err) {
	        if (err) {
	           callback(false, err);
	        } else {
	           computeHash(file1, algo, function (file1hash, err) {
	              callback(file1hash === file2hash, err);
	           });
	        }
	    });
	};

	/**
	 * Create a new hash of given file name
	 */
	function computeHash(filename, algo, callback) {
	    var crypto = __webpack_require__(61);
	    var fs = __webpack_require__(33);

	    var chksum = crypto.createHash(algo);

	    var s = fs.ReadStream(filename);
	    s.on('error', function (err) {
	        //no file, hash will be zero
	        callback(0, err);
	    });
	    s.on('data', function (d) {
	        chksum.update(d);
	    });

	    s.on('end', function () {
	        var d = chksum.digest('hex');
	        //util.debug(d + '  ' + filename);
	        callback(d);
	    });
	}


/***/ },
/* 60 */
/***/ function(module, exports) {

	//
	// vargs.js
	//
	//   variable argument handling for functions taking a callback
	//
	// usage:
	//   
	//   var Args = new("vargs").Constructor;
	//
	//   function (/* [arg1, arg2, ...][,callback] */) {
	//       var args = new(Args)(arguments);
	//       
	//       args.first;    // first argument
	//       args.last;     // last argument before callback
	//       args.callback; // callback argument, or an empty function
	//       args.all;      // all arguments except callback
	//       args.length;   // number of arguments, not including callback
	//       
	//       args.callbackGiven() // returns true or false
	//       args.at(-1)          // last argument, including callback
	//       args.array           // all arguments, including callback
	//   }
	//
	exports.Constructor = function Vargs(arguments) {
	    this.array = Array.prototype.slice.call(arguments);
	    this.__defineGetter__('length', function () {
	        if (this.callbackGiven()) {
	            return this.array.length - 1;
	        } else {
	            return this.array.length;
	        }
	    });
	    this.__defineGetter__('all', function () {
	        if (this.callbackGiven()) {
	            return this.array.slice(0, -1);
	        } else {
	            return this.array;
	        }
	    });
	    this.__defineGetter__('last', function () {
	        if (typeof(this.at(-1)) === 'function') {
	            return this.at(-2);
	        } else {
	            return this.at(-1);
	        }
	    });
	    this.__defineGetter__('first', function () {
	        return this.array[0];
	    });
	    this.callback = this.callbackGiven() ? this.at(-1)
	                                         : function () {};
	};

	exports.Constructor.prototype = {
	    callbackGiven: function () {
	        return typeof(this.at(-1)) === 'function';
	    },
	    at: function (n) {
	        if (n < 0) {
	            return this.array[this.array.length + n];
	        } else {
	            return this.array[n];
	        }
	    }
	};

	exports.Constructor.last = function (args) {
	    return args[args.length - 1];
	};



/***/ },
/* 61 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var rng = __webpack_require__(62)

	function error () {
	  var m = [].slice.call(arguments).join(' ')
	  throw new Error([
	    m,
	    'we accept pull requests',
	    'http://github.com/dominictarr/crypto-browserify'
	    ].join('\n'))
	}

	exports.createHash = __webpack_require__(64)

	exports.createHmac = __webpack_require__(76)

	exports.randomBytes = function(size, callback) {
	  if (callback && callback.call) {
	    try {
	      callback.call(this, undefined, new Buffer(rng(size)))
	    } catch (err) { callback(err) }
	  } else {
	    return new Buffer(rng(size))
	  }
	}

	function each(a, f) {
	  for(var i in a)
	    f(a[i], i)
	}

	exports.getHashes = function () {
	  return ['sha1', 'sha256', 'sha512', 'md5', 'rmd160']
	}

	var p = __webpack_require__(77)(exports)
	exports.pbkdf2 = p.pbkdf2
	exports.pbkdf2Sync = p.pbkdf2Sync


	// the least I can do is make error messages for the rest of the node.js/crypto api.
	each(['createCredentials'
	, 'createCipher'
	, 'createCipheriv'
	, 'createDecipher'
	, 'createDecipheriv'
	, 'createSign'
	, 'createVerify'
	, 'createDiffieHellman'
	], function (name) {
	  exports[name] = function () {
	    error('sorry,', name, 'is not implemented yet')
	  }
	})

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9).Buffer))

/***/ },
/* 62 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, Buffer) {(function() {
	  var g = ('undefined' === typeof window ? global : window) || {}
	  _crypto = (
	    g.crypto || g.msCrypto || __webpack_require__(63)
	  )
	  module.exports = function(size) {
	    // Modern Browsers
	    if(_crypto.getRandomValues) {
	      var bytes = new Buffer(size); //in browserify, this is an extended Uint8Array
	      /* This will not work in older browsers.
	       * See https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
	       */
	    
	      _crypto.getRandomValues(bytes);
	      return bytes;
	    }
	    else if (_crypto.randomBytes) {
	      return _crypto.randomBytes(size)
	    }
	    else
	      throw new Error(
	        'secure random number generation not supported by this browser\n'+
	        'use chrome, FireFox or Internet Explorer 11'
	      )
	  }
	}())

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(9).Buffer))

/***/ },
/* 63 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 64 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var createHash = __webpack_require__(65)

	var md5 = toConstructor(__webpack_require__(73))
	var rmd160 = toConstructor(__webpack_require__(75))

	function toConstructor (fn) {
	  return function () {
	    var buffers = []
	    var m= {
	      update: function (data, enc) {
	        if(!Buffer.isBuffer(data)) data = new Buffer(data, enc)
	        buffers.push(data)
	        return this
	      },
	      digest: function (enc) {
	        var buf = Buffer.concat(buffers)
	        var r = fn(buf)
	        buffers = null
	        return enc ? r.toString(enc) : r
	      }
	    }
	    return m
	  }
	}

	module.exports = function (alg) {
	  if('md5' === alg) return new md5()
	  if('rmd160' === alg) return new rmd160()
	  return createHash(alg)
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9).Buffer))

/***/ },
/* 65 */
/***/ function(module, exports, __webpack_require__) {

	var exports = module.exports = function (alg) {
	  var Alg = exports[alg]
	  if(!Alg) throw new Error(alg + ' is not supported (we accept pull requests)')
	  return new Alg()
	}

	var Buffer = __webpack_require__(9).Buffer
	var Hash   = __webpack_require__(66)(Buffer)

	exports.sha1 = __webpack_require__(67)(Buffer, Hash)
	exports.sha256 = __webpack_require__(71)(Buffer, Hash)
	exports.sha512 = __webpack_require__(72)(Buffer, Hash)


/***/ },
/* 66 */
/***/ function(module, exports) {

	module.exports = function (Buffer) {

	  //prototype class for hash functions
	  function Hash (blockSize, finalSize) {
	    this._block = new Buffer(blockSize) //new Uint32Array(blockSize/4)
	    this._finalSize = finalSize
	    this._blockSize = blockSize
	    this._len = 0
	    this._s = 0
	  }

	  Hash.prototype.init = function () {
	    this._s = 0
	    this._len = 0
	  }

	  Hash.prototype.update = function (data, enc) {
	    if ("string" === typeof data) {
	      enc = enc || "utf8"
	      data = new Buffer(data, enc)
	    }

	    var l = this._len += data.length
	    var s = this._s = (this._s || 0)
	    var f = 0
	    var buffer = this._block

	    while (s < l) {
	      var t = Math.min(data.length, f + this._blockSize - (s % this._blockSize))
	      var ch = (t - f)

	      for (var i = 0; i < ch; i++) {
	        buffer[(s % this._blockSize) + i] = data[i + f]
	      }

	      s += ch
	      f += ch

	      if ((s % this._blockSize) === 0) {
	        this._update(buffer)
	      }
	    }
	    this._s = s

	    return this
	  }

	  Hash.prototype.digest = function (enc) {
	    // Suppose the length of the message M, in bits, is l
	    var l = this._len * 8

	    // Append the bit 1 to the end of the message
	    this._block[this._len % this._blockSize] = 0x80

	    // and then k zero bits, where k is the smallest non-negative solution to the equation (l + 1 + k) === finalSize mod blockSize
	    this._block.fill(0, this._len % this._blockSize + 1)

	    if (l % (this._blockSize * 8) >= this._finalSize * 8) {
	      this._update(this._block)
	      this._block.fill(0)
	    }

	    // to this append the block which is equal to the number l written in binary
	    // TODO: handle case where l is > Math.pow(2, 29)
	    this._block.writeInt32BE(l, this._blockSize - 4)

	    var hash = this._update(this._block) || this._hash()

	    return enc ? hash.toString(enc) : hash
	  }

	  Hash.prototype._update = function () {
	    throw new Error('_update must be implemented by subclass')
	  }

	  return Hash
	}


/***/ },
/* 67 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
	 * in FIPS PUB 180-1
	 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 * Distributed under the BSD License
	 * See http://pajhome.org.uk/crypt/md5 for details.
	 */

	var inherits = __webpack_require__(68).inherits

	module.exports = function (Buffer, Hash) {

	  var A = 0|0
	  var B = 4|0
	  var C = 8|0
	  var D = 12|0
	  var E = 16|0

	  var W = new (typeof Int32Array === 'undefined' ? Array : Int32Array)(80)

	  var POOL = []

	  function Sha1 () {
	    if(POOL.length)
	      return POOL.pop().init()

	    if(!(this instanceof Sha1)) return new Sha1()
	    this._w = W
	    Hash.call(this, 16*4, 14*4)

	    this._h = null
	    this.init()
	  }

	  inherits(Sha1, Hash)

	  Sha1.prototype.init = function () {
	    this._a = 0x67452301
	    this._b = 0xefcdab89
	    this._c = 0x98badcfe
	    this._d = 0x10325476
	    this._e = 0xc3d2e1f0

	    Hash.prototype.init.call(this)
	    return this
	  }

	  Sha1.prototype._POOL = POOL
	  Sha1.prototype._update = function (X) {

	    var a, b, c, d, e, _a, _b, _c, _d, _e

	    a = _a = this._a
	    b = _b = this._b
	    c = _c = this._c
	    d = _d = this._d
	    e = _e = this._e

	    var w = this._w

	    for(var j = 0; j < 80; j++) {
	      var W = w[j] = j < 16 ? X.readInt32BE(j*4)
	        : rol(w[j - 3] ^ w[j -  8] ^ w[j - 14] ^ w[j - 16], 1)

	      var t = add(
	        add(rol(a, 5), sha1_ft(j, b, c, d)),
	        add(add(e, W), sha1_kt(j))
	      )

	      e = d
	      d = c
	      c = rol(b, 30)
	      b = a
	      a = t
	    }

	    this._a = add(a, _a)
	    this._b = add(b, _b)
	    this._c = add(c, _c)
	    this._d = add(d, _d)
	    this._e = add(e, _e)
	  }

	  Sha1.prototype._hash = function () {
	    if(POOL.length < 100) POOL.push(this)
	    var H = new Buffer(20)
	    //console.log(this._a|0, this._b|0, this._c|0, this._d|0, this._e|0)
	    H.writeInt32BE(this._a|0, A)
	    H.writeInt32BE(this._b|0, B)
	    H.writeInt32BE(this._c|0, C)
	    H.writeInt32BE(this._d|0, D)
	    H.writeInt32BE(this._e|0, E)
	    return H
	  }

	  /*
	   * Perform the appropriate triplet combination function for the current
	   * iteration
	   */
	  function sha1_ft(t, b, c, d) {
	    if(t < 20) return (b & c) | ((~b) & d);
	    if(t < 40) return b ^ c ^ d;
	    if(t < 60) return (b & c) | (b & d) | (c & d);
	    return b ^ c ^ d;
	  }

	  /*
	   * Determine the appropriate additive constant for the current iteration
	   */
	  function sha1_kt(t) {
	    return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
	           (t < 60) ? -1894007588 : -899497514;
	  }

	  /*
	   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
	   * to work around bugs in some JS interpreters.
	   * //dominictarr: this is 10 years old, so maybe this can be dropped?)
	   *
	   */
	  function add(x, y) {
	    return (x + y ) | 0
	  //lets see how this goes on testling.
	  //  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
	  //  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	  //  return (msw << 16) | (lsw & 0xFFFF);
	  }

	  /*
	   * Bitwise rotate a 32-bit number to the left.
	   */
	  function rol(num, cnt) {
	    return (num << cnt) | (num >>> (32 - cnt));
	  }

	  return Sha1
	}


/***/ },
/* 68 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {// Copyright Joyent, Inc. and other Node contributors.
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

	var formatRegExp = /%[sdj%]/g;
	exports.format = function(f) {
	  if (!isString(f)) {
	    var objects = [];
	    for (var i = 0; i < arguments.length; i++) {
	      objects.push(inspect(arguments[i]));
	    }
	    return objects.join(' ');
	  }

	  var i = 1;
	  var args = arguments;
	  var len = args.length;
	  var str = String(f).replace(formatRegExp, function(x) {
	    if (x === '%%') return '%';
	    if (i >= len) return x;
	    switch (x) {
	      case '%s': return String(args[i++]);
	      case '%d': return Number(args[i++]);
	      case '%j':
	        try {
	          return JSON.stringify(args[i++]);
	        } catch (_) {
	          return '[Circular]';
	        }
	      default:
	        return x;
	    }
	  });
	  for (var x = args[i]; i < len; x = args[++i]) {
	    if (isNull(x) || !isObject(x)) {
	      str += ' ' + x;
	    } else {
	      str += ' ' + inspect(x);
	    }
	  }
	  return str;
	};


	// Mark that a method should not be used.
	// Returns a modified function which warns once by default.
	// If --no-deprecation is set, then it is a no-op.
	exports.deprecate = function(fn, msg) {
	  // Allow for deprecating things in the process of starting up.
	  if (isUndefined(global.process)) {
	    return function() {
	      return exports.deprecate(fn, msg).apply(this, arguments);
	    };
	  }

	  if (process.noDeprecation === true) {
	    return fn;
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (process.throwDeprecation) {
	        throw new Error(msg);
	      } else if (process.traceDeprecation) {
	        console.trace(msg);
	      } else {
	        console.error(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	};


	var debugs = {};
	var debugEnviron;
	exports.debuglog = function(set) {
	  if (isUndefined(debugEnviron))
	    debugEnviron = process.env.NODE_DEBUG || '';
	  set = set.toUpperCase();
	  if (!debugs[set]) {
	    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
	      var pid = process.pid;
	      debugs[set] = function() {
	        var msg = exports.format.apply(exports, arguments);
	        console.error('%s %d: %s', set, pid, msg);
	      };
	    } else {
	      debugs[set] = function() {};
	    }
	  }
	  return debugs[set];
	};


	/**
	 * Echos the value of a value. Trys to print the value out
	 * in the best way possible given the different types.
	 *
	 * @param {Object} obj The object to print out.
	 * @param {Object} opts Optional options object that alters the output.
	 */
	/* legacy: obj, showHidden, depth, colors*/
	function inspect(obj, opts) {
	  // default options
	  var ctx = {
	    seen: [],
	    stylize: stylizeNoColor
	  };
	  // legacy...
	  if (arguments.length >= 3) ctx.depth = arguments[2];
	  if (arguments.length >= 4) ctx.colors = arguments[3];
	  if (isBoolean(opts)) {
	    // legacy...
	    ctx.showHidden = opts;
	  } else if (opts) {
	    // got an "options" object
	    exports._extend(ctx, opts);
	  }
	  // set default options
	  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
	  if (isUndefined(ctx.depth)) ctx.depth = 2;
	  if (isUndefined(ctx.colors)) ctx.colors = false;
	  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
	  if (ctx.colors) ctx.stylize = stylizeWithColor;
	  return formatValue(ctx, obj, ctx.depth);
	}
	exports.inspect = inspect;


	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	inspect.colors = {
	  'bold' : [1, 22],
	  'italic' : [3, 23],
	  'underline' : [4, 24],
	  'inverse' : [7, 27],
	  'white' : [37, 39],
	  'grey' : [90, 39],
	  'black' : [30, 39],
	  'blue' : [34, 39],
	  'cyan' : [36, 39],
	  'green' : [32, 39],
	  'magenta' : [35, 39],
	  'red' : [31, 39],
	  'yellow' : [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	inspect.styles = {
	  'special': 'cyan',
	  'number': 'yellow',
	  'boolean': 'yellow',
	  'undefined': 'grey',
	  'null': 'bold',
	  'string': 'green',
	  'date': 'magenta',
	  // "name": intentionally not styling
	  'regexp': 'red'
	};


	function stylizeWithColor(str, styleType) {
	  var style = inspect.styles[styleType];

	  if (style) {
	    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
	           '\u001b[' + inspect.colors[style][1] + 'm';
	  } else {
	    return str;
	  }
	}


	function stylizeNoColor(str, styleType) {
	  return str;
	}


	function arrayToHash(array) {
	  var hash = {};

	  array.forEach(function(val, idx) {
	    hash[val] = true;
	  });

	  return hash;
	}


	function formatValue(ctx, value, recurseTimes) {
	  // Provide a hook for user-specified inspect functions.
	  // Check that value is an object with an inspect function on it
	  if (ctx.customInspect &&
	      value &&
	      isFunction(value.inspect) &&
	      // Filter out the util module, it's inspect function is special
	      value.inspect !== exports.inspect &&
	      // Also filter out any prototype objects using the circular check.
	      !(value.constructor && value.constructor.prototype === value)) {
	    var ret = value.inspect(recurseTimes, ctx);
	    if (!isString(ret)) {
	      ret = formatValue(ctx, ret, recurseTimes);
	    }
	    return ret;
	  }

	  // Primitive types cannot have properties
	  var primitive = formatPrimitive(ctx, value);
	  if (primitive) {
	    return primitive;
	  }

	  // Look up the keys of the object.
	  var keys = Object.keys(value);
	  var visibleKeys = arrayToHash(keys);

	  if (ctx.showHidden) {
	    keys = Object.getOwnPropertyNames(value);
	  }

	  // IE doesn't make error fields non-enumerable
	  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
	  if (isError(value)
	      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
	    return formatError(value);
	  }

	  // Some type of object without properties can be shortcutted.
	  if (keys.length === 0) {
	    if (isFunction(value)) {
	      var name = value.name ? ': ' + value.name : '';
	      return ctx.stylize('[Function' + name + ']', 'special');
	    }
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    }
	    if (isDate(value)) {
	      return ctx.stylize(Date.prototype.toString.call(value), 'date');
	    }
	    if (isError(value)) {
	      return formatError(value);
	    }
	  }

	  var base = '', array = false, braces = ['{', '}'];

	  // Make Array say that they are Array
	  if (isArray(value)) {
	    array = true;
	    braces = ['[', ']'];
	  }

	  // Make functions say that they are functions
	  if (isFunction(value)) {
	    var n = value.name ? ': ' + value.name : '';
	    base = ' [Function' + n + ']';
	  }

	  // Make RegExps say that they are RegExps
	  if (isRegExp(value)) {
	    base = ' ' + RegExp.prototype.toString.call(value);
	  }

	  // Make dates with properties first say the date
	  if (isDate(value)) {
	    base = ' ' + Date.prototype.toUTCString.call(value);
	  }

	  // Make error with message first say the error
	  if (isError(value)) {
	    base = ' ' + formatError(value);
	  }

	  if (keys.length === 0 && (!array || value.length == 0)) {
	    return braces[0] + base + braces[1];
	  }

	  if (recurseTimes < 0) {
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    } else {
	      return ctx.stylize('[Object]', 'special');
	    }
	  }

	  ctx.seen.push(value);

	  var output;
	  if (array) {
	    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
	  } else {
	    output = keys.map(function(key) {
	      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
	    });
	  }

	  ctx.seen.pop();

	  return reduceToSingleString(output, base, braces);
	}


	function formatPrimitive(ctx, value) {
	  if (isUndefined(value))
	    return ctx.stylize('undefined', 'undefined');
	  if (isString(value)) {
	    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
	                                             .replace(/'/g, "\\'")
	                                             .replace(/\\"/g, '"') + '\'';
	    return ctx.stylize(simple, 'string');
	  }
	  if (isNumber(value))
	    return ctx.stylize('' + value, 'number');
	  if (isBoolean(value))
	    return ctx.stylize('' + value, 'boolean');
	  // For some reason typeof null is "object", so special case here.
	  if (isNull(value))
	    return ctx.stylize('null', 'null');
	}


	function formatError(value) {
	  return '[' + Error.prototype.toString.call(value) + ']';
	}


	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
	  var output = [];
	  for (var i = 0, l = value.length; i < l; ++i) {
	    if (hasOwnProperty(value, String(i))) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          String(i), true));
	    } else {
	      output.push('');
	    }
	  }
	  keys.forEach(function(key) {
	    if (!key.match(/^\d+$/)) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          key, true));
	    }
	  });
	  return output;
	}


	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
	  var name, str, desc;
	  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
	  if (desc.get) {
	    if (desc.set) {
	      str = ctx.stylize('[Getter/Setter]', 'special');
	    } else {
	      str = ctx.stylize('[Getter]', 'special');
	    }
	  } else {
	    if (desc.set) {
	      str = ctx.stylize('[Setter]', 'special');
	    }
	  }
	  if (!hasOwnProperty(visibleKeys, key)) {
	    name = '[' + key + ']';
	  }
	  if (!str) {
	    if (ctx.seen.indexOf(desc.value) < 0) {
	      if (isNull(recurseTimes)) {
	        str = formatValue(ctx, desc.value, null);
	      } else {
	        str = formatValue(ctx, desc.value, recurseTimes - 1);
	      }
	      if (str.indexOf('\n') > -1) {
	        if (array) {
	          str = str.split('\n').map(function(line) {
	            return '  ' + line;
	          }).join('\n').substr(2);
	        } else {
	          str = '\n' + str.split('\n').map(function(line) {
	            return '   ' + line;
	          }).join('\n');
	        }
	      }
	    } else {
	      str = ctx.stylize('[Circular]', 'special');
	    }
	  }
	  if (isUndefined(name)) {
	    if (array && key.match(/^\d+$/)) {
	      return str;
	    }
	    name = JSON.stringify('' + key);
	    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
	      name = name.substr(1, name.length - 2);
	      name = ctx.stylize(name, 'name');
	    } else {
	      name = name.replace(/'/g, "\\'")
	                 .replace(/\\"/g, '"')
	                 .replace(/(^"|"$)/g, "'");
	      name = ctx.stylize(name, 'string');
	    }
	  }

	  return name + ': ' + str;
	}


	function reduceToSingleString(output, base, braces) {
	  var numLinesEst = 0;
	  var length = output.reduce(function(prev, cur) {
	    numLinesEst++;
	    if (cur.indexOf('\n') >= 0) numLinesEst++;
	    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
	  }, 0);

	  if (length > 60) {
	    return braces[0] +
	           (base === '' ? '' : base + '\n ') +
	           ' ' +
	           output.join(',\n  ') +
	           ' ' +
	           braces[1];
	  }

	  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}


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

	exports.isBuffer = __webpack_require__(69);

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}


	function pad(n) {
	  return n < 10 ? '0' + n.toString(10) : n.toString(10);
	}


	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
	              'Oct', 'Nov', 'Dec'];

	// 26 Feb 16:19:34
	function timestamp() {
	  var d = new Date();
	  var time = [pad(d.getHours()),
	              pad(d.getMinutes()),
	              pad(d.getSeconds())].join(':');
	  return [d.getDate(), months[d.getMonth()], time].join(' ');
	}


	// log is just a thin wrapper to console.log that prepends a timestamp
	exports.log = function() {
	  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
	};


	/**
	 * Inherit the prototype methods from one constructor into another.
	 *
	 * The Function.prototype.inherits from lang.js rewritten as a standalone
	 * function (not on Function.prototype). NOTE: If this file is to be loaded
	 * during bootstrapping this function needs to be rewritten using some native
	 * functions as prototype setup using normal JavaScript does not work as
	 * expected during bootstrapping (see mirror.js in r114903).
	 *
	 * @param {function} ctor Constructor function which needs to inherit the
	 *     prototype.
	 * @param {function} superCtor Constructor function to inherit prototype from.
	 */
	exports.inherits = __webpack_require__(70);

	exports._extend = function(origin, add) {
	  // Don't do anything if add isn't an object
	  if (!add || !isObject(add)) return origin;

	  var keys = Object.keys(add);
	  var i = keys.length;
	  while (i--) {
	    origin[keys[i]] = add[keys[i]];
	  }
	  return origin;
	};

	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(4)))

/***/ },
/* 69 */
/***/ function(module, exports) {

	module.exports = function isBuffer(arg) {
	  return arg && typeof arg === 'object'
	    && typeof arg.copy === 'function'
	    && typeof arg.fill === 'function'
	    && typeof arg.readUInt8 === 'function';
	}

/***/ },
/* 70 */
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
/* 71 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
	 * in FIPS 180-2
	 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 *
	 */

	var inherits = __webpack_require__(68).inherits

	module.exports = function (Buffer, Hash) {

	  var K = [
	      0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
	      0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
	      0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
	      0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
	      0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
	      0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
	      0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
	      0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
	      0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
	      0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
	      0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
	      0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
	      0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
	      0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
	      0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
	      0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
	    ]

	  var W = new Array(64)

	  function Sha256() {
	    this.init()

	    this._w = W //new Array(64)

	    Hash.call(this, 16*4, 14*4)
	  }

	  inherits(Sha256, Hash)

	  Sha256.prototype.init = function () {

	    this._a = 0x6a09e667|0
	    this._b = 0xbb67ae85|0
	    this._c = 0x3c6ef372|0
	    this._d = 0xa54ff53a|0
	    this._e = 0x510e527f|0
	    this._f = 0x9b05688c|0
	    this._g = 0x1f83d9ab|0
	    this._h = 0x5be0cd19|0

	    this._len = this._s = 0

	    return this
	  }

	  function S (X, n) {
	    return (X >>> n) | (X << (32 - n));
	  }

	  function R (X, n) {
	    return (X >>> n);
	  }

	  function Ch (x, y, z) {
	    return ((x & y) ^ ((~x) & z));
	  }

	  function Maj (x, y, z) {
	    return ((x & y) ^ (x & z) ^ (y & z));
	  }

	  function Sigma0256 (x) {
	    return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
	  }

	  function Sigma1256 (x) {
	    return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
	  }

	  function Gamma0256 (x) {
	    return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
	  }

	  function Gamma1256 (x) {
	    return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
	  }

	  Sha256.prototype._update = function(M) {

	    var W = this._w
	    var a, b, c, d, e, f, g, h
	    var T1, T2

	    a = this._a | 0
	    b = this._b | 0
	    c = this._c | 0
	    d = this._d | 0
	    e = this._e | 0
	    f = this._f | 0
	    g = this._g | 0
	    h = this._h | 0

	    for (var j = 0; j < 64; j++) {
	      var w = W[j] = j < 16
	        ? M.readInt32BE(j * 4)
	        : Gamma1256(W[j - 2]) + W[j - 7] + Gamma0256(W[j - 15]) + W[j - 16]

	      T1 = h + Sigma1256(e) + Ch(e, f, g) + K[j] + w

	      T2 = Sigma0256(a) + Maj(a, b, c);
	      h = g; g = f; f = e; e = d + T1; d = c; c = b; b = a; a = T1 + T2;
	    }

	    this._a = (a + this._a) | 0
	    this._b = (b + this._b) | 0
	    this._c = (c + this._c) | 0
	    this._d = (d + this._d) | 0
	    this._e = (e + this._e) | 0
	    this._f = (f + this._f) | 0
	    this._g = (g + this._g) | 0
	    this._h = (h + this._h) | 0

	  };

	  Sha256.prototype._hash = function () {
	    var H = new Buffer(32)

	    H.writeInt32BE(this._a,  0)
	    H.writeInt32BE(this._b,  4)
	    H.writeInt32BE(this._c,  8)
	    H.writeInt32BE(this._d, 12)
	    H.writeInt32BE(this._e, 16)
	    H.writeInt32BE(this._f, 20)
	    H.writeInt32BE(this._g, 24)
	    H.writeInt32BE(this._h, 28)

	    return H
	  }

	  return Sha256

	}


/***/ },
/* 72 */
/***/ function(module, exports, __webpack_require__) {

	var inherits = __webpack_require__(68).inherits

	module.exports = function (Buffer, Hash) {
	  var K = [
	    0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
	    0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
	    0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
	    0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
	    0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
	    0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
	    0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
	    0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
	    0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
	    0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
	    0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
	    0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
	    0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
	    0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
	    0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
	    0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
	    0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
	    0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
	    0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
	    0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
	    0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
	    0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
	    0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
	    0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
	    0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
	    0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
	    0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
	    0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
	    0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
	    0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
	    0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
	    0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
	    0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
	    0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
	    0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
	    0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
	    0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
	    0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
	    0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
	    0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
	  ]

	  var W = new Array(160)

	  function Sha512() {
	    this.init()
	    this._w = W

	    Hash.call(this, 128, 112)
	  }

	  inherits(Sha512, Hash)

	  Sha512.prototype.init = function () {

	    this._a = 0x6a09e667|0
	    this._b = 0xbb67ae85|0
	    this._c = 0x3c6ef372|0
	    this._d = 0xa54ff53a|0
	    this._e = 0x510e527f|0
	    this._f = 0x9b05688c|0
	    this._g = 0x1f83d9ab|0
	    this._h = 0x5be0cd19|0

	    this._al = 0xf3bcc908|0
	    this._bl = 0x84caa73b|0
	    this._cl = 0xfe94f82b|0
	    this._dl = 0x5f1d36f1|0
	    this._el = 0xade682d1|0
	    this._fl = 0x2b3e6c1f|0
	    this._gl = 0xfb41bd6b|0
	    this._hl = 0x137e2179|0

	    this._len = this._s = 0

	    return this
	  }

	  function S (X, Xl, n) {
	    return (X >>> n) | (Xl << (32 - n))
	  }

	  function Ch (x, y, z) {
	    return ((x & y) ^ ((~x) & z));
	  }

	  function Maj (x, y, z) {
	    return ((x & y) ^ (x & z) ^ (y & z));
	  }

	  Sha512.prototype._update = function(M) {

	    var W = this._w
	    var a, b, c, d, e, f, g, h
	    var al, bl, cl, dl, el, fl, gl, hl

	    a = this._a | 0
	    b = this._b | 0
	    c = this._c | 0
	    d = this._d | 0
	    e = this._e | 0
	    f = this._f | 0
	    g = this._g | 0
	    h = this._h | 0

	    al = this._al | 0
	    bl = this._bl | 0
	    cl = this._cl | 0
	    dl = this._dl | 0
	    el = this._el | 0
	    fl = this._fl | 0
	    gl = this._gl | 0
	    hl = this._hl | 0

	    for (var i = 0; i < 80; i++) {
	      var j = i * 2

	      var Wi, Wil

	      if (i < 16) {
	        Wi = W[j] = M.readInt32BE(j * 4)
	        Wil = W[j + 1] = M.readInt32BE(j * 4 + 4)

	      } else {
	        var x  = W[j - 15*2]
	        var xl = W[j - 15*2 + 1]
	        var gamma0  = S(x, xl, 1) ^ S(x, xl, 8) ^ (x >>> 7)
	        var gamma0l = S(xl, x, 1) ^ S(xl, x, 8) ^ S(xl, x, 7)

	        x  = W[j - 2*2]
	        xl = W[j - 2*2 + 1]
	        var gamma1  = S(x, xl, 19) ^ S(xl, x, 29) ^ (x >>> 6)
	        var gamma1l = S(xl, x, 19) ^ S(x, xl, 29) ^ S(xl, x, 6)

	        // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
	        var Wi7  = W[j - 7*2]
	        var Wi7l = W[j - 7*2 + 1]

	        var Wi16  = W[j - 16*2]
	        var Wi16l = W[j - 16*2 + 1]

	        Wil = gamma0l + Wi7l
	        Wi  = gamma0  + Wi7 + ((Wil >>> 0) < (gamma0l >>> 0) ? 1 : 0)
	        Wil = Wil + gamma1l
	        Wi  = Wi  + gamma1  + ((Wil >>> 0) < (gamma1l >>> 0) ? 1 : 0)
	        Wil = Wil + Wi16l
	        Wi  = Wi  + Wi16 + ((Wil >>> 0) < (Wi16l >>> 0) ? 1 : 0)

	        W[j] = Wi
	        W[j + 1] = Wil
	      }

	      var maj = Maj(a, b, c)
	      var majl = Maj(al, bl, cl)

	      var sigma0h = S(a, al, 28) ^ S(al, a, 2) ^ S(al, a, 7)
	      var sigma0l = S(al, a, 28) ^ S(a, al, 2) ^ S(a, al, 7)
	      var sigma1h = S(e, el, 14) ^ S(e, el, 18) ^ S(el, e, 9)
	      var sigma1l = S(el, e, 14) ^ S(el, e, 18) ^ S(e, el, 9)

	      // t1 = h + sigma1 + ch + K[i] + W[i]
	      var Ki = K[j]
	      var Kil = K[j + 1]

	      var ch = Ch(e, f, g)
	      var chl = Ch(el, fl, gl)

	      var t1l = hl + sigma1l
	      var t1 = h + sigma1h + ((t1l >>> 0) < (hl >>> 0) ? 1 : 0)
	      t1l = t1l + chl
	      t1 = t1 + ch + ((t1l >>> 0) < (chl >>> 0) ? 1 : 0)
	      t1l = t1l + Kil
	      t1 = t1 + Ki + ((t1l >>> 0) < (Kil >>> 0) ? 1 : 0)
	      t1l = t1l + Wil
	      t1 = t1 + Wi + ((t1l >>> 0) < (Wil >>> 0) ? 1 : 0)

	      // t2 = sigma0 + maj
	      var t2l = sigma0l + majl
	      var t2 = sigma0h + maj + ((t2l >>> 0) < (sigma0l >>> 0) ? 1 : 0)

	      h  = g
	      hl = gl
	      g  = f
	      gl = fl
	      f  = e
	      fl = el
	      el = (dl + t1l) | 0
	      e  = (d + t1 + ((el >>> 0) < (dl >>> 0) ? 1 : 0)) | 0
	      d  = c
	      dl = cl
	      c  = b
	      cl = bl
	      b  = a
	      bl = al
	      al = (t1l + t2l) | 0
	      a  = (t1 + t2 + ((al >>> 0) < (t1l >>> 0) ? 1 : 0)) | 0
	    }

	    this._al = (this._al + al) | 0
	    this._bl = (this._bl + bl) | 0
	    this._cl = (this._cl + cl) | 0
	    this._dl = (this._dl + dl) | 0
	    this._el = (this._el + el) | 0
	    this._fl = (this._fl + fl) | 0
	    this._gl = (this._gl + gl) | 0
	    this._hl = (this._hl + hl) | 0

	    this._a = (this._a + a + ((this._al >>> 0) < (al >>> 0) ? 1 : 0)) | 0
	    this._b = (this._b + b + ((this._bl >>> 0) < (bl >>> 0) ? 1 : 0)) | 0
	    this._c = (this._c + c + ((this._cl >>> 0) < (cl >>> 0) ? 1 : 0)) | 0
	    this._d = (this._d + d + ((this._dl >>> 0) < (dl >>> 0) ? 1 : 0)) | 0
	    this._e = (this._e + e + ((this._el >>> 0) < (el >>> 0) ? 1 : 0)) | 0
	    this._f = (this._f + f + ((this._fl >>> 0) < (fl >>> 0) ? 1 : 0)) | 0
	    this._g = (this._g + g + ((this._gl >>> 0) < (gl >>> 0) ? 1 : 0)) | 0
	    this._h = (this._h + h + ((this._hl >>> 0) < (hl >>> 0) ? 1 : 0)) | 0
	  }

	  Sha512.prototype._hash = function () {
	    var H = new Buffer(64)

	    function writeInt64BE(h, l, offset) {
	      H.writeInt32BE(h, offset)
	      H.writeInt32BE(l, offset + 4)
	    }

	    writeInt64BE(this._a, this._al, 0)
	    writeInt64BE(this._b, this._bl, 8)
	    writeInt64BE(this._c, this._cl, 16)
	    writeInt64BE(this._d, this._dl, 24)
	    writeInt64BE(this._e, this._el, 32)
	    writeInt64BE(this._f, this._fl, 40)
	    writeInt64BE(this._g, this._gl, 48)
	    writeInt64BE(this._h, this._hl, 56)

	    return H
	  }

	  return Sha512

	}


/***/ },
/* 73 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
	 * Digest Algorithm, as defined in RFC 1321.
	 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 * Distributed under the BSD License
	 * See http://pajhome.org.uk/crypt/md5 for more info.
	 */

	var helpers = __webpack_require__(74);

	/*
	 * Calculate the MD5 of an array of little-endian words, and a bit length
	 */
	function core_md5(x, len)
	{
	  /* append padding */
	  x[len >> 5] |= 0x80 << ((len) % 32);
	  x[(((len + 64) >>> 9) << 4) + 14] = len;

	  var a =  1732584193;
	  var b = -271733879;
	  var c = -1732584194;
	  var d =  271733878;

	  for(var i = 0; i < x.length; i += 16)
	  {
	    var olda = a;
	    var oldb = b;
	    var oldc = c;
	    var oldd = d;

	    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
	    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
	    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
	    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
	    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
	    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
	    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
	    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
	    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
	    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
	    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
	    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
	    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
	    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
	    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
	    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

	    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
	    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
	    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
	    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
	    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
	    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
	    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
	    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
	    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
	    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
	    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
	    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
	    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
	    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
	    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
	    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

	    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
	    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
	    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
	    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
	    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
	    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
	    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
	    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
	    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
	    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
	    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
	    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
	    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
	    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
	    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
	    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

	    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
	    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
	    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
	    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
	    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
	    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
	    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
	    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
	    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
	    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
	    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
	    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
	    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
	    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
	    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
	    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

	    a = safe_add(a, olda);
	    b = safe_add(b, oldb);
	    c = safe_add(c, oldc);
	    d = safe_add(d, oldd);
	  }
	  return Array(a, b, c, d);

	}

	/*
	 * These functions implement the four basic operations the algorithm uses.
	 */
	function md5_cmn(q, a, b, x, s, t)
	{
	  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
	}
	function md5_ff(a, b, c, d, x, s, t)
	{
	  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
	}
	function md5_gg(a, b, c, d, x, s, t)
	{
	  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
	}
	function md5_hh(a, b, c, d, x, s, t)
	{
	  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
	}
	function md5_ii(a, b, c, d, x, s, t)
	{
	  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
	}

	/*
	 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
	 * to work around bugs in some JS interpreters.
	 */
	function safe_add(x, y)
	{
	  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
	  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	  return (msw << 16) | (lsw & 0xFFFF);
	}

	/*
	 * Bitwise rotate a 32-bit number to the left.
	 */
	function bit_rol(num, cnt)
	{
	  return (num << cnt) | (num >>> (32 - cnt));
	}

	module.exports = function md5(buf) {
	  return helpers.hash(buf, core_md5, 16);
	};


/***/ },
/* 74 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var intSize = 4;
	var zeroBuffer = new Buffer(intSize); zeroBuffer.fill(0);
	var chrsz = 8;

	function toArray(buf, bigEndian) {
	  if ((buf.length % intSize) !== 0) {
	    var len = buf.length + (intSize - (buf.length % intSize));
	    buf = Buffer.concat([buf, zeroBuffer], len);
	  }

	  var arr = [];
	  var fn = bigEndian ? buf.readInt32BE : buf.readInt32LE;
	  for (var i = 0; i < buf.length; i += intSize) {
	    arr.push(fn.call(buf, i));
	  }
	  return arr;
	}

	function toBuffer(arr, size, bigEndian) {
	  var buf = new Buffer(size);
	  var fn = bigEndian ? buf.writeInt32BE : buf.writeInt32LE;
	  for (var i = 0; i < arr.length; i++) {
	    fn.call(buf, arr[i], i * 4, true);
	  }
	  return buf;
	}

	function hash(buf, fn, hashSize, bigEndian) {
	  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);
	  var arr = fn(toArray(buf, bigEndian), buf.length * chrsz);
	  return toBuffer(arr, hashSize, bigEndian);
	}

	module.exports = { hash: hash };

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9).Buffer))

/***/ },
/* 75 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {
	module.exports = ripemd160



	/*
	CryptoJS v3.1.2
	code.google.com/p/crypto-js
	(c) 2009-2013 by Jeff Mott. All rights reserved.
	code.google.com/p/crypto-js/wiki/License
	*/
	/** @preserve
	(c) 2012 by Cédric Mesnil. All rights reserved.

	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

	    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
	    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	*/

	// Constants table
	var zl = [
	    0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
	    7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
	    3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
	    1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
	    4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13];
	var zr = [
	    5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
	    6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
	    15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
	    8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
	    12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11];
	var sl = [
	     11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
	    7, 6,   8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
	    11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
	      11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
	    9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ];
	var sr = [
	    8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
	    9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
	    9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
	    15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
	    8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ];

	var hl =  [ 0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E];
	var hr =  [ 0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000];

	var bytesToWords = function (bytes) {
	  var words = [];
	  for (var i = 0, b = 0; i < bytes.length; i++, b += 8) {
	    words[b >>> 5] |= bytes[i] << (24 - b % 32);
	  }
	  return words;
	};

	var wordsToBytes = function (words) {
	  var bytes = [];
	  for (var b = 0; b < words.length * 32; b += 8) {
	    bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
	  }
	  return bytes;
	};

	var processBlock = function (H, M, offset) {

	  // Swap endian
	  for (var i = 0; i < 16; i++) {
	    var offset_i = offset + i;
	    var M_offset_i = M[offset_i];

	    // Swap
	    M[offset_i] = (
	        (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
	        (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
	    );
	  }

	  // Working variables
	  var al, bl, cl, dl, el;
	  var ar, br, cr, dr, er;

	  ar = al = H[0];
	  br = bl = H[1];
	  cr = cl = H[2];
	  dr = dl = H[3];
	  er = el = H[4];
	  // Computation
	  var t;
	  for (var i = 0; i < 80; i += 1) {
	    t = (al +  M[offset+zl[i]])|0;
	    if (i<16){
	        t +=  f1(bl,cl,dl) + hl[0];
	    } else if (i<32) {
	        t +=  f2(bl,cl,dl) + hl[1];
	    } else if (i<48) {
	        t +=  f3(bl,cl,dl) + hl[2];
	    } else if (i<64) {
	        t +=  f4(bl,cl,dl) + hl[3];
	    } else {// if (i<80) {
	        t +=  f5(bl,cl,dl) + hl[4];
	    }
	    t = t|0;
	    t =  rotl(t,sl[i]);
	    t = (t+el)|0;
	    al = el;
	    el = dl;
	    dl = rotl(cl, 10);
	    cl = bl;
	    bl = t;

	    t = (ar + M[offset+zr[i]])|0;
	    if (i<16){
	        t +=  f5(br,cr,dr) + hr[0];
	    } else if (i<32) {
	        t +=  f4(br,cr,dr) + hr[1];
	    } else if (i<48) {
	        t +=  f3(br,cr,dr) + hr[2];
	    } else if (i<64) {
	        t +=  f2(br,cr,dr) + hr[3];
	    } else {// if (i<80) {
	        t +=  f1(br,cr,dr) + hr[4];
	    }
	    t = t|0;
	    t =  rotl(t,sr[i]) ;
	    t = (t+er)|0;
	    ar = er;
	    er = dr;
	    dr = rotl(cr, 10);
	    cr = br;
	    br = t;
	  }
	  // Intermediate hash value
	  t    = (H[1] + cl + dr)|0;
	  H[1] = (H[2] + dl + er)|0;
	  H[2] = (H[3] + el + ar)|0;
	  H[3] = (H[4] + al + br)|0;
	  H[4] = (H[0] + bl + cr)|0;
	  H[0] =  t;
	};

	function f1(x, y, z) {
	  return ((x) ^ (y) ^ (z));
	}

	function f2(x, y, z) {
	  return (((x)&(y)) | ((~x)&(z)));
	}

	function f3(x, y, z) {
	  return (((x) | (~(y))) ^ (z));
	}

	function f4(x, y, z) {
	  return (((x) & (z)) | ((y)&(~(z))));
	}

	function f5(x, y, z) {
	  return ((x) ^ ((y) |(~(z))));
	}

	function rotl(x,n) {
	  return (x<<n) | (x>>>(32-n));
	}

	function ripemd160(message) {
	  var H = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];

	  if (typeof message == 'string')
	    message = new Buffer(message, 'utf8');

	  var m = bytesToWords(message);

	  var nBitsLeft = message.length * 8;
	  var nBitsTotal = message.length * 8;

	  // Add padding
	  m[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	  m[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
	      (((nBitsTotal << 8)  | (nBitsTotal >>> 24)) & 0x00ff00ff) |
	      (((nBitsTotal << 24) | (nBitsTotal >>> 8))  & 0xff00ff00)
	  );

	  for (var i=0 ; i<m.length; i += 16) {
	    processBlock(H, m, i);
	  }

	  // Swap endian
	  for (var i = 0; i < 5; i++) {
	      // Shortcut
	    var H_i = H[i];

	    // Swap
	    H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
	          (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
	  }

	  var digestbytes = wordsToBytes(H);
	  return new Buffer(digestbytes);
	}



	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9).Buffer))

/***/ },
/* 76 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var createHash = __webpack_require__(64)

	var zeroBuffer = new Buffer(128)
	zeroBuffer.fill(0)

	module.exports = Hmac

	function Hmac (alg, key) {
	  if(!(this instanceof Hmac)) return new Hmac(alg, key)
	  this._opad = opad
	  this._alg = alg

	  var blocksize = (alg === 'sha512') ? 128 : 64

	  key = this._key = !Buffer.isBuffer(key) ? new Buffer(key) : key

	  if(key.length > blocksize) {
	    key = createHash(alg).update(key).digest()
	  } else if(key.length < blocksize) {
	    key = Buffer.concat([key, zeroBuffer], blocksize)
	  }

	  var ipad = this._ipad = new Buffer(blocksize)
	  var opad = this._opad = new Buffer(blocksize)

	  for(var i = 0; i < blocksize; i++) {
	    ipad[i] = key[i] ^ 0x36
	    opad[i] = key[i] ^ 0x5C
	  }

	  this._hash = createHash(alg).update(ipad)
	}

	Hmac.prototype.update = function (data, enc) {
	  this._hash.update(data, enc)
	  return this
	}

	Hmac.prototype.digest = function (enc) {
	  var h = this._hash.digest()
	  return createHash(this._alg).update(this._opad).update(h).digest(enc)
	}


	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9).Buffer))

/***/ },
/* 77 */
/***/ function(module, exports, __webpack_require__) {

	var pbkdf2Export = __webpack_require__(78)

	module.exports = function (crypto, exports) {
	  exports = exports || {}

	  var exported = pbkdf2Export(crypto)

	  exports.pbkdf2 = exported.pbkdf2
	  exports.pbkdf2Sync = exported.pbkdf2Sync

	  return exports
	}


/***/ },
/* 78 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {module.exports = function(crypto) {
	  function pbkdf2(password, salt, iterations, keylen, digest, callback) {
	    if ('function' === typeof digest) {
	      callback = digest
	      digest = undefined
	    }

	    if ('function' !== typeof callback)
	      throw new Error('No callback provided to pbkdf2')

	    setTimeout(function() {
	      var result

	      try {
	        result = pbkdf2Sync(password, salt, iterations, keylen, digest)
	      } catch (e) {
	        return callback(e)
	      }

	      callback(undefined, result)
	    })
	  }

	  function pbkdf2Sync(password, salt, iterations, keylen, digest) {
	    if ('number' !== typeof iterations)
	      throw new TypeError('Iterations not a number')

	    if (iterations < 0)
	      throw new TypeError('Bad iterations')

	    if ('number' !== typeof keylen)
	      throw new TypeError('Key length not a number')

	    if (keylen < 0)
	      throw new TypeError('Bad key length')

	    digest = digest || 'sha1'

	    if (!Buffer.isBuffer(password)) password = new Buffer(password)
	    if (!Buffer.isBuffer(salt)) salt = new Buffer(salt)

	    var hLen, l = 1, r, T
	    var DK = new Buffer(keylen)
	    var block1 = new Buffer(salt.length + 4)
	    salt.copy(block1, 0, 0, salt.length)

	    for (var i = 1; i <= l; i++) {
	      block1.writeUInt32BE(i, salt.length)

	      var U = crypto.createHmac(digest, password).update(block1).digest()

	      if (!hLen) {
	        hLen = U.length
	        T = new Buffer(hLen)
	        l = Math.ceil(keylen / hLen)
	        r = keylen - (l - 1) * hLen

	        if (keylen > (Math.pow(2, 32) - 1) * hLen)
	          throw new TypeError('keylen exceeds maximum length')
	      }

	      U.copy(T, 0, 0, hLen)

	      for (var j = 1; j < iterations; j++) {
	        U = crypto.createHmac(digest, password).update(U).digest()

	        for (var k = 0; k < hLen; k++) {
	          T[k] ^= U[k]
	        }
	      }

	      var destPos = (i - 1) * hLen
	      var len = (i == l ? r : hLen)
	      T.copy(DK, destPos, 0, len)
	    }

	    return DK
	  }

	  return {
	    pbkdf2: pbkdf2,
	    pbkdf2Sync: pbkdf2Sync
	  }
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9).Buffer))

/***/ }
/******/ ]);