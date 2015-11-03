/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
import Rx = require('rx');
import events = require('./events');
import Parameter = require('./parameter');
export declare var DEBUG_LOOP: boolean;
export declare var DEBUG_THEN: boolean;
export declare var DEBUG_EMIT: boolean;
export declare var DEBUG_EVENTS: boolean;
export declare var DEBUG: boolean;
/**
 * A parameter is used for time varying values to animation functions.
 * Before a parameter is used, the enclosing animation must call init. This returns a function which
 * can be used to find the value of the function for specific values of time. Typically this is done within the
 * animation's closure. For example:
```
function moveTo(
    xy: PointArg
): Animation {
    return draw(
        () => {
            var xy_next = Parameter.from(xy).init(); // init to obtain 'next'

            return function (tick: DrawTick) {
                var xy = xy_next(tick.clock); // use 'next' to get value
                tick.ctx.moveTo(xy[0], xy[1]);
            }
        });
}
```
 *
 */
export interface Parameter<T> extends Parameter.Parameter<T> {
}
/**
 * A css encoded color, e.g. "rgba(255, 125, 32, 0.5)" or "red"
 */
export declare type Color = string;
/**
 * A 2D array of numbers used for representing points or vectors
 */
export declare type Point = [number, number];
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export declare type NumberArg = number | Parameter<number>;
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export declare type PointArg = Point | Parameter<Point>;
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export declare type ColorArg = Color | Parameter<Color>;
/**
 * A literal or a dynamic Parameter alias, used as arguments to animations.
 */
export declare type StringArg = string | Parameter<string>;
/**
 * Each frame an animation is provided a Tick. The tick exposes access to the local animation time, the
 * time delta between the previous frame (dt) and the drawing context. Animators typically use the drawing context
 * directly, and pass the clock onto any time varying parameters.
 */
export declare class Tick {
    ctx: CanvasRenderingContext2D;
    clock: number;
    dt: number;
    events: events.Events;
    constructor(ctx: CanvasRenderingContext2D, clock: number, dt: number, events: events.Events);
}
/**
 * The stream of Tick's an animation is provided with is represented by a reactive extension observable.
 */
export declare type TickStream = Rx.Observable<Tick>;
/**
 * An animation is pipeline that modifies the drawing context found in an animation Tick. Animations can be chained
 * together to create a more complicated Animation. They are composeable,
 *
 * e.g. ```animation1 = Ax.translate([50, 50]).fillStyle("red").fillRect([0,0], [20,20])```
 * is one animation which has been formed from three subanimations.
 *
 * Animations have a lifecycle, they can be finite or infinite in length. You can start temporally compose animations
 * using ```anim1.then(anim2)```, which creates a new animation that plays animation 2 when animation 1 finishes.
 *
 * When an animation is sequenced into the animation pipeline. Its attach method is called which atcually builds the
 * RxJS pipeline. Thus an animation is not live, but really a factory for a RxJS configuration.
 */
