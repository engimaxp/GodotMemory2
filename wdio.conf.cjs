const path = require('path');

exports.config = {
  runner: 'local',
  specs: ['./e2e/bubble.test.cjs'],
  capabilities: [{
    maxInstances: 1,
    browserName: 'MicrosoftEdge',
    'ms:edgeOptions': {
      args: ['--headless', '--no-sandbox', '--disable-gpu', '--window-size=1280,720']
    }
  }],
  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: [
    ['static-server', {
      port: 4567,
      folders: [
        { mount: '/', path: path.join(__dirname, 'e2e') }
      ]
    }],
    ['edgedriver', {
      args: ['--port=9515']
    }]
  ],
  staticServerLogs: false,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000
  },
  baseUrl: 'http://localhost:4567'
};
