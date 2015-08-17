var IMSoftcrop = (function() {

    /**
     * Editor constructor
     * @constructor
     *
     * @param {string} id
     * @param {object} [options]
     */
    this.Editor = function (id, options) {
        this._id = id;
        this._crops = [];

        this.setupUI();
        this.adjustForPixelRatio();

        this.calculateViewport();
        this.addCanvasEventListeners();

        this.setupAnimation();
        this.runAnimation();

        // Options
        if (typeof options == 'object') {
            var _this = this;

            // Options.debug
            // Options.debugElement
            if (options.debug === true) {
                if (typeof options.debug != 'undefined') {
                    this._debugContainer = options.debugElement;
                }

                this._debug = true;
            }

            // Options.autodectect
            if (options.autocrop === true) {
                this._autocrop = true;
            }

            // Options.detectWorkerUrl
            if (typeof options.detectWorkerUrl === 'string') {
                this._detectWorkerUrl = options.detectWorkerUrl;
            }

            // Options.detectThreshold for detect corners
            if (typeof options.detectThreshold === 'number') {
                this._detectThreshold = options.detectThreshold;
            }

            // Options.detectStepSize (for detecting faces/features)
            if (typeof options.detectStepSize === 'number') {
                this._detectStepSize = options.detectStepSize;
            }
        }

        // Lock crop
        this._cropLockedToggle = new IMCropUI.Toggle(
            'imc_croplocked',
            function () {
                if (_this._crop instanceof IMSoftcrop.Softcrop) {
                    _this._crop.locked = this.on;
                }
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

        // Save button
        this._saveButton = new IMCropUI.Button(
            'imc_save',
            function () {
                _this.onButtonSave();
            }
        );

        // Save button
        this._cancelButton = new IMCropUI.Button(
            'imc_cancel',
            function () {
                _this.onButtonCancel();
            }
        );
    };

    this.Editor.prototype = {

        // Editor container element id
        _id: '',

        // Editor container element
        _container: undefined,

        // Editor canvas
        _canvas: undefined,

        // Editor canvas
        _ctx: undefined,

        // True if redraw canvas is necessary
        _redrawCanvas: false,

        // Preview container element
        _previewContainer: undefined,

        // Debug container element
        _debugContainer: undefined,

        // Current selected image object
        _image: undefined,

        // All crops
        _crops: undefined,

        // Current selected crop object
        _crop: undefined,

        // Current handle name
        handle: undefined,

        // Object being dragged
        _dragObject: undefined,

        // Drag point origin for calculating movement offsets
        _dragPoint: undefined,

        _position: {x: 0, y: 0},

        _zoomLevel: 1,
        _keepCenter: false,
        _scale: 1,
        _margin: 5,
        _waitForWorkers: 0, // Number of workers active

        // "Constants"
        _zoomMax: 5,
        _zoomMin: 0.1,

        // Option, detect and autocrop images
        _autocrop: false,

        // Image loading specific option, true if autocrop should actually be applied
        _applyAutocrop: true,

        // Option, detect worker script url
        _detectWorkerUrl: undefined,

        // Option, detect corners threshold for difference between colours
        _detectThreshold: 60,

        // Option, step size for finding features like faces and eyes
        _detectStepSize: 1.6,

        // Option, output debug info
        _debug: false,

        // Option callbacks
        _onSave: undefined,
        _onCancel: undefined,

        // IMCropUI.Toggle for drawing guides
        _guidesToggle: undefined,

        // IMCropUI.Toggle for drawing focus points
        _focusPointsToggle: undefined,

        // IMCropUI.Toggle for locking crops
        _cropLockedToggle: undefined,

        // IMCropUI.Button for saving
        _saveButton: undefined,

        // IMCropUI.Button for cancelling
        _cancelButton: undefined,


        /**
         * Get hold of references to the main gui elements
         *
         * div#imc_container
         *     canvas#imc_canvas
         *     div#imc_work_container
         *         div#imc_preview_container.imc_preview_container
         *
         * @private
         */
        setupUI: function () {
            this.injectHTML();

            this._container = document.getElementById('imc_container');
            if (!this._container) {
                throw new Error('Container element with id <imc_container> not found');
            }

            this._previewContainer = document.getElementById('imc_preview_container');
            if (!this._previewContainer) {
                throw new Error('Preview element with id <imc_preview_container> not found');
            }

            this._canvas = document.getElementById('imc_canvas');
            if (!this._canvas) {
                throw new Error('Canvas element with id <imc_canvas_initial> not found');
            }

            this._ctx = this._canvas.getContext('2d');
        },


        injectHTML: function() {
            var injectElement = document.getElementById(this._id);
            if (!injectElement) {
                throw new Error('Could not find element with id <' + this._id + '> to inject crop editor into');
            }

            injectElement.innerHTML =
                '<div id="imc">' +
                    '<div id="imc_container">' +
                        '<canvas id="imc_canvas"></canvas>' +

                        '<div id="imc_work_container">' +
                            '<div id="imc_preview_container" class="imc_preview_container"></div>' +
                        '</div>' +

                        '<div id="imc_loading">' +
                            '<i class="fa fa-cog fa-spin"></i>' +
                        '</div>' +

                        '<a href="#" id="imc_croplocked" class="toggle">' +
                            '<em class="hint">Låst till användare</em>' +
                            '<span>' +
                                '<span class="on"><i class="fa fa-lock"></i></span>' +
                                '<span class="off"><i class="fa fa-unlock"></i></span>' +
                            '</span>' +
                        '</a>' +

                        '<div class="toolbar">' +
                            '<div class="group">' +
                                '<a href="#" id="imc_focuspoints" class="toggle">' +
                                    '<em class="hint">Detaljer</em>' +
                                    '<span>' +
                                        '<span class="on"><i class="fa fa-object-group"></i></span>' +
                                        '<span class="off"><i class="fa fa-object-group"></i></span>' +
                                    '</span>' +
                                '</a>' +

                                '<a href="#" id="imc_guides" class="toggle on">' +
                                    '<em class="hint">Guide lines</em>' +
                                    '<span>' +
                                        '<span class="on"><i class="fa fa-th"></i></span>' +
                                        '<span class="off"><i class="fa fa-th"></i></span>' +
                                    '</span>' +
                                '</a>' +
                            '</div>' +

                            '<div class="group right">' +
                                '<a href="#" id="imc_cancel" class="button left secondary" style="display: none;">Avbryt</a>' +
                                '<a href="#" id="imc_save" class="button right" style="display: none;">Spara</a>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        },

        /**
         * Setup animation through either native requestAnimationFrame or fallback
         */
        setupAnimation: function() {
            var lastTime = 0;
            var vendors = ['webkit', 'moz'];

            for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
                window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
                window.cancelAnimationFrame =
                    window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
            }

            if (!window.requestAnimationFrame) {
                window.requestAnimationFrame = function (callback, element) {
                    var currTime = new Date().getTime();
                    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                    var id = window.setTimeout(function () {
                            callback(currTime + timeToCall);
                        },
                        timeToCall);
                    lastTime = currTime + timeToCall;
                    return id;
                };
            }

            if (!window.cancelAnimationFrame) {
                window.cancelAnimationFrame = function (id) {
                    clearTimeout(id);
                };
            }
        },


        /**
         * Run animation
         */
        runAnimation: function() {
            var _this = this;
            requestAnimationFrame(function() {
                _this.runAnimation();
            });

            // Only redraw when necessary
            if (!this._redrawCanvas) {
                return;
            }
            this._redrawCanvas = false;

            //this.adjustForPixelRatio();


            // Clear drawing area so transparency works
            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

            // Redraw current image
            if (this._image instanceof IMSoftcrop.Image) {
                this._image.redraw({
                    guides: this._guidesToggle.on,
                    focuspoints: this._focusPointsToggle.on
                });

                // Redraw all crop previews
                var softcrops = this._image.getSoftCrops();
                for (var n = 0; n < softcrops.length; n++) {
                    if (softcrops[n] instanceof IMSoftcrop.Softcrop) {
                        this._renderUpdatedPreview(softcrops[n]);
                    }
                }
            }

            if (this._debug) {
                this._renderDebug();
            }
        },



        /**
         * Tell editor a redraw is necessary
         */
        redraw: function () {
            this._redrawCanvas = true;
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
         * Add and render specific crop preview
         *
         * @param crop
         * @param setAsCurrent
         * @private
         */
        _renderNewCropPreview: function (crop, setAsCurrent) {
            var previewHeight = 80;
            var _this = this;

            // Create image container element
            var pvDivOuter = document.createElement('div');
            pvDivOuter.id = this._image.id + '_' + crop.id;
            pvDivOuter.classList.add('imc_preview_image_container');

            if (setAsCurrent) {
                pvDivOuter.classList.add('active');
            }

            pvDivOuter.addEventListener(
                'click',
                function () {
                    _this.setActiveCrop(crop);
                }
            );

            // Create inner container element
            var pvDivInner = document.createElement('div');
            pvDivInner.classList.add('imc_preview_image');
            pvDivInner.style.width = IMSoftcrop.Ratio.width(previewHeight, crop.ratio.f) + 'px';

            // Create span (title) element, including warning element
            var pvSpan = document.createElement('span');
            var pvSpanTxt = document.createTextNode(crop.id);
            var pvWarning = document.createElement('i');
            pvWarning.className = 'fa fa-warning';

            pvSpan.appendChild(pvSpanTxt);
            pvSpan.appendChild(pvWarning);


            // Create image element
            var pvImg = document.createElement('img');
            pvImg.src = this._image.src;

            // Put it together
            pvDivInner.appendChild(pvImg);
            pvDivInner.appendChild(pvSpan);
            pvDivOuter.appendChild(pvDivInner);
            this._previewContainer.appendChild(pvDivOuter);


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
            if (pvDiv == null || typeof pvDiv != 'object') {
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

                // now scale the context to counter the fact that we've
                // manually scaled our canvas element
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
         * @param onImageReady Callback after image has been loaded
         * @param autocropImage Optional, default true, if autocrops should be applied
         */
        addImage: function (url, onImageReady, applyAutocrop) {
            var _this = this;

            this.toggleLoadingImage(true);
            this.clear();
            this._applyAutocrop = (applyAutocrop !== false);

            this._image = new IMSoftcrop.Image(
                IMSoftcrop.Ratio.hashFnv32a(url),
                this
            );

            this._image.load(
                url,
                function () {
                    _this.setZoomToImage(false);
                    _this.centerImage(false);

                    if (_this._autocrop) {
                        _this.detectDetails();
                        _this.detectFaces();
                    }
                    else {
                        _this.toggleLoadingImage(false);
                    }

                    _this.applySoftcrops();
                    _this.redraw();

                    if (typeof onImageReady === 'function') {
                        onImageReady.call(_this, _this._image);
                    }
                }
            );
        },


        /**
         * Add soft crop to available soft crops
         *
         * @param id
         * @param hRatio
         * @param vRatio
         * @param setAsCurrent
         * @param x Optional
         * @param y Optional
         */
        addSoftcrop: function (id, setAsCurrent, hRatio, vRatio, x, y) {

            // Add uninitialized crop to list of available crops
            this._crops.push({
                id: id,
                setAsCurrent: setAsCurrent,
                hRatio: hRatio,
                vRatio: vRatio,
                x: (typeof x == 'undefined') ? null : x,
                y: (typeof y == 'undefined') ? null : y
            });

            if (this._image instanceof IMSoftcrop.Image && this._image.ready) {
                this.applySoftcrops();
            }
        },


        /**
         * Get soft crop data for image
         */
        getSoftcropData: function() {
            var data = {
                src: this._image.src,
                width: this._image.w,
                height: this._image.h,
                crops: []
            };

            for(var n = 0; n < this._image.crops.length; n++) {
                data.crops.push({
                    id: this._image.crops[n].id,
                    x: Math.round(this._image.crops[n].x),
                    y: Math.round(this._image.crops[n].y),
                    width: Math.round(this._image.crops[n].w),
                    height: Math.round(this._image.crops[n].h)
                });
            }

            return data;
        },

        /**
         * Apply all soft crops to image
         */
        applySoftcrops: function() {
            if (this._image instanceof IMSoftcrop.Image == false || !this._image.ready) {
                return;
            }

            // Always make sure all crops are added
            for(var n = 0; n < this._crops.length; n++) {
                var crop = this._image.getSoftcrop(this._crops[n].id);

                if (crop == null) {
                    var crop = this._image.addSoftcrop(
                        this._crops[n].id,
                        this._crops[n].setAsCurrent,
                        this._crops[n].hRatio,
                        this._crops[n].vRatio,
                        this._crops[n].x,
                        this._crops[n].y
                    );

                    if (this._autocrop) {
                        this._image.autocrop();
                    }

                    this._renderNewCropPreview(crop, this._crops[n].setAsCurrent);
                }


                if (this._crops[n].setAsCurrent) {
                    this.setActiveCrop(crop);
                }
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
            var divs = this._previewContainer.getElementsByClassName('imc_preview_image_container');
            for (var n = 0; n < divs.length; n++) {
                divs[n].classList.remove('active');
            }

            div.classList.add('active');

            this._crop = crop;
            this._image.setActiveCrop(crop);
            this._cropLockedToggle.on = crop.locked;
            this.redraw();
        },


        /**
         * Clear image and all image crops
         */
        clear: function() {
            if (this._image instanceof IMSoftcrop.Image == false) {
                return;
            }

            this._image.clear();
            this._crops = [];
            this._crop = undefined;
            this._image = undefined;
            this._previewContainer.innerHTML = '';
            this.redraw();
        },


        /**
         * Auto crop images
         */
        autocropImages: function() {
            if (this._autocrop && this._applyAutocrop) {
                if (!this.toggleLoadingImage()) {
                    this.toggleLoadingImage(true)
                }

                if (this._image.autocrop()) {
                    this.redraw();
                }
            }

            if (this._waitForWorkers == 0) {
                this.toggleLoadingImage(false);
            }
        },

        /**
         * Create temporary canvas in image size and extract image data
         * @returns {ImageData}
         */
        getImageData: function() {
            if (!this._image instanceof IMSoftcrop.Image || !this._image.ready) {
                return;
            }

            var body = document.getElementsByTagName('body');
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');

            canvas.style.display = 'none';
            body[0].appendChild(canvas);

            canvas.width = this._image.w;
            canvas.height = this._image.h;
            canvas.style.width = this._image.w + 'px';
            canvas.style.height = this._image.h + 'px';

            ctx.drawImage(
                this._image.image,
                0, 0,
                this._image.w, this._image.h
            );

            var imageData = ctx.getImageData(0, 0, this._image.w, this._image.h);

            // Cleanup references
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
            if (!this._image instanceof IMSoftcrop.Image || !this._image.ready) {
                return;
            }

            var _this = this,
                imageData = this.getImageData();

            this._waitForWorkers++;

            if (window.Worker) {
                // If workers are available, thread detection of faces
                var detectWorker = new Worker(this._detectWorkerUrl);

                detectWorker.postMessage([
                    'details',
                    imageData,
                    this._image.w,
                    this._image.h,
                    this._detectThreshold
                ]);

                detectWorker.onmessage = function(e) {
                    _this.addDetectedDetails(e.data);
                    _this._waitForWorkers--;
                    _this.autocropImages();
                };
            }
            else {
                // Fallback to non threaded
                var data = tracking.Fast.findCorners(
                    tracking.Image.grayscale(
                        imageData.data,
                        this._image.w,
                        this._image.h
                    ),
                    this._image.w,
                    this._image.h,
                    this._detectThreshold
                );

                this.addDetectedDetails(data);
                this._waitForWorkers--;
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
                corners.push({
                    x: data[i],
                    y: data[i + 1]
                });
            }

            this._image.addDetailData(corners);
        },


        /**
         * Detect faces in image
         */
        detectFaces: function () {
            if (!this._image instanceof IMSoftcrop.Image || !this._image.ready) {
                return;
            }

            this._waitForWorkers++;
            var _this = this;

            if (window.Worker) {
                // If workers are available, thread it
                var featureWorker = new Worker(this._detectWorkerUrl);

                featureWorker.postMessage([
                    'features',
                    this.getImageData(),
                    this._image.w,
                    this._image.h,
                    this._detectStepSize
                ]);

                featureWorker.onmessage = function(e) {
                    for(var n = 0; n < e.data.length; n++) {
                        _this.addDetectedFeature(e.data[n]);
                    }
                    _this._waitForWorkers--;
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

                var tracker = new tracking.ObjectTracker(['face']);
                tracker.setStepSize(this._detectStepSize);
                tracker.on('track', function (event) {
                    event.data.forEach(function (rect) {
                        _this.addDetectedFeature(rect);
                    });
                    _this._waitForWorkers--;
                    _this.autocropImages();
                });

                tracking.trackData(tracker, this.getImageData(), this._image.w, this._image.h);
            }
        },

        /**
         * Add a feature point with radius.
         *
         * Heads are important and therefore we naïvely assume features to be faces. Heads
         * are larger so we need to increase rect height about 40% and then move the y point
         * so that the forehead can be covered by the full focus point.
         *
         * Then again. If the face covers more than a certain percent of the image (closeup)
         * we do not want to enlarge the feature point radius that much.
         * @param rect
         */
        addDetectedFeature: function(rect) {
            var imageRadius = 0,
                imagePoint = {
                x: rect.x,
                y: rect.y
            };

            if (rect.width / this._image.w > 0.45) {
                // Feature point (face) takes up a large portion of the image
                rect.height *= 1.2;

                imagePoint.x += rect.width / 2;
                imagePoint.y += rect.height / 2;

                if (rect.height > rect.width) {
                    imageRadius = rect.height / 2;
                }
                else {
                    imageRadius = rect.width / 2;
                }
            }
            else {
                // Feature point (face) takes up less of the image
                rect.height *= 1.4;

                imagePoint.x += rect.width / 2;
                imagePoint.y += rect.height / 4;

                if (rect.height > rect.width) {
                    imageRadius = rect.height / 2;
                }
                else {
                    imageRadius = rect.width / 2;
                }
            }

            this._image.addFocusPoint(imagePoint, imageRadius);
        },

        canvasLineInImage: function(v) {
            return v / this._zoomLevel;
        },

        imageLineInCanvas: function(v) {
            return v * this._zoomLevel;
        },

        imagePointInCanvas: function(x, y) {
            return {
                x: Math.round((x + this._image.x) * this._zoomLevel) + this._margin,
                y: Math.round((y + this._image.y) * this._zoomLevel) + this._margin
            }
        },

        canvasPointInImage: function(x, y) {
            return {
                x: Math.round((x - this._margin) / this._zoomLevel) - this._image.x,
                y: Math.round((y- this._margin) / this._zoomLevel) - this._image.y
            };
        },

        /**
         * Center image around the middle point of the drawing area
         * @param redraw
         */
        centerImage: function (redraw) {
            var cx, cy;

            this._keepCenter = true;
            cx = this._container.clientWidth / 2;
            cy = this._container.clientHeight / 2;

            var ix = ((this._image.w * this._zoomLevel) / 2) + (this._image.x * this._zoomLevel) + this._margin;
            var iy = ((this._image.h * this._zoomLevel) / 2) + (this._image.y * this._zoomLevel) + this._margin;

            var x = (cx == ix) ? 0 : (cx - ix) / this._zoomLevel;
            var y = (cy == iy) ? 0 : (cy - iy) / this._zoomLevel;

            this._image.move({x: x, y: y});

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
                'dblclick',
                function(event) {
                    return _this.onDoubleClick(event);
                }
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

                    // Handle escape key
                    if (keyCode == 27) {
                        _this.onCancel();

                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }

                    // Handle tab key
                    if (keyCode == 9) {
                        var crops = _this._image.getSoftCrops();
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
         * Add onSave callback function
         * @param {function} func
         */
        onSave: function(func) {
            if(typeof func == 'function') {
                this._onSave = func;
                document.getElementById('imc_save').style.display = 'inline';
            }
        },


        /**
         * Add onSave callback function
         * @param {function} func
         */
        onCancel: function(func) {
            if(typeof func == 'function') {
                this._onCancel = func;
                document.getElementById('imc_cancel').style.display = 'inline';
            }
        },


        /**
         * Save image crops
         */
        onButtonSave: function() {
            if (typeof this._onSave != 'function') {
                console.log('User save function not defined');
                return;
            }

            this._onSave(this.getSoftcropData());
        },

        /**
         * Cancel function
         */
        onButtonCancel: function() {
            if (typeof this._onCancel != 'function') {
                console.log('User cancel function not defined');
                return;
            }

            this._onCancel();
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
         * Add focus point
         * @param event
         */
        onDoubleClick: function(event) {
            event.preventDefault();
            event.stopPropagation();

            if (typeof this._image == 'undefined') {
                return false;
            }

            this.toggleLoadingImage(true);

            if(!this._focusPointsToggle.on) {
                this._focusPointsToggle.on = true;
            }

            var point = this.getMousePoint(event);
            this._image.addFocusPoint(
                this.canvasPointInImage(point.x, point.y),
                40
            );

            if (this._image.autocrop()) {
                this.redraw();
                this.toggleLoadingImage(false);
            }

            return false;
        },


        /**
         * On mouse down event handler
         * @param event
         */
        onMouseDown: function (event) {
            var point = this.getMousePoint(event);

            if (this._crop instanceof IMSoftcrop.Softcrop && typeof this.handle === 'string') {
                this._dragPoint = point;
                this._dragObject = this.handle;
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

                if (handle !== false && this.handle != handle) {
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

                    this.handle = handle;
                    return;
                }
                else if (handle === false && this.handle) {
                    this._canvas.style.cursor = 'default';
                    this.handle = undefined;
                    return;
                }
                else if (this.handle) {
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
            var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
            var zoom = 0;

            if (delta < 0 && this._zoomLevel < this._zoomMax) {
                // Zoom in
                zoom = this._zoomLevel < 1 ? 0.01 : 0.03;
            }
            else if (delta > 0 && this._zoomLevel > this._zoomMin) {
                // Zoom out
                zoom = this._zoomLevel < 1 ? -0.01 : -0.03;
            }
            else {
                return;
            }

            // Calculate middle point change for zoom change
            var x = ((this._image.w / 2) + this._image.x) * zoom;
            var y = ((this._image.h / 2) + this._image.y) * zoom;

            // Adjust zoom
            this._zoomLevel += zoom;

            // Then move back to old middle point
            this._image.move({
              x: -x / this._zoomLevel,
              y: -y / this._zoomLevel
            });

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
                    x: ((this._image.w * this._zoomLevel) / 2) + (this._image.x * this._zoomLevel) + this._margin,
                    y: ((this._image.h * this._zoomLevel) / 2) + (this._image.y * this._zoomLevel) + this._margin
                }
            );

            if (typeof this._debugContainer != 'undefined') {
                var str = '<pre>';
                str += 'Zoom level: ' + this._zoomLevel + "\n";

                if (typeof this._image != 'undefined') {
                    str += 'Image w: ' + this._image.w + "\n";
                    str += '      h: ' + this._image.h + "\n";
                    str += "\n";
                    if (typeof this._image.crop != 'undefined') {
                        str += 'Crop  x: ' + this._image.crop.x + "\n";
                        str += '      y: ' + this._image.crop.y + "\n";
                        str += '      w: ' + this._image.crop.w + "\n";
                        str += '      h: ' + this._image.crop.h + "\n";
                    }
                }
                str += '</pre>';

                this._debugContainer.innerHTML = str;
            }
        },


        /**
         * Helper function for drawing a cross mark
         * @param color
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
    };

    return this;
})();
