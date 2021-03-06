function applyMixins(derivedCtor, baseCtors) {
    baseCtors.forEach(function (baseCtor) {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(function (name) {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        });
    });
}
exports.applyMixins = applyMixins;
function assert(predicate, msg) {
    if (msg === void 0) { msg = "Assertion error"; }
    if (!predicate) {
        throw new Error(msg);
    }
}
exports.assert = assert;
function stackTrace() {
    var err = new Error();
    return err.stack;
}
exports.stackTrace = stackTrace;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy90eXBlcy50cyJdLCJuYW1lcyI6WyJhcHBseU1peGlucyIsImFzc2VydCIsInN0YWNrVHJhY2UiXSwibWFwcGluZ3MiOiJBQWdDQSxxQkFBNEIsV0FBZ0IsRUFBRSxTQUFnQjtJQUMxREEsU0FBU0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsVUFBQUEsUUFBUUE7UUFDdEJBLE1BQU1BLENBQUNBLG1CQUFtQkEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0EsVUFBQUEsSUFBSUE7WUFDdkRBLFdBQVdBLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLFFBQVFBLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBO1FBQzNEQSxDQUFDQSxDQUFDQSxDQUFBQTtJQUNOQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUNQQSxDQUFDQTtBQU5lLG1CQUFXLGNBTTFCLENBQUE7QUFFRCxnQkFBdUIsU0FBa0IsRUFBRSxHQUFnQztJQUFoQ0MsbUJBQWdDQSxHQUFoQ0EsdUJBQWdDQTtJQUN2RUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7UUFDYkEsTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7SUFDekJBLENBQUNBO0FBQ0xBLENBQUNBO0FBSmUsY0FBTSxTQUlyQixDQUFBO0FBRUQ7SUFDSUMsSUFBSUEsR0FBR0EsR0FBR0EsSUFBSUEsS0FBS0EsRUFBRUEsQ0FBQ0E7SUFDdEJBLE1BQU1BLENBQU9BLEdBQUlBLENBQUNBLEtBQUtBLENBQUNBO0FBQzVCQSxDQUFDQTtBQUhlLGtCQUFVLGFBR3pCLENBQUEiLCJmaWxlIjoic3JjL3R5cGVzLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
