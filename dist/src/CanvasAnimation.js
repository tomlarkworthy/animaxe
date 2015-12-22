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
var types = require("./types");
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
                if (DEBUG)
                    console.log("velocity: tick", velocity, pos);
                tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
                pos[0] += velocity[0] * tick.dt;
                pos[1] += velocity[1] * tick.dt;
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
        if (DEBUG)
            console.log("strokeStyle: build");
        return this.affect1(Parameter.from(color), function () {
            if (DEBUG)
                console.log("strokeStyle: attach");
            return function (tick, color) {
                if (DEBUG)
                    console.log("strokeStyle: strokeStyle", color);
                tick.ctx.strokeStyle = color;
            };
        });
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
        return this.affect1(Parameter.from(xy), function () {
            if (DEBUG)
                console.log("shadowOffset: attach");
            return function (tick, xy) {
                if (DEBUG)
                    console.log("shadowOffset: shadowOffset", xy);
                tick.ctx.shadowOffsetX = xy[0];
                tick.ctx.shadowOffsetY = xy[1];
            };
        });
    };
    /**
     * Dynamic chainable wrapper for lineCap in the canvas API.
     */
    Animation.prototype.lineCap = function (style) {
        return this.affect1(Parameter.from(style), function () {
            if (DEBUG)
                console.log("lineCap: attach");
            return function (tick, arg) {
                if (DEBUG)
                    console.log("lineCap: lineCap", arg);
                tick.ctx.lineCap = arg;
            };
        });
    };
    /**
     * Dynamic chainable wrapper for lineJoin in the canvas API.
     */
    Animation.prototype.lineJoin = function (style) {
        return this.affect1(Parameter.from(style), function () {
            if (DEBUG)
                console.log("lineJoin: attach");
            return function (tick, arg) {
                if (DEBUG)
                    console.log("lineJoin: lineCap", arg);
                tick.ctx.lineJoin = arg;
            };
        });
    };
    /**
     * Dynamic chainable wrapper for lineWidth in the canvas API.
     */
    Animation.prototype.lineWidth = function (width) {
        return this.affect1(Parameter.from(width), function () {
            if (DEBUG)
                console.log("lineWidth: attach");
            return function (tick, width) {
                if (DEBUG)
                    console.log("lineWidth: lineWidth", width);
                tick.ctx.lineWidth = width;
            };
        });
    };
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    Animation.prototype.miterLimit = function (limit) {
        return this.affect1(Parameter.from(limit), function () {
            if (DEBUG)
                console.log("miterLimit: attach");
            return function (tick, arg) {
                if (DEBUG)
                    console.log("miterLimit: miterLimit", arg);
                tick.ctx.miterLimit = arg;
            };
        });
    };
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    Animation.prototype.rect = function (xy, width_height) {
        return this.affect2(Parameter.from(xy), Parameter.from(width_height), function () {
            if (DEBUG)
                console.log("rect: attach");
            return function (tick, xy, width_height) {
                if (DEBUG)
                    console.log("rect: rect", xy, width_height);
                tick.ctx.rect(xy[0], xy[1], width_height[0], width_height[1]);
            };
        });
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
            console.log(types.stackTrace());
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
            var beginPathBeforeInner = upstream.tapOnNext(function (tick) { return tick.ctx.beginPath(); });
            return inner.attach(beginPathBeforeInner).tapOnNext(function (tick) { return tick.ctx.closePath(); });
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
        return this.affect1(Parameter.from(xy), function () {
            if (DEBUG)
                console.log("moveTo: attach");
            return function (tick, xy) {
                if (DEBUG)
                    console.log("moveTo: moveTo", xy);
                tick.ctx.moveTo(xy[0], xy[1]);
            };
        });
    };
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    Animation.prototype.lineTo = function (xy) {
        return this.affect1(Parameter.from(xy), function () {
            if (DEBUG)
                console.log("lineTo: attach");
            return function (tick, xy) {
                if (DEBUG)
                    console.log("lineTo: lineTo", xy);
                tick.ctx.lineTo(xy[0], xy[1]);
            };
        });
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
