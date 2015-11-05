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
    function Button(postprocessor) {
        this.hotspot = Ax
            .withinPath(Ax
            .lineTo([40, 0])
            .lineTo([40, 20])
            .lineTo([0, 20])
            .lineTo([0, 0]));
        this.events = new events.ComponentMouseEvents(this);
        var button = this;
        // build the animations either side of the hot spot,
        // and use the total animation's attach function as the animation primative for this class
        _super.call(this, Ax
            .fillStyle(Parameter.rgba(255, 0, 0, 0.5))
            .pipe(this.hotspot)
            .pipe(events.ComponentMouseEventHandler(button.events))
            .fill()
            .attach);
        if (postprocessor)
            postprocessor(button);
    }
    return Button;
})(Ax.Animation);
animator.play(Ax
    .translate([50, 50])
    .rotate(Math.PI / 8)
    .pipe(new Button(function (button) {
    button.events.mousedown.subscribe(function (evt) { return console.log("Button: mousedown", evt.animationCoord); });
    button.events.mouseup.subscribe(function (evt) { return console.log("Button: mouseup", evt.animationCoord); });
    button.events.mousemove.subscribe(function (evt) { return console.log("Button: mousemove", evt.animationCoord); });
    button.events.mouseenter.subscribe(function (evt) { return console.log("Button: mouseenter", evt.animationCoord); });
    button.events.mouseleave.subscribe(function (evt) { return console.log("Button: mouseleave", evt.animationCoord); });
})));
helper.playExample("example5", 1, animator, 100, 100);
// 