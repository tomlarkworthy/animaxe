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
