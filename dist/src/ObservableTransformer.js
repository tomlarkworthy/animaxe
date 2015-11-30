var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var Rx = require("rx");
var types = require("./types");
var Parameter = require("./Parameter");
__export(require("./types"));
exports.DEBUG_LOOP = true;
exports.DEBUG_THEN = true;
exports.DEBUG_IF = false;
exports.DEBUG_EMIT = false;
exports.DEBUG_PARALLEL = false;
exports.DEBUG_EVENTS = false;
exports.DEBUG = true;
var BaseTick = (function () {
    function BaseTick(clock, dt, ctx) {
        this.clock = clock;
        this.dt = dt;
        this.ctx = ctx;
    }
    return BaseTick;
})();
exports.BaseTick = BaseTick;
var ObservableTransformer = (function () {
    function ObservableTransformer(attach) {
        this.attach = attach;
    }
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    ObservableTransformer.prototype.create = function (attach) {
        return new ObservableTransformer(attach);
    };
    /**
     * map the value of 'this' to a new parameter
     */
    ObservableTransformer.prototype.map = function (fn) {
        var self = this;
        return new ObservableTransformer(function (upstream) { return self.attach(upstream).map(fn); });
    };
    /**
     *  with another transformer with the same type of input.
     * Both are given the same input, and their simulataneous outputs are passed to a
     * combiner function, which compute the final output.
     */
    ObservableTransformer.prototype.combine1 = function (other1, combinerBuilder) {
        var _this = this;
        return new ObservableTransformer(function (upstream) {
            // join upstream with parameter
            return Rx.Observable.zip(_this.attach(upstream), other1.attach(upstream), combinerBuilder());
        });
    };
    /**
     * Combine with another transformer with the same type of input.
     * Both are given the same input, and their simulataneous outputs are passed to a
     * combiner function, which compute the final output.
     */
    ObservableTransformer.prototype.combine2 = function (other1, other2, combinerBuilder) {
        var _this = this;
        if (exports.DEBUG)
            console.log("combine2: build");
        return new ObservableTransformer(function (upstream) {
            // TODO ALL THE ISSUES ARE HERE, COMBINE DOES NTO DELIVER onCompleted fast
            // Should the onComplete call during the thread of execution of a dirrernt on Next
            if (exports.DEBUG)
                console.log("combine2: attach");
            var upstream = upstream.tap(function (next) { return console.log("combine2: upstream next"); }, function (error) { return console.log("combine2: upstream error"); }, function () { return console.log("combine2: upstream onCompleted"); });
            // todo shitty version until https://github.com/Reactive-Extensions/RxJS/issues/958 gets fixed
            /*
            // join upstream with parameter
            return Rx.Observable.zip(
                this.attach(upstream).tapOnCompleted(() => console.log("combine2: inner this completed")),
                other1.attach(upstream).tapOnCompleted(() => console.log("combine2: inner other1 completed")),
                other2.attach(upstream).tapOnCompleted(() => console.log("combine2: inner other2 completed")),
                combinerBuilder()
            )*/
            var zipArgs = Rx.Observable.zip(other1.attach(upstream).tapOnCompleted(function () { return console.log("combine2: inner other1 completed"); }), other2.attach(upstream).tapOnCompleted(function () { return console.log("combine2: inner other2 completed"); }), function (arg1, arg2) { return { arg1: arg1, arg2: arg2 }; }).tap(function (next) { return console.log("combine2: zipArgs next"); }, function (error) { return console.log("combine2: zipArgs error"); }, function () { return console.log("combine2: zipArgs onCompleted"); });
            var combiner = combinerBuilder();
            return Rx.Observable.zip(_this.attach(upstream).tapOnCompleted(function () { return console.log("combine2: inner this completed"); }), zipArgs.tapOnCompleted(function () { return console.log("combine2: inner zips completed"); }), function (tick, args) {
                return combiner(tick, args.arg1, args.arg2);
            }).tap(function (next) { return console.log("combine2: downstream next"); }, function (error) { return console.log("combine2: downstream error"); }, function () { return console.log("combine2: downstream onCompleted"); });
        });
    };
    /**
     * Combine with another transformer with the same type of input.
     * Both are given the same input, and their simulataneous outputs are passed to a
     * combiner function, which compute the final output.
     */
    ObservableTransformer.prototype.combine3 = function (other1, other2, other3, combinerBuilder) {
        var _this = this;
        return new ObservableTransformer(function (upstream) {
            // join upstream with parameter
            return Rx.Observable.zip(_this.attach(upstream), other1.attach(upstream), other2.attach(upstream), other3.attach(upstream), combinerBuilder());
        });
    };
    ObservableTransformer.merge2 = function (other1, other2, combinerBuilder) {
        return new ObservableTransformer(function (upstream) {
            return Rx.Observable.zip(other1.attach(upstream), other2.attach(upstream), combinerBuilder());
        });
    };
    ObservableTransformer.merge4 = function (other1, other2, other3, other4, combinerBuilder) {
        return new ObservableTransformer(function (upstream) {
            return Rx.Observable.zip(other1.attach(upstream), other2.attach(upstream), other3.attach(upstream), other4.attach(upstream), combinerBuilder());
        });
    };
    ObservableTransformer.prototype.init = function () { throw new Error("depricated: remove this"); };
    return ObservableTransformer;
})();
exports.ObservableTransformer = ObservableTransformer;
var ChainableTransformer = (function (_super) {
    __extends(ChainableTransformer, _super);
    function ChainableTransformer(attach) {
        _super.call(this, attach);
    }
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    ChainableTransformer.prototype.create = function (attach) {
        if (attach === void 0) { attach = function (nop) { return nop; }; }
        return new ChainableTransformer(attach);
    };
    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     *
     * This allows you to chain custom animations.
     *
     * ```Ax.move(...).pipe(myOT_API());```
     */
    ChainableTransformer.prototype.pipe = function (downstream) {
        return combine(this, downstream);
    };
    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     *
     * This allows you to sequence animations temporally.
     * frame1OT_API().then(frame2OT_API).then(frame3OT_API)
     */
    ChainableTransformer.prototype.then = function (follower) {
        var self = this;
        return this.create(function (upstream) {
            return Rx.Observable.create(function (observer) {
                if (exports.DEBUG_THEN)
                    console.log("then: attach");
                var firstTurn = true;
                var first = new Rx.Subject();
                var second = new Rx.Subject();
                var firstAttach = self.attach(first.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: first to downstream");
                    observer.onNext(next);
                }, function (error) {
                    if (exports.DEBUG_THEN)
                        console.log("then: first error");
                    observer.onError(error);
                }, function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: first complete");
                    firstTurn = false; // note overall sequences is not notified
                });
                var secondAttach = follower.attach(second.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: second to downstream");
                    observer.onNext(next);
                }, function (error) {
                    if (exports.DEBUG_THEN)
                        console.log("then: second error");
                    observer.onError(error);
                }, function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: second complete");
                    observer.onCompleted(); // note overall sequences finished
                });
                var upstreamSubscription = upstream.subscribeOn(Rx.Scheduler.immediate).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (firstTurn) {
                        if (exports.DEBUG_THEN)
                            console.log("then: upstream to first");
                        first.onNext(next);
                    }
                    else {
                        if (exports.DEBUG_THEN)
                            console.log("then: upstream to second");
                        second.onNext(next);
                    }
                }, function (error) {
                    if (exports.DEBUG_THEN)
                        console.log("then: upstream error");
                    observer.onError(error);
                }, function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: upstream complete");
                    observer.onCompleted();
                });
                // on dispose
                return function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: dispose");
                    upstreamSubscription.dispose();
                    firstAttach.dispose();
                    secondAttach.dispose();
                };
            });
        });
    };
    /*
    then(follower: ChainableTransformer<Tick>): this {
        var self = this;

        return this.create((prev: Rx.Observable<Tick>) => {
            return Rx.Observable.create<Tick>(function (observer) {
                var first  = new Rx.Subject<Tick>();
                var second = new Rx.Subject<Tick>();

                var firstTurn = true;

                var current = first;
                if (DEBUG_THEN) console.log("then: attach");

                var secondAttach = null;

                var firstAttach = self.attach(first).subscribe(
                    next => {
                        if (DEBUG_THEN) console.log("then: first to downstream");
                        observer.onNext(next);
                    },
                    error => {
                        if (DEBUG_THEN) console.log("then: first error");
                        observer.onError(error);
                    },
                    () => {
                        if (DEBUG_THEN) console.log("then: first complete");
                        firstTurn = false;

                        secondAttach = follower.attach(second).subscribe(
                            function(next) {
                                if (DEBUG_THEN) console.log("then: second to downstream");
                                observer.onNext(next);
                            },
                            error => {
                                if (DEBUG_THEN) console.log("then: second error");
                                observer.onError(error);
                            },
                            function(){
                                if (DEBUG_THEN) console.log("then: second complete");
                                observer.onCompleted()
                            }
                        );
                    }
                );

                var prevSubscription = prev.subscribeOn(Rx.Scheduler.immediate).subscribe(
                    next => {
                        if (firstTurn) {
                            if (DEBUG_THEN) console.log("then: upstream to first");
                            first.onNext(next);
                        } else {
                            if (DEBUG_THEN) console.log("then: upstream to second");
                            second.onNext(next);
                        }
                    },
                    error => {
                        if (DEBUG_THEN) console.log("then: upstream error");
                        observer.onError(error);
                    },
                    () => {
                        if (DEBUG_THEN) console.log("then: upstream complete");
                        observer.onCompleted();
                    }
                );
                // on dispose
                return () => {
                    if (DEBUG_THEN) console.log("then: dispose");
                    prevSubscription.dispose();
                    firstAttach.dispose();
                    if (secondAttach)
                        secondAttach.dispose();
                };
            }).subscribeOn(Rx.Scheduler.immediate); //todo remove subscribeOns
        });
    }*/
    /**
     * Creates an animation that replays the inner animation each time the inner animation completes.
     *
     * The resultant animation is always runs forever while upstream is live. Only a single inner animation
     * plays at a time (unlike emit())
     */
    ChainableTransformer.prototype.loop = function (animation) {
        return this.pipe(this.create(function (prev) {
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
        }));
    };
    /**
     * Creates an animation that sequences the inner animation every time frame.
     *
     * The resultant animation is always runs forever while upstream is live. Multiple inner animations
     * can be playing at the same time (unlike loop)
     */
    ChainableTransformer.prototype.emit = function (animation) {
        return this.pipe(this.create(function (prev) {
            if (exports.DEBUG_EMIT)
                console.log("emit: initializing");
            var attachPoint = new Rx.Subject();
            return prev.tapOnNext(function (tick) {
                if (exports.DEBUG_EMIT)
                    console.log("emit: emmitting", animation);
                animation.attach(attachPoint).subscribe();
                attachPoint.onNext(tick);
            });
        }));
    };
    /**
     * Plays all the inner animations at the same time. Parallel completes when all inner animations are over.
     *
     * The canvas states are restored before each fork, so styling and transforms of different child animations do not
     * interact (although obsviously the pixel buffer is affected by each animation)
     */
    ChainableTransformer.prototype.parallel = function (animations) {
        return this.pipe(this.create(function (prev) {
            if (exports.DEBUG_PARALLEL)
                console.log("parallel: initializing");
            var activeOT_APIs = 0;
            var attachPoint = new Rx.Subject();
            function decrementActive(err) {
                if (exports.DEBUG_PARALLEL)
                    console.log("parallel: decrement active");
                if (err)
                    console.log("parallel error:", err);
                activeOT_APIs--;
            }
            animations.forEach(function (animation) {
                activeOT_APIs++;
                animation.attach(attachPoint.tapOnNext(function (tick) { return tick.ctx.save(); })).subscribe(function (tick) { return tick.ctx.restore(); }, decrementActive, decrementActive);
            });
            return prev.takeWhile(function () { return activeOT_APIs > 0; }).tapOnNext(function (tick) {
                if (exports.DEBUG_PARALLEL)
                    console.log("parallel: emitting, animations", tick);
                attachPoint.onNext(tick);
                if (exports.DEBUG_PARALLEL)
                    console.log("parallel: emitting finished");
            });
        }));
    };
    /**
     * Sequences n copies of the inner animation. Clone completes when all inner animations are over.
     */
    ChainableTransformer.prototype.clone = function (n, animation) {
        var array = new Array(n);
        for (var i = 0; i < n; i++)
            array[i] = animation;
        return this.parallel(array);
    };
    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    ChainableTransformer.prototype.take = function (frames) {
        var self = this;
        if (exports.DEBUG)
            console.log("take: build");
        return this.create(function (upstream) {
            if (exports.DEBUG)
                console.log("take: attach");
            return self.attach(upstream).take(frames)
                .tap(function (next) { return console.log("take: next"); }, function (error) { return console.log("take: error", error); }, function () { return console.log("take: completed"); });
        });
    };
    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * You just have to supply a function that does something with the draw tick.
     */
    ChainableTransformer.prototype.draw = function (drawFactory) {
        return this.create(function (upstream) { return upstream.tapOnNext(drawFactory()); });
    };
    ChainableTransformer.prototype.affect = function (effectBuilder) {
        return this.pipe(this.create(function (upstream) { return upstream.tap(effectBuilder()); }));
    };
    ChainableTransformer.prototype.affect1 = function (param1, effectBuilder) {
        return this.create(this.combine1(param1, function () {
            var effect = effectBuilder();
            return function (tick, param1) {
                effect(tick, param1); // apply side effect
                return tick; // tick is returned again to make the return type chainable
            };
        }).attach);
    };
    ChainableTransformer.prototype.affect2 = function (param1, param2, effectBuilder) {
        return this.create(this.combine2(param1, param2, function () {
            if (exports.DEBUG)
                console.log("affect2: attach");
            var effect = effectBuilder();
            return function (tick, param1, param2) {
                if (exports.DEBUG)
                    console.log("affect2: effect");
                effect(tick, param1, param2); // apply side effect
                return tick; // tick is returned again to make the return type chainable
            };
        }).attach);
    };
    ChainableTransformer.prototype.affect3 = function (param1, param2, param3, effectBuilder) {
        return this.create(this.combine3(param1, param2, param3, function () {
            var effect = effectBuilder();
            return function (tick, param1, param2, param3) {
                effect(tick, param1, param2, param3); // apply side effect
                return tick; // tick is returned again to make the return type chainable
            };
        }).attach);
    };
    ChainableTransformer.prototype.if = function (condition, animation) {
        return new If([new ConditionActionPair(condition, animation)], this);
    };
    return ChainableTransformer;
})(ObservableTransformer);
exports.ChainableTransformer = ChainableTransformer;
/**
 * Creates a new OT_API by piping the animation flow of A into B
 */
