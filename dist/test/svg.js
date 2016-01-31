// THIS IS AUTO GENERATED TEST CODE, DO NOT MODIFY DIRECTLY
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
require("should");
var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var svg = require("../src/svg");
var animator = helper.getExampleAnimator(100, 100);
/*
animator.play(
    svg.svgpath(Ax.create().beginPath().strokeStyle("red"), "M25 25 L75 25 L75 75 L25 75 Z").stroke()
);

// todo SVG are not on independant paths

// Can't do relative mode (lower case letter, shoudl be in 2nd column)
animator.play(svg.svgpath(Ax.create().beginPath().strokeStyle("blue"),
  'M3,7 5-6 L1,7 1e2-.4 M-10,10 L10,0  ' +
//  'V27 89 H23           v10 h10             ' +
  'C33,43 38,47 43,47   C0,5 5,10 10,10     ' +
//  'S63,67 63,67         s-10,10 10,10       ' +  Smooth curve
  'Q50,50 73,57         Q20,-5 0,-10        '
//  'T70,40               t0,-15              ' + Smooth quad curve
//  'A5,5 45 1,0 40,20    A5,5 20 0,1 -10-10  Z') rotated eliptical curve
  ).stroke()
);

*/
// Using http://anthonydugois.com/svg-path-builder/
animator.play(svg.svgpath(Ax.create().beginPath().strokeStyle("yellow").scale([0.1, 0.1]), 'M350 300 A50 50 0 1 0 150 300' // TODO: fix scaling on undersized r values
).stroke());
helper.playExample("svg", 1, animator, 100, 100);
describe('svg', function () {
    it('should match the reference', function (done) {
        helper.sameExample("svg", "svg-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMkRBQTJEO0FBQzNELDZDQUE2QztBQUM3Qyw0Q0FBNEM7QUFDNUMsMkNBQTJDO0FBQzNDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3hDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUdsQixJQUFZLEVBQUUsV0FBTSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3JDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBR3hDLElBQVksR0FBRyxXQUFNLFlBQVksQ0FBQyxDQUFBO0FBRWxDLElBQUksUUFBUSxHQUFnQixNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRWhFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBbUJFO0FBRUYsbURBQW1EO0FBRW5ELFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUN2RiwrQkFBK0IsQ0FBQywyQ0FBMkM7Q0FDMUUsQ0FBQyxNQUFNLEVBQUUsQ0FDWCxDQUFDO0FBR0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFFakQsUUFBUSxDQUFDLEtBQUssRUFBRTtJQUNaLEVBQUUsQ0FBRSw0QkFBNEIsRUFBRSxVQUFTLElBQUk7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFVBQVMsS0FBSztZQUMvQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixJQUFJLEVBQUUsQ0FBQztRQUNYLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJkaXN0L3Rlc3Qvc3ZnLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVEhJUyBJUyBBVVRPIEdFTkVSQVRFRCBURVNUIENPREUsIERPIE5PVCBNT0RJRlkgRElSRUNUTFlcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9zaG91bGQuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbW9jaGEuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbnJlcXVpcmUoXCJzaG91bGRcIik7XG5cbmltcG9ydCAqIGFzIFJ4IGZyb20gXCJyeFwiO1xuaW1wb3J0ICogYXMgQXggZnJvbSBcIi4uL3NyYy9hbmltYXhlXCI7XG5pbXBvcnQgKiBhcyBoZWxwZXIgZnJvbSBcIi4uL3NyYy9oZWxwZXJcIjtcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tIFwiLi4vc3JjL2V2ZW50c1wiO1xuaW1wb3J0ICogYXMgUGFyYW1ldGVyIGZyb20gXCIuLi9zcmMvUGFyYW1ldGVyXCI7XG5pbXBvcnQgKiBhcyBzdmcgZnJvbSBcIi4uL3NyYy9zdmdcIjtcblxudmFyIGFuaW1hdG9yOiBBeC5BbmltYXRvciA9IGhlbHBlci5nZXRFeGFtcGxlQW5pbWF0b3IoMTAwLCAxMDApO1xuXG4vKlxuYW5pbWF0b3IucGxheShcbiAgICBzdmcuc3ZncGF0aChBeC5jcmVhdGUoKS5iZWdpblBhdGgoKS5zdHJva2VTdHlsZShcInJlZFwiKSwgXCJNMjUgMjUgTDc1IDI1IEw3NSA3NSBMMjUgNzUgWlwiKS5zdHJva2UoKSAgICBcbik7XG5cbi8vIHRvZG8gU1ZHIGFyZSBub3Qgb24gaW5kZXBlbmRhbnQgcGF0aHNcblxuLy8gQ2FuJ3QgZG8gcmVsYXRpdmUgbW9kZSAobG93ZXIgY2FzZSBsZXR0ZXIsIHNob3VkbCBiZSBpbiAybmQgY29sdW1uKVxuYW5pbWF0b3IucGxheShzdmcuc3ZncGF0aChBeC5jcmVhdGUoKS5iZWdpblBhdGgoKS5zdHJva2VTdHlsZShcImJsdWVcIiksXG4gICdNMyw3IDUtNiBMMSw3IDFlMi0uNCBNLTEwLDEwIEwxMCwwICAnICtcbi8vICAnVjI3IDg5IEgyMyAgICAgICAgICAgdjEwIGgxMCAgICAgICAgICAgICAnICtcbiAgJ0MzMyw0MyAzOCw0NyA0Myw0NyAgIEMwLDUgNSwxMCAxMCwxMCAgICAgJyArXG4vLyAgJ1M2Myw2NyA2Myw2NyAgICAgICAgIHMtMTAsMTAgMTAsMTAgICAgICAgJyArICBTbW9vdGggY3VydmVcbiAgJ1E1MCw1MCA3Myw1NyAgICAgICAgIFEyMCwtNSAwLC0xMCAgICAgICAgJ1xuLy8gICdUNzAsNDAgICAgICAgICAgICAgICB0MCwtMTUgICAgICAgICAgICAgICcgKyBTbW9vdGggcXVhZCBjdXJ2ZVxuLy8gICdBNSw1IDQ1IDEsMCA0MCwyMCAgICBBNSw1IDIwIDAsMSAtMTAtMTAgIFonKSByb3RhdGVkIGVsaXB0aWNhbCBjdXJ2ZVxuICApLnN0cm9rZSgpXG4pO1xuXG4qL1xuXG4vLyBVc2luZyBodHRwOi8vYW50aG9ueWR1Z29pcy5jb20vc3ZnLXBhdGgtYnVpbGRlci9cblxuYW5pbWF0b3IucGxheShzdmcuc3ZncGF0aChBeC5jcmVhdGUoKS5iZWdpblBhdGgoKS5zdHJva2VTdHlsZShcInllbGxvd1wiKS5zY2FsZShbMC4xLCAwLjFdKSxcbiAgJ00zNTAgMzAwIEE1MCA1MCAwIDEgMCAxNTAgMzAwJyAvLyBUT0RPOiBmaXggc2NhbGluZyBvbiB1bmRlcnNpemVkIHIgdmFsdWVzXG4gICkuc3Ryb2tlKClcbik7XG5cbiBcbmhlbHBlci5wbGF5RXhhbXBsZShcInN2Z1wiLCAxLCBhbmltYXRvciwgMTAwLCAxMDApO1xuXG5kZXNjcmliZSgnc3ZnJywgZnVuY3Rpb24gKCkge1xuICAgIGl0ICgnc2hvdWxkIG1hdGNoIHRoZSByZWZlcmVuY2UnLCBmdW5jdGlvbihkb25lKSB7XG4gICAgICAgIGhlbHBlci5zYW1lRXhhbXBsZShcInN2Z1wiLCBcInN2Zy1yZWZcIiwgZnVuY3Rpb24oZXF1YWwpIHtcbiAgICAgICAgICAgIGVxdWFsLnNob3VsZC5lcXVhbCh0cnVlKTtcbiAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgfSlcbiAgICB9KTtcbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
