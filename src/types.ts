import {Parameter} from "./Parameter"
/**
 * A css encoded color, e.g. "rgba(255, 125, 32, 0.5)" or "red"
 */
export type Color = string
/**
 * A 2D array of numbers used for representing points or vectors
 */
export type Point     = [number, number]

/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export type NumberArg = number | Parameter<number>
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export type PointArg  = Point | Parameter<Point>
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export type ColorArg  = Color | Parameter<Color>
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export type StringArg = string | Parameter<string>
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export type BooleanArg = boolean | Parameter<boolean>


export function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        })
    });
}
