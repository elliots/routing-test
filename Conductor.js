
// The conductor listens to 'seen' messages, indicating a block has had some kind of contact with
// a device. If given, a


// TODO: timeouts for any kind of communication (not just coming from the conductor),
// to demote a non-responsive block

// TODO: Pinging a block/driver, not just a device

// Li

var _ = require('underscore');

var cfg = require('optimist').default({
        port: 1883,
        host: 'localhost'
}).argv;

var client = require('mqtt').createClient(cfg.port, cfg.host, {keepalive: 10000});
client._publish = client.publish;
client.publish = function(topic, packet) {
    client._publish(topic, JSON.stringify(packet));
};

function log() {
    console.log.apply(console.log, ['Conductor'].concat(Array.prototype.slice.call(arguments, 0)));
}

client.subscribe('$client/device/+/seen');
client.subscribe('$client/device/+/route/acknowledge');

var routes = {};

var ackTimeouts = {};

function onDeviceSeen(payload) {

    log('Got device seen', payload);

    var r = routes[payload.device] || [];

    var active = r.length? r[0].block : null;

    console.log(_(r).filter(function(route) {
        return route.block !== payload.block;
    }).push(payload));

    r = _(r).filter(function(route) {
        return route.block !== payload.block;
    });

    r.push(payload);
    r = _.sortBy(r, 'distance');

    log('Routes are now', r);

    if (r[0].block !== active) {
        client.publish('$client/device/' + payload.device + '/route', {
            block: r[0].block
        });

        ackTimeouts[payload.device] = {
            timeout: setTimeout(function() {
                log('Didnt receive ack from ' + r[0].block + ' for route change on ' + payload.device);
            }, 5000),
            block: r[0].block
        };
    }

    routes[payload.device] = r;
}

function onAcknowledge(payload) {
    log.debug('Got ack', payload);


}

client.on('message', function(topic, packet) {
    var payload = JSON.parse(packet);
    if (topic.indexOf('/seen') > -1) {
        onDeviceSeen(payload);
    } else {
        // It's a route ack
        onAcknowlege(payload);
    }

});


