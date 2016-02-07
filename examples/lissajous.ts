import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";
import * as parametric from "../src/parametric";
import * as OT from "../src/frp"; // TODO this should be in Ax
import * as types from "../src/types"; // TODO this should be in Ax
import * as canvas from "../src/canvas"; // TODO this should be in Ax

var animator: Ax.Animator = helper.getExampleAnimator(100, 100);

//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0,0],[100,100]));

/**
 * 
 * A time varying set of 2D parametric equations.
 * https://en.wikipedia.org/wiki/Lissajous_curve.
 * Paramteric equations over P,  P -> x = Asin(aP + i), y = Bsin(bP)
 * ( Normally parametric equations are described using parameter t, but this is confusing
 * with the time tick so I used P to describe the free parameter in the parametric equations)
 * At each time tick, t, a lissajous curve is generated from the time-varying A,a,B,b,i parameters
 */
function lissajous(
        A: Ax.NumberArg, a: Ax.NumberArg,
        B: Ax.NumberArg, b: Ax.NumberArg, 
        i: Ax.NumberArg)
    : Parameter.Parameter<((t: number) => number)[]> {
    return Parameter.from(A).combine(
        () => (A: number, a: number, B: number, b: number, i: number) => 
            [(t: number) => A * Math.sin(a * t + i), (t: number) => B * Math.sin(b * t)],
        Parameter.from(a),
        Parameter.from(B),
        Parameter.from(b),
        Parameter.from(i)
    )
}

var twoPi = 2 * Math.PI;

// We use a numerical approximation 'trace' to sample enough P's to approximate the curve with a point list
// So every time tick, we pick some time varying numbers chosen artistically
// we pass them through lissajous to generate some parametric equations
// we then trace that to turn it into a pointlist. 
// So we have transformed the (arbitary) time varying parameters, to a time varying list of points 
var timeVaryingPointList: Parameter.Parameter<number[][]> = 
    Parameter.trace(
        lissajous(45, Parameter.t().mapValue(t => 2 + Math.sin(t)), 45, Parameter.t().mapValue(t => 2 + Math.sin(t/2)), Parameter.t()),
        Parameter.t().mapValue(t => t % twoPi), Parameter.t().mapValue(t => (t % twoPi) + twoPi),
        10,
        4,
        100000
    ).mapValue(
        (array: {point: number[], t: number}[]) => {
            return array.map(segment => segment.point);
        }
    );
           
           
// To render a time varying list of points as a joined up line, each frame we chain a moveTo and many lineTo animations together.
// As canvas animation persist over time forever, we have to use take(1) to limit the length of the animations to one frame.
// playAll is able to play a new animation generated from a time varying stream of animations.
// we can chain many animations based on values from a list, by reducing over the start of the animation chain.        
animator.play(
    Ax.create()
//.translate([50, 50])  BUG THIS DOESN'T WORK HERE?    
    .beginPath()
    .playAll(
        timeVaryingPointList.mapValue( // time varying point set is mapped to a time varying animation for squencing each frame
            (pointList: number[][]) => {
                // Convert the list of points into a single animation chain
                return pointList.reduce((animation, point: number[], index:number) => {
                    return index == 0 ? animation.moveTo(point): animation.lineTo(point)
                },
                // Start of chain, blank animation with take(1)
                // the take(1) ensure the played animation lasts 1 frame
                Ax.create().translate([50, 50]).take(1)); 
            }
        )
    )
    .strokeStyle("green")
    .lineWidth(3)
    .stroke()
);

helper.playExample("@name", 64, animator, 100, 100);

