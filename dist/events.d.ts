/// <reference path="../types/canvas.d.ts" />
import Ax = require("./animaxe");
export declare type SystemMouseEvents = Ax.Point[];
/**
 * [ a c e
 *   b d f
 *   0 0 1 ]
 */
export declare function frame2Canvas(canvas: Ax.Point, a: number, b: number, c: number, d: number, e: number, f: number): Ax.Point;
export declare function canvas2Frame(screen: Ax.Point, a: number, b: number, c: number, d: number, e: number, f: number): Ax.Point;
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
export declare class ComponentMouseEvents {
    source: any;
    mousedown: Rx.Subject<AxMouseEvent>;
    mouseup: Rx.Subject<AxMouseEvent>;
    mousemove: Rx.Subject<AxMouseEvent>;
    mouseenter: Rx.Subject<AxMouseEvent>;
    mouseleave: Rx.Subject<AxMouseEvent>;
    constructor(source: any);
}
/**
 * returns an animation that can be pipelined after a path, which used canvas isPointInPath to detect if a mouse event has
 * occured over the source animation
 */
export declare function ComponentMouseEventHandler(events: ComponentMouseEvents): Ax.Animation;
export declare class AxMouseEvent {
    source: any;
    localPos: Ax.Point;
    globalPos: Ax.Point;
    constructor(source: any, localPos: Ax.Point, globalPos: Ax.Point);
}
