/// <reference path="../types/ctx-get-transform.d.ts" />
import * as Rx from "rx";
import * as Ax from "./animaxe.ts";
export declare type SystemMouseEvents = Ax.Point[];
/**
 * Convert animation coordinates (e.g. a coordinate of moveTo) to global canvas coordinates, cooeffecients are:
 * [ a c e
 *   b d f
 *   0 0 1 ]
 * This is basically just a matrix multiplication of the context.transform
 */
export declare function animation2Canvas(canvas: Ax.Point, a: number, b: number, c: number, d: number, e: number, f: number): Ax.Point;
/**
 * Convert canvas coordinates (e.g. mouse position on canvas) to local animation coordinates, cooeffecients are:
 * [ a c e
 *   b d f
 *   0 0 1 ]
 *  This is basically just an inverse matrix multiplication of the context.transform
 */
export declare function canvas2Animation(canvasCoord: Ax.Point, a: number, b: number, c: number, d: number, e: number, f: number): Ax.Point;
/**
 * Objects of this type are passed through the tick pipeline, and encapsulate potentially many concurrent system events
 * originating from the canvas DOM. These have to be intepreted by UI components to see if they hit
 */
export declare class Events {
    mousedowns: SystemMouseEvents;
    mouseups: SystemMouseEvents;
    mousemoves: SystemMouseEvents;
    mouseenters: SystemMouseEvents;
    mouseleaves: SystemMouseEvents;
    /**
     * clear all the events, done by animator at the end of a tick
     */
    clear(): void;
}
export declare class ComponentMouseState {
    mousedown: Rx.Subject<AxMouseEvent>;
    mouseup: Rx.Subject<AxMouseEvent>;
    mousemove: Rx.Subject<AxMouseEvent>;
    mouseenter: Rx.Subject<AxMouseEvent>;
    mouseleave: Rx.Subject<AxMouseEvent>;
    /**
     * This needs to be set after construction
     */
    source: any;
    isMouseOver(): Ax.Parameter<boolean>;
    isMouseDown(): Ax.Parameter<boolean>;
}
/**
 * returns an animation that can be pipelined after a path, which used canvas isPointInPath to detect if a mouse event has
 * occured over the source animation
 */
export declare function ComponentMouseEventHandler(events: ComponentMouseState): Ax.Animation;
/**
 * returns an animation that can be pipelined anywhere, which listens for global mouse events over the entire canvas
 * AxMouseEvent raised globally have a null source field, and identical global and local coordinates
 */
export declare function CanvasMouseEventHandler(events: ComponentMouseState): Ax.Animation;
export declare class AxMouseEvent {
    source: any;
    animationCoord: Ax.Point;
    canvasCoord: Ax.Point;
    constructor(source: any, animationCoord: Ax.Point, canvasCoord: Ax.Point);
}
