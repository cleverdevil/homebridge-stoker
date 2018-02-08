var request = require("request");
var Service, Characteristic, HAPServer;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    HAPServer = homebridge.hap.HAPServer;

    homebridge.registerAccessory("homebridge-stoker", "Stoker", Stoker);
};

function Stoker(log, config) {
    // config
    this.log = log;
    this.name = config.name;
    this.host = config.stoker_address;
    this.pollingInterval = config.polling_interval || 5;

    // init sensors and blowers
    this.sensors = {};
    this.blowers = {};
    this.targets = {};
    this.init(config.sensors, config.blowers);
    
    // stored state
    this.lastStateBundle = {};

    // poll for state updates
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
        // create a thermostat service for each temperature sensor
        this.log("Creating Thermostat: " + sensorData.name);
        this.sensors[sensorData.name] = new Service.Thermostat(sensorData.name, sensorData.name);
       
        // set temperature range
        this.sensors[sensorData.name]
            .getCharacteristic(Characteristic.CurrentTemperature)
            .setProps({ minValue: 0, maxValue: 1200 });
        this.sensors[sensorData.name]
            .getCharacteristic(Characteristic.TargetTemperature)
            .setProps({ minValue: 0, maxValue: 1200 });
        this.sensors[sensorData.name]
            .getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .setValue(Characteristic.TemperatureDisplayUnits.FAHRENHEIT);

        // attach the "set" event for target temperature to push 
        // updated state to the stoker
        this.sensors[sensorData.name]
            .getCharacteristic(Characteristic.TargetTemperature)
            .on('set', function(value, callback) {
                var stateBundle = JSON.parse(JSON.stringify(this.lastStateBundle));
                
                stateBundle.stoker.sensors.forEach(function(sensor, index) {
                    if (sensor.name === sensorData.name) {
                        stateBundle.stoker.sensors[index].ta = this.celsiusToFahrenheit(value);
                    }
                }.bind(this));
                 
                this.pushState(stateBundle, callback);
            }.bind(this));
        
        // create an OccupancySensor for each temperature sensor
        // which makes it easier to trigger automations
        this.targets[sensorData.name] = new Service.OccupancySensor(sensorData.name, sensorData.name + " Target");
    }.bind(this));
    
    // loop through the blowers
    blowersData.forEach(function(blowerData) {
        // create a blower occupancy sensor for when the blower is engaged
        this.log("Creating OccupancySensor (blower): " + blowerData.name);
        this.blowers[blowerData.name] = new Service.OccupancySensor(blowerData.name, blowerData.name);
    }.bind(this));
    
    this.log("Services initialized with " + 
             Object.keys(this.sensors).length + 
             " sensor(s) and " + 
             Object.keys(this.blowers).length +
             " blower(s).");
};

Stoker.prototype.fahrenheitToCelsius = function(temperature) {
    return (temperature - 32) / 1.8;
};

Stoker.prototype.celsiusToFahrenheit = function(temperature) {
    return (temperature * 1.8) + 32;
};

Stoker.prototype.pushState = function(value, callback) {
    this.log("Pushing new state...");

    request.post({
        url: "http://" + this.host + "/stoker.Json_Handler",
        timeout: 5000,
        body: JSON.stringify(value),
        headers: {
            'Content-Type': 'application/json'
        }
    }, function(err, response) {
        if (err || response.statusCode !== 200) {
            this.log("Error updating state.");

            if (err.code === 'ETIMEDOUT') {
                this.pushErrorState();
            }
            return;
        }

        this.log("Successfully pushed state.");
        callback();
    }.bind(this));
};

Stoker.prototype.pushErrorState = function() {
    var error = new Error(HAPServer.Status.SERVICE_COMMUNICATION_FAILURE);

    Object.keys(this.sensors).forEach(function(sensorName) {
        var sensor = this.sensors[sensorName];
        sensor.getCharacteristic(Characteristic.CurrentTemperature)
              .updateValue(error);
        sensor.getCharacteristic(Characteristic.TargetTemperature)
              .updateValue(error);
        sensor.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
              .updateValue(error);
        sensor.getCharacteristic(Characteristic.TargetHeatingCoolingState)
              .updateValue(error);
        
        this.targets[sensorName].getCharacteristic(Characteristic.OccupancyDetected)
            .updateValue(error);
    }.bind(this));
    
    Object.keys(this.blowers).forEach(function(blowerName) {
        this.blowers[blowerName]
            .getCharacteristic(Characteristic.OccupancyDetected)
            .updateValue(error);
    }.bind(this));
};

Stoker.prototype.getState = function(callback) {
    this.log("Getting current state...");

    request.get({
        url: "http://" + this.host + "/stoker.json",
        timeout: 5000
    }, function (err, response, body) {
        if (err || response.statusCode !== 200) {
            this.log("Error getting state. Stoker may be inactive."); 
            this.pushErrorState();
            callback();
            return;
        }
        
        this.lastStateBundle = JSON.parse(body);
        
        this.log('Received state from Stoker');

        // loop through the temperature sensors
        this.lastStateBundle.stoker.sensors.forEach(function(sensorData) {
            this.log("Updating Thermostat (" + sensorData.name + ") -> " + sensorData.tc + " / " + sensorData.ta);
            
            // current temperature
            this.sensors[sensorData.name]
                .getCharacteristic(Characteristic.CurrentTemperature)
                .updateValue(this.fahrenheitToCelsius(sensorData.tc));
            
            // target temperature
            this.sensors[sensorData.name]
                .getCharacteristic(Characteristic.TargetTemperature)
                .updateValue(this.fahrenheitToCelsius(sensorData.ta));
            
            // heating / cooling state
            var heatingCoolingState = Characteristic.CurrentHeatingCoolingState.AUTO;
            
            if (sensorData.tc < sensorData.ta)
                heatingCoolingState = Characteristic.CurrentHeatingCoolingState.HEAT;    
            else
                heatingCoolingState = Characteristic.CurrentHeatingCoolingState.OFF;

            this.sensors[sensorData.name]
                .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
                .updateValue(heatingCoolingState);

            this.sensors[sensorData.name]
                .getCharacteristic(Characteristic.TargetHeatingCoolingState)
                .updateValue(heatingCoolingState);

            // alerts
            this.targets[sensorData.name]
                .getCharacteristic(Characteristic.OccupancyDetected)
                .updateValue(sensorData.tc <= sensorData.ta);
        }.bind(this));
        
        // loop through the blowers
        this.lastStateBundle.stoker.blowers.forEach(function(blowerData) {
            // update the blower occupancy service to reflect the blower state
            this.log("Updating OccupancySensor (" + blowerData.name + ") -> " + (blowerData.on == 1));
            this.blowers[blowerData.name]
                .getCharacteristic(Characteristic.OccupancyDetected)
                .updateValue(blowerData.on == 1);
        }.bind(this));
        
        callback();

    }.bind(this));
};

Stoker.prototype.getServices = function () {
    var services = [];
    for (var skey in this.sensors)
        services.push(this.sensors[skey]);
    for (var bkey in this.blowers)
        services.push(this.blowers[bkey]);
    for (var tkey in this.targets)
        services.push(this.targets[tkey]);
    return services;
};
