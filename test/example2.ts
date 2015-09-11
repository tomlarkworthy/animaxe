/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/should.d.ts" />
require('source-map-support').install();
import Ax = require("../src/animaxe");
import Rx = require("rx");

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

var animator: Ax.Animator = new Ax.Animator(context); /*should be based on context*/


function thickLine1tick(
    thickness: number,
    start: Ax.PointStream,
    end: Ax.PointStream,
    css_color: string | Ax.ColorStream)
: Ax.Animation {
    //console.log("thickLine1tick: ", thickness, start, end, css_color);

    var css = Ax.toStreamColor(css_color);
    return Ax.take(1, Ax.draw(function(tick: Ax.DrawTick) {
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
    }, null, [start, end]));
}

function sparkLine(start: Ax.PointStream, end: Ax.PointStream, css_color: string | Ax.ColorStream): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return thickLine1tick(6,
            start,
            end, css_color)
        .then(thickLine1tick(2,
            Ax.previous(start), // todo, this method does not get called every round
            Ax.previous(end),
            css_color))
        .then(thickLine1tick(1,
            Ax.previous(Ax.previous(start)),
            Ax.previous(Ax.previous(end)),
            css_color));

    /*
    return thickLine1tick(6,
            start,
            end, css_color)
        .then(thickLine1tick(2,
            start,
            end, css_color))
        .then(thickLine1tick(1,
            start,
            end, css_color));*/
    /*
    return thickLine1tick(6,
            start,
            end, css_color);*/
}

//large circle funcitons
var bigSin = Ax.sin(1).map(x => x * 40 + 50);
var bigCos = Ax.cos(1).map(x => x * 40 + 50);

var red   = Ax.sin(2).map(x => x * 125 + 125);
var green = Ax.sin(2).map(x => x * 55 + 200);


//animator.play(Ax.changeColor("#000000", Ax.rect([0,0],[100,100]))); //draw black background
animator.play(
        Ax.loop(
            Ax.assertClock(
                [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                sparkLine(
                    Ax.point(
                        Ax.previous(Ax.sin(1).map(x => x * 40 + 50)),
                        Ax.previous(Ax.cos(1).map(x => x * 40 + 50))
                    ),
                    Ax.point(
                        Ax.sin(1).map(x => x * 40 + 50),
                        Ax.cos(1).map(x => x * 40 + 50)),
                    Ax.color(red,green,0,0.5)
                )
            )
        )
    );

try {
    //browser
    var time;
    var render = function() {
        window.requestAnimationFrame(render);
        var now = new Date().getTime(),
            dt = now - (time || now);
        time = now;
        animator.root.onNext(new Ax.DrawTick(animator.ctx, 0, dt/1000));
    };
    render();
} catch(err) {
    //node.js
    animator.play(Ax.save(100, 100, "images/tutorial2.gif"));
    animator.ticker(Rx.Observable.return(0.1).repeat(10));
}
