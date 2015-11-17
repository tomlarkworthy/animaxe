import * as Ax from "./animaxe";
export declare class CanvasAnimation {
    arc(center: Ax.PointArg, radius: Ax.NumberArg, radStartAngle: Ax.NumberArg, radEndAngle: Ax.NumberArg, counterclockwise?: boolean): Ax.Animation;
}
/**
 * Dynamic chainable wrapper for arc in the canvas API. Use with withinPath.
 */
export declare function arc(center: Ax.PointArg, radius: Ax.NumberArg, radStartAngle: Ax.NumberArg, radEndAngle: Ax.NumberArg, counterclockwise?: boolean): Ax.Animation;
