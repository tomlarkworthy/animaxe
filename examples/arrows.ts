
// 'M200 150 h250 v-50 l350 100 l-350 100 v-50 h-250 z'

import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";
import * as svg from "../src/svg";

var animator: Ax.Animator = helper.getExampleAnimator(100, 100);

//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0,0],[100,100]));



// TODO move to Parameter
function linearControl(
    initialValue: number, 
    maxVelocity: Ax.NumberArg, 
    targetValue: Ax.NumberArg): Parameter.Parameter<number> {
    console.log("build: linearControl");
    return Parameter.dt().combine(
        () => {
            var current = initialValue;
            return (dt: number, target: number, maxVel: number) => {
                var error =  target - current;
                var velocity: number = error / dt; 
                if (velocity >  maxVel) velocity =  maxVel;
                if (velocity < -maxVel) velocity = -maxVel;
                
                current +=  velocity * dt;
                return current;
            }    
        },
        Parameter.from(maxVelocity),
        Parameter.from(targetValue)
    )
}

type ArrowSignal = "OPEN" | "CLOSE" | "EXIT";

class Arrow extends Ax.Operation {
    commands: Rx.Observer<ArrowSignal>; // signals into a state machine
//    state: Rx.Observable<ArrowState>; // discrete state of animation
}
// Simple arrow that points to (0,0)
// -->
function simpleArrow(
    stemWidth: Ax.NumberArg, stemLength: Ax.NumberArg, 
    arrowWidth: Ax.NumberArg, arrowLength: Ax.NumberArg, 
    speed: Ax.NumberArg, 
    cb?: (value: Arrow) => void): Arrow {
    
    
    
    // some point we will have a tick -> command parameter
    var command: Parameter.Parameter<ArrowSignal> = Parameter.constant(<ArrowSignal>"OPEN");
    
    // The intermediate representation is a number from 0 - 1
    // Its current state is moved in the direction of OPEN or CLOSE
    // at a linear speed
    var commandToIR = Parameter.sin(
        Parameter.t().combine(
            () => (t: number, speed: number) => {
                return t * Math.PI * 2 * speed
            },
            Parameter.from(speed)
        )
    ).mapValue(sin => sin / 2 + 0.5);
    //     topOuter--+
    //               |\
    //  /topLeft     | \
    // +--------------  \
    // |                 +--tip
    // --------------+  /
    //              /| /
    //     botInner/ |/
    
    
    
    
    var stemLengthP = Parameter.from(stemLength);
    var stemWidthP = Parameter.from(stemWidth);
    var arrowWidthP = Parameter.from(arrowWidth);
    var arrowLengthP = Parameter.from(arrowLength);
    
    /**
     * Linear interpolation
     */
    function lerp(t: number, start: number, end: number): number {
        return start + t * (end - start);
    }
    
    
    var moveToTopLeftDx = commandToIR.combine(
        () => (t: number, stemLength: number, arrowLength: number, stemWidth: number) => {
            return - stemLength - arrowLength
                       
        },
        stemLengthP,
        arrowLengthP,
        stemWidthP
    )
    
    var moveToTopLeftDy = commandToIR.combine(
        () => (t: number, stemLength: number, arrowLength: number, stemWidth: number) => {
            return -stemWidth / 2
        },
        stemLengthP,
        arrowLengthP,
        stemWidthP
    )
      
    
    var liveStemLength = commandToIR.combine(
        () => (t: number, stemLength: number, arrowLength: number) => {
            return lerp(t, stemLength/2, stemLength) 
        },
        stemLengthP,
        arrowLengthP
    )      
            
    
    var liveOverhang = commandToIR.combine(
        () => (t: number, stemWidth: number, arrowWidth: number) => {
            return arrowWidth - stemWidth
        },
        stemWidthP,
        arrowWidthP
    )
    
    var liveTipDx = commandToIR.combine(
        () => (t: number, stemWidth: number, arrowLength: number) => {
            return arrowLength
        },
        stemWidthP,
        arrowLengthP
    )
    
    var liveTipDy = commandToIR.combine(
        () => (t: number, stemWidth: number, arrowWidth: number) => {
            return arrowWidth / 2
        },
        stemWidthP,
        arrowWidthP
    )
    
    var path = svg.svgpath(Ax.create().beginPath(),
        'M%1 %2 h%3 v-%4 l%5 %6 l-%5 %6 v-%4 h-%3 z',
        moveToTopLeftDx,
        moveToTopLeftDy,
        liveStemLength,
        liveOverhang,
        liveTipDx,
        liveTipDy
    ).fill();
    // The zero to 1 IR affets each line on an SVG animation
    var arrow = new Arrow(path.attach); // todo
    if (cb !== undefined) cb(arrow);
    return arrow;
}


// Using http://anthonydugois.com/svg-path-builder/

animator.play(
    Ax.create().translate([50, 50]).fillStyle("white").pipe(
        simpleArrow(
            3, 20, 5, 25,
            2    
        )
    )
);

 
helper.playExample("@name", 10, animator, 100, 100);

