// Randomly actuates any devices it can see


var _ = require('underscore');
var mqttrpc = require('mqtt-rpc');

function Actuator() {
    var log = Log('Actuator');

    var mqtt = require('mqtt').createClient(1883, 'localhost', {keepalive: 10000});
    var server = mqttrpc.server(mqtt);
    var client = mqttrpc.client(mqtt);

    server.subscribe('$client/device/+/seen', function(payload) {
        if (payload.device && !_.contains(devices, payload.device)) {
            devices.push(payload.device);
            log.trace('Found new device', payload.device);
        }
    });

    var devices = [];

    var actuationId = 0;

    function sendRandomActuation() {
        setTimeout(function() {
            var start = new Date().getTime();
            if (devices.length) {
                var device = _.shuffle(devices)[0];
                log.debug('Sending actuation to', device);

                client.callRemote('$client/device/' + device, 'actuate', {
                    device: device,
                    time: new Date().getTime(),
                    data: 'Howdy ' + actuationId++
                }, function(err, payload){
                    var end = new Date().getTime();
                    if (err) {
                        log.warn('Failed to actuate', device, 'in', end-start + 'ms', '-', err);
                    } else {
                        log.info('Actuated', device, 'in', end-start + 'ms', payload);
                    }
                });
            }

            sendRandomActuation();
        }, Math.random() * 3000);
    }
    sendRandomActuation();

  setTimeout(function() {
   client.callRemote('$client/device/TESTDEVICE', 'actuate', {
                    device: 'TESTDEVICE',
                    time: new Date().getTime(),
                    data: 'Howdy ' + actuationId++
                }, function(err, data){
                    log.info('Actuated TEST DEVICE', 'Error? '+err, data);
                });
}, 1000);
}

module.exports = Actuator;
