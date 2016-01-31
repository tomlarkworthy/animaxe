import * as frp from './frp';
import * as Rx from "rx"
import * as zip from "./zip"

// stream intersection &&& in AFRP
export function intersection<In extends frp.BaseTick, OutA, OutB>
    (a: frp.SignalFn<In, OutA>, b: frp.SignalFn<In, OutB>): frp.SignalFn<In, OutA & OutB> {
        return new frp.SignalFn<In, OutA & OutB>(
            (upstream: Rx.Observable<In>) => {
                let a_out: Rx.Observable<OutA> = a.attach(upstream);
                let b_out: Rx.Observable<OutB> = b.attach(upstream);
                return zip.zip(
                    (values: [OutA, OutB]) => extend(values[0], values[1]), 
                    a_out, b_out);
            }
        )
    
}

function extend<T, U>(first: T, second: U): T & U {
    let result = <T & U> {};
    for (let id in first) {
        result[id] = first[id];
    }
    for (let id in second) {
        if (!result.hasOwnProperty(id)) {
            result[id] = second[id];
        }
    }
    return result;
}

export function first<In extends frp.BaseTick, Out, Passthrough>
    (sf: frp.SignalFn<In, Out>): frp.SignalFn<In & Passthrough, Out & Passthrough> {
        return new frp.SignalFn<In & Passthrough, Out & Passthrough>(
            (upstream: Rx.Observable<In & Passthrough>) => {
                let first: Rx.Observable<Out> = sf.attach(upstream);
                let second: Rx.Observable<Passthrough> = upstream;
                return zip.zip(
                    (values: [Out, Passthrough]) => extend(values[0], values[1]), 
                    first, second);
            }
        )
}

export function arr<In extends frp.BaseTick, Out>(fn: (input: In) => Out): frp.SignalFn<In, Out> {
    return new frp.SignalFn(
        (upstream: Rx.Observable<In>) => upstream.map(fn)
    );
}
/// >>> operator
/*
export function pipe<In, Middle, Out>(first: frp.SignalFn<In, Middle>, second: frp.SignalFn<Middle, Out>): frp.SignalFn<In, Out> {
    return new frp.SignalFn<In, Out>(
        (upstream: Rx.Observable<In>) => second.attach(first.attach(upstream))
    );
}

/// >>loop operator
export function loop<In, Middle, Out>(first: frp.SignalFn<In, Middle>, second: frp.SignalFn<Middle, Out>): frp.SignalFn<In, Out> {
    return new frp.SignalFn<In, Out>(
        (upstream: Rx.Observable<In>) => second.attach(first.attach(upstream))
    );
}*/

