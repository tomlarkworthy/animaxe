/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
import * as Rx from "rx";


export var DEBUG = false;

import * as types from "./types"
export * from "./types"

if (DEBUG) console.log("Parameter: module loading...");

/**
 * convert an Rx.Observable into a Parameter by providing an initial value. The Parameter's value will update its value
 * every time and event is received from the Rx source
 */
export function updateFrom<T>(initialValue: T, source: Rx.Observable<T>): Parameter<T> {
    if (DEBUG) console.log("updateFrom: build");
    return new Parameter(
        () => {
            if (DEBUG) console.log("updateFrom: init")
            var value = initialValue;
            source.subscribe(x => value = x);
            return (clock: number) => {
                return value;
            }
        }
    );
}

/**
 * convert an Rx.Observable into a Parameter by providing an default value. The Parameter's value will be replaced
 * with the value from the provided Rx.Observable for one tick only
 */
export function overwriteWith<T>(defaultValue: T, source: Rx.Observable<T>): Parameter<T> {
    if (DEBUG) console.log("overwriteWith: build");
    return new Parameter(
        () => {
            if (DEBUG) console.log("overwriteWith: init")
            var value = defaultValue;
            source.subscribe(x => value = x);
            return (clock: number) => {
                var returnValue = value;
                value = defaultValue; // reset value each time
                return returnValue;
            }
        }
    );
}

/**
 * A parameter is used for time varying values to animation functions.
 * Before a parameter is used, the enclosing animation must call init. This returns a function which
 * can be used to find the value of the function for specific values of time. Typically this is done within the
 * animation's closure. For example:
```
function moveTo(
    xy: PointArg
): Animation {
    return draw(
        () => {
            var xy_next = Parameter.from(xy).init(); // init to obtain 'next'

            return function (tick: DrawTick) {
                var xy = xy_next(tick.clock); // use 'next' to get value
                tick.ctx.moveTo(xy[0], xy[1]);
            }
        });
}
```
 */
export class Parameter<Value> {
    /**
     * Before a parameter is used, the enclosing animation must call init. This returns a function which
     * can be used to find the value of the function for specific values of time.
     */
    constructor(init: () => ((clock: number) => Value)) {
        this.init = init;
    }

    /**
     * Before a parameter is used, the enclosing animation must call init. This returns a function which
     * can be used to find the value of the function for specific values of time.
     */
    init(): (clock: number) => Value {throw new Error('This method is abstract');}

    /**
     * map the value of 'this' to a new parameter
     */
    map<V>(fn: (Value) => V): Parameter<V> {
        var base = this;
        return new Parameter(
            () => {
                var base_next = base.init();
                return function(t) {
                    return fn(base_next(t));
                }
            }
        );
    }
    /**
     * Returns a parameter whose value is forever the first value next picked from this.
     * @returns {Parameter<T>}
     */
    first(): Parameter<Value> {
        var self = this;
        return new Parameter<Value>(
            () => {
                var generate = true;
                var next = self.init();
                var value = null;
                return function (clock: number) {
                    if (generate) {
                        generate = false;
                        value = next(clock);
                    }
                    // console.log("fixed: val from parameter", value);
                    return value;
                }
            }
        );
    }

}


export function from<T>(source: T | Parameter<T>): Parameter<T> {
    types.assert (source != undefined, "source is not defined");
    if (DEBUG) console.log("from: build");
    if (typeof (<any>source).init == 'function') return <Parameter<T>>source;
    else return constant(<T> source)
}


export function point(
    x: number | Parameter<number>,
    y: number | Parameter<number>
): Parameter<types.Point>
{
    if (DEBUG) console.log("point: build");
    return new Parameter(
        () => {
            var x_next = from(x).init();
            var y_next = from(y).init();
            return function(t: number) {
                var result: [number, number] = [x_next(t), y_next(t)];
                // console.log("point: next", result);
                return result;
            }
        }
    );
}


