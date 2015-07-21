(function() {
    IMSoftcrop.Ratio = function(){};

    IMSoftcrop.Ratio.decimal = function(width, height) {
        return height / width;
    };

    IMSoftcrop.Ratio.height = function(width, ratio) {
        return Math.round(width * ratio);
    };

    IMSoftcrop.Ratio.width = function(height, ratio) {
        return Math.round(height / ratio);
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