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
function foreverDot(size, css_color) {
    return Ax.create().fillStyle(css_color).fillRect([-size / 2, -size / 2], [size, size]);
}
var WIDTH = 100;
var HEIGHT = 100;
var SINS = 3;
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
animator.play(Ax.create().parallel(Ax.range(0, WIDTH).map(function (x) {
    // for each index we create a 10 sinwaves
    return Ax.create().parallel(Ax.range(0, SINS).map(function (i) {
        return Ax.create()
            .translate(Parameter.point(x, Parameter
            .sin(Parameter.t().mapValue(function (t) { return Math.sin(t + i * 4 + x / WIDTH) * 10 + t / 2 + x / WIDTH * Math.PI + i / SINS * Math.PI * 2; }))
            .mapValue(function (s) { return HEIGHT * (0.45 * s + 0.5); })))
            .pipe(foreverDot(3, Parameter.rgba(255, Parameter
            .sin(Parameter.t().mapValue(function (t) { return x / WIDTH + t * 2 + i; }))
            .mapValue(function (s) { return s * 125 + 125; }), 0, 1)));
    }));
})));
helper.playExample("rainbow_sines", 32, animator, WIDTH, 100);
describe('rainbow_sines', function () {
    it('should match the reference', function (done) {
        helper.sameExample("rainbow_sines", "rainbow_sines-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOlsiZm9yZXZlckRvdCJdLCJtYXBwaW5ncyI6IkFBQUEsMkRBQTJEO0FBQzNELDZDQUE2QztBQUM3Qyw0Q0FBNEM7QUFDNUMsMkNBQTJDO0FBQzNDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3hDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUdsQixJQUFZLEVBQUUsV0FBTSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3JDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBRXhDLElBQVksU0FBUyxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFFOUMsSUFBSSxRQUFRLEdBQWdCLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0FBRXhELG9CQUFvQixJQUFZLEVBQUUsU0FBc0I7SUFDcERBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLFNBQVNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLFFBQVFBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLEdBQUNBLENBQUNBLEVBQUVBLENBQUNBLElBQUlBLEdBQUNBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLElBQUlBLEVBQUVBLElBQUlBLENBQUNBLENBQUNBLENBQUNBO0FBQ3ZGQSxDQUFDQTtBQUdELElBQUksS0FBSyxHQUFHLEdBQUcsQ0FBQztBQUNoQixJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUM7QUFDakIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO0FBRWIsd0VBQXdFO0FBQ3hFLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHLEVBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRzFFLFFBQVEsQ0FBQyxJQUFJLENBQ1QsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FDaEIsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQztJQUNwQix5Q0FBeUM7SUFDekMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQ3ZCLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUM7UUFDbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUU7YUFDYixTQUFTLENBQ04sU0FBUyxDQUFDLEtBQUssQ0FDWCxDQUFDLEVBQ0QsU0FBUzthQUNKLEdBQUcsQ0FDQSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQTFGLENBQTBGLENBQUMsQ0FDMUg7YUFDQSxRQUFRLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxNQUFNLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxFQUF6QixDQUF5QixDQUFDLENBRTVDLENBQ0o7YUFDSixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFDbEMsU0FBUzthQUNKLEdBQUcsQ0FDQSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBckIsQ0FBcUIsQ0FBQyxDQUNyRDthQUNBLFFBQVEsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFiLENBQWEsQ0FBQyxFQUNqQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25CLENBQUMsQ0FBQyxDQUNMLENBQUM7QUFDTixDQUFDLENBQUMsQ0FDTCxDQUNKLENBQUM7QUFHRixNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztBQUM5RCxRQUFRLENBQUMsZUFBZSxFQUFFO0lBQ3RCLEVBQUUsQ0FBRSw0QkFBNEIsRUFBRSxVQUFTLElBQUk7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsVUFBUyxLQUFLO1lBQ25FLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLElBQUksRUFBRSxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImRpc3QvdGVzdC9yYWluYm93X3NpbmVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVEhJUyBJUyBBVVRPIEdFTkVSQVRFRCBURVNUIENPREUsIERPIE5PVCBNT0RJRlkgRElSRUNUTFlcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9zaG91bGQuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbW9jaGEuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbnJlcXVpcmUoXCJzaG91bGRcIik7XG5cbmltcG9ydCAqIGFzIFJ4IGZyb20gXCJyeFwiO1xuaW1wb3J0ICogYXMgQXggZnJvbSBcIi4uL3NyYy9hbmltYXhlXCI7XG5pbXBvcnQgKiBhcyBoZWxwZXIgZnJvbSBcIi4uL3NyYy9oZWxwZXJcIjtcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tIFwiLi4vc3JjL2V2ZW50c1wiO1xuaW1wb3J0ICogYXMgUGFyYW1ldGVyIGZyb20gXCIuLi9zcmMvUGFyYW1ldGVyXCI7XG5cbnZhciBhbmltYXRvcjogQXguQW5pbWF0b3IgPSBoZWxwZXIuZ2V0RXhhbXBsZUFuaW1hdG9yKCk7XG5cbmZ1bmN0aW9uIGZvcmV2ZXJEb3Qoc2l6ZTogbnVtYmVyLCBjc3NfY29sb3I6IEF4LkNvbG9yQXJnKTogQXguQW5pbWF0aW9uIHtcbiAgICByZXR1cm4gQXguY3JlYXRlKCkuZmlsbFN0eWxlKGNzc19jb2xvcikuZmlsbFJlY3QoWy1zaXplLzIsIC1zaXplLzJdLCBbc2l6ZSwgc2l6ZV0pO1xufVxuXG5cbnZhciBXSURUSCA9IDEwMDtcbnZhciBIRUlHSFQgPSAxMDA7XG52YXIgU0lOUyA9IDM7XG5cbi8vZWFjaCBmcmFtZSwgZmlyc3QgZHJhdyBibGFjayBiYWNrZ3JvdW5kIHRvIGVyYXNlIHRoZSBwcmV2aW91cyBjb250ZW50c1xuYW5pbWF0b3IucGxheShBeC5jcmVhdGUoKS5maWxsU3R5bGUoXCIjMDAwMDAwXCIpLmZpbGxSZWN0KFswLDBdLFsxMDAsMTAwXSkpO1xuXG5cbmFuaW1hdG9yLnBsYXkoXG4gICAgQXguY3JlYXRlKCkucGFyYWxsZWwoXG4gICAgICAgIEF4LnJhbmdlKDAsIFdJRFRIKS5tYXAoeCA9PiB7XG4gICAgICAgICAgICAvLyBmb3IgZWFjaCBpbmRleCB3ZSBjcmVhdGUgYSAxMCBzaW53YXZlc1xuICAgICAgICAgICAgcmV0dXJuIEF4LmNyZWF0ZSgpLnBhcmFsbGVsKFxuICAgICAgICAgICAgICAgIEF4LnJhbmdlKDAsIFNJTlMpLm1hcChpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEF4LmNyZWF0ZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAudHJhbnNsYXRlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBhcmFtZXRlci5wb2ludChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBhcmFtZXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNpbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXIudCgpLm1hcFZhbHVlKHQgPT4gTWF0aC5zaW4odCArIGkgKiA0ICsgeC8gV0lEVEgpICogMTAgKyB0IC8gMiArIHggLyBXSURUSCAqIE1hdGguUEkgKyBpIC8gU0lOUyAqIE1hdGguUEkgKiAyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcFZhbHVlKHMgPT4gSEVJR0hUICogKDAuNDUgKiBzICsgMC41KSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICAucGlwZShmb3JldmVyRG90KDMsIFBhcmFtZXRlci5yZ2JhKDI1NSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUGFyYW1ldGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5zaW4oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQYXJhbWV0ZXIudCgpLm1hcFZhbHVlKHQgPT4geCAvIFdJRFRIICsgdCAqIDIgKyBpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXBWYWx1ZShzID0+IHMgKiAxMjUgKyAxMjUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDAsMSkpKTsgIFxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApOyAgIFxuICAgICAgICB9KVxuICAgIClcbik7XG5cblxuaGVscGVyLnBsYXlFeGFtcGxlKFwicmFpbmJvd19zaW5lc1wiLCAzMiwgYW5pbWF0b3IsIFdJRFRILCAxMDApO1xuZGVzY3JpYmUoJ3JhaW5ib3dfc2luZXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgaXQgKCdzaG91bGQgbWF0Y2ggdGhlIHJlZmVyZW5jZScsIGZ1bmN0aW9uKGRvbmUpIHtcbiAgICAgICAgaGVscGVyLnNhbWVFeGFtcGxlKFwicmFpbmJvd19zaW5lc1wiLCBcInJhaW5ib3dfc2luZXMtcmVmXCIsIGZ1bmN0aW9uKGVxdWFsKSB7XG4gICAgICAgICAgICBlcXVhbC5zaG91bGQuZXF1YWwodHJ1ZSk7XG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH0pXG4gICAgfSk7XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
