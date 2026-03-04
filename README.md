> **This is a fork of [NickStallman/home-assistant-repo](https://github.com/NickStallman/home-assistant-repo)**, cleaned up to run as a standalone Docker service — no Home Assistant add-on infrastructure required. It connects to your Sungrow WiNet dongle, extracts inverter and battery metrics, and publishes them to MQTT. From there you can pick up the values in Home Assistant (or any other MQTT-capable system) however you like.
>
> The motivation for this fork was to have a minimal, self-contained version that only does one thing: extract data and publish it to MQTT — without any Home Assistant add-on scaffolding bundled in.
>
> Analytics have been removed from this fork to avoid confusing the upstream maintainer's analytics with data from a modified, potentially out-of-date version of the software.

---

# Sungrow WiNet S/WiNet S2 Extraction Tool

## What is this tool

Some Sungrow inverters such as the SH10RS do not expose their metrics in a clean way. They do support Modbus but various values are missing making that integration unusable. It's also possible to access the metrics via cloud, however this results in 5 minute delayed data and requires internet access.

This project connects to the Sungrow WiNet S2 wifi dongle and communicates with it's Websocket API. This allows access to all available metrics visible from the WiNet interface and updates every 10 seconds (configurable).

It can also work for the older WiNet S dongles and has broad inverter support with minimal configuration.

This project may also be usable with the older Winet-S dongle and a range of other inverters and devices.

## Compatibility

This list is the confirmed working with the following hardware.

### Inverters

- Sungrow SH50RS/SH80RS/SH10RS - Single Phase Hybrid Inverters
- Sungrow SH10RT/SH15T - Three Phase Hybrid Inverters
- Sungrow SG80RS/SG10RS - Single Phase String Inverters
- Sungrow SG80RT/SG10RT - Three Phase String Inverters

### Batteries

- SBR064/SBR096/SBR128/SBR160/SBR192/SBR224/SBR256

Other devices connected to a Sungrow Winet S or S2 adapter may also work but have not been confirmed.

## Setup

Before starting, you will need to know the hostname or IP address of your WiNet dongle and have your MQTT broker configured. This has been tested with the Mosquitto broker and Home Assistant MQTT autodiscovery.

### Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `WINET_HOST` | yes | — | IP address or hostname of your WiNet-S2 adapter, e.g. `192.168.1.100` |
| `MQTT_URL` | yes | — | MQTT broker URL, e.g. `mqtt://username:password@192.168.1.10` |
| `MQTT_PREFIX` | no | `homeassistant` | MQTT topic prefix |
| `WINET_USER` | no | — | WiNet login user — only needed if you changed the default credentials |
| `WINET_PASS` | no | — | WiNet login password — only needed if you changed the default credentials |
| `POLL_INTERVAL` | no | `10` | Polling interval in seconds |
| `SSL` | no | `false` | Set to `true` to force SSL for the WiNet connection |

### Running with Docker (recommended)

Edit `docker-compose.yml` and fill in at minimum `WINET_HOST` and `MQTT_URL`, then start the container:

```sh
docker compose up -d
```

### Running locally without Docker

Copy `env.example` to `.env` and fill in your values — the application will automatically load it on startup:

```sh
cp env.example .env
# edit .env
npm run compile && npm run cli
```

### Useful Entities

These entities may be slightly different depending on your inverter, as the names of entities are pulled from the inverter.

#### Energy Dashbard

These are cumulative energy values measured in kwh, which are useful for Home Assistant's Energy Dashboard

- Grid Consumption: daily_purchased_energy
- Return to grid: daily_feed_in_energy or daily_feed_in_energy_pv
- Battery Charging: daily_battery_charging_energy
- Battery Discharging: daily_battery_discharging_energy

#### Realtime/Instantaneous Values

These are live values measured in kw.

- Total Solar Generation: mppt_total_power
- Individual MPPT Solar Generation: mppt1_power / mppt2_power / mppt3_power / mppt4_power
- Battery Charge: battery_charging_power
- Battery Discharge: battery_discharging_power
- Grid Consumption: purchased_power
- Return to grid: total_export_active_power

### Optional additional sensors

In order to expose the MPPT inputs to the Energy dashboard you need to integrate them to energy.

```yaml
sensor:
  - platform: integration
    unique_id: sh10rs_serialnumber_mppt1_energy
    source: sensor.sh10rs_serialnumber_mppt1_power
    name: SH10RS MPPT1 Energy
    method: left
    round: 4
  - platform: integration
    unique_id: sh10rs_serialnumber_mppt2_energy
    source: sensor.sh10rs_serialnumber_mppt2_power
    name: SH10RS MPPT2 Energy
    method: left
    round: 4
  - platform: integration
    unique_id: sh10rs_serialnumber_mppt3_energy
    source: sensor.sh10rs_serialnumber_mppt3_power
    name: SH10RS MPPT3 Energy
    method: left
    round: 4
  - platform: integration
    unique_id: sh10rs_serialnumber_mppt4_energy
    source: sensor.sh10rs_serialnumber_mppt4_power
    name: SH10RS MPPT4 Energy
    method: left
    round: 4
```

## Related Projects

- [GoSungrow](https://github.com/MickMake/GoSungrow)
- [SunGather](https://github.com/bohdan-s/SunGather)
- [Sungrow SHx Inverter Modbus Home Assistant](https://github.com/mkaiser/Sungrow-SHx-Inverter-Modbus-Home-Assistant)

## Feedback

Feedback is appreciated so please drop me a line or file an issue.
