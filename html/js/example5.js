var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
// @header
var animator = helper.getExampleAnimator(100, 100);
var Button = (function (_super) {
    __extends(Button, _super);
    /**
     * creates a button
     * @param postprocessor a hook for attaching listeners so you can chain the button to other animations without interruption
     */
    function Button(postprocessor) {
        // we need animations before an after the hotspot's path to create a complete button
        // first lets deal with the path that listens to the mouse
        this.hotspot = Ax
            .withinPath(Ax
            .lineTo([40, 0])
            .lineTo([40, 20])
            .lineTo([0, 20])
            .lineTo([0, 0]));
        this.events = new events.ComponentMouseEvents(this);
        // now build the animations either side of the hot spot sandwich,
        // then we use the total sandwiches attach function as the animation attach for this class
        // so the Button Animation subclass exposes a richer API (i.e. events) than a basic animation normally would
        _super.call(this, Ax.Empty
            .if(this.events.isMouseDown(), Ax.fillStyle(Parameter.rgba(255, 0, 0, 0.5)))
            .elif(this.events.isMouseOver(), Ax.fillStyle(Parameter.rgba(0, 255, 0, 0.5)))
            .else(Ax.fillStyle(Parameter.rgba(0, 0, 255, 0.5)))
            .pipe(this.hotspot)
            .pipe(events.ComponentMouseEventHandler(this.events))
            .fill()
            .attach);
        if (postprocessor)
            postprocessor(this);
    }
    return Button;
})(Ax.Animation);
//each frame, first draw black background to erase the previous contents
animator.play(Ax.fillStyle("#000000").fillRect([0, 0], [100, 100]));
animator.play(Ax
    .translate([40, 40])
    .rotate(Math.PI / 4)
    .pipe(new Button(function (button) {
    button.events.mousedown.subscribe(function (evt) { return console.log("Button: mousedown", evt.animationCoord); });
    button.events.mouseup.subscribe(function (evt) { return console.log("Button: mouseup", evt.animationCoord); });
    button.events.mousemove.subscribe(function (evt) { return console.log("Button: mousemove", evt.animationCoord); });
    button.events.mouseenter.subscribe(function (evt) { return console.log("Button: mouseenter", evt.animationCoord); });
    button.events.mouseleave.subscribe(function (evt) { return console.log("Button: mouseleave", evt.animationCoord); });
})));
helper.playExample("example5", 2, animator, 100, 100);
// 