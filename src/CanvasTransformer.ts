
import * as Ax from "./animaxe"
import * as Parameter from "./parameter"
import * as events from "./events"
import * as OT from "./ObservableTransformer"
import * as types from "./types"
export * from "./types"

var DEBUG = false;

/**
 * Each frame an animation is provided a CanvasTick. The tick exposes access to the local animation time, the
 * time delta between the previous frame (dt) and the drawing context. Animators typically use the drawing context
 * directly, and pass the clock onto any time varying parameters.
 */
export class CanvasTick extends OT.BaseTick{
    constructor (
        public clock: number,
        public dt: number,
        public ctx: CanvasRenderingContext2D,
        public events: events.Events)
    {
        super(clock, dt, ctx)
    }
}


export class CanvasAnimation extends OT.ObservableTransformer<CanvasTick>{


    constructor(public attach: (upstream: Rx.Observable<CanvasTick>) => Rx.Observable<CanvasTick>) {
        super(attach);
    }

    // Canvas API
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    strokeStyle(color: types.ColorArg): CanvasAnimation {
        return this.pipe(strokeStyle(color));
    }
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    fillStyle(color: types.ColorArg): CanvasAnimation {
        return this.pipe(
            this.draw(
                () => {
                    if (DEBUG) console.log("fillStyle: attach");
                    var color_next = Parameter.from(color).init();
                    return function (tick: CanvasTick) {
                        var color = color_next(tick.clock);
                        if (DEBUG) console.log("fillStyle: fillStyle", color);
                        tick.ctx.fillStyle = color;
                    }
                }
            )
        );
    }
    /**
     * Dynamic chainable wrapper for shadowColor in the canvas API.
     */
    shadowColor(color: types.ColorArg): CanvasAnimation {
        return this.pipe(shadowColor(color));
    }
    /**
     * Dynamic chainable wrapper for shadowBlur in the canvas API.
     */
    shadowBlur(level: types.NumberArg): CanvasAnimation {
        return this.pipe(shadowBlur(level));
    }
    /**
     * Dynamic chainable wrapper for shadowOffsetX and shadowOffsetY in the canvas API.
     */
    shadowOffset(xy: types.PointArg): CanvasAnimation {
        return this.pipe(shadowOffset(xy));
    }
    /**
     * Dynamic chainable wrapper for lineCap in the canvas API.
     */
    lineCap(style: string): CanvasAnimation {
        return this.pipe(lineCap(style));
    }
    /**
     * Dynamic chainable wrapper for lineJoin in the canvas API.
     */
    lineJoin(style: string): CanvasAnimation {
        return this.pipe(lineJoin(style));
    }
    /**
     * Dynamic chainable wrapper for lineWidth in the canvas API.
     */
    lineWidth(width: types.NumberArg): CanvasAnimation {
        return this.pipe(lineWidth(width));
    }
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    miterLimit(limit: types.NumberArg): CanvasAnimation {
        return this.pipe(miterLimit(limit));
    }
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    rect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation {
        return this.pipe(rect(xy, width_height));
    }
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    fillRect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation {
        return this.pipe(fillRect(xy, width_height));
    }
    /**
     * Dynamic chainable wrapper for strokeRect in the canvas API.
     */
    strokeRect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation {
        return this.pipe(strokeRect(xy, width_height));
    }
    /**
     * Dynamic chainable wrapper for clearRect in the canvas API.
     */
    clearRect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation {
        return this.pipe(clearRect(xy, width_height));
    }
    /**
     * Encloses the inner animation with a beginpath() and endpath() from the canvas API.
     *
     * This returns a path object which events can be subscribed to
     */
    withinPath(inner: CanvasAnimation): PathAnimation {
        return this.pipe(withinPath(inner));
    }
    /**
     * Dynamic chainable wrapper for fill in the canvas API. Use with withinPath.
     */
    fill(): CanvasAnimation {
        return this.pipe(fill());
    }
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    stroke(): CanvasAnimation {
        return this.pipe(stroke());
    }
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API. Use with withinPath.
     */
    moveTo(xy: types.PointArg): CanvasAnimation {
        return this.pipe(moveTo(xy));
    }
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    lineTo(xy: types.PointArg): CanvasAnimation {
        return this.pipe(lineTo(xy));
    }
    /**
     * Dynamic chainable wrapper for clip in the canvas API. Use with withinPath.
     */
    clip(): CanvasAnimation {
        return this.pipe(clip());
    }
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    quadraticCurveTo(control: types.PointArg, end: types.PointArg): CanvasAnimation {
        return this.pipe(quadraticCurveTo(control, end));
    }
    /**
     * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
     */
    bezierCurveTo(control1: types.PointArg, control2: types.PointArg, end: types.PointArg): CanvasAnimation {
        return this.pipe(bezierCurveTo(control1, control2, end));
    }

    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    arcTo(tangent1: types.PointArg, tangent2: types.PointArg, radius: types.NumberArg): CanvasAnimation {
        return this.pipe(arcTo(tangent1, tangent2, radius));
    }
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    scale(xy: types.PointArg): CanvasAnimation {
        return this.pipe(scale(xy));
    }
    /**
     * Dynamic chainable wrapper for rotate in the canvas API.
     */
    rotate(clockwiseRadians: types.NumberArg): this {
        return this.pipe(
            this.draw(
                () => {
                    if (DEBUG) console.log("rotate: attach");
                    var arg1_next = Parameter.from(clockwiseRadians).init();
                    return function (tick: CanvasTick) {
                        var arg1 = arg1_next(tick.clock);
                        if (DEBUG) console.log("rotate: rotate", arg1);
                        tick.ctx.rotate(arg1);
                    }
                }
            )
        );
    }
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     */
    translate(xy: types.PointArg): this {
        return this.pipe(
            this.draw(
                () => {
                    if (DEBUG) console.log("translate: attach");
                    var point_next = Parameter.from(xy).init();
                    return function(tick) {
                        var point = point_next(tick.clock);
                        if (DEBUG) console.log("translate:", point);
                        tick.ctx.translate(point[0], point[1]);
                        return tick;
                    }
                }
            )
        );
    }
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     * [ a c e
     *   b d f
     *   0 0 1 ]
     */
    transform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg,
              d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): CanvasAnimation {
        return this.pipe(transform(a,b,c,d,e,f));
    }
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    setTransform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg,
                 d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): CanvasAnimation {
        return this.pipe(setTransform(a,b,c,d,e,f));
    }
    /**
     * Dynamic chainable wrapper for font in the canvas API.
     */
    font(style: string): CanvasAnimation {
        return this.pipe(
            this.draw(
                () => {
                    if (DEBUG) console.log("font: attach");
                    var arg1_next = Parameter.from(style).init();
                    return function (tick: CanvasTick) {
                        var arg1 = arg1_next(tick.clock);
                        if (DEBUG) console.log("font: font", arg1);
                        tick.ctx.font = arg1;
                    }
                }
            )
        );
    }
    /**
     * Dynamic chainable wrapper for textAlign in the canvas API.
     */
    textAlign(style: string): CanvasAnimation {
        return this.pipe(
            this.draw(
                () => {
                    if (DEBUG) console.log("textAlign: attach");
                    var arg1_next = Parameter.from(style).init();
                    return function (tick: CanvasTick) {
                        var arg1 = arg1_next(tick.clock);
                        if (DEBUG) console.log("textAlign: textAlign", arg1);
                        tick.ctx.textAlign = arg1;
                    }
                }
            )
        );
    }
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    textBaseline(style: string): CanvasAnimation {
        return this.pipe(
            this.draw(
                () => {
                    if (DEBUG) console.log("textBaseline: attach");
                    var arg1_next = Parameter.from(style).init();
                    return function (tick: CanvasTick) {
                        var arg1 = arg1_next(tick.clock);
                        if (DEBUG) console.log("textBaseline: textBaseline", arg1);
                        tick.ctx.textBaseline = arg1;
                    }
                }
            )
        );
    }
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    fillText(text: types.StringArg, xy: types.PointArg, maxWidth?: types.NumberArg): CanvasAnimation {
        return this.pipe(
            this.draw(
                () => {
                    if (DEBUG) console.log("fillText: attach");
                    var arg1_next = Parameter.from(text).init();
                    var arg2_next = Parameter.from(xy).init();
                    var arg3_next = maxWidth ? Parameter.from(maxWidth).init(): undefined;
                    return function (tick: CanvasTick) {
                        var arg1 = arg1_next(tick.clock);
                        var arg2 = arg2_next(tick.clock);
                        var arg3 = maxWidth? arg3_next(tick.clock): undefined;
                        if (DEBUG) console.log("fillText: fillText", arg1, arg2, arg3);
                        if (maxWidth) {
                            tick.ctx.fillText(arg1, arg2[0], arg2[0], arg3);
                        } else {
                            tick.ctx.fillText(arg1, arg2[0], arg2[0]);
                        }
                    }
                }
            )
        );
    }
    /**
     * Dynamic chainable wrapper for drawImage in the canvas API.
     */
    drawImage(img, xy: types.PointArg): CanvasAnimation {
        return this.pipe(
            this.draw(
                () => {
                    if (DEBUG) console.log("drawImage: attach");
                    var arg1_next = Parameter.from(xy).init();
                    return function (tick: CanvasTick) {
                        var arg1 = arg1_next(tick.clock);
                        if (DEBUG) console.log("drawImage: drawImage", arg1);
                        tick.ctx.drawImage(img, arg1[0], arg1[1]);
                    }
                }
            )
        );
    }
    /**
     * * Dynamic chainable wrapper for globalCompositeOperation in the canvas API.
     */
    globalCompositeOperation(operation: string): CanvasAnimation {
        return this.pipe(
            this.draw(
                () => {
                    if (DEBUG) console.log("globalCompositeOperation: attached");
                    return function(tick) {
                        if (DEBUG) console.log("globalCompositeOperation: globalCompositeOperation");
                        tick.ctx.globalCompositeOperation = operation;
                    }
                }
            )
        );
    }

    arc(center: types.PointArg, radius: types.NumberArg,
        radStartAngle: types.NumberArg, radEndAngle: types.NumberArg,
        counterclockwise?: boolean): this {
        return this.draw(
            () => {
                if (DEBUG) console.log("arc: attach");
                var arg1_next = Parameter.from(center).init();
                var arg2_next = Parameter.from(radius).init();
                var arg3_next = Parameter.from(radStartAngle).init();
                var arg4_next = Parameter.from(radEndAngle).init();
                return function (tick:CanvasTick) {
                    var arg1 = arg1_next(tick.clock);
                    var arg2 = arg2_next(tick.clock);
                    var arg3 = arg3_next(tick.clock);
                    var arg4 = arg4_next(tick.clock);
                    if (DEBUG) console.log("arc: arc", arg1, arg2, arg3, arg4);
                    tick.ctx.arc(arg1[0], arg1[1], arg2, arg3, arg4, counterclockwise);
                }
            });
    }
}


