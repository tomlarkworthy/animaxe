function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var seedrandom = require("seedrandom");
exports.DEBUG = false;
var types = require("./types");
__export(require("./types"));
if (exports.DEBUG)
    console.log("Parameter: module loading...");
//console.log("seed random", seedrandom)
exports.rndGenerator = seedrandom.xor4096();
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
var Parameter = (function () {
    /**
     * Before a parameter is used, the enclosing animation must call init. This returns a function which
     * can be used to find the value of the function for specific values of time.
     */
    function Parameter(init) {
        this.init = init;
    }
    /**
     * Before a parameter is used, the enclosing animation must call init. This returns a function which
     * can be used to find the value of the function for specific values of time.
     */
    Parameter.prototype.init = function () { throw new Error('This method is abstract'); };
    /**
     * map the value of 'this' to a new parameter
     */
    Parameter.prototype.map = function (fn) {
        var base = this;
        return new Parameter(function () {
            var base_next = base.init();
            return function (t) {
                return fn(base_next(t));
            };
        });
    };
    /**
     * Returns a parameter whose value is forever the first value next picked from this.
     * @returns {Parameter<T>}
     */
    Parameter.prototype.first = function () {
        var self = this;
        return new Parameter(function () {
            var generate = true;
            var next = self.init();
            var value = null;
            return function (clock) {
                if (generate) {
                    generate = false;
                    value = next(clock);
                }
                // console.log("fixed: val from parameter", value);
                return value;
            };
        });
    };
    return Parameter;
})();
exports.Parameter = Parameter;
function from(source) {
    types.assert(source != undefined, "source is not defined");
    if (exports.DEBUG)
        console.log("from: build");
    if (typeof source.init == 'function')
        return source;
    else
        return constant(source);
}
exports.from = from;
function point(x, y) {
    if (exports.DEBUG)
        console.log("point: build");
    return new Parameter(function () {
        var x_next = from(x).init();
        var y_next = from(y).init();
        return function (t) {
            var result = [x_next(t), y_next(t)];
            // console.log("point: next", result);
            return result;
        };
    });
}
exports.point = point;
function displaceT(displacement, value) {
    if (exports.DEBUG)
        console.log("displace: build");
    return new Parameter(function () {
        var dt_next = from(displacement).init(); //todo remove <number>
        var value_next = from(value).init();
        return function (t) {
            var dt = dt_next(t);
            if (exports.DEBUG)
                console.log("displaceT: ", dt);
            return value_next(t + dt);
        };
    });
}
exports.displaceT = displaceT;
/*
    RGB between 0 and 255
    a between 0 - 1 (1 is opaque, 0 is transparent)
 */
