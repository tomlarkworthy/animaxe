/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
import Rx = require("rx");

export var DEBUG_LOOP = false;
export var DEBUG_THEN = false;


export class DrawTick {
    constructor (public ctx: CanvasRenderingContext2D, public dt: number) {}
}

function stackTrace() {
    var err = new Error();
    return (<any>err).stack;
}

export class Iterable<T> {
    // tried immutable.js but it only supports 2 dimensionable iterables
    constructor(_next: () => T) {
        this.next = _next;
    }

    next(): T {throw new Error('This method is abstract');}
    map<T, V>(fn: (T) => V): Iterable<V> {
        var base = this;
        return new Iterable(function(): V {
            //console.log("Iterable: next");
            return fn(base.next());
        });
    }
}

export class StatefulIterable<T, S> extends Iterable<T>{
    // tried immutable.js but it only supports 2 dimensionable iterables
    state: S;
    constructor(initialState: S, _next: () => T) {
        super(_next);
        this.state = initialState;
    }
}

export type NumberStream = Iterable<number>;
export type PointStream = Iterable<Point>;
export type ColorStream = Iterable<string>;
export type DrawStream = Rx.Observable<DrawTick>;

export class Fixed<T> extends Iterable<T> {
    constructor(public val: T) {
        super(function(){
            //console.log("fixed", this.val);
            return this.val;
        });
    }
}

export function toStreamNumber(x: number | NumberStream): NumberStream {
    return typeof x === 'number' ? new Fixed(x): x;
}
export function toStreamPoint(x: Point | PointStream): PointStream {
    return <PointStream> (typeof (<any>x).next === 'function' ? x: new Fixed(x));
}
export function toStreamColor(x: string | ColorStream): ColorStream {
    return <ColorStream> (typeof (<any>x).next === 'function' ? x: new Fixed(x));
}

export class Animation {
    constructor(public _attach: (DrawStream) => DrawStream, public after?: Animation) {}
    attach(obs: DrawStream): DrawStream {
        var processed = this._attach(obs);
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

                var firstAttach  = self.attach(first.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(
                    function(next) {
                        if (DEBUG_THEN) console.log("then: first to downstream");
                        observer.onNext(next);
                    },
                    observer.onError.bind(observer),
                    function(){
                        if (DEBUG_THEN) console.log("then: first complete");
                        firstTurn = false;
                    }
                );
                var secondAttach = follower.attach(second.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(
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
                    secondAttach.dispose();
                };
            }).subscribeOn(Rx.Scheduler.immediate);
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
            self.t += dt;
            var tick = new DrawTick(self.ctx, dt);
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
                console.log("animator: ctx err restore");
                self.ctx.restore();
            },function(){
                self.ctx.restore();
            });
        this.animationSubscriptions.push(
            restoreAfterFrame.subscribe()
        );
    }

    clock(): NumberStream {
        var self = this;
        return new Iterable(function() {return self.t})
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
    return new Iterable(function() {
            var result: [number, number] = [x_stream.next(), y_stream.next()];
            //console.log("point: next", result);
            return result;
        });
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
    return new Iterable(function() {
        var r = Math.floor(r_stream.next());
        var g = Math.floor(g_stream.next());
        var b = Math.floor(b_stream.next());
        var a = Math.floor(a_stream.next());
        return "rgb(" + r + "," + g + "," + b + ")";
    });
}

export function rnd(): NumberStream {
    return new Iterable(function () {
            return Math.random();
        });
}


export function previous<T>(value: Iterable<T>, clock: NumberStream): Iterable<T> {
    return new StatefulIterable(
        {currentClock: -1, currentValue: value.next(), prevValue: value.next()},
        function () {
            var nextClock = clock.next();
            var nextValue = value.next();

            if (nextClock == this.state.currentClock) {
                if (this.currentValue != nextValue){
                    console.error("Warning: input source to previous() is not temporally stable");
                    console.error(stackTrace());
                }
            } else {
                this.state.prevValue = this.state.currentValue;
                // new value
                this.state.currentClock = nextClock;
                this.state.currentValue = nextValue;
            }
            return this.state.prevValue;
        });
}

