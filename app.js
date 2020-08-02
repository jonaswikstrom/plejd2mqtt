const api = require('./api');
const mqtt = require('./mqtt');
const fs = require('fs');
const PlejdService = require('./ble.bluez');
const SceneManager = require('./scene.manager');


const version = "0.0.1";

async function main() {
  console.log('Starting Plejd2Mqtt add-on v. ' + version);
  const rawData = fs.readFileSync('config.json');

  const config = JSON.parse(rawData);

  if (!config.connectionTimeout) {
    config.connectionTimeout = 2;
  }

  const plejdApi = new api.PlejdApi(config.site, config.username, config.password);
  const client = new mqtt.MqttClient(config.mqttBroker, config.mqttUsername, config.mqttPassword);

  plejdApi.login().then(() => {
      // load all sites and find the one that we want (from config)
      plejdApi.getSites().then((site) => {
        // load the site and retrieve the crypto key
        plejdApi.getSite(site.site.siteId).then((cryptoKey) => {
            // parse all devices from the API
            const devices = plejdApi.getDevices();

            const sceneManager = new SceneManager(plejdApi.site, devices);
            const plejd = new PlejdService(cryptoKey, devices, sceneManager, config.connectionTimeout, config.writeQueueWaitTime, true);
            plejd.on('connectFailed', () => {
              console.log('plejd-ble: were unable to connect, will retry connection in 10 seconds.');
              setTimeout(() => {
                plejd.init();
              }, 10000);
            });
    
            plejd.init();
        });
      });
  });
}


main();