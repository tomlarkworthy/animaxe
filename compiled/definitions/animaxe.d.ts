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
    constructor(next: (t: number) => Value);
    next(t: number): Value;
    map<V>(fn: (Value) => V): Parameter<V>;
    clone(): Parameter<Value>;
}
export declare class ParameterStateful<State, Value> extends Parameter<Value> {
    state: State;
    private tick;
    constructor(initial: State, predecessors: Parameter<any>[], tick: (t: number, state: State) => State, value: (state: State) => Value);
}
export declare type NumberStream = Parameter<number>;
export declare type PointStream = Parameter<Point>;
export declare type ColorStream = Parameter<string>;
export declare type DrawStream = Rx.Observable<DrawTick>;
export declare class Fixed<T> extends Parameter<T> {
    val: T;
    constructor(val: T);
}
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
export declare function color(r: number | NumberStream, g: number | NumberStream, b: number | NumberStream, a: number | NumberStream): ColorStream;
export declare function rnd(): NumberStream;
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
export declare function cos(period: number | NumberStream): NumberStream;
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
export declare function draw(fn: (tick: DrawTick) => void, animation?: Animation): Animation;
export declare function move(delta: Point | PointStream, animation?: Animation): Animation;
export declare function velocity(velocity: Point | PointStream, animation?: Animation): Animation;
export declare function tween_linear(from: Point | PointStream, to: Point | PointStream, time: number, animation: Animation): Animation;
export declare function rect(p1: Point, p2: Point, animation?: Animation): Animation;
export declare function changeColor(color: string, animation?: Animation): Animation;
export declare function take(iterations: number, animation?: Animation): Animation;
export declare function save(width: number, height: number, path: string): Animation;
