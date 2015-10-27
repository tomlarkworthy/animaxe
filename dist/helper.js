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
    }
    catch (err) {
        // in a node.js environment, load a fake canvas
        console.log(err);
        var Canvas = require('canvas');
        var canvas = new Canvas(width, height);
        console.log("node", canvas);
    }
    var context = canvas.getContext('2d');
    return new Ax.Animator(context);
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
            animator.root.onNext(new Ax.DrawTick(animator.ctx, 0, dt * 0.001));
        };
        render();
    }
    catch (err) {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhlbHBlci50cyJdLCJuYW1lcyI6WyJnZXRFeGFtcGxlQW5pbWF0b3IiLCJwbGF5RXhhbXBsZSIsInNhbWVFeGFtcGxlIl0sIm1hcHBpbmdzIjoiQUFBQSwwREFBMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLDZDQUE2QztBQUU3QyxJQUFPLEVBQUUsV0FBVyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3RDLElBQU8sRUFBRSxXQUFXLElBQUksQ0FBQyxDQUFDO0FBRTFCLDRCQUFtQyxLQUFtQixFQUFFLE1BQW9CO0lBQXpDQSxxQkFBbUJBLEdBQW5CQSxXQUFtQkE7SUFBRUEsc0JBQW9CQSxHQUFwQkEsWUFBb0JBO0lBQ3hFQSxJQUFJQSxDQUFDQTtRQUNEQSwwQ0FBMENBO1FBQzFDQSxJQUFJQSxNQUFNQSxHQUFPQSxRQUFRQSxDQUFDQSxjQUFjQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtRQUNuREEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsU0FBU0EsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7SUFDbkNBLENBQUVBO0lBQUFBLEtBQUtBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1FBQ1hBLCtDQUErQ0E7UUFDL0NBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1FBQ2pCQSxJQUFJQSxNQUFNQSxHQUFHQSxPQUFPQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtRQUMvQkEsSUFBSUEsTUFBTUEsR0FBR0EsSUFBSUEsTUFBTUEsQ0FBQ0EsS0FBS0EsRUFBRUEsTUFBTUEsQ0FBQ0EsQ0FBQ0E7UUFDdkNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLE1BQU1BLEVBQUVBLE1BQU1BLENBQUNBLENBQUNBO0lBQ2hDQSxDQUFDQTtJQUVEQSxJQUFJQSxPQUFPQSxHQUE2QkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7SUFDaEVBLE1BQU1BLENBQUNBLElBQUlBLEVBQUVBLENBQUNBLFFBQVFBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBO0FBQ3BDQSxDQUFDQTtBQWZlLDBCQUFrQixxQkFlakMsQ0FBQTtBQUVELHFCQUE0QixJQUFZLEVBQUUsTUFBYyxFQUFFLFFBQXFCLEVBQUUsS0FBZSxFQUFFLE1BQWdCO0lBQzlHQyxJQUFJQSxDQUFDQTtRQUNEQSxTQUFTQTtRQUNUQSxJQUFJQSxJQUFJQSxDQUFDQTtRQUNUQSxJQUFJQSxNQUFNQSxHQUFHQTtZQUNULE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyQyxJQUFJLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUMxQixFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLElBQUksR0FBRyxHQUFHLENBQUM7WUFDWCxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDckUsQ0FBQyxDQUFDQTtRQUNGQSxNQUFNQSxFQUFFQSxDQUFDQTtJQUNiQSxDQUFFQTtJQUFBQSxLQUFLQSxDQUFBQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNWQSxTQUFTQTtRQUNUQSxRQUFRQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxLQUFLQSxFQUFFQSxNQUFNQSxFQUFFQSxTQUFTQSxHQUFHQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNqRUEsUUFBUUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7SUFDOURBLENBQUNBO0FBQ0xBLENBQUNBO0FBakJlLG1CQUFXLGNBaUIxQixDQUFBO0FBRUQscUJBQTRCLElBQVksRUFBRSxHQUFXLEVBQUUsRUFBcUI7SUFDeEVDLElBQUlBLENBQUNBO1FBQ0RBLE1BQU1BLElBQUlBLEtBQUtBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FBQ0E7SUFDdkNBLENBQUVBO0lBQUFBLEtBQUtBLENBQUFBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1FBQ1ZBLFNBQVNBO1FBQ1RBLElBQUlBLEdBQUdBLEdBQUdBLE9BQU9BLENBQUNBLGNBQWNBLENBQUNBLENBQUNBO1FBQ2xDQSxJQUFJQSxLQUFLQSxHQUFHQSxTQUFTQSxHQUFHQSxJQUFJQSxHQUFHQSxNQUFNQSxDQUFDQTtRQUN0Q0EsSUFBSUEsS0FBS0EsR0FBR0EsU0FBU0EsR0FBR0EsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0E7UUFDckNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLE9BQU9BLENBQUNBLEtBQUtBLEVBQUVBLEtBQUtBLEVBQUVBLEVBQUVBLENBQUNBLENBQUNBO0lBQ3pDQSxDQUFDQTtBQUNMQSxDQUFDQTtBQVZlLG1CQUFXLGNBVTFCLENBQUEiLCJmaWxlIjoiaGVscGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL25vZGVfbW9kdWxlcy9yeC90cy9yeC5hbGwuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9zaG91bGQuZC50c1wiIC8+XG5cbmltcG9ydCBBeCA9IHJlcXVpcmUoXCIuLi9zcmMvYW5pbWF4ZVwiKTtcbmltcG9ydCBSeCA9IHJlcXVpcmUoXCJyeFwiKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEV4YW1wbGVBbmltYXRvcih3aWR0aDogbnVtYmVyID0gMTAwLCBoZWlnaHQ6IG51bWJlciA9IDEwMCk6IEF4LkFuaW1hdG9yIHtcbiAgICB0cnkge1xuICAgICAgICAvLyBJbiBhIGJyb3dzZXIgZW52aXJvbm1lbnQsIGZpbmQgYSBjYW52YXNcbiAgICAgICAgdmFyIGNhbnZhczphbnkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhbnZhc1wiKTtcbiAgICAgICAgY29uc29sZS5sb2coXCJicm93c2VyXCIsIGNhbnZhcyk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIGluIGEgbm9kZS5qcyBlbnZpcm9ubWVudCwgbG9hZCBhIGZha2UgY2FudmFzXG4gICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4gICAgICAgIHZhciBDYW52YXMgPSByZXF1aXJlKCdjYW52YXMnKTtcbiAgICAgICAgdmFyIGNhbnZhcyA9IG5ldyBDYW52YXMod2lkdGgsIGhlaWdodCk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwibm9kZVwiLCBjYW52YXMpO1xuICAgIH1cblxuICAgIHZhciBjb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICByZXR1cm4gbmV3IEF4LkFuaW1hdG9yKGNvbnRleHQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGxheUV4YW1wbGUobmFtZTogc3RyaW5nLCBmcmFtZXM6IG51bWJlciwgYW5pbWF0b3I6IEF4LkFuaW1hdG9yLCB3aWR0aCA/OiBudW1iZXIsIGhlaWdodCA/OiBudW1iZXIpIHtcbiAgICB0cnkge1xuICAgICAgICAvL2Jyb3dzZXJcbiAgICAgICAgdmFyIHRpbWU7XG4gICAgICAgIHZhciByZW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVuZGVyKTtcbiAgICAgICAgICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgICBkdCA9IG5vdyAtICh0aW1lIHx8IG5vdyk7XG4gICAgICAgICAgICB0aW1lID0gbm93O1xuICAgICAgICAgICAgYW5pbWF0b3Iucm9vdC5vbk5leHQobmV3IEF4LkRyYXdUaWNrKGFuaW1hdG9yLmN0eCwgMCwgZHQqMC4wMDEpKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVuZGVyKCk7XG4gICAgfSBjYXRjaChlcnIpIHtcbiAgICAgICAgLy9ub2RlLmpzXG4gICAgICAgIGFuaW1hdG9yLnBsYXkoQXguc2F2ZSh3aWR0aCwgaGVpZ2h0LCBcImltYWdlcy9cIiArIG5hbWUgKyBcIi5naWZcIikpO1xuICAgICAgICBhbmltYXRvci50aWNrZXIoUnguT2JzZXJ2YWJsZS5yZXR1cm4oMC4xKS5yZXBlYXQoZnJhbWVzKSk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FtZUV4YW1wbGUobmFtZTogc3RyaW5nLCByZWY6IHN0cmluZywgY2I6IChib29sZWFuKSA9PiB2b2lkKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm90IGltcGxlbWVudGVkXCIpO1xuICAgIH0gY2F0Y2goZXJyKSB7XG4gICAgICAgIC8vbm9kZS5qc1xuICAgICAgICB2YXIgY21wID0gcmVxdWlyZShcImZpbGUtY29tcGFyZVwiKTtcbiAgICAgICAgdmFyIGZpbGUxID0gXCJpbWFnZXMvXCIgKyBuYW1lICsgXCIuZ2lmXCI7XG4gICAgICAgIHZhciBmaWxlMiA9IFwiaW1hZ2VzL1wiICsgcmVmICsgXCIuZ2lmXCI7XG4gICAgICAgIHJldHVybiBjbXAuY29tcGFyZShmaWxlMSwgZmlsZTIsIGNiKTtcbiAgICB9XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=