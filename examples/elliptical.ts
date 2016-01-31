
import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";
import * as svg from "../src/svg";

var animator: Ax.Animator = helper.getExampleAnimator(100, 100);

var cases = [
    /*
    'M10 20 A15 15 0 0 0 30 20', // checked against SVG behaviour
    'M40 20 A15 15 0 0 1 60 20', // checked against SVG behaviour
    'M70 20 A15 15 0 1 0 90 20', // checked against SVG behaviour
    'M10 50 A15 15 0 1 1 30 50', // checked against SVG behaviour
    
    'M50 40 A15 15 0 0 0 50 60', // checked against SVG behaviour
    'M80 40 A15 15 0 0 1 80 60', // checked against SVG behaviour
    'M20 70 A15 15 0 1 0 20 90', // checked against SVG behaviour
    'M50 70 A15 15 0 1 1 50 90', // checked against SVG behaviour
    */
    'M80 70 A5 5 0 1 1 80 90',
];

for (var t = 0; t < Math.PI * 2 ; t += 0.1) {
    var x = Math.sin(t) * 15 + 50;
    var y = Math.cos(t) * 15 + 50;
    
    // cases.push('M50 50 A5 5 0 1 1 ' + x + ' ' + y);
}
for (var i = 0; i < cases.length; i++) {
    animator.play(
        svg.svgpath(
            Ax.create().beginPath().strokeStyle("red"),
            cases[i]
        ).stroke()
    );   
}

 
helper.playExample("@name", 1, animator, 100, 100);
