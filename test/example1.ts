/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />

require("should");

import Ax = require("../dist/animaxe");
import Parameter = require("../dist/parameter");
import helper = require("../dist/helper");

var animator: Ax.Animator = helper.getExampleAnimator();

//2 frame animated glow
function spark(color: Ax.ColorArg): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return Ax.take(1, Ax.draw(
        () => {
            var css_next = Parameter.from(color).init();
            return function(tick: Ax.DrawTick) {
                tick.ctx.fillStyle = css_next(tick.clock);
                tick.ctx.fillRect(-2,-2,5,5);
            }
        })).then(
            Ax.take(1, Ax.draw(
            () => {
                var css_next = Parameter.from(color).init();
                return function(tick: Ax.DrawTick) {
                    tick.ctx.fillStyle = css_next(tick.clock);
                    tick.ctx.fillRect(-1,-1,3,3);
                }
            }
        ))
    );
}

function sparkLong(css_color: string): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return Ax.draw(
        () => {
            return function(tick: Ax.DrawTick) {
                tick.ctx.fillStyle = css_color;
                tick.ctx.fillRect(-1,-1,3,3);
            }
        }
    );
}

//large circle funcitons
var bigSin = Parameter.sin(1).map(x => x * 40 + 50);
var bigCos = Parameter.cos(1).map(x => x * 40 + 50);

var red   = Parameter.sin(2).map(x => x * 125 + 125);
var green = Parameter.sin(2).map(x => x * 55 + 200);

animator.play(Ax.changeColor("#000000", Ax.rect([0,0],[100,100]))); //draw black background
animator.play(Ax.loop(Ax.move(Parameter.point(bigSin, bigCos), spark(Parameter.rgba(red,green,0, 1))))); //spinning spark forever
animator.play(Ax.move([50,50], Ax.velocity([50,0], Ax.loop(spark("#FFFFFF"))))); //constant move
animator.play(Ax.tween_linear([50,50], Parameter.point(bigSin, bigCos), 1, Ax.loop(spark("red")))); //spiral 1 second


helper.playExample("example1", 20, animator, 100, 100);

describe('example1', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example1", "ref1", function(same) {
            same.should.equal(true);
            done();
        })
    });
});