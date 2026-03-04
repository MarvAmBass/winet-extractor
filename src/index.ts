import {getProperties} from './getProperties';
import {winetHandler} from './winetHandler';
import {MqttPublisher} from './homeassistant';
import {isTextStatus, isNumericStatus} from './types/DeviceStatus';
import Winston from 'winston';
import fs from 'fs';
import util from 'util';
const dotenv = require('dotenv');

const logger = Winston.createLogger({
  level: 'info',
  format: Winston.format.combine(
    Winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    Winston.format.printf(info => {
      const {timestamp, level, message, ...extraData} = info;
      return (
        `${timestamp} ${level}: ${message} ` +
        `${Object.keys(extraData).length ? util.format(extraData) : ''}`
      );
    })
  ),
  transports: [new Winston.transports.Console()],
});

if (fs.existsSync('.env')) {
  logger.info('Found .env file, loading configuration from it');
  dotenv.config();
}

const options = {
  winet_host: process.env.WINET_HOST || '',
  mqtt_url: process.env.MQTT_URL || '',
  mqtt_prefix: process.env.MQTT_PREFIX || 'homeassistant',
  winet_user: process.env.WINET_USER || '',
  winet_pass: process.env.WINET_PASS || '',
  poll_interval: process.env.POLL_INTERVAL || '10',
  ssl: process.env.SSL === 'true',
};

if (!options.winet_host) {
  logger.error('WINET_HOST is not set - please configure the WiNet dongle IP or hostname');
  process.exit(1);
}

if (!options.mqtt_url) {
  logger.error('MQTT_URL is not set - please configure the MQTT broker URL');
  process.exit(1);
}

const lang = 'en_US';
const frequency = parseInt(options.poll_interval) || 10;

const mqtt = new MqttPublisher(logger, options.mqtt_url, options.mqtt_prefix);
const winet = new winetHandler(
  logger,
  options.winet_host,
  lang,
  frequency,
  options.winet_user || '',
  options.winet_pass || ''
);

const configuredSensors: string[] = [];
const configuredDevices: number[] = [];

winet.setCallback((devices, deviceStatus) => {
  let updatedSensorsConfig = 0;
  let updatedSensors = 0;

  for (const device of devices) {
    const deviceSlug = `${device.dev_model}_${device.dev_sn}`;
    const currentStatus = deviceStatus[device.dev_id];

    if (!configuredDevices.includes(device.dev_id)) {
      if (mqtt.registerDevice(deviceSlug, device)) {
        logger.info(`Registered device: ${deviceSlug}`);
        configuredDevices.push(device.dev_id);
      }
    }

    for (const statusKey in currentStatus) {
      const status = currentStatus[statusKey];
      const combinedSlug = `${deviceSlug}_${status.slug}`;

      if (!configuredSensors.includes(combinedSlug)) {
        if (
          status.value !== undefined &&
          mqtt.publishConfig(deviceSlug, status, device)
        ) {
          logger.info(`Configured sensor: ${deviceSlug} ${status.slug}`);
          configuredSensors.push(combinedSlug);
          updatedSensorsConfig++;
        } else {
          logger.debug(`Invalid sensor state: ${deviceSlug} ${status.slug}`);
        }
      }

      if (status.dirty) {
        if (isNumericStatus(status)) {
          mqtt.publishNumeric(
            deviceSlug,
            status.slug,
            status.unit,
            status.value
          );
        } else if (isTextStatus(status)) {
          mqtt.publishText(deviceSlug, status.slug, status.value);
        }
        status.dirty = false;
        updatedSensors++;
      }
    }
  }

  if (updatedSensorsConfig > 0) {
    logger.info(`Configured ${updatedSensorsConfig} sensors`);
  }
  if (updatedSensors > 0) {
    logger.info(`Updated ${updatedSensors} sensors`);
  }
});

getProperties(logger, options.winet_host, lang, options.ssl)
  .then(result => {
    logger.info('Fetched i18n properties.');

    winet.setProperties(result.properties);
    winet.connect(result.forceSsl);
  })
  .catch(err => {
    logger.error('Failed to fetch l18n properties required to start.', err);
    logger.error('Is the Winet IP address correct?');
  });
