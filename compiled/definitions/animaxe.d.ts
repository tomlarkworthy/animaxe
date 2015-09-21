/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
import Rx = require("rx");
export declare var DEBUG_LOOP: boolean;
export declare var DEBUG_THEN: boolean;
export declare var DEBUG_EMIT: boolean;
export declare class DrawTick {
    ctx: CanvasRenderingContext2D;
    clock: number;
    dt: number;
    constructor(ctx: CanvasRenderingContext2D, clock: number, dt: number);
}
export declare class Parameter<Value> {
    constructor(init: () => ((t: number) => Value));
    init(): (clock: number) => Value;
    map<V>(fn: (Value) => V): Parameter<V>;
    clone(): Parameter<Value>;
}
export declare type NumberStream = Parameter<number>;
export declare type PointStream = Parameter<Point>;
export declare type ColorStream = Parameter<string>;
export declare type DrawStream = Rx.Observable<DrawTick>;
export declare function fixed<T>(val: T | Parameter<T>): Parameter<T>;
export declare function toStreamNumber(x: number | NumberStream): NumberStream;
export declare function toStreamPoint(x: Point | PointStream): PointStream;
export declare function toStreamColor(x: string | ColorStream): ColorStream;
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
export declare type Point = [number, number];
export declare function point(x: number | NumberStream, y: number | NumberStream): PointStream;
export declare function rgba(r: number | NumberStream, g: number | NumberStream, b: number | NumberStream, a: number | NumberStream): ColorStream;
export declare function hsl(h: number | NumberStream, s: number | NumberStream, l: number | NumberStream): ColorStream;
export declare function t(): NumberStream;
export declare function rnd(): NumberStream;
export declare function rndNormal(scale?: NumberStream | number): PointStream;
/**
 * NOTE: currently fails if the streams are different lengths
 * @param assertDt the expected clock tick values
 * @param after
 * @returns {Animation}
 */
export declare function assertDt(expectedDt: Rx.Observable<number>, after?: Animation): Animation;
export declare function assertClock(assertClock: number[], after?: Animation): Animation;
export declare function displaceT<T>(displacement: number | Parameter<number>, value: Parameter<T>): Parameter<T>;
export declare function sin(period: number | Parameter<number>): Parameter<number>;
export declare function cos(period: number | Parameter<number>): Parameter<number>;
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
export declare function draw(initDraw: () => ((tick: DrawTick) => void), animation?: Animation): Animation;
export declare function move(delta: Point | PointStream, animation?: Animation): Animation;
export declare function composite(composite_mode: string, animation?: Animation): Animation;
export declare function velocity(velocity: Point | PointStream, animation?: Animation): Animation;
export declare function tween_linear(from: Point | PointStream, to: Point | PointStream, time: number, animation: Animation): Animation;
export declare function rect(p1: Point, p2: Point, animation?: Animation): Animation;
export declare function changeColor(color: string, animation?: Animation): Animation;
export declare function glow(decay?: number, after?: Animation): Animation;
export declare function take(iterations: number, animation?: Animation): Animation;
export declare function save(width: number, height: number, path: string): Animation;
