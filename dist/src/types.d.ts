import { Parameter } from "./Parameter";
/**
 * A css encoded color, e.g. "rgba(255, 125, 32, 0.5)" or "red"
 */
export declare type Color = string;
/**
 * A 2D array of numbers used for representing points or vectors
 */
export declare type Point = [number, number];
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export declare type NumberArg = number | Parameter<number>;
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export declare type PointArg = Point | Parameter<Point>;
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export declare type ColorArg = Color | Parameter<Color>;
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export declare type StringArg = string | Parameter<string>;
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export declare type BooleanArg = boolean | Parameter<boolean>;
export declare function applyMixins(derivedCtor: any, baseCtors: any[]): void;
