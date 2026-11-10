const assert = require("node:assert/strict");
const { Nfr } = require("../support/nfr");
const { resourceId } = require("../support/apps");
const field = resourceId("apidemos", "saved"),
  text = "texto preservado",
  phoneNumber = "5551234567";
describe("Interrupções [emulador]", () => {
  let n, base;
  before(async function () {
    n = new Nfr(browser, gestures);
    await n.prepare();
  });
  beforeEach(async () => {
    await n.open(".app.SaveRestoreState");
    const el = await browser.$(field);
    await el.waitForDisplayed();
    await el.setValue(text);
    base = await n.baseline();
  });
  async function preserved() {
    await n.alive(base);
    assert.equal(await (await browser.$(field)).getText(), text);
  }
  it("Estado após chamada", async () => {
    try {
      await n.mobile("gsmCall", { phoneNumber, action: "call" });
      await browser.pause(3000);
    } finally {
      await n.mobile("gsmCall", { phoneNumber, action: "cancel" });
    }
    await browser.pause(3000);
    await preserved();
  });
  it("Estado após SMS", async () => {
    await n.mobile("sendSms", { phoneNumber, message: "Mensagem de teste" });
    await browser.pause(3000);
    await preserved();
  });
  it("Estado após segundo plano", async () => {
    await n.mobile("backgroundApp", { seconds: 3 });
    await preserved();
  });
});
