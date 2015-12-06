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
  constructor(public observer, public sources, public resultSelector) {  
    var n = this.sources.length,
        subscriptions = new Array(n),
        done = utils.arrayInitialize(n, falseFactory),
        q = utils.arrayInitialize(n, emptyArrayFactory);

    for (var i = 0; i < n; i++) {
      var source = this.sources[i]
      subscriptions[i] = source.subscribe(new ZipObserver(observer, i, this, q, done))
    }
  }
  
  
  dispose() {
    for (var i = 0; i < this.sources.length; i++) {
      subscriptions[i].dispose();
    }
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
      this._q[this._i].push(x);
      if (this._q.every(notEmpty)) {
        var queuedValues = this._q.map(shiftEach);
        try {
          var res = this._p.resultSelector(queuedValues);
          this._o.onNext(res);
        
          // Any done and empty => zip completed.
          if (zipArrays([this._q, this._d]).some(emptyAndDone)) {
            this._o.onCompleted();
          }
        
        } catch (err) {
          this._o.onError(err);
          return;
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

/*
    ZipObservable.prototype.subscribeCore = function(observer) {
      var n = this._s.length,
          subscriptions = new Array(n),
          done = arrayInitialize(n, falseFactory),
          q = arrayInitialize(n, emptyArrayFactory);

      for (var i = 0; i < n; i++) {
        var source = this._s[i], sad = new SingleAssignmentDisposable();
        subscriptions[i] = sad;
        isPromise(source) && (source = observableFromPromise(source));
        sad.setDisposable(source.subscribe(new ZipObserver(observer, i, this, q, done)));
      }

      return new NAryDisposable(subscriptions);
    };

    return ZipObservable;
  }(ObservableBase));*/
/*
  var ZipObserver = (function (__super__) {
    inherits(ZipObserver, __super__);
    function ZipObserver(o, i, p, q, d) {
      this._o = o;
      this._i = i;
      this._p = p;
      this._q = q;
      this._d = d;
      __super__.call(this);
    }

    function notEmpty(x) { return x.length > 0; }
    function shiftEach(x) { return x.shift(); }
    function emptyAndDone(qd) { return qd[0].length == 0 && qd[1] === true; }
    
    function notTheSame(i) {
      return function (x, j) {
        return j !== i;
      };
    }
    function zip(arrays) {
      return arrays[0].map(function(_,i) {
          return arrays.map(function(array) { return array[i]; })
        }
      );
    }

    ZipObserver.prototype.next = function (x) {
      this._q[this._i].push(x);
      if (this._q.every(notEmpty)) {
        var queuedValues = this._q.map(shiftEach);
        var res = tryCatch(this._p._cb).apply(null, queuedValues);
        if (res === errorObj) { return this._o.onError(res.e); }
        this._o.onNext(res);
        
        // Any done and empty => zip completed.
        if (zip([this._q, this._d]).some(emptyAndDone)) {
          this._o.onCompleted();
        }
      }
    };

    ZipObserver.prototype.error = function (e) {
      this._o.onError(e);
    };

    ZipObserver.prototype.completed = function () {
      this._d[this._i] = true; // Done...
      if (this._q[this._i].length == 0) { //  ...and empty => zip completed.
        this._o.onCompleted();
      }
    };

    return ZipObserver;
  }*/
  
  /**
   * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences or an array have produced an element at a corresponding index.
   * The last element in the arguments must be a function to invoke for each series of elements at corresponding indexes in the args.
   * @returns {Observable} An observable sequence containing the result of combining elements of the args using the specified result selector function.
   */
export function zip<T>(sources: Rx.Observable<any>[], resultSelector: (sourcesValues: any[]) => T): Rx.Observable<T> {
  return <Rx.Observable<T>>Rx.Observable.create(
    observer => (new ZipObservable(observer, sources, resultSelector)).dispose
  );
};
