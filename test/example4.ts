/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />

require("should");

import Ax = require("../dist/animaxe");
import Parameter = require("../dist/parameter");
import helper = require("../dist/helper");


var animator: Ax.Animator = helper.getExampleAnimator(100, 100);


//fixed color, but we will fiddle with the alpha
var red   = 255;
var green = 50;
var blue = 50;

function permDot(size: number, css_color: Ax.ColorArg, after?: Ax.Animation): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return Ax.draw(
        () => {
            var css_next = Parameter.from(css_color).init();
            return function(tick: Ax.DrawTick) {
                // console.log("permDot: tick", css_next(tick.clock));
                tick.ctx.fillStyle = css_next(tick.clock);
                //tick.ctx.fillRect(0,0,1,1);
                tick.ctx.fillRect(-size/2, -size/2, size, size);
            }
        }, after
    );
}

var bigSin  = Parameter.sin(2).map(x => Math.round(x * 40 + 50));
var bigCos  = Parameter.cos(2).map(x => Math.round(x * 40 + 50));
var fastCos = Parameter.cos(1).map(x => Math.round(x * 38 + 50));
var fastSin = Parameter.sin(1).map(x => Math.round(x * 38 + 50));

animator.play(Ax.changeColor("#000000", Ax.rect([0,0],[100,100]))); //draw black background
animator.play(
    Ax.parallel([
        Ax.move(Parameter.point(fastCos, fastSin), permDot(1, Parameter.hsl(120, 20, 10))),
        Ax.move(Parameter.point(bigCos, bigSin),   permDot(1, Parameter.hsl(240, 20, 30))),
        Ax.move(Parameter.point(bigSin, bigCos),   permDot(1, Parameter.hsl(60, 20, 25)))
    ])
);
animator.play(Ax.glow(0.01));

helper.playExample("example4", 20, animator, 100, 100);

describe('example4', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example4", "ref4", function(equal) {
            equal.should.equal(true);
            done();
        })
    });
});

