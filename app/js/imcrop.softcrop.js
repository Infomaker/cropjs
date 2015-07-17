(function() {
    IMSoftcrop.Softcrop = IMSoftcrop.Base.extend({
        id: undefined,
        _lineWidth: 1,
        _lineColor: 'rgba(255, 255, 255, 1)',
        _lineColorActive: 'rgba(0, 255, 255, 1)',

        _handleThickness: 3,
        _handleLength: 14,

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
        ratio: {
            w: 1,
            h: 1,
            f: 1
        },
        respectRatio: true,

        /**
         * Soft crop constructor
         * @param parent
         * @param hRatio
         * @param vRatio
         * @param x
         * @param y
         * @param w
         * @param h
         * @param respectRatio
         * @private
         */
        _construct: function (parent, hRatio, vRatio, x, y, w, h, respectRatio) {
            this.id = hRatio + ':' + vRatio;
            this._super(parent);

            this._x = x;
            this._y = y;
            this._w = w;
            this._h = h;

            this.respectRatio = respectRatio;
            this.ratio = {
                w: hRatio,
                h: vRatio,
                f: hRatio / vRatio
            };

            this.isReady(true);
        },


        /**
         * Drag a handle
         *
         * @fixme Must enforce dimensions throught any drag events
         *
         * @param handle
         * @param point
         */
        dragHandle: function (handle, point) {
            if (typeof this._handle != 'string') {
                return;
            }

            var i = this._parent.getDimensions();
            var x = this._x;
            var y = this._y;
            var w = this._w;
            var h = this._h;

            switch (handle) {
                case 'n':
                    y += point.y;
                    h -= point.y;
                    w = h * this.ratio.f;
                    x += (point.y / 2) * this.ratio.f;
                    break;

                case 'e':
                    w += point.x;
                    h = w / this.ratio.f;
                    y -= (point.x / 2) / this.ratio.f;
                    break;

                case 's':
                    h += point.y;
                    w = h * this.ratio.f;
                    x -= (point.y / 2) * this.ratio.f;
                    break;

                case 'w':
                    w -= point.x;
                    x += point.x;
                    h = w / this.ratio.f;
                    y += (point.x / 2) / this.ratio.f;
                    break;

                case 'nw':
                    if (Math.abs(point.x) > Math.abs(point.y)) {
                        w -= point.x;
                        x += point.x;
                        h -= point.x / this.ratio.f;
                        y += point.x / this.ratio.f;
                    }
                    else {
                        h -= point.y;
                        y += point.y;
                        w -= point.y * this.ratio.f;
                        x += point.y * this.ratio.f;
                    }
                    break;

                case 'ne':
                    if (Math.abs(point.x) > Math.abs(point.y)) {
                        w += point.x;
                        h += point.x / this.ratio.f;
                        y -= point.x / this.ratio.f;

                    }
                    else {
                        w -= point.y * this.ratio.f;
                        h -= point.y;
                        y += point.y;
                    }
                    break;

                case 'se':
                    if (Math.abs(point.x) > Math.abs(point.y)) {
                        w += point.x;
                        h += point.x / this.ratio.f;
                    }
                    else {
                        h += point.y;
                        w += point.y * this.ratio.f;
                    }
                    break;

                case 'sw':
                    if (Math.abs(point.x) > Math.abs(point.y)) {
                        w -= point.x;
                        x += point.x;
                        h -= point.x / this.ratio.f;
                    }
                    else {
                        w += point.y * this.ratio.f;
                        x -= point.y * this.ratio.f;
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
        move: function (point) {
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
         *
         * @param point
         * @returns {*}
         */
        overHandle: function (point) {
            var handle = '';
            var vDir = this._overVerticalArea(point);
            var hDir = this._overHorizontalArea(point);

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
                this._handle = false;
            }
            else {
                this._handle = handle;
            }

            return this._handle;
        },


        /**
         * Find out if and if so which horizontal area mouse is over
         * @param point
         * @returns {string}
         * @private
         */
        _overHorizontalArea: function (point) {
            var left = this._drawX - this._handleThickness;
            var right = this._drawX + this._drawW + this._handleThickness;

            if (this.withinCoordinates(
                    point,
                    left, this._drawY + this._drawH - this._handleLength + this._handleThickness,
                    right, this._drawY + this._drawH + this._handleThickness)) {
                // Is in southern area
                return 's';
            }
            else if (this.withinCoordinates(
                    point,
                    left, this._drawY + (this._drawH / 2) - this._handleLength,
                    right, this._drawY + (this._drawH / 2) + this._handleLength)) {
                // Is in middle area
                return 'm';
            }
            else if (this.withinCoordinates(
                    point,
                    left, this._drawY - this._handleThickness,
                    right, this._drawY + this._handleLength)) {
                // Is in northern area
                return 'n';
            }

            return '';
        },

        /**
         * Find out if and if so which vertical area mouse is over
         * @param point
         * @returns {string}
         * @private
         */
        _overVerticalArea: function (point) {
            var top = this._drawY - this._handleThickness;
            var bottom = this._drawY + this._drawH + this._handleThickness;

            if (this.withinCoordinates(
                    point,
                    this._drawX + this._drawW - this._handleLength, top,
                    this._drawX + this._drawW + this._handleThickness, bottom)) {
                // Is in western drag area
                return 'e';
            }
            else if (this.withinCoordinates(
                    point,
                    this._drawX + (this._drawW / 2) - this._handleLength, top,
                    this._drawX + (this._drawW / 2) + this._handleLength, bottom)) {
                // Is in western drag area
                return 'm';
            }
            else if (this.withinCoordinates(
                    point,
                    this._drawX - this._handleThickness, top,
                    this._drawX + this._handleLength, bottom)) {
                // Is in western drag area
                return 'w';
            }

            return '';
        },


        /**
         * Redraw image
         * @param {object} offset
         */
        redraw: function (options) {
            if (!this.isReady()) {
                return;
            }

            this.getDimensionsInCanvas(this._parent.getCoordinates());

            // Draw area outside crop
            this._drawCropMargins();

            // Draw crop handles
            var doubleLength = this._handleLength * 2;

            this._ctx.beginPath();
            this._drawHandle('nw', false, this._drawX, this._drawY, this._handleLength, this._handleThickness);
            this._drawHandle('se', false, this._drawXW, this._drawYH, this._handleLength, this._handleThickness);
            this._drawHandle('ne', false, this._drawXW, this._drawY, this._handleLength, this._handleThickness);
            this._drawHandle('sw', false, this._drawX, this._drawYH, this._handleLength, this._handleThickness);

            var halfDrawWidth = this._drawW / 2;
            var halfDrawHeight = this._drawH / 2;
            this._drawHandle('n', false, this._drawX + halfDrawWidth, this._drawY, doubleLength, this._handleThickness);
            this._drawHandle('e', false, this._drawXW, this._drawY + halfDrawHeight, doubleLength, this._handleThickness);
            this._drawHandle('s', false, this._drawX + halfDrawWidth, this._drawYH, doubleLength, this._handleThickness);
            this._drawHandle('w', false, this._drawX, this._drawY + halfDrawHeight, doubleLength, this._handleThickness);
            this._ctx.stroke();
            this._ctx.closePath();

            // Draw border
            this._drawCropBorder();

            // Draw guidelines inside crop
            if (typeof options == 'object' && options.guides === true) {
                this._drawCropGuidelines();
            }
        },


        /**
         * Draw guide lines inside crop
         *
         * @private
         */
        _drawCropGuidelines: function () {
            this._ctx.closePath();
            this._ctx.beginPath();

            if (this._ctx.setLineDash) {
                this._ctx.setLineDash([3, 3]);
            }
            this._ctx.strokeStyle = 'rgba(121, 121, 121, 0.4)';
            this._ctx.lineWidth = 1;

            var stepY = this._drawH / 3,
                stepX = this._drawW / 3;

            // Horizontal line 1
            this._ctx.moveTo(this._drawX, this._drawY + stepY);
            this._ctx.lineTo(this._drawX + this._drawW, this._drawY + stepY);

            // Horizontal line 2
            this._ctx.moveTo(this._drawX, this._drawY + stepY + stepY);
            this._ctx.lineTo(this._drawX + this._drawW, this._drawY + stepY + stepY);

            // Vertical line 1
            this._ctx.moveTo(this._drawX + stepX, this._drawY);
            this._ctx.lineTo(this._drawX + stepX, this._drawY + this._drawH);

            // Horizontal line 2
            this._ctx.moveTo(this._drawX + stepX + stepX, this._drawY);
            this._ctx.lineTo(this._drawX + stepX + stepX, this._drawY + this._drawH);

            this._ctx.stroke();

            if (this._ctx.setLineDash) {
                this._ctx.setLineDash([]);
            }

            this._ctx.closePath();
        },


        /**
         * Draw crop border
         *
         * @private
         */
        _drawCropBorder: function () {
            this._ctx.beginPath();

            this._ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            this._ctx.lineWidth = 1;
            this._ctx.rect(
                this._drawX - 0.5,
                this._drawY - 0.5,
                this._drawW + 1,
                this._drawH + 1
            );

            this._ctx.stroke();
            this._ctx.closePath();
        },


        /**
         * Draw dark areas outside crop area
         *
         * @private
         */
        _drawCropMargins: function () {
            var imgDim = this._parent.getDimensions();

            this._ctx.beginPath();
            this._ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

            this._ctx.rect(
                0,
                0,
                imgDim.w,
                this._drawY
            );

            this._ctx.rect(
                0,
                0,
                this._drawX,
                imgDim.h
            );

            this._ctx.rect(
                this._drawX,
                this._drawYH,
                imgDim.w,
                imgDim.h
            );

            this._ctx.rect(
                this._drawXW,
                this._drawY,
                imgDim.w,
                this._drawH
            );

            this._ctx.fill();
            this._ctx.closePath;
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
        _drawHandle: function (name, active, x, y, length, thickness) {
            var wOffset = thickness / 2;
            var lOffset = length / 2;

            this._ctx.lineWidth = thickness;
            this._ctx.strokeStyle = !active ? this._lineColor : this._lineColorActive;


            switch (name) {
                case 'se':
                    // Just mirror values and fall through to nw
                    wOffset = wOffset * -1;
                    length = length * -1;

                case 'nw':
                    this._ctx.moveTo(x - wOffset, y + length);
                    this._ctx.lineTo(x - wOffset, y - wOffset);
                    this._ctx.lineTo(x + length, y - wOffset);

                    this._handles[name] = [x, y, thickness, length];
                    break;

                case 'sw':
                    // Just mirror values and fall through to ne
                    wOffset = wOffset * -1;
                    length = length * -1;

                case 'ne':
                    this._ctx.moveTo(x - length, y - wOffset);
                    this._ctx.lineTo(x + wOffset, y - wOffset);
                    this._ctx.lineTo(x + wOffset, y + length);

                    this._handles[name] = [x, y, thickness, length];
                    break;

                case 'n':
                    this._ctx.moveTo(x - lOffset, y - wOffset);
                    this._ctx.lineTo(x + lOffset, y - wOffset);
                    break;

                case 's':
                    this._ctx.moveTo(x - lOffset, y + wOffset);
                    this._ctx.lineTo(x + lOffset, y + wOffset);
                    break;

                case 'w':
                    this._ctx.moveTo(x - wOffset, y + lOffset);
                    this._ctx.lineTo(x - wOffset, y - lOffset);
                    break;

                case 'e':
                    this._ctx.moveTo(x + wOffset, y + lOffset);
                    this._ctx.lineTo(x + wOffset, y - lOffset);
                    break;
            }
        }
    });
})();