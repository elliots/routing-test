
// The conductor listens to 'seen' messages, indicating a block has had some kind of contact with
// a device. If given, distance is used to decide which block should be used to actuate.

// TODO: timeouts for any kind of communication (not just coming from the conductor),
// to demote a non-responsive block

// TODO: Pinging a block/driver, not just a device

var _ = require('underscore');
var _s = require('underscore.string');

function Conductor() {

    var client = require('mqtt').createClient(1883, 'localhost', {keepalive: 10000});
    client._publish = client.publish;
    client.publish = function(topic, packet) {
        client._publish(topic, JSON.stringify(packet));
    };

    var log = Log('Conductor');

    client.subscribe('$client/block/+/device/+/seen');
    client.subscribe('$client/device/+/actuate');

    var routes = {};

    var ackTimeouts = {};

    function onDeviceSeen(payload) {

        var r = routes[payload.device] || [];

        var active = r.length? r[0].block : null;

        r = _(r).filter(function(route) {
            return route.block !== payload.block;
        });

        r.push(payload);
        r = _.sortBy(r, 'distance');

        routes[payload.device] = r;
    }

    function onActuate(payload) {
        if (routes[payload.device].length === 0) {
            log.warn('Could not actuate! No routes to ', payload.device);
        } else {
            var route = routes[payload.device][0];
            log.info('Actuating ', payload.device, 'via', route.block);
            client.publish('$client/block/' + route.block + '/device/' + payload.device + '/actuate', payload);
        }
    }

    client.on('message', function(topic, packet) {
        var payload = JSON.parse(packet);
        if (_s.endsWith(topic, '/seen')) {
            onDeviceSeen(payload);
            // Retransmit seen messages to device id
            client.publish('$client/device/' + payload.device + '/seen', payload);
        } else {
            onActuate(payload);
        }

    });
}

module.exports = Conductor;

