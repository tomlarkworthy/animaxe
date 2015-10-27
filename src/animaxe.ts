/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
import Rx = require('rx');
import Parameter = require('./parameter');

export var DEBUG_LOOP = false;
export var DEBUG_THEN = false;
export var DEBUG_EMIT = false;
export var DEBUG = false;

console.log("Animaxe, https://github.com/tomlarkworthy/animaxe");

export interface Parameter<T> extends Parameter.Parameter<T> {}

// todo we should move these into an ES6 module but my IDE does not support it yet
export type Color = string
export type Point     = [number, number]
export type NumberArg = number | Parameter<number>
export type PointArg  = Point | Parameter<Point>
export type ColorArg  = Color | Parameter<Color>
export type StringArg = string | Parameter<string>


/**
 * Animators are updated with a DrawTick, which provides the local animation time, the
 */
export class DrawTick {
    constructor (public ctx: CanvasRenderingContext2D, public clock: number, public dt: number) {}
}

export type DrawStream = Rx.Observable<DrawTick>;


function assert(predicate: boolean, message ?: string) {
    if (!predicate) {
        console.error(stackTrace());
        throw new Error();
    }
}

function stackTrace() {
    var err = new Error();
    return (<any>err).stack;
}


export class Animation {

    constructor(public _attach: (upstream: DrawStream) => DrawStream, public after?: Animation) {
    }
    attach(upstream: DrawStream): DrawStream {
        var processed = this._attach(upstream);
        return this.after? this.after.attach(processed): processed;
    }

    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     * This allows you to chain custom animation.
     * Ax.move(...).pipe(myAnimation());
     */
    pipe(downstream: Animation): Animation {
        return combine2(this, downstream);
    }

    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     * This allows you to sequence animations temporally.
     * frame1Animation().then(frame2Animation).then(frame3Animation)
     */
    then(follower: Animation): Animation {
        var self = this;

        return new Animation(function (prev: DrawStream) : DrawStream {
            return Rx.Observable.create<DrawTick>(function (observer) {
                var first  = new Rx.Subject<DrawTick>();
                var second = new Rx.Subject<DrawTick>();

                var firstTurn = true;

                var current = first;
                if (DEBUG_THEN) console.log("then: attach");

                var secondAttach = null;

                var firstAttach  = self.attach(first.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(
                    function(next) {
                        if (DEBUG_THEN) console.log("then: first to downstream");
                        observer.onNext(next);
                    },
                    observer.onError.bind(observer),
                    function(){
                        if (DEBUG_THEN) console.log("then: first complete");
                        firstTurn = false;

                        secondAttach = follower.attach(second.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(
                            function(next) {
                                if (DEBUG_THEN) console.log("then: second to downstream");
                                observer.onNext(next);
                            },
                            observer.onError.bind(observer),
                            function(){
                                if (DEBUG_THEN) console.log("then: second complete");
                                observer.onCompleted()
                            }

                        );
                    }
                );

                var prevSubscription = prev.subscribeOn(Rx.Scheduler.immediate).subscribe(
                    function(next) {
                        if (DEBUG_THEN) console.log("then: upstream to first OR second");
                        if (firstTurn) {
                            first.onNext(next);
                        } else {
                            second.onNext(next);
                        }
                    },
                    observer.onError,
                    function () {
                        if (DEBUG_THEN) console.log("then: upstream complete");
                        observer.onCompleted();
                    }
                );
                // on dispose
                return function () {
                    if (DEBUG_THEN) console.log("then: disposer");
                    prevSubscription.dispose();
                    firstAttach.dispose();
                    if (secondAttach)
                        secondAttach.dispose();
                };
            }).subscribeOn(Rx.Scheduler.immediate); //todo remove subscribeOns
        });
    }
    /**
     * Creates an animation that replays the inner animation each time the inner animation completes.
     * The resultant animation is always runs forever while upstream is live. Only a single inner animation
     * plays at a time (unlike emit())
     */
    loop(inner: Animation): Animation {
        return this.pipe(loop(inner));
    }
    /**
     * Creates an animation that sequences the inner animation every time frame
     * The resultant animation is always runs forever while upstream is live. Multiple inner animations
     * can be playing at the same time (unlike loop)
     */
    emit(inner: Animation): Animation {
        return this.pipe(emit(inner));
    }

    /**
     * Plays all the inner animations at the same time. Parallel completes when all inner animations are over.
     * The canvas states are restored each time, so styling and transforms of different animations do not
     * affect each other (although obsviously the pixel buffer is affected by each animation)
     */
    parallel(inner_animations: Rx.Observable<Animation> | Animation[]): Animation {
        return this.pipe(parallel(inner_animations));
    }

    /**
     * Sequences n copies of the inner animation. Clone completes when all inner animations are over.
     */
    clone(n: number, inner: Animation): Animation {
        return this.pipe(clone(n, inner));
    }

    tween_linear(
        from: PointArg,
        to:   PointArg,
        time: NumberArg): Animation {
        return this.pipe(tween_linear(from, to, time));
    }

    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    take(frames: number): Animation {
        return this.pipe(take(frames));
    }

    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * You just have to supply a function that does something with the draw tick.
     */
    draw(drawFactory: () => ((tick: DrawTick) => void)): Animation {
        return this.pipe(draw(drawFactory));
    }

    // Canvas API
    /**
     * Dynamic chainable wrapper for strokeStyle in the canvas API.
     */
    strokeStyle(color: ColorArg): Animation {
        return this.pipe(strokeStyle(color));
    }
    /**
     * Dynamic chainable wrapper for fillStyle in the canvas API.
     */
    fillStyle(color: ColorArg): Animation {
        return this.pipe(fillStyle(color));
    }
    /**
     * Dynamic chainable wrapper for shadowColor in the canvas API.
     */
    shadowColor(color: ColorArg): Animation {
        return this.pipe(shadowColor(color));
    }
    /**
     * Dynamic chainable wrapper for shadowBlur in the canvas API.
     */
    shadowBlur(level: NumberArg): Animation {
        return this.pipe(shadowBlur(level));
    }
    /**
     * Dynamic chainable wrapper for shadowOffsetX and shadowOffsetY in the canvas API.
     */
    shadowOffset(xy: PointArg): Animation {
        return this.pipe(shadowOffset(xy));
    }
    /**
     * Dynamic chainable wrapper for lineCap in the canvas API.
     */
    lineCap(style: string): Animation {
        return this.pipe(lineCap(style));
    }
    /**
     * Dynamic chainable wrapper for lineJoin in the canvas API.
     */
    lineJoin(style: string): Animation {
        return this.pipe(lineJoin(style));
    }
    /**
     * Dynamic chainable wrapper for lineWidth in the canvas API.
     */
    lineWidth(width: NumberArg): Animation {
        return this.pipe(lineWidth(width));
    }
    /**
     * Dynamic chainable wrapper for miterLimit in the canvas API.
     */
    miterLimit(limit: NumberArg): Animation {
        return this.pipe(miterLimit(limit));
    }
    /**
     * Dynamic chainable wrapper for rect in the canvas API.
     */
    rect(xy: PointArg, width_height: PointArg): Animation {
        return this.pipe(rect(xy, width_height));
    }
    /**
     * Dynamic chainable wrapper for fillRect in the canvas API.
     */
    fillRect(xy: PointArg, width_height: PointArg): Animation {
        return this.pipe(fillRect(xy, width_height));
    }
    /**
     * Dynamic chainable wrapper for strokeRect in the canvas API.
     */
    strokeRect(xy: PointArg, width_height: PointArg): Animation {
        return this.pipe(strokeRect(xy, width_height));
    }
    /**
     * Dynamic chainable wrapper for clearRect in the canvas API.
     */
    clearRect(xy: PointArg, width_height: PointArg): Animation {
        return this.pipe(clearRect(xy, width_height));
    }
    /**
     * Encloses the inner animation with a beginpath() and endpath() from the canvas API.
     */
    withinPath(inner: Animation): Animation {
        return this.pipe(withinPath(inner));
    }
    /**
     * Dynamic chainable wrapper for fill in the canvas API. Use with withinPath.
     */
    fill(): Animation {
        return this.pipe(fill());
    }
    /**
     * Dynamic chainable wrapper for stroke in the canvas API.
     */
    stroke(): Animation {
        return this.pipe(stroke());
    }
    /**
     * Dynamic chainable wrapper for moveTo in the canvas API. Use with withinPath.
     */
    moveTo(xy: PointArg): Animation {
        return this.pipe(moveTo(xy));
    }
    /**
     * Dynamic chainable wrapper for lineTo in the canvas API. Use with withinPath.
     */
    lineTo(xy: PointArg): Animation {
        return this.pipe(lineTo(xy));
    }
    /**
     * Dynamic chainable wrapper for clip in the canvas API. Use with withinPath.
     */
    clip(): Animation {
        return this.pipe(clip());
    }
    /**
     * Dynamic chainable wrapper for quadraticCurveTo in the canvas API. Use with withinPath.
     */
    quadraticCurveTo(control: PointArg, end: PointArg): Animation {
        return this.pipe(quadraticCurveTo(control, end));
    }
    /**
     * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
     */
    bezierCurveTo(control1: PointArg, control2: PointArg, end: PointArg): Animation {
        return this.pipe(bezierCurveTo(control1, control2, end));
    }
    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    arc(center: PointArg, radius: NumberArg,
        radStartAngle: NumberArg, radEndAngle: NumberArg,
        counterclockwise?: boolean): Animation {
        return this.pipe(arc(center, radius, radStartAngle, radEndAngle, counterclockwise));
    }

    /**
     * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
     */
    arcTo(tangent1: PointArg, tangent2: PointArg, radius: NumberArg): Animation {
        return this.pipe(arcTo(tangent1, tangent2, radius));
    }
    /**
     * Dynamic chainable wrapper for scale in the canvas API.
     */
    scale(xy: PointArg): Animation {
        return this.pipe(scale(xy));
    }
    /**
     * Dynamic chainable wrapper for rotate in the canvas API.
     */
    rotate(rads: NumberArg): Animation {
        return this.pipe(rotate(rads));
    }
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     */
    translate(xy: PointArg): Animation {
        return this.pipe(translate(xy));
    }
    /**
     * Dynamic chainable wrapper for translate in the canvas API.
     * [ a c e
     *   b d f
     *   0 0 1 ]
     */
    transform(a: NumberArg, b: NumberArg, c: NumberArg,
              d: NumberArg, e: NumberArg, f: NumberArg): Animation {
        return this.pipe(transform(a,b,c,d,e,f));
    }
    /**
     * Dynamic chainable wrapper for setTransform in the canvas API.
     */
    setTransform(a: NumberArg, b: NumberArg, c: NumberArg,
                 d: NumberArg, e: NumberArg, f: NumberArg): Animation {
        return this.pipe(setTransform(a,b,c,d,e,f));
    }
    /**
     * Dynamic chainable wrapper for font in the canvas API.
     */
    font(style: string): Animation {
        return this.pipe(font(style));
    }
    /**
     * Dynamic chainable wrapper for textAlign in the canvas API.
     */
    textAlign(style: string): Animation {
        return this.pipe(textAlign(style));
    }
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    textBaseline(style: string): Animation {
        return this.pipe(textBaseline(style));
    }
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    fillText(text: StringArg, xy: PointArg, maxWidth?: NumberArg): Animation {
        return this.pipe(fillText(text, xy, maxWidth));
    }
    /**
     * Dynamic chainable wrapper for textBaseline in the canvas API.
     */
    drawImage(img, xy: PointArg): Animation {
        return this.pipe(drawImage(img, xy));
    }
    /**
     * * Dynamic chainable wrapper for globalCompositeOperation in the canvas API.
     */
    globalCompositeOperation(operation: string): Animation {
        return this.pipe(globalCompositeOperation(operation));
    }
    // End Canvas API


    /**
     * translates the drawing context by velocity * tick.clock
     */
    velocity(vector: PointArg): Animation {
        return this.pipe(velocity(vector));
    }

    glow(decay: NumberArg): Animation {
        return this.pipe(glow(decay));
    }

}

export class Animator {
    tickerSubscription: Rx.Disposable = null;
    root: Rx.Subject<DrawTick>;
    animationSubscriptions: Rx.IDisposable[] = [];
    t: number = 0;

    constructor(public ctx: CanvasRenderingContext2D) {
        this.root = new Rx.Subject<DrawTick>()
    }
    ticker(tick: Rx.Observable<number>): void {
        var self = this;

        this.tickerSubscription = tick.map(function(dt: number) { //map the ticker onto any -> context
            var tick = new DrawTick(self.ctx, self.t, dt);
            self.t += dt;
            return tick;
        }).subscribe(this.root);
    }
    play (animation: Animation): void {
        var self = this;
        if (DEBUG) console.log("animator: play");
        var saveBeforeFrame = this.root.tapOnNext(function(tick){
            if (DEBUG) console.log("animator: ctx save");
            tick.ctx.save();
        });
        var doAnimation = animation.attach(saveBeforeFrame);
        var restoreAfterFrame = doAnimation.tap(
            function(tick){
                if (DEBUG) console.log("animator: ctx next restore");
                tick.ctx.restore();
            },function(err){
                if (DEBUG) console.log("animator: ctx err restore", err);
                self.ctx.restore();
            },function(){
                self.ctx.restore();
            });
        this.animationSubscriptions.push(
            restoreAfterFrame.subscribe()
        );
    }
}


/**
 * NOTE: currently fails if the streams are different lengths
 * @param expectedDt the expected clock tick values
 * @param after
 * @returns {Animation}
 */
export function assertDt(expectedDt: Rx.Observable<number>, after?: Animation): Animation {
    return new Animation(function(upstream) {
        return upstream.zip(expectedDt, function(tick: DrawTick, expectedDtValue: number) {
            if (tick.dt != expectedDtValue) throw new Error("unexpected dt observed: " + tick.dt + ", expected:" + expectedDtValue);
            return tick;
        });
    }, after);
}

//todo would be nice if this took an iterable or some other type of simple pull stream
// and used streamEquals
export function assertClock(assertClock: number[], after?: Animation): Animation {
    var index = 0;

    return new Animation(function(upstream) {
        return upstream.tapOnNext(function(tick: DrawTick) {
            if (DEBUG) console.log("assertClock: ", tick);
            if (tick.clock < assertClock[index] - 0.00001 || tick.clock > assertClock[index] + 0.00001) {
                var errorMsg = "unexpected clock observed: " + tick.clock + ", expected:" + assertClock[index]
                console.log(errorMsg);
                throw new Error(errorMsg);
            }
            index ++;
        });
    }, after);
}

/**
 * Creates a new Animation by piping the animation flow of A into B
 */
export function combine2(a: Animation, b: Animation) {
    return new Animation(
        (upstream: DrawStream) => {
            return b.attach(a.attach(upstream));
        }
    );
}

/**
 * plays several animations, finishes when they are all done.
 * @param animations
 * @returns {Animation}
 * todo: I think there are lots of bugs when an animation stops part way
 * I think it be better if this spawned its own Animator to handle ctx restores
 */
export function parallel(
    animations: Rx.Observable<Animation> | Animation[]
): Animation
{
    return new Animation(function (prev: DrawStream): DrawStream {
        if (DEBUG_EMIT) console.log("parallel: initializing");

        var activeAnimations = 0;
        var attachPoint = new Rx.Subject<DrawTick>();

        function decrementActive() {
            if (DEBUG_EMIT) console.log("parallel: decrement active");
            activeAnimations --;
        }

        animations.forEach(function(animation: Animation) {
            activeAnimations++;
            animation.attach(attachPoint.tapOnNext(tick => tick.ctx.save())).subscribe(
                    tick => tick.ctx.restore(),
                decrementActive,
                decrementActive)
        });

        return prev.takeWhile(() => activeAnimations > 0).tapOnNext(function(tick: DrawTick) {
                if (DEBUG_EMIT) console.log("parallel: emitting, animations", tick);
                attachPoint.onNext(tick);
                if (DEBUG_EMIT) console.log("parallel: emitting finished");
            }
        );
    });
}

export function clone(
    n: number, // todo make dynamic
    animation: Animation
): Animation {
    return parallel(Rx.Observable.return(animation).repeat(n));
}

/**
 * The child animation is started every frame
 * @param animation
 */
export function emit(
    animation: Animation
): Animation
{
    return new Animation(function (prev: DrawStream): DrawStream {
        if (DEBUG_EMIT) console.log("emit: initializing");
        var attachPoint = new Rx.Subject<DrawTick>();

        return prev.tapOnNext(function(tick: DrawTick) {
                if (DEBUG_EMIT) console.log("emit: emmitting", animation);
                animation.attach(attachPoint).subscribe();
                attachPoint.onNext(tick);
            }
        );
    });
}


/**
 * When the child loop finishes, it is spawned
 * @param animation
 * @returns {Animation}
 */
export function loop(
    animation: Animation
): Animation
{
    return new Animation(function (prev: DrawStream): DrawStream {
        if (DEBUG_LOOP) console.log("loop: initializing");


        return Rx.Observable.create<DrawTick>(function(observer) {
            if (DEBUG_LOOP) console.log("loop: create new loop");
            var loopStart = null;
            var loopSubscription = null;
            var t = 0;

            function attachLoop(next) { //todo I feel like we can remove a level from this somehow
                if (DEBUG_LOOP) console.log("loop: new inner loop starting at", t);

                loopStart = new Rx.Subject<DrawTick>();

                loopSubscription = animation.attach(loopStart).subscribe(
                    function(next) {
                        if (DEBUG_LOOP) console.log("loop: post-inner loop to downstream");
                        observer.onNext(next);
                    },
                    function(err) {
                        if (DEBUG_LOOP) console.log("loop: post-inner loop err to downstream");
                        observer.onError(err);
                    },
                    function() {
                        if (DEBUG_LOOP) console.log("loop: post-inner completed");
                        loopStart = null;
                    }
                );
                if (DEBUG_LOOP) console.log("loop: new inner loop finished construction")
            }

            prev.subscribe(
                function(next) {
                    if (loopStart == null) {
                        if (DEBUG_LOOP) console.log("loop: no inner loop");
                        attachLoop(next);
                    }
                    if (DEBUG_LOOP) console.log("loop: upstream to inner loop");
                    loopStart.onNext(next);

                    t += next.dt;
                },
                function(err){
                    if (DEBUG_LOOP) console.log("loop: upstream error to downstream", err);
                    observer.onError(err);
                },
                observer.onCompleted.bind(observer)
            );

            return function() {
                //dispose
                if (DEBUG_LOOP) console.log("loop: dispose");
                if (loopStart) loopStart.dispose();
            }
        }).subscribeOn(Rx.Scheduler.immediate);
    });
}

export function draw(
    drawFactory: () => ((tick: DrawTick) => void),
    after?: Animation
): Animation
{
    return new Animation(function (previous: DrawStream): DrawStream {
        var draw: (tick: DrawTick) => void = drawFactory();
        return previous.tapOnNext(draw);
    }, after);
}

export function translate(
    delta: PointArg,
    animation?: Animation
): Animation {
    if (DEBUG) console.log("translate: attached");
    return draw(
        () => {
            var point_next = Parameter.from(delta).init();
            return function(tick) {
                var point = point_next(tick.clock);
                if (DEBUG) console.log("translate:", point);
                tick.ctx.translate(point[0], point[1]);
                return tick;
            }
        }
    , animation);
}

export function globalCompositeOperation(
    composite_mode: string,
    animation?: Animation
): Animation {
    return draw(
        () => {
            return function(tick) {
                tick.ctx.globalCompositeOperation = composite_mode;
            }
        }
    , animation);
}


export function velocity(
    velocity: PointArg,
    animation?: Animation
): Animation {
    if (DEBUG) console.log("velocity: attached");
    return draw(
        () => {
            var pos: Point = [0.0,0.0];
            var velocity_next = Parameter.from(velocity).init();
            return function(tick) {
                tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
                var velocity = velocity_next(tick.clock);
                pos[0] += velocity[0] * tick.dt;
                pos[1] += velocity[1] * tick.dt;
            }
        }, animation);
}

export function tween_linear(
    from: PointArg,
    to:   PointArg,
    time: NumberArg,
    animation?: Animation /* copies */
): Animation
{
    return new Animation(function(prev: DrawStream): DrawStream {
        var t = 0;
        var from_next = Parameter.from(from).init();
        var to_next   = Parameter.from(to).init();
        var time_next   = Parameter.from(time).init();
        return prev.map(function(tick: DrawTick) {
            if (DEBUG) console.log("tween: inner");
            var from = from_next(tick.clock);
            var to   = to_next(tick.clock);
            var time = time_next(tick.clock);

            t = t + tick.dt;
            if (t > time) t = time;
            var x = from[0] + (to[0] - from[0]) * t / time;
            var y = from[1] + (to[1] - from[1]) * t / time;
            tick.ctx.transform(1, 0, 0, 1, x, y);
            return tick;
        }).takeWhile(function(tick) {return t < time;})
    }, animation);
}

export function fillStyle(
    color: ColorArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("fillStyle: attach");
            var color_next = Parameter.from(color).init();
            return function (tick: DrawTick) {
                var color = color_next(tick.clock);
                if (DEBUG) console.log("fillStyle: fillStyle", color);
                tick.ctx.fillStyle = color;
            }
        }, animation);
}


