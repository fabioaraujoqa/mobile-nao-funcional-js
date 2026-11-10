const { Nfr } = require("../support/nfr");
const { percentile, limit } = require("../support/metrics");
const L = require("../support/limits");
describe("Inicialização [emulador] [aparelho_real]", () => {
  let n;
  before(async () => {
    n = new Nfr(browser, gestures);
    await n.prepare();
  });
  for (const [mode, state, key] of [
    ["frio", "COLD", "FRIO"],
    ["morno", "WARM", "MORNO"],
  ])
    it(`Início ${mode}`, async () => {
      const times = [];
      for (let i = 0; i < L.INICIO_REPETICOES; i++) {
        const r = await n.startup(mode);
        n.csv.write("inicializacao", { modo: mode, repeticao: i, ...r });
        if (r.estado === state) times.push(r.total_ms);
        await browser.pause(1000);
      }
      limit("p50", percentile(times, 50), L[`INICIO_${key}_P50_MAX_MS`]);
      limit("p90", percentile(times, 90), L[`INICIO_${key}_P90_MAX_MS`]);
    });
});
