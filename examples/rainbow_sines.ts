import * as Rx from "rx";
import * as Ax from "../src/animaxe";
import * as helper from "../src/helper";
import * as events from "../src/events";
import * as Parameter from "../src/Parameter";

var animator: Ax.Animator = helper.getExampleAnimator();

function foreverDot(size: number, css_color: Ax.ColorArg): Ax.Operation {
    return Ax.create().fillStyle(css_color).fillRect([-size/2, -size/2], [size, size]);
}


var WIDTH = 100;
var HEIGHT = 100;
var SINS = 3;

//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0,0],[100,100]));


animator.play(
    Ax.create().parallel(
        Ax.range(0, WIDTH).map(x => {
            // for each index we create a 10 sinwaves
            return Ax.create().parallel(
                Ax.range(0, SINS).map(i => {
                    return Ax.create()
                        .translate(
                            Parameter.point(
                                x, 
                                Parameter
                                    .sin(
                                        Parameter.t().mapValue(t => Math.sin(t + i * 4 + x/ WIDTH) * 10 + t / 2 + x / WIDTH * Math.PI + i / SINS * Math.PI * 2)
                                    )
                                    .mapValue(s => HEIGHT * (0.45 * s + 0.5))
                                
                                )
                            )
                        .pipe(foreverDot(3, Parameter.rgba(255, 
                            Parameter
                                .sin(
                                    Parameter.t().mapValue(t => x / WIDTH + t * 2 + i)
                                )
                                .mapValue(s => s * 125 + 125),
                            0,1)));  
                })
            );   
        })
    )
);


helper.playExample("@name", 32, animator, WIDTH, 100);