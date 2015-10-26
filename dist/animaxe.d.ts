/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
import Rx = require('rx');
import Parameter = require('./parameter');
export declare var DEBUG_LOOP: boolean;
export declare var DEBUG_THEN: boolean;
export declare var DEBUG_EMIT: boolean;
export declare var DEBUG: boolean;
export interface Parameter<T> extends Parameter.Parameter<T> {
}
export declare type Color = string;
export declare type Point = [number, number];
export declare type NumberArg = number | Parameter<number>;
export declare type PointArg = Point | Parameter<Point>;
export declare type ColorArg = Color | Parameter<Color>;
/**
 * Animators are updated with a DrawTick, which provides the local animation time, the
 */
export declare class DrawTick {
    ctx: CanvasRenderingContext2D;
    clock: number;
    dt: number;
    constructor(ctx: CanvasRenderingContext2D, clock: number, dt: number);
}
export declare type DrawStream = Rx.Observable<DrawTick>;
export declare class Animation {
    _attach: (upstream: DrawStream) => DrawStream;
    after: Animation;
    constructor(_attach: (upstream: DrawStream) => DrawStream, after?: Animation);
    attach(upstream: DrawStream): DrawStream;
    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     * This allows you to chain custom animation.
     * Ax.move(...).pipe(myAnimation());
     */
    pipe(downstream: Animation): Animation;
    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     * This allows you to sequence animations temporally.
     * frame1Animation().then(frame2Animation).then(frame3Animation)
     */
    then(follower: Animation): Animation;
    /**
     * Creates an animation that replays the inner animation each time the inner animation completes.
     * The resultant animation is always runs forever while upstream is live. Only a single inner animation
     * plays at a time (unlike emit())
     */
    loop(inner: Animation): Animation;
    /**
     * Creates an animation that sequences the inner animation every time frame
     * The resultant animation is always runs forever while upstream is live. Multiple inner animations
     * can be playing at the same time (unlike loop)
     */
    emit(inner: Animation): Animation;
    /**
     * Plays all the inner animations at the same time. Parallel completes when all inner animations are over.
     * The canvas states are restored each time, so styling and transforms of different animations do not
     * affect each other (although obsviously the pixel buffer is affected by each animation)
     */
    parallel(inner_animations: Rx.Observable<Animation> | Animation[]): Animation;
    /**
     * Sequences n copies of the inner animation. Clone completes when all inner animations are over.
     */
    clone(n: number, inner: Animation): Animation;
    tween_linear(from: PointArg, to: PointArg, time: NumberArg): Animation;
    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    take(frames: number): Animation;
    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * You just have to supply a function that does something with the draw tick.
     */
    draw(drawFactory: () => ((tick: DrawTick) => void)): Animation;
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     */
    translate(position: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    strokeStyle(color: ColorArg): Animation;
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    fillStyle(color: ColorArg): Animation;
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    fillRect(xy: PointArg, width_height: PointArg): Animation;
    /**
     * Encloses the inner animation with a beginpath() and endpath() from the canvas API.
     */
    withinPath(inner: Animation): Animation;
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API. Use with withinPath.
     */
    moveTo(xy: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    lineTo(xy: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    stroke(): Animation;
    /**
     * * Dynamic chainable wrapper for globalCompositeOperation in the canvas API.
     */
    globalCompositeOperation(operation: string): Animation;
    /**
     * translates the drawing context by velocity * tick.clock
     */
    velocity(vector: PointArg): Animation;
    glow(decay: NumberArg): Animation;
}
export declare class Animator {
    ctx: CanvasRenderingContext2D;
    tickerSubscription: Rx.Disposable;
    root: Rx.Subject<DrawTick>;
    animationSubscriptions: Rx.IDisposable[];
    t: number;
    constructor(ctx: CanvasRenderingContext2D);
    ticker(tick: Rx.Observable<number>): void;
    play(animation: Animation): void;
}
/**
 * NOTE: currently fails if the streams are different lengths
 * @param expectedDt the expected clock tick values
 * @param after
 * @returns {Animation}
 */
export declare function assertDt(expectedDt: Rx.Observable<number>, after?: Animation): Animation;
export declare function assertClock(assertClock: number[], after?: Animation): Animation;
/**
 * Creates a new Animation by piping the animation flow of A into B
 */
export declare function combine2(a: Animation, b: Animation): Animation;
/**
 * plays several animations, finishes when they are all done.
 * @param animations
 * @returns {Animation}
 * todo: I think there are lots of bugs when an animation stops part way
 * I think it be better if this spawned its own Animator to handle ctx restores
 */
export declare function parallel(animations: Rx.Observable<Animation> | Animation[]): Animation;
export declare function clone(n: number, animation: Animation): Animation;
/**
 * The child animation is started every frame
 * @param animation
 */
export declare function emit(animation: Animation): Animation;
/**
 * When the child loop finishes, it is spawned
 * @param animation
 * @returns {Animation}
 */
export declare function loop(animation: Animation): Animation;
export declare function draw(drawFactory: () => ((tick: DrawTick) => void), after?: Animation): Animation;
export declare function translate(delta: PointArg, animation?: Animation): Animation;
export declare function globalCompositeOperation(composite_mode: string, animation?: Animation): Animation;
export declare function velocity(velocity: PointArg, animation?: Animation): Animation;
export declare function tween_linear(from: PointArg, to: PointArg, time: NumberArg, animation?: Animation): Animation;
export declare function fillRect(xy: PointArg, width_height: PointArg, animation?: Animation): Animation;
export declare function fillStyle(color: ColorArg, animation?: Animation): Animation;
export declare function strokeStyle(color: ColorArg, animation?: Animation): Animation;
export declare function withinPath(inner: Animation): Animation;
export declare function moveTo(xy: PointArg, animation?: Animation): Animation;
export declare function lineTo(xy: PointArg, animation?: Animation): Animation;
export declare function stroke(animation?: Animation): Animation;
export declare function lineWidth(width: NumberArg, animation?: Animation): Animation;
export declare function glow(decay?: NumberArg, after?: Animation): Animation;
export declare function take(frames: number, animation?: Animation): Animation;
export declare function save(width: number, height: number, path: string): Animation;
