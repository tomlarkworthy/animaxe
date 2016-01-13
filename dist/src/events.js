/// <reference path="../types/ctx-get-transform.d.ts" />
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var Rx = require("rx");
var canvas = require("./canvas");
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
    return canvas.create().affect(function () {
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
    return canvas.create().affect(function () {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9ldmVudHMudHMiXSwibmFtZXMiOlsiYW5pbWF0aW9uMkNhbnZhcyIsImNhbnZhczJBbmltYXRpb24iLCJjYW52YXMyQW5pbWF0aW9uVXNpbmdDb250ZXh0IiwiRXZlbnRzIiwiRXZlbnRzLmNvbnN0cnVjdG9yIiwiRXZlbnRzLmNsZWFyIiwiQ29tcG9uZW50TW91c2VTdGF0ZSIsIkNvbXBvbmVudE1vdXNlU3RhdGUuY29uc3RydWN0b3IiLCJDb21wb25lbnRNb3VzZVN0YXRlLmlzTW91c2VPdmVyIiwiQ29tcG9uZW50TW91c2VTdGF0ZS5pc01vdXNlRG93biIsIkNvbXBvbmVudE1vdXNlRXZlbnRIYW5kbGVyIiwiQ29tcG9uZW50TW91c2VFdmVudEhhbmRsZXIucHJvY2Vzc1N5c3RlbU1vdXNlRXZlbnRzIiwiQ29tcG9uZW50TW91c2VFdmVudEhhbmRsZXIucHJvY2Vzc1N5c3RlbU1vdXNlTW92ZUV2ZW50cyIsIkNhbnZhc01vdXNlRXZlbnRIYW5kbGVyIiwiQ2FudmFzTW91c2VFdmVudEhhbmRsZXIucHJvY2Vzc1N5c3RlbU1vdXNlRXZlbnRzIiwiQXhNb3VzZUV2ZW50IiwiQXhNb3VzZUV2ZW50LmNvbnN0cnVjdG9yIl0sIm1hcHBpbmdzIjoiQUFBQSx3REFBd0Q7Ozs7QUFFeEQsSUFBWSxFQUFFLFdBQU0sSUFDcEIsQ0FBQyxDQUR1QjtBQUd4QixJQUFZLE1BQU0sV0FBTSxVQUN4QixDQUFDLENBRGlDO0FBQ2xDLElBQVksU0FBUyxXQUFNLGFBQzNCLENBQUMsQ0FEdUM7QUFDeEMsaUJBQWMsU0FFZCxDQUFDLEVBRnNCO0FBSXZCOzs7Ozs7R0FNRztBQUNILDBCQUFrQyxNQUFtQixFQUFDLENBQVEsRUFBRSxDQUFRLEVBQUMsQ0FBUSxFQUFDLENBQVEsRUFBQyxDQUFRLEVBQUMsQ0FBUTtJQUN4R0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsTUFBTUEsQ0FB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QUE7WUFDTEEsQ0FBQ0E7WUFFREQsd0JBQXdCQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUNuRUEsd0JBQXdCQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxNQUFNQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtZQUMvREEsd0JBQXdCQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUNuRUEsd0JBQXdCQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxFQUFFQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtZQUNyRUEsd0JBQXdCQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxFQUFFQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtRQUN6RUEsQ0FBQ0EsQ0FBQUE7SUFDTEEsQ0FBQ0EsQ0FDSkEsQ0FBQUE7QUFDTEEsQ0FBQ0E7QUF6QmUsK0JBQXVCLDBCQXlCdEMsQ0FBQTtBQUVEO0lBQ0lFLHNCQUFtQkEsTUFBV0EsRUFBU0EsY0FBMkJBLEVBQVNBLFdBQXdCQTtRQUFoRkMsV0FBTUEsR0FBTkEsTUFBTUEsQ0FBS0E7UUFBU0EsbUJBQWNBLEdBQWRBLGNBQWNBLENBQWFBO1FBQVNBLGdCQUFXQSxHQUFYQSxXQUFXQSxDQUFhQTtJQUFHQSxDQUFDQTtJQUMzR0QsbUJBQUNBO0FBQURBLENBRkEsQUFFQ0EsSUFBQTtBQUZZLG9CQUFZLGVBRXhCLENBQUEiLCJmaWxlIjoic3JjL2V2ZW50cy5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
