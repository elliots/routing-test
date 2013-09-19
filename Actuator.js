// Randomly actuates any devices it can see


var _ = require('underscore');

function Actuator() {
    var log = Log('Actuator');

    var client = require('mqtt').createClient(1883, 'localhost', {keepalive: 10000});
    client._publish = client.publish;
    client.publish = function(topic, packet) {
        client._publish(topic, JSON.stringify(packet));
    };

    client.subscribe('$client/device/+/seen');

    var devices = [];

    client.on('message', function(topic, packet) {
        var payload = JSON.parse(packet);

        if (!_.contains(devices, payload.device)) {
            devices.push(payload.device);
            log.trace('Found new device', payload.device);
        }
    });

    var actuationId = 0;

    function sendRandomActuation() {
        setTimeout(function() {
            if (devices.length) {
                var device = _.shuffle(devices)[0];
                log.info('Actuating', device);

                client.publish('$client/device/' + device + '/actuate', {
                    time: new Date().getTime(),
                    data: 'Howdy ' + actuationId++
                });
            }

            sendRandomActuation();
        }, Math.random() * 3000);
    }
    sendRandomActuation();

}

module.exports = Actuator;