export class PathAnimation extends CanvasAnimation {

}



export function strokeStyle(
    color: types.ColorArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("strokeStyle: attach");
            var color_next = Parameter.from(color).init();
            return function (tick: CanvasTick) {
                var color = color_next(tick.clock);
                if (DEBUG) console.log("strokeStyle: strokeStyle", color);
                tick.ctx.strokeStyle = color;
            }
        }
    );
}

export function shadowColor(
    color: types.ColorArg
): CanvasAnimation {
    return OT.draw<CanvasAnimation>(
        () => {
            if (DEBUG) console.log("shadowColor: attach");
            var color_next = Parameter.from(color).init();
            return function (tick: CanvasTick) {
                var color = color_next(tick.clock);
                if (DEBUG) console.log("shadowColor: shadowColor", color);
                tick.ctx.shadowColor = color;
            }
        }
    );
}
export function shadowBlur(
    level: types.NumberArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("shadowBlur: attach");
            var level_next = Parameter.from(level).init();
            return function (tick: CanvasTick) {
                var level = level_next(tick.clock);
                if (DEBUG) console.log("shadowBlur: shadowBlur", level);
                tick.ctx.shadowBlur = level;
            }
        }
    );
}


export function shadowOffset(
    xy: types.PointArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("shadowOffset: attach");
            var xy_next = Parameter.from(xy).init();
            return function (tick: CanvasTick) {
                var xy = xy_next(tick.clock);
                if (DEBUG) console.log("shadowOffset: shadowBlur", xy);
                tick.ctx.shadowOffsetX = xy[0];
                tick.ctx.shadowOffsetY = xy[1];
            }
        }
    );
}

