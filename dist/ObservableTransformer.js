function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var Parameter = require("./parameter");
var Rx = require("rx");
__export(require("./types"));
exports.DEBUG_LOOP = false;
exports.DEBUG_THEN = false;
exports.DEBUG_IF = false;
exports.DEBUG_EMIT = false;
exports.DEBUG_PARALLEL = false;
exports.DEBUG_EVENTS = false;
exports.DEBUG = false;
var BaseTick = (function () {
    function BaseTick() {
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
     * The identity trasformer that leaves the pipline unchanged
     */
    ObservableTransformer.prototype.identity = function () {
        return this.create(function (x) { return x; });
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
        return this.pipe(this.create(function (upstream) { return upstream.tapOnNext(drawFactory()); }));
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
        return this.preceeding.pipe(this.else(this.preceeding.identity()));
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk9ic2VydmFibGVUcmFuc2Zvcm1lci50cyJdLCJuYW1lcyI6WyJCYXNlVGljayIsIkJhc2VUaWNrLmNvbnN0cnVjdG9yIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNvbnN0cnVjdG9yIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmNyZWF0ZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5pZGVudGl0eSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5waXBlIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLnRoZW4iLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIubG9vcCIsImF0dGFjaExvb3AiLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuZW1pdCIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5wYXJhbGxlbCIsImRlY3JlbWVudEFjdGl2ZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci5jbG9uZSIsIk9ic2VydmFibGVUcmFuc2Zvcm1lci50YWtlIiwiT2JzZXJ2YWJsZVRyYW5zZm9ybWVyLmRyYXciLCJPYnNlcnZhYmxlVHJhbnNmb3JtZXIuaWYiLCJjb21iaW5lIiwiQ29uZGl0aW9uQWN0aW9uUGFpciIsIkNvbmRpdGlvbkFjdGlvblBhaXIuY29uc3RydWN0b3IiLCJJZiIsIklmLmNvbnN0cnVjdG9yIiwiSWYuZWxpZiIsIklmLmVuZGlmIiwiSWYuZWxzZSJdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsSUFBWSxTQUFTLFdBQU0sYUFDM0IsQ0FBQyxDQUR1QztBQUN4QyxJQUFZLEVBQUUsV0FBTSxJQUNwQixDQUFDLENBRHVCO0FBR3hCLGlCQUFjLFNBRWQsQ0FBQyxFQUZzQjtBQUVaLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLGdCQUFRLEdBQUcsS0FBSyxDQUFDO0FBQ2pCLGtCQUFVLEdBQUcsS0FBSyxDQUFDO0FBQ25CLHNCQUFjLEdBQUcsS0FBSyxDQUFDO0FBQ3ZCLG9CQUFZLEdB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QVVBLENBQUNBLEdBQUdBLENBQUNBLFVBQUFBLENBQUNBLElBQUtBLEVBQUVBLENBQUNBLENBQUNBLGdCQUFRQSxDQUFDQTtnQkFBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxDQUFDQSxDQUFBQSxDQUFBQSxDQUFDQSxDQUFDQSxDQUFDQTtRQUNuRkEsQ0FBQ0EsQ0FDSkEsQ0FBQ0EsQ0FBQUE7SUFDTkEsQ0FBQ0E7SUFDTEosU0FBQ0E7QUFBREEsQ0FqRUEsQUFpRUNBLElBQUE7QUFqRVksVUFBRSxLQWlFZCxDQUFBIiwiZmlsZSI6Ik9ic2VydmFibGVUcmFuc2Zvcm1lci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIEF4IGZyb20gXCIuL2FuaW1heGVcIlxuaW1wb3J0ICogYXMgUGFyYW1ldGVyIGZyb20gXCIuL3BhcmFtZXRlclwiXG5pbXBvcnQgKiBhcyBSeCBmcm9tIFwicnhcIlxuaW1wb3J0IE9ic2VydmFibGUgPSBSeC5PYnNlcnZhYmxlO1xuaW1wb3J0ICogYXMgdHlwZXMgZnJvbSBcIi4vdHlwZXNcIlxuZXhwb3J0ICogZnJvbSBcIi4vdHlwZXNcIlxuXG5leHBvcnQgdmFyIERFQlVHX0xPT1AgPSBmYWxzZTtcbmV4cG9ydCB2YXIgREVCVUdfVEhFTiA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVR19JRiA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVR19FTUlUID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX1BBUkFMTEVMID0gZmFsc2U7XG5leHBvcnQgdmFyIERFQlVHX0VWRU5UUyA9IGZhbHNlO1xuZXhwb3J0IHZhciBERUJVRyA9IGZhbHNlO1xuXG5leHBvcnQgY2xhc3MgQmFzZVRpY2sge1xuICAgIGNsb2NrOiBudW1iZXI7XG4gICAgZHQ6IG51bWJlcjtcbiAgICBjdHg6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRDsgLy8gdG9kbyByZW1vdmVcbn1cblxuZXhwb3J0IGNsYXNzIE9ic2VydmFibGVUcmFuc2Zvcm1lcjxUaWNrIGV4dGVuZHMgQmFzZVRpY2s+IHtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBhdHRhY2g6ICh1cHN0cmVhbTogUnguT2JzZXJ2YWJsZTxUaWNrPikgPT4gUnguT2JzZXJ2YWJsZTxUaWNrPikge1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHN1YmNsYXNzZXMgc2hvdWxkIG92ZXJyaWRlIHRoaXMgdG8gY3JlYXRlIGFub3RoZXIgYW5pbWF0aW9uIG9mIHRoZSBzYW1lIHR5cGVcbiAgICAgKiBAcGFyYW0gYXR0YWNoXG4gICAgICovXG4gICAgY3JlYXRlKGF0dGFjaDogKHVwc3RyZWFtOiBSeC5PYnNlcnZhYmxlPFRpY2s+KSA9PiBSeC5PYnNlcnZhYmxlPFRpY2s+KTogdGhpcyB7XG4gICAgICAgIHJldHVybiA8dGhpcz4gbmV3IE9ic2VydmFibGVUcmFuc2Zvcm1lcjxUaWNrPihhdHRhY2gpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFRoZSBpZGVudGl0eSB0cmFzZm9ybWVyIHRoYXQgbGVhdmVzIHRoZSBwaXBsaW5lIHVuY2hhbmdlZFxuICAgICAqL1xuICAgIGlkZW50aXR5KCk6IHRoaXMge1xuICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGUoeCA9PiB4KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIHNlbmQgdGhlIGRvd25zdHJlYW0gY29udGV4dCBvZiAndGhpcycgYW5pbWF0aW9uLCBhcyB0aGUgdXBzdHJlYW0gY29udGV4dCB0byBzdXBwbGllZCBhbmltYXRpb24uXG4gICAgICpcbiAgICAgKiBUaGlzIGFsbG93cyB5b3UgdG8gY2hhaW4gY3VzdG9tIGFuaW1hdGlvbnMuXG4gICAgICpcbiAgICAgKiBgYGBBeC5tb3ZlKC4uLikucGlwZShteU9UX0FQSSgpKTtgYGBcbiAgICAgKi9cbiAgICBwaXBlPE9UX0FQSSBleHRlbmRzIE9ic2VydmFibGVUcmFuc2Zvcm1lcjxUaWNrPj4oZG93bnN0cmVhbTogT1RfQVBJKTogT1RfQVBJIHtcbiAgICAgICAgcmV0dXJuIGNvbWJpbmU8VGljaywgT2JzZXJ2YWJsZVRyYW5zZm9ybWVyPFRpY2s+LCBPVF9BUEk+KHRoaXMsIGRvd25zdHJlYW0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGRlbGl2ZXJzIHVwc3RyZWFtIGV2ZW50cyB0byAndGhpcycgZmlyc3QsIHRoZW4gd2hlbiAndGhpcycgYW5pbWF0aW9uIGlzIGZpbmlzaGVkXG4gICAgICogdGhlIHVwc3RyZWFtIGlzIHN3aXRjaGVkIHRvIHRoZSB0aGUgZm9sbG93ZXIgYW5pbWF0aW9uLlxuICAgICAqXG4gICAgICogVGhpcyBhbGxvd3MgeW91IHRvIHNlcXVlbmNlIGFuaW1hdGlvbnMgdGVtcG9yYWxseS5cbiAgICAgKiBmcmFtZTFPVF9BUEkoKS50aGVuKGZyYW1lMk9UX0FQSSkudGhlbihmcmFtZTNPVF9BUEkpXG4gICAgICovXG4gICAgdGhlbihmb2xsb3dlcjogT2JzZXJ2YWJsZVRyYW5zZm9ybWVyPFRpY2s+KTogdGhpcyB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGUoZnVuY3Rpb24gKHByZXY6IFJ4Lk9ic2VydmFibGU8VGljaz4pIDogUnguT2JzZXJ2YWJsZTxUaWNrPiB7XG4gICAgICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8VGljaz4oZnVuY3Rpb24gKG9ic2VydmVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0ICA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RUdXJuID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50ID0gZmlyc3Q7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogYXR0YWNoXCIpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHNlY29uZEF0dGFjaCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RBdHRhY2ggID0gc2VsZi5hdHRhY2goZmlyc3Quc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24obmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1RIRU4pIGNvbnNvbGUubG9nKFwidGhlbjogZmlyc3QgdG8gZG93bnN0cmVhbVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uTmV4dChuZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25FcnJvci5iaW5kKG9ic2VydmVyKSxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IGZpcnN0IGNvbXBsZXRlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RUdXJuID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaCA9IGZvbGxvd2VyLmF0dGFjaChzZWNvbmQuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkpLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLmJpbmQob2JzZXJ2ZXIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19USEVOKSBjb25zb2xlLmxvZyhcInRoZW46IHNlY29uZCBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB2YXIgcHJldlN1YnNjcmlwdGlvbiA9IHByZXYuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSB0byBmaXJzdCBPUiBzZWNvbmRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlyc3RUdXJuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3Qub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWNvbmQub25OZXh0KG5leHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiB1cHN0cmVhbSBjb21wbGV0ZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ic2VydmVyLm9uQ29tcGxldGVkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIC8vIG9uIGRpc3Bvc2VcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfVEhFTikgY29uc29sZS5sb2coXCJ0aGVuOiBkaXNwb3NlclwiKTtcbiAgICAgICAgICAgICAgICAgICAgcHJldlN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0QXR0YWNoLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlY29uZEF0dGFjaClcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlY29uZEF0dGFjaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pLnN1YnNjcmliZU9uKFJ4LlNjaGVkdWxlci5pbW1lZGlhdGUpOyAvL3RvZG8gcmVtb3ZlIHN1YnNjcmliZU9uc1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhbiBhbmltYXRpb24gdGhhdCByZXBsYXlzIHRoZSBpbm5lciBhbmltYXRpb24gZWFjaCB0aW1lIHRoZSBpbm5lciBhbmltYXRpb24gY29tcGxldGVzLlxuICAgICAqXG4gICAgICogVGhlIHJlc3VsdGFudCBhbmltYXRpb24gaXMgYWx3YXlzIHJ1bnMgZm9yZXZlciB3aGlsZSB1cHN0cmVhbSBpcyBsaXZlLiBPbmx5IGEgc2luZ2xlIGlubmVyIGFuaW1hdGlvblxuICAgICAqIHBsYXlzIGF0IGEgdGltZSAodW5saWtlIGVtaXQoKSlcbiAgICAgKi9cbiAgICBsb29wKGFuaW1hdGlvbjogT2JzZXJ2YWJsZVRyYW5zZm9ybWVyPFRpY2s+KTogdGhpcyB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZShmdW5jdGlvbiAocHJldjogUnguT2JzZXJ2YWJsZTxUaWNrPik6IFJ4Lk9ic2VydmFibGU8VGljaz4ge1xuICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGluaXRpYWxpemluZ1wiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gUnguT2JzZXJ2YWJsZS5jcmVhdGU8VGljaz4oZnVuY3Rpb24ob2JzZXJ2ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogY3JlYXRlIG5ldyBsb29wXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9vcFN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvb3BTdWJzY3JpcHRpb24gPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdCA9IDA7XG5cblxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBhdHRhY2hMb29wKG5leHQpIHsgLy90b2RvIEkgZmVlbCBsaWtlIHdlIGNhbiByZW1vdmUgYSBsZXZlbCBmcm9tIHRoaXMgc29tZWhvd1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogbmV3IGlubmVyIGxvb3Agc3RhcnRpbmcgYXRcIiwgdCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb29wU3Vic2NyaXB0aW9uID0gYW5pbWF0aW9uLmF0dGFjaChsb29wU3RhcnQpLnN1YnNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHBvc3QtaW5uZXIgbG9vcCB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbk5leHQobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBsb29wIGVyciB0byBkb3duc3RyZWFtXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0xPT1ApIGNvbnNvbGUubG9nKFwibG9vcDogcG9zdC1pbm5lciBjb21wbGV0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvb3BTdGFydCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5ldyBpbm5lciBsb29wIGZpbmlzaGVkIGNvbnN0cnVjdGlvblwiKVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcHJldi5zdWJzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihuZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxvb3BTdGFydCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IG5vIGlubmVyIGxvb3BcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dGFjaExvb3AobmV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHVwc3RyZWFtIHRvIGlubmVyIGxvb3BcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9vcFN0YXJ0Lm9uTmV4dChuZXh0KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQgKz0gbmV4dC5kdDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IHVwc3RyZWFtIGVycm9yIHRvIGRvd25zdHJlYW1cIiwgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5vbkVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIub25Db21wbGV0ZWQuYmluZChvYnNlcnZlcilcbiAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2Rpc3Bvc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19MT09QKSBjb25zb2xlLmxvZyhcImxvb3A6IGRpc3Bvc2VcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobG9vcFN0YXJ0KSBsb29wU3RhcnQuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkuc3Vic2NyaWJlT24oUnguU2NoZWR1bGVyLmltbWVkaWF0ZSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIGFuaW1hdGlvbiB0aGF0IHNlcXVlbmNlcyB0aGUgaW5uZXIgYW5pbWF0aW9uIGV2ZXJ5IHRpbWUgZnJhbWUuXG4gICAgICpcbiAgICAgKiBUaGUgcmVzdWx0YW50IGFuaW1hdGlvbiBpcyBhbHdheXMgcnVucyBmb3JldmVyIHdoaWxlIHVwc3RyZWFtIGlzIGxpdmUuIE11bHRpcGxlIGlubmVyIGFuaW1hdGlvbnNcbiAgICAgKiBjYW4gYmUgcGxheWluZyBhdCB0aGUgc2FtZSB0aW1lICh1bmxpa2UgbG9vcClcbiAgICAgKi9cbiAgICBlbWl0KGFuaW1hdGlvbjogT2JzZXJ2YWJsZVRyYW5zZm9ybWVyPFRpY2s+KTogdGhpcyB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUodGhpcy5jcmVhdGUoZnVuY3Rpb24gKHByZXY6IFJ4Lk9ic2VydmFibGU8VGljaz4pOiBSeC5PYnNlcnZhYmxlPFRpY2s+IHtcbiAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcImVtaXQ6IGluaXRpYWxpemluZ1wiKTtcbiAgICAgICAgICAgIHZhciBhdHRhY2hQb2ludCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgICAgIHJldHVybiBwcmV2LnRhcE9uTmV4dChmdW5jdGlvbih0aWNrOiBUaWNrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19FTUlUKSBjb25zb2xlLmxvZyhcImVtaXQ6IGVtbWl0dGluZ1wiLCBhbmltYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICBhbmltYXRpb24uYXR0YWNoKGF0dGFjaFBvaW50KS5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgICAgICAgYXR0YWNoUG9pbnQub25OZXh0KHRpY2spO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQbGF5cyBhbGwgdGhlIGlubmVyIGFuaW1hdGlvbnMgYXQgdGhlIHNhbWUgdGltZS4gUGFyYWxsZWwgY29tcGxldGVzIHdoZW4gYWxsIGlubmVyIGFuaW1hdGlvbnMgYXJlIG92ZXIuXG4gICAgICpcbiAgICAgKiBUaGUgY2FudmFzIHN0YXRlcyBhcmUgcmVzdG9yZWQgYmVmb3JlIGVhY2ggZm9yaywgc28gc3R5bGluZyBhbmQgdHJhbnNmb3JtcyBvZiBkaWZmZXJlbnQgY2hpbGQgYW5pbWF0aW9ucyBkbyBub3RcbiAgICAgKiBpbnRlcmFjdCAoYWx0aG91Z2ggb2JzdmlvdXNseSB0aGUgcGl4ZWwgYnVmZmVyIGlzIGFmZmVjdGVkIGJ5IGVhY2ggYW5pbWF0aW9uKVxuICAgICAqL1xuICAgIHBhcmFsbGVsKGFuaW1hdGlvbnM6IE9ic2VydmFibGVUcmFuc2Zvcm1lcjxUaWNrPltdKTogdGhpcyB7XG4gICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZShmdW5jdGlvbiAocHJldjogUnguT2JzZXJ2YWJsZTxUaWNrPik6IFJ4Lk9ic2VydmFibGU8VGljaz4ge1xuICAgICAgICAgICAgaWYgKERFQlVHX1BBUkFMTEVMKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBpbml0aWFsaXppbmdcIik7XG5cbiAgICAgICAgICAgIHZhciBhY3RpdmVPVF9BUElzID0gMDtcbiAgICAgICAgICAgIHZhciBhdHRhY2hQb2ludCA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGRlY3JlbWVudEFjdGl2ZShlcnIgPzogYW55KSB7XG4gICAgICAgICAgICAgICAgaWYgKERFQlVHX1BBUkFMTEVMKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBkZWNyZW1lbnQgYWN0aXZlXCIpO1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIGNvbnNvbGUubG9nKFwicGFyYWxsZWwgZXJyb3I6XCIsIGVycik7XG4gICAgICAgICAgICAgICAgYWN0aXZlT1RfQVBJcyAtLTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYW5pbWF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uKGFuaW1hdGlvbjogT2JzZXJ2YWJsZVRyYW5zZm9ybWVyPFRpY2s+KSB7XG4gICAgICAgICAgICAgICAgYWN0aXZlT1RfQVBJcysrO1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbi5hdHRhY2goYXR0YWNoUG9pbnQudGFwT25OZXh0KHRpY2sgPT4gdGljay5jdHguc2F2ZSgpKSkuc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGljayA9PiB0aWNrLmN0eC5yZXN0b3JlKCksXG4gICAgICAgICAgICAgICAgICAgIGRlY3JlbWVudEFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVjcmVtZW50QWN0aXZlKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBwcmV2LnRha2VXaGlsZSgoKSA9PiBhY3RpdmVPVF9BUElzID4gMCkudGFwT25OZXh0KGZ1bmN0aW9uKHRpY2s6IFRpY2spIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX1BBUkFMTEVMKSBjb25zb2xlLmxvZyhcInBhcmFsbGVsOiBlbWl0dGluZywgYW5pbWF0aW9uc1wiLCB0aWNrKTtcbiAgICAgICAgICAgICAgICAgICAgYXR0YWNoUG9pbnQub25OZXh0KHRpY2spO1xuICAgICAgICAgICAgICAgICAgICBpZiAoREVCVUdfUEFSQUxMRUwpIGNvbnNvbGUubG9nKFwicGFyYWxsZWw6IGVtaXR0aW5nIGZpbmlzaGVkXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNlcXVlbmNlcyBuIGNvcGllcyBvZiB0aGUgaW5uZXIgYW5pbWF0aW9uLiBDbG9uZSBjb21wbGV0ZXMgd2hlbiBhbGwgaW5uZXIgYW5pbWF0aW9ucyBhcmUgb3Zlci5cbiAgICAgKi9cbiAgICBjbG9uZShuOiBudW1iZXIsIGFuaW1hdGlvbjogT2JzZXJ2YWJsZVRyYW5zZm9ybWVyPFRpY2s+KTogdGhpcyB7XG4gICAgICAgIGxldCBhcnJheSA9IG5ldyBBcnJheShuKTtcbiAgICAgICAgZm9yIChsZXQgaT0wOyBpPG47IGkrKykgYXJyYXlbaV0gPSBhbmltYXRpb247XG4gICAgICAgIHJldHVybiB0aGlzLnBhcmFsbGVsKGFycmF5KTtcblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW4gYW5pbWF0aW9uIHRoYXQgaXMgYXQgbW9zdCBuIGZyYW1lcyBmcm9tICd0aGlzJy5cbiAgICAgKi9cbiAgICB0YWtlKGZyYW1lczogbnVtYmVyKTogdGhpcyB7XG4gICAgICAgIHJldHVybiB0aGlzLnBpcGUoXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZSgocHJldjogT2JzZXJ2YWJsZTxUaWNrPikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChERUJVRykgY29uc29sZS5sb2coXCJ0YWtlOiBhdHRhY2hcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByZXYudGFrZShmcmFtZXMpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBoZWxwZXIgbWV0aG9kIGZvciBpbXBsZW1lbnRpbmcgc2ltcGxlIGFuaW1hdGlvbnMgKHRoYXQgZG9uJ3QgZm9yayB0aGUgYW5pbWF0aW9uIHRyZWUpLlxuICAgICAqIFlvdSBqdXN0IGhhdmUgdG8gc3VwcGx5IGEgZnVuY3Rpb24gdGhhdCBkb2VzIHNvbWV0aGluZyB3aXRoIHRoZSBkcmF3IHRpY2suXG4gICAgICovXG4gICAgZHJhdyhkcmF3RmFjdG9yeTogKCkgPT4gKCh0aWNrOiBUaWNrKSA9PiB2b2lkKSk6IHRoaXMge1xuICAgICAgICByZXR1cm4gdGhpcy5waXBlKHRoaXMuY3JlYXRlKCh1cHN0cmVhbSkgPT4gdXBzdHJlYW0udGFwT25OZXh0KGRyYXdGYWN0b3J5KCkpKSk7XG4gICAgfVxuXG4gICAgaWYoY29uZGl0aW9uOiB0eXBlcy5Cb29sZWFuQXJnLCBhbmltYXRpb246IE9ic2VydmFibGVUcmFuc2Zvcm1lcjxUaWNrPik6IElmPFRpY2ssIHRoaXM+e1xuICAgICAgICByZXR1cm4gbmV3IElmPFRpY2ssIHRoaXM+KFtuZXcgQ29uZGl0aW9uQWN0aW9uUGFpcihjb25kaXRpb24sIGFuaW1hdGlvbildLCB0aGlzKTtcbiAgICB9XG59XG5cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IE9UX0FQSSBieSBwaXBpbmcgdGhlIGFuaW1hdGlvbiBmbG93IG9mIEEgaW50byBCXG4gKi9cbi8vZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmU8VGljaywgQSBleHRlbmRzIE9ic2VydmFibGVUcmFuc2Zvcm1lcjxUaWNrPiwgQiBleHRlbmRzIE9ic2VydmFibGVUcmFuc2Zvcm1lcjxUaWNrPj4oYTogQSwgYjogQik6IEIge1xuZXhwb3J0IGZ1bmN0aW9uIGNvbWJpbmU8VGljaywgQSBleHRlbmRzIE9ic2VydmFibGVUcmFuc2Zvcm1lcjxhbnk+LCBCIGV4dGVuZHMgT2JzZXJ2YWJsZVRyYW5zZm9ybWVyPGFueT4+KGE6IEEsIGI6IEIpOiBCIHtcbiAgICB2YXIgYl9wcmV2X2F0dGFjaCA9IGIuYXR0YWNoO1xuICAgIGIuYXR0YWNoID1cbiAgICAgICAgKHVwc3RyZWFtOiBSeC5PYnNlcnZhYmxlPFRpY2s+KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gYl9wcmV2X2F0dGFjaChhLmF0dGFjaCh1cHN0cmVhbSkpO1xuICAgICAgICB9O1xuICAgIHJldHVybiBiO1xufVxuXG5cbmV4cG9ydCBjbGFzcyBDb25kaXRpb25BY3Rpb25QYWlyPFRpY2sgZXh0ZW5kcyBCYXNlVGljaz4ge1xuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBjb25kaXRpb246IHR5cGVzLkJvb2xlYW5BcmcsIHB1YmxpYyBhY3Rpb246IE9ic2VydmFibGVUcmFuc2Zvcm1lcjxUaWNrPil7fVxufTtcblxuXG4vKipcbiAqIEFuIGlmICgpIGVsaWYoKSBlbHNlKCkgYmxvY2suIFRoZSBzZW1hbnRpY3MgYXJlIHN1YnRsZSB3aGVuIGNvbnNpZGVyaW5nIGFuaW1hdGlvbiBsaWZlY3ljbGVzLlxuICogT25lIGludGVwcmV0YXRpb24gaXMgdGhhdCBhbiBhY3Rpb24gaXMgdHJpZ2dlcmVkIHVudGlsIGNvbXBsZXRpb24sIGJlZm9yZSByZWV2YWx1YXRpbmcgdGhlIGNvbmRpdGlvbnMuIEhvd2V2ZXIsXG4gKiBhcyBtYW55IGFuaW1hdGlvbnMgYXJlIGluZmluaXRlIGluIGxlbmd0aCwgdGhpcyB3b3VsZCBvbmx5IGV2ZXIgc2VsZWN0IGEgc2luZ2xlIGFuaW1hdGlvbiBwYXRoLlxuICogU28gcmF0aGVyLCB0aGlzIGJsb2NrIHJlZXZhbHVhdGVzIHRoZSBjb25kaXRpb24gZXZlcnkgbWVzc2FnZS4gSWYgYW4gYWN0aW9uIGNvbXBsZXRlcywgdGhlIGJsb2NrIHBhc3NlcyBvbiB0aGUgY29tcGxldGlvbixcbiAqIGFuZCB0aGUgd2hvbGUgY2xhdXNlIGlzIG92ZXIsIHNvIHN1cnJvdW5kIGFjdGlvbiBhbmltYXRpb25zIHdpdGggbG9vcCBpZiB5b3UgZG9uJ3Qgd2FudCB0aGF0IGJlaGF2aW91ci5cbiAqIFdoZW5ldmVyIHRoZSBhY3RpdmUgY2xhdXNlIGNoYW5nZXMsIHRoZSBuZXcgYWN0aXZlIGFuaW1hdGlvbiBpcyByZWluaXRpYWxpc2VkLlxuICovXG5leHBvcnQgY2xhc3MgSWY8VGljayBleHRlbmRzIEJhc2VUaWNrLCBPVF9BUEkgZXh0ZW5kcyBPYnNlcnZhYmxlVHJhbnNmb3JtZXI8YW55Pj4ge1xuICAgIGNvbnN0cnVjdG9yKFxuICAgICAgICBwdWJsaWMgY29uZGl0aW9uczogQ29uZGl0aW9uQWN0aW9uUGFpcjxUaWNrPltdLFxuICAgICAgICBwdWJsaWMgcHJlY2VlZGluZzogT1RfQVBJKSB7XG4gICAgfVxuXG4gICAgZWxpZihjbGF1c2U6IHR5cGVzLkJvb2xlYW5BcmcsIGFjdGlvbjogT2JzZXJ2YWJsZVRyYW5zZm9ybWVyPFRpY2s+KTogdGhpcyB7XG4gICAgICAgIHRoaXMuY29uZGl0aW9ucy5wdXNoKG5ldyBDb25kaXRpb25BY3Rpb25QYWlyPFRpY2s+KGNsYXVzZSwgYWN0aW9uKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGVuZGlmKCk6IE9UX0FQSSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByZWNlZWRpbmcucGlwZSh0aGlzLmVsc2UodGhpcy5wcmVjZWVkaW5nLmlkZW50aXR5KCkpKTtcbiAgICB9XG5cbiAgICBlbHNlKG90aGVyd2lzZTogT2JzZXJ2YWJsZVRyYW5zZm9ybWVyPFRpY2s+KTogT1RfQVBJIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHJlY2VlZGluZy5waXBlKHRoaXMucHJlY2VlZGluZy5jcmVhdGUoXG4gICAgICAgICAgICAodXBzdHJlYW06IFJ4Lk9ic2VydmFibGU8VGljaz4pID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoREVCVUdfSUYpIGNvbnNvbGUubG9nKFwiSWY6IGF0dGFjaFwiKTtcbiAgICAgICAgICAgICAgICB2YXIgZG93bnN0cmVhbSA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG4gICAgICAgICAgICAgICAgdmFyIGFuY2hvciA9IG5ldyBSeC5TdWJqZWN0PFRpY2s+KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudE9UX0FQSSA9IG90aGVyd2lzZTtcbiAgICAgICAgICAgICAgICB2YXIgYWN0aXZlU3Vic2NyaXB0aW9uID0gb3RoZXJ3aXNlLmF0dGFjaChhbmNob3IpLnN1YnNjcmliZShkb3duc3RyZWFtKTtcblxuXG4gICAgICAgICAgICAgICAgLy8gd2UgaW5pdGlhbGlzZSBhbGwgdGhlIGNvbmRpdGlvbiBwYXJhbWV0ZXJzXG4gICAgICAgICAgICAgICAgdmFyIGNvbmRpdGlvbnNfbmV4dCA9IHRoaXMuY29uZGl0aW9ucy5tYXAoXG4gICAgICAgICAgICAgICAgICAgIChjb25kaXRpb246IENvbmRpdGlvbkFjdGlvblBhaXI8VGljaz4pID0+IFBhcmFtZXRlci5mcm9tKGNvbmRpdGlvblswXSkuaW5pdCgpXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIHZhciBmb3JrID0gdXBzdHJlYW0uc3Vic2NyaWJlKFxuICAgICAgICAgICAgICAgICAgICAodGljazogVGljaykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKERFQlVHX0lGKSBjb25zb2xlLmxvZyhcIklmOiB1cHN0cmVhbSB0aWNrXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmlyc3QsIHdlIGZpbmQgd2hpY2ggYW5pbWF0aW9uIHNob3VsZCBhY3RpdmUsIGJ5IHVzaW5nIHRoZSBjb25kaXRpb25zIGFycmF5XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbmV4dEFjdGl2ZU9UX0FQSSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZGVhbGx5IHdlIHdvdWxkIHVzZSBmaW5kLCBidXQgdGhhdCBpcyBub3QgaW4gVFMgeWV0Li5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwIDtpIDwgdGhpcy5jb25kaXRpb25zLmxlbmd0aCAmJiBuZXh0QWN0aXZlT1RfQVBJID09IG51bGw7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb25kaXRpb25zX25leHRbaV0odGljay5jbG9jaykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dEFjdGl2ZU9UX0FQSSA9IHRoaXMuY29uZGl0aW9uc1tpXVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dEFjdGl2ZU9UX0FQSSA9PSBudWxsKSBuZXh0QWN0aXZlT1RfQVBJID0gb3RoZXJ3aXNlO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNlY29uZCwgd2Ugc2VlIGlmIHRoaXMgaXMgdGhlIHNhbWUgYXMgdGhlIGN1cnJlbnQgYW5pbWF0aW9uLCBvciB3aGV0aGVyIHdlIGhhdmUgc3dpdGNoZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXh0QWN0aXZlT1RfQVBJICE9IGN1cnJlbnRPVF9BUEkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIGEgbmV3IGFuaW1hdGlvbiBiZWluZyBzZXF1ZW5jZWQsIGNhbmNlbCB0aGUgb2xkIG9uZSBhbmQgYWRkIGEgbmV3IG9uZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChERUJVR19JRikgY29uc29sZS5sb2coXCJJZjogbmV3IHN1YnNjcmlwdGlvblwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aXZlU3Vic2NyaXB0aW9uICE9IG51bGwpIGFjdGl2ZVN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlU3Vic2NyaXB0aW9uID0gbmV4dEFjdGl2ZU9UX0FQSS5hdHRhY2goYW5jaG9yKS5zdWJzY3JpYmUoZG93bnN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudE9UX0FQSSA9IG5leHRBY3RpdmVPVF9BUEk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vd2UgZG9uJ3QgbmVlZCB0byBkbyBhbnl0aGluZyBiZWN1YXNlIHRoZSBzdWJzY3JpcHRpb24gaXMgYWxyZWFkeSBzdHJlYW0gZG93bnN0cmVtXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmNob3Iub25OZXh0KHRpY2spO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBlcnIgPT4gYW5jaG9yLm9uRXJyb3IoZXJyKSxcbiAgICAgICAgICAgICAgICAgICAgKCkgPT4gYW5jaG9yLm9uQ29tcGxldGVkKClcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvd25zdHJlYW0udGFwKHggPT4ge2lmIChERUJVR19JRikgY29uc29sZS5sb2coXCJJZjogZG93bnN0cmVhbSB0aWNrXCIpfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICkpXG4gICAgfVxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
