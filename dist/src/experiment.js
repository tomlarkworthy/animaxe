// the >>> function
function pipe(a, b) {
    return function (x) { return b(a(x)); };
}
// the arr lift
/*
function lift<A, B>(fn: Function1<A,B>): SignalTransformer<A,B> {
    return (input: SignalFn<A>) => <SignalFn<B>>((time: Time) => fn(input(time)));
}*/
// & combinator
// Typing we need a SignalTransformer with a custom API, with methods attached

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9leHBlcmltZW50LnRzIl0sIm5hbWVzIjpbInBpcGUiXSwibWFwcGluZ3MiOiJBQWNBLG1CQUFtQjtBQUNuQixjQUFzQixDQUF5QixFQUFFLENBQXlCO0lBQ3RFQSxNQUFNQSxDQUFDQSxVQUFDQSxDQUFjQSxJQUFLQSxPQUFBQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUFQQSxDQUFPQSxDQUFBQTtBQUN0Q0EsQ0FBQ0E7QUFFRCxlQUFlO0FBQ2Y7OztHQUdHO0FBRUgsZUFBZTtBQUVmLDhFQUE4RSIsImZpbGUiOiJzcmMvZXhwZXJpbWVudC5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
