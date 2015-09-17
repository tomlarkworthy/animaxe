/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/should.d.ts" />
require('source-map-support').install();
import Ax = require("../src/animaxe");
import Rx = require("rx");

export function getExampleAnimator(): Ax.Animator {
    try {
        // In a browser environment, find a canvas
        var canvas:any = document.getElementById("canvas");
        console.log("browser", canvas);
    } catch (err) {
        // in a node.js environment, load a fake canvas
        console.log(err);
        var Canvas = require('canvas');
        var canvas = new Canvas(100, 100);
        console.log("node", canvas);
    }

    var context: CanvasRenderingContext2D = canvas.getContext('2d');
    return new Ax.Animator(context);
}

export function playExample(name: string, frames: number, animator: Ax.Animator) {
    try {
        //browser
        var time;
        var render = function() {
            window.requestAnimationFrame(render);
            var now = new Date().getTime(),
                dt = now - (time || now);
            time = now;
            animator.root.onNext(new Ax.DrawTick(animator.ctx, 0, dt*0.001));
        };
        render();
    } catch(err) {
        //node.js
        animator.play(Ax.save(100, 100, "images/" + name + ".gif"));
        animator.ticker(Rx.Observable.return(0.1).repeat(frames));
    }
}

export function sameExample(name: string, ref: string, cb: (boolean) => void) {
    try {
        throw new Error("not implemented");
    } catch(err) {
        //node.js
        var cmp = require("file-compare");
        var file1 = "images/" + name + ".gif";
        var file2 = "images/" + ref + ".gif";
        return cmp.compare(file1, file2, cb);
    }
}
