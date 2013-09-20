var log4js = require('log4js');
var _ = require('underscore');

Log = function(name) {
    return log4js.getLogger(name);
};

var log = Log('Routing Test');

log.warn("Make sure an MQTT server is running at localhost:1883!");

// Start Conductor
new require('./Conductor')();

var Driver = require('./Driver');

var drivers = [];

drivers.push(new Driver({
    blockId: 'LoungeRoom',
    driver: 'zigbee',
    devices: 5,
    minDistance: 10,
    maxDistance: 100
}));

drivers.push(new Driver({
    blockId: 'Kitchen',
    driver: 'zigbee',
    devices: 4,
    minDistance: 0,
    maxDistance: 70
}));

drivers.push(new Driver({
    blockId: 'Upstairs',
    driver: 'zigbee',
    devices: 3,
    minDistance: 0,
    maxDistance: 50
}));

// Chaos monkey
function messWithADriver() {
    setTimeout(function() {
        var driver = _.shuffle(drivers)[0];
        Math.random() > 0.5 ? driver.up() : driver.down();
        messWithADriver();
    }, Math.random() * 3000);
}
messWithADriver();

// Start the actuator
new require('./Actuator')();
