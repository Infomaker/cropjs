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
             * @param hRatio
             * @param vRatio
             * @param setAsCurrent
             */
            addSoftcrop: {
                value: function (hRatio, vRatio, setAsCurrent) {
                    // Make sure there are no duplicates
                    var crop;
                    if (null != (crop = this.getSoftcrop(hRatio, vRatio))) {
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

                    crop = new IMSoftcrop.Softcrop(this, hRatio, vRatio, area, true);
                    this.crops.push(crop);

                    if (setAsCurrent) {
                        this.crop = crop;
                    }

                    return crop;
                }
            },

            /**
             * Return soft crop if it exists
             * @param hRatio
             * @param vRatio
             * @returns {null}
             */
            getSoftcrop: {
                value: function (hRatio, vRatio) {
                    for (var n = 0; n < this.crops.length; n++) {
                        if (this.crops[n].ratio.w == hRatio && this.crops[n].ratio.h == vRatio) {
                            return this.crops[n];
                        }
                    }

                    return null;
                }
            },

            detectionReady: {
                value: function () {
                    return (typeof this.detailArea != 'undefined' && typeof this.focusArea != 'undefined');
                }
            },

            getCrops: {
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
                    // Calculate full detail + focus area
                    var x1 = (this.detailArea.point1.x < this.focusArea.point1.x)
                        ? this.detailArea.point1.x
                        : this.focusArea.point1.x;

                    var x2 = (this.detailArea.point2.x > this.focusArea.point2.x)
                        ? this.detailArea.point2.x
                        : this.focusArea.point2.x;

                    var y1 = (this.detailArea.point1.y < this.focusArea.point1.x)
                        ? this.detailArea.point1.y
                        : this.focusArea.point1.y;

                    var y2 = (this.detailArea.point2.y > this.focusArea.point2.y)
                        ? this.detailArea.point2.y
                        : this.focusArea.point2.y;

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
                            x: this.focusArea.point1.x + ((this.focusArea.point2.x - this.focusArea.point1.x) / 2),
                            y: this.focusArea.point1.y + ((this.focusArea.point2.y - this.focusArea.point1.y) / 2)
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
                        if (crop.w >= this.focusArea.point2.x - this.focusArea.point1.x &&
                            crop.h >= this.focusArea.point2.y - this.focusArea.point1.y &&
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