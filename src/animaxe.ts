/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
import Rx = require("rx");

export var DEBUG_LOOP = false;
export var DEBUG_THEN = false;
export var DEBUG_EMIT = true;

export class DrawTick {
    constructor (public ctx: CanvasRenderingContext2D, public clock: number, public dt: number) {}
}

function stackTrace() {
    var err = new Error();
    return (<any>err).stack;
}

export class Parameter<Value> {
    constructor(init: () => ((t: number) => Value)) {
        this.init = init;
    }

    init(): (clock: number) => Value {throw new Error('This method is abstract');}

    map<V>(fn: (Value) => V): Parameter<V> {
        var base = this;
        return new Parameter(
            () => {
                var base_next = base.init();
                return function(t) {
                    return fn(base_next(t));
                }
            }
        );
    }

    clone(): Parameter<Value> {
        return this.map(x => x);
    }
}

export type NumberStream = Parameter<number>;
export type PointStream = Parameter<Point>;
export type ColorStream = Parameter<string>;
export type DrawStream = Rx.Observable<DrawTick>;

export function fixed<T>(val: T | Parameter<T>): Parameter<T> {
    if (typeof (<any>val).init === 'function') {
        // we were passed in a Parameter object
        return new Parameter<T>(
            () => {
                var generate = true;
                var next = (<Parameter<T>>val).init();
                var value: T = null;
                return function (clock: number) {
                    if (generate) {
                        generate = false;
                        value = next(clock);
                    }
                    console.log("fixed: val from parameter", value);
                    return value;
                }
            }

        );
    } else {
        return new Parameter<T>(
            () => {
                return function (clock: number) {
                    console.log("fixed: val from constant", val);
                    return <T>val;
                }
            }
        );
    }
}

export function toStreamNumber(x: number | NumberStream): NumberStream {
    return <NumberStream> (typeof (<any>x).init === 'function' ? x: fixed(x));
}
export function toStreamPoint(x: Point | PointStream): PointStream {
    return <PointStream> (typeof (<any>x).init === 'function' ? x: fixed(x));
}
export function toStreamColor(x: string | ColorStream): ColorStream {
    return <ColorStream> (typeof (<any>x).init === 'function' ? x: fixed(x));
}

export class Animation {

