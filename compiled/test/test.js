/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/should.d.ts" />
require('source-map-support').install();
require("should");
var Ax = require("../src/animaxe2");
var Rx = require("rx");
var counterA = 0;
var counterB = 0;
function countA(time) {
    return Ax.take(time, Ax.draw(function (tick) {
        counterA++;
    }));
}
function countAthenCountB() {
    return Ax.take(1, Ax.draw(function (tick) {
        console.log("countA");
        counterA++;
    })).then(Ax.take(1, Ax.draw(function (tick) {
        console.log("countB");
        counterB++;
    })));
}
describe('toStreamNumber', function () {
    it('should return a stream with numerical input', function () {
        Ax.toStreamNumber(5).should.not.equal(5);
        Ax.toStreamNumber(5).should.have.property('map');
    });
    it('should return a stream with stream input', function () {
        Ax.toStreamNumber(Rx.Observable.from([3, 3])).should.not.equal(5);
        Ax.toStreamNumber(Rx.Observable.from([3, 3])).should.have.property('map');
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
        anim.attach(upstream).subscribe(downstream);
        counterA.should.equal(3);
    });
    it('thens of thens nest', function () {
        counterA = 0;
        counterB = 0;
        var downstream = new Rx.ReplaySubject();
        var anim = countAthenCountB().then(countAthenCountB());
        counterA.should.equal(0);
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(10);
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
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0));
        anim.attach(upstream).subscribe(downstream);
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
        anim.attach(upstream).subscribe(downstream);
        counterA.should.equal(10);
    });
    it('repeats then', function () {
        counterA = 0;
        counterB = 0;
        var downstream = new Rx.ReplaySubject();
        var anim = Ax.loop(countAthenCountB());
        counterA.should.equal(0);
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(10);
        anim.attach(upstream).subscribe(downstream);
        counterA.should.equal(5);
        counterB.should.equal(5);
    });
    it('repeats works with inner then', function () {
        counterA = 0;
        counterB = 0;
        var downstream = new Rx.ReplaySubject();
        var anim = Ax.loop(countAthenCountB());
        counterA.should.equal(0);
        var upstream = Rx.Observable.return(new Ax.DrawTick(null, 0)).repeat(10);
        anim.attach(upstream).subscribe(downstream);
        counterA.should.equal(5);
        counterB.should.equal(5);
    });
});
