// THIS IS AUTO GENERATED TEST CODE, DO NOT MODIFY DIRECTLY
/// <reference path="../types/should.d.ts" />
/// <reference path="../types/mocha.d.ts" />
/// <reference path="../types/node.d.ts" />
require("should");
require('source-map-support').install();

<%= content %>
describe('<%= name %>', function () {
    it ('should match the reference', function(done) {
        helper.sameExample("<%= name %>", "<%= name %>-ref", function(equal) {
            equal.should.equal(true);
            done();
        })
    });
});