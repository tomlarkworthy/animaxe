Animaxe, Composable Animation Library
==============================================

Maybe I should explain my motivation, I like procedural graphics, graphics drawn by code. 
But fiddling with parameters in a compile-execute cycle is slow and does not get the best artistic results. 
So I want a graphical system that allows me to:

- Alter the generation code dynamically and see the results immediately (that's why I put the examples on Codepen)
- Fiddle with the animation meta parameters live (that's what the FRP-like bit helps with)

So the aim of Animaxe is to be a few things:

- Make it easy to create animations that are composable. 
- Be a nicer API for the Canvas drawing API
- Be reactive, every parameter to every animation primitive should be alterable at any time
- Be functional, a lot of inspiration is drawn from Functional Reactive Programming, although the intention is not to be too pure
- Be efficient
- Be typed using Typescript

Now you can compose animations *functionally*. Ideal for procedural and *interactive* animations.

Its still very early on this project, the basic building blocks are not complete, and the repository layout is not useful for libraries to link to. However, the following is a proof-of-concept for the API feel. Maybe you want to contribute?

Being a nicer Canvas API
-------------------------

Instead of the procedural style of drawing that the Canvas API uses, we chain. So instead of:

```
ctx.fillStyle = "red";
ctx.translate(30, 45);
ctx.fillRect(0,0, 10, 10)
```

In Animaxe we use the Ax module as the entrace to an animation chain. We use the same identifiers as the Canvas API, so it becomes
```
Ax.create()
  .fillStyle("red")
  .translate([30, 45])
  .fillRect([0,0], [10,10]);
```

Being reactive
-------------------------

It's worth noting almost every argument in Animaxe can be a literal, like in the example above, OR, it can be a dynamic time varying value. 
The Parameter module is the entrance to time varying functions, which can also be chained together with the normal functional primitives.

For example, a fading in an out example:
 
```
Ax.create()
  .fillStyle(Parameter.rgba(255, 255, 255, Parameter.sin(Parameter.t())))
  .translate(Parameter.point(30, Parameter.sin(30).map(x => x * 50)))
  .fillRect([0,0], [10,10]); 
```

The animation life lifecycle 
--------------------------------

The composable building block of Animaxe is an Animation. An animation does something with the drawing context. An animation can do something indefinitely, for example this draws a red square forever:

```
 foreverRedSquare() {
    return Ax.create() 
        .fillStyle = "red";
        .fillRect(0,0, 10, 10);
 }
```

But an animation can also have a finite duration. You can turn an infinite animation into a finite animation using `take(<n>)`:

```
  redSquareFor2Frames() {return foreverRedSquare().take(2);}
```

You can chain animations temporally using `.then`, which creates a new animation from the the temporal concatenation.

```
  redThenGreenSquareFor4Frames() {return redSquareFor2Frames().then(greenSquareFor2Frames());}
```

You can create an infinite length animation from a limited duration animation by using `.loop()`, which just repeatedly sequences the same animation end-to-end

```
 foreverRedAndGreenSquare() {return Ax.loop(redThenGreenSquareFor4Frames());}
```

These animation operators are the defining characteristics of Animaxe,
which internally resolve around using Rx's onCompleted semantic to dynamically change the dataflow graph. 
The dynamic dataflow operators, so far, in Animaxe are:-

- parallel (play multiple animations at the same time)
- clone (specialised version of parallel which plays the same animation multiple times)
- emit (spawn a new animation every frame)
- take (limit the temporal duration of an animation)
- then (concatinate animations temporally)
- pipe (pass the context of one animation into another)
- loop (create an infinite duration animation by repeatedly resequencing)
- .if .elif .else (switch an animation based on reevaluated conditionals)

(This style is quite related to AFRP if your interested. Elm is about signals, whereas Animaxe and YAMPA are about signal transformer)


Trying it out
---------------

Clone the repo
```
git clone git@github.com:tomlarkworthy/animaxe.git
npm install
python -m SimpleHTTPServer & gulp watch-example1
```
and browse to `http://localhost:8000/html/example1.html`, if you modify any TS sources, the page will refresh automatically.

You can add your own examples to the `examples/` directory and a gulp watch-XXX task is created automagically!

I highly recommend using `vscode` to edit/create examples, this repo is configured for `vscode` and `tsc`

Examples
-----------------------------------

Example 1 - Basic animation compositions
([source](./examples/example1.ts))

![Example1](./images/example1.gif?raw=true)

Example 2 - Skewing time and dynamic colors
([source](./examples/example2.ts))

![Example2](./images/example2.gif?raw=true)

Example 3 - Particles 
([source](./examples/example3.ts))
([edit on Codepen](http://codepen.io/tomlarkworthy/pen/jbmVWO?editors=001))

![Example3](./images/example3.gif?raw=true)

Example 4 - Glow filter
([source](./examples/example4.ts))

![Example4](./images/example4.gif?raw=true)

Example 5 - UI Button
([source](./examples/example5.ts))
([edit on Codepen](http://codepen.io/tomlarkworthy/pen/yYxwga?editors=001))

![Example5](./images/example5.gif?raw=true)

Example 6 - UI Slider
([source](./examples/example6.ts))
([edit on Codepen](http://codepen.io/tomlarkworthy/pen/ojaGZz?editors=001))

![Example6](./images/example6.gif?raw=true)

Rainbow Sines - Demo
([source](./examples/rainbow_sines.ts))

![Rainbow Sines](./images/rainbow_sines.gif?raw=true)


Lissajous Curves - Demo
([source](./examples/lissajous.ts))

![Rainbow Sines](./images/lissajous.gif?raw=true)


We have some examples in the test directory written in Typescript. See 'Trying it out'.


API
-----
Currently documentation is broken until typedoc can do later versions of TS.
Its in constant flux changed, but you can try it here [here](https://animaxe.firebaseapp.com/)


TODOS
=====

Packaging
-----------
- instructions on using save As.. then map to network resource for example editing
- Test npm workflow
- Test TS workflow (bower?)
- Redo codepen examples with systemJS (SystemJS doesn't support inline script tags for transpilation)

Glow
----
- different distance exponents are interesting
- think about alpha over existing backgrounds
  - improve effeciency by calculating the glow envelope when applying it

Features
--------
- Reflection
- L-systems (fold?)
- Perlin noise
- simulate a lazer show, XY parametric functions (Lissajous curves), intergrate with ODE solve
 
Engineering
--------------
- Add a Number for adding a fluent interface to Number params
- figure out why example3 cannot have move than 1000 particles without a stack overflow
- replace parallel with its own internal animator OR make parallel the only option
- check for memory leaks.
- Time travelling debugger? http://elm-lang.org/blog/time-travel-made-easy uses snapshots and fast forwards, totally doable

Refactors
----------
- OT should not have in extend BaseTick, Params should be on BaseTick. How do we combine them? Intersection types? .combine is the sticking point
    - how to we express some common ancesors exists. Can we upcast through generics?
- rainbow sines is ugly, Number and skewT should help.
- change event propogation
- change order of playExample parameters, infact make the example helper a function that exposes an animator to a passed in closure
- (partial) do all of canvas API methods
     - finish that API!
     - withinClip, withinTx, (done) withinPath
     - createLinearGradient, createPattern(), createRadialGradient(), addColorStop(), isPointInPath(), measureText(), drawImage()
     - save() restore()
- the way the tick is passed on in Animator is ugly
- All the complex methods are implemented badly, then, emit, parallel. Maybe state machines?

API documentation
-------------------

- making your own Animation
- making your own Parameters
- overriding the prototype
- using .pipe()
- example of switching from the canvas API to a linear chain
- how a new chain resets the context
- using https://github.com/anthonydugois/svg-path-builder
- the order of side effects is probably important and worth documenting (and testing).

website
-------
- npm

Code pen example
-----------------
- sync with codepen automatically

UI controls
------------
- slider
  - todo: let the user pass in the source of truth, and through a callback, let the user connect the value change to the source of truth
    this will allow min/max without hardcoding logic in the basic slider
  - 
- (done) button
- knob
- (done) Default mouse behaviour.
- (done) relative positions and transformation aware
- As we need global event listeners (e.g. slider needs to listen to mouse moves after the mouse has left the component)
  we should have a global mouse listener implemented with RxJS which local listeners map over, instead of the ropey array thing we have for global events

Random IDEAS
-------------

- 2D Parametric line drawing from t = 0 ... t = 10 step 0.1 => x = sin(t), y = sin(t) WITH LINEAR INTORPOLATION:
keep dividing the start end points untill the center is within a tolerance of (start + end) / 2
- output is an Parameter<{point: array<[x y], t: number}>

   - 3D *segments* in time (need linear constraint solver for t = x cutting plane)
   - Nd dots projected onto a plane (via n x 2 matrix)
- PacMan
- Write the documentation as animations!
- mouse input, tailing glow (remember to tween between rapid movements)
- prerendering an animation for fast playback
- SVG path parser for withinPath
- Matrix esq. The rain