//export function combine<Tick, A extends ObservableTransformer<Tick>, B extends ObservableTransformer<Tick>>(a: A, b: B): B {
function combine(a, b) {
    return b.create(function (upstream) { return b.attach(a.attach(upstream)); });
}
exports.combine = combine;
var ConditionActionPair = (function () {
    function ConditionActionPair(condition, action) {
        this.condition = condition;
        this.action = action;
    }
    return ConditionActionPair;
})();
exports.ConditionActionPair = ConditionActionPair;
;
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
        this.conditions = conditions;
        this.preceeding = preceeding;
    }
    If.prototype.elif = function (clause, action) {
        types.assert(clause != undefined && action != undefined);
        this.conditions.push(new ConditionActionPair(clause, action));
        return this;
    };
    If.prototype.endif = function () {
        return this.preceeding.pipe(this.else(this.preceeding.create()));
    };
    If.prototype.else = function (otherwise) {
        var _this = this;
        return this.preceeding.pipe(this.preceeding.create(function (upstream) {
            if (exports.DEBUG_IF)
                console.log("If: attach");
            var downstream = new Rx.Subject();
            var anchor = new Rx.Subject();
            var currentOT_API = otherwise;
            var activeSubscription = otherwise.attach(anchor).subscribe(downstream);
            // we initialise all the condition parameters
            var conditions_next = _this.conditions.map(function (pair) {
                return Parameter.from(pair.condition).init();
            });
            var fork = upstream.subscribe(function (tick) {
                if (exports.DEBUG_IF)
                    console.log("If: upstream tick");
                // first, we find which animation should active, by using the conditions array
                var nextActiveOT_API = null;
                // ideally we would use find, but that is not in TS yet..
                for (var i = 0; i < _this.conditions.length && nextActiveOT_API == null; i++) {
                    if (conditions_next[i](tick.clock)) {
                        nextActiveOT_API = _this.conditions[i].action;
                    }
                }
                if (nextActiveOT_API == null)
                    nextActiveOT_API = otherwise;
                // second, we see if this is the same as the current animation, or whether we have switched
                if (nextActiveOT_API != currentOT_API) {
                    // this is a new animation being sequenced, cancel the old one and add a new one
                    if (exports.DEBUG_IF)
                        console.log("If: new subscription");
                    if (activeSubscription != null)
                        activeSubscription.dispose();
                    activeSubscription = nextActiveOT_API.attach(anchor).subscribe(downstream);
                    currentOT_API = nextActiveOT_API;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9PYnNlcnZhYmxlVHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOlsiQmFzZVRpY2siLCJCYXNlVGljay5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jcmVhdGUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIubWFwIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmUxIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmUyIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmUzIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLm1lcmdlMiIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5tZXJnZTQiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuaW5pdCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuY29uc3RydWN0b3IiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5jcmVhdGUiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5waXBlIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIudGhlbiIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmxvb3AiLCJhdHRhY2hMb29wIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuZW1pdCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLnBhcmFsbGVsIiwiZGVjcmVtZW50QWN0aXZlIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuY2xvbmUiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci50YWtlIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuZHJhdyIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmFmZmVjdCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmFmZmVjdDEiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5hZmZlY3QyIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuYWZmZWN0MyIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmlmIiwiY29tYmluZSIsIkNvbmRpdGlvbkFjdGlvblBhaXIiLCJDb25kaXRpb25BY3Rpb25QYWlyLmNvbnN0cnVjdG9yIiwiSWYiLCJJZi5jb25zdHJ1Y3RvciIsIklmLmVsaWYiLCJJZi5lbmRpZiIsIklmLmVsc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQ0EsSUFBWSxFQUFFLFdBQU0sSUFDcEIsQ0FBQyxDQUR1QjtBQUN4QixJQUFZLEtBQUssV0FBTSxTQUN2QixDQUFDLENBRCtCO0FBQ2hDLElBQVksU0FBUyxXQUFNLGFBQzNCLENBQUMsQ0FEdUM7QUFDeEMsaUJBQWMsU0FFZCxDQUFDLEVBRnNCO0FBRVosa0JBQVUsR0FBRyxJQUFJLENBQUM7QUFDbEIsa0JBQVUsR0FBRyxJQUFJLENBQUM7QUFDbEIsZ0JBQVEsR0FBRyxLQUFLLENBQUM7QUFDakIsa0JBQVUsR0FBRyxLQUFLLENBQUM7QUFDbkIsc0JBQWMsR0FBRyxLQUFLLENBQUM7QUFDdkIsb0JBQVksR0FBRyxLQUFLLENBQUM7QUFDckIsYUFBSyxHQUFHLElBQUksQ0FBQztBQUV4QjtJQUNJQSxrQkFDV0EsS0FBYUEsRUFDYkEsRUFBVUEsRUFDVkEsR0FBNkJBO1FBRjdCQyxVQUFLQSxHQUFMQSxLQUFLQSxDQUFRQTtRQUNiQSxPQUFFQSxHQUFGQSxFQUFFQSxDQUFRQTtRQUNWQSxRQUFHQSxHQUFIQSxHQUFHQSxDQUEwQkE7SUFFeENBLENBQUNBO0lBQ0xELGVBQUNBO0FBQURBLENBUEEsQUFPQ0EsSUFBQTtBQVBZLGdCQUFRLFdBT3BCLENBQUE7QUFFRDtJQUNJRSwrQkFBbUJBLE1BQTJEQTtRQUEzREMsV0FBTUEsR0FBTkEsTUFBTUEsQ0FBcURBO0lBQzlFQSxDQUFDQTtJQUVERDs7O09BR0dBO0lBQ0hBLHNDQUFNQSxHQUFOQSxVQUFPQSxNQUEyREE7UUFDOURFLE1BQU1BLENBQVFBLElBQUlBLHFCQUFxQkEsQ0FBVUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7SUFDN0RBLENBQUNBO0lBRURGOztPQUVHQTtJQUNIQSxtQ0FBR0EsR0FB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LENBQUNBLGdCQUFRQSxDQUFDQTt3QkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esc0JBQXNCQSxDQUFDQSxDQUFDQTtvQkFDbERBLEVBQUVBLENBQUNBLENBQUNBLGtCQUFrQkEsSUFBSUEsSUFBSUEsQ0FBQ0E7d0JBQUNBLGtCQUFrQkEsQ0FBQ0EsT0FBT0EsRUFBRUEsQ0FBQ0E7b0JBQzdEQSxrQkFBa0JBLEdBQUdBLGdCQUFnQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7b0JBQzNFQSxhQUFhQSxHQUFHQSxnQkFBZ0JBLENBQUNBO2dCQUNyQ0EsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUVSQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDeEJBLENBQUNBLEVBQ0RBLFVBQUFBLEdBQUdBLElBQUlBLE9BQUFBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLEVBQW5CQSxDQUFtQkEsRUFDMUJBLGNBQU1BLE9BQUFBLE1BQU1BLENBQUNBLFdBQVdBLEVBQUVBLEVBQXBCQSxDQUFvQkEsQ0FDN0JBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLFVBQUFBLENBQUNBLElBQUtBLEVBQUVBLENBQUNBLENBQUNBLGdCQUFRQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxDQUFDQSxDQUFBQSxDQUFBQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNuRkEsQ0FBQ0EsQ0FDSkEsQ0FBQ0EsQ0FBQUE7SUFDTkEsQ0FBQ0E7SUFDTEosU0FBQ0E7QUFBREEsQ0FuRUEsQUFtRUNBLElBQUE7QUFuRVksVUFBRSxLQW1FZCxDQUFBIiwiZmlsZSI6InNyYy9PYnNlcnZhYmxlVHJhbnNmb3JtZXIuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
