function arrayInitialize(n, factory) {
    var arr = new Array(n);
    for (var i = 0; i < n; i++)
        arr[i] = factory();
    return arr;
}
exports.arrayInitialize = arrayInitialize;
function isFunction(x) {
    return typeof x == 'function';
}
exports.isFunction = isFunction;
