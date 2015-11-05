/// <reference path="../types/canvas.d.ts" />
import Ax = require("./animaxe");


export type SystemMouseEvents = Ax.Point[];

/**
 * [ a c e
 *   b d f
 *   0 0 1 ]
 */
export function frame2Canvas (canvas: Ax.Point,a:number, b:number,c:number,d:number,e:number,f:number): Ax.Point {
    var x = a*canvas[0] + c*canvas[1] + e;
    var y = b*canvas[0] + d*canvas[1] + f;
    return [x,y];
}

export function canvas2Frame (screen: Ax.Point,a:number, b:number,c:number,d:number,e:number,f:number): Ax.Point {
    // see http://stackoverflow.com/questions/10892267/html5-canvas-transformation-algorithm-finding-object-coordinates-after-applyin
    var M = (a*d - b*c);
    return frame2Canvas(screen, d/M, -b/M, -c/M, a/M, (c*f - d*e)/M, (b*e - a*f)/M)
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
                                // ^ todo
                                console.log("HIT", evt, componentEventStream);
                                var localEvent = new AxMouseEvent(events.source, /*todo*/[0,0], evt);
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
                                var tx = tick.ctx.getTransform();
                                //todo get canvas is a 3x3 matrix NOT the homogeneous elements of interest
                                console.log("tx", tx);
                                var localEvent = new AxMouseEvent(events.source, canvas2Frame(evt, tx[0], tx[1], tx[3], tx[4],tx[6], tx[7]), evt);

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
    constructor(public source: any, public localPos: Ax.Point, public globalPos: Ax.Point) {}
}