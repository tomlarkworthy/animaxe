import * as Rx from "rx";
import * as types from "./types";
export * from "./types";
export declare var DEBUG_LOOP: boolean;
export declare var DEBUG_THEN: boolean;
export declare var DEBUG_IF: boolean;
export declare var DEBUG_EMIT: boolean;
export declare var DEBUG_PARALLEL: boolean;
export declare var DEBUG_EVENTS: boolean;
export declare var DEBUG: boolean;
export declare class BaseTick {
    clock: number;
    dt: number;
    ctx: CanvasRenderingContext2D;
    constructor(clock: number, dt: number, ctx: CanvasRenderingContext2D);
}
export declare class ObservableTransformer<Tick extends BaseTick> {
    attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick>;
    constructor(attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick>);
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    create(attach?: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick>): this;
    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     *
     * This allows you to chain custom animations.
     *
     * ```Ax.move(...).pipe(myOT_API());```
     */
    pipe<OT_API extends ObservableTransformer<Tick>>(downstream: OT_API): OT_API;
    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     *
     * This allows you to sequence animations temporally.
     * frame1OT_API().then(frame2OT_API).then(frame3OT_API)
     */
    then(follower: ObservableTransformer<Tick>): this;
    /**
     * Creates an animation that replays the inner animation each time the inner animation completes.
     *
     * The resultant animation is always runs forever while upstream is live. Only a single inner animation
     * plays at a time (unlike emit())
     */
    loop(animation: ObservableTransformer<Tick>): this;
    /**
     * Creates an animation that sequences the inner animation every time frame.
     *
     * The resultant animation is always runs forever while upstream is live. Multiple inner animations
     * can be playing at the same time (unlike loop)
     */
    emit(animation: ObservableTransformer<Tick>): this;
    /**
     * Plays all the inner animations at the same time. Parallel completes when all inner animations are over.
     *
     * The canvas states are restored before each fork, so styling and transforms of different child animations do not
     * interact (although obsviously the pixel buffer is affected by each animation)
     */
    parallel(animations: ObservableTransformer<Tick>[]): this;
    /**
     * Sequences n copies of the inner animation. Clone completes when all inner animations are over.
     */
    clone(n: number, animation: ObservableTransformer<Tick>): this;
    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    take(frames: number): this;
    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * You just have to supply a function that does something with the draw tick.
     */
    draw(drawFactory: () => ((tick: Tick) => void)): this;
    if(condition: types.BooleanArg, animation: ObservableTransformer<Tick>): If<Tick, this>;
}
/**
 * Creates a new OT_API by piping the animation flow of A into B
 */
export declare function combine<Tick, A extends ObservableTransformer<any>, B extends ObservableTransformer<any>>(a: A, b: B): B;
export declare class ConditionActionPair<Tick extends BaseTick> {
    condition: types.BooleanArg;
    action: ObservableTransformer<Tick>;
    constructor(condition: types.BooleanArg, action: ObservableTransformer<Tick>);
}
/**
 * An if () elif() else() block. The semantics are subtle when considering animation lifecycles.
 * One intepretation is that an action is triggered until completion, before reevaluating the conditions. However,
 * as many animations are infinite in length, this would only ever select a single animation path.
 * So rather, this block reevaluates the condition every message. If an action completes, the block passes on the completion,
 * and the whole clause is over, so surround action animations with loop if you don't want that behaviour.
 * Whenever the active clause changes, the new active animation is reinitialised.
 */
export declare class If<Tick extends BaseTick, OT_API extends ObservableTransformer<any>> {
    conditions: ConditionActionPair<Tick>[];
    preceeding: OT_API;
    constructor(conditions: ConditionActionPair<Tick>[], preceeding: OT_API);
    elif(clause: types.BooleanArg, action: ObservableTransformer<Tick>): this;
    endif(): OT_API;
    else(otherwise: ObservableTransformer<Tick>): OT_API;
}
