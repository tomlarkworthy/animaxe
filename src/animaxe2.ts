/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
import Rx = require("rx");

export class DrawTick {
    constructor (public ctx: CanvasRenderingContext2D, public dt: number) {}
}

export type DrawStream = Rx.Observable<DrawTick>;
export type NumberStream = Rx.Observable<number>;
export type PointStream = Rx.Observable<Point>;

export function toStreamNumber(x: number | NumberStream): NumberStream {
    return typeof x === 'number' ? Rx.Observable.return(x): x;
}
export function toStreamPoint(x: Point | PointStream): PointStream {
    return <PointStream> (typeof (<any>x).concatMap === 'function' ? x: Rx.Observable.return(x));
}

export class Animation2 {
    constructor(public _attach: (DrawStream) => DrawStream, public after?: Animation2) {}
    attach(obs: DrawStream): DrawStream {
        var processed = this._attach(obs);
        return this.after? this.after.attach(processed): processed;
    }
    /**
     * delivers events to this first, then when that animation is finished
     * the follower consumers events and the values are used as output, until the follower animation completes
     */
    then(follower: Animation2): Animation2 {
        var self = this;

        return new Animation2(function (prev: DrawStream) : DrawStream {

            return Rx.Observable.create<DrawTick>(function (observer) {
                var first  = new Rx.Subject<DrawTick>();
                var second = new Rx.Subject<DrawTick>();

                var firstTurn = true;

                var current = first;

                var firstAttach  = self.attach(first).subscribe(
                    function(next) {
                        console.log("then: first got a message, passing to downstream");
                        observer.onNext(next);
                    },
                    observer.onError.bind(observer),
                    function(){
                        firstTurn = false;
                    }
                );
                var secondAttach = follower.attach(second).subscribe(
                    function(next) {
                        console.log("then: second got a message, passing to downstream");
                        observer.onNext(next);
                    },
                    observer.onError.bind(observer),
                    observer.onCompleted.bind(observer)
                );

                var prevSubscription = prev.subscribe(
                    function(next) {
                        console.log("then: prev upstream next");
                        if (firstTurn) {
                            first.onNext(next);
                        } else {
                            second.onNext(next);
                        }
                    },
                    observer.onError,
                    function () {
                        console.log("then: prev error");
                        observer.onCompleted();
                    }
                );
                // on dispose
                return function () {
                    console.log("then: disposer");
                    prevSubscription.dispose();
                    firstAttach.dispose();
                    secondAttach.dispose();
                };
            });
        });
    }
}

export class Animator2 {
    tickerSubscription: Rx.Disposable = null;
    root: Rx.Subject<DrawTick>;
    animationSubscriptions: Rx.IDisposable[] = [];

