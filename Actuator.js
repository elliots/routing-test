// Randomly actuates any devices it can see

var _ = require('underscore');

var cfg = require('optimist').default({
        port: 1883,
        host: 'localhost'
}).argv;

var client = require('mqtt').createClient(cfg.port, cfg.host, {keepalive: 10000});

client.subscribe('$client/device/+/seen');

client.on('message', function(topic, packet) {
    console.log('Actuator - Message on ' + topic);
});


