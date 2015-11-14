/// <reference path="../types/ctx-get-transform.d.ts" />
var Rx = require("rx");
var Ax = require("./animaxe.ts");
var Parameter = require("./parameter.ts");
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
    //onmouseover: Ax.Point[] = []; to implement these we need to think about heirarchy in components
    //onmouseout: Ax.Point[] = [];
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
        return Parameter.updateFrom(false, toggle);
    };
    ComponentMouseState.prototype.isMouseDown = function () {
        var mouseDown = Rx.Observable.merge([
            this.mousedown.map(function (x) { return true; }),
            this.mouseup.map(function (x) { return false; }),
            this.mouseleave.map(function (x) { return false; })]);
        return Parameter.updateFrom(false, mouseDown);
    };
    return ComponentMouseState;
})();
exports.ComponentMouseState = ComponentMouseState;
/**
 * returns an animation that can be pipelined after a path, which used canvas isPointInPath to detect if a mouse event has
 * occured over the source animation
 */
function ComponentMouseEventHandler(events) {
    return Ax.draw(function () {
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
    return Ax.draw(function () {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50cy50cyJdLCJuYW1lcyI6WyJhbmltYXRpb24yQ2FudmFzIiwiY2FudmFzMkFuaW1hdGlvbiIsImNhbnZhczJBbmltYXRpb25Vc2luZ0NvbnRleHQiLCJFdmVudHMiLCJFdmVudHMuY29uc3RydWN0b3IiLCJFdmVudHMuY2xlYXIiLCJDb21wb25lbnRNb3VzZVN0YXRlIiwiQ29tcG9uZW50TW91c2VTdGF0ZS5jb25zdHJ1Y3RvciIsIkNvbXBvbmVudE1vdXNlU3RhdGUuaXNNb3VzZU92ZXIiLCJDb21wb25lbnRNb3VzZVN0YXRlLmlzTW91c2VEb3duIiwiQ29tcG9uZW50TW91c2VFdmVudEhhbmRsZXIiLCJDb21wb25lbnRNb3VzZUV2ZW50SGFuZGxlci5wcm9jZXNzU3lzdGVtTW91c2VFdmVudHMiLCJDb21wb25lbnRNb3VzZUV2ZW50SGFuZGxlci5wcm9jZXNzU3lzdGVtTW91c2VNb3ZlRXZlbnRzIiwiQ2FudmFzTW91c2VFdmVudEhhbmRsZXIiLCJDYW52YXNNb3VzZUV2ZW50SGFuZGxlci5wcm9jZXNzU3lzdGVtTW91c2VFdmVudHMiLCJBeE1vdXNlRXZlbnQiLCJBeE1vdXNlRXZlbnQuY29uc3RydWN0b3IiXSwibWFwcGluZ3MiOiJBQUFBLHdEQUF3RDtBQUV4RCxJQUFZLEVBQUUsV0FBTSxJQUFJLENBQUMsQ0FBQTtBQUN6QixJQUFZLEVBQUUsV0FBTSxjQUFjLENBQUMsQ0FBQTtBQUNuQyxJQUFZLFNBQVMsV0FBTSxnQkFBZ0IsQ0FBQyxDQUFBO0FBSTVDOzs7Ozs7R0FNRztBQUNILDBCQUFrQyxNQUFnQixFQUFDLENBQVEsRUFBRSxDQUFRLEVBQUMsQ0FBUSxFQUFDLENBQVEsRUFBQyxDQUFRLEVBQUMsQ0FBUTtJQUNyR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7SUFDdENB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LFNBQVNBLENBQUNBLENBQUNBO1lBQ25FQSx3QkFBd0JBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFFBQVFBLEVBQUVBLE1BQU1BLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO1lBQy9EQSx3QkFBd0JBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQVVBLEVBQUVBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLENBQUNBO1lBQ25FQSx3QkFBd0JBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLEVBQUVBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO1lBQ3JFQSx3QkFBd0JBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFdBQVdBLEVBQUVBLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO1FBQ3pFQSxDQUFDQSxDQUFBQTtJQUNMQSxDQUFDQSxDQUNKQSxDQUFBQTtBQUNMQSxDQUFDQTtBQXpCZSwrQkFBdUIsMEJBeUJ0QyxDQUFBO0FBRUQ7SUFDSUUsc0JBQW1CQSxNQUFXQSxFQUFTQSxjQUF3QkEsRUFBU0EsV0FBcUJBO1FBQTFFQyxXQUFNQSxHQUFOQSxNQUFNQSxDQUFLQTtRQUFTQSxtQkFBY0EsR0FBZEEsY0FBY0EsQ0FBVUE7UUFBU0EsZ0JBQVdBLEdBQVhBLFdBQVdBLENBQVVBO0lBQUdBLENBQUNBO0lBQ3JHRCxtQkFBQ0E7QUFBREEsQ0FGQSxBQUVDQSxJQUFBO0FBRlksb0JBQVksZUFFeEIsQ0FBQSIsImZpbGUiOiJldmVudHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvY3R4LWdldC10cmFuc2Zvcm0uZC50c1wiIC8+XG5cbmltcG9ydCAqIGFzIFJ4IGZyb20gXCJyeFwiO1xuaW1wb3J0ICogYXMgQXggZnJvbSBcIi4vYW5pbWF4ZS50c1wiO1xuaW1wb3J0ICogYXMgUGFyYW1ldGVyIGZyb20gXCIuL3BhcmFtZXRlci50c1wiO1xuXG5leHBvcnQgdHlwZSBTeXN0ZW1Nb3VzZUV2ZW50cyA9IEF4LlBvaW50W107XG5cbi8qKlxuICogQ29udmVydCBhbmltYXRpb24gY29vcmRpbmF0ZXMgKGUuZy4gYSBjb29yZGluYXRlIG9mIG1vdmVUbykgdG8gZ2xvYmFsIGNhbnZhcyBjb29yZGluYXRlcywgY29vZWZmZWNpZW50cyBhcmU6XG4gKiBbIGEgYyBlXG4gKiAgIGIgZCBmXG4gKiAgIDAgMCAxIF1cbiAqIFRoaXMgaXMgYmFzaWNhbGx5IGp1c3QgYSBtYXRyaXggbXVsdGlwbGljYXRpb24gb2YgdGhlIGNvbnRleHQudHJhbnNmb3JtXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbmltYXRpb24yQ2FudmFzIChjYW52YXM6IEF4LlBvaW50LGE6bnVtYmVyLCBiOm51bWJlcixjOm51bWJlcixkOm51bWJlcixlOm51bWJlcixmOm51bWJlcik6IEF4LlBvaW50IHtcbiAgICB2YXIgeCA9IGEqY2FudmFzWzBdICsgYypjYW52YXNbMV0gKyBlO1xuICAgIHZhciB5ID0gYipjYW52YXNbMF0gKyBkKmNhbnZhc1sxXSArIGY7XG4gICAgcmV0dXJuIFt4LHldO1xufVxuLyoqXG4gKiBDb252ZXJ0IGNhbnZhcyBjb29yZGluYXRlcyAoZS5nLiBtb3VzZSBwb3NpdGlvbiBvbiBjYW52YXMpIHRvIGxvY2FsIGFuaW1hdGlvbiBjb29yZGluYXRlcywgY29vZWZmZWNpZW50cyBhcmU6XG4gKiBbIGEgYyBlXG4gKiAgIGIgZCBmXG4gKiAgIDAgMCAxIF1cbiAqICBUaGlzIGlzIGJhc2ljYWxseSBqdXN0IGFuIGludmVyc2UgbWF0cml4IG11bHRpcGxpY2F0aW9uIG9mIHRoZSBjb250ZXh0LnRyYW5zZm9ybVxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FudmFzMkFuaW1hdGlvbiAoY2FudmFzQ29vcmQ6IEF4LlBvaW50LGE6bnVtYmVyLCBiOm51bWJlcixjOm51bWJlcixkOm51bWJlcixlOm51bWJlcixmOm51bWJlcik6IEF4LlBvaW50IHtcbiAgICAvLyBzZWUgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDg5MjI2Ny9odG1sNS1jYW52YXMtdHJhbnNmb3JtYXRpb24tYWxnb3JpdGhtLWZpbmRpbmctb2JqZWN0LWNvb3JkaW5hdGVzLWFmdGVyLWFwcGx5aW5cbiAgICB2YXIgTSA9IChhKmQgLSBiKmMpO1xuICAgIHJldHVybiBhbmltYXRpb24yQ2FudmFzKGNhbnZhc0Nvb3JkLCBkL00sIC1iL00sIC1jL00sIGEvTSwgKGMqZiAtIGQqZSkvTSwgKGIqZSAtIGEqZikvTSlcbn1cblxuZnVuY3Rpb24gY2FudmFzMkFuaW1hdGlvblVzaW5nQ29udGV4dCAoY2FudmFzQ29vcmQ6IEF4LlBvaW50LCBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCk6IEF4LlBvaW50IHtcbiAgICB2YXIgdHggPSBjdHguZ2V0VHJhbnNmb3JtKCk7XG4gICAgcmV0dXJuIGNhbnZhczJBbmltYXRpb24oY2FudmFzQ29vcmQsIHR4WzBdLCB0eFsxXSwgdHhbM10sIHR4WzRdLCB0eFs2XSwgdHhbN10pXG59XG4vKipcbiAqIE9iamVjdHMgb2YgdGhpcyB0eXBlIGFyZSBwYXNzZWQgdGhyb3VnaCB0aGUgdGljayBwaXBlbGluZSwgYW5kIGVuY2Fwc3VsYXRlIHBvdGVudGlhbGx5IG1hbnkgY29uY3VycmVudCBzeXN0ZW0gZXZlbnRzXG4gKiBvcmlnaW5hdGluZyBmcm9tIHRoZSBjYW52YXMgRE9NLiBUaGVzZSBoYXZlIHRvIGJlIGludGVwcmV0ZWQgYnkgVUkgY29tcG9uZW50cyB0byBzZWUgaWYgdGhleSBoaXRcbiAqL1xuZXhwb3J0IGNsYXNzIEV2ZW50cyB7XG4gICAgbW91c2Vkb3duczogU3lzdGVtTW91c2VFdmVudHMgPSBbXTtcbiAgICBtb3VzZXVwczogICBTeXN0ZW1Nb3VzZUV2ZW50cyA9IFtdO1xuICAgIG1vdXNlbW92ZXM6IFN5c3RlbU1vdXNlRXZlbnRzID0gW107XG4gICAgbW91c2VlbnRlcnM6IFN5c3RlbU1vdXNlRXZlbnRzID0gW107XG4gICAgbW91c2VsZWF2ZXM6IFN5c3RlbU1vdXNlRXZlbnRzID0gW107XG4gICAgLy9vbm1vdXNlb3ZlcjogQXguUG9pbnRbXSA9IFtdOyB0byBpbXBsZW1lbnQgdGhlc2Ugd2UgbmVlZCB0byB0aGluayBhYm91dCBoZWlyYXJjaHkgaW4gY29tcG9uZW50c1xuICAgIC8vb25tb3VzZW91dDogQXguUG9pbnRbXSA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogY2xlYXIgYWxsIHRoZSBldmVudHMsIGRvbmUgYnkgYW5pbWF0b3IgYXQgdGhlIGVuZCBvZiBhIHRpY2tcbiAgICAgKi9cbiAgICBjbGVhcigpIHtcbiAgICAgICAgdGhpcy5tb3VzZWRvd25zID0gW107XG4gICAgICAgIHRoaXMubW91c2V1cHMgICA9IFtdO1xuICAgICAgICB0aGlzLm1vdXNlbW92ZXMgPSBbXTtcbiAgICAgICAgdGhpcy5tb3VzZWVudGVycyA9IFtdO1xuICAgICAgICB0aGlzLm1vdXNlbGVhdmVzID0gW107XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50TW91c2VTdGF0ZSB7XG4gICAgbW91c2Vkb3duICAgID0gbmV3IFJ4LlN1YmplY3Q8QXhNb3VzZUV2ZW50PigpO1xuICAgIG1vdXNldXAgICAgICA9IG5ldyBSeC5TdWJqZWN0PEF4TW91c2VFdmVudD4oKTtcbiAgICBtb3VzZW1vdmUgICAgPSBuZXcgUnguU3ViamVjdDxBeE1vdXNlRXZlbnQ+KCk7XG4gICAgbW91c2VlbnRlciAgID0gbmV3IFJ4LlN1YmplY3Q8QXhNb3VzZUV2ZW50PigpO1xuICAgIG1vdXNlbGVhdmUgICA9IG5ldyBSeC5TdWJqZWN0PEF4TW91c2VFdmVudD4oKTtcblxuICAgIC8qKlxuICAgICAqIFRoaXMgbmVlZHMgdG8gYmUgc2V0IGFmdGVyIGNvbnN0cnVjdGlvblxuICAgICAqL1xuICAgIHNvdXJjZTogYW55O1xuXG4gICAgaXNNb3VzZU92ZXIoKTogQXguUGFyYW1ldGVyPGJvb2xlYW4+IHtcbiAgICAgICAgdmFyIHRvZ2dsZTogUnguT2JzZXJ2YWJsZTxib29sZWFuPiA9XG4gICAgICAgICAgICBSeC5PYnNlcnZhYmxlLm1lcmdlKFtcbiAgICAgICAgICAgICAgICB0aGlzLm1vdXNlZW50ZXIubWFwKCh4KSA9PiB0cnVlKSxcbiAgICAgICAgICAgICAgICB0aGlzLm1vdXNlbGVhdmUubWFwKCh4KSA9PiBmYWxzZSldKTtcbiAgICAgICAgcmV0dXJuIFBhcmFtZXRlci51cGRhdGVGcm9tKGZhbHNlLCB0b2dnbGUpO1xuICAgIH1cblxuICAgIGlzTW91c2VEb3duKCk6IEF4LlBhcmFtZXRlcjxib29sZWFuPiB7XG4gICAgICAgIHZhciBtb3VzZURvd246IFJ4Lk9ic2VydmFibGU8Ym9vbGVhbj4gPVxuICAgICAgICAgICAgUnguT2JzZXJ2YWJsZS5tZXJnZShbXG4gICAgICAgICAgICAgICAgdGhpcy5tb3VzZWRvd24ubWFwKCh4KSAgPT4gdHJ1ZSksXG4gICAgICAgICAgICAgICAgdGhpcy5tb3VzZXVwLm1hcCgoeCkgICAgPT4gZmFsc2UpLFxuICAgICAgICAgICAgICAgIHRoaXMubW91c2VsZWF2ZS5tYXAoKHgpID0+IGZhbHNlKV0pO1xuICAgICAgICByZXR1cm4gUGFyYW1ldGVyLnVwZGF0ZUZyb20oZmFsc2UsIG1vdXNlRG93bik7XG4gICAgfVxufVxuXG4vKipcbiAqIHJldHVybnMgYW4gYW5pbWF0aW9uIHRoYXQgY2FuIGJlIHBpcGVsaW5lZCBhZnRlciBhIHBhdGgsIHdoaWNoIHVzZWQgY2FudmFzIGlzUG9pbnRJblBhdGggdG8gZGV0ZWN0IGlmIGEgbW91c2UgZXZlbnQgaGFzXG4gKiBvY2N1cmVkIG92ZXIgdGhlIHNvdXJjZSBhbmltYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIENvbXBvbmVudE1vdXNlRXZlbnRIYW5kbGVyKGV2ZW50czogQ29tcG9uZW50TW91c2VTdGF0ZSk6IEF4LkFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIEF4LmRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHZhciBtb3VzZUlzT3ZlciA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuICh0aWNrOiBBeC5UaWNrKSA9PiB7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gcHJvY2Vzc1N5c3RlbU1vdXNlRXZlbnRzKFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VFdmVudHM6IFN5c3RlbU1vdXNlRXZlbnRzLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRFdmVudFN0cmVhbTogUnguU3ViamVjdDxBeE1vdXNlRXZlbnQ+XG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZUV2ZW50cy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgKGV2dDogQXguUG9pbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50RXZlbnRTdHJlYW0uaGFzT2JzZXJ2ZXJzKCkgJiYgdGljay5jdHguaXNQb2ludEluUGF0aChldnRbMF0sIGV2dFsxXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UgaGF2ZSB0byBmaWd1cmUgb3V0IHRoZSBnbG9iYWwgcG9zaXRpb24gb2YgdGhpcyBjb21wb25lbnQsIHNvIHRoZSB4IGFuZCB5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGhhdmUgdG8gZ28gYmFja3dhcmQgdGhyb3VnaCB0aGUgdHJhbnNmb3JtIG1hdHJpeFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbG9jYWxFdmVudCA9IG5ldyBBeE1vdXNlRXZlbnQoZXZlbnRzLnNvdXJjZSwgY2FudmFzMkFuaW1hdGlvblVzaW5nQ29udGV4dChldnQsIHRpY2suY3R4KSwgZXZ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50RXZlbnRTdHJlYW0ub25OZXh0KGxvY2FsRXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHByb2Nlc3NTeXN0ZW1Nb3VzZU1vdmVFdmVudHMoXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZU1vdmVFdmVudHM6IFN5c3RlbU1vdXNlRXZlbnRzLFxuICAgICAgICAgICAgICAgICAgICBtb3VzZW1vdmVTdHJlYW06IFJ4LlN1YmplY3Q8QXhNb3VzZUV2ZW50PixcbiAgICAgICAgICAgICAgICAgICAgbW91c2VlbnRlclN0cmVhbTogUnguU3ViamVjdDxBeE1vdXNlRXZlbnQ+LFxuICAgICAgICAgICAgICAgICAgICBtb3VzZWxlYXZlU3RyZWFtOiBSeC5TdWJqZWN0PEF4TW91c2VFdmVudD5cbiAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgc291cmNlTW92ZUV2ZW50cy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgKGV2dDogQXguUG9pbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobW91c2Vtb3ZlU3RyZWFtLmhhc09ic2VydmVycygpIHx8IG1vdXNlZW50ZXJTdHJlYW0uaGFzT2JzZXJ2ZXJzKCkgfHwgbW91c2VsZWF2ZVN0cmVhbS5oYXNPYnNlcnZlcnMoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcG9pbnRJblBhdGggPSB0aWNrLmN0eC5pc1BvaW50SW5QYXRoKGV2dFswXSwgZXZ0WzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvY2FsRXZlbnQgPSBuZXcgQXhNb3VzZUV2ZW50KGV2ZW50cy5zb3VyY2UsIGNhbnZhczJBbmltYXRpb25Vc2luZ0NvbnRleHQoZXZ0LCB0aWNrLmN0eCksIGV2dCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1vdXNlZW50ZXJTdHJlYW0uaGFzT2JzZXJ2ZXJzKCkgJiYgcG9pbnRJblBhdGggJiYgIW1vdXNlSXNPdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb3VzZWVudGVyU3RyZWFtLm9uTmV4dChsb2NhbEV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobW91c2Vtb3ZlU3RyZWFtLmhhc09ic2VydmVycygpICYmIHBvaW50SW5QYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb3VzZW1vdmVTdHJlYW0ub25OZXh0KGxvY2FsRXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1vdXNlbGVhdmVTdHJlYW0uaGFzT2JzZXJ2ZXJzKCkgJiYgIXBvaW50SW5QYXRoICYmIG1vdXNlSXNPdmVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb3VzZWxlYXZlU3RyZWFtLm9uTmV4dChsb2NhbEV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vdXNlSXNPdmVyID0gcG9pbnRJblBhdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcHJvY2Vzc1N5c3RlbU1vdXNlRXZlbnRzKHRpY2suZXZlbnRzLm1vdXNlZG93bnMsIGV2ZW50cy5tb3VzZWRvd24pO1xuICAgICAgICAgICAgICAgIHByb2Nlc3NTeXN0ZW1Nb3VzZUV2ZW50cyh0aWNrLmV2ZW50cy5tb3VzZXVwcywgZXZlbnRzLm1vdXNldXApO1xuICAgICAgICAgICAgICAgIHByb2Nlc3NTeXN0ZW1Nb3VzZU1vdmVFdmVudHModGljay5ldmVudHMubW91c2Vtb3ZlcywgZXZlbnRzLm1vdXNlbW92ZSwgZXZlbnRzLm1vdXNlZW50ZXIsIGV2ZW50cy5tb3VzZWxlYXZlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIClcbn1cblxuLyoqXG4gKiByZXR1cm5zIGFuIGFuaW1hdGlvbiB0aGF0IGNhbiBiZSBwaXBlbGluZWQgYW55d2hlcmUsIHdoaWNoIGxpc3RlbnMgZm9yIGdsb2JhbCBtb3VzZSBldmVudHMgb3ZlciB0aGUgZW50aXJlIGNhbnZhc1xuICogQXhNb3VzZUV2ZW50IHJhaXNlZCBnbG9iYWxseSBoYXZlIGEgbnVsbCBzb3VyY2UgZmllbGQsIGFuZCBpZGVudGljYWwgZ2xvYmFsIGFuZCBsb2NhbCBjb29yZGluYXRlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gQ2FudmFzTW91c2VFdmVudEhhbmRsZXIoZXZlbnRzOiBDb21wb25lbnRNb3VzZVN0YXRlKTogQXguQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gQXguZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuICh0aWNrOiBBeC5UaWNrKSA9PiB7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gcHJvY2Vzc1N5c3RlbU1vdXNlRXZlbnRzKFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2VFdmVudHM6IFN5c3RlbU1vdXNlRXZlbnRzLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRFdmVudFN0cmVhbTogUnguU3ViamVjdDxBeE1vdXNlRXZlbnQ+XG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZUV2ZW50cy5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgKGV2dDogQXguUG9pbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50RXZlbnRTdHJlYW0uaGFzT2JzZXJ2ZXJzKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50RXZlbnRTdHJlYW0ub25OZXh0KG5ldyBBeE1vdXNlRXZlbnQobnVsbCwgZXZ0LCBldnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBwcm9jZXNzU3lzdGVtTW91c2VFdmVudHModGljay5ldmVudHMubW91c2Vkb3ducywgZXZlbnRzLm1vdXNlZG93bik7XG4gICAgICAgICAgICAgICAgcHJvY2Vzc1N5c3RlbU1vdXNlRXZlbnRzKHRpY2suZXZlbnRzLm1vdXNldXBzLCBldmVudHMubW91c2V1cCk7XG4gICAgICAgICAgICAgICAgcHJvY2Vzc1N5c3RlbU1vdXNlRXZlbnRzKHRpY2suZXZlbnRzLm1vdXNlbW92ZXMsIGV2ZW50cy5tb3VzZW1vdmUpO1xuICAgICAgICAgICAgICAgIHByb2Nlc3NTeXN0ZW1Nb3VzZUV2ZW50cyh0aWNrLmV2ZW50cy5tb3VzZWVudGVycywgZXZlbnRzLm1vdXNlZW50ZXIpO1xuICAgICAgICAgICAgICAgIHByb2Nlc3NTeXN0ZW1Nb3VzZUV2ZW50cyh0aWNrLmV2ZW50cy5tb3VzZWxlYXZlcywgZXZlbnRzLm1vdXNlbGVhdmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKVxufVxuXG5leHBvcnQgY2xhc3MgQXhNb3VzZUV2ZW50IHtcbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgc291cmNlOiBhbnksIHB1YmxpYyBhbmltYXRpb25Db29yZDogQXguUG9pbnQsIHB1YmxpYyBjYW52YXNDb29yZDogQXguUG9pbnQpIHt9XG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
