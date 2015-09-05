var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
var Rx = require("rx");
exports.DEBUG_LOOP = false;
exports.DEBUG_THEN = false;
var DrawTick = (function () {
    function DrawTick(ctx, dt) {
        this.ctx = ctx;
        this.dt = dt;
    }
    return DrawTick;
})();
exports.DrawTick = DrawTick;
function stackTrace() {
    var err = new Error();
    return err.stack;
}
var Iterable = (function () {
    // tried immutable.js but it only supports 2 dimensionable iterables
    function Iterable(_next) {
        this.next = _next;
    }
    Iterable.prototype.next = function () { throw new Error('This method is abstract'); };
    Iterable.prototype.map = function (fn) {
        var base = this;
        return new Iterable(function () {
            console.log("Iterable: next");
            //console.log(stackTrace());
            return fn(base.next());
        });
    };
    return Iterable;
})();
exports.Iterable = Iterable;
var Fixed = (function (_super) {
    __extends(Fixed, _super);
    function Fixed(val) {
        _super.call(this, function () {
            console.log("fixed", this.val);
            return this.val;
        });
        this.val = val;
    }
    return Fixed;
})(Iterable);
exports.Fixed = Fixed;
function toStreamNumber(x) {
    return typeof x === 'number' ? new Fixed(x) : x;
}
exports.toStreamNumber = toStreamNumber;
function toStreamPoint(x) {
    return (typeof x.next === 'function' ? x : new Fixed(x));
}
exports.toStreamPoint = toStreamPoint;
var Animation2 = (function () {
    function Animation2(_attach, after) {
        this._attach = _attach;
        this.after = after;
    }
    Animation2.prototype.attach = function (obs) {
        var processed = this._attach(obs);
        return this.after ? this.after.attach(processed) : processed;
    };
    /**
     * delivers events to this first, then when that animation is finished
     * the follower consumers events and the values are used as output, until the follower animation completes
     */
    Animation2.prototype.then = function (follower) {
        var self = this;
        return new Animation2(function (prev) {
            return Rx.Observable.create(function (observer) {
                var first = new Rx.Subject();
                var second = new Rx.Subject();
                var firstTurn = true;
                var current = first;
                if (exports.DEBUG_THEN)
                    console.log("then: attach");
                var firstAttach = self.attach(first.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: first to downstream");
                    observer.onNext(next);
                }, observer.onError.bind(observer), function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: first complete");
                    firstTurn = false;
                });
                var secondAttach = follower.attach(second.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: second to downstream");
                    observer.onNext(next);
                }, observer.onError.bind(observer), function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: second complete");
                    observer.onCompleted();
                });
                var prevSubscription = prev.subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: upstream to first OR second");
                    if (firstTurn) {
                        first.onNext(next);
                    }
                    else {
                        second.onNext(next);
                    }
                }, observer.onError, function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: upstream complete");
                    observer.onCompleted();
                });
                // on dispose
                return function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: disposer");
                    prevSubscription.dispose();
                    firstAttach.dispose();
                    secondAttach.dispose();
                };
            }).subscribeOn(Rx.Scheduler.immediate);
        });
    };
    return Animation2;
})();
exports.Animation2 = Animation2;
var Animator2 = (function () {
    function Animator2(ctx) {
        this.ctx = ctx;
        this.tickerSubscription = null;
        this.animationSubscriptions = [];
        this.t = 0;
        this.root = new Rx.Subject();
    }
    Animator2.prototype.ticker = function (tick) {
        var self = this;
        this.tickerSubscription = tick.map(function (dt) {
            self.t += dt;
            var tick = new DrawTick(self.ctx, dt);
            return tick;
        }).subscribe(this.root);
    };
    Animator2.prototype.play = function (animation) {
        var self = this;
        console.log("animator: play");
        var saveBeforeFrame = this.root.tapOnNext(function (tick) {
            console.log("animator: ctx save");
            tick.ctx.save();
        });
        var doAnimation = animation.attach(saveBeforeFrame);
        var restoreAfterFrame = doAnimation.tap(function (tick) {
            console.log("animator: ctx next restore");
            tick.ctx.restore();
        }, function (err) {
            console.log("animator: ctx err restore");
            self.ctx.restore();
        }, function () {
            self.ctx.restore();
        });
        this.animationSubscriptions.push(restoreAfterFrame.subscribe());
    };
    Animator2.prototype.clock = function () {
        var self = this;
        return new Iterable(function () { return self.t; });
    };
    return Animator2;
})();
exports.Animator2 = Animator2;
function point(x, y) {
    var x_stream = toStreamNumber(x);
    var y_stream = toStreamNumber(y);
    console.log("point: init", x_stream, y_stream);
    return new Iterable(function () {
        var result = [x_stream.next(), y_stream.next()];
        console.log("point: next", result);
        return result;
    });
}
exports.point = point;
function rnd() {
    return new Iterable(function () {
        return Math.random();
    });
}
exports.rnd = rnd;
function sin(period, clock) {
    console.log("sin: new");
    var period_stream = toStreamNumber(period);
    return new Iterable(function () {
        var period = period_stream.next();
        var t = clock.next() % period;
        console.log("sin: t", t);
        return Math.sin(t * (Math.PI * 2) / period);
    });
    /*
    return trigger.pre
        .tapOnNext(function(){console.log("sin: trigger upstream fire");})
        .withLatestFrom(period_stream, function(dt: number, period: number) {
            t += dt;
            while (t > period) t -= period;

        })
        .tapOnNext(function() { console.log("sin: emit");});*/
}
exports.sin = sin;
function cos(period, clock) {
    console.log("cos: new");
    var period_stream = toStreamNumber(period);
    return new Iterable(function () {
        var period = period_stream.next();
        var t = clock.next() % period;
        console.log("cos: t", t);
        return Math.cos(t * (Math.PI * 2) / period);
    });
}
exports.cos = cos;
function scale_x(scale, x) { return 0; }
function storeTx(n, /*pass though context but store transform in variable*/ animation //passthrough
    ) { return null; }
