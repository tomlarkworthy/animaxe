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
    /**
     * combine the ouput of this into a downstream ObservableTransformer to create a new ObservableTransformer;
     */
    SignalFn.prototype.map = function (downstream) {
        var self = this;
        return new SignalFn(function (upstream) { return downstream.attach(self.attach(upstream)); });
    };
    SignalFn.prototype.reduceValue = function (array, fn) {
        return this.create(this.combine(function () { return function (thisOut, array) {
            return array.reduce(fn, thisOut);
        }; }, array).attach);
    };
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
                if (other !== undefined)
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
    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     *
     * This allows you to sequence animations temporally.
     * frame1OT_API().then(frame2OT_API).then(frame3OT_API)
     */
    SignalFn.prototype.then = function (follower) {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9mcnAudHMiXSwibmFtZXMiOlsiQmFzZVRpY2siLCJCYXNlVGljay5jb25zdHJ1Y3RvciIsIkJhc2VUaWNrLmNvcHkiLCJCYXNlVGljay5zYXZlIiwiQmFzZVRpY2sucmVzdG9yZSIsIkJhc2VUaWNrLnNrZXciLCJTaWduYWxGbiIsIlNpZ25hbEZuLmNvbnN0cnVjdG9yIiwiU2lnbmFsRm4uY3JlYXRlIiwiU2lnbmFsRm4udGFrZSIsIlNpZ25hbEZuLm1hcE9ic2VydmFibGUiLCJTaWduYWxGbi5tYXBWYWx1ZSIsIlNpZ25hbEZuLm1hcCIsIlNpZ25hbEZuLnJlZHVjZVZhbHVlIiwiU2lnbmFsRm4uY29tYmluZU1hbnkiLCJTaWduYWxGbi5jb21iaW5lIiwiU2lnbmFsRm4ubWVyZ2VJbnB1dCIsIlNpZ25hbEZuLnRoZW4iLCJTaWduYWxGbi5pbml0IiwiU2ltcGxlU2lnbmFsRm4iLCJTaW1wbGVTaWduYWxGbi5jb25zdHJ1Y3RvciIsIlNpbXBsZVNpZ25hbEZuLmNyZWF0ZSIsIlNpbXBsZVNpZ25hbEZuLnBpcGUiLCJTaW1wbGVTaWduYWxGbi5waXBlQWxsIiwiU2ltcGxlU2lnbmFsRm4ubG9vcCIsImF0dGFjaExvb3AiLCJTaW1wbGVTaWduYWxGbi5lbWl0IiwiU2ltcGxlU2lnbmFsRm4ucGFyYWxsZWwiLCJkZWNyZW1lbnRBY3RpdmUiLCJTaW1wbGVTaWduYWxGbi5wbGF5QWxsIiwiU2ltcGxlU2lnbmFsRm4uY2xvbmUiLCJTaW1wbGVTaWduYWxGbi5hZmZlY3QiLCJTaW1wbGVTaWduYWxGbi5pZiIsIlNpbXBsZVNpZ25hbEZuLnNrZXdUIiwid3JhcEVmZmVjdFRvUmV0dXJuVGljayIsIkNvbmRpdGlvbkFjdGlvblBhaXIiLCJDb25kaXRpb25BY3Rpb25QYWlyLmNvbnN0cnVjdG9yIiwiSWYiLCJJZi5jb25zdHJ1Y3RvciIsIklmLmVsaWYiLCJJZi5lbmRpZiIsIklmLmVsc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQ0EsSUFBWSxFQUFFLFdB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LEVBQUVBLGdGQUFnRkEsQ0FBQ0EsQ0FBQUE7WUFDdkhBLENBQUNBLEVBQ0RBLFVBQUFBLEdBQUdBLElBQUlBLE9BQUFBLFVBQVVBLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLEVBQXZCQSxDQUF1QkEsRUFDOUJBLGNBQU1BLE9BQUFBLFVBQVVBLENBQUNBLFdBQVdBLEVBQUVBLEVBQXhCQSxDQUF3QkEsQ0FDakNBLENBQUNBO1lBRUZBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLFVBQUFBLENBQUNBLElBQUtBLEVBQUVBLENBQUNBLENBQUNBLGdCQUFRQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxDQUFDQSxDQUFBQSxDQUFBQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNuRkEsQ0FBQ0EsQ0FDSkEsQ0FBQ0EsQ0FBQUE7SUFDTkEsQ0FBQ0E7SUFDTEosU0FBQ0E7QUFBREEsQ0E5R0EsQUE4R0NBLElBQUE7QUE5R1ksVUFBRSxLQThHZCxDQUFBIiwiZmlsZSI6InNyYy9mcnAuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
