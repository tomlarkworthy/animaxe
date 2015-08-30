/// <reference path="../node_modules/Rx/ts/Rx.all.d.ts" />
import Rx  = require('rx');

/**
 * points in 2D space in a certain time
 */
type Xyt = [number, number, number];
type Xy = [number, number];

/**
 * drawing context for animations
 */
type Anchor = Rx.Subject<CanvasRenderingContext2D>;
type Animation = Rx.Disposable;

var anchor:Anchor = new Rx.Subject<CanvasRenderingContext2D>();


var animation:Animation = anchor.
    take(1) //one frame only
    .map(function (ctx:CanvasRenderingContext2D) {
        ctx.lineTo(0, 0)
    }) //draws a dot
    .subscribe(); //when take completes, or an error happens, so the subscription is disposed


/**
 * problem with this is that it doesn't chain well
 * @param anchor
 * @returns {any}
 */
var drawDot = function (anchor:Anchor):Animation {
    return anchor
        .take(1) //one frame only
        .map(function (ctx:CanvasRenderingContext2D) {
            ctx.lineTo(0, 0)
        }) //draws a dot
        .subscribe();
};

//new DrawDot().attach
var renderer: Anchor;


var sequence = function (a1:(anchor:Anchor) => Animation, a2:(anchor:Anchor) => Animation, anchor):Animation {

    // first we want to a1 to consumer events from anchor,
    // then when a1 finishes, we want a2 to connsume the events,
    // finally when a2 finishes, we want our animation to finish
    var firstAnchor = new Rx.Subject<CanvasRenderingContext2D>();
    var firstAnimation = a1(firstAnchor);
    var secondAnchor = new Rx.Subject<CanvasRenderingContext2D>();
    var secondAnimation = a1(firstAnchor);

    var first:boolean = true;
    var out = anchor.subscribe(
        function (x) {
            console.log('Next: %s', x);
            if (first) {
                firstAnchor.onNext(x);
                first = !firstAnimation.isDisposed;
            } else {
                secondAnchor.onNext(x);
                if (secondAnimation.isDisposed) out.dispose();
            }
        },
        function (err) {
            console.log('Error: %s', err);
        },
        function () {
            firstAnimation.dispose();
            secondAnimation.dispose();
        }
    );
    return out;

};




var drawDot2 = function (anchor:Anchor):Rx.Observable<CanvasRenderingContext2D> {
    return anchor
        .take(1) //one frame only
        .map(function (ctx:CanvasRenderingContext2D) {
            ctx.lineTo(0, 0);
            return ctx;
        })
};

var sequence2 = function (a1:(anchor:Anchor) => Anchor, a2:(anchor:Anchor) => Anchor, anchor): Rx.Observable<CanvasRenderingContext2D> {

    return Rx.Observable.concat(a1, a2);
};


type Timeline = Rx.Observable<any>;
type Xyline = Rx.Observable<Xy>;
type Xytline = Rx.Observable<Xyt>;
//type Animation = Rx.Subject<CanvasRenderingContext2D>;


/** HELPERS **/

function gridVisitor(x1:Xy, x2:Xy, visit:(p:Xy) => void) {
    for (var x = x1[0]; x < x2[0]; x++)
        for (var y = x1[1]; y < x2[1]; y++)
            visit([x, y]);
)
}