export function lineCap(
    style: types.StringArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("lineCap: attach");
            var arg_next: Parameter<String> = Parameter.from(style).init();
            return function (tick: CanvasTick) {
                var arg = arg_next(tick.clock);
                if (DEBUG) console.log("lineCap: lineCap", arg);
                tick.ctx.lineCap = arg;
            }
        }
    );
}
export function lineJoin(
    style: types.StringArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("lineJoin: attach");
            var arg_next = Parameter.from(style).init();
            return function (tick: CanvasTick) {
                var arg = arg_next(tick.clock);
                if (DEBUG) console.log("lineJoin: lineCap", arg);
                tick.ctx.lineJoin = arg;
            }
        }
    );
}

export function lineWidth(
    width: types.NumberArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("lineWidth: attach");
            var width_next = Parameter.from(width).init();
            return function (tick: CanvasTick) {
                var width = width_next(tick.clock);
                if (DEBUG) console.log("lineWidth: lineWidth", width);
                tick.ctx.lineWidth = width;
            }
        });
}

export function miterLimit(
    limit: types.NumberArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("miterLimit: attach");
            var arg_next = Parameter.from(limit).init();
            return function (tick: CanvasTick) {
                var arg = arg_next(tick.clock);
                if (DEBUG) console.log("miterLimit: miterLimit", arg);
                tick.ctx.miterLimit = arg;
            }
        });
}


