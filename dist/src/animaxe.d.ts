/// <reference path="../../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../../types/node.d.ts" />
import * as Rx from "rx";
import * as events from "./events";
import * as canvas from "./CanvasAnimation";
export * from "./types";
export * from "./CanvasAnimation";
export declare var DEBUG: boolean;
export declare var DEBUG_EVENTS: boolean;
/**
 * An animation is pipeline that modifies the drawing context found in an animation Tick. Animations can be chained
 * together to create a more complicated Animation. They are composeable,
 *
 * e.g. ```animation1 = Ax.translate([50, 50]).fillStyle("red").fillRect([0,0], [20,20])```
 * is one animation which has been formed from three subanimations.
 *
 * Animations have a lifecycle, they can be finite or infinite in length. You can start temporally compose animations
 * using ```anim1.then(anim2)```, which creates a new animation that plays animation 2 when animation 1 finishes.
 *
 * When an animation is sequenced into the animation pipeline. Its attach method is called which atcually builds the
 * RxJS pipeline. Thus an animation is not live, but really a factory for a RxJS configuration.
 */
export declare class Animator {
    ctx: CanvasRenderingContext2D;
    root: Rx.Subject<canvas.CanvasTick>;
    t: number;
    events: events.Events;
    constructor(ctx: CanvasRenderingContext2D);
    tick(dt: number): void;
    ticker(dts: Rx.Observable<number>): void;
    play(animation: canvas.Animation): Rx.IDisposable;
    mousedown(x: number, y: number): void;
    mouseup(x: number, y: number): void;
    onmousemove(x: number, y: number): void;
    /**
     * Attaches listener for a canvas which will be propogated during ticks to animators that take input, e.g. UI
     */
    registerEvents(canvas: any): void;
}
/**
 * NOTE: currently fails if the streams are different lengths
 * @param expectedDt the expected clock tick values
 * @param after
 * @returns {Animation}
 */
export declare function assertDt(expectedDt: Rx.Observable<number>): canvas.Animation;
export declare function assertClock(assertClock: number[]): canvas.Animation;
