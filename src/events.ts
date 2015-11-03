/**
 *
 */
export class Events {
    mousedowns: MouseEvent[] = [];
    mouseups: MouseEvent[] = [];

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