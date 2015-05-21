var config = require('getconfig');
var pg = require('pg');
var hapi = require('hapi');

var server = new hapi.Server();
server.connection(config.server);
var client = new pg.Client(config.db);

var plugins = [
    {
        register: require('good'),
        options: {
            reporters: [
                {   
                    reporter: require('good-console'),
                    events: {log: '*', response: '*'}
                }
            ]
        }
    },
    {
        register: require('./index'),
        options: {
            db: client
        }
    },
    {
        register: require('pgboom'), 
        options: {
            getNull404: true
        }
    }
];

if (config.isDev) {
    plugins.push({
        register: require('lout'),
        options: {}
    });
}

server.register(plugins, function (err) {
    if (err) {
        server.log(['error'], 'Failed to require plugins');
        server.log(['error'], err.message);
        throw err;
    }
    server.log(['startup'], 'Loaded plugins');
    client.connect(function (dberr) {
        if (err) {
            server.log(['error'], 'Failed to connect to db');
            throw err;
        }
        server.start(function (err) {
            if (err) {
                server.log(['error'], 'Failed to start hapi http');
                throw err;
            }
            server.log(['info', 'startup'], 'Server is running on: ' + server.info.uri);
        })
    });
});