export function strokeStyle(
    color: ColorArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("strokeStyle: attach");
            var color_next = Parameter.from(color).init();
            return function (tick: DrawTick) {
                var color = color_next(tick.clock);
                if (DEBUG) console.log("strokeStyle: strokeStyle", color);
                tick.ctx.strokeStyle = color;
            }
        }, animation);
}

export function shadowColor(
    color: ColorArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("shadowColor: attach");
            var color_next = Parameter.from(color).init();
            return function (tick: DrawTick) {
                var color = color_next(tick.clock);
                if (DEBUG) console.log("shadowColor: shadowColor", color);
                tick.ctx.shadowColor = color;
            }
        }, animation);
}
export function shadowBlur(
    level: NumberArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("shadowBlur: attach");
            var level_next = Parameter.from(level).init();
            return function (tick: DrawTick) {
                var level = level_next(tick.clock);
                if (DEBUG) console.log("shadowBlur: shadowBlur", level);
                tick.ctx.shadowBlur = level;
            }
        }, animation);
}


export function shadowOffset(
    xy: PointArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("shadowOffset: attach");
            var xy_next = Parameter.from(xy).init();
            return function (tick: DrawTick) {
                var xy = xy_next(tick.clock);
                if (DEBUG) console.log("shadowOffset: shadowBlur", xy);
                tick.ctx.shadowOffsetX = xy[0];
                tick.ctx.shadowOffsetY = xy[1];
            }
        }, animation);
}

