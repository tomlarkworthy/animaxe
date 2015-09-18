Animaxe, 2+1D Vector Drawing/Animation Library
==============================================

Drawing APIs suck, they are full of hidden state and have no opinion on the arrow of time.

Animaxe is an experiment to generalise drawing primatives across time, using a functional reactive paradigm (FRP).

Now you can compose animations *functionally*. Ideal for procedural and *interactive* animations.

Its still very early on this project, the basic building blocks are not complete, and the repository layout is not useful for libraries to link to. However, the following is a proof-of-concept for the API feel. Maybe you want to contribute?

Tutorial 1 - render to animated gif in nodejs
-----------------------------------

First wrap a CanvasRendering2D in a Animator, the schedular for animations. Later the animator will trigger rendering routines when connected to a number source (the time delta ticker). On a delta time tick, the animator passes the drawing context down the reactive animation pipeline.

```
var Canvas = require('canvas');
var canvas = new Canvas(100, 100);
var context: CanvasRenderingContext2D = canvas.getContext('2d');
var animator: Animator = new Animator(context);
```

Next we setup the animations. There are two major classes of thing in library:
- animations, drawing context push pipelines with a temporal lifecycle.
- pull streams, used for parameters and arithmatic for animations

Both these models support functional concepts. First we setup some push math routines.
```
// create some time varying functions, syncronised to the the animator's clock
var bigSin = sin(1, animator.clock()).map(x => x * 40 + 50);
var bigCos = cos(1, animator.clock()).map(x => x * 40 + 50);
var red    = sin(2, animator.clock()).map(x => x * 125 + 125);
var green  = sin(2, animator.clock()).map(x => x * 55 + 200);
```

Now we use those functions to build animations. Most animations take parameters, you can use either literals, or push streams `type NumberStream = Iterable<number>)`. We start with a 2 frame basic animation of a spark.

```
// two frame animation of a spark
function spark(css_color: string | ColorStream): Animation {
    var css: ColorStream = toStreamColor(css_color);
    // we build an animation by composing existing animation functions
    // draw(fn, anim) takes a function taking a DrawTick and returns an infinite
    // animation which applies the drawing function every frame
    // take(n, anim) does no drawing itself, but passes only n frame of animation
    // to its only child
    // anim.then(anim) sequences a second animation to play after the first
    // completes
    return take(1, draw(function(tick: DrawTick) {
            console.log("spark: frame1", css.next());
            tick.ctx.fillStyle = css.next(); //pull value out of param stream
            tick.ctx.fillRect(-2,-2,5,5); //big rectangle
    })).then(
        take(1, draw(function(tick: DrawTick) {
            console.log("spark: frame2", css.next());
            tick.ctx.fillStyle = css.next(); //pull value out of param stream
            tick.ctx.fillRect(-1,-1,3,3); //small rectange
        }))
    );
}
```

With a basic 2 frame animation building block we can now apply that animation in a variety of dynamic ways. `loop` is very handy for resequencing a child animation after it finishes.

When an animation pipeline is built up, you pass the animation tree to the animator to play it.

```
// draw black background forever
animator.play(changeColor("#000000", rect([0,0],[100,100])));
// animate a spark following a circular path, in dynamic colors
animator.play(loop(move(point(bigSin, bigCos), spark(color(red,green,0,0.5)))));
// constant velocity from center (50,50) at (50, 0) pixels per second
animator.play(move([50,50], velocity([50,0], loop(spark("#FFFFFF")))));
// tween center to point on circle
animator.play(tween_linear([50,50], point(bigSin, bigCos), 1, loop(spark("red"))));
```

Animations are anything that has a temporal lifecycle. There is one to save the screen into an animated gif.
```
animator.play(save(100, 100, "example1.gif"));
```

Finally an RxJS stream is used to drive the animators time ticker. The numbers represent the time (in seconds) between frames.
```
// sumulating 2 seconds of time
animator.ticker(Rx.Observable.return(0.1).repeat(20));
```

Voila, the result:

  ![alt text](../master/images/example1.gif?raw=true "images/example1.gif")


If we are in a browser environment the delta time stream is useful for rendering as fast as possible! Temporal push streams like sin, or temporal animations like velocity use the time delta to produce framerate independant renderings.

```
//browser
var time;
var render = function() {
    window.requestAnimationFrame(render);
    var now = new Date().getTime(),
    dt = now - (time || now);
    time = now;
    animator.root.onNext(new DrawTick(animator.ctx, dt/1000));
};
render();
```

Further work
========

So the idea is animations are driven by anything. User input, physics *etc.* The main focus ATM is

- Better graphics, glow routines, polygon moves
- Better learning resources, self-contained examples with gifs, and interactive examples on jsfiddle
- Better build system, it's already continious (gulp watch), but iron out the wrinkles and modularise the tests





