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
    ObservableTransformer.prototype.reduceValue = function (array, fn) {
        return this.create(this.combine(function () { return function (thisOut, array) {
            return array.reduce(fn, thisOut);
        }; }, array).attach);
    };
    // static inverse_reduce<V>(array_value: ObservableTransformer<In, V[]>): Rx.
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
    ObservableTransformer.prototype.mergeInput = function () {
        return this.combine(function () { return function (thisValue, arg1) { return { "in": arg1, "out": thisValue }; }; }, new ObservableTransformer(function (_) { return _; }));
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
     * The return type is what you supply as downstream, allowing you to splice in a custom API fluently
     *
     * ```Ax.move(...).pipe(myOT_API());```
     */
    ChainableTransformer.prototype.pipe = function (downstream) {
        var self = this;
        return downstream.create(function (upstream) { return downstream.attach(self.attach(upstream)); });
    };
    /**
     * Pipes an array of transformers together in succession.
     */
    ChainableTransformer.prototype.pipeAll = function (downstreams) {
        var self = this;
        return this.create(function (upstream) {
            return downstreams.reduce(function (upstream, transformer) { return transformer.attach(upstream); }, self.attach(upstream));
        });
    };
    /*
    reduce<V>(
        array: ObservableTransformer<Tick, V[]>,
        fn: (previous: this, out: ObservableTransformer<Tick, V>, index?: number) => this
        ): this {
        var acc = this;
        
        var newV = (index: number)
        
        // In -> Out forall i, if(V[i]) inner
        
        // Using the fn, you are able to chain several ObservableTransformers calls to 'this'
        // Each sub chain is pushed and popped from the call chain according to the number of V elements
        // V becomes a time varying parameter
        //
        //          <----------v[n] --------------->
        //
        // this -> join0 -> join1 -> join2  ... newJoinN()
        //           |        |        |           |
        //           V        V        V           V
        //         view0 -> view1 -> view2      fn(join2, viewN, n)    -> out
        //
        // each join observes the array elements, do decide how to manage the view.
        //   if there is an element present at the join's index, the view is notified of a value
        //   if there is no longer an element present, the current view subscription completes, the join is popped
        //   if there in a new element, a new join must be created, so fn is called, a join is pushed
        
        // when a join is pushed or popped, the downstream result of the join chain is reconfigured
        
        // ObservableTransformer<In, V[]> is converted to n views of ObservableTransformer<In, V>[]
        
        return this.create(
            (upstream: Rx.Observable<Tick>) => {
                // downstream collects results, its logical position in the chain changes
                var downstream = new Rx.Subject<Tick>();
                var values: Rx.Observable<V[]> = array.attach(upstream);
                var joins: this [];
                var viewValues: Rx.Subject<V>[];
                var joinOuts: Rx.Observable<V>[];
                
                var endSubscription: Rx.IDisposable;
                var prevLength = 0;
                
                values.subscribe(
                    (arrayValues: V[]) => {
                        var i: number;
                        
                        for (var i = 0; i < arrayValues.length; i++) {
                            if ( i >= prevLength) {
                                // there are more array values than previously,
                                // so we lazily create new views and joins for them
                                var viewValue = new Rx.Subject<V>();
                                viewValues.push(viewValue);
                                
                                var view = new ObservableTransformer<In, V>(upstream => viewValue)
                                var join = fn(joins[i-1], view, i);
                                joins.push(join);
                                
                                // the new join becomes the value of downstream
                                var joinOut = join.attach(joinOuts[i - 1]);
                                joinOuts.push(joinOut)
                                
                                if (endSubscription) endSubscription.dispose();
                                endSubscription = joinOut.subscribe(downstream);
                            }
                            
                            // in all cases the value is pushed down the view
                            viewValues[i].onNext(arrayValues[i]);
                        }
                            
                           
                    },
                    err => downstream.onError(err),
                    () => downstream.onCompleted()
                )
                
                
                return downstream;
            }
        )
            
        return this.create(this.combine(
            () => (thisOut: Out, array: V[]) =>
                array.reduce(fn, thisOut)
            ,
            array
        ).attach);
    } */
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
        return this.playAll(Parameter.constant(animation));
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
     * Plays all the inner animations, which are generated by a time varying paramater.
     */
    ChainableTransformer.prototype.playAll = function (animations) {
        var self = this;
        return this.create(function (upstream) {
            var root = new Rx.Subject();
            // apply self first then connect to the root
            self.attach(upstream.map(function (tick) {
                if (exports.DEBUG)
                    console.log("playAll: upstream tick@", tick.clock);
                return tick.save();
            })).subscribe(root);
            // listen to animation parameter, and attach any inner animations to root
            animations.mergeInput().attach(root).subscribe(function (animation_tick) {
                if (exports.DEBUG)
                    console.log("playAll: build inner");
                var innerRoot = new Rx.Subject();
                root.subscribe(innerRoot);
                animation_tick.out.attach(innerRoot.map(function (tick) {
                    if (exports.DEBUG)
                        console.log("playAll: innner tick@", tick.clock);
                    return tick.restore().save();
                })).subscribe();
                innerRoot.onNext(animation_tick.in);
            }, function (err) { return root.onError(err); }, // pass errors downstream
            function () { if (exports.DEBUG)
                console.log("playAll over"); } // doesn't affect anything when children complete
             // doesn't affect anything when children complete
            );
            return root.map(function (tick) {
                if (exports.DEBUG)
                    console.log("playAll: downstream tick@", tick.clock);
                return tick.restore();
            });
        });
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
        var _this = this;
        // combine the params with an empty instance
        var combineParams = new ObservableTransformer(function (_) { return _; }).combine(wrapEffectToReturnTick(effectBuilder), param1, param2, param3, param4, param5, param6, param7, param8);
        // we want the tick output of the previous transform to be applied first (.pipe)
        // then apply that output to all of the params and the combiner function
        // and we want it with 'this' API, (.create)        
        return this.create(function (upstream) { return combineParams.attach(_this.attach(upstream)); });
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9PYnNlcnZhYmxlVHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOlsiQmFzZVRpY2siLCJCYXNlVGljay5jb25zdHJ1Y3RvciIsIkJhc2VUaWNrLmNvcHkiLCJCYXNlVGljay5zYXZlIiwiQmFzZVRpY2sucmVzdG9yZSIsIkJhc2VUaWNrLnNrZXciLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuY29uc3RydWN0b3IiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuY3JlYXRlIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLnRha2UiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIubWFwT2JzZXJ2YWJsZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5tYXBWYWx1ZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5yZWR1Y2VWYWx1ZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb21iaW5lTWFueSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb21iaW5lIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLm1lcmdlSW5wdXQiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuaW5pdCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuY29uc3RydWN0b3IiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5jcmVhdGUiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5waXBlIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIucGlwZUFsbCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLnRoZW4iLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5sb29wIiwiYXR0YWNoTG9vcCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmVtaXQiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5wYXJhbGxlbCIsImRlY3JlbWVudEFjdGl2ZSIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLnBsYXlBbGwiLCJDaGFpbmFibGVUcmFuc2Zvcm1lci5jbG9uZSIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmFmZmVjdCIsIkNoYWluYWJsZVRyYW5zZm9ybWVyLmlmIiwiQ2hhaW5hYmxlVHJhbnNmb3JtZXIuc2tld1QiLCJ3cmFwRWZmZWN0VG9SZXR1cm5UaWNrIiwiQ29uZGl0aW9uQWN0aW9uUGFpciIsIkNvbmRpdGlvbkFjdGlvblBhaXIuY29uc3RydWN0b3IiLCJJZiIsIklmLmNvbnN0cnVjdG9yIiwiSWYuZWxpZiIsIklmLmVuZGlmIiwiSWYuZWxzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFDQSxJQUFZLEVBQUUsV0FBTSxJQUNwQixDQUFDLENBRHVCO0FBQ3hCLElBQVksS0FBSyxXQUFNLFNBQ3ZCLENBQUMsQ0FEK0I7QUFDaEMsSUFBWSxHQUFHLFdBQU0sT0FDckIsQ0FBQyxDQUQyQjtBQUM1QixJQUFZLFNBQVMsV0FBTSxhQUMzQixDQUFDLENBRHVDO0FBQ3hDLGlCQUFjLFNBRWQsQ0FBQyxFQUZzQjtBQUVaLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLGdCQUFRLEdBQUcsS0FBSyxDQUFDO0FBQ2pCLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLHNCQUFjLEdBQUcsS0FBSyxDQUFDO0FBQ3ZCLG9CQUFZLEdBQUcsS0FBSyxDQUFDO0FBQ3JCLGFBQUssR0FBRyxLQUFLLENBQUM7QUFFekI7Ozs7O0dBS0c7QUFDSDtJQUNJQSxrQkFBb0JBLEtBQWFBLEVBQVNBLEVBQVVBLEVBQVNBLFFBQW1CQTtRQUE1REMsVUFBS0EsR0FBTEEsS0FBS0EsQ0FBUUE7UUFBU0EsT0FBRUEsR0FBRkEsRUFBRUEsQ0FBUUE7UUFBU0EsYUFBUUEsR0FBUkEsUUFBUUEsQ0FBV0E7SUFDaEZBLENBQUNBO0lBQ0REOztPQUVHQTtJQUNIQSx1QkFBSUEsR0FBSkEsY0FBY0UsTUFBTUEsQ0FBUUEsSUFBSUEsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsRUFBRUEsSUFBSUEsQ0FBQ0EsRUFBRUEsRUFBRUEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FBQ0Es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SUEsRUFBRUEsZ0ZBQWdGQSxDQUFDQSxDQUFBQTtZQUN2SEEsQ0FBQ0EsRUFDREEsVUFBQUEsR0FBR0EsSUFBSUEsT0FBQUEsVUFBVUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBdkJBLENBQXVCQSxFQUM5QkEsY0FBTUEsT0FBQUEsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsRUFBeEJBLENBQXdCQSxDQUNqQ0EsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQUEsQ0FBQ0EsSUFBS0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZ0JBQVFBLENBQUNBO2dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUFBLENBQUFBLENBQUNBLENBQUNBLENBQUNBO1FBQ25GQSxDQUFDQSxDQUNKQSxDQUFDQSxDQUFBQTtJQUNOQSxDQUFDQTtJQUNMSixTQUFDQTtBQUFEQSxDQTlHQSxBQThHQ0EsSUFBQTtBQTlHWSxVQUFFLEtBOEdkLENBQUEiLCJmaWxlIjoic3JjL09ic2VydmFibGVUcmFuc2Zvcm1lci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
