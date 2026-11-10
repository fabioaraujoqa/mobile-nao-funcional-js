// Configuração WebdriverIO. Regras de aparelho e app ficam em tests/js/support/session.js.
const path = require("node:path");
const { mkdirSync } = require("node:fs");
const { Gestures } = require("./tests/js/support/gestures");
const session = require("./tests/js/support/session");

const appium = new URL(process.env.APPIUM_URL || "http://127.0.0.1:4723");
const resultsDir = process.env.RESULTS_DIR || "results/wdio";
const root = "./tests/js";
const suites = {
  funcionais: [`${root}/funcionais/apidemos.spec.js`],
  addnumber: [`${root}/funcionais/addnumber.spec.js`],
  e2e: [`${root}/e2e/*.spec.js`],
  nfr: [`${root}/nao-funcionais/*.spec.js`],
};

exports.config = {
  runner: "local",
  hostname: appium.hostname,
  port: Number(appium.port || (appium.protocol === "https:" ? 443 : 80)),
  protocol: appium.protocol.replace(":", ""),
  path: appium.pathname,
  specs: suites.funcionais,
  suites,
  // Um worker só: há um celular e um braço.
  maxInstances: 1,
  framework: "mocha",
  reporters: ["spec"],
  logLevel: "warn",
  waitforTimeout: 10000,
  connectionRetryCount: 0,
  connectionRetryTimeout: 120000,
  capabilities: [
    {
      platformName: "Android",
      "appium:automationName": "UiAutomator2",
      "appium:autoGrantPermissions": true,
      "appium:newCommandTimeout": 240,
    },
  ],
  // Testes longos (soak, bateria) ampliam o próprio limite com this.timeout().
  mochaOpts: { ui: "bdd", timeout: 10 * 60000 },

  beforeSession(_config, caps, specs) {
    Object.assign(caps, session.capabilities(specs));
  },
  async before(_caps, specs) {
    global.gestures = new Gestures(browser, session.gestureOptions(specs));
    await gestures.prepare();
  },
  async afterTest(test, _context, { passed }) {
    if (passed) return;
    mkdirSync(resultsDir, { recursive: true });
    const name = test.title.replace(/[^\w-]+/g, "_").slice(0, 60);
    await browser.saveScreenshot(
      path.join(resultsDir, `${Date.now()}_${name}.png`),
    );
  },
  async after() {
    if (global.gestures) await gestures.close();
  },
};
