var Parameter =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports) {

	exports.DEBUG = false;
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
	            //if (DEBUG) console.log("point: next", result);
	            return result;
	        };
	    });
	}
	exports.point = point;
	function displaceT(displacement, value) {
	    return new Parameter(function () {
	        var dt_next = from(displacement).init();
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
	    a between 0 - 1
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


/***/ }
/******/ ]);