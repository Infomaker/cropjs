(function() {
    IMSoftcrop.Image = IMSoftcrop.Base.extend({
        // Image id
        id: undefined,

        // Image src
        _src: undefined,

        // Image element
        _image: undefined,

        // List of crops for this image
        _crops: [],

        // Focus points, for example faces
        _focusPoints: [],

        // Total area needed to include focus points
        _focusArea: undefined,

        // Image detail data
        _detailData: undefined,

        // Total area needed to include all image details
        _detailArea: undefined,

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

            // Make sure there are no duplicates
            for (var n = 0; n < this._crops.length; n++) {
                if (this._crops[n].ratio.w == hRatio
                    && this._crops[n].ratio.h == vRatio
                ) {
                    return null;
                }
            }

            var area = IMSoftcrop.Ratio.fitInto(
                {
                    w: this._w,
                    h: this._h
                },
                {
                    w: hRatio,
                    h: vRatio
                }
            );

            var crop = new IMSoftcrop.Softcrop(this, hRatio, vRatio, area, true);
            this._crops.push(crop);

            if (setAsCurrent) {
                this._crop = crop;
            }

            return crop;
        },

        detectionReady: function() {
            return (typeof this._detailArea != 'undefined' && typeof this._focusArea != 'undefined');
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
         * Add detail/corner data based on image drawing dimensions
         * @param data Pixel data
         */
        addDetailData: function(data) {
            this._detailData = data;

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
            for(var n = 1; n < data.length; n++) {
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

            this._detailArea = detailArea;
            this.constrainArea(this._detailArea);
        },

        /**
         * Add focus point to guide automatic cropping areas
         * @param point
         * @param radius
         */
        addFocusPoint: function (point, radius) {
            point.r = radius; // Add radius to point
            this._focusPoints.push(point);

            if (typeof this._focusArea == 'undefined') {
                // Init focus area
                this._focusArea = {
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
            if (point.x - point.r < this._focusArea.point1.x) {
                this._focusArea.point1.x = point.x - point.r;
            }

            if (point.x + point.r > this._focusArea.point2.x) {
                this._focusArea.point2.x = point.x + point.r;
            }

            if (point.y - point.r < this._focusArea.point1.y) {
                this._focusArea.point1.y = point.y - point.r;
            }

            if (point.y + point.r > this._focusArea.point2.y) {
                this._focusArea.point2.y = point.y + point.r;
            }

            this.constrainArea(this._focusArea);
        },

        /**
         * Consrain an area within image boundaries
         * @param area
         */
        constrainArea: function(area) {
            if (area.point1.x < 0) {
                area.point1.x = 0;
            }

            if (area.point2.x > this._w) {
                area.point2.x = this._w;
            }

            if (area.point1.y < 0) {
                area.point1.y = 0;
            }

            if (area.point2.y > this._h) {
                area.point2.y = this._h;
            }
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
            // Draw area with detected details/corners
            if (typeof this._detailArea != 'undefined') {
                this.drawArea(this._detailArea, 'rgba(255, 121, 255, 0.4)');

                this._ctx.fillStyle = 'rgba(255, 121, 255, 0.5)';
                for (var i = 0; i < this._detailData.length; i++) {
                    var pt = this._editor.imagePointInCanvas(
                            this._detailData[i].x, this._detailData[i].y
                        );
                    this._ctx.fillRect(pt.x, pt.y - 3, 6, 6);
                }
            }

            // Draw focus points
            if (typeof this._focusArea != 'undefined') {
                this.drawArea(this._focusArea, 'rgba(121, 121, 255, 0.4)');

                for (var n in this._focusPoints) {
                    var drawPoint = this._editor.imagePointInCanvas(
                        this._focusPoints[n].x,
                        this._focusPoints[n].y
                    );

                    var drawRadius = this._editor.imageLineInCanvas(this._focusPoints[n].r);

                    this._ctx.beginPath();
                    this._ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    this._ctx.lineWidth = 1;

                    this._ctx.arc(drawPoint.x, drawPoint.y, drawRadius, 0, 2 * Math.PI, true);
                    this._ctx.fill();
                    this._ctx.closePath();
                }
            }
        },

        /**
         * Draw area with specified color
         * @param area
         * @param color
         */
        drawArea: function(area, color) {
            var point1 = this._editor.imagePointInCanvas(area.point1.x, area.point1.y),
                point2 = this._editor.imagePointInCanvas(area.point2.x, area.point2.y);

            this._ctx.strokeStyle = color;
            this._ctx.lineWidth = 4;
            this._ctx.strokeRect(
                point1.x + 2,
                point1.y + 2,
                point2.x - point1.x - 4,
                point2.y - point1.y - 4
            );
        },

        /**
         * Automatically alter crop(s) to fit around interesting areas
         * @param crop
         * @returns boolean
         */
        autocrop: function(crop) {
            if (!this.detectionReady()) {
                return false;
            }

            var crops = (typeof crop != 'undefined') ? new Array(crop) : this._crops;

            for (var n = 0; n < crops.length; n++) {
                this.autoCropCrop(crops[n]);
            }

            return true;
        },

        /**
         * Resize crop to best fit around interesting areas
         * @param crop
         */
        autoCropCrop: function(crop) {
            // Calculate full detail + focus area
            var x1 = (this._detailArea.point1.x < this._focusArea.point1.x)
                ? this._detailArea.point1.x
                : this._focusArea.point1.x;

            var x2 = (this._detailArea.point2.x > this._focusArea.point2.x)
                ? this._detailArea.point2.x
                : this._focusArea.point2.x;

            var y1 = (this._detailArea.point1.y < this._focusArea.point1.x)
                ? this._detailArea.point1.y
                : this._focusArea.point1.y;

            var y2 = (this._detailArea.point2.y > this._focusArea.point2.y)
                ? this._detailArea.point2.y
                : this._focusArea.point2.y;

            var area = {
                point1: {
                    x: (x1 > 0) ? x1 : 0,
                    y: (y1 > 0) ? y1 : 0
                },
                point2: {
                    x: (x2 < this._w) ? x2 : this._w,
                    y: (y2 < this._h) ? y2 : this._h
                }
            };


            // Fit crop around full detail area as best as possible while
            // making sure not to go outside image area.
            var newDim = IMSoftcrop.Ratio.fitAround(
                { w: crop.ratio.w, h: crop.ratio.h },
                { w: area.point2.x - area.point1.x, h: area.point2.y - area.point1.y }
            );

            if (newDim.w <= this._w && newDim.h <= this._h) {
                // Perfect, we can set both width and height
                crop._w = newDim.w;
                crop._h = newDim.h;
            }
            else if (newDim.w > this._w) {
                // Width is too big, set to image width and recalculate height of crop
                crop._w = this._w;
                crop._h = IMSoftcrop.Ratio.height(this._w, crop.ratio.f);
                crop.autoCropWarning = true;
            }
            else if (newDim.h > this._h) {
                // Height is too big, set to image height and recalculate width of crop
                crop._h = this._h;
                crop._w = IMSoftcrop.Ratio.width(this._h,  crop.ratio.f);
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
                    x: this._focusArea.point1.x + ((this._focusArea.point2.x - this._focusArea.point1.x) / 2),
                    y: this._focusArea.point1.y + ((this._focusArea.point2.y - this._focusArea.point1.y) / 2)
                },
                cropCenter = {
                    x: crop._x + (crop._w / 2),
                    y: crop._y + (crop._h / 2)
                },
                xoffset = areaCenter.x - cropCenter.x,
                yoffset = areaCenter.y - cropCenter.y;

            // Full detail area not covered, adjust focus leaning toward focus center.
            // Make sure we don't move outside full detail area.
            if (crop.autoCropWarning) {

                console.log('changing from ' + yoffset);

                var yoffset2 = focusCenter.y - cropCenter.y;
                if (crop._y + yoffset2 < area.point1.y) {
                    yoffset = area.point1.y - crop._y;
                }
                else {
                    yoffset = yoffset2;
                }

                var xoffset2 = focusCenter.x - cropCenter.x;
                if (crop._x + xoffset2 < area.point1.x) {
                    xoffset = area.point1.x - crop._x;
                }
                else {
                    xoffset = xoffset2;
                }

                console.log('to ' + yoffset);

            }

            if (crop._x + xoffset < 0) {
                crop._x = 0;
            }
            else if (crop._x + xoffset + crop._w > this._w) {
                crop._x = this._w - crop._w;
            }
            else {
                crop._x += xoffset;
            }

            if (crop._y + yoffset < 0) {
                crop._y = 0;
            }
            else if (crop._y + yoffset + crop._h > this._h) {
                crop._y = this._h - crop._h;
            }
            else {
                crop._y += yoffset;
            }


        }
    });
    return this;
})();