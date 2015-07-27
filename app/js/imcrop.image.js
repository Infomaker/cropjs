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
         */
        autoCropFocusPoints: function(crop) {
            var crops = (typeof crop != 'undefined') ? new Array(crop) : this._crops;

            for (var n = 0; n < crops.length; n++) {
                this.autoCropCrop(crops[n]);
            }
        },

        /**
         * Resize crop to best fit around interesting areas
         * @param crop
         */
        autoCropCrop: function(crop) {
            var x1 = (this._focusArea.point2.x < this._focusArea.point1.x)
                ? this._focusArea.point2.x
                : this._focusArea.point1.x;
            var x2 = (this._focusArea.point2.x > this._focusArea.point1.x)
                ? this._focusArea.point2.x
                : this._focusArea.point1.x;
            var y1 = (this._focusArea.point2.y < this._focusArea.point1.x)
                ? this._focusArea.point2.y
                : this._focusArea.point1.y;
            var y2 = (this._focusArea.point2.y > this._focusArea.point1.y)
                ? this._focusArea.point2.y
                : this._focusArea.point1.y;

            // 1. Calculate full x,y to x,y area coordinates,
            //    making sure it does not bleed outside image.
            var area = {
                point1: {
                    x: (x1 > 0) ? x1 : 0,
                    y: (y1 > 0) ? y1 : 0
                },
                point2: {
                    x: (x2 < this._w) ? x2 : this._w,
                    y: (y2 < this._y) ? y2 : this._y
                }
            };


            // 1. Fit and center crop as best as possible around detail area
            var newDim = IMSoftcrop.Ratio.fitAround(
                { w: this._w, h: this._h },
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
                // Unable to change size, should not happen!
                console.log('Crop <' + n + '> just does not fit?!?');
                crop.autoCropWarning = true;
            }

            // 2. Make sure it's not outside image boundaries, keep centered

            // 3a. Check to see if there are focus areas outside crop

            // 3b. If so, can crop be moved so that it covers focus area better

            // 3c. If not, can it be centered better over the largest focus point
        },

        autocrop_old: function(crop) {
            var crops = (typeof crop != 'undefined') ? new Array(crop) : this._crops;

return;

            var fpCenter = {
                x: this._focusArea.x1 + ((this._focusArea.x2 - this._focusArea.x1) / 2),
                y: this._focusArea.y1 + ((this._focusArea.y2 - this._focusArea.y1) / 2)
            };

            var imgMiddle = {
                x: this._w / 2,
                y: this._h / 2
            };

            // Resize and move all crops based on focus points
            for(var n = 0; n < crops.length; n++) {
                var cropDim = crops[n].getDimensions(),
                    xRatio = (this._focusArea.x2 - this._focusArea.x1) / cropDim.w,
                    yRatio = (this._focusArea.y2 - this._focusArea.y1)  / cropDim.h,
                    newWidth = 0,
                    newHeight = 0;

                // Calculate optimal (tight fit) around focus area
                if (xRatio < yRatio) {
                    // Increase height and then calculate new width based on ratio
                    console.log('Increasing height...');
                    newHeight = this._focusArea.y2 - this._focusArea.y1 < this._w;
                    newWidth = IMSoftcrop.Ratio.width(newHeight, crops[n].ratio.f);
                }
                else {
                    // Increase width and then calculate new height based on ratio
                    newWidth = this._focusArea.x2 - this._focusArea.x1;
                    newHeight = IMSoftcrop.Ratio.height(newWidth, crops[n].ratio.f);
                }

                // Adjust width/height of crop if possible
                if (newHeight != 0 && newWidth != 0) {
                    if (newWidth <= this._w && newHeight <= this._h) {
                        // Perfect, we can set both width and height
                        crops[n]._w = newWidth;
                        crops[n]._h = newHeight;
                    }
                    else if (newWidth > this._w) {
                        // Width is too big, set to image width and recalculate height
                        crops[n]._w = this._w;
                        crops[n]._h = IMSoftcrop.Ratio.height(this._w, crops[n].ratio.f);
                        crops[n].autoCropWarning = true;
                    }
                    else if (newHeight > this._h) {
                        // Height is too big, set to image height and recalculate width
                        crops[n]._h = this._h;
                        crops[n]._w = IMSoftcrop.Ratio.width(this._h,  crops[n].ratio.f);
                        crops[n].autoCropWarning = true;
                    }
                    else {
                        // Unable to change size, should not happen!
                        console.log('Crop <' + n + '> just does not fit?!?');
                        crops[n].autoCropWarning = true;
                    }
                }

                // Adjust position
                var cropCenter = {
                        x: crops[n]._x + (crops[n]._w / 2),
                        y: crops[n]._y + (crops[n]._h / 2)
                    },
                    xoffset = fpCenter.x - cropCenter.x,
                    yoffset = fpCenter.y - cropCenter.y;

                crops[n].move({
                    x: (xoffset > 0) ? xoffset : 0,
                    y: (yoffset > 0) ? yoffset : 0
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