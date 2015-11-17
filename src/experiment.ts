

interface SignalFn<T> {
    (time: number): T;
}

interface SearchFunc<T> {
  (source: string, subString: string): T;
}

interface SignalTransformer<A, B>{
    (a: SignalFn<A>): SignalFn<B>
}

// the >>> function
function pipe<A,B,C> (a: SignalTransformer<A,B>, b: SignalTransformer<B,C>): SignalTransformer<A,C> {
    return (x: SignalFn<A>) => b(a(x))
}

// the arr lift
/*
function lift<A, B>(fn: Function1<A,B>): SignalTransformer<A,B> {
    return (input: SignalFn<A>) => <SignalFn<B>>((time: Time) => fn(input(time)));
}*/

// & combinator

// Typing we need a SignalTransformer with a custom API, with methods attached



