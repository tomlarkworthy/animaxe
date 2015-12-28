/// <reference path="../types/ctx-get-transform.d.ts" />

import * as Rx from "rx"
import Observable = Rx.Observable;
import * as types from "./types"
import * as canvas from "./CanvasAnimation"
import * as parameter from "./Parameter"
export * from "./types"

export type SystemMouseEvents = types.Point[];

/**
 * Convert animation coordinates (e.g. a coordinate of moveTo) to global canvas coordinates, cooeffecients are:
 * [ a c e
 *   b d f
 *   0 0 1 ]
 * This is basically just a matrix multiplication of the context.transform
 */
export function animation2Canvas (canvas: types.Point,a:number, b:number,c:number,d:number,e:number,f:number): types.Point {
    var x = a*canvas[0] + c*canvas[1] + e;
    var y = b*canvas[0] + d*canvas[1] + f;
    return [x,y];
}
/**
 * Convert canvas coordinates (e.g. mouse position on canvas) to local animation coordinates, cooeffecients are:
 * [ a c e
 *   b d f
 *   0 0 1 ]
 *  This is basically just an inverse matrix multiplication of the context.transform
 */
export function canvas2Animation (canvasCoord: types.Point,a:number, b:number,c:number,d:number,e:number,f:number): types.Point {
    // see http://stackoverflow.com/questions/10892267/html5-canvas-transformation-algorithm-finding-object-coordinates-after-applyin
    var M = (a*d - b*c);
    return animation2Canvas(canvasCoord, d/M, -b/M, -c/M, a/M, (c*f - d*e)/M, (b*e - a*f)/M)
}

function canvas2AnimationUsingContext (canvasCoord: types.Point, ctx: CanvasRenderingContext2D): types.Point {
    var tx = ctx.getTransform();
    return canvas2Animation(canvasCoord, tx[0], tx[1], tx[3], tx[4], tx[6], tx[7])
}
/**
 * Objects of this type are passed through the tick pipeline, and encapsulate potentially many concurrent system events
 * originating from the canvas DOM. These have to be intepreted by UI components to see if they hit
 */
export class Events {
    mousedowns: SystemMouseEvents = [];
    mouseups:   SystemMouseEvents = [];
    mousemoves: SystemMouseEvents = [];
    mouseenters: SystemMouseEvents = [];
    mouseleaves: SystemMouseEvents = [];
    //onmouseover: types.Point[] = []; to implement these we need to think about heirarchy in components
    //onmouseout: types.Point[] = [];

    /**
     * clear all the events, done by animator at the end of a tick
     */
    clear() {
        this.mousedowns = [];
        this.mouseups   = [];
        this.mousemoves = [];
        this.mouseenters = [];
        this.mouseleaves = [];
    }
}

export class ComponentMouseState {
    mousedown    = new Rx.Subject<AxMouseEvent>();
    mouseup      = new Rx.Subject<AxMouseEvent>();
    mousemove    = new Rx.Subject<AxMouseEvent>();
    mouseenter   = new Rx.Subject<AxMouseEvent>();
    mouseleave   = new Rx.Subject<AxMouseEvent>();

    /**
     * This needs to be set after construction
     */
    source: any;

    isMouseOver(): parameter.Parameter<boolean> {
        var toggle: Rx.Observable<boolean> =
            Rx.Observable.merge([
                this.mouseenter.map((x) => true),
                this.mouseleave.map((x) => false)]);
        return parameter.updateFrom(false, toggle);
    }

    isMouseDown(): parameter.Parameter<boolean> {
        var mouseDown: Rx.Observable<boolean> =
            Rx.Observable.merge([
                this.mousedown.map((x)  => true),
                this.mouseup.map((x)    => false),
                this.mouseleave.map((x) => false)]);
        return parameter.updateFrom(false, mouseDown);
    }
}

