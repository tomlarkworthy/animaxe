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
Ax.DEBUG = true;
//2 frame animated glow
function spark(color) {
    return Ax.create()
        .take(1)
        .fillStyle(color)
        .fillRect([-2, -2], [5, 5])
        .then(Ax.create()
        .take(1)
        .fillStyle(color)
        .fillRect([-1, -1], [3, 3]));
}
//large circle funcitons
var bigSin = Parameter.sin(Parameter.t().mapValue(function (x) { return x * Math.PI * 2; })).mapValue(function (x) { return x * 40 + 50; });
var bigCos = Parameter.cos(Parameter.t().mapValue(function (x) { return x * Math.PI * 2; })).mapValue(function (x) { return x * 40 + 50; });
var red = Parameter.sin(Parameter.t().mapValue(function (x) { return x * Math.PI; })).mapValue(function (x) { return x * 125 + 125; });
var green = Parameter.sin(Parameter.t().mapValue(function (x) { return x * Math.PI; })).mapValue(function (x) { return x * 55 + 200; });
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
// move the drawing context frame of reference to the center (50,50) and then move it by a +ve x velocity,
// so the frame of reference moves over time.
// then draw our 2 frame spark animation in a loop so it draws forever
animator.play(Ax.create()
    .translate([50, 50])
    .velocity([50, 0])
    .loop(spark("#FFFFFF")));
// move the draw context to a coordinate determined by trig (i.e. in a circle)
animator.play(Ax.create()
    .loop(Ax.create()
    .translate(Parameter.point(bigSin, bigCos))
    .pipe(spark(Parameter.rgba(red, green, 0, 1)))));
// tween between the center (50,50) and a point on a circle. This has the effect of moving the inner spark animation
// in a archimedes spiral.
animator.play(Ax.create()
    .tween_linear([50, 50], Parameter.point(bigSin, bigCos), 1)
    .loop(spark("red")));
