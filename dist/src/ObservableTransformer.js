function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var Rx = require("rx");
var Parameter = require("./Parameter");
__export(require("./types"));
exports.DEBUG_LOOP = false;
exports.DEBUG_THEN = false;
exports.DEBUG_IF = false;
exports.DEBUG_EMIT = false;
exports.DEBUG_PARALLEL = false;
exports.DEBUG_EVENTS = false;
exports.DEBUG = false;
var BaseTick = (function () {
    function BaseTick(clock, dt, ctx) {
        this.clock = clock;
        this.dt = dt;
        this.ctx = ctx;
    }
    return BaseTick;
})();
exports.BaseTick = BaseTick;
var ObservableTransformer = (function () {
    function ObservableTransformer(attach) {
        this.attach = attach;
    }
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    ObservableTransformer.prototype.create = function (attach) {
        if (attach === void 0) { attach = function (nop) { return nop; }; }
        return new ObservableTransformer(attach);
    };
    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     *
     * This allows you to chain custom animations.
     *
     * ```Ax.move(...).pipe(myOT_API());```
     */
    ObservableTransformer.prototype.pipe = function (downstream) {
        return combine(this, downstream);
    };
    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     *
     * This allows you to sequence animations temporally.
     * frame1OT_API().then(frame2OT_API).then(frame3OT_API)
     */
    ObservableTransformer.prototype.then = function (follower) {
        var self = this;
        return this.create(function (prev) {
            return Rx.Observable.create(function (observer) {
                var first = new Rx.Subject();
                var second = new Rx.Subject();
                var firstTurn = true;
                var current = first;
                if (exports.DEBUG_THEN)
                    console.log("then: attach");
                var secondAttach = null;
                var firstAttach = self.attach(first.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: first to downstream");
                    observer.onNext(next);
                }, observer.onError.bind(observer), function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: first complete");
                    firstTurn = false;
                    secondAttach = follower.attach(second.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                        if (exports.DEBUG_THEN)
                            console.log("then: second to downstream");
                        observer.onNext(next);
                    }, observer.onError.bind(observer), function () {
                        if (exports.DEBUG_THEN)
                            console.log("then: second complete");
                        observer.onCompleted();
                    });
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
                    if (secondAttach)
                        secondAttach.dispose();
                };
            }).subscribeOn(Rx.Scheduler.immediate); //todo remove subscribeOns
        });
    };
    /**
     * Creates an animation that replays the inner animation each time the inner animation completes.
     *
     * The resultant animation is always runs forever while upstream is live. Only a single inner animation
     * plays at a time (unlike emit())
     */
    ObservableTransformer.prototype.loop = function (animation) {
        return this.pipe(this.create(function (prev) {
            if (exports.DEBUG_LOOP)
                console.log("loop: initializing");
            return Rx.Observable.create(function (observer) {
                if (exports.DEBUG_LOOP)
                    console.log("loop: create new loop");
                var loopStart = null;
                var loopSubscription = null;
                var t = 0;
                function attachLoop(next) {
                    if (exports.DEBUG_LOOP)
                        console.log("loop: new inner loop starting at", t);
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
                    t += next.dt;
                }, function (err) {
                    if (exports.DEBUG_LOOP)
                        console.log("loop: upstream error to downstream", err);
                    observer.onError(err);
                }, observer.onCompleted.bind(observer));
                return function () {
                    //dispose
                    if (exports.DEBUG_LOOP)
                        console.log("loop: dispose");
                    if (loopStart)
                        loopStart.dispose();
                };
            }).subscribeOn(Rx.Scheduler.immediate);
        }));
    };
    /**
     * Creates an animation that sequences the inner animation every time frame.
     *
     * The resultant animation is always runs forever while upstream is live. Multiple inner animations
     * can be playing at the same time (unlike loop)
     */
    ObservableTransformer.prototype.emit = function (animation) {
        return this.pipe(this.create(function (prev) {
            if (exports.DEBUG_EMIT)
                console.log("emit: initializing");
            var attachPoint = new Rx.Subject();
            return prev.tapOnNext(function (tick) {
                if (exports.DEBUG_EMIT)
                    console.log("emit: emmitting", animation);
                animation.attach(attachPoint).subscribe();
                attachPoint.onNext(tick);
            });
        }));
    };
    /**
     * Plays all the inner animations at the same time. Parallel completes when all inner animations are over.
     *
     * The canvas states are restored before each fork, so styling and transforms of different child animations do not
     * interact (although obsviously the pixel buffer is affected by each animation)
     */
    ObservableTransformer.prototype.parallel = function (animations) {
        return this.create(function (prev) {
            if (exports.DEBUG_PARALLEL)
                console.log("parallel: initializing");
            var activeOT_APIs = 0;
            var attachPoint = new Rx.Subject();
            function decrementActive(err) {
                if (exports.DEBUG_PARALLEL)
                    console.log("parallel: decrement active");
                if (err)
                    console.log("parallel error:", err);
                activeOT_APIs--;
            }
            animations.forEach(function (animation) {
                activeOT_APIs++;
                animation.attach(attachPoint.tapOnNext(function (tick) { return tick.ctx.save(); })).subscribe(function (tick) { return tick.ctx.restore(); }, decrementActive, decrementActive);
            });
            return prev.takeWhile(function () { return activeOT_APIs > 0; }).tapOnNext(function (tick) {
                if (exports.DEBUG_PARALLEL)
                    console.log("parallel: emitting, animations", tick);
                attachPoint.onNext(tick);
                if (exports.DEBUG_PARALLEL)
                    console.log("parallel: emitting finished");
            });
        });
    };
    /**
     * Sequences n copies of the inner animation. Clone completes when all inner animations are over.
     */
    ObservableTransformer.prototype.clone = function (n, animation) {
        var array = new Array(n);
        for (var i = 0; i < n; i++)
            array[i] = animation;
        return this.parallel(array);
    };
    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    ObservableTransformer.prototype.take = function (frames) {
        return this.pipe(this.create(function (prev) {
            if (exports.DEBUG)
                console.log("take: attach");
            return prev.take(frames);
        }));
    };
    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * You just have to supply a function that does something with the draw tick.
     */
    ObservableTransformer.prototype.draw = function (drawFactory) {
        return this.create(function (upstream) { return upstream.tapOnNext(drawFactory()); });
    };
    ObservableTransformer.prototype.if = function (condition, animation) {
        return new If([new ConditionActionPair(condition, animation)], this);
    };
    return ObservableTransformer;
})();
exports.ObservableTransformer = ObservableTransformer;
/**
 * Creates a new OT_API by piping the animation flow of A into B
 */
