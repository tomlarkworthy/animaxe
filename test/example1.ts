/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
import Ax = require("../src/animaxe");
import Rx = require("rx");
import helper = require("./helper");
import fs = require("fs");
require("should");

var animator: Ax.Animator = helper.getExampleAnimator();

//2 frame animated glow
function spark(css_color: string | Ax.ColorStream): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    var css = Ax.toStreamColor(css_color);
    return Ax.take(1, Ax.draw(
        () => {
            var css_next = css.init();
            return function(tick: Ax.DrawTick) {
                console.log("spark: frame1", css_next(tick.clock));
                tick.ctx.fillStyle = css_next(tick.clock);
                tick.ctx.fillRect(-2,-2,5,5);
            }
        })).then(
        Ax.take(1, Ax.draw(
            () => {
                var css_next = css.init();
                return function(tick: Ax.DrawTick) {
                    console.log("spark: frame2", css_next(tick.clock));
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
                console.log("sparkLong", css_color);
                tick.ctx.fillStyle = css_color;
                tick.ctx.fillRect(-1,-1,3,3);
            }
        }
    );
}

//large circle funcitons
var bigSin = Ax.sin(1).map(x => x * 40 + 50);
var bigCos = Ax.cos(1).map(x => x * 40 + 50);

var red   = Ax.sin(2).map(x => x * 125 + 125);
var green = Ax.sin(2).map(x => x * 55 + 200);

animator.play(Ax.changeColor("#000000", Ax.rect([0,0],[100,100]))); //draw black background
animator.play(Ax.loop(Ax.move(Ax.point(bigSin, bigCos), spark(Ax.color(red,green,0,0.5))))); //spinning spark forever
animator.play(Ax.move([50,50], Ax.velocity([50,0], Ax.loop(spark("#FFFFFF"))))); //constant move
animator.play(Ax.tween_linear([50,50], Ax.point(bigSin, bigCos), 1, Ax.loop(spark("red")))); //spiral 1 second


helper.playExample("example1", 20, animator);

describe('example1', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example1", "ref1", function(same) {
            same.should.equal(true);
            done();
        })
    });
});