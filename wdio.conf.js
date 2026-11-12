// Configuração WebdriverIO. Regras de aparelho e app ficam em tests/js/support/session.js;
// parâmetros por variável de ambiente, em tests/js/support/env.js.
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { Gestures } = require("./tests/js/support/gestures");
const session = require("./tests/js/support/session");
const indicadores = require("./tests/js/support/indicadores");
const { env } = require("./tests/js/support/env");

const appium = new URL(env.appiumUrl);
const resultsDir = env.resultados;
const root = "./tests/js";

// Um arquivo por tipo de teste (01-funcional … 12-seguranca), na ordem da apresentação.
const TIPOS = fs
  .readdirSync(path.join(__dirname, root, "tipos"))
  .filter((f) => /^\d{2}-.+\.spec\.js$/.test(f))
  .sort()
  .map((f) => `${root}/tipos/${f}`);
const nomeDoTipo = (spec) => path.basename(spec).slice(3, -".spec.js".length);
// Longos (soak, bateria) têm [longo] no título e duram DURACAO_MIN.
const longo = (spec) =>
  fs.readFileSync(path.join(__dirname, spec), "utf8").includes("[longo]");

const suites = {
  tipos: TIPOS,
  funcional: TIPOS.slice(0, 1),
  nfr: TIPOS.slice(1),
  rapidos: TIPOS.filter((s) => !longo(s)),
  longos: TIPOS.filter(longo),
  // Os tipos que tocam a tela como o usuário: com ROBO=true, o toque é do braço.
  braco: TIPOS.filter((s) => session.TOQUE_FISICO.some((t) => s.includes(t))),
  // Um tipo só pelo nome: --suite resistencia, --suite seguranca …
  ...Object.fromEntries(TIPOS.map((s) => [nomeDoTipo(s), [s]])),
  addnumber: [`${root}/outros-apps/addnumber.spec.js`],
  demo: [`${root}/demo/controles-demo.spec.js`],
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
    fs.mkdirSync(resultsDir, { recursive: true });
    const name = test.title.replace(/[^\w-]+/g, "_").slice(0, 60);
    await browser.saveScreenshot(
      path.join(resultsDir, `${Date.now()}_${name}.png`),
    );
  },
  async after() {
    if (global.gestures) await gestures.close();
  },
};
