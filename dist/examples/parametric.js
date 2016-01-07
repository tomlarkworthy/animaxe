var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var Parameter = require("../src/Parameter");
var animator = helper.getExampleAnimator(100, 100);
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
// we draw single pixels of different hues moving on a circle circumference
/*
export function trace(
    equations: Parameter<((t: number) => number)[]>,
    t_min: types.NumberArg,
    t_max: types.NumberArg,
    tolerance_px2: types.NumberArg = 1,
    minimum_splits: types.NumberArg = 0): Parameter<{point: number[], t: number}[]> {
    return equations.combine(
        () => (equations: ((t: number) => number)[], t_min: number, t_max: number, tolerance_px2: number, minimum_splits: number) => {
            return parametric.trace(equations, t_min, t_max, tolerance_px2, minimum_splits);
        },
        from(t_min),
        from(t_max),
        from(tolerance_px2),
        from(minimum_splits)
    )
}
*/
/**
 * https://en.wikipedia.org/wiki/Lissajous_curve
 * Paramteric equations of x = Asin(at + i), y = Bsin(bt)
 */
function lissajous(A, a, B, b, i) {
    return Parameter.from(A).combine(function () { return function (A, a, B, b, i) {
        return [function (t) { return A * Math.sin(a * t + i); }, function (t) { return B * Math.sin(b * t); }];
    }; }, Parameter.from(A), Parameter.from(a), Parameter.from(B), Parameter.from(b), Parameter.from(i));
}
// t => point[]
// mapped to
// t => mutation[]
// t => Canvas
/*
animator.play(
    Ax.create()
    .beginPath()
    .pipe(
        Ax.create().reduce(
            Parameter.trace(
                lissajous(45, 1, 45, 2, 0),
                Parameter.t(), Parameter.t().mapValue(t => t + Math.PI * 2),
                /* accuracy * 1,
                /* min. splits * 4
            ).mapValue(array => array.map(segment => segment.point)), // t values discarded, the result is an array of 2D points, i.e. [number, number][]
            (animation: Ax.Animation, point: [number, number], index: number) =>
                index == 0 ? animation.moveTo(point): animation.lineTo(point)
        )
    )
    .strokeStyle("green")
    .stroke()
);*/
helper.playExample("@name", 20, animator, 100, 100);
