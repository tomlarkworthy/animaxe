function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var seedrandom = require("seedrandom");
var OT = require("./ObservableTransformer");
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
    return new OT.ObservableTransformer(function (upstream) {
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
    return new OT.ObservableTransformer(function (upstream) {
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
function displaceT(displacement, value) {
    return new OT.ChainableTransformer(function (_) { return _; }).skewT(displacement).pipe(from(value));
}
exports.displaceT = displaceT;
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
    return new OT.ObservableTransformer(function (upstream) { return upstream.map(function (_) { return exports.rndGenerator(); }); });
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9QYXJhbWV0ZXIudHMiXSwibmFtZXMiOlsidXBkYXRlRnJvbSIsIm92ZXJ3cml0ZVdpdGgiLCJmcm9tIiwicG9pbnQiLCJmaXJzdCIsImRpc3BsYWNlVCIsInJnYmEiLCJoc2wiLCJzZWVkcm5kIiwicm5kIiwiY29uc3RhbnQiLCJybmROb3JtYWwiLCJzaW4iLCJjb3MiLCJ0Il0sIm1hcHBpbmdzIjoiOzs7QUFJQSxJQUFZLFVBQVUsV0FBTSxZQUFZLENBQUMsQ0FBQTtBQUN6QyxJQUFZLEVBQUUsV0FBTSx5QkFDcEIsQ0FBQyxDQUQ0QztBQUdsQyxhQUFLLEdBQUcsS0FBSyxDQUFDO0FBRXpCLElBQVksS0FBSyxXQUFNLFNBQ3ZCLENBQUMsQ0FEK0I7QUFDaEMsaUJBQWMsU0FFZCxDQUFDLEVBRnNCO0FBRXZCLEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztJQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUU1QyxvQkFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBRWpFLDJEQUEyRDtBQUUzRDs7O0dBR0c7QUFDSCxvQkFBOEIsWUFBZSxFQUFFLE1BQXdCO0lBQ25FQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtRQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO0lBQzVDQSxNQUFNQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQSxxQkFBcUJBLENBQy9CQSxVQUFDQSxRQUFvQ0E7UUFDakNBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGtCQUFrQkEsQ0FBQ0EsQ0FBQ0E7UUFDM0NBLElBQUlBLEtBQUtBLEdBQUdBLFlBQVlBLENBQUNBO1FBQ3pCQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxVQUFBQSxDQUFDQSxJQUFJQSxPQUFBQSxLQUFLQSxHQUFHQSxDQUFDQSxFQUFUQSxDQUFTQSxDQUFDQSxDQUFDQTtRQUNqQ0EsTUFBTUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQUEsQ0FBQ0EsSUFBSUEsT0FBQUEsS0FBS0EsRUFBTEEsQ0FBS0EsQ0FBQ0EsQ0FBQUE7SUFDbkNBLENBQUNBLENBQ0pBLENBQUFBO0FBQ0xBLENBQUNBO0FBVmUsa0JBQVUsYUFVekIsQ0FBQTtBQUVEOzs7R0FHRztBQUNILHVCQUFpQyxZQUFlLEVBQUUsTUFBd0I7SUFDdEVDLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1FBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHNCQUFzQkEsQ0FBQ0EsQ0FBQ0E7SUFDL0NBLE1BQU1BLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLHFCQUFxQkEsQ0FDL0JBLFVBQUNBLFFBQW9DQTtRQUNqQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxDQUFDQSxDQUFBQTtRQUM3Q0EsSUFBSUEsS0FBS0EsR0FBR0EsWUFBWUEsQ0FBQ0E7UUFDekJBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLFVBQUFBLENBQUNBLElBQUlBLE9BQUFBLEtBQUtBLEdBQUdBLENBQUNBLEVBQVRBLENBQVNBLENBQUNBLENBQUNBO1FBQ2pDQSxNQUFNQSxDQUFDQSxRQUFRQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFBQSxDQUFDQTtZQUNqQkEsSUFBSUEsV0FBV0EsR0FBR0EsS0FBS0EsQ0FBQ0E7WUFDeEJBLEtBQUtBLEdBQUdBLFlBQVlBLENBQUNBLENBQUNBLHdCQUF3QkE7WUFDOUNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBO1FBQ3ZCQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNQQSxDQUFDQSxDQUNKQSxDQUFDQTtBQUNOQSxDQUFDQTtBQWRlLHFCQUFhLGdCQWM1QixDQUFBO0FBMkJELGNBQXdCLE1BQXdCO0lBQzVDQyxLQUFLQSxDQUFDQSxNQUFNQSxDQUFFQSxNQUFNQSxJQUFJQSxTQUFTQSxFQUFFQSx1QkFBdUJBLENBQUNBLENBQUNBO0lBQzVEQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtRQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxhQUFhQSxDQUFDQSxDQUFDQTtJQUN0Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsT0FBYUEsTUFBT0EsQ0FBQ0EsTUFBTUEsSUFBSUEsVUFBVUEsQ0FBQ0E7UUFBQ0EsTUFBTUEsQ0FBZUEsTUFBTUEsQ0FBQ0E7SUFDM0VBLElBQUlBO1FBQUNBLE1BQU1BLENBQUNBLFFBQVFBLENBQUtBLE1BQU1BLENBQUNBLENBQUFBO0FBQ3BDQSxDQUFDQTtBQUxlLFlBQUksT0FLbkIsQ0FBQTtBQUdELGVBQ0ksQ0FBa0IsRUFDbEIsQ0FBa0I7SUFHbEJDLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1FBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGNBQWNBLENBQUNBLENBQUNBO0lBQ3ZDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUNsQkE7UUFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7UUFDdENBLE1BQU1BLENBQUNBLFVBQUNBLENBQVNBLEVBQUVBLENBQVNBO1lBQ3hCQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsYUFBYUEsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDNUNBLE1BQU1BLENBQWNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUFBO1FBQzlCQSxDQUFDQSxDQUFBQTtJQUNMQSxDQUFDQSxFQUNEQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUNWQSxDQUFDQTtBQUNOQSxDQUFDQTtBQWhCZSxhQUFLLFFB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QUNBLENBQUNBLENBQUNBLEVBQVhBLENBQVdBLENBQUNBLENBQUFBO0FBQzdDQSxDQUFDQTtBQUhlLFdBQUcsTUFHbEIsQ0FBQTtBQUNELGFBQW9CLENBQWtCO0lBQ2xDQyxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtRQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtJQUNyQ0EsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsVUFBQUEsQ0FBQ0EsSUFBSUEsT0FBQUEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBWEEsQ0FBV0EsQ0FBQ0EsQ0FBQUE7QUFDN0NBLENBQUNBO0FBSGUsV0FBRyxNQUdsQixDQUFBO0FBRUQ7SUFDSUMsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7UUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7SUFDbkNBLE1BQU1BLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLHFCQUFxQkEsQ0FDL0JBLFVBQUNBLFFBQW9DQSxJQUFLQSxPQUFBQSxRQUFRQSxDQUFDQSxHQUFHQSxDQUFDQSxVQUFBQSxJQUFJQSxJQUFJQSxPQUFBQSxJQUFJQSxDQUFDQSxLQUFLQSxFQUFWQSxDQUFVQSxDQUFDQSxFQUFoQ0EsQ0FBZ0NBLENBQzdFQSxDQUFBQTtBQUNMQSxDQUFDQTtBQUxlLFNBQUMsSUFLaEIsQ0FBQTtBQUlELEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztJQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQyIsImZpbGUiOiJzcmMvUGFyYW1ldGVyLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