function loadTx(n, /*pass though context but store transform in variable*/ animation //passthrough
    ) { return null; }
function clone(n, animation /* copies */) { return null; }
function parallel(//rename layer?
    animation) { return null; }
function sequence(animation) { return null; }
function loop(animation) {
    return new Animation2(function (prev) {
        if (exports.DEBUG_LOOP)
            console.log("loop: initializing");
        return Rx.Observable.create(function (observer) {
            console.log("loop: create new loop");
            var loopStart = null;
            var loopSubscription = null;
            function attachLoop(next) {
                if (exports.DEBUG_LOOP)
                    console.log("loop: new inner loop");
                loopStart = new Rx.Subject();
                loopSubscription = animation.attach(loopStart).subscribe(function (next) {
                    if (exports.DEBUG_LOOP)
                        console.log("loop: post-inner loop to downstream");
                    observer.onNext(next);
                }, function (err) {
                    if (exports.DEBUG_LOOP)
                        console.log("loop: post-inner loop err to downstream");
                    observer.onError(err);
                }, function () {
                    if (exports.DEBUG_LOOP)
                        console.log("loop: post-inner completed");
                    loopStart = null;
                });
                if (exports.DEBUG_LOOP)
                    console.log("loop: new inner loop finished construction");
            }
            prev.subscribe(function (next) {
                if (loopStart == null) {
                    if (exports.DEBUG_LOOP)
                        console.log("loop: no inner loop");
                    attachLoop(next);
                }
                if (exports.DEBUG_LOOP)
                    console.log("loop: upstream to inner loop");
                loopStart.onNext(next);
            }, function (err) {
                if (exports.DEBUG_LOOP)
                    console.log("loop: upstream error to inner loop", err);
                loopStart.onError(err);
            }, observer.onCompleted.bind(observer));
            return function () {
                //dispose
                if (exports.DEBUG_LOOP)
                    console.log("loop: dispose");
                if (loopStart)
                    loopStart.dispose();
            };
        }).subscribeOn(Rx.Scheduler.immediate);
    });
}
exports.loop = loop;
function draw(fn, animation) {
    return new Animation2(function (previous) {
        return previous.tapOnNext(fn);
    }, animation);
}
exports.draw = draw;
function move(delta, animation) {
    console.log("move: attached");
    var pointStream = toStreamPoint(delta);
    return draw(function (tick) {
        var point = pointStream.next();
        console.log("move:", point);
        if (tick)
            tick.ctx.transform(1, 0, 0, 1, point[0], point[1]);
        return tick;
    }, animation);
}
exports.move = move;
function velocity(velocity, animation) {
    var velocityStream = toStreamPoint(velocity);
    return new Animation2(function (prev) {
        var pos = [0.0, 0.0];
        return prev.map(function (tick) {
            var velocity = velocityStream.next();
            pos[0] += velocity[0] * tick.dt;
            pos[1] += velocity[1] * tick.dt;
            tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
            return tick;
        });
    }, animation);
}
exports.velocity = velocity;
function tween_linear(from, to, time, animation /* copies */) {
    var from_stream = toStreamPoint(from);
    var to_stream = toStreamPoint(to);
    var scale = 1.0 / time;
    return new Animation2(function (prev) {
        var t = 0;
        return prev.map(function (tick) {
            console.log("tween: inner");
            var from = from_stream.next();
            var to = to_stream.next();
            t = t + tick.dt;
            if (t > time)
                t = time;
            var x = from[0] + (to[0] - from[0]) * t * scale;
            var y = from[1] + (to[1] - from[1]) * t * scale;
            tick.ctx.transform(1, 0, 0, 1, x, y);
            return tick;
        }).takeWhile(function (tick) { return t < time; });
    }, animation);
}
function rect(p1, //todo
    p2, //todo
    animation) {
    return draw(function (tick) {
        console.log("rect: fillRect");
        tick.ctx.fillRect(p1[0], p1[1], p2[0], p2[1]); //todo observer stream if necissary
    }, animation);
}
function color(color, //todo
    animation) {
    return draw(function (tick) {
        tick.ctx.fillStyle = color;
    }, animation);
}
function map(map_fn, animation) {
    return new Animation2(function (previous) {
        return previous.map(map_fn);
    }, animation);
}
function take(iterations, animation) {
    return new Animation2(function (prev) {
        return prev.take(iterations);
    }, animation);
}
exports.take = take;
function save(width, height, path) {
    var GIFEncoder = require('gifencoder');
    var fs = require('fs');
    var encoder = new GIFEncoder(width, height);
    encoder.createReadStream()
        .pipe(encoder.createWriteStream({ repeat: -1, delay: 500, quality: 1 }))
        .pipe(fs.createWriteStream(path));
    encoder.start();
    return new Animation2(function (parent) {
        var t = 0;
        var endNext = false;
        return parent.tap(function (tick) {
            console.log("save: wrote frame");
            //t += tick.dt;
            //var out = fs.writeFileSync(path + "_"+ t + ".png", canvas.toBuffer());
            //var parsed = pngparse(canvas.toBuffer())
            encoder.addFrame(tick.ctx);
            //encoder.addFrame(tick.ctx.getImageData(0, 0, width, height).data);
        }, function () { console.error("save: not saved", path); }, function () { console.log("save: saved", path); encoder.finish(); /* endNext = true;*/ });
    });
}
//we will draw
// EXPLODING SHIP
//1. n pieces of debris flying outwards (linear movement in time of Debris from 50,50 to rnd, rnd, at velocity v)
//2. explosion of debris (last position of debris spawns explosion
//3. large explosion at center (50,50) at end of linear movement
var CENTRE = point(50, 50);
var TL = point(50, 50);
var BR = point(50, 50);
var t = 0;
var n = 0;
var gaussian;
var splatter = scale_x(3, gaussian);
function drawDebris() { return null; }
function drawExplosion() { return null; }
function drawBigExplosion() { return null; }
//What do we want it to look like
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
var animator = new Animator2(context); /*should be based on context*/
//animator.ticker(Rx.Observable.timer(/*now*/0, /*period in ms, 30FPS*/ 1000.0 / 30));
//GLOW EXAMPLES
//2 frame animated glow
function spark(css_color) {
    return take(1, draw(function (tick) {
        console.log("spark: frame1", css_color);
        tick.ctx.fillStyle = css_color;
        tick.ctx.fillRect(-2, -2, 5, 5);
    })).then(take(1, draw(function (tick) {
        console.log("spark: frame2", css_color);
        tick.ctx.fillStyle = css_color;
        tick.ctx.fillRect(-1, -1, 3, 3);
    })));
}
function sparkLong(css_color) {
    return draw(function (tick) {
        console.log("sparkLong", css_color);
        tick.ctx.fillStyle = css_color;
        tick.ctx.fillRect(-1, -1, 3, 3);
    });
}
//single spark
var bigRnd = rnd().map(function (x) { return x * 50; });
var bigSin = sin(1, animator.clock()).map(function (x) { return x * 40 + 50; });
var bigCos = cos(1, animator.clock()).map(function (x) { return x * 40 + 50; });
animator.play(color("#000000", rect([0, 0], [100, 100])));
animator.play(move(point(bigSin, bigCos), sparkLong("#FFFFFF")));
animator.play(loop(move(point(bigSin, bigCos), spark("#FFFFFF"))));
animator.play(move([50, 50], velocity([50, 0], loop(spark("#FFFFFF")))));
animator.play(tween_linear([50, 50], point(bigSin, bigCos), 1, loop(spark("red"))));
try {
    //browser
    var time;
    var render = function () {
        window.requestAnimationFrame(render);
        var now = new Date().getTime(), dt = now - (time || now);
        time = now;
        animator.root.onNext(new DrawTick(animator.ctx, dt / 1000));
    };
    render();
}
catch (err) {
    //node.js
    animator.play(save(100, 100, "spark.gif"));
    animator.ticker(Rx.Observable.return(0.1).repeat(15));
}
//todo
// INVEST IN BUILD AND TESTING
//why loop pos matters, unit tests
//emitter
// rand normal
//animator.play(
//    //clone is a parrallel execution the same animation
//    parallel([clone(n, linear_tween(/*fixed point*/CENTRE,
//                   /*generative point*/ point(splatter, splatter),
//                   /*time*/ t,
//                   /*draw fn for tween*/ storeTx("X", drawDebris()))
//                .then(loadTx("X", drawExplosion())) //after the tween completes draw the explosion
//              ),
//              take(/*fixed value*/ t).then(drawBigExplosion())
//             ])
//);
// IDEAS
// PacMan
// what about a different way of making glow?
// render luminecence into a texture and then color based on distance from lightsource
// mouse input, tailing glow (rember to tween between rapid movements)
// offscreen rendering an playback
// sin wave, randomized
// GUI components, responsive, bootstrap
// get data out by tapping into flow (intercept(Subject passback))
// SVG import
// layering with parrallel (back first)
