// THIS IS AUTO GENERATED TEST CODE, DO NOT MODIFY DIRECTLY
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
require("should");
var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var Parameter = require("../src/Parameter");
var animator = helper.getExampleAnimator();
// fixed base color for particles
var red = 255, green = 50, blue = 50;
// alpha fades out to make the particles evaporate over time
var alpha = Parameter.t().mapValue(function (t) { return 0.1 / (t * 5 + 0.1); });
// our base particle is of variable size and color
function permDot(size, css_color) {
    return Ax.create().fillStyle(css_color).fillRect([-size / 2, -size / 2], [size, size]);
}
// TODO: how to do oneoff calls
// Parameter.seedrnd("seed");
// each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
// a ring of exploding particles that fade our
animator.play(Ax.create()
    .globalCompositeOperation("lighter") // use additive blending
    .clone(500, Ax.create() // clone 500 particles
    .translate([50, 50]) // move to center of canvas
    .velocity(Parameter.first(Parameter.rndNormal(50))) // choose a random direction
    .parallel([
    permDot(1, Parameter.rgba(red, green, blue, alpha)),
    permDot(5, Parameter.rgba(red, green, blue, alpha)) // with a dimmer surround
])));
helper.playExample("example3", 15, animator, 100, 100);
describe('example3', function () {
    it('should match the reference', function (done) {
        helper.sameExample("example3", "example3-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOlsicGVybURvdCJdLCJtYXBwaW5ncyI6IkFBQUEsMkRBQTJEO0FBQzNELDZDQUE2QztBQUM3Qyw0Q0FBNEM7QUFDNUMsMkNBQTJDO0FBQzNDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3hDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUdsQixJQUFZLEVBQUUsV0FBTSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3JDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBRXhDLElBQVksU0FBUyxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFFOUMsSUFBSSxRQUFRLEdBQWdCLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0FBRXhELGlDQUFpQztBQUNqQyxJQUFJLEdBQUcsR0FBRyxHQUFHLEVBQUUsS0FBSyxHQUFHLEVBQUUsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ3JDLDREQUE0RDtBQUM1RCxJQUFJLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBakIsQ0FBaUIsQ0FBQyxDQUFDO0FBRTNELGtEQUFrRDtBQUNsRCxpQkFBaUIsSUFBWSxFQUFFLFNBQXNCO0lBQ2pEQSxNQUFNQSxDQUFDQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxTQUFTQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxHQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxHQUFDQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtBQUN2RkEsQ0FBQ0E7QUFFRCwrQkFBK0I7QUFDL0IsNkJBQTZCO0FBRTdCLHlFQUF5RTtBQUN6RSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxFQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRSw4Q0FBOEM7QUFDOUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFO0tBQ3BCLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxDQUEwQix3QkFBd0I7S0FDckYsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQXVDLHNCQUFzQjtLQUMvRSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBc0MsMkJBQTJCO0tBQ3BGLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFPLDRCQUE0QjtLQUNyRixRQUFRLENBQUM7SUFDTixPQUFPLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbkQsT0FBTyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUcseUJBQXlCO0NBQ2xGLENBQUMsQ0FDTCxDQUNKLENBQUM7QUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUd2RCxRQUFRLENBQUMsVUFBVSxFQUFFO0lBQ2pCLEVBQUUsQ0FBRSw0QkFBNEIsRUFBRSxVQUFTLElBQUk7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLFVBQVMsS0FBSztZQUN6RCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixJQUFJLEVBQUUsQ0FBQztRQUNYLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJkaXN0L3Rlc3QvZXhhbXBsZTMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUSElTIElTIEFVVE8gR0VORVJBVEVEIFRFU1QgQ09ERSwgRE8gTk9UIE1PRElGWSBESVJFQ1RMWVxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL3Nob3VsZC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9tb2NoYS5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9ub2RlLmQudHNcIiAvPlxucmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0JykuaW5zdGFsbCgpO1xucmVxdWlyZShcInNob3VsZFwiKTtcblxuaW1wb3J0ICogYXMgUnggZnJvbSBcInJ4XCI7XG5pbXBvcnQgKiBhcyBBeCBmcm9tIFwiLi4vc3JjL2FuaW1heGVcIjtcbmltcG9ydCAqIGFzIGhlbHBlciBmcm9tIFwiLi4vc3JjL2hlbHBlclwiO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gXCIuLi9zcmMvZXZlbnRzXCI7XG5pbXBvcnQgKiBhcyBQYXJhbWV0ZXIgZnJvbSBcIi4uL3NyYy9QYXJhbWV0ZXJcIjtcblxudmFyIGFuaW1hdG9yOiBBeC5BbmltYXRvciA9IGhlbHBlci5nZXRFeGFtcGxlQW5pbWF0b3IoKTtcblxuLy8gZml4ZWQgYmFzZSBjb2xvciBmb3IgcGFydGljbGVzXG52YXIgcmVkID0gMjU1LCBncmVlbiA9IDUwLCBibHVlID0gNTA7XG4vLyBhbHBoYSBmYWRlcyBvdXQgdG8gbWFrZSB0aGUgcGFydGljbGVzIGV2YXBvcmF0ZSBvdmVyIHRpbWVcbnZhciBhbHBoYSA9IFBhcmFtZXRlci50KCkubWFwVmFsdWUodCA9PiAwLjEgLyAodCo1ICsgMC4xKSk7XG5cbi8vIG91ciBiYXNlIHBhcnRpY2xlIGlzIG9mIHZhcmlhYmxlIHNpemUgYW5kIGNvbG9yXG5mdW5jdGlvbiBwZXJtRG90KHNpemU6IG51bWJlciwgY3NzX2NvbG9yOiBBeC5Db2xvckFyZyk6IEF4LkFuaW1hdGlvbiB7XG4gICAgcmV0dXJuIEF4LmNyZWF0ZSgpLmZpbGxTdHlsZShjc3NfY29sb3IpLmZpbGxSZWN0KFstc2l6ZS8yLCAtc2l6ZS8yXSwgW3NpemUsIHNpemVdKTtcbn1cblxuLy8gVE9ETzogaG93IHRvIGRvIG9uZW9mZiBjYWxsc1xuLy8gUGFyYW1ldGVyLnNlZWRybmQoXCJzZWVkXCIpO1xuXG4vLyBlYWNoIGZyYW1lLCBmaXJzdCBkcmF3IGJsYWNrIGJhY2tncm91bmQgdG8gZXJhc2UgdGhlIHByZXZpb3VzIGNvbnRlbnRzXG5hbmltYXRvci5wbGF5KEF4LmNyZWF0ZSgpLmZpbGxTdHlsZShcIiMwMDAwMDBcIikuZmlsbFJlY3QoWzAsMF0sWzEwMCwxMDBdKSk7XG4vLyBhIHJpbmcgb2YgZXhwbG9kaW5nIHBhcnRpY2xlcyB0aGF0IGZhZGUgb3VyXG5hbmltYXRvci5wbGF5KEF4LmNyZWF0ZSgpXG4gICAgLmdsb2JhbENvbXBvc2l0ZU9wZXJhdGlvbihcImxpZ2h0ZXJcIikgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVzZSBhZGRpdGl2ZSBibGVuZGluZ1xuICAgIC5jbG9uZSg1MDAsIEF4LmNyZWF0ZSgpICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2xvbmUgNTAwIHBhcnRpY2xlc1xuICAgICAgICAudHJhbnNsYXRlKFs1MCwgNTBdKSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbW92ZSB0byBjZW50ZXIgb2YgY2FudmFzXG4gICAgICAgIC52ZWxvY2l0eShQYXJhbWV0ZXIuZmlyc3QoUGFyYW1ldGVyLnJuZE5vcm1hbCg1MCkpKSAgICAgICAvLyBjaG9vc2UgYSByYW5kb20gZGlyZWN0aW9uXG4gICAgICAgIC5wYXJhbGxlbChbICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkcmF3IG92ZXJsYXBwaW5nIHBhcnRpY2xlc1xuICAgICAgICAgICAgcGVybURvdCgxLCBQYXJhbWV0ZXIucmdiYShyZWQsIGdyZWVuLCBibHVlLCBhbHBoYSkpLCAgLy8gc28gdGhlIGNlbnRlciBpcyBicmlnaHRlclxuICAgICAgICAgICAgcGVybURvdCg1LCBQYXJhbWV0ZXIucmdiYShyZWQsIGdyZWVuLCBibHVlLCBhbHBoYSkpICAgLy8gd2l0aCBhIGRpbW1lciBzdXJyb3VuZFxuICAgICAgICBdKVxuICAgIClcbik7XG5cbmhlbHBlci5wbGF5RXhhbXBsZShcImV4YW1wbGUzXCIsIDE1LCBhbmltYXRvciwgMTAwLCAxMDApO1xuXG5cbmRlc2NyaWJlKCdleGFtcGxlMycsIGZ1bmN0aW9uICgpIHtcbiAgICBpdCAoJ3Nob3VsZCBtYXRjaCB0aGUgcmVmZXJlbmNlJywgZnVuY3Rpb24oZG9uZSkge1xuICAgICAgICBoZWxwZXIuc2FtZUV4YW1wbGUoXCJleGFtcGxlM1wiLCBcImV4YW1wbGUzLXJlZlwiLCBmdW5jdGlvbihlcXVhbCkge1xuICAgICAgICAgICAgZXF1YWwuc2hvdWxkLmVxdWFsKHRydWUpO1xuICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9KVxuICAgIH0pO1xufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
