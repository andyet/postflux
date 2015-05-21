var Postflux = require('./controllers/postflux');

exports.register = function (plugin, options, done) {

    plugin.bind({
        db: options.db
    });

    plugin.route({ method: 'post', path: '/postflux', config: Postflux.create});

    done();
};

exports.register.attributes = { pkg: require('./package.json') };
