var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
// THIS IS AUTO GENERATED TEST CODE, DO NOT MODIFY DIRECTLY
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
require("should");
var Rx = require("rx");
var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var events = require("../src/events");
var Parameter = require("../src/Parameter");
var animator = helper.getExampleAnimator(100, 100);
// todo
// make add a max and min value
// scale the value
// make the slider impervious to rotation (mouse movement needs to be transformed by transform matrix-1 )
/**
 * A Button is an animation but with extra mouse state attached
 */
var Slider = (function (_super) {
    __extends(Slider, _super);
    function Slider(hotspot, // Babel doesn't like public modifier
        knobMouseState, // Babel doesn't like public modifier
        canvasMouseState, // Babel doesn't like public modifier
        value, onMouseDownKnob, onMouseOverKnob, onIdleKnob) {
        // we build a grand animation pipeline either side of the hot spot,
        // then we use the total pipeline's attach function as the attach function for this animation
        // so the constructed Button exposes a richer API (e.g. state) than a basic animation normally wouldn't
        // todo slider value is not changed relatively
        _super.call(this, Ax.create()
            .pipe(events.CanvasMouseEventHandler(canvasMouseState)) //global mouse listener
            .parallel([
            Ax.create()
                .translate(Parameter.point(0, Parameter.updateFrom(0, value)))
                .if(knobMouseState.isMouseDown(), onMouseDownKnob) // Condition the animation played based on mouse state
                .elif(knobMouseState.isMouseOver(), onMouseOverKnob)
                .else(onIdleKnob)
                .pipe(hotspot)
                .pipe(events.ComponentMouseEventHandler(knobMouseState))
                .fill(),
            Ax.create() //todo, the slider
        ])
            .attach);
        this.hotspot = hotspot;
        this.knobMouseState = knobMouseState;
        this.canvasMouseState = canvasMouseState;
        knobMouseState.source = this;
        this.value = value;
        this.value.subscribe(function (x) { return console.log("slider value changed", x); });
        // a stream of points indicating the start of the slide move, or null if a slide move is not in progress
        var startSlideStream = Rx.Observable.merge([
            knobMouseState.mousedown
                .withLatestFrom(value, function (evt, value) {
                return { eventStart: evt, valueStart: value };
            }),
            canvasMouseState.mouseup.map(function (evt) { return null; })
        ]);
        // a stream of number or null, indicating the new value of the slider, or null to mean no change
        var slideChangeStream = Rx.Observable.combineLatest(startSlideStream, canvasMouseState.mousemove, function (start, current) {
            return start == null ? null : current.canvasCoord[1] - start.eventStart.canvasCoord[1] + start.valueStart;
        }).filter(function (val) { return val != null; });
        // remove the nulls from the stream, and pipe into the value for the slider.
        slideChangeStream.tap(function (v) { return console.log("slider: value", v); }, function (err) { return console.error(err); })
            .subscribe(this.value);
    }
    /**
     * @param postprocessor hook to do things like attach listeners without breaking the animation chaining
     */
    Slider.rectangular = function (value, postprocessor) {
        var hotspot = Ax.create()
            .withinPath(Ax.create()
            .lineTo([20, 0])
            .lineTo([20, 20])
            .lineTo([0, 20])
            .lineTo([0, 0]));
        value.subscribe(function (x) { return console.log("pre construction value changed", x); });
        var slider = new Slider(hotspot, new events.ComponentMouseState(), new events.ComponentMouseState(), value, Ax.create().fillStyle("red"), /* pressed */ Ax.create().fillStyle("orange"), /* over */ Ax.create().fillStyle("white") /* idle */); /* idle */
        if (postprocessor)
            postprocessor(slider);
        return slider;
    };
    return Slider;
})(Ax.Operation);
var value = new Rx.BehaviorSubject(0);
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle(Parameter.rgba(Parameter.updateFrom(0, value).mapValue(function (x) { return x * 2.5; }), 0, 0, 1)).fillRect([0, 0], [100, 100]));
animator.play(Ax.create()
    .pipe(Slider.rectangular(value)));
