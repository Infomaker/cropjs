var IMSoftcrop = IMCropObject.extend({
    _lineWidth: 1,
    _lineColor: '#6699ff',

    _handleRadiusLarge: 5,
    _handleColor: '#6699ff',
    _handleColorActive: '#66ccee',

    // Drawing positions of handles
    _handles: {
        nw: [0, 0, 0],
        n: [0, 0, 0],
        ne: [0, 0, 0],
        e: [0, 0, 0],
        se: [0, 0, 0],
        s: [0, 0, 0],
        sw: [0, 0, 0],
        w: [0, 0, 0]
    },

    // Focused handle
    _handle: undefined,

    // Ratio handling
    _ratio: 1,
    _respectRatio: true,

    /**
     * Soft crop constructor
     * @param parent
     * @param x
     * @param y
     * @param w
     * @param h
     * @param respectRatio
     * @private
     */
    _construct: function(parent, x, y, w, h, respectRatio) {
        this._super(parent);
        this._x = x;
        this._y = y;
        this._w = w;
        this._h = h;
        this._respectRatio = respectRatio;
        this._ratio = w / h;

        this.isReady(true);
    },

    /**
     * Redraw image
     * @param {number} zoomLevel
     * @param {object} offset
     */
    redraw: function(zoomLevel) {
        if (!this.isReady()) {
            return;
        }

        this._calculateDrawDimensions(
            zoomLevel,
            this._parent.getCoordinates()
        );

        this.drawRect();

        this._drawHandle('nw', false, this._drawX, this._drawY, this._handleRadiusLarge);
        this._drawHandle('ne', false, this._drawX + this._drawW, this._drawY, this._handleRadiusLarge);
        this._drawHandle('se', false, this._drawX + this._drawW, this._drawY + this._drawH, this._handleRadiusLarge);
        this._drawHandle('sw', false, this._drawX, this._drawY + this._drawH, this._handleRadiusLarge);

        this._drawHandle('n', false, this._drawX + (this._drawW / 2), this._drawY, 3);
        this._drawHandle('e', false, this._drawX + this._drawW, this._drawY + (this._drawH / 2), 3);
        this._drawHandle('s', false, this._drawX + (this._drawW / 2), this._drawY + this._drawH, 3);
        this._drawHandle('w', false, this._drawX, this._drawY + (this._drawH / 2), 3);
    },


    /**
     * Drag a handle
     *
     * @fixme Must enforce dimensions throught any drag events
     *
     * @param handle
     * @param point
     */
    dragHandle: function(handle, point) {
        if (typeof this._handle != 'string') {
            return;
        }

        var i = this._parent.getDimensions();
        var ratio = this._w / this._h;
        var x = this._x;
        var y = this._y;
        var w = this._w;
        var h = this._h;

        switch(handle) {
            case 'n':
                y += point.y;
                h -= point.y;
                w = h * ratio;
                x += (point.y / 2) * ratio;
                break;

            case 'e':
                w += point.x;
                h = w / ratio;
                y -= (point.x / 2) / ratio;
                break;

            case 's':
                h += point.y;
                w = h * ratio;
                x -= (point.y / 2) * ratio;
                break;

            case 'w':
                w -= point.x;
                x += point.x;
                h = w / ratio;
                y += (point.x / 2) / ratio;
                break;

            // TODO: Implement nw, ne, se, sw
        }

        // Stop reversing of dimensions
        if (h < 10 || w < 10) {
            return;
        }

        // Enforce width/height and top/left boundaries
        if (w > i.w || h > i.h) {
            x = 0;
            y = 0;
            w = i.w;
            h = i.h;
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


        this._x = Math.round(x);
        this._y = Math.round(y);
        this._w = Math.round(w);
        this._h = Math.round(h);
    },


    /**
     * Move crop area
     *
     * @param point
     */
    move: function(point) {
        var i = this._parent.getDimensions();

        if (this._x + point.x < 0) {
            this._x = 0;
            point.x = 0;
        }

        if (this._y + point.y < 0) {
            point.y = 0;
            this.y = 0;
        }

        if (this._w + this._x + Math.round(point.x) > i.w) {
            point.x = i.w - this._w;
            return;
        }

        if (this._h + this._y + Math.round(point.y) > i.h) {
            point.y = i.h - this._h;
            return;
        }


        this._super(point);
    },


    /**
     * Return handle name if mouse hover over it
     * @param point
     * @returns {*}
     */
    overHandle: function(point) {
        var radiusWidth = this._handleRadiusLarge * 2;
        var inArea = this.inCalculatedArea(
            point,
            this._drawX - this._handleRadiusLarge,
            this._drawY - this._handleRadiusLarge,
            this._drawW + radiusWidth,
            this._drawH + radiusWidth
        );

        var withinArea = this.inCalculatedArea(
            point,
            this._drawX + this._handleRadiusLarge,
            this._drawY + this._handleRadiusLarge,
            this._drawW - radiusWidth,
            this._drawH - radiusWidth
        );

        if (!inArea || withinArea) {
            this._handle = false;
        }
        else {
            // Check for hover over handles
            for (var n in this._handles) {
                var cr = this._handles[n][2];
                var cx = this._handles[n][0];
                var cy = this._handles[n][1];

                if (point.x > cx - cr && point.x <= cx + cr) {
                    if (point.y > cy - cr && point.y <= cy + cr) {
                        this._handle = n;
                        break;
                    }
                }
            }
        }

        return this._handle;
    },


    /**
     * Draw rectangle
     */
    drawRect: function(z) {
        this._ctx.beginPath();

        this._ctx.rect(
            this._drawX -0.5,
            this._drawY -0.5,
            this._drawW,
            this._drawH
        );

        this._ctx.lineWidth = this._lineWidth;
        this._ctx.strokeStyle = this._lineColor;
        this._ctx.stroke();
    },


    /**
     * Draw crop area handle
     * @param name
     * @param active
     * @param x
     * @param y
     * @param radius
     */
    _drawHandle: function(name, active, x, y, radius) {
        this._handles[name] = [x, y, radius];

        this._ctx.beginPath();
        this._ctx.fillStyle = (active === true) ? this._handleColorActive : this._handleColor;

        if (0) {
            this._ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        }
        else {
            this._ctx.rect(
                x - radius,
                y - radius,
                radius * 2,
                radius * 2
            );
        }

        this._ctx.fill();
    }
});