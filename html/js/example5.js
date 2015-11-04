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
    function Button() {
        this.hotspot = Ax
            .withinPath(Ax
            .lineTo([20, 0])
            .lineTo([20, 20])
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
    }
    return Button;
})(Ax.Animation);
function button() {
    var button = new Button();
    button.events.mousedown.subscribe(function (evt) { return console.log("Button: mousedown", evt); });
    button.events.mouseup.subscribe(function (evt) { return console.log("Button: mouseup", evt); });
    button.events.mousemove.subscribe(function (evt) { return console.log("Button: mousemove", evt); });
    button.events.mouseenter.subscribe(function (evt) { return console.log("Button: mouseenter", evt); });
    button.events.mouseleave.subscribe(function (evt) { return console.log("Button: mouseleave", evt); });
    return button;
}
animator.play(Ax
    .translate([0, 0])
    .pipe(button()));
helper.playExample("example5", 1, animator, 100, 100);
// 