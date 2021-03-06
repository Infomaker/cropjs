var IMSoftcrop = (function() {
    var IMSoftcrop = {};

    // Event handler collection for add and remove with references
    var handlers = {}

    /**
     * Editor constructor
     * @constructor
     *
     * @param {string} id
     * @param {object} [options]
     */
    IMSoftcrop.Editor = function(id, options) {
        this._id = id;
        this._crops = [];
        handlers = {
            'onKeyDown': this.onKeyDown.bind(this),
            'onResize': this.onResize.bind(this),
            'onDoubleClick': this.onDoubleClick.bind(this),
            'onMouseMove': this.onMouseMove.bind(this),
            'onMouseUp': this.onMouseUp.bind(this),
            'onMouseDown': this.onMouseDown.bind(this),
            'onMouseWheel': this.onMouseWheel.bind(this),
        }

        if (typeof options == 'object') {
            if (options.debug === true) {
                this._debug = true;
            }
        }

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
                if (this._debug) {
                    this._debugContainer = options.debugElement;
                }
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
            function() {
                if (_this._crop instanceof IMSoftcrop.Softcrop) {
                    _this._crop.locked = this.on;
                    _this._renderUpdatedPreview(_this._crop);
                }
            }
        );

        // Mark crop as usable
        this._cropUsableToggle = new IMCropUI.Toggle(
            'imc_cropusable',
            function() {
                if (_this._crop instanceof IMSoftcrop.Softcrop) {
                    _this._crop.usable = this.on;
                    _this._renderUpdatedPreview(_this._crop);
                }
            }
        );

        // Draw guides toggle
        this._guidesToggle = new IMCropUI.Toggle(
            'imc_guides',
            function() {
                _this.redraw();
            }
        );

        // Draw focuspoints toggle
        this._focusPointsToggle = new IMCropUI.Toggle(
            'imc_focuspoints',
            function() {
                _this.redraw();
            }
        );
    };

    IMSoftcrop.Editor.prototype = {

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

        // Currently displayed info (crop || image)
        info: 'image',

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

        // IMCropUI.Toggle for marking crops as usable
        _cropUsableToggle: undefined,

        // Use focus point instead of handles
        _useFocusPoint: false,

        useFocusPoint: function() {
            return this._useFocusPoint;
        },


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
        setupUI: function() {
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

            var debugClass = (this._debug) ? 'imc_debug' : '';

            injectElement.innerHTML =
                '<div id="imc" class="' + debugClass + '">' +
                    '<div id="imc_container">' +
                        '<canvas id="imc_canvas"></canvas>' +

                        '<div id="imc_work_container">' +
                            '<div id="imc_preview_container" class="imc_preview_container"></div>' +
                        '</div>' +


                        '<div id="imc_image_inline">' +
                            '<div class="imc_debug_group">' +
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

                                '<a href="#" id="imc_croplocked" class="toggle">' +
                                    '<em class="hint">Låst till användare</em>' +
                                    '<span>' +
                                        '<span class="on"><i class="fa fa-lock"></i></span>' +
                                        '<span class="off"><i class="fa fa-unlock"></i></span>' +
                                    '</span>' +
                                '</a>' +

                                '<a href="#" id="imc_cropusable" class="toggle">' +
                                    '<em class="hint">Använd denna crop</em>' +
                                    '<span>' +
                                        '<span class="on"><i class="fa fa-check"></i></span>' +
                                        '<span class="off"><i class="fa fa-ban"></i></span>' +
                                    '</span>' +
                                '</a>' +

                            '</div>' +

                            '<div id="imc_image_info" class="display"></div>' +

                            '<div id="imc_loading">' +
                                '<i class="fa fa-cog fa-spin"></i>' +
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

            for (var x = 0;x < vendors.length && !window.requestAnimationFrame;++x) {
                window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
                window.cancelAnimationFrame =
                    window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
            }

            if (!window.requestAnimationFrame) {
                window.requestAnimationFrame = function(callback, element) {
                    var currTime = new Date().getTime();
                    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                    var id = window.setTimeout(function() {
                        callback(currTime + timeToCall);
                    }, timeToCall);

                    lastTime = currTime + timeToCall;
                    return id;
                };
            }

            if (!window.cancelAnimationFrame) {
                window.cancelAnimationFrame = function(id) {
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
            this.calculateViewport();
            this._redrawCanvas = false;

            //this.adjustForPixelRatio();


            // Clear drawing area so transparency works
            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

            // Redraw current image
            if (this._image instanceof IMSoftcrop.Image) {
                var useFocusPoint = this.useFocusPoint()
                this._image.redraw({
                    guides: this._guidesToggle.on && !useFocusPoint,
                    focuspoints: this._focusPointsToggle.on,
                    focusPointMarker: useFocusPoint
                });

                // Redraw all crop previews
                var softcrops = this._image.getSoftCrops();
                for (var n = 0;n < softcrops.length;n++) {
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
        redraw: function() {
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
        _renderNewCropPreview: function(crop, setAsCurrent) {
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
                function() {
                    _this.setActiveCrop(crop);
                }
            );

            // Create inner container element
            var pvDivInner = document.createElement('div');
            pvDivInner.classList.add('imc_preview_image');

            var previewHeight = 90; // Dummy default, will be overriden in _renderUpdatedPreview
            var previewWidth = IMSoftcrop.Ratio.width(previewHeight, crop.ratio.f);
            pvDivInner.style.width = IMSoftcrop.Ratio.width(previewHeight, crop.ratio.f) + 'px';

            // Create span (title) element, including warning element
            var cropWrapper = document.createElement('span');
            cropWrapper.classList.add('crop-ratio-wrapper')

            var ratioText = document.createElement('span');
            ratioText.classList.add('crop-ratio-text');

            var pvWarning = document.createElement('i');
            pvWarning.className = 'fa fa-warning';

            var icon = document.createElement('span');

            var pvUsedCrop = crop;
            icon.className = 'fa fa-check';
            icon.classList.add('crop-ratio-icon')
            icon.addEventListener(
                'click',
                function(e) {
                    _this.toggleCropUsable(pvUsedCrop)
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            )

            ratioText.appendChild(document.createTextNode(crop.id))
            cropWrapper.appendChild(ratioText);
            cropWrapper.appendChild(icon);
            cropWrapper.appendChild(pvWarning);

            // Create image element
            var pvImg = new Image();
            pvImg.onload = function() {
                pvDivInner.classList.add('loaded');
            }
            pvImg.src = this._image.src;

            // Put it together
            pvDivInner.appendChild(pvImg);
            pvDivInner.appendChild(cropWrapper);
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
        _renderUpdatedPreview: function(crop) {
            var pvDiv = document.getElementById(this._image.id + '_' + crop.id);
            if (pvDiv == null || typeof pvDiv != 'object') {
                return;
            }

            var pvDivInner = pvDiv.getElementsByTagName('DIV')[0]
            var pvImg = pvDiv.getElementsByTagName('IMG')[0];
            var previewHeight = window.getComputedStyle(pvDivInner).height.slice(0, -2)
            var imgDim = this._image.getDimensions();

            var previewWidth = IMSoftcrop.Ratio.width(previewHeight, crop.ratio.f);
            pvDivInner.style.width = previewWidth + 'px';

            var cropDim = crop.getDimensions();
            var cropRatio = previewWidth / cropDim.w;

            pvImg.style.height = imgDim.h * cropRatio + 'px';
            pvImg.style.marginTop = '-' + cropDim.y * cropRatio + 'px';
            pvImg.style.marginLeft = '-' + cropDim.x * cropRatio + 'px';

            if (crop.autoCropWarning == true) {
                pvDiv.classList.add('warning');
            }
            else {
                pvDiv.classList.remove('warning');
            }

            if (crop.usable == true) {
                pvDiv.classList.add('usable');
                pvDiv.classList.remove('unusable');
            }
            else {
                pvDiv.classList.add('unusable');
                pvDiv.classList.remove('usable');
            }
        },

        /**
         * Get dimensions
         * @returns {{margin: number, width: number, height: number}}
         */
        getDimensions: function() {
            return {
                margin: this._margin,
                width: this._canvas.width,
                height: this._canvas.height
            };
        },

        updateImageInfo: function(useCrop) {
            var dim,
                w,
                h,
                className = (useCrop) ? 'crop' : 'image';
            var e = document.getElementById('imc_image_info');

            if (!e) {
                return;
            }


            if (useCrop) {
                if (this._crop instanceof IMSoftcrop.Softcrop == false) {
                    return;
                }
                dim = this._crop.getDimensions();
            }
            else {
                if (this._image instanceof IMSoftcrop.Image == false) {
                    return;
                }
                dim = this._image.getDimensions();
            }

            w = Math.round(dim.w);
            h = Math.round(dim.h);

            if (this.info == className) {
                e.innerHTML = w + 'x' + h;
                return;
            }

            this.info = className;
            e.className = '';
            setTimeout(function() {
                e.innerHTML = w + 'x' + h;
                e.className = 'display ' + className;
            }, 200);

        },

        /**
         * Adjust canvas for pixel ratio
         * @param canvas
         */
        adjustForPixelRatio: function(canvas) {
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
        addImage: function(url, onImageReady, applyAutocrop) {
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
                function() {
                    _this.setZoomToImage(false);
                    _this.centerImage(false);
                    _this.updateImageInfo(false);

                    if (_this._autocrop && _this._detectWorkerUrl) {
                        _this.detectDetails();
                        _this.detectFaces();
                    }

                    _this.toggleLoadingImage(false);

                    _this.applySoftcrops();
                    _this.redraw();

                    if (typeof onImageReady === 'function') {
                        onImageReady.call(_this, _this._image);
                    }
                }
            );
        },


        /**
         * Add soft crop to available soft crops. If x/y is set, the crop will
         * be set to the actual dimensions specified by w/h. If no x/y values are
         * set the w/h will be treated as ratio dimensions and be scaled.
         *
         * @param id
         * @param hRatio
         * @param vRatio
         * @param setAsCurrent
         * @param x Optional
         * @param y Optional
         * @parmam usable Optional
         */
        addSoftcrop: function(id, setAsCurrent, hRatio, vRatio, x, y, usable) {
            var exact = false;

            // Make sure all values are numbers
            hRatio = parseFloat(hRatio);
            vRatio = parseFloat(vRatio);

            if (typeof x == 'undefined' || typeof y == 'undefined' || x === null || y === null) {
                x = null;
                y = null;
            }
            else {
                x = parseInt(x);
                y = parseInt(y);
                exact = true;
            }

            usable = (typeof usable === 'undefined') ? true : usable;

            // Add uninitialized crop to list of available crops
            this._crops.push({
                id: id,
                setAsCurrent: (this._crops.length == 0 || setAsCurrent),
                hRatio: hRatio,
                vRatio: vRatio,
                x: x,
                y: y,
                exact: exact,
                usable: usable ? true : false
            });

            if (this._image instanceof IMSoftcrop.Image && this._image.ready) {
                this.applySoftcrops();
            }
        },

        setUseFocusPoint: function(useFocusPoint) {
            this._useFocusPoint = Boolean(useFocusPoint);

            if (this._useFocusPoint) {
                this._image.addFocusPoint({
                    x: this._image.w / 2,
                    y: this._image.h / 2
                });
            } else {
                this._image.removeFocusPoint();
            }

            this.handle = undefined;
            this._image.adjustCropsToFocusPoint();

            this.redraw();
        },

        setFocusPoint: function(focusPoint) {
            this._useFocusPoint = true;

            if (focusPoint) {

                this._image.addFocusPoint(focusPoint);
                this._image.adjustCropsToFocusPoint();
            }

            this.redraw();
        },

        getFocusPoint: function() {
            return this._useFocusPoint ?
                this._image.getFocusPoint() :
                null
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

            for (var n = 0;n < this._image.crops.length;n++) {
                data.crops.push({
                    id: this._image.crops[n].id,
                    x: Math.round(this._image.crops[n].x),
                    y: Math.round(this._image.crops[n].y),
                    width: Math.round(this._image.crops[n].w),
                    height: Math.round(this._image.crops[n].h),
                    usable: this._image.crops[n].usable
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
            for (var n = 0;n < this._crops.length;n++) {
                var crop = this._image.getSoftcrop(this._crops[n].id);

                if (crop == null) {
                    var crop = this._image.addSoftcrop(
                        this._crops[n].id,
                        this._crops[n].setAsCurrent,
                        this._crops[n].hRatio,
                        this._crops[n].vRatio,
                        this._crops[n].x,
                        this._crops[n].y,
                        this._crops[n].exact,
                        this._crops[n].usable
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
        setActiveCrop: function(crop) {
            if (crop instanceof IMSoftcrop.Softcrop !== true) {
                return;
            }

            var div = document.getElementById(this._image.id + '_' + crop.id);
            var divs = this._previewContainer.getElementsByClassName('imc_preview_image_container');
            for (var n = 0;n < divs.length;n++) {
                divs[n].classList.remove('active');
            }

            div.classList.add('active');

            this._crop = crop;
            this._image.setActiveCrop(crop);
            this._cropLockedToggle.on = crop.locked;
            this._cropUsableToggle.on = crop.usable;
            this.redraw();
            this.updateImageInfo(true);
        },

        /**
         * Toggle a specified crops usable field, or the current crop if left out
         * @param crop
         */
        toggleCropUsable: function(crop) {
            if (typeof crop === 'undefined') {
                crop = this._crop;
            }
            crop.usable = !crop.usable;
            this._renderUpdatedPreview(crop);

            if (crop.id === this._crop.id) {
                this._cropUsableToggle.on = crop.usable;
            }
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
            for (var i = 0;i < data.length;i += 2) {
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
        detectFaces: function() {
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
                    for (var n = 0;n < e.data.length;n++) {
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
                tracker.on('track', function(event) {
                    event.data.forEach(function(rect) {
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
                y: Math.round((y - this._margin) / this._zoomLevel) - this._image.y
            };
        },

        /**
         * Center image around the middle point of the drawing area
         * @param redraw
         */
        centerImage: function(redraw) {
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
        getZoom: function(decimal) {
            return decimal === true ? this._zoomLevel : this._zoomLevel * 100;
        },


        /**
         * Set zoom by percent
         *
         * @param zoomLevel
         * @param redraw
         */
        setZoom: function(zoomLevel, redraw) {
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
        setZoomToImage: function(redraw) {
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
         * Dispose function to remove all listeners
         */
        removeEventListeners: function() {
            window.removeEventListener('resize', handlers.onResize)
            window.removeEventListener('mouseup', handlers.onMouseUp)
            this._canvas.removeEventListener('dblclick', handlers.onDoubleClick)
            this._canvas.removeEventListener('mousedown', handlers.onMouseDown)
            this._canvas.removeEventListener('mouseup', handlers.onMouseUp)
            this._canvas.removeEventListener('mousemove', handlers.onMouseMove)
            this._canvas.removeEventListener('mousewheel', handlers.onMouseWheel, false)
            document.removeEventListener('keydown', handlers.onKeyDown, false)
        },

        /**
         * Add all event listeners required for drawing and dragging
         */
        addCanvasEventListeners: function() {
            window.addEventListener('resize', handlers.onResize, false)
            window.addEventListener('mouseup', handlers.onMouseUp)
            this._canvas.addEventListener('dblclick', handlers.dblclick)
            this._canvas.addEventListener('mousedown', handlers.onMouseDown)
            this._canvas.addEventListener('mouseup', handlers.onMouseUp)
            this._canvas.addEventListener('mousemove', handlers.onMouseMove)
            this._canvas.addEventListener('mousewheel', handlers.onMouseWheel, false)
            document.addEventListener('keydown', handlers.onKeyDown, false)
        },

        /**
         * Add onSave callback function
         * @param {function} func
         */
        onSave: function(func) {
            if (typeof func == 'function') {
                this._onSave = func;
            }
        },


        /**
         * Add onSave callback function
         * @param {function} func
         */
        onCancel: function(func) {
            if (typeof func == 'function') {
                this._onCancel = func;
            }
        },


        /**
         * On window resize handler
         *
         * @todo Should use zoomToImage(false) for keepCenter
         */
        onResize: function() {
            if (this._keepCenter) {
                this.centerImage(false);
            }

            this.redraw();
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

            var point = this.getMousePoint(event);
            this._image.addFocusPoint(
                this.canvasPointInImage(point.x, point.y)
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
        onMouseDown: function(event) {
            var point = this.getMousePoint(event);

            if (this._crop instanceof IMSoftcrop.Softcrop && typeof this.handle === 'string') {
                this.updateImageInfo(true);
                this._dragPoint = point;
                this._dragObject = this.handle;
            }
            else if (this._crop instanceof IMSoftcrop.Softcrop && this._crop.inArea(point)) {
                this.updateImageInfo(true);
                this._dragObject = this._crop;
                this._dragPoint = point;
            }
            else if (this._image instanceof IMSoftcrop.Image && this._image.inArea(point)) {
                this.updateImageInfo(false);
                this._dragObject = this._image;
                this._dragPoint = point;
            }
        },

        /**
         * On mouse up event handler
         */
        onMouseUp: function(event) {
            this._dragObject = undefined;
            this._dragPoint = undefined;

            if (this.useFocusPoint()) {

                var point = this.getMousePoint(event);

                if (this._image.inArea(point)) {
                    this.toggleLoadingImage(true);

                    var focusPoint = this.canvasPointInImage(point.x, point.y);

                    this._image.addFocusPoint(focusPoint);
                    this._image.adjustCropsToFocusPoint();

                    this.toggleLoadingImage(false);
                }
            }

            this.redraw();
        },

        /**
         * On mouse move event handler.
         * Calculate mouse coordinates in canvas (starting with border).
         * @param event
         */
        onMouseMove: function(event) {
            var point = this.getMousePoint(event);

            // Move dragged object
            if (typeof this._dragObject != 'undefined') {

                if (typeof this._dragObject == 'string') {

                    // Dragging handle
                    if (!this._image.detectionReady()) {
                        // Lock crop so that detection does not override users choice
                        this._crop.locked = true;
                    }

                    this._crop.dragHandle(
                        this._dragObject,
                        {
                            x: (point.x - this._dragPoint.x) / this._zoomLevel,
                            y: (point.y - this._dragPoint.y) / this._zoomLevel
                        }
                    );
                    this.updateImageInfo(true);
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

                this.updateImageInfo(true);
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
                if (this.useFocusPoint()) {
                    this._canvas.style.cursor = 'crosshair';
                } else {
                    this._canvas.style.cursor = 'move';
                }

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
        onMouseWheel: function(event) {
            event.preventDefault()
            event.stopPropagation()

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
        getMousePoint: function(event) {
            return {
                x: event.pageX - this._position.x,
                y: event.pageY - this._position.y
            };
        },

        /**
         * Get canvas
         * @returns {*}
         */
        getCanvas: function() {
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

        onKeyDown: function(e) {
            var keyCode = e.keyCode || e.which;
            var _this = this;

            // Handle escape key
            if (keyCode === 13) {
                _this._onSave(
                    _this.getSoftcropData()
                );
                e.preventDefault();
                e.stopPropagation();
                return false;
            }

            if (keyCode === 27) {
                _this._onCancel();
                e.preventDefault();
                e.stopPropagation();
                return false;
            }

            // Handle tab key
            if (keyCode === 9) {
                var crops = _this._image.getSoftCrops();
                var current;
                for (var n = 0;n < crops.length;n++) {
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


        /**
         * Render and output debug position and dimensions
         * @private
         */
        _renderDebug: function() {
            this._drawCross(
                'red',
                {
                    x: this._container.clientWidth / 2,
                    y: this._container.clientHeight / 2
                }
            );

            this._drawCross(
                'green',
                this._image.getImageCenterPoint()
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
        _drawCross: function(color, point) {
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

    return IMSoftcrop;
})();
