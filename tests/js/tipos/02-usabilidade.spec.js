// TIPO 2 DE 12 · EXPERIÊNCIA — Teste de usabilidade
// Objetivo:    se o usuário consegue usar o app com facilidade.
// O que testa: tamanho dos alvos de toque (≥ 48 dp) e a resposta visual ao toque físico.
// Onde rodar:  alvos em qualquer aparelho; resposta ao toque só na mesa, com o braço.
// Appium:      mobile: getDisplayDensity · getElementRect · getevent -lt (via mobile: shell)
// Clareza de fluxos e textos continua sendo teste com pessoas.
const assert = require("node:assert/strict");
const { Nfr } = require("../support/nfr");
const { percentile } = require("../support/metrics");
const { medir } = require("../support/indicadores");
const { ondeRodar } = require("../support/ambiente");
const L = require("../support/limits");

const ITENS_DO_MENU = "id=android:id/text1";

describe("2 · Usabilidade: fácil de usar", () => {
  let n;
  before(async () => {
    n = new Nfr(browser, gestures);
    await n.prepare();
  });
  beforeEach(ondeRodar);

  it(`Itens do menu têm alvo de toque de pelo menos ${L.ALVO_TOQUE_MIN_DP} dp`, async () => {
    const dpi = await n.mobile("getDisplayDensity");
    const rect = async (el) => browser.getElementRect((await el).elementId);
    const lista = await rect(browser.$("id=android:id/list"));
    const pequenos = [];
    let medidos = 0,
      menor = Infinity;
    for (const item of await browser.$$(ITENS_DO_MENU)) {
      const r = await rect(item);
      // Itens cortados na borda da lista não mostram o tamanho real.
      if (r.y <= lista.y || r.y + r.height >= lista.y + lista.height) continue;
      const dp = Math.min(r.width, r.height) / (dpi / 160);
      const nome = await item.getText();
      n.csv.write("usabilidade", {
        item: nome,
        largura_px: r.width,
        altura_px: r.height,
        menor_dp: dp,
      });
      if (dp < L.ALVO_TOQUE_MIN_DP)
        pequenos.push(`${nome} (${dp.toFixed(0)} dp)`);
      menor = Math.min(menor, dp);
      medidos++;
    }
    assert.ok(medidos > 0, "Nenhum item inteiro na tela para medir");
    medir("Menor alvo de toque", menor, {
      min: L.ALVO_TOQUE_MIN_DP,
      unidade: "dp",
    });
    assert.deepEqual(
      pequenos,
      [],
      `Alvos menores que ${L.ALVO_TOQUE_MIN_DP} dp`,
    );
  });

  it("Resposta visual ao toque físico dentro do limite [braco]", async () => {
    const values = [];
    let previous = null;
    try {
      await n.startTouch();
      for (let i = 0; i < L.LATENCIA_REPETICOES; i++) {
        await (await browser.$("~Views")).waitForDisplayed();
        await browser.pause(1000);
        await gestures.click("~Views");
        await browser.pause(1000);
        const r = await n.latency(previous);
        previous = r.toque_s;
        values.push(r.latencia_ms);
        n.csv.write("latencia", { repeticao: i, ...r });
        await browser.back();
      }
    } finally {
      await n.stopTouch();
    }
    medir("Latência p50", percentile(values, 50), {
      max: L.LATENCIA_P50_MAX_MS,
      unidade: "ms",
    });
    medir("Latência p95", percentile(values, 95), {
      max: L.LATENCIA_P95_MAX_MS,
      unidade: "ms",
    });
  });
});
