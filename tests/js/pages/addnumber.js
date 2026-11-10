// Page object do AddNumber (instalado à parte no aparelho).
const { resourceId } = require("../support/apps");
const id = (name) => resourceId("addnumber", name);

class AddNumberPage {
  constructor(driver, gestures) {
    Object.assign(this, { driver, gestures });
  }
  /** Fecha o aviso de app antigo do Android, se aparecer. */
  async dismissWarning() {
    const ok = await this.driver.$("id=android:id/button1");
    if (await ok.waitForDisplayed({ timeout: 3000 }).catch(() => false))
      await ok.click();
  }
  async waitReady() {
    await (await this.driver.$(id("addBtn"))).waitForDisplayed();
  }
  async add(a, b) {
    await (await this.driver.$(id("num1"))).setValue(String(a));
    await (await this.driver.$(id("num2"))).setValue(String(b));
    await this.driver.hideKeyboard().catch(() => {});
    await this.gestures.click(id("addBtn"));
  }
  async waitForResult(expected) {
    const label = await this.driver.$(id("sampleLabel"));
    let actual;
    await this.driver.waitUntil(
      async () => (actual = await label.getText()) === expected,
      {
        timeout: 10000,
        timeoutMsg: `Resultado esperado "${expected}", obtido "${actual}"`,
      },
    );
  }
}
module.exports = { AddNumberPage };
