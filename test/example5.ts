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
var animator: Ax.Animator = helper.getExampleAnimator(100, 100);

class Button extends Ax.Animation {
    hotspot: Ax.PathAnimation;
    events: events.ComponentMouseEvents;

    constructor() {
        this.hotspot = Ax
            .withinPath(Ax
                .lineTo([ 40,  0])
                .lineTo([ 40, 20])
                .lineTo([  0, 20])
                .lineTo([  0,  0])
            );

        this.events = new events.ComponentMouseEvents(this);

        var button = this;

        // build the animations either side of the hot spot,
        // and use the total animation's attach function as the animation primative for this class
        super(Ax
            .fillStyle(Parameter.rgba(255, 0, 0, 0.5))
            .pipe(this.hotspot)
            .pipe(events.ComponentMouseEventHandler(button.events))
            .fill()
            .attach)
    }
}
function button(): Button {
    var button =  new Button();
    button.events.mousedown.subscribe(evt => console.log("Button: mousedown", evt));
    button.events.mouseup.subscribe(evt => console.log("Button: mouseup", evt));
    button.events.mousemove.subscribe(evt => console.log("Button: mousemove", evt));
    button.events.mouseenter.subscribe(evt => console.log("Button: mouseenter", evt));
    button.events.mouseleave.subscribe(evt => console.log("Button: mouseleave", evt));
    return button;
}

animator.play(Ax
    .translate([50, 50])
    .rotate(Math.PI / 4)
    .pipe(button())
);

helper.playExample("example5", 1, animator, 100, 100);
// @end

describe('example5', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example5", "ref5", function(equal) {
            equal.should.equal(true);
            done();
        })
    });
});

