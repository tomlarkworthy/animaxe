import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";

var animator: Ax.Animator = helper.getExampleAnimator(100, 100);


// todo
// make add a max and min value
// scale the value
// make the slider impervious to rotation (mouse movement needs to be transformed by transform matrix-1 )

/**
 * A Button is an animation but with extra mouse state attached
 */
class Slider extends Ax.Operation {
    value: Rx.Subject<number>;

    /**
     * @param postprocessor hook to do things like attach listeners without breaking the animation chaining
     */
    static rectangular(value: Rx.BehaviorSubject<number>, postprocessor ?: (Button) => void): Slider { // note Babel doesn't like this type
        var hotspot = Ax.create()
            .withinPath(Ax.create()
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
            Ax.create().fillStyle("red"),    /* pressed */
            Ax.create().fillStyle("orange"), /* over */
            Ax.create().fillStyle("white")   /* idle */

        ); /* idle */

        if (postprocessor) postprocessor(slider);

        return slider;
    }

    constructor(public hotspot: Ax.PathAnimation, // Babel doesn't like public modifier
                public knobMouseState: events.ComponentMouseState, // Babel doesn't like public modifier
                public canvasMouseState: events.ComponentMouseState, // Babel doesn't like public modifier
                value: Rx.Subject<number>,
                onMouseDownKnob: Ax.Operation,
                onMouseOverKnob: Ax.Operation,
                onIdleKnob: Ax.Operation
    ) {
        // we build a grand animation pipeline either side of the hot spot,
        // then we use the total pipeline's attach function as the attach function for this animation
        // so the constructed Button exposes a richer API (e.g. state) than a basic animation normally wouldn't
        // todo slider value is not changed relatively
        super(Ax.create()
            .pipe(events.CanvasMouseEventHandler(canvasMouseState)) //global mouse listener
            .parallel([
                Ax.create()
                    .translate(Parameter.point(0, Parameter.updateFrom(0, value)))
                    .if(knobMouseState.isMouseDown(), onMouseDownKnob)   // Condition the animation played based on mouse state
                    .elif(knobMouseState.isMouseOver(), onMouseOverKnob)
                    .else(onIdleKnob)
                    .pipe(hotspot)
                    .pipe(events.ComponentMouseEventHandler(knobMouseState))
                    .fill(),
                Ax.create() //todo, the slider
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
animator.play(Ax.create().fillStyle(Parameter.rgba(Parameter.updateFrom(0, value).mapValue(x=>x*2.5), 0,0,1)).fillRect([0,0],[100,100]));

animator.play(Ax.create()
    //.translate([40, 40])
    //.rotate(Math.PI / 4)
    .pipe(Slider.rectangular(value))
);

helper.playExample("@name", 2, animator, 100, 100);



