function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
var Rx = require("rx");
var events = require("./events");
var canvas = require("./CanvasAnimation");
__export(require("./types"));
__export(require("./CanvasAnimation"));
console.log("Animaxe, https://github.com/tomlarkworthy/animaxe");
exports.DEBUG = false;
exports.DEBUG_EVENTS = false;
/**
 * An animation is pipeline that modifies the drawing context found in an animation Tick. Animations can be chained
 * together to create a more complicated Animation. They are composeable,
 *
 * e.g. ```animation1 = Ax.translate([50, 50]).fillStyle("red").fillRect([0,0], [20,20])```
 * is one animation which has been formed from three subanimations.
 *
 * Animations have a lifecycle, they can be finite or infinite in length. You can start temporally compose animations
 * using ```anim1.then(anim2)```, which creates a new animation that plays animation 2 when animation 1 finishes.
 *
 * When an animation is sequenced into the animation pipeline. Its attach method is called which atcually builds the
 * RxJS pipeline. Thus an animation is not live, but really a factory for a RxJS configuration.
 */
var Animator = (function () {
    function Animator(ctx) {
        this.ctx = ctx;
        this.t = 0;
        this.events = new events.Events();
        this.root = new Rx.Subject();
    }
    Animator.prototype.tick = function (dt) {
        if (exports.DEBUG)
            console.log("animator: tick", dt);
        var tick = new canvas.CanvasTick(this.t, dt, this.ctx, this.events);
        this.t += dt;
        var savedTick = tick.save();
        this.root.onNext(savedTick);
        savedTick.restore();
        this.events.clear();
    };
    Animator.prototype.ticker = function (dts) {
        // todo this is a bit yuck
        dts.subscribe(this.tick.bind(this), this.root.onError.bind(this.root), this.root.onCompleted.bind(this.root));
    };
    // todo: play is really pain, it needs canvas chainables so it can inject and wipe the canvase state through the animation chain
    // maybe we should also include a more base
    Animator.prototype.play = function (animation) {
        var self = this;
        if (exports.DEBUG)
            console.log("animator: play animation");
        var rootWithStateRefresh = this.root.map(function (tick) {
            if (exports.DEBUG)
                console.log("animator: ctx refresh");
            return tick.restore().save();
        });
        return animation
            .attach(rootWithStateRefresh)
            .subscribe();
    };
    Animator.prototype.mousedown = function (x, y) {
        if (exports.DEBUG_EVENTS)
            console.log("Animator: mousedown", x, y);
        this.events.mousedowns.push([x, y]);
    };
    Animator.prototype.mouseup = function (x, y) {
        if (exports.DEBUG_EVENTS)
            console.log("Animator: mouseup", x, y);
        this.events.mouseups.push([x, y]);
    };
    Animator.prototype.onmousemove = function (x, y) {
        if (exports.DEBUG_EVENTS)
            console.log("Animator: mousemoved", x, y);
        this.events.mousemoves.push([x, y]);
    };
    /**
     * Attaches listener for a canvas which will be propogated during ticks to animators that take input, e.g. UI
     */
    Animator.prototype.registerEvents = function (canvas) {
        var self = this;
        var rect = canvas.getBoundingClientRect(); // you have to correct for padding, todo this might get stale
        canvas.onmousedown = function (evt) { return self.mousedown(evt.clientX - rect.left, evt.clientY - rect.top); };
        canvas.onmouseup = function (evt) { return self.mouseup(evt.clientX - rect.left, evt.clientY - rect.top); };
        canvas.onmousemove = function (evt) { return self.onmousemove(evt.clientX - rect.left, evt.clientY - rect.top); };
    };
    return Animator;
})();
exports.Animator = Animator;
/**
 * NOTE: currently fails if the streams are different lengths
 * @param expectedDt the expected clock tick values
 * @param after
 * @returns {Animation}
 */
