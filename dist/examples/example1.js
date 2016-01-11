var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var Parameter = require("../src/Parameter");
var animator = helper.getExampleAnimator();
//2 frame animated glow
function spark(color) {
    return Ax.create()
        .take(1)
        .fillStyle(color)
        .fillRect([-2, -2], [5, 5])
        .then(Ax.create()
        .take(1)
        .fillStyle(color)
        .fillRect([-1, -1], [3, 3]));
}
//large circle funcitons
var bigSin = Parameter.sin(Parameter.t().mapValue(function (x) { return x * Math.PI * 2; })).mapValue(function (x) { return x * 40 + 50; });
var bigCos = Parameter.cos(Parameter.t().mapValue(function (x) { return x * Math.PI * 2; })).mapValue(function (x) { return x * 40 + 50; });
var red = Parameter.sin(Parameter.t().mapValue(function (x) { return x * Math.PI; })).mapValue(function (x) { return x * 125 + 125; });
var green = Parameter.sin(Parameter.t().mapValue(function (x) { return x * Math.PI; })).mapValue(function (x) { return x * 55 + 200; });
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
// move the drawing context frame of reference to the center (50,50) and then move it by a +ve x velocity,
// so the frame of reference moves over time.
// then draw our 2 frame spark animation in a loop so it draws forever
animator.play(Ax.create()
    .translate([50, 50])
    .velocity([50, 0])
    .loop(spark("#FFFFFF")));
// move the draw context to a coordinate determined by trig (i.e. in a circle)
animator.play(Ax.create()
    .loop(Ax.create()
    .translate(Parameter.point(bigSin, bigCos))
    .pipe(spark(Parameter.rgba(red, green, 0, 1)))));
// tween between the center (50,50) and a point on a circle. This has the effect of moving the inner spark animation
// in a archimedes spiral.
animator.play(Ax.create()
    .tween_linear([50, 50], Parameter.point(bigSin, bigCos), 1)
    .loop(spark("red")));
// the helper function pipes injects the context, either from a web canvas or a fake node.js one.
helper.playExample("@name", 20, animator, 100, 100);
