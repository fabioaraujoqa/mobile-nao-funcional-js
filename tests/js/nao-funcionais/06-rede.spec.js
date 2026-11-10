const { Nfr } = require("../support/nfr");
describe("Rede: sobrevivência do app [emulador]", () => {
  let n;
  before(async function () {
    n = new Nfr(browser, gestures);
    await n.prepare(".view.List1");
  });
  afterEach(async () => {
    if (!n) return;
    await n.mobile("setConnectivity", {
      airplaneMode: false,
      wifi: true,
      data: true,
    });
    await n.mobile("networkSpeed", { speed: "full" });
  });
  it("Sobrevive à perda de conectividade", async () => {
    const base = await n.baseline();
    for (const args of [
      { wifi: false, data: false },
      { airplaneMode: true },
      { airplaneMode: false, wifi: true, data: true },
    ]) {
      await n.mobile("setConnectivity", args);
      await browser.pause(2000);
      await n.alive(base);
    }
    await n.scroll();
  });
  it("Sobrevive às velocidades de rede", async () => {
    const base = await n.baseline();
    for (const speed of ["gsm", "edge", "umts", "lte", "full"]) {
      await n.mobile("networkSpeed", { speed });
      await n.scroll();
      await n.alive(base);
    }
  });
});
