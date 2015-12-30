var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var Parameter = require("../src/Parameter");
var animator = helper.getExampleAnimator();
function foreverDot(size, css_color) {
    return Ax.create().fillStyle(css_color).fillRect([-size / 2, -size / 2], [size, size]);
}
var WIDTH = 100;
var HEIGHT = 100;
var SINS = 3;
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
animator.play(Ax.create().parallel(Ax.range(0, WIDTH).map(function (x) {
    // for each index we create a 10 sinwaves
    return Ax.create().parallel(Ax.range(0, SINS).map(function (i) {
        return Ax.create()
            .translate(Parameter.point(x, Parameter
            .sin(Parameter.t().mapValue(function (t) { return Math.sin(t + i * 4 + x / WIDTH) * 10 + t / 2 + x / WIDTH * Math.PI + i / SINS * Math.PI * 2; }))
            .mapValue(function (s) { return HEIGHT * (0.45 * s + 0.5); })))
            .pipe(foreverDot(3, Parameter.rgba(255, Parameter
            .sin(Parameter.t().mapValue(function (t) { return x / WIDTH + t * 2 + i; }))
            .mapValue(function (s) { return s * 125 + 125; }), 0, 1)));
    }));
})));
helper.playExample("@name", 32, animator, WIDTH, 100);
