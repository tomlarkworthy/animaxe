// THIS IS AUTO GENERATED TEST CODE, DO NOT MODIFY DIRECTLY
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
require("should");
var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var animator = helper.getExampleAnimator();
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#FF0000").fillRect([0, 0], [100, 100]));
// the helper function pipes injects the context, either from a web canvas or a fake node.js one.
helper.playExample("example0", 1, animator, 100, 100);
describe('example0', function () {
    it('should match the reference', function (done) {
        helper.sameExample("example0", "example0-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMkRBQTJEO0FBQzNELDZDQUE2QztBQUM3Qyw0Q0FBNEM7QUFDNUMsMkNBQTJDO0FBQzNDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3hDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUdsQixJQUFZLEVBQUUsV0FBTSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3JDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBSXhDLElBQUksUUFBUSxHQUFnQixNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztBQUV4RCx3RUFBd0U7QUFDeEUsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUcsRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFMUUsaUdBQWlHO0FBQ2pHLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRXRELFFBQVEsQ0FBQyxVQUFVLEVBQUU7SUFDakIsRUFBRSxDQUFFLDRCQUE0QixFQUFFLFVBQVMsSUFBSTtRQUMzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsVUFBUyxLQUFLO1lBQ3pELEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLElBQUksRUFBRSxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUE7SUFDTixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDIiwiZmlsZSI6ImRpc3QvdGVzdC9leGFtcGxlMC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFRISVMgSVMgQVVUTyBHRU5FUkFURUQgVEVTVCBDT0RFLCBETyBOT1QgTU9ESUZZIERJUkVDVExZXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvc2hvdWxkLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL21vY2hhLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL25vZGUuZC50c1wiIC8+XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5yZXF1aXJlKFwic2hvdWxkXCIpO1xuXG5pbXBvcnQgKiBhcyBSeCBmcm9tIFwicnhcIjtcbmltcG9ydCAqIGFzIEF4IGZyb20gXCIuLi9zcmMvYW5pbWF4ZVwiO1xuaW1wb3J0ICogYXMgaGVscGVyIGZyb20gXCIuLi9zcmMvaGVscGVyXCI7XG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSBcIi4uL3NyYy9ldmVudHNcIjtcbmltcG9ydCAqIGFzIFBhcmFtZXRlciBmcm9tIFwiLi4vc3JjL1BhcmFtZXRlclwiO1xuXG52YXIgYW5pbWF0b3I6IEF4LkFuaW1hdG9yID0gaGVscGVyLmdldEV4YW1wbGVBbmltYXRvcigpO1xuXG4vL2VhY2ggZnJhbWUsIGZpcnN0IGRyYXcgYmxhY2sgYmFja2dyb3VuZCB0byBlcmFzZSB0aGUgcHJldmlvdXMgY29udGVudHNcbmFuaW1hdG9yLnBsYXkoQXguY3JlYXRlKCkuZmlsbFN0eWxlKFwiI0ZGMDAwMFwiKS5maWxsUmVjdChbMCwwXSxbMTAwLDEwMF0pKTtcblxuLy8gdGhlIGhlbHBlciBmdW5jdGlvbiBwaXBlcyBpbmplY3RzIHRoZSBjb250ZXh0LCBlaXRoZXIgZnJvbSBhIHdlYiBjYW52YXMgb3IgYSBmYWtlIG5vZGUuanMgb25lLlxuaGVscGVyLnBsYXlFeGFtcGxlKFwiZXhhbXBsZTBcIiwgMSwgYW5pbWF0b3IsIDEwMCwgMTAwKTtcblxuZGVzY3JpYmUoJ2V4YW1wbGUwJywgZnVuY3Rpb24gKCkge1xuICAgIGl0ICgnc2hvdWxkIG1hdGNoIHRoZSByZWZlcmVuY2UnLCBmdW5jdGlvbihkb25lKSB7XG4gICAgICAgIGhlbHBlci5zYW1lRXhhbXBsZShcImV4YW1wbGUwXCIsIFwiZXhhbXBsZTAtcmVmXCIsIGZ1bmN0aW9uKGVxdWFsKSB7XG4gICAgICAgICAgICBlcXVhbC5zaG91bGQuZXF1YWwodHJ1ZSk7XG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH0pXG4gICAgfSk7XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