export function sin(period: number| NumberStream, clock: NumberStream): NumberStream {
    //console.log("sin: new");
    var period_stream = toStreamNumber(period);

    return new Iterable(function() {
            var period = period_stream.next();
            var t = clock.next() % period;
            //console.log("sin: t", t);
            return Math.sin(t * (Math.PI * 2) / period);
        });
}
export function cos(period: number| NumberStream, clock: NumberStream): NumberStream {
    //console.log("cos: new");
    var period_stream = toStreamNumber(period);

    return new Iterable(function() {
            var period = period_stream.next();
            var t = clock.next() % period;
            //console.log("cos: t", t);
            return Math.cos(t * (Math.PI * 2) / period);
        });
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

function clone(
    n: number | NumberStream,
    animation: Animation /* copies */
): Animation
{ return null;}

function parallel( //rename layer?
    animation: Animation[]
): Animation
{ return null;}

function sequence(
    animation: Animation[]
): Animation
{ return null;}

export function loop(
    animation: Animation
): Animation
{
    return new Animation(function (prev: DrawStream): DrawStream {
        if (DEBUG_LOOP) console.log("loop: initializing");


        return Rx.Observable.create<DrawTick>(function(observer) {
            console.log("loop: create new loop");
            var loopStart = null;
            var loopSubscription = null;

            function attachLoop(next) { //todo I feel like we can remove a level from this somehow
                if (DEBUG_LOOP) console.log("loop: new inner loop");

                loopStart = new Rx.Subject<DrawTick>();

                loopSubscription = animation.attach(loopStart).subscribe(
                    function(next) {
                        if (DEBUG_LOOP) console.log("loop: post-inner loop to downstream");
                        observer.onNext(next);
                    },
                    function(err) {
                        if (DEBUG_LOOP) console.log("loop: post-inner loop err to downstream")
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

                },
                function(err){
                    if (DEBUG_LOOP) console.log("loop: upstream error to inner loop", err);
                    loopStart.onError(err);
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
    fn: (tick: DrawTick) => void,
    animation?: Animation
): Animation
{
    return new Animation(function (previous: DrawStream): DrawStream {
        return previous.tapOnNext(fn);
    }, animation);
}

export function move(
    delta: Point | PointStream,
    animation?: Animation
): Animation {
    console.log("move: attached");
    var pointStream: PointStream = toStreamPoint(delta)
    return draw(function(tick) {
        var point = pointStream.next();
        console.log("move:", point);
        if (tick)
            tick.ctx.transform(1, 0, 0, 1, point[0], point[1]);
        return tick;
    }, animation);
}

export function velocity(
    velocity: Point | PointStream,
    animation?: Animation
): Animation {
    var velocityStream: PointStream = toStreamPoint(velocity);
    return new Animation(function(prev: DrawStream): DrawStream {
        var pos: Point = [0.0,0.0];
        return prev.map(function(tick) {
            var velocity = velocityStream.next();
            pos[0] += velocity[0] * tick.dt;
            pos[1] += velocity[1] * tick.dt;
            tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
            return tick;
        });
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
        return prev.map(function(tick: DrawTick) {
            console.log("tween: inner")
            var from = from_stream.next();
            var to   = to_stream.next();

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
    p1: Point, //todo
    p2: Point, //todo
    animation?: Animation
): Animation {
    return draw(function (tick: DrawTick) {
        console.log("rect: fillRect");
        tick.ctx.fillRect(p1[0], p1[1], p2[0], p2[1]); //todo observer stream if necissary
    }, animation);
}
export function changeColor(
    color: string, //todo
    animation?: Animation
): Animation {
    return draw(function (tick: DrawTick) {
        tick.ctx.fillStyle = color;
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


//we will draw
// EXPLODING SHIP
//1. n pieces of debris flying outwards (linear movement in time of Debris from 50,50 to rnd, rnd, at velocity v)
//2. explosion of debris (last position of debris spawns explosion
//3. large explosion at center (50,50) at end of linear movement
var CENTRE = point(50,50);
var TL = point(50,50);
var BR = point(50,50);
var t: number = 0;
var n: number = 0;

var gaussian: NumberStream;
var splatter: number | NumberStream = scale_x(3, gaussian);

function drawDebris(): Animation {return null;}
function drawExplosion(): Animation {return null;}
function drawBigExplosion(): Animation {return null;}

//What do we want it to look like


//todo
// INVEST IN BUILD AND TESTING

//emitter
//rand normal


//animator.play(
//    //clone is a parrallel execution the same animation
//    parallel([clone(n, linear_tween(/*fixed point*/CENTRE,
//                   /*generative point*/ point(splatter, splatter),
//                   /*time*/ t,
//                   /*draw fn for tween*/ storeTx("X", drawDebris()))
//                .then(loadTx("X", drawExplosion())) //after the tween completes draw the explosion
//              ),
//              take(/*fixed value*/ t).then(drawBigExplosion())
//             ])
//);


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
