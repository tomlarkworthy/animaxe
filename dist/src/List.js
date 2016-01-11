var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var OT = require("./FRP");
__export(require("./types"));
var Parameter = require("./Parameter");
var List = (function (_super) {
    __extends(List, _super);
    function List(attach) {
        _super.call(this, attach);
        this.attach = attach;
    }
    List.prototype.mapElement = function (mapFn) {
        return new List(this.mapValue(function (vals) { return vals.map(mapFn); }).attach);
    };
    List.prototype.slice = function (start, end) {
        this.combine(function () { return function (vals, start, end) {
            return vals.slice(start, end);
        }; }, Parameter.from(start), Parameter.from(end));
    };
    return List;
})(OT.SignalFn);
exports.List = List;
