/// <reference path="../../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../../types/node.d.ts" />
/// <reference path="../../types/should.d.ts" />
/// <reference path="../../types/ctx-get-transform.d.ts" />
import * as Ax from "./animaxe";
export * from "./animaxe";
export declare function getExampleAnimator(width?: number, height?: number): Ax.Animator;
export declare function playExample(name: string, frames: number, animator: Ax.Animator, width?: number, height?: number): void;
export declare function sameExample(name: string, ref: string, cb: (boolean) => void): any;
