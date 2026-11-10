const { Nfr } = require("../support/nfr");
const { percentile, limit } = require("../support/metrics");
const L = require("../support/limits");
describe("Latência física [braco]", () => {
  it("Toque até o primeiro quadro novo", async function () {
    if (!gestures.robot || gestures.simulated) this.skip();
    const n = new Nfr(browser, gestures);
    await n.prepare();
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
    limit("Latência p50", percentile(values, 50), L.LATENCIA_P50_MAX_MS);
    limit("Latência p95", percentile(values, 95), L.LATENCIA_P95_MAX_MS);
  });
});
