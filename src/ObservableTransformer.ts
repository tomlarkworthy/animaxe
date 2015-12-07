import * as Ax from "./animaxe"
import * as Rx from "rx"
import * as types from "./types"
import * as zip from "./zip"
import * as Parameter from "./Parameter"
export * from "./types"

export var DEBUG_LOOP = true;
export var DEBUG_THEN = true;
export var DEBUG_IF = false;
export var DEBUG_EMIT = false;
export var DEBUG_PARALLEL = false;
export var DEBUG_EVENTS = false;
export var DEBUG = true;

export class BaseTick {
    constructor (
        public clock: number,
        public dt: number,
        public ctx: CanvasRenderingContext2D) // TODO remove ctx from BaseTick
    {
    }
}

export class ObservableTransformer<In extends BaseTick, Out> {
    constructor(public attach: (upstream: Rx.Observable<In>) => Rx.Observable<Out>) {
    }
    
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    create(attach: (upstream: Rx.Observable<In>) => Rx.Observable<Out>): this {
        return <this> new ObservableTransformer<In, Out>(attach);
    }
    
    /**
     * map the value of 'this' to a new parameter
     */
    map<V>(fn: (Out) => V): ObservableTransformer<In, V> {
        var self = this;
        return new ObservableTransformer<In, V>(
            (upstream: Rx.Observable<In>) => self.attach(upstream).map(fn)
        );
    }
    
    /**
     *  with another transformer with the same type of input. 
     * Both are given the same input, and their simulataneous outputs are passed to a 
     * combiner function, which compute the final output.
     */
    combine1<Arg1, CombinedOut> (
        other1: ObservableTransformer<In, Arg1>, 
        combinerBuilder: () => (tick: Out, arg1: Arg1) => CombinedOut)
            : ObservableTransformer<In, CombinedOut> {
        return new ObservableTransformer<In, CombinedOut>((upstream: Rx.Observable<In>) => {
            // join upstream with parameter
            console.log("combine1: attach")
            var fork = new Rx.Subject<In>()
            upstream.subscribe(fork);
            return zip.zip(
                combinerBuilder(),
                this.attach(fork).tapOnCompleted(() => console.log("combine1: inner this completed")),
                other1.attach(fork).tapOnCompleted(() => console.log("combine1: inner other1 completed"))
            )
        });
    }
   
    /**
     * Combine with another transformer with the same type of input. 
     * Both are given the same input, and their simulataneous outputs are passed to a 
     * combiner function, which compute the final output.
     */
    combine2<Arg1, Arg2, Combined> (
            other1: ObservableTransformer<In, Arg1>, 
            other2: ObservableTransformer<In, Arg2>, 
            combinerBuilder: () => 
                (tick: Out, arg1: Arg1, arg2: Arg2) => Combined
        ) : ObservableTransformer<In, Combined> {
        if (DEBUG) console.log("combine2: build");
        return new ObservableTransformer<In, Combined>(
            (upstream: Rx.Observable<In>) => {
                // TODO ALL THE ISSUES ARE HERE, COMBINE DOES NTO DELIVER onCompleted fast
                // Should the onComplete call during the thread of execution of a dirrernt on Next?
                // Is there a better way of arranging the merge, so that the onComplete 
                // merges faster
                // we need to push all the ticks through each pipe, collect the results
                // and defer resolving onCompleted until immediately after
                // this requires a new type of combinator
                if (DEBUG) console.log("combine2: attach");
                var fork = new Rx.Subject<In>()
                upstream.subscribe(fork);
                // join upstream with parameter
                return zip.zip(
                    combinerBuilder(),
                    this.attach(fork).tapOnCompleted(() => console.log("combine2: inner this completed")),
                    other1.attach(fork).tapOnCompleted(() => console.log("combine2: inner other1 completed")),
                    other2.attach(fork).tapOnCompleted(() => console.log("combine2: inner other2 completed"))
                )
            }
        );
    }
    
