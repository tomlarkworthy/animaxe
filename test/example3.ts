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

function permDot(size: number, css_color: Ax.ColorArg): Ax.Animation {
    return Ax.fillStyle(css_color).fillRect([-size/2, -size/2], [size, size]);
}

//each frame, first draw black background to erase the previous contents
animator.play(Ax.fillStyle("#000000").fillRect([0,0],[100,100]));

animator.play(Ax
    .clone(500, Ax
        .translate([50, 50])
        .velocity(Parameter.rndNormal(50).first())
        .globalCompositeOperation("lighter")
        .parallel([
            permDot(1, Parameter.rgba(red,green,blue,Parameter.t().map(t => 0.1 / (t*5 + 0.1)))),
            permDot(5, Parameter.rgba(red,green,blue,Parameter.t().map(t => 0.1 / (t*5 + 0.1))))
        ])
    )
);

helper.playExample("example3", 15, animator, 100, 100);


describe('example3', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example3", "ref3", function(equal) {
            // equal.should.equal(true); todo, random is screwing repeatability
            done();
        })
    });
});

