/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/should.d.ts" /> 
require('source-map-support').install();
require("should");

import Ax = require("../src/animaxe");
import Rx = require("rx");

var counterA = 0;
var counterB = 0;
function countA(time:number):Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return Ax.take(time, Ax.draw(function (tick:Ax.DrawTick) {
        counterA++;
    }));
}

function countAthenCountB():Ax.Animation { //we could be clever and let spark take a seq, but user functions should be simple
    return Ax.take(1, Ax.draw(function (tick:Ax.DrawTick) {
        //console.log("countA");
        counterA++;
    })).then(Ax.take(1, Ax.draw(function (tick:Ax.DrawTick) {
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
});


describe('loop', function () {

    it('repeats finite sequence', function () {
        counterA = 0;
        counterB = 0;
        var downstream = new Rx.ReplaySubject();
        var anim = Ax.loop(countA(2));
        counterA.should.equal(0);
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(10);
        anim.attach(0, upstream).subscribe(downstream);
        counterA.should.equal(10);
    });
    it('repeats then', function () {
        counterA = 0;
        counterB = 0;
        var downstream = new Rx.ReplaySubject();
        var anim = Ax.loop(countAthenCountB());
        counterA.should.equal(0);
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(10);
        anim.attach(0, upstream).subscribe(downstream);
        counterA.should.equal(5);
        counterB.should.equal(5);
    });
    it('repeats works with inner then', function () {
        counterA = 0;
        counterB = 0;
        var downstream = new Rx.ReplaySubject();
        var anim = Ax.loop(countAthenCountB());
        counterA.should.equal(0);
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(5);
        anim.attach(0, upstream).subscribe(downstream);
        counterA.should.equal(3);
        counterB.should.equal(2);
    });

    it('passes on dt', function () { //todo generic animation contract

        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0.1)).repeat(3);
        var expectedTime = Rx.Observable.from([0.1, 0.1, 0.1]);
        //var anim = Ax.assertClock(expectedTime, Ax.loop(Ax.assertClock(expectedTime, countAthenCountB())));
        var anim = Ax.assertDt(expectedTime, Ax.loop(countAthenCountB()));
        anim.attach(0, upstream).subscribeOnError(
            function (error) {
                throw error;
            }
        );
    });

    it('should pass errors', function () { //todo generic animation contract
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0.1)).repeat(3);
        var expectedTime = Rx.Observable.from([0]);
        //var anim = Ax.assertClock(expectedTime, Ax.loop(Ax.assertClock(expectedTime, countAthenCountB())));
        var anim = Ax.assertDt(expectedTime, Ax.loop(countAthenCountB()));
        var seenError = false;
        anim.attach(0, upstream).subscribeOnError(
            function (error) {
                seenError = true;
            }
        );
        seenError.should.eql(true);
    });
});

describe('sin', function () {
    var animator = new Ax.Animator(null);
    var ticker = new Rx.Subject<number>();
    animator.ticker(ticker);


    it('should return a number immediately next tick', function () {
        var gotNumber = false;
        Ax.sin(1).next().should.equal(0);
    });
});

describe('assertClock', function () {
    var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0.1)).repeat(3);
    it('should pass if right', function () {
        Ax.assertDt(Rx.Observable.from([0.1, 0.2, 0.3]), countA(1)).attach(0, upstream).subscribe();
    });

    it('should throw if wrong (number mismatch)', function () {
        try {
            Ax.assertDt(Rx.Observable.from([0]), countA(1)).attach(0, upstream).subscribe();
            throw null;
        } catch (err) {
            err.should.not.eql(null);
        }
    });
    it('should throw if wrong (length mismatch)', function () {
        try {
            Ax.assertDt(Rx.Observable.from([0.1, 0.2, 0.3, 0.4]), countA(1)).attach(0, upstream).subscribe();
            throw null;
        } catch (err) {
            err.should.not.eql(null);
        }
    });
    it('should throw if wrong (length mismatch)', function () {
        try {
            Ax.assertDt(Rx.Observable.from([0.1, 0.2]), countA(1)).attach(0, upstream).subscribe();
            throw null;
        } catch (err) {
            err.should.not.eql(null);
        }
    });
});

