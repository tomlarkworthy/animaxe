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
    // todo scan merge, somehow 
    // we could use combineLatest with tagging
    // 
    // subject
    // zip (subject, subject.take(1))
    // subject.onNext() //would expect onComplete to call
    // subject.onNext() //does here instead (and no onNext())
    ObservableTransformer.combineN = function (sources, combinerBuilder) {
        // assign and link a subject for each source
        var subscriptions = sources.map(function (source) {
            return source.subscribe(next);
        });
        sources.map(function (x) { return new Rx.Subject(); });
        return null;
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
            // Should the onComplete call during the thread of execution of a dirrernt on Next?
            // Is there a better way of arranging the merge, so that the onComplete 
            // merges faster
            // we need to push all the ticks through each pipe, collect the results
            // and defer resolving onCompleted until immediately after
            // this requires a new type of combinator
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9PYnNlcnZhYmxlVHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOlsiQmFzZVRpY2siLCJCYXNlVGljay5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jcmVhdGUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIubWFwIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmUxIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmVOIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmUyIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmUzIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLm1lcmdlMiIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5tZXJnZTQiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuaW5pdCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuY29uc3RydWN0b3IiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5jcmVhdGUiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5waXBlIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIudGhlbiIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmxvb3AiLCJhdHRhY2hMb29wIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuZW1pdCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLnBhcmFsbGVsIiwiZGVjcmVtZW50QWN0aXZlIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuY2xvbmUiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci50YWtlIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuZHJhdyIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmFmZmVjdCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmFmZmVjdDEiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5hZmZlY3QyIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuYWZmZWN0MyIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmlmIiwiY29tYmluZSIsIkNvbmRpdGlvbkFjdGlvblBhaXIiLCJDb25kaXRpb25BY3Rpb25QYWlyLmNvbnN0cnVjdG9yIiwiSWYiLCJJZi5jb25zdHJ1Y3RvciIsIklmLmVsaWYiLCJJZi5lbmRpZiIsIklmLmVsc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQ0EsSUFBWSxFQUFFLFdBQU0sSUFDcEIsQ0FBQyxDQUR1QjtBQUN4QixJQUFZLEtBQUssV0FBTSxTQUN2QixDQUFDLENBRCtCO0FBQ2hDLElBQVksU0FBUyxXQUFNLGFBQzNCLENBQUMsQ0FEdUM7QUFDeEMsaUJBQWMsU0FFZCxDQUFDLEVBRnNCO0FBRVosa0JBQVUsR0FBRyxJQUFJLENBQUM7QUFDbEIsa0JBQVUsR0FBRyxJQUFJLENBQUM7QUFDbEIsZ0JBQVEsR0FBRyxLQUFLLENBQUM7QUFDakIsa0JBQVUsR0FBRyxLQUFLLENBQUM7QUFDbkIsc0JBQWMsR0FBRyxLQUFLLENBQUM7QUFDdkIsb0JBQVksR0FBRyxLQUFLLENBQUM7QUFDckIsYUFBSyxHQUFHLElBQUksQ0FBQztBQUV4QjtJQUNJQSxrQkFDV0EsS0FBYUEsRUFDYkEsRUFBVUEsRUFDVkEsR0FBNkJBO1FBRjdCQyxVQUFLQSxHQUFMQSxLQUFLQSxDQUFRQTtRQUNiQSxPQUFFQSxHQUFGQSxFQUFFQSxDQUFRQTtRQUNWQSxRQUFHQSxHQUFIQSxHQUFHQSxDQUEwQkE7SUFFeENBLENBQUNBO0lBQ0xELGVBQUNBO0FBQURBLENBUEEsQUFPQ0EsSUFBQTtBQVBZLGdCQUFRLFdBT3BCLENBQUE7QUFFRDtJQUNJRSwrQkFBbUJBLE1BQTJEQTtRQUEzREMsV0FBTUEsR0FBTkEsTUFBTUEsQ0FBcURBO0lBQzlFQSxDQUFDQTtJQUVERDs7O09BR0dBO0lBQ0hBLHNDQUFNQSxHQUFOQSxVQUFPQSxNQUEyREE7UUFDOURFLE1BQU1BLENBQVFBLElBQUlBLHFCQUFxQkEsQ0FBVUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7SUFDN0RBLENB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QkFFUkEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ3hCQSxDQUFDQSxFQUNEQSxVQUFBQSxHQUFHQSxJQUFJQSxPQUFBQSxNQUFNQSxDQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFuQkEsQ0FBbUJBLEVBQzFCQSxjQUFNQSxPQUFBQSxNQUFNQSxDQUFDQSxXQUFXQSxFQUFFQSxFQUFwQkEsQ0FBb0JBLENBQzdCQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFBQSxDQUFDQSxJQUFLQSxFQUFFQSxDQUFDQSxDQUFDQSxnQkFBUUEsQ0FBQ0E7Z0JBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHFCQUFxQkEsQ0FBQ0EsQ0FBQUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDbkZBLENBQUNBLENBQ0pBLENBQUNBLENBQUFBO0lBQ05BLENBQUNBO0lBQ0xKLFNBQUNBO0FBQURBLENBbkVBLEFBbUVDQSxJQUFBO0FBbkVZLFVBQUUsS0FtRWQsQ0FBQSIsImZpbGUiOiJzcmMvT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