export function lineCap(
    style: StringArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("lineCap: attach");
            var arg_next = Parameter.from(style).init();
            return function (tick: DrawTick) {
                var arg = arg_next(tick.clock);
                if (DEBUG) console.log("lineCap: lineCap", arg);
                tick.ctx.lineCap = arg;
            }
        }, animation);
}
export function lineJoin(
    style: StringArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("lineJoin: attach");
            var arg_next = Parameter.from(style).init();
            return function (tick: DrawTick) {
                var arg = arg_next(tick.clock);
                if (DEBUG) console.log("lineJoin: lineCap", arg);
                tick.ctx.lineJoin = arg;
            }
        }, animation);
}

export function lineWidth(
    width: NumberArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("lineWidth: attach");
            var width_next = Parameter.from(width).init();
            return function (tick: DrawTick) {
                var width = width_next(tick.clock);
                if (DEBUG) console.log("lineWidth: lineWidth", width);
                tick.ctx.lineWidth = width;
            }
        }, animation);
}

export function miterLimit(
    limit: NumberArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("miterLimit: attach");
            var arg_next = Parameter.from(limit).init();
            return function (tick: DrawTick) {
                var arg = arg_next(tick.clock);
                if (DEBUG) console.log("miterLimit: miterLimit", arg);
                tick.ctx.miterLimit = arg;
            }
        }, animation);
}


