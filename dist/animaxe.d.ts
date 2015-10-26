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
     * delivers events to this first, then when that animation is finished
     * the follower consumers events and the values are used as output, until the follower animation completes
     */
    then(follower: Animation): Animation;
    pipe(after: Animation): Animation;
    translate(position: PointArg): Animation;
    velocity(vector: PointArg): Animation;
    loop(inner: Animation): Animation;
    emit(inner: Animation): Animation;
    clone(n: number, inner: Animation): Animation;
    parallel(inner: Rx.Observable<Animation> | Animation[]): Animation;
    tween_linear(from: PointArg, to: PointArg, time: NumberArg): Animation;
    take(frames: number): Animation;
    draw(drawFactory: () => ((tick: DrawTick) => void)): Animation;
    strokeStyle(color: ColorArg): Animation;
    fillStyle(color: ColorArg): Animation;
    fillRect(xy: PointArg, width_height: PointArg): Animation;
    withinPath(inner: Animation): Animation;
    moveTo(xy: PointArg): Animation;
    lineTo(xy: PointArg): Animation;
    stroke(): Animation;
    globalCompositeOperation(operation: string): Animation;
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
export declare function glow(decay?: number, after?: Animation): Animation;
export declare function take(frames: number, animation?: Animation): Animation;
export declare function save(width: number, height: number, path: string): Animation;
