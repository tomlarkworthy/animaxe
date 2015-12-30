import * as utils from "./utils"
import * as Rx from "rx"

function falseFactory() { return false; }
function emptyArrayFactory() { return []; }
function notEmpty(x) { return x.length > 0; }
function shiftEach(x) { return x.shift(); }
function emptyAndDone(qd) { return qd[0].length == 0 && qd[1] === true; }
function notTheSame(i) {
  return function (x, j) {
    return j !== i;
  };
}
function zipArrays(arrays) {
  return arrays[0].map(function(_,i) {
      return arrays.map(function(array) { return array[i]; })
    }
  );
}
    

class ZipObservable {
  subscriptions: Rx.IDisposable[];
  constructor(public observer, public sources, public resultSelector) {     
    // console.log("ZipObservable"); 
    var n = this.sources.length;
    var done = utils.arrayInitialize(n, falseFactory);
    var q = utils.arrayInitialize(n, emptyArrayFactory);
    this.subscriptions = new Array(n);
    
    for (var i = 0; i < n; i++) {
      var source = this.sources[i]
      var subscriber = new ZipObserver(observer, i, this, q, done);
      this.subscriptions[i] = source.subscribe(
        subscriber.next.bind(subscriber),
        subscriber.error.bind(subscriber),
        subscriber.completed.bind(subscriber)
      )
    }
  }
  
  
  dispose() {
    for (var i = 0; i < this.sources.length; i++) {
      this.subscriptions[i].dispose();
    }
  }   
}

var errorObject = {value: null};
function tryCatch(fn, ctx, args) {
    try {
        return fn.apply(ctx, args);
    }
    catch(e) {
        errorObject.value = e;
        return errorObject;
    }
}

class ZipObserver {
    _o;
    _i;
    _p;
    _q;
    _d;
    constructor(o, i, p, q, d) {
      this._o = o;
      this._i = i;
      this._p = p;
      this._q = q;
      this._d = d;
    }
    
    next(x) {
      //console.log("ZipObserver: next", this);
      this._q[this._i].push(x);
      if (this._q.every(notEmpty)) {
        var queuedValues = this._q.map(shiftEach);
        var res = tryCatch(this._p.resultSelector, null, queuedValues);
        
        if (res === errorObject) {
            this._o.onError(res.value);
        } else {
            this._o.onNext(res);
            // Any done and empty => zip completed.
            if (zipArrays([this._q, this._d]).some(emptyAndDone)) {
                this._o.onCompleted();
            }
        }
      }
    };

    error(e) {
      this._o.onError(e);
    };

    completed() {
      this._d[this._i] = true; // Done...
      if (this._q[this._i].length == 0) { //  ...and empty => zip completed.
        this._o.onCompleted();
      }
    };
}  
  /**
   * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences or an array have produced an element at a corresponding index.
   * The last element in the arguments must be a function to invoke for each series of elements at corresponding indexes in the args.
   * @returns {Observable} An observable sequence containing the result of combining elements of the args using the specified result selector function.
   */
export function zip<T>(
  resultSelector: (...sourcesValues: any[]) => T,
  ...sources: Rx.Observable<any>[]): Rx.Observable<T> {
  return <Rx.Observable<T>>Rx.Observable.create(
    observer => {
      var zipper = new ZipObservable(observer, sources, resultSelector)
      return zipper.dispose.bind(zipper);
    }
  );
};
