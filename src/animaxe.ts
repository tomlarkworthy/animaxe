/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
import Rx = require('rx');

    export var DEBUG_LOOP = false;
    export var DEBUG_THEN = false;
    export var DEBUG_EMIT = false;
    export var DEBUG = false;

    var husl = require("husl");

    console.log("Animaxe, https://github.com/tomlarkworthy/animaxe");

    export class DrawTick {
        constructor (public ctx: CanvasRenderingContext2D, public clock: number, public dt: number) {}
    }

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

    // todo remove these
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
                        // console.log("fixed: val from parameter", value);
                        return value;
                    }
                }

            );
        } else {
            return new Parameter<T>(
                () => {
                    return function (clock: number) {
                        // console.log("fixed: val from constant", val);
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

    export type Point = [number, number]
    export function point(
        x: number | NumberStream,
        y: number | NumberStream
    ): PointStream
    {
        var x_stream = toStreamNumber(x);
        var y_stream = toStreamNumber(y);

        //if (DEBUG) console.log("point: init", x_stream, y_stream);
        return new Parameter(
            () => {
                var x_next = x_stream.init();
                var y_next = y_stream.init();
                return function(t: number) {
                    var result: [number, number] = [x_next(t), y_next(t)];
                    //if (DEBUG) console.log("point: next", result);
                    return result;
                }
            }
        );
    }

    /*
        RGB between 0 and 255
        a between 0 - 1
     */
    export function rgba(
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
                    if (DEBUG) console.log("color: ", val);
                    return val;
                }
            }
        );
    }

    export function hsl(
        h: number | NumberStream,
        s: number | NumberStream,
        l: number | NumberStream
    ): ColorStream
    {
        var h_stream = toStreamNumber(h);
        var s_stream = toStreamNumber(s);
        var l_stream = toStreamNumber(l);
        return new Parameter(
            () => {
                var h_next = h_stream.init();
                var s_next = s_stream.init();
                var l_next = l_stream.init();
                return function(t: number) {
                    var h_val = Math.floor(h_next(t));
                    var s_val = Math.floor(s_next(t));
                    var l_val = Math.floor(l_next(t));
                    var val = "hsl(" + h_val + "," + s_val + "%," + l_val + "%)";
                    // if (DEBUG) console.log("hsl: ", val);
                    return val;
                }
            }
        );
    }

    export function t(): NumberStream {
        return new Parameter(
            () => function (t) {
                return t;
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
                if (DEBUG) console.log("rndNormal: init");
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
                    if (DEBUG) console.log("rndNormal: val", val);
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

    export function displaceT<T>(displacement: number | Parameter<number>, value: Parameter<T>): Parameter<T> {
        var deltat: Parameter<number> = toStreamNumber(displacement);
        return new Parameter<T> (
            () => {
                var dt_next = deltat.init();
                var value_next = value.init();
                return function (t) {
                    var dt = dt_next(t);
                    if (DEBUG) console.log("displaceT: ", dt)
                    return value_next(t + dt)
                }
            }
        )
    }

    //todo: should be t as a parameter to a non tempor
    export function sin(period: number| Parameter<number>): Parameter<number> {
        if (DEBUG) console.log("sin: new");
        var period_stream = toStreamNumber(period);
        return new Parameter(
            () => {
                var period_next = period_stream.init();
                return function (t: number) {
                    var value = Math.sin(t * (Math.PI * 2) / period_next(t));
                    if (DEBUG) console.log("sin: tick", t, value);
                    return value;
                }
            }
        );
    }
    export function cos(period: number| Parameter<number>): Parameter<number> {
        if (DEBUG) console.log("cos: new");
        var period_stream = toStreamNumber(period);
        return new Parameter(
            () => {
                var period_next = period_stream.init();
                return function (t: number) {
                    var value = Math.cos(t * (Math.PI * 2) / period_next(t));
                    if (DEBUG) console.log("cos: tick", t, value);
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
        if (DEBUG) console.log("move: attached");
        var pointStream: PointStream = toStreamPoint(delta);
        return draw(
            () => {
                var point_next = pointStream.init();
                return function(tick) {
                    var point = point_next(tick.clock);
                    if (DEBUG) console.log("move:", point);
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
                    tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
                    var velocity = velocity_next(tick.clock);
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
                if (DEBUG) console.log("tween: inner");
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
                    if (DEBUG) console.log("rect: fillRect");
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
        decay: number = 0.1,
        after ?: Animation
    ): Animation
    {
        return draw(
            () => {
                return function (tick: DrawTick) {
                    var ctx = tick.ctx;

                    // our src pixel data
                    var width = ctx.canvas.width;
                    var height = ctx.canvas.height;
                    var pixels = width * height;
                    var imgData = ctx.getImageData(0,0,width,height);
                    var data = imgData.data;

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

