var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var Parameter = require("../src/Parameter");
var animator = helper.getExampleAnimator(100, 100);
var red = 255;
var green = 50;
var blue = 50;
function foreverDot(size, css_color) {
    return Ax.create().fillStyle(css_color).fillRect([-size / 2, -size / 2], [size, size]);
}
var bigSin = Parameter.sin(2).map(function (x) { return Math.round(x * 40 + 50); });
var bigCos = Parameter.cos(2).map(function (x) { return Math.round(x * 40 + 50); });
var fastCos = Parameter.cos(1).map(function (x) { return Math.round(x * 38 + 50); });
var fastSin = Parameter.sin(1).map(function (x) { return Math.round(x * 38 + 50); });
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
// we draw single pixels of different hues moving on a circle circumference
animator.play(Ax.create().parallel([
    Ax.create().translate(Parameter.point(fastCos, fastSin)).pipe(foreverDot(1, Parameter.hsl(120, 20, 10))),
    Ax.create().translate(Parameter.point(bigCos, bigSin)).pipe(foreverDot(1, Parameter.hsl(240, 20, 30))),
    Ax.create().translate(Parameter.point(bigSin, bigCos)).pipe(foreverDot(1, Parameter.hsl(60, 20, 25)))
]));
// we apply a glow filter last
animator.play(Ax.create().glow(0.01));
helper.playExample("@name", 20, animator, 100, 100);
