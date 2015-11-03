import Ax = require("./animaxe");
/**
 *
 */
export declare class Events {
    mousedowns: Ax.Point[];
    mouseups: Ax.Point[];
    /**
     * clear all the events, done by animator at the end of a tick
     */
    clear(): void;
}
export declare class AxMouseEvent {
}
