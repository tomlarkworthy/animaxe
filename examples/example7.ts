import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";

var animator: Ax.Animator = helper.getExampleAnimator(100, 100);

/**
 * A Button is an animation but with extra mouse state attached
 */
class Button extends Ax.Operation {
    /**
     * @param postprocessor hook to do things like attach listeners without breaking the animation chaining
     */
    static rectangular(postprocessor ?: (Button) => void): Button { // note Babel doesn't like this type
        var hotspot = Ax.create()
            .withinPath(Ax.create()
                .lineTo([ 40,  0])
                .lineTo([ 40, 20])
                .lineTo([  0, 20])
                .lineTo([  0,  0])
            );

        var button = new Button(
            hotspot,
            new events.ComponentMouseState(),
            Ax.create().fillStyle("red"),    /* pressed */
            Ax.create().fillStyle("orange"), /* over */
            Ax.create().fillStyle("white")); /* idle */

        if (postprocessor) postprocessor(button);

        return button;
    }

    constructor(public hotspot: Ax.PathAnimation, // Babel doesn't like public modifier
                public mouseState: events.ComponentMouseState, // Babel doesn't like public modifier
                onMouseDown: Ax.Operation,
                onMouseOver: Ax.Operation,
                onIdle: Ax.Operation
    ) {
        // we build a grand animation pipeline either side of the hot spot,
        // then we use the total pipeline's attach function as the attach function for this animation
        // so the constructed Button exposes a richer API (e.g. state) than a basic animation normally wouldn't

        super(Ax.create()
            .if(mouseState.isMouseDown(), onMouseDown)   // Condition the animation played based on mouse state
            .elif(mouseState.isMouseOver(), onMouseOver)
            .else(onIdle)
            .pipe(hotspot)
            .pipe(events.ComponentMouseEventHandler(mouseState))
            .fill()
            .attach);
        mouseState.source = this;
    }
}

//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0,0],[100,100]));

animator.play(Ax.create()
    .translate([40, 40])
    .rotate(Math.PI / 4)
    .pipe(Button.rectangular(
        (button: Button) => {
                button.mouseState.mousedown.subscribe(
                    (evt: events.AxMouseEvent) => console.log("Button: mousedown",  evt.animationCoord));
                button.mouseState.mouseup.subscribe(
                    (evt: events.AxMouseEvent) => console.log("Button: mouseup",    evt.animationCoord));
                button.mouseState.mousemove.subscribe(
                    (evt: events.AxMouseEvent) => console.log("Button: mousemove",  evt.animationCoord));
                button.mouseState.mouseenter.subscribe(
                    (evt: events.AxMouseEvent) => console.log("Button: mouseenter", evt.animationCoord));
                button.mouseState.mouseleave.subscribe(
                    (evt: events.AxMouseEvent) => console.log("Button: mouseleave", evt.animationCoord));
            }
        )
    )
);

helper.playExample("@name", 2, animator, 100, 100);
