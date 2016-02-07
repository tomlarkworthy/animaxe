import * as Ax from "./animaxe"
import * as Rx from "rx"
import * as types from "./types"
import * as zip from "./zip"
import * as Parameter from "./Parameter"
export * from "./types"

export var DEBUG_LOOP = false;
export var DEBUG_THEN = false;
export var DEBUG_IF = false;
export var DEBUG_EMIT = false;
export var DEBUG_PARALLEL = false;
export var DEBUG_EVENTS = false;
export var DEBUG = false;

/**
 * The Tick runs through all the features of Animaxe, this base tick provides a clock signal to the transformers. 
 * The CanvasTick subclass adds exposure to the canvas and event APIs. Ideally class would be immutable, but as we are wrapping the
 * canvas API which is mutable, we only have an immutable-like interface. You must *always* balance the save() and restore()
 * calls otherwise the state gets out of wack. However, users should not be mutating this anyway, you should simply be consuming the information.
 */
export class BaseTick {
    constructor (public clock: number, public dt: number, public previous?: BaseTick) {
    }
    /**
     * subclasses must implement this for their specialised type subclass
     */
    copy(): this {return <this> new BaseTick(this.clock, this.dt, this.previous);}
    /**
     * saves the state and returns a new instance, use restore on the returned instance to get back to the previous state
     */
    save(): this {
        var cp = this.copy();
        cp.previous = this;
        return cp;
    }
    restore(): this {
        types.assert(this.previous != null);
        return <this>this.previous;
    }
    /**
     * Mutates the clock by dt (use save and restore if you want to retreive it)
     */
    skew(dt: number): this {
        var cp = this.copy();
        cp.clock += dt;
        return cp;
    }
}

export class SignalFn<In, Out> {
    constructor(public attach: (upstream: Rx.Observable<In>) => Rx.Observable<Out>) {
    }
    
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    create(attach: (upstream: Rx.Observable<In>) => Rx.Observable<Out>): this {
        return <this> new SignalFn<In, Out>(attach);
    }


    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    take(frames: number): this {
        var self = this;
        if (DEBUG) console.log("take: build");
        return this.create(
           (upstream: Rx.Observable<In>) => self.attach(upstream).take(frames)
        )
    }
    
    /**
     * map the stream of values to a new parameter
     */
    mapObservable<V>(fn: (out: Rx.Observable<Out>) => Rx.Observable<V>): SignalFn<In, V> {
        var self = this;
        return new SignalFn<In, V>(
            (upstream: Rx.Observable<In>) => fn(self.attach(upstream))
        );
    }
    
    /**
     * map the value of 'this' to a new parameter
     */
    mapValue<V>(fn: (out: Out) => V): SignalFn<In, V> {
        return this.mapObservable(upstream => <Rx.Observable<V>>upstream.map(fn))
    }
    
    /**
     * combine the ouput of this into a downstream ObservableTransformer to create a new ObservableTransformer;
     */
    map<NewOut>(downstream: SignalFn<Out, NewOut>): SignalFn<In, NewOut> {
        var self = this;
        return new SignalFn<In, NewOut>(
            upstream => downstream.attach(self.attach(upstream))    
        );
    }
    
    p: number[];
    
    reduceValue<V>(
        array: SignalFn<In, V[]>,
        fn: (previousValue: Out, out: V, index?: number, array?: V[]) => Out 
        ): this {
        return this.create(this.combine(
            () => (thisOut: Out, array: V[]) => 
                array.reduce(fn, thisOut)
            ,
            array
        ).attach);
    }
    
    /**
     * combine with other transformers with a common type of input. 
     * All are given the same input, and their simulataneous outputs are passed to a 
     * combiner function, which compute the final output.
     */
    combineMany<CombinedOut> (
        combinerBuilder: () => (thisValue: Out, ...args: any[]) => CombinedOut,
        ...others: SignalFn<In, any>[]
    ) : SignalFn<In, CombinedOut>  {
        return new SignalFn<In, CombinedOut>((upstream: Rx.Observable<In>) => {
            // join upstream with parameter
            var fork = new Rx.Subject<In>()
            upstream.subscribe(fork);
            
            // we link all concurrent OTs in the others array to the fork, skipping null or undefined values
            var args: any[] = others.reduce(
                (acc: any[], other: SignalFn<In, any>) => {
                    if (other !== undefined) acc.push(other.attach(fork))
                    return acc;
                }, []
            );
                
            args.unshift(this.attach(fork)) // put output of self as first param in combiner
            args.unshift(combinerBuilder()) // build effect handler for zip
            
            return zip.zip.apply(null, args);
        }); 
    }
    