export function rect(
    xy: PointArg,
    width_height: PointArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("rect: attach");
            var xy_next = Parameter.from(xy).init();
            var width_height_next = Parameter.from(width_height).init();

            return function (tick: DrawTick) {
                var xy: Point = xy_next(tick.clock);
                var width_height: Point = width_height_next(tick.clock);
                if (DEBUG) console.log("rect: rect", xy, width_height);
                tick.ctx.rect(xy[0], xy[1], width_height[0], width_height[1]);
            }
        }, animation);
}

export function fillRect(
    xy: PointArg,
    width_height: PointArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("fillRect: attach");
            var xy_next = Parameter.from(xy).init();
            var width_height_next = Parameter.from(width_height).init();

            return function (tick: DrawTick) {
                var xy: Point = xy_next(tick.clock);
                var width_height: Point = width_height_next(tick.clock);
                if (DEBUG) console.log("fillRect: fillRect", xy, width_height);
                tick.ctx.fillRect(xy[0], xy[1], width_height[0], width_height[1]);
            }
        }, animation);
}

export function strokeRect(
    xy: PointArg,
    width_height: PointArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("strokeRect: attach");
            var xy_next = Parameter.from(xy).init();
            var width_height_next = Parameter.from(width_height).init();

            return function (tick: DrawTick) {
                var xy: Point = xy_next(tick.clock);
                var width_height: Point = width_height_next(tick.clock);
                if (DEBUG) console.log("strokeRect: strokeRect", xy, width_height);
                tick.ctx.strokeRect(xy[0], xy[1], width_height[0], width_height[1]);
            }
        }, animation);
}
export function clearRect(
    xy: PointArg,
    width_height: PointArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("clearRect: attach");
            var xy_next = Parameter.from(xy).init();
            var width_height_next = Parameter.from(width_height).init();

            return function (tick: DrawTick) {
                var xy: Point = xy_next(tick.clock);
                var width_height: Point = width_height_next(tick.clock);
                if (DEBUG) console.log("clearRect: clearRect", xy, width_height);
                tick.ctx.clearRect(xy[0], xy[1], width_height[0], width_height[1]);
            }
        }, animation);
}


