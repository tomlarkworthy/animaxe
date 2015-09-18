/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/should.d.ts" />
require('source-map-support').install();
require("should");
var Ax = require("../src/animaxe");
var Rx = require("rx");
var counterA = 0;
var counterB = 0;
function countA(time) {
    return Ax.take(time, Ax.draw(function (tick) {
        console.log("countA");
        counterA++;
    }));
}
function countAthenCountB() {
    return Ax.take(1, Ax.draw(function (tick) {
        //console.log("countA");
        counterA++;
    })).then(Ax.take(1, Ax.draw(function (tick) {
        //console.log("countB");
        counterB++;
    })));
}
describe('toStreamNumber', function () {
    it('should return a stream with numerical input', function () {
        Ax.toStreamNumber(5).should.not.equal(5);
        Ax.toStreamNumber(5).should.have.property('next');
    });
});
describe('point', function () {
    it('should return a point', function () {
        Ax.point(5, 5).next(0).toString().should.equal([5, 5].toString());
    });
});
describe('then', function () {
    it('stops on time', function () {
        counterA = 0;
        counterB = 0;
        var downstream = new Rx.ReplaySubject();
        var anim = countA(2).then(countA(1));
        counterA.should.equal(0);
        var upstream = Rx.Observable.from([0, 0.1, 0.2, 0.3, 0.4, 0.5])
            .map(function (x) { return new Ax.DrawTick(null, x, x); });
        anim.attach(upstream).subscribe(downstream);
        counterA.should.equal(3);
    });
    it('thens of thens nest', function () {
        counterA = 0;
        counterB = 0;
        var downstream = new Rx.ReplaySubject();
        var anim = countAthenCountB().then(countAthenCountB());
        counterA.should.equal(0);
        counterA.should.equal(0);
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0, 0)).repeat(10);
        anim.attach(upstream).subscribe(downstream);
        counterA.should.equal(2);
        counterB.should.equal(2);
    });
    it('thens do not over draw', function () {
        console.log("thens do not overdraw");
        counterA = 0;
        counterB = 0;
        var downstream = new Rx.ReplaySubject();
        var anim = countAthenCountB();
        counterA.should.equal(0);
        counterB.should.equal(0);
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0, 0)).repeat(1);
        anim.attach(upstream.tap(function (next) {
            console.log("upstream");
        })).tap(function (next) {
            console.log("downstream");
        }).subscribe(downstream);
        counterA.should.equal(1);
        counterB.should.equal(0);
    });
    it('passes on clock', function () {
        var upstream = Rx.Observable.from([0, 0.1, 0.2, 0.3])
            .map(function (x) { return new Ax.DrawTick(null, x, x); });
        counterA = 0;
        var expectedClock = [0, 0.1, 0.2, 0.3];
        var expectedFirstClock = [0];
        var expectedSecondClock = [0.1, 0.2];
        var anim = Ax.assertClock(expectedClock, Ax.assertClock(expectedFirstClock, countA(1))
            .then(Ax.assertClock(expectedSecondClock, countA(2))));
        anim.attach(upstream).subscribe(); //errors are propogated
        counterA.should.eql(3);
    });
});
//
//describe('loop', function () {
//
//    it('repeats finite sequence', function () {
//        counterA = 0;
//        counterB = 0;
//        var downstream = new Rx.ReplaySubject();
//        var anim = Ax.loop(countA(2));
//        counterA.should.equal(0);
//        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(10);
//        anim.attach(0, upstream).subscribe(downstream);
//        counterA.should.equal(10);
//    });
//    it('repeats then', function () {
//        counterA = 0;
//        counterB = 0;
//        var downstream = new Rx.ReplaySubject();
//        var anim = Ax.loop(countAthenCountB());
//        counterA.should.equal(0);
//        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(10);
//        anim.attach(0, upstream).subscribe(downstream);
//        counterA.should.equal(5);
//        counterB.should.equal(5);
//    });
//    it('repeats works with inner then', function () {
//        counterA = 0;
//        counterB = 0;
//        var downstream = new Rx.ReplaySubject();
//        var anim = Ax.loop(countAthenCountB());
//        counterA.should.equal(0);
//        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(5);
//        anim.attach(0, upstream).subscribe(downstream);
//        counterA.should.equal(3);
//        counterB.should.equal(2);
//    });
//
//    it('passes on dt', function () { //todo generic animation contract
//        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0.1)).repeat(3);
//        var expectedDt = Rx.Observable.from([0.1, 0.1, 0.1]);
//        var anim = Ax.assertDt(expectedDt, Ax.loop(Ax.assertDt(expectedDt, countAthenCountB())));
//        anim.attach(0, upstream).subscribeOnError(
//            function (error) {
//                throw error;
//            }
//        );
//    });
//
//    it('passes on clock', function () { //todo generic animation contract
//        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0.1)).repeat(3);
//        var expectedClock = [0, 0.1, 0.2];
//        var anim = Ax.assertClock(expectedClock, Ax.loop(Ax.assertClock(expectedClock, countAthenCountB())));
//        anim.attach(0, upstream).subscribeOnError(
//            function (error) {
//                throw error;
//            }
//        );
//    });
//
//    it('should pass errors', function () { //todo generic animation contract
//        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0.1)).repeat(3);
//        var expectedTime = Rx.Observable.from([0]);
//        //var anim = Ax.assertClock(expectedTime, Ax.loop(Ax.assertClock(expectedTime, countAthenCountB())));
//        var anim = Ax.assertDt(expectedTime, Ax.loop(countAthenCountB()));
//        var seenError = false;
//        anim.attach(0, upstream).subscribeOnError(
//            function (error) {
//                seenError = true;
//            }
//        );
//        seenError.should.eql(true);
//    });
//});
//
//describe('sin', function () {
//    var animator = new Ax.Animator(null);
//    var ticker = new Rx.Subject<number>();
//    animator.ticker(ticker);
//
//
//    it('should return a number immediately next tick', function () {
//        var gotNumber = false;
//        Ax.sin(1).next().should.equal(0);
//    });
//});
//
//describe('assertDt', function () {
//    var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0.1)).repeat(3);
//    it('should pass if right', function () {
//        Ax.assertDt(Rx.Observable.from([0.1, 0.2, 0.3]), countA(1)).attach(0, upstream).subscribe();
//    });
//
//    it('should throw if wrong (number mismatch)', function () {
//        try {
//            Ax.assertDt(Rx.Observable.from([0]), countA(1)).attach(0, upstream).subscribe();
//            throw null;
//        } catch (err) {
//            err.should.not.eql(null);
//        }
//    });
//    /*
//    it('should throw if wrong (length mismatch 1)', function () {
//        try {
//            Ax.assertDt(Rx.Observable.from([0.1, 0.2, 0.3, 0.4]), countA(1)).attach(0, upstream).subscribe();
//            throw null;
//        } catch (err) {
//            err.should.not.eql(null);
//        }
//    });
//    it('should throw if wrong (length mismatch 2)', function () {
//        try {
//            Ax.assertDt(Rx.Observable.from([0.1, 0.2]), countA(1)).attach(0, upstream).subscribe();
//            throw null;
//        } catch (err) {
//            err.should.not.eql(null);
//        }
//    });*/
//});
//
//
//describe('assertClock', function () {
//    var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0.1)).repeat(3);
//    it('should pass if right', function () {
//        counterA = 0;
//        Ax.assertClock([0, 0.1, 0.2], countA(3)).attach(0, upstream).subscribe();
//        counterA.should.eql(3);
//    });
//
//    it('should throw if wrong (number mismatch)', function () {
//        try {
//            Ax.assertClock([0, 0.1, 0.3], countA(3)).attach(0, upstream).subscribe();
//            throw null;
//        } catch (err) {
//            console.log(err);
//            err.should.not.eql(null);
//        }
//    });
//    /*
//    it('should throw if wrong (length mismatch 1)', function () {
//        try {
//            Ax.assertClock([0.1, 0.2, 0.3, 0.4], countA(3)).attach(0, upstream).subscribe();
//            throw null;
//        } catch (err) {
//            err.should.not.eql(null);
//        }
//    });
//    it('should throw if wrong (length mismatch 2)', function () {
//        try {
//            Ax.assertClock([0.1, 0.2], countA(3)).attach(0, upstream).subscribe();
//            throw null;
//        } catch (err) {
//            err.should.not.eql(null);
//        }
//    });*/
//});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3QudHMiXSwibmFtZXMiOlsiY291bnRBIiwiY291bnRBdGhlbkNvdW50QiJdLCJtYXBwaW5ncyI6IkFBQUEsQUFJQSwwREFKMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLDRDQUE0QztBQUM1Qyw2Q0FBNkM7QUFDN0MsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDeEMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRWxCLElBQU8sRUFBRSxXQUFXLGdCQUFnQixDQUFDLENBQUM7QUFDdEMsSUFBTyxFQUFFLFdBQVcsSUFBSSxDQUFDLENBQUM7QUFFMUIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBQ2pCLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztBQUNqQixnQkFBZ0IsSUFBVztJQUN2QkEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBZ0JBO1FBQ25ELE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEIsUUFBUSxFQUFFLENBQUM7SUFDZixDQUFDLENBQUNBLENBQUNBLENBQUNBO0FBQ1JBLENBQUNBO0FBRUQ7SUFDSUMsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBZ0JBO1FBQ2hELEFBQ0Esd0JBRHdCO1FBQ3hCLFFBQVEsRUFBRSxDQUFDO0lBQ2YsQ0FBQyxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxJQUFnQkE7UUFDbEQsQUFDQSx3QkFEd0I7UUFDeEIsUUFBUSxFQUFFLENBQUM7SUFDZixDQUFDLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQ1RBLENBQUNB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Q1QsRUFBRTtBQUNGLGlFQUFpRTtBQUNqRSxlQUFlO0FBQ2YsOEZBQThGO0FBQzlGLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsdUNBQXVDO0FBQ3ZDLFdBQVc7QUFDWCxTQUFTO0FBQ1QsUUFBUTtBQUNSLG1FQUFtRTtBQUNuRSxlQUFlO0FBQ2YsK0dBQStHO0FBQy9HLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsdUNBQXVDO0FBQ3ZDLFdBQVc7QUFDWCxTQUFTO0FBQ1QsbUVBQW1FO0FBQ25FLGVBQWU7QUFDZixxR0FBcUc7QUFDckcseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6Qix1Q0FBdUM7QUFDdkMsV0FBVztBQUNYLFdBQVc7QUFDWCxLQUFLO0FBQ0wsRUFBRTtBQUNGLEVBQUU7QUFDRix1Q0FBdUM7QUFDdkMsZ0ZBQWdGO0FBQ2hGLDhDQUE4QztBQUM5Qyx1QkFBdUI7QUFDdkIsbUZBQW1GO0FBQ25GLGlDQUFpQztBQUNqQyxTQUFTO0FBQ1QsRUFBRTtBQUNGLGlFQUFpRTtBQUNqRSxlQUFlO0FBQ2YsdUZBQXVGO0FBQ3ZGLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsK0JBQStCO0FBQy9CLHVDQUF1QztBQUN2QyxXQUFXO0FBQ1gsU0FBUztBQUNULFFBQVE7QUFDUixtRUFBbUU7QUFDbkUsZUFBZTtBQUNmLDhGQUE4RjtBQUM5Rix5QkFBeUI7QUFDekIseUJBQXlCO0FBQ3pCLHVDQUF1QztBQUN2QyxXQUFXO0FBQ1gsU0FBUztBQUNULG1FQUFtRTtBQUNuRSxlQUFlO0FBQ2Ysb0ZBQW9GO0FBQ3BGLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsdUNBQXVDO0FBQ3ZDLFdBQVc7QUFDWCxXQUFXO0FBQ1gsS0FBSyIsImZpbGUiOiJ0ZXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL25vZGVfbW9kdWxlcy9yeC90cy9yeC5hbGwuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9tb2NoYS5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9zaG91bGQuZC50c1wiIC8+XG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5yZXF1aXJlKFwic2hvdWxkXCIpO1xuXG5pbXBvcnQgQXggPSByZXF1aXJlKFwiLi4vc3JjL2FuaW1heGVcIik7XG5pbXBvcnQgUnggPSByZXF1aXJlKFwicnhcIik7XG5cbnZhciBjb3VudGVyQSA9IDA7XG52YXIgY291bnRlckIgPSAwO1xuZnVuY3Rpb24gY291bnRBKHRpbWU6bnVtYmVyKTpBeC5BbmltYXRpb24geyAvL3dlIGNvdWxkIGJlIGNsZXZlciBhbmQgbGV0IHNwYXJrIHRha2UgYSBzZXEsIGJ1dCB1c2VyIGZ1bmN0aW9ucyBzaG91bGQgYmUgc2ltcGxlXG4gICAgcmV0dXJuIEF4LnRha2UodGltZSwgQXguZHJhdyhmdW5jdGlvbiAodGljazpBeC5EcmF3VGljaykge1xuICAgICAgICBjb25zb2xlLmxvZyhcImNvdW50QVwiKTtcbiAgICAgICAgY291bnRlckErKztcbiAgICB9KSk7XG59XG5cbmZ1bmN0aW9uIGNvdW50QXRoZW5Db3VudEIoKTpBeC5BbmltYXRpb24geyAvL3dlIGNvdWxkIGJlIGNsZXZlciBhbmQgbGV0IHNwYXJrIHRha2UgYSBzZXEsIGJ1dCB1c2VyIGZ1bmN0aW9ucyBzaG91bGQgYmUgc2ltcGxlXG4gICAgcmV0dXJuIEF4LnRha2UoMSwgQXguZHJhdyhmdW5jdGlvbiAodGljazpBeC5EcmF3VGljaykge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY291bnRBXCIpO1xuICAgICAgICBjb3VudGVyQSsrO1xuICAgIH0pKS50aGVuKEF4LnRha2UoMSwgQXguZHJhdyhmdW5jdGlvbiAodGljazpBeC5EcmF3VGljaykge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY291bnRCXCIpO1xuICAgICAgICBjb3VudGVyQisrO1xuICAgIH0pKSk7XG59XG5cbmRlc2NyaWJlKCd0b1N0cmVhbU51bWJlcicsIGZ1bmN0aW9uICgpIHtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGEgc3RyZWFtIHdpdGggbnVtZXJpY2FsIGlucHV0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBBeC50b1N0cmVhbU51bWJlcig1KS5zaG91bGQubm90LmVxdWFsKDUpO1xuICAgICAgICBBeC50b1N0cmVhbU51bWJlcig1KS5zaG91bGQuaGF2ZS5wcm9wZXJ0eSgnbmV4dCcpO1xuICAgIH0pO1xufSk7XG5kZXNjcmliZSgncG9pbnQnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBhIHBvaW50JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBBeC5wb2ludCg1LCA1KS5uZXh0KDApLnRvU3RyaW5nKCkuc2hvdWxkLmVxdWFsKFs1LCA1XS50b1N0cmluZygpKTtcbiAgICB9KTtcbn0pO1xuXG5kZXNjcmliZSgndGhlbicsIGZ1bmN0aW9uICgpIHtcblxuICAgIGl0KCdzdG9wcyBvbiB0aW1lJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBjb3VudGVyQSA9IDA7XG4gICAgICAgIGNvdW50ZXJCID0gMDtcbiAgICAgICAgdmFyIGRvd25zdHJlYW0gPSBuZXcgUnguUmVwbGF5U3ViamVjdCgpO1xuICAgICAgICB2YXIgYW5pbSA9IGNvdW50QSgyKS50aGVuKGNvdW50QSgxKSk7XG4gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgwKTtcbiAgICAgICAgdmFyIHVwc3RyZWFtID1cbiAgICAgICAgICAgIFJ4Lk9ic2VydmFibGUuZnJvbShbMCwgMC4xLCAwLjIsIDAuMywgMC40LCAwLjVdKVxuICAgICAgICAgICAgLm1hcCh4ID0+IG5ldyBBeC5EcmF3VGljayhudWxsLCB4LCB4KSk7XG4gICAgICAgIGFuaW0uYXR0YWNoKHVwc3RyZWFtKS5zdWJzY3JpYmUoZG93bnN0cmVhbSk7XG4gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgzKTtcbiAgICB9KTtcblxuICAgIGl0KCd0aGVucyBvZiB0aGVucyBuZXN0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBjb3VudGVyQSA9IDA7XG4gICAgICAgIGNvdW50ZXJCID0gMDtcbiAgICAgICAgdmFyIGRvd25zdHJlYW0gPSBuZXcgUnguUmVwbGF5U3ViamVjdCgpO1xuICAgICAgICB2YXIgYW5pbSA9IGNvdW50QXRoZW5Db3VudEIoKS50aGVuKGNvdW50QXRoZW5Db3VudEIoKSk7XG4gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgwKTtcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDApO1xuICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMCwgMCkpLnJlcGVhdCgxMCk7XG4gICAgICAgIGFuaW0uYXR0YWNoKHVwc3RyZWFtKS5zdWJzY3JpYmUoZG93bnN0cmVhbSk7XG4gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgyKTtcbiAgICAgICAgY291bnRlckIuc2hvdWxkLmVxdWFsKDIpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3RoZW5zIGRvIG5vdCBvdmVyIGRyYXcnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwidGhlbnMgZG8gbm90IG92ZXJkcmF3XCIpO1xuICAgICAgICBjb3VudGVyQSA9IDA7XG4gICAgICAgIGNvdW50ZXJCID0gMDtcbiAgICAgICAgdmFyIGRvd25zdHJlYW0gPSBuZXcgUnguUmVwbGF5U3ViamVjdCgpO1xuICAgICAgICB2YXIgYW5pbSA9IGNvdW50QXRoZW5Db3VudEIoKTtcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDApO1xuICAgICAgICBjb3VudGVyQi5zaG91bGQuZXF1YWwoMCk7XG4gICAgICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwLCAwKSkucmVwZWF0KDEpO1xuICAgICAgICBhbmltLmF0dGFjaCh1cHN0cmVhbS50YXAoZnVuY3Rpb24gKG5leHQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwidXBzdHJlYW1cIik7XG4gICAgICAgIH0pKS50YXAoZnVuY3Rpb24gKG5leHQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZG93bnN0cmVhbVwiKTtcbiAgICAgICAgfSkuc3Vic2NyaWJlKGRvd25zdHJlYW0pO1xuICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMSk7XG4gICAgICAgIGNvdW50ZXJCLnNob3VsZC5lcXVhbCgwKTtcbiAgICB9KTtcblxuXG5cbiAgICBpdCgncGFzc2VzIG9uIGNsb2NrJywgZnVuY3Rpb24gKCkgeyAvL3RvZG8gZ2VuZXJpYyBhbmltYXRpb24gY29udHJhY3RcbiAgICAgICAgdmFyIHVwc3RyZWFtID1cbiAgICAgICAgICAgIFJ4Lk9ic2VydmFibGUuZnJvbShbMCwgMC4xLCAwLjIsIDAuM10pXG4gICAgICAgICAgICAubWFwKHggPT4gbmV3IEF4LkRyYXdUaWNrKG51bGwsIHgsIHgpKTtcblxuICAgICAgICBjb3VudGVyQSA9IDA7XG4gICAgICAgIHZhciBleHBlY3RlZENsb2NrID0gWzAsIDAuMSwgMC4yLCAwLjNdO1xuICAgICAgICB2YXIgZXhwZWN0ZWRGaXJzdENsb2NrID0gWzBdO1xuICAgICAgICB2YXIgZXhwZWN0ZWRTZWNvbmRDbG9jayA9IFswLjEsIDAuMl07XG4gICAgICAgIHZhciBhbmltID0gQXguYXNzZXJ0Q2xvY2soXG4gICAgICAgICAgICBleHBlY3RlZENsb2NrLFxuICAgICAgICAgICAgQXguYXNzZXJ0Q2xvY2soZXhwZWN0ZWRGaXJzdENsb2NrLCBjb3VudEEoMSkpXG4gICAgICAgICAgICAgICAgLnRoZW4oQXguYXNzZXJ0Q2xvY2soZXhwZWN0ZWRTZWNvbmRDbG9jaywgY291bnRBKDIpKSkpO1xuXG4gICAgICAgIGFuaW0uYXR0YWNoKHVwc3RyZWFtKS5zdWJzY3JpYmUoKTsgLy9lcnJvcnMgYXJlIHByb3BvZ2F0ZWRcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxbCgzKTtcblxuICAgIH0pO1xufSk7XG5cbi8vXG4vL2Rlc2NyaWJlKCdsb29wJywgZnVuY3Rpb24gKCkge1xuLy9cbi8vICAgIGl0KCdyZXBlYXRzIGZpbml0ZSBzZXF1ZW5jZScsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICBjb3VudGVyQSA9IDA7XG4vLyAgICAgICAgY291bnRlckIgPSAwO1xuLy8gICAgICAgIHZhciBkb3duc3RyZWFtID0gbmV3IFJ4LlJlcGxheVN1YmplY3QoKTtcbi8vICAgICAgICB2YXIgYW5pbSA9IEF4Lmxvb3AoY291bnRBKDIpKTtcbi8vICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4vLyAgICAgICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDApKS5yZXBlYXQoMTApO1xuLy8gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoZG93bnN0cmVhbSk7XG4vLyAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDEwKTtcbi8vICAgIH0pO1xuLy8gICAgaXQoJ3JlcGVhdHMgdGhlbicsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICBjb3VudGVyQSA9IDA7XG4vLyAgICAgICAgY291bnRlckIgPSAwO1xuLy8gICAgICAgIHZhciBkb3duc3RyZWFtID0gbmV3IFJ4LlJlcGxheVN1YmplY3QoKTtcbi8vICAgICAgICB2YXIgYW5pbSA9IEF4Lmxvb3AoY291bnRBdGhlbkNvdW50QigpKTtcbi8vICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4vLyAgICAgICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDApKS5yZXBlYXQoMTApO1xuLy8gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoZG93bnN0cmVhbSk7XG4vLyAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDUpO1xuLy8gICAgICAgIGNvdW50ZXJCLnNob3VsZC5lcXVhbCg1KTtcbi8vICAgIH0pO1xuLy8gICAgaXQoJ3JlcGVhdHMgd29ya3Mgd2l0aCBpbm5lciB0aGVuJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIGNvdW50ZXJBID0gMDtcbi8vICAgICAgICBjb3VudGVyQiA9IDA7XG4vLyAgICAgICAgdmFyIGRvd25zdHJlYW0gPSBuZXcgUnguUmVwbGF5U3ViamVjdCgpO1xuLy8gICAgICAgIHZhciBhbmltID0gQXgubG9vcChjb3VudEF0aGVuQ291bnRCKCkpO1xuLy8gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgwKTtcbi8vICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMCkpLnJlcGVhdCg1KTtcbi8vICAgICAgICBhbmltLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKGRvd25zdHJlYW0pO1xuLy8gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgzKTtcbi8vICAgICAgICBjb3VudGVyQi5zaG91bGQuZXF1YWwoMik7XG4vLyAgICB9KTtcbi8vXG4vLyAgICBpdCgncGFzc2VzIG9uIGR0JywgZnVuY3Rpb24gKCkgeyAvL3RvZG8gZ2VuZXJpYyBhbmltYXRpb24gY29udHJhY3Rcbi8vICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMC4xKSkucmVwZWF0KDMpO1xuLy8gICAgICAgIHZhciBleHBlY3RlZER0ID0gUnguT2JzZXJ2YWJsZS5mcm9tKFswLjEsIDAuMSwgMC4xXSk7XG4vLyAgICAgICAgdmFyIGFuaW0gPSBBeC5hc3NlcnREdChleHBlY3RlZER0LCBBeC5sb29wKEF4LmFzc2VydER0KGV4cGVjdGVkRHQsIGNvdW50QXRoZW5Db3VudEIoKSkpKTtcbi8vICAgICAgICBhbmltLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlT25FcnJvcihcbi8vICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4vLyAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbi8vICAgICAgICAgICAgfVxuLy8gICAgICAgICk7XG4vLyAgICB9KTtcbi8vXG4vLyAgICBpdCgncGFzc2VzIG9uIGNsb2NrJywgZnVuY3Rpb24gKCkgeyAvL3RvZG8gZ2VuZXJpYyBhbmltYXRpb24gY29udHJhY3Rcbi8vICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMC4xKSkucmVwZWF0KDMpO1xuLy8gICAgICAgIHZhciBleHBlY3RlZENsb2NrID0gWzAsIDAuMSwgMC4yXTtcbi8vICAgICAgICB2YXIgYW5pbSA9IEF4LmFzc2VydENsb2NrKGV4cGVjdGVkQ2xvY2ssIEF4Lmxvb3AoQXguYXNzZXJ0Q2xvY2soZXhwZWN0ZWRDbG9jaywgY291bnRBdGhlbkNvdW50QigpKSkpO1xuLy8gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmVPbkVycm9yKFxuLy8gICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbi8vICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuLy8gICAgICAgICAgICB9XG4vLyAgICAgICAgKTtcbi8vICAgIH0pO1xuLy9cbi8vICAgIGl0KCdzaG91bGQgcGFzcyBlcnJvcnMnLCBmdW5jdGlvbiAoKSB7IC8vdG9kbyBnZW5lcmljIGFuaW1hdGlvbiBjb250cmFjdFxuLy8gICAgICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwLjEpKS5yZXBlYXQoMyk7XG4vLyAgICAgICAgdmFyIGV4cGVjdGVkVGltZSA9IFJ4Lk9ic2VydmFibGUuZnJvbShbMF0pO1xuLy8gICAgICAgIC8vdmFyIGFuaW0gPSBBeC5hc3NlcnRDbG9jayhleHBlY3RlZFRpbWUsIEF4Lmxvb3AoQXguYXNzZXJ0Q2xvY2soZXhwZWN0ZWRUaW1lLCBjb3VudEF0aGVuQ291bnRCKCkpKSk7XG4vLyAgICAgICAgdmFyIGFuaW0gPSBBeC5hc3NlcnREdChleHBlY3RlZFRpbWUsIEF4Lmxvb3AoY291bnRBdGhlbkNvdW50QigpKSk7XG4vLyAgICAgICAgdmFyIHNlZW5FcnJvciA9IGZhbHNlO1xuLy8gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmVPbkVycm9yKFxuLy8gICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbi8vICAgICAgICAgICAgICAgIHNlZW5FcnJvciA9IHRydWU7XG4vLyAgICAgICAgICAgIH1cbi8vICAgICAgICApO1xuLy8gICAgICAgIHNlZW5FcnJvci5zaG91bGQuZXFsKHRydWUpO1xuLy8gICAgfSk7XG4vL30pO1xuLy9cbi8vZGVzY3JpYmUoJ3NpbicsIGZ1bmN0aW9uICgpIHtcbi8vICAgIHZhciBhbmltYXRvciA9IG5ldyBBeC5BbmltYXRvcihudWxsKTtcbi8vICAgIHZhciB0aWNrZXIgPSBuZXcgUnguU3ViamVjdDxudW1iZXI+KCk7XG4vLyAgICBhbmltYXRvci50aWNrZXIodGlja2VyKTtcbi8vXG4vL1xuLy8gICAgaXQoJ3Nob3VsZCByZXR1cm4gYSBudW1iZXIgaW1tZWRpYXRlbHkgbmV4dCB0aWNrJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIHZhciBnb3ROdW1iZXIgPSBmYWxzZTtcbi8vICAgICAgICBBeC5zaW4oMSkubmV4dCgpLnNob3VsZC5lcXVhbCgwKTtcbi8vICAgIH0pO1xuLy99KTtcbi8vXG4vL2Rlc2NyaWJlKCdhc3NlcnREdCcsIGZ1bmN0aW9uICgpIHtcbi8vICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwLjEpKS5yZXBlYXQoMyk7XG4vLyAgICBpdCgnc2hvdWxkIHBhc3MgaWYgcmlnaHQnLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgQXguYXNzZXJ0RHQoUnguT2JzZXJ2YWJsZS5mcm9tKFswLjEsIDAuMiwgMC4zXSksIGNvdW50QSgxKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgIH0pO1xuLy9cbi8vICAgIGl0KCdzaG91bGQgdGhyb3cgaWYgd3JvbmcgKG51bWJlciBtaXNtYXRjaCknLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgdHJ5IHtcbi8vICAgICAgICAgICAgQXguYXNzZXJ0RHQoUnguT2JzZXJ2YWJsZS5mcm9tKFswXSksIGNvdW50QSgxKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICAgICAgdGhyb3cgbnVsbDtcbi8vICAgICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgICAgICAgZXJyLnNob3VsZC5ub3QuZXFsKG51bGwpO1xuLy8gICAgICAgIH1cbi8vICAgIH0pO1xuLy8gICAgLypcbi8vICAgIGl0KCdzaG91bGQgdGhyb3cgaWYgd3JvbmcgKGxlbmd0aCBtaXNtYXRjaCAxKScsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICB0cnkge1xuLy8gICAgICAgICAgICBBeC5hc3NlcnREdChSeC5PYnNlcnZhYmxlLmZyb20oWzAuMSwgMC4yLCAwLjMsIDAuNF0pLCBjb3VudEEoMSkpLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKCk7XG4vLyAgICAgICAgICAgIHRocm93IG51bGw7XG4vLyAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICAgICAgIGVyci5zaG91bGQubm90LmVxbChudWxsKTtcbi8vICAgICAgICB9XG4vLyAgICB9KTtcbi8vICAgIGl0KCdzaG91bGQgdGhyb3cgaWYgd3JvbmcgKGxlbmd0aCBtaXNtYXRjaCAyKScsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICB0cnkge1xuLy8gICAgICAgICAgICBBeC5hc3NlcnREdChSeC5PYnNlcnZhYmxlLmZyb20oWzAuMSwgMC4yXSksIGNvdW50QSgxKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICAgICAgdGhyb3cgbnVsbDtcbi8vICAgICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgICAgICAgZXJyLnNob3VsZC5ub3QuZXFsKG51bGwpO1xuLy8gICAgICAgIH1cbi8vICAgIH0pOyovXG4vL30pO1xuLy9cbi8vXG4vL2Rlc2NyaWJlKCdhc3NlcnRDbG9jaycsIGZ1bmN0aW9uICgpIHtcbi8vICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwLjEpKS5yZXBlYXQoMyk7XG4vLyAgICBpdCgnc2hvdWxkIHBhc3MgaWYgcmlnaHQnLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgY291bnRlckEgPSAwO1xuLy8gICAgICAgIEF4LmFzc2VydENsb2NrKFswLCAwLjEsIDAuMl0sIGNvdW50QSgzKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICBjb3VudGVyQS5zaG91bGQuZXFsKDMpO1xuLy8gICAgfSk7XG4vL1xuLy8gICAgaXQoJ3Nob3VsZCB0aHJvdyBpZiB3cm9uZyAobnVtYmVyIG1pc21hdGNoKScsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICB0cnkge1xuLy8gICAgICAgICAgICBBeC5hc3NlcnRDbG9jayhbMCwgMC4xLCAwLjNdLCBjb3VudEEoMykpLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKCk7XG4vLyAgICAgICAgICAgIHRocm93IG51bGw7XG4vLyAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4vLyAgICAgICAgICAgIGVyci5zaG91bGQubm90LmVxbChudWxsKTtcbi8vICAgICAgICB9XG4vLyAgICB9KTtcbi8vICAgIC8qXG4vLyAgICBpdCgnc2hvdWxkIHRocm93IGlmIHdyb25nIChsZW5ndGggbWlzbWF0Y2ggMSknLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgdHJ5IHtcbi8vICAgICAgICAgICAgQXguYXNzZXJ0Q2xvY2soWzAuMSwgMC4yLCAwLjMsIDAuNF0sIGNvdW50QSgzKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICAgICAgdGhyb3cgbnVsbDtcbi8vICAgICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgICAgICAgZXJyLnNob3VsZC5ub3QuZXFsKG51bGwpO1xuLy8gICAgICAgIH1cbi8vICAgIH0pO1xuLy8gICAgaXQoJ3Nob3VsZCB0aHJvdyBpZiB3cm9uZyAobGVuZ3RoIG1pc21hdGNoIDIpJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIHRyeSB7XG4vLyAgICAgICAgICAgIEF4LmFzc2VydENsb2NrKFswLjEsIDAuMl0sIGNvdW50QSgzKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICAgICAgdGhyb3cgbnVsbDtcbi8vICAgICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgICAgICAgZXJyLnNob3VsZC5ub3QuZXFsKG51bGwpO1xuLy8gICAgICAgIH1cbi8vICAgIH0pOyovXG4vL30pO1xuXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=