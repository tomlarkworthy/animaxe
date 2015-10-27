/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
export declare var DEBUG: boolean;
export declare type Color = string;
export declare type Point = [number, number];
export declare type NumberArg = number | Parameter<number>;
export declare type PointArg = Point | Parameter<Point>;
export declare class Parameter<Value> {
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
export declare function point(x: number | Parameter<number>, y: number | Parameter<number>): Parameter<Point>;
export declare function displaceT<T>(displacement: NumberArg, value: T | Parameter<T>): Parameter<T>;
export declare function rgba(r: number | Parameter<number>, g: number | Parameter<number>, b: number | Parameter<number>, a: number | Parameter<number>): Parameter<Color>;
export declare function hsl(h: number | Parameter<number>, s: number | Parameter<number>, l: number | Parameter<number>): Parameter<Color>;
export declare function t(): Parameter<number>;
export declare function rnd(): Parameter<number>;
export declare function constant<T>(val: T): Parameter<T>;
export declare function rndNormal(scale?: Parameter<number> | number): Parameter<Point>;
export declare function sin(period: NumberArg): Parameter<number>;
export declare function cos(period: number | Parameter<number>): Parameter<number>;
