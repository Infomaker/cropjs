
tracking = {};
Win = function () {};

window = new Win();
window.tracking = tracking;


importScripts(
    "tracking.js-master/build/tracking-min.js",
    "tracking.js-master/build/data/face-min.js",
    "tracking.js-master/build/data/eye-min.js"
);

tracking.trackData = function(tracker, imageData, width, height) {
    var task = new tracking.TrackerTask(tracker);

    task.on('run', function() {
        tracker.track(imageData.data, width, height);
    });

    return task.run();
};

onmessage = function(e) {
    var operation = e.data[0],
        imageData = e.data[1],
        imageWidth = e.data[2],
        imageHeight = e.data[3],
        byValue = e.data[4];

    if (operation == 'details') {
        this.postMessage(
            tracking.Fast.findCorners(
                tracking.Image.grayscale(
                    imageData.data,
                    imageWidth,
                    imageHeight
                ),
                imageWidth,
                imageHeight,
                byValue // Threshold
            )
        );

        return;
    }

    if (operation == 'features') {
        var tracker = new tracking.ObjectTracker(['face', 'eye']);
        var _this = this;

        tracker.setStepSize(1.6);
        tracker.on('track', function (event) {
            event.data.forEach(function (rect) {
                _this.postMessage(rect);
            });
        });

        tracking.trackData(tracker, imageData, imageWidth, imageHeight);
        return;
    }

};