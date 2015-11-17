/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
import * as Rx from "rx";
import * as events from "./events";
import * as Parameter from "./parameter";
import * as canvas from "./canvas2D";
import * as types from "./types";



export * from "./canvas2D";

console.log("Animaxe, https://github.com/tomlarkworthy/animaxe");



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
export class Animation implements canvas.CanvasAnimation{
    arc(center:PointArg, radius:NumberArg, radStartAngle:NumberArg, radEndAngle:NumberArg, counterclockwise:boolean):Animation {
        return undefined;
    }




    tween_linear(
        from: PointArg,
        to:   PointArg,
        time: NumberArg): Animation {
        return this.pipe(tween_linear(from, to, time));
    }




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
    root: Rx.Subject<Tick>;
    t: number = 0;
    events: events.Events = new events.Events();

    constructor(public ctx: CanvasRenderingContext2D) {
        this.root = new Rx.Subject<Tick>()
    }
    tick(dt: number) {
        var tick = new Tick(this.ctx, this.t, dt, this.events);
        this.t += dt;
        this.root.onNext(tick);
        this.events.clear();
    }
    ticker(dts: Rx.Observable<number>): void {
        // todo this is a bit yuck
        dts.subscribe(this.tick.bind(this), this.root.onError.bind(this.root), this.root.onCompleted.bind(this.root));
    }
    play(animation: Animation): Rx.IDisposable {
        var self = this;
        if (DEBUG) console.log("animator: play");
        var saveBeforeFrame = this.root.tapOnNext(function(tick){
            if (DEBUG) console.log("animator: ctx save");
            tick.ctx.save();
        });
        return animation
            .attach(saveBeforeFrame) // todo, it be nicer if we could chain attach
            .tap(
            function(tick){
                if (DEBUG) console.log("animator: ctx next restore");
                tick.ctx.restore();
            },function(err){
                if (DEBUG) console.log("animator: ctx err restore", err);
                self.ctx.restore();
            },function(){
                if (DEBUG) console.log("animator: ctx complete restore");
                self.ctx.restore();
            }).subscribe();
    }

    mousedown (x: number, y: number) {
        if (DEBUG_EVENTS) console.log("Animator: mousedown", x, y);
        this.events.mousedowns.push([x, y]);
    }
    mouseup (x: number, y: number) {
        if (DEBUG_EVENTS) console.log("Animator: mouseup", x, y);
        this.events.mouseups.push([x, y]);
    }
    onmousemove (x: number, y: number) {
        if (DEBUG_EVENTS) console.log("Animator: mousemoved", x, y);
        this.events.mousemoves.push([x, y]);
    }


    /**
     * Attaches listener for a canvas which will be propogated during ticks to animators that take input, e.g. UI
     */
    registerEvents(canvas:any): void {
        var self = this;
        var rect = canvas.getBoundingClientRect(); // you have to correct for padding, todo this might get stale
        canvas.onmousedown   = evt => self.mousedown  (evt.clientX - rect.left, evt.clientY - rect.top);
        canvas.onmouseup     = evt => self.mouseup    (evt.clientX - rect.left, evt.clientY - rect.top);
        canvas.onmousemove   = evt => self.onmousemove(evt.clientX - rect.left, evt.clientY - rect.top);
    }
}

types.applyMixins(Animation, [canvas.CanvasAnimation])

export var Empty: Animation = new Animation(upstream => upstream);

export function pipe(animation: Animation) {
    return animation;
}

/**
 * NOTE: currently fails if the streams are different lengths
 * @param expectedDt the expected clock tick values
 * @param after
 * @returns {Animation}
 */
export function assertDt(expectedDt: Rx.Observable<number>): Animation {
    return new Animation(function(upstream) {
        return upstream.zip(expectedDt, function(tick: Tick, expectedDtValue: number) {
            if (tick.dt != expectedDtValue) throw new Error("unexpected dt observed: " + tick.dt + ", expected:" + expectedDtValue);
            return tick;
        });
    });
}

//todo would be nice if this took an iterable or some other type of simple pull stream
// and used streamEquals
export function assertClock(assertClock: number[]): Animation {
    var index = 0;

    return new Animation(function(upstream) {
        return upstream.tapOnNext(function(tick: Tick) {
            if (DEBUG) console.log("assertClock: ", tick);
            if (tick.clock < assertClock[index] - 0.00001 || tick.clock > assertClock[index] + 0.00001) {
                var errorMsg = "unexpected clock observed: " + tick.clock + ", expected:" + assertClock[index]
                console.log(errorMsg);
                throw new Error(errorMsg);
            }
            index ++;
        });
    });
}





export function velocity(
    velocity: PointArg
): Animation {
    return draw(
        () => {
            if (DEBUG) console.log("velocity: attached");
            var pos: Point = [0.0,0.0];
            var velocity_next = Parameter.from(velocity).init();
            return function(tick) {
                tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
                var velocity = velocity_next(tick.clock);
                pos[0] += velocity[0] * tick.dt;
                pos[1] += velocity[1] * tick.dt;
            }
        }
    );
}

export function tween_linear(
    from: PointArg,
    to:   PointArg,
    time: NumberArg
): Animation
{
    return new Animation(
            function(prev: TickStream): TickStream {
            var t = 0;
            var from_next = Parameter.from(from).init();
            var to_next   = Parameter.from(to).init();
            var time_next   = Parameter.from(time).init();
            return prev.map(function(tick: Tick) {
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
        }
    );
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
    decay: NumberArg = 0.1
): Animation
{
    return draw(
        () => {
            var decay_next = Parameter.from(decay).init();
            return function (tick: Tick) {
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
        });
}



export function save(width:number, height:number, path: string): Animation {
    var GIFEncoder = require('gifencoder');
    var fs = require('fs');


    var encoder = new GIFEncoder(width, height);
    encoder.createReadStream()
      .pipe(encoder.createWriteStream({ repeat: 10000, delay: 100, quality: 1 }))
      .pipe(fs.createWriteStream(path));
    encoder.start();

    return new Animation(function (parent: TickStream): TickStream {
        return parent.tap(
            function(tick: Tick) {
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

