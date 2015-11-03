/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
// @header
var animator = helper.getExampleAnimator();
// fixed base color for particles
var red = 255, green = 50, blue = 50;
// alpha fades out to make the particles evaporate over time
var alpha = Parameter.t().map(function (t) { return 0.1 / (t * 5 + 0.1); });
// our base particle is of variable size and color
function permDot(size, css_color) {
    return Ax.fillStyle(css_color).fillRect([-size / 2, -size / 2], [size, size]);
}
// each frame, first draw black background to erase the previous contents
animator.play(Ax.fillStyle("#000000").fillRect([0, 0], [100, 100]));
// a ring of exploding particles that fade our
animator.play(Ax
    .globalCompositeOperation("lighter") // use additive blending
    .clone(500, Ax // clone 500 particles
    .translate([50, 50]) // move to center of canvas
    .velocity(Parameter.rndNormal(50).first()) // choose a random direction
    .parallel([
    permDot(1, Parameter.rgba(red, green, blue, alpha)),
    permDot(5, Parameter.rgba(red, green, blue, alpha)) // with a dimmer surround
])));
helper.playExample("example3", 15, animator, 100, 100);
// 