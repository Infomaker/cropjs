var IMCropImg = IMCropObject.extend({
    id: undefined,
    _src: undefined,
    _image: undefined,
    _crops: [],

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

        var crop = new IMSoftcrop(this, x, y, w, h, true);
        this._crops.push(crop);

        if (setAsCurrent) {
            this._crop = crop;
        }

        return crop;
    },

    getCrops: function() {
        return this._crops;
    },

    /**
     * Redraw image
     * @param {number} zoomLevel
     * @param {object} offset
     */
    redraw: function(zoomLevel, offset) {
        if (!this.isReady()) {
            return;
        }

        this._calculateDrawDimensions(zoomLevel, offset);

        this._ctx.drawImage(
            this._image,
            this._drawX + 0.5,
            this._drawY,
            this._drawW,
            this._drawH
        );

        if (this._crop instanceof IMSoftcrop) {
            this._crop.redraw(zoomLevel, offset);
        }
    },

    drawCrop: function(zoomLevel, offset) {
        if (!this.isReady() || this._crop instanceof IMSoftcrop != true) {
            return;
        }
return;
        /*
        om höjden är mindre
            fyll ut bredden
            scale
*/
        var dim = this._crop.getDimensions();
        var h = 45;//(dim.w > dim.h) ? 50 * (50 / dim.h) : 50;

        var w = 80;

console.log(w + ', ' + h);

        this._ctx.drawImage(
            this._image,
            dim.x,
            dim.y,
            dim.w,
            dim.h,
            offset.x,
            offset.y,
            w,
            h
        );

    }
});