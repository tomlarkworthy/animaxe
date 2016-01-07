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
// we draw single pixels of different hues moving on a circle circumference
/*
export function trace(
    equations: Parameter<((t: number) => number)[]>,
    t_min: types.NumberArg,
    t_max: types.NumberArg,
    tolerance_px2: types.NumberArg = 1,
    minimum_splits: types.NumberArg = 0): Parameter<{point: number[], t: number}[]> {
    return equations.combine(
        () => (equations: ((t: number) => number)[], t_min: number, t_max: number, tolerance_px2: number, minimum_splits: number) => {
            return parametric.trace(equations, t_min, t_max, tolerance_px2, minimum_splits);
        },
        from(t_min),
        from(t_max),
        from(tolerance_px2),
        from(minimum_splits)
    )
}
*/
/**
 * https://en.wikipedia.org/wiki/Lissajous_curve
 * Paramteric equations of x = Asin(at + i), y = Bsin(bt)
 */
function lissajous(A, a, B, b, i) {
    return Parameter.from(A).combine(function () { return function (A, a, B, b, i) {
        return [function (t) { return A * Math.sin(a * t + i); }, function (t) { return B * Math.sin(b * t); }];
    }; }, Parameter.from(A), Parameter.from(a), Parameter.from(B), Parameter.from(b), Parameter.from(i));
}
// t => point[]
// mapped to
// t => mutation[]
// t => Canvas
/*
animator.play(
    Ax.create()
    .beginPath()
    .pipe(
        Ax.create().reduce(
            Parameter.trace(
                lissajous(45, 1, 45, 2, 0),
                Parameter.t(), Parameter.t().mapValue(t => t + Math.PI * 2),
                /* accuracy * 1,
                /* min. splits * 4
            ).mapValue(array => array.map(segment => segment.point)), // t values discarded, the result is an array of 2D points, i.e. [number, number][]
            (animation: Ax.Animation, point: [number, number], index: number) =>
                index == 0 ? animation.moveTo(point): animation.lineTo(point)
        )
    )
    .strokeStyle("green")
    .stroke()
);*/
helper.playExample("parametric", 20, animator, 100, 100);
describe('parametric', function () {
    it('should match the reference', function (done) {
        helper.sameExample("parametric", "parametric-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOlsibGlzc2Fqb3VzIl0sIm1hcHBpbmdzIjoiQUFBQSwyREFBMkQ7QUFDM0QsNkNBQTZDO0FBQzdDLDRDQUE0QztBQUM1QywyQ0FBMkM7QUFDM0MsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDeEMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBR2xCLElBQVksRUFBRSxXQUFNLGdCQUFnQixDQUFDLENBQUE7QUFDckMsSUFBWSxNQUFNLFdBQU0sZUFBZSxDQUFDLENBQUE7QUFFeEMsSUFBWSxTQUFTLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUc5QyxJQUFJLFFBQVEsR0FBZ0IsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUVoRSx3RUFBd0U7QUFDeEUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFMUUsMkVBQTJFO0FBRzNFOzs7Ozs7Ozs7Ozs7Ozs7OztFQWlCRTtBQUNGOzs7R0FHRztBQUNILG1CQUNRLENBQWUsRUFBRSxDQUFlLEVBQ2hDLENBQWUsRUFBRSxDQUFlLEVBQ2hDLENBQWU7SUFFbkJBLE1BQU1BLENBQUNBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLE9BQU9BLENBQzVCQSxjQUFNQSxPQUFBQSxVQUFDQSxDQUFTQSxFQUFFQSxDQUFTQSxFQUFFQSxDQUFTQSxFQUFFQSxDQUFTQSxFQUFFQSxDQUFTQTtlQUN4REEsQ0FBQ0EsVUFBQ0EsQ0FBU0EsSUFBS0EsT0FBQUEsQ0FBQ0EsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsRUFBdkJBLENBQXVCQSxFQUFFQSxVQUFDQSxDQUFTQSxJQUFLQSxPQUFBQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxFQUFuQkEsQ0FBbUJBLENBQUNBO0lBQTVFQSxDQUE0RUEsRUFEMUVBLENBQzBFQSxFQUNoRkEsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFDakJBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLEVBQ2pCQSxTQUFTQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUNqQkEsU0FBU0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsRUFDakJBLFNBQVNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQ3BCQSxDQUFBQTtBQUNMQSxDQUFDQTtBQUVELGVBQWU7QUFDZixZQUFZO0FBQ1osa0JBQWtCO0FBQ2xCLGNBQWM7QUFDZDs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBa0JJO0FBR0osTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFHekQsUUFBUSxDQUFDLFlBQVksRUFBRTtJQUNuQixFQUFFLENBQUUsNEJBQTRCLEVBQUUsVUFBUyxJQUFJO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLGdCQUFnQixFQUFFLFVBQVMsS0FBSztZQUM3RCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixJQUFJLEVBQUUsQ0FBQztRQUNYLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJkaXN0L3Rlc3QvcGFyYW1ldHJpYy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFRISVMgSVMgQVVUTyBHRU5FUkFURUQgVEVTVCBDT0RFLCBETyBOT1QgTU9ESUZZIERJUkVDVExZXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvc2hvdWxkLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL21vY2hhLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL25vZGUuZC50c1wiIC8+XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5yZXF1aXJlKFwic2hvdWxkXCIpO1xuXG5pbXBvcnQgKiBhcyBSeCBmcm9tIFwicnhcIjtcbmltcG9ydCAqIGFzIEF4IGZyb20gXCIuLi9zcmMvYW5pbWF4ZVwiO1xuaW1wb3J0ICogYXMgaGVscGVyIGZyb20gXCIuLi9zcmMvaGVscGVyXCI7XG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSBcIi4uL3NyYy9ldmVudHNcIjtcbmltcG9ydCAqIGFzIFBhcmFtZXRlciBmcm9tIFwiLi4vc3JjL1BhcmFtZXRlclwiO1xuaW1wb3J0ICogYXMgcGFyYW1ldHJpYyBmcm9tIFwiLi4vc3JjL3BhcmFtZXRyaWNcIjtcblxudmFyIGFuaW1hdG9yOiBBeC5BbmltYXRvciA9IGhlbHBlci5nZXRFeGFtcGxlQW5pbWF0b3IoMTAwLCAxMDApO1xuXG4vL2VhY2ggZnJhbWUsIGZpcnN0IGRyYXcgYmxhY2sgYmFja2dyb3VuZCB0byBlcmFzZSB0aGUgcHJldmlvdXMgY29udGVudHNcbmFuaW1hdG9yLnBsYXkoQXguY3JlYXRlKCkuZmlsbFN0eWxlKFwiIzAwMDAwMFwiKS5maWxsUmVjdChbMCwwXSxbMTAwLDEwMF0pKTtcblxuLy8gd2UgZHJhdyBzaW5nbGUgcGl4ZWxzIG9mIGRpZmZlcmVudCBodWVzIG1vdmluZyBvbiBhIGNpcmNsZSBjaXJjdW1mZXJlbmNlXG5cblxuLypcbmV4cG9ydCBmdW5jdGlvbiB0cmFjZShcbiAgICBlcXVhdGlvbnM6IFBhcmFtZXRlcjwoKHQ6IG51bWJlcikgPT4gbnVtYmVyKVtdPixcbiAgICB0X21pbjogdHlwZXMuTnVtYmVyQXJnLFxuICAgIHRfbWF4OiB0eXBlcy5OdW1iZXJBcmcsXG4gICAgdG9sZXJhbmNlX3B4MjogdHlwZXMuTnVtYmVyQXJnID0gMSxcbiAgICBtaW5pbXVtX3NwbGl0czogdHlwZXMuTnVtYmVyQXJnID0gMCk6IFBhcmFtZXRlcjx7cG9pbnQ6IG51bWJlcltdLCB0OiBudW1iZXJ9W10+IHtcbiAgICByZXR1cm4gZXF1YXRpb25zLmNvbWJpbmUoXG4gICAgICAgICgpID0+IChlcXVhdGlvbnM6ICgodDogbnVtYmVyKSA9PiBudW1iZXIpW10sIHRfbWluOiBudW1iZXIsIHRfbWF4OiBudW1iZXIsIHRvbGVyYW5jZV9weDI6IG51bWJlciwgbWluaW11bV9zcGxpdHM6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHBhcmFtZXRyaWMudHJhY2UoZXF1YXRpb25zLCB0X21pbiwgdF9tYXgsIHRvbGVyYW5jZV9weDIsIG1pbmltdW1fc3BsaXRzKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnJvbSh0X21pbiksXG4gICAgICAgIGZyb20odF9tYXgpLFxuICAgICAgICBmcm9tKHRvbGVyYW5jZV9weDIpLFxuICAgICAgICBmcm9tKG1pbmltdW1fc3BsaXRzKVxuICAgIClcbn1cbiovXG4vKipcbiAqIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0xpc3Nham91c19jdXJ2ZVxuICogUGFyYW10ZXJpYyBlcXVhdGlvbnMgb2YgeCA9IEFzaW4oYXQgKyBpKSwgeSA9IEJzaW4oYnQpXG4gKi9cbmZ1bmN0aW9uIGxpc3Nham91cyhcbiAgICAgICAgQTogQXguTnVtYmVyQXJnLCBhOiBBeC5OdW1iZXJBcmcsXG4gICAgICAgIEI6IEF4Lk51bWJlckFyZywgYjogQXguTnVtYmVyQXJnLCBcbiAgICAgICAgaTogQXguTnVtYmVyQXJnKVxuICAgIDogUGFyYW1ldGVyLlBhcmFtZXRlcjwoKHQ6IG51bWJlcikgPT4gbnVtYmVyKVtdPiB7XG4gICAgcmV0dXJuIFBhcmFtZXRlci5mcm9tKEEpLmNvbWJpbmUoXG4gICAgICAgICgpID0+IChBOiBudW1iZXIsIGE6IG51bWJlciwgQjogbnVtYmVyLCBiOiBudW1iZXIsIGk6IG51bWJlcikgPT4gXG4gICAgICAgICAgICBbKHQ6IG51bWJlcikgPT4gQSAqIE1hdGguc2luKGEgKiB0ICsgaSksICh0OiBudW1iZXIpID0+IEIgKiBNYXRoLnNpbihiICogdCldLFxuICAgICAgICBQYXJhbWV0ZXIuZnJvbShBKSxcbiAgICAgICAgUGFyYW1ldGVyLmZyb20oYSksXG4gICAgICAgIFBhcmFtZXRlci5mcm9tKEIpLFxuICAgICAgICBQYXJhbWV0ZXIuZnJvbShiKSxcbiAgICAgICAgUGFyYW1ldGVyLmZyb20oaSlcbiAgICApXG59XG5cbi8vIHQgPT4gcG9pbnRbXVxuLy8gbWFwcGVkIHRvXG4vLyB0ID0+IG11dGF0aW9uW11cbi8vIHQgPT4gQ2FudmFzXG4vKlxuYW5pbWF0b3IucGxheShcbiAgICBBeC5jcmVhdGUoKVxuICAgIC5iZWdpblBhdGgoKVxuICAgIC5waXBlKFxuICAgICAgICBBeC5jcmVhdGUoKS5yZWR1Y2UoXG4gICAgICAgICAgICBQYXJhbWV0ZXIudHJhY2UoXG4gICAgICAgICAgICAgICAgbGlzc2Fqb3VzKDQ1LCAxLCA0NSwgMiwgMCksXG4gICAgICAgICAgICAgICAgUGFyYW1ldGVyLnQoKSwgUGFyYW1ldGVyLnQoKS5tYXBWYWx1ZSh0ID0+IHQgKyBNYXRoLlBJICogMiksXG4gICAgICAgICAgICAgICAgLyogYWNjdXJhY3kgKiAxLFxuICAgICAgICAgICAgICAgIC8qIG1pbi4gc3BsaXRzICogNFxuICAgICAgICAgICAgKS5tYXBWYWx1ZShhcnJheSA9PiBhcnJheS5tYXAoc2VnbWVudCA9PiBzZWdtZW50LnBvaW50KSksIC8vIHQgdmFsdWVzIGRpc2NhcmRlZCwgdGhlIHJlc3VsdCBpcyBhbiBhcnJheSBvZiAyRCBwb2ludHMsIGkuZS4gW251bWJlciwgbnVtYmVyXVtdXG4gICAgICAgICAgICAoYW5pbWF0aW9uOiBBeC5BbmltYXRpb24sIHBvaW50OiBbbnVtYmVyLCBudW1iZXJdLCBpbmRleDogbnVtYmVyKSA9PiBcbiAgICAgICAgICAgICAgICBpbmRleCA9PSAwID8gYW5pbWF0aW9uLm1vdmVUbyhwb2ludCk6IGFuaW1hdGlvbi5saW5lVG8ocG9pbnQpXG4gICAgICAgIClcbiAgICApXG4gICAgLnN0cm9rZVN0eWxlKFwiZ3JlZW5cIilcbiAgICAuc3Ryb2tlKClcbik7Ki9cblxuXG5oZWxwZXIucGxheUV4YW1wbGUoXCJwYXJhbWV0cmljXCIsIDIwLCBhbmltYXRvciwgMTAwLCAxMDApO1xuXG5cbmRlc2NyaWJlKCdwYXJhbWV0cmljJywgZnVuY3Rpb24gKCkge1xuICAgIGl0ICgnc2hvdWxkIG1hdGNoIHRoZSByZWZlcmVuY2UnLCBmdW5jdGlvbihkb25lKSB7XG4gICAgICAgIGhlbHBlci5zYW1lRXhhbXBsZShcInBhcmFtZXRyaWNcIiwgXCJwYXJhbWV0cmljLXJlZlwiLCBmdW5jdGlvbihlcXVhbCkge1xuICAgICAgICAgICAgZXF1YWwuc2hvdWxkLmVxdWFsKHRydWUpO1xuICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9KVxuICAgIH0pO1xufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
