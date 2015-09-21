/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
import Ax = require("../src/animaxe");
import Rx = require("rx");
import helper = require("./helper");
require("should");


var animator: Ax.Animator = helper.getExampleAnimator(100, 100);


//fixed color, but we will fiddle with the alpha
var red   = 255;
var green = 50;
var blue = 50;

function permDot(size: number, css_color: string | Ax.ColorStream, after: Ax.Animation): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    var css = Ax.toStreamColor(css_color);
    return Ax.draw(
        () => {
            var css_next = css.init();
            return function(tick: Ax.DrawTick) {
                // console.log("permDot: tick", css_next(tick.clock));
                tick.ctx.fillStyle = css_next(tick.clock);
                //tick.ctx.fillRect(0,0,1,1);
                tick.ctx.fillRect(-size/2, -size/2, size, size);
            }
        }, after
    );
}


animator.play(Ax.changeColor("#000000", Ax.rect([0,0],[100,100]))); //draw black background
animator.play(
    Ax.parallel([
        Ax.move([25, 60], permDot(1, Ax.hsl(120, 50, 30))),
        Ax.move([75, 25], permDot(1, Ax.hsl(120, 100, 75))),
        Ax.move([25, 75], permDot(5, Ax.hsl(240, 80, 50))),
        Ax.move([75, 75], permDot(1, Ax.hsl(120, 10, 25)))
    ])
);
animator.play(Ax.glow(0.01));

helper.playExample("example4", 1, animator, 100, 100);

describe('example4', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example4", "ref4", function(equal) {
            equal.should.equal(true);
            done();
        })
    });
});

