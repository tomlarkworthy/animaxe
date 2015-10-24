/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />

require("should");

import Ax = require("../dist/animaxe");
import Parameter = require("../dist/parameter");
import helper = require("../dist/helper");


var animator: Ax.Animator = helper.getExampleAnimator();


//fixed color, but we will fiddle with the alpha
var red   = 255;
var green = 50;
var blue = 50;

function permDot(size: number, css_color: Ax.ColorArg): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return Ax.draw(
        () => {
            var css_next = Parameter.from(css_color).init();
            return function(tick: Ax.DrawTick) {
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
                Parameter.rndNormal(50).first(),
                Ax.composite("lighter",
                    Ax.parallel(
                        [
                            permDot(1, Parameter.rgba(red,green,blue,Parameter.t().map(t => 0.1 / (t*5 + 0.1)))),
                            permDot(5, Parameter.rgba(red,green,blue,Parameter.t().map(t => 0.1 / (t*5 + 0.1))))
                        ]
                    )
                )
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

