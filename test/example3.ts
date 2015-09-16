/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/should.d.ts" />
require('source-map-support').install();
import Ax = require("../src/animaxe");
import Rx = require("rx");
import helper = require("./helper");


var animator: Ax.Animator = helper.getExampleAnimator();


//periodic color
var red   = 255;
var green = Ax.sin(2).map(x => x * 100 + 55);
var blue = 50;

function premSpark(css_color: string | Ax.ColorStream): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    var css = Ax.toStreamColor(css_color);
    return Ax.draw(function(tick: Ax.DrawTick) {
        console.log("perm spark", css.next(tick.clock));
        tick.ctx.fillStyle = css.next(tick.clock);
        tick.ctx.fillRect(-2,-2,5,5);
    });
}


animator.play(Ax.changeColor("#000000", Ax.rect([0,0],[100,100]))); //draw black background
animator.play(
        Ax.clone(
                5,
                Ax.move(
                    [50, 50],
                    Ax.velocity(
                        Ax.rndNormal(50),
                        premSpark(Ax.color(red,green,blue,0.5))
                    )
                )
        )
);

helper.playExample("example3", 10, animator);

