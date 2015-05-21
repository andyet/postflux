var config = require('getconfig');
var pg = require('pg');
var lab = exports.lab = require('lab').script();
var Hapi = require('hapi');
var util = require('util');
var code = require('code');

var client = new pg.Client(config.db);
client.connect();

var server;

lab.experiment('debug-post', function () {

    lab.before(function (done) {
        server = new Hapi.Server();
        server.connection(config.server);

        server.register([
            {
                register: require('../index'),
                options: { db: client }
            },
            {
                register: require('pgboom'),
                options: { getNull404: true }
            }
        ], function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    lab.test('can post log', function (done) {
        server.inject({
            method: 'post',
            url: '/postflux',
            payload: JSON.stringify([
              {
                "name": "log_lines",
                "columns": ["time", "sequence_number", "line"],
                "points": [
                  [1400425947368, 1, "this line is first"],
                  [1400425947368, 2, "and this is second"]
                ]
              }
            ])
        }, function (res) {
            code.expect(res.statusCode).to.equal(201);
            var pl = JSON.parse(res.payload);
            code.expect(pl.count).to.equal(2);
            client.query('SELECT * from log_lines', function (err, results) {
                code.expect(results.rows).array();
                code.expect(results.rows.length).to.equal(2);
                done();
            });
        });
    });
    lab.test('can post multiple', function (done) {
        server.inject({
            method: 'post',
            url: '/postflux',
            payload: JSON.stringify([
              {
                "name": "log_lines2",
                "columns": ["time", "sequence_number", "line"],
                "points": [
                  [1400425947368, 1, "this line is first"],
                  [1400425947368, 2, "and this is second"]
                ]
              },
              {
                "name": "log_lines3",
                "columns": ["time", "sequence_number", "line"],
                "points": [
                  [1400425947368, 1, "this line is first"],
                  [1400425947368, 2, "and this is second"]
                ]
              }
            ])
        }, function (res) {
            code.expect(res.statusCode).to.equal(201);
            var pl = JSON.parse(res.payload);
            code.expect(pl.count).to.equal(4);
            client.query('SELECT * from log_lines2', function (err, results) {
                code.expect(results.rows).array();
                code.expect(results.rows.length).to.equal(2);
                client.query('SELECT * from log_lines3', function (err, results) {
                    code.expect(results.rows).array();
                    code.expect(results.rows.length).to.equal(2);
                    done();
                });
            });
        });
    });

    lab.after(function (done) {
        client.query('DROP TABLE log_lines', function (err, results) {
            client.query('DROP TABLE log_lines2', function (err, results) {
                client.query('DROP TABLE log_lines3', function (err, results) {
                    done();
                });
            });
        });
    });
});
