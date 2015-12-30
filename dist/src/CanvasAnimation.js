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
        }, param1 ? Parameter.from(param1) : undefined, param2 ? Parameter.from(param2) : undefined, param3 ? Parameter.from(param3) : undefined, param4 ? Parameter.from(param4) : undefined, param5 ? Parameter.from(param5) : undefined, param6 ? Parameter.from(param6) : undefined, param7 ? Parameter.from(param7) : undefined, param8 ? Parameter.from(param8) : undefined);
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
     * Dynamic chainable wrapper for fill in the canvas API. Use with withinPath.
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
     * Dynamic chainable wrapper for moveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.moveTo = function (xy) {
        return this.loggedAffect("moveTo", function () { return function (tick, xy) {
            return tick.ctx.moveTo(xy[0], xy[1]);
        }; }, xy);
    };
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.lineTo = function (xy) {
        return this.loggedAffect("lineTo", function () { return function (tick, xy) {
            return tick.ctx.lineTo(xy[0], xy[1]);
        }; }, xy);
    };
    /**
     * Dynamic chainable wrapper for clip in the canvas API. Use with withinPath.
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9DYW52YXNBbmltYXRpb24udHMiXSwibmFtZXMiOlsiQ2FudmFzVGljayIsIkNhbnZhc1RpY2suY29uc3RydWN0b3IiLCJDYW52YXNUaWNrLmNvcHkiLCJDYW52YXNUaWNrLnNhdmUiLCJDYW52YXNUaWNrLnJlc3RvcmUiLCJBbmltYXRpb24iLCJBbmltYXRpb24uY29uc3RydWN0b3IiLCJBbmltYXRpb24uY3JlYXRlIiwiQW5pbWF0aW9uLmxvZ2dlZEFmZmVjdCIsIkFuaW1hdGlvbi52ZWxvY2l0eSIsIkFuaW1hdGlvbi50d2Vlbl9saW5lYXIiLCJBbmltYXRpb24uZ2xvdyIsIkFuaW1hdGlvbi5zdHJva2VTdHlsZSIsIkFuaW1hdGlvbi5maWxsU3R5bGUiLCJBbmltYXRpb24uc2hhZG93Q29sb3IiLCJBbmltYXRpb24uc2hhZG93Qmx1ciIsIkFuaW1hdGlvbi5zaGFkb3dPZmZzZXQiLCJBbmltYXRpb24ubGluZUNhcCIsIkFuaW1hdGlvbi5saW5lSm9pbiIsIkFuaW1hdGlvbi5saW5lV2lkdGgiLCJBbmltYXRpb24ubWl0ZXJMaW1pdCIsIkFuaW1hdGlvbi5yZWN0IiwiQW5pbWF0aW9uLmZpbGxSZWN0IiwiQW5pbWF0aW9uLnN0cm9rZVJlY3QiLCJBbmltYXRpb24uY2xlYXJSZWN0IiwiQW5pbWF0aW9uLndpdGhpblBhdGgiLCJBbmltYXRpb24uZmlsbCIsIkFuaW1hdGlvbi5zdHJva2UiLCJBbmltYXRpb24ubW92ZVRvIiwiQW5pbWF0aW9uLmxpbmVUbyIsIkFuaW1hdGlvbi5jbGlwIiwiQW5pbWF0aW9uLnF1YWRyYXRpY0N1cnZlVG8iLCJBbmltYXRpb24uYmV6aWVyQ3VydmVUbyIsIkFuaW1hdGlvbi5hcmNUbyIsIkFuaW1hdGlvbi5zY2FsZSIsIkFuaW1hdGlvbi5yb3RhdGUiLCJBbmltYXRpb24udHJhbnNsYXRlIiwiQW5pbWF0aW9uLnRyYW5zZm9ybSIsIkFuaW1hdGlvbi5zZXRUcmFuc2Zvcm0iLCJBbmltYXRpb24uZm9udCIsIkFuaW1hdGlvbi50ZXh0QWxpZ24iLCJBbmltYXRpb24udGV4dEJhc2VsaW5lIiwiQW5pbWF0aW9uLmZpbGxUZXh0IiwiQW5pbWF0aW9uLmRyYXdJbWFnZSIsIkFuaW1hdGlvbi5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24iLCJBbmltYXRpb24uYXJjIiwiY3JlYXRlIiwiUGF0aEFuaW1hdGlvbiIsIlBhdGhBbmltYXRpb24uY29uc3RydWN0b3IiLCJzYXZlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBLElBQVksU0FBUyxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFFOUMsSUFBWSxFQUFFLFdBQU0seUJBQ3BCLENBQUMsQ0FENEM7QUFFN0MsSUFBWSxJQUFJLFdBQU0sUUFDdEIsQ0FBQyxDQUQ2QjtBQUM5QixpQkFBYyxTQUVkLENBQUMsRUFGc0I7QUFFdkIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBRWxCOzs7O0dBSUc7QUFDSDtJQUFnQ0EsOEJBQVdBO0lBQ3ZDQSxvQkFDV0EsS0FBYUEsRUFDYkEsRUFBVUEsRUFDVkEsR0FBNkJBLEVBQzdCQSxNQUFxQkEsRUFDckJBLFFBQXNCQTtRQUU3QkMsa0JBQU1BLEtBQUtBLEVBQUVBLEVBQUVBLEVBQUVBLFFBQVFBLENBQUNBLENBQUFBO1FBTm5CQSxVQUFLQSxHQUFMQSxLQUFLQSxDQUFRQTtRQUNiQSxPQUFFQSxHQUFGQSxFQUFFQSxDQUFRQTtRQUNWQSxRQUFHQSxHQUFIQSxHQUFHQSxDQUEwQkE7UUFDN0JBLFdBQU1BLEdBQU5BLE1BQU1BLENBQWVBO1FBQ3JCQSxhQUFRQSxHQUFSQSxRQUFRQSxDQUFjQTtJQUdqQ0EsQ0FBQ0E7SUFDREQseUJBQUlBLEdBQUpBO1FBQ0lFLE1BQU1BLENBQU9BLElBQUlBLFVBQVVBLENBQUNBLElBQUlBLENBQUNBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLEVBQUVBLEVBQUVBLElBQUlBLENBQUNBLEdBQUdBLEVBQUVBLElBQUlBLENBQUNBLE1BQU1BLEVBQUVBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLENBQUNB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bkNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBO3dCQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFDbkNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBO3dCQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFDbkNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBO3dCQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFDbkNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBO3dCQUFDQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQTtvQkFDbkNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLEtBQUtBLEdBQUdBLFVBQVVBLEdBQUdBLFFBQVFBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLEdBQUdBLENBQUNBLENBQUNBO2dCQUMvREEsQ0FBQ0E7Z0JBQ0RBLE1BQU1BLENBQUNBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLEVBQUVBLElBQUlBLENBQUNBLENBQUFBO1lBQ2hFQSxDQUFDQSxDQUFBQTtRQUNMQSxDQUFDQSxFQUNEQSxNQUFNQSxHQUFHQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxHQUFFQSxTQUFTQSxFQUMxQ0EsTUFBTUEsR0FBR0EsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBRUEsU0FBU0EsRUFDMUNBLE1BQU1BLEdBQUdBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLEdBQUVBLFNBQVNBLEVBQzFDQSxNQUFNQSxH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LFFBQW1DQTtRQUM5RCxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FDZixVQUFTLElBQWdCO1lBQ3JCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDNUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxFQUNELGNBQVksT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBLENBQUMsRUFDcEQsY0FBWSxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBLENBQUMsQ0FDbkUsQ0FBQTtJQUNMLENBQUMsQ0FBQ0EsQ0FBQ0E7QUFDUEEsQ0FBQ0E7QUFyQmUsWUFBSSxPQXFCbkIsQ0FBQSIsImZpbGUiOiJzcmMvQ2FudmFzQW5pbWF0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
