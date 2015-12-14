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
var zip = require("./zip");
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
     * Creates an animation that is at most n frames from 'this'.
     */
    ObservableTransformer.prototype.take = function (frames) {
        var self = this;
        if (exports.DEBUG)
            console.log("take: build");
        return this.create(function (upstream) { return self.attach(upstream).take(frames); });
    };
    /**
     * map the stream of values to a new parameter
     */
    ObservableTransformer.prototype.mapObservable = function (fn) {
        var self = this;
        return new ObservableTransformer(function (upstream) { return fn(self.attach(upstream)); });
    };
    /**
     * map the value of 'this' to a new parameter
     */
    ObservableTransformer.prototype.mapValue = function (fn) {
        return this.mapObservable(function (upstream) { return upstream.map(fn); });
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
            console.log("combine1: attach");
            var fork = new Rx.Subject();
            upstream.subscribe(fork);
            return zip.zip(combinerBuilder(), _this.attach(fork).tapOnCompleted(function () { return console.log("combine1: inner this completed"); }), other1.attach(fork).tapOnCompleted(function () { return console.log("combine1: inner other1 completed"); }));
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
            // Should the onComplete call during the thread of execution of a dirrernt on Next?
            // Is there a better way of arranging the merge, so that the onComplete 
            // merges faster
            // we need to push all the ticks through each pipe, collect the results
            // and defer resolving onCompleted until immediately after
            // this requires a new type of combinator
            if (exports.DEBUG)
                console.log("combine2: attach");
            var fork = new Rx.Subject();
            upstream.subscribe(fork);
            // join upstream with parameter
            return zip.zip(combinerBuilder(), _this.attach(fork).tapOnCompleted(function () { return console.log("combine2: inner this completed"); }), other1.attach(fork).tapOnCompleted(function () { return console.log("combine2: inner other1 completed"); }), other2.attach(fork).tapOnCompleted(function () { return console.log("combine2: inner other2 completed"); }));
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
            if (exports.DEBUG)
                console.log("combine3: attach");
            var fork = new Rx.Subject();
            upstream.subscribe(fork);
            // join upstream with parameter
            return zip.zip(combinerBuilder(), _this.attach(fork), other1.attach(fork), other2.attach(fork), other3.attach(fork));
        });
    };
    ObservableTransformer.merge2 = function (other1, other2, combinerBuilder) {
        return new ObservableTransformer(function (upstream) {
            return Rx.Observable.zip(other1.attach(upstream), other2.attach(upstream), combinerBuilder());
        });
    };
    ObservableTransformer.merge3 = function (other1, other2, other3, combinerBuilder) {
        return new ObservableTransformer(function (upstream) {
            return Rx.Observable.zip(other1.attach(upstream), other2.attach(upstream), other3.attach(upstream), combinerBuilder());
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
        if (exports.DEBUG)
            console.log("affect1: build");
        return this.create(this.combine1(param1, function () {
            if (exports.DEBUG)
                console.log("affect1: attach");
            var effect = effectBuilder();
            return function (tick, param1) {
                if (exports.DEBUG)
                    console.log("affect1: effect, tick + ", param1);
                effect(tick, param1); // apply side effect
                return tick; // tick is returned again to make the return type chainable
            };
        }).attach);
    };
    ChainableTransformer.prototype.affect2 = function (param1, param2, effectBuilder) {
        if (exports.DEBUG)
            console.log("affect2: build");
        return this.create(this.combine2(param1, param2, function () {
            if (exports.DEBUG)
                console.log("affect2: attach");
            var effect = effectBuilder();
            return function (tick, param1, param2) {
                if (exports.DEBUG)
                    console.log("affect2: effect, tick + ", param1, param2);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9PYnNlcnZhYmxlVHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOlsiQmFzZVRpY2siLCJCYXNlVGljay5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jcmVhdGUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIudGFrZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5tYXBPYnNlcnZhYmxlIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLm1hcFZhbHVlIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmUxIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmUyIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmUzIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLm1lcmdlMiIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5tZXJnZTMiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIubWVyZ2U0IiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmluaXQiLCJDaGFpbmFibGVUcmFuc2Zvcm1lciIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmNvbnN0cnVjdG9yIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuY3JlYXRlIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIucGlwZSIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLnRoZW4iLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5sb29wIiwiYXR0YWNoTG9vcCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmVtaXQiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5wYXJhbGxlbCIsImRlY3JlbWVudEFjdGl2ZSIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmNsb25lIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuZHJhdyIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmFmZmVjdCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmFmZmVjdDEiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5hZmZlY3QyIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuYWZmZWN0MyIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmlmIiwiY29tYmluZSIsIkNvbmRpdGlvbkFjdGlvblBhaXIiLCJDb25kaXRpb25BY3Rpb25QYWlyLmNvbnN0cnVjdG9yIiwiSWYiLCJJZi5jb25zdHJ1Y3RvciIsIklmLmVsaWYiLCJJZi5lbmRpZiIsIklmLmVsc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQ0EsSUFBWSxFQUFFLFdBQU0sSUFDcEIsQ0FBQyxDQUR1QjtBQUN4QixJQUFZLEtBQUssV0FBTSxTQUN2QixDQUFDLENBRCtCO0FBQ2hDLElBQVksR0FBRyxXQUFNLE9BQ3JCLENBQUMsQ0FEMkI7QUFDNUIsSUFBWSxTQUFTLFdBQU0sYUFDM0IsQ0FBQyxDQUR1QztBQUN4QyxpQkFBYyxTQUVkLENBQUMsRUFGc0I7QUFFWixrQkFBVSxHQUFHLElBQUksQ0FBQztBQUNsQixrQkFBVSxHQUFHLElBQUksQ0FBQztBQUNsQixnQkFBUSxHQUFHLEtBQUssQ0FBQztBQUNqQixrQkFBVSxHQUFHLEtBQUssQ0FBQztBQUNuQixzQkFBYyxHQUFHLEtBQUssQ0FBQztBQUN2QixvQkFBWSxHQUFHLEtBQUssQ0FBQztBQUNyQixhQUFLLEdBQUcsSUFBSSxDQUFDO0FBRXhCO0lBQ0lBLGtCQUNXQSxLQUFhQSxFQUNiQSxFQUFVQSxFQUNWQSxHQUE2QkE7UUFGN0JDLFVBQUtBLEdBQUxBLEtBQUtBLENBQVFBO1FBQ2JBLE9BQUVBLEdBQUZBLEVBQUVBLENBQVFBO1FBQ1ZBLFFBQUdBLEdBQUhBLEdBQUdBLENBQTBCQTtJQUV4Q0EsQ0FBQ0E7SUFDTEQsZUFBQ0E7QUFBREEsQ0FQQSxBQU9DQSxJQUFBO0FBUFksZ0JBQVEsV0FPcEIsQ0FBQTtBQUVEO0lBQ0lFLCtCQUFtQkEsTUFBMkRBO1FBQTNEQyxXQUFNQSxHQUFOQSxNQUFNQSxDQUFxREE7SUFDOUVBLENBQUNBO0lBRUREOzs7T0FHR0E7SUFDSEEsc0NBQU1BLEdBQU5BLFVBQU9BLE1BQTJEQTtRQUM5REUsTUFBTUEsQ0FBUUEsSUFBSUEscUJBQXFCQSxDQUFVQSxNQUFNQSxDQUFDQSxDQUFDQTtJQUM3REEsQ0FBQ0E7SUFHREY7O09BRUdBO0lBQ0hBLG9DQUFJQSxHQUFKQSxVQUFLQSxNQUFjQTtRQUNmRyxJQUFJQSxJQUFJQSxHQUFHQSxJQUFJQSxDQUFDQTtRQUNoQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7UUFDdENBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQ2ZBLFVBQUNBLFFBQTJCQSxJQUFLQSxPQUFBQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxFQUFsQ0EsQ0FBa0NBLENBQ3JFQSxDQUFBQTtJQUNMQSxDQUFDQTtJQUVESDs7T0FFR0E7SUFDSEEsNkNBQWFBLEdBQWJBLFVBQWlCQSxFQUFpREE7UUFDOURJLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO1FBQ2hCQSxNQUFNQSxDQUFDQSxJQUFJQSxxQkFBcUJBLENBQzVCQSxVQUFDQSxRQUEyQkEsSUFBS0EsT0FBQUEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsRUFBekJBLENBQXlCQSxDQUM3REEsQ0FBQ0E7SUFDTkEsQ0FBQ0E7SUFFREo7O09BRUdBO0lBQ0hBLHdDQUFRQSxHQUFSQSxVQUFZQSxFQUFtQkE7UUFDM0JLLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLGFBQWFBLENBQUNBLFVBQUFBLFFBQVFBLElBQUlBLE9BQWtCQSxRQUFRQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFsQ0EsQ0FBa0NBLENBQUNBLENBQUFBO0lBQzdFQSxDQUFDQTtJQUVETDs7OztPQUlHQTtJQUNIQSx3Q0FBUUEsR0FBUkEsVUFDSUEsTUFBdUNBLEVBQ3ZDQSxlQUE2REE7UUFGakVNLGlCQWVDQTtRQVhHQSxNQUFNQSxDQUFDQSxJQUFJQSxxQkFBcUJBLENBQWtCQSxVQUFDQSxRQUEyQkE7WUFDMUVBLCtCQUErQkE7WUFDL0JBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGtCQUFrQkEsQ0FBQ0EsQ0FBQUE7WUFDL0JBLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLEVBQUVBLENBQUNBLE9BQU9BLEVBQU1BLENBQUFBO1lBQy9CQSxRQUFRQSxDQUFDQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUN6QkEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FDVkEsZUFBZUEsRUFBRUEsRUFDakJBLEtBQUlBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBLGNBQWNBLENBQUNBLGNBQU1BLE9BQUFBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGdDQUFnQ0EsQ0FBQ0EsRUFBN0NBLENBQTZDQSxDQUFDQSxFQUNyRkEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsY0FBTUEsT0FBQUEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esa0NBQWtDQSxDQUFDQSxFQUEvQ0EsQ0FBK0NBLENBQUNBLENBQzVGQSxDQUFBQTtRQUNMQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNQQSxDQUFDQTtJQUVETjs7OztPQUlHQTtJQUNIQSx3Q0FBUUEsR0FBUkEsVUFDUUEsTUFBdUNBLEVBQ3ZDQSxNQUF1Q0EsRUFDdkNBLGVBQ21EQTtRQUozRE8saUJBNEJDQTtRQXRCR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxDQUFDQTtRQUMxQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEscUJBQXFCQSxDQUM1QkEsVUFBQ0EsUUFBMkJBO1lBQ3hCQSwwRUFBMEVBO1lBQzFFQSxtRkFBbUZBO1lBQ25GQSx3RUFBd0VBO1lBQ3hFQSxnQkFBZ0JBO1lBQ2hCQSx1RUFBdUVBO1lBQ3ZFQSwwREFBMERBO1lBQzFEQSx5Q0FBeUNBO1lBQ3pDQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxDQUFDQTtZQUMzQ0EsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsRUFBRUEsQ0FBQ0EsT0FBT0EsRUFBTUEsQ0FBQUE7WUFDL0JBLFFBQVFBLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ3pCQSwrQkFBK0JBO1lBQy9CQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUNWQSxlQUFlQSxFQUFFQSxFQUNqQkEsS0FBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsY0FBY0EsQ0FBQ0EsY0FBTUEsT0FBQUEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0NBQWdDQSxDQUFDQSxFQUE3Q0EsQ0FBNkNBLENBQUNBLEVBQ3JGQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxjQUFjQSxDQUFDQSxjQUFNQSxPQUFBQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxrQ0FBa0NBLENBQUNBLEVBQS9DQSxDQUErQ0EsQ0FBQ0EsRUFDekZBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBLGNBQWNBLENBQUNBLGNBQU1BLE9BQUFBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGtDQUFrQ0EsQ0FBQ0EsRUFBL0NBLENBQStDQSxDQUFDQSxDQUM1RkEsQ0FBQUE7UUFDTEEsQ0FBQ0EsQ0FDSkEsQ0FBQ0E7SUFDTkEsQ0FBQ0E7SUFFRFA7Ozs7T0FJR0E7SUFDSEEsd0NBQVFBLEdBQVJBLFVBQ1FBLE1BQXVDQSxFQUN2Q0EsTUFBdUNBLEVBQ3ZDQSxNQUF1Q0EsRUFDdkNBLGVBQytEQTtRQUx2RVEsaUJBdUJDQTtRQWhCR0EsTUFBTUEsQ0FBQ0EsSUFBSUEscUJBQXFCQSxDQUM1QkEsVUFBQ0EsUUFBMkJBO1lBQ3hCQSwrQkFBK0JBO1lBQy9CQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxDQUFDQTtZQUMzQ0EsSUFBSUEsSUFBSUEsR0FBR0EsSUFBSUEsRUFBRUEsQ0FBQ0EsT0FBT0EsRUFBTUEsQ0FBQUE7WUFDL0JBLFFBQVFBLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ3pCQSwrQkFBK0JBO1lBQy9CQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUNWQSxlQUFlQSxFQUFFQSxFQUNqQkEsS0FBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsRUFDakJBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLEVBQ25CQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUNuQkEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FDdEJBLENBQUFBO1FBQ0xBLENBQUNBLENBQ0pBLENBQUNBO0lBQ05BLENBQUNBO0lBRU1SLDRCQUFNQSxHQUFiQSxVQUNRQSxNQUF1Q0EsRUFDdkNBLE1BQXVDQSxFQUN2Q0EsZUFDbUNBO1FBRXZDUyxNQUFNQSxDQUFDQSxJQUFJQSxxQkFBcUJBLENBQzVCQSxVQUFDQSxRQUEyQkE7WUFDeEJBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQ3BCQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxFQUN2QkEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsRUFDdkJBLGVBQWVBLEVBQUVBLENBQUNBLENBQUNBO1FBQzNCQSxDQUFDQSxDQUNKQSxDQUFDQTtJQUNOQSxDQUFDQTtJQUVNVCw0QkFBTUEsR0FBYkEsVUFDUUEsTUFBdUNBLEVBQ3ZDQSxNQUF1Q0EsRUFDdkNBLE1BQXVDQSxFQUN2Q0EsZUFDK0NBO1FBRW5EVSxNQUFNQSxDQUFDQSxJQUFJQSxxQkFBcUJBLENBQzVCQSxVQUFDQSxRQUEyQkE7WUFDeEJBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQ3BCQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxFQUN2QkEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsRUFDdkJBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLEVBQ3ZCQSxlQUFlQSxFQUFFQSxDQUFDQSxDQUFDQTtRQUMzQkEsQ0FBQ0EsQ0FDSkEsQ0FBQ0E7SUFDTkEsQ0FBQ0E7SUFFTVYsNEJBQU1BLEdBQWJBLFVBQ1FBLE1BQXVDQSxFQUN2Q0EsTUFBdUNBLEVBQ3ZDQSxNQUF1Q0EsRUFDdkNBLE1BQXVDQSxFQUN2Q0EsZUFDMkRBO1FBRS9EVyxNQUFNQSxDQUFDQSxJQUFJQSxxQkFBcUJBLENBQzVCQSxVQUFDQSxRQUEyQkE7WUFDeEJBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQ3BCQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxFQUN2QkEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsRUFDdkJBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLEVBQ3ZCQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxFQUN2QkEsZUFBZUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7UUFDM0JBLENBQUNBLENBQ0pBLENBQUNBO0lBQ05BLENBQUNBO0lBRURYLG9DQUFJQSxHQUFKQSxjQUErQlksTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EseUJBQXlCQSxDQUFDQSxDQUFBQSxDQUFBQSxDQUFDQTtJQUM5RVosNEJBQUNBO0FBQURBLENBdkxBLEFBdUxDQSxJQUFBO0FBdkxZLDZCQUFxQix3QkF1TGpDLENBQUE7QUFFRDtJQUFpRWEsd0NBQWlDQTtJQUU5RkEsOEJBQVlBLE1BQThEQTtRQUN0RUMsa0JBQU1BLE1BQU1BLENBQUNBLENBQUFBO0lBQ2pCQSxDQUFDQTtJQUVERDs7O09BR0dBO0lBQ0hBLHFDQUFNQSxHQUFOQSxVQUFPQSxNQUEyRUE7UUFBM0VFLHNCQUEyRUEsR0FBM0VBLFNBQWlFQSxVQUFBQSxHQUFHQSxJQUFJQSxPQUFBQSxHQUFHQSxFQUFIQSxDQUFHQTtRQUM5RUEsTUFBTUEsQ0FBUUEsSUFBSUEsb0JBQW9CQSxDQUFPQSxNQUFNQSxDQUFDQSxDQUFDQTtJQUN6REEsQ0FBQ0E7SUFFREY7Ozs7OztPQU1HQTtJQUNIQSxtQ0FBSUEsR0FBSkEsVUFBZ0RBLFVBQWtCQTtRQUM5REcsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBMkNBLElBQUlBLEVBQUVBLFVBQVVBLENBQUNBLENBQUNBO0lBQy9FQSxDQUFDQTtJQUVESDs7Ozs7O09BTUdBO0lBRUhBLG1DQUFJQSxHQUFKQSxVQUFLQSxRQUFvQ0E7UUFDckNJLElBQUlBLElBQUlBLEdBQUdBLElBQUlBLENBQUNBO1FBRWhCQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFDQSxRQUE2QkE7WUFDN0NBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLENBQU9BLFVBQUFBLFFBQVFBO2dCQUN0Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0Esa0JBQVVBLENBQUNBO29CQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxjQUFjQSxDQUFDQSxDQUFDQTtnQkFFNUNBLElBQUlBLFNBQVNBLEdBQUdBLElBQUlBLENBQUNBO2dCQUNyQkEsSUFBSUEsS0FBS0EsR0FBSUEsSUFBSUEsRUFBRUEsQ0FBQ0EsT0FBT0EsRUFBUUEsQ0FBQ0E7Z0JBQ3BDQSxJQUFJQSxNQUFNQSxHQUFHQSxJQUFJQSxFQUFFQSxDQUFDQSxPQUFPQSxFQUFRQSxDQUFDQTtnQkFFcENBLElBQUlBLFdBQVdBLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLFdBQVdBLENBQUNBLEVBQUVBLENBQUNBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBLFdBQVdBLENBQUNBLEVBQUVBLENBQUNBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLFNBQVNBLENBQ2xIQSxVQUFBQSxJQUFJQTtvQkFDQUEsRUFBRUEsQ0FBQ0EsQ0FBQ0Esa0JBQVVBLENBQUNBO3dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSwyQkFBMkJBLENBQUNBLENBQUNBO29CQUN6REEsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzFCQSxDQUFDQSxFQUNEQSxVQUFBQSxLQUFLQTtvQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0Esa0JBQVVBLENBQUNBO3dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO29CQUNqREEsUUFBUUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzVCQSxDQUFDQSxFQUNEQTtvQkFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0Esa0JBQVVBLENBQUNBO3dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxzQkFBc0JBLENBQUNBLENBQUNBO29CQUNwREEsU0FBU0EsR0FBR0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EseUNBQXlDQTtnQkFDaEVBLENBQUNBLENBQ0pBLENBQUNBO2dCQUVGQSxJQUFJQSxZQUFZQSxHQUFHQSxRQUFRQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxFQUFFQSxDQUFDQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQSxXQUFXQSxDQUFDQSxFQUFFQSxDQUFDQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUN4SEEsVUFBQUEsSUFBSUE7b0JBQ0FBLEVBQUVBLENBQUNBLENBQUNBLGtCQUFVQSxDQUFDQTt3QkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsNEJBQTRCQSxDQUFDQSxDQUFDQTtvQkFDMURBLFFBQVFBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUMxQkEsQ0FBQ0EsRUFDREEsVUFBQUEsS0FBS0E7b0JBQ0RBLEVBQUVBLENBQUNBLENBQUNBLGtCQUFVQSxDQUFDQTt3QkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esb0JBQW9CQSxDQUFDQSxDQUFDQTtvQkFDbERBLFFBQVFBLENBQUNBLE9BQU9BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO2dCQUM1QkEsQ0FBQ0EsRUFDREE7b0JBQ0ksRUFBRSxDQUFDLENBQUMsa0JBQVUsQ0FBQzt3QkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUM7b0JBQ3JELFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQSxDQUFDLGtDQUFrQztnQkFDN0QsQ0FBQyxDQUNKQSxDQUFDQTtnQkFFRkEsSUFBSUEsb0JBQW9CQSxHQUFHQSxRQUFRQSxDQUFDQSxXQUFXQSxDQUFDQSxFQUFFQSxDQUFDQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxXQUFXQSxDQUFDQSxFQUFFQSxDQUFDQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUNqSEEsVUFBQUEsSUFBSUE7b0JBQ0FBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNaQSxFQUFFQSxDQUFDQSxDQUFDQSxrQkFBVUEsQ0FBQ0E7NEJBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHlCQUF5QkEsQ0FBQ0EsQ0FBQ0E7d0JBQ3ZEQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtvQkFDdkJBLENBQUNBO29CQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTt3QkFDSkEsRUFBRUEsQ0FBQ0EsQ0FBQ0Esa0JBQVVBLENBQUNBOzRCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSwwQkFBMEJBLENBQUNBLENBQUNBO3dCQUN4REEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7b0JBQ3hCQSxDQUFDQTtnQkFDTEEsQ0FBQ0EsRUFDREEsVUFBQUEsS0FBS0E7b0JBQ0RBLEVBQUVBLENBQUNBLENBQUNBLGtCQUFVQSxDQUFDQTt3QkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esc0JBQXNCQSxDQUFDQSxDQUFDQTtvQkFDcERBLFFBQVFBLENBQUNBLE9BQU9BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO2dCQUM1QkEsQ0FBQ0EsRUFDREE7b0JBQ0lBLEVBQUVBLENBQUNBLENBQUNBLGtCQUFVQSxDQUFDQTt3QkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EseUJBQXlCQSxDQUFDQSxDQUFDQTtvQkFDdkRBLFFBQVFBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBO2dCQUMzQkEsQ0FBQ0EsQ0FDSkEsQ0FBQ0E7Z0JBQ0ZBLGFBQWFBO2dCQUNiQSxNQUFNQSxDQUFDQTtvQkFDSEEsRUFBRUEsQ0FBQ0EsQ0FBQ0Esa0JBQVVBLENBQUNBO3dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxlQUFlQSxDQUFDQSxDQUFDQTtvQkFDN0NBLG9CQUFvQkEsQ0FBQ0EsT0FBT0EsRUFBRUEsQ0FBQ0E7b0JBQy9CQSxXQUFXQSxDQUFDQSxPQUFPQSxFQUFFQSxDQUFDQTtvQkFDdEJBLFlBQVlBLENBQUNBLE9BQU9BLEVBQUVBLENBQUNBO2dCQUMzQkEsQ0FBQ0EsQ0FBQ0E7WUFDTkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDUEEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDUEEsQ0FBQ0E7SUFDREo7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQTJFR0E7SUFDSEE7Ozs7O09BS0dBO0lBQ0hBLG1DQUFJQSxHQUFKQSxVQUFLQSxTQUFxQ0E7UUFDdENLLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQ1pBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLElBQXlCQTtZQUMzQyxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQU8sVUFBUyxRQUFRO2dCQUMvQyxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDO29CQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDckQsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDO2dCQUNyQixJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQztnQkFDNUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUdWLG9CQUFvQixJQUFJO29CQUNwQkMsRUFBRUEsQ0FBQ0EsQ0FBQ0Esa0JBQVVBLENBQUNBO3dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxrQ0FBa0NBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO29CQUVuRUEsU0FBU0EsR0FBR0EsSUFBSUEsRUFBRUEsQ0FBQ0EsT0FBT0EsRUFBUUEsQ0FBQ0E7b0JBQ25DQSxnQkFBZ0JBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLFNBQVNBLENBQ3BEQSxVQUFTQSxJQUFJQTt3QkFDVCxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDOzRCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLENBQUMsQ0FBQzt3QkFDbkUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDMUIsQ0FBQyxFQUNEQSxVQUFTQSxHQUFHQTt3QkFDUixFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDOzRCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLENBQUMsQ0FBQzt3QkFDdkUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDMUIsQ0FBQyxFQUNEQTt3QkFDSSxFQUFFLENBQUMsQ0FBQyxrQkFBVSxDQUFDOzRCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQzt3QkFDMUQsU0FBUyxHQUFHLElBQUksQ0FBQztvQkFDckIsQ0FBQyxDQUNKQSxDQUFDQTtvQkFDRkEsRUFBRUEsQ0FBQ0EsQ0FBQ0Esa0JBQVVBLENBQUNBO3dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSw0Q0FBNENBLENBQUNBLENBQUFBO2dCQUM3RUEsQ0FBQ0E7Z0JBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDVixVQUFTLElBQUk7b0JBQ1QsRUFBRSxDQUFDLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ3BCLEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7NEJBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO3dCQUNuRCxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3JCLENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsa0JBQVUsQ0FBQzt3QkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUM7b0JBQzVELFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBRXZCLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNqQixDQUFDLEVBQ0QsVUFBUyxHQUFHO29CQUNSLEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7d0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDdkUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDMUIsQ0FBQyxFQUNELFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUN0QyxDQUFDO2dCQUVGLE1BQU0sQ0FBQztvQkFDSCxTQUFTO29CQUNULEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7d0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztvQkFDN0MsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDO3dCQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdkMsQ0FBQyxDQUFBO1lBQ0wsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFDRCxDQUNMQSxDQUFDQTtJQUNOQSxDQUFDQTtJQUNETDs7Ozs7T0FLR0E7SUFDSEEsbUNBQUlBLEdBQUpBLFVBQUtBLFNBQXFDQTtRQUN0Q08sTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBeUJBO1lBQzVELEVBQUUsQ0FBQyxDQUFDLGtCQUFVLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ2xELElBQUksV0FBVyxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBUSxDQUFDO1lBRXpDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVMsSUFBVTtnQkFDakMsRUFBRSxDQUFDLENBQUMsa0JBQVUsQ0FBQztvQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUMxRCxTQUFTLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUMxQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdCLENBQUMsQ0FDSixDQUFDO1FBQ04sQ0FBQyxDQUFDQSxDQUFDQSxDQUFDQTtJQUNSQSxDQUFDQTtJQUVEUDs7Ozs7T0FLR0E7SUFDSEEsdUNBQVFBLEdBQVJBLFVBQVNBLFVBQXdDQTtRQUM3Q1EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FDWkEsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsSUFBeUJBO1lBQzNDLEVBQUUsQ0FBQyxDQUFDLHNCQUFjLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBRTFELElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQztZQUN0QixJQUFJLFdBQVcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQVEsQ0FBQztZQUV6Qyx5QkFBeUIsR0FBVTtnQkFDL0JDLEVBQUVBLENBQUNBLENBQUNBLHNCQUFjQSxDQUFDQTtvQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsNEJBQTRCQSxDQUFDQSxDQUFDQTtnQkFDOURBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBO29CQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxpQkFBaUJBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO2dCQUM3Q0EsYUFBYUEsRUFBR0EsQ0FBQ0E7WUFDckJBLENBQUNBO1lBRUQsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFTLFNBQXFDO2dCQUM3RCxhQUFhLEVBQUUsQ0FBQztnQkFDaEIsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBZixDQUFlLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FDbEUsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFsQixDQUFrQixFQUM5QixlQUFlLEVBQ2YsZUFBZSxDQUFDLENBQUE7WUFDeEIsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFNLE9BQUEsYUFBYSxHQUFHLENBQUMsRUFBakIsQ0FBaUIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxVQUFTLElBQVU7Z0JBQ3BFLEVBQUUsQ0FBQyxDQUFDLHNCQUFjLENBQUM7b0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDeEUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekIsRUFBRSxDQUFDLENBQUMsc0JBQWMsQ0FBQztvQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFDbkUsQ0FBQyxDQUNKLENBQUM7UUFDTixDQUFDLENBQUNELENBQ0xBLENBQUNBO0lBQ05BLENBQUNBO0lBRURSOztPQUVHQTtJQUNIQSxvQ0FBS0EsR0FBTEEsVUFBTUEsQ0FBU0EsRUFBRUEsU0FBcUNBO1FBQ2xEVSxJQUFJQSxLQUFLQSxHQUFHQSxJQUFJQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUN6QkEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUE7WUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsU0FBU0EsQ0FBQ0E7UUFDN0NBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBO0lBRWhDQSxDQUFDQTtJQUVEVjs7O09BR0dBO0lBQ0hBLG1DQUFJQSxHQUFKQSxVQUFLQSxXQUF5Q0E7UUFDMUNXLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLFFBQVFBLElBQUtBLE9BQUFBLFFBQVFBLENBQUNBLFNBQVNBLENBQUNBLFdBQVdBLEVBQUVBLENBQUNBLEVBQWpDQSxDQUFpQ0EsQ0FBQ0EsQ0FBQ0E7SUFDeEVBLENBQUNBO0lBRURYLHFDQUFNQSxHQUFOQSxVQUFPQSxhQUEyQ0E7UUFDOUNZLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQUNBLFFBQVFBLElBQUtBLE9BQUFBLFFBQVFBLENBQUNBLEdBQUdBLENBQUNBLGFBQWFBLEVBQUVBLENBQUNBLEVBQTdCQSxDQUE2QkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDL0VBLENBQUNBO0lBR0RaLHNDQUFPQSxHQUFQQSxVQUNJQSxNQUEyQ0EsRUFDM0NBLGFBQXlEQTtRQUN6RGEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxDQUFDQTtRQUN6Q0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FDVkEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FDVEEsTUFBTUEsRUFDTkE7WUFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7Z0JBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FBQ0E7WUFDMUNBLElBQUlBLE1BQU1BLEdBQUdBLGFBQWFBLEVBQUVBLENBQUNBO1lBQzdCQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFVQSxFQUFFQSxNQUFjQTtnQkFDOUJBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO29CQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSwwQkFBMEJBLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO2dCQUMzREEsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQUEsQ0FBQ0Esb0JBQW9CQTtnQkFDekNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUdBLDJEQUEyREE7WUFDOUVBLENBQUNBLENBQUFBO1FBQ0xBLENBQUNBLENBQ0pBLENBQUNBLE1BQU1BLENBQ1hBLENBQUNBO0lBQ1ZBLENBQUNBO0lBRURiLHNDQUFPQSxHQUFQQSxVQUNJQSxNQUEyQ0EsRUFDM0NBLE1BQTJDQSxFQUMzQ0EsYUFBeUVBO1FBQ3pFYyxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtZQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxnQkFBZ0JBLENBQUNBLENBQUNBO1FBQ3pDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUNWQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUNUQSxNQUFNQSxFQUNOQSxNQUFNQSxFQUNOQTtZQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxDQUFDQTtZQUMxQ0EsSUFBSUEsTUFBTUEsR0FBR0EsYUFBYUEsRUFBRUEsQ0FBQ0E7WUFDN0JBLE1BQU1BLENBQUNBLFVBQUNBLElBQVVBLEVBQUVBLE1BQWNBLEVBQUVBLE1BQWNBO2dCQUM5Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7b0JBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLDBCQUEwQkEsRUFBRUEsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ25FQSxNQUFNQSxDQUFDQSxJQUFJQSxFQUFFQSxNQUFNQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFBQSxDQUFDQSxvQkFBb0JBO2dCQUNqREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBR0EsMkRBQTJEQTtZQUM5RUEsQ0FBQ0EsQ0FBQUE7UUFDTEEsQ0FBQ0EsQ0FDSkEsQ0FBQ0EsTUFBTUEsQ0FDWEEsQ0FBQ0E7SUFDVkEsQ0FBQ0E7SUFFRGQsc0NBQU9BLEdBQVBBLFVBQ0lBLE1BQTJDQSxFQUMzQ0EsTUFBMkNBLEVBQzNDQSxNQUEyQ0EsRUFDM0NBLGFBQXlGQTtRQUN6RmUsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FDVkEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FDVEEsTUFBTUEsRUFDTkEsTUFBTUEsRUFDTkEsTUFBTUEsRUFDTkE7WUFDSUEsSUFBSUEsTUFBTUEsR0FBR0EsYUFBYUEsRUFBRUEsQ0FBQ0E7WUFDN0JBLE1BQU1BLENBQUNBLFVBQUNBLElBQVVBLEVBQUVBLE1BQWNBLEVBQUVBLE1BQWNBLEVBQUVBLE1BQWNBO2dCQUM5REEsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsTUFBTUEsRUFBRUEsTUFBTUEsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQUEsQ0FBQ0Esb0JBQW9CQTtnQkFDekRBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLENBQUdBLDJEQUEyREE7WUFDOUVBLENBQUNBLENBQUFBO1FBQ0xBLENBQUNBLENBQ0pBLENBQUNBLE1BQU1BLENBQ1hBLENBQUNBO0lBQ1ZBLENBQUNBO0lBRURmLGlDQUFFQSxHQUFGQSxVQUFHQSxTQUEyQkEsRUFBRUEsU0FBcUNBO1FBQ2pFZ0IsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBYUEsQ0FBQ0EsSUFBSUEsbUJBQW1CQSxDQUFDQSxTQUFTQSxFQUFFQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQTtJQUNyRkEsQ0FBQ0E7SUFDTGhCLDJCQUFDQTtBQUFEQSxDQXZZQSxBQXVZQ0EsRUF2WWdFLHFCQUFxQixFQXVZckY7QUF2WVksNEJBQW9CLHVCQXVZaEMsQ0FBQTtBQUdEOztHQUVHO0FBQ0gsOEhBQThIO0FBQzlILGlCQUF5SCxDQUFJLEVBQUUsQ0FBSTtJQUMvSGlCLE1BQU1BLENBQUlBLENBQUNBLENBQUNBLE1BQU1BLENBQ2RBLFVBQUFBLFFBQVFBLElBQUlBLE9BQUFBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLEVBQTVCQSxDQUE0QkEsQ0FDM0NBLENBQUFBO0FBQ0xBLENBQUNBO0FBSmUsZUFBTyxVQUl0QixDQUFBO0FBR0Q7SUFDSUMsNkJBQW1CQSxTQUEyQkEsRUFBU0EsTUFBa0NBO1FBQXRFQyxjQUFTQSxHQUFUQSxTQUFTQSxDQUFrQkE7UUFBU0EsV0FBTUEsR0FBTkEsTUFBTUEsQ0FBNEJBO0lBQUVBLENBQUNBO0lBQ2hHRCwwQkFBQ0E7QUFBREEsQ0FGQSxBQUVDQSxJQUFBO0FBRlksMkJBQW1CLHNCQUUvQixDQUFBO0FBQUEsQ0FBQztBQUdGOzs7Ozs7O0dBT0c7QUFDSDtJQUNJRSxZQUNXQSxVQUF1Q0EsRUFDdkNBLFVBQWtCQTtRQURsQkMsZUFBVUEsR0FBVkEsVUFBVUEsQ0FBNkJBO1FBQ3ZDQSxlQUFVQSxHQUFWQSxVQUFVQSxDQUFRQTtJQUM3QkEsQ0FBQ0E7SUFFREQsaUJBQUlBLEdBQUpBLFVBQUtBLE1BQXdCQSxFQUFFQSxNQUFrQ0E7UUFDN0RFLEtBQUtBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLElBQUlBLFNBQVNBLElBQUlBLE1BQU1BLElBQUlBLFNBQVNBLENBQUNBLENBQUFBO1FBQ3hEQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxtQkFBbUJBLENBQU9BLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBO1FBQ3BFQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTtJQUNoQkEsQ0FBQ0E7SUFFREYsa0JBQUtBLEdBQUxBO1FBQ0lHLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO0lBQ3JFQSxDQUFDQTtJQUVESCxpQkFBSUEsR0FBSkEsVUFBS0EsU0FBcUNBO1FBQTFDSSxpQkFrRENBO1FBakRHQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFTQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxNQUFNQSxDQUN0REEsVUFBQ0EsUUFBNkJBO1lBQzFCQSxFQUFFQSxDQUFDQSxDQUFDQSxnQkFBUUEsQ0FBQ0E7Z0JBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO1lBQ3hDQSxJQUFJQSxVQUFVQSxHQUFHQSxJQUFJQSxFQUFFQSxDQUFDQSxPQUFPQSxFQUFRQSxDQUFDQTtZQUN4Q0EsSUFBSUEsTUFBTUEsR0FBR0EsSUFBSUEsRUFBRUEsQ0FBQ0EsT0FBT0EsRUFBUUEsQ0FBQ0E7WUFFcENBLElBQUlBLGFBQWFBLEdBQUdBLFNBQVNBLENBQUNBO1lBQzlCQSxJQUFJQSxrQkFBa0JBLEdBQUdBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO1lBRXhFQSw2Q0FBNkNBO1lBQzdDQSxJQUFJQSxlQUFlQSxHQUFHQSxLQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUNyQ0EsVUFBQ0EsSUFBK0JBO2dCQUM1QkEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQUE7WUFDaERBLENBQUNBLENBQ0pBLENBQUNBO1lBRUZBLElBQUlBLElBQUlBLEdBQUdBLFFBQVFBLENBQUNBLFNBQVNBLENBQ3pCQSxVQUFDQSxJQUFVQTtnQkFDUEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZ0JBQVFBLENBQUNBO29CQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO2dCQUMvQ0EsOEVBQThFQTtnQkFDOUVBLElBQUlBLGdCQUFnQkEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQzVCQSx5REFBeURBO2dCQUN6REEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsS0FBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsSUFBSUEsZ0JBQWdCQSxJQUFJQSxJQUFJQSxFQUFFQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQTtvQkFDMUVBLEVBQUVBLENBQUNBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUNqQ0EsZ0JBQWdCQSxHQUFHQSxLQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQTtvQkFDakRBLENBQUNBO2dCQUNMQSxDQUFDQTtnQkFDREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZ0JBQWdCQSxJQUFJQSxJQUFJQSxDQUFDQTtvQkFBQ0EsZ0JBQWdCQSxHQUFHQSxTQUFTQSxDQUFDQTtnQkFHM0RBLDJGQUEyRkE7Z0JBQzNGQSxFQUFFQSxDQUFDQSxDQUFDQSxnQkFBZ0JBLElBQUlBLGFBQWFBLENBQUNBLENBQUNBLENBQUNBO29CQUNwQ0EsZ0ZBQWdGQTtvQkFDaEZBLEVBQUVBLENBQUNBLENBQUNBLGdCQUFRQSxDQUFDQTt3QkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esc0JBQXNCQSxDQUFDQSxDQUFDQTtvQkFDbERBLEVBQUVBLENBQUNBLENBQUNBLGtCQUFrQkEsSUFBSUEsSUFBSUEsQ0FBQ0E7d0JBQUNBLGtCQUFrQkEsQ0FBQ0EsT0FBT0EsRUFBRUEsQ0FBQ0E7b0JBQzdEQSxrQkFBa0JBLEdBQUdBLGdCQUFnQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7b0JBQzNFQSxhQUFhQSxHQUFHQSxnQkFBZ0JBLENBQUNBO2dCQUNyQ0EsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUVSQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDeEJBLENBQUNBLEVBQ0RBLFVBQUFBLEdBQUdBLElBQUlBLE9BQUFBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLEVBQW5CQSxDQUFtQkEsRUFDMUJBLGNBQU1BLE9BQUFBLE1BQU1BLENBQUNBLFdBQVdBLEVBQUVBLEVBQXBCQSxDQUFvQkEsQ0FDN0JBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLFVBQUFBLENBQUNBLElBQUtBLEVBQUVBLENBQUNBLENBQUNBLGdCQUFRQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxDQUFDQSxDQUFBQSxDQUFBQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNuRkEsQ0FBQ0EsQ0FDSkEsQ0FBQ0EsQ0FBQUE7SUFDTkEsQ0FBQ0E7SUFDTEosU0FBQ0E7QUFBREEsQ0FuRUEsQUFtRUNBLElBQUE7QUFuRVksVUFBRSxLQW1FZCxDQUFBIiwiZmlsZSI6InNyYy9PYnNlcnZhYmxlVHJhbnNmb3JtZXIuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
