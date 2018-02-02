var request = require("request");
var Service, Characteristic;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-stoker", "Stoker", Stoker);
}

function Stoker(log, config) {
    this.log = log;
    this.name = config["name"];
    this.host = config["stoker_address"];
    this.pollingInterval = config["polling_interval"] || 5;
    this.sensors = {};
    this.targets = {};
    this.blowers = {};

    var callback = function(err, value) {
        setTimeout(function() {
            self.getState(callback);
        }, self.pollingInterval * 1000);

        if (err !== null)
            return;
    };
    
    self.init(callback);
}

Stoker.prototype.init = function(callback) {
    this.log("Initializing sensors from Stoker.");

    request.get({
        url: "http://" + this.host + "/stoker.json"
    }, function (err, response, body) {
        if (err || response.statusCode !== 200) {
            var statusCode = response ? response.statusCode : 1;
            this.log("Error getting state (status code %s): %s", statusCode, err);
            return false;
        }

        this.log("Got response from Stoker.");

        var data = JSON.parse(body);

        // loop through the temperature sensors
        data.stoker.sensors.forEach(function(sensorData) {
            // create a temperature sensor service for each temperature sensor
            this.log("Creating TemperatureSensor: " + sensorData.name);
            this.sensors[sensorData.name] = new Service.TemperatureSensor(sensorData.name);
            
            // create a "target" occupancy sensor for when the temperature sensor reaches
            // its target temperature
            this.log("Creating OccupancySensor (target): " + sensorData.name);
            this.targets[sensorData.name] = new Service.OccupancySensor(sensorData.name);
        }.bind(this));
        
        // loop through the blowers
        data.stoker.blowers.forEach(function(blowerData) {
            // create a blower occupancy sensor for when the blower is engaged
            this.log("Creating OccupancySensor (blower): " + blowerData.name);
            this.blowers[blowerData.name] = new Service.OccupancySensor(blowerData.name);
        }.bind(this));

        callback();
    }.bind(this));
    
}

Stoker.prototype.getState = function(callback) {
    this.log("Getting current state...");

    request.get({
        url: "http://" + this.host + "/stoker.json"
    }, function (err, response, body) {
        if (err || response.statusCode !== 200) {
            var statusCode = response ? response.statusCode : 1;
            this.log("Error getting state (status code %s): %s", statusCode, err);
            callback(err);
            return;
        }
        
        var data = JSON.parse(body);
        
        this.log('Received state from Stoker');

        // loop through the temperature sensors
        data.stoker.sensors.forEach(function(sensorData) {
            // update sensor service current temperature
            this.log("Updating TemperatureSensor (" + sensorData.name + ") -> " + sensorData.tc);
            this.sensors[sensorData.name]
                .getCharacteristic(Characteristic.CurrentTemperature)
                .updateValue(sensorData.tc, null);
            
            // update the target occupancy service to reflect the alarm state
            this.log("Updating OccupancySensor (" + sensorData.name + ") -> " + (sensorData.al != 0));
            this.targets[sensorData.name]
                .getCharacteristic(Characteristic.OccupancyDetected)
                .updateValue(sensorData.al != 0);
        }.bind(this));
        
        // loop through the blowers
        data.stoker.blowers.forEach(function(blowerData) {
            // update the blower occupancy service to reflect the blower state
            this.log("Updating OccupancySensor (" + blowerData.name + ") -> " + (blowerData.on == 1));
            this.blowers[blowerData.name]
                .getCharacteristic(Characteristic.OccupancyDetected)
                .updateValue(blowerData.on == 1);
        }.bind(this));

        callback(null, true);

    }.bind(this));
}

Stoker.prototype.getServices = function () {
    var services = [];
    for (key in this.sensors)
        services.push(this.sensors[key]);
    for (key in this.targets)
        services.push(this.targets[key]);
    for (key in this.blowers)
        services.push(this.blowers[key]);
    return services;
}
