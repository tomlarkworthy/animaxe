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
exports.DEBUG_LOOP = false;
exports.DEBUG_THEN = false;
exports.DEBUG_IF = false;
exports.DEBUG_EMIT = false;
exports.DEBUG_PARALLEL = false;
exports.DEBUG_EVENTS = false;
exports.DEBUG = false;
var BaseTick = (function () {
    function BaseTick(clock, dt) {
        this.clock = clock;
        this.dt = dt;
    }
    BaseTick.prototype.save = function () { };
    BaseTick.prototype.restore = function () { };
    BaseTick.prototype.skew = function (dt) {
        return new BaseTick(this.clock + dt, this.dt);
    };
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
     * combine with other transformers with a common type of input.
     * All are given the same input, and their simulataneous outputs are passed to a
     * combiner function, which compute the final output.
     */
    ObservableTransformer.prototype.combineMany = function (combinerBuilder) {
        var _this = this;
        var others = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            others[_i - 1] = arguments[_i];
        }
        return new ObservableTransformer(function (upstream) {
            // join upstream with parameter
            var fork = new Rx.Subject();
            upstream.subscribe(fork);
            // we link all concurrent OTs in the others array to the fork, skipping null or undefined values
            var args = others.reduce(function (acc, val) {
                if (val)
                    acc.push(val.attach(fork));
                return acc;
            }, []);
            args.unshift(_this.attach(fork)); // put output of self as first param in combiner
            args.unshift(combinerBuilder()); // build effect handler for zip
            return zip.zip.apply(null, args);
        });
    };
    /**
     * Combine with another transformer with the same type of input.
     * Both are given the same input, and their simulataneous outputs are passed to a
     * combiner function, which compute the final output.
     */
    ObservableTransformer.prototype.combine = function (combinerBuilder, other1, other2, other3, other4, other5, other6, other7, other8) {
        return this.combineMany(combinerBuilder, other1, other2, other3, other4, other5, other6, other7, other8);
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
        var self = this;
        return downstream.create(function (upstream) { return downstream.attach(self.attach(upstream)); });
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
                animation.attach(attachPoint.tapOnNext(function (tick) { return tick.save(); })).subscribe(function (tick) { return tick.restore(); }, decrementActive, decrementActive);
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
     * Apply an effect to occur after 'this'.
     */
    ChainableTransformer.prototype.affect = function (effectBuilder, param1, param2, param3, param4, param5, param6, param7, param8) {
        return this.create(this.combine(wrapEffectToReturnTick(effectBuilder), param1, param2, param3, param4, param5, param6, param7, param8).attach);
    };
    ChainableTransformer.prototype.if = function (condition, animation) {
        return new If([new ConditionActionPair(condition, animation)], this);
    };
    return ChainableTransformer;
})(ObservableTransformer);
exports.ChainableTransformer = ChainableTransformer;
/**
 * Convert an  side effect into a tick chainable
 */
