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
    mousedown: Rx.Subject<events.AxMouseEvent>;
    mouseup:   Rx.Subject<events.AxMouseEvent>;

    constructor() {
        this.hotspot = Ax
            .withinPath(Ax
                .lineTo([ 20,  0])
                .lineTo([ 20, 20])
                .lineTo([  0, 20])
                .lineTo([  0,  0])
            );

        this.mousedown = new Rx.Subject<events.AxMouseEvent>();
        this.mouseup   = new Rx.Subject<events.AxMouseEvent>();

        var button = this;

        // build the animations either side of the hot spot,
        // and use the total animation's attach function as the animation primative for this class
        super(Ax
            .fillStyle(Parameter.rgba(255, 0, 0, 0.5))
            .pipe(this.hotspot)
            .draw(
                () => {
                    return (tick: Ax.Tick) => {
                        tick.events.mousedowns.forEach(
                            (evt: Ax.Point) => {
                                if (/*button.mousedown.hasObservers() && */ tick.ctx.isPointInPath(evt[0], evt[1])) {
                                    // we have to figure out the global position of this component, so the clientX and clientY
                                    // have to go backward through the transform matrix
                                    // ^ todo
                                    console.log("HIT mouse down", evt);
                                    //this.mousedown.onNext(new events.AxMouseEvent());
                                }
                            }
                        )

                    }
                }
            )
            .fill()
            .attach)
    }
}

function button(): Button {
    return new Button();
}

animator.play(Ax
    .translate([0, 0])
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

