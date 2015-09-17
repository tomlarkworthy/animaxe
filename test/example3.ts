/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
import Ax = require("../src/animaxe");
import Rx = require("rx");
import helper = require("./helper");
require("should");


var animator: Ax.Animator = helper.getExampleAnimator();


//periodic color
var red   = 255;
var green = 50;
var blue = 50;

function permDot(css_color: string | Ax.ColorStream): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    var css = Ax.toStreamColor(css_color);
    return Ax.draw(
        () => {
            var css_next = css.init();
            return function(tick: Ax.DrawTick) {
                console.log("permDot: tick", css_next(tick.clock));
                tick.ctx.fillStyle = css_next(tick.clock);
                // tick.ctx.fillRect(0,0,1,1);
                tick.ctx.fillRect(-1,-1,3,3);
            }
        });
}


animator.play(Ax.changeColor("#000000", Ax.rect([0,0],[100,100]))); //draw black background
animator.play(
        Ax.clone(
                500,
                Ax.move(
                    //Ax.fixed(Ax.point(Ax.rnd().map(x => x * 5 + 48), Ax.rnd().map(x => x * 5 + 48))),
                    [50, 50],
                    Ax.velocity(
                        Ax.fixed(Ax.rndNormal(50)),
                        Ax.composite("lighter", permDot(Ax.color(red,green,blue,0.1))) // 0.2 is very transparent
                        //permDot(Ax.color(red,green,blue,0.9)) // 0.2 is very transparent
                    )
                )
        )
);

helper.playExample("example3", 15, animator);


describe('example3', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example3", "ref3", function(equal) {
            equal.should.equal(true);
            done();
        })
    });
});

