/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
var Ax = require("../src/animaxe");
var helper = require("./helper");
require("should");
var animator = helper.getExampleAnimator();
//2 frame animated glow
function spark(css_color) {
    var css = Ax.toStreamColor(css_color);
    return Ax.take(1, Ax.draw(function () {
        var css_next = css.init();
        return function (tick) {
            console.log("spark: frame1", css_next(tick.clock));
            tick.ctx.fillStyle = css_next(tick.clock);
            tick.ctx.fillRect(-2, -2, 5, 5);
        };
    })).then(Ax.take(1, Ax.draw(function () {
        var css_next = css.init();
        return function (tick) {
            console.log("spark: frame2", css_next(tick.clock));
            tick.ctx.fillStyle = css_next(tick.clock);
            tick.ctx.fillRect(-1, -1, 3, 3);
        };
    })));
}
function sparkLong(css_color) {
    return Ax.draw(function () {
        return function (tick) {
            console.log("sparkLong", css_color);
            tick.ctx.fillStyle = css_color;
            tick.ctx.fillRect(-1, -1, 3, 3);
        };
    });
}
//large circle funcitons
var bigSin = Ax.sin(1).map(function (x) { return x * 40 + 50; });
var bigCos = Ax.cos(1).map(function (x) { return x * 40 + 50; });
var red = Ax.sin(2).map(function (x) { return x * 125 + 125; });
var green = Ax.sin(2).map(function (x) { return x * 55 + 200; });
animator.play(Ax.changeColor("#000000", Ax.rect([0, 0], [100, 100]))); //draw black background
animator.play(Ax.loop(Ax.move(Ax.point(bigSin, bigCos), spark(Ax.color(red, green, 0, 0.5))))); //spinning spark forever
animator.play(Ax.move([50, 50], Ax.velocity([50, 0], Ax.loop(spark("#FFFFFF"))))); //constant move
animator.play(Ax.tween_linear([50, 50], Ax.point(bigSin, bigCos), 1, Ax.loop(spark("red")))); //spiral 1 second
helper.playExample("example1", 20, animator);
describe('example1', function () {
    it('should match the reference', function (done) {
        helper.sameExample("example1", "ref1", function (same) {
            same.should.equal(true);
            done();
        });
    });
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV4YW1wbGUxLnRzIl0sIm5hbWVzIjpbInNwYXJrIiwic3BhcmtMb25nIl0sIm1hcHBpbmdzIjoiQUFBQSxBQUlBLDBEQUowRDtBQUMxRCw2Q0FBNkM7QUFDN0MsNENBQTRDO0FBQzVDLDJDQUEyQztBQUMzQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUN4QyxJQUFPLEVBQUUsV0FBVyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRXRDLElBQU8sTUFBTSxXQUFXLFVBQVUsQ0FBQyxDQUFDO0FBRXBDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUVsQixJQUFJLFFBQVEsR0FBZ0IsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUM7QUFFeEQsQUFDQSx1QkFEdUI7ZUFDUixTQUFrQztJQUM3Q0EsSUFBSUEsR0FBR0EsR0FBR0EsRUFBRUEsQ0FBQ0EsYUFBYUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7SUFDdENBLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLEVBQUVBLEVBQUVBLENBQUNBLElBQUlBLENBQ3JCQTtRQUNJQSxJQUFJQSxRQUFRQSxHQUFHQSxHQUFHQSxDQUFDQSxJQUFJQSxFQUFFQSxDQUFDQTtRQUMxQkEsTUFBTUEsQ0FBQ0EsVUFBU0EsSUFBaUJBO1lBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxDQUFDLENBQUFBO0lBQ0xBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLENBQ1JBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLEVBQUVBLEVBQUVBLENBQUNBLElBQUlBLENBQ2RBO1FBQ0lBLElBQUlBLFFBQVFBLEdBQUdBLEdBQUdBLENBQUNBLElBQUlBLEVBQUVBLENBQUNBO1FBQzFCQSxNQUFNQSxDQUFDQSxVQUFTQSxJQUFpQkE7WUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsQ0FDSkEsQ0FBQ0EsQ0FDTEEsQ0FBQ0E7QUFDTkEsQ0FBQ0E7QUFFRCxtQkFBbUIsU0FBaUI7SUFDaENDLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLElBQUlBLENBQ1ZBO1FBQ0lBLE1BQU1BLENBQUNBLFVBQVNBLElBQWlCQTtZQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNwQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7WUFDL0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLENBQUMsQ0FBQUE7SUFDTEEsQ0FBQ0EsQ0FDSkEsQ0FBQ0E7QUFDTkEsQ0FBQ0E7QUFFRCxBQUNBLHdCQUR3QjtJQUNwQixNQUFNLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBWCxDQUFXLENBQUMsQ0FBQztBQUM3QyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFYLENBQVcsQ0FBQyxDQUFDO0FBRTdDLElBQUksR0FBRyxHQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEVBQWIsQ0FBYSxDQUFDLENBQUM7QUFDOUMsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsRUFBWixDQUFZLENBQUMsQ0FBQztBQUU3QyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFHLEVBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsdUJBQXVCO0FBQzNGLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsd0JBQXdCO0FBQ3JILFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZTtBQUNoRyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLGlCQUFpQjtBQUc5RyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFFN0MsUUFBUSxDQUFDLFVBQVUsRUFBRTtJQUNqQixFQUFFLENBQUUsNEJBQTRCLEVBQUUsVUFBUyxJQUFJO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxVQUFTLElBQUk7WUFDaEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEIsSUFBSSxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQTtJQUNOLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoiZXhhbXBsZTEuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbm9kZV9tb2R1bGVzL3J4L3RzL3J4LmFsbC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9zaG91bGQuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbW9jaGEuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbmltcG9ydCBBeCA9IHJlcXVpcmUoXCIuLi9zcmMvYW5pbWF4ZVwiKTtcbmltcG9ydCBSeCA9IHJlcXVpcmUoXCJyeFwiKTtcbmltcG9ydCBoZWxwZXIgPSByZXF1aXJlKFwiLi9oZWxwZXJcIik7XG5pbXBvcnQgZnMgPSByZXF1aXJlKFwiZnNcIik7XG5yZXF1aXJlKFwic2hvdWxkXCIpO1xuXG52YXIgYW5pbWF0b3I6IEF4LkFuaW1hdG9yID0gaGVscGVyLmdldEV4YW1wbGVBbmltYXRvcigpO1xuXG4vLzIgZnJhbWUgYW5pbWF0ZWQgZ2xvd1xuZnVuY3Rpb24gc3BhcmsoY3NzX2NvbG9yOiBzdHJpbmcgfCBBeC5Db2xvclN0cmVhbSk6IEF4LkFuaW1hdGlvbiB7IC8vd2UgY291bGQgYmUgY2xldmVyIGFuZCBsZXQgc3BhcmsgdGFrZSBhIHNlcSwgYnV0IHVzZXIgZnVuY3Rpb25zIHNob3VsZCBiZSBzaW1wbGVcbiAgICB2YXIgY3NzID0gQXgudG9TdHJlYW1Db2xvcihjc3NfY29sb3IpO1xuICAgIHJldHVybiBBeC50YWtlKDEsIEF4LmRyYXcoXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIHZhciBjc3NfbmV4dCA9IGNzcy5pbml0KCk7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odGljazogQXguRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInNwYXJrOiBmcmFtZTFcIiwgY3NzX25leHQodGljay5jbG9jaykpO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxTdHlsZSA9IGNzc19uZXh0KHRpY2suY2xvY2spO1xuICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxSZWN0KC0yLC0yLDUsNSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pKS50aGVuKFxuICAgICAgICBBeC50YWtlKDEsIEF4LmRyYXcoXG4gICAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdmFyIGNzc19uZXh0ID0gY3NzLmluaXQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24odGljazogQXguRHJhd1RpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzcGFyazogZnJhbWUyXCIsIGNzc19uZXh0KHRpY2suY2xvY2spKTtcbiAgICAgICAgICAgICAgICAgICAgdGljay5jdHguZmlsbFN0eWxlID0gY3NzX25leHQodGljay5jbG9jayk7XG4gICAgICAgICAgICAgICAgICAgIHRpY2suY3R4LmZpbGxSZWN0KC0xLC0xLDMsMyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApKVxuICAgICk7XG59XG5cbmZ1bmN0aW9uIHNwYXJrTG9uZyhjc3NfY29sb3I6IHN0cmluZyk6IEF4LkFuaW1hdGlvbiB7IC8vd2UgY291bGQgYmUgY2xldmVyIGFuZCBsZXQgc3BhcmsgdGFrZSBhIHNlcSwgYnV0IHVzZXIgZnVuY3Rpb25zIHNob3VsZCBiZSBzaW1wbGVcbiAgICByZXR1cm4gQXguZHJhdyhcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKHRpY2s6IEF4LkRyYXdUaWNrKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJzcGFya0xvbmdcIiwgY3NzX2NvbG9yKTtcbiAgICAgICAgICAgICAgICB0aWNrLmN0eC5maWxsU3R5bGUgPSBjc3NfY29sb3I7XG4gICAgICAgICAgICAgICAgdGljay5jdHguZmlsbFJlY3QoLTEsLTEsMywzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59XG5cbi8vbGFyZ2UgY2lyY2xlIGZ1bmNpdG9uc1xudmFyIGJpZ1NpbiA9IEF4LnNpbigxKS5tYXAoeCA9PiB4ICogNDAgKyA1MCk7XG52YXIgYmlnQ29zID0gQXguY29zKDEpLm1hcCh4ID0+IHggKiA0MCArIDUwKTtcblxudmFyIHJlZCAgID0gQXguc2luKDIpLm1hcCh4ID0+IHggKiAxMjUgKyAxMjUpO1xudmFyIGdyZWVuID0gQXguc2luKDIpLm1hcCh4ID0+IHggKiA1NSArIDIwMCk7XG5cbmFuaW1hdG9yLnBsYXkoQXguY2hhbmdlQ29sb3IoXCIjMDAwMDAwXCIsIEF4LnJlY3QoWzAsMF0sWzEwMCwxMDBdKSkpOyAvL2RyYXcgYmxhY2sgYmFja2dyb3VuZFxuYW5pbWF0b3IucGxheShBeC5sb29wKEF4Lm1vdmUoQXgucG9pbnQoYmlnU2luLCBiaWdDb3MpLCBzcGFyayhBeC5jb2xvcihyZWQsZ3JlZW4sMCwwLjUpKSkpKTsgLy9zcGlubmluZyBzcGFyayBmb3JldmVyXG5hbmltYXRvci5wbGF5KEF4Lm1vdmUoWzUwLDUwXSwgQXgudmVsb2NpdHkoWzUwLDBdLCBBeC5sb29wKHNwYXJrKFwiI0ZGRkZGRlwiKSkpKSk7IC8vY29uc3RhbnQgbW92ZVxuYW5pbWF0b3IucGxheShBeC50d2Vlbl9saW5lYXIoWzUwLDUwXSwgQXgucG9pbnQoYmlnU2luLCBiaWdDb3MpLCAxLCBBeC5sb29wKHNwYXJrKFwicmVkXCIpKSkpOyAvL3NwaXJhbCAxIHNlY29uZFxuXG5cbmhlbHBlci5wbGF5RXhhbXBsZShcImV4YW1wbGUxXCIsIDIwLCBhbmltYXRvcik7XG5cbmRlc2NyaWJlKCdleGFtcGxlMScsIGZ1bmN0aW9uICgpIHtcbiAgICBpdCAoJ3Nob3VsZCBtYXRjaCB0aGUgcmVmZXJlbmNlJywgZnVuY3Rpb24oZG9uZSkge1xuICAgICAgICBoZWxwZXIuc2FtZUV4YW1wbGUoXCJleGFtcGxlMVwiLCBcInJlZjFcIiwgZnVuY3Rpb24oc2FtZSkge1xuICAgICAgICAgICAgc2FtZS5zaG91bGQuZXF1YWwodHJ1ZSk7XG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH0pXG4gICAgfSk7XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=