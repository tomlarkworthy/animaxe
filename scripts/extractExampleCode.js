// through2 is a thin wrapper around node transform streams
var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;

function extractExampleCode(prefixText) {
  // Creating a stream through which each file will pass
  return through.obj(function(file, enc, cb) {

    var contents = file.contents.toString();
    var header = contents.indexOf("@header")  + "@header".length;
    var start = contents.indexOf("@start")  + "@start".length;
    var end = contents.indexOf("@end");

    file.contents = new Buffer(contents.substring(0, header) + contents.substring(start, end));
    cb(null, file);

  });

}

// Exporting the plugin main function
module.exports = extractExampleCode;