function assertDt(expectedDt) {
    return new canvas.Animation(function (upstream) {
        return upstream.zip(expectedDt, function (tick, expectedDtValue) {
            if (tick.dt != expectedDtValue)
                throw new Error("unexpected dt observed: " + tick.dt + ", expected:" + expectedDtValue);
            return tick;
        });
    });
}
exports.assertDt = assertDt;
//todo would be nice if this took an iterable or some other type of simple pull stream
// and used streamEquals
function assertClock(assertClock) {
    var index = 0;
    return new canvas.Animation(function (upstream) {
        return upstream.tapOnNext(function (tick) {
            if (exports.DEBUG)
                console.log("assertClock: ", tick);
            if (tick.clock < assertClock[index] - 0.00001 || tick.clock > assertClock[index] + 0.00001) {
                var errorMsg = "unexpected clock observed: " + tick.clock + ", expected:" + assertClock[index];
                console.log(errorMsg);
                throw new Error(errorMsg);
            }
            index++;
        });
    });
}
exports.assertClock = assertClock;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hbmltYXhlLnRzIl0sIm5hbWVzIjpbIkFuaW1hdG9yIiwiQW5pbWF0b3IuY29uc3RydWN0b3IiLCJBbmltYXRvci50aWNrIiwiQW5pbWF0b3IudGlja2VyIiwiQW5pbWF0b3IucGxheSIsIkFuaW1hdG9yLm1vdXNlZG93biIsIkFuaW1hdG9yLm1vdXNldXAiLCJBbmltYXRvci5vbm1vdXNlbW92ZSIsIkFuaW1hdG9yLnJlZ2lzdGVyRXZlbnRzIiwiYXNzZXJ0RHQiLCJhc3NlcnRDbG9jayJdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQTBEO0FBQzFELDJDQUEyQztBQUMzQyxJQUFZLEVBQUUsV0FBTSxJQUFJLENBQUMsQ0FBQTtBQUN6QixJQUFZLE1BQU0sV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUVuQyxJQUFZLE1BQU0sV0FBTSxtQkFBbUIsQ0FBQyxDQUFBO0FBRzVDLGlCQUFjLFNBQVMsQ0FBQyxFQUFBO0FBSXhCLGlCQUFjLG1CQUFtQixDQUFDLEVBQUE7QUFFbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO0FBRXRELGFBQUssR0FBRyxLQUFLLENBQUM7QUFDZCxvQkFBWSxHQUFHLEtBQUssQ0FBQztBQUloQzs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSDtJQUtJQSxrQkFBbUJBLEdBQTZCQTtRQUE3QkMsUUFBR0EsR0FBSEEsR0FBR0EsQ0FBMEJBO1FBSGhEQSxNQUFDQSxHQUFXQSxDQUFDQSxDQUFDQTtRQUNkQSxXQUFNQSxHQUFrQkEsSUFBSUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7UUFHeENBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLElBQUlBLEVBQUVBLENBQUNBLE9BQU9BLEVBQXFCQSxDQUFBQTtJQUNuREEsQ0FBQ0E7SUFDREQsdUJBQUlBLEdBQUpBLFVBQUtBLEVBQVVBO1FBQ1hFLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGdCQUFn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Q0EsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsR0FBR0EsQ0FBQ0EsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBakVBLENBQWlFQSxDQUFDQTtJQUNwR0EsQ0FBQ0E7SUFDTFIsZUFBQ0E7QUFBREEsQ0FqRUEsQUFpRUNBLElBQUE7QUFqRVksZ0JBQVEsV0FpRXBCLENBQUE7QUFFRDs7Ozs7R0FLRztBQUNILGtCQUF5QixVQUFpQztJQUN0RFMsTUFBTUEsQ0FBQ0EsSUFBSUEsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsVUFBU0EsUUFBUUE7UUFDekMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLFVBQVMsSUFBdUIsRUFBRSxlQUF1QjtZQUNyRixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLGVBQWUsQ0FBQztnQkFBQyxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsYUFBYSxHQUFHLGVBQWUsQ0FBQyxDQUFDO1lBQ3hILE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUNBLENBQUNBO0FBQ1BBLENBQUNBO0FBUGUsZ0JBQVEsV0FPdkIsQ0FBQTtBQUVELHNGQUFzRjtBQUN0Rix3QkFBd0I7QUFDeEIscUJBQTRCLFdBQXFCO0lBQzdDQyxJQUFJQSxLQUFLQSxHQUFHQSxDQUFDQSxDQUFDQTtJQUVkQSxNQUFNQSxDQUFDQSxJQUFJQSxNQUFNQSxDQUFDQSxTQUFTQSxDQUFDQSxVQUFTQSxRQUFRQTtRQUN6QyxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxVQUFTLElBQXVCO1lBQ3RELEVBQUUsQ0FBQyxDQUFDLGFBQUssQ0FBQztnQkFBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5QyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxPQUFPLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDekYsSUFBSSxRQUFRLEdBQUcsNkJBQTZCLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxhQUFhLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUM5RixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlCLENBQUM7WUFDRCxLQUFLLEVBQUcsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDQSxDQUFDQTtBQUNQQSxDQUFDQTtBQWRlLG1CQUFXLGNBYzFCLENBQUEiLCJmaWxlIjoic3JjL2FuaW1heGUuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
