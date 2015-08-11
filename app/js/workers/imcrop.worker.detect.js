/**
 * Detect/feature worker
 */


//
// Add dummy window object so tracking.js works outside ui context
//
tracking = {};
Win = function () {};

window = new Win();
window.tracking = tracking;

importScripts(
    'tracking-min.js'
);


//
// Add function to tracking.js in order to track corners directly
// on image data so that we do not need to access ui.
//
tracking.trackData = function(tracker, imageData, width, height) {
    var task = new tracking.TrackerTask(tracker);

    task.on('run', function() {
        tracker.track(imageData.data, width, height);
    });

    return task.run();
};


//
// On message event handler
//
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
        var tracker = new tracking.ObjectTracker(['face']);
        var _this = this;

        tracker.setStepSize(byValue);
        tracker.on('track', function (event) {
            event.data.forEach(function (rect) {
                _this.postMessage(rect);
            });
        });

        tracking.trackData(tracker, imageData, imageWidth, imageHeight);
    }

};