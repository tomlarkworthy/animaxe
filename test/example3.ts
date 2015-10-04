/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
import Ax = require("../src/animaxe");
import Rx = require("rx");
import helper = require("./helper");
require("should");


var animator: Ax.Animator = helper.getExampleAnimator();


//fixed color, but we will fiddle with the alpha
var red   = 255;
var green = 50;
var blue = 50;

function permDot(size: number, css_color: string | Ax.ColorStream): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    var css = Ax.toStreamColor(css_color);
    return Ax.draw(
        () => {
            var css_next = css.init();
            return function(tick: Ax.DrawTick) {
                console.log("permDot: tick", css_next(tick.clock));
                tick.ctx.fillStyle = css_next(tick.clock);
                // tick.ctx.fillRect(0,0,1,1);
                tick.ctx.fillRect(-size/2, -size/2, size, size);
            }
        });
}


animator.play(Ax.changeColor("#000000", Ax.rect([0,0],[100,100]))); //draw black background
animator.play(
    Ax.clone(
        500,
        Ax.move(
            [50, 50],
            Ax.velocity(
                Ax.fixed(Ax.rndNormal(50)),
                Ax.composite("lighter",
                    Ax.parallel(
                        [
                            permDot(1, Ax.rgba(red,green,blue,Ax.t().map(t => 0.1 / (t*5 + 0.1)))),
                            permDot(5, Ax.rgba(red,green,blue,Ax.t().map(t => 0.1 / (t*5 + 0.1))))
                        ]
                    )
                ))
            )
        )
    )
);

helper.playExample("example3", 15, animator, 100, 100);


describe('example3', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example3", "ref3", function(equal) {
            equal.should.equal(true);
            done();
        })
    });
});

