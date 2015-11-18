import * as events from "./events";
import * as OT from "./ObservableTransformer";
import * as types from "./types";
export * from "./types";
/**
 * Each frame an animation is provided a CanvasTick. The tick exposes access to the local animation time, the
 * time delta between the previous frame (dt) and the drawing context. Animators typically use the drawing context
 * directly, and pass the clock onto any time varying parameters.
 */
export declare class CanvasTick extends OT.BaseTick {
    clock: number;
    dt: number;
    ctx: CanvasRenderingContext2D;
    events: events.Events;
    constructor(clock: number, dt: number, ctx: CanvasRenderingContext2D, events: events.Events);
}
export declare class CanvasAnimation extends OT.ObservableTransformer<CanvasTick> {
    attach: (upstream: Rx.Observable<CanvasTick>) => Rx.Observable<CanvasTick>;
    constructor(attach: (upstream: Rx.Observable<CanvasTick>) => Rx.Observable<CanvasTick>);
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    strokeStyle(color: types.ColorArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    fillStyle(color: types.ColorArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for shadowColor in the canvas API.
     */
    shadowColor(color: types.ColorArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for shadowBlur in the canvas API.
     */
    shadowBlur(level: types.NumberArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for shadowOffsetX and shadowOffsetY in the canvas API.
     */
    shadowOffset(xy: types.PointArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for lineCap in the canvas API.
     */
    lineCap(style: string): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for lineJoin in the canvas API.
     */
    lineJoin(style: string): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for lineWidth in the canvas API.
     */
    lineWidth(width: types.NumberArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    miterLimit(limit: types.NumberArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    rect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    fillRect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for strokeRect in the canvas API.
     */
    strokeRect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for clearRect in the canvas API.
     */
    clearRect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation;
    /**
     * Encloses the inner animation with a beginpath() and endpath() from the canvas API.
     *
     * This returns a path object which events can be subscribed to
     */
    withinPath(inner: CanvasAnimation): PathAnimation;
    /**
     * Dynamic chainable wrapper for fill in the canvas API. Use with withinPath.
     */
    fill(): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    stroke(): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API. Use with withinPath.
     */
    moveTo(xy: types.PointArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    lineTo(xy: types.PointArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for clip in the canvas API. Use with withinPath.
     */
    clip(): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    quadraticCurveTo(control: types.PointArg, end: types.PointArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
     */
    bezierCurveTo(control1: types.PointArg, control2: types.PointArg, end: types.PointArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    arcTo(tangent1: types.PointArg, tangent2: types.PointArg, radius: types.NumberArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    scale(xy: types.PointArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for rotate in the canvas API.
     */
    rotate(clockwiseRadians: types.NumberArg): this;
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     */
    translate(xy: types.PointArg): this;
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     * [ a c e
     *   b d f
     *   0 0 1 ]
     */
    transform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg, d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    setTransform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg, d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for font in the canvas API.
     */
    font(style: string): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for textAlign in the canvas API.
     */
    textAlign(style: string): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    textBaseline(style: string): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    fillText(text: types.StringArg, xy: types.PointArg, maxWidth?: types.NumberArg): CanvasAnimation;
    /**
     * Dynamic chainable wrapper for drawImage in the canvas API.
     */
    drawImage(img: any, xy: types.PointArg): CanvasAnimation;
    /**
     * * Dynamic chainable wrapper for globalCompositeOperation in the canvas API.
     */
    globalCompositeOperation(operation: string): CanvasAnimation;
    arc(center: types.PointArg, radius: types.NumberArg, radStartAngle: types.NumberArg, radEndAngle: types.NumberArg, counterclockwise?: boolean): this;
}
export declare class PathAnimation extends CanvasAnimation {
}
export declare function strokeStyle(color: types.ColorArg): CanvasAnimation;
export declare function shadowColor(color: types.ColorArg): CanvasAnimation;
export declare function shadowBlur(level: types.NumberArg): CanvasAnimation;
export declare function shadowOffset(xy: types.PointArg): CanvasAnimation;
export declare function lineCap(style: types.StringArg): CanvasAnimation;
export declare function lineJoin(style: types.StringArg): CanvasAnimation;
export declare function lineWidth(width: types.NumberArg): CanvasAnimation;
export declare function miterLimit(limit: types.NumberArg): CanvasAnimation;
export declare function rect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation;
export declare function fillRect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation;
export declare function strokeRect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation;
export declare function clearRect(xy: types.PointArg, width_height: types.PointArg): CanvasAnimation;
export declare function withinPath(inner: CanvasAnimation): PathAnimation;
export declare function stroke(): CanvasAnimation;
export declare function fill(): CanvasAnimation;
export declare function moveTo(xy: types.PointArg): CanvasAnimation;
export declare function lineTo(xy: types.PointArg): CanvasAnimation;
export declare function clip(): CanvasAnimation;
export declare function quadraticCurveTo(control: types.PointArg, end: types.PointArg): CanvasAnimation;
/**
 * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
 */
export declare function bezierCurveTo(control1: types.PointArg, control2: types.PointArg, end: types.PointArg): CanvasAnimation;
/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
export declare function arcTo(tangent1: types.PointArg, tangent2: types.PointArg, radius: types.NumberArg): CanvasAnimation;
/**
 * Dynamic chainable wrapper for scale in the canvas API.
 */
export declare function scale(xy: types.PointArg): CanvasAnimation;
/**
 * Dynamic chainable wrapper for translate in the canvas API.
 * [ a c e
 *   b d f
 *   0 0 1 ]
 */
export declare function transform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg, d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): CanvasAnimation;
/**
 * Dynamic chainable wrapper for setTransform in the canvas API.
 */
export declare function setTransform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg, d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): CanvasAnimation;