function wrapEffectToReturnTick(effectBuilder) {
    return function () {
        var effect = effectBuilder();
        return function (tick) {
            var params = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                params[_i - 1] = arguments[_i];
            }
            params.unshift(tick);
            effect.apply(null, params);
            return tick;
        };
    };
}
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
 * Whenever the active clause changes, a NEW active animation is reinitialised.
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
        // the else is like a always true conditional with the otherwise action
        this.conditions.push(new ConditionActionPair(true, otherwise));
        return this.preceeding.pipe(this.preceeding.create(function (upstream) {
            if (exports.DEBUG_IF)
                console.log("If: attach");
            var downstream = new Rx.Subject();
            var activeTick = null; // current tick being processed
            var error = null; // global error
            var completed = false; // global completion flag
            var lastClauseFired = -1; // flag set when a condition or action fires or errors or completes
            var actionTaken = false; // flag set when a condition or action fires or errors or completes
            // error and completed handlers for conditions and actions
            // error/completed propogates to downstream and recorded
            var errorHandler = function (err) {
                actionTaken = true;
                error = true;
                downstream.onError(err);
            };
            var completedHandler = function () {
                completed = true;
                actionTaken = true;
                downstream.onCompleted();
            };
            // upstream -> cond1 ?-> action1 -> downstream
            //          -> cond2 ?-> action2 -> downstream
            var pairHandler = function (id, pair) {
                var action = pair.action;
                var preConditionAnchor = new Rx.Subject();
                var postConditionAnchor = new Rx.Subject();
                var currentActionSubscription = null;
                Parameter.from(pair.condition).attach(preConditionAnchor).subscribe(function (next) {
                    if (next) {
                        actionTaken = true;
                        if (lastClauseFired != id || currentActionSubscription == null) {
                            if (currentActionSubscription)
                                currentActionSubscription.dispose();
                            currentActionSubscription = action.attach(postConditionAnchor).subscribe(function (next) { return downstream.onNext(next); }, errorHandler, completedHandler);
                        }
                        lastClauseFired = id;
                        postConditionAnchor.onNext(activeTick);
                    }
                }, errorHandler, completedHandler);
                return preConditionAnchor;
            };
            // we initialise all the condition parameters
            // when a condition fires, it triggers the associated action
            var preConditions = _this.conditions.map(function (pair, index) { return pairHandler(index, pair); });
            upstream.subscribe(function (tick) {
                if (exports.DEBUG_IF)
                    console.log("If: upstream tick");
                if (error || completed)
                    return;
                activeTick = tick;
                actionTaken = false;
                preConditions.every(function (preCondition) {
                    preCondition.onNext(activeTick);
                    return !actionTaken; // continue until something happens
                });
                types.assert(actionTaken == true, "If: nothing happened in if/else block, the default action did not do anything?");
            }, function (err) { return downstream.onError(err); }, function () { return downstream.onCompleted(); });
            return downstream.tap(function (x) { if (exports.DEBUG_IF)
                console.log("If: downstream tick"); });
        }));
    };
    return If;
})();
exports.If = If;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9PYnNlcnZhYmxlVHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOlsiQmFzZVRpY2siLCJCYXNlVGljay5jb25zdHJ1Y3RvciIsIkJhc2VUaWNrLnNhdmUiLCJCYXNlVGljay5yZXN0b3JlIiwiQmFzZVRpY2suc2tldyIsIk9ic2VydmFibGVUcmFuc2Zvcm1lciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jcmVhdGUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIudGFrZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5tYXBPYnNlcnZhYmxlIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLm1hcFZhbHVlIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmVNYW55IiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbWJpbmUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuaW5pdCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuY29uc3RydWN0b3IiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5jcmVhdGUiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5waXBlIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIudGhlbiIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmxvb3AiLCJhdHRhY2hMb29wIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuZW1pdCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLnBhcmFsbGVsIiwiZGVjcmVtZW50QWN0aXZlIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuY2xvbmUiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5hZmZlY3QiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5pZiIsIndyYXBFZmZlY3RUb1JldHVyblRpY2siLCJDb25kaXRpb25BY3Rpb25QYWlyIiwiQ29uZGl0aW9uQWN0aW9uUGFpci5jb25zdHJ1Y3RvciIsIklmIiwiSWYuY29uc3RydWN0b3IiLCJJZi5lbGlmIiwi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QUFDLENBQUM7b0JBQzNDLENBQUM7Z0JBQ0wsQ0FBQyxFQUNELFlBQVksRUFBRSxnQkFBZ0IsQ0FDakMsQ0FBQTtnQkFFRCxNQUFNLENBQUMsa0JBQWtCLENBQUM7WUFDOUIsQ0FBQyxDQUFBQTtZQUVEQSw2Q0FBNkNBO1lBQzdDQSw0REFBNERBO1lBQzVEQSxJQUFJQSxhQUFhQSxHQUF1QkEsS0FBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FDdkRBLFVBQUNBLElBQStCQSxFQUFFQSxLQUFhQSxJQUFLQSxPQUFBQSxXQUFXQSxDQUFDQSxLQUFLQSxFQUFFQSxJQUFJQSxDQUFDQSxFQUF4QkEsQ0FBd0JBLENBQy9FQSxDQUFDQTtZQUVGQSxRQUFRQSxDQUFDQSxTQUFTQSxDQUNkQSxVQUFDQSxJQUFVQTtnQkFDUEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZ0JBQVFBLENBQUNBO29CQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO2dCQUMvQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsSUFBSUEsU0FBU0EsQ0FBQ0E7b0JBQUNBLE1BQU1BLENBQUNBO2dCQUUvQkEsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ2xCQSxXQUFXQSxHQUFHQSxLQUFLQSxDQUFDQTtnQkFFcEJBLGFBQWFBLENBQUNBLEtBQUtBLENBQ2ZBLFVBQUNBLFlBQThCQTtvQkFDM0JBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO29CQUNoQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsbUNBQW1DQTtnQkFDNURBLENBQUNBLENBQ0pBLENBQUFBO2dCQUVEQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxJQUFJQSxJQUFJQSxFQUFFQSxnRkFBZ0ZBLENBQUNBLENBQUFBO1lBQ3ZIQSxDQUFDQSxFQUNEQSxVQUFBQSxHQUFHQSxJQUFJQSxPQUFBQSxVQUFVQSxDQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUF2QkEsQ0FBdUJBLEVBQzlCQSxjQUFNQSxPQUFBQSxVQUFVQSxDQUFDQSxXQUFXQSxFQUFFQSxFQUF4QkEsQ0FBd0JBLENBQ2pDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFBQSxDQUFDQSxJQUFLQSxFQUFFQSxDQUFDQSxDQUFDQSxnQkFBUUEsQ0FBQ0E7Z0JBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHFCQUFxQkEsQ0FBQ0EsQ0FBQUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDbkZBLENBQUNBLENBQ0pBLENBQUNBLENBQUFBO0lBQ05BLENBQUNBO0lBQ0xKLFNBQUNBO0FBQURBLENBOUdBLEFBOEdDQSxJQUFBO0FBOUdZLFVBQUUsS0E4R2QsQ0FBQSIsImZpbGUiOiJzcmMvT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