    /**
     * Combine with another transformer with the same type of input. 
     * Both are given the same input, and their simulataneous outputs are passed to a 
     * combiner function, which compute the final output.
     */
    combine3<Arg1, Arg2, Arg3, Combined> (
            other1: ObservableTransformer<In, Arg1>, 
            other2: ObservableTransformer<In, Arg2>, 
            other3: ObservableTransformer<In, Arg3>, 
            combinerBuilder: () => 
                (tick: Out, arg1: Arg1, arg2: Arg2, arg3: Arg3) => Combined
        ) : ObservableTransformer<In, Combined> {
        return new ObservableTransformer<In, Combined>(
            (upstream: Rx.Observable<In>) => {
                // join upstream with parameter
                if (DEBUG) console.log("combine3: attach");
                var fork = new Rx.Subject<In>()
                upstream.subscribe(fork);
                // join upstream with parameter
                return zip.zip(
                    combinerBuilder(),
                    this.attach(fork),
                    other1.attach(fork),
                    other2.attach(fork),
                    other3.attach(fork)
                )
            }
        );
    }
    
    static merge2<In extends BaseTick, Arg1, Arg2, Out> (
            other1: ObservableTransformer<In, Arg1>, 
            other2: ObservableTransformer<In, Arg2>, 
            combinerBuilder: () => 
                (arg1: Arg1, arg2: Arg2) => Out
        ): ObservableTransformer<In, Out> {
        return new ObservableTransformer<In, Out>(
            (upstream: Rx.Observable<In>) => {
                return Rx.Observable.zip<Arg1, Arg2, Out>(
                    other1.attach(upstream),
                    other2.attach(upstream), 
                    combinerBuilder());
            }
        );
    }
    
    static merge4<In extends BaseTick, Arg1, Arg2, Arg3, Arg4, Out> (
            other1: ObservableTransformer<In, Arg1>, 
            other2: ObservableTransformer<In, Arg2>, 
            other3: ObservableTransformer<In, Arg3>, 
            other4: ObservableTransformer<In, Arg4>, 
            combinerBuilder: () => 
                (arg1: Arg1, arg2: Arg2, arg3: Arg3, arg4: Arg4) => Out
        ): ObservableTransformer<In, Out> {
        return new ObservableTransformer<In, Out>(
            (upstream: Rx.Observable<In>) => {
                return Rx.Observable.zip<Arg1, Arg2, Arg3, Arg4, Out>(
                    other1.attach(upstream),
                    other2.attach(upstream),
                    other3.attach(upstream), 
                    other4.attach(upstream),  
                    combinerBuilder());
            }
        );
    }
    
    
    init(): (clock: number) => Out{throw new Error("depricated: remove this")}
}

export class ChainableTransformer<Tick extends BaseTick> extends ObservableTransformer<Tick, Tick>{

    constructor(attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick>) {
        super(attach)
    }

    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    create(attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick> = nop => nop): this {
        return <this> new ChainableTransformer<Tick>(attach);
    }

    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     *
     * This allows you to chain custom animations.
     *
     * ```Ax.move(...).pipe(myOT_API());```
     */
    pipe<OT_API extends ChainableTransformer<Tick>>(downstream: OT_API): OT_API {
        return combine<Tick, ChainableTransformer<Tick>, OT_API>(this, downstream);
    }

    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     *
     * This allows you to sequence animations temporally.
     * frame1OT_API().then(frame2OT_API).then(frame3OT_API)
     */
    
