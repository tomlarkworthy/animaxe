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
    /**
     * Affect this with an effect to create combined animation.
     * Debug messages are inserted around the effect (e.g. a mutation to the canvas).
     * You can expose time varying or constant parameters to the inner effect using the optional params.
     */
    Animation.prototype.loggedAffect = function (label, effectBuilder, param1, param2, param3, param4) {
        if (DEBUG)
            console.log(label + ": build");
        return this.affect(function () {
            if (DEBUG)
                console.log(label + ": attach");
            var effect = effectBuilder();
            return function (tick, arg1, arg2, arg3, arg4) {
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
                    console.log(label + ": tick (" + elements.join(",") + ")");
                }
                effect(tick, arg1, arg2, arg3, arg4);
            };
        }, param1 ? Parameter.from(param1) : undefined, param2 ? Parameter.from(param2) : undefined, param3 ? Parameter.from(param3) : undefined, param4 ? Parameter.from(param4) : undefined);
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
            return tick.ctx.translate(xy[0], xy[1]);
        }; }, xy);
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
        return this.loggedAffect("globalCompositeOperation", function () { return function (tick, arg) {
            return tick.ctx.globalCompositeOperation = arg;
        }; }, operation);
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
