import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/parameter";

var animator: Ax.Animator = helper.getExampleAnimator(100, 100);

animator.play(Ax
    .Empty.arc()
);

helper.playExample("example6", 2, animator, 100, 100);



