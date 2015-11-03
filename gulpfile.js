var gulp = require('gulp');
var ts = require('gulp-typescript');
var merge = require('merge2');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var template = require('gulp-template');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var transform = require('vinyl-transform');
var del = require('del');
var fs = require('fs');
var tslint = require('gulp-tslint');
var webpack = require('webpack');
var typedoc = require("gulp-typedoc");
var extractExampleCode = require("./scripts/extractExampleCode");
var ignore = new webpack.IgnorePlugin(new RegExp("^(canvas|mongoose|react)$"));


var npm_info = JSON.parse(fs.readFileSync("package.json"));

var num_examples = 5;

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

gulp.task('compile', function() {
    var TS_SETTINGS = {
      outDir: "dist",
      module: "commonjs",
      declarationFiles: true,
      noEmitOnError: true
    };
    var tsResult = gulp.src('src/*.ts')
                    .pipe(sourcemaps.init())
                    .pipe(ts(ts.createProject(TS_SETTINGS)));
    return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
        tsResult.dts.pipe(gulp.dest('./dist')),
        tsResult.js
            .pipe(sourcemaps.write())
            .pipe(gulp.dest('./dist'))
    ]);
});

projects = {}; // each example has a set of ts projects to enable continuous compilation

deploy_tasks = [];

function exampleTask(i) {
    var TS_SETTINGS = {
      outDir: ".",
      declarationFiles: false,
      module: "commonjs",
      noEmitOnError: true
    };
    var exampleName = 'example' + i;
    var exampleNameJS = 'example' + i + '.js';
    var exampleNameTS = 'example' + i + '.ts';

    projects[exampleName] = ts.createProject(TS_SETTINGS);

    gulp.task('compile-' + exampleName, ["compile"], function() {
        var tsResult = gulp.src("test/" + exampleNameTS)
                        .pipe(sourcemaps.init())
                        .pipe(ts(projects[exampleName]));
        return tsResult.js.pipe(sourcemaps.write()).pipe(gulp.dest('.'));
    });

    gulp.task('test-' + exampleName, ['compile-' + exampleName], function() {
        return gulp.src('test/' + exampleNameJS, { read: false })
            .pipe(mocha({ reporter: 'list' }));
    });

    deploy_tasks.push('compile-' + exampleName);
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

gulp.task('watch', ['compile', 'compile-test','test'], function() {
    gulp.watch(['src/*.ts', 'test/*.ts'], ['test']);
});


/**
 * animaxe is loaded into global scope, so can be added in a script tag, and the user is able to write
 * the examples in their own scripts. The need to include Rx themselves
 */
gulp.task("webpack-ax", function(callback) {
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
 * animaxe is loaded into global scope, so can be added in a script tag, and the user is able to write
 * the examples in their own scripts. The need to include Rx themselves
 */
gulp.task("webpack-parameter", function(callback) {
    // run webpack
    webpack({
      entry: {
        "ax": ['./src/parameter.ts']
      },
      output: {
        libraryTarget: "var",
        library: "Parameter",
        filename: './dist/px.js'
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


gulp.task("webpack-helper", function(callback) {
    // run webpack
    webpack({
      entry: {
        "ax-helper": ['./src/helper.ts']
      },
      output: {
        libraryTarget: "var",
        library: "helper",
        filename: './dist/hx.js'
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


gulp.task("webpack", ["webpack-ax", "webpack-helper", "webpack-parameter"]);

gulp.task("typedoc", function() {
    return gulp
        .src(["src/*.ts"])
        .pipe(typedoc({
            module: "commonjs",
            target: "es5",
            out: "docs/",
            name: "Animaxe"
        }))
    ;
});




deploy_tasks.push("webpack");
deploy_tasks.push("typedoc");
gulp.task("deploy", deploy_tasks, function() {
  console.log("deploying");
  console.log(npm_info);
  var imgs     = gulp.src('./images/**').pipe(gulp.dest("/Users/larkworthy/dev/animaxe-web/site/master/images"));
  var lib_dist = gulp.src('./dist/**').pipe(gulp.dest("/Users/larkworthy/dev/animaxe-web/site/libs"));
  var docs     = gulp.src('./docs/**').pipe(gulp.dest("/Users/larkworthy/dev/animaxe-web/site"));

  return merge([imgs, lib_dist, docs]);
});


gulp.task('html-examples', deploy_tasks, function () {
  subtasks = [];
  for (var i = 1; i <= num_examples; i++) { // (counting from 1)
    subtasks.push(
      gulp.src('html/example.template.html')
        .pipe(rename("html/example" + i + ".html"))
        .pipe(template({name: "example" + i}))
        .pipe(gulp.dest('.'))
    );
  }
  subtasks.push(
    gulp.src('test/example*.js')
      .pipe(extractExampleCode()).pipe(gulp.dest('html/js/'))
  );
  return merge(subtasks);
});