    then(follower: ChainableTransformer<Tick>): this {
        var self = this;

        return this.create((upstream: Rx.Observable<Tick>) => {
            return Rx.Observable.create<Tick>(observer => {
                if (DEBUG_THEN) console.log("then: attach");

                var firstTurn = true;
                var first  = new Rx.Subject<Tick>();
                var second = new Rx.Subject<Tick>();

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
    loop(animation: ChainableTransformer<Tick>): this {
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
    emit(animation: ChainableTransformer<Tick>): this {
        return this.pipe(this.create(function (prev: Rx.Observable<Tick>): Rx.Observable<Tick> {
            if (DEBUG_EMIT) console.log("emit: initializing");
            var attachPoint = new Rx.Subject<Tick>();

            return prev.tapOnNext(function(tick: Tick) {
                    if (DEBUG_EMIT) console.log("emit: emmitting", animation);
                    animation.attach(attachPoint).subscribe();
                    attachPoint.onNext(tick);
                }
            );
        }));
    }

    /**
     * Plays all the inner animations at the same time. Parallel completes when all inner animations are over.
     *
     * The canvas states are restored before each fork, so styling and transforms of different child animations do not
     * interact (although obsviously the pixel buffer is affected by each animation)
     */
    parallel(animations: ChainableTransformer<Tick>[]): this {
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
    
                animations.forEach(function(animation: ChainableTransformer<Tick>) {
                    activeOT_APIs++;
                    animation.attach(attachPoint.tapOnNext(tick => tick.ctx.save())).subscribe(
                            tick => tick.ctx.restore(),
                        decrementActive,
                        decrementActive)
                });
    
                return prev.takeWhile(() => activeOT_APIs > 0).tapOnNext(function(tick: Tick) {
                        if (DEBUG_PARALLEL) console.log("parallel: emitting, animations", tick);
                        attachPoint.onNext(tick);
                        if (DEBUG_PARALLEL) console.log("parallel: emitting finished");
                    }
                );
            })
        );
    }

    /**
     * Sequences n copies of the inner animation. Clone completes when all inner animations are over.
     */
    clone(n: number, animation: ChainableTransformer<Tick>): this {
        let array = new Array(n);
        for (let i=0; i<n; i++) array[i] = animation;
        return this.parallel(array);

    }

    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    take(frames: number): this {
        var self = this;
        if (DEBUG) console.log("take: build");
        return this.create(
            (upstream: Rx.Observable<Tick>) => {
                if (DEBUG) console.log("take: attach");
                return self.attach(upstream).take(frames)
                    .tap(
                        next => console.log("take: next"),
                        error => console.log("take: error", error),
                        () => console.log("take: completed")
                    );
            }
        );
        
    }

    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * You just have to supply a function that does something with the draw tick.
     */
    draw(drawFactory: () => ((tick: Tick) => void)): this {
        return this.create((upstream) => upstream.tapOnNext(drawFactory()));
    }
    
    affect(effectBuilder: () => ((tick: Tick) => void)): this {
        return this.pipe(this.create((upstream) => upstream.tap(effectBuilder())));
    }
    
    
    affect1<Param1> (
        param1: ObservableTransformer<Tick, Param1>, 
        effectBuilder: () => (tick: Tick, param1: Param1) => void): this {
        if (DEBUG) console.log("affect1: build");
        return this.create(
                this.combine1(
                    param1,
                    () => {
                        if (DEBUG) console.log("affect1: attach");
                        var effect = effectBuilder();
                        return (tick: Tick, param1: Param1) => {
                            if (DEBUG) console.log("affect1: effect, tick + ", param1);
                            effect(tick, param1) // apply side effect
                            return tick;   // tick is returned again to make the return type chainable
                        }
                    }
                ).attach
            );
    }
    
    affect2<Param1, Param2> (
        param1: ObservableTransformer<Tick, Param1>, 
        param2: ObservableTransformer<Tick, Param2>, 
        effectBuilder: () => (tick: Tick, param1: Param1, param2: Param2) => void): this {
        if (DEBUG) console.log("affect2: build");
        return this.create(
                this.combine2(
                    param1,
                    param2,
                    () => {
                        if (DEBUG) console.log("affect2: attach");
                        var effect = effectBuilder();
                        return (tick: Tick, param1: Param1, param2: Param2) => {
                            if (DEBUG) console.log("affect2: effect, tick + ", param1, param2);
                            effect(tick, param1, param2) // apply side effect
                            return tick;   // tick is returned again to make the return type chainable
                        }
                    }
                ).attach
            );
    }
    
    affect3<Param1, Param2, Param3> (
        param1: ObservableTransformer<Tick, Param1>, 
        param2: ObservableTransformer<Tick, Param2>,
        param3: ObservableTransformer<Tick, Param3>,  
        effectBuilder: () => (tick: Tick, param1: Param1, param2: Param2, param3: Param3) => void): this {
        return this.create(
                this.combine3(
                    param1,
                    param2,
                    param3,
                    () => {
                        var effect = effectBuilder();
                        return (tick: Tick, param1: Param1, param2: Param2, param3: Param3) => {
                            effect(tick, param1, param2, param3) // apply side effect
                            return tick;   // tick is returned again to make the return type chainable
                        }
                    }
                ).attach
            );
    }

    if(condition: types.BooleanArg, animation: ChainableTransformer<Tick>): If<Tick, this>{
        return new If<Tick, this>([new ConditionActionPair(condition, animation)], this);
    }
}


/**
 * Creates a new OT_API by piping the animation flow of A into B
 */
//export function combine<Tick, A extends ObservableTransformer<Tick>, B extends ObservableTransformer<Tick>>(a: A, b: B): B {
export function combine<Tick, A extends ChainableTransformer<any>, B extends ChainableTransformer<any>>(a: A, b: B): B {
    return b.create(
        upstream => b.attach(a.attach(upstream))
    )
}


export class ConditionActionPair<Tick extends BaseTick> {
    constructor(public condition: types.BooleanArg, public action: ChainableTransformer<Tick>){}
};


/**
 * An if () elif() else() block. The semantics are subtle when considering animation lifecycles.
 * One intepretation is that an action is triggered until completion, before reevaluating the conditions. However,
 * as many animations are infinite in length, this would only ever select a single animation path.
 * So rather, this block reevaluates the condition every message. If an action completes, the block passes on the completion,
 * and the whole clause is over, so surround action animations with loop if you don't want that behaviour.
 * Whenever the active clause changes, the new active animation is reinitialised.
 */
export class If<Tick extends BaseTick, OT_API extends ChainableTransformer<any>> {
    constructor(
        public conditions: ConditionActionPair<Tick>[],
        public preceeding: OT_API) {
    }

    elif(clause: types.BooleanArg, action: ChainableTransformer<Tick>): this {
        types.assert(clause != undefined && action != undefined)
        this.conditions.push(new ConditionActionPair<Tick>(clause, action));
        return this;
    }

    endif(): OT_API {
        return this.preceeding.pipe(this.else(this.preceeding.create()));
    }

    else(otherwise: ChainableTransformer<Tick>): OT_API {
        return this.preceeding.pipe(this.preceeding.create(
            (upstream: Rx.Observable<Tick>) => {
                if (DEBUG_IF) console.log("If: attach");
                var downstream = new Rx.Subject<Tick>();
                var anchor = new Rx.Subject<Tick>();

                var currentOT_API = otherwise;
                var activeSubscription = otherwise.attach(anchor).subscribe(downstream);

                // we initialise all the condition parameters
                var conditions_next = this.conditions.map(
                    (pair: ConditionActionPair<Tick>) => {
                        return Parameter.from(pair.condition).init()
                    }
                );

                var fork = upstream.subscribe(
                    (tick: Tick) => {
                        if (DEBUG_IF) console.log("If: upstream tick");
                        // first, we find which animation should active, by using the conditions array
                        var nextActiveOT_API = null;
                        // ideally we would use find, but that is not in TS yet..
                        for (var i = 0 ;i < this.conditions.length && nextActiveOT_API == null; i++) {
                            if (conditions_next[i](tick.clock)) {
                                nextActiveOT_API = this.conditions[i].action;
                            }
                        }
                        if (nextActiveOT_API == null) nextActiveOT_API = otherwise;


                        // second, we see if this is the same as the current animation, or whether we have switched
                        if (nextActiveOT_API != currentOT_API) {
                            // this is a new animation being sequenced, cancel the old one and add a new one
                            if (DEBUG_IF) console.log("If: new subscription");
                            if (activeSubscription != null) activeSubscription.dispose();
                            activeSubscription = nextActiveOT_API.attach(anchor).subscribe(downstream);
                            currentOT_API = nextActiveOT_API;
                        } else {
                            //we don't need to do anything becuase the subscription is already stream downstrem
                        }
                        anchor.onNext(tick);
                    },
                    err => anchor.onError(err),
                    () => anchor.onCompleted()
                );

                return downstream.tap(x => {if (DEBUG_IF) console.log("If: downstream tick")});
            }
        ))
    }
}