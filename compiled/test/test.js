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
        Ax.point(5, 5).next().toString().should.equal([5, 5].toString());
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3QudHMiXSwibmFtZXMiOlsiY291bnRBIiwiY291bnRBdGhlbkNvdW50QiJdLCJtYXBwaW5ncyI6IkFBQUEsQUFJQSwwREFKMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLDRDQUE0QztBQUM1Qyw4Q0FBOEM7QUFDOUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDeEMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRWxCLElBQU8sRUFBRSxXQUFXLGdCQUFnQixDQUFDLENBQUM7QUFDdEMsSUFBTyxFQUFFLFdBQVcsSUFBSSxDQUFDLENBQUM7QUFFMUIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBQ2pCLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztBQUNqQixnQkFBZ0IsSUFBVztJQUN2QkEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBZ0JBO1FBQ25ELE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEIsUUFBUSxFQUFFLENBQUM7SUFDZixDQUFDLENBQUNBLENBQUNBLENBQUNBO0FBQ1JBLENBQUNBO0FBRUQ7SUFDSUMsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBZ0JBO1FBQ2hELEFBQ0Esd0JBRHdCO1FBQ3hCLFFBQVEsRUFBRSxDQUFDO0lBQ2YsQ0FBQyxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxJQUFnQkE7UUFDbEQsQUFDQSx3QkFEd0I7UUFDeEIsUUFBUSxFQUFFLENBQUM7SUFDZixDQUFDLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQ1RBLENBQUNB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Q0YsaUVBQWlFO0FBQ2pFLGVBQWU7QUFDZiw4RkFBOEY7QUFDOUYseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6Qix1Q0FBdUM7QUFDdkMsV0FBVztBQUNYLFNBQVM7QUFDVCxRQUFRO0FBQ1IsbUVBQW1FO0FBQ25FLGVBQWU7QUFDZiwrR0FBK0c7QUFDL0cseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6Qix1Q0FBdUM7QUFDdkMsV0FBVztBQUNYLFNBQVM7QUFDVCxtRUFBbUU7QUFDbkUsZUFBZTtBQUNmLHFHQUFxRztBQUNyRyx5QkFBeUI7QUFDekIseUJBQXlCO0FBQ3pCLHVDQUF1QztBQUN2QyxXQUFXO0FBQ1gsV0FBVztBQUNYLEtBQUs7QUFDTCxFQUFFO0FBQ0YsRUFBRTtBQUNGLHVDQUF1QztBQUN2QyxnRkFBZ0Y7QUFDaEYsOENBQThDO0FBQzlDLHVCQUF1QjtBQUN2QixtRkFBbUY7QUFDbkYsaUNBQWlDO0FBQ2pDLFNBQVM7QUFDVCxFQUFFO0FBQ0YsaUVBQWlFO0FBQ2pFLGVBQWU7QUFDZix1RkFBdUY7QUFDdkYseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6QiwrQkFBK0I7QUFDL0IsdUNBQXVDO0FBQ3ZDLFdBQVc7QUFDWCxTQUFTO0FBQ1QsUUFBUTtBQUNSLG1FQUFtRTtBQUNuRSxlQUFlO0FBQ2YsOEZBQThGO0FBQzlGLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsdUNBQXVDO0FBQ3ZDLFdBQVc7QUFDWCxTQUFTO0FBQ1QsbUVBQW1FO0FBQ25FLGVBQWU7QUFDZixvRkFBb0Y7QUFDcEYseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6Qix1Q0FBdUM7QUFDdkMsV0FBVztBQUNYLFdBQVc7QUFDWCxLQUFLIiwiZmlsZSI6InRlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbm9kZV9tb2R1bGVzL3J4L3RzL3J4LmFsbC5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9ub2RlLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL21vY2hhLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL3Nob3VsZC5kLnRzXCIgLz4gXG5yZXF1aXJlKCdzb3VyY2UtbWFwLXN1cHBvcnQnKS5pbnN0YWxsKCk7XG5yZXF1aXJlKFwic2hvdWxkXCIpO1xuXG5pbXBvcnQgQXggPSByZXF1aXJlKFwiLi4vc3JjL2FuaW1heGVcIik7XG5pbXBvcnQgUnggPSByZXF1aXJlKFwicnhcIik7XG5cbnZhciBjb3VudGVyQSA9IDA7XG52YXIgY291bnRlckIgPSAwO1xuZnVuY3Rpb24gY291bnRBKHRpbWU6bnVtYmVyKTpBeC5BbmltYXRpb24geyAvL3dlIGNvdWxkIGJlIGNsZXZlciBhbmQgbGV0IHNwYXJrIHRha2UgYSBzZXEsIGJ1dCB1c2VyIGZ1bmN0aW9ucyBzaG91bGQgYmUgc2ltcGxlXG4gICAgcmV0dXJuIEF4LnRha2UodGltZSwgQXguZHJhdyhmdW5jdGlvbiAodGljazpBeC5EcmF3VGljaykge1xuICAgICAgICBjb25zb2xlLmxvZyhcImNvdW50QVwiKTtcbiAgICAgICAgY291bnRlckErKztcbiAgICB9KSk7XG59XG5cbmZ1bmN0aW9uIGNvdW50QXRoZW5Db3VudEIoKTpBeC5BbmltYXRpb24geyAvL3dlIGNvdWxkIGJlIGNsZXZlciBhbmQgbGV0IHNwYXJrIHRha2UgYSBzZXEsIGJ1dCB1c2VyIGZ1bmN0aW9ucyBzaG91bGQgYmUgc2ltcGxlXG4gICAgcmV0dXJuIEF4LnRha2UoMSwgQXguZHJhdyhmdW5jdGlvbiAodGljazpBeC5EcmF3VGljaykge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY291bnRBXCIpO1xuICAgICAgICBjb3VudGVyQSsrO1xuICAgIH0pKS50aGVuKEF4LnRha2UoMSwgQXguZHJhdyhmdW5jdGlvbiAodGljazpBeC5EcmF3VGljaykge1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiY291bnRCXCIpO1xuICAgICAgICBjb3VudGVyQisrO1xuICAgIH0pKSk7XG59XG5cbmRlc2NyaWJlKCd0b1N0cmVhbU51bWJlcicsIGZ1bmN0aW9uICgpIHtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGEgc3RyZWFtIHdpdGggbnVtZXJpY2FsIGlucHV0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBBeC50b1N0cmVhbU51bWJlcig1KS5zaG91bGQubm90LmVxdWFsKDUpO1xuICAgICAgICBBeC50b1N0cmVhbU51bWJlcig1KS5zaG91bGQuaGF2ZS5wcm9wZXJ0eSgnbmV4dCcpO1xuICAgIH0pO1xufSk7XG5kZXNjcmliZSgncG9pbnQnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBhIHBvaW50JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBBeC5wb2ludCg1LCA1KS5uZXh0KCkudG9TdHJpbmcoKS5zaG91bGQuZXF1YWwoWzUsIDVdLnRvU3RyaW5nKCkpO1xuICAgIH0pO1xufSk7XG5cbmRlc2NyaWJlKCd0aGVuJywgZnVuY3Rpb24gKCkge1xuXG4gICAgaXQoJ3N0b3BzIG9uIHRpbWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvdW50ZXJBID0gMDtcbiAgICAgICAgY291bnRlckIgPSAwO1xuICAgICAgICB2YXIgZG93bnN0cmVhbSA9IG5ldyBSeC5SZXBsYXlTdWJqZWN0KCk7XG4gICAgICAgIHZhciBhbmltID0gY291bnRBKDIpLnRoZW4oY291bnRBKDEpKTtcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDApO1xuICAgICAgICB2YXIgdXBzdHJlYW0gPVxuICAgICAgICAgICAgUnguT2JzZXJ2YWJsZS5mcm9tKFswLCAwLjEsIDAuMiwgMC4zLCAwLjQsIDAuNV0pXG4gICAgICAgICAgICAubWFwKHggPT4gbmV3IEF4LkRyYXdUaWNrKG51bGwsIHgsIHgpKTtcbiAgICAgICAgYW5pbS5hdHRhY2godXBzdHJlYW0pLnN1YnNjcmliZShkb3duc3RyZWFtKTtcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDMpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3RoZW5zIG9mIHRoZW5zIG5lc3QnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvdW50ZXJBID0gMDtcbiAgICAgICAgY291bnRlckIgPSAwO1xuICAgICAgICB2YXIgZG93bnN0cmVhbSA9IG5ldyBSeC5SZXBsYXlTdWJqZWN0KCk7XG4gICAgICAgIHZhciBhbmltID0gY291bnRBdGhlbkNvdW50QigpLnRoZW4oY291bnRBdGhlbkNvdW50QigpKTtcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDApO1xuICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4gICAgICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwLCAwKSkucmVwZWF0KDEwKTtcbiAgICAgICAgYW5pbS5hdHRhY2godXBzdHJlYW0pLnN1YnNjcmliZShkb3duc3RyZWFtKTtcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDIpO1xuICAgICAgICBjb3VudGVyQi5zaG91bGQuZXF1YWwoMik7XG4gICAgfSk7XG5cbiAgICBpdCgndGhlbnMgZG8gbm90IG92ZXIgZHJhdycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJ0aGVucyBkbyBub3Qgb3ZlcmRyYXdcIik7XG4gICAgICAgIGNvdW50ZXJBID0gMDtcbiAgICAgICAgY291bnRlckIgPSAwO1xuICAgICAgICB2YXIgZG93bnN0cmVhbSA9IG5ldyBSeC5SZXBsYXlTdWJqZWN0KCk7XG4gICAgICAgIHZhciBhbmltID0gY291bnRBdGhlbkNvdW50QigpO1xuICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4gICAgICAgIGNvdW50ZXJCLnNob3VsZC5lcXVhbCgwKTtcbiAgICAgICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDAsIDApKS5yZXBlYXQoMSk7XG4gICAgICAgIGFuaW0uYXR0YWNoKHVwc3RyZWFtLnRhcChmdW5jdGlvbiAobmV4dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cHN0cmVhbVwiKTtcbiAgICAgICAgfSkpLnRhcChmdW5jdGlvbiAobmV4dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJkb3duc3RyZWFtXCIpO1xuICAgICAgICB9KS5zdWJzY3JpYmUoZG93bnN0cmVhbSk7XG4gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgxKTtcbiAgICAgICAgY291bnRlckIuc2hvdWxkLmVxdWFsKDApO1xuICAgIH0pO1xuXG5cblxuICAgIGl0KCdwYXNzZXMgb24gY2xvY2snLCBmdW5jdGlvbiAoKSB7IC8vdG9kbyBnZW5lcmljIGFuaW1hdGlvbiBjb250cmFjdFxuICAgICAgICB2YXIgdXBzdHJlYW0gPVxuICAgICAgICAgICAgUnguT2JzZXJ2YWJsZS5mcm9tKFswLCAwLjEsIDAuMiwgMC4zXSlcbiAgICAgICAgICAgIC5tYXAoeCA9PiBuZXcgQXguRHJhd1RpY2sobnVsbCwgeCwgeCkpO1xuXG4gICAgICAgIGNvdW50ZXJBID0gMDtcbiAgICAgICAgdmFyIGV4cGVjdGVkQ2xvY2sgPSBbMCwgMC4xLCAwLjIsIDAuM107XG4gICAgICAgIHZhciBleHBlY3RlZEZpcnN0Q2xvY2sgPSBbMF07XG4gICAgICAgIHZhciBleHBlY3RlZFNlY29uZENsb2NrID0gWzAuMSwgMC4yXTtcbiAgICAgICAgdmFyIGFuaW0gPSBBeC5hc3NlcnRDbG9jayhcbiAgICAgICAgICAgIGV4cGVjdGVkQ2xvY2ssXG4gICAgICAgICAgICBBeC5hc3NlcnRDbG9jayhleHBlY3RlZEZpcnN0Q2xvY2ssIGNvdW50QSgxKSlcbiAgICAgICAgICAgICAgICAudGhlbihBeC5hc3NlcnRDbG9jayhleHBlY3RlZFNlY29uZENsb2NrLCBjb3VudEEoMikpKSk7XG5cbiAgICAgICAgYW5pbS5hdHRhY2godXBzdHJlYW0pLnN1YnNjcmliZSgpOyAvL2Vycm9ycyBhcmUgcHJvcG9nYXRlZFxuICAgICAgICBjb3VudGVyQS5zaG91bGQuZXFsKDMpO1xuXG4gICAgfSk7XG59KTtcblxuLy9cbi8vZGVzY3JpYmUoJ2xvb3AnLCBmdW5jdGlvbiAoKSB7XG4vL1xuLy8gICAgaXQoJ3JlcGVhdHMgZmluaXRlIHNlcXVlbmNlJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIGNvdW50ZXJBID0gMDtcbi8vICAgICAgICBjb3VudGVyQiA9IDA7XG4vLyAgICAgICAgdmFyIGRvd25zdHJlYW0gPSBuZXcgUnguUmVwbGF5U3ViamVjdCgpO1xuLy8gICAgICAgIHZhciBhbmltID0gQXgubG9vcChjb3VudEEoMikpO1xuLy8gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgwKTtcbi8vICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMCkpLnJlcGVhdCgxMCk7XG4vLyAgICAgICAgYW5pbS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZShkb3duc3RyZWFtKTtcbi8vICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMTApO1xuLy8gICAgfSk7XG4vLyAgICBpdCgncmVwZWF0cyB0aGVuJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIGNvdW50ZXJBID0gMDtcbi8vICAgICAgICBjb3VudGVyQiA9IDA7XG4vLyAgICAgICAgdmFyIGRvd25zdHJlYW0gPSBuZXcgUnguUmVwbGF5U3ViamVjdCgpO1xuLy8gICAgICAgIHZhciBhbmltID0gQXgubG9vcChjb3VudEF0aGVuQ291bnRCKCkpO1xuLy8gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgwKTtcbi8vICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMCkpLnJlcGVhdCgxMCk7XG4vLyAgICAgICAgYW5pbS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZShkb3duc3RyZWFtKTtcbi8vICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoNSk7XG4vLyAgICAgICAgY291bnRlckIuc2hvdWxkLmVxdWFsKDUpO1xuLy8gICAgfSk7XG4vLyAgICBpdCgncmVwZWF0cyB3b3JrcyB3aXRoIGlubmVyIHRoZW4nLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgY291bnRlckEgPSAwO1xuLy8gICAgICAgIGNvdW50ZXJCID0gMDtcbi8vICAgICAgICB2YXIgZG93bnN0cmVhbSA9IG5ldyBSeC5SZXBsYXlTdWJqZWN0KCk7XG4vLyAgICAgICAgdmFyIGFuaW0gPSBBeC5sb29wKGNvdW50QXRoZW5Db3VudEIoKSk7XG4vLyAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDApO1xuLy8gICAgICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwKSkucmVwZWF0KDUpO1xuLy8gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoZG93bnN0cmVhbSk7XG4vLyAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDMpO1xuLy8gICAgICAgIGNvdW50ZXJCLnNob3VsZC5lcXVhbCgyKTtcbi8vICAgIH0pO1xuLy9cbi8vICAgIGl0KCdwYXNzZXMgb24gZHQnLCBmdW5jdGlvbiAoKSB7IC8vdG9kbyBnZW5lcmljIGFuaW1hdGlvbiBjb250cmFjdFxuLy8gICAgICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwLjEpKS5yZXBlYXQoMyk7XG4vLyAgICAgICAgdmFyIGV4cGVjdGVkRHQgPSBSeC5PYnNlcnZhYmxlLmZyb20oWzAuMSwgMC4xLCAwLjFdKTtcbi8vICAgICAgICB2YXIgYW5pbSA9IEF4LmFzc2VydER0KGV4cGVjdGVkRHQsIEF4Lmxvb3AoQXguYXNzZXJ0RHQoZXhwZWN0ZWREdCwgY291bnRBdGhlbkNvdW50QigpKSkpO1xuLy8gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmVPbkVycm9yKFxuLy8gICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbi8vICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuLy8gICAgICAgICAgICB9XG4vLyAgICAgICAgKTtcbi8vICAgIH0pO1xuLy9cbi8vICAgIGl0KCdwYXNzZXMgb24gY2xvY2snLCBmdW5jdGlvbiAoKSB7IC8vdG9kbyBnZW5lcmljIGFuaW1hdGlvbiBjb250cmFjdFxuLy8gICAgICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwLjEpKS5yZXBlYXQoMyk7XG4vLyAgICAgICAgdmFyIGV4cGVjdGVkQ2xvY2sgPSBbMCwgMC4xLCAwLjJdO1xuLy8gICAgICAgIHZhciBhbmltID0gQXguYXNzZXJ0Q2xvY2soZXhwZWN0ZWRDbG9jaywgQXgubG9vcChBeC5hc3NlcnRDbG9jayhleHBlY3RlZENsb2NrLCBjb3VudEF0aGVuQ291bnRCKCkpKSk7XG4vLyAgICAgICAgYW5pbS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZU9uRXJyb3IoXG4vLyAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuLy8gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4vLyAgICAgICAgICAgIH1cbi8vICAgICAgICApO1xuLy8gICAgfSk7XG4vL1xuLy8gICAgaXQoJ3Nob3VsZCBwYXNzIGVycm9ycycsIGZ1bmN0aW9uICgpIHsgLy90b2RvIGdlbmVyaWMgYW5pbWF0aW9uIGNvbnRyYWN0XG4vLyAgICAgICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDAuMSkpLnJlcGVhdCgzKTtcbi8vICAgICAgICB2YXIgZXhwZWN0ZWRUaW1lID0gUnguT2JzZXJ2YWJsZS5mcm9tKFswXSk7XG4vLyAgICAgICAgLy92YXIgYW5pbSA9IEF4LmFzc2VydENsb2NrKGV4cGVjdGVkVGltZSwgQXgubG9vcChBeC5hc3NlcnRDbG9jayhleHBlY3RlZFRpbWUsIGNvdW50QXRoZW5Db3VudEIoKSkpKTtcbi8vICAgICAgICB2YXIgYW5pbSA9IEF4LmFzc2VydER0KGV4cGVjdGVkVGltZSwgQXgubG9vcChjb3VudEF0aGVuQ291bnRCKCkpKTtcbi8vICAgICAgICB2YXIgc2VlbkVycm9yID0gZmFsc2U7XG4vLyAgICAgICAgYW5pbS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZU9uRXJyb3IoXG4vLyAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuLy8gICAgICAgICAgICAgICAgc2VlbkVycm9yID0gdHJ1ZTtcbi8vICAgICAgICAgICAgfVxuLy8gICAgICAgICk7XG4vLyAgICAgICAgc2VlbkVycm9yLnNob3VsZC5lcWwodHJ1ZSk7XG4vLyAgICB9KTtcbi8vfSk7XG4vL1xuLy9kZXNjcmliZSgnc2luJywgZnVuY3Rpb24gKCkge1xuLy8gICAgdmFyIGFuaW1hdG9yID0gbmV3IEF4LkFuaW1hdG9yKG51bGwpO1xuLy8gICAgdmFyIHRpY2tlciA9IG5ldyBSeC5TdWJqZWN0PG51bWJlcj4oKTtcbi8vICAgIGFuaW1hdG9yLnRpY2tlcih0aWNrZXIpO1xuLy9cbi8vXG4vLyAgICBpdCgnc2hvdWxkIHJldHVybiBhIG51bWJlciBpbW1lZGlhdGVseSBuZXh0IHRpY2snLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgdmFyIGdvdE51bWJlciA9IGZhbHNlO1xuLy8gICAgICAgIEF4LnNpbigxKS5uZXh0KCkuc2hvdWxkLmVxdWFsKDApO1xuLy8gICAgfSk7XG4vL30pO1xuLy9cbi8vZGVzY3JpYmUoJ2Fzc2VydER0JywgZnVuY3Rpb24gKCkge1xuLy8gICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDAuMSkpLnJlcGVhdCgzKTtcbi8vICAgIGl0KCdzaG91bGQgcGFzcyBpZiByaWdodCcsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICBBeC5hc3NlcnREdChSeC5PYnNlcnZhYmxlLmZyb20oWzAuMSwgMC4yLCAwLjNdKSwgY291bnRBKDEpKS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZSgpO1xuLy8gICAgfSk7XG4vL1xuLy8gICAgaXQoJ3Nob3VsZCB0aHJvdyBpZiB3cm9uZyAobnVtYmVyIG1pc21hdGNoKScsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICB0cnkge1xuLy8gICAgICAgICAgICBBeC5hc3NlcnREdChSeC5PYnNlcnZhYmxlLmZyb20oWzBdKSwgY291bnRBKDEpKS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZSgpO1xuLy8gICAgICAgICAgICB0aHJvdyBudWxsO1xuLy8gICAgICAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgICAgICAgICBlcnIuc2hvdWxkLm5vdC5lcWwobnVsbCk7XG4vLyAgICAgICAgfVxuLy8gICAgfSk7XG4vLyAgICAvKlxuLy8gICAgaXQoJ3Nob3VsZCB0aHJvdyBpZiB3cm9uZyAobGVuZ3RoIG1pc21hdGNoIDEpJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIHRyeSB7XG4vLyAgICAgICAgICAgIEF4LmFzc2VydER0KFJ4Lk9ic2VydmFibGUuZnJvbShbMC4xLCAwLjIsIDAuMywgMC40XSksIGNvdW50QSgxKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICAgICAgdGhyb3cgbnVsbDtcbi8vICAgICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgICAgICAgZXJyLnNob3VsZC5ub3QuZXFsKG51bGwpO1xuLy8gICAgICAgIH1cbi8vICAgIH0pO1xuLy8gICAgaXQoJ3Nob3VsZCB0aHJvdyBpZiB3cm9uZyAobGVuZ3RoIG1pc21hdGNoIDIpJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIHRyeSB7XG4vLyAgICAgICAgICAgIEF4LmFzc2VydER0KFJ4Lk9ic2VydmFibGUuZnJvbShbMC4xLCAwLjJdKSwgY291bnRBKDEpKS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZSgpO1xuLy8gICAgICAgICAgICB0aHJvdyBudWxsO1xuLy8gICAgICAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgICAgICAgICBlcnIuc2hvdWxkLm5vdC5lcWwobnVsbCk7XG4vLyAgICAgICAgfVxuLy8gICAgfSk7Ki9cbi8vfSk7XG4vL1xuLy9cbi8vZGVzY3JpYmUoJ2Fzc2VydENsb2NrJywgZnVuY3Rpb24gKCkge1xuLy8gICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDAuMSkpLnJlcGVhdCgzKTtcbi8vICAgIGl0KCdzaG91bGQgcGFzcyBpZiByaWdodCcsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICBjb3VudGVyQSA9IDA7XG4vLyAgICAgICAgQXguYXNzZXJ0Q2xvY2soWzAsIDAuMSwgMC4yXSwgY291bnRBKDMpKS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZSgpO1xuLy8gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcWwoMyk7XG4vLyAgICB9KTtcbi8vXG4vLyAgICBpdCgnc2hvdWxkIHRocm93IGlmIHdyb25nIChudW1iZXIgbWlzbWF0Y2gpJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIHRyeSB7XG4vLyAgICAgICAgICAgIEF4LmFzc2VydENsb2NrKFswLCAwLjEsIDAuM10sIGNvdW50QSgzKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICAgICAgdGhyb3cgbnVsbDtcbi8vICAgICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbi8vICAgICAgICAgICAgZXJyLnNob3VsZC5ub3QuZXFsKG51bGwpO1xuLy8gICAgICAgIH1cbi8vICAgIH0pO1xuLy8gICAgLypcbi8vICAgIGl0KCdzaG91bGQgdGhyb3cgaWYgd3JvbmcgKGxlbmd0aCBtaXNtYXRjaCAxKScsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICB0cnkge1xuLy8gICAgICAgICAgICBBeC5hc3NlcnRDbG9jayhbMC4xLCAwLjIsIDAuMywgMC40XSwgY291bnRBKDMpKS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZSgpO1xuLy8gICAgICAgICAgICB0aHJvdyBudWxsO1xuLy8gICAgICAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgICAgICAgICBlcnIuc2hvdWxkLm5vdC5lcWwobnVsbCk7XG4vLyAgICAgICAgfVxuLy8gICAgfSk7XG4vLyAgICBpdCgnc2hvdWxkIHRocm93IGlmIHdyb25nIChsZW5ndGggbWlzbWF0Y2ggMiknLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgdHJ5IHtcbi8vICAgICAgICAgICAgQXguYXNzZXJ0Q2xvY2soWzAuMSwgMC4yXSwgY291bnRBKDMpKS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZSgpO1xuLy8gICAgICAgICAgICB0aHJvdyBudWxsO1xuLy8gICAgICAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgICAgICAgICBlcnIuc2hvdWxkLm5vdC5lcWwobnVsbCk7XG4vLyAgICAgICAgfVxuLy8gICAgfSk7Ki9cbi8vfSk7XG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==