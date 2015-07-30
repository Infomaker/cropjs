var Hapi = require('hapi');
var Path = require('path');


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


// Start the server
server.start();