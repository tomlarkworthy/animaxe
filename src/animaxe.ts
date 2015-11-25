/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
import * as Rx from "rx";
import * as events from "./events";
import * as Parameter from "./parameter";
import * as canvas from "./CanvasAnimation";
import * as types from "./types";
import * as OT from "./CanvasAnimation";
export * from "./types";



export * from "./CanvasAnimation";

console.log("Animaxe, https://github.com/tomlarkworthy/animaxe");

export var DEBUG = false;
export var DEBUG_EVENTS = false;

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



export class Animator{
    root: Rx.Subject<canvas.CanvasTick>;
    t: number = 0;
    events: events.Events = new events.Events();

    constructor(public ctx: CanvasRenderingContext2D) {
        this.root = new Rx.Subject<canvas.CanvasTick>()
    }
    tick(dt: number) {
        var tick = new canvas.CanvasTick(this.t, dt, this.ctx, this.events);
        this.t += dt;
        this.root.onNext(tick);
        this.events.clear();
    }
    ticker(dts: Rx.Observable<number>): void {
        // todo this is a bit yuck
        dts.subscribe(this.tick.bind(this), this.root.onError.bind(this.root), this.root.onCompleted.bind(this.root));
    }
    play(animation: canvas.Animation): Rx.IDisposable {
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

/**
 * NOTE: currently fails if the streams are different lengths
 * @param expectedDt the expected clock tick values
 * @param after
 * @returns {Animation}
 */
export function assertDt(expectedDt: Rx.Observable<number>): canvas.Animation {
    return new canvas.Animation(function(upstream) {
        return upstream.zip(expectedDt, function(tick: canvas.CanvasTick, expectedDtValue: number) {
            if (tick.dt != expectedDtValue) throw new Error("unexpected dt observed: " + tick.dt + ", expected:" + expectedDtValue);
            return tick;
        });
    });
}

//todo would be nice if this took an iterable or some other type of simple pull stream
// and used streamEquals
export function assertClock(assertClock: number[]): canvas.Animation {
    var index = 0;

    return new canvas.Animation(function(upstream) {
        return upstream.tapOnNext(function(tick: canvas.CanvasTick) {
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







