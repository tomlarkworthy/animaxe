/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />

require("should");

import Ax = require("../dist/animaxe");
import Parameter = require("../dist/parameter");
import helper = require("../dist/helper");

var animator: Ax.Animator = helper.getExampleAnimator();

//a line between two points of a specified thickness and color (which are temporally varying parameters)
function thickLine1tick(
    thickness: number,
    start: Ax.PointArg,
    end: Ax.PointArg,
    css_color: string | Ax.ColorArg)
: Ax.Animation {
    //console.log("thickLine1tick: ", thickness, start, end, css_color);
    return Ax.take(1, Ax.draw(
        () => {
            var css_next = Parameter.from(css_color).init();
            var start_next = Parameter.from(start).init();
            var end_next = Parameter.from(end).init();
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
function sparkLine(start: Ax.PointArg, end: Ax.PointArg, css_color: Ax.ColorArg): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return thickLine1tick(6, //thick line
            start,
            end, css_color)
        .then(thickLine1tick(2, //medium line
            Parameter.displaceT(-0.1, start),
            Parameter.displaceT(-0.1, end),
            css_color))
        .then(thickLine1tick(1, //thin line
            Parameter.displaceT(-0.2, start),
            Parameter.displaceT(-0.2, end),
            css_color));
}

//large circle funcitons
var bigSin = Parameter.sin(1).map(x => x * 40 + 50);
var bigCos = Parameter.cos(1).map(x => x * 40 + 50);

//periodic color
var red   = 255;
var green = Parameter.sin(2).map(x => x * 100 + 55);
var blue = 50;


animator.play(Ax.changeColor("#000000", Ax.rect([0,0],[100,100]))); //draw black background
animator.play(
        Ax.emit(
                sparkLine(
                    Parameter.point(
                        bigSin,
                        bigCos
                    ),
                    Parameter.displaceT(-0.1,
                        Parameter.point(
                            bigSin,
                            bigCos
                        )
                    ),
                    Parameter.rgba(red,green,blue,1)
                )
        )
    );

helper.playExample("example2", 20, animator, 100, 100);

describe('example2', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example2", "ref2", function(same) {
            console.log("example 2 equals result", same);
            same.should.equal(true);
            done();
        })
    });
});