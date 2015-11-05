/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/should.d.ts" />
var Ax = require("../src/animaxe");
var Rx = require("rx");
function getExampleAnimator(width, height) {
    if (width === void 0) { width = 100; }
    if (height === void 0) { height = 100; }
    try {
        // In a browser environment, find a canvas
        var canvas = document.getElementById("canvas");
        console.log("browser", canvas);
        var context = canvas.getContext('2d');
        require('ctx-get-transform-bugfix')(context); //monkey patch context to get transform tracking
        var animator = new Ax.Animator(context);
        animator.registerEvents(canvas);
        return animator;
    }
    catch (err) {
        console.log("error, so assuming we are in node environment", err);
        // in a node.js environment, load a fake canvas
        console.log(err);
        var Canvas = require('canvas');
        var canvas = new Canvas(width, height);
        console.log("node", canvas);
        var context = canvas.getContext('2d');
        require('ctx-get-transform-bugfix')(context); //monkey patch context to get transform tracking
        return new Ax.Animator(context);
    }
}
exports.getExampleAnimator = getExampleAnimator;
function playExample(name, frames, animator, width, height) {
    try {
        //browser
        var time;
        var render = function () {
            window.requestAnimationFrame(render);
            var now = new Date().getTime(), dt = now - (time || now);
            time = now;
            animator.tick(dt * 0.001);
        };
        render();
    }
    catch (err) {
        console.log("error, so assuming we are in node environment", err);
        //node.js
        animator.play(Ax.save(width, height, "images/" + name + ".gif"));
        animator.ticker(Rx.Observable.return(0.1).repeat(frames));
    }
}
exports.playExample = playExample;
function sameExample(name, ref, cb) {
    try {
        throw new Error("not implemented");
    }
    catch (err) {
        //node.js
        var cmp = require("file-compare");
        var file1 = "images/" + name + ".gif";
        var file2 = "images/" + ref + ".gif";
        return cmp.compare(file1, file2, cb);
    }
}
exports.sameExample = sameExample;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhlbHBlci50cyJdLCJuYW1lcyI6WyJnZXRFeGFtcGxlQW5pbWF0b3IiLCJwbGF5RXhhbXBsZSIsInNhbWVFeGFtcGxlIl0sIm1hcHBpbmdzIjoiQUFBQSwwREFBMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLDZDQUE2QztBQUU3QyxJQUFPLEVBQUUsV0FBVyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3RDLElBQU8sRUFBRSxXQUFXLElBQUksQ0FBQyxDQUFDO0FBRTFCLDRCQUFtQyxLQUFtQixFQUFFLE1BQW9CO0lBQXpDQSxxQkFBbUJBLEdBQW5CQSxXQUFtQkE7SUFBRUEsc0JBQW9CQSxHQUFwQkEsWUFBb0JBO0lBQ3hFQSxJQUFJQSxDQUFDQTtRQUNEQSwwQ0FBMENBO1FBQzFDQSxJQUFJQSxNQUFNQSxHQUFPQSxRQUFRQSxDQUFDQSxjQUFjQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtRQUNuREEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDL0JBLElBQUlBLE9BQU9BLEdBQTZCQSxNQUFNQSxDQUFDQSxVQUFVQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtRQUVoRUEsT0FBT0EsQ0FBQ0EsMEJBQTBCQSxDQUFDQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQSxnREFBZ0RBO1FBRTlGQSxJQUFJQSxRQUFRQSxHQUFJQSxJQUFJQSxFQUFFQSxDQUFDQSxRQUFRQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQTtRQUV6Q0EsUUFBUUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDaENBLE1BQU1BLENBQUNBLFFBQVFBLENBQUNBO0lBQ3BCQSxDQUFFQTtJQUFBQSxLQUFLQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNYQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSwrQ0FBK0NBLEVBQUVBLEdBQUdBLENBQUNBLENBQUNBO1FBQ2xFQSwrQ0FBK0NBO1FB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QkFBVyxjQVUxQixDQUFBIiwiZmlsZSI6ImhlbHBlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9ub2RlX21vZHVsZXMvcngvdHMvcnguYWxsLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL25vZGUuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvc2hvdWxkLmQudHNcIiAvPlxuXG5pbXBvcnQgQXggPSByZXF1aXJlKFwiLi4vc3JjL2FuaW1heGVcIik7XG5pbXBvcnQgUnggPSByZXF1aXJlKFwicnhcIik7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeGFtcGxlQW5pbWF0b3Iod2lkdGg6IG51bWJlciA9IDEwMCwgaGVpZ2h0OiBudW1iZXIgPSAxMDApOiBBeC5BbmltYXRvciB7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gSW4gYSBicm93c2VyIGVudmlyb25tZW50LCBmaW5kIGEgY2FudmFzXG4gICAgICAgIHZhciBjYW52YXM6YW55ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYW52YXNcIik7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYnJvd3NlclwiLCBjYW52YXMpO1xuICAgICAgICB2YXIgY29udGV4dDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgICAgICAgcmVxdWlyZSgnY3R4LWdldC10cmFuc2Zvcm0tYnVnZml4JykoY29udGV4dCk7IC8vbW9ua2V5IHBhdGNoIGNvbnRleHQgdG8gZ2V0IHRyYW5zZm9ybSB0cmFja2luZ1xuXG4gICAgICAgIHZhciBhbmltYXRvciA9ICBuZXcgQXguQW5pbWF0b3IoY29udGV4dCk7XG5cbiAgICAgICAgYW5pbWF0b3IucmVnaXN0ZXJFdmVudHMoY2FudmFzKTtcbiAgICAgICAgcmV0dXJuIGFuaW1hdG9yO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmxvZyhcImVycm9yLCBzbyBhc3N1bWluZyB3ZSBhcmUgaW4gbm9kZSBlbnZpcm9ubWVudFwiLCBlcnIpO1xuICAgICAgICAvLyBpbiBhIG5vZGUuanMgZW52aXJvbm1lbnQsIGxvYWQgYSBmYWtlIGNhbnZhc1xuICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICB2YXIgQ2FudmFzID0gcmVxdWlyZSgnY2FudmFzJyk7XG4gICAgICAgIHZhciBjYW52YXMgPSBuZXcgQ2FudmFzKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb25zb2xlLmxvZyhcIm5vZGVcIiwgY2FudmFzKTtcblxuICAgICAgICB2YXIgY29udGV4dDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIHJlcXVpcmUoJ2N0eC1nZXQtdHJhbnNmb3JtLWJ1Z2ZpeCcpKGNvbnRleHQpOyAvL21vbmtleSBwYXRjaCBjb250ZXh0IHRvIGdldCB0cmFuc2Zvcm0gdHJhY2tpbmdcbiAgICAgICAgcmV0dXJuIG5ldyBBeC5BbmltYXRvcihjb250ZXh0KTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwbGF5RXhhbXBsZShuYW1lOiBzdHJpbmcsIGZyYW1lczogbnVtYmVyLCBhbmltYXRvcjogQXguQW5pbWF0b3IsIHdpZHRoID86IG51bWJlciwgaGVpZ2h0ID86IG51bWJlcikge1xuICAgIHRyeSB7XG4gICAgICAgIC8vYnJvd3NlclxuICAgICAgICB2YXIgdGltZTtcbiAgICAgICAgdmFyIHJlbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXIpO1xuICAgICAgICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICAgIGR0ID0gbm93IC0gKHRpbWUgfHwgbm93KTtcbiAgICAgICAgICAgIHRpbWUgPSBub3c7XG4gICAgICAgICAgICBhbmltYXRvci50aWNrKGR0KjAuMDAxKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVuZGVyKCk7XG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJlcnJvciwgc28gYXNzdW1pbmcgd2UgYXJlIGluIG5vZGUgZW52aXJvbm1lbnRcIiwgZXJyKTtcbiAgICAgICAgLy9ub2RlLmpzXG4gICAgICAgIGFuaW1hdG9yLnBsYXkoQXguc2F2ZSh3aWR0aCwgaGVpZ2h0LCBcImltYWdlcy9cIiArIG5hbWUgKyBcIi5naWZcIikpO1xuICAgICAgICBhbmltYXRvci50aWNrZXIoUnguT2JzZXJ2YWJsZS5yZXR1cm4oMC4xKS5yZXBlYXQoZnJhbWVzKSk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FtZUV4YW1wbGUobmFtZTogc3RyaW5nLCByZWY6IHN0cmluZywgY2I6IChib29sZWFuKSA9PiB2b2lkKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm90IGltcGxlbWVudGVkXCIpO1xuICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICAgIC8vbm9kZS5qc1xuICAgICAgICB2YXIgY21wID0gcmVxdWlyZShcImZpbGUtY29tcGFyZVwiKTtcbiAgICAgICAgdmFyIGZpbGUxID0gXCJpbWFnZXMvXCIgKyBuYW1lICsgXCIuZ2lmXCI7XG4gICAgICAgIHZhciBmaWxlMiA9IFwiaW1hZ2VzL1wiICsgcmVmICsgXCIuZ2lmXCI7XG4gICAgICAgIHJldHVybiBjbXAuY29tcGFyZShmaWxlMSwgZmlsZTIsIGNiKTtcbiAgICB9XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
