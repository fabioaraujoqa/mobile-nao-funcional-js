const assert = require("node:assert/strict");
const { Nfr } = require("../support/nfr");
const { resourceId } = require("../support/apps");
const field = resourceId("apidemos", "saved"),
  text = "texto preservado";
describe("Sensores [emulador]", () => {
  let n;
  before(async function () {
    n = new Nfr(browser, gestures);
    await n.prepare();
  });
  it("Tela de sensores abre sem cair [falha conhecida ApiDemos]", async () => {
    await n.open();
    const base = await n.baseline();
    try {
      await n.open(".os.Sensors");
      await browser.pause(2000);
      await n.alive(base, false);
    } finally {
      await n.open();
    }
  });
  it("Bússola aguenta mudanças de leitura", async () => {
    await n.open(".graphics.Compass");
    const base = await n.baseline();
    for (const [sensorType, value] of [
      ["light", "50"],
      ["proximity", "1"],
      ["temperature", "25"],
      ["pressure", "1000"],
      ["humidity", "60"],
      ["acceleration", "0:9.8:0"],
      ["acceleration", "9.8:0:0"],
    ]) {
      await n.mobile("sensorSet", { sensorType, value });
      await browser.pause(500);
    }
    await n.alive(base);
  });
  it("Texto sobrevive à rotação", async () => {
    await n.open(".app.SaveRestoreState");
    const el = await browser.$(field);
    await el.waitForDisplayed();
    await el.setValue(text);
    try {
      for (const orientation of ["LANDSCAPE", "PORTRAIT"]) {
        await browser.setOrientation(orientation);
        await browser.pause(1000);
        assert.equal(await (await browser.$(field)).getText(), text);
      }
    } finally {
      await browser.setOrientation("PORTRAIT");
    }
  });
});
