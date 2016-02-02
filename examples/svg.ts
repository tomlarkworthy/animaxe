import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";
import * as svg from "../src/svg";

var animator: Ax.Animator = helper.getExampleAnimator(100, 100);

//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0,0],[100,100]));

animator.play(svg.svgpath(Ax.create().beginPath().strokeStyle("blue"),
  'M3,7 5-6 L1,7 1e2-.4 m-10,10 l10,0  ' +
  'V27 89 H23           v10 h10             ' +
  'C33,43 38,47 43,47   c0,5 5,10 10,10     ' +
//  'S63,67 63,67         s-10,10 10,10       ' +  // smooth curve to
//  'Q50,50 73,57         q20,-5 0,-10        ' +  // NaN quadratic curve :/
//  'T70,40               t0,-15              ' +  // smooth quadratic curve to
  'A5,5 45 1,0 40,20    a5,5 20 0,1 -10-10  z'
  ).stroke()
);



// Using http://anthonydugois.com/svg-path-builder/

animator.play(svg.svgpath(Ax.create().beginPath().strokeStyle("yellow").lineWidth(20).scale([0.1, 0.1]),
  'M350 300 a50 50 0 1 0 -200 0 c0 100 200 0 200 100 a50 50 0 1 1 -200 0 ' + 
  'M400 250 V%1 L500 500 L600 400 V250 ' +
  'M850 300 A50 50 0 1 0 650 300 V400 A50 50 0 1 0 850 400 V350 H750', Parameter.cos(Parameter.t()).mapValue(x => x * 400)
  ).stroke()
);

 
helper.playExample("@name", 10, animator, 100, 100);
