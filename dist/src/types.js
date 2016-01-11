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
