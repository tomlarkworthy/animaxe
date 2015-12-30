import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";

var animator: Ax.Animator = helper.getExampleAnimator(100, 100);

//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0,0],[100,100]));

// we draw single pixels of different hues moving on a circle circumference
animator.play(
    Ax.create().parallel(
        Ax.range(0, 5).map(
            offset => Ax.create()
                .skewT(offset * 0.1)
                .translate(Parameter.point(
                        Parameter.sin(Parameter.t()).mapValue(x => 45 * (x + 1)),
                        Parameter.cos(Parameter.t()).mapValue(x => 45 * (x + 1))
                    )
                )
                .fillStyle("white").fillRect([-1, -1], [3,3])
        )    
    )
);

helper.playExample("@name", 20, animator, 100, 100);

