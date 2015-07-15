var IMCropImg = IMCropObject.extend({
    id: undefined,
    _src: undefined,
    _image: undefined,
    _crops: [],
    _focusAreas: [],

    /**
     * Load image from url and draw
     *
     * @param {string} id
     * @param {string} url
     * @param {function} cbFunc
     */
    load: function(id, url, cbFunc) {
        var image = new Image();
        var _this = this;

        image.crossOrigin = '*';
        image.addEventListener(
            'load',
            function() {
                _this._w = this.naturalWidth;
                _this._h = this.naturalHeight;
                _this._image = this;

                _this.isReady(true);
                cbFunc();
            },
            false
        );

        image.src = url;

        this.id = id;
        this._src = url;

    },

    /**
     * Add soft crop to this image
     *
     * @param hRatio
     * @param vRatio
     * @param setAsCurrent
     */
    addSoftcrop: function(hRatio, vRatio, setAsCurrent) {
        var imgRatio = this._h / this._w;
        var cropRatio = vRatio / hRatio;
        var x = 0;
        var y = 0;
        var w = this._w;
        var h = this._h;

        if (imgRatio > cropRatio) {
            // Horisontal crop fills horisontal but not vertical
            h = this._h * cropRatio;
            y = (this._h - h) / 2;
        }
        else {
            // Crop will fill vertical but not horizontal
            // FIXME: Not correct
            var invertCropRatio = hRatio / vRatio;
            w = this._h * invertCropRatio;
            x = (this._w - w) / 2;
        }

        var crop = new IMSoftcrop(this, hRatio, vRatio, x, y, w, h, true);
        this._crops.push(crop);

        if (setAsCurrent) {
            this._crop = crop;
        }

        return crop;
    },

    getCrops: function() {
        return this._crops;
    },


    setActiveCrop: function(crop) {
        this._crop = crop;
    },

    getSrc: function() {
        return this._src;
    },

    /**
     * Detect faces, must know scale of canvas to get correct values
     * @param scale
     */
    detectFaces: function(scale) {
        var tracker = new tracking.ObjectTracker('face');
        var img = this._parent._canvas;
        var _this = this;

        tracker.on('track', function(event) {
            event.data.forEach(function(rect) {
                var w = (rect.width * scale) / 2;
                var h = (rect.height * scale) / 2;

                _this.addFocusPoint(
                    (rect.x * scale) + w,
                    (rect.y * scale) + h,
                    (w > h ? w : h)
                );
            });
        });

        tracking.track(img, tracker);
    },

    /**
     * Add focus point to guide automatic cropping areas
     * @param x
     * @param y
     * @param radius
     */
    addFocusPoint: function(x, y, radius) {
        var zoomLevel = this._cropCanvas.getZoom(true);
        var point = this.getPointInImage(
            x,
            y,
            {
                x: this._drawX,
                y: this._drawY
            }
        );
        point.r = radius / zoomLevel;

        this._focusAreas.push(point);
    },


    /**
     * Redraw image
     */
    redraw: function() {
        if (!this.isReady()) {
            return;
        }

        this.getDimensionsInCanvas({x: 0, y: 0});

        this._ctx.drawImage(
            this._image,
            this._drawX,
            this._drawY,
            this._drawW,
            this._drawH
        );

        this.drawFocusPoints();

        if (this._crop instanceof IMSoftcrop) {
            this._crop.redraw();
        }
    },


    /**
     * Draw focus points
     */
    drawFocusPoints: function() {
        var zoomLevel = this._cropCanvas.getZoom(true);

        for(var n in this._focusAreas) {
            var point = this.getPointInCanvas(
                this._focusAreas[n].x,
                this._focusAreas[n].y,
                {
                    x: this._x,
                    y: this._y
                }
            );
            var radius = this._focusAreas[n].r * zoomLevel;

            this._ctx.beginPath();
            this._ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            this._ctx.lineWidth = 1;

            if(this._ctx.setLineDash) {
                this._ctx.setLineDash([5,5]);
            }

            this._ctx.arc(point.x + 1, point.y + 1, radius, 0, 2 * Math.PI, false);
            this._ctx.stroke();
            this._ctx.closePath();


            this._ctx.beginPath();
            this._ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            this._ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI, false);
            this._ctx.stroke();
            this._ctx.closePath();
        }
    }
});