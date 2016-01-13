// THIS IS AUTO GENERATED TEST CODE, DO NOT MODIFY DIRECTLY
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
require("should");
var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var Parameter = require("../src/Parameter");
var animator = helper.getExampleAnimator(100, 100);
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
/**
 *
 * A time varying set of parametric equations.
 * https://en.wikipedia.org/wiki/Lissajous_curve.
 * Paramteric equations over P,  P -> x = sin(aP + i), for each dimention
 * ( Normally parametric equations are described using parameter t, but this is confusing
 * with the time tick so I used P to describe the free parameter in the parametric equations)
 * At each time tick, t, a lissajous curve is generated from the time-varying A,a,B,b,i parameters
 */
function lissajous(frequency_phase) {
    return List.from(frequency_phase).mapElement(function (fp) {
        return function (P) { return Math.sin(fp[0] * P + fp[1]); };
    });
}
var twoPi = 2 * Math.PI;
var amplitudeA = 4;
Parameter.t().mapValue(function (t) { return Math.sin(t * 2) * 45; });
var amplitudeB = 4;
Parameter.t().mapValue(function (t) { return Math.sin(t) * 45; });
// We use a numerical approximation 'trace' to sample enough P's to approximate the curve with a point list
// So every time tick, we pick some time varying numbers chosen artistically
// we pass them through lissajous to generate some parametric equations
// we then trace that to turn it into a pointlist. 
// So we have transformed the (arbitary) time varying parameters, to a time varying list of points 
var timeVaryingPointList = (Parameter.trace(lissajous(), 0, twoPi).mapValue(function (array) {
    return array.map(function (segment) { return segment.point; });
}));
// To render a time varying list of points as a joined up line, each frame we chain a moveTo and many lineTo animations together.
// As canvas animation persist over time forever, we have to use take(1) to limit the length of the animations to one frame.
// playAll is able to play a new animation generated from a time varying stream of animations.
// we can chain many animations based on values from a list, by reducing over the start of the animation chain.        
animator.play(Ax.create()
    .beginPath()
    .playAll(timeVaryingPointList.mapValue(// time varying point set is mapped to a time varying animation for squencing each frame
function (pointList) {
    // Convert the list of points into a single animation chain
    return pointList.reduce(function (animation, point, index) {
        return index == 0 ? animation.moveTo(point) : animation.lineTo(point);
    }, 
    // Start of chain, blank animation with take(1)
    // the take(1) ensure the played animation lasts 1 frame
    Ax.create().translate([50, 50]).take(1));
}))
    .strokeStyle("green")
    .lineWidth(3)
    .stroke());
