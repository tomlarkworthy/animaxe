/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
import Rx = require("rx");
export declare class DrawTick {
    ctx: CanvasRenderingContext2D;
    dt: number;
    constructor(ctx: CanvasRenderingContext2D, dt: number);
}
export declare type DrawStream = Rx.Observable<DrawTick>;
export declare type NumberStream = Rx.Observable<number>;
export declare type PointStream = Rx.Observable<Point>;
export declare function toStreamNumber(x: number | NumberStream): NumberStream;
export declare function toStreamPoint(x: Point | PointStream): PointStream;
export declare class Animation2 {
    _attach: (DrawStream) => DrawStream;
    after: Animation2;
    constructor(_attach: (DrawStream) => DrawStream, after?: Animation2);
    attach(obs: DrawStream): DrawStream;
    /**
     * delivers events to this first, then when that animation is finished
     * the follower consumers events and the values are used as output, until the follower animation completes
     */
    then(follower: Animation2): Animation2;
}
export declare class Animator2 {
    drawingContext: CanvasRenderingContext2D;
    tickerSubscription: Rx.Disposable;
    root: Rx.Subject<DrawTick>;
    animationSubscriptions: Rx.IDisposable[];
    constructor(drawingContext: CanvasRenderingContext2D);
    ticker(tick: NumberStream): void;
    play(animation: Animation2): void;
}
export declare type Point = [number, number];
export declare function point(x: number | NumberStream, y: number | NumberStream): PointStream;
export declare function rnd(): NumberStream;
export declare function sin(period: number | NumberStream, trigger: Animator2): NumberStream;
export declare function cos(period: number | NumberStream, trigger: Animator2): NumberStream;
export declare function loop(animation: Animation2): Animation2;
export declare function draw(fn: (tick: DrawTick) => void, animation?: Animation2): Animation2;
export declare function move(delta: Point | PointStream, animation?: Animation2): Animation2;
export declare function velocity(velocity: Point | PointStream, animation?: Animation2): Animation2;
export declare function take(iterations: number, animation?: Animation2): Animation2;