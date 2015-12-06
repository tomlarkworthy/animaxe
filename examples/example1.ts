import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";

var animator: Ax.Animator = helper.getExampleAnimator();

Ax.DEBUG = true;
//2 frame animated glow
function spark(color: Ax.ColorArg): Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return Ax.create()
        .take(1)
        .fillRect([-5, -5], [10,10])
        .then(Ax.create().take(1).fillRect([-2, -2], [5, 5]))
}

// move the drawing context frame of reference to the center (50,50) and then move it by a +ve x velocity,
// so the frame of reference moves over time.
// then draw our 2 frame spark animation in a loop so it draws forever
animator.play(Ax.create()
    .pipe(spark("#FF00FF"))
);
// move the draw context to a coordinate determined by trig (i.e. in a circle)
/*
animator.play(Ax.create()
    .loop(Ax.create()
        .translate(Parameter.point(bigSin, bigCos))
        .pipe(
            spark(Parameter.rgba(red, green, 0, 1))
        )
    )
);*/

// tween between the center (50,50) and a point on a circle. This has the effect of moving the inner spark animation
// in a archimedes spiral.
/*
animator.play(Ax.create()
    .tween_linear([50,50], Parameter.point(bigSin, bigCos), 1)
    .loop(
        spark("red")
    )
);*/

// the helper function pipes injects the context, either from a web canvas or a fake node.js one.
helper.playExample("@name", 20, animator, 100, 100);
