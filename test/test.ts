/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/lib.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/should.d.ts" />
require("should");
import Ax = require("../src/animaxe2");
import Rx = require("rx");

describe('toStreamNumber', function() {
  describe('toStreamNumber', function() {
    it('should return a stream with numerical input', function() {
      Ax.toStreamNumber(5).should.not.equal(5);
      Ax.toStreamNumber(5).should.have.property('map');
    });
    it('should return a stream with stream input', function() {
      Ax.toStreamNumber(Rx.Observable.from([3,3])).should.not.equal(5);
      Ax.toStreamNumber(Rx.Observable.from([3,3])).should.have.property('map');
    });
  });
});