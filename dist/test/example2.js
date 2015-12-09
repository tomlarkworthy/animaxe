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
//a line between two points of a specified thickness and color (which are temporally varying parameters)
function thickLine1tick(thickness, start, end, css_color) {
    return Ax.create()
        .take(1)
        .strokeStyle(css_color)
        .withinPath(Ax.create()
        .lineWidth(thickness)
        .moveTo(start)
        .lineTo(end))
        .stroke();
}
/**
 * Three frame animation of a thinning line. Animations are displaced in time so even if the start and end streams move
 * The line doesn't
 */
function sparkLine(start, end, css_color) {
    return thickLine1tick(6, //thick line
    start, end, css_color)
        .then(thickLine1tick(2, //medium line
    Parameter.displaceT(-0.1, start), Parameter.displaceT(-0.1, end), css_color))
        .then(thickLine1tick(1, //thin line
    Parameter.displaceT(-0.2, start), Parameter.displaceT(-0.2, end), css_color));
}
//large circle funcitons
var bigSin = Parameter.sin(Parameter.t().map(function (x) { return Math.PI * x * 2; })).map(function (x) { return x * 40 + 50; });
var bigCos = Parameter.cos(Parameter.t().map(function (x) { return Math.PI * x * 2; })).map(function (x) { return x * 40 + 50; });
//periodic color
var red = 255;
var green = Parameter.sin(Parameter.t().map(function (x) { return x * 2; })).map(function (x) { return x * 100 + 55; });
var blue = 50;
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
// TEST:
/*
animator.play(
    Ax.create()
    .withinPath(Ax.create()
        .moveTo(
            Parameter.point(bigSin,bigCos)
        ).lineTo(
            Parameter.displaceT(-0.1, Parameter.point(bigSin,bigCos))
        )
    )
)*/
// TO DEBUG:
animator.play(Ax.create().emit(sparkLine(Parameter.point(bigSin, bigCos), Parameter.displaceT(-0.1, Parameter.point(bigSin, bigCos)), Parameter.rgba(red, green, blue, 1))));
helper.playExample("example2", 20, animator, 100, 100);
describe('example2', function () {
    it('should match the reference', function (done) {
        helper.sameExample("example2", "example2-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOlsidGhpY2tMaW5lMXRpY2siLCJzcGFya0xpbmUiXSwibWFwcGluZ3MiOiJBQUFBLDJEQUEyRDtBQUMzRCw2Q0FBNkM7QUFDN0MsNENBQTRDO0FBQzVDLDJDQUEyQztBQUMzQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN4QyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFHbEIsSUFBWSxFQUFFLFdBQU0sZ0JBQWdCLENBQUMsQ0FBQTtBQUNyQyxJQUFZLE1BQU0sV0FBTSxlQUFlLENBQUMsQ0FBQTtBQUV4QyxJQUFZLFNBQVMsV0FBTSxrQkFBa0IsQ0FBQyxDQUFBO0FBRTlDLElBQUksUUFBUSxHQUFnQixNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztBQUV4RCx3R0FBd0c7QUFDeEcsd0JBQ0ksU0FBaUIsRUFDakIsS0FBa0IsRUFDbEIsR0FBZ0IsRUFDaEIsU0FBK0I7SUFFL0JBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBO1NBQ2JBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO1NBQ1BBLFdBQVdBLENBQUNBLFNBQVNBLENBQUNBO1NBQ3RCQSxVQUFVQSxDQUFDQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQTtTQUNsQkEsU0FBU0EsQ0FBQ0EsU0FBU0EsQ0FBQ0E7U0FDcEJBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBO1NBQ2JBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLENBQ2ZBO1NBQ0FBLE1BQU1BLEVBQUVBLENBQUNBO0FBQ2xCQSxDQUFDQTtBQUVEOzs7R0FHRztBQUNILG1CQUFtQixLQUFrQixFQUFFLEdBQWdCLEVBQUUsU0FBc0I7SUFDM0VDLE1BQU1BLENBQUNBLGNBQWNBLENBQUNBLENBQUNBLEVBQUVBLFlBQVlBO0lBQzdCQSxLQUFLQSxFQUNMQSxHQUFHQSxFQUFFQSxTQUFTQSxDQUFDQTtTQUNsQkEsSUFBSUEsQ0FBQ0Es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QyxXQUFXLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxVQUFTLEtBQUs7WUFDekQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekIsSUFBSSxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiZGlzdC90ZXN0L2V4YW1wbGUyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVEhJUyBJUyBBVVRPIEdFTkVSQVRFRCBURVNUIENPREUsIERPIE5PVCBNT0RJRlkgRElSRUNUTFlcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9zaG91bGQuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbW9jaGEuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbnJlcXVpcmUoXCJzaG91bGRcIik7XG5cbmltcG9ydCAqIGFzIFJ4IGZyb20gXCJyeFwiO1xuaW1wb3J0ICogYXMgQXggZnJvbSBcIi4uL3NyYy9hbmltYXhlXCI7XG5pbXBvcnQgKiBhcyBoZWxwZXIgZnJvbSBcIi4uL3NyYy9oZWxwZXJcIjtcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tIFwiLi4vc3JjL2V2ZW50c1wiO1xuaW1wb3J0ICogYXMgUGFyYW1ldGVyIGZyb20gXCIuLi9zcmMvUGFyYW1ldGVyXCI7XG5cbnZhciBhbmltYXRvcjogQXguQW5pbWF0b3IgPSBoZWxwZXIuZ2V0RXhhbXBsZUFuaW1hdG9yKCk7XG5cbi8vYSBsaW5lIGJldHdlZW4gdHdvIHBvaW50cyBvZiBhIHNwZWNpZmllZCB0aGlja25lc3MgYW5kIGNvbG9yICh3aGljaCBhcmUgdGVtcG9yYWxseSB2YXJ5aW5nIHBhcmFtZXRlcnMpXG5mdW5jdGlvbiB0aGlja0xpbmUxdGljayhcbiAgICB0aGlja25lc3M6IG51bWJlcixcbiAgICBzdGFydDogQXguUG9pbnRBcmcsXG4gICAgZW5kOiBBeC5Qb2ludEFyZyxcbiAgICBjc3NfY29sb3I6IHN0cmluZyB8IEF4LkNvbG9yQXJnKVxuOiBBeC5BbmltYXRpb24ge1xuICAgIHJldHVybiBBeC5jcmVhdGUoKVxuICAgICAgICAudGFrZSgxKVxuICAgICAgICAuc3Ryb2tlU3R5bGUoY3NzX2NvbG9yKVxuICAgICAgICAud2l0aGluUGF0aChBeC5jcmVhdGUoKVxuICAgICAgICAgICAgLmxpbmVXaWR0aCh0aGlja25lc3MpXG4gICAgICAgICAgICAubW92ZVRvKHN0YXJ0KVxuICAgICAgICAgICAgLmxpbmVUbyhlbmQpXG4gICAgICAgIClcbiAgICAgICAgLnN0cm9rZSgpO1xufVxuXG4vKipcbiAqIFRocmVlIGZyYW1lIGFuaW1hdGlvbiBvZiBhIHRoaW5uaW5nIGxpbmUuIEFuaW1hdGlvbnMgYXJlIGRpc3BsYWNlZCBpbiB0aW1lIHNvIGV2ZW4gaWYgdGhlIHN0YXJ0IGFuZCBlbmQgc3RyZWFtcyBtb3ZlXG4gKiBUaGUgbGluZSBkb2Vzbid0XG4gKi9cbmZ1bmN0aW9uIHNwYXJrTGluZShzdGFydDogQXguUG9pbnRBcmcsIGVuZDogQXguUG9pbnRBcmcsIGNzc19jb2xvcjogQXguQ29sb3JBcmcpOiBBeC5BbmltYXRpb24geyAvL3dlIGNvdWxkIGJlIGNsZXZlciBhbmQgbGV0IHNwYXJrIHRha2UgYSBzZXEsIGJ1dCB1c2VyIGZ1bmN0aW9ucyBzaG91bGQgYmUgc2ltcGxlXG4gICAgcmV0dXJuIHRoaWNrTGluZTF0aWNrKDYsIC8vdGhpY2sgbGluZVxuICAgICAgICAgICAgc3RhcnQsXG4gICAgICAgICAgICBlbmQsIGNzc19jb2xvcilcbiAgICAgICAgLnRoZW4odGhpY2tMaW5lMXRpY2soMiwgLy9tZWRpdW0gbGluZVxuICAgICAgICAgICAgUGFyYW1ldGVyLmRpc3BsYWNlVCgtMC4xLCBzdGFydCksXG4gICAgICAgICAgICBQYXJhbWV0ZXIuZGlzcGxhY2VUKC0wLjEsIGVuZCksXG4gICAgICAgICAgICBjc3NfY29sb3IpKVxuICAgICAgICAudGhlbih0aGlja0xpbmUxdGljaygxLCAvL3RoaW4gbGluZVxuICAgICAgICAgICAgUGFyYW1ldGVyLmRpc3BsYWNlVCgtMC4yLCBzdGFydCksXG4gICAgICAgICAgICBQYXJhbWV0ZXIuZGlzcGxhY2VUKC0wLjIsIGVuZCksXG4gICAgICAgICAgICBjc3NfY29sb3IpKTtcbn1cblxuLy9sYXJnZSBjaXJjbGUgZnVuY2l0b25zXG52YXIgYmlnU2luID0gUGFyYW1ldGVyLnNpbihQYXJhbWV0ZXIudCgpLm1hcCh4ID0+IE1hdGguUEkgKiB4ICogMikpLm1hcCh4ID0+IHggKiA0MCArIDUwKTtcbnZhciBiaWdDb3MgPSBQYXJhbWV0ZXIuY29zKFBhcmFtZXRlci50KCkubWFwKHggPT4gTWF0aC5QSSAqIHggKiAyKSkubWFwKHggPT4geCAqIDQwICsgNTApO1xuXG4vL3BlcmlvZGljIGNvbG9yXG52YXIgcmVkICAgPSAyNTU7XG52YXIgZ3JlZW4gPSBQYXJhbWV0ZXIuc2luKFBhcmFtZXRlci50KCkubWFwKHggPT4geCoyKSkubWFwKHggPT4geCAqIDEwMCArIDU1KTtcbnZhciBibHVlID0gNTA7XG5cbi8vZWFjaCBmcmFtZSwgZmlyc3QgZHJhdyBibGFjayBiYWNrZ3JvdW5kIHRvIGVyYXNlIHRoZSBwcmV2aW91cyBjb250ZW50c1xuYW5pbWF0b3IucGxheShBeC5jcmVhdGUoKS5maWxsU3R5bGUoXCIjMDAwMDAwXCIpLmZpbGxSZWN0KFswLDBdLFsxMDAsMTAwXSkpO1xuXG4vLyBURVNUOlxuLypcbmFuaW1hdG9yLnBsYXkoXG4gICAgQXguY3JlYXRlKClcbiAgICAud2l0aGluUGF0aChBeC5jcmVhdGUoKVxuICAgICAgICAubW92ZVRvKFxuICAgICAgICAgICAgUGFyYW1ldGVyLnBvaW50KGJpZ1NpbixiaWdDb3MpXG4gICAgICAgICkubGluZVRvKFxuICAgICAgICAgICAgUGFyYW1ldGVyLmRpc3BsYWNlVCgtMC4xLCBQYXJhbWV0ZXIucG9pbnQoYmlnU2luLGJpZ0NvcykpXG4gICAgICAgIClcbiAgICApXG4pKi9cbi8vIFRPIERFQlVHOlxuXG5hbmltYXRvci5wbGF5KFxuICAgIEF4LmNyZWF0ZSgpLmVtaXQoXG4gICAgICAgIHNwYXJrTGluZShcbiAgICAgICAgICAgIFBhcmFtZXRlci5wb2ludChiaWdTaW4sYmlnQ29zKSxcbiAgICAgICAgICAgIFBhcmFtZXRlci5kaXNwbGFjZVQoLTAuMSwgUGFyYW1ldGVyLnBvaW50KGJpZ1NpbixiaWdDb3MpKSxcbiAgICAgICAgICAgIFBhcmFtZXRlci5yZ2JhKHJlZCxncmVlbixibHVlLDEpXG4gICAgICAgIClcbiAgICApXG4pO1xuXG5cbmhlbHBlci5wbGF5RXhhbXBsZShcImV4YW1wbGUyXCIsIDIwLCBhbmltYXRvciwgMTAwLCAxMDApO1xuZGVzY3JpYmUoJ2V4YW1wbGUyJywgZnVuY3Rpb24gKCkge1xuICAgIGl0ICgnc2hvdWxkIG1hdGNoIHRoZSByZWZlcmVuY2UnLCBmdW5jdGlvbihkb25lKSB7XG4gICAgICAgIGhlbHBlci5zYW1lRXhhbXBsZShcImV4YW1wbGUyXCIsIFwiZXhhbXBsZTItcmVmXCIsIGZ1bmN0aW9uKGVxdWFsKSB7XG4gICAgICAgICAgICBlcXVhbC5zaG91bGQuZXF1YWwodHJ1ZSk7XG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH0pXG4gICAgfSk7XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