    /**
     * Combine with another transformer with the same type of input. 
     * Both are given the same input, and their simulataneous outputs are passed to a 
     * combiner function, which compute the final output.
     */
    combine<Combined, Arg1, Arg2, Arg3, Arg4, Arg5, Arg6, Arg7, Arg8> (
            combinerBuilder: () => 
                (thisValue: Out, arg1?: Arg1, arg2?: Arg2, arg3?: Arg3,
                                 arg4?: Arg4, arg5?: Arg5, arg6?: Arg6) => Combined,
            other1?: SignalFn<In, Arg1>, 
            other2?: SignalFn<In, Arg2>, 
            other3?: SignalFn<In, Arg3>,
            other4?: SignalFn<In, Arg4>,
            other5?: SignalFn<In, Arg5>,
            other6?: SignalFn<In, Arg6>,
            other7?: SignalFn<In, Arg7>,
            other8?: SignalFn<In, Arg8>      
        ) : SignalFn<In, Combined> {
        return this.combineMany(combinerBuilder, other1, other2, other3, other4, 
                                                 other5, other6, other7, other8);
    }
    
    mergeInput(): SignalFn<In, {in: In, out: Out}> {
        return this.combine(
           () => (thisValue: Out, arg1: In) => {return {"in": arg1, "out": thisValue}},
           new SignalFn<In, In>(_ => _)
        );
    }
    
    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     *
     * This allows you to sequence animations temporally.
     * frame1OT_API().then(frame2OT_API).then(frame3OT_API)
     */
    
