
// The conductor listens to 'seen' messages, indicating a block has had some kind of contact with
// a device. If given, distance is used to decide which block

// TODO: timeouts for any kind of communication (not just coming from the conductor),
// to demote a non-responsive block

// TODO: Pinging a block/driver, not just a device

var _ = require('underscore');

function Conductor() {

    var client = require('mqtt').createClient(1883, 'localhost', {keepalive: 10000});
    client._publish = client.publish;
    client.publish = function(topic, packet) {
        client._publish(topic, JSON.stringify(packet));
    };

    var log = Log('Conductor');

    client.subscribe('$client/device/+/seen');

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

        if (r[0].block !== active) {
            log.info('Route change for device ' + payload.device + '. Now block ' + r[0].block);

            client.publish('$client/device/' + payload.device + '/route', {
                block: r[0].block
            });

        }

        routes[payload.device] = r;
    }

    client.on('message', function(topic, packet) {
        var payload = JSON.parse(packet);
        if (topic.indexOf('/seen') > -1) {
            onDeviceSeen(payload);
        }

    });
}

module.exports = Conductor;

