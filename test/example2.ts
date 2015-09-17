/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
require('source-map-support').install();
import Ax = require("../src/animaxe");
import Rx = require("rx");
import helper = require("./helper");
require("should");


var animator: Ax.Animator = helper.getExampleAnimator();

//a line between two points of a specified thickness and color (which are temporally varying parameters)
function thickLine1tick(
    thickness: number,
    start: Ax.PointStream,
    end: Ax.PointStream,
    css_color: string | Ax.ColorStream)
: Ax.Animation {
    //console.log("thickLine1tick: ", thickness, start, end, css_color);
    var css = Ax.toStreamColor(css_color);
    return Ax.take(1, Ax.draw(
        () => {
            var css_next = css.init();
            var start_next = start.init();
            var end_next = end.init();
            return function(tick: Ax.DrawTick) {
                tick.ctx.strokeStyle = css_next(tick.clock);
                tick.ctx.beginPath();
                var startVal = start_next(tick.clock);
                var endVal = end_next(tick.clock);
                var ctx = tick.ctx;
                ctx.lineWidth = thickness;
                //console.log("thickLine1tick: drawing between ", tick.clock, startVal, endVal);
                ctx.moveTo(startVal[0], startVal[1]);
                ctx.lineTo(endVal[0], endVal[1]);
                ctx.closePath();
                ctx.stroke();
            }
        }
    ));
}

/**
 * Three frame animation of a thinning line. Animations are displaced in time so even if the start and end streams move
 * The line doesn't
 */
function sparkLine(start: Ax.PointStream, end: Ax.PointStream, css_color: string | Ax.ColorStream): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return thickLine1tick(6, //thick line
            start,
            end, css_color)
        .then(thickLine1tick(2, //medium line
            Ax.displaceT(-0.1, start),
            Ax.displaceT(-0.1, end),
            css_color))
        .then(thickLine1tick(1, //thin line
            Ax.displaceT(-0.2, start),
            Ax.displaceT(-0.2, end),
            css_color));
}

//large circle funcitons
var bigSin = Ax.sin(1).map(x => x * 40 + 50);
var bigCos = Ax.cos(1).map(x => x * 40 + 50);

//periodic color
var red   = 255;
var green = Ax.sin(2).map(x => x * 100 + 55);
var blue = 50;


animator.play(Ax.changeColor("#000000", Ax.rect([0,0],[100,100]))); //draw black background
animator.play(
        Ax.emit(
                sparkLine(
                    Ax.point(
                        bigSin,
                        bigCos
                    ),
                    Ax.displaceT(-0.1,
                        Ax.point(
                            bigSin,
                            bigCos
                        )
                    ),
                    Ax.color(red,green,blue,0.5)
                )
        )
    );

helper.playExample("example2", 20, animator);

describe('example2', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example2", "ref2", function(same) {
            console.log("example 2 equals result", same);
            same.should.equal(true);
            done();
        })
    });
});