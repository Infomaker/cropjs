(function() {
    IMSoftcrop.Image = IMSoftcrop.Base.extend({
        id: undefined,
        _src: undefined,
        _image: undefined,
        _crops: [],
        _focusPoints: [],
        _focusArea: {
            x1: undefined,
            y1: undefined,
            x2: undefined,
            y2: undefined
        },

        /**
         * Load image from url and draw
         *
         * @param {string} id
         * @param {string} url
         * @param {function} cbFunc
         */
        load: function (id, url, cbFunc) {
            var image = document.createElement('img');
            var _this = this;

            image.crossOrigin = '*';
            image.addEventListener(
                'load',
                function () {
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
        addSoftcrop: function (hRatio, vRatio, setAsCurrent) {
            var imgRatio = this._h / this._w;
            var cropRatio = vRatio / hRatio;
            var x = 0;
            var y = 0;
            var w = this._w;
            var h = this._h;

            if (imgRatio > cropRatio) {
                // Crop fills horizontal but not vertical
                h = this._w * cropRatio;
                y = (this._h - h) / 2;
            }
            else {
                // Crop will fill vertical but not horizontal
                var invertCropRatio = hRatio / vRatio;
                w = this._h * invertCropRatio;
                x = (this._w - w) / 2;
            }

            var crop = new IMSoftcrop.Softcrop(this, hRatio, vRatio, x, y, w, h, true);
            this._crops.push(crop);

            if (setAsCurrent) {
                this._crop = crop;
            }

            return crop;
        },

        getCrops: function () {
            return this._crops;
        },


        setActiveCrop: function (crop) {
            this._crop = crop;
        },

        getSrc: function () {
            return this._src;
        },

        /**
         * Add focus point to guide automatic cropping areas
         * @param x
         * @param y
         * @param radius
         */
        addFocusPoint: function (x, y, radius) {
            var zoomLevel = this._editor.getZoom(true);
            var point = this.getPointInImage(
                x,
                y,
                {
                    x: this._drawX,
                    y: this._drawY
                }
            );
            point.r = Math.round(radius / zoomLevel);

            if (typeof this._focusArea.x1 == 'undefined') {
                // Init focus area
                this._focusArea = {
                    x1: point.x - point.r,
                    y1: point.y - point.r,
                    x2: point.x + point.r,
                    y2: point.y + point.r
                }
            }
            else {
                // Recalculate focus area
                if (point.x - point.r < this._focusArea.x1) {
                    this._focusArea.x1 = point.x - point.r;
                }

                if (point.x + point.r > this._focusArea.x2) {
                    this._focusArea.x2 = point.x + point.r;
                }

                if (point.y - point.r < this._focusArea.y1) {
                    this._focusArea.y1 = point.y - point.r;
                }

                if (point.y + point.r > this._focusArea.y2) {
                    this._focusArea.y2 = point.y + point.r;
                }

                // Keep within image dimensions
                if (this._focusArea.x1 < 0) {
                    this._focusArea.x1 = 0;
                }

                if (this._focusArea.x2 > this._w) {
                    this._focusArea.x1 = this._w;
                }

                if (this._focusArea.y1 < 0) {
                    this._focusArea.y1 = 0;
                }

                if (this._focusArea.y2 > this._h) {
                    this._focusArea.y1 = this._h;
                }
            }


            this._focusPoints.push(point);
        },


        /**
         * Redraw image
         */
        redraw: function (options) {
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

            if (typeof options == 'object' && options.focuspoints === true) {
                this.drawFocusPoints();
            }

            if (this._crop instanceof IMSoftcrop.Softcrop) {
                this._crop.redraw(options);
            }
        },


        /**
         * Draw focus points
         */
        drawFocusPoints: function () {
            var zoomLevel = this._editor.getZoom(true);

            for (var n in this._focusPoints) {
                var point = this.getPointInCanvas(
                    this._focusPoints[n].x,
                    this._focusPoints[n].y,
                    {
                        x: this._x,
                        y: this._y
                    }
                );
                var radius = this._focusPoints[n].r * zoomLevel;

                this._ctx.beginPath();
                this._ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                this._ctx.lineWidth = 1;

                if (this._ctx.setLineDash) {
                    this._ctx.setLineDash([5, 5]);
                }

                this._ctx.arc(point.x + 1, point.y + 1, radius, 0, 2 * Math.PI, false);
                this._ctx.stroke();
                this._ctx.closePath();


                this._ctx.beginPath();
                this._ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                this._ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI, false);
                this._ctx.stroke();
                this._ctx.closePath();

                if (this._ctx.setLineDash) {
                    this._ctx.setLineDash([]);
                }
            }
        },


        /**
         * Automatically alter crop(s) by focus points total focus area
         *
         * @todo Implement algorithm as this is work in progress!
         *
         * @param crop
         */
        autoCropFocusPoints: function(crop) {
            var crops = (typeof crop != 'undefined') ? new Array(crop) : this._crops;

            var fpMiddle = {
                x: this._focusArea.x1 + ((this._focusArea.x2 - this._focusArea.x1) / 2),
                y: this._focusArea.y1 + ((this._focusArea.y2 - this._focusArea.y1) / 2)
            };

            for(var n = 0; n < crops.length; n++) {
                var cropDim = crops[n].getDimensions();
                var cropMiddle = {
                    x: cropDim.x + (cropDim.w / 2),
                    y: cropDim.y + (cropDim.h / 2)
                };

                var yDiff = fpMiddle.y - cropMiddle.y;

                console.log(yDiff);
                crops[n].move({
                    x: 0,
                    y: yDiff
                });
            }

            /*
            this._ctx.rect(
                pt1.x,
                pt1.y,
                pt2.x - pt1.x,
                pt2.y - pt1.y
            );
            this._ctx.stroke();
            this._ctx.closePath();
            */
        }
    });
    return this;
})();