export declare class Animation {
    attach: (upstream: TickStream) => TickStream;
    constructor(attach: (upstream: TickStream) => TickStream);
    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     *
     * This allows you to chain custom animations.
     *
     * ```Ax.move(...).pipe(myAnimation());```
     */
    pipe<T extends Animation>(downstream: T): T;
    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     *
     * This allows you to sequence animations temporally.
     * frame1Animation().then(frame2Animation).then(frame3Animation)
     */
    then(follower: Animation): Animation;
    /**
     * Creates an animation that replays the inner animation each time the inner animation completes.
     *
     * The resultant animation is always runs forever while upstream is live. Only a single inner animation
     * plays at a time (unlike emit())
     */
    loop(inner: Animation): Animation;
    /**
     * Creates an animation that sequences the inner animation every time frame.
     *
     * The resultant animation is always runs forever while upstream is live. Multiple inner animations
     * can be playing at the same time (unlike loop)
     */
    emit(inner: Animation): Animation;
    /**
     * Plays all the inner animations at the same time. Parallel completes when all inner animations are over.
     *
     * The canvas states are restored before each fork, so styling and transforms of different child animations do not
     * interact (although obsviously the pixel buffer is affected by each animation)
     */
    parallel(inner_animations: Rx.Observable<Animation> | Animation[]): Animation;
    /**
     * Sequences n copies of the inner animation. Clone completes when all inner animations are over.
     */
    clone(n: number, inner: Animation): Animation;
    tween_linear(from: PointArg, to: PointArg, time: NumberArg): Animation;
    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    take(frames: number): Animation;
    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * You just have to supply a function that does something with the draw tick.
     */
    draw(drawFactory: () => ((tick: Tick) => void)): Animation;
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    strokeStyle(color: ColorArg): Animation;
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    fillStyle(color: ColorArg): Animation;
    /**
     * Dynamic chainable wrapper for shadowColor in the canvas API.
     */
    shadowColor(color: ColorArg): Animation;
    /**
     * Dynamic chainable wrapper for shadowBlur in the canvas API.
     */
    shadowBlur(level: NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for shadowOffsetX and shadowOffsetY in the canvas API.
     */
    shadowOffset(xy: PointArg): Animation;
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
    lineWidth(width: NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    miterLimit(limit: NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    rect(xy: PointArg, width_height: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    fillRect(xy: PointArg, width_height: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for strokeRect in the canvas API.
     */
    strokeRect(xy: PointArg, width_height: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for clearRect in the canvas API.
     */
    clearRect(xy: PointArg, width_height: PointArg): Animation;
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
    moveTo(xy: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    lineTo(xy: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for clip in the canvas API. Use with withinPath.
     */
    clip(): Animation;
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    quadraticCurveTo(control: PointArg, end: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
     */
    bezierCurveTo(control1: PointArg, control2: PointArg, end: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    arc(center: PointArg, radius: NumberArg, radStartAngle: NumberArg, radEndAngle: NumberArg, counterclockwise?: boolean): Animation;
    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    arcTo(tangent1: PointArg, tangent2: PointArg, radius: NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    scale(xy: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for rotate in the canvas API.
     */
    rotate(rads: NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     */
    translate(xy: PointArg): Animation;
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     * [ a c e
     *   b d f
     *   0 0 1 ]
     */
    transform(a: NumberArg, b: NumberArg, c: NumberArg, d: NumberArg, e: NumberArg, f: NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    setTransform(a: NumberArg, b: NumberArg, c: NumberArg, d: NumberArg, e: NumberArg, f: NumberArg): Animation;
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
    fillText(text: StringArg, xy: PointArg, maxWidth?: NumberArg): Animation;
    /**
     * Dynamic chainable wrapper for drawImage in the canvas API.
     */
    drawImage(img: any, xy: PointArg): Animation;
    /**
     * * Dynamic chainable wrapper for globalCompositeOperation in the canvas API.
     */
    globalCompositeOperation(operation: string): Animation;
    /**
     * translates the drawing context by velocity * tick.clock
     */
    velocity(vector: PointArg): Animation;
    glow(decay: NumberArg): Animation;
}
export declare class Animator {
    ctx: CanvasRenderingContext2D;
    root: Rx.Subject<Tick>;
    t: number;
    events: events.Events;
    constructor(ctx: CanvasRenderingContext2D);
    tick(dt: number): void;
    ticker(dts: Rx.Observable<number>): void;
    play(animation: Animation): Rx.IDisposable;
    mousedown(x: number, y: number): void;
    mouseup(x: number, y: number): void;
    /**
     * Attaches listener for a canvas which will be propogated during ticks to animators that take input, e.g. UI
     */
    registerEvents(canvas: any): void;
}
/**
 * NOTE: currently fails if the streams are different lengths
 * @param expectedDt the expected clock tick values
 * @param after
 * @returns {Animation}
 */
export declare function assertDt(expectedDt: Rx.Observable<number>): Animation;
export declare function assertClock(assertClock: number[]): Animation;
/**
 * Creates a new Animation by piping the animation flow of A into B
 */
export declare function combine<T extends Animation>(a: Animation, b: T): T;
/**
 * plays several animations, finishes when they are all done.
 * @param animations
 * @returns {Animation}
 * todo: I think there are lots of bugs when an animation stops part way
 * I think it be better if this spawned its own Animator to handle ctx restores
 */
export declare function parallel(animations: Rx.Observable<Animation> | Animation[]): Animation;
export declare class PathAnimation extends Animation {
}
export declare function clone(n: number, animation: Animation): Animation;
/**
 * The child animation is started every frame
 * @param animation
 */
export declare function emit(animation: Animation): Animation;
/**
 * When the child loop finishes, it is spawned
 * @param animation
 * @returns {Animation}
 */
export declare function loop(animation: Animation): Animation;
export declare function draw(drawFactory: () => ((tick: Tick) => void)): Animation;
export declare function translate(delta: PointArg): Animation;
export declare function globalCompositeOperation(composite_mode: string): Animation;
export declare function velocity(velocity: PointArg): Animation;
export declare function tween_linear(from: PointArg, to: PointArg, time: NumberArg): Animation;
export declare function fillStyle(color: ColorArg): Animation;
export declare function strokeStyle(color: ColorArg): Animation;
export declare function shadowColor(color: ColorArg): Animation;
export declare function shadowBlur(level: NumberArg): Animation;
export declare function shadowOffset(xy: PointArg): Animation;
export declare function lineCap(style: StringArg): Animation;
export declare function lineJoin(style: StringArg): Animation;
export declare function lineWidth(width: NumberArg): Animation;
export declare function miterLimit(limit: NumberArg): Animation;
export declare function rect(xy: PointArg, width_height: PointArg): Animation;
export declare function fillRect(xy: PointArg, width_height: PointArg): Animation;
export declare function strokeRect(xy: PointArg, width_height: PointArg): Animation;
export declare function clearRect(xy: PointArg, width_height: PointArg): Animation;
export declare function withinPath(inner: Animation): PathAnimation;
export declare function stroke(): Animation;
export declare function fill(): Animation;
export declare function moveTo(xy: PointArg): Animation;
export declare function lineTo(xy: PointArg): Animation;
export declare function clip(): Animation;
export declare function quadraticCurveTo(control: PointArg, end: PointArg): Animation;
/**
 * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
 */
export declare function bezierCurveTo(control1: PointArg, control2: PointArg, end: PointArg): Animation;
/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
export declare function arc(center: PointArg, radius: NumberArg, radStartAngle: NumberArg, radEndAngle: NumberArg, counterclockwise?: boolean): Animation;
/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
export declare function arcTo(tangent1: PointArg, tangent2: PointArg, radius: NumberArg): Animation;
/**
 * Dynamic chainable wrapper for scale in the canvas API.
 */
export declare function scale(xy: PointArg): Animation;
/**
 * Dynamic chainable wrapper for rotate in the canvas API.
 */
export declare function rotate(rads: NumberArg): Animation;
/**
 * Dynamic chainable wrapper for translate in the canvas API.
 * [ a c e
 *   b d f
 *   0 0 1 ]
 */
export declare function transform(a: NumberArg, b: NumberArg, c: NumberArg, d: NumberArg, e: NumberArg, f: NumberArg): Animation;
/**
 * Dynamic chainable wrapper for setTransform in the canvas API.
 */
export declare function setTransform(a: NumberArg, b: NumberArg, c: NumberArg, d: NumberArg, e: NumberArg, f: NumberArg): Animation;
/**
 * Dynamic chainable wrapper for font in the canvas API.
 */
export declare function font(style: StringArg): Animation;
/**
 * Dynamic chainable wrapper for textAlign in the canvas API.
 */
export declare function textAlign(style: StringArg): Animation;
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
export declare function textBaseline(style: string): Animation;
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
export declare function fillText(text: StringArg, xy: PointArg, maxWidth?: NumberArg): Animation;
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
export declare function drawImage(img: any, xy: PointArg): Animation;
export declare function glow(decay?: NumberArg): Animation;
export declare function take(frames: number): Animation;
export declare function save(width: number, height: number, path: string): Animation;
