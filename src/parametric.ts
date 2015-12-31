/**
 * Defines utilities for working with parametric function, e.g. x = sin(t), y = cos(t) where t = 0 ... 10
 */

function evaluate(equations: ((t: number) => number)[], t: number): number[] {
    return equations.map(fn => fn(t));
}
function midpoint(a: number[], b: number[]): number[] {
    return a.map((v, index) => (v + b[index]) / 2);
}
function add(a: number, b: number): number {
    return a + b;
}
function distance2(a: number[], b: number[]): number {
    return a.map((v, index) => (v - b[index]) * (v - b[index])).reduce(add, 0);
}

export function trace(
    equations: ((t: number) => number)[],
    t_min: number,
    t_max: number,
    tolerance_px2: number = 1,
    minimum_splits = 0,
    t_min_value ?: number[],
    t_max_value ?: number[]    
): {point: number[], t: number}[] {
    // figure out the start and end point if not provided
    var min = t_min_value || evaluate(equations, t_min);
    var max = t_max_value || evaluate(equations, t_max);
    
    var t_mid = (t_min + t_max) / 2;
    var mid_predict = midpoint(min, max);  // guess the mid point based on linear interpolation
    var mid_actual = evaluate(equations, t_mid); // get the real midpoint from the equations

    // the distance between predicted and actuall is our error term
    var dist2 = distance2(mid_predict, mid_actual)
    
    var result = [];
    // if the caller did not specify the min_value, they will want to see it in the result set
    if (!t_min_value) result.push({point: min, t: t_min}); 
    if (dist2 < tolerance_px2 && minimum_splits <= 0) {
        // low error,
        // our lines seem to be estimating the curve ok (on the midpoint at least)
    } else {
        // high error,
        // we recurse by dividing the problem into 2 smaller tracing problems
        minimum_splits = Math.ceil((minimum_splits - 1) / 2)
        result = result.concat(trace(equations, t_min, t_mid, tolerance_px2, minimum_splits, min, mid_actual));
        result.push({point: mid_actual, t: t_mid});
        result = result.concat(trace(equations, t_mid, t_max, tolerance_px2, minimum_splits, mid_actual, max));
    }
    // if the caller did not specify the max_value, they will want to see it in the result set
    if (!t_max_value) result.push({point: max, t: t_max}); 
    
    //console.log(min, max, mid_actual);
    console.log(result);
    return result;
}