export function displaceT<T>(displacement: number | Parameter<number>, value: T | Parameter<T>): Parameter<T> {
    if (DEBUG) console.log("displace: build");
    return new Parameter<T> (
        () => {
            var dt_next    = from(displacement).init(); //todo remove <number>
            var value_next = from(value).init();
            return function (t) {
                var dt: number = dt_next(t);
                if (DEBUG) console.log("displaceT: ", dt);
                return value_next(t + dt)
            }
        }
    )
}

/*
    RGB between 0 and 255
    a between 0 - 1 (1 is opaque, 0 is transparent)
 */
export function rgba(
    r: number | Parameter<number>,
    g: number | Parameter<number>,
    b: number | Parameter<number>,
    a: number | Parameter<number>
): Parameter<types.Color>
{
    if (DEBUG) console.log("rgba: build");
    return new Parameter(
        () => {
            var r_next = from(r).init();
            var g_next = from(g).init();
            var b_next = from(b).init();
            var a_next = from(a).init();
            return function(t: number) {
                var r_val = Math.floor(r_next(t));
                var g_val = Math.floor(g_next(t));
                var b_val = Math.floor(b_next(t));
                var a_val = a_next(t);
                var val = "rgba(" + r_val + "," + g_val + "," + b_val + "," + a_val + ")";
                if (DEBUG) console.log("color: ", val);
                return val;
            }
        }
    );
}

export function hsl(
    h: number | Parameter<number>,
    s: number | Parameter<number>,
    l: number | Parameter<number>
): Parameter<types.Color>
{
    if (DEBUG) console.log("hsl: build");
    return new Parameter(
        () => {
            var h_next = from(h).init();
            var s_next = from(s).init();
            var l_next = from(l).init();
            return function(t: number) {
                var h_val = Math.floor(h_next(t));
                var s_val = Math.floor(s_next(t));
                var l_val = Math.floor(l_next(t));
                var val = "hsl(" + h_val + "," + s_val + "%," + l_val + "%)";
                // if (DEBUG) console.log("hsl: ", val);
                return val;
            }
        }
    );
}

export function t(): Parameter<number> {
    if (DEBUG) console.log("t: build");
    return new Parameter(
        () => function (t) {
            return t;
        }
    );
}

export function rnd(): Parameter<number> {
    if (DEBUG) console.log("rnd: build");
    return new Parameter(
        () => function (t) {
            return Math.random();
        }
    );
}

export function constant<T>(val: T): Parameter<T> {
    if (DEBUG) console.log("constant: build");
    return new Parameter(
        () => function (t) {
            return val;
        }
    );
}

export function rndNormal(scale : Parameter<number> | number = 1): Parameter<types.Point> {
    if (DEBUG) console.log("rndNormal: build");
    return new Parameter<types.Point>(
        () => {
            if (DEBUG) console.log("rndNormal: init");
            var scale_next = from(scale).init();
            return function (t: number): types.Point {
                var scale = scale_next(t);
                // generate random numbers
                var norm2 = 100;
                while (norm2 > 1) { //reject those outside the unit circle
                    var x = (Math.random() - 0.5) * 2;
                    var y = (Math.random() - 0.5) * 2;
                    norm2 = x * x + y * y;
                }

                var norm = Math.sqrt(norm2);
                var val: [number, number] = [scale * x / norm , scale * y / norm];
                if (DEBUG) console.log("rndNormal: val", val);
                return val;
            }
        }
    );
}


//todo: should be t as a parameter to a non tempor
export function sin(period: number | Parameter<number>): Parameter<number> {
    if (DEBUG) console.log("sin: new");
    return new Parameter(
        () => {
            var period_next = from(period).init();
            return function (t: number) {
                var value = Math.sin(t * (Math.PI * 2) / period_next(t));
                if (DEBUG) console.log("sin: tick", t, value);
                return value;
            }
        }
    );
}
export function cos(period: number | Parameter<number>): Parameter<number> {
    if (DEBUG) console.log("cos: new");
    return new Parameter(
        () => {
            var period_next = from(period).init();
            return function (t: number) {
                var value = Math.cos(t * (Math.PI * 2) / period_next(t));
                if (DEBUG) console.log("cos: tick", t, value);
                return value;
            }
        }
    );
}



if (DEBUG) console.log("Parameter: module loaded");

