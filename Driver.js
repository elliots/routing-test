var _ = require('underscore');

// Pretends to be a driver, creating a number of devices that it can actuate/ping.

var blockId = 0;

function Driver(cfg) {

    cfg = _.extend({
        blockId: 'block000' +(blockId++),
        devices: 2,
        driver: 'zigbee',
        maxDistance: 100,
        minDistance: 0
    }, cfg);

    var log = Log(cfg.driver + ' - ' + cfg.blockId);

    var client = require('mqtt').createClient(1883, 'localhost', {keepalive: 10000});
    client._publish = client.publish;
    client.publish = function(topic, packet) {
        client._publish(topic, JSON.stringify(packet));
    };
    var up;

    this.up = function() {
        if (up) return;
        up = true;
        log.info("✅ UP");

    };

    this.down = function() {
        if (!up) return;
        up = false;
        log.info("⛔ Down");
    };

    this.up();

    for (var i = 0; i < cfg.devices; i++) {
        createFakeDevice(cfg.driver + '.' + i, cfg.driver, cfg.blockId);
    }



    function createFakeDevice(id, driver, block) {

        var deviceTopic = '$client/block/' + block + '/device/' + id;

        client.subscribe(deviceTopic + '/actuate');
        client.subscribe(deviceTopic + '/ping');

        // We only actuate if we are the active channel. Otherwise it's safe to ignore,
        // as a failed actuation by a neighbour should result in a route update then retry.
        function onActuate(data) {
            log.info("Actuating ", id, 'with', data);
        }

        function onPing(payload) {
            pong(payload.pingId);
        }

        client.on('message', function(topic, packet) {
            if (!up) return;

            // ES: Some helper method around this would be nice
            var payload = JSON.parse(packet);
            if (topic.indexOf(deviceTopic) === 0) { // It's related to this device
                topic = topic.substring(deviceTopic.length+1); // Strip the beginning...

                if (topic === 'actuate') {
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
}

module.exports = Driver;
