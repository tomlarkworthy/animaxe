var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var Parameter = require("../src/Parameter");
var animator = helper.getExampleAnimator(100, 100);
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
// we draw single pixels of different hues moving on a circle circumference
animator.play(Ax.create().parallel(Ax.range(0, 5).map(function (offset) { return Ax.create()
    .skewT(offset * 0.1)
    .translate(Parameter.point(Parameter.sin(Parameter.t()).mapValue(function (x) { return 45 * (x + 1); }), Parameter.cos(Parameter.t()).mapValue(function (x) { return 45 * (x + 1); })))
    .fillStyle("white").fillRect([-1, -1], [3, 3]); })));
helper.playExample("@name", 20, animator, 100, 100);
