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
var webpack = require('webpack');
var ignore = new webpack.IgnorePlugin(new RegExp("^(canvas|mongoose|react)$"))

var TS_SETTINGS = {
  sortOutput: true,
  declarationFiles: true,
  noExternalResolve: false,
  noEmitOnError: true,
  module: 'commonjs'
};

var num_examples = 4;


gulp.task('clean', function(cb) {
  del([
    'dist',
    'compiled',
    'test/*.js',
    'test/*.js.map',
    'src/*.js',
    'src/*.js.map'
  ], cb);
});

/**
 * animaxe is loaded into global scope, so can be added in a script tag, and the user is able to write
 * the examples in their own scripts. The need to include Rx themselves
 */
gulp.task("webpack-browser-ax", function(callback) {
    // run webpack
    webpack({
      entry: {
        "ax": ['./src/animaxe.ts']
      },
      output: {
        libraryTarget: "var",
        library: "Ax",
        filename: './dist/ax.js'
      },
      resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.js']
      },
      module: {
        loaders: [
          { test: /\.ts$/, loader: 'ts-loader'}
        ]
      },
      externals: {
          // require("rx") is external and on the Rx variable
          "rx": "Rx"
      },
      node: {
        fs: "empty"
      },
      plugins: [ignore]
    }, function(err, stats) {
        if(err) throw new gutil.PluginError("webpack", err);
        gutil.log("[webpack]", stats.toString({
            // output options

        }));
        callback();
    });
});

/**
 */
gulp.task("webpack-browser-helper", function(callback) {
    // run webpack
    webpack({
      entry: {
        "ax-helper": ['./test/helper.ts']
      },
      output: {
        libraryTarget: "var",
        library: "helper",
        filename: './dist/helper.js'
      },
      resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.js']
      },
      module: {
        loaders: [
          { test: /\.ts$/, loader: 'ts-loader'}
        ]
      },
      externals: {
          // require("rx") is external and on the Rx variable
          "rx": "Rx"
      },
      node: {
        fs: "empty"
      },
      plugins: [ignore]
    }, function(err, stats) {
        if(err) throw new gutil.PluginError("webpack", err);
        gutil.log("[webpack]", stats.toString({
            // output options

        }));
        callback();
    });
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

gulp.task('compile-external', function() {
    var TS_INTERNAL_SETTINGS = {
      //out: "dist/animaxe.js",
      outDir: "dist",
      module: "commonjs",
      declarationFiles: true,
      noEmitOnError: true
    };
    var tsResult = gulp.src('src/*.ts')
                    .pipe(sourcemaps.init())
                    .pipe(ts(ts.createProject(TS_INTERNAL_SETTINGS)));
    return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
        tsResult.dts.pipe(gulp.dest('./dist')),
        tsResult.js
            .pipe(sourcemaps.write())
            .pipe(gulp.dest('./dist'))
    ]);
});

gulp.task('compile-external-example1', ["compile-external"], function() {
    var TS_INTERNAL_SETTINGS = {
      outDir: ".",
      declarationFiles: false,
      module: "commonjs",
      noEmitOnError: true
    };
    var tsResult = gulp.src('test/example1.ts')
                    .pipe(sourcemaps.init())
                    .pipe(ts(ts.createProject(TS_INTERNAL_SETTINGS)));
    return tsResult.js
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('.'));
});

gulp.task("test-external-example1", ["compile-external-example1"], function() {
    return gulp.src(['test/example1.js'], { read: false })
        .pipe(mocha({ reporter: 'list' }));
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