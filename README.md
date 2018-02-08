# Homebridge Plugin for Stoker BBQ Controller 
[![npm](https://img.shields.io/npm/v/homebridge-stoker.svg)](https://www.npmjs.com/package/homebridge-stoker)
[![npm](https://img.shields.io/npm/dt/homebridge-stoker.svg)](https://www.npmjs.com/package/homebridge-stoker)

A plugin for Homebridge to bring the [Stoker BBQ
Controller](https://rocksbarbque.com) into HomeKit. Each temperature sensor will
get its own Thermostat sensor, which includes the current temperature of the
sensor, along with the target temperature. The target temperature can be
updated/controlled via HomeKit and Siri. An Occupancy Sensor will be created for 
each blower to indicate its status, and for each temperature sensor to indicate
whether or not it has reached its target temperature.

While Apple's Home app isn't terrible, its not nearly as pleasurable to use for
a Stoker with this plugin as Elgato Eve's app is. Its free, and I recommend you
get it to use with this plugin!

## Installation

You install the plugin the same way you installed Homebridge - as a global NPM
module:

```bash
sudo npm install -g homebridge-stoker
```

If you don't have a Homebridge installation yet, head over to the [project
documetation](https://github.com/nfarina/homebridge) for more information.

## Configuration

The plugin uses the following config values:

Variable | Description
-------- | -----------
`accessory` | Must be "Stoker".
`name` | Whatever you want the accessory to be named in HomeKit.
`stoker_address` | The hostname / IP address of your Stoker.
`polling_interval` | How many seconds between polling the Stoker for updates.
`sensors` | A list of objects with a "name" property, one for each temp sensor.
`blowers` | A list of objects with a "name" property, one for each blower.

Typical config example:
```json
{
  "accessories": [
    {
      "accessory": "Stoker",
      "name": "Stoker",
      "stoker_address": "bbq.lacour.local",
      "polling_interval": 5,
      "sensors": [
        { "name": "Meat" },
        { "name": "Cooker" }
      ],
      "blowers": [
        { "name": "Blower" }
      ]
    }
  ]
}
```