function rgba(r, g, b, a) {
    if (exports.DEBUG)
        console.log("rgba: build");
    return new Parameter(function () {
        var r_next = from(r).init();
        var g_next = from(g).init();
        var b_next = from(b).init();
        var a_next = from(a).init();
        return function (t) {
            var r_val = Math.floor(r_next(t));
            var g_val = Math.floor(g_next(t));
            var b_val = Math.floor(b_next(t));
            var a_val = a_next(t);
            var val = "rgba(" + r_val + "," + g_val + "," + b_val + "," + a_val + ")";
            if (exports.DEBUG)
                console.log("color: ", val);
            return val;
        };
    });
}
exports.rgba = rgba;
function hsl(h, s, l) {
    if (exports.DEBUG)
        console.log("hsl: build");
    return new Parameter(function () {
        var h_next = from(h).init();
        var s_next = from(s).init();
        var l_next = from(l).init();
        return function (t) {
            var h_val = Math.floor(h_next(t));
            var s_val = Math.floor(s_next(t));
            var l_val = Math.floor(l_next(t));
            var val = "hsl(" + h_val + "," + s_val + "%," + l_val + "%)";
            // if (DEBUG) console.log("hsl: ", val);
            return val;
        };
    });
}
exports.hsl = hsl;
function seedrnd(seed) {
    if (exports.DEBUG)
        console.log("seedrnd: build");
    return new Parameter(function () {
        var seed_next = from(seed).init();
        return function (t) {
            exports.rndGenerator = seedrandom.xor4096(seed_next(t));
            return;
        };
    });
}
exports.seedrnd = seedrnd;
function t() {
    if (exports.DEBUG)
        console.log("t: build");
    return new Parameter(function () { return function (t) {
        return t;
    }; });
}
exports.t = t;
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
    return new Parameter(function () { return function (t) {
        return val;
    }; });
}
exports.constant = constant;
function rndNormal(scale) {
    if (scale === void 0) { scale = 1; }
    if (exports.DEBUG)
        console.log("rndNormal: build");
    return new Parameter(function () {
        if (exports.DEBUG)
            console.log("rndNormal: init");
        var scale_next = from(scale).init();
        return function (t) {
            var scale = scale_next(t);
            // generate random numbers
            var norm2 = 100;
            while (norm2 > 1) {
                var x = (exports.rndGenerator() - 0.5) * 2;
                var y = (exports.rndGenerator() - 0.5) * 2;
                norm2 = x * x + y * y;
            }
            var norm = Math.sqrt(norm2);
            var val = [scale * x / norm, scale * y / norm];
            if (exports.DEBUG)
                console.log("rndNormal: val", val);
            return val;
        };
    });
}
exports.rndNormal = rndNormal;
//todo: should be t as a parameter to a non tempor
function sin(period) {
    if (exports.DEBUG)
        console.log("sin: new");
    return new Parameter(function () {
        var period_next = from(period).init();
        return function (t) {
            var value = Math.sin(t * (Math.PI * 2) / period_next(t));
            if (exports.DEBUG)
                console.log("sin: tick", t, value);
            return value;
        };
    });
}
exports.sin = sin;
function cos(period) {
    if (exports.DEBUG)
        console.log("cos: new");
    return new Parameter(function () {
        var period_next = from(period).init();
        return function (t) {
            var value = Math.cos(t * (Math.PI * 2) / period_next(t));
            if (exports.DEBUG)
                console.log("cos: tick", t, value);
            return value;
        };
    });
}
exports.cos = cos;
if (exports.DEBUG)
    console.log("Parameter: module loaded");

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9QYXJhbWV0ZXIudHMiXSwibmFtZXMiOlsidXBkYXRlRnJvbSIsIm92ZXJ3cml0ZVdpdGgiLCJQYXJhbWV0ZXIiLCJQYXJhbWV0ZXIuY29uc3RydWN0b3IiLCJQYXJhbWV0ZXIuaW5pdCIsIlBhcmFtZXRlci5tYXAiLCJQYXJhbWV0ZXIuZmlyc3QiLCJmcm9tIiwicG9pbnQiLCJkaXNwbGFjZVQiLCJyZ2JhIiwiaHNsIiwic2VlZHJuZCIsInQiLCJybmQiLCJjb25zdGFudCIsInJuZE5vcm1hbCIsInNpbiIsImNvcyJdLCJtYXBwaW5ncyI6Ijs7O0FBSUEsSUFBWSxVQUFVLFdBQU0sWUFBWSxDQUFDLENBQUE7QUFFOUIsYUFBSyxHQUFHLEtBQUssQ0FBQztBQUV6QixJQUFZLEtBQUssV0FBTSxTQUN2QixDQUFDLENBRCtCO0FBQ2hDLGlCQUFjLFNBRWQsQ0FBQyxFQUZzQjtBQUV2QixFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7SUFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFHdkQsd0NBQXdDO0FBQzdCLG9CQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBRS9DOzs7R0FHRztBQUNILG9CQUE4QixZQUFlLEVBQUUsTUFBd0I7SUFDbkVBLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1FBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLG1CQUFtQkEsQ0FBQ0EsQ0FBQ0E7SUFDNUNBLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQ2hCQTtRQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtZQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxrQkFBa0JBLENBQUNBLENBQUFBO1FBQzFDQSxJQUFJQSxLQUFLQSxHQUFHQSxZQUFZQSxDQUFDQTtRQUN6QkEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsVUFBQUEsQ0FBQ0EsSUFBSUEsT0FBQUEsS0FBS0EsR0FBR0EsQ0FBQ0EsRUFB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TUFBTUEsQ0FBQ0EsSUFBSUEsU0FBU0EsQ0FDaEJBO1FBQ0lBLElBQUlBLFdBQVdBLEdBQUdBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQ3RDQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFTQTtZQUN0QixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekQsRUFBRSxDQUFDLENBQUMsYUFBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM5QyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2pCLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsQ0FDSkEsQ0FBQ0E7QUFDTkEsQ0FBQ0E7QUFaZSxXQUFHLE1BWWxCLENBQUE7QUFJRCxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7SUFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUMiLCJmaWxlIjoic3JjL1BhcmFtZXRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
