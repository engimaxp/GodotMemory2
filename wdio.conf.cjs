const path = require('path');
const fs = require('fs');

// Auto-generate app.html before tests
const distIndex = path.join(__dirname, 'dist', 'index.html');
const mockTauri = path.join(__dirname, 'e2e', 'shared', 'mock-tauri.js');
const testUtils = path.join(__dirname, 'e2e', 'shared', 'test-utils.js');
const appHtml = path.join(__dirname, 'e2e', 'app.html');

if (fs.existsSync(distIndex)) {
  const html = fs.readFileSync(distIndex, 'utf-8');
  const mock = '<script>\n' + fs.readFileSync(mockTauri, 'utf-8') + '\n' +
    fs.readFileSync(testUtils, 'utf-8') + '\n<\/script>';
  fs.writeFileSync(appHtml, html.replace('</head>', mock + '\n</head>'), 'utf-8');
}

const specsRoot = path.join(__dirname, 'e2e');
const testFiles = fs.readdirSync(specsRoot)
  .filter(f => f.endsWith('.test.cjs'))
  .map(f => path.join(specsRoot, f));

exports.config = {
  runner: 'local',
  specs: testFiles,
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
        { mount: '/', path: path.join(__dirname, 'e2e') },
        { mount: '/', path: path.join(__dirname, 'dist') }
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
