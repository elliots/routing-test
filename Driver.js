#!/usr/bin/env node

// This program pretends to be a driver, creating a number of devices that it can
// actuate/ping.

var cfg = require('optimist').default({
        port: 1883,
        host: 'localhost',
        blockId: 'block000' +Math.floor(Math.random()*1000),
        devices: 2,
        driver: 'zigbee',
        maxDistance: 100,
        minDistance: 0
}).argv;

var client = require('mqtt').createClient(cfg.port, cfg.host, {keepalive: 10000});

function log() {
    console.log.apply(console.log, ['Block', cfg.blockId, 'Driver', cfg.driver, '|||'].concat(Array.prototype.slice.call(arguments, 0)));
}

client._publish = client.publish;
client.publish = function(topic, packet) {
    client._publish(topic, JSON.stringify(packet));
};

for (var i = 0; i < cfg.devices; i++) {
    createFakeDevice(cfg.driver + '.00000000' + i, cfg.driver, cfg.blockId);
}

function createFakeDevice(id, driver, block) {

    var deviceTopic = '$client/device/' + id;

    client.subscribe(deviceTopic + '/+');

    var active = false;
    // If a route update for this device lists our block id, we're the active actuation channel.
    function onRoute(route) {
        if (active ^ route.block === block) {
            // Active state has changed

            active = route.block === block;
            log((active?'':'IN') + 'ACTIVE for ' + id);

            if (active) {
                // Acknowledge we are the new active channel.
                client.publish(deviceTopic + '/route/acknowledge', {
                    driver: 'fake-' + driver + '-driver',
                    block: block,
                    device: {
                        G: id,
                        V: 666,
                        D: 1
                    }
                });
            }

        }

    }

    // We only actuate if we are the active channel. Otherwise it's safe to ignore,
    // as a failed actuation by a neighbour should result in a route update then retry.
    function onActuate(data) {
        if (!active) {
            return;
        } else {
            log("Actuating ", id, 'with', data);
        }
    }

    function onPing(payload) {
        pong(payload.pingId);
    }

    client.on('message', function(topic, packet) {
        // ES: Some helper method around this would be nice
        var payload = JSON.parse(packet);
        if (topic.indexOf(deviceTopic) === 0) { // It's related to this device
            topic = topic.substring(deviceTopic.length+1); // Strip the beginning...
            console.log('incoming', topic, payload);

            if (topic === 'route') {
                onRoute(payload);
            } else if (topic === 'actuate') {
                onActuate(payload);
            } else if (topic === 'ping') {
                onPing(payload);
            }
        }
    });

    client.publish(deviceTopic + '/register', {
        driver: 'fake-' + driver + '-driver',
        block: block,
        device: {
            G: id,
            V: 666,
            D: 1
        }
    });

    function pong(pingId) {
         client.publish(deviceTopic + '/seen', {
            driver: driver,
            block: block,
            device: id,
            pingId: pingId,
            distance: Math.floor(Math.random() * (cfg.maxDistance-cfg.minDistance)) + cfg.minDistance
        });
    }

    setInterval(pong, 5000 + (Math.random() * 10000));
}
