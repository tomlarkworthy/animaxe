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

    constructor(postprocessor?: (Button) => void) {
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
            .attach);

        if (postprocessor) postprocessor(button);
    }
}


animator.play(Ax
    .translate([50, 50])
    .rotate(Math.PI / 8)
    .pipe(new Button(
            button => {
                button.events.mousedown.subscribe(
                    (evt: events.AxMouseEvent) => console.log("Button: mousedown",  evt.animationCoord));
                button.events.mouseup.subscribe(
                    (evt: events.AxMouseEvent) => console.log("Button: mouseup",    evt.animationCoord));
                button.events.mousemove.subscribe(
                    (evt: events.AxMouseEvent) => console.log("Button: mousemove",  evt.animationCoord));
                button.events.mouseenter.subscribe(
                    (evt: events.AxMouseEvent) => console.log("Button: mouseenter", evt.animationCoord));
                button.events.mouseleave.subscribe(
                    (evt: events.AxMouseEvent) => console.log("Button: mouseleave", evt.animationCoord));
            }
        )
    )
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

