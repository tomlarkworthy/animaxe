type Time = number;

interface Function1<A1, R> extends Function {
    (a1:A1): R
}

interface Function2<A1, A2, R> extends Function {
    (a1:A1, a2:A2): R
}

interface Signal<T> extends Function {
    (time: Time):T;
}

// you should not build these directly
interface SignalFunction<A, B> extends Function {
    (a: Signal<A>): Signal<B>
}

// the >>> function
function pipe<A,B,C> (a: SignalFunction<A,B>, b: SignalFunction<B,C>): SignalFunction<A,C> {return (x: Signal<A>) => b(a(x));}


// lift (arr)
function lift<A, B>(fn: Function1<A,B>): SignalFunction<A,B> {
    return (input: Signal<A>) => (time: Time) => fn(input(time));
}

// & combinator

