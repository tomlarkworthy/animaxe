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
/**
 * The Tick runs through all the features of Animaxe, this base tick provides a clock signal to the transformers.
 * The CanvasTick subclass adds exposure to the canvas and event APIs. Ideally class would be immutable, but as we are wrapping the
 * canvas API which is mutable, we only have an immutable-like interface. You must *always* balance the save() and restore()
 * calls otherwise the state gets out of wack. However, users should not be mutating this anyway, you should simply be consuming the information.
 */
var BaseTick = (function () {
    function BaseTick(clock, dt, previous) {
        this.clock = clock;
        this.dt = dt;
        this.previous = previous;
    }
    /**
     * subclasses must implement this for their specialised type subclass
     */
    BaseTick.prototype.copy = function () { return new BaseTick(this.clock, this.dt, this.previous); };
    /**
     * saves the state and returns a new instance, use restore on the returned instance to get back to the previous state
     */
    BaseTick.prototype.save = function () {
        var cp = this.copy();
        cp.previous = this;
        return cp;
    };
    BaseTick.prototype.restore = function () {
        types.assert(this.previous != null);
        return this.previous;
    };
    /**
     * Mutates the clock by dt (use save and restore if you want to retreive it)
     */
    BaseTick.prototype.skew = function (dt) {
        var cp = this.copy();
        cp.clock += dt;
        return cp;
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
            var args = others.reduce(function (acc, other) {
                if (other)
                    acc.push(other.attach(fork));
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
                animation.attach(attachPoint.map(function (tick) { return tick.restore().save(); })).subscribe(function (_) { }, decrementActive, decrementActive);
            });
            return prev.takeWhile(function () { return activeOT_APIs > 0; }).tapOnNext(function (tick) {
                if (exports.DEBUG_PARALLEL)
                    console.log("parallel: emitting, animations", tick);
                var savedTick = tick.save();
                attachPoint.onNext(savedTick);
                savedTick.restore();
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
        // combine the params with an empty instance
        var combineParams = new ObservableTransformer(function (_) { return _; }).combine(wrapEffectToReturnTick(effectBuilder), param1, param2, param3, param4, param5, param6, param7, param8);
        // we want the tick output of the previous transform to be applied first (.pipe)
        // then apply that output to all of the params and the combiner function
        // and we want it with 'this' API, (.create)        
        return this.create(this.pipe(combineParams).attach);
    };
    ChainableTransformer.prototype.if = function (condition, animation) {
        return new If([new ConditionActionPair(condition, animation)], this);
    };
    ChainableTransformer.prototype.skewT = function (displacement) {
        return this.create(this.combine(function () { return function (tick, displacement) { return tick.skew(displacement); }; }, Parameter.from(displacement)).attach);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9PYnNlcnZhYmxlVHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOlsiQmFzZVRpY2siLCJCYXNlVGljay5jb25zdHJ1Y3RvciIsIkJhc2VUaWNrLmNvcHkiLCJCYXNlVGljay5zYXZlIiwiQmFzZVRpY2sucmVzdG9yZSIsIkJhc2VUaWNrLnNrZXciLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuY29uc3RydWN0b3IiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuY3JlYXRlIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLnRha2UiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIubWFwT2JzZXJ2YWJsZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5tYXBWYWx1ZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb21iaW5lTWFueSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb21iaW5lIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmluaXQiLCJDaGFpbmFibGVUcmFuc2Zvcm1lciIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmNvbnN0cnVjdG9yIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuY3JlYXRlIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIucGlwZSIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLnRoZW4iLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5sb29wIiwiYXR0YWNoTG9vcCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmVtaXQiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5wYXJhbGxlbCIsImRlY3JlbWVudEFjdGl2ZSIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmNsb25lIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuYWZmZWN0IiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuaWYiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5za2V3VCIsIndyYXBFZmZlY3RUb1JldHVyblRpY2siLCJDb25kaXRpb25BY3Rpb25QYWlyIiwiQ29uZGl0aW9uQWN0aW9uUGFpci5jb25zdHJ1Y3RvciIsIklmIiwiSWYuY29uc3RydWN0b3IiLCJJZi5lbGlmIiwiSWYuZW5kaWYiLCJJZi5lbHNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUNBLElBQVksRUFBRSxXQUFNLElBQ3BCLENBQUMsQ0FEdUI7QUFDeEIsSUFBWSxLQUFLLFdBQU0sU0FDdkIsQ0FBQyxDQUQrQjtBQUNoQyxJQUFZLEdBQUcsV0FBTSxPQUNyQixDQUFDLENBRDJCO0FBQzVCLElBQVksU0FBUyxXQUFNLGFBQzNCLENBQUMsQ0FEdUM7QUFDeEMsaUJBQWMsU0FFZCxDQUFDLEVBRnNCO0FBRVosa0JBQVUsR0FBRyxLQUFLLENBQUM7QUFDbkIsa0JBQVUsR0FBRyxLQUFLLENBQUM7QUFDbkIsZ0JBQVEsR0FBRyxLQUFLLENBQUM7QUFDakIsa0JBQVUsR0FBRyxLQUFLLENBQUM7QUFDbkIsc0JBQWMsR0FBRyxLQUFLLENBQUM7QUFDdkIsb0JBQVksR0FBRyxLQUFLLENBQUM7QUFDckIsYUFBSyxHQUFHLEtBQUssQ0FBQztBQUV6Qjs7Ozs7R0FLRztBQUNIO0lBQ0lBLGtCQUFvQkEsS0FBYUEsRUFBU0EsRUFBVUEsRUFBU0EsUUFBbUJBO1FBQTVEQyxVQUFLQSxHQUFMQSxLQUFLQSxDQUFRQTtRQUFTQSxPQUFFQSxHQUFGQSxFQUFFQSxDQUFRQTtRQUFTQSxhQUFRQSxHQUFSQSxRQUFRQSxDQUFXQTtJQUNoRkEsQ0FBQ0E7SUFDREQ7O09BRUdBO0lBQ0hBLHVCQUFJQSxHQUFKQSxjQUFjRSxNQUFNQSxDQUFRQSxJQUFJQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxFQUFFQSxJQUFJQSxDQUFDQSxFQUFFQSxFQUFFQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFBQSxDQUFDQTtJQUM5RUY7O09BRUdBO0lBQ0hBLHVCQUFJQSxHQUFKQTtRQUNJRyxJQUFJQSxFQUFFQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUNyQkEsRUFBRUEsQ0FBQ0EsUUFBUUEsR0FBR0EsSUFB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LFdBQVdBLENBQUNBLENBQUNBLG1DQUFtQ0E7Z0JBQzVEQSxDQUFDQSxDQUNKQSxDQUFBQTtnQkFFREEsS0FBS0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsSUFBSUEsSUFBSUEsRUFBRUEsZ0ZBQWdGQSxDQUFDQSxDQUFBQTtZQUN2SEEsQ0FBQ0EsRUFDREEsVUFBQUEsR0FBR0EsSUFBSUEsT0FBQUEsVUFBVUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBdkJBLENBQXVCQSxFQUM5QkEsY0FBTUEsT0FBQUEsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsRUFBeEJBLENBQXdCQSxDQUNqQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQUEsQ0FBQ0EsSUFBS0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZ0JBQVFBLENBQUNBO2dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUFBLENBQUFBLENBQUNBLENBQUNBLENBQUNBO1FBQ25GQSxDQUFDQSxDQUNKQSxDQUFDQSxDQUFBQTtJQUNOQSxDQUFDQTtJQUNMSixTQUFDQTtBQUFEQSxDQTlHQSxBQThHQ0EsSUFBQTtBQTlHWSxVQUFFLEtBOEdkLENBQUEiLCJmaWxlIjoic3JjL09ic2VydmFibGVUcmFuc2Zvcm1lci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
