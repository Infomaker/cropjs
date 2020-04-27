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
npm run dev         // Start development server located at http://localhost:8000, and file watch
npm run build       // Build and minify files for project
npm run release:[major||minor||hotfix] // Bump version in package.json and package-lock.json then commit files
./publish.sh        // Publish a new version to NPM
```

### Use in local dev writer

Simply change index.html in Writer project.

Swap this:

```html
    <script src="/dist/cropjs/js/tracking.min.js?v=2.1.0"></script>
    <script src="/dist/cropjs/js/cropjs.min.js?v=2.1.0"></script>
    <link href="/dist/cropjs/css/imcrop.css?v=2.1.0" rel="stylesheet" type="text/css" />
```

for this:

```html
    <!--
    <script src="/dist/cropjs/js/tracking.min.js?v=2.1.0"></script>
    <script src="/dist/cropjs/js/cropjs.min.js?v=2.1.0"></script>
    <link href="/dist/cropjs/css/imcrop.css?v=2.1.0" rel="stylesheet" type="text/css" />
    -->

    <script src="http://localhost:8000/cropjs/js/tracking.js"></script>
    <script src="http://localhost:8000/cropjs/js/cropjs.js"></script>
    <link href="http://localhost:8000/cropjs/css/imcrop.css" rel="stylesheet" type="text/css" />
```

## References

Using [tracking.js](https://trackingjs.com/) for feature and face detection.
