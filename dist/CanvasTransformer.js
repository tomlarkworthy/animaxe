var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var Parameter = require("./parameter");
var OT = require("./ObservableTransformer");
__export(require("./types"));
var DEBUG = false;
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
    // Canvas API
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    Animation.prototype.strokeStyle = function (color) {
        return this.pipe(strokeStyle(color));
    };
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    Animation.prototype.fillStyle = function (color) {
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("fillStyle: attach");
            var color_next = Parameter.from(color).init();
            return function (tick) {
                var color = color_next(tick.clock);
                if (DEBUG)
                    console.log("fillStyle: fillStyle", color);
                tick.ctx.fillStyle = color;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for shadowColor in the canvas API.
     */
    Animation.prototype.shadowColor = function (color) {
        return this.pipe(shadowColor(color));
    };
    /**
     * Dynamic chainable wrapper for shadowBlur in the canvas API.
     */
    Animation.prototype.shadowBlur = function (level) {
        return this.pipe(shadowBlur(level));
    };
    /**
     * Dynamic chainable wrapper for shadowOffsetX and shadowOffsetY in the canvas API.
     */
    Animation.prototype.shadowOffset = function (xy) {
        return this.pipe(shadowOffset(xy));
    };
    /**
     * Dynamic chainable wrapper for lineCap in the canvas API.
     */
    Animation.prototype.lineCap = function (style) {
        return this.pipe(lineCap(style));
    };
    /**
     * Dynamic chainable wrapper for lineJoin in the canvas API.
     */
    Animation.prototype.lineJoin = function (style) {
        return this.pipe(lineJoin(style));
    };
    /**
     * Dynamic chainable wrapper for lineWidth in the canvas API.
     */
    Animation.prototype.lineWidth = function (width) {
        return this.pipe(lineWidth(width));
    };
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    Animation.prototype.miterLimit = function (limit) {
        return this.pipe(miterLimit(limit));
    };
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    Animation.prototype.rect = function (xy, width_height) {
        return this.pipe(rect(xy, width_height));
    };
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    Animation.prototype.fillRect = function (xy, width_height) {
        return this.pipe(fillRect(xy, width_height));
    };
    /**
     * Dynamic chainable wrapper for strokeRect in the canvas API.
     */
    Animation.prototype.strokeRect = function (xy, width_height) {
        return this.pipe(strokeRect(xy, width_height));
    };
    /**
     * Dynamic chainable wrapper for clearRect in the canvas API.
     */
    Animation.prototype.clearRect = function (xy, width_height) {
        return this.pipe(clearRect(xy, width_height));
    };
    /**
     * Encloses the inner animation with a beginpath() and endpath() from the canvas API.
     *
     * This returns a path object which events can be subscribed to
     */
    Animation.prototype.withinPath = function (inner) {
        return this.pipe(withinPath(inner));
    };
    /**
     * Dynamic chainable wrapper for fill in the canvas API. Use with withinPath.
     */
    Animation.prototype.fill = function () {
        return this.pipe(fill());
    };
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    Animation.prototype.stroke = function () {
        return this.pipe(stroke());
    };
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.moveTo = function (xy) {
        return this.pipe(moveTo(xy));
    };
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.lineTo = function (xy) {
        return this.pipe(lineTo(xy));
    };
    /**
     * Dynamic chainable wrapper for clip in the canvas API. Use with withinPath.
     */
    Animation.prototype.clip = function () {
        return this.pipe(clip());
    };
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.quadraticCurveTo = function (control, end) {
        return this.pipe(quadraticCurveTo(control, end));
    };
    /**
     * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.bezierCurveTo = function (control1, control2, end) {
        return this.pipe(bezierCurveTo(control1, control2, end));
    };
    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    Animation.prototype.arcTo = function (tangent1, tangent2, radius) {
        return this.pipe(arcTo(tangent1, tangent2, radius));
    };
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    Animation.prototype.scale = function (xy) {
        return this.pipe(scale(xy));
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
        return this.pipe(this.draw(function () {
            if (DEBUG)
                console.log("translate: attach");
            var point_next = Parameter.from(xy).init();
            return function (tick) {
                var point = point_next(tick.clock);
                if (DEBUG)
                    console.log("translate:", point);
                tick.ctx.translate(point[0], point[1]);
                return tick;
            };
        }));
    };
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     * [ a c e
     *   b d f
     *   0 0 1 ]
     */
    Animation.prototype.transform = function (a, b, c, d, e, f) {
        return this.pipe(transform(a, b, c, d, e, f));
    };
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    Animation.prototype.setTransform = function (a, b, c, d, e, f) {
        return this.pipe(setTransform(a, b, c, d, e, f));
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
})(OT.ObservableTransformer);
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
function strokeStyle(color) {
    return this.draw(function () {
        if (DEBUG)
            console.log("strokeStyle: attach");
        var color_next = Parameter.from(color).init();
        return function (tick) {
            var color = color_next(tick.clock);
            if (DEBUG)
                console.log("strokeStyle: strokeStyle", color);
            tick.ctx.strokeStyle = color;
        };
    });
}
exports.strokeStyle = strokeStyle;
function shadowColor(color) {
    return this.draw(function () {
        if (DEBUG)
            console.log("shadowColor: attach");
        var color_next = Parameter.from(color).init();
        return function (tick) {
            var color = color_next(tick.clock);
            if (DEBUG)
                console.log("shadowColor: shadowColor", color);
            tick.ctx.shadowColor = color;
        };
    });
}
exports.shadowColor = shadowColor;
function shadowBlur(level) {
    return this.draw(function () {
        if (DEBUG)
            console.log("shadowBlur: attach");
        var level_next = Parameter.from(level).init();
        return function (tick) {
            var level = level_next(tick.clock);
            if (DEBUG)
                console.log("shadowBlur: shadowBlur", level);
            tick.ctx.shadowBlur = level;
        };
    });
}
exports.shadowBlur = shadowBlur;
function shadowOffset(xy) {
    return this.draw(function () {
        if (DEBUG)
            console.log("shadowOffset: attach");
        var xy_next = Parameter.from(xy).init();
        return function (tick) {
            var xy = xy_next(tick.clock);
            if (DEBUG)
                console.log("shadowOffset: shadowBlur", xy);
            tick.ctx.shadowOffsetX = xy[0];
            tick.ctx.shadowOffsetY = xy[1];
        };
    });
}
exports.shadowOffset = shadowOffset;
function lineCap(style) {
    return this.draw(function () {
        if (DEBUG)
            console.log("lineCap: attach");
        var arg_next = Parameter.from(style).init();
        return function (tick) {
            var arg = arg_next(tick.clock);
            if (DEBUG)
                console.log("lineCap: lineCap", arg);
            tick.ctx.lineCap = arg;
        };
    });
}
exports.lineCap = lineCap;
function lineJoin(style) {
    return this.draw(function () {
        if (DEBUG)
            console.log("lineJoin: attach");
        var arg_next = Parameter.from(style).init();
        return function (tick) {
            var arg = arg_next(tick.clock);
            if (DEBUG)
                console.log("lineJoin: lineCap", arg);
            tick.ctx.lineJoin = arg;
        };
    });
}
exports.lineJoin = lineJoin;
function lineWidth(width) {
    return this.draw(function () {
        if (DEBUG)
            console.log("lineWidth: attach");
        var width_next = Parameter.from(width).init();
        return function (tick) {
            var width = width_next(tick.clock);
            if (DEBUG)
                console.log("lineWidth: lineWidth", width);
            tick.ctx.lineWidth = width;
        };
    });
}
exports.lineWidth = lineWidth;
function miterLimit(limit) {
    return this.draw(function () {
        if (DEBUG)
            console.log("miterLimit: attach");
        var arg_next = Parameter.from(limit).init();
        return function (tick) {
            var arg = arg_next(tick.clock);
            if (DEBUG)
                console.log("miterLimit: miterLimit", arg);
            tick.ctx.miterLimit = arg;
        };
    });
}
exports.miterLimit = miterLimit;
function rect(xy, width_height) {
    return this.draw(function () {
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
    });
}
exports.rect = rect;
function fillRect(xy, width_height) {
    return this.draw(function () {
        if (DEBUG)
            console.log("fillRect: attach");
        var xy_next = Parameter.from(xy).init();
        var width_height_next = Parameter.from(width_height).init();
        return function (tick) {
            var xy = xy_next(tick.clock);
            var width_height = width_height_next(tick.clock);
            if (DEBUG)
                console.log("fillRect: fillRect", xy, width_height);
            tick.ctx.fillRect(xy[0], xy[1], width_height[0], width_height[1]);
        };
    });
}
exports.fillRect = fillRect;
function strokeRect(xy, width_height) {
    return this.draw(function () {
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
    });
}
exports.strokeRect = strokeRect;
function clearRect(xy, width_height) {
    return this.draw(function () {
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
    });
}
exports.clearRect = clearRect;
function withinPath(inner) {
    return new PathAnimation(function (upstream) {
        if (DEBUG)
            console.log("withinPath: attach");
        var beginPathBeforeInner = upstream.tapOnNext(function (tick) { tick.ctx.beginPath(); });
        return inner.attach(beginPathBeforeInner).tapOnNext(function (tick) { tick.ctx.closePath(); });
    });
}
exports.withinPath = withinPath;
function stroke() {
    return this.draw(function () {
        if (DEBUG)
            console.log("stroke: attach");
        return function (tick) {
            if (DEBUG)
                console.log("stroke: stroke");
            tick.ctx.stroke();
        };
    });
}
exports.stroke = stroke;
function fill() {
    return this.draw(function () {
        if (DEBUG)
            console.log("fill: attach");
        return function (tick) {
            if (DEBUG)
                console.log("fill: fill");
            tick.ctx.fill();
        };
    });
}
exports.fill = fill;
function moveTo(xy) {
    return this.draw(function () {
        if (DEBUG)
            console.log("moveTo: attach");
        var xy_next = Parameter.from(xy).init();
        return function (tick) {
            var xy = xy_next(tick.clock);
            if (DEBUG)
                console.log("moveTo: moveTo", xy);
            tick.ctx.moveTo(xy[0], xy[1]);
        };
    });
}
exports.moveTo = moveTo;
function lineTo(xy) {
    return this.draw(function () {
        if (DEBUG)
            console.log("lineTo: attach");
        var xy_next = Parameter.from(xy).init();
        return function (tick) {
            var xy = xy_next(tick.clock);
            if (DEBUG)
                console.log("lineTo: lineTo", xy);
            tick.ctx.lineTo(xy[0], xy[1]);
        };
    });
}
exports.lineTo = lineTo;
function clip() {
    return this.draw(function () {
        if (DEBUG)
            console.log("clip: attach");
        return function (tick) {
            if (DEBUG)
                console.log("clip: clip");
            tick.ctx.clip();
        };
    });
}
exports.clip = clip;
function quadraticCurveTo(control, end) {
    return this.draw(function () {
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
    });
}
exports.quadraticCurveTo = quadraticCurveTo;
/**
 * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
 */
function bezierCurveTo(control1, control2, end) {
    return this.draw(function () {
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
    });
}
exports.bezierCurveTo = bezierCurveTo;
/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
function arcTo(tangent1, tangent2, radius) {
    return this.draw(function () {
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
    });
}
exports.arcTo = arcTo;
/**
 * Dynamic chainable wrapper for scale in the canvas API.
 */
function scale(xy) {
    return this.draw(function () {
        if (DEBUG)
            console.log("scale: attach");
        var arg1_next = Parameter.from(xy).init();
        return function (tick) {
            var arg1 = arg1_next(tick.clock);
            if (DEBUG)
                console.log("scale: scale", arg1);
            tick.ctx.scale(arg1[0], arg1[1]);
        };
    });
}
exports.scale = scale;
/**
 * Dynamic chainable wrapper for translate in the canvas API.
 * [ a c e
 *   b d f
 *   0 0 1 ]
 */
function transform(a, b, c, d, e, f) {
    return this.draw(function () {
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
    });
}
exports.transform = transform;
/**
 * Dynamic chainable wrapper for setTransform in the canvas API.
 */
function setTransform(a, b, c, d, e, f) {
    return this.draw(function () {
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
    });
}
exports.setTransform = setTransform;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkNhbnZhc1RyYW5zZm9ybWVyLnRzIl0sIm5hbWVzIjpbIkNhbnZhc1RpY2siLCJDYW52YXNUaWNrLmNvbnN0cnVjdG9yIiwiQW5pbWF0aW9uIiwiQW5pbWF0aW9uLmNvbnN0cnVjdG9yIiwiQW5pbWF0aW9uLnN0cm9rZVN0eWxlIiwiQW5pbWF0aW9uLmZpbGxTdHlsZSIsIkFuaW1hdGlvbi5zaGFkb3dDb2xvciIsIkFuaW1hdGlvbi5zaGFkb3dCbHVyIiwiQW5pbWF0aW9uLnNoYWRvd09mZnNldCIsIkFuaW1hdGlvbi5saW5lQ2FwIiwiQW5pbWF0aW9uLmxpbmVKb2luIiwiQW5pbWF0aW9uLmxpbmVXaWR0aCIsIkFuaW1hdGlvbi5taXRlckxpbWl0IiwiQW5pbWF0aW9uLnJlY3QiLCJBbmltYXRpb24uZmlsbFJlY3QiLCJBbmltYXRpb24uc3Ryb2tlUmVjdCIsIkFuaW1hdGlvbi5jbGVhclJlY3QiLCJBbmltYXRpb24ud2l0aGluUGF0aCIsIkFuaW1hdGlvbi5maWxsIiwiQW5pbWF0aW9uLnN0cm9rZSIsIkFuaW1hdGlvbi5tb3ZlVG8iLCJBbmltYXRpb24ubGluZVRvIiwiQW5pbWF0aW9uLmNsaXAiLCJBbmltYXRpb24ucXVhZHJhdGljQ3VydmVUbyIsIkFuaW1hdGlvbi5iZXppZXJDdXJ2ZVRvIiwiQW5pbWF0aW9uLmFyY1RvIiwiQW5pbWF0aW9uLnNjYWxlIiwiQW5pbWF0aW9uLnJvdGF0ZSIsIkFuaW1hdGlvbi50cmFuc2xhdGUiLCJBbmltYXRpb24udHJhbnNmb3JtIiwiQW5pbWF0aW9uLnNldFRyYW5zZm9ybSIsIkFuaW1hdGlvbi5mb250IiwiQW5pbWF0aW9uLnRleHRBbGlnbiIsIkFuaW1hdGlvbi50ZXh0QmFzZWxpbmUiLCJBbmltYXRpb24uZmlsbFRleHQiLCJBbmltYXRpb24uZHJhd0ltYWdlIiwiQW5pbWF0aW9uLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiIsIkFuaW1hdGlvbi5hcmMiLCJjcmVhdGUiLCJQYXRoQW5pbWF0aW9uIiwiUGF0aEFuaW1hdGlvbi5jb25zdHJ1Y3RvciIsInN0cm9rZVN0eWxlIiwic2hhZG93Q29sb3IiLCJzaGFkb3dCbHVyIiwic2hhZG93T2Zmc2V0IiwibGluZUNhcCIsImxpbmVKb2luIiwibGluZVdpZHRoIiwibWl0ZXJMaW1pdCIsInJlY3QiLCJmaWxsUmVjdCIsInN0cm9rZVJlY3QiLCJjbGVhclJlY3QiLCJ3aXRoaW5QYXRoIiwic3Ryb2tlIiwiZmlsbCIsIm1vdmVUbyIsImxpbmVUbyIsImNsaXAiLCJxdWFkcmF0aWNDdXJ2ZVRvIiwiYmV6aWVyQ3VydmVUbyIsImFyY1RvIiwic2NhbGUiLCJ0cmFuc2Zvcm0iLCJzZXRUcmFuc2Zvcm0iLCJzYXZlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBLElBQVksU0FBUyxXQUFNLGFBQzNCLENBQUMsQ0FEdUM7QUFFeEMsSUFBWSxFQUFFLFdBQU0seUJBQ3BCLENBQUMsQ0FENEM7QUFFN0MsaUJBQWMsU0FFZCxDQUFDLEVBRnNCO0FBRXZCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztBQUVsQjs7OztHQUlHO0FBQ0g7SUFBZ0NBLDhCQUFXQTtJQUN2Q0Esb0JBQ1dBLEtBQWFBLEVBQ2JBLEVBQVVBLEVBQ1ZBLEdBQTZCQSxFQUM3QkEsTUFBcUJBO1FBRTVCQyxrQkFBTUEsS0FBS0EsRUFBRUEsRUFBRUEsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQUE7UUFMZEEsVUFBS0EsR0FBTEEsS0FBS0EsQ0FBUUE7UUFDYkEsT0FBRUEsR0FBRkEsRUFBRUEsQ0FBUUE7UUFDVkEsUUFBR0EsR0FBSEEsR0FBR0EsQ0FBMEJBO1FBQzdCQSxXQUFNQSxHQUFOQSxNQUFNQSxDQUFlQTtJQUdoQ0EsQ0FBQ0E7SUFDTEQsaUJBQUNBO0FBQURBLENBVEEsQUFTQ0EsRUFUK0IsRUFBRSxDQUFDLFFBQVEsRUFTMUM7QUFUWSxrQkFBVSxhQVN0QixDQUFBO0FBR0Q7SUFBK0JFLDZCQUFvQ0E7SUFHL0RBLG1CQUFtQkEsTUFBMEVBO1FBQ3pGQyxrQkFBTUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7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TyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsQ0FBQyxFQUNELGNBQVksT0FBTyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBLENBQUMsRUFDcEQsY0FBWSxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBLENBQUMsQ0FDbkUsQ0FBQTtJQUNMLENBQUMsQ0FBQ0EsQ0FBQ0E7QUFDUEEsQ0FBQ0E7QUFyQmUsWUFBSSxPQXFCbkIsQ0FBQSIsImZpbGUiOiJDYW52YXNUcmFuc2Zvcm1lci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhcmFtZXRlciBmcm9tIFwiLi9wYXJhbWV0ZXJcIlxuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gXCIuL2V2ZW50c1wiXG5pbXBvcnQgKiBhcyBPVCBmcm9tIFwiLi9PYnNlcnZhYmxlVHJhbnNmb3JtZXJcIlxuaW1wb3J0ICogYXMgdHlwZXMgZnJvbSBcIi4vdHlwZXNcIlxuZXhwb3J0ICogZnJvbSBcIi4vdHlwZXNcIlxuXG52YXIgREVCVUcgPSBmYWxzZTtcblxuLyoqXG4gKiBFYWNoIGZyYW1lIGFuIGFuaW1hdGlvbiBpcyBwcm92aWRlZCBhIENhbnZhc1RpY2suIFRoZSB0aWNrIGV4cG9zZXMgYWNjZXNzIHRvIHRoZSBsb2NhbCBhbmltYXRpb24gdGltZSwgdGhlXG4gKiB0aW1lIGRlbHRhIGJldHdlZW4gdGhlIHByZXZpb3VzIGZyYW1lIChkdCkgYW5kIHRoZSBkcmF3aW5nIGNvbnRleHQuIEFuaW1hdG9ycyB0eXBpY2FsbHkgdXNlIHRoZSBkcmF3aW5nIGNvbnRleHRcbiAqIGRpcmVjdGx5LCBhbmQgcGFzcyB0aGUgY2xvY2sgb250byBhbnkgdGltZSB2YXJ5aW5nIHBhcmFtZXRlcnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBDYW52YXNUaWNrIGV4dGVuZHMgT1QuQmFzZVRpY2t7XG4gICAgY29uc3RydWN0b3IgKFxuICAgICAgICBwdWJsaWMgY2xvY2s6IG51bWJlcixcbiAgICAgICAgcHVibGljIGR0OiBudW1iZXIsXG4gICAgICAgIHB1YmxpYyBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCxcbiAgICAgICAgcHVibGljIGV2ZW50czogZXZlbnRzLkV2ZW50cylcbiAgICB7XG4gICAgICAgIHN1cGVyKGNsb2NrLCBkdCwgY3R4KVxuICAgIH1cbn1cblxuXG5leHBvcnQgY2xhc3MgQW5pbWF0aW9uIGV4dGVuZHMgT1QuT2JzZXJ2YWJsZVRyYW5zZm9ybWVyPENhbnZhc1RpY2s+e1xuXG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgYXR0YWNoOiAodXBzdHJlYW06IFJ4Lk9ic2VydmFibGU8Q2FudmFzVGljaz4pID0+IFJ4Lk9ic2VydmFibGU8Q2FudmFzVGljaz4pIHtcbiAgICAgICAgc3VwZXIoYXR0YWNoKTtcbiAgICB9XG5cbiAgICAvLyBDYW52YXMgQVBJXG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc3Ryb2tlU3R5bGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgc3Ryb2tlU3R5bGUoY29sb3I6IHR5cGVzLkNvbG9yQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzdHJva2VTdHlsZShjb2xvcikpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBmaWxsU3R5bGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgZmlsbFN0eWxlKGNvbG9yOiB0eXBlcy5Db2xvckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoXG4gICAgICAgICAgICB0aGlzLmRyYXcoXG4gICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZmlsbFN0eWxlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xvcl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29sb3IpLmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29sb3IgPSBjb2xvcl9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGxTdHlsZTogZmlsbFN0eWxlXCIsIGNvbG9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKVxuICAgICAgICApO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBzaGFkb3dDb2xvciBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzaGFkb3dDb2xvcihjb2xvcjogdHlwZXMuQ29sb3JBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHNoYWRvd0NvbG9yKGNvbG9yKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNoYWRvd0JsdXIgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgc2hhZG93Qmx1cihsZXZlbDogdHlwZXMuTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzaGFkb3dCbHVyKGxldmVsKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNoYWRvd09mZnNldFggYW5kIHNoYWRvd09mZnNldFkgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgc2hhZG93T2Zmc2V0KHh5OiB0eXBlcy5Qb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoc2hhZG93T2Zmc2V0KHh5KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGxpbmVDYXAgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgbGluZUNhcChzdHlsZTogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShsaW5lQ2FwKHN0eWxlKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGxpbmVKb2luIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGxpbmVKb2luKHN0eWxlOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGxpbmVKb2luKHN0eWxlKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGxpbmVXaWR0aCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBsaW5lV2lkdGgod2lkdGg6IHR5cGVzLk51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUobGluZVdpZHRoKHdpZHRoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIG1pdGVyTGltaXQgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgbWl0ZXJMaW1pdChsaW1pdDogdHlwZXMuTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShtaXRlckxpbWl0KGxpbWl0KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHJlY3QgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgcmVjdCh4eTogdHlwZXMuUG9pbnRBcmcsIHdpZHRoX2hlaWdodDogdHlwZXMuUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHJlY3QoeHksIHdpZHRoX2hlaWdodCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBmaWxsUmVjdCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBmaWxsUmVjdCh4eTogdHlwZXMuUG9pbnRBcmcsIHdpZHRoX2hlaWdodDogdHlwZXMuUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGZpbGxSZWN0KHh5LCB3aWR0aF9oZWlnaHQpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igc3Ryb2tlUmVjdCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzdHJva2VSZWN0KHh5OiB0eXBlcy5Qb2ludEFyZywgd2lkdGhfaGVpZ2h0OiB0eXBlcy5Qb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoc3Ryb2tlUmVjdCh4eSwgd2lkdGhfaGVpZ2h0KSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGNsZWFyUmVjdCBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBjbGVhclJlY3QoeHk6IHR5cGVzLlBvaW50QXJnLCB3aWR0aF9oZWlnaHQ6IHR5cGVzLlBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShjbGVhclJlY3QoeHksIHdpZHRoX2hlaWdodCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBFbmNsb3NlcyB0aGUgaW5uZXIgYW5pbWF0aW9uIHdpdGggYSBiZWdpbnBhdGgoKSBhbmQgZW5kcGF0aCgpIGZyb20gdGhlIGNhbnZhcyBBUEkuXG4gICAgICpcbiAgICAgKiBUaGlzIHJldHVybnMgYSBwYXRoIG9iamVjdCB3aGljaCBldmVudHMgY2FuIGJlIHN1YnNjcmliZWQgdG9cbiAgICAgKi9cbiAgICB3aXRoaW5QYXRoKGlubmVyOiBBbmltYXRpb24pOiBQYXRoQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZSh3aXRoaW5QYXRoKGlubmVyKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGZpbGwgaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgZmlsbCgpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGZpbGwoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHN0cm9rZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBzdHJva2UoKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShzdHJva2UoKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIG1vdmVUbyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAgICAgKi9cbiAgICBtb3ZlVG8oeHk6IHR5cGVzLlBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShtb3ZlVG8oeHkpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgbGluZVRvIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICAgICAqL1xuICAgIGxpbmVUbyh4eTogdHlwZXMuUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGxpbmVUbyh4eSkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBjbGlwIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICAgICAqL1xuICAgIGNsaXAoKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShjbGlwKCkpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBxdWFkcmF0aWNDdXJ2ZVRvIGluIHRoZSBjYW52YXMgQVBJLiBVc2Ugd2l0aCB3aXRoaW5QYXRoLlxuICAgICAqL1xuICAgIHF1YWRyYXRpY0N1cnZlVG8oY29udHJvbDogdHlwZXMuUG9pbnRBcmcsIGVuZDogdHlwZXMuUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHF1YWRyYXRpY0N1cnZlVG8oY29udHJvbCwgZW5kKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGJlemllckN1cnZlVG8gaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gICAgICovXG4gICAgYmV6aWVyQ3VydmVUbyhjb250cm9sMTogdHlwZXMuUG9pbnRBcmcsIGNvbnRyb2wyOiB0eXBlcy5Qb2ludEFyZywgZW5kOiB0eXBlcy5Qb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoYmV6aWVyQ3VydmVUbyhjb250cm9sMSwgY29udHJvbDIsIGVuZCkpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGFyYyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAgICAgKi9cbiAgICBhcmNUbyh0YW5nZW50MTogdHlwZXMuUG9pbnRBcmcsIHRhbmdlbnQyOiB0eXBlcy5Qb2ludEFyZywgcmFkaXVzOiB0eXBlcy5OdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKGFyY1RvKHRhbmdlbnQxLCB0YW5nZW50MiwgcmFkaXVzKSk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNjYWxlIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHNjYWxlKHh5OiB0eXBlcy5Qb2ludEFyZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoc2NhbGUoeHkpKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3Igcm90YXRlIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHJvdGF0ZShjbG9ja3dpc2VSYWRpYW5zOiB0eXBlcy5OdW1iZXJBcmcpOiB0aGlzIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShcbiAgICAgICAgICAgIHRoaXMuZHJhdyhcbiAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJyb3RhdGU6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tPG51bWJlcj4oY2xvY2t3aXNlUmFkaWFucykuaW5pdCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IENhbnZhc1RpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInJvdGF0ZTogcm90YXRlXCIsIGFyZzEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGljay5jdHgucm90YXRlKGFyZzEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKVxuICAgICAgICApO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciB0cmFuc2xhdGUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgdHJhbnNsYXRlKHh5OiB0eXBlcy5Qb2ludEFyZyk6IHRoaXMge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKFxuICAgICAgICAgICAgdGhpcy5kcmF3KFxuICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zbGF0ZTogYXR0YWNoXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcG9pbnRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcG9pbnQgPSBwb2ludF9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zbGF0ZTpcIiwgcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGljay5jdHgudHJhbnNsYXRlKHBvaW50WzBdLCBwb2ludFsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGljaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdHJhbnNsYXRlIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqIFsgYSBjIGVcbiAgICAgKiAgIGIgZCBmXG4gICAgICogICAwIDAgMSBdXG4gICAgICovXG4gICAgdHJhbnNmb3JtKGE6IHR5cGVzLk51bWJlckFyZywgYjogdHlwZXMuTnVtYmVyQXJnLCBjOiB0eXBlcy5OdW1iZXJBcmcsXG4gICAgICAgICAgICAgIGQ6IHR5cGVzLk51bWJlckFyZywgZTogdHlwZXMuTnVtYmVyQXJnLCBmOiB0eXBlcy5OdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHRyYW5zZm9ybShhLGIsYyxkLGUsZikpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBzZXRUcmFuc2Zvcm0gaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgc2V0VHJhbnNmb3JtKGE6IHR5cGVzLk51bWJlckFyZywgYjogdHlwZXMuTnVtYmVyQXJnLCBjOiB0eXBlcy5OdW1iZXJBcmcsXG4gICAgICAgICAgICAgICAgIGQ6IHR5cGVzLk51bWJlckFyZywgZTogdHlwZXMuTnVtYmVyQXJnLCBmOiB0eXBlcy5OdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHNldFRyYW5zZm9ybShhLGIsYyxkLGUsZikpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciBmb250IGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIGZvbnQoc3R5bGU6IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoXG4gICAgICAgICAgICB0aGlzLmRyYXcoXG4gICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZm9udDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oc3R5bGUpLmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmb250OiBmb250XCIsIGFyZzEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGljay5jdHguZm9udCA9IGFyZzE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHRleHRBbGlnbiBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICB0ZXh0QWxpZ24oc3R5bGU6IHN0cmluZyk6IEFuaW1hdGlvbiB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoXG4gICAgICAgICAgICB0aGlzLmRyYXcoXG4gICAgICAgICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidGV4dEFsaWduOiBhdHRhY2hcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbShzdHlsZSkuaW5pdCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IENhbnZhc1RpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRleHRBbGlnbjogdGV4dEFsaWduXCIsIGFyZzEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGljay5jdHgudGV4dEFsaWduID0gYXJnMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogRHluYW1pYyBjaGFpbmFibGUgd3JhcHBlciBmb3IgdGV4dEJhc2VsaW5lIGluIHRoZSBjYW52YXMgQVBJLlxuICAgICAqL1xuICAgIHRleHRCYXNlbGluZShzdHlsZTogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShcbiAgICAgICAgICAgIHRoaXMuZHJhdyhcbiAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0ZXh0QmFzZWxpbmU6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHN0eWxlKS5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwidGV4dEJhc2VsaW5lOiB0ZXh0QmFzZWxpbmVcIiwgYXJnMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aWNrLmN0eC50ZXh0QmFzZWxpbmUgPSBhcmcxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKVxuICAgICAgICApO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBEeW5hbWljIGNoYWluYWJsZSB3cmFwcGVyIGZvciB0ZXh0QmFzZWxpbmUgaW4gdGhlIGNhbnZhcyBBUEkuXG4gICAgICovXG4gICAgZmlsbFRleHQodGV4dDogdHlwZXMuU3RyaW5nQXJnLCB4eTogdHlwZXMuUG9pbnRBcmcsIG1heFdpZHRoPzogdHlwZXMuTnVtYmVyQXJnKTogQW5pbWF0aW9uIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucGlwZShcbiAgICAgICAgICAgIHRoaXMuZHJhdyhcbiAgICAgICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmaWxsVGV4dDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20odGV4dCkuaW5pdCgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJnMl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZzNfbmV4dCA9IG1heFdpZHRoID8gUGFyYW1ldGVyLmZyb20obWF4V2lkdGgpLmluaXQoKTogdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IENhbnZhc1RpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJnMyA9IG1heFdpZHRoPyBhcmczX25leHQodGljay5jbG9jayk6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmaWxsVGV4dDogZmlsbFRleHRcIiwgYXJnMSwgYXJnMiwgYXJnMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWF4V2lkdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aWNrLmN0eC5maWxsVGV4dChhcmcxLCBhcmcyWzBdLCBhcmcyWzBdLCBhcmczKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGljay5jdHguZmlsbFRleHQoYXJnMSwgYXJnMlswXSwgYXJnMlswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGRyYXdJbWFnZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBkcmF3SW1hZ2UoaW1nLCB4eTogdHlwZXMuUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKFxuICAgICAgICAgICAgdGhpcy5kcmF3KFxuICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImRyYXdJbWFnZTogYXR0YWNoXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJkcmF3SW1hZ2U6IGRyYXdJbWFnZVwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpY2suY3R4LmRyYXdJbWFnZShpbWcsIGFyZzFbMF0sIGFyZzFbMV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKVxuICAgICAgICApO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbiBpbiB0aGUgY2FudmFzIEFQSS5cbiAgICAgKi9cbiAgICBnbG9iYWxDb21wb3NpdGVPcGVyYXRpb24ob3BlcmF0aW9uOiBzdHJpbmcpOiBBbmltYXRpb24ge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKFxuICAgICAgICAgICAgdGhpcy5kcmF3KFxuICAgICAgICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbjogYXR0YWNoZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbih0aWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uOiBnbG9iYWxDb21wb3NpdGVPcGVyYXRpb25cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aWNrLmN0eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSBvcGVyYXRpb247XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgYXJjKGNlbnRlcjogdHlwZXMuUG9pbnRBcmcsIHJhZGl1czogdHlwZXMuTnVtYmVyQXJnLFxuICAgICAgICByYWRTdGFydEFuZ2xlOiB0eXBlcy5OdW1iZXJBcmcsIHJhZEVuZEFuZ2xlOiB0eXBlcy5OdW1iZXJBcmcsXG4gICAgICAgIGNvdW50ZXJjbG9ja3dpc2U/OiBib29sZWFuKTogdGhpcyB7XG4gICAgICAgIHJldHVybiB0aGlzLmRyYXcoXG4gICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFyYzogYXR0YWNoXCIpO1xuICAgICAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbShjZW50ZXIpLmluaXQoKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnMl9uZXh0ID0gUGFyYW1ldGVyLmZyb20ocmFkaXVzKS5pbml0KCk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzNfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHJhZFN0YXJ0QW5nbGUpLmluaXQoKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJnNF9uZXh0ID0gUGFyYW1ldGVyLmZyb20ocmFkRW5kQW5nbGUpLmluaXQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6Q2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJnMSA9IGFyZzFfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmczID0gYXJnM19uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJnNCA9IGFyZzRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFyYzogYXJjXCIsIGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQpO1xuICAgICAgICAgICAgICAgICAgICB0aWNrLmN0eC5hcmMoYXJnMVswXSwgYXJnMVsxXSwgYXJnMiwgYXJnMywgYXJnNCwgY291bnRlcmNsb2Nrd2lzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZShhdHRhY2g6ICh1cHN0cmVhbTogUnguT2JzZXJ2YWJsZTxDYW52YXNUaWNrPikgPT4gUnguT2JzZXJ2YWJsZTxDYW52YXNUaWNrPiA9IHggPT4geCk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBBbmltYXRpb24oYXR0YWNoKTtcbn1cbmV4cG9ydCBjbGFzcyBQYXRoQW5pbWF0aW9uIGV4dGVuZHMgQW5pbWF0aW9uIHtcblxufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cm9rZVN0eWxlKFxuICAgIGNvbG9yOiB0eXBlcy5Db2xvckFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5kcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlU3R5bGU6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBjb2xvcl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29sb3IpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBjb2xvciA9IGNvbG9yX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInN0cm9rZVN0eWxlOiBzdHJva2VTdHlsZVwiLCBjb2xvcik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc3Ryb2tlU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaGFkb3dDb2xvcihcbiAgICBjb2xvcjogdHlwZXMuQ29sb3JBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInNoYWRvd0NvbG9yOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgY29sb3JfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGNvbG9yKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IENhbnZhc1RpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgY29sb3IgPSBjb2xvcl9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzaGFkb3dDb2xvcjogc2hhZG93Q29sb3JcIiwgY29sb3IpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnNoYWRvd0NvbG9yID0gY29sb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNoYWRvd0JsdXIoXG4gICAgbGV2ZWw6IHR5cGVzLk51bWJlckFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5kcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2hhZG93Qmx1cjogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGxldmVsX25leHQgPSBQYXJhbWV0ZXIuZnJvbShsZXZlbCkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGxldmVsID0gbGV2ZWxfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2hhZG93Qmx1cjogc2hhZG93Qmx1clwiLCBsZXZlbCk7XG4gICAgICAgICAgICAgICAgdGljay5jdHguc2hhZG93Qmx1ciA9IGxldmVsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc2hhZG93T2Zmc2V0KFxuICAgIHh5OiB0eXBlcy5Qb2ludEFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5kcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2hhZG93T2Zmc2V0OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IENhbnZhc1RpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgeHkgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzaGFkb3dPZmZzZXQ6IHNoYWRvd0JsdXJcIiwgeHkpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnNoYWRvd09mZnNldFggPSB4eVswXTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zaGFkb3dPZmZzZXRZID0geHlbMV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGluZUNhcChcbiAgICBzdHlsZTogdHlwZXMuU3RyaW5nQXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJsaW5lQ2FwOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnX25leHQgPSBQYXJhbWV0ZXIuZnJvbShzdHlsZSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ19uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJsaW5lQ2FwOiBsaW5lQ2FwXCIsIGFyZyk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgubGluZUNhcCA9IGFyZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5leHBvcnQgZnVuY3Rpb24gbGluZUpvaW4oXG4gICAgc3R5bGU6IHR5cGVzLlN0cmluZ0FyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5kcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZUpvaW46IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmdfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHN0eWxlKS5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRpY2s6IENhbnZhc1RpY2spIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnID0gYXJnX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVKb2luOiBsaW5lQ2FwXCIsIGFyZyk7XG4gICAgICAgICAgICAgICAgdGljay5jdHgubGluZUpvaW4gPSBhcmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGluZVdpZHRoKFxuICAgIHdpZHRoOiB0eXBlcy5OdW1iZXJBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVXaWR0aDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHdpZHRoX25leHQgPSBQYXJhbWV0ZXIuZnJvbSh3aWR0aCkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoID0gd2lkdGhfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibGluZVdpZHRoOiBsaW5lV2lkdGhcIiwgd2lkdGgpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmxpbmVXaWR0aCA9IHdpZHRoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1pdGVyTGltaXQoXG4gICAgbGltaXQ6IHR5cGVzLk51bWJlckFyZ1xuKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5kcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibWl0ZXJMaW1pdDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZ19uZXh0ID0gUGFyYW1ldGVyLmZyb20obGltaXQpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcgPSBhcmdfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwibWl0ZXJMaW1pdDogbWl0ZXJMaW1pdFwiLCBhcmcpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4Lm1pdGVyTGltaXQgPSBhcmc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiByZWN0KFxuICAgIHh5OiB0eXBlcy5Qb2ludEFyZyxcbiAgICB3aWR0aF9oZWlnaHQ6IHR5cGVzLlBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJyZWN0OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgd2lkdGhfaGVpZ2h0X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh3aWR0aF9oZWlnaHQpLmluaXQoKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5OiB0eXBlcy5Qb2ludCA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodDogdHlwZXMuUG9pbnQgPSB3aWR0aF9oZWlnaHRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwicmVjdDogcmVjdFwiLCB4eSwgd2lkdGhfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5yZWN0KHh5WzBdLCB4eVsxXSwgd2lkdGhfaGVpZ2h0WzBdLCB3aWR0aF9oZWlnaHRbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbGxSZWN0KFxuICAgIHh5OiB0eXBlcy5Qb2ludEFyZyxcbiAgICB3aWR0aF9oZWlnaHQ6IHR5cGVzLlBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmaWxsUmVjdDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodF9uZXh0ID0gUGFyYW1ldGVyLmZyb20od2lkdGhfaGVpZ2h0KS5pbml0KCk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eTogdHlwZXMuUG9pbnQgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHQ6IHR5cGVzLlBvaW50ID0gd2lkdGhfaGVpZ2h0X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGxSZWN0OiBmaWxsUmVjdFwiLCB4eSwgd2lkdGhfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5maWxsUmVjdCh4eVswXSwgeHlbMV0sIHdpZHRoX2hlaWdodFswXSwgd2lkdGhfaGVpZ2h0WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJva2VSZWN0KFxuICAgIHh5OiB0eXBlcy5Qb2ludEFyZyxcbiAgICB3aWR0aF9oZWlnaHQ6IHR5cGVzLlBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzdHJva2VSZWN0OiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgeHlfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHh5KS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgd2lkdGhfaGVpZ2h0X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh3aWR0aF9oZWlnaHQpLmluaXQoKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHh5OiB0eXBlcy5Qb2ludCA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodDogdHlwZXMuUG9pbnQgPSB3aWR0aF9oZWlnaHRfbmV4dCh0aWNrLmNsb2NrKTtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic3Ryb2tlUmVjdDogc3Ryb2tlUmVjdFwiLCB4eSwgd2lkdGhfaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zdHJva2VSZWN0KHh5WzBdLCB4eVsxXSwgd2lkdGhfaGVpZ2h0WzBdLCB3aWR0aF9oZWlnaHRbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjbGVhclJlY3QoXG4gICAgeHk6IHR5cGVzLlBvaW50QXJnLFxuICAgIHdpZHRoX2hlaWdodDogdHlwZXMuUG9pbnRBcmdcbik6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImNsZWFyUmVjdDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIHh5X25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIHdpZHRoX2hlaWdodF9uZXh0ID0gUGFyYW1ldGVyLmZyb20od2lkdGhfaGVpZ2h0KS5pbml0KCk7XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eTogdHlwZXMuUG9pbnQgPSB4eV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciB3aWR0aF9oZWlnaHQ6IHR5cGVzLlBvaW50ID0gd2lkdGhfaGVpZ2h0X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImNsZWFyUmVjdDogY2xlYXJSZWN0XCIsIHh5LCB3aWR0aF9oZWlnaHQpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmNsZWFyUmVjdCh4eVswXSwgeHlbMV0sIHdpZHRoX2hlaWdodFswXSwgd2lkdGhfaGVpZ2h0WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhpblBhdGgoXG4gICAgaW5uZXI6IEFuaW1hdGlvblxuKTogUGF0aEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIG5ldyBQYXRoQW5pbWF0aW9uKFxuICAgICAgICAodXBzdHJlYW06IFJ4Lk9ic2VydmFibGU8Q2FudmFzVGljaz4pID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ3aXRoaW5QYXRoOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYmVnaW5QYXRoQmVmb3JlSW5uZXIgPSB1cHN0cmVhbS50YXBPbk5leHQoXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHRpY2s6IENhbnZhc1RpY2spIHt0aWNrLmN0eC5iZWdpblBhdGgoKTt9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIGlubmVyLmF0dGFjaChiZWdpblBhdGhCZWZvcmVJbm5lcikudGFwT25OZXh0KFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7dGljay5jdHguY2xvc2VQYXRoKCk7fVxuICAgICAgICAgICAgKVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cm9rZSgpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzdHJva2U6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzdHJva2U6IHN0cm9rZVwiKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zdHJva2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWxsKCk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImZpbGw6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJmaWxsOiBmaWxsXCIpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3ZlVG8oXG4gICAgeHk6IHR5cGVzLlBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJtb3ZlVG86IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB4eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eSA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcIm1vdmVUbzogbW92ZVRvXCIsIHh5KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5tb3ZlVG8oeHlbMF0sIHh5WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5lVG8oXG4gICAgeHk6IHR5cGVzLlBvaW50QXJnXG4pOiBBbmltYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJsaW5lVG86IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciB4eV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oeHkpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgIHZhciB4eSA9IHh5X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImxpbmVUbzogbGluZVRvXCIsIHh5KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5saW5lVG8oeHlbMF0sIHh5WzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNsaXAoKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5kcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiY2xpcDogYXR0YWNoXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImNsaXA6IGNsaXBcIik7XG4gICAgICAgICAgICAgICAgdGljay5jdHguY2xpcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHF1YWRyYXRpY0N1cnZlVG8oY29udHJvbDogdHlwZXMuUG9pbnRBcmcsIGVuZDogdHlwZXMuUG9pbnRBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJxdWFkcmF0aWNDdXJ2ZVRvOiBhdHRhY2hcIik7XG4gICAgICAgICAgICB2YXIgYXJnMV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29udHJvbCkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzJfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGVuZCkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInF1YWRyYXRpY0N1cnZlVG86IHF1YWRyYXRpY0N1cnZlVG9cIiwgYXJnMSwgYXJnMik7XG4gICAgICAgICAgICAgICAgdGljay5jdHgucXVhZHJhdGljQ3VydmVUbyhhcmcxWzBdLCBhcmcxWzFdLCBhcmcyWzBdLCBhcmcyWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGJlemllckN1cnZlVG8gaW4gdGhlIGNhbnZhcyBBUEkuIFVzZSB3aXRoIHdpdGhpblBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiZXppZXJDdXJ2ZVRvKGNvbnRyb2wxOiB0eXBlcy5Qb2ludEFyZywgY29udHJvbDI6IHR5cGVzLlBvaW50QXJnLCBlbmQ6IHR5cGVzLlBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5kcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwiYmV6aWVyQ3VydmVUbzogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGNvbnRyb2wxKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnMl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oY29udHJvbDIpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmczX25leHQgPSBQYXJhbWV0ZXIuZnJvbShlbmQpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmcyID0gYXJnMl9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmczID0gYXJnM19uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJiZXppZXJDdXJ2ZVRvOiBiZXppZXJDdXJ2ZVRvXCIsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmJlemllckN1cnZlVG8oYXJnMVswXSwgYXJnMVsxXSwgYXJnMlswXSwgYXJnMlsxXSwgYXJnM1swXSwgYXJnM1sxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIGFyYyBpbiB0aGUgY2FudmFzIEFQSS4gVXNlIHdpdGggd2l0aGluUGF0aC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFyY1RvKHRhbmdlbnQxOiB0eXBlcy5Qb2ludEFyZywgdGFuZ2VudDI6IHR5cGVzLlBvaW50QXJnLCByYWRpdXM6IHR5cGVzLk51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcImFyYzogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKHRhbmdlbnQxKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnMl9uZXh0ID0gUGFyYW1ldGVyLmZyb20odGFuZ2VudDIpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmczX25leHQgPSBQYXJhbWV0ZXIuZnJvbShyYWRpdXMpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmcyID0gYXJnMl9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmczID0gYXJnM19uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJhcmM6IGFyY1wiLCBhcmcxLCBhcmcyLCBhcmczKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5hcmNUbyhhcmcxWzBdLCBhcmcxWzFdLCBhcmcyWzBdLCBhcmcyWzFdLCBhcmczKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNjYWxlIGluIHRoZSBjYW52YXMgQVBJLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2NhbGUoeHk6IHR5cGVzLlBvaW50QXJnKTogQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gdGhpcy5kcmF3KFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2NhbGU6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbSh4eSkuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInNjYWxlOiBzY2FsZVwiLCBhcmcxKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zY2FsZShhcmcxWzBdLCBhcmcxWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHRyYW5zbGF0ZSBpbiB0aGUgY2FudmFzIEFQSS5cbiAqIFsgYSBjIGVcbiAqICAgYiBkIGZcbiAqICAgMCAwIDEgXVxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNmb3JtKGE6IHR5cGVzLk51bWJlckFyZywgYjogdHlwZXMuTnVtYmVyQXJnLCBjOiB0eXBlcy5OdW1iZXJBcmcsXG4gICAgICAgICAgZDogdHlwZXMuTnVtYmVyQXJnLCBlOiB0eXBlcy5OdW1iZXJBcmcsIGY6IHR5cGVzLk51bWJlckFyZyk6IEFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zZm9ybTogYXR0YWNoXCIpO1xuICAgICAgICAgICAgdmFyIGFyZzFfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGEpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmcyX25leHQgPSBQYXJhbWV0ZXIuZnJvbShiKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnM19uZXh0ID0gUGFyYW1ldGVyLmZyb20oYykuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzRfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGQpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmc1X25leHQgPSBQYXJhbWV0ZXIuZnJvbShlKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnNl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZikuaW5pdCgpO1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0aWNrOiBDYW52YXNUaWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzEgPSBhcmcxX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzIgPSBhcmcyX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzMgPSBhcmczX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzQgPSBhcmc0X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzUgPSBhcmc1X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgdmFyIGFyZzYgPSBhcmc2X25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHKSBjb25zb2xlLmxvZyhcInRyYW5zZm9ybTogdHJhbnNmb3JtXCIsIGFyZzEsIGFyZzIsIGFyZzMsIGFyZzQsIGFyZzUsIGFyZzYpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LnRyYW5zZm9ybShhcmcxLCBhcmcyLCBhcmczLCBhcmc0LCBhcmc1LCBhcmc2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG4vKipcbiAqIER5bmFtaWMgY2hhaW5hYmxlIHdyYXBwZXIgZm9yIHNldFRyYW5zZm9ybSBpbiB0aGUgY2FudmFzIEFQSS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFRyYW5zZm9ybShhOiB0eXBlcy5OdW1iZXJBcmcsIGI6IHR5cGVzLk51bWJlckFyZywgYzogdHlwZXMuTnVtYmVyQXJnLFxuICAgICAgICAgICAgIGQ6IHR5cGVzLk51bWJlckFyZywgZTogdHlwZXMuTnVtYmVyQXJnLCBmOiB0eXBlcy5OdW1iZXJBcmcpOiBBbmltYXRpb24ge1xuICAgIHJldHVybiB0aGlzLmRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzZXRUcmFuc2Zvcm06IGF0dGFjaFwiKTtcbiAgICAgICAgICAgIHZhciBhcmcxX25leHQgPSBQYXJhbWV0ZXIuZnJvbShhKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnMl9uZXh0ID0gUGFyYW1ldGVyLmZyb20oYikuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzNfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGMpLmluaXQoKTtcbiAgICAgICAgICAgIHZhciBhcmc0X25leHQgPSBQYXJhbWV0ZXIuZnJvbShkKS5pbml0KCk7XG4gICAgICAgICAgICB2YXIgYXJnNV9uZXh0ID0gUGFyYW1ldGVyLmZyb20oZSkuaW5pdCgpO1xuICAgICAgICAgICAgdmFyIGFyZzZfbmV4dCA9IFBhcmFtZXRlci5mcm9tKGYpLmluaXQoKTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAodGljazogQ2FudmFzVGljaykge1xuICAgICAgICAgICAgICAgIHZhciBhcmcxID0gYXJnMV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmcyID0gYXJnMl9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmczID0gYXJnM19uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmc0ID0gYXJnNF9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmc1ID0gYXJnNV9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHZhciBhcmc2ID0gYXJnNl9uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJzZXRUcmFuc2Zvcm06IHNldFRyYW5zZm9ybVwiLCBhcmcxLCBhcmcyLCBhcmczLCBhcmc0LCBhcmc1LCBhcmc2KTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5zZXRUcmFuc2Zvcm0oYXJnMSwgYXJnMiwgYXJnMywgYXJnNCwgYXJnNSwgYXJnNik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlKHdpZHRoOm51bWJlciwgaGVpZ2h0Om51bWJlciwgcGF0aDogc3RyaW5nKTogQW5pbWF0aW9uIHtcbiAgICB2YXIgR0lGRW5jb2RlciA9IHJlcXVpcmUoJ2dpZmVuY29kZXInKTtcbiAgICB2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xuXG5cbiAgICB2YXIgZW5jb2RlciA9IG5ldyBHSUZFbmNvZGVyKHdpZHRoLCBoZWlnaHQpO1xuICAgIGVuY29kZXIuY3JlYXRlUmVhZFN0cmVhbSgpXG4gICAgICAucGlwZShlbmNvZGVyLmNyZWF0ZVdyaXRlU3RyZWFtKHsgcmVwZWF0OiAxMDAwMCwgZGVsYXk6IDEwMCwgcXVhbGl0eTogMSB9KSlcbiAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKHBhdGgpKTtcbiAgICBlbmNvZGVyLnN0YXJ0KCk7XG5cbiAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihmdW5jdGlvbiAodXBzdHJlYW06IFJ4Lk9ic2VydmFibGU8Q2FudmFzVGljaz4pOiBSeC5PYnNlcnZhYmxlPENhbnZhc1RpY2s+IHtcbiAgICAgICAgcmV0dXJuIHVwc3RyZWFtLnRhcChcbiAgICAgICAgICAgIGZ1bmN0aW9uKHRpY2s6IENhbnZhc1RpY2spIHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUcpIGNvbnNvbGUubG9nKFwic2F2ZTogd3JvdGUgZnJhbWVcIik7XG4gICAgICAgICAgICAgICAgZW5jb2Rlci5hZGRGcmFtZSh0aWNrLmN0eCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7Y29uc29sZS5lcnJvcihcInNhdmU6IG5vdCBzYXZlZFwiLCBwYXRoKTt9LFxuICAgICAgICAgICAgZnVuY3Rpb24oKSB7Y29uc29sZS5sb2coXCJzYXZlOiBzYXZlZFwiLCBwYXRoKTsgZW5jb2Rlci5maW5pc2goKTt9XG4gICAgICAgIClcbiAgICB9KTtcbn0iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
