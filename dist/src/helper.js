function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/ctx-get-transform.d.ts" />
var Rx = require("rx");
var canvas = require("./CanvasAnimation");
var Ax = require("./animaxe");
__export(require("./animaxe"));
var ctx_get_transform_1 = require("./ctx-get-transform");
function getExampleAnimator(width, height) {
    if (width === void 0) { width = 100; }
    if (height === void 0) { height = 100; }
    try {
        // In a browser environment, find a canvas
        var canvas = document.getElementById("canvas");
        console.log("browser", canvas);
        var context = canvas.getContext('2d');
        ctx_get_transform_1.monkeyPatchCtxToAddGetTransform(context); //monkey patch context to get transform tracking
        var animator = new Ax.Animator(context);
        animator.registerEvents(canvas);
        return animator;
    }
    catch (err) {
        console.log("error, so assuming we are in node environment", err);
        // in a node.js environment, load a fake canvas
        console.log(err);
        var Canvas = require('canvas');
        var canvas = new Canvas(width, height);
        console.log("node", canvas);
        var context = canvas.getContext('2d');
        require('ctx-get-transform')(context); //monkey patch context to get transform tracking
        return new Ax.Animator(context);
    }
}
exports.getExampleAnimator = getExampleAnimator;
function playExample(name, frames, animator, width, height) {
    try {
        //browser
        var time;
        var render = function () {
            window.requestAnimationFrame(render);
            var now = new Date().getTime(), dt = now - (time || now);
            time = now;
            animator.tick(dt * 0.001);
        };
        render();
    }
    catch (err) {
        console.log("error, so assuming we are in node environment", err);
        //node.js
        animator.play(canvas.save(width, height, "images/" + name + ".gif"));
        animator.ticker(Rx.Observable.return(0.1).repeat(Math.floor(frames)));
    }
}
exports.playExample = playExample;
function sameExample(name, ref, cb) {
    try {
        throw new Error("not implemented");
    }
    catch (err) {
        //node.js
        var cmp = require("file-compare");
        var file1 = "images/" + name + ".gif";
        var file2 = "images/" + ref + ".gif";
        return cmp.compare(file1, file2, cb);
    }
}
exports.sameExample = sameExample;
