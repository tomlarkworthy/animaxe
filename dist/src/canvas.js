var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var Parameter = require("../src/Parameter");
var OT = require("./frp");
var glow = require("./glow");
__export(require("./types"));
var DEBUG = false;
/**
 * Each frame an animation is provided a CanvasTick. The tick exposes access to the local animation time, the
 * time delta between the previous frame (dt) and the drawing context. Animators typically use the drawing context
 * directly, and pass the clock onto any time varying parameters.
 */
var Tick = (function (_super) {
    __extends(Tick, _super);
    function Tick(clock, dt, ctx, events, previous) {
        _super.call(this, clock, dt, previous);
        this.clock = clock;
        this.dt = dt;
        this.ctx = ctx;
        this.events = events;
        this.previous = previous;
    }
    Tick.prototype.copy = function () {
        return new Tick(this.clock, this.dt, this.ctx, this.events, this.previous);
    };
    Tick.prototype.save = function () {
        var cp = _super.prototype.save.call(this);
        cp.ctx.save();
        return cp;
    };
    Tick.prototype.restore = function () {
        var cp = _super.prototype.restore.call(this);
        cp.ctx.restore();
        return cp;
    };
    return Tick;
})(OT.BaseTick);
exports.Tick = Tick;
var Operation = (function (_super) {
    __extends(Operation, _super);
    function Operation(attach) {
        _super.call(this, attach);
        this.attach = attach;
    }
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    Operation.prototype.create = function (attach) {
        if (attach === void 0) { attach = function (nop) { return nop; }; }
        return new Operation(attach);
    };
    /**
     * Affect this with an effect to create combined animation.
     * Debug messages are inserted around the effect (e.g. a mutation to the canvas).
     * You  can expose time varying or constant parameters to the inner effect using the optional params.
     */
    Operation.prototype.loggedAffect = function (label, effectBuilder, param1, param2, param3, param4, param5, param6, param7, param8) {
        if (DEBUG) {
            var elements = [];
            if (param1 !== undefined)
                elements.push(param1 + "");
            if (param2 !== undefined)
                elements.push(param2 + "");
            if (param3 !== undefined)
                elements.push(param3 + "");
            if (param4 !== undefined)
                elements.push(param4 + "");
            if (param5 !== undefined)
                elements.push(param5 + "");
            if (param6 !== undefined)
                elements.push(param6 + "");
            if (param7 !== undefined)
                elements.push(param7 + "");
            if (param8 !== undefined)
                elements.push(param8 + "");
            console.log(label + ": build (" + elements.join(",") + ")");
        }
        return this.affect(function () {
            if (DEBUG)
                console.log(label + ": attach");
            var effect = effectBuilder();
            return function (tick, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
                if (DEBUG) {
                    var elements = [];
                    if (arg1 !== undefined)
                        elements.push(arg1 + "");
                    if (arg2 !== undefined)
                        elements.push(arg2 + "");
                    if (arg3 !== undefined)
                        elements.push(arg3 + "");
                    if (arg4 !== undefined)
                        elements.push(arg4 + "");
                    if (arg5 !== undefined)
                        elements.push(arg5 + "");
                    if (arg6 !== undefined)
                        elements.push(arg6 + "");
                    if (arg7 !== undefined)
                        elements.push(arg7 + "");
                    if (arg8 !== undefined)
                        elements.push(arg8 + "");
                    console.log(label + ": tick (" + elements.join(",") + ")");
                }
                effect(tick, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
            };
        }, (param1 !== undefined ? Parameter.from(param1) : undefined), (param2 !== undefined ? Parameter.from(param2) : undefined), (param3 !== undefined ? Parameter.from(param3) : undefined), (param4 !== undefined ? Parameter.from(param4) : undefined), (param5 !== undefined ? Parameter.from(param5) : undefined), (param6 !== undefined ? Parameter.from(param6) : undefined), (param7 !== undefined ? Parameter.from(param7) : undefined), (param8 !== undefined ? Parameter.from(param8) : undefined));
    };
    Operation.prototype.velocity = function (velocity) {
        if (DEBUG)
            console.log("velocity: build");
        return this.affect(function () {
            if (DEBUG)
                console.log("velocity: attach");
            var pos = [0.0, 0.0];
            return function (tick, velocity) {
                if (DEBUG)
                    console.log("velocity: tick", velocity, pos);
                tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
                pos[0] += velocity[0] * tick.dt;
                pos[1] += velocity[1] * tick.dt;
            };
        }, Parameter.from(velocity));
    };
    Operation.prototype.tween_linear = function (from, to, time) {
        return this.affect(function () {
            var t = 0;
            if (DEBUG)
                console.log("tween: init");
            return function (tick, from, to, time) {
                t = t + tick.dt;
                if (t > time)
                    t = time;
                var x = from[0] + (to[0] - from[0]) * t / time;
                var y = from[1] + (to[1] - from[1]) * t / time;
                if (DEBUG)
                    console.log("tween: tick", x, y, t);
                tick.ctx.transform(1, 0, 0, 1, x, y);
            };
        }, Parameter.from(from), Parameter.from(to), Parameter.from(time));
    };
    Operation.prototype.glow = function (decay) {
        if (decay === void 0) { decay = 0.1; }
        return glow.glow(this, decay);
    };
    // Canvas API
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    Operation.prototype.strokeStyle = function (color) {
        return this.loggedAffect("strokeStyle", function () { return function (tick, color) {
            return tick.ctx.strokeStyle = color;
        }; }, color);
    };
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    Operation.prototype.fillStyle = function (color) {
        return this.loggedAffect("fillStyle", function () { return function (tick, color) {
            return tick.ctx.fillStyle = color;
        }; }, color);
    };
    /**
     * Dynamic chainable wrapper for shadowColor in the canvas API.
     */
    Operation.prototype.shadowColor = function (color) {
        return this.loggedAffect("shadowColor", function () { return function (tick, color) {
            return tick.ctx.shadowColor = color;
        }; }, color);
    };
    /**
     * Dynamic chainable wrapper for shadowBlur in the canvas API.
     */
    Operation.prototype.shadowBlur = function (level) {
        return this.loggedAffect("shadowBlur", function () { return function (tick, level) {
            return tick.ctx.shadowBlur = level;
        }; }, level);
    };
    /**
     * Dynamic chainable wrapper for shadowOffsetX and shadowOffsetY in the canvas API.
     */
    Operation.prototype.shadowOffset = function (xy) {
        return this.loggedAffect("shadowOffset", function () { return function (tick, xy) {
            tick.ctx.shadowOffsetX = xy[0];
            tick.ctx.shadowOffsetY = xy[1];
        }; }, xy);
    };
    /**
     * Dynamic chainable wrapper for lineCap in the canvas API.
     */
    Operation.prototype.lineCap = function (style) {
        return this.loggedAffect("lineCap", function () { return function (tick, arg) {
            return tick.ctx.lineCap = arg;
        }; }, style);
    };
    /**
     * Dynamic chainable wrapper for lineJoin in the canvas API.
     */
    Operation.prototype.lineJoin = function (style) {
        return this.loggedAffect("lineJoin", function () { return function (tick, arg) {
            return tick.ctx.lineJoin = arg;
        }; }, style);
    };
    /**
     * Dynamic chainable wrapper for lineWidth in the canvas API.
     */
    Operation.prototype.lineWidth = function (width) {
        return this.loggedAffect("lineWidth", function () { return function (tick, arg) {
            return tick.ctx.lineWidth = arg;
        }; }, width);
    };
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    Operation.prototype.miterLimit = function (limit) {
        return this.loggedAffect("miterLimit", function () { return function (tick, arg) {
            return tick.ctx.miterLimit = arg;
        }; }, limit);
    };
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    Operation.prototype.rect = function (xy, width_height) {
        return this.loggedAffect("rect", function () { return function (tick, xy, width_height) {
            return tick.ctx.rect(xy[0], xy[1], width_height[0], width_height[1]);
        }; }, xy, width_height);
    };
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    Operation.prototype.fillRect = function (xy, width_height) {
        return this.loggedAffect("fillRect", function () { return function (tick, xy, width_height) {
            return tick.ctx.fillRect(xy[0], xy[1], width_height[0], width_height[1]);
        }; }, xy, width_height);
    };
    /**
     * Dynamic chainable wrapper for strokeRect in the canvas API.
     */
    Operation.prototype.strokeRect = function (xy, width_height) {
        return this.loggedAffect("strokeRect", function () { return function (tick, xy, width_height) {
            return tick.ctx.strokeRect(xy[0], xy[1], width_height[0], width_height[1]);
        }; }, xy, width_height);
    };
    /**
     * Dynamic chainable wrapper for clearRect in the canvas API.
     */
    Operation.prototype.clearRect = function (xy, width_height) {
        return this.loggedAffect("clearRect", function () { return function (tick, xy, width_height) {
            return tick.ctx.clearRect(xy[0], xy[1], width_height[0], width_height[1]);
        }; }, xy, width_height);
    };
    /**
     * Encloses the inner animation with a beginpath() and endpath() from the canvas API.
     *
     * This returns a path object which events can be subscribed to
     */
    Operation.prototype.withinPath = function (inner) {
        return this.pipe(new PathAnimation(function (upstream) {
            if (DEBUG)
                console.log("withinPath: attach");
            var beginPathBeforeInner = upstream.tapOnNext(function (tick) { return tick.ctx.beginPath(); });
            return inner.attach(beginPathBeforeInner).tapOnNext(function (tick) { return tick.ctx.closePath(); });
        }));
    };
    /**
     * Dynamic chainable wrapper for fill in the canvas API.
     */
    Operation.prototype.closePath = function () {
        return this.loggedAffect("closePath", function () { return function (tick) {
            return tick.ctx.closePath();
        }; });
    };
    /**
     * Dynamic chainable wrapper for fill in the canvas API.
     */
    Operation.prototype.beginPath = function () {
        return this.loggedAffect("beginPath", function () { return function (tick) {
            return tick.ctx.beginPath();
        }; });
    };
    /**
     * Dynamic chainable wrapper for fill in the canvas API.
     */
    Operation.prototype.fill = function () {
        return this.loggedAffect("fill", function () { return function (tick) {
            return tick.ctx.fill();
        }; });
    };
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    Operation.prototype.stroke = function () {
        return this.loggedAffect("stroke", function () { return function (tick) {
            return tick.ctx.stroke();
        }; });
    };
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API.
     */
    Operation.prototype.moveTo = function (xy) {
        return this.loggedAffect("moveTo", function () { return function (tick, xy) {
            return tick.ctx.moveTo(xy[0], xy[1]);
        }; }, xy);
    };
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API.
     */
    Operation.prototype.lineTo = function (xy) {
        return this.loggedAffect("lineTo", function () { return function (tick, xy) {
            return tick.ctx.lineTo(xy[0], xy[1]);
        }; }, xy);
    };
    /**
     * Dynamic chainable wrapper for clip in the canvas API.
     */
    Operation.prototype.clip = function () {
        return this.loggedAffect("clip", function () { return function (tick) {
            return tick.ctx.clip();
        }; });
    };
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    Operation.prototype.quadraticCurveTo = function (control, end) {
        return this.loggedAffect("quadraticCurveTo", function () { return function (tick, arg1, arg2) {
            return tick.ctx.quadraticCurveTo(arg1[0], arg1[1], arg2[0], arg2[1]);
        }; }, control, end);
    };
    /**
     * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
     */
    Operation.prototype.bezierCurveTo = function (control1, control2, end) {
        return this.loggedAffect("bezierCurveTo", function () { return function (tick, arg1, arg2, arg3) {
            return tick.ctx.bezierCurveTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3[0], arg3[1]);
        }; }, control1, control2, end);
    };
    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    Operation.prototype.arcTo = function (tangent1, tangent2, radius) {
        return this.loggedAffect("arcTo", function () { return function (tick, arg1, arg2, arg3) {
            return tick.ctx.arcTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3);
        }; }, tangent1, tangent2, radius);
    };
    Operation.prototype.ellipticArcTo = function (start, radius, xAxisRotationRad, largeArc, sweep, end) {
        return this.loggedAffect("ellipticArcTo", function () { return function (tick, X1, R, psi, fa, fs, X2) {
            console.log("elliptical R", R);
            var x1 = X1[0], y1 = X1[1], x2 = X2[0], y2 = X2[1], rx = R[0], ry = R[1];
            var cos = Math.cos(psi * Math.PI * 2.0 / 360);
            var sin = Math.sin(psi * Math.PI * 2.0 / 360);
            // step 1
            var x1_prime = cos * (x1 - x2) / 2.0 + sin * (y1 - y2) / 2.0;
            var y1_prime = -sin * (x1 - x2) / 2.0 + cos * (y1 - y2) / 2.0;
            // step 2
            var polarity2 = fs == fa ? -1 : 1;
            var numerator; // = (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime);
            // we worry about if the numerator is too small, we scale up rx and ry by unknown 's'
            // we want the numerator to be positive, so we find when the numerator crosses the 0 line
            // 0 = (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime)
            // we know most of these values, so we can simplify to
            // 0 = s * s * s * s * a - s * s * b - s * s * c
            // where a = rx * rx * ry * ry
            //       b = rx * rx * y1_prime * y1_prime
            //       c = ry * ry * x1_prime * x1_prime
            // or if s * s = t 
            // 0 = a * t * t  - b * t - c * t
            // 0 = t(at - b - c), trivial solution at t = 0
            // interesting solution at 
            // 0 = at - b - c
            // t = (b + c) / a
            // s = sqrt((b + c) / a)
            var a = rx * rx * ry * ry;
            var b = rx * rx * y1_prime * y1_prime;
            var c = ry * ry * x1_prime * x1_prime;
            var scaleToInflection = (b + c) / a;
            if (scaleToInflection < 1) {
            }
            else {
                // SHOULD BE 0
                rx *= Math.sqrt(scaleToInflection);
                ry *= Math.sqrt(scaleToInflection);
            }
            // TODO overwrite value while scaling is not working
            numerator = (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime);
            var denominator = (rx * rx * y1_prime * y1_prime + ry * ry * x1_prime * x1_prime);
            var factor = polarity2 * Math.sqrt(numerator / denominator);
            var cx_prime = factor * rx * y1_prime / ry;
            var cy_prime = -factor * ry * x1_prime / rx;
            // step 3
            var cx = cos * cx_prime - sin * cy_prime + (x1 + x2) / 2;
            var cy = sin * cx_prime + cos * cy_prime + (y1 + y2) / 2;
            // step 4
            var angle = function (u, v) {
                var polarity1 = u[0] * v[1] - u[1] * v[0] > 0 ? 1 : -1;
                var u_length = Math.sqrt(u[0] * u[0] + u[1] * u[1]);
                var v_length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                if (false && DEBUG) {
                    console.log("u, v", u, v);
                    console.log("angle numerator", (u[0] * v[0] + u[1] * v[1]));
                    console.log("angle denominator", u_length * v_length);
                }
                return polarity1 * Math.acos((u[0] * v[0] + u[1] * v[1]) /
                    (u_length * v_length));
            };
            var v0 = [1, 0];
            var v1 = [(x1_prime - cx_prime) / rx, (y1_prime - cy_prime) / ry];
            var v2 = [(-x1_prime - cx_prime) / rx, (-y1_prime - cy_prime) / ry];
            var theta1 = angle(v0, v1);
            var thetaDelta = angle(v1, v2);
            if (!fs && thetaDelta > 0)
                thetaDelta -= Math.PI * 2;
            if (fs && thetaDelta < 0)
                thetaDelta += Math.PI * 2;
            var radius = Math.sqrt((cx - x1) * (cx - x1) + (cy - y1) * (cy - y1));
            var startAngle = theta1;
            var endAngle = theta1 + thetaDelta;
            if (DEBUG) {
                console.log("psi", psi);
                console.log("rx, ry", rx, ry);
                console.log("x1, y1", x1, y1);
                console.log("x2, y2", x2, y2);
                console.log("cos, sin", cos, sin);
                console.log("x1_prime, y1_prime", x1_prime, y1_prime);
                console.log("a, b, c", a, b, c);
                console.log("scaleToInflection", scaleToInflection);
                console.log("numerator", (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime));
                console.log("denominator", (rx * rx * y1_prime * y1_prime + ry * ry * x1_prime * x1_prime));
                console.log("factor", factor);
                console.log("cx_prime, cy_prime", cx_prime, cy_prime);
                console.log("cx, cy", cx, cy);
                console.log("v[0] ... v[2]", v0, v1, v2);
                console.log("theta1, thetaDelta", theta1, thetaDelta);
                console.log("radius", radius);
                console.log("startAngle, endAngle", startAngle, endAngle);
            }
            tick.ctx.arc(cx, cy, radius, startAngle, endAngle, thetaDelta < 0);
        }; }, start, radius, xAxisRotationRad, largeArc, sweep, end);
    };
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    Operation.prototype.scale = function (xy) {
        return this.loggedAffect("scale", function () { return function (tick, xy) {
            return tick.ctx.scale(xy[0], xy[1]);
        }; }, xy);
    };
    /**
     * Dynamic chainable wrapper for rotate in the canvas API.
     */
    Operation.prototype.rotate = function (clockwiseRadians) {
        return this.loggedAffect("rotate", function () { return function (tick, arg) {
            return tick.ctx.rotate(arg);
        }; }, clockwiseRadians);
    };
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     */
    Operation.prototype.translate = function (xy) {
        return this.loggedAffect("translate", function () { return function (tick, xy) {
            tick.ctx.translate(xy[0], xy[1]);
        }; }, xy);
    };
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     * [ a c e
     *   b d f
     *   0 0 1 ]
     */
    Operation.prototype.transform = function (a, b, c, d, e, f) {
        return this.loggedAffect("transform", function () { return function (tick, arg1, arg2, arg3, arg4, arg5, arg6) {
            return tick.ctx.transform(arg1, arg2, arg3, arg4, arg5, arg6);
        }; }, a, b, c, d, e, f);
    };
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    Operation.prototype.setTransform = function (a, b, c, d, e, f) {
        return this.loggedAffect("setTransform", function () { return function (tick, arg1, arg2, arg3, arg4, arg5, arg6) {
            return tick.ctx.setTransform(arg1, arg2, arg3, arg4, arg5, arg6);
        }; }, a, b, c, d, e, f);
    };
    /**
     * Dynamic chainable wrapper for font in the canvas API.
     */
    Operation.prototype.font = function (style) {
        return this.loggedAffect("font", function () { return function (tick, arg) {
            return tick.ctx.font = arg;
        }; }, style);
    };
    /**
     * Dynamic chainable wrapper for textAlign in the canvas API.
     */
    Operation.prototype.textAlign = function (style) {
        return this.loggedAffect("textAlign", function () { return function (tick, arg) {
            return tick.ctx.textAlign = arg;
        }; }, style);
    };
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    Operation.prototype.textBaseline = function (style) {
        return this.loggedAffect("textBaseline", function () { return function (tick, arg) {
            return tick.ctx.textBaseline = arg;
        }; }, style);
    };
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    Operation.prototype.fillText = function (text, xy, maxWidth) {
        if (maxWidth) {
            return this.loggedAffect("fillText", function () { return function (tick, text, xy, maxWidth) {
                return tick.ctx.fillText(text, xy[0], xy[1], maxWidth);
            }; }, text, xy, maxWidth);
        }
        else {
            return this.loggedAffect("fillText", function () { return function (tick, text, xy, maxWidth) {
                return tick.ctx.fillText(text, xy[0], xy[1]);
            }; }, text, xy);
        }
    };
    /**
     * Dynamic chainable wrapper for drawImage in the canvas API.
     */
    Operation.prototype.drawImage = function (img, xy) {
        return this.loggedAffect("drawImage", function () { return function (tick, img, xy) {
            return tick.ctx.drawImage(img, xy[0], xy[1]);
        }; }, img, xy);
    };
    /**
     * * Dynamic chainable wrapper for globalCompositeOperation in the canvas API.
     */
    Operation.prototype.globalCompositeOperation = function (operation) {
        return this.loggedAffect("globalCompositeOperation", function () { return function (tick, arg) {
            return tick.ctx.globalCompositeOperation = arg;
        }; }, operation);
    };
    Operation.prototype.arc = function (center, radius, radStartAngle, radEndAngle, counterclockwise) {
        return this.loggedAffect("arc", function () { return function (tick, arg1, arg2, arg3, arg4, counterclockwise) {
            return tick.ctx.arc(arg1[0], arg1[1], arg2, arg3, arg4, counterclockwise);
        }; }, center, radius, radStartAngle, radEndAngle, counterclockwise);
    };
    /**
     * Dynamic chainable wrapper for save in the canvas API.
     */
    Operation.prototype.save = function () {
        return this.loggedAffect("save", function () { return function (tick) {
            return tick.ctx.save();
        }; });
    };
    /**
     * Dynamic chainable wrapper for restore in the canvas API.
     */
    Operation.prototype.restore = function () {
        return this.loggedAffect("restore", function () { return function (tick) {
            return tick.ctx.restore();
        }; });
    };
    return Operation;
})(OT.SimpleSignalFn);
exports.Operation = Operation;
function create(attach) {
    if (attach === void 0) { attach = function (x) { return x; }; }
    return new Operation(attach);
}
exports.create = create;
var PathAnimation = (function (_super) {
    __extends(PathAnimation, _super);
    function PathAnimation() {
        _super.apply(this, arguments);
    }
    return PathAnimation;
})(Operation);
exports.PathAnimation = PathAnimation;
function save(width, height, path) {
    var GIFEncoder = require('gifencoder');
    var fs = require('fs');
    var encoder = new GIFEncoder(width, height);
    encoder.createReadStream()
        .pipe(encoder.createWriteStream({ repeat: 10000, delay: 100, quality: 1 }))
        .pipe(fs.createWriteStream(path));
    encoder.start();
    return new Operation(function (upstream) {
        return upstream.tap(function (tick) {
            if (DEBUG)
                console.log("save: wrote frame");
            encoder.addFrame(tick.ctx);
        }, function () { console.error("save: not saved", path); }, function () { console.log("save: saved", path); encoder.finish(); });
    });
}
exports.save = save;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9jYW52YXMudHMiXSwibmFtZXMiOlsiVGljayIsIlRpY2suY29uc3RydWN0b3IiLCJUaWNrLmNvcHkiLCJUaWNrLnNhdmUiLCJUaWNrLnJlc3RvcmUiLCJPcGVyYXRpb24iLCJPcGVyYXRpb24uY29uc3RydWN0b3IiLCJPcGVyYXRpb24uY3JlYXRlIiwiT3BlcmF0aW9uLmxvZ2dlZEFmZmVjdCIsIk9wZXJhdGlvbi52ZWxvY2l0eSIsIk9wZXJhdGlvbi50d2Vlbl9saW5lYXIiLCJPcGVyYXRpb24uZ2xvdyIsIk9wZXJhdGlvbi5zdHJva2VTdHlsZSIsIk9wZXJhdGlvbi5maWxsU3R5bGUiLCJPcGVyYXRpb24uc2hhZG93Q29sb3IiLCJPcGVyYXRpb24uc2hhZG93Qmx1ciIsIk9wZXJhdGlvbi5zaGFkb3dPZmZzZXQiLCJPcGVyYXRpb24ubGluZUNhcCIsIk9wZXJhdGlvbi5saW5lSm9pbiIsIk9wZXJhdGlvbi5saW5lV2lkdGgiLCJPcGVyYXRpb24ubWl0ZXJMaW1pdCIsIk9wZXJhdGlvbi5yZWN0IiwiT3BlcmF0aW9uLmZpbGxSZWN0IiwiT3BlcmF0aW9uLnN0cm9rZVJlY3QiLCJPcGVyYXRpb24uY2xlYXJSZWN0IiwiT3BlcmF0aW9uLndpdGhpblBhdGgiLCJPcGVyYXRpb24uY2xvc2VQYXRoIiwiT3BlcmF0aW9uLmJlZ2luUGF0aCIsIk9wZXJhdGlvbi5maWxsIiwiT3BlcmF0aW9uLnN0cm9rZSIsIk9wZXJhdGlvbi5tb3ZlVG8iLCJPcGVyYXRpb24ubGluZVRvIiwiT3BlcmF0aW9uLmNsaXAiLCJPcGVyYXRpb24ucXVhZHJhdGljQ3VydmVUbyIsIk9wZXJhdGlvbi5iZXppZXJDdXJ2ZVRvIiwiT3BlcmF0aW9uLmFyY1RvIiwiT3BlcmF0aW9uLmVsbGlwdGljQXJjVG8iLCJPcGVyYXRpb24uc2NhbGUiLCJPcGVyYXRpb24ucm90YXRlIiwiT3BlcmF0aW9uLnRyYW5zbGF0ZSIsIk9wZXJhdGlvbi50cmFuc2Zvcm0iLCJPcGVyYXRpb24uc2V0VHJhbnNmb3JtIiwiT3BlcmF0aW9uLmZvbnQiLCJPcGVyYXRpb24udGV4dEFsaWduIiwiT3BlcmF0aW9uLnRleHRCYXNlbGluZSIsIk9wZXJhdGlvbi5maWxsVGV4dCIsIk9wZXJhdGlvbi5kcmF3SW1hZ2UiLCJPcGVyYXRpb24uZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uIiwiT3BlcmF0aW9uLmFyYyIsIk9wZXJhdGlvbi5zYXZlIiwiT3BlcmF0aW9uLnJlc3RvcmUiLCJjcmVhdGUiLCJQYXRoQW5pbWF0aW9uIiwiUGF0aEFuaW1hdGlvbi5jb25zdHJ1Y3RvciIsInNhdmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsSUFBWSxTQUFTLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUU5QyxJQUFZLEVBQUUsV0FBTSxPQUNwQixDQUFDLENBRDBCO0FBRTNCLElBQVksSUFBSSxXQUFNLFFBQ3RCLENBQUMsQ0FENkI7QUFDOUIsaUJBQWMsU0FFZCxDQUFDLEVBRnNCO0FBRXZCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztBQUVsQjs7OztHQUlHO0FBQ0g7SUFBMEJBLHdCQUFXQTtJQUNqQ0EsY0FDV0EsS0FBYUEsRUFDYkEsRUFBVUEsRUFDVkEsR0FBNkJBLEVBQzdCQSxNQUFxQkEsRUFDckJBLFFBQWdCQTtRQUV2QkMsa0JBQU1BLEtBQUtBLEVBQUVBLEVBQUVBLEVBQUVBLFFBQVFBLENBQUNBLENBQUFBO1FBTm5CQSxVQUFLQSxHQUFMQSxLQUFLQSxDQUFRQTtRQUNiQSxPQUFFQSxHQUFGQSxFQUFFQSxDQUFRQTtRQUNWQSxRQUFHQSxHQUFIQSxHQUFHQSxDQUEwQkE7UUFDN0JBLFdBQU1BLEdBQU5BLE1BQU1BLENBQWVBO1FBQ3JCQSxhQUFRQSxHQUFSQSxRQUFRQSxDQUFRQTtJQUczQkEsQ0FBQ0E7SUFDREQsbUJBQUlBLEdBQUpBO1FBQ0lFLE1BQU1BLENBQU9BLElBQUlBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLEVBQUVBLEVBQUVBLElBQUlBLENBQUNBLEdBQUdBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO0lBQ3JGQSxDQUFDQTtJQUVERixtQkFBSUEsR0FBSkE7UUFDSUcsSUFBSUEsRUFBRUEsR0FBU0EsZ0JBQUtBLENBQUNBLElBQUlBLFdBQUVBLENBQUNBO1FBQzVCQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUNkQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQTtJQUNkQSxDQUFDQTtJQUNESCxzQkFBT0EsR0FBUEE7UUFDSUksSUFBSUEsRUFBRUEsR0FBU0EsZ0JBQUtBLENBQUNBLE9BQU9BLFdBQUVBLENBQUNBO1FBQy9CQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxPQUFPQSxFQUFFQSxDQUFDQTtRQUNqQkEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7SUFDZEEsQ0FBQ0E7SUFFTEosV0FBQ0E7QUFBREEsQ0F6QkEsQUF5QkNBLEVBekJ5QixFQUFFLENBQUMsUUFBUSxFQXlCcEM7QUF6QlksWUFBSSxPQXlCaEIsQ0FBQTtBQUVEO0lBQStCSyw2QkFBdUJBO0lBRWxEQSxtQkFBbUJBLE1BQThEQTtRQUM3RUMsa0JBQU1BLE1BQU1BLENBQUNBLENBQUNBO1FBRENBLFdBQU1BLEdBQU5BLE1BQU1BLENBQXdEQTtJQUVqRkEsQ0FBQ0E7SUFFREQ7OztPQUdHQTtJQUNIQSwwQkFBTUEsR0FBTkEsVUFBT0EsTUFBMkVBO1FBQTNFRSxzQkFBMkVBLEdBQTNFQSxTQUFpRUEsVUFBQUEsR0FBR0EsSUFBSUEsT0FBQUEsR0FBR0EsRUFBSEEsQ0FBR0E7UUFDOUVBLE1BQU1BLENBQVFBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO0lBQ3hDQSxDQUFDQTtJQUVERjs7OztPQUlHQTtJQUNIQSxnQ0FBWUEsR0FBWkEsVUFDSUEsS0FBYUEsRUFDYkEsYUFDMkZBLEVBQzNGQSxNQUFxQ0EsRUFDckNBLE1BQXFDQSxFQUNyQ0EsTUFBcUNBLEVBQ3JDQSxNQUFxQ0EsRUFDckNBLE1BQXFDQSxFQUNyQ0EsTUFBcUNBLEVBQ3JDQSxNQUFxQ0EsRUFDckNBLE1BQXFDQTtRQUVyQ0csRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDUkEsSUFBSUEsUUFBUUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDbEJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLEtBQUtBLFNBQVNBLENBQUNBO2dCQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtZQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsQ0FBQ0E7Z0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO1lBQ3JEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxLQUFLQSxTQUFTQSxDQUFDQTtnQkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7WUFDckRBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLEtBQUtBLFNBQVNBLENBQUNBO2dCQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtZQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsQ0FBQ0E7Z0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO1lBQ3JEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxLQUFLQSxTQUFTQSxDQUFDQTtnQkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7WUFDckRBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLEtBQUtBLFNBQVNBLENBQUNBO2dCQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtZQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsQ0FBQ0E7Z0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO1lBQ3JEQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxLQUFLQSxHQUFHQSxXQUFXQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNoRUEsQ0FBQ0E7UUFDREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FDZEE7WUFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0E7Z0JBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLEtBQUtBLEdBQUdBLFVBQVVBLENBQUNBLENBQUNBO1lBQzNDQSxJQUFJQSxNQUFNQSxHQUFHQSxhQUFhQSxFQUFFQSxDQUFBQTtZQUM1QkEsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBVUEsRUFBRUEsSUFBU0EsRUFBRUEsSUFBU0EsRUFBRUEsSUFBU0EsRUFBRUEsSUFBU0EsRUFDcENBLElBQVNBLEVBQUVBLElBQVNBLEVBQUVBLElBQVNBLEVBQUVBLElBQVNBO2dCQUNoRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1JBLElBQUlBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO29CQUNsQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsS0FBS0EsR0FBR0EsVUFBVUEsR0FBR0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9EQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQUE7WUFDaEVBLENBQUNBLENBQUFBO1FBQ0xBLENBQUNBLEVBQ3VCQSxDQUFDQSxNQUFNQSxLQUFLQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFFQSxTQUFTQSxDQUFDQSxFQUMxREEsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBRUEsU0FBU0EsQ0FBQ0EsRUFDMURBLENBQUNBLE1BQU1BLEtBQUtBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUVBLFNBQVNBLENBQUNBLEVBQzFEQSxDQUFDQSxNQUFNQSxLQUFLQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFFQSxTQUFTQSxDQUFDQSxFQUMxREEsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBRUEsU0FBU0EsQ0FBQ0EsRUFDMURBLENBQUNBLE1BQU1BLEtBQUtBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUVBLFNBQVNBLENBQUNBLEVBQzFEQSxDQUFDQSxNQUFNQSxLQUFLQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFFQSxTQUFTQSxDQUFDQSxFQUMxREEsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBRUEsU0FBU0EsQ0FBQ0EsQ0FDckZBLENBQUFBO0lBQ0xBLENBQUNBO0lBRURILDRCQUFRQSxHQUFSQSxVQUNJQSxRQUF3QkE7UUFFeEJJLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FBQ0E7UUFDMUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQ2RBO1lBQ0lBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBO2dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxrQkFBa0JBLENBQUNBLENBQUNBO1lBQzNDQSxJQUFJQSxHQUFHQSxHQUFnQkEsQ0FBQ0EsR0FBR0EsRUFBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDakNBLE1BQU1BLENBQUNBLFVBQUNBLElBQVVBLEVBQUVBLFFBQXFCQTtnQkFDckNBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBO29CQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLFFBQVFBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO2dCQUN4REEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9DQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQTtnQkFDaENBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBO1lBQ3BDQSxDQUFDQSxDQUFBQTtRQUNMQSxDQUFDQSxFQUMrQkEsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FDM0RBLENBQUNBO0lBQ05BLENBQUNBO0lBRURKLGdDQUFZQSxHQUFaQSxVQUNJQSxJQUFvQkEsRUFDcEJBLEVBQW9CQSxFQUNwQkEsSUFBcUJBO1FBR3JCSyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUNkQTtZQUNJQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUNWQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFDdENBLE1BQU1BLENBQUNBLFVBQUNBLElBQVVBLEVBQUVBLElBQUlBLEVBQUVBLEVBQUVBLEVBQUVBLElBQUlBO2dCQUM5QkEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7Z0JBQ2hCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQTtvQkFBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ3ZCQSxJQUFJQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDL0NBLElBQUlBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO2dCQUUvQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0E7b0JBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGFBQWFBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO2dCQUMvQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLENBQUNBLENBQUFBO1FB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QzNEQSxHQUFXQSxFQUFFQSxFQUFXQSxFQUFFQSxFQUFXQSxFQUFFQSxFQUFvQkE7WUFDeERBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGNBQWNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO1lBQy9CQSxJQUFJQSxFQUFFQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUNWQSxFQUFFQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUNWQSxFQUFFQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUNWQSxFQUFFQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUNWQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUNUQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNkQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUM5Q0EsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFFOUNBLFNBQVNBO1lBQ1RBLElBQUlBLFFBQVFBLEdBQUlBLEdBQUdBLEdBQUdBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBO1lBQzlEQSxJQUFJQSxRQUFRQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxFQUFFQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxFQUFFQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQTtZQUU5REEsU0FBU0E7WUFDVEEsSUFBSUEsU0FBU0EsR0FBR0EsRUFBRUEsSUFBSUEsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDbENBLElBQUlBLFNBQVNBLENBQUNBLENBQUNBLHlGQUF5RkE7WUFDeEdBLHFGQUFxRkE7WUFDckZBLHlGQUF5RkE7WUFDekZBLDBGQUEwRkE7WUFDMUZBLHNEQUFzREE7WUFDdERBLGdEQUFnREE7WUFDaERBLDhCQUE4QkE7WUFDOUJBLDBDQUEwQ0E7WUFDMUNBLDBDQUEwQ0E7WUFDMUNBLG1CQUFtQkE7WUFDbkJBLGlDQUFpQ0E7WUFDakNBLCtDQUErQ0E7WUFDL0NBLDJCQUEyQkE7WUFDM0JBLGlCQUFpQkE7WUFDakJBLGtCQUFrQkE7WUFDbEJBLHdCQUF3QkE7WUFDeEJBLElBQUlBLENBQUNBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBO1lBQzFCQSxJQUFJQSxDQUFDQSxHQUFHQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUN0Q0EsSUFBSUEsQ0FBQ0EsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0E7WUFFdENBLElBQUlBLGlCQUFpQkEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFFcENBLEVBQUVBLENBQUNBLENBQUNBLGlCQUFpQkEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDNUJBLENBQUNBO1lBQUNBLElBQUlBLENBQUNBLENBQUNBO2dCQUNKQSxjQUFjQTtnQkFDZEEsRUFBRUEsSUFBSUEsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxDQUFBQTtnQkFDbENBLEVBQUVBLElBQUlBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FBQUE7WUFDdENBLENBQUNBO1lBQ0RBLG9EQUFvREE7WUFDcERBLFNBQVNBLEdBQUdBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLFFBQVFBLEdBQUdBLFFBQVFBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLENBQUNBO1lBRWhHQSxJQUFJQSxXQUFXQSxHQUFHQSxDQUFDQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxRQUFRQSxHQUFHQSxRQUFRQSxHQUFHQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxDQUFDQTtZQUNsRkEsSUFBSUEsTUFBTUEsR0FBR0EsU0FBU0EsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsR0FBR0EsV0FBV0EsQ0FBQ0EsQ0FBQUE7WUFDM0RBLElBQUlBLFFBQVFBLEdBQUlBLE1BQU1BLEdBQUdBLEVBQUVBLEdBQUdBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO1lBQzVDQSxJQUFJQSxRQUFRQSxHQUFHQSxDQUFDQSxNQUFNQSxHQUFHQSxFQUFFQSxHQUFHQSxRQUFRQSxHQUFHQSxFQUFFQSxDQUFDQTtZQUU1Q0EsU0FBU0E7WUFDVEEsSUFBSUEsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsUUFBUUEsR0FBR0EsR0FBR0EsR0FBR0EsUUFBUUEsR0FBR0EsQ0FBQ0EsRUFBRUEsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQUE7WUFDeERBLElBQUlBLEVBQUVBLEdBQUdBLEdBQUdBLEdBQUdBLFFBQVFBLEdBQUdBLEdBQUdBLEdBQUdBLFFBQVFBLEdBQUdBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUFBO1lBRXhEQSxTQUFTQTtZQUNUQSxJQUFJQSxLQUFLQSxHQUFHQSxVQUFTQSxDQUFtQkEsRUFBRUEsQ0FBbUJBO2dCQUN6RCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEQsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFcEQsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDO2dCQUMxRCxDQUFDO2dCQUNELE1BQU0sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzNCLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUN4QixDQUFBO1lBQ0wsQ0FBQyxDQUFBQTtZQUVEQSxJQUFJQSxFQUFFQSxHQUFxQkEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDbENBLElBQUlBLEVBQUVBLEdBQXFCQSxDQUFFQSxDQUFDQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxHQUFHQSxFQUFFQSxFQUFHQSxDQUFDQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtZQUN0RkEsSUFBSUEsRUFBRUEsR0FBcUJBLENBQUNBLENBQUNBLENBQUNBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLEdBQUdBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO1lBQ3RGQSxJQUFJQSxNQUFNQSxHQUFHQSxLQUFLQSxDQUFDQSxFQUFFQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFBQTtZQUMxQkEsSUFBSUEsVUFBVUEsR0FBR0EsS0FBS0EsQ0FBQ0EsRUFBRUEsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7WUFFL0JBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLElBQUlBLFVBQVVBLEdBQUdBLENBQUNBLENBQUNBO2dCQUFDQSxVQUFVQSxJQUFJQSxJQUFJQSxDQUFDQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFBQTtZQUNwREEsRUFBRUEsQ0FBQ0EsQ0FBRUEsRUFBRUEsSUFBSUEsVUFBVUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLFVBQVVBLElBQUlBLElBQUlBLENBQUNBLEVBQUVBLEdBQUdBLENBQUNBLENBQUFBO1lBRXBEQSxJQUFJQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxFQUFFQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxD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QSxDQUFDQTtBQUNqQ0EsQ0FBQ0E7QUFGZSxjQUFNLFNBRXJCLENBQUE7QUFFRDtJQUFtQ0MsaUNBQVNBO0lBQTVDQTtRQUFtQ0MsOEJBQVNBO0lBRTVDQSxDQUFDQTtJQUFERCxvQkFBQ0E7QUFBREEsQ0FGQSxBQUVDQSxFQUZrQyxTQUFTLEVBRTNDO0FBRlkscUJBQWEsZ0JBRXpCLENBQUE7QUFFRCxjQUFxQixLQUFZLEVBQUUsTUFBYSxFQUFFLElBQVk7SUFDMURFLElBQUlBLFVBQVVBLEdBQUdBLE9BQU9BLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO0lBQ3ZDQSxJQUFJQSxFQUFFQSxHQUFHQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtJQUd2QkEsSUFBSUEsT0FBT0EsR0FBR0EsSUFBSUEsVUFBVUEsQ0FBQ0EsS0FBS0EsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7SUFDNUNBLE9BQU9BLENBQUNBLGdCQUFnQkEsRUFBRUE7U0FDdkJBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLGlCQUFpQkEsQ0FBQ0EsRUFBRUEsTUFBTUEsRUFBRUEsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsR0FBR0EsRUFBRUEsT0FBT0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7U0FDMUVBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDcENBLE9BQU9BLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO0lBRWhCQSxNQUFNQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUFDQSxVQUFVQSxRQUE2QkE7UUFDeEQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQ2YsVUFBUyxJQUFVO1lBQ2YsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUM1QyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvQixDQUFDLEVBQ0QsY0FBWSxPQUFPLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUEsQ0FBQyxFQUNwRCxjQUFZLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUEsQ0FBQyxDQUNuRSxDQUFBO0lBQ0wsQ0FBQyxDQUFDQSxDQUFDQTtBQUNQQSxDQUFDQTtBQXJCZSxZQUFJLE9BcUJuQixDQUFBIiwiZmlsZSI6InNyYy9jYW52YXMuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
