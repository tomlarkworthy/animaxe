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
//2 frame animated glow
function spark(css_color) {
    var css = Ax.toStreamColor(css_color);
    return Ax.take(1, Ax.draw(function (tick) {
        console.log("spark: frame1", css.next());
        tick.ctx.fillStyle = css.next();
        tick.ctx.fillRect(-2, -2, 5, 5);
    })).then(Ax.take(1, Ax.draw(function (tick) {
        console.log("spark: frame2", css.next());
        tick.ctx.fillStyle = css.next();
        tick.ctx.fillRect(-1, -1, 3, 3);
    })));
}
function sparkLong(css_color) {
    return Ax.draw(function (tick) {
        console.log("sparkLong", css_color);
        tick.ctx.fillStyle = css_color;
        tick.ctx.fillRect(-1, -1, 3, 3);
    });
}
//large circle funcitons
var bigSin = Ax.sin(1).map(function (x) { return x * 40 + 50; });
var bigCos = Ax.cos(1).map(function (x) { return x * 40 + 50; });
var red = Ax.sin(2).map(function (x) { return x * 125 + 125; });
var green = Ax.sin(2).map(function (x) { return x * 55 + 200; });
animator.play(Ax.changeColor("#000000", Ax.rect([0, 0], [100, 100]))); //draw black background
animator.play(Ax.loop(Ax.move(Ax.point(bigSin, bigCos), spark(Ax.color(red, green, 0, 0.5))))); //spinning spark forever
animator.play(Ax.move([50, 50], Ax.velocity([50, 0], Ax.loop(spark("#FFFFFF"))))); //constant move
animator.play(Ax.tween_linear([50, 50], Ax.point(bigSin, bigCos), 1, Ax.loop(spark("red")))); //spiral 1 second
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
    animator.play(Ax.save(100, 100, "images/tutorial1.gif"));
    animator.ticker(Rx.Observable.return(0.1).repeat(20));
}
