/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/lib.d.ts" />
require('source-map-support').install();
var Rx = require("rx");
var DrawTick = (function () {
    function DrawTick(ctx, dt) {
        this.ctx = ctx;
        this.dt = dt;
    }
    return DrawTick;
})();
exports.DrawTick = DrawTick;
function toStreamNumber(x) {
    return typeof x === 'number' ? Rx.Observable.return(x) : x;
}
exports.toStreamNumber = toStreamNumber;
function toStreamPoint(x) {
    return (typeof x.concatMap === 'function' ? x : Rx.Observable.return(x));
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
    Animation2.prototype.then = function (follower) {
        var self = this;
        //return new Animation2(self.attach.bind(self));
        return new Animation2(function (prev) {
            var join = new Rx.Subject();
            var dispose_first = self.attach.call(self, prev).subscribe(join.onNext.bind(join), join.onError.bind(join), function () {
                console.log("then: complete");
                follower.attach.call(follower, prev).subscribe(join);
            });
            return join;
        });
    };
    return Animation2;
})();
exports.Animation2 = Animation2;
var Animator2 = (function () {
    function Animator2(drawingContext) {
        this.drawingContext = drawingContext;
        this.tickerSubscription = null;
        this.animationSubscriptions = [];
        this.root = new Rx.Subject();
    }
    Animator2.prototype.ticker = function (tick) {
        var self = this;
        this.tickerSubscription = tick.map(function (dt) {
            return new DrawTick(self.drawingContext, dt);
        }).subscribe(this.root);
    };
    Animator2.prototype.play = function (animation) {
        console.log("play");
        var saveBeforeFrame = this.root.tapOnNext(function (tick) { tick.ctx.save(); });
        var doAnimation = animation.attach(saveBeforeFrame);
        var restoreAfterFrame = doAnimation.tapOnNext(function (tick) { tick.ctx.restore(); });
        this.animationSubscriptions.push(restoreAfterFrame.subscribe());
    };
    return Animator2;
})();
exports.Animator2 = Animator2;
function point(x, y) {
    console.log("point: init");
    var x_stream = toStreamNumber(x);
    var y_stream = toStreamNumber(y);
    return Rx.Observable.combineLatest([x_stream, y_stream], function (x, y) {
        var result = [x, y];
        return result;
    });
}
exports.point = point;
function rnd() {
    return Rx.Observable.create(function (observer) {
        console.log('rnd: onNext');
        observer.onNext(Math.random());
        return function () {
            console.log('rnd: disposed');
        };
    });
}
exports.rnd = rnd;
function sin(period, trigger) {
    var t = 0;
    var period_stream = toStreamNumber(period);
    return trigger.root.withLatestFrom(period_stream, function (tick, period) {
        t += tick.dt;
        while (t > period)
            t -= period;
        return Math.sin(t * (Math.PI * 2) / period);
    });
}
exports.sin = sin;
function cos(period, trigger) {
    var t = 0;
    var period_stream = toStreamNumber(period);
    return trigger.root.withLatestFrom(period_stream, function (tick, period) {
        t += tick.dt;
        while (t > period)
            t -= period;
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
    console.log("loop: initializing");
    var input = new Rx.Subject();
    var output = new Rx.Subject();
    var passthoughSubscription = null;
    var attachNext = true;
    return new Animation2(function (previous) {
        previous.tapOnCompleted(function () {
            attachNext = false;
        }).subscribe(input);
        function attachPassthrouh() {
            console.log("loop: passthrough, attach");
            passthoughSubscription = animation.attach(input).subscribe(output.onNext.bind(output), output.onError.bind(output), function () {
                //onComplete
                console.log("loop: passthrough, complete");
                passthoughSubscription.dispose(); //todo, check for mem leaks in loop, and maybe get rid of this line
                if (attachNext)
                    attachPassthrouh();
            });
        }
        ;
        attachPassthrouh();
        return output;
    });
}
function draw(fn, animation) {
    return new Animation2(function (previous) {
        return previous.tapOnNext(fn);
    }, animation);
}
function move(delta, animation) {
    var pointStream = toStreamPoint(delta);
    return new Animation2(function (prev) {
        return prev.withLatestFrom(pointStream, function (tick, point) {
            console.log("move: transform", point);
            tick.ctx.transform(1, 0, 0, 1, point[0], point[1]);
            return tick;
        });
    }, animation);
}
function velocity(velocity, animation) {
    var velocityStream = toStreamPoint(velocity);
    return new Animation2(function (prev) {
        var pos = [0.0, 0.0];
        return prev.withLatestFrom(velocityStream, function (tick, velocity) {
            pos[0] += velocity[0] * tick.dt;
            pos[1] += velocity[1] * tick.dt;
            tick.ctx.transform(1, 0, 0, 1, pos[0], pos[1]);
            return tick;
        });
    }, animation);
}
function tween_linear(from, to, time, animation /* copies */) {
    var from_stream = toStreamPoint(from);
    var to_stream = toStreamPoint(to);
    var combined = from_stream.combineLatest(to_stream, function (a, b) { return [a, b]; });
    var scale = 1.0 / time;
    return new Animation2(function (prev) {
        var t = 0;
        return prev.withLatestFrom(combined, function (tick, points) {
            t = t + tick.dt;
            if (t > time)
                t = time;
            var x = points[0][0] + (points[1][0] - points[0][0]) * t * scale;
            var y = points[0][1] + (points[1][1] - points[0][1]) * t * scale;
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
var bigSin = sin(1, animator).map(function (x) { return x * 45 + 50; });
var bigCos = cos(1, animator).map(function (x) { return x * 45 + 50; });
animator.play(color("#000000", rect([0, 0], [100, 100]))); /*repain background every round */
animator.play(move(point(bigSin, bigCos), loop(spark("#FFFFFF"))));
animator.play(move([50, 50], velocity([50, 0], loop(spark("#FFFFFF")))));
animator.play(tween_linear([50, 50], point(bigSin, bigCos), 1, loop(spark("red"))));
//animator.play(tween_linear([100,100], point(bigSin, bigCos), 1, sparkLong("red")));
try {
    var time;
    var render = function () {
        window.requestAnimationFrame(render);
        var now = new Date().getTime(), dt = now - (time || now);
        time = now;
        animator.root.onNext(new DrawTick(animator.drawingContext, dt / 1000));
    };
    render();
}
catch (err) {
    animator.play(save(100, 100, "spark.gif"));
    animator.ticker(Rx.Observable.return(0.1).repeat(15));
}
//todo
// INVEST IN BUILD AND TESTING
//why loop pos matters, unit tests
// animator.play(loop(move(point(bigSin, bigCos), spark("#FFFFFF"))));
// Vs. animator.play(move(point(bigSin, bigCos), loop(spark("#FFFFFF"))));
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
