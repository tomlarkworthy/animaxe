var gulp = require('gulp');
var ts = require('gulp-typescript');
var merge = require('merge2');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var browserify = require('browserify');
//var sourcemaps = require('gulp-sourcemaps');
var transform = require('vinyl-transform');

gulp.task('browserify', function () {
  var browserified = transform(function(filename) {
    console.log("browserfy", filename);
    //browserify._ignore.push("canvas");
    var b = browserify(filename);
    b.ignore("canvas");
    return b.bundle();
  });
  
  return gulp.src(['./compiled/js/*.js'])
    .pipe(browserified)
    .pipe(gulp.dest('./dist'));
});


var tsProject = ts.createProject({
    declarationFiles: true,
    noExternalResolve: false,
    module: 'commonjs'
});

gulp.task('compile', function() {
    var tsResult = gulp.src('src/*.ts')
                    .pipe(ts(tsProject));
    return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
        tsResult.dts.pipe(gulp.dest('compiled/definitions')),
        tsResult.js.pipe(gulp.dest('compiled/src'))
    ]);
});

var tsTestProject = ts.createProject({
    declarationFiles: false,
    noExternalResolve: false,
    module: 'commonjs'
});

gulp.task('compile-test', function() {
    var tsResult = gulp.src('test/*.ts')
                    .pipe(ts(tsTestProject));
    return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
        tsResult.js.pipe(gulp.dest('compiled/test'))
    ]);
});

gulp.task('test', function() {
    function handleError(err) {
        console.log(err.toString());
        this.emit('end');
    }
    return gulp.src(['compiled/test/*.js'], { read: false })
        .pipe(mocha({ reporter: 'list' }))
        .on('error', handleError);
});


gulp.task('watch', ['compile', 'compile-test', 'browserify', 'test'], function() {
    gulp.watch('src/*.ts', ['compile']);
    gulp.watch('test/*.ts', ['compile-test']);
    gulp.watch('compiled/src/*.js', ['browserify']);
    gulp.watch(['compiled/src/*.js', 'compiled/test/*.js'], ['test']);
});