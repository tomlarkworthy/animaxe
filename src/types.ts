

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
 *
 */
export interface Parameter<T> {

}

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
