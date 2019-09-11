"use strict";

const gulp = require('gulp');
const sass = require('gulp-sass');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const header = require('gulp-header');
const cleanCss = require('gulp-clean-css');
const pkg = require('./package.json');

function banner() {
    const stamp = [
        '/**',
        ' * <%= pkg.name %> - <%= pkg.description %>',
        ' * @author <%= pkg.author.name %>',
        ' * @version v<%= pkg.version %>',
        ' * @link <%= pkg.homepage %>',
        ' * @license <%= pkg.license %>',
        ' */',
        ''
    ].join('\n');

    return header(stamp, {pkg: pkg});
}

function css() {
    return gulp
        .src('app/scss/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('dist/css'))
        .pipe(rename('imcrop.min.css'))
        .pipe(cleanCss())
        .pipe(gulp.dest('dist/css'));
}

function scriptTrackingJs() {
    const files = [
        'node_modules/tracking/build/tracking.js',
        'node_modules/tracking/build/data/face.js',
        'node_modules/tracking/build/data/eye.js'
    ];

    return gulp.src(files)
        .pipe(concat('tracking.js'))
        .pipe(gulp.dest('dist/js'))
        .pipe(rename('tracking.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'));
}

function scriptCropJs() {
    const files = [
        'app/js/imcrop.ui.js',
        'app/js/imcrop.editor.js',
        'app/js/imcrop.ratio.js',
        'app/js/imcrop.base.js',
        'app/js/imcrop.image.js',
        'app/js/imcrop.softcrop.js'
    ];

    return gulp
        .src(files)
        .pipe(concat('cropjs.js'))
        .pipe(banner())
        .pipe(gulp.dest('dist/js'))
        .pipe(rename('cropjs.min.js'))
        .pipe(uglify())
        .pipe(banner())
        .pipe(gulp.dest('dist/js'))
}

function scriptWorkerDetect() {
    return gulp.src('app/js/workers/imcrop.worker.detect.js')
        .pipe(uglify())
        .pipe(banner())
        .pipe(gulp.dest('dist/js'));
}

function watchFiles() {
    gulp.watch('app/scss/*.scss', css)
    gulp.watch('app/**/*.js', gulp.parallel(scriptCropJs, scriptWorkerDetect))
}

const scripts = gulp.parallel(scriptCropJs, scriptWorkerDetect, scriptTrackingJs);
const build = gulp.parallel(css, scripts);
const watch = gulp.series(build, watchFiles);

exports.watch = watch;
exports.build = build;
exports.default = build;