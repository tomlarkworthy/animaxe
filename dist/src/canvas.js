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
var DEBUG = true;
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
     * You can expose time varying or constant parameters to the inner effect using the optional params.
     */
    Operation.prototype.loggedAffect = function (label, effectBuilder, param1, param2, param3, param4, param5, param6, param7, param8) {
        if (DEBUG)
            console.log(label + ": build");
        return this.affect(function () {
            if (DEBUG)
                console.log(label + ": attach");
            var effect = effectBuilder();
            return function (tick, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
                if (DEBUG) {
                    var elements = [];
                    if (arg1)
                        elements.push(arg1 + "");
                    if (arg2)
                        elements.push(arg2 + "");
                    if (arg3)
                        elements.push(arg3 + "");
                    if (arg4)
                        elements.push(arg4 + "");
                    if (arg5)
                        elements.push(arg5 + "");
                    if (arg6)
                        elements.push(arg6 + "");
                    if (arg7)
                        elements.push(arg7 + "");
                    if (arg8)
                        elements.push(arg8 + "");
                    console.log(label + ": tick (" + elements.join(",") + ")");
                }
                effect(tick, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
            };
        }, (param1 ? Parameter.from(param1) : undefined), (param2 ? Parameter.from(param2) : undefined), (param3 ? Parameter.from(param3) : undefined), (param4 ? Parameter.from(param4) : undefined), (param5 ? Parameter.from(param5) : undefined), (param6 ? Parameter.from(param6) : undefined), (param7 ? Parameter.from(param7) : undefined), (param8 ? Parameter.from(param8) : undefined));
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
        if (counterclockwise === void 0) { counterclockwise = false; }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9jYW52YXMudHMiXSwibmFtZXMiOlsiVGljayIsIlRpY2suY29uc3RydWN0b3IiLCJUaWNrLmNvcHkiLCJUaWNrLnNhdmUiLCJUaWNrLnJlc3RvcmUiLCJPcGVyYXRpb24iLCJPcGVyYXRpb24uY29uc3RydWN0b3IiLCJPcGVyYXRpb24uY3JlYXRlIiwiT3BlcmF0aW9uLmxvZ2dlZEFmZmVjdCIsIk9wZXJhdGlvbi52ZWxvY2l0eSIsIk9wZXJhdGlvbi50d2Vlbl9saW5lYXIiLCJPcGVyYXRpb24uZ2xvdyIsIk9wZXJhdGlvbi5zdHJva2VTdHlsZSIsIk9wZXJhdGlvbi5maWxsU3R5bGUiLCJPcGVyYXRpb24uc2hhZG93Q29sb3IiLCJPcGVyYXRpb24uc2hhZG93Qmx1ciIsIk9wZXJhdGlvbi5zaGFkb3dPZmZzZXQiLCJPcGVyYXRpb24ubGluZUNhcCIsIk9wZXJhdGlvbi5saW5lSm9pbiIsIk9wZXJhdGlvbi5saW5lV2lkdGgiLCJPcGVyYXRpb24ubWl0ZXJMaW1pdCIsIk9wZXJhdGlvbi5yZWN0IiwiT3BlcmF0aW9uLmZpbGxSZWN0IiwiT3BlcmF0aW9uLnN0cm9rZVJlY3QiLCJPcGVyYXRpb24uY2xlYXJSZWN0IiwiT3BlcmF0aW9uLndpdGhpblBhdGgiLCJPcGVyYXRpb24uY2xvc2VQYXRoIiwiT3BlcmF0aW9uLmJlZ2luUGF0aCIsIk9wZXJhdGlvbi5maWxsIiwiT3BlcmF0aW9uLnN0cm9rZSIsIk9wZXJhdGlvbi5tb3ZlVG8iLCJPcGVyYXRpb24ubGluZVRvIiwiT3BlcmF0aW9uLmNsaXAiLCJPcGVyYXRpb24ucXVhZHJhdGljQ3VydmVUbyIsIk9wZXJhdGlvbi5iZXppZXJDdXJ2ZVRvIiwiT3BlcmF0aW9uLmFyY1RvIiwiT3BlcmF0aW9uLnNjYWxlIiwiT3BlcmF0aW9uLnJvdGF0ZSIsIk9wZXJhdGlvbi50cmFuc2xhdGUiLCJPcGVyYXRpb24udHJhbnNmb3JtIiwiT3BlcmF0aW9uLnNldFRyYW5zZm9ybSIsIk9wZXJhdGlvbi5mb250IiwiT3BlcmF0aW9uLnRleHRBbGlnbiIsIk9wZXJhdGlvbi50ZXh0QmFzZWxpbmUiLCJPcGVyYXRpb24uZmlsbFRleHQiLCJPcGVyYXRpb24uZHJhd0ltYWdlIiwiT3BlcmF0aW9uLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiIsIk9wZXJhdGlvbi5hcmMiLCJPcGVyYXRpb24uc2F2ZSIsIk9wZXJhdGlvbi5yZXN0b3JlIiwiY3JlYXRlIiwiUGF0aEFuaW1hdGlvbiIsIlBhdGhBbmltYXRpb24uY29uc3RydWN0b3IiLCJzYXZlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBLElBQVksU0FBUyxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFFOUMsSUFBWSxFQUFFLFdBQU0sT0FDcEIsQ0FBQyxDQUQwQjtBQUUzQixJQUFZLElBQUksV0FBTSxRQUN0QixDQUFDLENBRDZCO0FBQzlCLGlCQUFjLFNBRWQsQ0FBQyxFQUZzQjtBQUV2QixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7QUFFakI7Ozs7R0FJRztBQUNIO0lBQTBCQSx3QkFBV0E7SUFDakNBLGNBQ1dBLEtBQWFBLEVBQ2JBLEVBQVVBLEVBQ1ZBLEdBQTZCQSxFQUM3QkEsTUFBcUJBLEVBQ3JCQSxRQUFnQkE7UUFFdkJDLGtCQUFNQSxLQUFLQSxFQUFFQSxFQUFFQSxFQUFFQSxRQUFRQSxDQUFDQSxDQUFBQTtRQU5uQkEsVUFBS0EsR0FBTEEsS0FBS0EsQ0FBUUE7UUFDYkEsT0FBRUEsR0FBRkEsRUFBRUEsQ0FBUUE7UUFDVkEsUUFBR0EsR0FBSEEsR0FBR0EsQ0FBMEJBO1FBQzdCQSxXQUFNQSxHQUFOQSxNQUFNQSxDQUFlQTtRQUNyQkEsYUFBUUEsR0FBUkEsUUFBUUEsQ0FBUUE7SUFHM0JBLENBQUNBO0lBQ0RELG1CQUFJQSxHQUFKQTtRQUNJRSxNQUFNQSxDQUFPQSxJQUFJQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxFQUFFQSxJQUFJQSxDQUFDQSxFQUFFQSxFQUFFQSxJQUFJQSxDQUFDQSxHQUFHQSxFQUFFQSxJQUFJQSxDQUFDQSxNQUFNQSxFQUFFQSxJQUFJQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtJQUNyRkEsQ0FBQ0E7SUFFREYsbUJBQUlBLEdBQUpBO1FBQ0lHLElBQUlBLEVBQUVBLEdBQVNBLGdCQUFLQSxDQUFDQSxJQUFJQSxXQUFFQSxDQUFDQTtRQUM1QkEsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0E7UUFDZEEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0E7SUFDZEEsQ0FBQ0E7SUFDREgsc0JBQU9BLEdBQVBBO1FBQ0lJLElBQUlBLEVBQUVBLEdBQVNBLGdCQUFLQSxDQUFDQSxPQUFPQSxXQUFFQSxDQUFDQTtRQUMvQkEsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsT0FBT0EsRUFBRUEsQ0FBQ0E7UUFDakJBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBO0lBQ2RBLENBQUNBO0lBRUxKLFdBQUNBO0FBQURBLENBekJBLEFBeUJDQSxFQXpCeUIsRUFBRSxDQUFDLFFBQVEsRUF5QnBDO0FBekJZLFlBQUksT0F5QmhCLENBQUE7QUFFRDtJQUErQkssNkJBQXVCQTtJQUVsREEsbUJBQW1CQSxNQUE4REE7UUFDN0VDLGtCQUFNQSxNQUFNQSxDQUFDQSxDQUFDQTtRQURDQSxXQUFNQSxHQUFOQSxNQUFNQSxDQUF3REE7SUFFakZBLENBQUNBO0lBRUREOzs7T0FHR0E7SUFDSEEsMEJBQU1BLEdBQU5BLFVBQU9BLE1BQTJFQTtRQUEzRUUsc0JBQTJFQSxHQUEzRUEsU0FBaUVBLFVBQUFBLEdBQUdBLElBQUlBLE9BQUFBLEdBQUdBLEVBQUhBLENBQUdBO1FBQzlFQSxNQUFNQSxDQUFRQSxJQUFJQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtJQUN4Q0EsQ0FBQ0E7SUFFREY7Ozs7T0FJR0E7SUFDSEEsZ0NBQVlBLEdBQVpBLFVBQ0lBLEtBQWFBLEVBQ2JBLGFBQzJGQSxFQUMzRkEsTUFBcUNBLEVBQ3JDQSxNQUFxQ0EsRUFDckNBLE1BQXFDQSxFQUNyQ0EsTUFBcUNBLEVBQ3JDQSxNQUFxQ0EsRUFDckNBLE1BQXFDQSxFQUNyQ0EsTUFBcUNBLEVBQ3JDQSxNQUFxQ0E7UUFFckNHLEVBQUVBLENBQUNBLENBQUNBLEtBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLEtBQUtBLEdBQUdBLFNBQVNBLENBQUNBLENBQUNBO1FBQzFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUNkQTtZQUNJQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsS0FBS0EsR0FBR0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7WUFDM0NBLElBQUlBLE1BQU1BLEdBQUdBLGFBQWFBLEVBQUVBLENBQUFBO1lBQzVCQSxNQUFNQSxDQUFDQSxVQUFDQSxJQUFVQSxFQUFFQSxJQUFTQSxFQUFFQSxJQUFTQSxFQUFFQSxJQUFTQSxFQUFFQSxJQUFTQSxFQUNwQ0EsSUFBU0EsRUFBRUEsSUFBU0EsRUFBRUEsSUFBU0EsRUFBRUEsSUFBU0E7Z0JBQ2hFQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtvQkFDUkEsSUFBSUEsUUFBUUEsR0FBR0EsRUFBRUEsQ0FBQ0E7b0JBQ2xCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFBQ0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7b0JBQ25DQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxLQUFLQSxHQUFHQSxVQUFVQSxHQUFHQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxHQUFHQSxDQUFDQSxDQUFDQTtnQkFDL0RBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFBQTtZQUNoRUEsQ0FBQ0EsQ0FBQUE7UUFDTEEsQ0FBQ0EsRUFDdUJBLENBQUNBLE1BQU1BLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUVBLFNBQVNBLENBQUNBLEVBQzVDQSxDQUFDQSxNQUFNQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFFQSxTQUFTQSxDQUFDQSxFQUM1Q0EsQ0FBQ0EsTUFBTUEs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QUFHQSxJQUFJQSxDQUFDQTtnQkFDdkJBLElBQUlBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO2dCQUMvQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBRS9DQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQTtvQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsYUFBYUEsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9DQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6Q0EsQ0FBQ0EsQ0FBQUE7UUFDTEEsQ0FBQ0EsRUFDK0JBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEVBQ3BCQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUN2QkEsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FDbERBLENBQUFBO0lBQ0xBLENBQUNBO0lBRURMLHdCQUFJQSxHQUFKQSxVQUNJQSxLQUE0QkE7UUFBNUJNLHFCQUE0QkEsR0FBNUJBLFdBQTRCQTtRQUU1QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7SUFDbENBLENBQUNBO0lB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QSxJQUFJQSxTQUFTQSxDQUFDQSxVQUFVQSxRQUE2QkE7UUFDeEQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQ2YsVUFBUyxJQUFVO1lBQ2YsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUM1QyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvQixDQUFDLEVBQ0QsY0FBWSxPQUFPLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUEsQ0FBQyxFQUNwRCxjQUFZLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUEsQ0FBQyxDQUNuRSxDQUFBO0lBQ0wsQ0FBQyxDQUFDQSxDQUFDQTtBQUNQQSxDQUFDQTtBQXJCZSxZQUFJLE9BcUJuQixDQUFBIiwiZmlsZSI6InNyYy9jYW52YXMuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
