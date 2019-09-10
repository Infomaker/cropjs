var Hapi = require('hapi');
var Path = require('path');
var UploadHandler = require('./handlers/upload');

const start = async () => {
    const server = new Hapi.Server({
        port: 8000,
        host: 'localhost',
        routes: {
            files: {
                relativeTo: Path.join(__dirname, 'htdocs')
            }
        }
    });

    await server.register(require('inert'));

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
                path: './../../dist/',
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
            handler: function(request, h) {
                if (request.payload.imageinput) {
                    const promise = new Promise((resolve, reject) => {
                        const uploadHandler = new UploadHandler(
                            'uploads',
                            function(data) {
                                resolve(JSON.stringify(data));
                            },
                            function(err) {
                                reject(JSON.stringify(err));
                            }
                        )

                        uploadHandler.handle(
                            request.payload['imageinput']
                        )
                    })

                    return promise
                }
            }
        }
    });

    await server.start();

    console.log('Server running at:', server.info.uri);
}

start();