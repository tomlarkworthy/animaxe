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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOlsic3BhcmsiXSwibWFwcGluZ3MiOiJBQUFBLDJEQUEyRDtBQUMzRCw2Q0FBNkM7QUFDN0MsNENBQTRDO0FBQzVDLDJDQUEyQztBQUMzQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN4QyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFHbEIsSUFBWSxFQUFFLFdBQU0sZ0JBQWdCLENBQUMsQ0FBQTtBQUNyQyxJQUFZLE1BQU0sV0FBTSxlQUFlLENBQUMsQ0FBQTtBQUV4QyxJQUFZLFNBQVMsV0FBTSxrQkFBa0IsQ0FBQyxDQUFBO0FBRTlDLElBQUksUUFBUSxHQUFnQixNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztBQUV4RCx1QkFBdUI7QUFDdkIsZUFBZSxLQUFrQjtJQUM3QkEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsTUFBTUEsRUFBRUE7U0FDYkEsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7U0FDUEEsU0FBU0EsQ0FBQ0EsS0FBS0EsQ0FBQ0E7U0FDaEJBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLEVBQUNBLENBQUNBLENBQUNBLENBQUNBO1NBQ3pCQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQTtTQUNaQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtTQUNQQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQTtTQUNoQkEsUUFBUUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsRUFBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FDN0JBLENBQUNBO0FBQ1ZBLENBQUNBO0FBQ0Qsd0JBQXdCO0FBQ3hCLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFBLENBQUMsSUFBRSxPQUFBLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBZixDQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFYLENBQVcsQ0FBQyxDQUFDO0FBQ2xHLElBQUksTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFBLENBQUMsSUFBRSxPQUFBLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBZixDQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFYLENBQVcsQ0FBQyxDQUFDO0FBRWxHLElBQUksR0FBRyxHQUFLLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFBLENBQUMsSUFBRSxPQUFBLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFYLENBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQWIsQ0FBYSxDQUFDLENBQUM7QUFDL0YsSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQUEsQ0FBQyxJQUFFLE9BQUEsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQVgsQ0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsRUFBWixDQUFZLENBQUMsQ0FBQztBQUU5Rix3RUFBd0U7QUFDeEUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFHMUUsMEdBQTBHO0FBQzFHLDZDQUE2QztBQUM3QyxzRUFBc0U7QUFDdEUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFO0tBQ3BCLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsQ0FBQztLQUNsQixRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLENBQUM7S0FDaEIsSUFBSSxDQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FDbkIsQ0FDSixDQUFDO0FBRUYsOEVBQThFO0FBQzlFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRTtLQUNwQixJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRTtLQUNaLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztLQUMxQyxJQUFJLENBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDMUMsQ0FDSixDQUNKLENBQUM7QUFFRixvSEFBb0g7QUFDcEgsMEJBQTBCO0FBQzFCLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRTtLQUNwQixZQUFZLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ3pELElBQUksQ0FDRCxLQUFLLENBQUMsS0FBSyxDQUFDLENBQ2YsQ0FDSixDQUFDO0FBQ0YsaUdBQWlHO0FBQ2pHLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRXZELFFBQVEsQ0FBQyxVQUFVLEVBQUU7SUFDakIsRUFBRSxDQUFFLDRCQUE0QixFQUFFLFVBQVMsSUFBSTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsVUFBUyxLQUFLO1lBQ3pELEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLElBQUksRUFBRSxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImRpc3QvdGVzdC9leGFtcGxlMS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFRISVMgSVMgQVVUTyBHRU5FUkFURUQgVEVTVCBDT0RFLCBETyBOT1QgTU9ESUZZIERJUkVDVExZXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvc2hvdWxkLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL21vY2hhLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL25vZGUuZC50c1wiIC8+XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5yZXF1aXJlKFwic2hvdWxkXCIpO1xuXG5pbXBvcnQgKiBhcyBSeCBmcm9tIFwicnhcIjtcbmltcG9ydCAqIGFzIEF4IGZyb20gXCIuLi9zcmMvYW5pbWF4ZVwiO1xuaW1wb3J0ICogYXMgaGVscGVyIGZyb20gXCIuLi9zcmMvaGVscGVyXCI7XG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSBcIi4uL3NyYy9ldmVudHNcIjtcbmltcG9ydCAqIGFzIFBhcmFtZXRlciBmcm9tIFwiLi4vc3JjL1BhcmFtZXRlclwiO1xuXG52YXIgYW5pbWF0b3I6IEF4LkFuaW1hdG9yID0gaGVscGVyLmdldEV4YW1wbGVBbmltYXRvcigpO1xuXG4vLzIgZnJhbWUgYW5pbWF0ZWQgZ2xvd1xuZnVuY3Rpb24gc3BhcmsoY29sb3I6IEF4LkNvbG9yQXJnKTogQXguT3BlcmF0aW9uIHsgLy93ZSBjb3VsZCBiZSBjbGV2ZXIgYW5kIGxldCBzcGFyayB0YWtlIGEgc2VxLCBidXQgdXNlciBmdW5jdGlvbnMgc2hvdWxkIGJlIHNpbXBsZVxuICAgIHJldHVybiBBeC5jcmVhdGUoKVxuICAgICAgICAudGFrZSgxKVxuICAgICAgICAuZmlsbFN0eWxlKGNvbG9yKVxuICAgICAgICAuZmlsbFJlY3QoWy0yLCAtMl0sIFs1LDVdKVxuICAgICAgICAudGhlbihBeC5jcmVhdGUoKVxuICAgICAgICAgICAgLnRha2UoMSlcbiAgICAgICAgICAgIC5maWxsU3R5bGUoY29sb3IpXG4gICAgICAgICAgICAuZmlsbFJlY3QoWy0xLCAtMV0sIFszLDNdKVxuICAgICAgICApO1xufVxuLy9sYXJnZSBjaXJjbGUgZnVuY2l0b25zXG52YXIgYmlnU2luID0gUGFyYW1ldGVyLnNpbihQYXJhbWV0ZXIudCgpLm1hcFZhbHVlKHg9PnggKiBNYXRoLlBJICogMikpLm1hcFZhbHVlKHggPT4geCAqIDQwICsgNTApO1xudmFyIGJpZ0NvcyA9IFBhcmFtZXRlci5jb3MoUGFyYW1ldGVyLnQoKS5tYXBWYWx1ZSh4PT54ICogTWF0aC5QSSAqIDIpKS5tYXBWYWx1ZSh4ID0+IHggKiA0MCArIDUwKTtcblxudmFyIHJlZCAgID0gUGFyYW1ldGVyLnNpbihQYXJhbWV0ZXIudCgpLm1hcFZhbHVlKHg9PnggKiBNYXRoLlBJKSkubWFwVmFsdWUoeCA9PiB4ICogMTI1ICsgMTI1KTtcbnZhciBncmVlbiA9IFBhcmFtZXRlci5zaW4oUGFyYW1ldGVyLnQoKS5tYXBWYWx1ZSh4PT54ICogTWF0aC5QSSkpLm1hcFZhbHVlKHggPT4geCAqIDU1ICsgMjAwKTtcblxuLy9lYWNoIGZyYW1lLCBmaXJzdCBkcmF3IGJsYWNrIGJhY2tncm91bmQgdG8gZXJhc2UgdGhlIHByZXZpb3VzIGNvbnRlbnRzXG5hbmltYXRvci5wbGF5KEF4LmNyZWF0ZSgpLmZpbGxTdHlsZShcIiMwMDAwMDBcIikuZmlsbFJlY3QoWzAsMF0sWzEwMCwxMDBdKSk7XG5cblxuLy8gbW92ZSB0aGUgZHJhd2luZyBjb250ZXh0IGZyYW1lIG9mIHJlZmVyZW5jZSB0byB0aGUgY2VudGVyICg1MCw1MCkgYW5kIHRoZW4gbW92ZSBpdCBieSBhICt2ZSB4IHZlbG9jaXR5LFxuLy8gc28gdGhlIGZyYW1lIG9mIHJlZmVyZW5jZSBtb3ZlcyBvdmVyIHRpbWUuXG4vLyB0aGVuIGRyYXcgb3VyIDIgZnJhbWUgc3BhcmsgYW5pbWF0aW9uIGluIGEgbG9vcCBzbyBpdCBkcmF3cyBmb3JldmVyXG5hbmltYXRvci5wbGF5KEF4LmNyZWF0ZSgpXG4gICAgLnRyYW5zbGF0ZShbNTAsNTBdKVxuICAgIC52ZWxvY2l0eShbNTAsMF0pXG4gICAgLmxvb3AoXG4gICAgICAgIHNwYXJrKFwiI0ZGRkZGRlwiKVxuICAgIClcbik7XG5cbi8vIG1vdmUgdGhlIGRyYXcgY29udGV4dCB0byBhIGNvb3JkaW5hdGUgZGV0ZXJtaW5lZCBieSB0cmlnIChpLmUuIGluIGEgY2lyY2xlKVxuYW5pbWF0b3IucGxheShBeC5jcmVhdGUoKVxuICAgIC5sb29wKEF4LmNyZWF0ZSgpXG4gICAgICAgIC50cmFuc2xhdGUoUGFyYW1ldGVyLnBvaW50KGJpZ1NpbiwgYmlnQ29zKSlcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBzcGFyayhQYXJhbWV0ZXIucmdiYShyZWQsIGdyZWVuLCAwLCAxKSlcbiAgICAgICAgKVxuICAgIClcbik7XG5cbi8vIHR3ZWVuIGJldHdlZW4gdGhlIGNlbnRlciAoNTAsNTApIGFuZCBhIHBvaW50IG9uIGEgY2lyY2xlLiBUaGlzIGhhcyB0aGUgZWZmZWN0IG9mIG1vdmluZyB0aGUgaW5uZXIgc3BhcmsgYW5pbWF0aW9uXG4vLyBpbiBhIGFyY2hpbWVkZXMgc3BpcmFsLlxuYW5pbWF0b3IucGxheShBeC5jcmVhdGUoKVxuICAgIC50d2Vlbl9saW5lYXIoWzUwLDUwXSwgUGFyYW1ldGVyLnBvaW50KGJpZ1NpbiwgYmlnQ29zKSwgMSlcbiAgICAubG9vcChcbiAgICAgICAgc3BhcmsoXCJyZWRcIilcbiAgICApXG4pO1xuLy8gdGhlIGhlbHBlciBmdW5jdGlvbiBwaXBlcyBpbmplY3RzIHRoZSBjb250ZXh0LCBlaXRoZXIgZnJvbSBhIHdlYiBjYW52YXMgb3IgYSBmYWtlIG5vZGUuanMgb25lLlxuaGVscGVyLnBsYXlFeGFtcGxlKFwiZXhhbXBsZTFcIiwgMjAsIGFuaW1hdG9yLCAxMDAsIDEwMCk7XG5cbmRlc2NyaWJlKCdleGFtcGxlMScsIGZ1bmN0aW9uICgpIHtcbiAgICBpdCAoJ3Nob3VsZCBtYXRjaCB0aGUgcmVmZXJlbmNlJywgZnVuY3Rpb24oZG9uZSkge1xuICAgICAgICBoZWxwZXIuc2FtZUV4YW1wbGUoXCJleGFtcGxlMVwiLCBcImV4YW1wbGUxLXJlZlwiLCBmdW5jdGlvbihlcXVhbCkge1xuICAgICAgICAgICAgZXF1YWwuc2hvdWxkLmVxdWFsKHRydWUpO1xuICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9KVxuICAgIH0pO1xufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