export function rect(
    xy: types.PointArg,
    width_height: types.PointArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("rect: attach");
            var xy_next = Parameter.from(xy).init();
            var width_height_next = Parameter.from(width_height).init();

            return function (tick: CanvasTick) {
                var xy: types.Point = xy_next(tick.clock);
                var width_height: types.Point = width_height_next(tick.clock);
                if (DEBUG) console.log("rect: rect", xy, width_height);
                tick.ctx.rect(xy[0], xy[1], width_height[0], width_height[1]);
            }
        });
}

export function fillRect(
    xy: types.PointArg,
    width_height: types.PointArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("fillRect: attach");
            var xy_next = Parameter.from(xy).init();
            var width_height_next = Parameter.from(width_height).init();

            return function (tick: CanvasTick) {
                var xy: types.Point = xy_next(tick.clock);
                var width_height: types.Point = width_height_next(tick.clock);
                if (DEBUG) console.log("fillRect: fillRect", xy, width_height);
                tick.ctx.fillRect(xy[0], xy[1], width_height[0], width_height[1]);
            }
        });
}

export function strokeRect(
    xy: types.PointArg,
    width_height: types.PointArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("strokeRect: attach");
            var xy_next = Parameter.from(xy).init();
            var width_height_next = Parameter.from(width_height).init();

            return function (tick: CanvasTick) {
                var xy: types.Point = xy_next(tick.clock);
                var width_height: types.Point = width_height_next(tick.clock);
                if (DEBUG) console.log("strokeRect: strokeRect", xy, width_height);
                tick.ctx.strokeRect(xy[0], xy[1], width_height[0], width_height[1]);
            }
        });
}
export function clearRect(
    xy: types.PointArg,
    width_height: types.PointArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("clearRect: attach");
            var xy_next = Parameter.from(xy).init();
            var width_height_next = Parameter.from(width_height).init();

            return function (tick: CanvasTick) {
                var xy: types.Point = xy_next(tick.clock);
                var width_height: types.Point = width_height_next(tick.clock);
                if (DEBUG) console.log("clearRect: clearRect", xy, width_height);
                tick.ctx.clearRect(xy[0], xy[1], width_height[0], width_height[1]);
            }
        });
}


export function withinPath(
    inner: CanvasAnimation
): PathAnimation {
    return new PathAnimation(
        (upstream: CanvasTickStream) => {
            if (DEBUG) console.log("withinPath: attach");
            var beginPathBeforeInner = upstream.tapOnNext(
                function (tick: CanvasTick) {tick.ctx.beginPath();}
            );
            return inner.attach(beginPathBeforeInner).tapOnNext(
                function (tick: CanvasTick) {tick.ctx.closePath();}
            )
        });
}

export function stroke(): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("stroke: attach");
            return function (tick: CanvasTick) {
                if (DEBUG) console.log("stroke: stroke");
                tick.ctx.stroke();
            }
        });
}

export function fill(): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("fill: attach");
            return function (tick: CanvasTick) {
                if (DEBUG) console.log("fill: fill");
                tick.ctx.fill();
            }
        });
}

export function moveTo(
    xy: types.PointArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("moveTo: attach");
            var xy_next = Parameter.from(xy).init();
            return function (tick: CanvasTick) {
                var xy = xy_next(tick.clock);
                if (DEBUG) console.log("moveTo: moveTo", xy);
                tick.ctx.moveTo(xy[0], xy[1]);
            }
        });
}

