import Ax = require("./animaxe");

/**
 *
 */
export class Events {
    mousedowns: Ax.Point[] = [];
    mouseups: Ax.Point[] = [];

    /**
     * clear all the events, done by animator at the end of a tick
     */
    clear() {
        this.mousedowns = [];
        this.mouseups = [];
    }
}

export class AxMouseEvent {

}