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
        this.mousedown = new Rx.Subject();
        this.mouseup = new Rx.Subject();
        var button = this;
        // build the animations either side of the hot spot,
        // and use the total animation's attach function as the animation primative for this class
        _super.call(this, Ax
            .fillStyle(Parameter.rgba(255, 0, 0, 0.5))
            .pipe(this.hotspot)
            .draw(function () {
            return function (tick) {
                tick.events.mousedowns.forEach(function (evt) {
                    if (tick.ctx.isPointInPath(evt[0], evt[1])) {
                        // we have to figure out the global position of this component, so the clientX and clientY
                        // have to go backward through the transform matrix
                        // ^ todo
                        console.log("HIT mouse down", evt);
                    }
                });
            };
        })
            .fill()
            .attach);
    }
    return Button;
})(Ax.Animation);
function button() {
    return new Button();
}
animator.play(Ax
    .translate([0, 0])
    .pipe(button()));
helper.playExample("example5", 1, animator, 100, 100);
// 