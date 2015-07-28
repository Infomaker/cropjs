var IMSoftcrop = (function() {

    this.Editor = Class.extend({

        // Editor container element id
        _id: '',

        // Editor container element
        _container: undefined,

        // Editor canvas
        _canvas: undefined,

        // Preview container element
        _previewContainer: undefined,

        // Debug container element
        _debugContainer: undefined,

        // Current selected image object
        _image: undefined,

        // All crops
        _crops: [],

        // Current selected crop object
        _crop: undefined,

        // Current handle name
        _handle: undefined,

        // Object being dragged
        _dragObject: undefined,

        // Drag point origin for calculating movement offsets
        _dragPoint: undefined,

        _position: {x: 0, y: 0},

        _zoomLevel: 1,
        _keepCenter: false,
        _scale: 1,
        _margin: 5,

        // "Constants"
        _zoomMax: 5,
        _zoomMin: 0.1,

        // Options
        autodetect: false,
        _debug: false,

        // IMCropUI.Toggle for drawing guides
        _guidesToggle: undefined,

        // IMCropUI.Toggle for drawing focus points
        _focusPointsToggle: undefined,

        // IMCropUI.Toggle for auto cropping
        _autoCropToggle: undefined,

        // IMCropUI.Toggle for locking crops
        _cropLockedToggle: undefined,

        // IMCropUI.Button for auto crop
        // _detectAndCropButton: undefined,




        /**
         * Constructor
         *
         * @param container
         * @private
         */
        _construct: function (id, options) {
            this._id = id;
            this.renderGui();
            this.adjustForPixelRatio();

            this.calculateViewport();
            this.addCanvasEventListeners();

            // Options
            if (typeof options == 'object') {
                var _this = this;

                if (options.debug === true) {
                    if (typeof options.debug != 'undefined') {
                        this._debugContainer = options.debugElement;
                    }

                    this._debug = true;
                }

                if (options.autodetect === true) {
                    this.autodetect = true;
                }
            }

            // Auto crop
            this._autoCropToggle = new IMCropUI.Toggle(
                'imc_autocrop',
                function() {}
            );

            // Lock crop
            this._cropLockedToggle = new IMCropUI.Toggle(
                'imc_croplocked',
                function () {
                    // TODO: Propagare to current crop
                    //_this.redraw();
                }
            );

            // Draw guides toggle
            this._guidesToggle = new IMCropUI.Toggle(
                'imc_guides',
                function () {
                    _this.redraw();
                }
            );

            // Draw focuspoints toggle
            this._focusPointsToggle = new IMCropUI.Toggle(
                'imc_focuspoints',
                function () {
                    _this.redraw();
                }
            );

            // Draw button
            /*
            this._detectAndCropButton = new IMCropUI.Button(
                'imc_detectandcrop',
                function () {
                    //_this.toggleWait();

                    setTimeout(
                        function() {
                            _this.detectFaces();
                            _this._image.autocrop();
                            _this.redraw();
                            _this.toggleWait();
                        },
                        100
                    );
                }
            );
            */
        },

        /**
         * Toggle loading spinning indicator
         */
        toggleLoadingImage: function(visible) {
            var e = document.getElementById('imc_loading');

            if (typeof visible == 'undefined') {
                return e.classList.contains('loading');
            }

            if (visible) {
                e.classList.add('loading');
            }
            else {
                e.classList.remove('loading');
            }

            return visible;
        },

        /**
         * Render main gui elements
         * @private
         */
        renderGui: function () {
            this._container = document.getElementById(this._id);
            if (!this._container) {
                throw new Error('Container element with id <' + this._id + '> not found');
            }

            this._previewContainer = document.createElement('div');
            this._previewContainer.id = 'imc_preview_container';

            var workContainer = document.createElement('div');
            workContainer.id = 'imc_work_container';
            workContainer.appendChild(this._previewContainer);

            this._canvas = document.createElement('canvas');
            this._container.appendChild(this._canvas);
            this._container.appendChild(workContainer);
        },

        /**
         * Render preview area for all soft crops
         * @private
         */
        _renderPreviews: function () {
            if (!this._image.isReady()) {
                return;
            }

            // Render preview area
            if (this._previewContainer.id != this._image.id) {
                this._previewContainer.innerHTML = '';
                this._previewContainer.id = this._image.id;
            }

            // Recalculate current preview
            var crops = this._image.getCrops();
            for(var n = 0; n < crops.length; n++) {
                this._renderUpdatedPreview(crops[n]);
            }
        },

        /**
         * Add and render specific crop preview
         *
         * @param crop
         * @param setAsCurrent
         * @private
         */
        _renderNewPreview: function (crop, setAsCurrent) {
            var previewHeight = 80;
            var _this = this;

            // Create image container element
            var pvDiv = document.createElement('div');
            pvDiv.id = this._image.id + '_' + crop.id;
            pvDiv.classList.add('imc_preview_image');
            pvDiv.style.width = IMSoftcrop.Ratio.width(previewHeight, crop.ratio.f) + 'px';

            if (setAsCurrent) {
                pvDiv.classList.add('active');
            }

            pvDiv.addEventListener(
                'click',
                function () {
                    _this.setActiveCrop(crop);
                }
            );

            // Create image element
            var pvImg = document.createElement('img');
            pvImg.src = this._image._src;


            // Put it together
            pvDiv.appendChild(pvImg);
            this._previewContainer.appendChild(pvDiv);


            // Render update
            this._renderUpdatedPreview(crop);
        },


        /**
         * Update rendering of current crop preview
         * @param crop
         * @private
         */
        _renderUpdatedPreview: function (crop) {
            var pvDiv = document.getElementById(this._image.id + '_' + crop.id);
            if (typeof pvDiv != 'object') {
                return;
            }

            var imgDim = this._image.getDimensions();
            var previewHeight = 80;
            var previewWidth = IMSoftcrop.Ratio.width(previewHeight, crop.ratio.f);
            var cropDim = crop.getDimensions();
            var cropRatio = previewWidth / cropDim.w;
            var pvImg = pvDiv.getElementsByTagName('IMG');

            pvImg[0].style.height = imgDim.h * cropRatio + 'px';
            pvImg[0].style.marginTop = '-' + cropDim.y * cropRatio + 'px';
            pvImg[0].style.marginLeft = '-' + cropDim.x * cropRatio + 'px';

            if (crop.autoCropWarning == true) {
                pvDiv.classList.add('warning');
            }
            else {
                pvDiv.classList.remove('warning');
            }
        },

        /**
         * Get dimensions
         * @returns {{margin: number, width: number, height: number}}
         */
        getDimensions: function () {
            return {
                margin: this._margin,
                width: this._canvas.width,
                height: this._canvas.height
            };
        },


        /**
         * Redraw canvas
         */
        redraw: function () {
            this.adjustForPixelRatio();

            if (this._image instanceof IMSoftcrop.Image) {

                this._image.redraw({
                    guides: this._guidesToggle.on,
                    focuspoints: this._focusPointsToggle.on
                });

                this._renderPreviews();
            }

            if (this._debug) {
                this._renderDebug();
            }
        },

        /**
         * Adjust canvas for pixel ratio
         * @param canvas
         */
        adjustForPixelRatio: function (canvas) {
            var c = canvas || this._canvas;
            var ctx = c.getContext('2d');
            var devicePixelRatio = window.devicePixelRatio || 1;
            var backingStoreRatio =
                ctx.webkitBackingStorePixelRatio ||
                ctx.mozBackingStorePixelRatio ||
                ctx.msBackingStorePixelRatio ||
                ctx.oBackingStorePixelRatio ||
                ctx.backingStorePixelRatio || 1;
            var ratio = devicePixelRatio / backingStoreRatio;

            if (devicePixelRatio !== backingStoreRatio) {
                var oldWidth = this._container.clientWidth;
                var oldHeight = this._container.clientHeight;

                c.width = oldWidth * ratio;
                c.height = oldHeight * ratio;

                c.style.width = oldWidth + 'px';
                c.style.height = oldHeight + 'px';

                // now scale the context to counter
                // the fact that we've manually scaled
                // our canvas element
                ctx.scale(ratio, ratio);
                this._scale = ratio;
            }
            else {
                c.width = this._container.clientWidth;
                c.height = this._container.clientHeight;
            }
        },


        /**
         * Load image from url
         * @param url
         * @param cbFunc
         */
        addImage: function (url, cbFunc) {
            var _this = this;

            this.toggleLoadingImage(true);
            this._image = new IMSoftcrop.Image(this);

            this._image.load(
                IMSoftcrop.Ratio.hashFnv32a(url),
                url,
                function () {
                    _this.setZoomToImage(false);

                    // Need to redraw before detecting
                    _this.redraw();

                    if (_this.autodetect) {
                        _this.detectDetails();
                        _this.detectFaces();
                    }
                    else {
                        _this.toggleLoadingImage(false);
                    }

                    if (typeof cbFunc === 'function') {
                        cbFunc.call(_this, _this._image);
                    }
                }
            );
        },


        /**
         * Auto crop images
         */
        autocropImages: function() {
            if (this._autoCropToggle.on) {
                if (!this.toggleLoadingImage()) {
                    this.toggleLoadingImage(true)
                }

                if (this._image.autocrop()) {
                    this.redraw();
                    this.toggleLoadingImage(false);
                }
            }
        },

        getImageData: function() {
            if (!this._image instanceof IMSoftcrop.Image || !this._image.isReady()) {
                return;
            }

            var body = document.getElementsByTagName('body');
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');

            this.adjustForPixelRatio(canvas);
            canvas.style.display = 'none';
            body[0].appendChild(canvas);

            ctx.drawImage(
                this._image._image,
                this._image._drawX, this._image._drawY,
                this._image._drawW, this._image._drawH
            );

            var imageData = ctx.getImageData(0, 0, this._image._w, this._image._h);

            // Paranoid cleanup
            ctx = null;
            body[0].removeChild(canvas);
            canvas = null;
            body[0] = null;
            body = null;

            return imageData;
        },


        /**
         * Detect features in image
         */
        detectDetails: function() {
            if (!this._image instanceof IMSoftcrop.Image || !this._image.isReady()) {
                return;
            }

            var _this = this,
                imageData = this.getImageData();

            if (window.Worker) {
                // If workers are available, thread it
                var detectWorker = new Worker('js/imcrop.worker.detect.js');
                detectWorker.postMessage([
                    'details',
                    imageData,
                    this._image._w,
                    this._image._h,
                    60
                ]);

                detectWorker.onmessage = function(e) {
                    _this.addDetectedDetails(e.data);
                    _this.autocropImages();
                };
            }
            else {
                // Fallback to non threaded
                var data = tracking.Fast.findCorners(
                    tracking.Image.grayscale(
                        imageData.data,
                        this._image._w,
                        this._image._h
                    ),
                    this._image._w,
                    this._image._h,
                    60 // Threshold
                );

                this.addDetectedDetails(data);
                this.autocropImages();
            }
        },

        /**
         * Add detected details to current image
         * @param data
         */
        addDetectedDetails: function(data) {
            var corners = [];
            for (var i = 0; i < data.length; i += 2) {
                // Tracking does not understand scale, adjust for it
                var imagePoint = this.canvasPointInImage(
                    data[i] / this._scale,
                    data[i + 1] / this._scale
                );

                corners.push(imagePoint);
            }

            this._image.addDetailData(corners);
        },


        /**
         * Detect faces in image
         */
        detectFaces: function () {
            if (!this._image instanceof IMSoftcrop.Image || !this._image.isReady()) {
                return;
            }

            var _this = this;

            if (window.Worker) {
                // If workers are available, thread it
                var featureWorker = new Worker('js/imcrop.worker.detect.js');
                featureWorker.postMessage([
                    'features',
                    this.getImageData(),
                    this._image._w,
                    this._image._h,
                    1.6
                ]);

                featureWorker.onmessage = function(e) {
                    _this.addDetectedFeature(e.data);
                    _this.autocropImages();
                };
            }
            else {
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

                var tracker = new tracking.ObjectTracker(['face', 'eye']);
                tracker.setStepSize(1.6);
                tracker.on('track', function (event) {
                    event.data.forEach(function (rect) {
                        _this.addDetectedFeature(rect);
                    });
                    _this.autocropImages();
                });

                tracking.trackData(tracker, this.getImageData(), this._image._w, this._image._h);
            }
        },

        addDetectedFeature: function(rect) {
            var imagePoint = this.canvasPointInImage(
                (rect.x / this._scale),
                (rect.y / this._scale)
            );
            var imageRadius = this.canvasLineInImage(rect.width > rect.height ? (rect.width / 2) / this._scale : (rect.height / 2) / this._scale);

            imagePoint.x += imageRadius;
            imagePoint.y += imageRadius;

            // Increase radius so foreheads are covered as well
            this._image.addFocusPoint(imagePoint, imageRadius * 1.5);
        },

        canvasLineInImage: function(v) {
            return v / this._zoomLevel;
        },

        imageLineInCanvas: function(v) {
            return v * this._zoomLevel;
        },

        imagePointInCanvas: function(x, y) {
            return {
                x: Math.round((x + this._image._x) * this._zoomLevel) + this._margin,
                y: Math.round((y + this._image._y) * this._zoomLevel) + this._margin
            }
        },

        canvasPointInImage: function(x, y) {
            return {
                x: Math.round((x - this._margin) / this._zoomLevel) - this._image._x,
                y: Math.round((y- this._margin) / this._zoomLevel) - this._image._y
            };
        },

        /**
         * Center image around a point in the drawing area
         * @param redraw
         * @param point
         * @param factor
         */
        centerImage: function (redraw, point, factor) {
            var cx, cy;

            // TODO: Should remove 1 when calculation below is fixed
            if (1 || typeof point === 'undefined') {
                this._keepCenter = true;
                cx = this._container.clientWidth / 2;
                cy = this._container.clientHeight / 2;
            }
            else {
                cx = point.x;
                cy = point.y;
            }

            var ix = ((this._image._w * this._zoomLevel) / 2) + (this._image._x * this._zoomLevel) + this._margin;
            var iy = ((this._image._h * this._zoomLevel) / 2) + (this._image._y * this._zoomLevel) + this._margin;

            var x = 0;
            var y = 0;


            // TODO: Should remove 0 and fix calculation
            if (0 && typeof factor == 'number') {
                if (cx != ix) {
                    x = ((cx - ix) * factor) * this._zoomLevel;
                }

                if (cy != iy) {
                    y = (cy - iy) / this._zoomLevel;
                }

                this._image.move({x: x, y: y});
            }
            else {
                if (cx != ix) {
                    x = (cx - ix) / this._zoomLevel;
                }

                if (cy != iy) {
                    y = (cy - iy) / this._zoomLevel;
                }

                this._image.move({x: x, y: y});
            }

            if (redraw === true) {
                this.redraw();
            }
        },

        /**
         * Return current zoom level in percent, or decimal if decimal parameter is true
         * @param decimal
         * @returns {number}
         */
        getZoom: function (decimal) {
            return decimal === true ? this._zoomLevel : this._zoomLevel * 100;
        },


        /**
         * Set zoom by percent
         *
         * @param zoomLevel
         * @param redraw
         */
        setZoom: function (zoomLevel, redraw) {
            this._zoomLevel = zoomLevel / 100;

            if (this._keepCenter) {
                this.centerImage(false);
            }

            if (redraw === true) {
                this.redraw();
            }
        },

        /**
         * Fill drawing area with image as best as possible
         * @param redraw
         */
        setZoomToImage: function (redraw) {
            var imgDim = this._image.getDimensions();
            var vFactor = (this._container.clientHeight - this._margin * 2) / imgDim.h;
            var hFactor = (this._container.clientWidth - this._margin * 2) / imgDim.w;

            // Set correct zoom level
            if (vFactor < hFactor && vFactor < 1 && this._zoomLevel > vFactor) {
                // Fill vertical
                this._zoomLevel = vFactor;
                this.centerImage(false);
            }
            else if (hFactor < 1 && this._zoomLevel > hFactor) {
                // Fill horizontal
                this._zoomLevel = hFactor;
                this.centerImage(false);
            }
            else {
                // No need to redraw
                return;
            }

            if (redraw === true) {
                this.redraw();
            }
        },

        /**
         * Add soft crop to image
         *
         * @param hRatio
         * @param vRatio
         * @param setAsCurrent
         */
        addSoftcrop: function (hRatio, vRatio, setAsCurrent) {

            // Add uninitialized crop to list of available crops
            this._crops.push({
                hRatio: hRatio,
                vRatio: vRatio,
                setAsCurrent: setAsCurrent
            });

            if (this._image instanceof IMSoftcrop.Image && this._image.isReady()) {
                // Always make sure all crops are added
                for(var n = 0; n < this._crops.length; n++) {
                    var crop = this._image.addSoftcrop(
                        this._crops[n].hRatio,
                        this._crops[n].vRatio,
                        this._crops[n].setAsCurrent
                    );

                    if (crop === null) {
                        continue;
                    }

                    if (this._crops[n].setAsCurrent) {
                        this._crop = crop;
                    }

                    if (this._autoCropToggle.on) {
                        this._image.autocrop();
                    }

                    this._renderNewPreview(crop, this._crops[n].setAsCurrent);
                }

                this.redraw();
            }
        },

        /**
         * Set active crop
         * @param crop
         */
        setActiveCrop: function (crop) {
            if (crop instanceof IMSoftcrop.Softcrop !== true) {
                return;
            }

            var div = document.getElementById(this._image.id + '_' + crop.id);
            var divs = this._previewContainer.getElementsByClassName('imc_preview_image');
            for (var n = 0; n < divs.length; n++) {
                divs[n].classList.remove('active');
            }

            div.classList.add('active');

            this._crop = crop;
            this._image.setActiveCrop(crop);
            this.redraw();
        },


        /**
         * Add all event listeners required for drawing and dragging
         */
        addCanvasEventListeners: function () {
            var _this = this;

            window.addEventListener(
                'resize',
                function () {
                    _this.onResize(event);
                },
                false
            );

            this._canvas.addEventListener(
                'mousedown',
                function (event) {
                    _this.onMouseDown(event);
                }
            );

            this._canvas.addEventListener(
                'mouseup',
                function (event) {
                    _this.onMouseUp(event);
                }
            );

            window.addEventListener(
                'mouseup',
                function (event) {
                    _this.onMouseUp(event);
                }
            );
            this._canvas.addEventListener(
                'mousemove',
                function (event) {
                    _this.onMouseMove(event);
                }
            );

            this._canvas.addEventListener(
                'mousewheel',
                function (event) {
                    event.stopPropagation();
                    event.preventDefault();
                    _this.onMouseWheel(event);
                    return false;
                },
                false
            );

            document.addEventListener(
                'keydown',
                function (e) {
                    var keyCode = e.keyCode || e.which;
                    if (keyCode == 9) {

                        var crops = _this._image.getCrops();
                        var current;
                        for (var n = 0; n < crops.length; n++) {
                            if (_this._crop === crops[n]) {
                                current = n;
                                break;
                            }
                        }

                        if (typeof current != 'undefined') {
                            n += (!e.shiftKey) ? 1 : -1;

                            if (n < 0) {
                                n = crops.length - 1;
                            }
                            else if (n + 1 > crops.length) {
                                n = 0;
                            }
                            _this.setActiveCrop(crops[n]);
                        }

                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                },
                false
            );
        },


        /**
         * On window resize handler
         *
         * @todo Should use zoomToImage(false) for keepCenter
         */
        onResize: function () {
            if (this._keepCenter) {
                this.centerImage(false);
            }

            this.redraw();
            this.calculateViewport();
        },


        /**
         * On mouse down event handler
         * @param event
         */
        onMouseDown: function (event) {
            var point = this.getMousePoint(event);

            if (this._crop instanceof IMSoftcrop.Softcrop && typeof this._handle === 'string') {
                this._dragPoint = point;
                this._dragObject = this._handle;
            }
            else if (this._crop instanceof IMSoftcrop.Softcrop && this._crop.inArea(point)) {
                this._dragObject = this._crop;
                this._dragPoint = point;
            }
            else if (this._image instanceof IMSoftcrop.Image && this._image.inArea(point)) {
                this._dragObject = this._image;
                this._dragPoint = point;
            }
        },


        /**
         * On mouse up event handler
         */
        onMouseUp: function () {
            this._dragObject = undefined;
            this._dragPoint = undefined;
        },


        /**
         * On mouse move event handler.
         * Calculate mouse coordinates in canvas (starting with border).
         * @param event
         */
        onMouseMove: function (event) {
            var point = this.getMousePoint(event);

            // Move dragged object
            if (typeof this._dragObject != 'undefined') {

                if (typeof this._dragObject == 'string') {
                    // Dragging handle
                    this._crop.dragHandle(
                        this._dragObject,
                        {
                            x: (point.x - this._dragPoint.x) / this._zoomLevel,
                            y: (point.y - this._dragPoint.y) / this._zoomLevel
                        }
                    );
                }
                else {
                    if (this._dragObject instanceof IMSoftcrop.Image) {
                        this._keepCenter = false;
                    }

                    this._dragObject.move({
                            x: (point.x - this._dragPoint.x) / this._zoomLevel,
                            y: (point.y - this._dragPoint.y) / this._zoomLevel
                        }
                    );
                }

                this.redraw();
                this._dragPoint = point;
                return;
            }

            // Handle hover
            if (this._crop instanceof IMSoftcrop.Softcrop) {
                var handle = this._crop.overHandle(point);

                if (handle !== false && this._handle != handle) {
                    if (handle == 'nw' || handle == 'se') {
                        this._canvas.style.cursor = 'nwse-resize';
                    }
                    else if (handle == 'ne' || handle == 'sw') {
                        this._canvas.style.cursor = 'nesw-resize';
                    }
                    else if (handle == 'n' || handle == 's') {
                        this._canvas.style.cursor = 'ns-resize';
                    }
                    else {
                        this._canvas.style.cursor = 'ew-resize';
                    }

                    this._handle = handle;
                    return;
                }
                else if (handle === false && this._handle) {
                    this._canvas.style.cursor = 'default';
                    this._handle = undefined;
                    return;
                }
                else if (this._handle) {
                    return;
                }
            }

            // Reset hover
            if (this._image instanceof IMSoftcrop.Image && this._image.inArea(point)) {
                this._canvas.style.cursor = 'move';
                return;
            }

            this._canvas.style.cursor = 'default';
        },


        /**
         * On mouse wheel event handler.
         *
         * @fixme Fix code for calculating offsets based on current mouse point
         *
         * @param event
         */
        onMouseWheel: function (event) {
            var point = this.getMousePoint(event);
            var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
            var zoom = 0;

            if (delta < 0 && this._zoomLevel < this._zoomMax) {
                // Zoom in
                zoom = this._zoomLevel < 1 ? 0.01 : 0.03;
                this._zoomLevel += zoom;
            }
            else if (delta > 0 && this._zoomLevel > this._zoomMin) {
                // Zoom out
                zoom = this._zoomLevel < 1 ? -0.01 : -0.03;
                this._zoomLevel += zoom;
            }
            else {
                return;
            }

            if (0 && this._keepCenter) {
                this.centerImage(false);
            }
            else {
                this.centerImage(false, point, zoom);
            }

            this.redraw();
        },


        /**
         * Get mouse coordinates
         * @param event
         * @returns {{x: number, y: number}}
         */
        getMousePoint: function (event) {
            return {
                x: event.pageX - this._position.x,
                y: event.pageY - this._position.y
            };
        },

        /**
         * Get canvas
         * @returns {*}
         */
        getCanvas: function () {
            return this._canvas;
        },


        /**
         * Calculate true x,y offset of canvas, including the border and margin
         *
         * @returns {{x: number, y: number}}
         */
        calculateViewport: function() {
            var offset = IMSoftcrop.Ratio.getElementPosition(this._canvas);

            this._position.x = offset.x;
            this._position.y = offset.y;
        },


        /**
         * Render and output debug position and dimensions
         * @private
         */
        _renderDebug: function () {
            this._drawCross(
                'red',
                {
                    x: this._container.clientWidth / 2,
                    y: this._container.clientHeight / 2
                }
            );

            this._drawCross(
                'green',
                {
                    x: ((this._image._w * this._zoomLevel) / 2) + (this._image._x * this._zoomLevel) + this._margin,
                    y: ((this._image._h * this._zoomLevel) / 2) + (this._image._y * this._zoomLevel) + this._margin
                }
            );

            if (typeof this._debugContainer != 'undefined') {
                var str = '<pre>';
                str += 'Zoom level: ' + this._zoomLevel + "\n";

                if (typeof this._image != 'undefined') {
                    str += 'Image w: ' + this._image._w + "\n";
                    str += '      h: ' + this._image._h + "\n";
                    str += "\n";
                    if (typeof this._image._crop != 'undefined') {
                        str += 'Crop  x: ' + this._image._crop._x + "\n";
                        str += '      y: ' + this._image._crop._y + "\n";
                        str += '      w: ' + this._image._crop._w + "\n";
                        str += '      h: ' + this._image._crop._h + "\n";
                    }
                }
                str += '</pre>';

                this._debugContainer.innerHTML = str;
            }
        },


        /**
         * Helper function for drawing a cross mark
         * @param string
         * @param point
         */
        _drawCross: function (color, point) {
            var ctx = this._canvas.getContext('2d');

            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 0.5;

            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI, false);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(point.x - 50, point.y);
            ctx.lineTo(point.x + 50, point.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(point.x, point.y - 50);
            ctx.lineTo(point.x, point.y + 50);
            ctx.stroke();
        }
    });

    return this;
})();

