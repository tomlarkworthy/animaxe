import parser = require('../peg/svg');
import * as Ax from './animaxe';
import * as Parameter from './Parameter';

var DEBUG = false;

export function svgpath(
    before: Ax.Operation,
    svg: string,
    ...args: Ax.NumberArg[]
): Ax.Operation
{
    var ast = parser.parse(svg);
    
    type SvgState = {
        end: [Ax.NumberArg, Ax.NumberArg], // should be point and timevarying
        operation: Ax.Operation
    }
    
    type Command = {
        command: string
        x?: number | string
        y?: number | string
        x1?: number | string
        y1?: number | string
        x2?: number | string
        y2?: number | string
        relative?: boolean
        rx?: number | string
        ry?: number | string
        largeArc?: boolean
        sweep?: boolean
        xAxisRotation?: number | string
    }
    
    if (DEBUG) console.log('SVG AST', ast);
    // turn the array of commands into a list of chainable animation functions
    var commands: ((acc: SvgState) => SvgState)[] = ast.map((command: Command) => {    
        return (acc: SvgState) => {
            var op: Ax.Operation;
            var end: [Ax.NumberArg, Ax.NumberArg];
            var x: Ax.NumberArg, y: Ax.NumberArg, 
                x1: Ax.NumberArg, y1: Ax.NumberArg, 
                x2: Ax.NumberArg, y2: Ax.NumberArg, 
                rx: Ax.NumberArg, ry: Ax.NumberArg, 
                largeArc: Ax.BooleanArg, sweep: Ax.BooleanArg, 
                xAxisRotation: Ax.NumberArg;
                
            function bind(command: number | string): Ax.NumberArg {
                if (typeof command === 'string') {
                    if (command[0] == '%') {
                        var index = parseFloat(command.slice(1)) - 1; // %1 means arg 0
                        var arg = args[index];
                        if (arg === undefined) throw new Error("Index out of bounds" + command);
                        return arg;
                    } else if (command[0] == '-' && command[1] == '%') {
                        var index = parseFloat(command.slice(2)) - 1; // %1 means arg 0
                        var arg = args[index];
                        if (arg === undefined) throw new Error("Index out of bounds " + command);
                        return Parameter.from(arg).mapValue(x => -x);
                    } else {
                        throw new Error(command);
                    }
                } else {
                    return command
                }
            } 
            
            function add(a: Ax.NumberArg, b: Ax.NumberArg): Ax.NumberArg {
                return Parameter.from(a).combine(
                    () => (a: number, b: number) => a + b,
                    Parameter.from(b))
            }
            
            if (command.relative) {
                if (command.x != undefined) x = add(bind(command.x), acc.end[0]);  
                if (command.y != undefined) y = add(bind(command.y), acc.end[1]); 
                if (command.x1 != undefined) x1 = add(bind(command.x1), acc.end[0]);
                if (command.y1 != undefined) y1 = add(bind(command.y1), acc.end[1]);
                if (command.x2 != undefined) x2 = add(bind(command.x2), acc.end[0]);
                if (command.y2 != undefined) y2 = add(bind(command.y2), acc.end[1]);  
            } else {
                if (command.x != undefined) x = bind(command.x);
                if (command.y != undefined) y = bind(command.y);
                if (command.x1 != undefined) x1 = bind(command.x1);
                if (command.y1 != undefined) y1 = bind(command.y1);
                if (command.x2 != undefined) x2 = bind(command.x2);
                if (command.y2 != undefined) y2 = bind(command.y2);
            }
            if (command.largeArc != undefined) largeArc = command.largeArc;
            if (command.sweep != undefined) sweep = command.sweep;
            if (command.rx != undefined) rx = bind(command.rx);
            if (command.ry != undefined) ry = bind(command.ry);
            if (command.xAxisRotation != undefined) xAxisRotation = bind(command.xAxisRotation);
            
            if (command.command == 'moveto') {
                op = acc.operation.moveTo(Parameter.point(x, y));
                end = [x, y]
            } else if (command.command == 'lineto') {
                op = acc.operation.lineTo(Parameter.point(x, y));
                end = [x, y]
            } else if (command.command == 'vertical lineto') {
                console.log("acc.end[0]", acc.end[0])
                console.log("y", y)
                op = acc.operation.lineTo(Parameter.point(acc.end[0], y));
                end = [acc.end[0], y]
            } else if (command.command == 'horizontal lineto') {
                op = acc.operation.lineTo(Parameter.point(x, acc.end[1]));
                end = [x, acc.end[1]]
            } else if (command.command == 'closepath') {
                op = acc.operation.closePath();
                // end ???
            } else if (command.command == 'curveto') {
                op =  acc.operation.bezierCurveTo(Parameter.point(x1, y1), Parameter.point(x2, y2), Parameter.point(x, y));
                end = [x, y]
            } else if (command.command == 'quadratic curveto') {
                op = acc.operation.quadraticCurveTo(Parameter.point(x1, y1), Parameter.point(x, y));
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
                op = acc.operation.ellipticArcTo(
                    Parameter.point(acc.end[0], acc.end[1]), 
                    Parameter.point(rx, ry),
                    xAxisRotation,
                    command.largeArc,
                    command.sweep,
                    Parameter.point(x,y));
                    
                end = [x, y]
            } else {
                throw Error("unrecognised command: " + command.command + " in svg path " + svg)
            } 
            return {end: end, operation: op};    
        }
    })
    
    
    var intialState: SvgState = {'end': [0, 0], 'operation': before}
    
    if (DEBUG) console.log(commands);
    // perform the actual chaining on top of the base case
    return commands.reduce(
        (acc: SvgState, chain: (acc: SvgState) => SvgState) => {
            return chain(acc);
        }, 
        intialState
    ).operation;
}
