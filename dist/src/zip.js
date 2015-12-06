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
        var n = this.sources.length, subscriptions = new Array(n), done = utils.arrayInitialize(n, falseFactory), q = utils.arrayInitialize(n, emptyArrayFactory);
        for (var i = 0; i < n; i++) {
            var source = this.sources[i];
            subscriptions[i] = source.subscribe(new ZipObserver(observer, i, this, q, done));
        }
    }
    ZipObservable.prototype.dispose = function () {
        for (var i = 0; i < this.sources.length; i++) {
            subscriptions[i].dispose();
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
function zip(sources, resultSelector) {
    return Rx.Observable.create(function (observer) { return (new ZipObservable(observer, sources, resultSelector)).dispose; });
}
exports.zip = zip;
;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy96aXAudHMiXSwibmFtZXMiOlsiZmFsc2VGYWN0b3J5IiwiZW1wdHlBcnJheUZhY3RvcnkiLCJub3RFbXB0eSIsInNoaWZ0RWFjaCIsImVtcHR5QW5kRG9uZSIsIm5vdFRoZVNhbWUiLCJ6aXBBcnJheXMiLCJaaXBPYnNlcnZhYmxlIiwiWmlwT2JzZXJ2YWJsZS5jb25zdHJ1Y3RvciIsIlppcE9ic2VydmFibGUuZGlzcG9zZSIsIlppcE9ic2VydmVyIiwiWmlwT2JzZXJ2ZXIuY29uc3RydWN0b3IiLCJaaXBPYnNlcnZlci5uZXh0IiwiWmlwT2JzZXJ2ZXIuZXJyb3IiLCJaaXBPYnNlcnZlci5jb21wbGV0ZWQiLCJ6aXAiXSwibWFwcGluZ3MiOiJBQUFBLElBQVksS0FBSyxXQUFNLFNBQ3ZCLENBQUMsQ0FEK0I7QUFDaEMsSUFBWSxFQUFFLFdBQU0sSUFFcEIsQ0FBQyxDQUZ1QjtBQUV4QiwwQkFBMEJBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO0FBQ3pDLCtCQUErQkMsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDM0Msa0JBQWtCLENBQUMsSUFBSUMsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDN0MsbUJBQW1CLENBQUMsSUFBSUMsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDM0Msc0JBQXNCLEVBQUUsSUFBSUMsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7QUFDekUsb0JBQW9CLENBQUM7SUFDbkJDLE1BQU1BLENBQUNBLFVBQVVBLENBQUNBLEVBQUVBLENBQUNBO1FBQ25CLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pCLENBQUMsQ0FBQ0E7QUFDSkEsQ0FBQ0E7QUFDRCxtQkFBbUIsTUFBTTtJQUN2QkMsTUFBTUEsQ0FBQ0EsTUFBTUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsVUFBU0EsQ0FBQ0EsRUFBQ0EsQ0FBQ0E7UUFDN0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBUyxLQUFLLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pELENBQUMsQ0FDRkEsQ0FBQ0E7QUFDSkEsQ0FBQ0E7QUFHRDtJQUNFQyx1QkFBbUJBLFFBQVFBLEVBQVNBLE9BQU9BLEVBQVNBLGNBQWNBO1FBQS9DQyxhQUFRQSxHQUFSQSxRQUFRQSxDQUFBQTtRQUFTQSxZQUFPQSxHQUFQQSxPQUFPQSxDQUFBQTtRQUFTQSxtQkFBY0EsR0FBZEEsY0FBY0EsQ0FBQUE7UUFDaEVBLElBQUlBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLE1BQU1BLEVBQ3ZCQSxhQUFhQSxHQUFHQSxJQUFJQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQSxFQUM1QkEsSUFBSUEsR0FBR0EsS0FBS0EsQ0FBQ0EsZUFBZUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsWUFBWUEsQ0FBQ0EsRUFDN0NBLENBQUNBLEdBQUdBLEtBQUtBLENBQUNBLGVBQWVBLENBQUNBLENBQUNBLEVBQUVBLGlCQUFpQkEsQ0FBQ0EsQ0FBQ0E7UUFFcERBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLEVBQUVBLENBQUNBLEVBQUVBLEVBQUVBLENBQUNBO1lBQzNCQSxJQUFJQSxNQUFNQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFBQTtZQUM1QkEsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsTUFBTUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsSUFBSUEsV0FBV0EsQ0FBQ0EsUUFBUUEsRUFBRUEsQ0FBQ0EsRUFBRUEsSUFBSUEsRUFBRUEsQ0FBQ0EsRUFBRUEsSUFBSUEsQ0FBQ0EsQ0FBQ0EsQ0FBQUE7UUFDbEZBLENBQUNBO0lBQ0hBLENBQUNBO0lBR0RELCtCQUFPQSxHQUFQQTtRQUNFRSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxNQUFNQSxFQUFFQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQTtZQUM3Q0EsYUFBYUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsT0FBT0EsRUFBRUEsQ0FBQ0E7UUFDN0JBLENBQUNBO0lBQ0hBLENBQUNBO0lBQ0hGLG9CQUFDQTtBQUFEQSxDQW5CQSxBQW1CQ0EsSUFBQTtBQUVEO0lBTUVHLHFCQUFZQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQTtRQUNyQkMsSUFBSUEsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDWkEsSUFBSUEsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDWkEsSUFBSUEsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDWkEsSUFBSUEsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7UUFDWkEsSUFBSUEsQ0FBQ0EsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7SUFDZEEsQ0FBQ0E7SUFFREQsMEJBQUlBLEdBQUpBLFVBQUtBLENBQUNBO1FBQ0pFLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO1FBQ3pCQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxLQUFLQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUM1QkEsSUFBSUEsWUFBWUEsR0FBR0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7WUFDMUNBLElBQUlBLENBQUNBO2dCQUNIQSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxjQUFjQSxDQUFDQSxZQUFZQSxDQUFDQSxDQUFDQTtnQkFDL0NBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO2dCQUVwQkEsdUNBQXVDQTtnQkFDdkNBLEVBQUVBLENBQUNBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLEVBQUVBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBLENBQUNBLENBQUNBLENBQUNBO29CQUNyREEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7Z0JBQ3hCQSxDQUFDQTtZQUVIQSxDQUFFQTtZQUFBQSxLQUFLQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDYkEsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0E7Z0JBQ3JCQSxNQUFNQSxDQUFDQTtZQUNUQSxDQUFDQTtRQUNIQSxDQUFDQTtJQUNIQSxDQUFDQTs7SUFFREYsMkJBQUtBLEdBQUxBLFVBQU1BLENBQUNBO1FBQ0xHLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLE9BQU9BLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0lBQ3JCQSxDQUFDQTs7SUFFREgsK0JBQVNBLEdBQVRBO1FBQ0VJLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLElBQUlBLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLENBQUNBLFVBQVVBO1FBQ25DQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxNQUFNQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUNqQ0EsSUFBSUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsV0FBV0EsRUFBRUEsQ0FBQ0E7UUFDeEJBLENBQUNBO0lBQ0hBLENBQUNBOztJQUNMSixrQkFBQ0E7QUFBREEsQ0E1Q0EsQUE0Q0NBLElBQUE7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7O3VCQWtCdUI7QUFDdkI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7S0F1REs7QUFFSDs7OztHQUlHO0FBQ0wsYUFBdUIsT0FBNkIsRUFBRSxjQUEyQztJQUMvRkssTUFBTUEsQ0FBbUJBLEVBQUVBLENBQUNBLFVBQVVBLENBQUNBLE1BQU1BLENBQzNDQSxVQUFBQSxRQUFRQSxJQUFJQSxPQUFBQSxDQUFDQSxJQUFJQSxhQUFhQSxDQUFDQSxRQUFRQSxFQUFFQSxPQUFPQSxFQUFFQSxjQUFjQSxDQUFDQSxDQUFDQSxDQUFDQSxPQUFPQSxFQUE5REEsQ0FBOERBLENBQzNFQSxDQUFDQTtBQUNKQSxDQUFDQTtBQUplLFdBQUcsTUFJbEIsQ0FBQTtBQUFBLENBQUMiLCJmaWxlIjoic3JjL3ppcC5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
