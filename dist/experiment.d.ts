declare type Time = number;
interface Function1<A1, R> extends Function {
    (a1: A1): R;
}
interface Function2<A1, A2, R> extends Function {
    (a1: A1, a2: A2): R;
}
interface Signal<T> extends Function {
    (time: Time): T;
}
interface SignalFunction<A, B> extends Function {
    (a: Signal<A>): Signal<B>;
}
declare function pipe<A, B, C>(a: SignalFunction<A, B>, b: SignalFunction<B, C>): SignalFunction<A, C>;
declare function lift<A, B>(fn: Function1<A, B>): SignalFunction<A, B>;
