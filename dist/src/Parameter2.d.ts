/// <reference path="../../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../../types/node.d.ts" />
/// <reference path="../../types/seedrandom.d.ts" />
import * as Rx from "rx";
import * as OT from "./ObservableTransformer";
export declare var DEBUG: boolean;
import * as types from "./types";
export * from "./types";
export declare var rndGenerator: prng;
/**
 * convert an Rx.Observable into a Parameter by providing an initial value. The Parameter's value will update its value
 * every time and event is received from the Rx source
 */
export declare function updateFrom<T>(initialValue: T, source: Rx.Observable<T>): Parameter<T>;
/**
 * convert an Rx.Observable into a Parameter by providing an default value. The Parameter's value will be replaced
 * with the value from the provided Rx.Observable for one tick only
 */
export declare function overwriteWith<T>(defaultValue: T, source: Rx.Observable<T>): Parameter<T>;
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
export declare class Parameter<Value> extends OT.ObservableTransformer<OT.BaseTick, Value> {
    /**
     * Before a parameter is used, the enclosing animation must call init. This returns a function which
     * can be used to find the value of the function for specific values of time.
     */
    constructor(init: () => ((clock: number) => Value));
    /**
     * Before a parameter is used, the enclosing animation must call init. This returns a function which
     * can be used to find the value of the function for specific values of time.
     */
    init(): (clock: number) => Value;
    /**
     * map the value of 'this' to a new parameter
     */
    map<V>(fn: (Value) => V): Parameter<V>;
    /**
     * Returns a parameter whose value is forever the first value next picked from this.
     * @returns {Parameter<T>}
     */
    first(): Parameter<Value>;
}
export declare function from<T>(source: T | Parameter<T>): Parameter<T>;
export declare function point(x: types.NumberArg, y: types.NumberArg): Parameter<types.Point>;
export declare function displaceT<T>(displacement: types.NumberArg, value: T | Parameter<T>): Parameter<T>;
export declare function rgba(r: types.NumberArg, g: types.NumberArg, b: types.NumberArg, a: types.NumberArg): Parameter<types.Color>;
export declare function hsl(h: types.NumberArg, s: types.NumberArg, l: types.NumberArg): Parameter<types.Color>;
export declare function seedrnd(seed: types.StringArg): Parameter<void>;
export declare function t(): Parameter<number>;
export declare function rnd(): Parameter<number>;
export declare function constant<T>(val: T): Parameter<T>;
export declare function rndNormal(scale?: Parameter<number> | number): Parameter<types.Point>;
export declare function sin(period: types.NumberArg): Parameter<number>;
export declare function cos(period: types.NumberArg): Parameter<number>;
