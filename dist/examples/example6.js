var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Rx = require("rx");
var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var events = require("../src/events");
var Parameter = require("../src/parameter");
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
        _super.call(this, Ax.Empty
            .pipe(events.CanvasMouseEventHandler(canvasMouseState)) //global mouse listener
            .parallel([
            Ax.Empty
                .translate(Parameter.point(0, Parameter.updateFrom(0, value)))
                .if(knobMouseState.isMouseDown(), onMouseDownKnob) // Condition the animation played based on mouse state
                .elif(knobMouseState.isMouseOver(), onMouseOverKnob)
                .else(onIdleKnob)
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
        var hotspot = Ax
            .withinPath(Ax
            .lineTo([20, 0])
            .lineTo([20, 20])
            .lineTo([0, 20])
            .lineTo([0, 0]));
        value.subscribe(function (x) { return console.log("pre construction value changed", x); });
        var slider = new Slider(hotspot, new events.ComponentMouseState(), new events.ComponentMouseState(), value, Ax.fillStyle("red"), /* pressed */ Ax.fillStyle("orange"), /* over */ Ax.fillStyle("white") /* idle */); /* idle */
        if (postprocessor)
            postprocessor(slider);
        return slider;
    };
    return Slider;
})(Ax.Animation);
var value = new Rx.BehaviorSubject(0);
//each frame, first draw black background to erase the previous contents
animator.play(Ax.fillStyle(Parameter.rgba(Parameter.updateFrom(0, value).map(function (x) { return x * 2.5; }), 0, 0, 1)).fillRect([0, 0], [100, 100]));
animator.play(Ax
    .pipe(Slider.rectangular(value)));
helper.playExample("example6", 2, animator, 100, 100);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGVzL2V4YW1wbGU2LnRzIl0sIm5hbWVzIjpbIlNsaWRlciIsIlNsaWRlci5jb25zdHJ1Y3RvciIsIlNsaWRlci5yZWN0YW5ndWxhciJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxJQUFZLEVBQUUsV0FBTSxJQUFJLENBQUMsQ0FBQTtBQUN6QixJQUFZLEVBQUUsV0FBTSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3JDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBQ3hDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBQ3hDLElBQVksU0FBUyxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFFOUMsSUFBSSxRQUFRLEdBQWdCLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFHaEUsT0FBTztBQUNQLCtCQUErQjtBQUMvQixrQkFBa0I7QUFDbEIseUdBQXlHO0FBRXpHOztHQUVHO0FBQ0g7SUFBcUJBLDBCQUFZQTtJQWtDN0JBLGdCQUFtQkEsT0FBeUJBLEVBQUVBLHFDQUFxQ0E7UUFDaEVBLGNBQTBDQSxFQUFFQSxxQ0FBcUNBO1FBQ2pGQSxnQkFBNENBLEVBQUVBLHFDQUFxQ0E7UUFDMUZBLEtBQXlCQSxFQUN6QkEsZUFBNkJBLEVBQzdCQSxlQUE2QkEsRUFDN0JBLFVBQXdCQTtRQUVoQ0MsbUVBQW1FQTtRQUNuRUEsNkZBQTZGQTtRQUM3RkEsdUdBQXVHQTtRQUN2R0EsOENBQThDQTtRQUM5Q0Esa0JBQU1BLEVBQUVBLENBQUNBLEtBQUtBO2FBQ1RBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLHVCQUF1QkEsQ0FBQ0EsZ0JBQWdCQSxDQUFDQSxDQUFDQSxDQUFDQSx1QkFBdUJBO2FBQzlFQSxRQUFRQSxDQUFDQTtZQUNOQSxFQUFFQSxDQUFDQSxLQUFLQTtpQkFDSEEsU0FBU0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsU0FBU0EsQ0FBQ0EsVUFBVUEsQ0FBQ0Es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QSxDQUFDQSxNQUFNQSxDQUFDQTtJQUNsQkEsQ0FBQ0E7SUFrRUxGLGFBQUNBO0FBQURBLENBbEdBLEFBa0dDQSxFQWxHb0IsRUFBRSxDQUFDLFNBQVMsRUFrR2hDO0FBRUQsSUFBSSxLQUFLLEdBQUcsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUFTLENBQUMsQ0FBQyxDQUFDO0FBRTlDLHdFQUF3RTtBQUN4RSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUUsT0FBQSxDQUFDLEdBQUMsR0FBRyxFQUFMLENBQUssQ0FBQyxFQUFFLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHLEVBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRTNILFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtLQUdYLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQ25DLENBQUM7QUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyIsImZpbGUiOiJleGFtcGxlcy9leGFtcGxlNi5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
