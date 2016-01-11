function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var seedrandom = require("seedrandom");
var OT = require("./FRP");
var parametric = require("./parametric");
__export(require("./List"));
exports.DEBUG = false;
var types = require("./types");
__export(require("./types"));
if (exports.DEBUG)
    console.log("Parameter: module loading...");
exports.rndGenerator = seedrandom.xor4096(Math.random() + "");
// Parameter is a transformer from (clock signals -> Value)
/**
 * convert an Rx.Observable into a Parameter by providing an initial value. The Parameter's value will update its value
 * every time and event is received from the Rx source
 */
function updateFrom(initialValue, source) {
    if (exports.DEBUG)
        console.log("updateFrom: build");
    return new OT.SignalFn(function (upstream) {
        if (exports.DEBUG)
            console.log("updateFrom: init");
        var value = initialValue;
        source.subscribe(function (x) { return value = x; });
        return upstream.map(function (_) { return value; });
    });
}
exports.updateFrom = updateFrom;
/**
 * convert an Rx.Observable into a Parameter by providing an default value. The Parameter's value will be replaced
 * with the value from the provided Rx.Observable for one tick only
 */
function overwriteWith(defaultValue, source) {
    if (exports.DEBUG)
        console.log("overwriteWith: build");
    return new OT.SignalFn(function (upstream) {
        if (exports.DEBUG)
            console.log("overwriteWith: init");
        var value = defaultValue;
        source.subscribe(function (x) { return value = x; });
        return upstream.map(function (_) {
            var returnValue = value;
            value = defaultValue; // reset value each time
            return returnValue;
        });
    });
}
exports.overwriteWith = overwriteWith;
/**
 * OUT OF DATE DOCUMENTATION
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
function from(source) {
    types.assert(source != undefined, "source is not defined");
    if (exports.DEBUG)
        console.log("from: build");
    if (typeof source.attach == 'function')
        return source;
    else
        return constant(source);
}
exports.from = from;
function point(x, y) {
    if (exports.DEBUG)
        console.log("point: build");
    return from(x).combine(function () {
        if (exports.DEBUG)
            console.log("point: init");
        return function (x, y) {
            if (exports.DEBUG)
                console.log("point: tick", x, y);
            return [x, y];
        };
    }, from(y));
}
exports.point = point;
function first(value) {
    if (exports.DEBUG)
        console.log("first: build");
    return value.combine(function () {
        if (exports.DEBUG)
            console.log("first: init");
        var first = true;
        var firstValue = null;
        return function (value) {
            if (first) {
                first = false;
                firstValue = value;
                if (exports.DEBUG)
                    console.log("first: firstValue", firstValue);
            }
            return firstValue;
        };
    });
}
exports.first = first;
function skewT(displacement, value) {
    return new OT.SignalPipe(function (_) { return _; }).skewT(displacement).pipe(from(value));
}
exports.skewT = skewT;
/*
    RGB between 0 and 255
    a between 0 - 1 (1 is opaque, 0 is transparent)
 */
function rgba(r, g, b, a) {
    if (exports.DEBUG)
        console.log("rgba: build");
    return from(r).combine(function () {
        if (exports.DEBUG)
            console.log("rgba: init");
        return function (r, g, b, a) {
            var val = "rgba(" + Math.floor(r) + "," + Math.floor(g) + "," + Math.floor(b) + "," + a + ")";
            if (exports.DEBUG)
                console.log("rgba: ", val);
            return val;
        };
    }, from(g), from(b), from(a));
}
exports.rgba = rgba;
function rgbaFromList(list) {
    return list.mapValue(function (rgba) { return "rgba(" + Math.floor(rgba[0]) + "," + Math.floor(rgba[1]) + "," + Math.floor(rgba[2]) + "," + rgba[3] + ")"; });
}
exports.rgbaFromList = rgbaFromList;
function hsl(h, s, l) {
    if (exports.DEBUG)
        console.log("hsl: build");
    return from(h).combine(function () { return function (h, s, l) {
        var val = "hsl(" + h + "," + s + "%," + l + "%)";
        // if (DEBUG) console.log("hsl: ", val);
        return val;
    }; }, from(s), from(l));
}
exports.hsl = hsl;
function seedrnd(seed) {
    if (exports.DEBUG)
        console.log("seedrnd: build");
    return from(seed).mapValue(function (seed) {
        if (exports.DEBUG)
            console.log("seedrnd: seeding", seed);
        exports.rndGenerator = seedrandom.xor4096(seed);
        return;
    });
}
exports.seedrnd = seedrnd;
function rnd() {
    if (exports.DEBUG)
        console.log("rnd: build");
    return new OT.SignalFn(function (upstream) { return upstream.map(function (_) { return exports.rndGenerator(); }); });
}
exports.rnd = rnd;
function constant(val) {
    if (exports.DEBUG)
        console.log("constant: build");
    return new OT.SignalFn(function (upstream) { return upstream.map(function (_) { return val; }); });
}
exports.constant = constant;
function rndNormal(scale) {
    if (scale === void 0) { scale = 1; }
    if (exports.DEBUG)
        console.log("rndNormal: build");
    return from(scale).mapValue(function (scale) {
        // generate random numbers
        var norm2 = 1; // arbitary value to beat loop condition
        while (norm2 >= 1) {
            var x = (exports.rndGenerator() - 0.5) * 2;
            var y = (exports.rndGenerator() - 0.5) * 2;
            norm2 = x * x + y * y;
        }
        var norm = Math.sqrt(norm2);
        var val = [scale * x / norm, scale * y / norm];
        if (exports.DEBUG)
            console.log("rndNormal: val", val);
        return val;
    });
}
exports.rndNormal = rndNormal;
//todo: should be t as a parameter to a non tempor
function sin(x) {
    if (exports.DEBUG)
        console.log("sin: build");
    return from(x).mapValue(function (x) { return Math.sin(x); });
}
exports.sin = sin;
function cos(x) {
    if (exports.DEBUG)
        console.log("cos: build");
    return from(x).mapValue(function (x) { return Math.cos(x); });
}
exports.cos = cos;
function t() {
    if (exports.DEBUG)
        console.log("t: build");
    return new OT.SignalFn(function (upstream) { return upstream.map(function (tick) {
        return tick.clock;
    }); });
}
exports.t = t;
function trace(equations, t_min, t_max, tolerance_px2, minimum_splits, maximum_splits) {
    if (tolerance_px2 === void 0) { tolerance_px2 = 1; }
    if (minimum_splits === void 0) { minimum_splits = 4; }
    if (maximum_splits === void 0) { maximum_splits = 100; }
    return equations.combine(function () { return function (equations, t_min, t_max, tolerance_px2, minimum_splits, maximum_splits) {
        return parametric.trace(equations, t_min, t_max, tolerance_px2, minimum_splits, maximum_splits);
    }; }, from(t_min), from(t_max), from(tolerance_px2), from(minimum_splits), from(maximum_splits));
}
exports.trace = trace;
