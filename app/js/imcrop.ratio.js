(function() {
    IMSoftcrop.Ratio = function(){};

    /**
     * Return ratio in decimal form (height / width)
     * @param width
     * @param height
     * @returns {number}
     */
    IMSoftcrop.Ratio.decimal = function(width, height) {
        return height / width;
    };

    /**
     * Return height based on width and ratio
     * @param width
     * @param ratio
     * @returns {number}
     */
    IMSoftcrop.Ratio.height = function(width, ratio) {
        return Math.round(width * ratio);
    };

    /**
     * Return width based on height and ratio
     * @param height
     * @param ratio
     * @returns {number}
     */
    IMSoftcrop.Ratio.width = function(height, ratio) {
        return Math.round(height / ratio);
    };


    /**
     * Return true x,y offset of dom element
     * @param e
     * @returns {{x: number, y: number}}
     */
    IMSoftcrop.Ratio.getElementPosition = function(e) {
        var xoffset = 0,
            yoffset = 0;

        while(e) {
            xoffset += (e.offsetLeft - e.scrollLeft + e.clientLeft);
            yoffset += (e.offsetTop - e.scrollTop + e.clientTop);
            e = e.offsetParent;
        }

        return {
            x: xoffset,
            y: yoffset
        };
    };



    /**
     * Calculate a 32 bit FNV-1a hash
     * Found here: https://gist.github.com/vaiorabbit/5657561
     * Ref.: http://isthe.com/chongo/tech/comp/fnv/
     *
     * Used to create unique ids for elements
     *
     * @param {string} str the input value
     * @param {string} [seed] optionally pass the hash of the previous chunk
     * @returns {string}
     */
    IMSoftcrop.Ratio.hashFnv32a = function(str, seed) {
        var i, l,
            hval = (seed === undefined) ? 0x811c9dc5 : seed;

        for (i = 0, l = str.length; i < l; i++) {
            hval ^= str.charCodeAt(i);
            hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
        }

        return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
    };

    /**
     * Get area 1 coverage of area 2
     *
     * @param w1
     * @param h1
     * @param w2
     * @param h2
     */
    IMSoftcrop.Ratio.areaCoverage = function(w1, h1, w2, h2) {
        return Math.round(100 * (w1 * h1) / (w2 * h2));
    };

})();