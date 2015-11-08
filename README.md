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
Ax.fillStyle("red")
  .translate([30, 45])
  .fillRect([0,0], [10,10]);
```

Being reactive
-------------------------

It's worth noting almost every argument in Animaxe can be a literal, like in the example above, OR, it can be a dynamic time varying value. 
The Parameter module is the entrance to time varying functions, which can also be chained together with the normal functional primitives.

For example, a fading in an out example:
 
```
Ax.fillStyle(Parameter.rgba(255, 255, 255, Parameter.sin(Parameter.t())))
  .translate(Parameter.point(30, Parameter.sin(30).map(x => x * 50)))
  .fillRect([0,0], [10,10]); 
```



Examples
-----------------------------------

Example 1 - Basic animation compositions
([source](./test/example1.ts))

![Example1](./images/example1.gif?raw=true)

Example 2 - Skewing time and dynamic colors
([source](./test/example2.ts))

![Example2](./images/example2.gif?raw=true)

Example 3 - Particles 
([source](./test/example3.ts))
([edit on Codepen](http://codepen.io/tomlarkworthy/pen/jbmVWO?editors=001))

![Example3](./images/example3.gif?raw=true)



Example 4 - Glow filter
([source](./test/example4.ts))

![Example4](./images/example4.gif?raw=true)

Example 5 - UI Button
([source](./test/example5.ts))
([edit on Codepen](http://codepen.io/tomlarkworthy/pen/yYxwga?editors=001))

![Example5](./images/example5.gif?raw=true)

Example 6 - UI Slider
([source](./test/example6.ts))
([edit on Codepen](http://codepen.io/tomlarkworthy/pen/ojaGZz?editors=001))

![Example6](./images/example6.gif?raw=true)


We have some examples in the test directory written in Typescript.
You can use the babel preprocessor within Codepen quite well:



Using on web
-------------

Animaxe is written with commonjs modules, so for web distribution its webpacked.
So an alternative set of libraries should be used in script tags

```
<script src="rx/dist/rx.all.js"></script>
<script src="animaxe/dist/ax.js"></script> <!-- exposes "var Ax" -->
<script src="animaxe/dist/px.js"></script> <!-- exposes "var Parameter" -->
<script src="animaxe/dist/hx.js"></script> <!-- exposes "var helper" -->
<script src="animaxe/dist/ex.js"></script> <!-- exposes "var events" -->
```

Using with Typescript in node.js
-----------------------------------

Animations are rendered using canvas. Its a bitch to install. You should require() within a Typescript environment

```
import Rx = require("rx");
import Ax = require("animaxe/dist/animaxe");
import events = require("animaxe/dist/events");
import Parameter = require("animaxe/dist/parameter");
import helper = require("animaxe/dist/helper");
```

The definitions are also in dist.


API
-----
Its being changed a lot but it's [here](https://animaxe.firebaseapp.com/)


TODOS
=====

Packaging
-----------
- I don't like the webpack names have to be different
- Test npm integration...
- ES6 modules? Can we make the packaging equivalent? Maybe jsut a browser & and node.js directory structure?


Glow
----
- different distance exponents are interesting
- think about alpha over existing backgrounds
  - improve effeciency by calculating the glow envelope when applying it

Features
--------
- .if .elif .else .fi e.g. .if(BoolArg, <anim>).fi().fill()
- Reflection
- L-systems (fold?)
- Perlin noise
- simulate a lazer show, XY parametric functions (Lissajous curves), intergrate with ODE solve
 
Engineering
--------------
- figure out why example3 cannot have move than 1000 particles without a stack overflow
- remove randomness (example 3) with a random seed (seed random with animation seed?) for repeatabe tests
- replace paralel with its own internal animator OR make parallel the only option
- check for memory leaks from recursive closures.

Refactors
----------
- change order of playExample parameters
- (done) Parameter to go in own module, params chained to make value read left to right
- (done) Parameter.rnd().first()        // maybe we should just make it pure by seeding the rnd by epock or tree position?
- (done) Parameter.rnd().map(x => x*x)
- (done) Ax.Parameter() for construction
- (done) Make methods chain as an alternative to wrapping, e.g. Ax.move(...).velocity(...)
- (done) add .pipe(animation) so users can chain themselves
- (partial) align names of methods with canvas context name, e.g. fillStyle(Color)
     - finish that API!
     - withinClip, withinTx, (done) withinPath
     - createLinearGradient, createPattern(), createRadialGradient(), addColorStop(), isPointInPath(), measureText(), drawImage()
     - save() restore()
- maybe put context methods in their own namespace if possible? (long term goal)
- consider hiding time from Animation? It should only be used in params
- simplifying closure situation? Maybe handle params internally through DI?
- the way the tick is passed on in Animator is ugly
- All the complex methods are implemented badly, then, emit, parallel. Maybe state machines? (if else is quite good)
- As we need global event listeners (e.g. slider needs to listen to mouse moves after the mouse has left the component)
  we should have a global mouse listener implemented with RxJS which local listeners map over, instead of the ropey array thing we have for global events

API documentation
-------------------

- method chaining
- lifecycle
- making your own Animation
- making your own Parameters
- overriding the prototype
- using .pipe()
- example of switching from the canvas API to a linear chain
- how a new chain resets the context
- using https://github.com/anthonydugois/svg-path-builder

website
-------
- npm

Code pen example
-----------------
- sync with codepen automatically

UI controls
------------
- slider
- button
- knob
- (done) Default mouse behaviour.
- (done) relative positions and transformation aware

Random IDEAS
-------------

- PacMan
- mouse input, tailing glow (remember to tween between rapid movements)
- prerendering an animation for fast playback
- SVG path parser for withinPath




