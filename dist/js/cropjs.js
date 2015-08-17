/**
 * cropjs - Infomaker image auto cropper. (c) Infomaker
 * @author Danne Lundqvist
 * @version v0.0.1
 * @link http://www.infomaker.se
 * @license Unlicense
 */
(function() {
    this.IMCropUI = function(){};

    IMCropUI.Toggle = function(id, onClick) {
        var _id = id;
        var _on = false;
        var _element;
        var _onClick = onClick;
        var _this = this;

        _element = document.getElementById(_id);
        if (!_element) {
            console.log('Element not found: ' + _id);
            return;
        }

        if (_element.classList.contains('on')) {
            _on = true;
        }

        var em = _element.getElementsByTagName('em');
        if (em.length == 1 && em[0].classList.contains('hint')) {
            _element.title = em[0].innerHTML;
        }

        Object.defineProperty(
            this,
            'on',
            {
                get: function() {
                    return _on;
                },
                set: function(value) {
                    _on = value;
                    if (value && !_element.classList.contains('on')) {
                        _element.classList.add('on');
                    }
                    else if (!value && _element.classList.contains('on')) {
                        _element.classList.remove('on');
                    }

                }
            }
        );

        _element.addEventListener(
            'click',
            function(event) {
                this.classList.toggle('on');
                event.preventDefault();
                event.stopPropagation();

                _on = this.classList.contains('on');

                if (typeof _onClick == 'function') {
                    _onClick.call(_this, event);
                }

                return false;
            }
        );
    };

    IMCropUI.Button = function(id, onClick) {
        var _id = id;
        var _element;
        var _onClick = onClick;
        var _this = this;

        _element = document.getElementById(_id);
        if (!_element) {
            console.log('Element not found: ' + _id);
            return;
        }

        _element.addEventListener(
            'click',
            function(event) {
                event.preventDefault();
                event.stopPropagation();

                if (typeof _onClick == 'function') {
                    _onClick.call(_this, event);
                }

                return false;
            }
        );
    };
})();


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
        _crops: [],

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
         */
        addImage: function (url, onImageReady) {
            var _this = this;

            this.toggleLoadingImage(true);
            this.clear();

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
         * @param hRatio
         * @param vRatio
         * @param setAsCurrent
         */
        addSoftcrop: function (hRatio, vRatio, setAsCurrent) {

            // Add uninitialized crop to list of available crops
            this._crops.push({
                id: hRatio + ':' + vRatio,
                hRatio: hRatio,
                vRatio: vRatio,
                setAsCurrent: setAsCurrent
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
                    name: this._image.crops[n].id,
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
                        this._crops[n].hRatio,
                        this._crops[n].vRatio,
                        this._crops[n].setAsCurrent
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
            this._crop = undefined;
            this._image = undefined;
            this._previewContainer.innerHTML = '';
            this.redraw();
        },


        /**
         * Auto crop images
         */
        autocropImages: function() {
            if (this._autocrop) {
                if (!this.toggleLoadingImage()) {
                    this.toggleLoadingImage(true)
                }

                if (this._image.autocrop()) {
                    this.redraw();
                }

                if (this._waitForWorkers == 0) {
                    this.toggleLoadingImage(false);
                }
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
            if (typeof this._onSave != 'function') {
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

(function(IMSoftcrop) {
    IMSoftcrop.Ratio = function(){};

    /**
     * Return ratio in decimal form (height / width)
     * @param width
     * @param height
     * @returns {number}
     */
    IMSoftcrop.Ratio.decimal = function(width, height) {
        return height / width;
    };

    /**
     * Return height based on width and ratio
     * @param width
     * @param ratio
     * @returns {number}
     */
    IMSoftcrop.Ratio.height = function(width, ratio) {
        return Math.round(width * ratio);
    };

    /**
     * Return width based on height and ratio
     * @param height
     * @param ratio
     * @returns {number}
     */
    IMSoftcrop.Ratio.width = function(height, ratio) {
        return Math.round(height / ratio);
    };


    /**
     * Fit crop area into an image area
     * @param imageArea
     * @param cropArea
     * @returns {{x: number, y: number, w: number, h: number}}
     */
    IMSoftcrop.Ratio.fitInto = function(imageArea, cropArea) {
        var cropRatio = IMSoftcrop.Ratio.decimal(cropArea.w, cropArea.h);
        var imageRatio = IMSoftcrop.Ratio.decimal(imageArea.w, imageArea.h);
        var x = 0;
        var y = 0;
        var w = imageArea.w;
        var h = imageArea.h;

        if (cropRatio < imageRatio) {
            // Area fills horizontal but not vertical
            // +-------------+
            // |             |
            // ++-----------++
            // ||   area    ||
            // ++-----------++
            // |             |
            // +-------------+
            h = IMSoftcrop.Ratio.height(w, cropRatio);
            y = (imageArea.h - h) / 2;
        }
        else {
            // Area will fill vertical but not horizontal
            // +---+=====+---+
            // |   |  a  |   |
            // |   |  r  |   |
            // |   |  e  |   |
            // |   |  a  |   |
            // +---+=====+---+

            w = IMSoftcrop.Ratio.width(h, cropRatio);
            x = (imageArea.w - w) / 2;
        }

        return {
            x: x,
            y: y,
            w: w,
            h: h
        };
    };


    /**
     * Fit crop area around an image area
     * @param cropArea
     * @param imageArea
     * @returns {{w: number, h: number}}
     */
    IMSoftcrop.Ratio.fitAround = function(cropArea, imageArea) {
        var cropRatio = IMSoftcrop.Ratio.decimal(cropArea.w, cropArea.h);
        var w = 0;
        var h = 0;

        if (cropRatio == 1) {
            h = w = (imageArea.w > imageArea.h) ? imageArea.w : imageArea.h;
        }
        else if (cropArea.w / imageArea.w > cropArea.h / imageArea.h) {
            // Set crop to area height and expand horizontally based on ratio
            // +---+=====+---+
            // |   |  a  |   |
            // |   |  r  |   |
            // |   |  e  |   |
            // |   |  a  |   |
            // +---+=====+---+
            //   <-------->

            h = imageArea.h;
            w = imageArea.h * (cropArea.w / cropArea.h);
        }
        else {
            // Set area to width and expand vertically based on ratio
            // +------------+
            // |            |  ^
            // ++----------++  |
            // ||   area   ||  |
            // ++----------++  |
            // |            |  v
            // +------------+

            w = imageArea.w;
            h = imageArea.w * (cropArea.h / cropArea.w);
        }

        return {
            w: w,
            h: h
        };
    };

    /**
     * Return true x,y offset of dom element
     * @param e
     * @returns {{x: number, y: number}}
     */
    IMSoftcrop.Ratio.getElementPosition = function(e) {
        var xoffset = 0,
            yoffset = 0;

        while(e) {
            xoffset += (e.offsetLeft - e.scrollLeft + e.clientLeft);
            yoffset += (e.offsetTop - e.scrollTop + e.clientTop);
            e = e.offsetParent;
        }

        return {
            x: xoffset,
            y: yoffset
        };
    };



    /**
     * Calculate a 32 bit FNV-1a hash
     * Found here: https://gist.github.com/vaiorabbit/5657561
     * Ref.: http://isthe.com/chongo/tech/comp/fnv/
     *
     * Used to create unique ids for elements
     *
     * @param {string} str the input value
     * @param {string} [seed] optionally pass the hash of the previous chunk
     * @returns {string}
     */
    IMSoftcrop.Ratio.hashFnv32a = function(str, seed) {
        var i, l,
            hval = (seed === undefined) ? 0x811c9dc5 : seed;

        for (i = 0, l = str.length; i < l; i++) {
            hval ^= str.charCodeAt(i);
            hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
        }

        return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
    };

    /**
     * Get area 1 coverage of area 2
     *
     * @param w1
     * @param h1
     * @param w2
     * @param h2
     */
    IMSoftcrop.Ratio.areaCoverage = function(w1, h1, w2, h2) {
        return Math.round(100 * (w1 * h1) / (w2 * h2));
    };

})(IMSoftcrop);
(function(IMSoftcrop) {
    /**
     * Base object constructor
     * @constructor
     */
    IMSoftcrop.Base = function(){};
    IMSoftcrop.Base.prototype = {};


    /**
     * Shape constructor
     * @constructor
     *
     * @param {string} id
     * @param {object} parent
     */
    IMSoftcrop.Shape = function(id, parent) {
        this.id = id;

        // Get access to canvas helper object
        this.parent = parent;

        var obj = parent;
        do {
            if (obj instanceof IMSoftcrop.Editor) {
                this.editor = obj;
                break;
            }
            obj = obj.parent;
        } while (typeof obj != 'undefined');


        // Get actual canvas and context for drawing
        var canvas = this.editor.getCanvas();
        if (!canvas || canvas.tagName != 'CANVAS') {
            throw new TypeError('Canvas required');
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    };


    /**
     * IMSoftcrop.Shape prototype
     */
    IMSoftcrop.Shape.prototype = Object.create(
        IMSoftcrop.Base.prototype,
        {
            id: {
                writable: true
            },

            //References
            editor: {
                writable: true
            },

            parent: {
                writable: true
            },

            canvas: {
                writable: true
            },

            ctx: {
                writable: true
            },


            //State
            _ready: {
                value: false,
                writable: true
            },

            ready: {
                get: function () {
                    return this._ready;
                },
                set: function (value) {
                    this._ready = (value === true);
                }
            },


            // All position properties
            x: {
                value: 0,
                writable: true
            },

            y: {
                value: 0,
                writable: true
            },

            w: {
                value: 0,
                writable: true
            },

            h: {
                value: 0,
                writable: true
            },

            drawX: {
                value: 0,
                writable: true
            },

            drawY: {
                value: 0,
                writable: true
            },

            drawW: {
                value: 0,
                writable: true
            },

            drawH: {
                value: 0,
                writable: true
            },

            drawXW: {
                value: 0,
                writable: true
            },

            drawYH: {
                value: 0,
                writable: true
            },


            getCanvas: {
                value: function () {
                    return this.canvas;
                }
            },

            inArea: {
                value: function (point) {
                    if (!this.ready) {
                        return false;
                    }

                    return this.inCalculatedArea(
                        point,
                        this.drawX,
                        this.drawY,
                        this.drawW,
                        this.drawH
                    );
                }
            },

            withinCoordinates: {
                value: function (point, x1, y1, x2, y2) {
                    if (point.x < x1 || point.x > x2) {
                        return false;
                    }

                    if (point.y < y1 || point.y > y2) {
                        return false;
                    }

                    return true;
                }
            },

            inCalculatedArea: {
                value: function (point, ax, ay, aw, ah) {
                    if (point.x >= ax && point.x <= ax + aw) {
                        if (point.y >= ay && point.y <= ay + ah) {
                            return true;
                        }
                    }
                    return false;
                }
            },

            move: {
                value: function (point) {
                    this.x += Math.round(point.x);
                    this.y += Math.round(point.y);
                }
            },

            getCoordinates: {
                value: function () {
                    return {
                        x: this.x,
                        y: this.y
                    };
                }
            },

            /**
             * Return crop coordinates and dimensions
             * @returns {{x: *, y: *, w: *, h: *}}
             */
            getDimensions: {
                value: function () {
                    return {
                        x: this.x,
                        y: this.y,
                        w: this.w,
                        h: this.h
                    };
                }
            },

            /**
             * Calcuate actual drawing coordinates and dimensions taking
             * zoom level and factor into account.
             *
             * @param offset
             * @private
             */
            getDimensionsInCanvas: {
                value: function (offset) {
                    if (typeof offset == 'undefined') {
                        offset = {x: 0, y: 0};
                    }

                    var dim = this.editor.getDimensions();
                    var zoomLevel = this.editor.getZoom(true);

                    this.drawW = Math.round(this.w * zoomLevel);
                    this.drawH = Math.round(this.h * zoomLevel);
                    this.drawX = Math.round((this.x + offset.x) * zoomLevel) + dim.margin;
                    this.drawY = Math.round((this.y + offset.y) * zoomLevel) + dim.margin;
                    this.drawXW = this.drawX + this.drawW;
                    this.drawYH = this.drawY + this.drawH;
                }
            }
        }
    );

    // Add constructor
    IMSoftcrop.Shape.prototype.constructor = IMSoftcrop.Shape;
})(IMSoftcrop);
(function(IMSoftcrop) {

    /**
     * Image object constructor
     *
     * @constructor
     *
     * @param {string} id
     * @param {object} parent
     *
     * @extends IMSoftcrop.Shape
     */
    IMSoftcrop.Image = function(id, parent){
        IMSoftcrop.Shape.call(this, id, parent);

        this.crops = [];
        this.focusPoints = [];
    };


    /**
     * IMSoftcrop.Image prototype
     */
    IMSoftcrop.Image.prototype = Object.create(
        Shape.prototype,
        {
            // Image src
            src: {
                value: 'string',
                writable: true
            },

            // Image element
            image: {
                writable: true
            },

            // List of crops for this image
            crops: {
                writable: true
            },

            // Focus points, for example faces
            focusPoints: {
                writable: true
            },

            // Total area needed to include focus points
            focusArea: {
                writable: true
            },

            // Image detail data
            detailData: {
                writable: true
            },

            // Total area needed to include all image details
            detailArea: {
                writable: true
            },

            /**
             * Load image from url and draw
             *
             * @param {string} url
             * @param {function} cbFunc
             */
            load: {
                value: function (url, cbFunc) {
                    var image = document.createElement('img');
                    var _this = this;

                    image.crossOrigin = '*';
                    image.addEventListener(
                        'load',
                        function () {
                            _this.w = this.naturalWidth;
                            _this.h = this.naturalHeight;
                            _this.image = this;

                            _this.ready = true;
                            cbFunc();
                        },
                        false
                    );

                    image.src = url;
                    this.src = url;
                }
            },


            /**
             * Clear image and it's defined crops
             */
            clear: {
                value: function () {
                    for (var n = 0; n < this.crops.length; n++) {
                        this.crops[n] = null;
                    }

                    this.crops = [];
                    this.crop = null;
                    this.image = null;
                }
            },


            /**
             * Add soft crop to this image
             *
             * @param id
             * @param hRatio
             * @param vRatio
             * @param setAsCurrent
             */
            addSoftcrop: {
                value: function (id, hRatio, vRatio, setAsCurrent) {
                    // Make sure there are no duplicates
                    var crop;
                    if (null != (crop = this.getSoftcrop(id))) {
                        return crop;
                    }

                    var area = IMSoftcrop.Ratio.fitInto(
                        {
                            w: this.w,
                            h: this.h
                        },
                        {
                            w: hRatio,
                            h: vRatio
                        }
                    );

                    crop = new IMSoftcrop.Softcrop(id, this, hRatio, vRatio, area, true);
                    this.crops.push(crop);

                    if (setAsCurrent) {
                        this.crop = crop;
                    }

                    return crop;
                }
            },

            /**
             * Return soft crop if it exists
             * @param id
             * @returns {object}
             */
            getSoftcrop: {
                value: function (id) {
                    for (var n = 0; n < this.crops.length; n++) {
                        if (this.crops[n].id == id) {
                            return this.crops[n];
                        }
                    }

                    return null;
                }
            },

            detectionReady: {
                value: function () {
                    return (typeof this.detailArea != 'undefined');
                }
            },

            getSoftCrops: {
                value: function () {
                    return this.crops;
                }
            },


            setActiveCrop: {
                value: function (crop) {
                    this.crop = crop;
                }
            },

            getSrc: {
                value: function () {
                    return this.src;
                }
            },

            /**
             * Add detail/corner data based on image drawing dimensions
             * @param data Pixel data
             */
            addDetailData: {
                value: function (data) {
                    this.detailData = data;

                    // Init structure with first x,y values
                    var detailArea = {
                        point1: {
                            x: data[0].x,
                            y: data[0].y
                        },
                        point2: {
                            x: data[0].x,
                            y: data[0].y
                        }
                    };

                    // Then go through the rest
                    for (var n = 1; n < data.length; n++) {
                        if (data[n].x < detailArea.point1.x) {
                            detailArea.point1.x = data[n].x;
                        }
                        else if (data[n].x > detailArea.point2.x) {
                            detailArea.point2.x = data[n].x;
                        }

                        if (data[n].y < detailArea.point1.y) {
                            detailArea.point1.y = data[n].y;
                        }
                        else if (data[n].y > detailArea.point2.y) {
                            detailArea.point2.y = data[n].y;
                        }
                    }

                    this.detailArea = detailArea;
                    this.constrainArea(this.detailArea);
                }
            },

            /**
             * Add focus point to guide automatic cropping areas
             * @param point
             * @param radius
             */
            addFocusPoint: {
                value: function (point, radius) {
                    point.r = radius; // Add radius to point
                    this.focusPoints.push(point);

                    if (typeof this.focusArea == 'undefined') {
                        // Init focus area
                        this.focusArea = {
                            point1: {
                                x: point.x - radius,
                                y: point.y - radius
                            },
                            point2: {
                                x: point.x + radius,
                                y: point.y + radius
                            }
                        };

                        return;
                    }

                    // Recalculate focus area
                    if (point.x - point.r < this.focusArea.point1.x) {
                        this.focusArea.point1.x = point.x - point.r;
                    }

                    if (point.x + point.r > this.focusArea.point2.x) {
                        this.focusArea.point2.x = point.x + point.r;
                    }

                    if (point.y - point.r < this.focusArea.point1.y) {
                        this.focusArea.point1.y = point.y - point.r;
                    }

                    if (point.y + point.r > this.focusArea.point2.y) {
                        this.focusArea.point2.y = point.y + point.r;
                    }

                    this.constrainArea(this.focusArea);
                }
            },

            /**
             * Consrain an area within image boundaries
             * @param area
             */
            constrainArea: {
                value: function (area) {
                    if (area.point1.x < 0) {
                        area.point1.x = 0;
                    }

                    if (area.point2.x > this.w) {
                        area.point2.x = this.w;
                    }

                    if (area.point1.y < 0) {
                        area.point1.y = 0;
                    }

                    if (area.point2.y > this.h) {
                        area.point2.y = this.h;
                    }
                }
            },

            /**
             * Redraw image
             */
            redraw: {
                value: function (options) {
                    if (!this.ready) {
                        return;
                    }

                    this.getDimensionsInCanvas({x: 0, y: 0});

                    this.ctx.drawImage(
                        this.image,
                        this.drawX,
                        this.drawY,
                        this.drawW,
                        this.drawH
                    );

                    if (typeof options == 'object' && options.focuspoints === true) {
                        this.drawFocusPoints();
                    }

                    if (this.crop instanceof IMSoftcrop.Softcrop) {
                        this.crop.redraw(options);
                    }
                    else {
                        // TODO: Clear surrounding area when no crop is defined
                    }
                }
            },


            /**
             * Draw focus points
             */
            drawFocusPoints: {
                value: function () {
                    // Draw area with detected details/corners
                    if (typeof this.detailArea != 'undefined') {
                        this.drawArea(this.detailArea, 'rgba(255, 121, 255, 0.4)');

                        this.ctx.fillStyle = 'rgba(255, 121, 255, 0.5)';
                        for (var i = 0; i < this.detailData.length; i++) {
                            var pt = this.editor.imagePointInCanvas(
                                this.detailData[i].x, this.detailData[i].y
                            );
                            this.ctx.fillRect(pt.x, pt.y - 3, 6, 6);
                        }
                    }

                    // Draw focus points
                    if (typeof this.focusArea != 'undefined') {
                        this.drawArea(this.focusArea, 'rgba(121, 121, 255, 0.4)');

                        for (var n = 0; n < this.focusPoints.length; n++) {
                            var drawPoint = this.editor.imagePointInCanvas(
                                this.focusPoints[n].x,
                                this.focusPoints[n].y
                            );

                            var drawRadius = this.editor.imageLineInCanvas(this.focusPoints[n].r);

                            this.ctx.beginPath();
                            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                            this.ctx.lineWidth = 1;

                            this.ctx.arc(drawPoint.x, drawPoint.y, drawRadius, 0, 2 * Math.PI, true);
                            this.ctx.fill();
                            this.ctx.closePath();
                        }
                    }
                }
            },

            /**
             * Draw area with specified color
             * @param area
             * @param color
             */
            drawArea: {
                value: function (area, color) {
                    var point1 = this.editor.imagePointInCanvas(area.point1.x, area.point1.y),
                        point2 = this.editor.imagePointInCanvas(area.point2.x, area.point2.y);

                    this.ctx.strokeStyle = color;
                    this.ctx.lineWidth = 4;
                    this.ctx.strokeRect(
                        point1.x + 2,
                        point1.y + 2,
                        point2.x - point1.x - 4,
                        point2.y - point1.y - 4
                    );
                }
            },

            /**
             * Automatically alter crop(s) to fit around interesting areas
             * @param [crop]
             * @returns boolean
             */
            autocrop: {
                value: function (crop) {
                    if (!this.detectionReady()) {
                        return false;
                    }

                    var crops = (typeof crop != 'undefined') ? new Array(crop) : this.crops;

                    for (var n = 0; n < crops.length; n++) {
                        this.autoCropCrop(crops[n]);
                    }

                    return true;
                }
            },

            /**
             * Resize crop to best fit around interesting areas
             * @param crop
             */
            autoCropCrop: {
                value: function (crop) {
                    var detailArea = this.detailArea;
                    var focusArea = (typeof this.focusArea != 'undefined') ? this.focusArea : this.detailArea;

                    // Calculate full detail + focus area
                    var x1 = (detailArea.point1.x < focusArea.point1.x)
                        ? detailArea.point1.x
                        : focusArea.point1.x;

                    var x2 = (detailArea.point2.x > focusArea.point2.x)
                        ? detailArea.point2.x
                        : focusArea.point2.x;

                    var y1 = (detailArea.point1.y < focusArea.point1.x)
                        ? detailArea.point1.y
                        : focusArea.point1.y;

                    var y2 = (detailArea.point2.y > focusArea.point2.y)
                        ? detailArea.point2.y
                        : focusArea.point2.y;

                    var area = {
                        point1: {
                            x: (x1 > 0) ? x1 : 0,
                            y: (y1 > 0) ? y1 : 0
                        },
                        point2: {
                            x: (x2 < this.w) ? x2 : this.w,
                            y: (y2 < this.h) ? y2 : this.h
                        }
                    };


                    // Fit crop around full detail area as best as possible while
                    // making sure not to go outside image area.
                    var newDim = IMSoftcrop.Ratio.fitAround(
                        {w: crop.ratio.w, h: crop.ratio.h},
                        {w: area.point2.x - area.point1.x, h: area.point2.y - area.point1.y}
                    );

                    if (newDim.w <= this.w && newDim.h <= this.h) {
                        // Perfect, we can set both width and height
                        crop.w = newDim.w;
                        crop.h = newDim.h;
                    }
                    else if (newDim.w > this.w) {
                        // Width is too big, set to image width and recalculate height of crop
                        crop.w = this.w;
                        crop.h = IMSoftcrop.Ratio.height(this.w, crop.ratio.f);
                        crop.autoCropWarning = true;
                    }
                    else if (newDim.h > this.h) {
                        // Height is too big, set to image height and recalculate width of crop
                        crop.h = this.h;
                        crop.w = IMSoftcrop.Ratio.width(this.h, crop.ratio.f);
                        crop.autoCropWarning = true;
                    }
                    else {
                        // Too wide and too high
                        console.log('Too wide and too high, how?!? Ignoring!');
                        crop.autoCropWarning = true;
                    }


                    // Center crop over area while making sure it's not outside image boundaries.
                    var areaCenter = {
                            x: area.point1.x + ((area.point2.x - area.point1.x) / 2),
                            y: area.point1.y + ((area.point2.y - area.point1.y) / 2)
                        },
                        focusCenter = {
                            x: focusArea.point1.x + ((focusArea.point2.x - focusArea.point1.x) / 2),
                            y: focusArea.point1.y + ((focusArea.point2.y - focusArea.point1.y) / 2)
                        },
                        cropCenter = {
                            x: crop.x + (crop.w / 2),
                            y: crop.y + (crop.h / 2)
                        },
                        xoffset = areaCenter.x - cropCenter.x,
                        yoffset = areaCenter.y - cropCenter.y;


                    // Full detail area not covered, adjust focus leaning toward focus center.
                    // Make sure we don't move outside full detail area.
                    if (crop.autoCropWarning) {
                        var yoffset2 = focusCenter.y - cropCenter.y;
                        if (crop.y + yoffset2 < area.point1.y) {
                            yoffset = area.point1.y - crop.y;
                        }
                        else if (crop.y + crop.h + yoffset2 > area.point2.y) {
                            // Move crop upwards
                            yoffset = area.point2.y - crop.h - crop.y;
                        }
                        else {
                            yoffset = yoffset2;
                        }

                        var xoffset2 = focusCenter.x - cropCenter.x;
                        if (crop.x + xoffset2 < area.point1.x) {
                            xoffset = area.point1.x - crop.x;
                        }
                        else if (crop.x + crop.w + xoffset2 > area.point2.x) {
                            // Move crop to the left
                            xoffset = area.point2.x - crop.w - crop.x;
                        }
                        else {
                            xoffset = xoffset2;
                        }

                        // If we completely cover focus area and at least 80%
                        // of the detail area is covered, be bold and remove warning.
                        if (crop.w >= focusArea.point2.x - focusArea.point1.x &&
                            crop.h >= focusArea.point2.y - focusArea.point1.y &&
                            0.8 <= crop.w / (area.point2.x - area.point1.x) &&
                            0.8 <= crop.h / (area.point2.y - area.point1.y)) {
                            crop.autoCropWarning = false;
                        }

                    }

                    // Actually move the crop
                    if (crop.x + xoffset < 0) {
                        crop.x = 0;
                    }
                    else if (crop.x + xoffset + crop.w > this.w) {
                        crop.x = this.w - crop.w;
                    }
                    else {
                        crop.x += xoffset;
                    }

                    if (crop.y + yoffset < 0) {
                        crop.y = 0;
                    }
                    else if (crop.y + yoffset + crop.h > this.h) {
                        crop.y = this.h - crop.h;
                    }
                    else {
                        crop.y += yoffset;
                    }
                }
            }
        }
    );


})(IMSoftcrop);
(function(IMSoftcrop) {
    /**
     * Soft crop constructor
     *
     * @constructor
     *
     * @param {string} id
     * @param {object} parent
     * @param {int} hRatio
     * @param {int} vRatio
     * @param {object} area
     * @param {boolean} respectRatio
     *
     * @extends IMSoftcrop.Shape
     */
    IMSoftcrop.Softcrop = function (id, parent, hRatio, vRatio, area, respectRatio) {
        // Call super constructor
        IMSoftcrop.Shape.call(this, id, parent);

        this.x = area.x;
        this.y = area.y;
        this.w = area.w;
        this.h = area.h;

        this.respectRatio = respectRatio;
        this.ratio = {
            w: hRatio,
            h: vRatio,
            f: IMSoftcrop.Ratio.decimal(hRatio, vRatio)
        };

        this.handles = {
            nw: [0, 0, 0],
            n: [0, 0, 0],
            ne: [0, 0, 0],
            e: [0, 0, 0],
            se: [0, 0, 0],
            s: [0, 0, 0],
            sw: [0, 0, 0],
            w: [0, 0, 0]
        };

        this.ready = true;
    };

    /**
     * IMSoftcrop.Softcrop prototype
     */
    IMSoftcrop.Softcrop.prototype = Object.create(
        Shape.prototype,
        {
            lineWidth: {
                value: 1
            },

            lineColor: {
                value: 'rgba(255, 255, 255, 1)'
            },

            lineColorActive: {
                value: 'rgba(0, 255, 255, 1)'
            },

            handleThickness: {
                value: 3
            },

            handleLength: {
                value: 14
            },

            // Drawing positions of handles
            handles: {
                writable: true
            },

            // Focused handle
            handle: {
                writable: true
            },

            // Ratio handling
            ratio: {
                writable: true
            },

            // Respect ratio or not
            respectRatio: {
                value: true,
                writable: true
            },

            // Warning for possible bad cropping
            autoCropWarning: {
                value: false,
                writable: true
            },

            locked: {
                value: false,
                writable: true
            },




            /**
             * Drag a handle
             *
             * @fixme Must enforce dimensions throught any drag events
             *
             * @param handle
             * @param point
             */
            dragHandle: {
                value: function (handle, point) {
                    if (typeof this.handle != 'string') {
                        return;
                    }

                    var i = this.parent.getDimensions();
                    var x = this.x;
                    var y = this.y;
                    var w = this.w;
                    var h = this.h;

                    switch (handle) {
                        case 'n':
                            y += point.y;
                            h -= point.y;
                            w = IMSoftcrop.Ratio.width(h, this.ratio.f);
                            x += IMSoftcrop.Ratio.width((point.y / 2), this.ratio.f);
                            break;

                        case 'e':
                            w += point.x;
                            h = IMSoftcrop.Ratio.height(w, this.ratio.f);
                            y -= IMSoftcrop.Ratio.height((point.x / 2), this.ratio.f);
                            break;

                        case 's':
                            h += point.y;
                            w = IMSoftcrop.Ratio.width(h, this.ratio.f);
                            x -= IMSoftcrop.Ratio.width((point.y / 2), this.ratio.f);
                            break;

                        case 'w':
                            w -= point.x;
                            x += point.x;
                            h = IMSoftcrop.Ratio.height(w, this.ratio.f);
                            y += IMSoftcrop.Ratio.height((point.x / 2), this.ratio.f);
                            break;

                        case 'nw':
                            if (Math.abs(point.x) > Math.abs(point.y)) {
                                w -= point.x;
                                x += point.x;
                                h -= IMSoftcrop.Ratio.height(point.x, this.ratio.f);
                                y += IMSoftcrop.Ratio.height(point.x, this.ratio.f);
                            }
                            else {
                                h -= point.y;
                                y += point.y;
                                w -= IMSoftcrop.Ratio.width(point.y, this.ratio.f);
                                x += IMSoftcrop.Ratio.width(point.y, this.ratio.f);
                            }
                            break;

                        case 'ne':
                            if (Math.abs(point.x) > Math.abs(point.y)) {
                                w += point.x;
                                h += IMSoftcrop.Ratio.height(point.x, this.ratio.f);
                                y -= IMSoftcrop.Ratio.height(point.x, this.ratio.f);

                            }
                            else {
                                w -= IMSoftcrop.Ratio.width(point.y, this.ratio.f);
                                h -= point.y;
                                y += point.y;
                            }
                            break;

                        case 'se':
                            if (Math.abs(point.x) > Math.abs(point.y)) {
                                w += point.x;
                                h += IMSoftcrop.Ratio.height(point.x, this.ratio.f);
                            }
                            else {
                                h += point.y;
                                w += IMSoftcrop.Ratio.width(point.y, this.ratio.f);
                            }
                            break;

                        case 'sw':
                            if (Math.abs(point.x) > Math.abs(point.y)) {
                                w -= point.x;
                                x += point.x;
                                h -= IMSoftcrop.Ratio.height(point.x, this.ratio.f);
                            }
                            else {
                                w += IMSoftcrop.Ratio.width(point.y, this.ratio.f);
                                x -= IMSoftcrop.Ratio.width(point.y, this.ratio.f);
                                h += point.y;
                            }
                            break;

                    }

                    // Stop reversing of dimensions
                    if (h < 40 || w < 40) {
                        return;
                    }

                    // Enforce width/height and top/left boundaries
                    if (w > i.w || h > i.h) {
                        return;
                    }

                    // Enforce bottom/right boundaries
                    if (x + w > i.w || y + h > i.h) {
                        return;
                    }

                    if (x < 0) {
                        x = 0;
                    }

                    if (y < 0) {
                        y = 0;
                    }


                    this.x = Math.round(x);
                    this.y = Math.round(y);
                    this.w = Math.round(w);
                    this.h = Math.round(h);
                }
            },


            /**
             * Move crop area
             *
             * @param point
             */
            move: {
                value: function (point) {
                    var i = this.parent.getDimensions();

                    if (this.x + point.x < 0) {
                        this.x = 0;
                        point.x = 0;
                    }

                    if (this.y + point.y < 0) {
                        point.y = 0;
                        this.y = 0;
                    }

                    if (this.w + this.x + Math.round(point.x) > i.w) {
                        point.x = i.w - this.w;
                        return;
                    }

                    if (this.h + this.y + Math.round(point.y) > i.h) {
                        point.y = i.h - this.h;
                        return;
                    }


                    IMSoftcrop.Shape.prototype.move.call(this, point);
                }
            },


            /**
             * Return handle name if mouse hover over it
             *
             * @param point
             * @returns {*}
             */
            overHandle: {
                value: function (point) {
                    var handle = '';
                    var vDir = this.overVerticalArea(point);
                    var hDir = this.overHorizontalArea(point);

                    if ((hDir || vDir) && (!hDir || !vDir)) {
                        handle = '';
                    }
                    else if (hDir == vDir) {
                        handle = '';
                    }
                    else {
                        handle = hDir + vDir;
                        handle = handle.replace('m', '');
                    }


                    if (handle === '') {
                        this.handle = false;
                    }
                    else {
                        this.handle = handle;
                    }

                    return this.handle;
                }
            },


            /**
             * Find out if and if so which horizontal area mouse is over
             * @param point
             * @returns {string}
             * @private
             */
            overHorizontalArea: {
                value: function (point) {
                    var left = this.drawX - this.handleThickness;
                    var right = this.drawX + this.drawW + this.handleThickness;

                    if (this.withinCoordinates(
                            point,
                            left, this.drawY + this.drawH - this.handleLength + this.handleThickness,
                            right, this.drawY + this.drawH + this.handleThickness)) {
                        // Is in southern area
                        return 's';
                    }
                    else if (this.withinCoordinates(
                            point,
                            left, this.drawY + (this.drawH / 2) - this.handleLength,
                            right, this.drawY + (this.drawH / 2) + this.handleLength)) {
                        // Is in middle area
                        return 'm';
                    }
                    else if (this.withinCoordinates(
                            point,
                            left, this.drawY - this.handleThickness,
                            right, this.drawY + this.handleLength)) {
                        // Is in northern area
                        return 'n';
                    }

                    return '';
                }
            },

            /**
             * Find out if and if so which vertical area mouse is over
             * @param point
             * @returns {string}
             * @private
             */
            overVerticalArea: {
                value: function (point) {
                    var top = this.drawY - this.handleThickness;
                    var bottom = this.drawY + this.drawH + this.handleThickness;

                    if (this.withinCoordinates(
                            point,
                            this.drawX + this.drawW - this.handleLength, top,
                            this.drawX + this.drawW + this.handleThickness, bottom)) {
                        // Is in western drag area
                        return 'e';
                    }
                    else if (this.withinCoordinates(
                            point,
                            this.drawX + (this.drawW / 2) - this.handleLength, top,
                            this.drawX + (this.drawW / 2) + this.handleLength, bottom)) {
                        // Is in western drag area
                        return 'm';
                    }
                    else if (this.withinCoordinates(
                            point,
                            this.drawX - this.handleThickness, top,
                            this.drawX + this.handleLength, bottom)) {
                        // Is in western drag area
                        return 'w';
                    }

                    return '';
                }
            },


            /**
             * Redraw image
             * @param options
             */
            redraw: {
                value: function (options) {
                    if (!this.ready) {
                        return;
                    }

                    this.getDimensionsInCanvas(this.parent.getCoordinates());

                    // Draw area outside crop
                    this.drawCropMargins();

                    // Draw crop handles
                    var doubleLength = this.handleLength * 2;

                    this.ctx.beginPath();
                    this.drawHandle('nw', false, this.drawX, this.drawY, this.handleLength, this.handleThickness);
                    this.drawHandle('se', false, this.drawXW, this.drawYH, this.handleLength, this.handleThickness);
                    this.drawHandle('ne', false, this.drawXW, this.drawY, this.handleLength, this.handleThickness);
                    this.drawHandle('sw', false, this.drawX, this.drawYH, this.handleLength, this.handleThickness);

                    var halfDrawWidth = this.drawW / 2;
                    var halfDrawHeight = this.drawH / 2;
                    this.drawHandle('n', false, this.drawX + halfDrawWidth, this.drawY, doubleLength, this.handleThickness);
                    this.drawHandle('e', false, this.drawXW, this.drawY + halfDrawHeight, doubleLength, this.handleThickness);
                    this.drawHandle('s', false, this.drawX + halfDrawWidth, this.drawYH, doubleLength, this.handleThickness);
                    this.drawHandle('w', false, this.drawX, this.drawY + halfDrawHeight, doubleLength, this.handleThickness);
                    this.ctx.stroke();
                    this.ctx.closePath();

                    // Draw border
                    this.drawCropBorder();

                    // Draw guidelines inside crop
                    if (typeof options == 'object' && options.guides === true) {
                        this.drawCropGuidelines();
                    }
                }
            },


            /**
             * Draw guide lines inside crop
             *
             * @private
             */
            drawCropGuidelines: {
                value: function () {
                    this.ctx.closePath();
                    this.ctx.beginPath();

                    if (this.ctx.setLineDash) {
                        this.ctx.setLineDash([3, 3]);
                    }
                    this.ctx.strokeStyle = 'rgba(55, 55, 55, 0.5)';
                    this.ctx.lineWidth = 1;

                    var stepY = this.drawH / 3,
                        stepX = this.drawW / 3;

                    // Horizontal line 1
                    this.ctx.moveTo(this.drawX, this.drawY + stepY);
                    this.ctx.lineTo(this.drawX + this.drawW, this.drawY + stepY);

                    // Horizontal line 2
                    this.ctx.moveTo(this.drawX, this.drawY + stepY + stepY);
                    this.ctx.lineTo(this.drawX + this.drawW, this.drawY + stepY + stepY);

                    // Vertical line 1
                    this.ctx.moveTo(this.drawX + stepX, this.drawY);
                    this.ctx.lineTo(this.drawX + stepX, this.drawY + this.drawH);

                    // Horizontal line 2
                    this.ctx.moveTo(this.drawX + stepX + stepX, this.drawY);
                    this.ctx.lineTo(this.drawX + stepX + stepX, this.drawY + this.drawH);

                    this.ctx.stroke();

                    if (this.ctx.setLineDash) {
                        this.ctx.setLineDash([]);
                    }

                    this.ctx.closePath();
                }
            },


            /**
             * Draw crop border
             *
             * @private
             */
            drawCropBorder: {
                value: function () {
                    this.ctx.beginPath();

                    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                    this.ctx.lineWidth = 1;
                    this.ctx.rect(
                        this.drawX - 0.5,
                        this.drawY - 0.5,
                        this.drawW + 1,
                        this.drawH + 1
                    );

                    this.ctx.stroke();
                    this.ctx.closePath();
                }
            },


            /**
             * Draw dark areas outside crop area
             *
             * @private
             */
            drawCropMargins: {
                value: function () {
                    this.ctx.beginPath();
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

                    this.ctx.rect(
                        0,
                        0,
                        this.canvas.width,
                        this.drawY
                    );

                    this.ctx.rect(
                        0,
                        0,
                        this.drawX,
                        this.canvas.height
                    );

                    this.ctx.rect(
                        this.drawX,
                        this.drawYH,
                        this.canvas.width,
                        this.canvas.height
                    );

                    this.ctx.rect(
                        this.drawXW,
                        this.drawY,
                        this.canvas.width,
                        this.drawH
                    );

                    this.ctx.fill();
                    this.ctx.closePath();
                }
            },


            /**
             * Draw crop area handle
             * @param name
             * @param active
             * @param x
             * @param y
             * @param length
             * @param thickness
             *
             * @protected
             */
            drawHandle: {
                value: function (name, active, x, y, length, thickness) {
                    var wOffset = thickness / 2;
                    var lOffset = length / 2;

                    this.ctx.lineWidth = thickness;
                    this.ctx.strokeStyle = !active ? this.lineColor : this.lineColorActive;


                    //noinspection FallThroughInSwitchStatementJS
                    switch (name) {
                        case 'se':
                            // Just mirror values and fall through to nw
                            wOffset = wOffset * -1;
                            length = length * -1;

                        case 'nw':
                            this.ctx.moveTo(x - wOffset, y + length);
                            this.ctx.lineTo(x - wOffset, y - wOffset);
                            this.ctx.lineTo(x + length, y - wOffset);

                            this.handles[name] = [x, y, thickness, length];
                            break;

                        case 'sw':
                            // Just mirror values and fall through to ne
                            wOffset = wOffset * -1;
                            length = length * -1;

                        case 'ne':
                            this.ctx.moveTo(x - length, y - wOffset);
                            this.ctx.lineTo(x + wOffset, y - wOffset);
                            this.ctx.lineTo(x + wOffset, y + length);

                            this.handles[name] = [x, y, thickness, length];
                            break;

                        case 'n':
                            this.ctx.moveTo(x - lOffset, y - wOffset);
                            this.ctx.lineTo(x + lOffset, y - wOffset);
                            break;

                        case 's':
                            this.ctx.moveTo(x - lOffset, y + wOffset);
                            this.ctx.lineTo(x + lOffset, y + wOffset);
                            break;

                        case 'w':
                            this.ctx.moveTo(x - wOffset, y + lOffset);
                            this.ctx.lineTo(x - wOffset, y - lOffset);
                            break;

                        case 'e':
                            this.ctx.moveTo(x + wOffset, y + lOffset);
                            this.ctx.lineTo(x + wOffset, y - lOffset);
                            break;
                    }
                }
            }
        }
    );

    // Add constructor
    IMSoftcrop.Softcrop.prototype.constructor = IMSoftcrop.Softcrop;
})(IMSoftcrop);