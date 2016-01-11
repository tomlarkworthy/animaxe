/**
 * Defines utilities for working with parametric function, e.g. x = sin(t), y = cos(t) where t = 0 ... 10
 */
function evaluate(equations, t) {
    return equations.map(function (fn) { return fn(t); });
}
function midpoint(a, b) {
    return a.map(function (v, index) { return (v + b[index]) / 2; });
}
function add(a, b) {
    return a + b;
}
function distance2(a, b) {
    return a.map(function (v, index) { return (v - b[index]) * (v - b[index]); }).reduce(add, 0);
}
function trace(equations, t_min, t_max, tolerance_px2, minimum_splits, maximum_splits, t_min_value, t_max_value) {
    // console.log(minimum_splits, maximum_splits);
    if (tolerance_px2 === void 0) { tolerance_px2 = 1; }
    if (minimum_splits === void 0) { minimum_splits = 4; }
    if (maximum_splits === void 0) { maximum_splits = 100; }
    // figure out the start and end point if not provided
    var min = t_min_value || evaluate(equations, t_min);
    var max = t_max_value || evaluate(equations, t_max);
    var t_mid = (t_min + t_max) / 2;
    var mid_predict = midpoint(min, max); // guess the mid point based on linear interpolation
    var mid_actual = evaluate(equations, t_mid); // get the real midpoint from the equations
    // the distance between predicted and actuall is our error term
    var dist2 = distance2(mid_predict, mid_actual);
    var result = [];
    // if the caller did not specify the min_value, they will want to see it in the result set
    if (!t_min_value)
        result.push({ point: min, t: t_min });
    if ((dist2 < tolerance_px2 && minimum_splits <= 0) || maximum_splits <= 0) {
    }
    else {
        // high error,
        // we recurse by dividing the problem into 2 smaller tracing problems
        minimum_splits = Math.ceil((minimum_splits - 1) / 2);
        maximum_splits = Math.ceil((maximum_splits - 1) / 2);
        result = result.concat(trace(equations, t_min, t_mid, tolerance_px2, minimum_splits, maximum_splits, min, mid_actual));
        result.push({ point: mid_actual, t: t_mid });
        result = result.concat(trace(equations, t_mid, t_max, tolerance_px2, minimum_splits, maximum_splits, mid_actual, max));
    }
    // if the caller did not specify the max_value, they will want to see it in the result set
    if (!t_max_value)
        result.push({ point: max, t: t_max });
    // console.log(result);
    return result;
}
exports.trace = trace;