// the helper function pipes injects the context, either from a web canvas or a fake node.js one.
helper.playExample("example1", 20, animator, 100, 100);
describe('example1', function () {
    it('should match the reference', function (done) {
        helper.sameExample("example1", "example1-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOlsic3BhcmsiXSwibWFwcGluZ3MiOiJBQUFBLDJEQUEyRDtBQUMzRCw2Q0FBNkM7QUFDN0MsNENBQTRDO0FBQzVDLDJDQUEyQztBQUMzQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN4QyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFHbEIsSUFBWSxFQUFFLFdBQU0sZ0JBQWdCLENBQUMsQ0FBQTtBQUNyQyxJQUFZLE1BQU0sV0FBTSxlQUFlLENBQUMsQ0FBQTtBQUV4QyxJQUFZLFNBQVMsV0FBTSxrQkFBa0IsQ0FBQyxDQUFBO0FBRTlDLElBQUksUUFBUSxHQUFnQixNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztBQUV4RCxFQUFFLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztBQUNoQix1QkFBdUI7QUFDdkIsZUFBZSxLQUFrQjtJQUM3QkEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsTUFBTUEsRUFBRUE7U0FDYkEsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7U0FDUEEsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0E7U0FDaEJBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLEVBQUNBLENBQUNBLENBQUNBLENBQUNBO1NBQ3pCQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQTtTQUNaQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtTQUNQQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQTtTQUNoQkEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsRUFBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FDN0JBLENBQUNBO0FBQ1ZBLENBQUNBO0FBQ0Qsd0JBQXdCO0FBQ3hCLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFBLENBQUMsSUFBRSxPQUFBLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBZixDQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFYLENBQVcsQ0FBQyxDQUFDO0FBQ2xHLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFBLENBQUMsSUFBRSxPQUFBLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBZixDQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFYLENBQVcsQ0FBQyxDQUFDO0FBRWxHLElBQUksR0FBRyxHQUFLLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFBLENBQUMsSUFBRSxPQUFBLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFYLENBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQWIsQ0FBYSxDQUFDLENBQUM7QUFDL0YsSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQUEsQ0FBQyxJQUFFLE9BQUEsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQVgsQ0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsRUFBWixDQUFZLENBQUMsQ0FBQztBQUU5Rix3RUFBd0U7QUFDeEUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFHMUUsMEdBQTBHO0FBQzFHLDZDQUE2QztBQUM3QyxzRUFBc0U7QUFDdEUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFO0tBQ3BCLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsQ0FBQztLQUNsQixRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUM7S0FDaEIsSUFBSSxDQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FDbkIsQ0FDSixDQUFDO0FBRUYsOEVBQThFO0FBRTlFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRTtLQUNwQixJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRTtLQUNaLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztLQUMxQyxJQUFJLENBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDMUMsQ0FDSixDQUNKLENBQUM7QUFFRixvSEFBb0g7QUFDcEgsMEJBQTBCO0FBQzFCLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRTtLQUNwQixZQUFZLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ3pELElBQUksQ0FDRCxLQUFLLENBQUMsS0FBSyxDQUFDLENBQ2YsQ0FDSixDQUFDO0FBQ0YsaUdBQWlHO0FBQ2pHLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRXZELFFBQVEsQ0FBQyxVQUFVLEVBQUU7SUFDakIsRUFBRSxDQUFFLDRCQUE0QixFQUFFLFVBQVMsSUFBSTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsVUFBUyxLQUFLO1lBQ3pELEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLElBQUksRUFBRSxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImRpc3QvdGVzdC9leGFtcGxlMS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFRISVMgSVMgQVVUTyBHRU5FUkFURUQgVEVTVCBDT0RFLCBETyBOT1QgTU9ESUZZIERJUkVDVExZXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvc2hvdWxkLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL21vY2hhLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL25vZGUuZC50c1wiIC8+XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5yZXF1aXJlKFwic2hvdWxkXCIpO1xuXG5pbXBvcnQgKiBhcyBSeCBmcm9tIFwicnhcIjtcbmltcG9ydCAqIGFzIEF4IGZyb20gXCIuLi9zcmMvYW5pbWF4ZVwiO1xuaW1wb3J0ICogYXMgaGVscGVyIGZyb20gXCIuLi9zcmMvaGVscGVyXCI7XG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSBcIi4uL3NyYy9ldmVudHNcIjtcbmltcG9ydCAqIGFzIFBhcmFtZXRlciBmcm9tIFwiLi4vc3JjL1BhcmFtZXRlclwiO1xuXG52YXIgYW5pbWF0b3I6IEF4LkFuaW1hdG9yID0gaGVscGVyLmdldEV4YW1wbGVBbmltYXRvcigpO1xuXG5BeC5ERUJVRyA9IHRydWU7XG4vLzIgZnJhbWUgYW5pbWF0ZWQgZ2xvd1xuZnVuY3Rpb24gc3BhcmsoY29sb3I6IEF4LkNvbG9yQXJnKTogQXguQW5pbWF0aW9uIHsgLy93ZSBjb3VsZCBiZSBjbGV2ZXIgYW5kIGxldCBzcGFyayB0YWtlIGEgc2VxLCBidXQgdXNlciBmdW5jdGlvbnMgc2hvdWxkIGJlIHNpbXBsZVxuICAgIHJldHVybiBBeC5jcmVhdGUoKVxuICAgICAgICAudGFrZSgxKVxuICAgICAgICAuZmlsbFN0eWxlKGNvbG9yKVxuICAgICAgICAuZmlsbFJlY3QoWy0yLCAtMl0sIFs1LDVdKVxuICAgICAgICAudGhlbihBeC5jcmVhdGUoKVxuICAgICAgICAgICAgLnRha2UoMSlcbiAgICAgICAgICAgIC5maWxsU3R5bGUoY29sb3IpXG4gICAgICAgICAgICAuZmlsbFJlY3QoWy0xLCAtMV0sIFszLDNdKVxuICAgICAgICApO1xufVxuLy9sYXJnZSBjaXJjbGUgZnVuY2l0b25zXG52YXIgYmlnU2luID0gUGFyYW1ldGVyLnNpbihQYXJhbWV0ZXIudCgpLm1hcFZhbHVlKHg9PnggKiBNYXRoLlBJICogMikpLm1hcFZhbHVlKHggPT4geCAqIDQwICsgNTApO1xudmFyIGJpZ0NvcyA9IFBhcmFtZXRlci5jb3MoUGFyYW1ldGVyLnQoKS5tYXBWYWx1ZSh4PT54ICogTWF0aC5QSSAqIDIpKS5tYXBWYWx1ZSh4ID0+IHggKiA0MCArIDUwKTtcblxudmFyIHJlZCAgID0gUGFyYW1ldGVyLnNpbihQYXJhbWV0ZXIudCgpLm1hcFZhbHVlKHg9PnggKiBNYXRoLlBJKSkubWFwVmFsdWUoeCA9PiB4ICogMTI1ICsgMTI1KTtcbnZhciBncmVlbiA9IFBhcmFtZXRlci5zaW4oUGFyYW1ldGVyLnQoKS5tYXBWYWx1ZSh4PT54ICogTWF0aC5QSSkpLm1hcFZhbHVlKHggPT4geCAqIDU1ICsgMjAwKTtcblxuLy9lYWNoIGZyYW1lLCBmaXJzdCBkcmF3IGJsYWNrIGJhY2tncm91bmQgdG8gZXJhc2UgdGhlIHByZXZpb3VzIGNvbnRlbnRzXG5hbmltYXRvci5wbGF5KEF4LmNyZWF0ZSgpLmZpbGxTdHlsZShcIiMwMDAwMDBcIikuZmlsbFJlY3QoWzAsMF0sWzEwMCwxMDBdKSk7XG5cblxuLy8gbW92ZSB0aGUgZHJhd2luZyBjb250ZXh0IGZyYW1lIG9mIHJlZmVyZW5jZSB0byB0aGUgY2VudGVyICg1MCw1MCkgYW5kIHRoZW4gbW92ZSBpdCBieSBhICt2ZSB4IHZlbG9jaXR5LFxuLy8gc28gdGhlIGZyYW1lIG9mIHJlZmVyZW5jZSBtb3ZlcyBvdmVyIHRpbWUuXG4vLyB0aGVuIGRyYXcgb3VyIDIgZnJhbWUgc3BhcmsgYW5pbWF0aW9uIGluIGEgbG9vcCBzbyBpdCBkcmF3cyBmb3JldmVyXG5hbmltYXRvci5wbGF5KEF4LmNyZWF0ZSgpXG4gICAgLnRyYW5zbGF0ZShbNTAsNTBdKVxuICAgIC52ZWxvY2l0eShbNTAsMF0pXG4gICAgLmxvb3AoXG4gICAgICAgIHNwYXJrKFwiI0ZGRkZGRlwiKVxuICAgIClcbik7XG5cbi8vIG1vdmUgdGhlIGRyYXcgY29udGV4dCB0byBhIGNvb3JkaW5hdGUgZGV0ZXJtaW5lZCBieSB0cmlnIChpLmUuIGluIGEgY2lyY2xlKVxuXG5hbmltYXRvci5wbGF5KEF4LmNyZWF0ZSgpXG4gICAgLmxvb3AoQXguY3JlYXRlKClcbiAgICAgICAgLnRyYW5zbGF0ZShQYXJhbWV0ZXIucG9pbnQoYmlnU2luLCBiaWdDb3MpKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICAgIHNwYXJrKFBhcmFtZXRlci5yZ2JhKHJlZCwgZ3JlZW4sIDAsIDEpKVxuICAgICAgICApXG4gICAgKVxuKTtcblxuLy8gdHdlZW4gYmV0d2VlbiB0aGUgY2VudGVyICg1MCw1MCkgYW5kIGEgcG9pbnQgb24gYSBjaXJjbGUuIFRoaXMgaGFzIHRoZSBlZmZlY3Qgb2YgbW92aW5nIHRoZSBpbm5lciBzcGFyayBhbmltYXRpb25cbi8vIGluIGEgYXJjaGltZWRlcyBzcGlyYWwuXG5hbmltYXRvci5wbGF5KEF4LmNyZWF0ZSgpXG4gICAgLnR3ZWVuX2xpbmVhcihbNTAsNTBdLCBQYXJhbWV0ZXIucG9pbnQoYmlnU2luLCBiaWdDb3MpLCAxKVxuICAgIC5sb29wKFxuICAgICAgICBzcGFyayhcInJlZFwiKVxuICAgIClcbik7XG4vLyB0aGUgaGVscGVyIGZ1bmN0aW9uIHBpcGVzIGluamVjdHMgdGhlIGNvbnRleHQsIGVpdGhlciBmcm9tIGEgd2ViIGNhbnZhcyBvciBhIGZha2Ugbm9kZS5qcyBvbmUuXG5oZWxwZXIucGxheUV4YW1wbGUoXCJleGFtcGxlMVwiLCAyMCwgYW5pbWF0b3IsIDEwMCwgMTAwKTtcblxuZGVzY3JpYmUoJ2V4YW1wbGUxJywgZnVuY3Rpb24gKCkge1xuICAgIGl0ICgnc2hvdWxkIG1hdGNoIHRoZSByZWZlcmVuY2UnLCBmdW5jdGlvbihkb25lKSB7XG4gICAgICAgIGhlbHBlci5zYW1lRXhhbXBsZShcImV4YW1wbGUxXCIsIFwiZXhhbXBsZTEtcmVmXCIsIGZ1bmN0aW9uKGVxdWFsKSB7XG4gICAgICAgICAgICBlcXVhbC5zaG91bGQuZXF1YWwodHJ1ZSk7XG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH0pXG4gICAgfSk7XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=