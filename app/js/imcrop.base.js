(function() {
    IMSoftcrop.Base = Class.extend({
        _editor: undefined,
        _parent: undefined,
        _canvas: undefined,
        _ctx: undefined,
        _ready: false,

        _x: 0,
        _y: 0,
        _w: 0,
        _h: 0,

        _drawX: 0,
        _drawY: 0,
        _drawW: 0,
        _drawH: 0,
        _drawXW: 0,
        _drawYH: 0,

        _construct: function (parent) {
            // Get access to canvas helper object
            var obj = parent;
            do {
                if (obj instanceof IMSoftcrop.Editor) {
                    this._editor = obj;
                    break;
                }
                obj = obj._parent;
            } while (typeof obj != 'undefined');

            // Get actual canvas for drawing
            var canvas = this._editor.getCanvas();
            if (!canvas || canvas.tagName != 'CANVAS') {
                throw new TypeError('Canvas required');
            }

            this._parent = parent;
            this._canvas = canvas;
            this._ctx = canvas.getContext('2d');
        },

        isReady: function (isReady) {
            if (isReady === true || isReady === false) {
                this._ready = isReady;
            }

            return this._ready;
        },

        getCanvas: function () {
            return this._canvas;
        },

        inArea: function (point) {
            if (!this.isReady()) {
                return false;
            }


            return this.inCalculatedArea(
                point,
                this._drawX,
                this._drawY,
                this._drawW,
                this._drawH
            );
        },

        withinCoordinates: function (point, x1, y1, x2, y2) {
            if (point.x < x1 || point.x > x2) {
                return false;
            }

            if (point.y < y1 || point.y > y2) {
                return false;
            }

            return true;
        },

        inCalculatedArea: function (point, ax, ay, aw, ah) {
            if (point.x >= ax && point.x <= ax + aw) {
                if (point.y >= ay && point.y <= ay + ah) {
                    return true;
                }
            }
            return false;
        },

        move: function (point) {
            this._x += Math.round(point.x);
            this._y += Math.round(point.y);
        },

        getCoordinates: function () {
            return {
                x: this._x,
                y: this._y
            };
        },

        /**
         * Return crop coordinates and dimensions
         * @returns {{x: *, y: *, w: *, h: *}}
         */
        getDimensions: function () {
            return {
                x: this._x,
                y: this._y,
                w: this._w,
                h: this._h
            };
        },

        /**
         * Calcuate actual drawing coordinates and dimensions taking
         * zoom level and factor into account.
         *
         * @param offset
         * @private
         */
        getDimensionsInCanvas: function (offset) {
            if (typeof offset == 'undefined') {
                offset = {x: 0, y: 0};
            }

            var dim = this._editor.getDimensions();
            var zoomLevel = this._editor.getZoom(true);

            this._drawW = Math.round(this._w * zoomLevel);
            this._drawH = Math.round(this._h * zoomLevel);
            this._drawX = Math.round((this._x + offset.x) * zoomLevel) + dim.margin;
            this._drawY = Math.round((this._y + offset.y) * zoomLevel) + dim.margin;
            this._drawXW = this._drawX + this._drawW;
            this._drawYH = this._drawY + this._drawH;
        },

        getPointInCanvas: function (x, y, offset) {
            if (typeof offset == 'undefined') {
                offset = {x: 0, y: 0};
            }

            var dim = this._editor.getDimensions();
            var zoomLevel = this._editor.getZoom(true);

            return {
                x: Math.round((x + offset.x) * zoomLevel) + dim.margin,
                y: Math.round((y + offset.y) * zoomLevel) + dim.margin
            };
        },

        getPointInImage: function (x, y, offset) {
            if (typeof offset == 'undefined') {
                offset = {x: 0, y: 0};
            }

            var zoomLevel = this._editor.getZoom(true);

            return {
                x: Math.round((x - offset.x) / zoomLevel),
                y: Math.round((y - offset.y) / zoomLevel)
            };
        }
    });
})();