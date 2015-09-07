var gulp = require('gulp');
var ts = require('gulp-typescript');
var merge = require('merge2');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var browserify = require('browserify');
//var sourcemaps = require('gulp-sourcemaps');
var transform = require('vinyl-transform');

var num_examples = 2;

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


// create a compile and watch task for each example
for (var i = 1; i<= num_examples; i++ ) { // (counting from 1)
    var exampleName = 'example' + i;
    var exampleNameJS = 'example' + i + '.js';

    gulp.task(exampleName, ['compile', 'compile-test'], function() {
        return gulp.src(['compiled/test/' + exampleNameJS], { read: false })
            .pipe(mocha({ reporter: 'list' }));
    });

    gulp.task(exampleName + '-watch', ['compile', 'compile-test', 'browserify', exampleName], function() {
        gulp.watch('src/*.ts', ['compile']);
        gulp.watch('test/example1.ts', ['compile-test']);
        gulp.watch('compiled/src/' +  + exampleNameJS, ['browserify']);
        gulp.watch(['compiled/src/*.js', 'compiled/test/' +  + exampleNameJS], [exampleName]);
    });
}




gulp.task('watch', ['compile', 'compile-test', 'browserify', 'test'], function() {
    gulp.watch('src/*.ts', ['compile']);
    gulp.watch('test/*.ts', ['compile-test']);
    gulp.watch('compiled/src/*.js', ['browserify']);
    gulp.watch(['compiled/src/*.js', 'compiled/test/*.js'], ['test']);
});