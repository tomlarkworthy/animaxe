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
export declare class Animation extends OT.ObservableTransformer<CanvasTick> {
    attach: (upstream: Rx.Observable<CanvasTick>) => Rx.Observable<CanvasTick>;
    constructor(attach: (upstream: Rx.Observable<CanvasTick>) => Rx.Observable<CanvasTick>);
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    strokeStyle(color: types.ColorArg): Animation;
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    fillStyle(color: types.ColorArg): Animation;
    /**
     * Dynamic chainable wrapper for shadowColor in the canvas API.
     */
    shadowColor(color: types.ColorArg): Animation;
    /**
     * Dynamic chainable wrapper for shadowBlur in the canvas API.
     */
    shadowBlur(level: types.NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for shadowOffsetX and shadowOffsetY in the canvas API.
     */
    shadowOffset(xy: types.PointArg): Animation;
    /**
     * Dynamic chainable wrapper for lineCap in the canvas API.
     */
    lineCap(style: string): Animation;
    /**
     * Dynamic chainable wrapper for lineJoin in the canvas API.
     */
    lineJoin(style: string): Animation;
    /**
     * Dynamic chainable wrapper for lineWidth in the canvas API.
     */
    lineWidth(width: types.NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    miterLimit(limit: types.NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    rect(xy: types.PointArg, width_height: types.PointArg): Animation;
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    fillRect(xy: types.PointArg, width_height: types.PointArg): Animation;
    /**
     * Dynamic chainable wrapper for strokeRect in the canvas API.
     */
    strokeRect(xy: types.PointArg, width_height: types.PointArg): Animation;
    /**
     * Dynamic chainable wrapper for clearRect in the canvas API.
     */
    clearRect(xy: types.PointArg, width_height: types.PointArg): Animation;
    /**
     * Encloses the inner animation with a beginpath() and endpath() from the canvas API.
     *
     * This returns a path object which events can be subscribed to
     */
    withinPath(inner: Animation): PathAnimation;
    /**
     * Dynamic chainable wrapper for fill in the canvas API. Use with withinPath.
     */
    fill(): Animation;
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    stroke(): Animation;
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API. Use with withinPath.
     */
    moveTo(xy: types.PointArg): Animation;
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    lineTo(xy: types.PointArg): Animation;
    /**
     * Dynamic chainable wrapper for clip in the canvas API. Use with withinPath.
     */
    clip(): Animation;
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    quadraticCurveTo(control: types.PointArg, end: types.PointArg): Animation;
    /**
     * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
     */
    bezierCurveTo(control1: types.PointArg, control2: types.PointArg, end: types.PointArg): Animation;
    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    arcTo(tangent1: types.PointArg, tangent2: types.PointArg, radius: types.NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    scale(xy: types.PointArg): Animation;
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
    transform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg, d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    setTransform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg, d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for font in the canvas API.
     */
    font(style: string): Animation;
    /**
     * Dynamic chainable wrapper for textAlign in the canvas API.
     */
    textAlign(style: string): Animation;
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    textBaseline(style: string): Animation;
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    fillText(text: types.StringArg, xy: types.PointArg, maxWidth?: types.NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for drawImage in the canvas API.
     */
    drawImage(img: any, xy: types.PointArg): Animation;
    /**
     * * Dynamic chainable wrapper for globalCompositeOperation in the canvas API.
     */
    globalCompositeOperation(operation: string): Animation;
    arc(center: types.PointArg, radius: types.NumberArg, radStartAngle: types.NumberArg, radEndAngle: types.NumberArg, counterclockwise?: boolean): this;
}
export declare function create(attach?: (upstream: Rx.Observable<CanvasTick>) => Rx.Observable<CanvasTick>): Animation;
export declare class PathAnimation extends Animation {
}
export declare function strokeStyle(color: types.ColorArg): Animation;
export declare function shadowColor(color: types.ColorArg): Animation;
export declare function shadowBlur(level: types.NumberArg): Animation;
export declare function shadowOffset(xy: types.PointArg): Animation;
export declare function lineCap(style: types.StringArg): Animation;
export declare function lineJoin(style: types.StringArg): Animation;
export declare function lineWidth(width: types.NumberArg): Animation;
export declare function miterLimit(limit: types.NumberArg): Animation;
export declare function rect(xy: types.PointArg, width_height: types.PointArg): Animation;
export declare function fillRect(xy: types.PointArg, width_height: types.PointArg): Animation;
export declare function strokeRect(xy: types.PointArg, width_height: types.PointArg): Animation;
export declare function clearRect(xy: types.PointArg, width_height: types.PointArg): Animation;
export declare function withinPath(inner: Animation): PathAnimation;
export declare function stroke(): Animation;
export declare function fill(): Animation;
export declare function moveTo(xy: types.PointArg): Animation;
export declare function lineTo(xy: types.PointArg): Animation;
export declare function clip(): Animation;
export declare function quadraticCurveTo(control: types.PointArg, end: types.PointArg): Animation;
/**
 * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
 */
export declare function bezierCurveTo(control1: types.PointArg, control2: types.PointArg, end: types.PointArg): Animation;
/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
export declare function arcTo(tangent1: types.PointArg, tangent2: types.PointArg, radius: types.NumberArg): Animation;
/**
 * Dynamic chainable wrapper for scale in the canvas API.
 */
export declare function scale(xy: types.PointArg): Animation;
/**
 * Dynamic chainable wrapper for translate in the canvas API.
 * [ a c e
 *   b d f
 *   0 0 1 ]
 */
export declare function transform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg, d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): Animation;
/**
 * Dynamic chainable wrapper for setTransform in the canvas API.
 */
export declare function setTransform(a: types.NumberArg, b: types.NumberArg, c: types.NumberArg, d: types.NumberArg, e: types.NumberArg, f: types.NumberArg): Animation;
export declare function save(width: number, height: number, path: string): Animation;