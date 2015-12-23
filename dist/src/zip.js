var utils = require("./utils");
var Rx = require("rx");
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
    return arrays[0].map(function (_, i) {
        return arrays.map(function (array) { return array[i]; });
    });
}
var ZipObservable = (function () {
    function ZipObservable(observer, sources, resultSelector) {
        this.observer = observer;
        this.sources = sources;
        this.resultSelector = resultSelector;
        // console.log("ZipObservable"); 
        var n = this.sources.length;
        var done = utils.arrayInitialize(n, falseFactory);
        var q = utils.arrayInitialize(n, emptyArrayFactory);
        this.subscriptions = new Array(n);
        for (var i = 0; i < n; i++) {
            var source = this.sources[i];
            var subscriber = new ZipObserver(observer, i, this, q, done);
            this.subscriptions[i] = source.subscribe(subscriber.next.bind(subscriber), subscriber.error.bind(subscriber), subscriber.completed.bind(subscriber));
        }
    }
    ZipObservable.prototype.dispose = function () {
        for (var i = 0; i < this.sources.length; i++) {
            this.subscriptions[i].dispose();
        }
    };
    return ZipObservable;
})();
var ZipObserver = (function () {
    function ZipObserver(o, i, p, q, d) {
        this._o = o;
        this._i = i;
        this._p = p;
        this._q = q;
        this._d = d;
    }
    ZipObserver.prototype.next = function (x) {
        //console.log("ZipObserver: next", this);
        this._q[this._i].push(x);
        if (this._q.every(notEmpty)) {
            var queuedValues = this._q.map(shiftEach);
            try {
                var res = this._p.resultSelector.apply(null, queuedValues);
                this._o.onNext(res);
                // Any done and empty => zip completed.
                if (zipArrays([this._q, this._d]).some(emptyAndDone)) {
                    this._o.onCompleted();
                }
            }
            catch (err) {
                this._o.onError(err);
                return;
            }
        }
    };
    ;
    ZipObserver.prototype.error = function (e) {
        this._o.onError(e);
    };
    ;
    ZipObserver.prototype.completed = function () {
        this._d[this._i] = true; // Done...
        if (this._q[this._i].length == 0) {
            this._o.onCompleted();
        }
    };
    ;
    return ZipObserver;
})();
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
function zip(resultSelector) {
    var sources = [];
    for (var _a = 1; _a < arguments.length; _a++) {
        sources[_a - 1] = arguments[_a];
    }
    return Rx.Observable.create(function (observer) {
        var zipper = new ZipObservable(observer, sources, resultSelector);
        return zipper.dispose.bind(zipper);
    });
}
exports.zip = zip;
;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy96aXAudHMiXSwibmFtZXMiOlsiZmFsc2VGYWN0b3J5IiwiZW1wdHlBcnJheUZhY3RvcnkiLCJub3RFbXB0eSIsInNoaWZ0RWFjaCIsImVtcHR5QW5kRG9uZSIsIm5vdFRoZVNhbWUiLCJ6aXBBcnJheXMiLCJaaXBPYnNlcnZhYmxlIiwiWmlwT2JzZXJ2YWJsZS5jb25zdHJ1Y3RvciIsIlppcE9ic2VydmFibGUuZGlzcG9zZSIsIlppcE9ic2VydmVyIiwiWmlwT2JzZXJ2ZXIuY29uc3RydWN0b3IiLCJaaXBPYnNlcnZlci5uZXh0IiwiWmlwT2JzZXJ2ZXIuZXJyb3IiLCJaaXBPYnNlcnZlci5jb21wbGV0ZWQiLCJ6aXAiXSwibWFwcGluZ3MiOiJBQUFBLElBQVksS0FBSyxXQUFNLFNBQ3ZCLENBQUMsQ0FEK0I7QUFDaEMsSUFBWSxFQUFFLFdBQU0sSUFFcEIsQ0FBQyxDQUZ1QjtBQUV4QiwwQkFBMEJBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO0FBQ3pDLCtCQUErQkMsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDM0Msa0JBQWtCLENBQUMsSUFBSUMsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDN0MsbUJBQW1CLENBQUMsSUFBSUMsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDM0Msc0JBQXNCLEVBQUUsSUFBSUMsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDekUsb0JBQW9CLENBQUM7SUFDbkJDLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLEVBQUVBLENBQUNBO1FBQ25CLE1BQU0sQ0FBQyxDQUFDLEtB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
