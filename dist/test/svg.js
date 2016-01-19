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



// Using http://anthonydugois.com/svg-path-builder/

animator.play(svg.svgpath(Ax.create().beginPath().strokeStyle("yellow").scale([0.5, 0.5]),
  'M150 100 A50 50 0 1 0 0 100 C0 200 150 100 150 200 A50 50 0 1 1 0 200').stroke()
);
*/
animator.play(svg.svgpath(Ax.create().beginPath().strokeStyle("yellow"), 'M25 50 A30 30 0 1 0 75 50').stroke());
helper.playExample("svg", 1, animator, 100, 100);
describe('svg', function () {
    it('should match the reference', function (done) {
        helper.sameExample("svg", "svg-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMkRBQTJEO0FBQzNELDZDQUE2QztBQUM3Qyw0Q0FBNEM7QUFDNUMsMkNBQTJDO0FBQzNDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3hDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUdsQixJQUFZLEVBQUUsV0FBTSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3JDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBR3hDLElBQVksR0FBRyxXQUFNLFlBQVksQ0FBQyxDQUFBO0FBRWxDLElBQUksUUFBUSxHQUFnQixNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRWhFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQTBCRTtBQUNGLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUNyRSwyQkFBMkIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUN0QyxDQUFDO0FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFFakQsUUFBUSxDQUFDLEtBQUssRUFBRTtJQUNaLEVBQUUsQ0FBRSw0QkFBNEIsRUFBRSxVQUFTLElBQUk7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFVBQVMsS0FBSztZQUMvQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixJQUFJLEVBQUUsQ0FBQztRQUNYLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJkaXN0L3Rlc3Qvc3ZnLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVEhJUyBJUyBBVVRPIEdFTkVSQVRFRCBURVNUIENPREUsIERPIE5PVCBNT0RJRlkgRElSRUNUTFlcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9zaG91bGQuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbW9jaGEuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbnJlcXVpcmUoXCJzaG91bGRcIik7XG5cbmltcG9ydCAqIGFzIFJ4IGZyb20gXCJyeFwiO1xuaW1wb3J0ICogYXMgQXggZnJvbSBcIi4uL3NyYy9hbmltYXhlXCI7XG5pbXBvcnQgKiBhcyBoZWxwZXIgZnJvbSBcIi4uL3NyYy9oZWxwZXJcIjtcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tIFwiLi4vc3JjL2V2ZW50c1wiO1xuaW1wb3J0ICogYXMgUGFyYW1ldGVyIGZyb20gXCIuLi9zcmMvUGFyYW1ldGVyXCI7XG5pbXBvcnQgKiBhcyBzdmcgZnJvbSBcIi4uL3NyYy9zdmdcIjtcblxudmFyIGFuaW1hdG9yOiBBeC5BbmltYXRvciA9IGhlbHBlci5nZXRFeGFtcGxlQW5pbWF0b3IoMTAwLCAxMDApO1xuXG4vKlxuYW5pbWF0b3IucGxheShcbiAgICBzdmcuc3ZncGF0aChBeC5jcmVhdGUoKS5iZWdpblBhdGgoKS5zdHJva2VTdHlsZShcInJlZFwiKSwgXCJNMjUgMjUgTDc1IDI1IEw3NSA3NSBMMjUgNzUgWlwiKS5zdHJva2UoKSAgICBcbik7XG5cbi8vIHRvZG8gU1ZHIGFyZSBub3Qgb24gaW5kZXBlbmRhbnQgcGF0aHNcblxuLy8gQ2FuJ3QgZG8gcmVsYXRpdmUgbW9kZSAobG93ZXIgY2FzZSBsZXR0ZXIsIHNob3VkbCBiZSBpbiAybmQgY29sdW1uKVxuYW5pbWF0b3IucGxheShzdmcuc3ZncGF0aChBeC5jcmVhdGUoKS5iZWdpblBhdGgoKS5zdHJva2VTdHlsZShcImJsdWVcIiksXG4gICdNMyw3IDUtNiBMMSw3IDFlMi0uNCBNLTEwLDEwIEwxMCwwICAnICtcbi8vICAnVjI3IDg5IEgyMyAgICAgICAgICAgdjEwIGgxMCAgICAgICAgICAgICAnICtcbiAgJ0MzMyw0MyAzOCw0NyA0Myw0NyAgIEMwLDUgNSwxMCAxMCwxMCAgICAgJyArXG4vLyAgJ1M2Myw2NyA2Myw2NyAgICAgICAgIHMtMTAsMTAgMTAsMTAgICAgICAgJyArICBTbW9vdGggY3VydmVcbiAgJ1E1MCw1MCA3Myw1NyAgICAgICAgIFEyMCwtNSAwLC0xMCAgICAgICAgJ1xuLy8gICdUNzAsNDAgICAgICAgICAgICAgICB0MCwtMTUgICAgICAgICAgICAgICcgKyBTbW9vdGggcXVhZCBjdXJ2ZVxuLy8gICdBNSw1IDQ1IDEsMCA0MCwyMCAgICBBNSw1IDIwIDAsMSAtMTAtMTAgIFonKSByb3RhdGVkIGVsaXB0aWNhbCBjdXJ2ZVxuICApLnN0cm9rZSgpXG4pO1xuXG5cblxuLy8gVXNpbmcgaHR0cDovL2FudGhvbnlkdWdvaXMuY29tL3N2Zy1wYXRoLWJ1aWxkZXIvXG5cbmFuaW1hdG9yLnBsYXkoc3ZnLnN2Z3BhdGgoQXguY3JlYXRlKCkuYmVnaW5QYXRoKCkuc3Ryb2tlU3R5bGUoXCJ5ZWxsb3dcIikuc2NhbGUoWzAuNSwgMC41XSksXG4gICdNMTUwIDEwMCBBNTAgNTAgMCAxIDAgMCAxMDAgQzAgMjAwIDE1MCAxMDAgMTUwIDIwMCBBNTAgNTAgMCAxIDEgMCAyMDAnKS5zdHJva2UoKVxuKTtcbiovXG5hbmltYXRvci5wbGF5KHN2Zy5zdmdwYXRoKEF4LmNyZWF0ZSgpLmJlZ2luUGF0aCgpLnN0cm9rZVN0eWxlKFwieWVsbG93XCIpLFxuICAnTTI1IDUwIEEzMCAzMCAwIDEgMCA3NSA1MCcpLnN0cm9rZSgpXG4pO1xuIFxuaGVscGVyLnBsYXlFeGFtcGxlKFwic3ZnXCIsIDEsIGFuaW1hdG9yLCAxMDAsIDEwMCk7XG5cbmRlc2NyaWJlKCdzdmcnLCBmdW5jdGlvbiAoKSB7XG4gICAgaXQgKCdzaG91bGQgbWF0Y2ggdGhlIHJlZmVyZW5jZScsIGZ1bmN0aW9uKGRvbmUpIHtcbiAgICAgICAgaGVscGVyLnNhbWVFeGFtcGxlKFwic3ZnXCIsIFwic3ZnLXJlZlwiLCBmdW5jdGlvbihlcXVhbCkge1xuICAgICAgICAgICAgZXF1YWwuc2hvdWxkLmVxdWFsKHRydWUpO1xuICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9KVxuICAgIH0pO1xufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
