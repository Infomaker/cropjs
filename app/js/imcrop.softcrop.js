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
                        this.drawCropGuidelines(0, 'rgba(55, 55, 55, 0.45)');
                        this.drawCropGuidelines(-0.5, 'rgba(255, 255, 255, 0.6)');
                    }
                }
            },


            /**
             * Draw guide lines inside crop
             *
             * @private
             */
            drawCropGuidelines: {
                value: function (offset, strokeStyle) {
                    this.ctx.closePath();
                    this.ctx.beginPath();

                    if (this.ctx.setLineDash) {
                        this.ctx.setLineDash([3, 3]);
                    }
                    this.ctx.strokeStyle = strokeStyle;
                    this.ctx.lineWidth = 1;

                    var stepY = this.drawH / 3,
                        stepX = this.drawW / 3;

                    // Horizontal line 1
                    this.ctx.moveTo(this.drawX, offset + this.drawY + stepY);
                    this.ctx.lineTo(this.drawX + this.drawW, offset + this.drawY + stepY);

                    // Horizontal line 2
                    this.ctx.moveTo(this.drawX, offset + this.drawY + stepY + stepY);
                    this.ctx.lineTo(this.drawX + this.drawW, offset + this.drawY + stepY + stepY);

                    // Vertical line 1
                    this.ctx.moveTo(offset + this.drawX + stepX, this.drawY);
                    this.ctx.lineTo(offset + this.drawX + stepX, this.drawY + this.drawH);

                    // Horizontal line 2
                    this.ctx.moveTo(offset + this.drawX + stepX + stepX, this.drawY);
                    this.ctx.lineTo(offset + this.drawX + stepX + stepX, this.drawY + this.drawH);

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
