var gulp = require('gulp');
var ts = require('gulp-typescript');
var merge = require('merge2');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var replace = require('gulp-replace');
var template = require('gulp-template');
var rename = require('gulp-rename');
var peg = require('gulp-peg');
var sourcemaps = require('gulp-sourcemaps');
var transform = require('vinyl-transform');
var del = require('del');
var fs = require('fs');
var tslint = require('gulp-tslint');
var webpack = require('webpack');
var typedoc = require("gulp-typedoc");
var extractExampleCode = require("./scripts/extractExampleCode");
var ignore = new webpack.IgnorePlugin(new RegExp("^(canvas|mongoose|react)$"));
var livereload = require('gulp-livereload');

var npm_info = JSON.parse(fs.readFileSync("package.json").toString());

var examples = fs.readdirSync("examples").map(function(filename) {
  return filename.replace(".ts", "");
});


gulp.task('clean', function(cb) {
  del([
    'dist',
    'compiled',
    'test/*.js',
    'test/*.js.map',
    'examples/*.js',
    'examples/*.js.map',
    'src/*.js',
    'src/*.js.map'
  ], cb);
});

gulp.task ("peg:svg", function(cb) {
    gulp
        .src( "peg/svg.peg" )
        .pipe( peg( ).on( "error", gutil.log ) )
        .pipe( gulp.dest( "dist/peg" ) ) // for mocha tests
        .pipe( gulp.dest( "peg" ) ) // for html examples
        
}); 
    
gulp.task('compile', function() {
    var tsResult = gulp.src(['./src/*.ts', './examples/example1*.ts'])
                    .pipe(sourcemaps.init())
                    .pipe(ts('tsconfig.json'));
    return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
        tsResult.dts.pipe(gulp.dest('./dist')),
        tsResult.js
            .pipe(sourcemaps.write({sourceMappingURLPrefix: "../"}))
            .pipe(gulp.dest('./dist'))
    ]);
});

var projects = {}; // each example has a set of ts projects to enable continuous compilation

/**
 * Wrap files in the examples directory, with html-<name>, test-<name> and watch-<name> tasks.
 * html-<name> task generates a webpage with the example embedded in it.
 * test-<name> task generates a mocha test around the example that ensure the images produced match a reference image.
 * watch-<name> task watches the source code and live reloads the embedding webpage.
 */
function createExampleTasksFor(exampleName) {
    var exampleNameJS = exampleName + '.js';
    var exampleNameTS = exampleName + '.ts';
    
    gulp.task('html-' + exampleName, ['compile'], function() {
        gulp.src('html/example.template.html')
          .pipe(rename("html/" + exampleName + ".html"))
          .pipe(template({name: exampleName}))
          .pipe(gulp.dest('.'))
          .pipe(livereload())
    });

    gulp.task('test-' + exampleName, ['compile'], function() {
        // we take the example source code
        var content = fs.readFileSync('examples/' + exampleNameTS).toString();
        content = content
            .replace("@name", exampleName);

        return gulp.src('test/example.template.ts')
            .pipe(template({name: exampleName, content: content})) // pass it through a template
            .pipe(sourcemaps.init())
            .pipe(ts('tsconfig.json'))  // compile it
            .js
              .pipe(rename("dist/test/" + exampleNameJS))//rename the js, and align with normal compile target
              .pipe(sourcemaps.write())
              .pipe(gulp.dest("."))// we need a real copy of it to satisfy mocha
              .pipe(mocha({ reporter: 'list' })); // run it with mocha*/
    });
    
    gulp.task('watch-' + exampleName, ['html-' + exampleName], function() {
        // we take the example source code
        livereload.listen();
        gulp.watch(['src/*.ts', 'examples/' + exampleNameTS], ['html-' + exampleName]);
    });
}

// run all the tests (populating the dist/test directory with source)
gulp.task("tests", examples.map(function(name) { return "test-" + name}) )
gulp.task("htmls", examples.map(function(name) { return "html-" + name}) )

// create various tasks on a per example basis
for (var i = 0; i < examples.length; i++ ) { // (counting from 1)
    createExampleTasksFor(examples[i]);
}


gulp.task("doc", function() {
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


gulp.task("deploy", [/*"tests"*/"htmls"/*TODO: (not working) "doc"*/], function() {
  console.log("deploying");
  // console.log(npm_info);
  var imgs     = gulp.src('./images/**').pipe(gulp.dest("/Users/larkworthy/dev/animaxe-web/site/master/images"));
  var lib_dist = gulp.src('./dist/**').pipe(gulp.dest("/Users/larkworthy/dev/animaxe-web/site/libs"));
  var src      = gulp.src('./src/**').pipe(gulp.dest("/Users/larkworthy/dev/animaxe-web/site/src"));
  var examples = gulp.src('./examples/**').pipe(gulp.dest("/Users/larkworthy/dev/animaxe-web/site/examples"));
  var html     = gulp.src('./html/**').pipe(gulp.dest("/Users/larkworthy/dev/animaxe-web/site/html"));
  var docs     = gulp.src('./docs/**').pipe(gulp.dest("/Users/larkworthy/dev/animaxe-web/site"));
  var modules  = gulp.src('./node_modules/**').pipe(gulp.dest("/Users/larkworthy/dev/animaxe-web/site/node_modules"));

  return merge([imgs, lib_dist, src, examples, html, docs, modules]);
});



