var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var Parameter = require("../src/Parameter");
var OT = require("./ObservableTransformer");
var glow = require("./glow");
__export(require("./types"));
var DEBUG = false;
/**
 * Each frame an animation is provided a CanvasTick. The tick exposes access to the local animation time, the
 * time delta between the previous frame (dt) and the drawing context. Animators typically use the drawing context
 * directly, and pass the clock onto any time varying parameters.
 */
var CanvasTick = (function (_super) {
    __extends(CanvasTick, _super);
    function CanvasTick(clock, dt, ctx, events, previous) {
        _super.call(this, clock, dt, previous);
        this.clock = clock;
        this.dt = dt;
        this.ctx = ctx;
        this.events = events;
        this.previous = previous;
    }
    CanvasTick.prototype.copy = function () {
        return new CanvasTick(this.clock, this.dt, this.ctx, this.events, this.previous);
    };
    CanvasTick.prototype.save = function () {
        var cp = _super.prototype.save.call(this);
        cp.ctx.save();
        return cp;
    };
    CanvasTick.prototype.restore = function () {
        var cp = _super.prototype.restore.call(this);
        cp.ctx.restore();
        return cp;
    };
    return CanvasTick;
})(OT.BaseTick);
exports.CanvasTick = CanvasTick;
var Animation = (function (_super) {
    __extends(Animation, _super);
    function Animation(attach) {
        _super.call(this, attach);
        this.attach = attach;
    }
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    Animation.prototype.create = function (attach) {
        if (attach === void 0) { attach = function (nop) { return nop; }; }
        return new Animation(attach);
    };
    /**
     * Affect this with an effect to create combined animation.
     * Debug messages are inserted around the effect (e.g. a mutation to the canvas).
     * You can expose time varying or constant parameters to the inner effect using the optional params.
     */
    Animation.prototype.loggedAffect = function (label, effectBuilder, param1, param2, param3, param4, param5, param6, param7, param8) {
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
    Animation.prototype.velocity = function (velocity) {
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
    Animation.prototype.tween_linear = function (from, to, time) {
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
    Animation.prototype.glow = function (decay) {
        if (decay === void 0) { decay = 0.1; }
        return glow.glow(this, decay);
    };
    // Canvas API
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    Animation.prototype.strokeStyle = function (color) {
        return this.loggedAffect("strokeStyle", function () { return function (tick, color) {
            return tick.ctx.strokeStyle = color;
        }; }, color);
    };
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    Animation.prototype.fillStyle = function (color) {
        return this.loggedAffect("fillStyle", function () { return function (tick, color) {
            return tick.ctx.fillStyle = color;
        }; }, color);
    };
    /**
     * Dynamic chainable wrapper for shadowColor in the canvas API.
     */
    Animation.prototype.shadowColor = function (color) {
        return this.loggedAffect("shadowColor", function () { return function (tick, color) {
            return tick.ctx.shadowColor = color;
        }; }, color);
    };
    /**
     * Dynamic chainable wrapper for shadowBlur in the canvas API.
     */
    Animation.prototype.shadowBlur = function (level) {
        return this.loggedAffect("shadowBlur", function () { return function (tick, level) {
            return tick.ctx.shadowBlur = level;
        }; }, level);
    };
    /**
     * Dynamic chainable wrapper for shadowOffsetX and shadowOffsetY in the canvas API.
     */
    Animation.prototype.shadowOffset = function (xy) {
        return this.loggedAffect("shadowOffset", function () { return function (tick, xy) {
            tick.ctx.shadowOffsetX = xy[0];
            tick.ctx.shadowOffsetY = xy[1];
        }; }, xy);
    };
    /**
     * Dynamic chainable wrapper for lineCap in the canvas API.
     */
    Animation.prototype.lineCap = function (style) {
        return this.loggedAffect("lineCap", function () { return function (tick, arg) {
            return tick.ctx.lineCap = arg;
        }; }, style);
    };
    /**
     * Dynamic chainable wrapper for lineJoin in the canvas API.
     */
    Animation.prototype.lineJoin = function (style) {
        return this.loggedAffect("lineJoin", function () { return function (tick, arg) {
            return tick.ctx.lineJoin = arg;
        }; }, style);
    };
    /**
     * Dynamic chainable wrapper for lineWidth in the canvas API.
     */
    Animation.prototype.lineWidth = function (width) {
        return this.loggedAffect("lineWidth", function () { return function (tick, arg) {
            return tick.ctx.lineWidth = arg;
        }; }, width);
    };
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    Animation.prototype.miterLimit = function (limit) {
        return this.loggedAffect("miterLimit", function () { return function (tick, arg) {
            return tick.ctx.miterLimit = arg;
        }; }, limit);
    };
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    Animation.prototype.rect = function (xy, width_height) {
        return this.loggedAffect("rect", function () { return function (tick, xy, width_height) {
            return tick.ctx.rect(xy[0], xy[1], width_height[0], width_height[1]);
        }; }, xy, width_height);
    };
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    Animation.prototype.fillRect = function (xy, width_height) {
        return this.loggedAffect("fillRect", function () { return function (tick, xy, width_height) {
            return tick.ctx.fillRect(xy[0], xy[1], width_height[0], width_height[1]);
        }; }, xy, width_height);
    };
    /**
     * Dynamic chainable wrapper for strokeRect in the canvas API.
     */
    Animation.prototype.strokeRect = function (xy, width_height) {
        return this.loggedAffect("strokeRect", function () { return function (tick, xy, width_height) {
            return tick.ctx.strokeRect(xy[0], xy[1], width_height[0], width_height[1]);
        }; }, xy, width_height);
    };
    /**
     * Dynamic chainable wrapper for clearRect in the canvas API.
     */
    Animation.prototype.clearRect = function (xy, width_height) {
        return this.loggedAffect("clearRect", function () { return function (tick, xy, width_height) {
            return tick.ctx.clearRect(xy[0], xy[1], width_height[0], width_height[1]);
        }; }, xy, width_height);
    };
    /**
     * Encloses the inner animation with a beginpath() and endpath() from the canvas API.
     *
     * This returns a path object which events can be subscribed to
     */
    Animation.prototype.withinPath = function (inner) {
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
    Animation.prototype.closePath = function () {
        return this.loggedAffect("closePath", function () { return function (tick) {
            return tick.ctx.closePath();
        }; });
    };
    /**
     * Dynamic chainable wrapper for fill in the canvas API.
     */
    Animation.prototype.beginPath = function () {
        return this.loggedAffect("beginPath", function () { return function (tick) {
            return tick.ctx.beginPath();
        }; });
    };
    /**
     * Dynamic chainable wrapper for fill in the canvas API.
     */
    Animation.prototype.fill = function () {
        return this.loggedAffect("fill", function () { return function (tick) {
            return tick.ctx.fill();
        }; });
    };
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    Animation.prototype.stroke = function () {
        return this.loggedAffect("stroke", function () { return function (tick) {
            return tick.ctx.stroke();
        }; });
    };
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API.
     */
    Animation.prototype.moveTo = function (xy) {
        return this.loggedAffect("moveTo", function () { return function (tick, xy) {
            return tick.ctx.moveTo(xy[0], xy[1]);
        }; }, xy);
    };
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API.
     */
    Animation.prototype.lineTo = function (xy) {
        return this.loggedAffect("lineTo", function () { return function (tick, xy) {
            return tick.ctx.lineTo(xy[0], xy[1]);
        }; }, xy);
    };
    /**
     * Dynamic chainable wrapper for clip in the canvas API.
     */
    Animation.prototype.clip = function () {
        return this.loggedAffect("clip", function () { return function (tick) {
            return tick.ctx.clip();
        }; });
    };
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.quadraticCurveTo = function (control, end) {
        return this.loggedAffect("quadraticCurveTo", function () { return function (tick, arg1, arg2) {
            return tick.ctx.quadraticCurveTo(arg1[0], arg1[1], arg2[0], arg2[1]);
        }; }, control, end);
    };
    /**
     * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.bezierCurveTo = function (control1, control2, end) {
        return this.loggedAffect("bezierCurveTo", function () { return function (tick, arg1, arg2, arg3) {
            return tick.ctx.bezierCurveTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3[0], arg3[1]);
        }; }, control1, control2, end);
    };
    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    Animation.prototype.arcTo = function (tangent1, tangent2, radius) {
        return this.loggedAffect("arcTo", function () { return function (tick, arg1, arg2, arg3) {
            return tick.ctx.arcTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3);
        }; }, tangent1, tangent2, radius);
    };
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    Animation.prototype.scale = function (xy) {
        return this.loggedAffect("scale", function () { return function (tick, xy) {
            return tick.ctx.scale(xy[0], xy[1]);
        }; }, xy);
    };
    /**
     * Dynamic chainable wrapper for rotate in the canvas API.
     */
    Animation.prototype.rotate = function (clockwiseRadians) {
        return this.loggedAffect("rotate", function () { return function (tick, arg) {
            return tick.ctx.rotate(arg);
        }; }, clockwiseRadians);
    };
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     */
    Animation.prototype.translate = function (xy) {
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
    Animation.prototype.transform = function (a, b, c, d, e, f) {
        return this.loggedAffect("transform", function () { return function (tick, arg1, arg2, arg3, arg4, arg5, arg6) {
            return tick.ctx.transform(arg1, arg2, arg3, arg4, arg5, arg6);
        }; }, a, b, c, d, e, f);
    };
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    Animation.prototype.setTransform = function (a, b, c, d, e, f) {
        return this.loggedAffect("setTransform", function () { return function (tick, arg1, arg2, arg3, arg4, arg5, arg6) {
            return tick.ctx.setTransform(arg1, arg2, arg3, arg4, arg5, arg6);
        }; }, a, b, c, d, e, f);
    };
    /**
     * Dynamic chainable wrapper for font in the canvas API.
     */
    Animation.prototype.font = function (style) {
        return this.loggedAffect("font", function () { return function (tick, arg) {
            return tick.ctx.font = arg;
        }; }, style);
    };
    /**
     * Dynamic chainable wrapper for textAlign in the canvas API.
     */
    Animation.prototype.textAlign = function (style) {
        return this.loggedAffect("textAlign", function () { return function (tick, arg) {
            return tick.ctx.textAlign = arg;
        }; }, style);
    };
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    Animation.prototype.textBaseline = function (style) {
        return this.loggedAffect("textBaseline", function () { return function (tick, arg) {
            return tick.ctx.textBaseline = arg;
        }; }, style);
    };
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    Animation.prototype.fillText = function (text, xy, maxWidth) {
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
    Animation.prototype.drawImage = function (img, xy) {
        return this.loggedAffect("drawImage", function () { return function (tick, img, xy) {
            return tick.ctx.drawImage(img, xy[0], xy[1]);
        }; }, img, xy);
    };
    /**
     * * Dynamic chainable wrapper for globalCompositeOperation in the canvas API.
     */
    Animation.prototype.globalCompositeOperation = function (operation) {
        return this.loggedAffect("globalCompositeOperation", function () { return function (tick, arg) {
            return tick.ctx.globalCompositeOperation = arg;
        }; }, operation);
    };
    Animation.prototype.arc = function (center, radius, radStartAngle, radEndAngle, counterclockwise) {
        if (counterclockwise === void 0) { counterclockwise = false; }
        return this.loggedAffect("arc", function () { return function (tick, arg1, arg2, arg3, arg4, counterclockwise) {
            return tick.ctx.arc(arg1[0], arg1[1], arg2, arg3, arg4, counterclockwise);
        }; }, center, radius, radStartAngle, radEndAngle, counterclockwise);
    };
    return Animation;
})(OT.ChainableTransformer);
exports.Animation = Animation;
function create(attach) {
    if (attach === void 0) { attach = function (x) { return x; }; }
    return new Animation(attach);
}
exports.create = create;
var PathAnimation = (function (_super) {
    __extends(PathAnimation, _super);
    function PathAnimation() {
        _super.apply(this, arguments);
    }
    return PathAnimation;
})(Animation);
exports.PathAnimation = PathAnimation;
function save(width, height, path) {
    var GIFEncoder = require('gifencoder');
    var fs = require('fs');
    var encoder = new GIFEncoder(width, height);
    encoder.createReadStream()
        .pipe(encoder.createWriteStream({ repeat: 10000, delay: 100, quality: 1 }))
        .pipe(fs.createWriteStream(path));
    encoder.start();
    return new Animation(function (upstream) {
        return upstream.tap(function (tick) {
            if (DEBUG)
                console.log("save: wrote frame");
            encoder.addFrame(tick.ctx);
        }, function () { console.error("save: not saved", path); }, function () { console.log("save: saved", path); encoder.finish(); });
    });
}
exports.save = save;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9DYW52YXNBbmltYXRpb24udHMiXSwibmFtZXMiOlsiQ2FudmFzVGljayIsIkNhbnZhc1RpY2suY29uc3RydWN0b3IiLCJDYW52YXNUaWNrLmNvcHkiLCJDYW52YXNUaWNrLnNhdmUiLCJDYW52YXNUaWNrLnJlc3RvcmUiLCJBbmltYXRpb24iLCJBbmltYXRpb24uY29uc3RydWN0b3IiLCJBbmltYXRpb24uY3JlYXRlIiwiQW5pbWF0aW9uLmxvZ2dlZEFmZmVjdCIsIkFuaW1hdGlvbi52ZWxvY2l0eSIsIkFuaW1hdGlvbi50d2Vlbl9saW5lYXIiLCJBbmltYXRpb24uZ2xvdyIsIkFuaW1hdGlvbi5zdHJva2VTdHlsZSIsIkFuaW1hdGlvbi5maWxsU3R5bGUiLCJBbmltYXRpb24uc2hhZG93Q29sb3IiLCJBbmltYXRpb24uc2hhZG93Qmx1ciIsIkFuaW1hdGlvbi5zaGFkb3dPZmZzZXQiLCJBbmltYXRpb24ubGluZUNhcCIsIkFuaW1hdGlvbi5saW5lSm9pbiIsIkFuaW1hdGlvbi5saW5lV2lkdGgiLCJBbmltYXRpb24ubWl0ZXJMaW1pdCIsIkFuaW1hdGlvbi5yZWN0IiwiQW5pbWF0aW9uLmZpbGxSZWN0IiwiQW5pbWF0aW9uLnN0cm9rZVJlY3QiLCJBbmltYXRpb24uY2xlYXJSZWN0IiwiQW5pbWF0aW9uLndpdGhpblBhdGgiLCJBbmltYXRpb24uY2xvc2VQYXRoIiwiQW5pbWF0aW9uLmJlZ2luUGF0aCIsIkFuaW1hdGlvbi5maWxsIiwiQW5pbWF0aW9uLnN0cm9rZSIsIkFuaW1hdGlvbi5tb3ZlVG8iLCJBbmltYXRpb24ubGluZVRvIiwiQW5pbWF0aW9uLmNsaXAiLCJBbmltYXRpb24ucXVhZHJhdGljQ3VydmVUbyIsIkFuaW1hdGlvbi5iZXppZXJDdXJ2ZVRvIiwiQW5pbWF0aW9uLmFyY1RvIiwiQW5pbWF0aW9uLnNjYWxlIiwiQW5pbWF0aW9uLnJvdGF0ZSIsIkFuaW1hdGlvbi50cmFuc2xhdGUiLCJBbmltYXRpb24udHJhbnNmb3JtIiwiQW5pbWF0aW9uLnNldFRyYW5zZm9ybSIsIkFuaW1hdGlvbi5mb250IiwiQW5pbWF0aW9uLnRleHRBbGlnbiIsIkFuaW1hdGlvbi50ZXh0QmFzZWxpbmUiLCJBbmltYXRpb24uZmlsbFRleHQiLCJBbmltYXRpb24uZHJhd0ltYWdlIiwiQW5pbWF0aW9uLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiIsIkFuaW1hdGlvbi5hcmMiLCJjcmVhdGUiLCJQYXRoQW5pbWF0aW9uIiwiUGF0aEFuaW1hdGlvbi5jb25zdHJ1Y3RvciIsInNhdmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsSUFBWSxTQUFTLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUU5QyxJQUFZLEVBQUUsV0FBTSx5QkFDcEIsQ0FBQyxDQUQ0QztBQUU3QyxJQUFZLElBQUksV0FBTSxRQUN0QixDQUFDLENBRDZCO0FBQzlCLGlCQUFjLFNBRWQsQ0FBQyxFQUZzQjtBQUV2QixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7QUFFbEI7Ozs7R0FJRztBQUNIO0lBQWdDQSw4QkFBV0E7SUFDdkNBLG9CQUNXQSxLQUFhQSxFQUNiQSxFQUFVQSxFQUNWQSxHQUE2QkEsRUFDN0JBLE1BQXFCQSxFQUNyQkEsUUFBc0JBO1FBRTdCQyxrQkFBTUEsS0FBS0EsRUFBRUEsRUFBRUEsRUFBRUEsUUFBUUEsQ0FBQ0EsQ0FBQUE7UUFObkJBLFVBQUtBLEdBQUxBLEtBQUtBLENBQVFBO1FBQ2JBLE9BQUVBLEdBQUZBLEVBQUVBLENBQVFBO1FBQ1ZBLFFBQUdBLEdBQUhBLEdBQUdBLENBQTBCQTtRQUM3QkEsV0FBTUEsR0FBTkEsTUFBTUEsQ0FBZUE7UUFDckJBLGFBQVFBLEdBQVJBLFFBQVFBLENBQWNBO0lBR2pDQSxDQUFDQTtJQUNERCx5QkFBSUEsR0FBSkE7UUFDSUUsTUFBTUEsQ0FBT0EsSUFBSUEsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsRUFBRUEsSUFBSUEsQ0FBQ0EsRUFBRUEsRUFBRUEsSUFBSUEsQ0FBQ0EsR0FBR0EsRUFBRUEsSUFBSUEsQ0FB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QUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNuQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNuQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNuQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNuQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7d0JBQUNBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLEVBQUVBLENBQUNBLENBQUNBO29CQUNuQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsS0FBS0EsR0FBR0EsVUFBVUEsR0FBR0EsUUFBUUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9EQSxDQUFDQTtnQkFDREEsTUFBTUEsQ0FBQ0EsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQUE7WUFDaEVBLENBQUNBLENBQUFBO1FBQ0xBLENBQUNBLEVBQzBDQSxDQUFDQSxNQUFNQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFFQSxTQUFTQSxDQUFDQSxFQUM1Q0EsQ0FBQ0EsTUFBTUEsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBRUEsU0FBU0EsQ0FBQ0EsRUFDNUNBLENBQUNB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QSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQTtnQkFDdkJBLElBQUlBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBO2dCQUMvQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0E7Z0JBRS9DQSxFQUFFQSxDQUFDQSxDQUFDQSxLQUFLQSxDQUFDQTtvQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsYUFBYUEsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQy9DQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUN6Q0EsQ0FBQ0EsQ0FBQUE7UUFDTEEsQ0FBQ0EsRUFDa0RBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLEVBQ3BCQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUN2QkEsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FDckVBLENBQUFBO0lBQ0xBLENBQUNBO0lBRURMLHdCQUFJQSxHQUFKQSxVQUNJQSxLQUE0QkE7UUFBNUJNLHFCQUE0QkEsR0FBNUJBLFdBQTRCQTtRQUU1QkEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsS0FBS0EsQ0FBQ0EsQ0FBQ0E7SUFDbENB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LEVBRTNDO0FBRlkscUJBQWEsZ0JBRXpCLENBQUE7QUFJRCxjQUFxQixLQUFZLEVBQUUsTUFBYSxFQUFFLElBQVk7SUFDMURFLElBQUlBLFVBQVVBLEdBQUdBLE9BQU9BLENBQUNBLFlBQVlBLENBQUNBLENBQUNBO0lBQ3ZDQSxJQUFJQSxFQUFFQSxHQUFHQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtJQUd2QkEsSUFBSUEsT0FBT0EsR0FBR0EsSUFBSUEsVUFBVUEsQ0FBQ0EsS0FBS0EsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7SUFDNUNBLE9BQU9BLENBQUNBLGdCQUFnQkEsRUFBRUE7U0FDdkJBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLGlCQUFpQkEsQ0FBQ0EsRUFBRUEsTUFBTUEsRUFBRUEsS0FBS0EsRUFBRUEsS0FBS0EsRUFBRUEsR0FBR0EsRUFBRUEsT0FBT0EsRUFBRUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7U0FDMUVBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDcENBLE9BQU9BLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBO0lBRWhCQSxNQUFNQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUFDQSxVQUFVQSxRQUFtQ0E7UUFDOUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQ2YsVUFBUyxJQUFnQjtZQUNyQixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQzVDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLENBQUMsRUFDRCxjQUFZLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQSxDQUFDLEVBQ3BELGNBQVksT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQSxDQUFDLENBQ25FLENBQUE7SUFDTCxDQUFDLENBQUNBLENBQUNBO0FBQ1BBLENBQUNBO0FBckJlLFlBQUksT0FxQm5CLENBQUEiLCJmaWxlIjoic3JjL0NhbnZhc0FuaW1hdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