    constructor(public _attach: (upstream: DrawStream) => DrawStream, public after?: Animation) {
    }
    attach(upstream: DrawStream): DrawStream {
        var self = this;
        //console.log("animation initialized ", clock);

        var instream = null;
        instream = upstream;
        //console.log("animation: instream", instream, "upstream", upstream);
        var processed = this._attach(instream);
        return this.after? this.after.attach(processed): processed;
    }
    /**
     * delivers events to this first, then when that animation is finished
     * the follower consumers events and the values are used as output, until the follower animation completes
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
        console.log("animator: play");
        var saveBeforeFrame = this.root.tapOnNext(function(tick){
            console.log("animator: ctx save");
            tick.ctx.save();
        });
        var doAnimation = animation.attach(saveBeforeFrame);
        var restoreAfterFrame = doAnimation.tap(
            function(tick){
                console.log("animator: ctx next restore");
                tick.ctx.restore();
            },function(err){
                console.log("animator: ctx err restore", err);
                self.ctx.restore();
            },function(){
                self.ctx.restore();
            });
        this.animationSubscriptions.push(
            restoreAfterFrame.subscribe()
        );
    }
}

export type Point = [number, number]
export function point(
    x: number | NumberStream,
    y: number | NumberStream
): PointStream
{
    var x_stream = toStreamNumber(x);
    var y_stream = toStreamNumber(y);

    //console.log("point: init", x_stream, y_stream);
    return new Parameter(
        () => {
            var x_next = x_stream.init();
            var y_next = y_stream.init();
            return function(t: number) {
                var result: [number, number] = [x_next(t), y_next(t)];
                //console.log("point: next", result);
                return result;
            }
        }
    );
}

/*
    RGB between 0 and 255
    a between 0 - 1
 */
export function color(
    r: number | NumberStream,
    g: number | NumberStream,
    b: number | NumberStream,
    a: number | NumberStream
): ColorStream
{
    var r_stream = toStreamNumber(r);
    var g_stream = toStreamNumber(g);
    var b_stream = toStreamNumber(b);
    var a_stream = toStreamNumber(a);
    return new Parameter(
        () => {
            var r_next = r_stream.init();
            var g_next = g_stream.init();
            var b_next = b_stream.init();
            var a_next = a_stream.init();
            return function(t: number) {
                var r_val = Math.floor(r_next(t));
                var g_val = Math.floor(g_next(t));
                var b_val = Math.floor(b_next(t));
                var a_val = a_next(t);
                var val = "rgba(" + r_val + "," + g_val + "," + b_val + "," + a_val + ")";
                console.log("color: ", val);
                return val;
            }
        }
    );
}

export function rnd(): NumberStream {
    return new Parameter(
        () => function (t) {
            return Math.random();
        }
    );
}

export function rndNormal(scale : NumberStream | number = 1): PointStream {
    var scale_ = toStreamNumber(scale);
    return new Parameter<Point>(
        () => {
            console.log("rndNormal: init");
            var scale_next = scale_.init();
            return function (t: number): Point {
                var scale = scale_next(t);
                // generate random numbers
                var norm2 = 100;
                while (norm2 > 1) { //reject those outside the unit circle
                    var x = (Math.random() - 0.5) * 2;
                    var y = (Math.random() - 0.5) * 2;
                    norm2 = x * x + y * y;
                }

                var norm = Math.sqrt(norm2);
                var val: [number, number] = [scale * x / norm , scale * y / norm];
                console.log("rndNormal: val", val);
                return val;
            }
        }
    );
}

/**
 * NOTE: currently fails if the streams are different lengths
 * @param assertDt the expected clock tick values
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
            console.log("assertClock: ", tick);
            if (tick.clock < assertClock[index] - 0.00001 || tick.clock > assertClock[index] + 0.00001) {
                var errorMsg = "unexpected clock observed: " + tick.clock + ", expected:" + assertClock[index]
                console.log(errorMsg);
                throw new Error(errorMsg);
            }
            index ++;
        });
    }, after);
}

export function displaceT<T>(displacement: number | Parameter<number>, value: Parameter<T>): Parameter<T> {
    var deltat: Parameter<number> = toStreamNumber(displacement);
    return new Parameter<T> (
        () => {
            var dt_next = deltat.init();
            var value_next = value.init();
            return function (t) {
                var dt = dt_next(t);
                console.log("displaceT: ", dt)
                return value_next(t + dt)
            }
        }
    )
}

//todo: should be t as a parameter to a non tempor
export function sin(period: number| Parameter<number>): Parameter<number> {
    console.log("sin: new");
    var period_stream = toStreamNumber(period);
    return new Parameter(
        () => {
            var period_next = period_stream.init();
            return function (t: number) {
                var value = Math.sin(t * (Math.PI * 2) / period_next(t));
                console.log("sin: tick", t, value);
                return value;
            }
        }
    );
}
export function cos(period: number| Parameter<number>): Parameter<number> {
    console.log("cos: new");
    var period_stream = toStreamNumber(period);
    return new Parameter(
        () => {
            var period_next = period_stream.init();
            return function (t: number) {
                var value = Math.cos(t * (Math.PI * 2) / period_next(t));
                console.log("cos: tick", t, value);
                return value;
            }
        }
    );
}

function scale_x(
    scale: number | NumberStream,
    x: number | NumberStream
): number | NumberStream
{ return 0;}

function storeTx(
    n: string, /*pass though context but store transform in variable*/
    animation: Animation //passthrough
): Animation
{ return null;}

function loadTx(
    n: string, /*pass though context but store transform in variable*/
    animation: Animation //passthrough
): Animation
{ return null;}

/**
 * plays several animations, finishes when they are all done.
 * @param animations
 * @returns {Animation}
 * todo: I think there are lots of bugs when an animation stops part way
 * I think it be better if this spawned its own Animator to handle ctx restores
 */
export function parallel(
    animations: Rx.Observable<Animation>
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
    n: number,
    animation: Animation
): Animation {
    return parallel(Rx.Observable.return(animation).repeat(n));
}


function sequence(
    animation: Animation[]
): Animation
{ return null;}

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
    initDraw: () => ((tick: DrawTick) => void),
    animation?: Animation
): Animation
{
    return new Animation(function (previous: DrawStream): DrawStream {
        var draw: (tick: DrawTick) => void = initDraw();
        return previous.tapOnNext(draw);
    }, animation);
}

