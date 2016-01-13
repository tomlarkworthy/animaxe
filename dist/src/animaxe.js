function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
var Rx = require("rx");
var events = require("./events");
var canvas = require("./canvas");
var types = require("./types");
__export(require("./types"));
__export(require("./canvas"));
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
        var tick = new canvas.Tick(this.t, dt, this.ctx, this.events);
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
    return new canvas.Operation(function (upstream) {
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
    return new canvas.Operation(function (upstream) {
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
function range(min, max, step) {
    if (step === void 0) { step = 1; }
    var n = (max - min) / step;
    var array = new Array(n);
    for (var value = 0, index = 0; value < max; value += step, index++) {
        array[index] = value;
    }
    types.assert(n === index);
    return array;
}
exports.range = range;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9hbmltYXhlLnRzIl0sIm5hbWVzIjpbIkFuaW1hdG9yIiwiQW5pbWF0b3IuY29uc3RydWN0b3IiLCJBbmltYXRvci50aWNrIiwiQW5pbWF0b3IudGlja2VyIiwiQW5pbWF0b3IucGxheSIsIkFuaW1hdG9yLm1vdXNlZG93biIsIkFuaW1hdG9yLm1vdXNldXAiLCJBbmltYXRvci5vbm1vdXNlbW92ZSIsIkFuaW1hdG9yLnJlZ2lzdGVyRXZlbnRzIiwiYXNzZXJ0RHQiLCJhc3NlcnRDbG9jayIsInJhbmdlIl0sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLElBQVksRUFBRSxXQUFNLElBQUksQ0FBQyxDQUFBO0FBQ3pCLElBQVksTUFBTSxXQUFNLFVBQVUsQ0FBQyxDQUFBO0FBRW5DLElBQVksTUFBTSxXQUFNLFVBQVUsQ0FBQyxDQUFBO0FBQ25DLElBQVksS0FBSyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBRWpDLGlCQUFjLFNBQVMsQ0FBQyxFQUFBO0FBSXhCLGlCQUFjLFVBQVUsQ0FBQyxFQUFBO0FBRXpCLE9BQU8sQ0FBQyxHQUFHLENBQUMsbURBQW1ELENBQUMsQ0FBQztBQUV0RCxhQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ2Qsb0JBQVksR0FBRyxLQUFLLENBQUM7QUFJaEM7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0g7SUFLSUEsa0JBQW1CQSxHQUE2QkE7UUFBN0JDLFFBQUdBLEdBQUhBLEdBQUdBLENBQTBCQTtRQUhoREEsTUFBQ0EsR0FBV0EsQ0FBQ0EsQ0FBQ0E7UUFDZEEsV0FBTUEsR0FBa0JBLElBQUlBLE1BQU1BLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBO1FBR3hDQSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxJQUFJQSxFQUFFQSxDQUFDQSxPQUFPQSxFQUFlQSxDQUFBQTtJQUM3Q0EsQ0FBQ0E7SUFDREQsdUJBQUlBLEdBQUpBLFVBQUtBLEVBQVVBO1FBQ1hFLEVBQUVBLENBQUNBLENBQUNBLGFBQUtBLENB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
