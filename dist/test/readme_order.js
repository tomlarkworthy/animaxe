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
function flowNode(pos, label, id, active) {
    return Ax.create()
        .translate(pos)
        .fillText(label, [0, 0]);
}
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
var timeline = Parameter.constant(1).take(1).then(Parameter.constant(1).take(2));
// move the drawing context frame of reference to the center (50,50) and then move it by a +ve x velocity,
// so the frame of reference moves over time.
// then draw our 2 frame spark animation in a loop so it draws forever
animator.play(Ax.create().fillStyle("white")
    .parallel([
    flowNode([10, 10], "Ax.create()", 0, timeline),
    flowNode([20, 20], "strokeStyle(\"green\")", 0, timeline),
    flowNode([30, 30], "parrallel([", 0, timeline),
]));
// the helper function pipes injects the context, either from a web canvas or a fake node.js one.
helper.playExample("readme_order", 20, animator, 100, 100);
describe('readme_order', function () {
    it('should match the reference', function (done) {
        helper.sameExample("readme_order", "readme_order-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOlsiZmxvd05vZGUiXSwibWFwcGluZ3MiOiJBQUFBLDJEQUEyRDtBQUMzRCw2Q0FBNkM7QUFDN0MsNENBQTRDO0FBQzVDLDJDQUEyQztBQUMzQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN4QyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFpQmxCLElBQVksRUFBRSxXQUFNLGdCQUFnQixDQUFDLENBQUE7QUFDckMsSUFBWSxNQUFNLFdBQU0sZUFBZSxDQUFDLENBQUE7QUFFeEMsSUFBWSxTQUFTLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUU5QyxJQUFJLFFBQVEsR0FBZ0IsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUM7QUFFeEQsa0JBQ0ksR0FBYSxFQUNiLEtBQWEsRUFDYixFQUFVLEVBQ1YsTUFBbUM7SUFDbkNBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBO1NBQ2JBLFNBQVNBLENBQUNBLEdBQUdBLENBQUNBO1NBQ2RBLFFBQVFBLENBQUNBLEtBQUtBLEVBQUVBLENBQUNBLENBQUNBLEVBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUFBO0FBRS9CQSxDQUFDQTtBQUNELHdFQUF3RTtBQUN4RSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxFQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUUxRSxJQUFJLFFBQVEsR0FDUixTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQzlCLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUNoQyxDQUFBO0FBRUwsMEdBQTBHO0FBQzFHLDZDQUE2QztBQUM3QyxzRUFBc0U7QUFDdEUsUUFBUSxDQUFDLElBQUksQ0FDVCxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQztLQUM3QixRQUFRLENBQUM7SUFDTixRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUM7SUFDOUMsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLHdCQUF3QixFQUFFLENBQUMsRUFBRSxRQUFRLENBQUM7SUFDekQsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDO0NBQ2pELENBQUMsQ0FDTCxDQUFDO0FBRUYsaUdBQWlHO0FBQ2pHLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRzNELFFBQVEsQ0FBQyxjQUFjLEVBQUU7SUFDckIsRUFBRSxDQUFFLDRCQUE0QixFQUFFLFVBQVMsSUFBSTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxVQUFTLEtBQUs7WUFDakUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekIsSUFBSSxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiZGlzdC90ZXN0L3JlYWRtZV9vcmRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFRISVMgSVMgQVVUTyBHRU5FUkFURUQgVEVTVCBDT0RFLCBETyBOT1QgTU9ESUZZIERJUkVDVExZXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvc2hvdWxkLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL21vY2hhLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL25vZGUuZC50c1wiIC8+XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5yZXF1aXJlKFwic2hvdWxkXCIpO1xuXG4vKipcbiAqIEFuIElsbGlzdHJhdGlvbiBvZiB0aGUgb3JkZXIgb2Ygb3BlcmF0aW9ucyBvZlxuICAgQXguY3JlYXRlKCkgIC8vIGJlZ2luIGFuIG5ldyBhbmltYXRpb24gdHJlZVxuICAuc3Ryb2tlU3R5bGUoXCJncmVlblwiKSAvLyB0b3Agb2YgYW5pbWF0aW9uIHRyZWUgdGhlIHN0eWxlIGlzIHNldCB0byBncmVlblxuICAucGFycmFsbGVsKFtcbiAgICBBeC5jcmVhdGUoKS5zdHJva2UoKSAvLyBzdHJva2UgZ3JlZW4sIGRvd25zdHJlYW0gb2YgcGFycmFsbGVsXG4gICAgQXguY3JlYXRlKCkuc3Ryb2tlU3R5bGUoXCJyZWRcIikuc3Ryb2tlKCksIC8vc3Ryb2tlIHJlZFxuICAgIEF4LmNyZWF0ZSgpLnN0cm9rZSgpIC8vIHN0cm9rZSBncmVlbiwgbm90IGFmZmVjdGVkIGJ5IHJlZCBzaWJsaW5nXG4gIF0pXG4gIC5zdHJva2UoKSAvLyBzdHJva2UgZ3JlZW4sIGRvd25zdHJlYW0gb2YgcGFycmFsbGVsIHdoaWNoIGlzIGRvd25zdHJlYW0gb2YgdG9wXG5dKVxuICovXG5cblxuaW1wb3J0ICogYXMgUnggZnJvbSBcInJ4XCI7XG5pbXBvcnQgKiBhcyBBeCBmcm9tIFwiLi4vc3JjL2FuaW1heGVcIjtcbmltcG9ydCAqIGFzIGhlbHBlciBmcm9tIFwiLi4vc3JjL2hlbHBlclwiO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gXCIuLi9zcmMvZXZlbnRzXCI7XG5pbXBvcnQgKiBhcyBQYXJhbWV0ZXIgZnJvbSBcIi4uL3NyYy9QYXJhbWV0ZXJcIjtcblxudmFyIGFuaW1hdG9yOiBBeC5BbmltYXRvciA9IGhlbHBlci5nZXRFeGFtcGxlQW5pbWF0b3IoKTtcblxuZnVuY3Rpb24gZmxvd05vZGUoXG4gICAgcG9zOiBBeC5Qb2ludCwgXG4gICAgbGFiZWw6IHN0cmluZywgXG4gICAgaWQ6IG51bWJlciwgXG4gICAgYWN0aXZlOiBQYXJhbWV0ZXIuUGFyYW1ldGVyPG51bWJlcj4pOiBBeC5PcGVyYXRpb24geyAvL3dlIGNvdWxkIGJlIGNsZXZlciBhbmQgbGV0IHNwYXJrIHRha2UgYSBzZXEsIGJ1dCB1c2VyIGZ1bmN0aW9ucyBzaG91bGQgYmUgc2ltcGxlXG4gICAgcmV0dXJuIEF4LmNyZWF0ZSgpXG4gICAgICAgIC50cmFuc2xhdGUocG9zKVxuICAgICAgICAuZmlsbFRleHQobGFiZWwsIFswLDBdKVxuICAgICAgICBcbn1cbi8vZWFjaCBmcmFtZSwgZmlyc3QgZHJhdyBibGFjayBiYWNrZ3JvdW5kIHRvIGVyYXNlIHRoZSBwcmV2aW91cyBjb250ZW50c1xuYW5pbWF0b3IucGxheShBeC5jcmVhdGUoKS5maWxsU3R5bGUoXCIjMDAwMDAwXCIpLmZpbGxSZWN0KFswLDBdLFsxMDAsMTAwXSkpO1xuXG52YXIgdGltZWxpbmUgPSBcbiAgICBQYXJhbWV0ZXIuY29uc3RhbnQoMSkudGFrZSgxKS50aGVuKFxuICAgICAgICBQYXJhbWV0ZXIuY29uc3RhbnQoMSkudGFrZSgyKSAgICBcbiAgICApXG4gICAgXG4vLyBtb3ZlIHRoZSBkcmF3aW5nIGNvbnRleHQgZnJhbWUgb2YgcmVmZXJlbmNlIHRvIHRoZSBjZW50ZXIgKDUwLDUwKSBhbmQgdGhlbiBtb3ZlIGl0IGJ5IGEgK3ZlIHggdmVsb2NpdHksXG4vLyBzbyB0aGUgZnJhbWUgb2YgcmVmZXJlbmNlIG1vdmVzIG92ZXIgdGltZS5cbi8vIHRoZW4gZHJhdyBvdXIgMiBmcmFtZSBzcGFyayBhbmltYXRpb24gaW4gYSBsb29wIHNvIGl0IGRyYXdzIGZvcmV2ZXJcbmFuaW1hdG9yLnBsYXkoXG4gICAgQXguY3JlYXRlKCkuZmlsbFN0eWxlKFwid2hpdGVcIilcbiAgICAucGFyYWxsZWwoW1xuICAgICAgICBmbG93Tm9kZShbMTAsIDEwXSwgXCJBeC5jcmVhdGUoKVwiLCAwLCB0aW1lbGluZSksXG4gICAgICAgIGZsb3dOb2RlKFsyMCwgMjBdLCBcInN0cm9rZVN0eWxlKFxcXCJncmVlblxcXCIpXCIsIDAsIHRpbWVsaW5lKSxcbiAgICAgICAgZmxvd05vZGUoWzMwLCAzMF0sIFwicGFycmFsbGVsKFtcIiwgMCwgdGltZWxpbmUpLFxuICAgIF0pICAgXG4pO1xuXG4vLyB0aGUgaGVscGVyIGZ1bmN0aW9uIHBpcGVzIGluamVjdHMgdGhlIGNvbnRleHQsIGVpdGhlciBmcm9tIGEgd2ViIGNhbnZhcyBvciBhIGZha2Ugbm9kZS5qcyBvbmUuXG5oZWxwZXIucGxheUV4YW1wbGUoXCJyZWFkbWVfb3JkZXJcIiwgMjAsIGFuaW1hdG9yLCAxMDAsIDEwMCk7XG5cblxuZGVzY3JpYmUoJ3JlYWRtZV9vcmRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICBpdCAoJ3Nob3VsZCBtYXRjaCB0aGUgcmVmZXJlbmNlJywgZnVuY3Rpb24oZG9uZSkge1xuICAgICAgICBoZWxwZXIuc2FtZUV4YW1wbGUoXCJyZWFkbWVfb3JkZXJcIiwgXCJyZWFkbWVfb3JkZXItcmVmXCIsIGZ1bmN0aW9uKGVxdWFsKSB7XG4gICAgICAgICAgICBlcXVhbC5zaG91bGQuZXF1YWwodHJ1ZSk7XG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH0pXG4gICAgfSk7XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
