import * as Parameter from "../src/Parameter";
import * as events from "./events"
import * as OT from "./frp"
import * as types from "./types"
import * as glow from "./glow"
export * from "./types"

var DEBUG = true;

/**
 * Each frame an animation is provided a CanvasTick. The tick exposes access to the local animation time, the
 * time delta between the previous frame (dt) and the drawing context. Animators typically use the drawing context
 * directly, and pass the clock onto any time varying parameters.
 */
export class Tick extends OT.BaseTick{
    constructor (
        public clock: number,
        public dt: number,
        public ctx: CanvasRenderingContext2D,
        public events: events.Events,
        public previous ?: Tick)
    {
        super(clock, dt, previous)
    }
    copy(): this {
        return <this>new Tick(this.clock, this.dt, this.ctx, this.events, this.previous);
    }
    
    save(): this {
        var cp = <this>super.save();
        cp.ctx.save();
        return cp;
    }
    restore(): this {
        var cp = <this>super.restore();
        cp.ctx.restore();
        return cp;
    }
    
}

export class Operation extends OT.SimpleSignalFn<Tick>{

    constructor(public attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick>) {
        super(attach);
    }
    
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    create(attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick> = nop => nop): this {
        return <this> new Operation(attach);
    }
    
    /**
     * Affect this with an effect to create combined animation.
     * Debug messages are inserted around the effect (e.g. a mutation to the canvas).
     * You  can expose time varying or constant parameters to the inner effect using the optional params.
     */
    loggedAffect<P1, P2, P3, P4, P5, P6, P7, P8>(
        label: string, 
        effectBuilder: () => (tick: Tick, arg1?: P1, arg2?: P2, arg3?: P3, arg4?: P4,
                                                arg5?: P5, arg6?: P6, arg7?: P7, arg8?: P8) => void,
        param1?: P1 | Parameter.Parameter<P1>,
        param2?: P2 | Parameter.Parameter<P2>,
        param3?: P3 | Parameter.Parameter<P3>,
        param4?: P4 | Parameter.Parameter<P4>,
        param5?: P5 | Parameter.Parameter<P5>,
        param6?: P6 | Parameter.Parameter<P6>,
        param7?: P7 | Parameter.Parameter<P7>,
        param8?: P8 | Parameter.Parameter<P8>
    ): this {
        if (DEBUG) {
            var elements = [];
            if (param1 !== undefined) elements.push(param1 + "");
            if (param2 !== undefined) elements.push(param2 + "");
            if (param3 !== undefined) elements.push(param3 + "");
            if (param4 !== undefined) elements.push(param4 + "");
            if (param5 !== undefined) elements.push(param5 + "");
            if (param6 !== undefined) elements.push(param6 + "");
            if (param7 !== undefined) elements.push(param7 + "");
            if (param8 !== undefined) elements.push(param8 + "");
            console.log(label + ": build (" + elements.join(",") + ")");
        }
        return this.affect(
            () => {
                if (DEBUG) console.log(label + ": attach");
                var effect = effectBuilder()
                return (tick: Tick, arg1?: P1, arg2?: P2, arg3?: P3, arg4?: P4,
                                          arg5?: P5, arg6?: P6, arg7?: P7, arg8?: P8) => {
                    if (DEBUG) {
                        var elements = [];
                        if (arg1 !== undefined) elements.push(arg1 + "");
                        if (arg2 !== undefined) elements.push(arg2 + "");
                        if (arg3 !== undefined) elements.push(arg3 + "");
                        if (arg4 !== undefined) elements.push(arg4 + "");
                        if (arg5 !== undefined) elements.push(arg5 + "");
                        if (arg6 !== undefined) elements.push(arg6 + "");
                        if (arg7 !== undefined) elements.push(arg7 + "");
                        if (arg8 !== undefined) elements.push(arg8 + "");
                        console.log(label + ": tick (" + elements.join(",") + ")");
                    }
                    effect(tick, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8)
                }
            },
            <OT.SignalFn<Tick, P1>> (param1 !== undefined ? Parameter.from(param1): undefined),
            <OT.SignalFn<Tick, P2>> (param2 !== undefined ? Parameter.from(param2): undefined),
            <OT.SignalFn<Tick, P3>> (param3 !== undefined ? Parameter.from(param3): undefined),
            <OT.SignalFn<Tick, P4>> (param4 !== undefined ? Parameter.from(param4): undefined),
            <OT.SignalFn<Tick, P5>> (param5 !== undefined ? Parameter.from(param5): undefined),
            <OT.SignalFn<Tick, P6>> (param6 !== undefined ? Parameter.from(param6): undefined),
            <OT.SignalFn<Tick, P7>> (param7 !== undefined ? Parameter.from(param7): undefined),
            <OT.SignalFn<Tick, P8>> (param8 !== undefined ? Parameter.from(param8): undefined)
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
                return (tick: Tick, velocity: types.Point) => {
                    if (DEBUG) console.log("velocity: tick", velocity, pos);
                    tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
                    pos[0] += velocity[0] * tick.dt;
                    pos[1] += velocity[1] * tick.dt;
                }
            },
            <OT.SignalFn<Tick, types.Point>>Parameter.from(velocity)
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
                return (tick: Tick, from, to, time) => {
                    t = t + tick.dt;
                    if (t > time) t = time;
                    var x = from[0] + (to[0] - from[0]) * t / time;
                    var y = from[1] + (to[1] - from[1]) * t / time;
                    
                    if (DEBUG) console.log("tween: tick", x, y, t);
                    tick.ctx.transform(1, 0, 0, 1, x, y);
                }
            },
            <OT.SignalFn<Tick, types.Point>>Parameter.from(from),
            <OT.SignalFn<Tick, types.Point>>Parameter.from(to),
            <OT.SignalFn<Tick, number>>Parameter.from(time)
        ) 
    }
    
    glow(
        decay: types.NumberArg = 0.1
    ): Operation {
        return glow.glow(this, decay);
    }
    


    // Canvas API
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    strokeStyle(color: types.ColorArg): this {
        return this.loggedAffect(
            "strokeStyle",
            () => (tick: Tick, color: types.Color) => 
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
            () => (tick: Tick, color: types.Color) => 
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
            () => (tick: Tick, color: types.Color) => 
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
            () => (tick: Tick, level: number) => 
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
            () => (tick: Tick, xy: types.Point) => {
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
            () => (tick: Tick, arg: string) => 
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
            () => (tick: Tick, arg: string) => 
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
            () => (tick: Tick, arg: number) => 
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
            () => (tick: Tick, arg: number) => 
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
            () => (tick: Tick, xy: types.Point, width_height: types.Point) => 
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
            () => (tick: Tick, xy: types.Point, width_height: types.Point) => 
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
            () => (tick: Tick, xy: types.Point, width_height: types.Point) => 
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
            () => (tick: Tick, xy: types.Point, width_height: types.Point) => 
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
    withinPath(inner: Operation): PathAnimation {
        return this.pipe(
            new PathAnimation(
                (upstream: Rx.Observable<Tick>) => {
                    if (DEBUG) console.log("withinPath: attach");
                    var beginPathBeforeInner = upstream.tapOnNext(
                        (tick: Tick) => tick.ctx.beginPath()
                    );
                    return inner.attach(beginPathBeforeInner).tapOnNext(
                        (tick: Tick) => tick.ctx.closePath()
                    )
                }
            )
        );
    }
    /**
     * Dynamic chainable wrapper for fill in the canvas API. 
     */
    closePath(): this {
        return this.loggedAffect(
            "closePath",
            () => (tick: Tick) => 
                tick.ctx.closePath()
        )
    }
    
    /**
     * Dynamic chainable wrapper for fill in the canvas API. 
     */
    beginPath(): this {
        return this.loggedAffect(
            "beginPath",
            () => (tick: Tick) => 
                tick.ctx.beginPath()
        )
    }
    
    /**
     * Dynamic chainable wrapper for fill in the canvas API. 
     */
    fill(): this {
        return this.loggedAffect(
            "fill",
            () => (tick: Tick) => 
                tick.ctx.fill()
        )
    }
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    stroke(): this {
        return this.loggedAffect(
            "stroke",
            () => (tick: Tick) => 
                tick.ctx.stroke()
        )
    }
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API. 
     */
    moveTo(xy: types.PointArg): this {
        return this.loggedAffect(
            "moveTo",
            () => (tick: Tick, xy: types.Point) => 
                tick.ctx.moveTo(xy[0], xy[1]),
            xy
        )
    }
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. 
     */
    lineTo(xy: types.PointArg): this {
        return this.loggedAffect(
            "lineTo",
            () => (tick: Tick, xy: types.Point) => 
                tick.ctx.lineTo(xy[0], xy[1]),
            xy
        )
    }
    /**
     * Dynamic chainable wrapper for clip in the canvas API. 
     */
    clip(): this {
        return this.loggedAffect(
            "clip",
            () => (tick: Tick) => 
                tick.ctx.clip()
        )
    }
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    quadraticCurveTo(control: types.PointArg, end: types.PointArg): this {
        return this.loggedAffect(
            "quadraticCurveTo",
            () => (tick: Tick, arg1: types.Point, arg2: types.Point) => 
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
            () => (tick: Tick, arg1: types.Point, arg2: types.Point, arg3: types.Point) => 
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
            () => (tick: Tick, arg1: types.Point, arg2: types.Point, arg3: number) => 
                tick.ctx.arcTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3),
            tangent1,
            tangent2,
            radius
        )
    }
    
    
    ellipticArcTo(
        start: types.PointArg, 
        radius: types.PointArg, 
        xAxisRotationRad: types.NumberArg,
        largeArc: types.BooleanArg, sweep: types.BooleanArg,
        end: types.PointArg) {
        
        return this.loggedAffect(
            "ellipticArcTo",
            () => (tick: Tick, X1: [number, number], R: [number, number],
             psi: number, fa: boolean, fs: boolean, X2: [number, number]) => {
                console.log("elliptical R", R);
                var x1 = X1[0],
                    y1 = X1[1],
                    x2 = X2[0],
                    y2 = X2[1],
                    rx = R[0],
                    ry = R[1];
                var cos = Math.cos(psi * Math.PI * 2.0 / 360);
                var sin = Math.sin(psi * Math.PI * 2.0 / 360);
                
                // step 1
                var x1_prime =  cos * (x1 - x2) / 2.0 + sin * (y1 - y2) / 2.0;
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
                } else {
                    // SHOULD BE 0
                    rx *= Math.sqrt(scaleToInflection)
                    ry *= Math.sqrt(scaleToInflection)
                }
                // TODO overwrite value while scaling is not working
                numerator = (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime);
                
                var denominator = (rx * rx * y1_prime * y1_prime + ry * ry * x1_prime * x1_prime);
                var factor = polarity2 * Math.sqrt(numerator / denominator) 
                var cx_prime =  factor * rx * y1_prime / ry;
                var cy_prime = -factor * ry * x1_prime / rx;
                
                // step 3
                var cx = cos * cx_prime - sin * cy_prime + (x1 + x2) / 2
                var cy = sin * cx_prime + cos * cy_prime + (y1 + y2) / 2
                
                // step 4
                var angle = function(u: [number, number], v: [number, number]): number {
                    var polarity1 = u[0] * v[1] - u[1] * v[0] > 0 ? 1 : -1;
                    var u_length = Math.sqrt(u[0] * u[0] + u[1] * u[1]);
                    var v_length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                    
                    if (false && DEBUG) {
                        console.log("u, v", u, v);
                        console.log("angle numerator", (u[0] * v[0] + u[1] * v[1]));
                        console.log("angle denominator", u_length * v_length);
                    }
                    return polarity1 * Math.acos(
                        (u[0] * v[0] + u[1] * v[1]) / 
                        (u_length * v_length)
                    )
                }
                
                var v0: [number, number] = [1, 0];
                var v1: [number, number] = [ (x1_prime - cx_prime) / rx,  (y1_prime - cy_prime) / ry];
                var v2: [number, number] = [(-x1_prime - cx_prime) / rx, (-y1_prime - cy_prime) / ry];
                var theta1 = angle(v0, v1)
                var thetaDelta = angle(v1, v2); 
                
                if (!fs && thetaDelta > 0) thetaDelta -= Math.PI * 2
                if ( fs && thetaDelta < 0) thetaDelta += Math.PI * 2
                
                var radius = Math.sqrt((cx - x1) * (cx - x1) + (cy - y1) * (cy - y1))
                
                var startAngle = theta1;
                var endAngle = theta1 + thetaDelta;
                
                if (DEBUG) {
                    console.log("psi", psi)
                    console.log("rx, ry", rx, ry)
                    console.log("x1, y1", x1, y1)
                    console.log("x2, y2", x2, y2)
                    console.log("cos, sin", cos, sin)
                    console.log("x1_prime, y1_prime", x1_prime, y1_prime)
                    console.log("a, b, c", a, b, c)
                    console.log("scaleToInflection", scaleToInflection)
                    console.log("numerator", (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime))
                    console.log("denominator", (rx * rx * y1_prime * y1_prime + ry * ry * x1_prime * x1_prime))
                    console.log("factor", factor)
                    console.log("cx_prime, cy_prime", cx_prime, cy_prime)
                    console.log("cx, cy", cx, cy)
                    console.log("v[0] ... v[2]", v0, v1, v2)
                    console.log("theta1, thetaDelta", theta1, thetaDelta)
                    console.log("radius", radius)
                    console.log("startAngle, endAngle", startAngle, endAngle)
                }
               
                tick.ctx.arc(cx, cy, radius, startAngle, endAngle, thetaDelta < 0)
            
            }, 
            start, radius, xAxisRotationRad, largeArc, sweep, end
        )
            
        
    }
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    scale(xy: types.PointArg): this {
        return this.loggedAffect(
            "scale",
            () => (tick: Tick, xy: types.Point) => 
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
            () => (tick: Tick, arg: number) => 
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
            () => (tick: Tick, xy: types.Point) => {
                tick.ctx.translate(xy[0], xy[1]);
            },
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
              d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): Operation {
        return this.loggedAffect(
            "transform",
            () => (tick: Tick, arg1: number, arg2: number, arg3: number, 
                                     arg4: number, arg5: number, arg6: number) =>
                    tick.ctx.transform(arg1, arg2, arg3, arg4, arg5, arg6),
            a,b,c,d,e,f
        );
    }
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    setTransform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg,
                 d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): Operation {
        return this.loggedAffect(
            "setTransform",
            () => (tick: Tick, arg1: number, arg2: number, arg3: number, 
                                     arg4: number, arg5: number, arg6: number) =>
                    tick.ctx.setTransform(arg1, arg2, arg3, arg4, arg5, arg6),
            a,b,c,d,e,f
        );
    }
    /**
     * Dynamic chainable wrapper for font in the canvas API.
     */
    font(style: string): Operation {
        return this.loggedAffect(
            "font",
            () => (tick: Tick, arg: string) => 
                tick.ctx.font = arg,
            style
        )
    }
    /**
     * Dynamic chainable wrapper for textAlign in the canvas API.
     */
    textAlign(style: string): Operation {
        return this.loggedAffect(
            "textAlign",
            () => (tick: Tick, arg: string) => 
                tick.ctx.textAlign = arg,
            style
        )
    }
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    textBaseline(style: string): Operation {
        return this.loggedAffect(
            "textBaseline",
            () => (tick: Tick, arg: string) => 
                tick.ctx.textBaseline = arg,
            style
        )
    }
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    fillText(text: types.StringArg, xy: types.PointArg, maxWidth?: types.NumberArg): Operation {
        if (maxWidth) {
            return this.loggedAffect(
                "fillText",
                () => (tick: Tick, text: string, xy: types.Point, maxWidth: number) => 
                    tick.ctx.fillText(text, xy[0], xy[1], maxWidth),
                text,
                xy,
                maxWidth
            )
        } else {
            return this.loggedAffect(
                "fillText",
                () => (tick: Tick, text: string, xy: types.Point, maxWidth: number) => 
                    tick.ctx.fillText(text, xy[0], xy[1]),
                text,
                xy
            )
        }
    }
    /**
     * Dynamic chainable wrapper for drawImage in the canvas API.
     */
    drawImage(img, xy: types.PointArg): Operation {
        return this.loggedAffect(
            "drawImage",
            () => (tick: Tick, img, xy: types.Point) => 
                tick.ctx.drawImage(img, xy[0], xy[1]),
            img, xy
        )
    }
    /**
     * * Dynamic chainable wrapper for globalCompositeOperation in the canvas API.
     */
    globalCompositeOperation(operation: string): Operation {
        return this.loggedAffect(
            "globalCompositeOperation",
            () => (tick: Tick, arg: string) => 
                tick.ctx.globalCompositeOperation = arg,
            operation
        )
    }

    arc(center: types.PointArg, radius: types.NumberArg,
        radStartAngle: types.NumberArg, radEndAngle: types.NumberArg,
        counterclockwise: types.BooleanArg): this {
        return this.loggedAffect(
            "arc",
            () => (tick: Tick, arg1: types.Point, arg2: number, arg3: number, 
                                     arg4: number, counterclockwise: boolean) => 
                tick.ctx.arc(arg1[0], arg1[1], arg2, arg3, arg4, counterclockwise),
            center, radius, radStartAngle, radEndAngle, counterclockwise
        );
    }
    
    /**
     * Dynamic chainable wrapper for save in the canvas API.
     */
    save(): this {
        return this.loggedAffect(
            "save",
            () => (tick: Tick) => 
                tick.ctx.save()
        )
    }
    /**
     * Dynamic chainable wrapper for restore in the canvas API.
     */
    restore(): this {
        return this.loggedAffect(
            "restore",
            () => (tick: Tick) => 
                tick.ctx.restore()
        )
    }
}

export function create(attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<Tick> = x => x): Operation {
    return new Operation(attach);
}

export class PathAnimation extends Operation {

}

export function save(width:number, height:number, path: string): Operation {
    var GIFEncoder = require('gifencoder');
    var fs = require('fs');


    var encoder = new GIFEncoder(width, height);
    encoder.createReadStream()
      .pipe(encoder.createWriteStream({ repeat: 10000, delay: 100, quality: 1 }))
      .pipe(fs.createWriteStream(path));
    encoder.start();

    return new Operation(function (upstream: Rx.Observable<Tick>): Rx.Observable<Tick> {
        return upstream.tap(
            function(tick: Tick) {
                if (DEBUG) console.log("save: wrote frame");
                encoder.addFrame(tick.ctx);
            },
            function() {console.error("save: not saved", path);},
            function() {console.log("save: saved", path); encoder.finish();}
        )
    });
}