helper.playExample("example6", 2, animator, 100, 100);
describe('example6', function () {
    it('should match the reference', function (done) {
        helper.sameExample("example6", "example6-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOlsiU2xpZGVyIiwiU2xpZGVyLmNvbnN0cnVjdG9yIiwiU2xpZGVyLnJlY3Rhbmd1bGFyIl0sIm1hcHBpbmdzIjoiOzs7OztBQUFBLDJEQUEyRDtBQUMzRCw2Q0FBNkM7QUFDN0MsNENBQTRDO0FBQzVDLDJDQUEyQztBQUMzQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN4QyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFbEIsSUFBWSxFQUFFLFdBQU0sSUFBSSxDQUFDLENBQUE7QUFDekIsSUFBWSxFQUFFLFdBQU0sZ0JBQWdCLENBQUMsQ0FBQTtBQUNyQyxJQUFZLE1BQU0sV0FBTSxlQUFlLENBQUMsQ0FBQTtBQUN4QyxJQUFZLE1BQU0sV0FBTSxlQUFlLENBQUMsQ0FBQTtBQUN4QyxJQUFZLFNBQVMsV0FBTSxrQkFBa0IsQ0FBQyxDQUFBO0FBRTlDLElBQUksUUFBUSxHQUFnQixNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBR2hFLE9BQU87QUFDUCwrQkFBK0I7QUFDL0Isa0JBQWtCO0FBQ2xCLHlHQUF5RztBQUV6Rzs7R0FFRztBQUNIO0lBQXFCQSwwQkFBWUE7SUFrQzdCQSxnQkFBbUJBLE9BQXlCQSxFQUFFQSxxQ0FBcUNBO1FBQ2hFQSxjQUEwQ0EsRUFBRUEscUNBQXFDQTtRQUNqRkEsZ0JBQTRDQSxFQUFFQSxxQ0FBcUNBO1FBQzFGQSxLQUF5QkEsRUFDekJBLGVBQTZCQSxFQUM3QkEsZUFBNkJBLEVBQzdCQSxVQUF3QkE7UUFFaENDLG1FQUFtRUE7UUFDbkVBLDZGQUE2RkE7UUFDN0ZBLHVHQUF1R0E7UUFDdkdBLDhDQUE4Q0E7UUFDOUNBLGtCQUFNQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQTthQUNaQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSx1QkFBdUJBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsQ0FBQ0Es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LENBQUM7QUFLdEQsUUFBUSxDQUFDLFVBQVUsRUFBRTtJQUNqQixFQUFFLENBQUUsNEJBQTRCLEVBQUUsVUFBUyxJQUFJO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxVQUFTLEtBQUs7WUFDekQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekIsSUFBSSxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiZGlzdC90ZXN0L2V4YW1wbGU2LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVEhJUyBJUyBBVVRPIEdFTkVSQVRFRCBURVNUIENPREUsIERPIE5PVCBNT0RJRlkgRElSRUNUTFlcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9zaG91bGQuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbW9jaGEuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbnJlcXVpcmUoXCJzaG91bGRcIik7XG5cbmltcG9ydCAqIGFzIFJ4IGZyb20gXCJyeFwiO1xuaW1wb3J0ICogYXMgQXggZnJvbSBcIi4uL3NyYy9hbmltYXhlXCI7XG5pbXBvcnQgKiBhcyBoZWxwZXIgZnJvbSBcIi4uL3NyYy9oZWxwZXJcIjtcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tIFwiLi4vc3JjL2V2ZW50c1wiO1xuaW1wb3J0ICogYXMgUGFyYW1ldGVyIGZyb20gXCIuLi9zcmMvUGFyYW1ldGVyXCI7XG5cbnZhciBhbmltYXRvcjogQXguQW5pbWF0b3IgPSBoZWxwZXIuZ2V0RXhhbXBsZUFuaW1hdG9yKDEwMCwgMTAwKTtcblxuXG4vLyB0b2RvXG4vLyBtYWtlIGFkZCBhIG1heCBhbmQgbWluIHZhbHVlXG4vLyBzY2FsZSB0aGUgdmFsdWVcbi8vIG1ha2UgdGhlIHNsaWRlciBpbXBlcnZpb3VzIHRvIHJvdGF0aW9uIChtb3VzZSBtb3ZlbWVudCBuZWVkcyB0byBiZSB0cmFuc2Zvcm1lZCBieSB0cmFuc2Zvcm0gbWF0cml4LTEgKVxuXG4vKipcbiAqIEEgQnV0dG9uIGlzIGFuIGFuaW1hdGlvbiBidXQgd2l0aCBleHRyYSBtb3VzZSBzdGF0ZSBhdHRhY2hlZFxuICovXG5jbGFzcyBTbGlkZXIgZXh0ZW5kcyBBeC5PcGVyYXRpb24ge1xuICAgIHZhbHVlOiBSeC5TdWJqZWN0PG51bWJlcj47XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0gcG9zdHByb2Nlc3NvciBob29rIHRvIGRvIHRoaW5ncyBsaWtlIGF0dGFjaCBsaXN0ZW5lcnMgd2l0aG91dCBicmVha2luZyB0aGUgYW5pbWF0aW9uIGNoYWluaW5nXG4gICAgICovXG4gICAgc3RhdGljIHJlY3Rhbmd1bGFyKHZhbHVlOiBSeC5CZWhhdmlvclN1YmplY3Q8bnVtYmVyPiwgcG9zdHByb2Nlc3NvciA/OiAoQnV0dG9uKSA9PiB2b2lkKTogU2xpZGVyIHsgLy8gbm90ZSBCYWJlbCBkb2Vzbid0IGxpa2UgdGhpcyB0eXBlXG4gICAgICAgIHZhciBob3RzcG90ID0gQXguY3JlYXRlKClcbiAgICAgICAgICAgIC53aXRoaW5QYXRoKEF4LmNyZWF0ZSgpXG4gICAgICAgICAgICAgICAgLmxpbmVUbyhbIDIwLCAgMF0pXG4gICAgICAgICAgICAgICAgLmxpbmVUbyhbIDIwLCAyMF0pXG4gICAgICAgICAgICAgICAgLmxpbmVUbyhbICAwLCAyMF0pXG4gICAgICAgICAgICAgICAgLmxpbmVUbyhbICAwLCAgMF0pXG4gICAgICAgICAgICApO1xuXG5cbiAgICAgICAgdmFsdWUuc3Vic2NyaWJlKHggPT4gY29uc29sZS5sb2coXCJwcmUgY29uc3RydWN0aW9uIHZhbHVlIGNoYW5nZWRcIiwgeCkpO1xuXG4gICAgICAgIHZhciBzbGlkZXIgPSBuZXcgU2xpZGVyKFxuICAgICAgICAgICAgaG90c3BvdCxcbiAgICAgICAgICAgIG5ldyBldmVudHMuQ29tcG9uZW50TW91c2VTdGF0ZSgpLFxuICAgICAgICAgICAgbmV3IGV2ZW50cy5Db21wb25lbnRNb3VzZVN0YXRlKCksXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgICAgIEF4LmNyZWF0ZSgpLmZpbGxTdHlsZShcInJlZFwiKSwgICAgLyogcHJlc3NlZCAqL1xuICAgICAgICAgICAgQXguY3JlYXRlKCkuZmlsbFN0eWxlKFwib3JhbmdlXCIpLCAvKiBvdmVyICovXG4gICAgICAgICAgICBBeC5jcmVhdGUoKS5maWxsU3R5bGUoXCJ3aGl0ZVwiKSAgIC8qIGlkbGUgKi9cblxuICAgICAgICApOyAvKiBpZGxlICovXG5cbiAgICAgICAgaWYgKHBvc3Rwcm9jZXNzb3IpIHBvc3Rwcm9jZXNzb3Ioc2xpZGVyKTtcblxuICAgICAgICByZXR1cm4gc2xpZGVyO1xuICAgIH1cblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBob3RzcG90OiBBeC5QYXRoQW5pbWF0aW9uLCAvLyBCYWJlbCBkb2Vzbid0IGxpa2UgcHVibGljIG1vZGlmaWVyXG4gICAgICAgICAgICAgICAgcHVibGljIGtub2JNb3VzZVN0YXRlOiBldmVudHMuQ29tcG9uZW50TW91c2VTdGF0ZSwgLy8gQmFiZWwgZG9lc24ndCBsaWtlIHB1YmxpYyBtb2RpZmllclxuICAgICAgICAgICAgICAgIHB1YmxpYyBjYW52YXNNb3VzZVN0YXRlOiBldmVudHMuQ29tcG9uZW50TW91c2VTdGF0ZSwgLy8gQmFiZWwgZG9lc24ndCBsaWtlIHB1YmxpYyBtb2RpZmllclxuICAgICAgICAgICAgICAgIHZhbHVlOiBSeC5TdWJqZWN0PG51bWJlcj4sXG4gICAgICAgICAgICAgICAgb25Nb3VzZURvd25Lbm9iOiBBeC5PcGVyYXRpb24sXG4gICAgICAgICAgICAgICAgb25Nb3VzZU92ZXJLbm9iOiBBeC5PcGVyYXRpb24sXG4gICAgICAgICAgICAgICAgb25JZGxlS25vYjogQXguT3BlcmF0aW9uXG4gICAgKSB7XG4gICAgICAgIC8vIHdlIGJ1aWxkIGEgZ3JhbmQgYW5pbWF0aW9uIHBpcGVsaW5lIGVpdGhlciBzaWRlIG9mIHRoZSBob3Qgc3BvdCxcbiAgICAgICAgLy8gdGhlbiB3ZSB1c2UgdGhlIHRvdGFsIHBpcGVsaW5lJ3MgYXR0YWNoIGZ1bmN0aW9uIGFzIHRoZSBhdHRhY2ggZnVuY3Rpb24gZm9yIHRoaXMgYW5pbWF0aW9uXG4gICAgICAgIC8vIHNvIHRoZSBjb25zdHJ1Y3RlZCBCdXR0b24gZXhwb3NlcyBhIHJpY2hlciBBUEkgKGUuZy4gc3RhdGUpIHRoYW4gYSBiYXNpYyBhbmltYXRpb24gbm9ybWFsbHkgd291bGRuJ3RcbiAgICAgICAgLy8gdG9kbyBzbGlkZXIgdmFsdWUgaXMgbm90IGNoYW5nZWQgcmVsYXRpdmVseVxuICAgICAgICBzdXBlcihBeC5jcmVhdGUoKVxuICAgICAgICAgICAgLnBpcGUoZXZlbnRzLkNhbnZhc01vdXNlRXZlbnRIYW5kbGVyKGNhbnZhc01vdXNlU3RhdGUpKSAvL2dsb2JhbCBtb3VzZSBsaXN0ZW5lclxuICAgICAgICAgICAgLnBhcmFsbGVsKFtcbiAgICAgICAgICAgICAgICBBeC5jcmVhdGUoKVxuICAgICAgICAgICAgICAgICAgICAudHJhbnNsYXRlKFBhcmFtZXRlci5wb2ludCgwLCBQYXJhbWV0ZXIudXBkYXRlRnJvbSgwLCB2YWx1ZSkpKVxuICAgICAgICAgICAgICAgICAgICAuaWYoa25vYk1vdXNlU3RhdGUuaXNNb3VzZURvd24oKSwgb25Nb3VzZURvd25Lbm9iKSAgIC8vIENvbmRpdGlvbiB0aGUgYW5pbWF0aW9uIHBsYXllZCBiYXNlZCBvbiBtb3VzZSBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICAuZWxpZihrbm9iTW91c2VTdGF0ZS5pc01vdXNlT3ZlcigpLCBvbk1vdXNlT3Zlcktub2IpXG4gICAgICAgICAgICAgICAgICAgIC5lbHNlKG9uSWRsZUtub2IpXG4gICAgICAgICAgICAgICAgICAgIC5waXBlKGhvdHNwb3QpXG4gICAgICAgICAgICAgICAgICAgIC5waXBlKGV2ZW50cy5Db21wb25lbnRNb3VzZUV2ZW50SGFuZGxlcihrbm9iTW91c2VTdGF0ZSkpXG4gICAgICAgICAgICAgICAgICAgIC5maWxsKCksXG4gICAgICAgICAgICAgICAgQXguY3JlYXRlKCkgLy90b2RvLCB0aGUgc2xpZGVyXG4gICAgICAgICAgICBdKVxuICAgICAgICAgICAgLmF0dGFjaCk7XG4gICAgICAgIGtub2JNb3VzZVN0YXRlLnNvdXJjZSA9IHRoaXM7XG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICB0aGlzLnZhbHVlLnN1YnNjcmliZSh4ID0+IGNvbnNvbGUubG9nKFwic2xpZGVyIHZhbHVlIGNoYW5nZWRcIiwgeCkpO1xuXG5cblxuICAgICAgICB0eXBlIFNsaWRlU3RhdGUgPSB7ZXZlbnRTdGFydDogZXZlbnRzLkF4TW91c2VFdmVudCwgdmFsdWVTdGFydDogbnVtYmVyfTtcblxuICAgICAgICAvLyBhIHN0cmVhbSBvZiBwb2ludHMgaW5kaWNhdGluZyB0aGUgc3RhcnQgb2YgdGhlIHNsaWRlIG1vdmUsIG9yIG51bGwgaWYgYSBzbGlkZSBtb3ZlIGlzIG5vdCBpbiBwcm9ncmVzc1xuICAgICAgICB2YXIgc3RhcnRTbGlkZVN0cmVhbTogUnguT2JzZXJ2YWJsZTxTbGlkZVN0YXRlPiA9IFJ4Lk9ic2VydmFibGUubWVyZ2U8U2xpZGVTdGF0ZT4oW1xuICAgICAgICAgICAga25vYk1vdXNlU3RhdGUubW91c2Vkb3duXG4gICAgICAgICAgICAgICAgLndpdGhMYXRlc3RGcm9tKHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAoZXZ0OiBldmVudHMuQXhNb3VzZUV2ZW50LCB2YWx1ZTogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2V2ZW50U3RhcnQ6IGV2dCwgdmFsdWVTdGFydDogdmFsdWV9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgY2FudmFzTW91c2VTdGF0ZS5tb3VzZXVwLm1hcCgoZXZ0OiBldmVudHMuQXhNb3VzZUV2ZW50KSA9PiA8U2xpZGVTdGF0ZT5udWxsKVxuICAgICAgICBdKTtcblxuXG4gICAgICAgIC8vIGEgc3RyZWFtIG9mIG51bWJlciBvciBudWxsLCBpbmRpY2F0aW5nIHRoZSBuZXcgdmFsdWUgb2YgdGhlIHNsaWRlciwgb3IgbnVsbCB0byBtZWFuIG5vIGNoYW5nZVxuICAgICAgICB2YXIgc2xpZGVDaGFuZ2VTdHJlYW0gPSBSeC5PYnNlcnZhYmxlLmNvbWJpbmVMYXRlc3QoXG4gICAgICAgICAgICBzdGFydFNsaWRlU3RyZWFtLFxuICAgICAgICAgICAgY2FudmFzTW91c2VTdGF0ZS5tb3VzZW1vdmUsXG4gICAgICAgICAgICAoc3RhcnQ6IFNsaWRlU3RhdGUsIGN1cnJlbnQ6IGV2ZW50cy5BeE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3RhcnQgPT0gbnVsbCA/IG51bGwgOiBjdXJyZW50LmNhbnZhc0Nvb3JkWzFdIC0gc3RhcnQuZXZlbnRTdGFydC5jYW52YXNDb29yZFsxXSArIHN0YXJ0LnZhbHVlU3RhcnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICkuZmlsdGVyKHZhbCA9PiB2YWwgIT0gbnVsbCk7XG5cbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBudWxscyBmcm9tIHRoZSBzdHJlYW0sIGFuZCBwaXBlIGludG8gdGhlIHZhbHVlIGZvciB0aGUgc2xpZGVyLlxuICAgICAgICBzbGlkZUNoYW5nZVN0cmVhbS50YXAoXG4gICAgICAgICAgICAgICAgdiA9PiBjb25zb2xlLmxvZyhcInNsaWRlcjogdmFsdWVcIiwgdiksXG4gICAgICAgICAgICAgICAgZXJyID0+IGNvbnNvbGUuZXJyb3IoZXJyKSlcbiAgICAgICAgICAgIC5zdWJzY3JpYmUodGhpcy52YWx1ZSk7XG5cblxuICAgIH1cbn1cblxudmFyIHZhbHVlID0gbmV3IFJ4LkJlaGF2aW9yU3ViamVjdDxudW1iZXI+KDApO1xuXG4vL2VhY2ggZnJhbWUsIGZpcnN0IGRyYXcgYmxhY2sgYmFja2dyb3VuZCB0byBlcmFzZSB0aGUgcHJldmlvdXMgY29udGVudHNcbmFuaW1hdG9yLnBsYXkoQXguY3JlYXRlKCkuZmlsbFN0eWxlKFBhcmFtZXRlci5yZ2JhKFBhcmFtZXRlci51cGRhdGVGcm9tKDAsIHZhbHVlKS5tYXBWYWx1ZSh4PT54KjIuNSksIDAsMCwxKSkuZmlsbFJlY3QoWzAsMF0sWzEwMCwxMDBdKSk7XG5cbmFuaW1hdG9yLnBsYXkoQXguY3JlYXRlKClcbiAgICAvLy50cmFuc2xhdGUoWzQwLCA0MF0pXG4gICAgLy8ucm90YXRlKE1hdGguUEkgLyA0KVxuICAgIC5waXBlKFNsaWRlci5yZWN0YW5ndWxhcih2YWx1ZSkpXG4pO1xuXG5oZWxwZXIucGxheUV4YW1wbGUoXCJleGFtcGxlNlwiLCAyLCBhbmltYXRvciwgMTAwLCAxMDApO1xuXG5cblxuXG5kZXNjcmliZSgnZXhhbXBsZTYnLCBmdW5jdGlvbiAoKSB7XG4gICAgaXQgKCdzaG91bGQgbWF0Y2ggdGhlIHJlZmVyZW5jZScsIGZ1bmN0aW9uKGRvbmUpIHtcbiAgICAgICAgaGVscGVyLnNhbWVFeGFtcGxlKFwiZXhhbXBsZTZcIiwgXCJleGFtcGxlNi1yZWZcIiwgZnVuY3Rpb24oZXF1YWwpIHtcbiAgICAgICAgICAgIGVxdWFsLnNob3VsZC5lcXVhbCh0cnVlKTtcbiAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgfSlcbiAgICB9KTtcbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
