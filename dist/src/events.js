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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9ldmVudHMudHMiXSwibmFtZXMiOlsiYW5pbWF0aW9uMkNhbnZhcyIsImNhbnZhczJBbmltYXRpb24iLCJjYW52YXMyQW5pbWF0aW9uVXNpbmdDb250ZXh0IiwiRXZlbnRzIiwiRXZlbnRzLmNvbnN0cnVjdG9yIiwiRXZlbnRzLmNsZWFyIiwiQ29tcG9uZW50TW91c2VTdGF0ZSIsIkNvbXBvbmVudE1vdXNlU3RhdGUuY29uc3RydWN0b3IiLCJDb21wb25lbnRNb3VzZVN0YXRlLmlzTW91c2VPdmVyIiwiQ29tcG9uZW50TW91c2VTdGF0ZS5pc01vdXNlRG93biIsIkNvbXBvbmVudE1vdXNlRXZlbnRIYW5kbGVyIiwiQ29tcG9uZW50TW91c2VFdmVudEhhbmRsZXIucHJvY2Vzc1N5c3RlbU1vdXNlRXZlbnRzIiwiQ29tcG9uZW50TW91c2VFdmVudEhhbmRsZXIucHJvY2Vzc1N5c3RlbU1vdXNlTW92ZUV2ZW50cyIsIkNhbnZhc01vdXNlRXZlbnRIYW5kbGVyIiwiQ2FudmFzTW91c2VFdmVudEhhbmRsZXIucHJvY2Vzc1N5c3RlbU1vdXNlRXZlbnRzIiwiQXhNb3VzZUV2ZW50IiwiQXhNb3VzZUV2ZW50LmNvbnN0cnVjdG9yIl0sIm1hcHBpbmdzIjoiQUFBQSx3REFBd0Q7Ozs7QUFFeEQsSUFBWSxFQUFFLFdBQU0sSUFDcEIsQ0FBQyxDQUR1QjtBQUd4QixJQUFZLE1BQU0sV0FBTSxtQkFDeEIsQ0FBQyxDQUQwQztBQUMzQyxJQUFZLFNBQVMsV0FBTSxhQUMzQixDQUFDLENBRHVDO0FBQ3hDLGlCQUFjLFNBRWQsQ0FBQyxFQUZzQjtBQUl2Qjs7Ozs7O0dBTUc7QUFDSCwwQkFBa0MsTUFBbUIsRUFBQyxDQUFRLEVBQUUsQ0FBUSxFQUFDLENBQVEsRUFBQyxDQUFRLEVBQUMsQ0FBUSxFQUFDLENBQVE7SUFDeEdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUNBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO0lBQ3RDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtJQUN0Q0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDakJBLENBQUNBO0FBSmUsd0JBQWdCLG1CQUkvQixDQUFBO0FBQ0Q7Ozs7OztHQU1HO0FBQ0gsMEJBQWtDLFdBQXdCLEVBQUMsQ0FBUSxFQUFFLENBQVEsRUFBQyxDQUFRLEVBQUMsQ0FBUSxFQUFDLENBQVEsRUFBQyxDQUFRO0lBQzdHQyxpSUFBaUlBO0lBQ2pJQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNwQkEsTUFBTUEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxXQUFXQSxFQUFFQSxDQUFDQSxHQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQSxHQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQSxHQUFDQSxDQUFDQSxDQUFDQSxDQUFBQTtBQUM1RkEsQ0FBQ0E7QUFKZSx3QkFBZ0IsbUJBSS9CLENBQUE7QUFFRCxzQ0FBdUMsV0FBd0IsRUFBRSxHQUE2QjtJQUMxRkMsSUFBSUEsRUFBRUEsR0FBR0EsR0FBR0EsQ0FBQ0EsWUFBWUEsRUFBRUEsQ0FBQ0E7SUFDNUJBLE1BQU1BLENBQUNBLGdCQUFnQkEsQ0FBQ0EsV0FBV0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQUE7QUFDbEZBLENBQUNBO0FBQ0Q7OztHQUdHO0FBQ0g7SUFBQUM7UUFDSUMsZUFBVUEsR0FBc0JBLEVBQUVBLENBQUNBO1FBQ25DQSxhQUFRQSxHQUF3QkEsRUFBRUEsQ0FBQ0E7UUFDbkNBLGVBQVVBLEdBQXNCQSxFQUFFQSxDQUFDQTtRQUNuQ0EsZ0JBQVdBLEdBQXNCQSxFQUFFQSxDQUFDQTtRQUNwQ0EsZ0JBQVdBLEdBQXNCQSxFQUFFQSxDQUFDQTtJQWN4Q0EsQ0FBQ0E7SUFiR0Qsb0dBQW9HQTtJQUNwR0EsaUNBQWlDQTtJQUVqQ0E7O09BRUdBO0lBQ0hBLHNCQUFLQSxHQUFMQTtRQUNJRSxJQUFJQSxDQUFDQSxVQUFVQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUNyQkEsSUFBSUEsQ0FBQ0EsUUFBUUEsR0FBS0EsRUFBRUEsQ0FBQ0E7UUFDckJBLElBQUlBLENBQUNBLFVBQVVBLEdBQUdBLEVBQUVBLENBQUNBO1FBQ3JCQSxJQUFJQSxDQUFDQSxXQUFXQSxHQUFHQSxFQUFFQSxDQUFDQTtRQUN0QkEsSUFBSUEsQ0FBQ0EsV0FBV0EsR0FBR0EsRUFBRUEsQ0FBQ0E7SUFDMUJBLENBQUNBO0lBQ0xGLGFBQUNBO0FBQURBLENBbkJBLEFBbUJDQSxJQUFBO0FBbkJZLGNBQU0sU0FtQmxCLENBQUE7QUFFRDtJQUFBRztRQUNJQyxjQUFTQSxHQUFNQSxJQUFJQSxFQUFFQSxDQUFDQSxPQUFPQSxFQUFnQkEsQ0FBQ0E7UUFDOUNBLFlBQU9BLEdBQVFBLElBQUlBLEVBQUVBLENBQUNBLE9BQU9BLEVBQWdCQSxDQUFDQTtRQUM5Q0EsY0FBU0EsR0FBTUEsSUFBSUEsRUFBRUEsQ0FBQ0EsT0FBT0EsRUFBZ0JBLENBQUNBO1FBQzlDQSxlQUFVQSxHQUFLQSxJQUFJQSxFQUFFQSxDQUFDQSxPQUFPQSxFQUFnQkEsQ0FBQ0E7UUFDOUNBLGVBQVVBLEdBQUtBLElBQUlBLEVBQUVBLENBQUNBLE9BQU9BLEVBQWdCQSxDQUFDQTtJQXVCbERBLENBQUNBO0lBaEJHRCx5Q0FBV0EsR0FBWEE7UUFDSUUsSUFBSUEsTUFBTUEsR0FDTkEsRUFBRUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7WUFDaEJBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLEdBQUdBLENBQUNBLFVBQUNBLENBQUNBLElBQUtBLE9BQUFBLElBQUlBLEVBQUpBLENBQUlBLENBQUNBO1lBQ2hDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFDQSxDQUFDQSxJQUFLQSxPQUFBQSxLQUFLQSxFQUFMQSxDQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUM1Q0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7SUFDL0NBLENBQUNBO0lBRURGLHlDQUFXQSxHQUFYQTtRQUNJRyxJQUFJQSxTQUFTQSxHQUNUQSxFQUFFQSxDQUFDQSxVQUFVQSxDQUFDQSxLQUFLQSxDQUFDQTtZQUNoQkEsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQ0EsQ0FBQ0EsSUFBTUEsT0FBQUEsSUFBSUEsRUFBSkEsQ0FBSUEsQ0FBQ0E7WUFDaENBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFVBQUNBLENBQUNBLElBQVFBLE9BQUFBLEtBQUtBLEVBQUxBLENBQUtBLENBQUNBO1lBQ2pDQSxJQUFJQSxDQUFDQSxVQUFVQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFDQSxDQUFDQSxJQUFLQSxPQUFBQSxLQUFLQSxFQUFMQSxDQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUM1Q0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsS0FBS0EsRUFBRUEsU0FBU0EsQ0FBQ0EsQ0FBQ0E7SUFDbERBLENBQUNBO0lBQ0xILDBCQUFDQTtBQUFEQSxDQTVCQSxBQTRCQ0EsSUFBQTtBQTVCWSwyQkFBbUIsc0JBNEIvQixDQUFBO0FBRUQ7OztHQUdHO0FBQ0gsb0NBQTJDLE1BQTJCO0lBQ2xFSSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxNQUFNQSxDQUN6QkE7UUFDSUEsSUFBSUEsV0FBV0EsR0FBR0EsS0FBS0EsQ0FBQ0E7UUFDeEJBLE1BQU1BLENBQUNBLFVBQUNBLElBQXVCQTtZQUMzQkEsa0NBQ0lBLFlBQStCQSxFQUMvQkEsb0JBQThDQTtnQkFFOUNDLFlBQVlBLENBQUNBLE9BQU9BLENBQ2hCQSxVQUFDQSxHQUFnQkE7b0JBQ2JBLEVBQUVBLENBQUNBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsWUFBWUEsRUFBRUEsSUFBSUEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2hGQSw4RUFBOEVBO3dCQUM5RUEsbURBQW1EQTt3QkFDbkRBLElBQUlBLFVBQVVBLEdBQUdBLElBQUlBLFlBQVlBLENBQUNBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLDRCQUE0QkEsQ0FBQ0EsR0FBR0EsRUFBRUEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7d0JBQ25HQSxvQkFBb0JBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO29CQUM1Q0EsQ0FBQ0E7Z0JBQ0xBLENBQUNBLENBQ0pBLENBQUFBO1lBQ0xBLENBQUNBO1lBRURELHNDQUNJQSxnQkFBbUNBLEVBQ25DQSxlQUF5Q0EsRUFDekNBLGdCQUEwQ0EsRUFDMUNBLGdCQUEwQ0E7Z0JBRTFDRSxnQkFBZ0JBLENBQUNBLE9BQU9BLENBQ3BCQSxVQUFDQSxHQUFnQkE7b0JBQ2JBLEVBQUVBLENBQUNBLENBQUNBLGVBQWVBLENBQUNBLFlBQVlBLEVBQUVBLElBQUlBLGdCQUFnQkEsQ0FBQ0EsWUFBWUEsRUFBRUEsSUFBSUEsZ0JBQWdCQSxDQUFDQSxZQUFZQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTt3QkFDdkdBLElBQUlBLFdBQVdBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLGFBQWFBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO3dCQUN6REEsSUFBSUEsVUFBVUEsR0FBR0EsSUFBSUEsWUFBWUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsNEJBQTRCQSxDQUFDQSxHQUFHQSxFQUFFQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQTt3QkFFbkdBLEVBQUVBLENBQUNBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsWUFBWUEsRUFBRUEsSUFBSUEsV0FBV0EsSUFBSUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQ2pFQSxnQkFBZ0JBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO3dCQUN4Q0EsQ0FBQ0E7d0JBQ0RBLEVBQUVBLENBQUNBLENBQUNBLGVBQWVBLENBQUNBLFlBQVlBLEVBQUVBLElBQUlBLFdBQVdBLENBQUNBLENBQUNBLENBQUNBOzRCQUNoREEsZUFBZUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3ZDQSxDQUFDQTt3QkFFREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxZQUFZQSxFQUFFQSxJQUFJQSxDQUFDQSxXQUFXQSxJQUFJQSxXQUFXQSxDQUFDQSxDQUFDQSxDQUFDQTs0QkFDakVBLGdCQUFnQkEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7d0JBQ3hDQSxDQUFDQTt3QkFFREEsV0FBV0EsR0FBR0EsV0FBV0EsQ0FBQ0E7b0JBQzlCQSxDQUFDQTtnQkFDTEEsQ0FBQ0EsQ0FDSkEsQ0FBQUE7WUFDTEEsQ0FBQ0E7WUFFREYsd0JBQXdCQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQTtZQUNuRUEsd0JBQXdCQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxRQUFRQSxFQUFFQSxNQUFNQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtZQUMvREEsNEJBQTRCQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxTQUFTQSxFQUFFQSxNQUFNQSxDQUFDQSxVQUFVQSxFQUFFQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtRQUNqSEEsQ0FBQ0EsQ0FBQUE7SUFDTEEsQ0FBQ0EsQ0FDSkEsQ0FBQUE7QUFDTEEsQ0FBQ0E7QUF4RGUsa0NBQTBCLDZCQXdEekMsQ0FBQTtBQUVEOzs7R0FHRztBQUNILGlDQUF3QyxNQUEyQjtJQUMvREcsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsTUFBTUEsQ0FDekJBO1FBQ0lBLE1BQU1BLENBQUNBLFVBQUNBLElBQXVCQTtZQUMzQkEsa0NBQ0lBLFlBQStCQSxFQUMvQkEsb0JBQThDQTtnQkFFOUNDLFlBQVlBLENBQUNBLE9BQU9BLENBQ2hCQSxVQUFDQSxHQUFnQkE7b0JBQ2JBLEVBQUVBLENBQUNBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsWUFBWUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ3RDQSxvQkFBb0JBLENBQUNBLE1BQU1BLENBQUNBLElBQUlBLFlBQVlBLENBQUNBLElBQUlBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO29CQUNsRUEsQ0FBQ0E7Z0JBQ0xBLENBQUNBLENBQ0pBLENBQUFBO1lBQ0xBLENBQUNBO1lBRURELHdCQUF3QkEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsRUFBRUEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDbkVBLHdCQUF3QkEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsRUFBRUEsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7WUFDL0RBLHdCQUF3QkEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsVUFBVUEsRUFBRUEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDbkVBLHdCQUF3QkEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7WUFDckVBLHdCQUF3QkEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7UUFDekVBLENBQUNBLENBQUFBO0lBQ0xBLENBQUNBLENBQ0pBLENBQUFBO0FBQ0xBLENBQUNBO0FBekJlLCtCQUF1QiwwQkF5QnRDLENBQUE7QUFFRDtJQUNJRSxzQkFBbUJBLE1BQVdBLEVBQVNBLGNBQTJCQSxFQUFTQSxXQUF3QkE7UUFBaEZDLFdBQU1BLEdBQU5BLE1BQU1BLENBQUtBO1FBQVNBLG1CQUFjQSxHQUFkQSxjQUFjQSxDQUFhQTtRQUFTQSxnQkFBV0EsR0FBWEEsV0FBV0EsQ0FBYUE7SUFBR0EsQ0FBQ0E7SUFDM0dELG1CQUFDQTtBQUFEQSxDQUZBLEFBRUNBLElBQUE7QUFGWSxvQkFBWSxlQUV4QixDQUFBIiwiZmlsZSI6InNyYy9ldmVudHMuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
