/// <reference path="../types/ctx-get-transform.d.ts" />
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var Rx = require("rx");
var canvas = require("./CanvasAnimation");
var parameter = require("./Parameter");
__export(require("./types"));
/**
 * Convert animation coordinates (e.g. a coordinate of moveTo) to global canvas coordinates, cooeffecients are:
 * [ a c e
 *   b d f
 *   0 0 1 ]
 * This is basically just a matrix multiplication of the context.transform
 */
function animation2Canvas(canvas, a, b, c, d, e, f) {
    var x = a * canvas[0] + c * canvas[1] + e;
    var y = b * canvas[0] + d * canvas[1] + f;
    return [x, y];
}
exports.animation2Canvas = animation2Canvas;
/**
 * Convert canvas coordinates (e.g. mouse position on canvas) to local animation coordinates, cooeffecients are:
 * [ a c e
 *   b d f
 *   0 0 1 ]
 *  This is basically just an inverse matrix multiplication of the context.transform
 */
function canvas2Animation(canvasCoord, a, b, c, d, e, f) {
    // see http://stackoverflow.com/questions/10892267/html5-canvas-transformation-algorithm-finding-object-coordinates-after-applyin
    var M = (a * d - b * c);
    return animation2Canvas(canvasCoord, d / M, -b / M, -c / M, a / M, (c * f - d * e) / M, (b * e - a * f) / M);
}
exports.canvas2Animation = canvas2Animation;
function canvas2AnimationUsingContext(canvasCoord, ctx) {
    var tx = ctx.getTransform();
    return canvas2Animation(canvasCoord, tx[0], tx[1], tx[3], tx[4], tx[6], tx[7]);
}
/**
 * Objects of this type are passed through the tick pipeline, and encapsulate potentially many concurrent system events
 * originating from the canvas DOM. These have to be intepreted by UI components to see if they hit
 */
var Events = (function () {
    function Events() {
        this.mousedowns = [];
        this.mouseups = [];
        this.mousemoves = [];
        this.mouseenters = [];
        this.mouseleaves = [];
    }
    //onmouseover: types.Point[] = []; to implement these we need to think about heirarchy in components
    //onmouseout: types.Point[] = [];
    /**
     * clear all the events, done by animator at the end of a tick
     */
    Events.prototype.clear = function () {
        this.mousedowns = [];
        this.mouseups = [];
        this.mousemoves = [];
        this.mouseenters = [];
        this.mouseleaves = [];
    };
    return Events;
})();
exports.Events = Events;
var ComponentMouseState = (function () {
    function ComponentMouseState() {
        this.mousedown = new Rx.Subject();
        this.mouseup = new Rx.Subject();
        this.mousemove = new Rx.Subject();
        this.mouseenter = new Rx.Subject();
        this.mouseleave = new Rx.Subject();
    }
    ComponentMouseState.prototype.isMouseOver = function () {
        var toggle = Rx.Observable.merge([
            this.mouseenter.map(function (x) { return true; }),
            this.mouseleave.map(function (x) { return false; })]);
        return parameter.updateFrom(false, toggle);
    };
    ComponentMouseState.prototype.isMouseDown = function () {
        var mouseDown = Rx.Observable.merge([
            this.mousedown.map(function (x) { return true; }),
            this.mouseup.map(function (x) { return false; }),
            this.mouseleave.map(function (x) { return false; })]);
        return parameter.updateFrom(false, mouseDown);
    };
    return ComponentMouseState;
})();
exports.ComponentMouseState = ComponentMouseState;
/**
 * returns an animation that can be pipelined after a path, which used canvas isPointInPath to detect if a mouse event has
 * occured over the source animation
 */
function ComponentMouseEventHandler(events) {
    return canvas.create().draw(function () {
        var mouseIsOver = false;
        return function (tick) {
            function processSystemMouseEvents(sourceEvents, componentEventStream) {
                sourceEvents.forEach(function (evt) {
                    if (componentEventStream.hasObservers() && tick.ctx.isPointInPath(evt[0], evt[1])) {
                        // we have to figure out the global position of this component, so the x and y
                        // have to go backward through the transform matrix
                        var localEvent = new AxMouseEvent(events.source, canvas2AnimationUsingContext(evt, tick.ctx), evt);
                        componentEventStream.onNext(localEvent);
                    }
                });
            }
            function processSystemMouseMoveEvents(sourceMoveEvents, mousemoveStream, mouseenterStream, mouseleaveStream) {
                sourceMoveEvents.forEach(function (evt) {
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
                });
            }
            processSystemMouseEvents(tick.events.mousedowns, events.mousedown);
            processSystemMouseEvents(tick.events.mouseups, events.mouseup);
            processSystemMouseMoveEvents(tick.events.mousemoves, events.mousemove, events.mouseenter, events.mouseleave);
        };
    });
}
exports.ComponentMouseEventHandler = ComponentMouseEventHandler;
/**
 * returns an animation that can be pipelined anywhere, which listens for global mouse events over the entire canvas
 * AxMouseEvent raised globally have a null source field, and identical global and local coordinates
 */
function CanvasMouseEventHandler(events) {
    return canvas.create().draw(function () {
        return function (tick) {
            function processSystemMouseEvents(sourceEvents, componentEventStream) {
                sourceEvents.forEach(function (evt) {
                    if (componentEventStream.hasObservers()) {
                        componentEventStream.onNext(new AxMouseEvent(null, evt, evt));
                    }
                });
            }
            processSystemMouseEvents(tick.events.mousedowns, events.mousedown);
            processSystemMouseEvents(tick.events.mouseups, events.mouseup);
            processSystemMouseEvents(tick.events.mousemoves, events.mousemove);
            processSystemMouseEvents(tick.events.mouseenters, events.mouseenter);
            processSystemMouseEvents(tick.events.mouseleaves, events.mouseleave);
        };
    });
}
exports.CanvasMouseEventHandler = CanvasMouseEventHandler;
var AxMouseEvent = (function () {
    function AxMouseEvent(source, animationCoord, canvasCoord) {
        this.source = source;
        this.animationCoord = animationCoord;
        this.canvasCoord = canvasCoord;
    }
    return AxMouseEvent;
})();
exports.AxMouseEvent = AxMouseEvent;
