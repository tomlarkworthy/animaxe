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


// todo
// make add a max and min value
// scale the value
// make the slider impervious to rotation (mouse movement needs to be transformed by transform matrix-1 )

/**
 * A Button is an animation but with extra mouse state attached
 */
class Slider extends Ax.Animation {
    value: Rx.Subject<number>;

    /**
     * @param postprocessor hook to do things like attach listeners without breaking the animation chaining
     */
    static rectangular(value: Rx.BehaviorSubject<number>, postprocessor ?: (Button) => void): Slider { // note Babel doesn't like this type
        var hotspot = Ax
            .withinPath(Ax
                .lineTo([ 20,  0])
                .lineTo([ 20, 20])
                .lineTo([  0, 20])
                .lineTo([  0,  0])
            );


        value.subscribe(x => console.log("pre construction value changed", x));

        var slider = new Slider(
            hotspot,
            new events.ComponentMouseState(),
            new events.ComponentMouseState(),
            value,
            Ax.fillStyle("red"),    /* pressed */
            Ax.fillStyle("orange"), /* over */
            Ax.fillStyle("white")   /* idle */

        ); /* idle */

        if (postprocessor) postprocessor(slider);

        return slider;
    }

    constructor(public hotspot: Ax.PathAnimation, // Babel doesn't like public modifier
                public knobMouseState: events.ComponentMouseState, // Babel doesn't like public modifier
                public canvasMouseState: events.ComponentMouseState, // Babel doesn't like public modifier
                value: Rx.Subject<number>,
                onMouseDownKnob: Ax.Animation,
                onMouseOverKnob: Ax.Animation,
                onIdleKnob: Ax.Animation
    ) {
        // we build a grand animation pipeline either side of the hot spot,
        // then we use the total pipeline's attach function as the attach function for this animation
        // so the constructed Button exposes a richer API (e.g. state) than a basic animation normally wouldn't
        // todo slider value is not changed relatively
        super(Ax.Empty
            .pipe(events.CanvasMouseEventHandler(canvasMouseState)) //global mouse listener
            .parallel([
                Ax.Empty
                    .translate(Parameter.point(0, Parameter.updateFrom(0, value)))
                    .if(knobMouseState.isMouseDown(), onMouseDownKnob)   // Condition the animation played based on mouse state
                    .elif(knobMouseState.isMouseOver(), onMouseOverKnob)
                    .else(onIdleKnob)
                    .pipe(hotspot)
                    .pipe(events.ComponentMouseEventHandler(knobMouseState))
                    .fill(),
                Ax.Empty //todo, the slider
            ])
            .attach);
        knobMouseState.source = this;
        this.value = value;

        this.value.subscribe(x => console.log("slider value changed", x));



        type SlideState = {eventStart: events.AxMouseEvent, valueStart: number};

        // a stream of points indicating the start of the slide move, or null if a slide move is not in progress
        var startSlideStream: Rx.Observable<SlideState> = Rx.Observable.merge<SlideState>([
            knobMouseState.mousedown
                .withLatestFrom(value,
                    (evt: events.AxMouseEvent, value: number) => {
                        return {eventStart: evt, valueStart: value}
                    }
                ),
            canvasMouseState.mouseup.map((evt: events.AxMouseEvent) => <SlideState>null)
        ]);


        // a stream of number or null, indicating the new value of the slider, or null to mean no change
        var slideChangeStream = Rx.Observable.combineLatest(
            startSlideStream,
            canvasMouseState.mousemove,
            (start: SlideState, current: events.AxMouseEvent) => {
                return start == null ? null : current.canvasCoord[1] - start.eventStart.canvasCoord[1] + start.valueStart;
            }
        ).filter(val => val != null);

        // remove the nulls from the stream, and pipe into the value for the slider.
        slideChangeStream.tap(
                v => console.log("slider: value", v),
                err => console.error(err))
            .subscribe(this.value);


    }
}

var value = new Rx.BehaviorSubject<number>(0);

//each frame, first draw black background to erase the previous contents
animator.play(Ax.fillStyle(Parameter.rgba(Parameter.updateFrom(0, value).map(x=>x*2.5), 0,0,1)).fillRect([0,0],[100,100]));

animator.play(Ax
    //.translate([40, 40])
    //.rotate(Math.PI / 4)
    .pipe(Slider.rectangular(value))
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

