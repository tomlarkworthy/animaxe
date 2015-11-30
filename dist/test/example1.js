// THIS IS AUTO GENERATED TEST CODE, DO NOT MODIFY DIRECTLY
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
require("should");
var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var animator = helper.getExampleAnimator();
Ax.DEBUG = true;
//2 frame animated glow
function spark(color) {
    return Ax.create()
        .take(1)
        .fillRect([-2, -2], [10, 10]);
}
// move the drawing context frame of reference to the center (50,50) and then move it by a +ve x velocity,
// so the frame of reference moves over time.
// then draw our 2 frame spark animation in a loop so it draws forever
animator.play(Ax.create()
    .pipe(spark("#FF00FF")));
// move the draw context to a coordinate determined by trig (i.e. in a circle)
/*
animator.play(Ax.create()
    .loop(Ax.create()
        .translate(Parameter.point(bigSin, bigCos))
        .pipe(
            spark(Parameter.rgba(red, green, 0, 1))
        )
    )
);*/
// tween between the center (50,50) and a point on a circle. This has the effect of moving the inner spark animation
// in a archimedes spiral.
/*
animator.play(Ax.create()
    .tween_linear([50,50], Parameter.point(bigSin, bigCos), 1)
    .loop(
        spark("red")
    )
);*/
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOlsic3BhcmsiXSwibWFwcGluZ3MiOiJBQUFBLDJEQUEyRDtBQUMzRCw2Q0FBNkM7QUFDN0MsNENBQTRDO0FBQzVDLDJDQUEyQztBQUMzQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN4QyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFHbEIsSUFBWSxFQUFFLFdBQU0sZ0JBQWdCLENBQUMsQ0FBQTtBQUNyQyxJQUFZLE1BQU0sV0FBTSxlQUFlLENBQUMsQ0FBQTtBQUl4QyxJQUFJLFFBQVEsR0FBZ0IsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUM7QUFFeEQsRUFBRSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDaEIsdUJBQXVCO0FBQ3ZCLGVBQWUsS0FBa0I7SUFDN0JBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBO1NBQ2JBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO1NBQ1BBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLEVBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUFBO0FBQ3BDQSxDQUFDQTtBQUVELDBHQUEwRztBQUMxRyw2Q0FBNkM7QUFDN0Msc0VBQXNFO0FBQ3RFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRTtLQUNwQixJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQzFCLENBQUM7QUFDRiw4RUFBOEU7QUFDOUU7Ozs7Ozs7O0lBUUk7QUFFSixvSEFBb0g7QUFDcEgsMEJBQTBCO0FBQzFCOzs7Ozs7SUFNSTtBQUVKLGlHQUFpRztBQUNqRyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUV2RCxRQUFRLENBQUMsVUFBVSxFQUFFO0lBQ2pCLEVBQUUsQ0FBRSw0QkFBNEIsRUFBRSxVQUFTLElBQUk7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLFVBQVMsS0FBSztZQUN6RCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixJQUFJLEVBQUUsQ0FBQztRQUNYLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJkaXN0L3Rlc3QvZXhhbXBsZTEuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUSElTIElTIEFVVE8gR0VORVJBVEVEIFRFU1QgQ09ERSwgRE8gTk9UIE1PRElGWSBESVJFQ1RMWVxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL3Nob3VsZC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9tb2NoYS5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9ub2RlLmQudHNcIiAvPlxucmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0JykuaW5zdGFsbCgpO1xucmVxdWlyZShcInNob3VsZFwiKTtcblxuaW1wb3J0ICogYXMgUnggZnJvbSBcInJ4XCI7XG5pbXBvcnQgKiBhcyBBeCBmcm9tIFwiLi4vc3JjL2FuaW1heGVcIjtcbmltcG9ydCAqIGFzIGhlbHBlciBmcm9tIFwiLi4vc3JjL2hlbHBlclwiO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gXCIuLi9zcmMvZXZlbnRzXCI7XG5pbXBvcnQgKiBhcyBQYXJhbWV0ZXIgZnJvbSBcIi4uL3NyYy9QYXJhbWV0ZXJcIjtcblxudmFyIGFuaW1hdG9yOiBBeC5BbmltYXRvciA9IGhlbHBlci5nZXRFeGFtcGxlQW5pbWF0b3IoKTtcblxuQXguREVCVUcgPSB0cnVlO1xuLy8yIGZyYW1lIGFuaW1hdGVkIGdsb3dcbmZ1bmN0aW9uIHNwYXJrKGNvbG9yOiBBeC5Db2xvckFyZyk6IEF4LkFuaW1hdGlvbiB7IC8vd2UgY291bGQgYmUgY2xldmVyIGFuZCBsZXQgc3BhcmsgdGFrZSBhIHNlcSwgYnV0IHVzZXIgZnVuY3Rpb25zIHNob3VsZCBiZSBzaW1wbGVcbiAgICByZXR1cm4gQXguY3JlYXRlKClcbiAgICAgICAgLnRha2UoMSlcbiAgICAgICAgLmZpbGxSZWN0KFstMiwgLTJdLCBbMTAsMTBdKVxufVxuXG4vLyBtb3ZlIHRoZSBkcmF3aW5nIGNvbnRleHQgZnJhbWUgb2YgcmVmZXJlbmNlIHRvIHRoZSBjZW50ZXIgKDUwLDUwKSBhbmQgdGhlbiBtb3ZlIGl0IGJ5IGEgK3ZlIHggdmVsb2NpdHksXG4vLyBzbyB0aGUgZnJhbWUgb2YgcmVmZXJlbmNlIG1vdmVzIG92ZXIgdGltZS5cbi8vIHRoZW4gZHJhdyBvdXIgMiBmcmFtZSBzcGFyayBhbmltYXRpb24gaW4gYSBsb29wIHNvIGl0IGRyYXdzIGZvcmV2ZXJcbmFuaW1hdG9yLnBsYXkoQXguY3JlYXRlKClcbiAgICAucGlwZShzcGFyayhcIiNGRjAwRkZcIikpXG4pO1xuLy8gbW92ZSB0aGUgZHJhdyBjb250ZXh0IHRvIGEgY29vcmRpbmF0ZSBkZXRlcm1pbmVkIGJ5IHRyaWcgKGkuZS4gaW4gYSBjaXJjbGUpXG4vKlxuYW5pbWF0b3IucGxheShBeC5jcmVhdGUoKVxuICAgIC5sb29wKEF4LmNyZWF0ZSgpXG4gICAgICAgIC50cmFuc2xhdGUoUGFyYW1ldGVyLnBvaW50KGJpZ1NpbiwgYmlnQ29zKSlcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBzcGFyayhQYXJhbWV0ZXIucmdiYShyZWQsIGdyZWVuLCAwLCAxKSlcbiAgICAgICAgKVxuICAgIClcbik7Ki9cblxuLy8gdHdlZW4gYmV0d2VlbiB0aGUgY2VudGVyICg1MCw1MCkgYW5kIGEgcG9pbnQgb24gYSBjaXJjbGUuIFRoaXMgaGFzIHRoZSBlZmZlY3Qgb2YgbW92aW5nIHRoZSBpbm5lciBzcGFyayBhbmltYXRpb25cbi8vIGluIGEgYXJjaGltZWRlcyBzcGlyYWwuXG4vKlxuYW5pbWF0b3IucGxheShBeC5jcmVhdGUoKVxuICAgIC50d2Vlbl9saW5lYXIoWzUwLDUwXSwgUGFyYW1ldGVyLnBvaW50KGJpZ1NpbiwgYmlnQ29zKSwgMSlcbiAgICAubG9vcChcbiAgICAgICAgc3BhcmsoXCJyZWRcIilcbiAgICApXG4pOyovXG5cbi8vIHRoZSBoZWxwZXIgZnVuY3Rpb24gcGlwZXMgaW5qZWN0cyB0aGUgY29udGV4dCwgZWl0aGVyIGZyb20gYSB3ZWIgY2FudmFzIG9yIGEgZmFrZSBub2RlLmpzIG9uZS5cbmhlbHBlci5wbGF5RXhhbXBsZShcImV4YW1wbGUxXCIsIDIwLCBhbmltYXRvciwgMTAwLCAxMDApO1xuXG5kZXNjcmliZSgnZXhhbXBsZTEnLCBmdW5jdGlvbiAoKSB7XG4gICAgaXQgKCdzaG91bGQgbWF0Y2ggdGhlIHJlZmVyZW5jZScsIGZ1bmN0aW9uKGRvbmUpIHtcbiAgICAgICAgaGVscGVyLnNhbWVFeGFtcGxlKFwiZXhhbXBsZTFcIiwgXCJleGFtcGxlMS1yZWZcIiwgZnVuY3Rpb24oZXF1YWwpIHtcbiAgICAgICAgICAgIGVxdWFsLnNob3VsZC5lcXVhbCh0cnVlKTtcbiAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgfSlcbiAgICB9KTtcbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
