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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9jYW52YXMudHMiXSwibmFtZXMiOlsiVGljayIsIlRpY2suY29uc3RydWN0b3IiLCJUaWNrLmNvcHkiLCJUaWNrLnNhdmUiLCJUaWNrLnJlc3RvcmUiLCJPcGVyYXRpb24iLCJPcGVyYXRpb24uY29uc3RydWN0b3IiLCJPcGVyYXRpb24uY3JlYXRlIiwiT3BlcmF0aW9uLmxvZ2dlZEFmZmVjdCIsIk9wZXJhdGlvbi52ZWxvY2l0eSIsIk9wZXJhdGlvbi50d2Vlbl9saW5lYXIiLCJPcGVyYXRpb24uZ2xvdyIsIk9wZXJhdGlvbi5zdHJva2VTdHlsZSIsIk9wZXJhdGlvbi5maWxsU3R5bGUiLCJPcGVyYXRpb24uc2hhZG93Q29sb3IiLCJPcGVyYXRpb24uc2hhZG93Qmx1ciIsIk9wZXJhdGlvbi5zaGFkb3dPZmZzZXQiLCJPcGVyYXRpb24ubGluZUNhcCIsIk9wZXJhdGlvbi5saW5lSm9pbiIsIk9wZXJhdGlvbi5saW5lV2lkdGgiLCJPcGVyYXRpb24ubWl0ZXJMaW1pdCIsIk9wZXJhdGlvbi5yZWN0IiwiT3BlcmF0aW9uLmZpbGxSZWN0IiwiT3BlcmF0aW9uLnN0cm9rZVJlY3QiLCJPcGVyYXRpb24uY2xlYXJSZWN0IiwiT3BlcmF0aW9uLndpdGhpblBhdGgiLCJPcGVyYXRpb24uY2xvc2VQYXRoIiwiT3BlcmF0aW9uLmJlZ2luUGF0aCIsIk9wZXJhdGlvbi5maWxsIiwiT3BlcmF0aW9uLnN0cm9rZSIsIk9wZXJhdGlvbi5tb3ZlVG8iLCJPcGVyYXRpb24ubGluZVRvIiwiT3BlcmF0aW9uLmNsaXAiLCJPcGVyYXRpb24ucXVhZHJhdGljQ3VydmVUbyIsIk9wZXJhdGlvbi5iZXppZXJDdXJ2ZVRvIiwiT3BlcmF0aW9uLmFyY1RvIiwiT3BlcmF0aW9uLmVsbGlwdGljQXJjVG8iLCJPcGVyYXRpb24uc2NhbGUiLCJPcGVyYXRpb24ucm90YXRlIiwiT3BlcmF0aW9uLnRyYW5zbGF0ZSIsIk9wZXJhdGlvbi50cmFuc2Zvcm0iLCJPcGVyYXRpb24uc2V0VHJhbnNmb3JtIiwiT3BlcmF0aW9uLmZvbnQiLCJPcGVyYXRpb24udGV4dEFsaWduIiwiT3BlcmF0aW9uLnRleHRCYXNlbGluZSIsIk9wZXJhdGlvbi5maWxsVGV4dCIsIk9wZXJhdGlvbi5kcmF3SW1hZ2UiLCJPcGVyYXRpb24uZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uIiwiT3BlcmF0aW9uLmFyYyIsIk9wZXJhdGlvbi5zYXZlIiwiT3BlcmF0aW9uLnJlc3RvcmUiLCJjcmVhdGUiLCJQYXRoQW5pbWF0aW9uIiwiUGF0aEFuaW1hdGlvbi5jb25zdHJ1Y3RvciIsInNhdmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsSUFBWSxTQUFTLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUU5QyxJQUFZLEVBQUUsV0FBTSxPQUNwQixDQUFDLENBRDBCO0FBRTNCLElBQVksSUFBSSxXQUFNLFFBQ3RCLENBQUMsQ0FENkI7QUFDOUIsaUJBQWMsU0FFZCxDQUFDLEVBRnNCO0FBRXZCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztBQUVsQjs7OztHQUlHO0FBQ0g7SUFBMEJBLHdCQUFXQTtJQUNqQ0EsY0FDV0EsS0FBYUEsRUFDYkEsRUFBVUEsRUFDVkEsR0FBNkJBLEVBQzdCQSxNQUFxQkEsRUFDckJBLFFBQWdCQTtRQUV2QkMsa0JBQU1BLEtBQUtBLEVBQUVBLEVBQUVBLEVBQUVBLFFBQVFBLENBQUNBLENBQUFBO1FBTm5CQSxVQUFLQSxHQUFMQSxLQUFLQSxDQUFRQTtRQUNiQSxPQUFFQSxHQUFGQSxFQUFFQSxDQUFRQTtRQUNWQSxRQUFHQSxHQUFIQSxHQUFHQSxDQUEwQkE7UUFDN0JBLFdBQU1BLEdBQU5BLE1BQU1BLENBQWVBO1FBQ3JCQSxhQUFRQSxHQUFSQSxRQUFRQSxDQUFRQTtJQUczQkEsQ0FBQ0E7SUFDREQsbUJBQUlBLEdBQUpBO1FBQ0lFLE1BQU1BLENBQU9BLElBQUlBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLEVBQUVBLEVBQUVBLElBQUlBLENBQUNBLEdBQUdBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBO0lBQ3JGQSxDQUFDQTtJQUVERixtQkFBSUEsR0FBSkE7UUFDSUcsSUFBSUEsRUFBRUEsR0FBU0EsZ0JBQUtBLENBQUNBLElBQUlBLFdBQUVBLENBQUNBO1FBQzVCQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUNkQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQTtJQUNkQSxDQUFDQTtJQUNESCxzQkFBT0EsR0FBUEE7UUFDSUksSUFBSUEsRUFBRUEsR0FBU0EsZ0JBQUtBLENBQUNBLE9BQU9BLFdBQUVBLENBQUNBO1FBQy9CQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxPQUFPQSxFQUFFQSxDQUFDQTtRQUNqQkEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7SUFDZEEsQ0FBQ0E7SUFFTEosV0FBQ0E7QUFBREEsQ0F6QkEsQUF5QkNBLEVBekJ5QixFQUFFLENBQUMsUUFBUSxFQXlCcEM7QUF6QlksWUFBSSxPQXlCaEIsQ0FBQTtBQUVEO0lBQStCSyw2QkFBdUJBO0lBRWxEQSxtQkFBbUJBLE1BQThEQTtRQUM3RUMsa0JBQU1BLE1BQU1BLENBQUNBLENBQUNBO1FBRENBLFdBQU1BLEdBQU5BLE1BQU1BLENBQXdEQTtJQUVqRkEsQ0FBQ0E7SUFFREQ7OztPQUdHQTtJQUNIQSwwQkFBTUEsR0FBTkEsVUFBT0EsTUFBMkVBO1FBQTNFRSxzQkFBMkVBLEdBQTNFQSxTQUFpRUEsVUFBQUEsR0FBR0EsSUFBSUEsT0FBQUEsR0FBR0EsRUFBSEEsQ0FBR0E7UUFDOUVBLE1BQU1BLENBQVFBLElBQUlBLFNBQVNBLENBQUNBLE1BQU1BLENBQUNBLENBQUNBO0lBQ3hDQSxDQUFDQTtJQUVERjs7OztPQUlHQTtJQUNIQSxnQ0FBWUEsR0FBWkEsVUFDSUEsS0FBYUEsRUFDYkEsYUFDMkZBLEVBQzNGQSxNQUFxQ0EsRUFDckNBLE1BQXFDQSxFQUNyQ0EsTUFBcUNBLEVBQ3JDQSxNQUFxQ0EsRUFDckNBLE1BQXFDQSxFQUNyQ0EsTUFBcUNBLEVBQ3JDQSxNQUFxQ0EsRUFDckNBLE1BQXFDQTtRQUVyQ0csRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDUkEsSUFBSUEsUUFBUUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDbEJBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLEtBQUtBLFNBQVNBLENBQUNBO2dCQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtZQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsQ0FBQ0E7Z0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO1lBQ3JEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxLQUFLQSxTQUFTQSxDQUFDQTtnQkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7WUFDckRBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLEtBQUtBLFNBQVNBLENBQUNBO2dCQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtZQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsQ0FBQ0E7Z0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO1lBQ3JEQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxLQUFLQSxTQUFTQSxDQUFDQTtnQkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7WUFDckRBLEVBQUVBLENBQUNBLENBQUNBLE1BQU1BLEtBQUtBLFNBQVNBLENBQUNBO2dCQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtZQUNyREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsQ0FBQ0E7Z0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO1lBQ3JEQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxLQUFLQSxHQUFHQSxXQUFXQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQTtRQUNoRUEsQ0FBQ0E7UUFDREEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FDZEE7WUFDSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0E7Z0JBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLEtBQUtBLEdBQUdBLFVBQVVBLENBQUNBLENBQUNBO1lBQzNDQSxJQUFJQSxNQUFNQSxHQUFHQSxhQUFhQSxFQUFFQSxDQUFBQTtZQUM1QkEsTUFBTUEsQ0FBQ0EsVUFBQ0EsSUFBVUEsRUFBRUEsSUFBU0EsRUFBRUEsSUFBU0EsRUFBRUEsSUFBU0EsRUFBRUEsSUFBU0EsRUFDcENBLElBQVNBLEVBQUVBLElBQVNBLEVBQUVBLElBQVNBLEVBQUVBLElBQVNBO2dCQUNoRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ1JBLElBQUlBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO29CQUNsQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsS0FBS0EsU0FBU0EsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNqREEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsS0FBS0EsR0FBR0EsVUFBVUEsR0FBR0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9EQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQUE7WUFDaEVBLENBQUNBLENBQUFBO1FBQ0xBLENBQUNBLEVBQ3VCQSxDQUFDQSxNQUFNQSxLQUFLQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFFQSxTQUFTQSxDQUFDQSxFQUMxREEsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBRUEsU0FBU0EsQ0FBQ0EsRUFDMURBLENBQUNBLE1BQU1BLEtBQUtBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUVBLFNBQVNBLENBQUNBLEVBQzFEQSxDQUFDQSxNQUFNQSxLQUFLQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFFQSxTQUFTQSxDQUFDQSxFQUMxREEsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBRUEsU0FBU0EsQ0FBQ0EsRUFDMURBLENBQUNBLE1BQU1BLEtBQUtBLFNBQVNBLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUVBLFNBQVNBLENBQUNBLEVBQzFEQSxDQUFDQSxNQUFNQSxLQUFLQSxTQUFTQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFFQSxTQUFTQSxDQUFDQSxFQUMxREEsQ0FBQ0EsTUFBTUEsS0FBS0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBRUEsU0FBU0EsQ0FBQ0EsQ0FDckZBLENBQUFBO0lBQ0xBLENBQUNBO0lBRURILDRCQUFRQSxHQUFSQSxVQUNJQSxRQUF3QkE7UUFFeEJJLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FBQ0E7UUFDMUNBLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQ2RBO1lBQ0lBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBO2dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxrQkFBa0JBLENBQUNBLENBQUNBO1lBQzNDQSxJQUFJQSxHQUFHQSxHQUFnQkEsQ0FBQ0EsR0FBR0EsRUFBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7WUFDakNBLE1BQU1BLENBQUNBLFVBQUNBLElBQVVBLEVBQUVBLFFBQXFCQTtnQkFDckNBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBO29CQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxnQkFBZ0JBLEVBQUVBLFFBQVFBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO2dCQUN4REEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9DQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQTtnQkFDaENBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBO1lBQ3BDQSxDQUFDQSxDQUFBQTtRQUNMQSxDQUFDQSxFQUMrQkEsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsQ0FDM0RBLENBQUNBO0lBQ05BLENBQUNBO0lBRURKLGdDQUFZQSxHQUFaQSxVQUNJQSxJQUFvQkEsRUFDcEJBLEVBQW9CQSxFQUNwQkEsSUFBcUJBO1FBR3JCSyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUNkQTtZQUNJQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUNWQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsQ0FBQ0E7WUFDdENBLE1BQU1BLENBQUNBLFVBQUNBLElBQVVBLEVBQUVBLElBQUlBLEVBQUVBLEVBQUVBLEVBQUVBLElBQUlBO2dCQUM5QkEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7Z0JBQ2hCQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQTtvQkFBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBQ3ZCQSxJQUFJQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDL0NBLElBQUlBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO2dCQUUvQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsS0FBS0EsQ0FBQ0E7b0JBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGFBQWFBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO2dCQUMvQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDekNBLENBQUNBLENBQUFBO1FB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QzNEQSxHQUFXQSxFQUFFQSxFQUFXQSxFQUFFQSxFQUFXQSxFQUFFQSxFQUFvQkE7WUFDeERBLElBQUlBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEVBQ1ZBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEVBQ1ZBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEVBQ1ZBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEVBQ1ZBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEVBQ1RBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1lBQ2RBLElBQUlBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLElBQUlBLENBQUNBLEVBQUVBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBO1lBQzlDQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUU5Q0EsU0FBU0E7WUFDVEEsSUFBSUEsUUFBUUEsR0FBSUEsR0FBR0EsR0FBR0EsQ0FBQ0EsRUFBRUEsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0EsRUFBRUEsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0E7WUFDOURBLElBQUlBLFFBQVFBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLEdBQUdBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBO1lBRTlEQSxTQUFTQTtZQUNUQSxJQUFJQSxTQUFTQSxHQUFHQSxFQUFFQSxJQUFJQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUNsQ0EsSUFBSUEsU0FBU0EsQ0FBQ0EsQ0FBQ0EseUZBQXlGQTtZQUN4R0EscUZBQXFGQTtZQUNyRkEseUZBQXlGQTtZQUN6RkEsMEZBQTBGQTtZQUMxRkEsc0RBQXNEQTtZQUN0REEsZ0RBQWdEQTtZQUNoREEsOEJBQThCQTtZQUM5QkEsMENBQTBDQTtZQUMxQ0EsMENBQTBDQTtZQUMxQ0EsbUJBQW1CQTtZQUNuQkEsaUNBQWlDQTtZQUNqQ0EsK0NBQStDQTtZQUMvQ0EsMkJBQTJCQTtZQUMzQkEsaUJBQWlCQTtZQUNqQkEsa0JBQWtCQTtZQUNsQkEsd0JBQXdCQTtZQUN4QkEsSUFBSUEsQ0FBQ0EsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDMUJBLElBQUlBLENBQUNBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBO1lBQ3RDQSxJQUFJQSxDQUFDQSxHQUFHQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUV0Q0EsSUFBSUEsaUJBQWlCQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQTtZQUVwQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsaUJBQWlCQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUM1QkEsQ0FBQ0E7WUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBQ0pBLGNBQWNBO2dCQUNkQSxFQUFFQSxJQUFJQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxpQkFBaUJBLENBQUNBLENBQUFBO2dCQUNsQ0EsRUFBRUEsSUFBSUEsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxDQUFBQTtZQUN0Q0EsQ0FBQ0E7WUFDREEsb0RBQW9EQTtZQUNwREEsU0FBU0EsR0FBR0EsQ0FBQ0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsUUFBUUEsR0FBR0EsUUFBUUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsQ0FBQ0E7WUFFaEdBLElBQUlBLFdBQVdBLEdBQUdBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLFFBQVFBLEdBQUdBLFFBQVFBLEdBQUdBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLENBQUNBO1lBQ2xGQSxJQUFJQSxNQUFNQSxHQUFHQSxTQUFTQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxHQUFHQSxXQUFXQSxDQUFDQSxDQUFBQTtZQUMzREEsSUFBSUEsUUFBUUEsR0FBSUEsTUFBTUEsR0FBR0EsRUFBRUEsR0FBR0EsUUFBUUEsR0FBR0EsRUFBRUEsQ0FBQ0E7WUFDNUNBLElBQUlBLFFBQVFBLEdBQUdBLENBQUNBLE1BQU1BLEdBQUdBLEVBQUVBLEdBQUdBLFFBQVFBLEdBQUdBLEVBQUVBLENBQUNBO1lBRTVDQSxTQUFTQTtZQUNUQSxJQUFJQSxFQUFFQSxHQUFHQSxHQUFHQSxHQUFHQSxRQUFRQSxHQUFHQSxHQUFHQSxHQUFHQSxRQUFRQSxHQUFHQSxDQUFDQSxFQUFFQSxHQUFHQSxFQUFFQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFBQTtZQUN4REEsSUFBSUEsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsUUFBUUEsR0FBR0EsR0FBR0EsR0FBR0EsUUFBUUEsR0FBR0EsQ0FBQ0EsRUFBRUEsR0FBR0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQUE7WUFFeERBLFNBQVNBO1lBQ1RBLElBQUlBLEtBQUtBLEdBQUdBLFVBQVNBLENBQW1CQSxFQUFFQSxDQUFtQkE7Z0JBQ3pELElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVwRCxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDNUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLEdBQUcsUUFBUSxDQUFDLENBQUM7Z0JBQzFELENBQUM7Z0JBQ0QsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDM0IsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLENBQ3hCLENBQUE7WUFDTCxDQUFDLENBQUFBO1lBRURBLElBQUlBLEVBQUVBLEdBQXFCQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNsQ0EsSUFBSUEsRUFBRUEsR0FBcUJBLENBQUVBLENBQUNBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLEdBQUdBLEVBQUVBLEVBQUdBLENBQUNBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO1lBQ3RGQSxJQUFJQSxFQUFFQSxHQUFxQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsR0FBR0EsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7WUFDdEZBLElBQUlBLE1BQU1BLEdBQUdBLEtBQUtBLENBQUNBLEVBQUVBLEVBQUVBLEVBQUVBLENBQUNBLENBQUFBO1lBQzFCQSxJQUFJQSxVQUFVQSxHQUFHQSxLQUFLQSxDQUFDQSxFQUFFQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTtZQUUvQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsSUFBSUEsVUFBVUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQUNBLFVBQVVBLElBQUlBLElBQUlBLENBQUNBLEVBQUVBLEdBQUdBLENBQUNBLENBQUFBO1lBQ3BEQSxFQUFFQSxDQUFDQSxDQUFFQSxFQUFFQSxJQUFJQSxVQUFVQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFBQ0EsVUFBVUEsSUFBSUEsSUFBSUEsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQUE7WUFFcERBLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBLENBQUFBO1lBRXJFQSxJQUFJQSxVQUFVQSxHQUFHQSxNQUFNQSxDQUFDQTtZQUN4QkEsSUFBSUEsUUFBUUEsR0FBR0EsTUFBTUEsR0FBR0EsVUFBVUEsQ0FBQ0E7WUFFbkNBLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO2dCQUNSQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxLQUFLQSxFQUFFQSxHQUFHQSxDQUFDQSxDQUFBQTtnQkFDdkJBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFFBQVFBLEVBQUVBLEVBQUVBLEVBQUVBLEVBQUVBLENBQUNBLENBQUFBO2dCQUM3QkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsUUFBUUEsRUFBRUEsRUFBRUEsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQUE7Z0JBQzdCQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxRQUFRQSxFQUFFQSxFQUFFQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFBQTtnQkFDN0JBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFVBQVVBLEVBQUVBLEdBQUdBLEVBQUVBLEdBQUdBLENBQUNBLENBQUFBO2dCQUNqQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esb0JBQW9CQSxFQUFFQSxRQUFRQSxFQUFFQSxRQUFRQSxDQUFDQSxDQUFBQTtnQkFDckRBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFNBQVNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUFBO2dCQUMvQkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsbUJBQW1CQSxFQUFFQSxpQkFBaUJBLENBQUNBLENBQUFBO2dCQUNuREEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsUUFBUUEsR0FBR0EsUUFBUUEsR0FBR0EsRUFBRUEsR0FBR0EsRUFBRUEsR0FBR0EsUUFBUUEsR0FBR0EsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQUE7Z0JBQzdHQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxhQUFhQSxFQUFFQSxDQUFDQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxRQUFRQSxHQUFHQSxRQUFRQSxHQUFHQSxFQUFFQSxHQUFHQSxFQUFFQSxHQUFHQSxRQUFRQSxHQUFHQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFBQTtnQkFDM0ZBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFFBQVFBLEVBQUVBLE1BQU1BLENBQUNBLENBQUFBO2dCQUM3QkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0Esb0JBQW9CQSxFQUFFQSxRQUFRQSxFQUFFQSxRQUFRQSxDQUFDQSxDQUFBQTtnQkFDckRBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLFFBQVFBLEVBQUVBLEVBQUVBLEVBQUVBLEVBQUVBLENBQUNBLENBQUFBO2dCQUM3QkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsZUFBZUEsRUFBRUEsRUFBRUEsRUFBRUEsRUFBRUEsRUFBRUEsRUFBRUEsQ0FBQ0EsQ0FBQUE7Z0JBQ3hDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxvQkFBb0JBLEVBQUVBLE1BQU1BLEVBQUVBLFVBQVVBLENBQUNBLENBQUFBO2dCQUNyREEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsUUFBUUEsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQUE7Z0JBQzdCQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxzQkFBc0JBLEVBQUVBLFVBQVVBLEVBQUVBLFFBQVFBLENBQUNBLENBQUFBO1lBQzdEQSxDQUFDQTtZQUVEQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxFQUFFQSxFQUFFQSxFQUFFQSxNQUFNQSxFQUFFQSxVQUFVQSxFQUFFQSxRQUFRQSxFQUFFQSxVQUFVQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFBQTtRQUV0RUEs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SUFBNUNBO1FBQW1DQyw4QkFBU0E7SUFFNUNBLENBQUNBO0lBQURELG9CQUFDQTtBQUFEQSxDQUZBLEFBRUNBLEVBRmtDLFNBQVMsRUFFM0M7QUFGWSxxQkFBYSxnQkFFekIsQ0FBQTtBQUVELGNBQXFCLEtBQVksRUFBRSxNQUFhLEVBQUUsSUFBWTtJQUMxREUsSUFBSUEsVUFBVUEsR0FBR0EsT0FBT0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7SUFDdkNBLElBQUlBLEVBQUVBLEdBQUdBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO0lBR3ZCQSxJQUFJQSxPQUFPQSxHQUFHQSxJQUFJQSxVQUFVQSxDQUFDQSxLQUFLQSxFQUFFQSxNQUFNQSxDQUFDQSxDQUFDQTtJQUM1Q0EsT0FBT0EsQ0FBQ0EsZ0JBQWdCQSxFQUFFQTtTQUN2QkEsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxFQUFFQSxNQUFNQSxFQUFFQSxLQUFLQSxFQUFFQSxLQUFLQSxFQUFFQSxHQUFHQSxFQUFFQSxPQUFPQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQTtTQUMxRUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNwQ0EsT0FBT0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7SUFFaEJBLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLFVBQVVBLFFBQTZCQTtRQUN4RCxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FDZixVQUFTLElBQVU7WUFDZixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQzVDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLENBQUMsRUFDRCxjQUFZLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQSxDQUFDLEVBQ3BELGNBQVksT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQSxDQUFDLENBQ25FLENBQUE7SUFDTCxDQUFDLENBQUNBLENBQUNBO0FBQ1BBLENBQUNBO0FBckJlLFlBQUksT0FxQm5CLENBQUEiLCJmaWxlIjoic3JjL2NhbnZhcy5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
