// TIPO 11 DE 12 · PLATAFORMA — Teste de compatibilidade
// Objetivo:    se o app funciona nos aparelhos e nas versões que o público usa.
// O que testa: quem é o aparelho da rodada e se as telas continuam iguais à referência
//              DESTE aparelho (tela quebrada, texto cortado, mudança visual não intencional).
// Onde rodar:  emulador e mesa; rode a mesma suíte em cada aparelho (UDID=...).
//              A 1ª rodada num aparelho novo grava a referência em tests/js/visual/referencia/;
//              as seguintes comparam. Diferenças ficam em results/wdio/visual/.
// Appium:      mobile: deviceInfo · capabilities (udid, platformVersion) ·
//              toMatchScreenSnapshot (@wdio/visual-service)
const assert = require("node:assert/strict");
const { Nfr } = require("../support/nfr");
const { ApiDemosPage } = require("../pages/apidemos");
const { ondeRodar } = require("../support/ambiente");
const L = require("../support/limits");

describe("11 · Compatibilidade: igual em cada aparelho", () => {
  let n, page;
  before(async () => {
    n = new Nfr(browser, gestures);
    page = new ApiDemosPage(browser, gestures);
    await n.prepare();
    // As referências são em retrato; um teste anterior pode ter deixado a tela deitada.
    await browser.setOrientation("PORTRAIT");
  });
  beforeEach(ondeRodar);

  it("Registra quem é o aparelho da rodada", async () => {
    const d = await n.mobile("deviceInfo");
    const info = {
      fabricante: d.manufacturer,
      modelo: d.model,
      android: d.platformVersion,
      api: d.apiVersion,
      tela: d.realDisplaySize,
      densidade: d.displayDensity,
    };
    n.csv.write("compatibilidade", info);
    console.log("Aparelho:", info);
    assert.ok(info.modelo && info.android, "deviceInfo sem modelo ou versão");
  });

  it("Tela inicial igual à referência deste aparelho", async () => {
    await page.home();
    await expect(browser).toMatchScreenSnapshot(
      "inicio",
      L.VISUAL_DIFERENCA_MAX_PCT,
    );
  });

  it("Tela Views igual à referência deste aparelho", async () => {
    await page.openViews();
    await expect(browser).toMatchScreenSnapshot(
      "views",
      L.VISUAL_DIFERENCA_MAX_PCT,
    );
    await browser.back();
  });
});
