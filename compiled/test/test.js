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
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(10);
        anim.attach(0, upstream).subscribe(downstream);
        counterA.should.equal(3);
    });
    it('thens of thens nest', function () {
        counterA = 0;
        counterB = 0;
        var downstream = new Rx.ReplaySubject();
        var anim = countAthenCountB().then(countAthenCountB());
        counterA.should.equal(0);
        counterA.should.equal(0);
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(10);
        anim.attach(0, upstream).subscribe(downstream);
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
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(1);
        anim.attach(0, upstream.tap(function (next) {
            console.log("upstream");
        })).tap(function (next) {
            console.log("downstream");
        }).subscribe(downstream);
        counterA.should.equal(1);
        counterB.should.equal(0);
    });
    it('passes on clock', function () {
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0.1)).repeat(3);
        counterA = 0;
        var expectedClock = [0, 0.1, 0.2, 0.3];
        var expectedFirstClock = [0];
        var expectedSecondClock = [0.1, 0.2];
        var anim = Ax.assertClock(expectedClock, Ax.assertClock(expectedFirstClock, countA(1))
            .then(Ax.assertClock(expectedSecondClock, countA(2))));
        anim.attach(0, upstream).subscribe(); //errors are propogated
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3QudHMiXSwibmFtZXMiOlsiY291bnRBIiwiY291bnRBdGhlbkNvdW50QiJdLCJtYXBwaW5ncyI6IkFBQUEsQUFJQSwwREFKMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLDRDQUE0QztBQUM1Qyw4Q0FBOEM7QUFDOUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDeEMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRWxCLElBQU8sRUFBRSxXQUFXLGdCQUFnQixDQUFDLENBQUM7QUFDdEMsSUFBTyxFQUFFLFdBQVcsSUFBSSxDQUFDLENBQUM7QUFFMUIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBQ2pCLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztBQUNqQixnQkFBZ0IsSUFBVztJQUN2QkEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBZ0JBO1FBQ25ELE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEIsUUFBUSxFQUFFLENBQUM7SUFDZixDQUFDLENBQUNBLENBQUNBLENBQUNBO0FBQ1JBLENBQUNBO0FBRUQ7SUFDSUMsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBZ0JBO1FBQ2hELEFBQ0Esd0JBRHdCO1FBQ3hCLFFBQVEsRUFBRSxDQUFDO0lBQ2YsQ0FBQyxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxJQUFnQkE7UUFDbEQsQUFDQSx3QkFEd0I7UUFDeEIsUUFBUSxFQUFFLENBQUM7SUFDZixDQUFDLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQ1RBLENBQUNB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Q3pCLHVDQUF1QztBQUN2QyxXQUFXO0FBQ1gsU0FBUztBQUNULG1FQUFtRTtBQUNuRSxlQUFlO0FBQ2YscUdBQXFHO0FBQ3JHLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsdUNBQXVDO0FBQ3ZDLFdBQVc7QUFDWCxXQUFXO0FBQ1gsS0FBSztBQUNMLEVBQUU7QUFDRixFQUFFO0FBQ0YsdUNBQXVDO0FBQ3ZDLGdGQUFnRjtBQUNoRiw4Q0FBOEM7QUFDOUMsdUJBQXVCO0FBQ3ZCLG1GQUFtRjtBQUNuRixpQ0FBaUM7QUFDakMsU0FBUztBQUNULEVBQUU7QUFDRixpRUFBaUU7QUFDakUsZUFBZTtBQUNmLHVGQUF1RjtBQUN2Rix5QkFBeUI7QUFDekIseUJBQXlCO0FBQ3pCLCtCQUErQjtBQUMvQix1Q0FBdUM7QUFDdkMsV0FBVztBQUNYLFNBQVM7QUFDVCxRQUFRO0FBQ1IsbUVBQW1FO0FBQ25FLGVBQWU7QUFDZiw4RkFBOEY7QUFDOUYseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6Qix1Q0FBdUM7QUFDdkMsV0FBVztBQUNYLFNBQVM7QUFDVCxtRUFBbUU7QUFDbkUsZUFBZTtBQUNmLG9GQUFvRjtBQUNwRix5QkFBeUI7QUFDekIseUJBQXlCO0FBQ3pCLHVDQUF1QztBQUN2QyxXQUFXO0FBQ1gsV0FBVztBQUNYLEtBQUsiLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi9ub2RlX21vZHVsZXMvcngvdHMvcnguYWxsLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGVzL25vZGUuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbW9jaGEuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvc2hvdWxkLmQudHNcIiAvPiBcbnJlcXVpcmUoJ3NvdXJjZS1tYXAtc3VwcG9ydCcpLmluc3RhbGwoKTtcbnJlcXVpcmUoXCJzaG91bGRcIik7XG5cbmltcG9ydCBBeCA9IHJlcXVpcmUoXCIuLi9zcmMvYW5pbWF4ZVwiKTtcbmltcG9ydCBSeCA9IHJlcXVpcmUoXCJyeFwiKTtcblxudmFyIGNvdW50ZXJBID0gMDtcbnZhciBjb3VudGVyQiA9IDA7XG5mdW5jdGlvbiBjb3VudEEodGltZTpudW1iZXIpOkF4LkFuaW1hdGlvbiB7IC8vd2UgY291bGQgYmUgY2xldmVyIGFuZCBsZXQgc3BhcmsgdGFrZSBhIHNlcSwgYnV0IHVzZXIgZnVuY3Rpb25zIHNob3VsZCBiZSBzaW1wbGVcbiAgICByZXR1cm4gQXgudGFrZSh0aW1lLCBBeC5kcmF3KGZ1bmN0aW9uICh0aWNrOkF4LkRyYXdUaWNrKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY291bnRBXCIpO1xuICAgICAgICBjb3VudGVyQSsrO1xuICAgIH0pKTtcbn1cblxuZnVuY3Rpb24gY291bnRBdGhlbkNvdW50QigpOkF4LkFuaW1hdGlvbiB7IC8vd2UgY291bGQgYmUgY2xldmVyIGFuZCBsZXQgc3BhcmsgdGFrZSBhIHNlcSwgYnV0IHVzZXIgZnVuY3Rpb25zIHNob3VsZCBiZSBzaW1wbGVcbiAgICByZXR1cm4gQXgudGFrZSgxLCBBeC5kcmF3KGZ1bmN0aW9uICh0aWNrOkF4LkRyYXdUaWNrKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJjb3VudEFcIik7XG4gICAgICAgIGNvdW50ZXJBKys7XG4gICAgfSkpLnRoZW4oQXgudGFrZSgxLCBBeC5kcmF3KGZ1bmN0aW9uICh0aWNrOkF4LkRyYXdUaWNrKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJjb3VudEJcIik7XG4gICAgICAgIGNvdW50ZXJCKys7XG4gICAgfSkpKTtcbn1cblxuZGVzY3JpYmUoJ3RvU3RyZWFtTnVtYmVyJywgZnVuY3Rpb24gKCkge1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gYSBzdHJlYW0gd2l0aCBudW1lcmljYWwgaW5wdXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEF4LnRvU3RyZWFtTnVtYmVyKDUpLnNob3VsZC5ub3QuZXF1YWwoNSk7XG4gICAgICAgIEF4LnRvU3RyZWFtTnVtYmVyKDUpLnNob3VsZC5oYXZlLnByb3BlcnR5KCduZXh0Jyk7XG4gICAgfSk7XG59KTtcbmRlc2NyaWJlKCdwb2ludCcsIGZ1bmN0aW9uICgpIHtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGEgcG9pbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIEF4LnBvaW50KDUsIDUpLm5leHQoKS50b1N0cmluZygpLnNob3VsZC5lcXVhbChbNSwgNV0udG9TdHJpbmcoKSk7XG4gICAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ3RoZW4nLCBmdW5jdGlvbiAoKSB7XG5cbiAgICBpdCgnc3RvcHMgb24gdGltZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY291bnRlckEgPSAwO1xuICAgICAgICBjb3VudGVyQiA9IDA7XG4gICAgICAgIHZhciBkb3duc3RyZWFtID0gbmV3IFJ4LlJlcGxheVN1YmplY3QoKTtcbiAgICAgICAgdmFyIGFuaW0gPSBjb3VudEEoMikudGhlbihjb3VudEEoMSkpO1xuICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4gICAgICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwKSkucmVwZWF0KDEwKTtcbiAgICAgICAgYW5pbS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZShkb3duc3RyZWFtKTtcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDMpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3RoZW5zIG9mIHRoZW5zIG5lc3QnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvdW50ZXJBID0gMDtcbiAgICAgICAgY291bnRlckIgPSAwO1xuICAgICAgICB2YXIgZG93bnN0cmVhbSA9IG5ldyBSeC5SZXBsYXlTdWJqZWN0KCk7XG4gICAgICAgIHZhciBhbmltID0gY291bnRBdGhlbkNvdW50QigpLnRoZW4oY291bnRBdGhlbkNvdW50QigpKTtcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDApO1xuICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4gICAgICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwKSkucmVwZWF0KDEwKTtcbiAgICAgICAgYW5pbS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZShkb3duc3RyZWFtKTtcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDIpO1xuICAgICAgICBjb3VudGVyQi5zaG91bGQuZXF1YWwoMik7XG4gICAgfSk7XG5cbiAgICBpdCgndGhlbnMgZG8gbm90IG92ZXIgZHJhdycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJ0aGVucyBkbyBub3Qgb3ZlcmRyYXdcIik7XG4gICAgICAgIGNvdW50ZXJBID0gMDtcbiAgICAgICAgY291bnRlckIgPSAwO1xuICAgICAgICB2YXIgZG93bnN0cmVhbSA9IG5ldyBSeC5SZXBsYXlTdWJqZWN0KCk7XG4gICAgICAgIHZhciBhbmltID0gY291bnRBdGhlbkNvdW50QigpO1xuICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4gICAgICAgIGNvdW50ZXJCLnNob3VsZC5lcXVhbCgwKTtcbiAgICAgICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDApKS5yZXBlYXQoMSk7XG4gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtLnRhcChmdW5jdGlvbiAobmV4dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJ1cHN0cmVhbVwiKTtcbiAgICAgICAgfSkpLnRhcChmdW5jdGlvbiAobmV4dCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJkb3duc3RyZWFtXCIpO1xuICAgICAgICB9KS5zdWJzY3JpYmUoZG93bnN0cmVhbSk7XG4gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgxKTtcbiAgICAgICAgY291bnRlckIuc2hvdWxkLmVxdWFsKDApO1xuICAgIH0pO1xuXG5cblxuICAgIGl0KCdwYXNzZXMgb24gY2xvY2snLCBmdW5jdGlvbiAoKSB7IC8vdG9kbyBnZW5lcmljIGFuaW1hdGlvbiBjb250cmFjdFxuICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMC4xKSkucmVwZWF0KDMpO1xuICAgICAgICBjb3VudGVyQSA9IDA7XG4gICAgICAgIHZhciBleHBlY3RlZENsb2NrID0gWzAsIDAuMSwgMC4yLCAwLjNdO1xuICAgICAgICB2YXIgZXhwZWN0ZWRGaXJzdENsb2NrID0gWzBdO1xuICAgICAgICB2YXIgZXhwZWN0ZWRTZWNvbmRDbG9jayA9IFswLjEsIDAuMl07XG4gICAgICAgIHZhciBhbmltID0gQXguYXNzZXJ0Q2xvY2soXG4gICAgICAgICAgICBleHBlY3RlZENsb2NrLFxuICAgICAgICAgICAgQXguYXNzZXJ0Q2xvY2soZXhwZWN0ZWRGaXJzdENsb2NrLCBjb3VudEEoMSkpXG4gICAgICAgICAgICAgICAgLnRoZW4oQXguYXNzZXJ0Q2xvY2soZXhwZWN0ZWRTZWNvbmRDbG9jaywgY291bnRBKDIpKSkpO1xuXG4gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTsgLy9lcnJvcnMgYXJlIHByb3BvZ2F0ZWRcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxbCgzKTtcblxuICAgIH0pO1xufSk7XG5cbi8vXG4vL2Rlc2NyaWJlKCdsb29wJywgZnVuY3Rpb24gKCkge1xuLy9cbi8vICAgIGl0KCdyZXBlYXRzIGZpbml0ZSBzZXF1ZW5jZScsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICBjb3VudGVyQSA9IDA7XG4vLyAgICAgICAgY291bnRlckIgPSAwO1xuLy8gICAgICAgIHZhciBkb3duc3RyZWFtID0gbmV3IFJ4LlJlcGxheVN1YmplY3QoKTtcbi8vICAgICAgICB2YXIgYW5pbSA9IEF4Lmxvb3AoY291bnRBKDIpKTtcbi8vICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4vLyAgICAgICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDApKS5yZXBlYXQoMTApO1xuLy8gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoZG93bnN0cmVhbSk7XG4vLyAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDEwKTtcbi8vICAgIH0pO1xuLy8gICAgaXQoJ3JlcGVhdHMgdGhlbicsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICBjb3VudGVyQSA9IDA7XG4vLyAgICAgICAgY291bnRlckIgPSAwO1xuLy8gICAgICAgIHZhciBkb3duc3RyZWFtID0gbmV3IFJ4LlJlcGxheVN1YmplY3QoKTtcbi8vICAgICAgICB2YXIgYW5pbSA9IEF4Lmxvb3AoY291bnRBdGhlbkNvdW50QigpKTtcbi8vICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4vLyAgICAgICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDApKS5yZXBlYXQoMTApO1xuLy8gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoZG93bnN0cmVhbSk7XG4vLyAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDUpO1xuLy8gICAgICAgIGNvdW50ZXJCLnNob3VsZC5lcXVhbCg1KTtcbi8vICAgIH0pO1xuLy8gICAgaXQoJ3JlcGVhdHMgd29ya3Mgd2l0aCBpbm5lciB0aGVuJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIGNvdW50ZXJBID0gMDtcbi8vICAgICAgICBjb3VudGVyQiA9IDA7XG4vLyAgICAgICAgdmFyIGRvd25zdHJlYW0gPSBuZXcgUnguUmVwbGF5U3ViamVjdCgpO1xuLy8gICAgICAgIHZhciBhbmltID0gQXgubG9vcChjb3VudEF0aGVuQ291bnRCKCkpO1xuLy8gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgwKTtcbi8vICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMCkpLnJlcGVhdCg1KTtcbi8vICAgICAgICBhbmltLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKGRvd25zdHJlYW0pO1xuLy8gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgzKTtcbi8vICAgICAgICBjb3VudGVyQi5zaG91bGQuZXF1YWwoMik7XG4vLyAgICB9KTtcbi8vXG4vLyAgICBpdCgncGFzc2VzIG9uIGR0JywgZnVuY3Rpb24gKCkgeyAvL3RvZG8gZ2VuZXJpYyBhbmltYXRpb24gY29udHJhY3Rcbi8vICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMC4xKSkucmVwZWF0KDMpO1xuLy8gICAgICAgIHZhciBleHBlY3RlZER0ID0gUnguT2JzZXJ2YWJsZS5mcm9tKFswLjEsIDAuMSwgMC4xXSk7XG4vLyAgICAgICAgdmFyIGFuaW0gPSBBeC5hc3NlcnREdChleHBlY3RlZER0LCBBeC5sb29wKEF4LmFzc2VydER0KGV4cGVjdGVkRHQsIGNvdW50QXRoZW5Db3VudEIoKSkpKTtcbi8vICAgICAgICBhbmltLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlT25FcnJvcihcbi8vICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4vLyAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbi8vICAgICAgICAgICAgfVxuLy8gICAgICAgICk7XG4vLyAgICB9KTtcbi8vXG4vLyAgICBpdCgncGFzc2VzIG9uIGNsb2NrJywgZnVuY3Rpb24gKCkgeyAvL3RvZG8gZ2VuZXJpYyBhbmltYXRpb24gY29udHJhY3Rcbi8vICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMC4xKSkucmVwZWF0KDMpO1xuLy8gICAgICAgIHZhciBleHBlY3RlZENsb2NrID0gWzAsIDAuMSwgMC4yXTtcbi8vICAgICAgICB2YXIgYW5pbSA9IEF4LmFzc2VydENsb2NrKGV4cGVjdGVkQ2xvY2ssIEF4Lmxvb3AoQXguYXNzZXJ0Q2xvY2soZXhwZWN0ZWRDbG9jaywgY291bnRBdGhlbkNvdW50QigpKSkpO1xuLy8gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmVPbkVycm9yKFxuLy8gICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbi8vICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuLy8gICAgICAgICAgICB9XG4vLyAgICAgICAgKTtcbi8vICAgIH0pO1xuLy9cbi8vICAgIGl0KCdzaG91bGQgcGFzcyBlcnJvcnMnLCBmdW5jdGlvbiAoKSB7IC8vdG9kbyBnZW5lcmljIGFuaW1hdGlvbiBjb250cmFjdFxuLy8gICAgICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwLjEpKS5yZXBlYXQoMyk7XG4vLyAgICAgICAgdmFyIGV4cGVjdGVkVGltZSA9IFJ4Lk9ic2VydmFibGUuZnJvbShbMF0pO1xuLy8gICAgICAgIC8vdmFyIGFuaW0gPSBBeC5hc3NlcnRDbG9jayhleHBlY3RlZFRpbWUsIEF4Lmxvb3AoQXguYXNzZXJ0Q2xvY2soZXhwZWN0ZWRUaW1lLCBjb3VudEF0aGVuQ291bnRCKCkpKSk7XG4vLyAgICAgICAgdmFyIGFuaW0gPSBBeC5hc3NlcnREdChleHBlY3RlZFRpbWUsIEF4Lmxvb3AoY291bnRBdGhlbkNvdW50QigpKSk7XG4vLyAgICAgICAgdmFyIHNlZW5FcnJvciA9IGZhbHNlO1xuLy8gICAgICAgIGFuaW0uYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmVPbkVycm9yKFxuLy8gICAgICAgICAgICBmdW5jdGlvbiAoZXJyb3IpIHtcbi8vICAgICAgICAgICAgICAgIHNlZW5FcnJvciA9IHRydWU7XG4vLyAgICAgICAgICAgIH1cbi8vICAgICAgICApO1xuLy8gICAgICAgIHNlZW5FcnJvci5zaG91bGQuZXFsKHRydWUpO1xuLy8gICAgfSk7XG4vL30pO1xuLy9cbi8vZGVzY3JpYmUoJ3NpbicsIGZ1bmN0aW9uICgpIHtcbi8vICAgIHZhciBhbmltYXRvciA9IG5ldyBBeC5BbmltYXRvcihudWxsKTtcbi8vICAgIHZhciB0aWNrZXIgPSBuZXcgUnguU3ViamVjdDxudW1iZXI+KCk7XG4vLyAgICBhbmltYXRvci50aWNrZXIodGlja2VyKTtcbi8vXG4vL1xuLy8gICAgaXQoJ3Nob3VsZCByZXR1cm4gYSBudW1iZXIgaW1tZWRpYXRlbHkgbmV4dCB0aWNrJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIHZhciBnb3ROdW1iZXIgPSBmYWxzZTtcbi8vICAgICAgICBBeC5zaW4oMSkubmV4dCgpLnNob3VsZC5lcXVhbCgwKTtcbi8vICAgIH0pO1xuLy99KTtcbi8vXG4vL2Rlc2NyaWJlKCdhc3NlcnREdCcsIGZ1bmN0aW9uICgpIHtcbi8vICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwLjEpKS5yZXBlYXQoMyk7XG4vLyAgICBpdCgnc2hvdWxkIHBhc3MgaWYgcmlnaHQnLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgQXguYXNzZXJ0RHQoUnguT2JzZXJ2YWJsZS5mcm9tKFswLjEsIDAuMiwgMC4zXSksIGNvdW50QSgxKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgIH0pO1xuLy9cbi8vICAgIGl0KCdzaG91bGQgdGhyb3cgaWYgd3JvbmcgKG51bWJlciBtaXNtYXRjaCknLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgdHJ5IHtcbi8vICAgICAgICAgICAgQXguYXNzZXJ0RHQoUnguT2JzZXJ2YWJsZS5mcm9tKFswXSksIGNvdW50QSgxKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICAgICAgdGhyb3cgbnVsbDtcbi8vICAgICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgICAgICAgZXJyLnNob3VsZC5ub3QuZXFsKG51bGwpO1xuLy8gICAgICAgIH1cbi8vICAgIH0pO1xuLy8gICAgLypcbi8vICAgIGl0KCdzaG91bGQgdGhyb3cgaWYgd3JvbmcgKGxlbmd0aCBtaXNtYXRjaCAxKScsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICB0cnkge1xuLy8gICAgICAgICAgICBBeC5hc3NlcnREdChSeC5PYnNlcnZhYmxlLmZyb20oWzAuMSwgMC4yLCAwLjMsIDAuNF0pLCBjb3VudEEoMSkpLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKCk7XG4vLyAgICAgICAgICAgIHRocm93IG51bGw7XG4vLyAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICAgICAgIGVyci5zaG91bGQubm90LmVxbChudWxsKTtcbi8vICAgICAgICB9XG4vLyAgICB9KTtcbi8vICAgIGl0KCdzaG91bGQgdGhyb3cgaWYgd3JvbmcgKGxlbmd0aCBtaXNtYXRjaCAyKScsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICB0cnkge1xuLy8gICAgICAgICAgICBBeC5hc3NlcnREdChSeC5PYnNlcnZhYmxlLmZyb20oWzAuMSwgMC4yXSksIGNvdW50QSgxKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICAgICAgdGhyb3cgbnVsbDtcbi8vICAgICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgICAgICAgZXJyLnNob3VsZC5ub3QuZXFsKG51bGwpO1xuLy8gICAgICAgIH1cbi8vICAgIH0pOyovXG4vL30pO1xuLy9cbi8vXG4vL2Rlc2NyaWJlKCdhc3NlcnRDbG9jaycsIGZ1bmN0aW9uICgpIHtcbi8vICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwLjEpKS5yZXBlYXQoMyk7XG4vLyAgICBpdCgnc2hvdWxkIHBhc3MgaWYgcmlnaHQnLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgY291bnRlckEgPSAwO1xuLy8gICAgICAgIEF4LmFzc2VydENsb2NrKFswLCAwLjEsIDAuMl0sIGNvdW50QSgzKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICBjb3VudGVyQS5zaG91bGQuZXFsKDMpO1xuLy8gICAgfSk7XG4vL1xuLy8gICAgaXQoJ3Nob3VsZCB0aHJvdyBpZiB3cm9uZyAobnVtYmVyIG1pc21hdGNoKScsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICB0cnkge1xuLy8gICAgICAgICAgICBBeC5hc3NlcnRDbG9jayhbMCwgMC4xLCAwLjNdLCBjb3VudEEoMykpLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKCk7XG4vLyAgICAgICAgICAgIHRocm93IG51bGw7XG4vLyAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycik7XG4vLyAgICAgICAgICAgIGVyci5zaG91bGQubm90LmVxbChudWxsKTtcbi8vICAgICAgICB9XG4vLyAgICB9KTtcbi8vICAgIC8qXG4vLyAgICBpdCgnc2hvdWxkIHRocm93IGlmIHdyb25nIChsZW5ndGggbWlzbWF0Y2ggMSknLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgdHJ5IHtcbi8vICAgICAgICAgICAgQXguYXNzZXJ0Q2xvY2soWzAuMSwgMC4yLCAwLjMsIDAuNF0sIGNvdW50QSgzKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICAgICAgdGhyb3cgbnVsbDtcbi8vICAgICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgICAgICAgZXJyLnNob3VsZC5ub3QuZXFsKG51bGwpO1xuLy8gICAgICAgIH1cbi8vICAgIH0pO1xuLy8gICAgaXQoJ3Nob3VsZCB0aHJvdyBpZiB3cm9uZyAobGVuZ3RoIG1pc21hdGNoIDIpJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIHRyeSB7XG4vLyAgICAgICAgICAgIEF4LmFzc2VydENsb2NrKFswLjEsIDAuMl0sIGNvdW50QSgzKSkuYXR0YWNoKDAsIHVwc3RyZWFtKS5zdWJzY3JpYmUoKTtcbi8vICAgICAgICAgICAgdGhyb3cgbnVsbDtcbi8vICAgICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgICAgICAgZXJyLnNob3VsZC5ub3QuZXFsKG51bGwpO1xuLy8gICAgICAgIH1cbi8vICAgIH0pOyovXG4vL30pO1xuXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=