(function(){
    var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

    // The base Class implementation (does nothing)
    this.Class = function(){};

    // Create a new Class that inherits from this class
    Class.extend = function(prop) {
        var _super = this.prototype;

        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        var prototype = new this();
        initializing = false;

        // Copy the properties over onto the new prototype
        for (var name in prop) {
            // Check if we're overwriting an existing function
            prototype[name] = typeof prop[name] == "function" &&
            typeof _super[name] == "function" && fnTest.test(prop[name]) ?
                (function(name, fn){
                    return function() {
                        var tmp = this._super;

                        // Add a new ._super() method that is the same method
                        // but on the super-class
                        this._super = _super[name];

                        // The method only need to be bound temporarily, so we
                        // remove it when we're done executing
                        var ret = fn.apply(this, arguments);
                        this._super = tmp;

                        return ret;
                    };
                })(name, prop[name]) :
                prop[name];
        }

        // The dummy class constructor
        function Class() {
            // All construction is actually done in the init method
            if ( !initializing && this._construct )
                this._construct.apply(this, arguments);
        }

        // Populate our constructed prototype object
        Class.prototype = prototype;

        // Enforce the constructor to be what we expect
        Class.prototype.constructor = Class;

        // And make this class extendable
        Class.extend = arguments.callee;

        return Class;
    };
})();


var IMCropObject = Class.extend({
    _cropCanvas: undefined,
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

    _construct: function(parent) {
        // Get access to canvas helper object
        var obj = parent;
        do {
            if (obj instanceof IMCropCanvas) {
                this._cropCanvas = obj;
                break;
            }
            obj = obj._parent;
        } while(typeof obj != 'undefined');

        // Get actual canvas for drawing
        var canvas = this._cropCanvas.getCanvas();
        if (!canvas || canvas.tagName != 'CANVAS') {
            throw new TypeError('Canvas required');
        }

        this._parent = parent;
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
    },

    isReady: function(isReady) {
        if (isReady === true || isReady === false) {
            this._ready = isReady;
        }

        return this._ready;
    },

    getCanvas: function() {
        return this._canvas;
    },

    inArea: function(point) {
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

    inCalculatedArea: function(point, ax, ay, aw, ah) {
        if (point.x >= ax && point.x <= ax + aw) {
            if (point.y >= ay && point.y <= ay + ah) {
                return true;
            }
        }
        return false;
    },

    move: function(point) {
        this._x += Math.round(point.x);
        this._y += Math.round(point.y);
    },

    getCoordinates: function() {
        return {
            x: this._x,
            y: this._y
        };
    },

    /**
     * Return crop coordinates and dimensions
     * @returns {{x: *, y: *, w: *, h: *}}
     */
    getDimensions: function() {
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
     * @todo Implement support for offsets used when zoom different areas
     *
     * @param zoomLevel
     * @param offset
     * @private
     */
    _calculateDrawDimensions: function(zoomLevel, offset) {
        var dim = this._cropCanvas.getDimensions();

        this._drawW = Math.round(this._w * zoomLevel);
        this._drawH = Math.round(this._h * zoomLevel);
        this._drawX = Math.round((this._x + offset.x) * zoomLevel) + dim.margin;
        this._drawY = Math.round((this._y + offset.y) * zoomLevel) + dim.margin;
    }
});