export function lineTo(
    xy: types.PointArg
): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("lineTo: attach");
            var xy_next = Parameter.from(xy).init();
            return function (tick: CanvasTick) {
                var xy = xy_next(tick.clock);
                if (DEBUG) console.log("lineTo: lineTo", xy);
                tick.ctx.lineTo(xy[0], xy[1]);
            }
        });
}


export function clip(): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("clip: attach");
            return function (tick: CanvasTick) {
                if (DEBUG) console.log("clip: clip");
                tick.ctx.clip();
            }
        });
}

export function quadraticCurveTo(control: types.PointArg, end: types.PointArg): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("quadraticCurveTo: attach");
            var arg1_next = Parameter.from(control).init();
            var arg2_next = Parameter.from(end).init();
            return function (tick: CanvasTick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                if (DEBUG) console.log("quadraticCurveTo: quadraticCurveTo", arg1, arg2);
                tick.ctx.quadraticCurveTo(arg1[0], arg1[1], arg2[0], arg2[1]);
            }
        });
}
/**
 * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
 */
export function bezierCurveTo(control1: types.PointArg, control2: types.PointArg, end: types.PointArg): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("bezierCurveTo: attach");
            var arg1_next = Parameter.from(control1).init();
            var arg2_next = Parameter.from(control2).init();
            var arg3_next = Parameter.from(end).init();
            return function (tick: CanvasTick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                if (DEBUG) console.log("bezierCurveTo: bezierCurveTo", arg1, arg2, arg3);
                tick.ctx.bezierCurveTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3[0], arg3[1]);
            }
        });
}

/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
export function arcTo(tangent1: types.PointArg, tangent2: types.PointArg, radius: types.NumberArg): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("arc: attach");
            var arg1_next = Parameter.from(tangent1).init();
            var arg2_next = Parameter.from(tangent2).init();
            var arg3_next = Parameter.from(radius).init();
            return function (tick: CanvasTick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                if (DEBUG) console.log("arc: arc", arg1, arg2, arg3);
                tick.ctx.arcTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3);
            }
        });
}
/**
 * Dynamic chainable wrapper for scale in the canvas API.
 */
export function scale(xy: types.PointArg): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("scale: attach");
            var arg1_next = Parameter.from(xy).init();
            return function (tick: CanvasTick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG) console.log("scale: scale", arg1);
                tick.ctx.scale(arg1[0], arg1[1]);
            }
        });
}
/**
 * Dynamic chainable wrapper for translate in the canvas API.
 * [ a c e
 *   b d f
 *   0 0 1 ]
 */
export function transform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg,
          d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("transform: attach");
            var arg1_next = Parameter.from(a).init();
            var arg2_next = Parameter.from(b).init();
            var arg3_next = Parameter.from(c).init();
            var arg4_next = Parameter.from(d).init();
            var arg5_next = Parameter.from(e).init();
            var arg6_next = Parameter.from(f).init();
            return function (tick: CanvasTick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                var arg4 = arg4_next(tick.clock);
                var arg5 = arg5_next(tick.clock);
                var arg6 = arg6_next(tick.clock);
                if (DEBUG) console.log("transform: transform", arg1, arg2, arg3, arg4, arg5, arg6);
                tick.ctx.transform(arg1, arg2, arg3, arg4, arg5, arg6);
            }
        });
}
/**
 * Dynamic chainable wrapper for setTransform in the canvas API.
 */
export function setTransform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg,
             d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): CanvasAnimation {
    return this.draw(
        () => {
            if (DEBUG) console.log("setTransform: attach");
            var arg1_next = Parameter.from(a).init();
            var arg2_next = Parameter.from(b).init();
            var arg3_next = Parameter.from(c).init();
            var arg4_next = Parameter.from(d).init();
            var arg5_next = Parameter.from(e).init();
            var arg6_next = Parameter.from(f).init();
            return function (tick: CanvasTick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                var arg4 = arg4_next(tick.clock);
                var arg5 = arg5_next(tick.clock);
                var arg6 = arg6_next(tick.clock);
                if (DEBUG) console.log("setTransform: setTransform", arg1, arg2, arg3, arg4, arg5, arg6);
                tick.ctx.setTransform(arg1, arg2, arg3, arg4, arg5, arg6);
            }
        });
}