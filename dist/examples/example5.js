var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var events = require("../src/events");
var animator = helper.getExampleAnimator(100, 100);
/**
 * A Button is an animation but with extra mouse state attached
 */
var Button = (function (_super) {
    __extends(Button, _super);
    function Button(hotspot, // Babel doesn't like public modifier
        mouseState, // Babel doesn't like public modifier
        onMouseDown, onMouseOver, onIdle) {
        // we build a grand animation pipeline either side of the hot spot,
        // then we use the total pipeline's attach function as the attach function for this animation
        // so the constructed Button exposes a richer API (e.g. state) than a basic animation normally wouldn't
        _super.call(this, Ax.create()
            .if(mouseState.isMouseDown(), onMouseDown) // Condition the animation played based on mouse state
            .elif(mouseState.isMouseOver(), onMouseOver)
            .else(onIdle)
            .pipe(hotspot)
            .pipe(events.ComponentMouseEventHandler(mouseState))
            .fill()
            .attach);
        this.hotspot = hotspot;
        this.mouseState = mouseState;
        mouseState.source = this;
    }
    /**
     * @param postprocessor hook to do things like attach listeners without breaking the animation chaining
     */
    Button.rectangular = function (postprocessor) {
        var hotspot = Ax.create()
            .withinPath(Ax.create()
            .lineTo([40, 0])
            .lineTo([40, 20])
            .lineTo([0, 20])
            .lineTo([0, 0]));
        var button = new Button(hotspot, new events.ComponentMouseState(), Ax.create().fillStyle("red"), /* pressed */ Ax.create().fillStyle("orange"), /* over */ Ax.create().fillStyle("white")); /* idle */
        if (postprocessor)
            postprocessor(button);
        return button;
    };
    return Button;
})(Ax.Operation);
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
animator.play(Ax.create()
    .translate([40, 40])
    .rotate(Math.PI / 4)
    .pipe(Button.rectangular(function (button) {
    button.mouseState.mousedown.subscribe(function (evt) { return console.log("Button: mousedown", evt.animationCoord); });
    button.mouseState.mouseup.subscribe(function (evt) { return console.log("Button: mouseup", evt.animationCoord); });
    button.mouseState.mousemove.subscribe(function (evt) { return console.log("Button: mousemove", evt.animationCoord); });
    button.mouseState.mouseenter.subscribe(function (evt) { return console.log("Button: mouseenter", evt.animationCoord); });
    button.mouseState.mouseleave.subscribe(function (evt) { return console.log("Button: mouseleave", evt.animationCoord); });
})));
helper.playExample("@name", 2, animator, 100, 100);
