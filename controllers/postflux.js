var joi = require('joi');

module.exports = {
    create: {
        handler: function (request, reply) {
            this.db.query("SELECT influx_post($1::json) AS count", [JSON.stringify(request.payload)], function (err, result) {
                var count = '';
                if (result && result.rows && result.rows.length > 0) {
                    count = result.rows[0].count;
                }
                reply(err, {count: count}).code(201);
            });
        },
        validate: {
        }
    }
}