export function withinPath(
    inner: Animation
): Animation {
    return new Animation(
        (upstream: DrawStream) => {
            if (DEBUG) console.log("withinPath: attach");
            var beginPathBeforeInner = upstream.tapOnNext((tick: DrawTick) => tick.ctx.beginPath());
            return inner.attach(beginPathBeforeInner).tapOnNext((tick: DrawTick) => tick.ctx.closePath())
        });
}

export function stroke(
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("stroke: attach");
            return function (tick: DrawTick) {
                if (DEBUG) console.log("stroke: stroke");
                tick.ctx.stroke();
            }
        }, animation);
}

export function fill(
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("fill: attach");
            return function (tick: DrawTick) {
                if (DEBUG) console.log("fill: stroke");
                tick.ctx.fill();
            }
        }, animation);
}

export function moveTo(
    xy: PointArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("moveTo: attach");
            var xy_next = Parameter.from(xy).init();
            return function (tick: DrawTick) {
                var xy = xy_next(tick.clock);
                if (DEBUG) console.log("moveTo: moveTo", xy);
                tick.ctx.moveTo(xy[0], xy[1]);
            }
        }, animation);
}

export function lineTo(
    xy: PointArg,
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("lineTo: attach");
            var xy_next = Parameter.from(xy).init();
            return function (tick: DrawTick) {
                var xy = xy_next(tick.clock);
                if (DEBUG) console.log("lineTo: lineTo", xy);
                tick.ctx.lineTo(xy[0], xy[1]);
            }
        }, animation);
}


export function clip(
    animation?: Animation
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("clip: attach");
            return function (tick: DrawTick) {
                if (DEBUG) console.log("clip: clip");
                tick.ctx.clip();
            }
        }, animation);
}

