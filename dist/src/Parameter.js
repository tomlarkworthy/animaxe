function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
exports.DEBUG = false;
__export(require("./types"));
/**
 * convert an Rx.Observable into a Parameter by providing an initial value. The Parameter's value will update its value
 * every time and event is received from the Rx source
 */
function updateFrom(initialValue, source) {
    return new Parameter(function () {
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
    return new Parameter(function () {
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
    if (typeof source.init == 'function')
        return source;
    else
        return constant(source);
}
exports.from = from;
function point(x, y) {
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
function t() {
    return new Parameter(function () { return function (t) {
        return t;
    }; });
}
exports.t = t;
function rnd() {
    return new Parameter(function () { return function (t) {
        return Math.random();
    }; });
}
exports.rnd = rnd;
function constant(val) {
    return new Parameter(function () { return function (t) {
        return val;
    }; });
}
exports.constant = constant;
function rndNormal(scale) {
    if (scale === void 0) { scale = 1; }
    return new Parameter(function () {
        if (exports.DEBUG)
            console.log("rndNormal: init");
        var scale_next = from(scale).init();
        return function (t) {
            var scale = scale_next(t);
            // generate random numbers
            var norm2 = 100;
            while (norm2 > 1) {
                var x = (Math.random() - 0.5) * 2;
                var y = (Math.random() - 0.5) * 2;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9QYXJhbWV0ZXIudHMiXSwibmFtZXMiOlsidXBkYXRlRnJvbSIsIm92ZXJ3cml0ZVdpdGgiLCJQYXJhbWV0ZXIiLCJQYXJhbWV0ZXIuY29uc3RydWN0b3IiLCJQYXJhbWV0ZXIuaW5pdCIsIlBhcmFtZXRlci5tYXAiLCJQYXJhbWV0ZXIuZmlyc3QiLCJmcm9tIiwicG9pbnQiLCJkaXNwbGFjZVQiLCJyZ2JhIiwiaHNsIiwidCIsInJuZCIsImNvbnN0YW50Iiwicm5kTm9ybWFsIiwic2luIiwiY29zIl0sIm1hcHBpbmdzIjoiOzs7QUFLVyxhQUFLLEdBQUcsS0FBSyxDQUFDO0FBR3pCLGlCQUFjLFNBS2QsQ0FBQyxFQUxzQjtBQUN2Qjs7O0dBR0c7QUFDSCxvQkFBOEIsWUFBZSxFQUFFLE1BQXdCO0lBQ25FQSxNQUFNQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUNoQkE7UUFDSUEsSUFBSUEsS0FBS0EsR0FBR0EsWUFBWUEsQ0FBQ0E7UUFDekJBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLFVBQUFBLENBQUNBLElBQUlBLE9BQUFBLEtBQUtBLEdBQUdBLENBQUNBLEVBQVRBLENBQVNBLENBQUNBLENBQUNBO1FBQ2pDQSxNQUFNQSxDQUFDQSxVQUFDQSxLQUFhQTtZQUNqQkEsTUFBTUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7UUFDakJBLENBQUNBLENBQUFBO0lBQ0xBLENBQUNBLENBQ0pBLENBQUNBO0FBQ05BLENBQUNBO0FBVmUsa0JBQVUsYUFVekIsQ0FBQTtBQUVEOzs7R0FHRztBQUNILHVCQUFpQyxZQUFlLEVBQUUsTUFBd0I7SUFDdEVDLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQ2hCQTtRQUNJQSxJQUFJQSxLQUFLQSxHQUFHQSxZQUFZQSxDQUFDQTtRQUN6QkEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsVUFBQUEsQ0FBQ0EsSUFBSUEsT0FBQUEsS0FBS0EsR0FBR0EsQ0FBQ0EsRUFBVEEsQ0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDakNBLE1BQU1BLENB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QSxNQUFNQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUNoQkE7UUFDSUEsSUFBSUEsV0FBV0EsR0FBR0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDdENBLE1BQU1BLENBQUNBLFVBQVVBLENBQVNBO1lBQ3RCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6RCxFQUFFLENBQUMsQ0FBQyxhQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFDakIsQ0FBQyxDQUFBQTtJQUNMQSxDQUFDQSxDQUNKQSxDQUFDQTtBQUNOQSxDQUFDQTtBQVplLFdBQUcsTUFZbEIsQ0FBQSIsImZpbGUiOiJzcmMvUGFyYW1ldGVyLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