//export function combine<Tick, A extends ObservableTransformer<Tick>, B extends ObservableTransformer<Tick>>(a: A, b: B): B {
function combine(a, b) {
    var b_prev_attach = b.attach;
    b.attach =
        function (upstream) {
            return b_prev_attach(a.attach(upstream));
        };
    return b;
}
exports.combine = combine;
var ConditionActionPair = (function () {
    function ConditionActionPair(condition, action) {
        this.condition = condition;
        this.action = action;
    }
    return ConditionActionPair;
})();
exports.ConditionActionPair = ConditionActionPair;
;
/**
 * An if () elif() else() block. The semantics are subtle when considering animation lifecycles.
 * One intepretation is that an action is triggered until completion, before reevaluating the conditions. However,
 * as many animations are infinite in length, this would only ever select a single animation path.
 * So rather, this block reevaluates the condition every message. If an action completes, the block passes on the completion,
 * and the whole clause is over, so surround action animations with loop if you don't want that behaviour.
 * Whenever the active clause changes, the new active animation is reinitialised.
 */
var If = (function () {
    function If(conditions, preceeding) {
        this.conditions = conditions;
        this.preceeding = preceeding;
    }
    If.prototype.elif = function (clause, action) {
        this.conditions.push(new ConditionActionPair(clause, action));
        return this;
    };
    If.prototype.endif = function () {
        return this.preceeding.pipe(this.else(this.preceeding.create()));
    };
    If.prototype.else = function (otherwise) {
        var _this = this;
        return this.preceeding.pipe(this.preceeding.create(function (upstream) {
            if (exports.DEBUG_IF)
                console.log("If: attach");
            var downstream = new Rx.Subject();
            var anchor = new Rx.Subject();
            var currentOT_API = otherwise;
            var activeSubscription = otherwise.attach(anchor).subscribe(downstream);
            // we initialise all the condition parameters
            var conditions_next = _this.conditions.map(function (condition) { return Parameter.from(condition[0]).init(); });
            var fork = upstream.subscribe(function (tick) {
                if (exports.DEBUG_IF)
                    console.log("If: upstream tick");
                // first, we find which animation should active, by using the conditions array
                var nextActiveOT_API = null;
                // ideally we would use find, but that is not in TS yet..
                for (var i = 0; i < _this.conditions.length && nextActiveOT_API == null; i++) {
                    if (conditions_next[i](tick.clock)) {
                        nextActiveOT_API = _this.conditions[i][1];
                    }
                }
                if (nextActiveOT_API == null)
                    nextActiveOT_API = otherwise;
                // second, we see if this is the same as the current animation, or whether we have switched
                if (nextActiveOT_API != currentOT_API) {
                    // this is a new animation being sequenced, cancel the old one and add a new one
                    if (exports.DEBUG_IF)
                        console.log("If: new subscription");
                    if (activeSubscription != null)
                        activeSubscription.dispose();
                    activeSubscription = nextActiveOT_API.attach(anchor).subscribe(downstream);
                    currentOT_API = nextActiveOT_API;
                }
                else {
                }
                anchor.onNext(tick);
            }, function (err) { return anchor.onError(err); }, function () { return anchor.onCompleted(); });
            return downstream.tap(function (x) { if (exports.DEBUG_IF)
                console.log("If: downstream tick"); });
        }));
    };
    return If;
})();
exports.If = If;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9PYnNlcnZhYmxlVHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOlsiQmFzZVRpY2siLCJCYXNlVGljay5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jcmVhdGUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIucGlwZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci50aGVuIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmxvb3AiLCJhdHRhY2hMb29wIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmVtaXQiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIucGFyYWxsZWwiLCJkZWNyZW1lbnRBY3RpdmUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuY2xvbmUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIudGFrZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5kcmF3IiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmlmIiwiY29tYmluZSIsIkNvbmRpdGlvbkFjdGlvblBhaXIiLCJDb25kaXRpb25BY3Rpb25QYWlyLmNvbnN0cnVjdG9yIiwiSWYiLCJJZi5jb25zdHJ1Y3RvciIsIklmLmVsaWYiLCJJZi5lbmRpZiIsIklmLmVsc2UiXSwibWFwcGluZ3MiOiI7OztBQUNBLElBQVksRUFBRSxXQUFNLElBQ3BCLENBQUMsQ0FEdUI7QUFFeEIsSUFBWSxTQUFTLFdBQU0sYUFDM0IsQ0FBQyxDQUR1QztBQUN4QyxpQkFBYyxTQUVkLENBQUMsRUFGc0I7QUFFWixrQkFBVSxHQUFHLEtBQUssQ0FBQztBQUNuQixrQkFBVSxHQUFHLEtBQUssQ0FBQztBQUNuQixnQkFBUSxHQUFHLEtBQUssQ0FBQztBQUNqQixrQkFBVSxHQUFHLEtBQUssQ0FBQztBQUNuQixzQkFBYyxHQUFHLEtBQUssQ0FBQztBQUN2QixvQkFBWSxHQUFHLEtBQUssQ0FBQztBQUNyQixhQUFLLEdBQUcs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Q0FBQ0EsQ0FBQ0EsQ0FBQ0E7d0JBQ2pDQSxnQkFBZ0JBLEdBQUdBLEtBQUlBLENBQUNBLFVBQVVBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUM3Q0EsQ0FBQ0E7Z0JBQ0xBLENBQUNBO2dCQUNEQSxFQUFFQSxDQUFDQSxDQUFDQSxnQkFBZ0JBLElBQUlBLElBQUlBLENBQUNBO29CQUFDQSxnQkFBZ0JBLEdBQUdBLFNBQVNBLENBQUNBO2dCQUczREEsMkZBQTJGQTtnQkFDM0ZBLEVBQUVBLENBQUNBLENBQUNBLGdCQUFnQkEsSUFBSUEsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7b0JBQ3BDQSxnRkFBZ0ZBO29CQUNoRkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZ0JBQVFBLENBQUNBO3dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxzQkFBc0JBLENBQUNBLENBQUNBO29CQUNsREEsRUFBRUEsQ0FBQ0EsQ0FBQ0Esa0JBQWtCQSxJQUFJQSxJQUFJQSxDQUFDQTt3QkFBQ0Esa0JBQWtCQSxDQUFDQSxPQUFPQSxFQUFFQSxDQUFDQTtvQkFDN0RBLGtCQUFrQkEsR0FBR0EsZ0JBQWdCQSxDQUFDQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxVQUFVQSxDQUFDQSxDQUFDQTtvQkFDM0VBLGFBQWFBLEdBQUdBLGdCQUFnQkEsQ0FBQ0E7Z0JBQ3JDQSxDQUFDQTtnQkFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7Z0JBRVJBLENBQUNBO2dCQUNEQSxNQUFNQSxDQUFDQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUN4QkEsQ0FBQ0EsRUFDREEsVUFBQUEsR0FBR0EsSUFBSUEsT0FBQUEsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBbkJBLENBQW1CQSxFQUMxQkEsY0FBTUEsT0FBQUEsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsRUFBcEJBLENBQW9CQSxDQUM3QkEsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQUEsQ0FBQ0EsSUFBS0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZ0JBQVFBLENBQUNBO2dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUFBLENBQUFBLENBQUNBLENBQUNBLENBQUNBO1FBQ25GQSxDQUFDQSxDQUNKQSxDQUFDQSxDQUFBQTtJQUNOQSxDQUFDQTtJQUNMSixTQUFDQTtBQUFEQSxDQWpFQSxBQWlFQ0EsSUFBQTtBQWpFWSxVQUFFLEtBaUVkLENBQUEiLCJmaWxlIjoic3JjL09ic2VydmFibGVUcmFuc2Zvcm1lci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