export function quadraticCurveTo(control: PointArg, end: PointArg, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("quadraticCurveTo: attach");
            var arg1_next = Parameter.from(control).init();
            var arg2_next = Parameter.from(end).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                if (DEBUG) console.log("quadraticCurveTo: quadraticCurveTo", arg1, arg2);
                tick.ctx.quadraticCurveTo(arg1[0], arg1[1], arg2[0], arg2[1]);
            }
        }, animation);
}
/**
 * Dynamic chainable wrapper for bezierCurveTo in the canvas API. Use with withinPath.
 */
export function bezierCurveTo(control1: PointArg, control2: PointArg, end: PointArg, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("bezierCurveTo: attach");
            var arg1_next = Parameter.from(control1).init();
            var arg2_next = Parameter.from(control2).init();
            var arg3_next = Parameter.from(end).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                if (DEBUG) console.log("bezierCurveTo: bezierCurveTo", arg1, arg2, arg3);
                tick.ctx.bezierCurveTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3[0], arg3[1]);
            }
        }, animation);
}
/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
export function arc(center: PointArg, radius: NumberArg,
    radStartAngle: NumberArg, radEndAngle: NumberArg,
    counterclockwise?: boolean, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("arc: attach");
            var arg1_next = Parameter.from(center).init();
            var arg2_next = Parameter.from(radius).init();
            var arg3_next = Parameter.from(radStartAngle).init();
            var arg4_next = Parameter.from(radEndAngle).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                var arg4 = arg4_next(tick.clock);
                if (DEBUG) console.log("arc: arc", arg1, arg2, arg3, arg4);
                tick.ctx.arc(arg1[0], arg1[1], arg2, arg3, arg4, counterclockwise);
            }
        }, animation);
}

/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
export function arcTo(tangent1: PointArg, tangent2: PointArg, radius: NumberArg, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("arc: attach");
            var arg1_next = Parameter.from(tangent1).init();
            var arg2_next = Parameter.from(tangent2).init();
            var arg3_next = Parameter.from(radius).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                if (DEBUG) console.log("arc: arc", arg1, arg2, arg3);
                tick.ctx.arcTo(arg1[0], arg1[1], arg2[0], arg2[1], arg3);
            }
        }, animation);
}
/**
 * Dynamic chainable wrapper for scale in the canvas API.
 */
export function scale(xy: PointArg, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("scale: attach");
            var arg1_next = Parameter.from(xy).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG) console.log("scale: scale", arg1);
                tick.ctx.scale(arg1[0], arg1[1]);
            }
        }, animation);
}
/**
 * Dynamic chainable wrapper for rotate in the canvas API.
 */
export function rotate(rads: NumberArg, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("rotate: attach");
            var arg1_next = Parameter.from(rads).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG) console.log("rotate: rotate", arg1);
                tick.ctx.scale(arg1[0], arg1[1]);
            }
        }, animation);
}
/**
 * Dynamic chainable wrapper for translate in the canvas API.
 * [ a c e
 *   b d f
 *   0 0 1 ]
 */
export function transform(a: NumberArg, b: NumberArg, c: NumberArg,
          d: NumberArg, e: NumberArg, f: NumberArg, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("transform: attach");
            var arg1_next = Parameter.from(a).init();
            var arg2_next = Parameter.from(b).init();
            var arg3_next = Parameter.from(c).init();
            var arg4_next = Parameter.from(d).init();
            var arg5_next = Parameter.from(e).init();
            var arg6_next = Parameter.from(f).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                var arg4 = arg4_next(tick.clock);
                var arg5 = arg5_next(tick.clock);
                var arg6 = arg6_next(tick.clock);
                if (DEBUG) console.log("transform: transform", arg1, arg2, arg3, arg4, arg5, arg6);
                tick.ctx.transform(arg1, arg2, arg3, arg4, arg5, arg6);
            }
        }, animation);
}
/**
 * Dynamic chainable wrapper for setTransform in the canvas API.
 */
export function setTransform(a: NumberArg, b: NumberArg, c: NumberArg,
             d: NumberArg, e: NumberArg, f: NumberArg, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("setTransform: attach");
            var arg1_next = Parameter.from(a).init();
            var arg2_next = Parameter.from(b).init();
            var arg3_next = Parameter.from(c).init();
            var arg4_next = Parameter.from(d).init();
            var arg5_next = Parameter.from(e).init();
            var arg6_next = Parameter.from(f).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                var arg2 = arg2_next(tick.clock);
                var arg3 = arg3_next(tick.clock);
                var arg4 = arg4_next(tick.clock);
                var arg5 = arg5_next(tick.clock);
                var arg6 = arg6_next(tick.clock);
                if (DEBUG) console.log("setTransform: setTransform", arg1, arg2, arg3, arg4, arg5, arg6);
                tick.ctx.setTransform(arg1, arg2, arg3, arg4, arg5, arg6);
            }
        }, animation);
}
/**
 * Dynamic chainable wrapper for font in the canvas API.
 */
export function font(style: StringArg, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("font: attach");
            var arg1_next = Parameter.from(style).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG) console.log("font: font", arg1);
                tick.ctx.font = arg1;
            }
        }, animation);
}
/**
 * Dynamic chainable wrapper for textAlign in the canvas API.
 */
export function textAlign(style: StringArg, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("textAlign: attach");
            var arg1_next = Parameter.from(style).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG) console.log("textAlign: textAlign", arg1);
                tick.ctx.textAlign = arg1;
            }
        }, animation);
}
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
export function textBaseline(style: string, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("textBaseline: attach");
            var arg1_next = Parameter.from(style).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG) console.log("textBaseline: textBaseline", arg1);
                tick.ctx.textBaseline = arg1;
            }
        }, animation);
}
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
export function fillText(text: StringArg, xy: PointArg, maxWidth?: NumberArg, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("fillText: attach");
            var arg1_next = Parameter.from(text).init();
            var arg2_next = Parameter.from(xy).init();
            var arg3_next = maxWidth ? Parameter.from(maxWidth).init(): undefined;
            return function (tick: DrawTick) {
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
        }, animation);
}
/**
 * Dynamic chainable wrapper for textBaseline in the canvas API.
 */
