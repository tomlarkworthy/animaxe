var gulp = require('gulp');
var ts = require('gulp-typescript');
var merge = require('merge2');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var browserify = require('browserify');
var sourcemaps = require('gulp-sourcemaps');
var transform = require('vinyl-transform');
var del = require('del');
var tslint = require('gulp-tslint');
var tsify = require('tsify');

var TS_SETTINGS = {
  sortOutput: true,
  declarationFiles: true,
  noExternalResolve: false,
  noEmitOnError: true,
  module: 'commonjs'
};

var num_examples = 4;


gulp.task('clean', function(cb) {
  del(['dist', 'compiled'], cb);
});

gulp.task('browserify', ['compile'], function () {

  var browserified = transform(function(filename) {
    console.log("browserfy", filename);
    //browserify._ignore.push("canvas");
    var b = browserify(filename);
    b.ignore("canvas");
    return b.bundle();
  });
  
  return gulp.src(['./compiled/src/*.js'])
    .pipe(browserified)
    .pipe(gulp.dest('./dist'));


  /*
  browserify()
    .add('src/animaxe.ts')
    .plugin('tsify', TS_SETTINGS)
    .bundle()
    .on('error', function (error) { console.error(error.toString()); })
    .pipe(gulp.dest('./dist'));*/
});


var tsProject = ts.createProject(TS_SETTINGS);

gulp.task('compile', function() {
    var tsResult = gulp.src('src/*.ts')
                    .pipe(sourcemaps.init())
                    .pipe(ts(tsProject));
    return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
        tsResult.dts.pipe(gulp.dest('compiled/definitions')),
        tsResult.js
            .pipe(sourcemaps.write())
            .pipe(gulp.dest('compiled/src'))
    ]);
});

gulp.task('compile_gen', function() {
    var tsResult = gulp.src('scripts/*.ts')
                    .pipe(sourcemaps.init())
                    .pipe(ts(tsProject));
    return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
        tsResult.dts.pipe(gulp.dest('compiled/definitions')),
        tsResult.js
            .pipe(sourcemaps.write())
            .pipe(gulp.dest('compiled/scripts'))
    ]);
});

var tsTestProject = ts.createProject(TS_SETTINGS);

gulp.task('compile-test', function() {
    var tsResult = gulp.src('test/*.ts')
                    .pipe(sourcemaps.init())
                    .pipe(ts(tsTestProject));
    return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
        tsResult.js.pipe(sourcemaps.write()).pipe(gulp.dest('compiled/test'))
    ]);
});


gulp.task('test', ['compile-test', 'compile'], function() {
    function handleError(err) {
        console.log(err.toString());
        this.emit('end');
    }
    return gulp.src(['compiled/test/test.js'], { read: false })
        .pipe(mocha({ reporter: 'list' }))
        .on('error', handleError);
});


projects = {};

function exampleTask(i) {
    var exampleName = 'example' + i;
    var exampleNameJS = 'example' + i + '.js';
    var exampleNameTS = 'example' + i + '.ts';

    projects[exampleName] = ts.createProject(TS_SETTINGS);

    gulp.task('compile-' + exampleName, ["compile"], function() {
        var tsResult = gulp.src(["test/" + exampleNameTS, 'test/helper.ts'])
                        .pipe(sourcemaps.init())
                        .pipe(ts(projects[exampleName]));
        return tsResult.js.pipe(sourcemaps.write()).pipe(gulp.dest('compiled/test'));
    });

    gulp.task('test-' + exampleName, ['compile-' + exampleName], function() {
        return gulp.src(['compiled/test/' + exampleNameJS, 'compiled/test/helper.js'], { read: false })
            .pipe(mocha({ reporter: 'list' }));
    });

    gulp.task('watch-' + exampleName, ['compile', 'compile-' + exampleName, 'test-' + exampleName], function() {
        gulp.watch('src/*.ts', ['compile']);
        gulp.watch('test/' + exampleNameTS, ['compile-' + exampleName]);
        gulp.watch(['compiled/src/*.js', 'compiled/test/' +  + exampleNameJS], ['test-' + exampleName]);
    });
}

// create a compile and watch task for each example
for (var i = 1; i<= num_examples; i++ ) { // (counting from 1)
    exampleTask(i);
}

gulp.task('watch', ['compile', 'compile-test', 'browserify', 'test'], function() {
    gulp.watch(['src/*.ts', 'test/*.ts'], ['test']);
    gulp.watch('compiled/src/*.js', ['browserify']);;
});