    then(follower: this): this {
        var self = this;

        return this.create((upstream: Rx.Observable<In>) => {
            return Rx.Observable.create<Out>(observer => {
                if (DEBUG_THEN) console.log("then: attach");

                var firstTurn = true;
                var first  = new Rx.Subject<In>();
                var second = new Rx.Subject<In>();
                var firstAttach = self.attach(first.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(
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
                        firstTurn = false; // note overall sequences is not notified
                    }
                );
                
                var secondAttach = follower.attach(second.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(
                    next => {
                        if (DEBUG_THEN) console.log("then: second to downstream");
                        observer.onNext(next);
                    },
                    error => {
                        if (DEBUG_THEN) console.log("then: second error");
                        observer.onError(error);    
                    },
                    function(){
                        if (DEBUG_THEN) console.log("then: second complete");
                        observer.onCompleted() // note overall sequences finished
                    }
                );

                var upstreamSubscription = upstream.subscribeOn(Rx.Scheduler.immediate).subscribeOn(Rx.Scheduler.immediate).subscribe(
                    next => {
                        if (firstTurn) {
                            if (DEBUG_THEN) console.log("then: upstream to first");
                            first.onNext(next);
                        } else { // note this gets called if first completes and flips
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
                    upstreamSubscription.dispose();
                    firstAttach.dispose();
                    secondAttach.dispose();
                };
            }); 
        });
    }
    
    init(): (clock: number) => Out{throw new Error("depricated: remove this")}
}

/**
 * A specialization of a signal where In is same type as Out
 */
export class SimpleSignalFn<Tick extends BaseTick> extends SignalFn<Tick, Tick>{

    constructor(attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick>) {
        super(attach)
    }

    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    create(attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick> = nop => nop): this {
        return <this> new SimpleSignalFn<Tick>(attach);
    }

    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     * The return type is what you supply as downstream, allowing you to splice in a custom API fluently
     * 
     * ```Ax.move(...).pipe(myOT_API());```
     */
    pipe<OT_API extends SignalFn<Tick, any>>(downstream: OT_API): OT_API {
        var self = this;
        return <OT_API> downstream.create(
            upstream => downstream.attach(self.attach(upstream))
        )
    }
    
    /**
     * Pipes an array of transformers together in succession.
     */
    pipeAll(downstreams: this[]): this {
        var self = this;
        return this.create(
            (upstream: Rx.Observable<Tick>) => {
                return downstreams.reduce(
                    (upstream, transformer: this) => transformer.attach(upstream),
                    self.attach(upstream)
                )      
            }
        )
    }
    
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
    loop(animation: SimpleSignalFn<Tick>): this {
        return this.pipe(
            this.create(function (prev: Rx.Observable<Tick>): Rx.Observable<Tick> {
                if (DEBUG_LOOP) console.log("loop: initializing");
                return Rx.Observable.create<Tick>(function(observer) {
                    if (DEBUG_LOOP) console.log("loop: create new loop");
                    var loopStart = null;
                    var loopSubscription = null;
                    var t = 0;

                    function attachLoop(next) { //todo I feel like we can remove a level from this somehow
                        if (DEBUG_LOOP) console.log("loop: new inner loop starting at", t);

                        loopStart = new Rx.Subject<Tick>();
                        loopSubscription = animation.attach(loopStart).subscribe(
                            function(next) {
                                if (DEBUG_LOOP) console.log("loop: post-inner loop to downstream");
                                observer.onNext(next);
                            },
                            function(err) {
                                if (DEBUG_LOOP) console.log("loop: post-inner loop err to downstream");
                                observer.onError(err);
                            },
                            function() {
                                if (DEBUG_LOOP) console.log("loop: post-inner completed");
                                loopStart = null;
                            }
                        );
                        if (DEBUG_LOOP) console.log("loop: new inner loop finished construction")
                    }

                    prev.subscribe(
                        function(next) {
                            if (loopStart == null) {
                                if (DEBUG_LOOP) console.log("loop: no inner loop");
                                attachLoop(next);
                            }
                            if (DEBUG_LOOP) console.log("loop: upstream to inner loop");
                            loopStart.onNext(next);

                            t += next.dt;
                        },
                        function(err){
                            if (DEBUG_LOOP) console.log("loop: upstream error to downstream", err);
                            observer.onError(err);
                        },
                        observer.onCompleted.bind(observer)
                    );

                    return function() {
                        //dispose
                        if (DEBUG_LOOP) console.log("loop: dispose");
                        if (loopStart) loopStart.dispose();
                    }
                }).subscribeOn(Rx.Scheduler.immediate);
            })
        );
    }
    /**
     * Creates an animation that sequences the inner animation every time frame.
     *
     * The resultant animation is always runs forever while upstream is live. Multiple inner animations
     * can be playing at the same time (unlike loop)
     */
    emit(animation: SimpleSignalFn<Tick>): this {
        return this.playAll(<SignalFn<Tick, this>>Parameter.constant(animation));
    }

    /**
     * Plays all the inner animations at the same time. Parallel completes when all inner animations are over.
     *
     * The canvas states are restored before each fork, so styling and transforms of different child animations do not
     * interact (although obsviously the pixel buffer is affected by each animation)
     */
    parallel(animations: SimpleSignalFn<Tick>[]): this {
        return this.pipe(
            this.create(function (prev: Rx.Observable<Tick>): Rx.Observable<Tick> {
                if (DEBUG_PARALLEL) console.log("parallel: initializing");
    
                var activeOT_APIs = 0;
                var attachPoint = new Rx.Subject<Tick>();
    
                function decrementActive(err ?: any) {
                    if (DEBUG_PARALLEL) console.log("parallel: decrement active");
                    if (err) console.log("parallel error:", err);
                    activeOT_APIs --;
                }
    
                animations.forEach(function(animation: SimpleSignalFn<Tick>) {
                    activeOT_APIs++;
                    animation.attach(attachPoint.map(tick => <Tick>tick.restore().save())).subscribe(
                        _ => {},
                        decrementActive,
                        decrementActive)
                });
    
                return prev.takeWhile(() => activeOT_APIs > 0).tapOnNext(function(tick: Tick) {
                        if (DEBUG_PARALLEL) console.log("parallel: emitting, animations", tick);
                        var savedTick = tick.save();
                        attachPoint.onNext(<Tick>savedTick);
                        savedTick.restore();
                        if (DEBUG_PARALLEL) console.log("parallel: emitting finished");
                    }
                );
            })
        );
    }
    
    /**
     * Plays all the inner animations, which are generated by a time varying paramater.
     */
    playAll(animations: SignalFn<BaseTick, SignalFn<Tick, any>>): this {
        var self = this;
        return this.create(
            (upstream: Rx.Observable<Tick>) => {
                var root = new Rx.Subject<Tick>();
                // apply self first then connect to the root
                self.attach(upstream.map(tick => {
                    if (DEBUG) console.log("playAll: upstream tick@", tick.clock);
                    return <Tick>tick.save()
                })).subscribe(root);
                // listen to animation parameter, and attach any inner animations to root
                animations.mergeInput().attach(root).subscribe(
                    (animation_tick: {in: Tick, out: SignalFn<Tick, any>}) => {
                        if (DEBUG) console.log("playAll: build inner");
                        var innerRoot = new Rx.Subject<Tick>(); 
                        root.subscribe(innerRoot);
                        animation_tick.out.attach(innerRoot.map(tick => {
                            if (DEBUG) console.log("playAll: innner tick@", tick.clock);
                            return <Tick>tick.restore().save()
                        })).subscribe();
                        innerRoot.onNext(animation_tick.in);
                    },
                    err => root.onError(err), // pass errors downstream
                    () => {if (DEBUG) console.log("playAll over")}  // doesn't affect anything when children complete
                );
                
                return root.map(tick => {
                    if (DEBUG) console.log("playAll: downstream tick@", tick.clock);
                    return <Tick>tick.restore(); 
                });
            }
        )
    }
    
    

    /**
     * Sequences n copies of the inner animation. Clone completes when all inner animations are over.
     */
    clone(n: number, animation: SimpleSignalFn<Tick>): this {
        let array = new Array(n);
        for (let i=0; i<n; i++) array[i] = animation;
        return this.parallel(array);

    }

    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * Apply an effect to occur after 'this'.
     */
    affect<P1, P2, P3, P4, P5, P6, P7, P8> ( 
        effectBuilder: () => (tick: Tick, arg1: P1, arg2: P2, arg3: P3, arg4: P4,
                                          arg5: P5, arg6: P6, arg7: P7, arg8: P8) => void,
        param1?: SignalFn<Tick, P1>, 
        param2?: SignalFn<Tick, P2>,
        param3?: SignalFn<Tick, P3>,
        param4?: SignalFn<Tick, P4>,
        param5?: SignalFn<Tick, P5>,
        param6?: SignalFn<Tick, P6>,
        param7?: SignalFn<Tick, P7>,
        param8?: SignalFn<Tick, P8>): this {
        
        // combine the params with an empty instance
        var combineParams = new SignalFn<Tick, Tick>(_ => _).combine( 
            wrapEffectToReturnTick<Tick>(effectBuilder),
            param1,
            param2,
            param3,
            param4,
            param5,
            param6,
            param7,
            param8
        )
                
        // we want the tick output of the previous transform to be applied first (.pipe)
        // then apply that output to all of the params and the combiner function
        // and we want it with 'this' API, (.create)        
        return this.create(upstream => combineParams.attach(this.attach(upstream)));
    }

    if(condition: types.BooleanArg, animation: SimpleSignalFn<Tick>): If<Tick, this>{
        return new If<Tick, this>([new ConditionActionPair(condition, animation)], this);
    }
    
    skewT(displacement: types.NumberArg): this {
        return this.create(
            this.combine(
                () => (tick: Tick, displacement: number) => <Tick>tick.skew(displacement),
                <SignalFn<Tick, number>>Parameter.from(displacement)    
            ).attach
        )
    }
}


/**
 * Convert an  side effect into a tick chainable 
 */
function wrapEffectToReturnTick<Tick>(
    effectBuilder: () => (tick: Tick, ...params: any[]) => void
): () => (tick: Tick, ...params: any[]) => Tick {
    return () => {
        var effect = effectBuilder()
        return (tick: Tick, ...params: any[]) => {
            params.unshift(tick);
            effect.apply(null, params)
            return tick;
        }
    }
}


export class ConditionActionPair<Tick extends BaseTick> {
    constructor(public condition: types.BooleanArg, public action: SimpleSignalFn<Tick>){}
};


/**
 * An if () elif() else() block. The semantics are subtle when considering animation lifecycles.
 * One intepretation is that an action is triggered until completion, before reevaluating the conditions. However,
 * as many animations are infinite in length, this would only ever select a single animation path.
 * So rather, this block reevaluates the condition every message. If an action completes, the block passes on the completion,
 * and the whole clause is over, so surround action animations with loop if you don't want that behaviour.
 * Whenever the active clause changes, a NEW active animation is reinitialised.
 */
export class If<Tick extends BaseTick, OT_API extends SimpleSignalFn<any>> {
    constructor(
        public conditions: ConditionActionPair<Tick>[],
        public preceeding: OT_API) {
    }

    elif(clause: types.BooleanArg, action: SimpleSignalFn<Tick>): this {
        types.assert(clause != undefined && action != undefined)
        this.conditions.push(new ConditionActionPair<Tick>(clause, action));
        return this;
    }

    endif(): OT_API {
        return this.preceeding.pipe(this.else(this.preceeding.create()));
    }

    else(otherwise: SimpleSignalFn<Tick>): OT_API {
        // the else is like a always true conditional with the otherwise action
        this.conditions.push(new ConditionActionPair<Tick>(true, otherwise));
        
        return this.preceeding.pipe(<OT_API>this.preceeding.create(
            (upstream: Rx.Observable<Tick>) => {
                if (DEBUG_IF) console.log("If: attach");
                var downstream = new Rx.Subject<Tick>();
                
                var activeTick = null;   // current tick being processed
                var error = null;        // global error
                var completed = false;   // global completion flag
                var lastClauseFired: number = -1; // flag set when a condition or action fires or errors or completes
                var actionTaken = false; // flag set when a condition or action fires or errors or completes
                
                
                // error and completed handlers for conditions and actions
                // error/completed propogates to downstream and recorded
                var errorHandler = (err) => {
                    actionTaken = true;
                    error = true;
                    downstream.onError(err);
                }
                var completedHandler = () => {
                    completed = true;
                    actionTaken = true;
                    downstream.onCompleted();
                }
                
                // upstream -> cond1 ?-> action1 -> downstream
                //          -> cond2 ?-> action2 -> downstream
                

                var pairHandler = function(id: number, pair: ConditionActionPair<Tick>): Rx.Subject<Tick> {
                    var action: SimpleSignalFn<Tick> = pair.action;
                    var preConditionAnchor = new Rx.Subject<Tick>();
                    var postConditionAnchor = new Rx.Subject<Tick>();
                    var currentActionSubscription = null;
                    
                    Parameter.from(pair.condition).attach(preConditionAnchor).subscribe(
                        (next: boolean) => {
                            if (next) {
                                actionTaken = true;
                                
                                if (lastClauseFired != id || currentActionSubscription == null) {
                                    if (currentActionSubscription) currentActionSubscription.dispose();
                                    
                                    currentActionSubscription = action.attach(postConditionAnchor).subscribe(
                                        (next) => downstream.onNext(next),
                                        errorHandler, completedHandler
                                    );   
                                }
                                
                                lastClauseFired = id;
                                postConditionAnchor.onNext(activeTick);
                            }
                        },
                        errorHandler, completedHandler
                    )
                    
                    return preConditionAnchor;
                }

                // we initialise all the condition parameters
                // when a condition fires, it triggers the associated action
                var preConditions: Rx.Subject<Tick>[] = this.conditions.map(
                    (pair: ConditionActionPair<Tick>, index: number) => pairHandler(index, pair)
                );

                upstream.subscribe(
                    (tick: Tick) => {
                        if (DEBUG_IF) console.log("If: upstream tick");
                        if (error || completed) return;
                        
                        activeTick = tick;
                        actionTaken = false;
                        
                        preConditions.every(
                            (preCondition: Rx.Subject<Tick>) => {
                                preCondition.onNext(activeTick);
                                return !actionTaken; // continue until something happens
                            }
                        )
                        
                        types.assert(actionTaken == true, "If: nothing happened in if/else block, the default action did not do anything?")
                    },
                    err => downstream.onError(err),
                    () => downstream.onCompleted()
                );

                return downstream.tap(x => {if (DEBUG_IF) console.log("If: downstream tick")});
            }
        ))
    }
}