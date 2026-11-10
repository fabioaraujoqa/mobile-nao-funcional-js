const { Nfr, PACKAGE } = require("../support/nfr");
const { gfxinfo } = require("../support/parsers");
const { limit } = require("../support/metrics");
const L = require("../support/limits");
describe("Fluidez [emulador] [aparelho_real]", () => {
  it("Rolagem dentro do limite de jank", async () => {
    const n = new Nfr(browser, gestures);
    await n.prepare(".view.List1");
    await browser.pause(1000);
    await n.shell(`dumpsys gfxinfo ${PACKAGE} reset`);
    for (let i = 0; i < L.JANK_ROLAGENS; i++)
      await n.scroll(i % 10 < 5 ? 1 : -1);
    const r = gfxinfo(await n.shell(`dumpsys gfxinfo ${PACKAGE}`));
    n.csv.write("fluidez", r);
    if (r.frames == null || r.frames < L.JANK_MIN_QUADROS)
      throw Error("Poucos quadros para medir jank");
    limit("Jank (%)", r.janky_pct, L.JANK_MAX_PCT);
  });
});
