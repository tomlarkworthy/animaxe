import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";
import * as parametric from "../src/parametric";

var animator: Ax.Animator = helper.getExampleAnimator(100, 100);

//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0,0],[100,100]));

// we draw single pixels of different hues moving on a circle circumference
animator.play(
    Ax.create()
    .beginPath()
    .pipe(
        parametric.trace(
                [/* x */ t => Math.sin(t*2) * 45 + 50, /* y */t => Math.cos(t) * 45 + 50],
                /* t = 0 ... */ 0, Math.PI * 2,
                /* TODO: accuracy */ 1,
                4
        )
        .map(segment => segment.point) // t values discarded, the result is an array of 2D points, i.e. [number, number][]
        .reduce( /* TODO: we have no reduce on time varying functions */
            (animation: Ax.Animation, point, index) => 
                index == 0 ? animation.moveTo(point): animation.lineTo(point), // chain line path commands, spacial case index = 0
            Ax.create()
        )
    )
    .strokeStyle("green")
    .stroke()
);

helper.playExample("@name", 20, animator, 100, 100);

