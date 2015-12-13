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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9PYnNlcnZhYmxlVHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOlsiQmFzZVRpY2siLCJCYXNlVGljay5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jcmVhdGUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIubWFwT2JzZXJ2YWJsZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5tYXBWYWx1ZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb21iaW5lMSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb21iaW5lMiIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb21iaW5lMyIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5tZXJnZTIiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIubWVyZ2UzIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLm1lcmdlNCIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5pbml0IiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5jb25zdHJ1Y3RvciIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmNyZWF0ZSIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLnBpcGUiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci50aGVuIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIubG9vcCIsImF0dGFjaExvb3AiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5lbWl0IiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIucGFyYWxsZWwiLCJkZWNyZW1lbnRBY3RpdmUiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5jbG9uZSIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLnRha2UiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5kcmF3IiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuYWZmZWN0IiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuYWZmZWN0MSIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmFmZmVjdDIiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5hZmZlY3QzIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuaWYiLCJjb21iaW5lIiwiQ29uZGl0aW9uQWN0aW9uUGFpciIsIkNvbmRpdGlvbkFjdGlvblBhaXIuY29uc3RydWN0b3IiLCJJZiIsIklmLmNvbnN0cnVjdG9yIiwiSWYuZWxpZiIsIklmLmVuZGlmIiwiSWYuZWxzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFDQSxJQUFZLEVBQUUsV0FBTSxJQUNwQixDQUFDLENBRHVCO0FBQ3hCLElBQVksS0FBSyxXQUFNLFNBQ3ZCLENBQUMsQ0FEK0I7QUFDaEMsSUFBWSxHQUFHLFdBQU0sT0FDckIsQ0FBQyxDQUQyQjtBQUM1QixJQUFZLFNBQVMsV0FBTSxhQUMzQixDQUFDLENBRHVDO0FBQ3hDLGlCQUFjLFNBRWQsQ0FBQyxFQUZzQjtBQUVaLGtCQUFVLEdBQUcsSUFBSSxDQUFDO0FBQ2xCLGtCQUFVLEdBQUcsSUFBSSxDQUFDO0FBQ2xCLGdCQUFRLEdBQUcsS0FBSyxDQUFDO0FBQ2pCLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLHNCQUFjLEdBQUcsS0FBSyxDQUFDO0FBQ3ZCLG9CQUFZLEdBQUcsS0FBSyxDQUFDO0FBQ3JCLGFBQUssR0FBRyxJQUFJLENBQUM7QUFFeEI7SUFDSUEsa0JBQ1dBLEtBQWFBLEVBQ2JBLEVBQVVBLEVBQ1ZBLEdBQTZCQTtRQUY3QkMsVUFBS0EsR0FBTEEsS0FBS0EsQ0FBUUE7UUFDYkEsT0FBRUEsR0FBRkEsRUFBRUEsQ0FBUUE7UUFDVkEsUUFBR0EsR0FBSEEsR0FBR0EsQ0FBMEJBO0lBRXhDQSxDQUFDQTtJQUNMRCxlQUFDQTtBQUFEQSxDQVBBLEFBT0NBLElBQUE7QUFQWSxnQkFBUSxXQU9wQixDQUFBO0FBRUQ7SUFDSUUsK0JBQW1CQSxNQUEyREE7UUFBM0RDLFdBQU1BLEdBQU5BLE1BQU1BLENBQXFEQTtJQUM5RUEsQ0FBQ0E7SUFFREQ7OztPQUdHQTtJQUNIQSxzQ0FBTUEsR0FBTkEs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SUEsT0FBQUEsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBbkJBLENBQW1CQSxFQUMxQkEsY0FBTUEsT0FBQUEsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsRUFBcEJBLENBQW9CQSxDQUM3QkEsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQUEsQ0FBQ0EsSUFBS0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZ0JBQVFBLENBQUNBO2dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUFBLENBQUFBLENBQUNBLENBQUNBLENBQUNBO1FBQ25GQSxDQUFDQSxDQUNKQSxDQUFDQSxDQUFBQTtJQUNOQSxDQUFDQTtJQUNMSixTQUFDQTtBQUFEQSxDQW5FQSxBQW1FQ0EsSUFBQTtBQW5FWSxVQUFFLEtBbUVkLENBQUEiLCJmaWxlIjoic3JjL09ic2VydmFibGVUcmFuc2Zvcm1lci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
