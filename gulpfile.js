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
};

// Lint task
gulp.task('lint', function() {
    return gulp.src('app/js/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Generate docs
gulp.task('docs', function() {
    return gulp.src('app/js/**/*.js')
        .pipe(jsdoc('build/docs'));
});






// Compile our sass
gulp.task('sass', function() {
    return gulp.src('app/scss/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('build/css'));
});


// Concatenate detect workers
gulp.task('scripts-workers', function() {
    gulp.src('app/js/worker/imcrop.worker.detect.js')
        .pipe(uglify())
        .pipe(rename('cropjs.detect.min.js'))
        .pipe(gulp.dest('build/js'));
});


// Concatenate and minify base javascript
gulp.task('scripts', function() {
    var files = [
        'app/bower_components/tracking.js/build/tracking-min.js',
        'app/bower_components/tracking.js/build/face-min.js',
        'app/bower_components/tracking.js/build/eye-min.js',
        'app/js/*.js'
    ];

    return gulp.src(files)
        .pipe(concat('cropjs.js'))
        .pipe(banner())
        .pipe(gulp.dest('build/js'))
        .pipe(uglify())
        .pipe(banner())
        .pipe(rename('cropjs.min.js'))
        .pipe(gulp.dest('build/js'));
});


// Copy necessary files
gulp.task('copy', function() {
    return gulp.src('app/index.html')
        .pipe(gulp.dest('build/'));
});

// Watch files for changes
gulp.task('watch', function() {
    gulp.watch('app/js/*.js', ['lint', 'scripts']);
    gulp.watch('app/scss/*.scss', ['sass']);
});

// Default Task
gulp.task('default', ['lint', 'sass', 'scripts', 'copy', 'watch']);