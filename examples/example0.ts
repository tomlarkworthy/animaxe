import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";

var animator: Ax.Animator = helper.getExampleAnimator();

Ax.DEBUG = true;
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#FF0000").fillRect([0,0],[100,100]));

// the helper function pipes injects the context, either from a web canvas or a fake node.js one.
helper.playExample("@name", 1, animator, 100, 100);
