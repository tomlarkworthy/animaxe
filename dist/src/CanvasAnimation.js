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
var DEBUG = true;
/**
 * Each frame an animation is provided a CanvasTick. The tick exposes access to the local animation time, the
 * time delta between the previous frame (dt) and the drawing context. Animators typically use the drawing context
 * directly, and pass the clock onto any time varying parameters.
 */
var CanvasTick = (function (_super) {
    __extends(CanvasTick, _super);
    function CanvasTick(clock, dt, ctx, events) {
        _super.call(this, clock, dt, ctx);
        this.clock = clock;
        this.dt = dt;
        this.ctx = ctx;
        this.events = events;
    }
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
    Animation.prototype.velocity = function (velocity) {
        if (DEBUG)
            console.log("velocity: build");
        return this.affect1(Parameter.from(velocity), function () {
            if (DEBUG)
                console.log("velocity: attach");
            var pos = [0.0, 0.0];
            return function (tick, velocity) {
                tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
                pos[0] += velocity[0] * tick.dt;
                pos[1] += velocity[1] * tick.dt;
                if (DEBUG)
                    console.log("velocity: tick", velocity, pos);
            };
        });
    };
    Animation.prototype.tween_linear = function (from, to, time) {
        return this.affect3(Parameter.from(from), Parameter.from(to), Parameter.from(time), function () {
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
        });
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
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("strokeStyle: attach");
            var color_next = Parameter.from(color).init();
            return function (tick) {
                var color = color_next(tick.clock);
                if (DEBUG)
                    console.log("strokeStyle: strokeStyle", color);
                tick.ctx.strokeStyle = color;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    Animation.prototype.fillStyle = function (color) {
        if (DEBUG)
            console.log("fillStyle: build");
        return this.affect1(Parameter.from(color), function () {
            if (DEBUG)
                console.log("fillStyle: attach");
            return function (tick, color) {
                if (DEBUG)
                    console.log("fillStyle: color", color);
                tick.ctx.fillStyle = color;
            };
        });
    };
    /**
     * Dynamic chainable wrapper for shadowColor in the canvas API.
     */
    Animation.prototype.shadowColor = function (color) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("shadowColor: attach");
            var color_next = Parameter.from(color).init();
            return function (tick) {
                var color = color_next(tick.clock);
                if (DEBUG)
                    console.log("shadowColor: shadowColor", color);
                tick.ctx.shadowColor = color;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for shadowBlur in the canvas API.
     */
    Animation.prototype.shadowBlur = function (level) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("shadowBlur: attach");
            var level_next = Parameter.from(level).init();
            return function (tick) {
                var level = level_next(tick.clock);
                if (DEBUG)
                    console.log("shadowBlur: shadowBlur", level);
                tick.ctx.shadowBlur = level;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for shadowOffsetX and shadowOffsetY in the canvas API.
     */
    Animation.prototype.shadowOffset = function (xy) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("shadowOffset: attach");
            var xy_next = Parameter.from(xy).init();
            return function (tick) {
                var xy = xy_next(tick.clock);
                if (DEBUG)
                    console.log("shadowOffset: shadowOffset", xy);
                tick.ctx.shadowOffsetX = xy[0];
                tick.ctx.shadowOffsetY = xy[1];
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for lineCap in the canvas API.
     */
    Animation.prototype.lineCap = function (style) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("lineCap: attach");
            var arg_next = Parameter.from(style).init();
            return function (tick) {
                var arg = arg_next(tick.clock);
                if (DEBUG)
                    console.log("lineCap: lineCap", arg);
                tick.ctx.lineCap = arg;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for lineJoin in the canvas API.
     */
    Animation.prototype.lineJoin = function (style) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("lineJoin: attach");
            var arg_next = Parameter.from(style).init();
            return function (tick) {
                var arg = arg_next(tick.clock);
                if (DEBUG)
                    console.log("lineJoin: lineCap", arg);
                tick.ctx.lineJoin = arg;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for lineWidth in the canvas API.
     */
    Animation.prototype.lineWidth = function (width) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("lineWidth: attach");
            var width_next = Parameter.from(width).init();
            return function (tick) {
                var width = width_next(tick.clock);
                if (DEBUG)
                    console.log("lineWidth: lineWidth", width);
                tick.ctx.lineWidth = width;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    Animation.prototype.miterLimit = function (limit) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("miterLimit: attach");
            var arg_next = Parameter.from(limit).init();
            return function (tick) {
                var arg = arg_next(tick.clock);
                if (DEBUG)
                    console.log("miterLimit: miterLimit", arg);
                tick.ctx.miterLimit = arg;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    Animation.prototype.rect = function (xy, width_height) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("rect: attach");
            var xy_next = Parameter.from(xy).init();
            var width_height_next = Parameter.from(width_height).init();
            return function (tick) {
                var xy = xy_next(tick.clock);
                var width_height = width_height_next(tick.clock);
                if (DEBUG)
                    console.log("rect: rect", xy, width_height);
                tick.ctx.rect(xy[0], xy[1], width_height[0], width_height[1]);
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    Animation.prototype.fillRect = function (xy, width_height) {
        if (DEBUG)
            console.log("fillRect: build");
        return this.affect2(Parameter.from(xy), Parameter.from(width_height), function () {
            if (DEBUG)
                console.log("fillRect: attach");
            return function (tick, xy, width_height) {
                if (DEBUG)
                    console.log("fillRect: tick", xy, width_height);
                tick.ctx.fillRect(xy[0], xy[1], width_height[0], width_height[1]);
            };
        });
    };
    /**
     * Dynamic chainable wrapper for strokeRect in the canvas API.
     */
    Animation.prototype.strokeRect = function (xy, width_height) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("strokeRect: attach");
            var xy_next = Parameter.from(xy).init();
            var width_height_next = Parameter.from(width_height).init();
            return function (tick) {
                var xy = xy_next(tick.clock);
                var width_height = width_height_next(tick.clock);
                if (DEBUG)
                    console.log("strokeRect: strokeRect", xy, width_height);
                tick.ctx.strokeRect(xy[0], xy[1], width_height[0], width_height[1]);
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for clearRect in the canvas API.
     */
    Animation.prototype.clearRect = function (xy, width_height) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("clearRect: attach");
            var xy_next = Parameter.from(xy).init();
            var width_height_next = Parameter.from(width_height).init();
            return function (tick) {
                var xy = xy_next(tick.clock);
                var width_height = width_height_next(tick.clock);
                if (DEBUG)
                    console.log("clearRect: clearRect", xy, width_height);
                tick.ctx.clearRect(xy[0], xy[1], width_height[0], width_height[1]);
            };
        }));
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
            var beginPathBeforeInner = upstream.tapOnNext(function (tick) { tick.ctx.beginPath(); });
            return inner.attach(beginPathBeforeInner).tapOnNext(function (tick) { tick.ctx.closePath(); });
        }));
    };
    /**
     * Dynamic chainable wrapper for fill in the canvas API. Use with withinPath.
     */
    Animation.prototype.fill = function () {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("fill: attach");
            return function (tick) {
                if (DEBUG)
                    console.log("fill: fill");
                tick.ctx.fill();
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    Animation.prototype.stroke = function () {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("stroke: attach");
            return function (tick) {
                if (DEBUG)
                    console.log("stroke: stroke");
                tick.ctx.stroke();
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.moveTo = function (xy) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("moveTo: attach");
            var xy_next = Parameter.from(xy).init();
            return function (tick) {
                var xy = xy_next(tick.clock);
                if (DEBUG)
                    console.log("moveTo: moveTo", xy);
                tick.ctx.moveTo(xy[0], xy[1]);
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.lineTo = function (xy) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("lineTo: attach");
            var xy_next = Parameter.from(xy).init();
            return function (tick) {
                var xy = xy_next(tick.clock);
                if (DEBUG)
                    console.log("lineTo: lineTo", xy);
                tick.ctx.lineTo(xy[0], xy[1]);
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for clip in the canvas API. Use with withinPath.
     */
    Animation.prototype.clip = function () {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("clip: attach");
            return function (tick) {
                if (DEBUG)
                    console.log("clip: clip");
                tick.ctx.clip();
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.quadraticCurveTo = function (control, end) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("quadraticCurveTo: attach");
            var arg1_next = Parameter.from(control).init();
            var arg2_next = Parameter.from(end).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                if (DEBUG)
                    console.log("quadraticCurveTo: quadraticCurveTo", arg1, arg2);
                tick.ctx.quadraticCurveTo(arg1[0], arg1[1], arg2[0], arg2[1]);
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.bezierCurveTo = function (control1, control2, end) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("bezierCurveTo: attach");
            var arg1_next = Parameter.from(control1).init();
            var arg2_next = Parameter.from(control2).init();
            var arg3_next = Parameter.from(end).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                if (DEBUG)
                    console.log("bezierCurveTo: bezierCurveTo", arg1, arg2, arg3);
                tick.ctx.bezierCurveTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3[0], arg3[1]);
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    Animation.prototype.arcTo = function (tangent1, tangent2, radius) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("arc: attach");
            var arg1_next = Parameter.from(tangent1).init();
            var arg2_next = Parameter.from(tangent2).init();
            var arg3_next = Parameter.from(radius).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                if (DEBUG)
                    console.log("arc: arc", arg1, arg2, arg3);
                tick.ctx.arcTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3);
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    Animation.prototype.scale = function (xy) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("scale: attach");
            var arg1_next = Parameter.from(xy).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG)
                    console.log("scale: scale", arg1);
                tick.ctx.scale(arg1[0], arg1[1]);
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for rotate in the canvas API.
     */
    Animation.prototype.rotate = function (clockwiseRadians) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("rotate: attach");
            var arg1_next = Parameter.from(clockwiseRadians).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG)
                    console.log("rotate: rotate", arg1);
                tick.ctx.rotate(arg1);
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     */
    Animation.prototype.translate = function (xy) {
        if (DEBUG)
            console.log("translate: build");
        return this.affect1(Parameter.from(xy), function () {
            if (DEBUG)
                console.log("translate: attach");
            return function (tick, xy) {
                if (DEBUG)
                    console.log("translate:", xy);
                tick.ctx.translate(xy[0], xy[1]);
            };
        });
    };
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     * [ a c e
     *   b d f
     *   0 0 1 ]
     */
    Animation.prototype.transform = function (a, b, c, d, e, f) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("transform: attach");
            var arg1_next = Parameter.from(a).init();
            var arg2_next = Parameter.from(b).init();
            var arg3_next = Parameter.from(c).init();
            var arg4_next = Parameter.from(d).init();
            var arg5_next = Parameter.from(e).init();
            var arg6_next = Parameter.from(f).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                var arg4 = arg4_next(tick.clock);
                var arg5 = arg5_next(tick.clock);
                var arg6 = arg6_next(tick.clock);
                if (DEBUG)
                    console.log("transform: transform", arg1, arg2, arg3, arg4, arg5, arg6);
                tick.ctx.transform(arg1, arg2, arg3, arg4, arg5, arg6);
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    Animation.prototype.setTransform = function (a, b, c, d, e, f) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("setTransform: attach");
            var arg1_next = Parameter.from(a).init();
            var arg2_next = Parameter.from(b).init();
            var arg3_next = Parameter.from(c).init();
            var arg4_next = Parameter.from(d).init();
            var arg5_next = Parameter.from(e).init();
            var arg6_next = Parameter.from(f).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                var arg4 = arg4_next(tick.clock);
                var arg5 = arg5_next(tick.clock);
                var arg6 = arg6_next(tick.clock);
                if (DEBUG)
                    console.log("setTransform: setTransform", arg1, arg2, arg3, arg4, arg5, arg6);
                tick.ctx.setTransform(arg1, arg2, arg3, arg4, arg5, arg6);
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for font in the canvas API.
     */
    Animation.prototype.font = function (style) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("font: attach");
            var arg1_next = Parameter.from(style).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG)
                    console.log("font: font", arg1);
                tick.ctx.font = arg1;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for textAlign in the canvas API.
     */
    Animation.prototype.textAlign = function (style) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("textAlign: attach");
            var arg1_next = Parameter.from(style).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG)
                    console.log("textAlign: textAlign", arg1);
                tick.ctx.textAlign = arg1;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    Animation.prototype.textBaseline = function (style) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("textBaseline: attach");
            var arg1_next = Parameter.from(style).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG)
                    console.log("textBaseline: textBaseline", arg1);
                tick.ctx.textBaseline = arg1;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    Animation.prototype.fillText = function (text, xy, maxWidth) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("fillText: attach");
            var arg1_next = Parameter.from(text).init();
            var arg2_next = Parameter.from(xy).init();
            var arg3_next = maxWidth ? Parameter.from(maxWidth).init() : undefined;
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = maxWidth ? arg3_next(tick.clock) : undefined;
                if (DEBUG)
                    console.log("fillText: fillText", arg1, arg2, arg3);
                if (maxWidth) {
                    tick.ctx.fillText(arg1, arg2[0], arg2[0], arg3);
                }
                else {
                    tick.ctx.fillText(arg1, arg2[0], arg2[0]);
                }
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for drawImage in the canvas API.
     */
    Animation.prototype.drawImage = function (img, xy) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("drawImage: attach");
            var arg1_next = Parameter.from(xy).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG)
                    console.log("drawImage: drawImage", arg1);
                tick.ctx.drawImage(img, arg1[0], arg1[1]);
            };
        }));
    };
    /**
     * * Dynamic chainable wrapper for globalCompositeOperation in the canvas API.
     */
    Animation.prototype.globalCompositeOperation = function (operation) {
        if (DEBUG)
            console.log("globalCompositeOperation: build");
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("globalCompositeOperation: attached");
            return function (tick) {
                if (DEBUG)
                    console.log("globalCompositeOperation: globalCompositeOperation");
                tick.ctx.globalCompositeOperation = operation;
            };
        }));
    };
    Animation.prototype.arc = function (center, radius, radStartAngle, radEndAngle, counterclockwise) {
        return this.draw(function () {
            if (DEBUG)
                console.log("arc: attach");
            var arg1_next = Parameter.from(center).init();
            var arg2_next = Parameter.from(radius).init();
            var arg3_next = Parameter.from(radStartAngle).init();
            var arg4_next = Parameter.from(radEndAngle).init();
            return function (tick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                var arg4 = arg4_next(tick.clock);
                if (DEBUG)
                    console.log("arc: arc", arg1, arg2, arg3, arg4);
                tick.ctx.arc(arg1[0], arg1[1], arg2, arg3, arg4, counterclockwise);
            };
        });
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9DYW52YXNBbmltYXRpb24udHMiXSwibmFtZXMiOlsiQ2FudmFzVGljayIsIkNhbnZhc1RpY2suY29uc3RydWN0b3IiLCJBbmltYXRpb24iLCJBbmltYXRpb24uY29uc3RydWN0b3IiLCJBbmltYXRpb24uY3JlYXRlIiwiQW5pbWF0aW9uLnZlbG9jaXR5IiwiQW5pbWF0aW9uLnR3ZWVuX2xpbmVhciIsIkFuaW1hdGlvbi5nbG93IiwiQW5pbWF0aW9uLnN0cm9rZVN0eWxlIiwiQW5pbWF0aW9uLmZpbGxTdHlsZSIsIkFuaW1hdGlvbi5zaGFkb3dDb2xvciIsIkFuaW1hdGlvbi5zaGFkb3dCbHVyIiwiQW5pbWF0aW9uLnNoYWRvd09mZnNldCIsIkFuaW1hdGlvbi5saW5lQ2FwIiwiQW5pbWF0aW9uLmxpbmVKb2luIiwiQW5pbWF0aW9uLmxpbmVXaWR0aCIsIkFuaW1hdGlvbi5taXRlckxpbWl0IiwiQW5pbWF0aW9uLnJlY3QiLCJBbmltYXRpb24uZmlsbFJlY3QiLCJBbmltYXRpb24uc3Ryb2tlUmVjdCIsIkFuaW1hdGlvbi5jbGVhclJlY3QiLCJBbmltYXRpb24ud2l0aGluUGF0aCIsIkFuaW1hdGlvbi5maWxsIiwiQW5pbWF0aW9uLnN0cm9rZSIsIkFuaW1hdGlvbi5tb3ZlVG8iLCJBbmltYXRpb24ubGluZVRvIiwiQW5pbWF0aW9uLmNsaXAiLCJBbmltYXRpb24ucXVhZHJhdGljQ3VydmVUbyIsIkFuaW1hdGlvbi5iZXppZXJDdXJ2ZVRvIiwiQW5pbWF0aW9uLmFyY1RvIiwiQW5pbWF0aW9uLnNjYWxlIiwiQW5pbWF0aW9uLnJvdGF0ZSIsIkFuaW1hdGlvbi50cmFuc2xhdGUiLCJBbmltYXRpb24udHJhbnNmb3JtIiwiQW5pbWF0aW9uLnNldFRyYW5zZm9ybSIsIkFuaW1hdGlvbi5mb250IiwiQW5pbWF0aW9uLnRleHRBbGlnbiIsIkFuaW1hdGlvbi50ZXh0QmFzZWxpbmUiLCJBbmltYXRpb24uZmlsbFRleHQiLCJBbmltYXRpb24uZHJhd0ltYWdlIiwiQW5pbWF0aW9uLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiIsIkFuaW1hdGlvbi5hcmMiLCJjcmVhdGUiLCJQYXRoQW5pbWF0aW9uIiwiUGF0aEFuaW1hdGlvbi5jb25zdHJ1Y3RvciIsInNhdmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUEsSUFBWSxTQUFTLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUU5QyxJQUFZLEVBQUUsV0FBTSx5QkFDcEIsQ0FBQyxDQUQ0QztBQUU3QyxJQUFZLElBQUksV0FBTSxRQUN0QixDQUFDLENBRDZCO0FBQzlCLGlCQUFjLFNBRWQsQ0FBQyxFQUZzQjtBQUV2QixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7QUFFakI7Ozs7R0FJRztBQUNIO0lBQWdDQSw4QkFBV0E7SUFDdkNBLG9CQUNXQSxLQUFhQSxFQUNiQSxFQUFVQSxFQUNWQSxHQUE2QkEsRUFDN0JBLE1BQXFCQTtRQUU1QkMsa0JBQU1BLEtBQUtBLEVBQUVBLEVBQUVBLEVBQUVBLEdBQUdBLENBQUNBLENBQUFBO1FBTGRBLFVBQUtBLEdBQUxBLEtBQUtBLENBQVFBO1FBQ2JBLE9BQUVBLEdBQUZBLEVBQUVBLENBQVFBO1FBQ1ZBLFFBQUdBLEdBQUhBLEdBQUdBLENBQTBCQTtRQUM3QkEsV0FBTUEsR0FBTkEsTUFBTUEsQ0FBZUE7SUFHaENBLENBQUNBO0lBQ0xELGlCQUFDQTtBQUFEQSxDQVRBLEFBU0NBLEVBVCtCLEVBQUUsQ0FBQyxRQUFRLEVBUzFDO0FBVFksa0JBQVUsYUFTdEIsQ0FBQTtBQUdEO0lBQStCRSw2QkFBbUNBO0lBRTlEQSxtQkFBbUJBLE1BQTBFQTtRQUN6RkMsa0JBQU1BLE1BQU1BLENBQUNBLENBQUNBO1FBRENBLFdBQU1BLEdBQU5BLE1BQU1BLENBQW9FQTtJQUU3RkEsQ0FBQ0E7SUFFREQ7OztPQUdHQTtJQUNIQSwwQkFBTUEsR0FBTkEsVUFBT0EsTUFBdUZBO1FBQXZGRSxzQkFBdUZBLEdBQXZGQSxTQUE2RUEsVUFBQUEsR0FBR0EsSUFBSUEsT0FBQUEsR0FBR0EsRUFBSEEs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Q0FBQ0EsaUJBQWlCQSxDQUFDQSxFQUFFQSxNQUFNQSxFQUFFQSxLQUFLQSxFQUFFQSxLQUFLQSxFQUFFQSxHQUFHQSxFQUFFQSxPQUFPQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQTtTQUMxRUEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtJQUNwQ0EsT0FBT0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0E7SUFFaEJBLE1BQU1BLENBQUNBLElBQUlBLFNBQVNBLENBQUNBLFVBQVVBLFFBQW1DQTtRQUM5RCxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FDZixVQUFTLElBQWdCO1lBQ3JCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDNUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxFQUNELGNBQVksT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBLENBQUMsRUFDcEQsY0FBWSxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBLENBQUMsQ0FDbkUsQ0FBQTtJQUNMLENBQUMsQ0FBQ0EsQ0FBQ0E7QUFDUEEsQ0FBQ0E7QUFyQmUsWUFBSSxPQXFCbkIsQ0FBQSIsImZpbGUiOiJzcmMvQ2FudmFzQW5pbWF0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
