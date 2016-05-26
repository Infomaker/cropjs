(function(IMSoftcrop) {
    /**
     * Base object constructor
     * @constructor
     */
    IMSoftcrop.Base = function(){};
    IMSoftcrop.Base.prototype = {};


    /**
     * Shape constructor
     * @constructor
     *
     * @param {string} id
     * @param {object} parent
     */
    IMSoftcrop.Shape = function(id, parent) {
        if (typeof obj == 'undefined') {
            return;
        }
        
        this.id = id;

        // Get access to canvas helper object
        this.parent = parent;

        var obj = parent;
        do {
            if (obj instanceof IMSoftcrop.Editor) {
                this.editor = obj;
                break;
            }
            obj = obj.parent;
        } while (typeof obj != 'undefined');


        // Get actual canvas and context for drawing
        var canvas = this.editor.getCanvas();
        if (!canvas || canvas.tagName != 'CANVAS') {
            throw new TypeError('Canvas required');
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    };


    /**
     * IMSoftcrop.Shape prototype
     */
    IMSoftcrop.Shape.prototype = Object.create(
        IMSoftcrop.Base.prototype,
        {
            id: {
                writable: true
            },

            //References
            editor: {
                writable: true
            },

            parent: {
                writable: true
            },

            canvas: {
                writable: true
            },

            ctx: {
                writable: true
            },


            //State
            _ready: {
                value: false,
                writable: true
            },

            ready: {
                get: function () {
                    return this._ready;
                },
                set: function (value) {
                    this._ready = (value === true);
                }
            },


            // All position properties
            x: {
                value: 0,
                writable: true
            },

            y: {
                value: 0,
                writable: true
            },

            w: {
                value: 0,
                writable: true
            },

            h: {
                value: 0,
                writable: true
            },

            drawX: {
                value: 0,
                writable: true
            },

            drawY: {
                value: 0,
                writable: true
            },

            drawW: {
                value: 0,
                writable: true
            },

            drawH: {
                value: 0,
                writable: true
            },

            drawXW: {
                value: 0,
                writable: true
            },

            drawYH: {
                value: 0,
                writable: true
            },


            getCanvas: {
                value: function () {
                    return this.canvas;
                }
            },

            inArea: {
                value: function (point) {
                    if (!this.ready) {
                        return false;
                    }

                    return this.inCalculatedArea(
                        point,
                        this.drawX,
                        this.drawY,
                        this.drawW,
                        this.drawH
                    );
                }
            },

            withinCoordinates: {
                value: function (point, x1, y1, x2, y2) {
                    if (point.x < x1 || point.x > x2) {
                        return false;
                    }

                    if (point.y < y1 || point.y > y2) {
                        return false;
                    }

                    return true;
                }
            },

            inCalculatedArea: {
                value: function (point, ax, ay, aw, ah) {
                    if (point.x >= ax && point.x <= ax + aw) {
                        if (point.y >= ay && point.y <= ay + ah) {
                            return true;
                        }
                    }
                    return false;
                }
            },

            move: {
                value: function (point) {
                    this.x += Math.round(point.x);
                    this.y += Math.round(point.y);
                }
            },

            getCoordinates: {
                value: function () {
                    return {
                        x: this.x,
                        y: this.y
                    };
                }
            },

            /**
             * Return crop coordinates and dimensions
             * @returns {{x: *, y: *, w: *, h: *}}
             */
            getDimensions: {
                value: function () {
                    return {
                        x: this.x,
                        y: this.y,
                        w: this.w,
                        h: this.h
                    };
                }
            },

            /**
             * Calcuate actual drawing coordinates and dimensions taking
             * zoom level and factor into account.
             *
             * @param offset
             * @private
             */
            getDimensionsInCanvas: {
                value: function (offset) {
                    if (typeof offset == 'undefined') {
                        offset = {x: 0, y: 0};
                    }

                    var dim = this.editor.getDimensions();
                    var zoomLevel = this.editor.getZoom(true);

                    this.drawW = Math.round(this.w * zoomLevel);
                    this.drawH = Math.round(this.h * zoomLevel);
                    this.drawX = Math.round((this.x + offset.x) * zoomLevel) + dim.margin;
                    this.drawY = Math.round((this.y + offset.y) * zoomLevel) + dim.margin;
                    this.drawXW = this.drawX + this.drawW;
                    this.drawYH = this.drawY + this.drawH;
                }
            }
        }
    );

    // Add constructor
    IMSoftcrop.Shape.prototype.constructor = IMSoftcrop.Shape;
})(IMSoftcrop);
