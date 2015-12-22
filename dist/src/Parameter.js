function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var seedrandom = require("seedrandom");
var OT = require("./ObservableTransformer");
var zip = require("./zip");
exports.DEBUG = true;
var types = require("./types");
__export(require("./types"));
if (exports.DEBUG)
    console.log("Parameter: module loading...");
//console.log("seed random", seedrandom)
exports.rndGenerator = seedrandom.xor4096(Math.random() + "");
// Parameter is a transformer from (clock signals -> Value)
/**
 * convert an Rx.Observable into a Parameter by providing an initial value. The Parameter's value will update its value
 * every time and event is received from the Rx source
 */
function updateFrom(initialValue, source) {
    if (exports.DEBUG)
        console.log("updateFrom: build");
    return new Parameter(function () {
        if (exports.DEBUG)
            console.log("updateFrom: init");
        var value = initialValue;
        source.subscribe(function (x) { return value = x; });
        return function (clock) {
            return value;
        };
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
    return new Parameter(function () {
        if (exports.DEBUG)
            console.log("overwriteWith: init");
        var value = defaultValue;
        source.subscribe(function (x) { return value = x; });
        return function (clock) {
            var returnValue = value;
            value = defaultValue; // reset value each time
            return returnValue;
        };
    });
}
exports.overwriteWith = overwriteWith;
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
    return from(x).combine1(from(y), function () {
        if (exports.DEBUG)
            console.log("point: init");
        return function (x, y) {
            if (exports.DEBUG)
                console.log("point: tick", x, y);
            return [x, y];
        };
    });
}
exports.point = point;
function displaceT(displacement, value) {
    if (exports.DEBUG)
        console.log("displaceT: build");
    return new OT.ObservableTransformer(function (upstream) {
        var clockSkew = zip.zip(function (tick, dt) {
            console.log("displaceT", tick.clock, dt);
            return new OT.BaseTick(tick.clock + dt, tick.dt, tick.ctx);
        }, upstream, from(displacement).attach(upstream));
        return from(value).attach(clockSkew);
    });
}
exports.displaceT = displaceT;
function first(value) {
    if (exports.DEBUG)
        console.log("first: build");
    return value.combine1(value, // TODO: we are evaluating this even though we don;t use the result
    function () {
        if (exports.DEBUG)
            console.log("first: init");
        var first = true;
        var firstValue = null;
        return function (tick, value) {
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
/*
    RGB between 0 and 255
    a between 0 - 1 (1 is opaque, 0 is transparent)
 */
function rgba(r, g, b, a) {
    if (exports.DEBUG)
        console.log("rgba: build");
    return from(r).combine3(from(g), from(b), from(a), function () {
        if (exports.DEBUG)
            console.log("rgba: init");
        return function (r, g, b, a) {
            var val = "rgba(" + Math.floor(r) + "," + Math.floor(g) + "," + Math.floor(b) + "," + a + ")";
            if (exports.DEBUG)
                console.log("rgba: ", val);
            return val;
        };
    });
}
exports.rgba = rgba;
function hsl(h, s, l) {
    if (exports.DEBUG)
        console.log("hsl: build");
    return from(h).combine2(from(s), from(l), function () { return function (h, s, l) {
        var val = "hsl(" + h + "," + s + "%," + l + "%)";
        // if (DEBUG) console.log("hsl: ", val);
        return val;
    }; });
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
    return new Parameter(function () { return function (t) {
        return exports.rndGenerator();
    }; });
}
exports.rnd = rnd;
function constant(val) {
    if (exports.DEBUG)
        console.log("constant: build");
    return new OT.ObservableTransformer(function (upstream) { return upstream.map(function (_) { return val; }); });
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
    return new OT.ObservableTransformer(function (upstream) { return upstream.map(function (tick) { return tick.clock; }); });
}
exports.t = t;
if (exports.DEBUG)
    console.log("Parameter: module loaded");
