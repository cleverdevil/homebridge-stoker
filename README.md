# Plex Plugin for Stoker BBQ Controller 
[![npm](https://img.shields.io/npm/v/homebridge-stoker.svg)](https://www.npmjs.com/package/homebridge-stoker)
[![npm](https://img.shields.io/npm/dt/homebridge-stoker.svg)](https://www.npmjs.com/package/homebridge-stoker)

Put description here.

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
`accessory` | Must be `Stoker`
`name` | Whatever you want the accessory to be named in HomeKit
`stoker_host` | The hostname / IP address of your Stoker.

Typical config example:
```json
{
  "accessories": [
    {
      "accessory": "Stoker",
      "name": "Stoker"
    }
  ]
}
```
