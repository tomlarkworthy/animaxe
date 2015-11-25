interface SignalFn<T> {
    (time: number): T;
}
interface SearchFunc<T> {
    (source: string, subString: string): T;
}
interface SignalTransformer<A, B> {
    (a: SignalFn<A>): SignalFn<B>;
}
declare function pipe<A, B, C>(a: SignalTransformer<A, B>, b: SignalTransformer<B, C>): SignalTransformer<A, C>;