export function drawImage(img, xy: PointArg, animation?: Animation): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("drawImage: attach");
            var arg1_next = Parameter.from(xy).init();
            return function (tick: DrawTick) {
                var arg1 = arg1_next(tick.clock);
                if (DEBUG) console.log("drawImage: drawImage", arg1);
                tick.ctx.drawImage(img, arg1[0], arg1[1]);
            }
        }, animation);
}


// foreground color used to define emmitter regions around the canvas
//  the hue, is reused in the particles
//  the lightness is use to describe the quantity (max lightness leads to total saturation)
//
// the additional parameter intesity is used to scale the emmiters
// generally the colors you place on the map will be exceeded by the saturation
//
// How are two different hues sensibly mixed

// decay of 0.5
//
//       H
// 1 2 4 9 4 2 1       //sat, also alpha
//----------------------------
//         1 2 4 2 1   //sat
//             H2
//
// we add the contribution to an image sized accumulator
// as the contributions need to sum permutation independently (also probably associative)
// blend(rgba1, rgba2) = blend(rgba2,rgba1)
// alpha = a1 + a2 - a1a2
// if a1 = 1   and a2 = 1,   alpha = 1         = 1
// if a1 = 0.5 and a2 = 1,   alpha = 1.5 - 0.5 = 1
// if a1 = 0.5 and a2 = 0.5, alpha = 1 - 0.25  = 0.75

// Normal blending doesn't commute:
// red = (r1 * a1  + (r2 * a2) * (1 - a1)) / alpha

// lighten does, which is just the max
// red = max(r1, r2)
// or addition red = r1 + r2
// http://www.deepskycolors.com/archive/2010/04/21/formulas-for-Photoshop-blending-modes.html