helper.playExample("lissajous_color", 64, animator, 100, 100);
describe('lissajous_color', function () {
    it('should match the reference', function (done) {
        helper.sameExample("lissajous_color", "lissajous_color-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOlsibGlzc2Fqb3VzIl0sIm1hcHBpbmdzIjoiQUFBQSwyREFBMkQ7QUFDM0QsNkNBQTZDO0FBQzdDLDRDQUE0QztBQUM1QywyQ0FBMkM7QUFDM0MsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDeEMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBSWxCLElBQVksRUFBRSxXQUFNLGdCQUFnQixDQUFDLENBQUE7QUFDckMsSUFBWSxNQUFNLFdBQU0sZUFBZSxDQUFDLENBQUE7QUFFeEMsSUFBWSxTQUFTLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQU05QyxJQUFJLFFBQVEsR0FBZ0IsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUVoRSx3RUFBd0U7QUFDeEUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFJMUU7Ozs7Ozs7O0dBUUc7QUFDSCxtQkFDUSxlQUFzRTtJQUUxRUEsTUFBTUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0EsVUFBVUEsQ0FBQ0EsVUFBQ0EsRUFBb0JBO1FBQzlEQSxNQUFNQSxDQUFDQSxVQUFDQSxDQUFTQSxJQUFLQSxPQUFBQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxHQUFHQSxFQUFFQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUEzQkEsQ0FBMkJBLENBQUNBO0lBQ3REQSxDQUFDQSxDQUFDQSxDQUFBQTtBQUNOQSxDQUFDQTtBQUVELElBQUksS0FBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBRXhCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztBQUFBLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQWxCLENBQWtCLENBQUMsQ0FBQTtBQUNsRSxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7QUFBQSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQWhCLENBQWdCLENBQUMsQ0FBQTtBQUVoRSwyR0FBMkc7QUFDM0csNEVBQTRFO0FBQzVFLHVFQUF1RTtBQUN2RSxtREFBbUQ7QUFDbkQsbUdBQW1HO0FBQ25HLElBQUksb0JBQW9CLEdBQ3BCLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FDWixTQUFTLEVBQUUsRUFDWCxDQUFDLEVBQUUsS0FBSyxDQUNYLENBQUMsUUFBUSxDQUFDLFVBQUMsS0FBcUM7SUFDN0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBQSxPQUFPLElBQUksT0FBQSxPQUFPLENBQUMsS0FBSyxFQUFiLENBQWEsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFHUixpSUFBaUk7QUFDakksNEhBQTRIO0FBQzVILDhGQUE4RjtBQUM5Rix1SEFBdUg7QUFDdkgsUUFBUSxDQUFDLElBQUksQ0FDVCxFQUFFLENBQUMsTUFBTSxFQUFFO0tBRVYsU0FBUyxFQUFFO0tBQ1gsT0FBTyxDQUNKLG9CQUFvQixDQUFDLFFBQVEsQ0FBRSx3RkFBd0Y7QUFDbkgsVUFBQyxTQUFxQjtJQUNsQiwyREFBMkQ7SUFDM0QsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBQyxTQUFTLEVBQUUsS0FBZSxFQUFFLEtBQVk7UUFDN0QsTUFBTSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRSxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFDRCwrQ0FBK0M7SUFDL0Msd0RBQXdEO0lBQ3hELEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQ0osQ0FDSjtLQUNBLFdBQVcsQ0FBQyxPQUFPLENBQUM7S0FDcEIsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUNaLE1BQU0sRUFBRSxDQUNaLENBQUM7QUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRzlELFFBQVEsQ0FBQyxpQkFBaUIsRUFBRTtJQUN4QixFQUFFLENBQUUsNEJBQTRCLEVBQUUsVUFBUyxJQUFJO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsVUFBUyxLQUFLO1lBQ3ZFLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLElBQUksRUFBRSxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImRpc3QvdGVzdC9saXNzYWpvdXNfY29sb3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUSElTIElTIEFVVE8gR0VORVJBVEVEIFRFU1QgQ09ERSwgRE8gTk9UIE1PRElGWSBESVJFQ1RMWVxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL3Nob3VsZC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9tb2NoYS5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9ub2RlLmQudHNcIiAvPlxucmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0JykuaW5zdGFsbCgpO1xucmVxdWlyZShcInNob3VsZFwiKTtcblxuXG5pbXBvcnQgKiBhcyBSeCBmcm9tIFwicnhcIjtcbmltcG9ydCAqIGFzIEF4IGZyb20gXCIuLi9zcmMvYW5pbWF4ZVwiO1xuaW1wb3J0ICogYXMgaGVscGVyIGZyb20gXCIuLi9zcmMvaGVscGVyXCI7XG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSBcIi4uL3NyYy9ldmVudHNcIjtcbmltcG9ydCAqIGFzIFBhcmFtZXRlciBmcm9tIFwiLi4vc3JjL1BhcmFtZXRlclwiO1xuaW1wb3J0ICogYXMgcGFyYW1ldHJpYyBmcm9tIFwiLi4vc3JjL3BhcmFtZXRyaWNcIjtcbmltcG9ydCAqIGFzIE9UIGZyb20gXCIuLi9zcmMvZnJwXCI7IC8vIFRPRE8gdGhpcyBzaG91bGQgYmUgaW4gQXhcbmltcG9ydCAqIGFzIHR5cGVzIGZyb20gXCIuLi9zcmMvdHlwZXNcIjsgLy8gVE9ETyB0aGlzIHNob3VsZCBiZSBpbiBBeFxuaW1wb3J0ICogYXMgY2FudmFzIGZyb20gXCIuLi9zcmMvY2FudmFzXCI7IC8vIFRPRE8gdGhpcyBzaG91bGQgYmUgaW4gQXhcblxudmFyIGFuaW1hdG9yOiBBeC5BbmltYXRvciA9IGhlbHBlci5nZXRFeGFtcGxlQW5pbWF0b3IoMTAwLCAxMDApO1xuXG4vL2VhY2ggZnJhbWUsIGZpcnN0IGRyYXcgYmxhY2sgYmFja2dyb3VuZCB0byBlcmFzZSB0aGUgcHJldmlvdXMgY29udGVudHNcbmFuaW1hdG9yLnBsYXkoQXguY3JlYXRlKCkuZmlsbFN0eWxlKFwiIzAwMDAwMFwiKS5maWxsUmVjdChbMCwwXSxbMTAwLDEwMF0pKTtcblxuXG5cbi8qKlxuICogXG4gKiBBIHRpbWUgdmFyeWluZyBzZXQgb2YgcGFyYW1ldHJpYyBlcXVhdGlvbnMuXG4gKiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9MaXNzYWpvdXNfY3VydmUuXG4gKiBQYXJhbXRlcmljIGVxdWF0aW9ucyBvdmVyIFAsICBQIC0+IHggPSBzaW4oYVAgKyBpKSwgZm9yIGVhY2ggZGltZW50aW9uXG4gKiAoIE5vcm1hbGx5IHBhcmFtZXRyaWMgZXF1YXRpb25zIGFyZSBkZXNjcmliZWQgdXNpbmcgcGFyYW1ldGVyIHQsIGJ1dCB0aGlzIGlzIGNvbmZ1c2luZ1xuICogd2l0aCB0aGUgdGltZSB0aWNrIHNvIEkgdXNlZCBQIHRvIGRlc2NyaWJlIHRoZSBmcmVlIHBhcmFtZXRlciBpbiB0aGUgcGFyYW1ldHJpYyBlcXVhdGlvbnMpXG4gKiBBdCBlYWNoIHRpbWUgdGljaywgdCwgYSBsaXNzYWpvdXMgY3VydmUgaXMgZ2VuZXJhdGVkIGZyb20gdGhlIHRpbWUtdmFyeWluZyBBLGEsQixiLGkgcGFyYW1ldGVyc1xuICovXG5mdW5jdGlvbiBsaXNzYWpvdXMoXG4gICAgICAgIGZyZXF1ZW5jeV9waGFzZTogUGFyYW1ldGVyLkxpc3Q8W251bWJlciwgbnVtYmVyXT4gfCBbbnVtYmVyLCBudW1iZXJdW10pXG4gICAgOiBQYXJhbWV0ZXIuUGFyYW1ldGVyPCgodDogbnVtYmVyKSA9PiBudW1iZXIpW10+IHtcbiAgICByZXR1cm4gTGlzdC5mcm9tKGZyZXF1ZW5jeV9waGFzZSkubWFwRWxlbWVudCgoZnA6IFtudW1iZXIsIG51bWJlcl0pID0+IHtcbiAgICAgICAgcmV0dXJuIChQOiBudW1iZXIpID0+IE1hdGguc2luKGZwWzBdICogUCArIGZwWzFdKTtcbiAgICB9KVxufVxuXG52YXIgdHdvUGkgPSAyICogTWF0aC5QSTtcblxudmFyIGFtcGxpdHVkZUEgPSA0O1BhcmFtZXRlci50KCkubWFwVmFsdWUodCA9PiBNYXRoLnNpbih0KjIpICogNDUpXG52YXIgYW1wbGl0dWRlQiA9IDQ7UGFyYW1ldGVyLnQoKS5tYXBWYWx1ZSh0ID0+IE1hdGguc2luKHQpICogNDUpXG5cbi8vIFdlIHVzZSBhIG51bWVyaWNhbCBhcHByb3hpbWF0aW9uICd0cmFjZScgdG8gc2FtcGxlIGVub3VnaCBQJ3MgdG8gYXBwcm94aW1hdGUgdGhlIGN1cnZlIHdpdGggYSBwb2ludCBsaXN0XG4vLyBTbyBldmVyeSB0aW1lIHRpY2ssIHdlIHBpY2sgc29tZSB0aW1lIHZhcnlpbmcgbnVtYmVycyBjaG9zZW4gYXJ0aXN0aWNhbGx5XG4vLyB3ZSBwYXNzIHRoZW0gdGhyb3VnaCBsaXNzYWpvdXMgdG8gZ2VuZXJhdGUgc29tZSBwYXJhbWV0cmljIGVxdWF0aW9uc1xuLy8gd2UgdGhlbiB0cmFjZSB0aGF0IHRvIHR1cm4gaXQgaW50byBhIHBvaW50bGlzdC4gXG4vLyBTbyB3ZSBoYXZlIHRyYW5zZm9ybWVkIHRoZSAoYXJiaXRhcnkpIHRpbWUgdmFyeWluZyBwYXJhbWV0ZXJzLCB0byBhIHRpbWUgdmFyeWluZyBsaXN0IG9mIHBvaW50cyBcbnZhciB0aW1lVmFyeWluZ1BvaW50TGlzdDogLypQYXJhbWV0ZXIuUGFyYW1ldGVyPG51bWJlcltdW10+Ki8gT1QuU2lnbmFsRm48Y2FudmFzLlRpY2ssIG51bWJlcltdW10+ID0gXG4gICAgKFBhcmFtZXRlci50cmFjZShcbiAgICAgICAgbGlzc2Fqb3VzKCksXG4gICAgICAgIDAsIHR3b1BpXG4gICAgKS5tYXBWYWx1ZSgoYXJyYXk6IHtwb2ludDogbnVtYmVyW10sIHQ6IG51bWJlcn1bXSkgPT4ge1xuICAgICAgICByZXR1cm4gYXJyYXkubWFwKHNlZ21lbnQgPT4gc2VnbWVudC5wb2ludCk7XG4gICAgfSkpO1xuICAgICAgICAgICBcbiAgICAgICAgICAgXG4vLyBUbyByZW5kZXIgYSB0aW1lIHZhcnlpbmcgbGlzdCBvZiBwb2ludHMgYXMgYSBqb2luZWQgdXAgbGluZSwgZWFjaCBmcmFtZSB3ZSBjaGFpbiBhIG1vdmVUbyBhbmQgbWFueSBsaW5lVG8gYW5pbWF0aW9ucyB0b2dldGhlci5cbi8vIEFzIGNhbnZhcyBhbmltYXRpb24gcGVyc2lzdCBvdmVyIHRpbWUgZm9yZXZlciwgd2UgaGF2ZSB0byB1c2UgdGFrZSgxKSB0byBsaW1pdCB0aGUgbGVuZ3RoIG9mIHRoZSBhbmltYXRpb25zIHRvIG9uZSBmcmFtZS5cbi8vIHBsYXlBbGwgaXMgYWJsZSB0byBwbGF5IGEgbmV3IGFuaW1hdGlvbiBnZW5lcmF0ZWQgZnJvbSBhIHRpbWUgdmFyeWluZyBzdHJlYW0gb2YgYW5pbWF0aW9ucy5cbi8vIHdlIGNhbiBjaGFpbiBtYW55IGFuaW1hdGlvbnMgYmFzZWQgb24gdmFsdWVzIGZyb20gYSBsaXN0LCBieSByZWR1Y2luZyBvdmVyIHRoZSBzdGFydCBvZiB0aGUgYW5pbWF0aW9uIGNoYWluLiAgICAgICAgXG5hbmltYXRvci5wbGF5KFxuICAgIEF4LmNyZWF0ZSgpXG4vLy50cmFuc2xhdGUoWzUwLCA1MF0pICBCVUcgVEhJUyBET0VTTidUIFdPUksgSEVSRT8gICAgXG4gICAgLmJlZ2luUGF0aCgpXG4gICAgLnBsYXlBbGwoXG4gICAgICAgIHRpbWVWYXJ5aW5nUG9pbnRMaXN0Lm1hcFZhbHVlKCAvLyB0aW1lIHZhcnlpbmcgcG9pbnQgc2V0IGlzIG1hcHBlZCB0byBhIHRpbWUgdmFyeWluZyBhbmltYXRpb24gZm9yIHNxdWVuY2luZyBlYWNoIGZyYW1lXG4gICAgICAgICAgICAocG9pbnRMaXN0OiBudW1iZXJbXVtdKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgbGlzdCBvZiBwb2ludHMgaW50byBhIHNpbmdsZSBhbmltYXRpb24gY2hhaW5cbiAgICAgICAgICAgICAgICByZXR1cm4gcG9pbnRMaXN0LnJlZHVjZSgoYW5pbWF0aW9uLCBwb2ludDogbnVtYmVyW10sIGluZGV4Om51bWJlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5kZXggPT0gMCA/IGFuaW1hdGlvbi5tb3ZlVG8ocG9pbnQpOiBhbmltYXRpb24ubGluZVRvKHBvaW50KVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gU3RhcnQgb2YgY2hhaW4sIGJsYW5rIGFuaW1hdGlvbiB3aXRoIHRha2UoMSlcbiAgICAgICAgICAgICAgICAvLyB0aGUgdGFrZSgxKSBlbnN1cmUgdGhlIHBsYXllZCBhbmltYXRpb24gbGFzdHMgMSBmcmFtZVxuICAgICAgICAgICAgICAgIEF4LmNyZWF0ZSgpLnRyYW5zbGF0ZShbNTAsIDUwXSkudGFrZSgxKSk7IFxuICAgICAgICAgICAgfVxuICAgICAgICApXG4gICAgKVxuICAgIC5zdHJva2VTdHlsZShcImdyZWVuXCIpXG4gICAgLmxpbmVXaWR0aCgzKVxuICAgIC5zdHJva2UoKVxuKTtcblxuaGVscGVyLnBsYXlFeGFtcGxlKFwibGlzc2Fqb3VzX2NvbG9yXCIsIDY0LCBhbmltYXRvciwgMTAwLCAxMDApO1xuXG5cbmRlc2NyaWJlKCdsaXNzYWpvdXNfY29sb3InLCBmdW5jdGlvbiAoKSB7XG4gICAgaXQgKCdzaG91bGQgbWF0Y2ggdGhlIHJlZmVyZW5jZScsIGZ1bmN0aW9uKGRvbmUpIHtcbiAgICAgICAgaGVscGVyLnNhbWVFeGFtcGxlKFwibGlzc2Fqb3VzX2NvbG9yXCIsIFwibGlzc2Fqb3VzX2NvbG9yLXJlZlwiLCBmdW5jdGlvbihlcXVhbCkge1xuICAgICAgICAgICAgZXF1YWwuc2hvdWxkLmVxdWFsKHRydWUpO1xuICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9KVxuICAgIH0pO1xufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
