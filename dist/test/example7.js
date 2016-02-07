var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
// THIS IS AUTO GENERATED TEST CODE, DO NOT MODIFY DIRECTLY
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
require("should");
var Ax = require("../src/animaxe");
var helper = require("../src/helper");
var events = require("../src/events");
var animator = helper.getExampleAnimator(100, 100);
/**
 * A Button is an animation but with extra mouse state attached
 */
var Button = (function (_super) {
    __extends(Button, _super);
    function Button(hotspot, // Babel doesn't like public modifier
        mouseState, // Babel doesn't like public modifier
        onMouseDown, onMouseOver, onIdle) {
        // we build a grand animation pipeline either side of the hot spot,
        // then we use the total pipeline's attach function as the attach function for this animation
        // so the constructed Button exposes a richer API (e.g. state) than a basic animation normally wouldn't
        _super.call(this, Ax.create()
            .if(mouseState.isMouseDown(), onMouseDown) // Condition the animation played based on mouse state
            .elif(mouseState.isMouseOver(), onMouseOver)
            .else(onIdle)
            .pipe(hotspot)
            .pipe(events.ComponentMouseEventHandler(mouseState))
            .fill()
            .attach);
        this.hotspot = hotspot;
        this.mouseState = mouseState;
        mouseState.source = this;
    }
    /**
     * @param postprocessor hook to do things like attach listeners without breaking the animation chaining
     */
    Button.rectangular = function (postprocessor) {
        var hotspot = Ax.create()
            .withinPath(Ax.create()
            .lineTo([40, 0])
            .lineTo([40, 20])
            .lineTo([0, 20])
            .lineTo([0, 0]));
        var button = new Button(hotspot, new events.ComponentMouseState(), Ax.create().fillStyle("red"), /* pressed */ Ax.create().fillStyle("orange"), /* over */ Ax.create().fillStyle("white")); /* idle */
        if (postprocessor)
            postprocessor(button);
        return button;
    };
    return Button;
})(Ax.Operation);
//each frame, first draw black background to erase the previous contents
animator.play(Ax.create().fillStyle("#000000").fillRect([0, 0], [100, 100]));
animator.play(Ax.create()
    .translate([40, 40])
    .rotate(Math.PI / 4)
    .pipe(Button.rectangular(function (button) {
    button.mouseState.mousedown.subscribe(function (evt) { return console.log("Button: mousedown", evt.animationCoord); });
    button.mouseState.mouseup.subscribe(function (evt) { return console.log("Button: mouseup", evt.animationCoord); });
    button.mouseState.mousemove.subscribe(function (evt) { return console.log("Button: mousemove", evt.animationCoord); });
    button.mouseState.mouseenter.subscribe(function (evt) { return console.log("Button: mouseenter", evt.animationCoord); });
    button.mouseState.mouseleave.subscribe(function (evt) { return console.log("Button: mouseleave", evt.animationCoord); });
})));
helper.playExample("example7", 2, animator, 100, 100);
describe('example7', function () {
    it('should match the reference', function (done) {
        helper.sameExample("example7", "example7-ref", function (equal) {
            equal.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUudGVtcGxhdGUudHMiXSwibmFtZXMiOlsiQnV0dG9uIiwiQnV0dG9uLmNvbnN0cnVjdG9yIiwiQnV0dG9uLnJlY3Rhbmd1bGFyIl0sIm1hcHBpbmdzIjoiOzs7OztBQUFBLDJEQUEyRDtBQUMzRCw2Q0FBNkM7QUFDN0MsNENBQTRDO0FBQzVDLDJDQUEyQztBQUMzQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN4QyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFHbEIsSUFBWSxFQUFFLFdBQU0sZ0JBQWdCLENBQUMsQ0FBQTtBQUNyQyxJQUFZLE1BQU0sV0FBTSxlQUFlLENBQUMsQ0FBQTtBQUN4QyxJQUFZLE1BQU0sV0FBTSxlQUFlLENBQUMsQ0FBQTtBQUd4QyxJQUFJLFFBQVEsR0FBZ0IsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUVoRTs7R0FFRztBQUNIO0lBQXFCQSwwQkFBWUE7SUF5QjdCQSxnQkFBbUJBLE9BQXlCQSxFQUFFQSxxQ0FBcUNBO1FBQ2hFQSxVQUFzQ0EsRUFBRUEscUNBQXFDQTtRQUNwRkEsV0FBeUJBLEVBQ3pCQSxXQUF5QkEsRUFDekJBLE1BQW9CQTtRQUU1QkMsbUVBQW1FQTtRQUNuRUEsNkZBQTZGQTtRQUM3RkEsdUdBQXVHQTtRQUV2R0Esa0JBQU1BLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBO2FBQ1pBLEVBQUVBLENBQUNBLFVBQVVBLENBQUNBLFdBQVdBLEVBQUVBLEVBQUVBLFdBQVdBLENBQUNBLENBQUdBLHNEQUFzREE7YUFDbEdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLFdBQVdBLEVBQUVBLEVBQUVBLFdBQVdBLENBQUNBO2FBQzNDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQTthQUNaQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQTthQUNiQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSwwQkFBMEJBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBO2FBQ25EQSxJQUFJQSxFQUFFQTthQUNOQSxNQUFNQSxDQUFDQSxDQUFDQTtRQWpCRUEsWUFBT0EsR0FBUEEsT0FBT0EsQ0FBa0JBO1FBQ3pCQSxlQUFVQSxHQUFWQSxVQUFVQSxDQUE0QkE7UUFpQnJEQSxVQUFVQSxDQUFDQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQTtJQUM3QkEsQ0FBQ0E7SUEzQ0REOztPQUVHQTtJQUNJQSxrQkFBV0EsR0FBbEJBLFVBQW1CQSxhQUFpQ0E7UUFDaERFLElBQUlBLE9BQU9BLEdBQUdBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBO2FBQ3BCQSxVQUFVQSxDQUFDQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQTthQUNsQkEsTUFBTUEsQ0FBQ0EsQ0FBRUEsRUFBRUEsRUFBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7YUFDakJBLE1BQU1BLENBQUNBLENBQUVBLEVBQUVBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO2FBQ2pCQSxNQUFNQSxDQUFDQSxDQUFHQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTthQUNqQkEsTUFBTUEsQ0FBQ0EsQ0FBR0EsQ0FBQ0EsRUFBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FDckJBLENBQUNBO1FBRU5BLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLE1BQU1BLENBQ25CQSxPQUFPQSxFQUNQQSxJQUFJQSxNQUFNQSxDQUFDQSxtQkFBbUJBLEVBQUVBLEVBQ2hDQSxFQUFFQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQSxFQUFLQSxhQUFhQSxDQUM5Q0EsRUFBRUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsRUFBRUEsVUFBVUEsQ0FDM0NBLEVBQUVBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLFNBQVNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBLENBQUNBLFVBQVVBO1FBRS9DQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQTtZQUFDQSxhQUFhQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUV6Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7SUFDbEJBLENBQUNBO0lBc0JMRixhQUFDQTtBQUFEQSxDQTdDQSxBQTZDQ0EsRUE3Q29CLEVBQUUsQ0FBQyxTQUFTLEVBNkNoQztBQUVELHdFQUF3RTtBQUN4RSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxFQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUUxRSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUU7S0FDcEIsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ25CLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztLQUNuQixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FDcEIsVUFBQyxNQUFjO0lBQ1AsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUNqQyxVQUFDLEdBQXdCLElBQUssT0FBQSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBckQsQ0FBcUQsQ0FBQyxDQUFDO0lBQ3pGLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FDL0IsVUFBQyxHQUF3QixJQUFLLE9BQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBSyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQXJELENBQXFELENBQUMsQ0FBQztJQUN6RixNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQ2pDLFVBQUMsR0FBd0IsSUFBSyxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFyRCxDQUFxRCxDQUFDLENBQUM7SUFDekYsTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUNsQyxVQUFDLEdBQXdCLElBQUssT0FBQSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBckQsQ0FBcUQsQ0FBQyxDQUFDO0lBQ3pGLE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FDbEMsVUFBQyxHQUF3QixJQUFLLE9BQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQXJELENBQXFELENBQUMsQ0FBQztBQUM3RixDQUFDLENBQ0osQ0FDSixDQUNKLENBQUM7QUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUV0RCxRQUFRLENBQUMsVUFBVSxFQUFFO0lBQ2pCLEVBQUUsQ0FBRSw0QkFBNEIsRUFBRSxVQUFTLElBQUk7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLFVBQVMsS0FBSztZQUN6RCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixJQUFJLEVBQUUsQ0FBQztRQUNYLENBQUMsQ0FBQyxDQUFBO0lBQ04sQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsImZpbGUiOiJkaXN0L3Rlc3QvZXhhbXBsZTcuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUSElTIElTIEFVVE8gR0VORVJBVEVEIFRFU1QgQ09ERSwgRE8gTk9UIE1PRElGWSBESVJFQ1RMWVxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL3Nob3VsZC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9tb2NoYS5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9ub2RlLmQudHNcIiAvPlxucmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0JykuaW5zdGFsbCgpO1xucmVxdWlyZShcInNob3VsZFwiKTtcblxuaW1wb3J0ICogYXMgUnggZnJvbSBcInJ4XCI7XG5pbXBvcnQgKiBhcyBBeCBmcm9tIFwiLi4vc3JjL2FuaW1heGVcIjtcbmltcG9ydCAqIGFzIGhlbHBlciBmcm9tIFwiLi4vc3JjL2hlbHBlclwiO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gXCIuLi9zcmMvZXZlbnRzXCI7XG5pbXBvcnQgKiBhcyBQYXJhbWV0ZXIgZnJvbSBcIi4uL3NyYy9QYXJhbWV0ZXJcIjtcblxudmFyIGFuaW1hdG9yOiBBeC5BbmltYXRvciA9IGhlbHBlci5nZXRFeGFtcGxlQW5pbWF0b3IoMTAwLCAxMDApO1xuXG4vKipcbiAqIEEgQnV0dG9uIGlzIGFuIGFuaW1hdGlvbiBidXQgd2l0aCBleHRyYSBtb3VzZSBzdGF0ZSBhdHRhY2hlZFxuICovXG5jbGFzcyBCdXR0b24gZXh0ZW5kcyBBeC5PcGVyYXRpb24ge1xuICAgIC8qKlxuICAgICAqIEBwYXJhbSBwb3N0cHJvY2Vzc29yIGhvb2sgdG8gZG8gdGhpbmdzIGxpa2UgYXR0YWNoIGxpc3RlbmVycyB3aXRob3V0IGJyZWFraW5nIHRoZSBhbmltYXRpb24gY2hhaW5pbmdcbiAgICAgKi9cbiAgICBzdGF0aWMgcmVjdGFuZ3VsYXIocG9zdHByb2Nlc3NvciA/OiAoQnV0dG9uKSA9PiB2b2lkKTogQnV0dG9uIHsgLy8gbm90ZSBCYWJlbCBkb2Vzbid0IGxpa2UgdGhpcyB0eXBlXG4gICAgICAgIHZhciBob3RzcG90ID0gQXguY3JlYXRlKClcbiAgICAgICAgICAgIC53aXRoaW5QYXRoKEF4LmNyZWF0ZSgpXG4gICAgICAgICAgICAgICAgLmxpbmVUbyhbIDQwLCAgMF0pXG4gICAgICAgICAgICAgICAgLmxpbmVUbyhbIDQwLCAyMF0pXG4gICAgICAgICAgICAgICAgLmxpbmVUbyhbICAwLCAyMF0pXG4gICAgICAgICAgICAgICAgLmxpbmVUbyhbICAwLCAgMF0pXG4gICAgICAgICAgICApO1xuXG4gICAgICAgIHZhciBidXR0b24gPSBuZXcgQnV0dG9uKFxuICAgICAgICAgICAgaG90c3BvdCxcbiAgICAgICAgICAgIG5ldyBldmVudHMuQ29tcG9uZW50TW91c2VTdGF0ZSgpLFxuICAgICAgICAgICAgQXguY3JlYXRlKCkuZmlsbFN0eWxlKFwicmVkXCIpLCAgICAvKiBwcmVzc2VkICovXG4gICAgICAgICAgICBBeC5jcmVhdGUoKS5maWxsU3R5bGUoXCJvcmFuZ2VcIiksIC8qIG92ZXIgKi9cbiAgICAgICAgICAgIEF4LmNyZWF0ZSgpLmZpbGxTdHlsZShcIndoaXRlXCIpKTsgLyogaWRsZSAqL1xuXG4gICAgICAgIGlmIChwb3N0cHJvY2Vzc29yKSBwb3N0cHJvY2Vzc29yKGJ1dHRvbik7XG5cbiAgICAgICAgcmV0dXJuIGJ1dHRvbjtcbiAgICB9XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgaG90c3BvdDogQXguUGF0aEFuaW1hdGlvbiwgLy8gQmFiZWwgZG9lc24ndCBsaWtlIHB1YmxpYyBtb2RpZmllclxuICAgICAgICAgICAgICAgIHB1YmxpYyBtb3VzZVN0YXRlOiBldmVudHMuQ29tcG9uZW50TW91c2VTdGF0ZSwgLy8gQmFiZWwgZG9lc24ndCBsaWtlIHB1YmxpYyBtb2RpZmllclxuICAgICAgICAgICAgICAgIG9uTW91c2VEb3duOiBBeC5PcGVyYXRpb24sXG4gICAgICAgICAgICAgICAgb25Nb3VzZU92ZXI6IEF4Lk9wZXJhdGlvbixcbiAgICAgICAgICAgICAgICBvbklkbGU6IEF4Lk9wZXJhdGlvblxuICAgICkge1xuICAgICAgICAvLyB3ZSBidWlsZCBhIGdyYW5kIGFuaW1hdGlvbiBwaXBlbGluZSBlaXRoZXIgc2lkZSBvZiB0aGUgaG90IHNwb3QsXG4gICAgICAgIC8vIHRoZW4gd2UgdXNlIHRoZSB0b3RhbCBwaXBlbGluZSdzIGF0dGFjaCBmdW5jdGlvbiBhcyB0aGUgYXR0YWNoIGZ1bmN0aW9uIGZvciB0aGlzIGFuaW1hdGlvblxuICAgICAgICAvLyBzbyB0aGUgY29uc3RydWN0ZWQgQnV0dG9uIGV4cG9zZXMgYSByaWNoZXIgQVBJIChlLmcuIHN0YXRlKSB0aGFuIGEgYmFzaWMgYW5pbWF0aW9uIG5vcm1hbGx5IHdvdWxkbid0XG5cbiAgICAgICAgc3VwZXIoQXguY3JlYXRlKClcbiAgICAgICAgICAgIC5pZihtb3VzZVN0YXRlLmlzTW91c2VEb3duKCksIG9uTW91c2VEb3duKSAgIC8vIENvbmRpdGlvbiB0aGUgYW5pbWF0aW9uIHBsYXllZCBiYXNlZCBvbiBtb3VzZSBzdGF0ZVxuICAgICAgICAgICAgLmVsaWYobW91c2VTdGF0ZS5pc01vdXNlT3ZlcigpLCBvbk1vdXNlT3ZlcilcbiAgICAgICAgICAgIC5lbHNlKG9uSWRsZSlcbiAgICAgICAgICAgIC5waXBlKGhvdHNwb3QpXG4gICAgICAgICAgICAucGlwZShldmVudHMuQ29tcG9uZW50TW91c2VFdmVudEhhbmRsZXIobW91c2VTdGF0ZSkpXG4gICAgICAgICAgICAuZmlsbCgpXG4gICAgICAgICAgICAuYXR0YWNoKTtcbiAgICAgICAgbW91c2VTdGF0ZS5zb3VyY2UgPSB0aGlzO1xuICAgIH1cbn1cblxuLy9lYWNoIGZyYW1lLCBmaXJzdCBkcmF3IGJsYWNrIGJhY2tncm91bmQgdG8gZXJhc2UgdGhlIHByZXZpb3VzIGNvbnRlbnRzXG5hbmltYXRvci5wbGF5KEF4LmNyZWF0ZSgpLmZpbGxTdHlsZShcIiMwMDAwMDBcIikuZmlsbFJlY3QoWzAsMF0sWzEwMCwxMDBdKSk7XG5cbmFuaW1hdG9yLnBsYXkoQXguY3JlYXRlKClcbiAgICAudHJhbnNsYXRlKFs0MCwgNDBdKVxuICAgIC5yb3RhdGUoTWF0aC5QSSAvIDQpXG4gICAgLnBpcGUoQnV0dG9uLnJlY3Rhbmd1bGFyKFxuICAgICAgICAoYnV0dG9uOiBCdXR0b24pID0+IHtcbiAgICAgICAgICAgICAgICBidXR0b24ubW91c2VTdGF0ZS5tb3VzZWRvd24uc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICAoZXZ0OiBldmVudHMuQXhNb3VzZUV2ZW50KSA9PiBjb25zb2xlLmxvZyhcIkJ1dHRvbjogbW91c2Vkb3duXCIsICBldnQuYW5pbWF0aW9uQ29vcmQpKTtcbiAgICAgICAgICAgICAgICBidXR0b24ubW91c2VTdGF0ZS5tb3VzZXVwLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgKGV2dDogZXZlbnRzLkF4TW91c2VFdmVudCkgPT4gY29uc29sZS5sb2coXCJCdXR0b246IG1vdXNldXBcIiwgICAgZXZ0LmFuaW1hdGlvbkNvb3JkKSk7XG4gICAgICAgICAgICAgICAgYnV0dG9uLm1vdXNlU3RhdGUubW91c2Vtb3ZlLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgKGV2dDogZXZlbnRzLkF4TW91c2VFdmVudCkgPT4gY29uc29sZS5sb2coXCJCdXR0b246IG1vdXNlbW92ZVwiLCAgZXZ0LmFuaW1hdGlvbkNvb3JkKSk7XG4gICAgICAgICAgICAgICAgYnV0dG9uLm1vdXNlU3RhdGUubW91c2VlbnRlci5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgIChldnQ6IGV2ZW50cy5BeE1vdXNlRXZlbnQpID0+IGNvbnNvbGUubG9nKFwiQnV0dG9uOiBtb3VzZWVudGVyXCIsIGV2dC5hbmltYXRpb25Db29yZCkpO1xuICAgICAgICAgICAgICAgIGJ1dHRvbi5tb3VzZVN0YXRlLm1vdXNlbGVhdmUuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICAoZXZ0OiBldmVudHMuQXhNb3VzZUV2ZW50KSA9PiBjb25zb2xlLmxvZyhcIkJ1dHRvbjogbW91c2VsZWF2ZVwiLCBldnQuYW5pbWF0aW9uQ29vcmQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgIClcbik7XG5cbmhlbHBlci5wbGF5RXhhbXBsZShcImV4YW1wbGU3XCIsIDIsIGFuaW1hdG9yLCAxMDAsIDEwMCk7XG5cbmRlc2NyaWJlKCdleGFtcGxlNycsIGZ1bmN0aW9uICgpIHtcbiAgICBpdCAoJ3Nob3VsZCBtYXRjaCB0aGUgcmVmZXJlbmNlJywgZnVuY3Rpb24oZG9uZSkge1xuICAgICAgICBoZWxwZXIuc2FtZUV4YW1wbGUoXCJleGFtcGxlN1wiLCBcImV4YW1wbGU3LXJlZlwiLCBmdW5jdGlvbihlcXVhbCkge1xuICAgICAgICAgICAgZXF1YWwuc2hvdWxkLmVxdWFsKHRydWUpO1xuICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9KVxuICAgIH0pO1xufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
