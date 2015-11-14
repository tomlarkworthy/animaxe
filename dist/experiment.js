// the >>> function
function pipe(a, b) { return function (x) { return b(a(x)); }; }
// lift (arr)
function lift(fn) {
    return function (input) { return function (time) { return fn(input(time)); }; };
}
// & combinator

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4cGVyaW1lbnQudHMiXSwibmFtZXMiOlsicGlwZSIsImxpZnQiXSwibWFwcGluZ3MiOiJBQW1CQSxtQkFBbUI7QUFDbkIsY0FBc0IsQ0FBc0IsRUFBRSxDQUFzQixJQUF3QkEsTUFBTUEsQ0FBQ0EsVUFBQ0EsQ0FBWUEsSUFBS0EsT0FBQUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBUEEsQ0FBT0EsQ0FBQ0EsQ0FBQUEsQ0FBQ0E7QUFHOUgsYUFBYTtBQUNiLGNBQW9CLEVBQWtCO0lBQ2xDQyxNQUFNQSxDQUFDQSxVQUFDQSxLQUFnQkEsSUFBS0EsT0FBQUEsVUFBQ0EsSUFBVUEsSUFBS0EsT0FBQUEsRUFBRUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsRUFBZkEsQ0FBZUEsRUFBL0JBLENBQStCQSxDQUFDQTtBQUNqRUEsQ0FBQ0E7QUFFRCxlQUFlIiwiZmlsZSI6ImV4cGVyaW1lbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ0eXBlIFRpbWUgPSBudW1iZXI7XG5cbmludGVyZmFjZSBGdW5jdGlvbjE8QTEsIFI+IGV4dGVuZHMgRnVuY3Rpb24ge1xuICAgIChhMTpBMSk6IFJcbn1cblxuaW50ZXJmYWNlIEZ1bmN0aW9uMjxBMSwgQTIsIFI+IGV4dGVuZHMgRnVuY3Rpb24ge1xuICAgIChhMTpBMSwgYTI6QTIpOiBSXG59XG5cbmludGVyZmFjZSBTaWduYWw8VD4gZXh0ZW5kcyBGdW5jdGlvbiB7XG4gICAgKHRpbWU6IFRpbWUpOlQ7XG59XG5cbi8vIHlvdSBzaG91bGQgbm90IGJ1aWxkIHRoZXNlIGRpcmVjdGx5XG5pbnRlcmZhY2UgU2lnbmFsRnVuY3Rpb248QSwgQj4gZXh0ZW5kcyBGdW5jdGlvbiB7XG4gICAgKGE6IFNpZ25hbDxBPik6IFNpZ25hbDxCPlxufVxuXG4vLyB0aGUgPj4+IGZ1bmN0aW9uXG5mdW5jdGlvbiBwaXBlPEEsQixDPiAoYTogU2lnbmFsRnVuY3Rpb248QSxCPiwgYjogU2lnbmFsRnVuY3Rpb248QixDPik6IFNpZ25hbEZ1bmN0aW9uPEEsQz4ge3JldHVybiAoeDogU2lnbmFsPEE+KSA9PiBiKGEoeCkpO31cblxuXG4vLyBsaWZ0IChhcnIpXG5mdW5jdGlvbiBsaWZ0PEEsIEI+KGZuOiBGdW5jdGlvbjE8QSxCPik6IFNpZ25hbEZ1bmN0aW9uPEEsQj4ge1xuICAgIHJldHVybiAoaW5wdXQ6IFNpZ25hbDxBPikgPT4gKHRpbWU6IFRpbWUpID0+IGZuKGlucHV0KHRpbWUpKTtcbn1cblxuLy8gJiBjb21iaW5hdG9yXG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==