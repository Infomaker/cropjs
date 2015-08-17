var fs = require('fs');
var Hapi = require('hapi');

/**
 * File upload handler
 * @param cbUpload
 * @param cbError
 * @param directoryName
 */
var uploadHandler = function(directoryName, cbUpload, cbError) {
    this.directory = directoryName;
    this.name = '';
    this.localPath = '';
    this.virtualPath = '';
    this.onUpload = cbUpload;
    this.onError = cbError;
};

module.exports = uploadHandler;



/**
 * Handle file upload to
 * @param fileElement
 */
uploadHandler.prototype.handle = function(fileElement) {
    if (fileElement) {
        var _this = this;
        this.name = fileElement.hapi.filename;
        this.localPath = __dirname + "/../" + this.directory + "/" + this.name;
        this.virtualPath = '/' + this.directory + '/' + this.name;

        try {
            var fd = fs.createWriteStream(this.localPath);
            fd.on('error', function (err) {
                console.log('Error: ' + err);
                _this.onError(err);
            });

            fileElement.pipe(fd);
            fileElement.on('end', function () {
                _this.onUpload(_this.respond());
            });
        }
        catch(ex) {
            console.log('Exception: ' + ex);
            _this.onError(ex);
        }
    }
};


/**
 * Respond
 * @returns {{name: *, filename: *, path: *, headers: *}}
 */
uploadHandler.prototype.respond = function() {
    return {
        name: this.name,
        src: this.virtualPath
    };
};
