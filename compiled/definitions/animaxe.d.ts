/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
import Rx = require("rx");
export declare var DEBUG_LOOP: boolean;
export declare var DEBUG_THEN: boolean;
export declare class DrawTick {
    ctx: CanvasRenderingContext2D;
    dt: number;
    constructor(ctx: CanvasRenderingContext2D, dt: number);
}
export declare class Iterable<T> {
    constructor(_next: () => T);
    next(): T;
    map<T, V>(fn: (T) => V): Iterable<V>;
}
export declare class StatefulIterable<T, S> extends Iterable<T> {
    state: S;
    constructor(initialState: S, _next: () => T);
}
export declare type NumberStream = Iterable<number>;
export declare type PointStream = Iterable<Point>;
export declare type ColorStream = Iterable<string>;
export declare type DrawStream = Rx.Observable<DrawTick>;
export declare class Fixed<T> extends Iterable<T> {
    val: T;
    constructor(val: T);
}
export declare function toStreamNumber(x: number | NumberStream): NumberStream;
export declare function toStreamPoint(x: Point | PointStream): PointStream;
export declare function toStreamColor(x: string | ColorStream): ColorStream;
export declare class Animation {
    _attach: (DrawStream) => DrawStream;
    after: Animation;
    constructor(_attach: (DrawStream) => DrawStream, after?: Animation);
    attach(obs: DrawStream): DrawStream;
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
    clock(): NumberStream;
}
export declare type Point = [number, number];
export declare function point(x: number | NumberStream, y: number | NumberStream): PointStream;
export declare function color(r: number | NumberStream, g: number | NumberStream, b: number | NumberStream, a: number | NumberStream): ColorStream;
export declare function rnd(): NumberStream;
export declare function previous<T>(value: Iterable<T>, clock: NumberStream): Iterable<T>;
export declare function sin(period: number | NumberStream, clock: NumberStream): NumberStream;
export declare function cos(period: number | NumberStream, clock: NumberStream): NumberStream;
export declare function loop(animation: Animation): Animation;
export declare function draw(fn: (tick: DrawTick) => void, animation?: Animation): Animation;
export declare function move(delta: Point | PointStream, animation?: Animation): Animation;
export declare function velocity(velocity: Point | PointStream, animation?: Animation): Animation;
export declare function tween_linear(from: Point | PointStream, to: Point | PointStream, time: number, animation: Animation): Animation;
export declare function rect(p1: Point, p2: Point, animation?: Animation): Animation;
export declare function changeColor(color: string, animation?: Animation): Animation;
export declare function take(iterations: number, animation?: Animation): Animation;
export declare function save(width: number, height: number, path: string): Animation;
