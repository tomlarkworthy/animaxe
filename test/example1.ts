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


//2 frame animated glow
function spark(color: Ax.ColorArg): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return Ax
        .take(1)
        .fillStyle(color)
        .fillRect([-2, -2], [5,5])
        .then(Ax
            .take(1)
            .fillStyle(color)
            .fillRect([-1, -1], [3,3])
        );
}
//large circle funcitons
var bigSin = Parameter.sin(1).map(x => x * 40 + 50);
var bigCos = Parameter.cos(1).map(x => x * 40 + 50);

var red   = Parameter.sin(2).map(x => x * 125 + 125);
var green = Parameter.sin(2).map(x => x * 55 + 200);

//each frame, first draw black background to erase the previous contents
animator.play(Ax.fillStyle("#000000").fillRect([0,0],[100,100]));


// move the drawing context frame of reference to the center (50,50) and then move it by a +ve x velocity,
// so the frame of reference moves over time.
// then draw our 2 frame spark animation in a loop so it draws forever
animator.play(Ax
    .translate([50,50])
    .velocity([50,0])
    .loop(
        spark("#FFFFFF")
    )
);

// move the draw context to a coordinate determined by trig (i.e. in a circle)
animator.play(Ax
    .loop(Ax
        .translate(Parameter.point(bigSin, bigCos))
        .pipe(
            spark(Parameter.rgba(red, green, 0, 1))
        )
    )
);

// tween between the center (50,50) and a point on a circle. This has the effect of moving the inner spark animation
// in a archimedes spiral.
animator.play(Ax
    .tween_linear([50,50], Parameter.point(bigSin, bigCos), 1)
    .loop(
        spark("red")
    )
);

// the helper function pipes injects the context, either from a web canvas or a fake node.js one.
helper.playExample("example1", 20, animator, 100, 100);

// @end
describe('example1', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example1", "ref1", function(same) {
            same.should.equal(true);
            done();
        })
    });
});