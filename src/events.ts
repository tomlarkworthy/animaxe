/// <reference path="../types/canvas.d.ts" />
import Rx = require("rx");
import Ax = require("./animaxe");
import Parameter = require ("./parameter");

export type SystemMouseEvents = Ax.Point[];

/**
 * Convert animation coordinates (e.g. a coordinate of moveTo) to global canvas coordinates, cooeffecients are:
 * [ a c e
 *   b d f
 *   0 0 1 ]
 * This is basically just a matrix multiplication of the context.transform
 */
export function animation2Canvas (canvas: Ax.Point,a:number, b:number,c:number,d:number,e:number,f:number): Ax.Point {
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
export function canvas2Animation (canvasCoord: Ax.Point,a:number, b:number,c:number,d:number,e:number,f:number): Ax.Point {
    // see http://stackoverflow.com/questions/10892267/html5-canvas-transformation-algorithm-finding-object-coordinates-after-applyin
    var M = (a*d - b*c);
    return animation2Canvas(canvasCoord, d/M, -b/M, -c/M, a/M, (c*f - d*e)/M, (b*e - a*f)/M)
}

function canvas2AnimationUsingContext (canvasCoord: Ax.Point, ctx: CanvasRenderingContext2D): Ax.Point {
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
    //onmouseover: Ax.Point[] = []; to implement these we need to think about heirarchy in components
    //onmouseout: Ax.Point[] = [];

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

export class ComponentMouseEvents {
    mousedown    = new Rx.Subject<AxMouseEvent>();
    mouseup      = new Rx.Subject<AxMouseEvent>();
    mousemove    = new Rx.Subject<AxMouseEvent>();
    mouseenter   = new Rx.Subject<AxMouseEvent>();
    mouseleave   = new Rx.Subject<AxMouseEvent>();

    constructor(public source: any) {}

    isMouseOver(): Ax.Parameter<boolean> {
        var toggle: Rx.Observable<boolean> =
            Rx.Observable.merge([
                this.mouseenter.map((x) => true),
                this.mouseleave.map((x) => false)]);
        return Parameter.updateFrom(false, toggle);
    }

    isMouseDown(): Ax.Parameter<boolean> {
        var mouseDown: Rx.Observable<boolean> =
            Rx.Observable.merge([
                this.mousedown.map((x)  => true),
                this.mouseup.map((x)    => false),
                this.mouseleave.map((x) => false)]);
        return Parameter.updateFrom(false, mouseDown);
    }
}

/**
 * returns an animation that can be pipelined after a path, which used canvas isPointInPath to detect if a mouse event has
 * occured over the source animation
 */
export function ComponentMouseEventHandler(events: ComponentMouseEvents): Ax.Animation {
    return Ax.draw(
        () => {
            var mouseIsOver = false;
            return (tick: Ax.Tick) => {
                function processSystemMouseEvents(
                    sourceEvents: SystemMouseEvents,
                    componentEventStream: Rx.Subject<AxMouseEvent>
                ) {
                    sourceEvents.forEach(
                        (evt: Ax.Point) => {
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
                        (evt: Ax.Point) => {
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

export class AxMouseEvent {
    constructor(public source: any, public animationCoord: Ax.Point, public canvasCoord: Ax.Point) {}
}