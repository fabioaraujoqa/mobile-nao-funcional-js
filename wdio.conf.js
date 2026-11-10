// Configuração WebdriverIO. Regras de aparelho e app ficam em tests/js/support/session.js.
const path = require("node:path");
const { mkdirSync } = require("node:fs");
const { Gestures } = require("./tests/js/support/gestures");
const session = require("./tests/js/support/session");
const indicadores = require("./tests/js/support/indicadores");
const { execFileSync } = require("node:child_process");

const appium = new URL(process.env.APPIUM_URL || "http://127.0.0.1:4723");
const resultsDir = process.env.RESULTS_DIR || "results/wdio";
const root = "./tests/js";
// Um arquivo por tipo de teste, na ordem da apresentação "Tipos de testes mobile".
const TIPOS = [
  "01-funcional",
  "02-usabilidade",
  "03-acessibilidade",
  "04-performance",
  "05-resistencia",
  "06-bateria-temperatura",
  "07-conectividade",
  "08-interrupcao",
  "09-concorrencia",
  "10-sensores-localizacao",
  "11-compatibilidade",
  "12-seguranca",
].map((tipo) => `${root}/tipos/${tipo}.spec.js`);
const suites = {
  funcional: TIPOS.slice(0, 1),
  nfr: TIPOS.slice(1),
  tipos: TIPOS,
  addnumber: [`${root}/outros-apps/addnumber.spec.js`],
};

exports.config = {
  runner: "local",
  hostname: appium.hostname,
  port: Number(appium.port || (appium.protocol === "https:" ? 443 : 80)),
  protocol: appium.protocol.replace(":", ""),
  path: appium.pathname,
  specs: suites.funcional,
  suites,
  // Um worker só: há um celular e um braço.
  maxInstances: 1,
  framework: "mocha",
  reporters: ["spec"],
  services: [
    [
      "visual",
      {
        // Referências versionadas, uma por aparelho; atual e diferença ficam em results/.
        baselineFolder: path.resolve(root, "visual/referencia"),
        screenshotPath: path.resolve(resultsDir, "visual"),
        formatImageName:
          "{tag}-{deviceName}-{platformName}{platformVersion}-{width}x{height}",
        autoSaveBaseline: true,
        // Barra de status (relógio, bateria) e de navegação mudam sozinhas.
        compareOptions: { blockOutStatusBar: true, blockOutToolBar: true },
      },
    ],
  ],
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

  // Roda uma vez, no processo principal: o mesmo id de rodada para todos os specs.
  async onPrepare() {
    process.env.RODADA_ID = indicadores.rodadaId();
    try {
      process.env.GIT_COMMIT ||= execFileSync(
        "git",
        ["rev-parse", "--short", "HEAD"],
        {
          encoding: "utf8",
        },
      ).trim();
    } catch {}
    try {
      const status = await (await fetch(new URL("status", appium))).json();
      process.env.APPIUM_VERSAO ||= status.value?.build?.version ?? "";
    } catch {}
  },
  beforeSession(_config, caps, specs) {
    Object.assign(caps, session.capabilities(specs));
  },
  async before(_caps, specs) {
    global.gestures = new Gestures(browser, session.gestureOptions(specs));
    await gestures.prepare();
    await indicadores.iniciar(browser, specs[0]);
  },
  beforeTest(test) {
    indicadores.testeAtual(test.title);
  },
  async afterTest(test, _context, { passed, error, duration }) {
    const pulado = /skip|pending/i.test(error?.name ?? "");
    indicadores.registrarTeste(
      test.title,
      passed ? "aprovado" : pulado ? "pulado" : "reprovado",
      { duracaoMs: duration, erro: pulado ? "" : error },
    );
    if (passed || pulado) return;
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
