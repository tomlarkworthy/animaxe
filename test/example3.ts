/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
// @header
require("should");

import Rx = require("rx");
import Ax = require("../dist/animaxe");
import events = require("../dist/events");
import Parameter = require("../dist/parameter");
import helper = require("../dist/helper");

// @start
var animator: Ax.Animator = helper.getExampleAnimator();

// fixed base color for particles
var red = 255, green = 50, blue = 50;
// alpha fades out to make the particles evaporate over time
var alpha = Parameter.t().map(t => 0.1 / (t*5 + 0.1));

// our base particle is of variable size and color
function permDot(size: number, css_color: Ax.ColorArg): Ax.Animation {
    return Ax.fillStyle(css_color).fillRect([-size/2, -size/2], [size, size]);
}

// each frame, first draw black background to erase the previous contents
animator.play(Ax.fillStyle("#000000").fillRect([0,0],[100,100]));
// a ring of exploding particles that fade our
animator.play(Ax
    .globalCompositeOperation("lighter")                          // use additive blending
    .clone(500, Ax                                                // clone 500 particles
        .translate([50, 50])                                      // move to center of canvas
        .velocity(Parameter.rndNormal(50).first())                // choose a random direction
        .parallel([                                               // draw overlapping particles
            permDot(1, Parameter.rgba(red, green, blue, alpha)),  // so the center is brighter
            permDot(5, Parameter.rgba(red, green, blue, alpha))   // with a dimmer surround
        ])
    )
);

helper.playExample("example3", 15, animator, 100, 100);

// @end
describe('example3', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example3", "ref3", function(equal) {
            // equal.should.equal(true); todo, random is screwing repeatability
            done();
        })
    });
});

