import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";
import * as svg from "../src/svg";

var animator: Ax.Animator = helper.getExampleAnimator(100, 100);

/*
animator.play(
    svg.svgpath(Ax.create().beginPath().strokeStyle("red"), "M25 25 L75 25 L75 75 L25 75 Z").stroke()    
);

// todo SVG are not on independant paths

// Can't do relative mode (lower case letter, shoudl be in 2nd column)
animator.play(svg.svgpath(Ax.create().beginPath().strokeStyle("blue"),
  'M3,7 5-6 L1,7 1e2-.4 M-10,10 L10,0  ' +
//  'V27 89 H23           v10 h10             ' +
  'C33,43 38,47 43,47   C0,5 5,10 10,10     ' +
//  'S63,67 63,67         s-10,10 10,10       ' +  Smooth curve
  'Q50,50 73,57         Q20,-5 0,-10        '
//  'T70,40               t0,-15              ' + Smooth quad curve
//  'A5,5 45 1,0 40,20    A5,5 20 0,1 -10-10  Z') rotated eliptical curve
  ).stroke()
);

*/

// Using http://anthonydugois.com/svg-path-builder/

animator.play(svg.svgpath(Ax.create().beginPath().strokeStyle("yellow").scale([0.1, 0.1]),
  'M350 300 A50 50 0 1 0 150 300' // TODO: fix scaling on undersized r values
  ).stroke()
);

 
helper.playExample("@name", 1, animator, 100, 100);
