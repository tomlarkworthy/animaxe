/**
 * An Illistration of the order of operations of
   Ax.create()  // begin an new animation tree
  .strokeStyle("green") // top of animation tree the style is set to green
  .parrallel([
    Ax.create().stroke() // stroke green, downstream of parrallel
    Ax.create().strokeStyle("red").stroke(), //stroke red
    Ax.create().stroke() // stroke green, not affected by red sibling
  ])
  .stroke() // stroke green, downstream of parrallel which is downstream of top
])
 */
var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var Parameter = require("../src/Parameter");
var animator = helper.getExampleAnimator();
function flowNode(pos, label, id, active) {
    return Ax.create().translate(pos).fillText(label);
}
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
var timeline = Parameter.constant(1).take(1).then(Parameter.constant(1).take(2));
// move the drawing context frame of reference to the center (50,50) and then move it by a +ve x velocity,
// so the frame of reference moves over time.
// then draw our 2 frame spark animation in a loop so it draws forever
animator.play(flowNode([50, 50], "Ax.create()", 0, timeline));
// the helper function pipes injects the context, either from a web canvas or a fake node.js one.
helper.playExample("@name", 20, animator, 100, 100);
