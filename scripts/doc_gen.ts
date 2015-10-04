/// <reference path="../node_modules/rx/ts/rx.all.d.ts" />
/// <reference path="../types/node.d.ts" />
require('source-map-support').install();
var fs = require("fs");

var structure = JSON.parse(fs.readFileSync("docs/doc.json"));

console.log(structure);