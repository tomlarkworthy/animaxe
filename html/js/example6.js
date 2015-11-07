/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
// @header
var animator = helper.getExampleAnimator(100, 100);
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
        _super.call(this, Ax.Empty
            .pipe(events.CanvasMouseEventHandler(canvasMouseState)) //global mouse listener
            .parallel([
            Ax.Empty
                .if(knobMouseState.isMouseDown(), onMouseDownKnob) // Condition the animation played based on mouse state
                .elif(knobMouseState.isMouseOver(), onMouseOverKnob)
                .else(onIdleKnob)
                .translate(Parameter.point(0, Parameter.updateFrom(0, value.tap(function (x) { return console.log("value changed for param", x); })))) // todo this breaks infront of if
                .pipe(hotspot)
                .pipe(events.ComponentMouseEventHandler(knobMouseState))
                .fill(),
            Ax.Empty //todo, the slider
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
            knobMouseState.mousedown.map(function (evt) { return evt; }),
            canvasMouseState.mouseup.map(function (evt) { return null; })
        ]);
        // a stream of number or null, indicating the new value of the slider, or null to mean no change
        var slideStream = Rx.Observable.combineLatest(startSlideStream, canvasMouseState.mousemove, function (start, current) {
            return start == null ? null : current.canvasCoord[1] - start.canvasCoord[1];
        });
        // remove the nulls from the stream, and pipe into the value for the slider.
        slideStream.filter(function (val) { return val != null; }).tap(function (v) { return console.log("slider: value", v); }, function (err) { return console.error(err); })
            .subscribe(this.value);
    }
    /**
     * @param postprocessor hook to do things like attach listeners without breaking the animation chaining
     */
    Slider.rectangular = function (postprocessor) {
        var hotspot = Ax
            .withinPath(Ax
            .lineTo([20, 0])
            .lineTo([20, 20])
            .lineTo([0, 20])
            .lineTo([0, 0]));
        var value = new Rx.Subject();
        value.subscribe(function (x) { return console.log("pre construction value changed", x); });
        var slider = new Slider(hotspot, new events.ComponentMouseState(), new events.ComponentMouseState(), value, Ax.fillStyle("red"), /* pressed */ Ax.fillStyle("orange"), /* over */ Ax.fillStyle("white") /* idle */); /* idle */
        if (postprocessor)
            postprocessor(slider);
        return slider;
    };
    return Slider;
})(Ax.Animation);
//each frame, first draw black background to erase the previous contents
animator.play(Ax.fillStyle("#000000").fillRect([0, 0], [100, 100]));
animator.play(Ax
    .pipe(Slider.rectangular()));
helper.playExample("example5", 2, animator, 100, 100);
// 