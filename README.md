# CropJS

## About CropJS

CropJS is a lightweight soft crop tool for to integration into other projects. It uses TrackingJS to enable automatic feature and face detection based cropping for a preset number of predefined crop dimensions.

## Usage

### Installation

```bash
npm install @infomaker/cropjs
```

### Define a placeholder for the crop dialog

```html
<div id="crop_impl"></div>
```

### Instantiate a new crop dialog

```js
// Get div where cropjs is loaded
var div = document.getElementById('crop_impl');

// Get access to the editor object
if (typeof editor == 'undefined') {
    editor = new IMSoftcrop.Editor(
            'crop_impl',
            {
                autocrop: true,
                detectWorkerUrl: '/cropjs/js/imcrop.worker.detect.js',
                detectThreshold: 20,
                detectStepSize: 2.5,
                debug: false,
                debugElement: document.getElementById('imc_debug')
            }
    );

    // Add save handler
    editor.onSave(function (cropdata) {

    });

    // Add cancel handler
    editor.onCancel(function (cropdata) {

    });
}
```

### Add image and predefined crop dimensions

```js
editor.addImage(
        image.src,
        function (addedImage) {
            this.addSoftcrop('1:1', true, 1, 1);
            this.addSoftcrop('16:9', false, 16, 9);
            this.addSoftcrop('3:2', false, 3, 2);

            this.addSoftcrop('fixed', false, 800, 400, 100, 20);
        }
);
```

## Development

### Install dependencies

```bash
npm install
```

### Useful commands

```bash
npm run dev         // Start development server and file watch
npm run build       // Build and minify files for project
```

## References

Using [tracking.js](https://trackingjs.com/) for feature and face detection.
