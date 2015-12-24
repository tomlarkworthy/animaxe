var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var Rx = require("rx");
var types = require("./types");
var zip = require("./zip");
var Parameter = require("./Parameter");
__export(require("./types"));
exports.DEBUG_LOOP = true;
exports.DEBUG_THEN = true;
exports.DEBUG_IF = false;
exports.DEBUG_EMIT = false;
exports.DEBUG_PARALLEL = false;
exports.DEBUG_EVENTS = false;
exports.DEBUG = true;
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
        return new ObservableTransformer(attach);
    };
    /**
     * Creates an animation that is at most n frames from 'this'.
     */
    ObservableTransformer.prototype.take = function (frames) {
        var self = this;
        if (exports.DEBUG)
            console.log("take: build");
        return this.create(function (upstream) { return self.attach(upstream).take(frames); });
    };
    /**
     * map the stream of values to a new parameter
     */
    ObservableTransformer.prototype.mapObservable = function (fn) {
        var self = this;
        return new ObservableTransformer(function (upstream) { return fn(self.attach(upstream)); });
    };
    /**
     * map the value of 'this' to a new parameter
     */
    ObservableTransformer.prototype.mapValue = function (fn) {
        return this.mapObservable(function (upstream) { return upstream.map(fn); });
    };
    /**
     * combine with other transformers with a common type of input.
     * All are given the same input, and their simulataneous outputs are passed to a
     * combiner function, which compute the final output.
     */
    ObservableTransformer.prototype.combineMany = function (combinerBuilder) {
        var _this = this;
        var others = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            others[_i - 1] = arguments[_i];
        }
        return new ObservableTransformer(function (upstream) {
            // join upstream with parameter
            console.log("combine: attach", others);
            var fork = new Rx.Subject();
            upstream.subscribe(fork);
            // we link all concurrent OTs in the others array to the fork, skipping null or undefined values
            var args = others.reduce(function (acc, val) {
                if (val)
                    acc.push(val.attach(fork));
                return acc;
            }, []);
            args.unshift(_this.attach(fork)); // put output of self as first param in combiner
            args.unshift(combinerBuilder()); // build effect handler for zip
            return zip.zip.apply(null, args);
        });
    };
    /**
     * Combine with another transformer with the same type of input.
     * Both are given the same input, and their simulataneous outputs are passed to a
     * combiner function, which compute the final output.
     */
    ObservableTransformer.prototype.combine = function (combinerBuilder, other1, other2, other3, other4) {
        return this.combineMany(combinerBuilder, other1, other2, other3, other4);
    };
    ObservableTransformer.prototype.init = function () { throw new Error("depricated: remove this"); };
    return ObservableTransformer;
})();
exports.ObservableTransformer = ObservableTransformer;
var ChainableTransformer = (function (_super) {
    __extends(ChainableTransformer, _super);
    function ChainableTransformer(attach) {
        _super.call(this, attach);
    }
    /**
     * subclasses should override this to create another animation of the same type
     * @param attach
     */
    ChainableTransformer.prototype.create = function (attach) {
        if (attach === void 0) { attach = function (nop) { return nop; }; }
        return new ChainableTransformer(attach);
    };
    /**
     * send the downstream context of 'this' animation, as the upstream context to supplied animation.
     *
     * This allows you to chain custom animations.
     *
     * ```Ax.move(...).pipe(myOT_API());```
     */
    ChainableTransformer.prototype.pipe = function (downstream) {
        return combine(this, downstream);
    };
    /**
     * delivers upstream events to 'this' first, then when 'this' animation is finished
     * the upstream is switched to the the follower animation.
     *
     * This allows you to sequence animations temporally.
     * frame1OT_API().then(frame2OT_API).then(frame3OT_API)
     */
    ChainableTransformer.prototype.then = function (follower) {
        var self = this;
        return this.create(function (upstream) {
            return Rx.Observable.create(function (observer) {
                if (exports.DEBUG_THEN)
                    console.log("then: attach");
                var firstTurn = true;
                var first = new Rx.Subject();
                var second = new Rx.Subject();
                var firstAttach = self.attach(first.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: first to downstream");
                    observer.onNext(next);
                }, function (error) {
                    if (exports.DEBUG_THEN)
                        console.log("then: first error");
                    observer.onError(error);
                }, function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: first complete");
                    firstTurn = false; // note overall sequences is not notified
                });
                var secondAttach = follower.attach(second.subscribeOn(Rx.Scheduler.immediate)).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (exports.DEBUG_THEN)
                        console.log("then: second to downstream");
                    observer.onNext(next);
                }, function (error) {
                    if (exports.DEBUG_THEN)
                        console.log("then: second error");
                    observer.onError(error);
                }, function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: second complete");
                    observer.onCompleted(); // note overall sequences finished
                });
                var upstreamSubscription = upstream.subscribeOn(Rx.Scheduler.immediate).subscribeOn(Rx.Scheduler.immediate).subscribe(function (next) {
                    if (firstTurn) {
                        if (exports.DEBUG_THEN)
                            console.log("then: upstream to first");
                        first.onNext(next);
                    }
                    else {
                        if (exports.DEBUG_THEN)
                            console.log("then: upstream to second");
                        second.onNext(next);
                    }
                }, function (error) {
                    if (exports.DEBUG_THEN)
                        console.log("then: upstream error");
                    observer.onError(error);
                }, function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: upstream complete");
                    observer.onCompleted();
                });
                // on dispose
                return function () {
                    if (exports.DEBUG_THEN)
                        console.log("then: dispose");
                    upstreamSubscription.dispose();
                    firstAttach.dispose();
                    secondAttach.dispose();
                };
            });
        });
    };
    /**
     * Creates an animation that replays the inner animation each time the inner animation completes.
     *
     * The resultant animation is always runs forever while upstream is live. Only a single inner animation
     * plays at a time (unlike emit())
     */
    ChainableTransformer.prototype.loop = function (animation) {
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
    ChainableTransformer.prototype.emit = function (animation) {
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
    ChainableTransformer.prototype.parallel = function (animations) {
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
    ChainableTransformer.prototype.clone = function (n, animation) {
        var array = new Array(n);
        for (var i = 0; i < n; i++)
            array[i] = animation;
        return this.parallel(array);
    };
    /**
     * helper method for implementing simple animations (that don't fork the animation tree).
     * You just have to supply a function that does something with the draw tick.
     */
    ChainableTransformer.prototype.draw = function (drawFactory) {
        return this.create(function (upstream) { return upstream.tapOnNext(drawFactory()); });
    };
    ChainableTransformer.prototype.affect = function (effectBuilder, param1, param2, param3, param4) {
        return this.create(this.combine(wrapEffectToReturnTick(effectBuilder), param1, param2, param3, param4).attach);
    };
    ChainableTransformer.prototype.if = function (condition, animation) {
        return new If([new ConditionActionPair(condition, animation)], this);
    };
    return ChainableTransformer;
})(ObservableTransformer);
exports.ChainableTransformer = ChainableTransformer;
/**
 * Convert an  side effect into a tick chainable
 */
function wrapEffectToReturnTick(effectBuilder) {
    return function () {
        var effect = effectBuilder();
        return function (tick) {
            var params = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                params[_i - 1] = arguments[_i];
            }
            params.unshift(tick);
            effect.apply(null, params);
            return tick;
        };
    };
}
/**
 * Creates a new OT_API by piping the animation flow of A into B
 */
//export function combine<Tick, A extends ObservableTransformer<Tick>, B extends ObservableTransformer<Tick>>(a: A, b: B): B {
function combine(a, b) {
    return b.create(function (upstream) { return b.attach(a.attach(upstream)); });
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
