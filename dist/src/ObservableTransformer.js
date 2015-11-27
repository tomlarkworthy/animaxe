function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var Rx = require("rx");
var types = require("./types");
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
        return this.pipe(this.create(function (prev) {
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
        }));
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
        types.assert(clause != undefined && action != undefined);
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
            var conditions_next = _this.conditions.map(function (pair) {
                return Parameter.from(pair.condition).init();
            });
            var fork = upstream.subscribe(function (tick) {
                if (exports.DEBUG_IF)
                    console.log("If: upstream tick");
                // first, we find which animation should active, by using the conditions array
                var nextActiveOT_API = null;
                // ideally we would use find, but that is not in TS yet..
                for (var i = 0; i < _this.conditions.length && nextActiveOT_API == null; i++) {
                    if (conditions_next[i](tick.clock)) {
                        nextActiveOT_API = _this.conditions[i].action;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9PYnNlcnZhYmxlVHJhbnNmb3JtZXIudHMiXSwibmFtZXMiOlsiQmFzZVRpY2siLCJCYXNlVGljay5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jb25zdHJ1Y3RvciIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jcmVhdGUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIucGlwZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci50aGVuIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmxvb3AiLCJhdHRhY2hMb29wIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmVtaXQiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIucGFyYWxsZWwiLCJkZWNyZW1lbnRBY3RpdmUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuY2xvbmUiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIudGFrZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5kcmF3IiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmlmIiwiY29tYmluZSIsIkNvbmRpdGlvbkFjdGlvblBhaXIiLCJDb25kaXRpb25BY3Rpb25QYWlyLmNvbnN0cnVjdG9yIiwiSWYiLCJJZi5jb25zdHJ1Y3RvciIsIklmLmVsaWYiLCJJZi5lbmRpZiIsIklmLmVsc2UiXSwibWFwcGluZ3MiOiI7OztBQUNBLElBQVksRUFBRSxXQUFNLElBQ3BCLENBQUMsQ0FEdUI7QUFDeEIsSUFBWSxLQUFLLFdBQU0sU0FDdkIsQ0FBQyxDQUQrQjtBQUNoQyxJQUFZLFNBQVMsV0FBTSxhQUMzQixDQUFDLENBRHVDO0FBQ3hDLGlCQUFjLFNBRWQsQ0FBQyxFQUZzQjtBQUVaLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLGdCQUFRLEdBQUcsS0FBSyxDQUFDO0FBQ2pCLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLHNCQUFjLEdBQUcsS0FBSyxDQUFDO0FBQ3ZC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R0EsSUFBSUEsT0FBQUEsTUFBTUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBbkJBLENBQW1CQSxFQUMxQkEsY0FBTUEsT0FBQUEsTUFBTUEsQ0FBQ0EsV0FBV0EsRUFBRUEsRUFBcEJBLENBQW9CQSxDQUM3QkEsQ0FBQ0E7WUFFRkEsTUFBTUEsQ0FBQ0EsVUFBVUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBQUEsQ0FBQ0EsSUFBS0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsZ0JBQVFBLENBQUNBO2dCQUFDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxxQkFBcUJBLENBQUNBLENBQUFBLENBQUFBLENBQUNBLENBQUNBLENBQUNBO1FBQ25GQSxDQUFDQSxDQUNKQSxDQUFDQSxDQUFBQTtJQUNOQSxDQUFDQTtJQUNMSixTQUFDQTtBQUFEQSxDQW5FQSxBQW1FQ0EsSUFBQTtBQW5FWSxVQUFFLEtBbUVkLENBQUEiLCJmaWxlIjoic3JjL09ic2VydmFibGVUcmFuc2Zvcm1lci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
