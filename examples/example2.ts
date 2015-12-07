import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";

var animator: Ax.Animator = helper.getExampleAnimator();

//a line between two points of a specified thickness and color (which are temporally varying parameters)
function thickLine1tick(
    thickness: number,
    start: Ax.PointArg,
    end: Ax.PointArg,
    css_color: string | Ax.ColorArg)
: Ax.Animation {
    return Ax.create()
        .take(1)
        .strokeStyle(css_color)
        .withinPath(Ax.create()
            .lineWidth(thickness)
            .moveTo(start)
            .lineTo(end)
        )
        .stroke();
}

/**
 * Three frame animation of a thinning line. Animations are displaced in time so even if the start and end streams move
 * The line doesn't
 */
function sparkLine(start: Ax.PointArg, end: Ax.PointArg, css_color: Ax.ColorArg): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return thickLine1tick(6, //thick line
            start,
            end, css_color)
        .then(thickLine1tick(2, //medium line
            Parameter.displaceT(-0.1, start),
            Parameter.displaceT(-0.1, end),
            css_color))
        .then(thickLine1tick(1, //thin line
            Parameter.displaceT(-0.2, start),
            Parameter.displaceT(-0.2, end),
            css_color));
}

//large circle funcitons
var bigSin = Parameter.sin(Parameter.t()).map(x => x * 40 + 50);
var bigCos = Parameter.cos(Parameter.t()).map(x => x * 40 + 50);

//periodic color
var red   = 255;
var green = Parameter.sin(Parameter.t().map(x => x*2)).map(x => x * 100 + 55);
var blue = 50;

//each frame, first draw black background to erase the previous contents
// animator.play(Ax.create().fillStyle("#000000").fillRect([0,0],[100,100]));

// TEST:
animator.play(
    Ax.create()
    .withinPath(Ax.create()
        .moveTo(
            Parameter.point(
                bigSin,  
                Parameter.displaceT(-0.1, bigSin)
            )
        )
    )
)
// TO DEBUG:
/*
animator.play(
    Ax.create().emit(
        sparkLine(
            Parameter.point(bigSin,bigCos),
            Parameter.displaceT(-0.1, Parameter.point(bigSin,bigCos)),
            Parameter.rgba(red,green,blue,1)
        )
    )
);
*/

helper.playExample("example2", 20, animator, 100, 100);