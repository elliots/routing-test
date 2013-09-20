
// The conductor listens to 'seen' messages, indicating a block has had some kind of contact with
// a device. If given, distance is used to decide which block should be used to actuate.

// TODO: timeouts for any kind of communication (not just coming from the conductor),
// to demote a non-responsive block

// TODO: Pinging a block/driver, not just a device

var _ = require('underscore');
var _s = require('underscore.string');
var mqttrpc = require('mqtt-rpc');

function Conductor() {

    var mqtt = require('mqtt').createClient(1883, 'localhost', {keepalive: 10000});
    var server = mqttrpc.server(mqtt);
    var client = mqttrpc.client(mqtt);

    var log = Log('Conductor');

    var routes = {};

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

    server.provide('$client/device/+', 'actuate', function (payload, cb) {
        if (!routes[payload.device] || routes[payload.device].length === 0) {
            cb('No routes to device', new Date());
        } else {
            var route = routes[payload.device][0];
            log.debug('Actuating', payload.device, 'via', route.block);
            client.callRemote('$client/block/' + route.block + '/device/' + payload.device, 'actuate', payload, cb);
        }
    });

    server.subscribe('$client/block/+/device/+/seen', function(payload) {
        onDeviceSeen(payload);
        // Retransmit seen messages to device id
        client.publish('$client/device/' + payload.device + '/seen', payload);
    });

}

module.exports = Conductor;

