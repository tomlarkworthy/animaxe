import * as Parameter from "../src/Parameter";
import * as events from "./events"
import * as OT from "./ObservableTransformer"
import * as types from "./types"
import * as glow from "./glow"
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

export class Animation extends OT.ChainableTransformer<CanvasTick>{

    constructor(public attach: (upstream: Rx.Observable<CanvasTick>) => Rx.Observable<CanvasTick>) {
        super(attach);
    }
    
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    create(attach: (upstream: Rx.Observable<CanvasTick>) => Rx.Observable<CanvasTick> = nop => nop): this {
        return <this> new Animation(attach);
    }
    
    /**
     * Affect this with an effect to create combined animation.
     * Debug messages are inserted around the effect (e.g. a mutation to the canvas).
     * You can expose time varying or constant parameters to the inner effect using the optional params.
     */
    loggedAffect<P1, P2, P3, P4>(
        label: string, 
        effectBuilder: () => (tick: CanvasTick, arg1?: P1, arg2?: P2, arg3?: P3, arg4?: P4) => void,
        param1?: P1 | Parameter.Parameter<P1>,
        param2?: P2 | Parameter.Parameter<P2>,
        param3?: P3 | Parameter.Parameter<P3>,
        param4?: P4 | Parameter.Parameter<P4>
    ): this {
        if (DEBUG) console.log(label + ": build");
        return this.affect(
            () => {
                if (DEBUG) console.log(label + ": attach");
                var effect = effectBuilder()
                return (tick: CanvasTick, arg1?: P1, arg2?: P2, arg3?: P3, arg4?: P4) => {
                    if (DEBUG) {
                        var elements = [];
                        if (arg1) elements.push(arg1 + "");
                        if (arg2) elements.push(arg2 + "");
                        if (arg3) elements.push(arg3 + "");
                        if (arg4) elements.push(arg4 + "");
                        console.log(label + ": tick (" + elements.join(",") + ")");
                    }
                    effect(tick, arg1, arg2, arg3, arg4)
                }
            },
            param1 ? Parameter.from(param1): undefined,
            param2 ? Parameter.from(param2): undefined,
            param3 ? Parameter.from(param3): undefined,
            param4 ? Parameter.from(param4): undefined
        )
    }
    
    velocity(
        velocity: types.PointArg
    ): this {
        if (DEBUG) console.log("velocity: build");
        return this.affect(
            () => {
                if (DEBUG) console.log("velocity: attach");
                var pos: types.Point = [0.0,0.0];
                return (tick: CanvasTick, velocity: types.Point) => {
                    if (DEBUG) console.log("velocity: tick", velocity, pos);
                    tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
                    pos[0] += velocity[0] * tick.dt;
                    pos[1] += velocity[1] * tick.dt;
                }
            },
            Parameter.from(velocity)
        );
    }
    
    tween_linear(
        from: types.PointArg,
        to:   types.PointArg,
        time: types.NumberArg
    ): this
    {
        return this.affect(
            () => {
                var t = 0;
                if (DEBUG) console.log("tween: init");
                return (tick: CanvasTick, from, to, time) => {
                    t = t + tick.dt;
                    if (t > time) t = time;
                    var x = from[0] + (to[0] - from[0]) * t / time;
                    var y = from[1] + (to[1] - from[1]) * t / time;
                    
                    if (DEBUG) console.log("tween: tick", x, y, t);
                    tick.ctx.transform(1, 0, 0, 1, x, y);
                }
            },
            Parameter.from(from),
            Parameter.from(to),
            Parameter.from(time)
        ) 
    }
    
    glow(
        decay: types.NumberArg = 0.1
    ): Animation {
        return glow.glow(this, decay);
    }
    