export function move(
    delta: Point | PointStream,
    animation?: Animation
): Animation {
    console.log("move: attached");
    var pointStream: PointStream = toStreamPoint(delta);
    return draw(
        () => {
            var point_next = pointStream.init();
            return function(tick) {
                var point = point_next(tick.clock);
                console.log("move:", point);
                if (tick)
                    tick.ctx.transform(1, 0, 0, 1, point[0], point[1]);
                return tick;
            }
        }
    , animation);
}

export function composite(
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
    velocity: Point | PointStream,
    animation?: Animation
): Animation {
    var velocityStream: PointStream = toStreamPoint(velocity);
    return draw(
        () => {
            var pos: Point = [0.0,0.0];
            var velocity_next = velocityStream.init();
            return function(tick) {
                var velocity = velocity_next(tick.clock);
                tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
                pos[0] += velocity[0] * tick.dt;
                pos[1] += velocity[1] * tick.dt;
            }
        }, animation);
}

export function tween_linear(
    from: Point | PointStream,
    to:   Point | PointStream,
    time: number,
    animation: Animation /* copies */
): Animation
{
    var from_stream = toStreamPoint(from);
    var to_stream = toStreamPoint(to);
    var scale = 1.0 / time;

    return new Animation(function(prev: DrawStream): DrawStream {
        var t = 0;
        var from_next = from_stream.init();
        var to_next = to_stream.init();
        return prev.map(function(tick: DrawTick) {
            console.log("tween: inner");
            var from = from_next(tick.clock);
            var to   = to_next(tick.clock);

            t = t + tick.dt;
            if (t > time) t = time;
            var x = from[0] + (to[0] - from[0]) * t * scale;
            var y = from[1] + (to[1] - from[1]) * t * scale;
            tick.ctx.transform(1, 0, 0, 1, x, y);
            return tick;
        }).takeWhile(function(tick) {return t < time;})
    }, animation);
}

export function rect(
    p1: Point, //todo dynamic params instead
    p2: Point, //todo dynamic params instead
    animation?: Animation
): Animation {
    return draw(
        () => {
            return function (tick: DrawTick) {
                console.log("rect: fillRect");
                tick.ctx.fillRect(p1[0], p1[1], p2[0], p2[1]); //todo observer stream if necissary
            }
        }, animation);
}
export function changeColor(
    color: string, //todo
    animation?: Animation
): Animation {
    return draw(
        () => {
            return function (tick: DrawTick) {
                tick.ctx.fillStyle = color;
            }
        }, animation);
}

function map(
    map_fn: (prev: DrawTick) => DrawTick,
    animation?: Animation
): Animation {
    return new Animation(function (previous: DrawStream): DrawStream {
        return previous.map(map_fn)
    }, animation)
}

export function take(
    iterations: number,
    animation?: Animation
): Animation
{
    return new Animation(function(prev: DrawStream): DrawStream {
        return prev.take(iterations);
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
        var t = 0;
        var endNext = false;
        return parent.tap(
            function(tick: DrawTick) {
                console.log("save: wrote frame");
                //t += tick.dt;
                //var out = fs.writeFileSync(path + "_"+ t + ".png", canvas.toBuffer());
                //var parsed = pngparse(canvas.toBuffer())
                encoder.addFrame(tick.ctx);
                //encoder.addFrame(tick.ctx.getImageData(0, 0, width, height).data);
            },
            function() {console.error("save: not saved", path);},
            function() {console.log("save: saved", path); encoder.finish();/* endNext = true;*/}
        )
    });
}

// TODO

// Parameters need initialization lifecycle too
// backup tutorial1 =>
// replace parralel with its own internal animator
// website
// jsFiddle
// rand normal
// glow
// L systems (fold?)


// IDEAS

// PacMan
// what about a different way of making glow?
// render luminecence into a texture and then color based on distance from lightsource
// mouse input, tailing glow (rember to tween between rapid movements)
// offscreen rendering an playback
// sin wave, randomized
// GUI components, responsive, bootstrap
// get data out by tapping into flow (intercept(Subject passback))
// SVG import
// layering with parrallel (back first)
