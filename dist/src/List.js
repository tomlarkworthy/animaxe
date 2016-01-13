var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var OT = require("./frp");
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9MaXN0LnRzIl0sIm5hbWVzIjpbIkxpc3QiLCJMaXN0LmNvbnN0cnVjdG9yIiwiTGlzdC5tYXBFbGVtZW50IiwiTGlzdC5zbGljZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQSxJQUFZLEVBQUUsV0FBTSxPQUNwQixDQUFDLENBRDBCO0FBRTNCLGlCQUFjLFNBQ2QsQ0FBQyxFQURzQjtBQUN2QixJQUFZLFNBQVMsV0FBTSxhQUUzQixDQUFDLENBRnVDO0FBSXhDO0lBQTZCQSx3QkFBc0JBO0lBQy9DQSxjQUFtQkEsTUFBNkRBO1FBQzVFQyxrQkFBTUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFEQ0EsV0FBTUEsR0FBTkEsTUFBTUEsQ0FBdURBO0lBRWhGQSxDQUFDQTtJQUVERCx5QkFBVUEsR0FBVkEsVUFBZ0JBLEtBQWlCQTtRQUM3QkUsTUFBTUEsQ0FBQ0EsSUFBSUEsSUFBSUEsQ0FBTUEsSUFBSUEsQ0FBQ0EsUUFBUUEsQ0FBQ0EsVUFBQ0EsSUFBU0EsSUFBS0EsT0FBQUEsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsRUFBZkEsQ0FBZUEsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7SUFDL0VBLENBQUNBO0lBRURGLG9CQUFLQSxHQUFMQSxVQUFNQSxLQUFzQkEsRUFBRUEsR0FBb0JBO1FBQzlDRyxJQUFJQSxDQUFDQSxPQUFPQSxDQUNSQSxjQUFNQSxPQUFBQSxVQUFDQSxJQUFTQSxFQUFFQSxLQUFhQSxFQUFFQSxHQUFXQTttQkFDeENBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEtBQUtBLEVBQUVBLEdBQUdBLENBQUNBO1FBQXRCQSxDQUFzQkEsRUFEcEJBLENBQ29CQSxFQUMxQkEsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsRUFDckJBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQ3RCQSxDQUFBQTtJQUNMQSxDQUFDQTtJQUNMSCxXQUFDQTtBQUFEQSxDQWpCQSxBQWlCQ0EsRUFqQjRCLEVBQUUsQ0FBQyxRQUFRLEVBaUJ2QztBQWpCWSxZQUFJLE9BaUJoQixDQUFBIiwiZmlsZSI6InNyYy9MaXN0LmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
