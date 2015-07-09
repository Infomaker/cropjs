var IMCropCanvas = Class.extend({
    _container: undefined,
    _canvas: undefined,
    _isTainted: undefined,

    // Other html gui objects
    _workContainer: undefined,
    _previewContainer: undefined,

    // Current objects
    _image: undefined,
    _crop: undefined,
    _handle: undefined,

    // Variables for dragging objects
    _dragObject: undefined,
    _dragPoint: undefined,

    _x: 0,
    _y: 0,
    _zoomLevel: 1,

    _margin: 10,
    _offsetX: 0,
    _offsetY: 0,

    // "Constants"
    _zoomMax: 5,
    _zoomMin: 0.1,


    /**
     * Constructor
     * @param container
     * @private
     */
    _construct: function(container) {
        this._container = container;

        this._renderGui();

        this.calculateViewport();
        this.addEventListeners();
    },

    _renderGui: function() {
        this._canvas = document.createElement('canvas');
        this._container.appendChild(this._canvas);

        this._workContainer = document.createElement('div');
        this._workContainer.id = 'imc_work_container';

        this._previewContainer = document.createElement('div');
        this._previewContainer.id = 'imc_preview_container';

        this._workContainer.appendChild(this._previewContainer);
        this._container.appendChild(this._workContainer);
    },

    _renderPreviews: function() {
        if (!this._image.isReady()) {
            return;
        }

        if (this._previewContainer.id !== this._image.id) {
            this._previewContainer.innerHTML = '';
            this._previewContainer.id = this._image.id;

            for(var n in this._image.getCrops()) {
                var pvDiv = document.createElement('div');
                pvDiv.className = 'im_preview_image';
                pvDiv.id = this._image.id;

                var pvImg = document.createElement('img');
                pvImg.src = this._image._src;
                pvDiv.appendChild(pvImg);

                this._previewContainer.appendChild(pvDiv);
            }
        }
        else {

        }

    },

    getDimensions: function() {
        return {
            margin: this._margin,
            width: this._canvas.width,
            height: this._canvas.height
        };
    },


    /**
     * Redraw canvas
     */
    redraw: function() {
        this._canvas.width = this._container.clientWidth;
        this._canvas.height = this._container.clientHeight;

        if (this._image instanceof IMCropImg) {
            this._image.redraw(
                this._zoomLevel,
                {
                    x: this._offsetX,
                    y: this._offsetY
                }
            );

            this._renderPreviews();

            /*
                this._image.drawCrop(
                    this._zoomLevel,
                    {
                        x: this._canvas.width - 50 - (this._margin),
                        y: this._canvas.height - 50 - (this._margin)
                    }
                );
            */
        }
    },


    /**
     * Load image from url
     * @param url
     * @param cbFunc
     */
    loadImage: function(url, cbFunc) {
        var _this = this;

        // FIXME: Replace hard coded zoom with automatic zoom based on img size
        this._zoomLevel = 0.458;

        this._image = new IMCropImg(this);
        this._image.load(
            this.hashFnv32a(url),
            url,
            function() {
                _this.redraw();

                if (typeof cbFunc === 'function') {
                    cbFunc(_this._image);
                }
            }
        );
    },

    /**
     * Add soft crop to image
     *
     * @param hRatio
     * @param vRatio
     * @param setAsCurrent
     */
    addSoftcrop: function(hRatio, vRatio, setAsCurrent) {
        if (this._image instanceof IMCropImg) {
            var crop = this._image.addSoftcrop(hRatio, vRatio, setAsCurrent);

            if (setAsCurrent) {
                this._crop = crop;
            }

            this.redraw();
        }
    },

    /**
     * Add all event listeners required
     */
    addEventListeners: function() {
        var _this = this;

        window.addEventListener(
            'resize',
            function() {
                _this.onResize(event);
            },
            false
        );

        this._canvas.addEventListener(
            'mousedown',
            function(event) {
                _this.onMouseDown(event);
            }
        );

        this._canvas.addEventListener(
            'mouseup',
            function(event) {
                _this.onMouseUp(event);
            }
        );

        window.addEventListener(
            'mouseup',
            function(event) {
                _this.onMouseUp(event);
            }
        );
        this._canvas.addEventListener(
            'mousemove',
            function(event) {
                _this.onMouseMove(event);
            }
        );

        this._canvas.addEventListener(
            'mousewheel',
            function(event) {
                event.stopPropagation();
                event.preventDefault();
                _this.onMouseWheel(event);
                return false;
            },
            false
        )
    },


    /**
     * On window resize handler
     */
    onResize: function() {
        this.redraw();
        this.calculateViewport();
    },


    /**
     * On mouse down event handler
     * @param event
     */
    onMouseDown: function(event) {
        var point = this.getMousePoint(event);

        if (this._crop instanceof IMSoftcrop && typeof this._handle === 'string') {
            this._dragPoint = point;
            this._dragObject = this._handle;
        }
        else if (this._crop instanceof IMSoftcrop && this._crop.inArea(point)) {
            this._dragObject = this._crop;
            this._dragPoint = point;
        }
        else if (this._image instanceof IMCropImg && this._image.inArea(point)) {
            this._dragObject = this._image;
            this._dragPoint = point;
        }
    },


    /**
     * On mouse up event handler
     */
    onMouseUp: function() {
        this._dragObject = undefined;
        this._dragPoint = undefined;
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
                this._crop.dragHandle(
                    this._dragObject,
                    {
                        x: (point.x - this._dragPoint.x) / this._zoomLevel,
                        y: (point.y - this._dragPoint.y) / this._zoomLevel
                    }
                );
            }
            else {
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
        if (this._crop instanceof IMSoftcrop) {
            var handle = this._crop.overHandle(point);

            if (handle !== false && !this._handle) {
                this._canvas.style.cursor = handle + '-resize';
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
        if (this._image instanceof IMCropImg && this._image.inArea(point)) {
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
    onMouseWheel: function(event) {
        var point = this.getMousePoint(event);
        var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));

        if (delta < 0 && this._zoomLevel < this._zoomMax) {
            // Zoom in
            this._zoomLevel += this._zoomLevel < 1 ? 0.01 : 0.02;
        }
        else if (delta > 0 && this._zoomLevel > this._zoomMin) {
            // Zoom out
            this._zoomLevel -= this._zoomLevel < 1 ? 0.01 : 0.02;
        }

        // FIXME: Not working, not being used
        // this._offsetX = (point.x - (point.x * this._zoomLevel));
        // this._offsetY = (point.y - (point.y * this._zoomLevel));

        this.redraw();
    },


    /**
     * Get mouse coordinates
     * @param event
     * @returns {{x: number, y: number}}
     */
    getMousePoint: function(event) {
        return {
            x: event.pageX - this._x,
            y: event.pageY - this._y
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
     * Check if canvas is tainted
     * @returns {boolean|*}
     */
    isTainted: function() {
        if (typeof this._isCanvasTainted === 'undefined') {
            try {
                var ctx = this._canvas.getContext('2d');
                ctx.getImageData(1, 1, 1, 1);
                this._isCanvasTainted = false;
            }
            catch(ex) {
                this._isCanvasTainted = true;
            }
        }

        return this._isCanvasTainted;
    },


    /**
     * Calculate true x,y offset of canvas, including the border and margin
     *
     * @returns {{x: number, y: number}}
     */
    calculateViewport: function() {
        var e = this._canvas;
        var offsetX = 0;
        var offsetY = 0;

        while(e) {
            offsetX += (e.offsetLeft - e.scrollLeft + e.clientLeft);
            offsetY += (e.offsetTop - e.scrollTop + e.clientTop);
            e = e.offsetParent;
        }

        this._x = offsetX;
        this._y = offsetY;
    },

    /**
     * Calculate a 32 bit FNV-1a hash
     * Found here: https://gist.github.com/vaiorabbit/5657561
     * Ref.: http://isthe.com/chongo/tech/comp/fnv/
     *
     * @param {string} str the input value
     * @param {integer} [seed] optionally pass the hash of the previous chunk
     * @returns {string}
     */
    hashFnv32a: function(str, seed) {
        var i, l,
            hval = (seed === undefined) ? 0x811c9dc5 : seed;

        for (i = 0, l = str.length; i < l; i++) {
            hval ^= str.charCodeAt(i);
            hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
        }

        return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
    }
});