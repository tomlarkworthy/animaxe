import parser = require('../peg/svg');
import * as Ax from './animaxe'

var DEBUG = true;

export function svgpath(
    before: Ax.Operation,
    svg: string
): Ax.Operation
{
    var ast = parser.parse(svg);
    
    type SvgState = {
        end: [number, number], // should be point and timevarying
        operation: Ax.Operation
    }
    
    console.log(ast);
    // vertical lineto
    // turn the array of commands into a list of chainable animation functions
    var commands: ((acc: SvgState) => SvgState)[] = ast.map(command => {
        if (command.relative) throw new Error("Does not support relative mode yet, we should use state.end");
        
        return (acc: SvgState) => {
            var op: Ax.Operation;
            var end: Ax.Point;
            if (command.command == 'moveto') {
                op = acc.operation.moveTo([command.x, command.y]);
                end = [command.x, command.y]
            } else if (command.command == 'lineto') {
                op = acc.operation.lineTo([command.x, command.y]);
                end = [command.x, command.y]
            } else if (command.command == 'closepath') {
                op = acc.operation.closePath();
            } else if (command.command == 'curveto') {
                op =  acc.operation.bezierCurveTo([command.x, command.y], [command.x1, command.y1], [command.x2, command.y2]);
                end = [command.x, command.y]
            } else if (command.command == 'quadratic curveto') {
                op = acc.operation.quadraticCurveTo([command.x, command.y], [command.x1, command.y1]);
                end = [command.x, command.y]
            } else if (command.command == 'elliptical arc') {
                // 50 50 0 1 1 0 200
                // we only have arcTo and arc to draw an ellipse
                // arcTo([tx1, ty1], [tx2, ty2], radius), only does short lines
                // arc(cx, cy, radius, startAngle, endAngle, counterclockwise), where x and y must be end of current path
                // which draws a circular arc
                // so we rescale the canvas to create an elliptical rotated arc
                // command:'elliptical arc', rx:5, ry:5, xAxisRotation:45, largeArc:true, sweep:false, x:40, y:20 }
                // ellipticArc([rx, ry], [x, y], [LA, SW])
                // https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
                // F.6.5 Conversion from endpoint to center parameterization
                var x1 = acc.end[0],
                    y1 = acc.end[1],
                    x2 = command.x,
                    y2 = command.y,
                    fa = command.largeArc,
                    fs = command.sweep,
                    rx = command.rx,
                    ry = command.ry,
                    psi = command.xAxisRotation;
                
                var cos = Math.cos(psi * Math.PI * 2.0 / 360);
                var sin = Math.sin(psi * Math.PI * 2.0 / 360);
                
                // step 1
                var x1_prime =  cos * (x1 - x2) / 2.0 + sin * (y1 - y2) / 2.0;
                var y1_prime = -sin * (x1 - x2) / 2.0 + cos * (y1 - y2) / 2.0;   
                
                // step 2
                var polarity2 = fs == fa ? -1 : 1; 
                var numerator = (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime);
                while (numerator < 0) { 
                    rx *= 2;
                    ry *= 2;
                    // scale up until we find a solution
                    numerator = (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime);
                    
                    throw new Error("This needs to be scaled up without overshoot!");
                }
                
                var denominator = (rx * rx * y1_prime * y1_prime + ry * ry * x1_prime * x1_prime);
                var factor = polarity2 * Math.sqrt(numerator / denominator) 
                var cx_prime =  factor * rx * y1_prime / ry;
                var cy_prime = -factor * ry * x1_prime / rx;
                
                // step 3
                var cx = cos * cx_prime - sin * cy_prime + (x1 + x2) / 2
                var cy = sin * cx_prime + cos * cy_prime + (y1 + y2) / 2
                
                // step 4
                var angle = function(u: [number, number], v: [number, number]): number {
                    var polarity1 = u[0] * v[1] - u[1] * v[0] > 0 ? 1 : -1;
                    var u_length = Math.sqrt(u[0] * u[0] + u[1] * u[1]);
                    var v_length = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
                    
                    if (false && DEBUG) {
                        console.log("u, v", u, v);
                        console.log("angle numerator", (u[0] * v[0] + u[1] * v[1]));
                        console.log("angle denominator", u_length * v_length);
                    }
                    return polarity1 * Math.acos(
                        (u[0] * v[0] + u[1] * v[1]) / 
                        (u_length * v_length)
                    )
                }
                
                var v0: [number, number] = [1, 0];
                var v1: [number, number] = [ (x1_prime - cx_prime) / rx,  (y1_prime - cy_prime) / ry];
                var v2: [number, number] = [(-x1_prime - cx_prime) / rx, (-y1_prime - cy_prime) / ry];
                var theta1 = angle(v0, v1)
                var thetaDelta = angle(v1, v2); 
                
                if (!fs && thetaDelta > 0) thetaDelta -= Math.PI * 2
                if ( fs && thetaDelta < 0) thetaDelta += Math.PI * 2
                
                var radius = Math.sqrt((cx - x1) * (cx - x1) + (cy - y1) * (cy - y1))
                
                if (DEBUG) {
                    console.log("psi", psi)
                    console.log("rx, ry", rx, ry)
                    console.log("x1, y1", x1, y1)
                    console.log("x2, y2", x2, y2)
                    console.log("cos, sin", cos, sin)
                    console.log("x1_prime, y1_prime", x1_prime, y1_prime)
                    console.log("numerator", (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime))
                    console.log("denominator", (rx * rx * y1_prime * y1_prime + ry * ry * x1_prime * x1_prime))
                    console.log("factor", factor)
                    console.log("cx_prime, cy_prime", cx_prime, cy_prime)
                    console.log("cx, cy", cx, cy)
                    console.log("v[0] ... v[2]", v0, v1, v2)
                    console.log("theta1, thetaDelta", theta1, thetaDelta)
                    console.log("radius", radius)
                    
                }
                
                
                op = acc.operation
                    .arc([cx, cy], radius, theta1, theta1 + thetaDelta, theta1 > theta1 + thetaDelta) 
                end = [command.x, command.y]
            } else {
                throw Error("unrecognised command: " + command.command + " in svg path " + svg)
            } 
            return {end: end, operation: op};    
        }
    })
    
    
    var intialState: SvgState = {'end': [0, 0], 'operation': before}
    
    console.log(commands);
    // perform the actual chaining on top of the base case
    return commands.reduce(
        (acc: SvgState, chain: (acc: SvgState) => SvgState) => {
            return chain(acc);
        }, 
        intialState
    ).operation;
}
