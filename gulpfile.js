// Include gulp
var gulp = require('gulp');

// Include our plugins
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var header = require('gulp-header');
var jsdoc = require('gulp-jsdoc');
var bower = require('gulp-bower');
var pkg = require('./package.json');


function banner() {
    var stamp = [
        '/**',
        ' * <%= pkg.name %> - <%= pkg.description %>',
        ' * @author <%= pkg.author.name %>',
        ' * @version v<%= pkg.version %>',
        ' * @link <%= pkg.homepage %>',
        ' * @license <%= pkg.license %>',
        ' */',
        ''
    ].join('\n');

    return header(stamp, { pkg: pkg });
}

// Lint task
gulp.task('lint', function() {
    return gulp.src('app/js/**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Generate docs
gulp.task('docs', function() {
    return gulp.src('app/js/**/*.js')
        .pipe(jsdoc('build/docs'));
});



// Get bower dependencies
gulp.task('bower', function() {
    return bower();
});


// Concatenate detect workers
gulp.task('scripts-trackingjs', function() {
    var files = [
        'bower_components/tracking.js/build/tracking.js',
        'bower_components/tracking.js/build/data/face.js',
        'bower_components/tracking.js/build/data/eye.js'
    ];

    return gulp.src(files)
        .pipe(concat('tracking.js'))
        .pipe(gulp.dest('dist/js'));
});


// Concatenate detect workers
gulp.task('scripts-trackingjs-min', function() {
    var files = [
        'bower_components/tracking.js/build/tracking-min.js',
        'bower_components/tracking.js/build/data/face-min.js',
        'bower_components/tracking.js/build/data/eye-min.js'
    ];

    return gulp.src(files)
        .pipe(concat('tracking-min.js'))
        .pipe(gulp.dest('dist/js'));
});


// Uglify detect worker
gulp.task('scripts-worker-detect', function() {
    return gulp.src('app/js/workers/imcrop.worker.detect.js')
        .pipe(uglify())
        .pipe(banner())
        .pipe(gulp.dest('dist/js'));
});


// Concatenate and uglify cropjs core files
gulp.task('scripts-cropjs', function() {
    var files = [
        'app/js/imcrop.ui.js',
        'app/js/imcrop.editor.js',
        'app/js/imcrop.ratio.js',
        'app/js/imcrop.base.js',
        'app/js/imcrop.image.js',
        'app/js/imcrop.softcrop.js'
    ];

    return gulp.src(files)
        .pipe(concat('cropjs.js'))
        .pipe(banner())
        .pipe(gulp.dest('dist/js'))
        .pipe(rename('cropjs.min.js'))
        .pipe(uglify())
        .pipe(banner())
        .pipe(gulp.dest('dist/js'));
});


// Handle all javascript files
gulp.task('scripts', ['scripts-cropjs', 'scripts-worker-detect', 'scripts-trackingjs', 'scripts-trackingjs-min']);


// Copy necessary files
gulp.task('copy', function() {
    gulp.src('app/index.html')
        .pipe(gulp.dest('dist/'));
});


// Compile our sass
gulp.task('sass', function() {
    return gulp.src('app/scss/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('dist/css'));
});



// Watch files for changes
gulp.task('watch', function() {
    gulp.watch('app/scss/*.scss', ['sass']);
    gulp.watch('app/**/*.js', ['scripts-cropjs', 'scripts-worker-detect']);
    gulp.watch('app/*.html', ['copy']);
});

// Default Task
gulp.task('default', ['bower', 'sass', 'scripts', 'copy']);
