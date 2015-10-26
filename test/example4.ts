/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />

require("should");

import Ax = require("../dist/animaxe");
import Parameter = require("../dist/parameter");
import helper = require("../dist/helper");


var animator: Ax.Animator = helper.getExampleAnimator(100, 100);

var red   = 255;
var green = 50;
var blue = 50;

function foreverDot(size: number, css_color: Ax.ColorArg): Ax.Animation {
    return Ax.fillStyle(css_color).fillRect([-size/2, -size/2], [size, size]);
}

var bigSin  = Parameter.sin(2).map(x => Math.round(x * 40 + 50));
var bigCos  = Parameter.cos(2).map(x => Math.round(x * 40 + 50));
var fastCos = Parameter.cos(1).map(x => Math.round(x * 38 + 50));
var fastSin = Parameter.sin(1).map(x => Math.round(x * 38 + 50));

//each frame, first draw black background to erase the previous contents
animator.play(Ax.fillStyle("#000000").fillRect([0,0],[100,100]));

// we draw single pixels of different hues moving on a circle circumference
animator.play(
    Ax.parallel([
        Ax.translate(Parameter.point(fastCos, fastSin)).pipe(foreverDot(1, Parameter.hsl(120, 20, 10))),
        Ax.translate(Parameter.point(bigCos, bigSin))  .pipe(foreverDot(1, Parameter.hsl(240, 20, 30))),
        Ax.translate(Parameter.point(bigSin, bigCos))  .pipe(foreverDot(1, Parameter.hsl(60, 20, 25)))
    ])
);

// we apply a glow filter last
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

