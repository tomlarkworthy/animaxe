import * as OT from "./FRP"
import * as types from "./types"
export * from "./types"
import * as Parameter from "./Parameter"

type Tick = OT.BaseTick;

export class List<V> extends OT.SignalFn<Tick, V[]>{
    constructor(public attach: (upstream: Rx.Observable<Tick>) => Rx.Observable<V[]>) {
        super(attach);
    }
    
    mapElement<Out>(mapFn: (V) => Out): List<Out> {
        return new List<Out>(this.mapValue((vals: V[]) => vals.map(mapFn)).attach);
    }
    
    slice(start: types.NumberArg, end: types.NumberArg) {
        this.combine(
            () => (vals: V[], start: number, end: number) => 
                vals.slice(start, end),
            Parameter.from(start),
            Parameter.from(end)
        )    
    }
}