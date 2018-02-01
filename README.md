# Plex Plugin for Stoker BBQ Controller 
[![npm](https://img.shields.io/npm/v/homebridge-stoker.svg)](https://www.npmjs.com/package/homebridge-stoker)
[![npm](https://img.shields.io/npm/dt/homebridge-stoker.svg)](https://www.npmjs.com/package/homebridge-stoker)

A plugin for Homebridge to bring the [Stoker BBQ
Controller](https://rocksbarbque.com) into HomeKit. Each temperature sensor will
get its own Temperature Sensor and Occupancy Sensor (for reaching target temp),
and a Occupancy Sensor will be created for each blower.

**WARNING: This code is very much in-progress and hasn't been tested at all
yet.**

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

Typical config example:
```json
{
  "accessories": [
    {
      "accessory": "Stoker",
      "name": "Stoker",
      "stoker_address": "bbq.lacour.local",
      "polling_interval": 5
    }
  ]
}
```
