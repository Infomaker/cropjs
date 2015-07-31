var Hapi = require('hapi');
var Path = require('path');
var UploadHandler = require('./handlers/upload');

var server = new Hapi.Server({
    connections: {
        routes: {
            files: {
                relativeTo: Path.join(__dirname, 'htdocs')
            }
        }
    }
});

server.connection({
    host: 'localhost',
    port: 8000
});


// Default route
server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
        directory: {
            path: './',
            index: true
        }
    }
});

// CropJS route
server.route({
    method: 'GET',
    path: '/cropjs/{param*}',
    handler: {
        directory: {
            path: './../../build/',
            index: true
        }
    }
});

// Uploaded files route
server.route({
    method: 'GET',
    path: '/uploads/{param*}',
    handler: {
        directory: {
            path: './../uploads/',
            index: true
        }
    }
});

// Upload file route
server.route({
    method: 'POST',
    path: '/upload',
    config: {
        payload: {
            output: 'stream',
            parse: true,
            allow: 'multipart/form-data'
        },
        handler: function (request, reply) {
            if (request.payload.imageinput) {
                var uploadHandler = new UploadHandler(
                    'uploads',
                    function(data) {
                        reply(JSON.stringify(data));
                    },
                    function(err) {
                        reply(JSON.stringify(err));
                    }
                );

                uploadHandler.handle(
                    request.payload['imageinput']
                );
            }
        }
    }
});

// Start the server
server.start(function() {
    console.log('Info', 'Server running at <' + server.info.uri + '>');
});