    constructor(public drawingContext: CanvasRenderingContext2D) {
        this.root = new Rx.Subject<DrawTick>()
    }
    ticker(tick: NumberStream): void {
        var self = this;
        this.tickerSubscription = tick.map(function(dt: number) { //map the ticker onto any -> context
            return new DrawTick(self.drawingContext, dt);
        }).subscribe(this.root);
    }
    play (animation: Animation2): void {
        console.log("play");
        var saveBeforeFrame = this.root.tapOnNext(function(tick){tick.ctx.save();});
        var doAnimation = animation.attach(saveBeforeFrame);
        var restoreAfterFrame = doAnimation.tapOnNext(function(tick){tick.ctx.restore();});
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
    console.log("point: init");
    var x_stream = toStreamNumber(x);
    var y_stream = toStreamNumber(y);
    return Rx.Observable.combineLatest([x_stream, y_stream], function(x,y) {
        var result: Point = [x, y]
        return result;
    });
}

export function rnd(): NumberStream {
    return Rx.Observable.create(function (observer: Rx.Observer<number>) {
        console.log('rnd: onNext');
        observer.onNext(Math.random());
        return function () {
            console.log('rnd: disposed');
        }
    });
}

export function sin(period: number| NumberStream, trigger: Animator2): NumberStream {
    var t = 0;
    var period_stream = toStreamNumber(period);
    return trigger.root.withLatestFrom(period_stream, function(tick: DrawTick, period: number) {
        t += tick.dt;
        while (t > period) t -= period;
        return Math.sin(t * (Math.PI * 2) / period);
    });
}
export function cos(period: number| NumberStream, trigger: Animator2): NumberStream {
    var t = 0;
    var period_stream = toStreamNumber(period);
    return trigger.root.withLatestFrom(period_stream, function(tick: DrawTick, period: number) {
        t += tick.dt;
        while (t > period) t -= period;
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
    animation: Animation2 //passthrough
): Animation2
{ return null;}

function loadTx(
    n: string, /*pass though context but store transform in variable*/
    animation: Animation2 //passthrough
): Animation2
{ return null;}

function clone(
    n: number | NumberStream,
    animation: Animation2 /* copies */
): Animation2
{ return null;}

function parallel( //rename layer?
    animation: Animation2[]
): Animation2
{ return null;}

function sequence(
    animation: Animation2[]
): Animation2
{ return null;}

export function loop(
    animation: Animation2
): Animation2
{
    console.log("loop: initializing");
    var input = new Rx.Subject<DrawTick>();
    var output = new Rx.Subject<DrawTick>();
    var passthoughSubscription: Rx.Disposable = null;
    var attachNext = true;
    return new Animation2(function (previous: DrawStream): DrawStream {

        function attachPassthrouh() { //todo I feel like we can remove a level from this somehow
            console.log("loop: passthrough, attach");
            passthoughSubscription = animation.attach(input).subscribe(
                function(next) {
                    console.log("loop next");
                    output.onNext(next)
                },
                output.onError.bind(output),
                function() {
                    //onComplete
                    console.log("loop: passthrough, complete");
                    passthoughSubscription.dispose(); //todo, check for mem leaks in loop, and maybe get rid of this line
                    if (attachNext) attachPassthrouh();
                }
            )
        }

        attachPassthrouh();

        previous.tapOnCompleted(function(){
            attachNext = false;
        }).subscribe(input);

        return output;
    });
}

export function draw(
    fn: (tick: DrawTick) => void,
    animation?: Animation2
): Animation2
{
    return new Animation2(function (previous: DrawStream): DrawStream {
        return previous.tapOnNext(fn);
    }, animation);
}

export function move(
    delta: Point | PointStream,
    animation?: Animation2
): Animation2 {
    var pointStream: PointStream = toStreamPoint(delta)
    return new Animation2(function(prev: DrawStream): DrawStream {
        return prev.withLatestFrom(pointStream, function(tick, point) {
            console.log("move: transform", point);
            tick.ctx.transform(1, 0, 0, 1, point[0], point[1]);
            return tick;
        })
    }, animation);
}

export function velocity(
    velocity: Point | PointStream,
    animation?: Animation2
): Animation2 {
    var velocityStream: PointStream = toStreamPoint(velocity);
    return new Animation2(function(prev: DrawStream): DrawStream {
        var pos: Point = [0.0,0.0];
        return prev.withLatestFrom(velocityStream, function(tick, velocity) {
            pos[0] += velocity[0] * tick.dt;
            pos[1] += velocity[1] * tick.dt;
            tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
            return tick;
        })
    }, animation);
}

function tween_linear(
    from: Point | PointStream,
    to:   Point | PointStream,
    time: number,
    animation: Animation2 /* copies */
): Animation2
{
    var from_stream = toStreamPoint(from);
    var to_stream = toStreamPoint(to);
    var combined: Rx.Observable<[Point, Point]> = from_stream.combineLatest(to_stream, function(a,b) {return <[Point, Point]>[a,b]});
    var scale = 1.0 / time;

    return new Animation2(function(prev: DrawStream): DrawStream {
        var t = 0;
        return prev.withLatestFrom(combined, function(tick: DrawTick, points: [Point, Point]) {
            t = t+tick.dt;
            if (t > time) t = time;
            var x = points[0][0] + (points[1][0] - points[0][0]) * t * scale;
            var y = points[0][1] + (points[1][1] - points[0][1]) * t * scale;
            tick.ctx.transform(1, 0, 0, 1, x, y);
            return tick;
        }).takeWhile(function(tick) {return t < time;})
    }, animation);
}

function rect(
    p1: Point, //todo
    p2: Point, //todo
    animation?: Animation2
): Animation2 {
    return draw(function (tick: DrawTick) {
        console.log("rect: fillRect");
        tick.ctx.fillRect(p1[0], p1[1], p2[0], p2[1]); //todo observer stream if necissary
    }, animation);
}
function color(
    color: string, //todo
    animation?: Animation2
): Animation2 {
    return draw(function (tick: DrawTick) {
        tick.ctx.fillStyle = color;
    }, animation);
}

function map(
    map_fn: (prev: DrawTick) => DrawTick,
    animation?: Animation2
): Animation2 {
    return new Animation2(function (previous: DrawStream): DrawStream {
        return previous.map(map_fn)
    }, animation)
}

export function take(
    iterations: number,
    animation?: Animation2
): Animation2
{
    return new Animation2(function(prev: DrawStream): DrawStream {
        return prev.take(iterations);
    }, animation);
}


function save(width:number, height:number, path: string): Animation2 {
    var GIFEncoder = require('gifencoder');
    var fs = require('fs');


    var encoder = new GIFEncoder(width, height);
    encoder.createReadStream()
      .pipe(encoder.createWriteStream({ repeat: -1, delay: 500, quality: 1 }))
      .pipe(fs.createWriteStream(path));
    encoder.start();

    return new Animation2(function (parent: DrawStream): DrawStream {
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

function drawDebris(): Animation2 {return null;}
function drawExplosion(): Animation2 {return null;}
function drawBigExplosion(): Animation2 {return null;}

//What do we want it to look like
//create an animator, at 30FPS
try {
    var canvas:any = document.getElementById("canvas");
    console.log("browser", canvas);
} catch (err) {
    console.log(err);
    var Canvas = require('canvas');
    var canvas = new Canvas(100, 100);
    console.log("node", canvas);
}

console.log("context", context);
var context: CanvasRenderingContext2D = canvas.getContext('2d');


var animator: Animator2 = new Animator2(context); /*should be based on context*/
//animator.ticker(Rx.Observable.timer(/*now*/0, /*period in ms, 30FPS*/ 1000.0 / 30));

//GLOW EXAMPLES
//2 frame animated glow
function spark(css_color: string): Animation2 { //we could be clever and let spark take a seq, but user functions should be simple
    return take(1, draw(function(tick: DrawTick) {
            console.log("spark: frame1", css_color);
            tick.ctx.fillStyle = css_color;
            tick.ctx.fillRect(-2,-2,5,5);
    })).then(
        take(1, draw(function(tick: DrawTick) {
            console.log("spark: frame2", css_color);
            tick.ctx.fillStyle = css_color;
            tick.ctx.fillRect(-1,-1,3,3);
        }))
    );
}

function sparkLong(css_color: string): Animation2 { //we could be clever and let spark take a seq, but user functions should be simple
    return draw(function(tick: DrawTick) {
            console.log("sparkLong", css_color);
            tick.ctx.fillStyle = css_color;
            tick.ctx.fillRect(-1,-1,3,3);
    });
}

//single spark
var bigRnd = rnd().map(x => x * 50);
var bigSin = sin(1, animator).map(x => x * 40 + 50);
var bigCos = cos(1, animator).map(x => x * 40 + 50);

animator.play(color("#000000", rect([0,0],[100,100])));
animator.play(loop(move(point(bigSin, bigCos), spark("#FFFFFF"))));
//animator.play(move([50,50], velocity([50,0], loop(spark("#FFFFFF")))));
//animator.play(tween_linear([50,50], point(bigSin, bigCos), 1, loop(spark("red"))));


try {
    var time;
    var render = function() {
        window.requestAnimationFrame(render);
        var now = new Date().getTime(),
            dt = now - (time || now);
        time = now;
        animator.root.onNext(new DrawTick(animator.drawingContext, dt/1000));
    };
    render();
} catch(err) {
    animator.play(save(100, 100, "spark.gif"));
    animator.ticker(Rx.Observable.return(0.1).repeat(15));
}


//todo
// INVEST IN BUILD AND TESTING

//why loop pos matters, unit tests
// animator.play(loop(move(point(bigSin, bigCos), spark("#FFFFFF"))));
// Vs. animator.play(move(point(bigSin, bigCos), loop(spark("#FFFFFF"))));
//emitter
// rand normal


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
