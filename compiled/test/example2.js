/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/should.d.ts" />
require('source-map-support').install();
var Ax = require("../src/animaxe");
var Rx = require("rx");
//create an animator, at 30FPS
try {
    var canvas = document.getElementById("canvas");
    console.log("browser", canvas);
}
catch (err) {
    console.log(err);
    var Canvas = require('canvas');
    var canvas = new Canvas(100, 100);
    console.log("node", canvas);
}
console.log("context", context);
var context = canvas.getContext('2d');
var animator = new Ax.Animator(context); /*should be based on context*/
function thickLine1tick(thickness, start, end, css_color) {
    //console.log("thickLine1tick: ", thickness, start, end, css_color);
    var css = Ax.toStreamColor(css_color);
    return Ax.take(1, Ax.draw(function (tick) {
        tick.ctx.strokeStyle = css.next(tick.clock);
        tick.ctx.beginPath();
        var startVal = start.next(tick.clock);
        var endVal = end.next(tick.clock);
        var ctx = tick.ctx;
        ctx.lineWidth = thickness;
        //console.log("thickLine1tick: drawing between ", tick.clock, startVal, endVal);
        ctx.moveTo(startVal[0], startVal[1]);
        ctx.lineTo(endVal[0], endVal[1]);
        ctx.closePath();
        ctx.stroke();
    }));
}
function sparkLine(start, end, css_color) {
    return thickLine1tick(6, start, end, css_color)
        .then(thickLine1tick(2, Ax.displaceT(-0.1, start), Ax.displaceT(-0.1, end), css_color))
        .then(thickLine1tick(1, Ax.displaceT(-0.2, start), Ax.displaceT(-0.2, end), css_color));
}
//large circle funcitons
var bigSin = Ax.sin(1).map(function (x) { return x * 40 + 50; });
var bigCos = Ax.cos(1).map(function (x) { return x * 40 + 50; });
var red = Ax.sin(2).map(function (x) { return x * 125 + 125; });
var green = Ax.sin(2).map(function (x) { return x * 55 + 200; });
animator.play(Ax.changeColor("#000000", Ax.rect([0, 0], [100, 100]))); //draw black background
animator.play(Ax.loop(Ax.assertClock([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], sparkLine(Ax.point(Ax.displaceT(-0.1, Ax.sin(1).map(function (x) { return x * 40 + 50; })), Ax.displaceT(-0.1, Ax.cos(1).map(function (x) { return x * 40 + 50; }))), Ax.point(Ax.sin(1).map(function (x) { return x * 40 + 50; }), Ax.cos(1).map(function (x) { return x * 40 + 50; })), Ax.color(red, green, 0, 0.5)))));
try {
    //browser
    var time;
    var render = function () {
        window.requestAnimationFrame(render);
        var now = new Date().getTime(), dt = now - (time || now);
        time = now;
        animator.root.onNext(new Ax.DrawTick(animator.ctx, 0, dt / 1000));
    };
    render();
}
catch (err) {
    //node.js
    animator.play(Ax.save(100, 100, "images/tutorial2.gif"));
    animator.ticker(Rx.Observable.return(0.1).repeat(10));
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUyLnRzIl0sIm5hbWVzIjpbInRoaWNrTGluZTF0aWNrIiwic3BhcmtMaW5lIl0sIm1hcHBpbmdzIjoiQUFBQSxBQUdBLDBEQUgwRDtBQUMxRCwyQ0FBMkM7QUFDM0MsNkNBQTZDO0FBQzdDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ3hDLElBQU8sRUFBRSxXQUFXLGdCQUFnQixDQUFDLENBQUM7QUFDdEMsSUFBTyxFQUFFLFdBQVcsSUFBSSxDQUFDLENBQUM7QUFFMUIsQUFDQSw4QkFEOEI7SUFDMUIsQ0FBQztJQUNELElBQUksTUFBTSxHQUFPLFFBQVEsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDbkMsQ0FBRTtBQUFBLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMvQixJQUFJLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ2hDLElBQUksT0FBTyxHQUE2QixNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRWhFLElBQUksUUFBUSxHQUFnQixJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsOEJBQUQsQUFBK0I7QUFHcEYsd0JBQ0ksU0FBaUIsRUFDakIsS0FBcUIsRUFDckIsR0FBbUIsRUFDbkIsU0FBa0M7SUFFbENBLEFBQ0FBLG9F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RyxFQUFFLEdBQUcsRUFBRSxFQUFYLENBQVcsQ0FBQyxDQUFDLEVBQ3BDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsR0FBRyxDQUFDLENBQzVCLENBQ0osQ0FDSixDQUNKLENBQUM7QUFFTixJQUFJLENBQUM7SUFDRCxBQUNBLFNBRFM7UUFDTCxJQUFJLENBQUM7SUFDVCxJQUFJLE1BQU0sR0FBRztRQUNULE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyQyxJQUFJLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUMxQixFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQzdCLElBQUksR0FBRyxHQUFHLENBQUM7UUFDWCxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDcEUsQ0FBQyxDQUFDO0lBQ0YsTUFBTSxFQUFFLENBQUM7QUFDYixDQUFFO0FBQUEsS0FBSyxDQUFBLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNWLEFBQ0EsU0FEUztJQUNULFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQztJQUN6RCxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzFELENBQUMiLCJmaWxlIjoiZXhhbXBsZTIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbm9kZV9tb2R1bGVzL3J4L3RzL3J4LmFsbC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9ub2RlLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL3Nob3VsZC5kLnRzXCIgLz5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbmltcG9ydCBBeCA9IHJlcXVpcmUoXCIuLi9zcmMvYW5pbWF4ZVwiKTtcbmltcG9ydCBSeCA9IHJlcXVpcmUoXCJyeFwiKTtcblxuLy9jcmVhdGUgYW4gYW5pbWF0b3IsIGF0IDMwRlBTXG50cnkge1xuICAgIHZhciBjYW52YXM6YW55ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYW52YXNcIik7XG4gICAgY29uc29sZS5sb2coXCJicm93c2VyXCIsIGNhbnZhcyk7XG59IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgIHZhciBDYW52YXMgPSByZXF1aXJlKCdjYW52YXMnKTtcbiAgICB2YXIgY2FudmFzID0gbmV3IENhbnZhcygxMDAsIDEwMCk7XG4gICAgY29uc29sZS5sb2coXCJub2RlXCIsIGNhbnZhcyk7XG59XG5cbmNvbnNvbGUubG9nKFwiY29udGV4dFwiLCBjb250ZXh0KTtcbnZhciBjb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxudmFyIGFuaW1hdG9yOiBBeC5BbmltYXRvciA9IG5ldyBBeC5BbmltYXRvcihjb250ZXh0KTsgLypzaG91bGQgYmUgYmFzZWQgb24gY29udGV4dCovXG5cblxuZnVuY3Rpb24gdGhpY2tMaW5lMXRpY2soXG4gICAgdGhpY2tuZXNzOiBudW1iZXIsXG4gICAgc3RhcnQ6IEF4LlBvaW50U3RyZWFtLFxuICAgIGVuZDogQXguUG9pbnRTdHJlYW0sXG4gICAgY3NzX2NvbG9yOiBzdHJpbmcgfCBBeC5Db2xvclN0cmVhbSlcbjogQXguQW5pbWF0aW9uIHtcbiAgICAvL2NvbnNvbGUubG9nKFwidGhpY2tMaW5lMXRpY2s6IFwiLCB0aGlja25lc3MsIHN0YXJ0LCBlbmQsIGNzc19jb2xvcik7XG4gICAgdmFyIGNzcyA9IEF4LnRvU3RyZWFtQ29sb3IoY3NzX2NvbG9yKTtcbiAgICByZXR1cm4gQXgudGFrZSgxLCBBeC5kcmF3KGZ1bmN0aW9uKHRpY2s6IEF4LkRyYXdUaWNrKSB7XG4gICAgICAgIHRpY2suY3R4LnN0cm9rZVN0eWxlID0gY3NzLm5leHQodGljay5jbG9jayk7XG4gICAgICAgIHRpY2suY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICB2YXIgc3RhcnRWYWwgPSBzdGFydC5uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICB2YXIgZW5kVmFsID0gZW5kLm5leHQodGljay5jbG9jayk7XG4gICAgICAgIHZhciBjdHggPSB0aWNrLmN0eDtcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IHRoaWNrbmVzcztcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcInRoaWNrTGluZTF0aWNrOiBkcmF3aW5nIGJldHdlZW4gXCIsIHRpY2suY2xvY2ssIHN0YXJ0VmFsLCBlbmRWYWwpO1xuICAgICAgICBjdHgubW92ZVRvKHN0YXJ0VmFsWzBdLCBzdGFydFZhbFsxXSk7XG4gICAgICAgIGN0eC5saW5lVG8oZW5kVmFsWzBdLCBlbmRWYWxbMV0pO1xuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICB9KSk7XG59XG5cbmZ1bmN0aW9uIHNwYXJrTGluZShzdGFydDogQXguUG9pbnRTdHJlYW0sIGVuZDogQXguUG9pbnRTdHJlYW0sIGNzc19jb2xvcjogc3RyaW5nIHwgQXguQ29sb3JTdHJlYW0pOiBBeC5BbmltYXRpb24geyAvL3dlIGNvdWxkIGJlIGNsZXZlciBhbmQgbGV0IHNwYXJrIHRha2UgYSBzZXEsIGJ1dCB1c2VyIGZ1bmN0aW9ucyBzaG91bGQgYmUgc2ltcGxlXG4gICAgcmV0dXJuIHRoaWNrTGluZTF0aWNrKDYsXG4gICAgICAgICAgICBzdGFydCxcbiAgICAgICAgICAgIGVuZCwgY3NzX2NvbG9yKVxuICAgICAgICAudGhlbih0aGlja0xpbmUxdGljaygyLFxuICAgICAgICAgICAgQXguZGlzcGxhY2VUKC0wLjEsIHN0YXJ0KSwgLy8gdG9kbywgdGhpcyBtZXRob2QgZG9lcyBub3QgZ2V0IGNhbGxlZCBldmVyeSByb3VuZFxuICAgICAgICAgICAgQXguZGlzcGxhY2VUKC0wLjEsIGVuZCksXG4gICAgICAgICAgICBjc3NfY29sb3IpKVxuICAgICAgICAudGhlbih0aGlja0xpbmUxdGljaygxLFxuICAgICAgICAgICAgQXguZGlzcGxhY2VUKC0wLjIsIHN0YXJ0KSxcbiAgICAgICAgICAgIEF4LmRpc3BsYWNlVCgtMC4yLCBlbmQpLFxuICAgICAgICAgICAgY3NzX2NvbG9yKSk7XG59XG5cbi8vbGFyZ2UgY2lyY2xlIGZ1bmNpdG9uc1xudmFyIGJpZ1NpbiA9IEF4LnNpbigxKS5tYXAoeCA9PiB4ICogNDAgKyA1MCk7XG52YXIgYmlnQ29zID0gQXguY29zKDEpLm1hcCh4ID0+IHggKiA0MCArIDUwKTtcblxudmFyIHJlZCAgID0gQXguc2luKDIpLm1hcCh4ID0+IHggKiAxMjUgKyAxMjUpO1xudmFyIGdyZWVuID0gQXguc2luKDIpLm1hcCh4ID0+IHggKiA1NSArIDIwMCk7XG5cblxuYW5pbWF0b3IucGxheShBeC5jaGFuZ2VDb2xvcihcIiMwMDAwMDBcIiwgQXgucmVjdChbMCwwXSxbMTAwLDEwMF0pKSk7IC8vZHJhdyBibGFjayBiYWNrZ3JvdW5kXG5hbmltYXRvci5wbGF5KFxuICAgICAgICBBeC5sb29wKFxuICAgICAgICAgICAgQXguYXNzZXJ0Q2xvY2soXG4gICAgICAgICAgICAgICAgWzAsIDAuMSwgMC4yLCAwLjMsIDAuNCwgMC41LCAwLjYsIDAuNywgMC44LCAwLjksIDFdLFxuICAgICAgICAgICAgICAgIHNwYXJrTGluZShcbiAgICAgICAgICAgICAgICAgICAgQXgucG9pbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICBBeC5kaXNwbGFjZVQoLTAuMSwgQXguc2luKDEpLm1hcCh4ID0+IHggKiA0MCArIDUwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICBBeC5kaXNwbGFjZVQoLTAuMSwgQXguY29zKDEpLm1hcCh4ID0+IHggKiA0MCArIDUwKSlcbiAgICAgICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICAgICAgQXgucG9pbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICBBeC5zaW4oMSkubWFwKHggPT4geCAqIDQwICsgNTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgQXguY29zKDEpLm1hcCh4ID0+IHggKiA0MCArIDUwKSksXG4gICAgICAgICAgICAgICAgICAgIEF4LmNvbG9yKHJlZCxncmVlbiwwLDAuNSlcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApXG4gICAgICAgIClcbiAgICApO1xuXG50cnkge1xuICAgIC8vYnJvd3NlclxuICAgIHZhciB0aW1lO1xuICAgIHZhciByZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXIpO1xuICAgICAgICB2YXIgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgICAgICAgICBkdCA9IG5vdyAtICh0aW1lIHx8IG5vdyk7XG4gICAgICAgIHRpbWUgPSBub3c7XG4gICAgICAgIGFuaW1hdG9yLnJvb3Qub25OZXh0KG5ldyBBeC5EcmF3VGljayhhbmltYXRvci5jdHgsIDAsIGR0LzEwMDApKTtcbiAgICB9O1xuICAgIHJlbmRlcigpO1xufSBjYXRjaChlcnIpIHtcbiAgICAvL25vZGUuanNcbiAgICBhbmltYXRvci5wbGF5KEF4LnNhdmUoMTAwLCAxMDAsIFwiaW1hZ2VzL3R1dG9yaWFsMi5naWZcIikpO1xuICAgIGFuaW1hdG9yLnRpY2tlcihSeC5PYnNlcnZhYmxlLnJldHVybigwLjEpLnJlcGVhdCgxMCkpO1xufVxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9