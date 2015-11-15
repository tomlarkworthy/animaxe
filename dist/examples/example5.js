var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
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
        _super.call(this, Ax.Empty
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
        var hotspot = Ax
            .withinPath(Ax
            .lineTo([40, 0])
            .lineTo([40, 20])
            .lineTo([0, 20])
            .lineTo([0, 0]));
        var button = new Button(hotspot, new events.ComponentMouseState(), Ax.fillStyle("red"), /* pressed */ Ax.fillStyle("orange"), /* over */ Ax.fillStyle("white")); /* idle */
        if (postprocessor)
            postprocessor(button);
        return button;
    };
    return Button;
})(Ax.Animation);
//each frame, first draw black background to erase the previous contents
animator.play(Ax.fillStyle("#000000").fillRect([0, 0], [100, 100]));
animator.play(Ax
    .translate([40, 40])
    .rotate(Math.PI / 4)
    .pipe(Button.rectangular(function (button) {
    button.mouseState.mousedown.subscribe(function (evt) { return console.log("Button: mousedown", evt.animationCoord); });
    button.mouseState.mouseup.subscribe(function (evt) { return console.log("Button: mouseup", evt.animationCoord); });
    button.mouseState.mousemove.subscribe(function (evt) { return console.log("Button: mousemove", evt.animationCoord); });
    button.mouseState.mouseenter.subscribe(function (evt) { return console.log("Button: mouseenter", evt.animationCoord); });
    button.mouseState.mouseleave.subscribe(function (evt) { return console.log("Button: mouseleave", evt.animationCoord); });
})));
helper.playExample("@name", 2, animator, 100, 100);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGVzL2V4YW1wbGU1LnRzIl0sIm5hbWVzIjpbIkJ1dHRvbiIsIkJ1dHRvbi5jb25zdHJ1Y3RvciIsIkJ1dHRvbi5yZWN0YW5ndWxhciJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFDQSxJQUFZLEVBQUUsV0FBTSxnQkFBZ0IsQ0FBQyxDQUFBO0FBQ3JDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBQ3hDLElBQVksTUFBTSxXQUFNLGVBQWUsQ0FBQyxDQUFBO0FBR3hDLElBQUksUUFBUSxHQUFnQixNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRWhFOztHQUVHO0FBQ0g7SUFBcUJBLDBCQUFZQTtJQXlCN0JBLGdCQUFtQkEsT0FBeUJBLEVBQUVBLHFDQUFxQ0E7UUFDaEVBLFVBQXNDQSxFQUFFQSxxQ0FBcUNBO1FBQ3BGQSxXQUF5QkEsRUFDekJBLFdBQXlCQSxFQUN6QkEsTUFBb0JBO1FBRTVCQyxtRUFBbUVBO1FBQ25FQSw2RkFBNkZBO1FBQzdGQSx1R0FBdUdBO1FBRXZHQSxrQkFBTUEsRUFBRUEsQ0FBQ0EsS0FBS0E7YUFDVEEsRUFBRUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsRUFBRUEsV0FBV0EsQ0FBQ0EsQ0FBR0Esc0RBQXNEQTthQUNsR0EsSUFBSUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsV0FBV0EsRUFBRUEsRUFBRUEsV0FBV0EsQ0FBQ0E7YUFDM0NBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBO2FBQ1pBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBO2FBQ2JBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLDBCQUEwQkEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsQ0FBQ0E7YUFDbkRBLElBQUlBLEVBQUVBO2FBQ05BLE1BQU1BLENBQUNBLENBQUNBO1FBakJFQSxZQUFPQSxHQUFQQSxPQUFPQSxDQUFrQkE7UUFDekJBLGVBQVVBLEdBQVZBLFVBQVVBLENBQTRCQTtRQWlCckRBLFVBQVVBLENBQUNBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBO0lBQzdCQSxDQUFDQTtJQTNDREQ7O09BRUdBO0lBQ0lBLGtCQUFXQSxHQUFsQkEsVUFBbUJBLGFBQWlDQTtRQUNoREUsSUFBSUEsT0FBT0EsR0FBR0EsRUFBRUE7YUFDWEEsVUFBVUEsQ0FBQ0EsRUFBRUE7YUFDVEEsTUFBTUEsQ0FBQ0EsQ0FBRUEsRUFBRUEsRUFBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7YUFDakJBLE1BQU1BLENBQUNBLENBQUVBLEVBQUVBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO2FBQ2pCQSxNQUFNQSxDQUFDQSxDQUFHQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxDQUFDQTthQUNqQkEsTUFBTUEsQ0FBQ0EsQ0FBR0EsQ0FBQ0EsRUFBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FDckJBLENBQUNBO1FBRU5BLElBQUlBLE1BQU1BLEdBQUdBLElBQUlBLE1BQU1BLENBQ25CQSxPQUFPQSxFQUNQQSxJQUFJQSxNQUFNQSxDQUFDQSxtQkFBbUJBLEVBQUVBLEVBQ2hDQSxFQUFFQSxDQUFDQSxTQUFTQSxDQUFDQSxLQUFLQSxDQUFDQSxFQUFLQSxhQUFhQSxDQUNyQ0EsRUFBRUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsUUFBUUEsQ0FBQ0EsRUFBRUEsVUFBVUEsQ0FDbENBLEVBQUVBLENBQUNBLFNBQVNBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBLENBQUNBLFVBQVVBO1FBRXRDQSxFQUFFQSxDQUFDQSxDQUFDQSxhQUFhQSxDQUFDQTtZQUFDQSxhQUFhQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtRQUV6Q0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0E7SUFDbEJBLENBQUNBO0lBc0JMRixhQUFDQTtBQUFEQSxDQTdDQSxBQTZDQ0EsRUE3Q29CLEVBQUUsQ0FBQyxTQUFTLEVBNkNoQztBQUVELHdFQUF3RTtBQUN4RSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBRyxFQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUVqRSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7S0FDWCxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDbkIsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUNwQixVQUFDLE1BQWM7SUFDUCxNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQ2pDLFVBQUMsR0FBd0IsSUFBSyxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFyRCxDQUFxRCxDQUFDLENBQUM7SUFDekYsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUMvQixVQUFDLEdBQXdCLElBQUssT0FBQSxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFLLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBckQsQ0FBcUQsQ0FBQyxDQUFDO0lBQ3pGLE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FDakMsVUFBQyxHQUF3QixJQUFLLE9BQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQXJELENBQXFELENBQUMsQ0FBQztJQUN6RixNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQ2xDLFVBQUMsR0FBd0IsSUFBSyxPQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFyRCxDQUFxRCxDQUFDLENBQUM7SUFDekYsTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUNsQyxVQUFDLEdBQXdCLElBQUssT0FBQSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBckQsQ0FBcUQsQ0FBQyxDQUFDO0FBQzdGLENBQUMsQ0FDSixDQUNKLENBQ0osQ0FBQztBQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDIiwiZmlsZSI6ImV4YW1wbGVzL2V4YW1wbGU1LmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
