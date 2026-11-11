// TIPO 4 DE 12 · DESEMPENHO — Teste de performance
// Objetivo:    quanto tempo o app leva para responder.
// O que testa: tempo de abertura a frio e a morno (p50/p90) e fluidez da rolagem (jank).
// Onde rodar:  emulador (só referência) e mesa (valores reais).
// Appium:      mobile: shell (am start -W · dumpsys gfxinfo)
// Fora daqui:  tempo do backend sob carga (ferramenta de carga no servidor).
const { PACKAGE } = require("../support/nfr");
const { prepararSuite } = require("../support/suite");
const { gfxinfo } = require("../support/parsers");
const { percentile } = require("../support/metrics");
const { medir } = require("../support/indicadores");
const L = require("../support/limits");

describe("4 · Performance: responde rápido", () => {
  const n = prepararSuite();

  for (const [modo, estado, chave] of [
    ["frio", "COLD", "FRIO"],
    ["morno", "WARM", "MORNO"],
  ])
    it(`Início ${modo} dentro do limite (p50 e p90)`, async () => {
      const tempos = [];
      for (let i = 0; i < L.INICIO_REPETICOES; i++) {
        const r = await n.startup(modo);
        n.csv.write("inicializacao", { modo, repeticao: i, ...r });
        if (r.estado === estado) tempos.push(r.total_ms);
        await browser.pause(1000);
      }
      medir(`Início ${modo} p50`, percentile(tempos, 50), {
        max: L[`INICIO_${chave}_P50_MAX_MS`],
        unidade: "ms",
      });
      medir(`Início ${modo} p90`, percentile(tempos, 90), {
        max: L[`INICIO_${chave}_P90_MAX_MS`],
        unidade: "ms",
      });
    });

  it("Rolagem sem jank acima do limite", async () => {
    await n.open(".view.List1");
    await browser.pause(1000);
    await n.shell(`dumpsys gfxinfo ${PACKAGE} reset`);
    for (let i = 0; i < L.JANK_ROLAGENS; i++)
      await n.scroll(i % 10 < 5 ? 1 : -1);
    const r = gfxinfo(await n.shell(`dumpsys gfxinfo ${PACKAGE}`));
    n.csv.write("fluidez", r);
    if (r.frames == null || r.frames < L.JANK_MIN_QUADROS)
      throw Error("Poucos quadros para medir jank");
    medir("Jank", r.janky_pct, { max: L.JANK_MAX_PCT, unidade: "%" });
  });
});
