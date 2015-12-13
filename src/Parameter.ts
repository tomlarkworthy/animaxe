/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/seedrandom.d.ts" />
import * as Rx from "rx";
import * as seedrandom from "seedrandom";
import * as OT from "./ObservableTransformer"
import * as zip from "./zip"

export var DEBUG = true;

import * as types from "./types"
export * from "./types"

if (DEBUG) console.log("Parameter: module loading...");


//console.log("seed random", seedrandom)
export var rndGenerator = seedrandom.xor4096(Math.random() + "");

// Parameter is a transformer from (clock signals -> Value)

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

export type Parameter<Value> = OT.ObservableTransformer<OT.BaseTick, Value>;

/*
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
    */


export function from<T>(source: T | Parameter<T>): Parameter<T> {
    types.assert (source != undefined, "source is not defined");
    if (DEBUG) console.log("from: build");
    if (typeof (<any>source).attach == 'function') return <Parameter<T>>source;
    else return constant(<T> source)
}


export function point(
    x: types.NumberArg,
    y: types.NumberArg
): Parameter<types.Point>
{
    if (DEBUG) console.log("point: build");
    return OT.ObservableTransformer.merge2(
        from(x), 
        from(y), 
        () => {
            if (DEBUG) console.log("point: init");
            return (x: number, y: number) => <types.Point>[x, y]   
        }
    )
}


export function displaceT<T>(displacement: types.NumberArg, value: T | Parameter<T>): Parameter<T> {
    if (DEBUG) console.log("displaceT: build");
    
    return new OT.ObservableTransformer<OT.BaseTick, T>(
        (upstream: Rx.Observable<OT.BaseTick>) => {
            var clockSkew = zip.zip(
                (tick: OT.BaseTick, dt: number) => {
                    console.log("displaceT", tick.clock, dt)
                    return new OT.BaseTick(tick.clock + dt, tick.dt, tick.ctx)    
                },
                upstream,
                from(displacement).attach(upstream)
            )
            
            return from(value).attach(clockSkew)
        }
    )
}

export function first<T>(value: Parameter<T>): Parameter<T> {   
    if (DEBUG) console.log("first: build");
    return value.combine1(
        value,
        () => {
            if (DEBUG) console.log("first: init");
            var first = true;
            var firstValue: T = null;
            
            return (tick, value: T) => {
                if (first) {
                    first = false;
                    firstValue = value;
                    if (DEBUG) console.log("first: firstValue", firstValue);
                }
                return firstValue;
            }
        }
    )
}

/*
    RGB between 0 and 255
    a between 0 - 1 (1 is opaque, 0 is transparent)
 */
export function rgba(
    r: types.NumberArg,
    g: types.NumberArg,
    b: types.NumberArg,
    a: types.NumberArg
): Parameter<types.Color>
{
    if (DEBUG) console.log("rgba: build");
    return OT.ObservableTransformer.merge4(
        from(r),
        from(g),
        from(b),
        from(a),
        () => {
            if (DEBUG) console.log("rgba: init");
            return (r,g,b,a) => {
                var val = "rgba(" + Math.floor(r) + "," + Math.floor(g) + "," + Math.floor(b) + "," + a + ")";
                if (DEBUG) console.log("rgba: ", val);
                return val; 
            }
        }
    )
}

export function hsl(
    h: types.NumberArg,
    s: types.NumberArg,
    l: types.NumberArg
): Parameter<types.Color>
{
    if (DEBUG) console.log("hsl: build");
    return OT.ObservableTransformer.merge3(
        from(h),
        from(s),
        from(l),
        () => (h, s, l) => {
            var val = "hsl(" + h + "," + s + "%," + l + "%)";
            // if (DEBUG) console.log("hsl: ", val);
            return val;
        }
    );
}

export function seedrnd(seed: types.StringArg): Parameter<void> {
    if (DEBUG) console.log("seedrnd: build");
    return from(seed).mapValue(seed => {
        seedrandom.xor4096(seed);
        return;
    });
}

export function rnd(): Parameter<number> {
    if (DEBUG) console.log("rnd: build");
    return new Parameter(
        () => function (t) {
            return rndGenerator();
        }
    );
}

export function constant<T>(val: T): Parameter<T> {
    if (DEBUG) console.log("constant: build");
    return new OT.ObservableTransformer<OT.BaseTick, T> (
        upstream => upstream.map(_ => val)
    );
}

export function rndNormal(scale : Parameter<number> | number = 1): Parameter<types.Point> {
    if (DEBUG) console.log("rndNormal: build");
    return from(scale).mapValue(
        scale => {
            // generate random numbers
            var norm2 = 1; // arbitary value to beat loop condition
            while (norm2 >= 1) { //reject those outside the unit circle
                var x = (rndGenerator() - 0.5) * 2;
                var y = (rndGenerator() - 0.5) * 2;
                norm2 = x * x + y * y;
            }
            var norm = Math.sqrt(norm2);
            var val: [number, number] = [scale * x / norm , scale * y / norm];
            if (DEBUG) console.log("rndNormal: val", val);
            return val;
        }
    );
}


//todo: should be t as a parameter to a non tempor
export function sin(x: types.NumberArg): Parameter<number> {   
    if (DEBUG) console.log("sin: build");
    return from(x).mapValue(x => Math.sin(x))
}
export function cos(x: types.NumberArg): Parameter<number> {   
    if (DEBUG) console.log("cos: build");
    return from(x).mapValue(x => Math.cos(x))
}

export function t(): Parameter<number> {   
    if (DEBUG) console.log("t: build");
    return new OT.ObservableTransformer(
        (upstream: Rx.Observable<OT.BaseTick>) => upstream.map(tick => tick.clock)
    )
}



if (DEBUG) console.log("Parameter: module loaded");

