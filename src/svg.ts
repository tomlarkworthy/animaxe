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
    
    type Command = {
        command: string
        x?: number
        y?: number
        x1?: number
        y1?: number
        x2?: number
        y2?: number
        relative?: boolean
        rx?: number
        ry?: number
        largeArc?: number
        sweep?: number
        xAxisRotation?: number
    }
    
    console.log(ast);
    // vertical lineto
    // turn the array of commands into a list of chainable animation functions
    var commands: ((acc: SvgState) => SvgState)[] = ast.map((command: Command) => {    
        return (acc: SvgState) => {
            var op: Ax.Operation;
            var end: Ax.Point;
            var x: number, y: number, 
                x1: number, y1: number, 
                x2: number, y2: number;
            
            if (command.relative) {
                if (command.x != undefined) x = command.x + acc.end[0];  
                if (command.y != undefined) y = command.y + acc.end[1]; 
                if (command.x1 != undefined) x1 = command.x1 + acc.end[0];
                if (command.y1 != undefined) y1 = command.y1 + acc.end[1];
                if (command.x2 != undefined) x2 = command.x2 + acc.end[0];
                if (command.y2 != undefined) y2 = command.y2 + acc.end[1];  
            } else {
                if (command.x != undefined) x = command.x;
                if (command.y != undefined) y = command.y;
                if (command.x1 != undefined) x1 = command.x1;
                if (command.y1 != undefined) y1 = command.y1;
                if (command.x2 != undefined) x2 = command.x2;
                if (command.y2 != undefined) y2 = command.y2;
            }
            if (command.command == 'moveto') {
                op = acc.operation.moveTo([x, y]);
                end = [x, y]
            } else if (command.command == 'lineto') {
                op = acc.operation.lineTo([x, y]);
                end = [x, y]
            } else if (command.command == 'vertical lineto') {
                op = acc.operation.lineTo([acc.end[0], y]);
                end = [acc.end[0], y]
            } else if (command.command == 'horizontal lineto') {
                op = acc.operation.lineTo([x, acc.end[1]]);
                end = [x, acc.end[1]]
            } else if (command.command == 'closepath') {
                op = acc.operation.closePath();
                // end ???
            } else if (command.command == 'curveto') {
                op =  acc.operation.bezierCurveTo([x1, y1], [x2, y2], [x, y]);
                end = [x, y]
            } else if (command.command == 'quadratic curveto') {
                op = acc.operation.quadraticCurveTo([x1, y1], [x, y]);
                end = [x, y]
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
                    x2 = x,
                    y2 = y,
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
                var numerator; // = (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime);
                // we worry about if the numerator is too small, we scale up rx and ry by unknown 's'
                // we want the numerator to be positive, so we find when the numerator crosses the 0 line
                // 0 = (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime)
                // we know most of these values, so we can simplify to
                // 0 = s * s * s * s * a - s * s * b - s * s * c
                // where a = rx * rx * ry * ry
                //       b = rx * rx * y1_prime * y1_prime
                //       c = ry * ry * x1_prime * x1_prime
                // or if s * s = t 
                // 0 = a * t * t  - b * t - c * t
                // 0 = t(at - b - c), trivial solution at t = 0
                // interesting solution at 
                // 0 = at - b - c
                // t = (b + c) / a
                // s = sqrt((b + c) / a)
                var a = rx * rx * ry * ry;
                var b = rx * rx * y1_prime * y1_prime;
                var c = ry * ry * x1_prime * x1_prime;
                
                var scaleToInflection = (b + c) / a;       
                    
                if (scaleToInflection < 1) {
                } else {
                    // SHOULD BE 0
                    rx *= Math.sqrt(scaleToInflection)
                    ry *= Math.sqrt(scaleToInflection)
                }
                // TODO overwrite value while scaling is not working
                numerator = (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime);
                
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
                
                var startAngle = theta1;
                var endAngle = theta1 + thetaDelta;
                
                if (DEBUG) {
                    console.log("psi", psi)
                    console.log("rx, ry", rx, ry)
                    console.log("x1, y1", x1, y1)
                    console.log("x2, y2", x2, y2)
                    console.log("cos, sin", cos, sin)
                    console.log("x1_prime, y1_prime", x1_prime, y1_prime)
                    console.log("a, b, c", a, b, c)
                    console.log("scaleToInflection", scaleToInflection)
                    console.log("numerator", (rx * rx * ry * ry - rx * rx * y1_prime * y1_prime - ry * ry * x1_prime * x1_prime))
                    console.log("denominator", (rx * rx * y1_prime * y1_prime + ry * ry * x1_prime * x1_prime))
                    console.log("factor", factor)
                    console.log("cx_prime, cy_prime", cx_prime, cy_prime)
                    console.log("cx, cy", cx, cy)
                    console.log("v[0] ... v[2]", v0, v1, v2)
                    console.log("theta1, thetaDelta", theta1, thetaDelta)
                    console.log("radius", radius)
                    console.log("startAngle, endAngle", startAngle, endAngle)
                }
                
                op = acc.operation
                    .arc([cx, cy], radius, startAngle, endAngle, thetaDelta < 0)
                     
                end = [x, y]
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
