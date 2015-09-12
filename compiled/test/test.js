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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlc3QudHMiXSwibmFtZXMiOlsiY291bnRBIiwiY291bnRBdGhlbkNvdW50QiJdLCJtYXBwaW5ncyI6IkFBQUEsQUFJQSwwREFKMEQ7QUFDMUQsMkNBQTJDO0FBQzNDLDRDQUE0QztBQUM1Qyw4Q0FBOEM7QUFDOUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDeEMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRWxCLElBQU8sRUFBRSxXQUFXLGdCQUFnQixDQUFDLENBQUM7QUFDdEMsSUFBTyxFQUFFLFdBQVcsSUFBSSxDQUFDLENBQUM7QUFFMUIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0FBQ2pCLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztBQUNqQixnQkFBZ0IsSUFBVztJQUN2QkEsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsRUFBRUEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBZ0JBO1FBQ25ELE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEIsUUFBUSxFQUFFLENBQUM7SUFDZixDQUFDLENBQUNBLENBQUNBLENBQUNBO0FBQ1JBLENBQUNBO0FBRUQ7SUFDSUMsTUFBTUEsQ0FBQ0EsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsVUFBVUEsSUFBZ0JBO1FBQ2hELEFBQ0Esd0JBRHdCO1FBQ3hCLFFBQVEsRUFBRSxDQUFDO0lBQ2YsQ0FBQyxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxVQUFVQSxJQUFnQkE7UUFDbEQsQUFDQSx3QkFEd0I7UUFDeEIsUUFBUSxFQUFFLENBQUM7SUFDZixDQUFDLENBQUNBLENBQUNBLENBQUNBLENBQUNBO0FBQ1RBLENBQUNB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Q1QsRUFBRTtBQUNGLGlFQUFpRTtBQUNqRSxlQUFlO0FBQ2YsOEZBQThGO0FBQzlGLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsdUNBQXVDO0FBQ3ZDLFdBQVc7QUFDWCxTQUFTO0FBQ1QsUUFBUTtBQUNSLG1FQUFtRTtBQUNuRSxlQUFlO0FBQ2YsK0dBQStHO0FBQy9HLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsdUNBQXVDO0FBQ3ZDLFdBQVc7QUFDWCxTQUFTO0FBQ1QsbUVBQW1FO0FBQ25FLGVBQWU7QUFDZixxR0FBcUc7QUFDckcseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6Qix1Q0FBdUM7QUFDdkMsV0FBVztBQUNYLFdBQVc7QUFDWCxLQUFLO0FBQ0wsRUFBRTtBQUNGLEVBQUU7QUFDRix1Q0FBdUM7QUFDdkMsZ0ZBQWdGO0FBQ2hGLDhDQUE4QztBQUM5Qyx1QkFBdUI7QUFDdkIsbUZBQW1GO0FBQ25GLGlDQUFpQztBQUNqQyxTQUFTO0FBQ1QsRUFBRTtBQUNGLGlFQUFpRTtBQUNqRSxlQUFlO0FBQ2YsdUZBQXVGO0FBQ3ZGLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsK0JBQStCO0FBQy9CLHVDQUF1QztBQUN2QyxXQUFXO0FBQ1gsU0FBUztBQUNULFFBQVE7QUFDUixtRUFBbUU7QUFDbkUsZUFBZTtBQUNmLDhGQUE4RjtBQUM5Rix5QkFBeUI7QUFDekIseUJBQXlCO0FBQ3pCLHVDQUF1QztBQUN2QyxXQUFXO0FBQ1gsU0FBUztBQUNULG1FQUFtRTtBQUNuRSxlQUFlO0FBQ2Ysb0ZBQW9GO0FBQ3BGLHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsdUNBQXVDO0FBQ3ZDLFdBQVc7QUFDWCxXQUFXO0FBQ1gsS0FBSyIsImZpbGUiOiJ0ZXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uL25vZGVfbW9kdWxlcy9yeC90cy9yeC5hbGwuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwZXMvbm9kZS5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9tb2NoYS5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBlcy9zaG91bGQuZC50c1wiIC8+IFxucmVxdWlyZSgnc291cmNlLW1hcC1zdXBwb3J0JykuaW5zdGFsbCgpO1xucmVxdWlyZShcInNob3VsZFwiKTtcblxuaW1wb3J0IEF4ID0gcmVxdWlyZShcIi4uL3NyYy9hbmltYXhlXCIpO1xuaW1wb3J0IFJ4ID0gcmVxdWlyZShcInJ4XCIpO1xuXG52YXIgY291bnRlckEgPSAwO1xudmFyIGNvdW50ZXJCID0gMDtcbmZ1bmN0aW9uIGNvdW50QSh0aW1lOm51bWJlcik6QXguQW5pbWF0aW9uIHsgLy93ZSBjb3VsZCBiZSBjbGV2ZXIgYW5kIGxldCBzcGFyayB0YWtlIGEgc2VxLCBidXQgdXNlciBmdW5jdGlvbnMgc2hvdWxkIGJlIHNpbXBsZVxuICAgIHJldHVybiBBeC50YWtlKHRpbWUsIEF4LmRyYXcoZnVuY3Rpb24gKHRpY2s6QXguRHJhd1RpY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJjb3VudEFcIik7XG4gICAgICAgIGNvdW50ZXJBKys7XG4gICAgfSkpO1xufVxuXG5mdW5jdGlvbiBjb3VudEF0aGVuQ291bnRCKCk6QXguQW5pbWF0aW9uIHsgLy93ZSBjb3VsZCBiZSBjbGV2ZXIgYW5kIGxldCBzcGFyayB0YWtlIGEgc2VxLCBidXQgdXNlciBmdW5jdGlvbnMgc2hvdWxkIGJlIHNpbXBsZVxuICAgIHJldHVybiBBeC50YWtlKDEsIEF4LmRyYXcoZnVuY3Rpb24gKHRpY2s6QXguRHJhd1RpY2spIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNvdW50QVwiKTtcbiAgICAgICAgY291bnRlckErKztcbiAgICB9KSkudGhlbihBeC50YWtlKDEsIEF4LmRyYXcoZnVuY3Rpb24gKHRpY2s6QXguRHJhd1RpY2spIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImNvdW50QlwiKTtcbiAgICAgICAgY291bnRlckIrKztcbiAgICB9KSkpO1xufVxuXG5kZXNjcmliZSgndG9TdHJlYW1OdW1iZXInLCBmdW5jdGlvbiAoKSB7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBhIHN0cmVhbSB3aXRoIG51bWVyaWNhbCBpbnB1dCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQXgudG9TdHJlYW1OdW1iZXIoNSkuc2hvdWxkLm5vdC5lcXVhbCg1KTtcbiAgICAgICAgQXgudG9TdHJlYW1OdW1iZXIoNSkuc2hvdWxkLmhhdmUucHJvcGVydHkoJ25leHQnKTtcbiAgICB9KTtcbn0pO1xuZGVzY3JpYmUoJ3BvaW50JywgZnVuY3Rpb24gKCkge1xuXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gYSBwb2ludCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgQXgucG9pbnQoNSwgNSkubmV4dCgwKS50b1N0cmluZygpLnNob3VsZC5lcXVhbChbNSwgNV0udG9TdHJpbmcoKSk7XG4gICAgfSk7XG59KTtcblxuZGVzY3JpYmUoJ3RoZW4nLCBmdW5jdGlvbiAoKSB7XG5cbiAgICBpdCgnc3RvcHMgb24gdGltZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY291bnRlckEgPSAwO1xuICAgICAgICBjb3VudGVyQiA9IDA7XG4gICAgICAgIHZhciBkb3duc3RyZWFtID0gbmV3IFJ4LlJlcGxheVN1YmplY3QoKTtcbiAgICAgICAgdmFyIGFuaW0gPSBjb3VudEEoMikudGhlbihjb3VudEEoMSkpO1xuICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4gICAgICAgIHZhciB1cHN0cmVhbSA9XG4gICAgICAgICAgICBSeC5PYnNlcnZhYmxlLmZyb20oWzAsIDAuMSwgMC4yLCAwLjMsIDAuNCwgMC41XSlcbiAgICAgICAgICAgIC5tYXAoeCA9PiBuZXcgQXguRHJhd1RpY2sobnVsbCwgeCwgeCkpO1xuICAgICAgICBhbmltLmF0dGFjaCh1cHN0cmVhbSkuc3Vic2NyaWJlKGRvd25zdHJlYW0pO1xuICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMyk7XG4gICAgfSk7XG5cbiAgICBpdCgndGhlbnMgb2YgdGhlbnMgbmVzdCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY291bnRlckEgPSAwO1xuICAgICAgICBjb3VudGVyQiA9IDA7XG4gICAgICAgIHZhciBkb3duc3RyZWFtID0gbmV3IFJ4LlJlcGxheVN1YmplY3QoKTtcbiAgICAgICAgdmFyIGFuaW0gPSBjb3VudEF0aGVuQ291bnRCKCkudGhlbihjb3VudEF0aGVuQ291bnRCKCkpO1xuICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgwKTtcbiAgICAgICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDAsIDApKS5yZXBlYXQoMTApO1xuICAgICAgICBhbmltLmF0dGFjaCh1cHN0cmVhbSkuc3Vic2NyaWJlKGRvd25zdHJlYW0pO1xuICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMik7XG4gICAgICAgIGNvdW50ZXJCLnNob3VsZC5lcXVhbCgyKTtcbiAgICB9KTtcblxuICAgIGl0KCd0aGVucyBkbyBub3Qgb3ZlciBkcmF3JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInRoZW5zIGRvIG5vdCBvdmVyZHJhd1wiKTtcbiAgICAgICAgY291bnRlckEgPSAwO1xuICAgICAgICBjb3VudGVyQiA9IDA7XG4gICAgICAgIHZhciBkb3duc3RyZWFtID0gbmV3IFJ4LlJlcGxheVN1YmplY3QoKTtcbiAgICAgICAgdmFyIGFuaW0gPSBjb3VudEF0aGVuQ291bnRCKCk7XG4gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgwKTtcbiAgICAgICAgY291bnRlckIuc2hvdWxkLmVxdWFsKDApO1xuICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMCwgMCkpLnJlcGVhdCgxKTtcbiAgICAgICAgYW5pbS5hdHRhY2godXBzdHJlYW0udGFwKGZ1bmN0aW9uIChuZXh0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInVwc3RyZWFtXCIpO1xuICAgICAgICB9KSkudGFwKGZ1bmN0aW9uIChuZXh0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImRvd25zdHJlYW1cIik7XG4gICAgICAgIH0pLnN1YnNjcmliZShkb3duc3RyZWFtKTtcbiAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDEpO1xuICAgICAgICBjb3VudGVyQi5zaG91bGQuZXF1YWwoMCk7XG4gICAgfSk7XG5cblxuXG4gICAgaXQoJ3Bhc3NlcyBvbiBjbG9jaycsIGZ1bmN0aW9uICgpIHsgLy90b2RvIGdlbmVyaWMgYW5pbWF0aW9uIGNvbnRyYWN0XG4gICAgICAgIHZhciB1cHN0cmVhbSA9XG4gICAgICAgICAgICBSeC5PYnNlcnZhYmxlLmZyb20oWzAsIDAuMSwgMC4yLCAwLjNdKVxuICAgICAgICAgICAgLm1hcCh4ID0+IG5ldyBBeC5EcmF3VGljayhudWxsLCB4LCB4KSk7XG5cbiAgICAgICAgY291bnRlckEgPSAwO1xuICAgICAgICB2YXIgZXhwZWN0ZWRDbG9jayA9IFswLCAwLjEsIDAuMiwgMC4zXTtcbiAgICAgICAgdmFyIGV4cGVjdGVkRmlyc3RDbG9jayA9IFswXTtcbiAgICAgICAgdmFyIGV4cGVjdGVkU2Vjb25kQ2xvY2sgPSBbMC4xLCAwLjJdO1xuICAgICAgICB2YXIgYW5pbSA9IEF4LmFzc2VydENsb2NrKFxuICAgICAgICAgICAgZXhwZWN0ZWRDbG9jayxcbiAgICAgICAgICAgIEF4LmFzc2VydENsb2NrKGV4cGVjdGVkRmlyc3RDbG9jaywgY291bnRBKDEpKVxuICAgICAgICAgICAgICAgIC50aGVuKEF4LmFzc2VydENsb2NrKGV4cGVjdGVkU2Vjb25kQ2xvY2ssIGNvdW50QSgyKSkpKTtcblxuICAgICAgICBhbmltLmF0dGFjaCh1cHN0cmVhbSkuc3Vic2NyaWJlKCk7IC8vZXJyb3JzIGFyZSBwcm9wb2dhdGVkXG4gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcWwoMyk7XG5cbiAgICB9KTtcbn0pO1xuXG4vL1xuLy9kZXNjcmliZSgnbG9vcCcsIGZ1bmN0aW9uICgpIHtcbi8vXG4vLyAgICBpdCgncmVwZWF0cyBmaW5pdGUgc2VxdWVuY2UnLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgY291bnRlckEgPSAwO1xuLy8gICAgICAgIGNvdW50ZXJCID0gMDtcbi8vICAgICAgICB2YXIgZG93bnN0cmVhbSA9IG5ldyBSeC5SZXBsYXlTdWJqZWN0KCk7XG4vLyAgICAgICAgdmFyIGFuaW0gPSBBeC5sb29wKGNvdW50QSgyKSk7XG4vLyAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDApO1xuLy8gICAgICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwKSkucmVwZWF0KDEwKTtcbi8vICAgICAgICBhbmltLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKGRvd25zdHJlYW0pO1xuLy8gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCgxMCk7XG4vLyAgICB9KTtcbi8vICAgIGl0KCdyZXBlYXRzIHRoZW4nLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgY291bnRlckEgPSAwO1xuLy8gICAgICAgIGNvdW50ZXJCID0gMDtcbi8vICAgICAgICB2YXIgZG93bnN0cmVhbSA9IG5ldyBSeC5SZXBsYXlTdWJqZWN0KCk7XG4vLyAgICAgICAgdmFyIGFuaW0gPSBBeC5sb29wKGNvdW50QXRoZW5Db3VudEIoKSk7XG4vLyAgICAgICAgY291bnRlckEuc2hvdWxkLmVxdWFsKDApO1xuLy8gICAgICAgIHZhciB1cHN0cmVhbSA9IFJ4Lk9ic2VydmFibGUucmV0dXJuKG5ldyBBeC5EcmF3VGljayhudWxsLCAwKSkucmVwZWF0KDEwKTtcbi8vICAgICAgICBhbmltLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKGRvd25zdHJlYW0pO1xuLy8gICAgICAgIGNvdW50ZXJBLnNob3VsZC5lcXVhbCg1KTtcbi8vICAgICAgICBjb3VudGVyQi5zaG91bGQuZXF1YWwoNSk7XG4vLyAgICB9KTtcbi8vICAgIGl0KCdyZXBlYXRzIHdvcmtzIHdpdGggaW5uZXIgdGhlbicsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICBjb3VudGVyQSA9IDA7XG4vLyAgICAgICAgY291bnRlckIgPSAwO1xuLy8gICAgICAgIHZhciBkb3duc3RyZWFtID0gbmV3IFJ4LlJlcGxheVN1YmplY3QoKTtcbi8vICAgICAgICB2YXIgYW5pbSA9IEF4Lmxvb3AoY291bnRBdGhlbkNvdW50QigpKTtcbi8vICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMCk7XG4vLyAgICAgICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDApKS5yZXBlYXQoNSk7XG4vLyAgICAgICAgYW5pbS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZShkb3duc3RyZWFtKTtcbi8vICAgICAgICBjb3VudGVyQS5zaG91bGQuZXF1YWwoMyk7XG4vLyAgICAgICAgY291bnRlckIuc2hvdWxkLmVxdWFsKDIpO1xuLy8gICAgfSk7XG4vL1xuLy8gICAgaXQoJ3Bhc3NlcyBvbiBkdCcsIGZ1bmN0aW9uICgpIHsgLy90b2RvIGdlbmVyaWMgYW5pbWF0aW9uIGNvbnRyYWN0XG4vLyAgICAgICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDAuMSkpLnJlcGVhdCgzKTtcbi8vICAgICAgICB2YXIgZXhwZWN0ZWREdCA9IFJ4Lk9ic2VydmFibGUuZnJvbShbMC4xLCAwLjEsIDAuMV0pO1xuLy8gICAgICAgIHZhciBhbmltID0gQXguYXNzZXJ0RHQoZXhwZWN0ZWREdCwgQXgubG9vcChBeC5hc3NlcnREdChleHBlY3RlZER0LCBjb3VudEF0aGVuQ291bnRCKCkpKSk7XG4vLyAgICAgICAgYW5pbS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZU9uRXJyb3IoXG4vLyAgICAgICAgICAgIGZ1bmN0aW9uIChlcnJvcikge1xuLy8gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4vLyAgICAgICAgICAgIH1cbi8vICAgICAgICApO1xuLy8gICAgfSk7XG4vL1xuLy8gICAgaXQoJ3Bhc3NlcyBvbiBjbG9jaycsIGZ1bmN0aW9uICgpIHsgLy90b2RvIGdlbmVyaWMgYW5pbWF0aW9uIGNvbnRyYWN0XG4vLyAgICAgICAgdmFyIHVwc3RyZWFtID0gUnguT2JzZXJ2YWJsZS5yZXR1cm4obmV3IEF4LkRyYXdUaWNrKG51bGwsIDAuMSkpLnJlcGVhdCgzKTtcbi8vICAgICAgICB2YXIgZXhwZWN0ZWRDbG9jayA9IFswLCAwLjEsIDAuMl07XG4vLyAgICAgICAgdmFyIGFuaW0gPSBBeC5hc3NlcnRDbG9jayhleHBlY3RlZENsb2NrLCBBeC5sb29wKEF4LmFzc2VydENsb2NrKGV4cGVjdGVkQ2xvY2ssIGNvdW50QXRoZW5Db3VudEIoKSkpKTtcbi8vICAgICAgICBhbmltLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlT25FcnJvcihcbi8vICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4vLyAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbi8vICAgICAgICAgICAgfVxuLy8gICAgICAgICk7XG4vLyAgICB9KTtcbi8vXG4vLyAgICBpdCgnc2hvdWxkIHBhc3MgZXJyb3JzJywgZnVuY3Rpb24gKCkgeyAvL3RvZG8gZ2VuZXJpYyBhbmltYXRpb24gY29udHJhY3Rcbi8vICAgICAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMC4xKSkucmVwZWF0KDMpO1xuLy8gICAgICAgIHZhciBleHBlY3RlZFRpbWUgPSBSeC5PYnNlcnZhYmxlLmZyb20oWzBdKTtcbi8vICAgICAgICAvL3ZhciBhbmltID0gQXguYXNzZXJ0Q2xvY2soZXhwZWN0ZWRUaW1lLCBBeC5sb29wKEF4LmFzc2VydENsb2NrKGV4cGVjdGVkVGltZSwgY291bnRBdGhlbkNvdW50QigpKSkpO1xuLy8gICAgICAgIHZhciBhbmltID0gQXguYXNzZXJ0RHQoZXhwZWN0ZWRUaW1lLCBBeC5sb29wKGNvdW50QXRoZW5Db3VudEIoKSkpO1xuLy8gICAgICAgIHZhciBzZWVuRXJyb3IgPSBmYWxzZTtcbi8vICAgICAgICBhbmltLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlT25FcnJvcihcbi8vICAgICAgICAgICAgZnVuY3Rpb24gKGVycm9yKSB7XG4vLyAgICAgICAgICAgICAgICBzZWVuRXJyb3IgPSB0cnVlO1xuLy8gICAgICAgICAgICB9XG4vLyAgICAgICAgKTtcbi8vICAgICAgICBzZWVuRXJyb3Iuc2hvdWxkLmVxbCh0cnVlKTtcbi8vICAgIH0pO1xuLy99KTtcbi8vXG4vL2Rlc2NyaWJlKCdzaW4nLCBmdW5jdGlvbiAoKSB7XG4vLyAgICB2YXIgYW5pbWF0b3IgPSBuZXcgQXguQW5pbWF0b3IobnVsbCk7XG4vLyAgICB2YXIgdGlja2VyID0gbmV3IFJ4LlN1YmplY3Q8bnVtYmVyPigpO1xuLy8gICAgYW5pbWF0b3IudGlja2VyKHRpY2tlcik7XG4vL1xuLy9cbi8vICAgIGl0KCdzaG91bGQgcmV0dXJuIGEgbnVtYmVyIGltbWVkaWF0ZWx5IG5leHQgdGljaycsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICB2YXIgZ290TnVtYmVyID0gZmFsc2U7XG4vLyAgICAgICAgQXguc2luKDEpLm5leHQoKS5zaG91bGQuZXF1YWwoMCk7XG4vLyAgICB9KTtcbi8vfSk7XG4vL1xuLy9kZXNjcmliZSgnYXNzZXJ0RHQnLCBmdW5jdGlvbiAoKSB7XG4vLyAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMC4xKSkucmVwZWF0KDMpO1xuLy8gICAgaXQoJ3Nob3VsZCBwYXNzIGlmIHJpZ2h0JywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIEF4LmFzc2VydER0KFJ4Lk9ic2VydmFibGUuZnJvbShbMC4xLCAwLjIsIDAuM10pLCBjb3VudEEoMSkpLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKCk7XG4vLyAgICB9KTtcbi8vXG4vLyAgICBpdCgnc2hvdWxkIHRocm93IGlmIHdyb25nIChudW1iZXIgbWlzbWF0Y2gpJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIHRyeSB7XG4vLyAgICAgICAgICAgIEF4LmFzc2VydER0KFJ4Lk9ic2VydmFibGUuZnJvbShbMF0pLCBjb3VudEEoMSkpLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKCk7XG4vLyAgICAgICAgICAgIHRocm93IG51bGw7XG4vLyAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICAgICAgIGVyci5zaG91bGQubm90LmVxbChudWxsKTtcbi8vICAgICAgICB9XG4vLyAgICB9KTtcbi8vICAgIC8qXG4vLyAgICBpdCgnc2hvdWxkIHRocm93IGlmIHdyb25nIChsZW5ndGggbWlzbWF0Y2ggMSknLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgdHJ5IHtcbi8vICAgICAgICAgICAgQXguYXNzZXJ0RHQoUnguT2JzZXJ2YWJsZS5mcm9tKFswLjEsIDAuMiwgMC4zLCAwLjRdKSwgY291bnRBKDEpKS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZSgpO1xuLy8gICAgICAgICAgICB0aHJvdyBudWxsO1xuLy8gICAgICAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgICAgICAgICBlcnIuc2hvdWxkLm5vdC5lcWwobnVsbCk7XG4vLyAgICAgICAgfVxuLy8gICAgfSk7XG4vLyAgICBpdCgnc2hvdWxkIHRocm93IGlmIHdyb25nIChsZW5ndGggbWlzbWF0Y2ggMiknLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgdHJ5IHtcbi8vICAgICAgICAgICAgQXguYXNzZXJ0RHQoUnguT2JzZXJ2YWJsZS5mcm9tKFswLjEsIDAuMl0pLCBjb3VudEEoMSkpLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKCk7XG4vLyAgICAgICAgICAgIHRocm93IG51bGw7XG4vLyAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICAgICAgIGVyci5zaG91bGQubm90LmVxbChudWxsKTtcbi8vICAgICAgICB9XG4vLyAgICB9KTsqL1xuLy99KTtcbi8vXG4vL1xuLy9kZXNjcmliZSgnYXNzZXJ0Q2xvY2snLCBmdW5jdGlvbiAoKSB7XG4vLyAgICB2YXIgdXBzdHJlYW0gPSBSeC5PYnNlcnZhYmxlLnJldHVybihuZXcgQXguRHJhd1RpY2sobnVsbCwgMC4xKSkucmVwZWF0KDMpO1xuLy8gICAgaXQoJ3Nob3VsZCBwYXNzIGlmIHJpZ2h0JywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIGNvdW50ZXJBID0gMDtcbi8vICAgICAgICBBeC5hc3NlcnRDbG9jayhbMCwgMC4xLCAwLjJdLCBjb3VudEEoMykpLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKCk7XG4vLyAgICAgICAgY291bnRlckEuc2hvdWxkLmVxbCgzKTtcbi8vICAgIH0pO1xuLy9cbi8vICAgIGl0KCdzaG91bGQgdGhyb3cgaWYgd3JvbmcgKG51bWJlciBtaXNtYXRjaCknLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgdHJ5IHtcbi8vICAgICAgICAgICAgQXguYXNzZXJ0Q2xvY2soWzAsIDAuMSwgMC4zXSwgY291bnRBKDMpKS5hdHRhY2goMCwgdXBzdHJlYW0pLnN1YnNjcmliZSgpO1xuLy8gICAgICAgICAgICB0aHJvdyBudWxsO1xuLy8gICAgICAgIH0gY2F0Y2ggKGVycikge1xuLy8gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuLy8gICAgICAgICAgICBlcnIuc2hvdWxkLm5vdC5lcWwobnVsbCk7XG4vLyAgICAgICAgfVxuLy8gICAgfSk7XG4vLyAgICAvKlxuLy8gICAgaXQoJ3Nob3VsZCB0aHJvdyBpZiB3cm9uZyAobGVuZ3RoIG1pc21hdGNoIDEpJywgZnVuY3Rpb24gKCkge1xuLy8gICAgICAgIHRyeSB7XG4vLyAgICAgICAgICAgIEF4LmFzc2VydENsb2NrKFswLjEsIDAuMiwgMC4zLCAwLjRdLCBjb3VudEEoMykpLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKCk7XG4vLyAgICAgICAgICAgIHRocm93IG51bGw7XG4vLyAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICAgICAgIGVyci5zaG91bGQubm90LmVxbChudWxsKTtcbi8vICAgICAgICB9XG4vLyAgICB9KTtcbi8vICAgIGl0KCdzaG91bGQgdGhyb3cgaWYgd3JvbmcgKGxlbmd0aCBtaXNtYXRjaCAyKScsIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICB0cnkge1xuLy8gICAgICAgICAgICBBeC5hc3NlcnRDbG9jayhbMC4xLCAwLjJdLCBjb3VudEEoMykpLmF0dGFjaCgwLCB1cHN0cmVhbSkuc3Vic2NyaWJlKCk7XG4vLyAgICAgICAgICAgIHRocm93IG51bGw7XG4vLyAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICAgICAgIGVyci5zaG91bGQubm90LmVxbChudWxsKTtcbi8vICAgICAgICB9XG4vLyAgICB9KTsqL1xuLy99KTtcblxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9