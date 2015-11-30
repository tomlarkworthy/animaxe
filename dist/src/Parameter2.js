var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
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
//console.log("seed random", seedrandom)
exports.rndGenerator = seedrandom.xor4096();
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
var Parameter = (function (_super) {
    __extends(Parameter, _super);
    /**
     * Before a parameter is used, the enclosing animation must call init. This returns a function which
     * can be used to find the value of the function for specific values of time.
     */
    function Parameter(init) {
        _super.call(this, function (ticker) {
            var next = init();
            return ticker.map(function (tick) { return next(tick.clock); });
        });
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
})(OT.ObservableTransformer);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9QYXJhbWV0ZXIyLnRzIl0sIm5hbWVzIjpbInVwZGF0ZUZyb20iLCJvdmVyd3JpdGVXaXRoIiwiUGFyYW1ldGVyIiwiUGFyYW1ldGVyLmNvbnN0cnVjdG9yIiwiUGFyYW1ldGVyLmluaXQiLCJQYXJhbWV0ZXIubWFwIiwiUGFyYW1ldGVyLmZpcnN0IiwiZnJvbSIsInBvaW50IiwiZGlzcGxhY2VUIiwicmdiYSIsImhzbCIsInNlZWRybmQiLCJ0Iiwicm5kIiwiY29uc3RhbnQiLCJybmROb3JtYWwiLCJzaW4iLCJjb3MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBSUEsSUFBWSxVQUFVLFdBQU0sWUFBWSxDQUFDLENBQUE7QUFDekMsSUFBWSxFQUFFLFdBQU0seUJBRXBCLENBQUMsQ0FGNEM7QUFFbEMsYUFBSyxHQUFHLEtBQUssQ0FBQztBQUV6QixJQUFZLEtBQUssV0FBTSxTQUN2QixDQUFDLENBRCtCO0FBQ2hDLGlCQUFjLFNBRWQsQ0FBQyxFQUZzQjtBQUV2QixFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7SUFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFHdkQsd0NBQXdDO0FBQzdCLG9CQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBRS9DLDJEQUEyRDtBQUUzRDs7O0dBR0c7QUFDSCxvQkFBOEIsWUFBZSxFQUFFLE1BQXdCO0lBQ25FQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFLQSxDQUFDQTtRQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxtQkFBbUJBLENBQUNBLENBQUNBO0lBQzVDQSxNQUFNQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUNoQkE7UUFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsYUFBS0EsQ0FBQ0E7WUFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esa0JBQWtCQSxDQUFDQSxDQUFBQTtRQUMxQ0EsSUFBSUEsS0FBS0EsR0FBR0EsWUFBWUEsQ0FBQ0E7UUFDekJBLE1BQU1BLENBQUNB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LGFBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDOUMsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUNqQixDQUFDLENBQUFBO0lBQ0xBLENBQUNBLENBQ0pBLENBQUNBO0FBQ05BLENBQUNBO0FBWmUsV0FBRyxNQVlsQixDQUFBO0FBQ0QsYUFBb0IsTUFBdUI7SUFDdkNDLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1FBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO0lBQ25DQSxNQUFNQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUNoQkE7UUFDSUEsSUFBSUEsV0FBV0EsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDdENBLE1BQU1BLENBQUNBLFVBQVVBLENBQVNBO1lBQ3RCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6RCxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDakIsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxDQUNKQSxDQUFDQTtBQUNOQSxDQUFDQTtBQVplLFdBQUcsTUFZbEIsQ0FBQTtBQUlELEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztJQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQyIsImZpbGUiOiJzcmMvUGFyYW1ldGVyMi5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