    // Canvas API
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    strokeStyle(color: types.ColorArg): this {
        return this.loggedAffect(
            "strokeStyle",
            () => (tick: CanvasTick, color: types.Color) => 
                tick.ctx.strokeStyle = color,
            color
        )
    }
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    fillStyle(color: types.ColorArg): this {
        return this.loggedAffect(
            "fillStyle",
            () => (tick: CanvasTick, color: types.Color) => 
                tick.ctx.fillStyle = color,
            color
        )
    }
    /**
     * Dynamic chainable wrapper for shadowColor in the canvas API.
     */
    shadowColor(color: types.ColorArg): this {
        return this.loggedAffect(
            "shadowColor",
            () => (tick: CanvasTick, color: types.Color) => 
                tick.ctx.shadowColor = color,
            color
        )
    }
    /**
     * Dynamic chainable wrapper for shadowBlur in the canvas API.
     */
    shadowBlur(level: types.NumberArg): this {
        return this.loggedAffect(
            "shadowBlur",
            () => (tick: CanvasTick, level: number) => 
                tick.ctx.shadowBlur = level,
            level
        )
    }
    /**
     * Dynamic chainable wrapper for shadowOffsetX and shadowOffsetY in the canvas API.
     */
    shadowOffset(xy: types.PointArg): this {
        return this.loggedAffect(
            "shadowOffset",
            () => (tick: CanvasTick, xy: types.Point) => {
                tick.ctx.shadowOffsetX = xy[0];
                tick.ctx.shadowOffsetY = xy[1];
            },
            xy
        )
    }
    /**
     * Dynamic chainable wrapper for lineCap in the canvas API.
     */
    lineCap(style: string): this {
        return this.loggedAffect(
            "lineCap",
            () => (tick: CanvasTick, arg: string) => 
                tick.ctx.lineCap = arg,
            style
        )
    }
    /**
     * Dynamic chainable wrapper for lineJoin in the canvas API.
     */
    lineJoin(style: string): this {
        return this.loggedAffect(
            "lineJoin",
            () => (tick: CanvasTick, arg: string) => 
                tick.ctx.lineJoin = arg,
            style
        )
    }
    /**
     * Dynamic chainable wrapper for lineWidth in the canvas API.
     */
    lineWidth(width: types.NumberArg): this {
        return this.loggedAffect(
            "lineWidth",
            () => (tick: CanvasTick, arg: number) => 
                tick.ctx.lineWidth = arg,
            width
        )
    }
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    miterLimit(limit: types.NumberArg): this {
        return this.loggedAffect(
            "miterLimit",
            () => (tick: CanvasTick, arg: number) => 
                tick.ctx.miterLimit = arg,
            limit
        )
    }
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    rect(xy: types.PointArg, width_height: types.PointArg): this {
        return this.loggedAffect(
            "rect",
            () => (tick: CanvasTick, xy: types.Point, width_height: types.Point) => 
                tick.ctx.rect(xy[0], xy[1], width_height[0], width_height[1]),
            xy,
            width_height
        )
    }
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    fillRect(xy: types.PointArg, width_height: types.PointArg): this {
        return this.loggedAffect(
            "fillRect",
            () => (tick: CanvasTick, xy: types.Point, width_height: types.Point) => 
               tick.ctx.fillRect(xy[0], xy[1], width_height[0], width_height[1]),
            xy,
            width_height
        )
    }
    /**
     * Dynamic chainable wrapper for strokeRect in the canvas API.
     */
    strokeRect(xy: types.PointArg, width_height: types.PointArg): this {
        return this.loggedAffect(
            "strokeRect",
            () => (tick: CanvasTick, xy: types.Point, width_height: types.Point) => 
                tick.ctx.strokeRect(xy[0], xy[1], width_height[0], width_height[1]),
            xy,
            width_height
        )
    }
    /**
     * Dynamic chainable wrapper for clearRect in the canvas API.
     */
    clearRect(xy: types.PointArg, width_height: types.PointArg): this {
        return this.loggedAffect(
            "clearRect",
            () => (tick: CanvasTick, xy: types.Point, width_height: types.Point) => 
                tick.ctx.clearRect(xy[0], xy[1], width_height[0], width_height[1]),
            xy,
            width_height
        )
    }
    /**
     * Encloses the inner animation with a beginpath() and endpath() from the canvas API.
     *
     * This returns a path object which events can be subscribed to
     */
    withinPath(inner: Animation): PathAnimation {
        return this.pipe(
            new PathAnimation(
                (upstream: Rx.Observable<CanvasTick>) => {
                    if (DEBUG) console.log("withinPath: attach");
                    var beginPathBeforeInner = upstream.tapOnNext(
                        (tick: CanvasTick) => tick.ctx.beginPath()
                    );
                    return inner.attach(beginPathBeforeInner).tapOnNext(
                        (tick: CanvasTick) => tick.ctx.closePath()
                    )
                }
            )
        );
    }
    /**
     * Dynamic chainable wrapper for fill in the canvas API. Use with withinPath.
     */
    fill(): this {
        return this.loggedAffect(
            "fill",
            () => (tick: CanvasTick) => 
                tick.ctx.fill()
        )
    }
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    stroke(): this {
        return this.loggedAffect(
            "stroke",
            () => (tick: CanvasTick) => 
                tick.ctx.stroke()
        )
    }
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API. Use with withinPath.
     */
    moveTo(xy: types.PointArg): this {
        return this.loggedAffect(
            "moveTo",
            () => (tick: CanvasTick, xy: types.Point) => 
                tick.ctx.moveTo(xy[0], xy[1]),
            xy
        )
    }
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    lineTo(xy: types.PointArg): this {
        return this.loggedAffect(
            "lineTo",
            () => (tick: CanvasTick, xy: types.Point) => 
                tick.ctx.lineTo(xy[0], xy[1]),
            xy
        )
    }
    /**
     * Dynamic chainable wrapper for clip in the canvas API. Use with withinPath.
     */
    clip(): this {
        return this.loggedAffect(
            "clip",
            () => (tick: CanvasTick) => 
                tick.ctx.clip()
        )
    }
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    quadraticCurveTo(control: types.PointArg, end: types.PointArg): this {
        return this.loggedAffect(
            "quadraticCurveTo",
            () => (tick: CanvasTick, arg1: types.Point, arg2: types.Point) => 
                tick.ctx.quadraticCurveTo(arg1[0], arg1[1], arg2[0], arg2[1]),
            control,
            end
        )
    }
    /**
     * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
     */
    bezierCurveTo(control1: types.PointArg, control2: types.PointArg, end: types.PointArg): this {
        return this.loggedAffect(
            "bezierCurveTo",
            () => (tick: CanvasTick, arg1: types.Point, arg2: types.Point, arg3: types.Point) => 
                tick.ctx.bezierCurveTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3[0], arg3[1]),
            control1,
            control2,
            end
        )
    }

    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    arcTo(tangent1: types.PointArg, tangent2: types.PointArg, radius: types.NumberArg): this {
        return this.loggedAffect(
            "arcTo",
            () => (tick: CanvasTick, arg1: types.Point, arg2: types.Point, arg3: number) => 
                tick.ctx.arcTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3),
            tangent1,
            tangent2,
            radius
        )
    }
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    scale(xy: types.PointArg): this {
        return this.loggedAffect(
            "scale",
            () => (tick: CanvasTick, xy: types.Point) => 
                tick.ctx.scale(xy[0], xy[1]),
            xy
        )
    }
    /**
     * Dynamic chainable wrapper for rotate in the canvas API.
     */
    rotate(clockwiseRadians: types.NumberArg): this {
        return this.loggedAffect(
            "rotate",
            () => (tick: CanvasTick, arg: number) => 
                tick.ctx.rotate(arg),
            clockwiseRadians
        )
    }
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     */
    translate(xy: types.PointArg): this {
        return this.loggedAffect(
            "translate",
            () => (tick: CanvasTick, xy: types.Point) => 
                tick.ctx.translate(xy[0], xy[1]),
            xy
        )
    }
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     * [ a c e
     *   b d f
     *   0 0 1 ]
     */
    transform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg,
              d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): Animation {
        return this.pipe(
            this.draw(
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
                }
            )
        );
    }
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    setTransform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg,
                 d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): Animation {
        return this.pipe(
            this.draw(
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
                }
            )
        );
    }
    /**
     * Dynamic chainable wrapper for font in the canvas API.
     */
    font(style: string): Animation {
        return this.loggedAffect(
            "font",
            () => (tick: CanvasTick, arg: string) => 
                tick.ctx.font = arg,
            style
        )
    }
    /**
     * Dynamic chainable wrapper for textAlign in the canvas API.
     */
    textAlign(style: string): Animation {
        return this.loggedAffect(
            "textAlign",
            () => (tick: CanvasTick, arg: string) => 
                tick.ctx.textAlign = arg,
            style
        )
    }
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    textBaseline(style: string): Animation {
        return this.loggedAffect(
            "textBaseline",
            () => (tick: CanvasTick, arg: string) => 
                tick.ctx.textBaseline = arg,
            style
        )
    }
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    fillText(text: types.StringArg, xy: types.PointArg, maxWidth?: types.NumberArg): Animation {
        if (maxWidth) {
            return this.loggedAffect(
                "fillText",
                () => (tick: CanvasTick, text: string, xy: types.Point, maxWidth: number) => 
                    tick.ctx.fillText(text, xy[0], xy[1], maxWidth),
                text,
                xy,
                maxWidth
            )
        } else {
            return this.loggedAffect(
                "fillText",
                () => (tick: CanvasTick, text: string, xy: types.Point, maxWidth: number) => 
                    tick.ctx.fillText(text, xy[0], xy[1]),
                text,
                xy
            )
        }
    }
    /**
     * Dynamic chainable wrapper for drawImage in the canvas API.
     */
    drawImage(img, xy: types.PointArg): Animation {
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
    globalCompositeOperation(operation: string): Animation {
        return this.loggedAffect(
            "globalCompositeOperation",
            () => (tick: CanvasTick, arg: string) => 
                tick.ctx.globalCompositeOperation = arg,
            operation
        )
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
            }
        );
    }
}

export function create(attach: (upstream: Rx.Observable<CanvasTick>) => Rx.Observable<CanvasTick> = x => x): Animation {
    return new Animation(attach);
}
export class PathAnimation extends Animation {

}



export function save(width:number, height:number, path: string): Animation {
    var GIFEncoder = require('gifencoder');
    var fs = require('fs');


    var encoder = new GIFEncoder(width, height);
    encoder.createReadStream()
      .pipe(encoder.createWriteStream({ repeat: 10000, delay: 100, quality: 1 }))
      .pipe(fs.createWriteStream(path));
    encoder.start();

    return new Animation(function (upstream: Rx.Observable<CanvasTick>): Rx.Observable<CanvasTick> {
        return upstream.tap(
            function(tick: CanvasTick) {
                if (DEBUG) console.log("save: wrote frame");
                encoder.addFrame(tick.ctx);
            },
            function() {console.error("save: not saved", path);},
            function() {console.log("save: saved", path); encoder.finish();}
        )
    });
}

