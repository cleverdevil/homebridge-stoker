var request = require("request");
var Service, Characteristic, HAPServer;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    HAPServer = homebridge.hap.HAPServer;

    homebridge.registerAccessory("homebridge-stoker", "Stoker", Stoker);
}

function Stoker(log, config) {
    this.log = log;
    this.name = config["name"];
    this.host = config["stoker_address"];
    this.pollingInterval = config["polling_interval"] || 5;

    // init sensors, targets, and blowers
    this.sensors = {};
    this.targets = {};
    this.blowers = {};
    this.init(config.sensors, config.blowers);
    
    var self = this;
    var callback = function() {
        setTimeout(function() {
            self.getState(callback);
        }, self.pollingInterval * 1000);
    };
    
    this.getState(callback);
}

Stoker.prototype.init = function(sensorsData, blowersData) {
    this.log("Initializing services from configuration.");

    // loop through the temperature sensors
    sensorsData.forEach(function(sensorData) {
        // create a temperature sensor service for each temperature sensor
        this.log("Creating TemperatureSensor: " + sensorData.name);
        this.sensors[sensorData.name] = new Service.TemperatureSensor(sensorData.name, sensorData.name);
        this.sensors[sensorData.name]
            .getCharacteristic(Characteristic.CurrentTemperature)
            .setProps({ minValue: 0, maxValue: 400 });
        
        // create a "target" occupancy sensor for when the temperature sensor reaches
        // its target temperature
        this.log("Creating OccupancySensor (target): " + sensorData.name);
        this.targets[sensorData.name] = new Service.OccupancySensor(sensorData.name + " Alarm", sensorData.name);
    }.bind(this));
        
    // loop through the blowers
    blowersData.forEach(function(blowerData) {
        // create a blower occupancy sensor for when the blower is engaged
        this.log("Creating OccupancySensor (blower): " + blowerData.name);
        this.blowers[blowerData.name] = new Service.OccupancySensor(blowerData.name, blowerData.name);
    }.bind(this));
    
    this.log("Services initiualized with " + 
             Object.keys(this.sensors).length + 
             " sensor(s) and " + 
             Object.keys(this.blowers).length +
             " blower(s).");
}

Stoker.prototype.fahrenheitToCelsius = function(temperature) {
    return (temperature - 32) / 1.8;
}

Stoker.prototype.getState = function(callback) {
    this.log("Getting current state...");

    request.get({
        url: "http://" + this.host + "/stoker.json",
        timeout: 5000
    }, function (err, response, body) {
        if (err || response.statusCode !== 200) {
            var statusCode = response ? response.statusCode : 1;
            this.log("Error getting state. Stoker may be inactive."); 
            
            var error = new Error(HAPServer.Status.SERVICE_COMMUNICATION_FAILURE);

            Object.keys(this.sensors).forEach(function(sensorName) {
                this.sensors[sensorName]
                    .getCharacteristic(Characteristic.CurrentTemperature)
                    .updateValue(error);
            }.bind(this));

            Object.keys(this.targets).forEach(function(targetName) {
                this.targets[targetName]
                    .getCharacteristic(Characteristic.OccupancyDetected)
                    .updateValue(error);
            }.bind(this));

            Object.keys(this.blowers).forEach(function(blowerName) {
                this.blowers[blowerName]
                    .getCharacteristic(Characteristic.OccupancyDetected)
                    .updateValue(error);
            }.bind(this));

            callback();
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
                .updateValue(this.fahrenheitToCelsius(sensorData.tc));
            
            // update the target occupancy service to reflect the alarm state
            this.log("Updating OccupancySensor (" + sensorData.name + ") -> " + (sensorData.al != 0));
            this.targets[sensorData.name]
                .getCharacteristic(Characteristic.OccupancyDetected)
                .updateValue(sensorData.tc >= sensorData.ta);
        }.bind(this));
        
        // loop through the blowers
        data.stoker.blowers.forEach(function(blowerData) {
            // update the blower occupancy service to reflect the blower state
            this.log("Updating OccupancySensor (" + blowerData.name + ") -> " + (blowerData.on == 1));
            this.blowers[blowerData.name]
                .getCharacteristic(Characteristic.OccupancyDetected)
                .updateValue(blowerData.on == 1);
        }.bind(this));

        callback();

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