/**
 * returns an animation that can be pipelined after a path, which used canvas isPointInPath to detect if a mouse event has
 * occured over the source animation
 */
export function ComponentMouseEventHandler(events: ComponentMouseState): canvas.Animation {
    return canvas.create().affect(
        () => {
            var mouseIsOver = false;
            return (tick: canvas.CanvasTick) => {
                function processSystemMouseEvents(
                    sourceEvents: SystemMouseEvents,
                    componentEventStream: Rx.Subject<AxMouseEvent>
                ) {
                    sourceEvents.forEach(
                        (evt: types.Point) => {
                            if (componentEventStream.hasObservers() && tick.ctx.isPointInPath(evt[0], evt[1])) {
                                // we have to figure out the global position of this component, so the x and y
                                // have to go backward through the transform matrix
                                var localEvent = new AxMouseEvent(events.source, canvas2AnimationUsingContext(evt, tick.ctx), evt);
                                componentEventStream.onNext(localEvent);
                            }
                        }
                    )
                }

                function processSystemMouseMoveEvents(
                    sourceMoveEvents: SystemMouseEvents,
                    mousemoveStream: Rx.Subject<AxMouseEvent>,
                    mouseenterStream: Rx.Subject<AxMouseEvent>,
                    mouseleaveStream: Rx.Subject<AxMouseEvent>
                ) {
                    sourceMoveEvents.forEach(
                        (evt: types.Point) => {
                            if (mousemoveStream.hasObservers() || mouseenterStream.hasObservers() || mouseleaveStream.hasObservers()) {
                                var pointInPath = tick.ctx.isPointInPath(evt[0], evt[1]);
                                var localEvent = new AxMouseEvent(events.source, canvas2AnimationUsingContext(evt, tick.ctx), evt);

                                if (mouseenterStream.hasObservers() && pointInPath && !mouseIsOver) {
                                    mouseenterStream.onNext(localEvent);
                                }
                                if (mousemoveStream.hasObservers() && pointInPath) {
                                    mousemoveStream.onNext(localEvent);
                                }

                                if (mouseleaveStream.hasObservers() && !pointInPath && mouseIsOver) {
                                    mouseleaveStream.onNext(localEvent);
                                }

                                mouseIsOver = pointInPath;
                            }
                        }
                    )
                }

                processSystemMouseEvents(tick.events.mousedowns, events.mousedown);
                processSystemMouseEvents(tick.events.mouseups, events.mouseup);
                processSystemMouseMoveEvents(tick.events.mousemoves, events.mousemove, events.mouseenter, events.mouseleave);
            }
        }
    )
}

/**
 * returns an animation that can be pipelined anywhere, which listens for global mouse events over the entire canvas
 * AxMouseEvent raised globally have a null source field, and identical global and local coordinates
 */
export function CanvasMouseEventHandler(events: ComponentMouseState): canvas.Animation {
    return canvas.create().affect(
        () => {
            return (tick: canvas.CanvasTick) => {
                function processSystemMouseEvents(
                    sourceEvents: SystemMouseEvents,
                    componentEventStream: Rx.Subject<AxMouseEvent>
                ) {
                    sourceEvents.forEach(
                        (evt: types.Point) => {
                            if (componentEventStream.hasObservers()) {
                                componentEventStream.onNext(new AxMouseEvent(null, evt, evt));
                            }
                        }
                    )
                }

                processSystemMouseEvents(tick.events.mousedowns, events.mousedown);
                processSystemMouseEvents(tick.events.mouseups, events.mouseup);
                processSystemMouseEvents(tick.events.mousemoves, events.mousemove);
                processSystemMouseEvents(tick.events.mouseenters, events.mouseenter);
                processSystemMouseEvents(tick.events.mouseleaves, events.mouseleave);
            }
        }
    )
}

export class AxMouseEvent {
    constructor(public source: any, public animationCoord: types.Point, public canvasCoord: types.Point) {}
}