export function glow(
    decay: NumberArg = 0.1,
    after ?: Animation
): Animation
{
    return draw(
        () => {
            var decay_next = Parameter.from(decay).init();
            return function (tick: DrawTick) {
                var ctx = tick.ctx;

                // our src pixel data
                var width = ctx.canvas.width;
                var height = ctx.canvas.height;
                var pixels = width * height;
                var imgData = ctx.getImageData(0,0,width,height);
                var data = imgData.data;
                var decay = decay_next(tick.clock);

                // console.log("original data", imgData.data)

                // our target data
                // todo if we used a Typed array throughout we could save some zeroing and other crappy conversions
                // although at least we are calculating at a high accuracy, lets not do a byte array from the beginning
                var glowData: number[] = new Array<number>(pixels*4);

                for (var i = 0; i < pixels * 4; i++) glowData[i] = 0;

                // passback to avoid lots of array allocations in rgbToHsl, and hslToRgb calls
                var hsl: [number, number, number] = [0,0,0];
                var rgb: [number, number, number] = [0,0,0];

                // calculate the contribution of each emmitter on their surrounds
                for(var y = 0; y < height; y++) {
                    for(var x = 0; x < width; x++) {
                        var red   = data[((width * y) + x) * 4];
                        var green = data[((width * y) + x) * 4 + 1];
                        var blue  = data[((width * y) + x) * 4 + 2];
                        var alpha = data[((width * y) + x) * 4 + 3];


                        // convert to hsl
                        rgbToHsl(red, green, blue, hsl);



                        var hue = hsl[0];
                        var qty = hsl[1]; // qty decays
                        var local_decay = hsl[2] + 1;

                        // we only need to calculate a contribution near the source
                        // contribution = qty decaying by inverse square distance
                        // c = q / (d^2 * k), we want to find the c < 0.01 point
                        // 0.01 = q / (d^2 * k) => d^2 = q / (0.01 * k)
                        // d = sqrt(100 * q / k) (note 2 solutions, representing the two halfwidths)
                        var halfwidth = Math.sqrt(1000 * qty / (decay * local_decay));
                        halfwidth *= 100;
                        var li = Math.max(0, Math.floor(x - halfwidth));
                        var ui = Math.min(width, Math.ceil(x + halfwidth));
                        var lj = Math.max(0, Math.floor(y - halfwidth));
                        var uj = Math.min(height, Math.ceil(y + halfwidth));


                        for(var j = lj; j < uj; j++) {
                            for(var i = li; i < ui; i++) {
                                var dx = i - x;
                                var dy = j - y;
                                var d_squared = dx * dx + dy * dy;

                                // c is in the same scale at qty i.e. (0 - 100, saturation)
                                var c = (qty) / (1.0001 + Math.sqrt(d_squared) * decay * local_decay);

                                assert(c <= 100);
                                assert(c >= 0);
                                rgb = hslToRgb(hue, 50, c, rgb);
                                // rgb = husl.toRGB(hue, 50, c);
                                //for (var husli = 0; husli< 3; husli++) rgb [husli] *= 255;
                                var c_alpha = c / 100.0;

                                var r_i = ((width * j) + i) * 4;
                                var g_i = ((width * j) + i) * 4 + 1;
                                var b_i = ((width * j) + i) * 4 + 2;
                                var a_i = ((width * j) + i) * 4 + 3;

                                // console.log("rgb", rgb);
                                // console.log("c", c);



                                var pre_alpha = glowData[a_i];


                                assert(c_alpha <= 1);
                                assert(c_alpha >= 0);
                                assert(pre_alpha <= 1);
                                assert(pre_alpha >= 0);

                                // blend alpha first into accumulator
                                // glowData[a_i] = glowData[a_i] + c_alpha - c_alpha * glowData[a_i];
                                // glowData[a_i] = Math.max(glowData[a_i], c_alpha);

                                glowData[a_i] = 1;

                                assert(glowData[a_i] <= 1);
                                assert(glowData[a_i] >= 0);
                                assert(glowData[r_i] <= 255);
                                assert(glowData[r_i] >= 0);
                                assert(glowData[g_i] <= 255);
                                assert(glowData[g_i] >= 0);
                                assert(glowData[b_i] <= 255);
                                assert(glowData[b_i] >= 0);

                                /*
                                glowData[r_i] = (pre_alpha + rgb[0]/ 255.0 - c_alpha * rgb[0]/ 255.0) * 255;
                                glowData[g_i] = (pre_alpha + rgb[1]/ 255.0 - c_alpha * rgb[1]/ 255.0) * 255;
                                glowData[b_i] = (pre_alpha + rgb[2]/ 255.0 - c_alpha * rgb[2]/ 255.0) * 255;
                                */

                                // console.log("post-alpha", glowData[a_i]);

                                // now simple lighten

                                /*
                                glowData[r_i] = Math.max(rgb[0], glowData[r_i]);
                                glowData[g_i] = Math.max(rgb[1], glowData[g_i]);
                                glowData[b_i] = Math.max(rgb[2], glowData[b_i]);
                                */

                                // mix the colors like pigment
                                /*
                                var total_alpha = c_alpha + pre_alpha;
                                glowData[r_i] = (c_alpha * rgb[0] + pre_alpha * glowData[r_i]) / total_alpha;
                                glowData[g_i] = (c_alpha * rgb[1] + pre_alpha * glowData[g_i]) / total_alpha;
                                glowData[b_i] = (c_alpha * rgb[2] + pre_alpha * glowData[b_i]) / total_alpha;
                                */
                                /*
                                REALLY COOL EFFECT
                                glowData[r_i] = rgb[0] + glowData[r_i];
                                glowData[g_i] = rgb[1] + glowData[g_i];
                                glowData[b_i] = rgb[2] + glowData[b_i];
                                */

                                glowData[r_i] = Math.min(rgb[0] + glowData[r_i], 255);
                                glowData[g_i] = Math.min(rgb[1] + glowData[g_i], 255);
                                glowData[b_i] = Math.min(rgb[2] + glowData[b_i], 255);



                                if (x < 2 && j == 20 && i == 20 ) {
                                }

                                if (glowData[r_i] == -1) {
                                    console.log("pre-alpha", glowData[a_i]);
                                    console.log("dx", dx, "dy", dy);
                                    console.log("d_squared", d_squared);
                                    console.log("decay", decay);
                                    console.log("local_decay", local_decay);
                                    console.log("c", c);
                                    console.log("c_alpha", c_alpha);
                                    console.log("a_i", a_i);
                                    console.log("hue", hue);
                                    console.log("qty", qty);
                                    console.log("red", red);
                                    console.log("green", green);
                                    console.log("blue", blue);
                                    console.log("rgb", rgb);
                                    console.log("glowData[r_i]", glowData[r_i]);

                                    throw new Error();

                                }
                            }
                        }
                    }
                }

                // console.log("glow", glowData);

                var buf = new ArrayBuffer(data.length);
                for(var y = 0; y < height; y++) {
                    for(var x = 0; x < width; x++) {
                        var r_i = ((width * y) + x) * 4;
                        var g_i = ((width * y) + x) * 4 + 1;
                        var b_i = ((width * y) + x) * 4 + 2;
                        var a_i = ((width * y) + x) * 4 + 3;

                        buf[r_i] = Math.floor(glowData[r_i]);
                        buf[g_i] = Math.floor(glowData[g_i]);
                        buf[b_i] = Math.floor(glowData[b_i]);
                        buf[a_i] = 255; //Math.floor(glowData[a_i] * 255);

                    }
                }

                // (todo) maybe we can speed boost some of this
                // https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/

                //finally overwrite the pixel data with the accumulator
                (<any>imgData.data).set(new Uint8ClampedArray(buf));

                ctx.putImageData(imgData, 0, 0);
            }
        }, after);
}

export function take(
    frames: number,
    animation?: Animation
): Animation
{
    return new Animation(function(prev: DrawStream): DrawStream {
        if (DEBUG) console.log("take: attach");
        return prev.take(frames);
    }, animation);
}


export function save(width:number, height:number, path: string): Animation {
    var GIFEncoder = require('gifencoder');
    var fs = require('fs');


    var encoder = new GIFEncoder(width, height);
    encoder.createReadStream()
      .pipe(encoder.createWriteStream({ repeat: 10000, delay: 100, quality: 1 }))
      .pipe(fs.createWriteStream(path));
    encoder.start();

    return new Animation(function (parent: DrawStream): DrawStream {
        return parent.tap(
            function(tick: DrawTick) {
                if (DEBUG) console.log("save: wrote frame");
                encoder.addFrame(tick.ctx);
            },
            function() {console.error("save: not saved", path);},
            function() {console.log("save: saved", path); encoder.finish();}
        )
    });
}


/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b, passback: [number, number, number]): [number, number, number] {
    // console.log("rgbToHsl: input", r, g, b);

    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    passback[0] = (h * 360);       // 0 - 360 degrees
    passback[1] = (s * 100); // 0 - 100%
    passback[2] = (l * 100); // 0 - 100%

    // console.log("rgbToHsl: output", passback);

    return passback;
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l, passback: [number, number, number]): [number, number, number]{
    var r, g, b;
    // console.log("hslToRgb input:", h, s, l);

    h = h / 360.0;
    s = s / 100.0;
    l = l / 100.0;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    passback[0] = r * 255;
    passback[1] = g * 255;
    passback[2] = b * 255;

    // console.log("hslToRgb", passback);

    return passback;
}

