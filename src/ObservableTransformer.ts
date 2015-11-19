import * as Ax from "./animaxe"
import * as Rx from "rx"
import * as types from "./types"
import * as Parameter from "./Parameter"
export * from "./types"

export var DEBUG_LOOP = false;
export var DEBUG_THEN = false;
export var DEBUG_IF = false;
export var DEBUG_EMIT = false;
export var DEBUG_PARALLEL = false;
export var DEBUG_EVENTS = false;
export var DEBUG = false;

export class BaseTick {
    constructor (
        public clock: number,
        public dt: number,
        public ctx: CanvasRenderingContext2D) // TODO remove ctx from BaseTick
    {
    }
}

export class ObservableTransformer<Tick extends BaseTick> {

    constructor(public attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick>) {
    }

    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    create(attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick> = nop => nop): this {
        return <this> new ObservableTransformer<Tick>(attach);
    }

    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     *
     * This allows you to chain custom animations.
     *
     * ```Ax.move(...).pipe(myOT_API());```
     */
    pipe<OT_API extends ObservableTransformer<Tick>>(downstream: OT_API): OT_API {
        return combine<Tick, ObservableTransformer<Tick>, OT_API>(this, downstream);
    }

    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     *
     * This allows you to sequence animations temporally.
     * frame1OT_API().then(frame2OT_API).then(frame3OT_API)
     */
    then(follower: ObservableTransformer<Tick>): this {
        var self = this;

        return this.create(function (prev: Rx.Observable<Tick>) : Rx.Observable<Tick> {
            return Rx.Observable.create<Tick>(function (observer) {
                var first  = new Rx.Subject<Tick>();
                var second = new Rx.Subject<Tick>();

                var firstTurn = true;

                var current = first;
                if (DEBUG_THEN) console.log("then: attach");

                var secondAttach = null;

                var firstAttach  = self.attach(first.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(
                    function(next) {
                        if (DEBUG_THEN) console.log("then: first to downstream");
                        observer.onNext(next);
                    },
                    observer.onError.bind(observer),
                    function(){
                        if (DEBUG_THEN) console.log("then: first complete");
                        firstTurn = false;

                        secondAttach = follower.attach(second.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(
                            function(next) {
                                if (DEBUG_THEN) console.log("then: second to downstream");
                                observer.onNext(next);
                            },
                            observer.onError.bind(observer),
                            function(){
                                if (DEBUG_THEN) console.log("then: second complete");
                                observer.onCompleted()
                            }

                        );
                    }
                );

                var prevSubscription = prev.subscribeOn(Rx.Scheduler.immediate).subscribe(
                    function(next) {
                        if (DEBUG_THEN) console.log("then: upstream to first OR second");
                        if (firstTurn) {
                            first.onNext(next);
                        } else {
                            second.onNext(next);
                        }
                    },
                    observer.onError,
                    function () {
                        if (DEBUG_THEN) console.log("then: upstream complete");
                        observer.onCompleted();
                    }
                );
                // on dispose
                return function () {
                    if (DEBUG_THEN) console.log("then: disposer");
                    prevSubscription.dispose();
                    firstAttach.dispose();
                    if (secondAttach)
                        secondAttach.dispose();
                };
            }).subscribeOn(Rx.Scheduler.immediate); //todo remove subscribeOns
        });
    }
    /**
     * Creates an animation that replays the inner animation each time the inner animation completes.
     *
     * The resultant animation is always runs forever while upstream is live. Only a single inner animation
     * plays at a time (unlike emit())
     */
    loop(animation: ObservableTransformer<Tick>): this {
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
    emit(animation: ObservableTransformer<Tick>): this {
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
    parallel(animations: ObservableTransformer<Tick>[]): this {
        return this.create(function (prev: Rx.Observable<Tick>): Rx.Observable<Tick> {
            if (DEBUG_PARALLEL) console.log("parallel: initializing");

            var activeOT_APIs = 0;
            var attachPoint = new Rx.Subject<Tick>();

            function decrementActive(err ?: any) {
                if (DEBUG_PARALLEL) console.log("parallel: decrement active");
                if (err) console.log("parallel error:", err);
                activeOT_APIs --;
            }

            animations.forEach(function(animation: ObservableTransformer<Tick>) {
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
        });
    }

    /**
     * Sequences n copies of the inner animation. Clone completes when all inner animations are over.
     */
    clone(n: number, animation: ObservableTransformer<Tick>): this {
        let array = new Array(n);
        for (let i=0; i<n; i++) array[i] = animation;
        return this.parallel(array);

    }

    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    take(frames: number): this {
        return this.pipe(
            this.create((prev: Rx.Observable<Tick>) => {
                if (DEBUG) console.log("take: attach");
                return prev.take(frames);
            })
        );
    }

    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * You just have to supply a function that does something with the draw tick.
     */
    draw(drawFactory: () => ((tick: Tick) => void)): this {
        return this.pipe(this.create((upstream) => upstream.tapOnNext(drawFactory())));
    }

    if(condition: types.BooleanArg, animation: ObservableTransformer<Tick>): If<Tick, this>{
        return new If<Tick, this>([new ConditionActionPair(condition, animation)], this);
    }
}


/**
 * Creates a new OT_API by piping the animation flow of A into B
 */
//export function combine<Tick, A extends ObservableTransformer<Tick>, B extends ObservableTransformer<Tick>>(a: A, b: B): B {
export function combine<Tick, A extends ObservableTransformer<any>, B extends ObservableTransformer<any>>(a: A, b: B): B {
    var b_prev_attach = b.attach;
    b.attach =
        (upstream: Rx.Observable<Tick>) => {
            return b_prev_attach(a.attach(upstream));
        };
    return b;
}


export class ConditionActionPair<Tick extends BaseTick> {
    constructor(public condition: types.BooleanArg, public action: ObservableTransformer<Tick>){}
};


/**
 * An if () elif() else() block. The semantics are subtle when considering animation lifecycles.
 * One intepretation is that an action is triggered until completion, before reevaluating the conditions. However,
 * as many animations are infinite in length, this would only ever select a single animation path.
 * So rather, this block reevaluates the condition every message. If an action completes, the block passes on the completion,
 * and the whole clause is over, so surround action animations with loop if you don't want that behaviour.
 * Whenever the active clause changes, the new active animation is reinitialised.
 */
export class If<Tick extends BaseTick, OT_API extends ObservableTransformer<any>> {
    constructor(
        public conditions: ConditionActionPair<Tick>[],
        public preceeding: OT_API) {
    }

    elif(clause: types.BooleanArg, action: ObservableTransformer<Tick>): this {
        this.conditions.push(new ConditionActionPair<Tick>(clause, action));
        return this;
    }

    endif(): OT_API {
        return this.preceeding.pipe(this.else(this.preceeding.create()));
    }

    else(otherwise: ObservableTransformer<Tick>): OT_API {
        return this.preceeding.pipe(this.preceeding.create(
            (upstream: Rx.Observable<Tick>) => {
                if (DEBUG_IF) console.log("If: attach");
                var downstream = new Rx.Subject<Tick>();
                var anchor = new Rx.Subject<Tick>();

                var currentOT_API = otherwise;
                var activeSubscription = otherwise.attach(anchor).subscribe(downstream);


                // we initialise all the condition parameters
                var conditions_next = this.conditions.map(
                    (condition: ConditionActionPair<Tick>) => Parameter.from(condition[0]).init()
                );

                var fork = upstream.subscribe(
                    (tick: Tick) => {
                        if (DEBUG_IF) console.log("If: upstream tick");
                        // first, we find which animation should active, by using the conditions array
                        var nextActiveOT_API = null;
                        // ideally we would use find, but that is not in TS yet..
                        for (var i = 0 ;i < this.conditions.length && nextActiveOT_API == null; i++) {
                            if (conditions_next[i](tick.clock)) {
                                nextActiveOT_API = this.conditions[i][1];
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