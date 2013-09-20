var _ = require('underscore');
var mqttrpc = require('mqtt-rpc');

// Pretends to be a driver, creating a number of devices that it can actuate/ping.

var DEVICE_NAMES = ['Handbag', 'Cat', 'Umbrella', 'Keys', 'Xbox'];

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

    var mqtt = require('mqtt').createClient(1883, 'localhost', {keepalive: 10000});

    var server = mqttrpc.server(mqtt);
    var client = mqttrpc.client(mqtt);

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
        createFakeDevice(DEVICE_NAMES[i], cfg.driver, cfg.blockId);
    }


    function createFakeDevice(id, driver, block) {

        var deviceTopic = '$client/block/' + block + '/device/' + id;

        server.provide(deviceTopic, 'actuate', function (payload, cb) {
          log.info("Actuating ", id, 'with', payload.data);
          cb(null, new Date());
        });

        server.provide(deviceTopic, 'ping', function (payload, cb) {
          log.info("Ping! ", id);
          cb(null, new Date());
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

        function seen(pingId) {
             client.publish(deviceTopic + '/seen', {
                driver: driver,
                block: block,
                device: id,
                pingId: pingId,
                distance: Math.floor(Math.random() * (cfg.maxDistance-cfg.minDistance)) + cfg.minDistance
            });
        }

        setInterval(seen, 5000 + (Math.random() * 10000));
    }
}

module.exports = Driver;
