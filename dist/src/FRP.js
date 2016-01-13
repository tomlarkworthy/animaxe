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
var SignalFn = (function () {
    function SignalFn(attach) {
        this.attach = attach;
    }
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    SignalFn.prototype.create = function (attach) {
        return new SignalFn(attach);
    };
    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    SignalFn.prototype.take = function (frames) {
        var self = this;
        if (exports.DEBUG)
            console.log("take: build");
        return this.create(function (upstream) { return self.attach(upstream).take(frames); });
    };
    /**
     * map the stream of values to a new parameter
     */
    SignalFn.prototype.mapObservable = function (fn) {
        var self = this;
        return new SignalFn(function (upstream) { return fn(self.attach(upstream)); });
    };
    /**
     * map the value of 'this' to a new parameter
     */
    SignalFn.prototype.mapValue = function (fn) {
        return this.mapObservable(function (upstream) { return upstream.map(fn); });
    };
    SignalFn.prototype.reduceValue = function (array, fn) {
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
    SignalFn.prototype.combineMany = function (combinerBuilder) {
        var _this = this;
        var others = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            others[_i - 1] = arguments[_i];
        }
        return new SignalFn(function (upstream) {
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
    SignalFn.prototype.combine = function (combinerBuilder, other1, other2, other3, other4, other5, other6, other7, other8) {
        return this.combineMany(combinerBuilder, other1, other2, other3, other4, other5, other6, other7, other8);
    };
    SignalFn.prototype.mergeInput = function () {
        return this.combine(function () { return function (thisValue, arg1) { return { "in": arg1, "out": thisValue }; }; }, new SignalFn(function (_) { return _; }));
    };
    SignalFn.prototype.init = function () { throw new Error("depricated: remove this"); };
    return SignalFn;
})();
exports.SignalFn = SignalFn;
/**
 * A specialization of a signal where In is same type as Out
 */
var SimpleSignalFn = (function (_super) {
    __extends(SimpleSignalFn, _super);
    function SimpleSignalFn(attach) {
        _super.call(this, attach);
    }
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    SimpleSignalFn.prototype.create = function (attach) {
        if (attach === void 0) { attach = function (nop) { return nop; }; }
        return new SimpleSignalFn(attach);
    };
    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     * The return type is what you supply as downstream, allowing you to splice in a custom API fluently
     *
     * ```Ax.move(...).pipe(myOT_API());```
     */
    SimpleSignalFn.prototype.pipe = function (downstream) {
        var self = this;
        return downstream.create(function (upstream) { return downstream.attach(self.attach(upstream)); });
    };
    /**
     * Pipes an array of transformers together in succession.
     */
    SimpleSignalFn.prototype.pipeAll = function (downstreams) {
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
    SimpleSignalFn.prototype.then = function (follower) {
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
    SimpleSignalFn.prototype.loop = function (animation) {
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
    SimpleSignalFn.prototype.emit = function (animation) {
        return this.playAll(Parameter.constant(animation));
    };
    /**
     * Plays all the inner animations at the same time. Parallel completes when all inner animations are over.
     *
     * The canvas states are restored before each fork, so styling and transforms of different child animations do not
     * interact (although obsviously the pixel buffer is affected by each animation)
     */
    SimpleSignalFn.prototype.parallel = function (animations) {
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
    SimpleSignalFn.prototype.playAll = function (animations) {
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
    SimpleSignalFn.prototype.clone = function (n, animation) {
        var array = new Array(n);
        for (var i = 0; i < n; i++)
            array[i] = animation;
        return this.parallel(array);
    };
    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * Apply an effect to occur after 'this'.
     */
    SimpleSignalFn.prototype.affect = function (effectBuilder, param1, param2, param3, param4, param5, param6, param7, param8) {
        var _this = this;
        // combine the params with an empty instance
        var combineParams = new SignalFn(function (_) { return _; }).combine(wrapEffectToReturnTick(effectBuilder), param1, param2, param3, param4, param5, param6, param7, param8);
        // we want the tick output of the previous transform to be applied first (.pipe)
        // then apply that output to all of the params and the combiner function
        // and we want it with 'this' API, (.create)        
        return this.create(function (upstream) { return combineParams.attach(_this.attach(upstream)); });
    };
    SimpleSignalFn.prototype.if = function (condition, animation) {
        return new If([new ConditionActionPair(condition, animation)], this);
    };
    SimpleSignalFn.prototype.skewT = function (displacement) {
        return this.create(this.combine(function () { return function (tick, displacement) { return tick.skew(displacement); }; }, Parameter.from(displacement)).attach);
    };
    return SimpleSignalFn;
})(SignalFn);
exports.SimpleSignalFn = SimpleSignalFn;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9mcnAudHMiXSwibmFtZXMiOlsiQmFzZVRpY2siLCJCYXNlVGljay5jb25zdHJ1Y3RvciIsIkJhc2VUaWNrLmNvcHkiLCJCYXNlVGljay5zYXZlIiwiQmFzZVRpY2sucmVzdG9yZSIsIkJhc2VUaWNrLnNrZXciLCJTaWduYWxGbiIsIlNpZ25hbEZuLmNvbnN0cnVjdG9yIiwiU2lnbmFsRm4uY3JlYXRlIiwiU2lnbmFsRm4udGFrZSIsIlNpZ25hbEZuLm1hcE9ic2VydmFibGUiLCJTaWduYWxGbi5tYXBWYWx1ZSIsIlNpZ25hbEZuLnJlZHVjZVZhbHVlIiwiU2lnbmFsRm4uY29tYmluZU1hbnkiLCJTaWduYWxGbi5jb21iaW5lIiwiU2lnbmFsRm4ubWVyZ2VJbnB1dCIsIlNpZ25hbEZuLmluaXQiLCJTaW1wbGVTaWduYWxGbiIsIlNpbXBsZVNpZ25hbEZuLmNvbnN0cnVjdG9yIiwiU2ltcGxlU2lnbmFsRm4uY3JlYXRlIiwiU2ltcGxlU2lnbmFsRm4ucGlwZSIsIlNpbXBsZVNpZ25hbEZuLnBpcGVBbGwiLCJTaW1wbGVTaWduYWxGbi50aGVuIiwiU2ltcGxlU2lnbmFsRm4ubG9vcCIsImF0dGFjaExvb3AiLCJTaW1wbGVTaWduYWxGbi5lbWl0IiwiU2ltcGxlU2lnbmFsRm4ucGFyYWxsZWwiLCJkZWNyZW1lbnRBY3RpdmUiLCJTaW1wbGVTaWduYWxGbi5wbGF5QWxsIiwiU2ltcGxlU2lnbmFsRm4uY2xvbmUiLCJTaW1wbGVTaWduYWxGbi5hZmZlY3QiLCJTaW1wbGVTaWduYWxGbi5pZiIsIlNpbXBsZVNpZ25hbEZuLnNrZXdUIiwid3JhcEVmZmVjdFRvUmV0dXJuVGljayIsIkNvbmRpdGlvbkFjdGlvblBhaXIiLCJDb25kaXRpb25BY3Rpb25QYWlyLmNvbnN0cnVjdG9yIiwiSWYiLCJJZi5jb25zdHJ1Y3RvciIsIklmLmVsaWYiLCJJZi5lbmRpZiIsIklmLmVsc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQ0EsSUFBWSxFQUFFLFdBQU0sSUFDcEIs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O1lBQzVEQSxJQUFJQSxhQUFhQSxHQUF1QkEsS0FBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FDdkRBLFVBQUNBLElBQStCQSxFQUFFQSxLQUFhQSxJQUFLQSxPQUFBQSxXQUFXQSxDQUFDQSxLQUFLQSxFQUFFQSxJQUFJQSxDQUFDQSxFQUF4QkEsQ0FBd0JBLENBQy9FQSxDQUFDQTtZQUVGQSxRQUFRQSxDQUFDQSxTQUFTQSxDQUNkQSxVQUFDQSxJQUFVQTtnQkFDUEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZ0JBQVFBLENBQUNBO29CQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO2dCQUMvQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsSUFBSUEsU0FBU0EsQ0FBQ0E7b0JBQUNBLE1BQU1BLENBQUNBO2dCQUUvQkEsVUFBVUEsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ2xCQSxXQUFXQSxHQUFHQSxLQUFLQSxDQUFDQTtnQkFFcEJBLGFBQWFBLENBQUNBLEtBQUtBLENBQ2ZBLFVBQUNBLFlBQThCQTtvQkFDM0JBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO29CQUNoQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsbUNBQW1DQTtnQkFDNURBLENBQUNBLENBQ0pBLENBQUFBO2dCQUVEQSxLQUFLQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxJQUFJQSxJQUFJQSxFQUFFQSxnRkFBZ0ZBLENBQUNBLENBQUFBO1lBQ3ZIQSxDQUFDQSxFQUNEQSxVQUFBQSxHQUFHQSxJQUFJQSxPQUFBQSxVQUFVQSxDQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUF2QkEsQ0FBdUJBLEVBQzlCQSxjQUFNQSxPQUFBQSxVQUFVQSxDQUFDQSxXQUFXQSxFQUFFQSxFQUF4QkEsQ0FBd0JBLENBQ2pDQSxDQUFDQTtZQUVGQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFBQSxDQUFDQSxJQUFLQSxFQUFFQSxDQUFDQSxDQUFDQSxnQkFBUUEsQ0FBQ0E7Z0JBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHFCQUFxQkEsQ0FBQ0EsQ0FBQUEsQ0FBQUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDbkZBLENBQUNBLENBQ0pBLENBQUNBLENBQUFBO0lBQ05BLENBQUNBO0lBQ0xKLFNBQUNBO0FBQURBLENBOUdBLEFBOEdDQSxJQUFBO0FBOUdZLFVBQUUsS0E4R2QsQ0FBQSIsImZpbGUiOiJzcmMvZnJwLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
