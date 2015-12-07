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
exports.DEBUG = true;
exports.DEBUG_EVENTS = true;
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
        this.root.onNext(tick);
        this.events.clear();
    };
    Animator.prototype.ticker = function (dts) {
        // todo this is a bit yuck
        dts.subscribe(this.tick.bind(this), this.root.onError.bind(this.root), this.root.onCompleted.bind(this.root));
    };
    Animator.prototype.play = function (animation) {
        var self = this;
        var saved = false;
        if (exports.DEBUG)
            console.log("animator: play animation");
        var saveBeforeFrame = this.root.tapOnNext(function (tick) {
            if (exports.DEBUG)
                console.log("animator: ctx save");
            tick.ctx.save();
            saved = true;
        });
        return animation
            .attach(saveBeforeFrame) // todo, it be nicer if we could chain attach
            .tap(function (tick) {
            if (exports.DEBUG)
                console.log("animator: ctx next restore");
            if (saved) {
                self.ctx.restore();
                saved = false;
            }
        }, function (err) {
            if (exports.DEBUG)
                console.log("animator: ctx err restore", err);
            if (saved) {
                self.ctx.restore();
                saved = false;
            }
        }, function () {
            if (exports.DEBUG)
                console.log("animator: ctx complete restore");
            if (saved) {
                self.ctx.restore();
                saved = false;
            }
        }).subscribe();
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hbmltYXhlLnRzIl0sIm5hbWVzIjpbIkFuaW1hdG9yIiwiQW5pbWF0b3IuY29uc3RydWN0b3IiLCJBbmltYXRvci50aWNrIiwiQW5pbWF0b3IudGlja2VyIiwiQW5pbWF0b3IucGxheSIsIkFuaW1hdG9yLm1vdXNlZG93biIsIkFuaW1hdG9yLm1vdXNldXAiLCJBbmltYXRvci5vbm1vdXNlbW92ZSIsIkFuaW1hdG9yLnJlZ2lzdGVyRXZlbnRzIiwiYXNzZXJ0RHQiLCJhc3NlcnRDbG9jayJdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQTBEO0FBQzFELDJDQUEyQztBQUMzQyxJQUFZLEVBQUUsV0FBTSxJQUFJLENBQUMsQ0FBQTtBQUN6QixJQUFZLE1BQU0sV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUVuQyxJQUFZLE1BQU0sV0FBTSxtQkFBbUIsQ0FBQyxDQUFBO0FBRzVDLGlCQUFjLFNBQVMsQ0FBQyxFQUFBO0FBSXhCLGlCQUFjLG1CQUFtQixDQUFDLEVBQUE7QUFFbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO0FBRXRELGFBQUssR0FBRyxJQUFJLENBQUM7QUFDYixvQkFBWSxHQUFHLElBQUksQ0FBQztBQUkvQjs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSDtJQUtJQSxrQkFBbUJBLEdBQTZCQTtRQUE3QkMsUUFBR0EsR0FBSEEsR0FBR0EsQ0FBMEJBO1FBSGhEQSxNQUFDQSxHQUFXQSxDQUFDQSxDQUFDQTtRQUNkQSxXQUFNQSxHQUFrQkEsSUFBSUEsTUFBTUEsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0E7UUFHeENBLElBQUlBLENBQUNBLElBQUlBLEdBQUdBLElBQUlBLEVBQUVBLENBQUNBLE9BQU9BLEVBQXFCQSxDQUFBQTtJQUNuREEsQ0FBQ0E7SUFDREQsdUJBQUlBLEdBQUpBLFVBQUtBLEVBQVVBO1FBQ1hFLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENBQUNBO1lBQUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGdCQUFn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
