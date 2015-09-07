/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/should.d.ts" />
require('source-map-support').install();
var Ax = require("../src/animaxe");
var Rx = require("rx");
//create an animator, at 30FPS
try {
    var canvas = document.getElementById("canvas");
    console.log("browser", canvas);
}
catch (err) {
    console.log(err);
    var Canvas = require('canvas');
    var canvas = new Canvas(100, 100);
    console.log("node", canvas);
}
console.log("context", context);
var context = canvas.getContext('2d');
var animator = new Ax.Animator(context); /*should be based on context*/
function thickLine1tick(thickness, start, end, css_color) {
    //console.log("thickLine1tick: ", thickness, start, end, css_color);
    var css = Ax.toStreamColor(css_color);
    return Ax.take(1, Ax.draw(function (tick) {
        tick.ctx.strokeStyle = css.next();
        tick.ctx.beginPath();
        var startVal = start.next();
        var endVal = end.next();
        var ctx = tick.ctx;
        ctx.lineWidth = thickness;
        console.log("thickLine1tick: drawing between ", startVal, endVal);
        ctx.moveTo(startVal[0], startVal[1]);
        ctx.lineTo(endVal[0], endVal[1]);
        ctx.closePath();
        ctx.stroke();
    }));
}
function sparkLine(start, end, css_color, clock) {
    return thickLine1tick(6, start, end, css_color)
        .then(thickLine1tick(2, Ax.previous(start, clock), Ax.previous(end, clock), css_color))
        .then(thickLine1tick(1, Ax.previous(Ax.previous(start, clock), clock), Ax.previous(Ax.previous(end, clock), clock), css_color));
}
//large circle funcitons
var bigSin = Ax.sin(1, animator.clock()).map(function (x) { return x * 40 + 50; });
var bigCos = Ax.cos(1, animator.clock()).map(function (x) { return x * 40 + 50; });
var red = Ax.sin(2, animator.clock()).map(function (x) { return x * 125 + 125; });
var green = Ax.sin(2, animator.clock()).map(function (x) { return x * 55 + 200; });
animator.play(Ax.changeColor("#000000", Ax.rect([0, 0], [100, 100]))); //draw black background
animator.play(Ax.loop(sparkLine(Ax.point(Ax.previous(bigSin, animator.clock()), Ax.previous(bigCos, animator.clock())), Ax.point(bigSin, bigCos), Ax.color(red, green, 0, 0.5), animator.clock())));
try {
    //browser
    var time;
    var render = function () {
        window.requestAnimationFrame(render);
        var now = new Date().getTime(), dt = now - (time || now);
        time = now;
        animator.root.onNext(new Ax.DrawTick(animator.ctx, dt / 1000));
    };
    render();
}
catch (err) {
    //node.js
    animator.play(Ax.save(100, 100, "images/tutorial2.gif"));
    animator.ticker(Rx.Observable.return(0.1).repeat(20));
}
