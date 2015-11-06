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

    /**
     * creates a button
     * @param postprocessor a hook for attaching listeners so you can chain the button to other animations without interruption
     */
    constructor(postprocessor?: (Button) => void) {
        // we need animations before an after the hotspot's path to create a complete button
        // first lets deal with the path that listens to the mouse
        this.hotspot = Ax
            .withinPath(Ax
                .lineTo([ 40,  0])
                .lineTo([ 40, 20])
                .lineTo([  0, 20])
                .lineTo([  0,  0])
            );

        this.events = new events.ComponentMouseEvents(this);

        // now build the animations either side of the hot spot sandwich,
        // then we use the total sandwiches attach function as the animation attach for this class
        // so the Button Animation subclass exposes a richer API (i.e. events) than a basic animation normally would

        super(Ax.Empty
            .if(this.events.isMouseDown(),
                Ax.fillStyle(Parameter.rgba(255, 0, 0, 0.5)))
            .elif(this.events.isMouseOver(),
                Ax.fillStyle(Parameter.rgba(0, 255, 0, 0.5)))
            .else(
                Ax.fillStyle(Parameter.rgba(0, 0, 255, 0.5)))
            .pipe(this.hotspot)
            .pipe(events.ComponentMouseEventHandler(this.events))
            .fill()
            .attach);

        if (postprocessor) postprocessor(this);
    }
}

//each frame, first draw black background to erase the previous contents
animator.play(Ax.fillStyle("#000000").fillRect([0,0],[100,100]));

animator.play(Ax
    .translate([40, 40])
    .rotate(Math.PI / 4)
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

helper.playExample("example5", 2, animator, 100, 100);
// @end

describe('example5', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("example5", "ref5", function(equal) {
            equal.should.equal(true);
            done();
        })
    });
});

