// Page object do ApiDemos. Os toques passam por Gestures (software, braço ou simulado).
const { resourceId } = require("../support/apps");
const id = (name) => resourceId("apidemos", name);

class ApiDemosPage {
  constructor(driver, gestures) {
    Object.assign(this, { driver, gestures });
  }
  async waitVisible(selector) {
    await (await this.driver.$(selector)).waitForDisplayed({ timeout: 10000 });
  }
  async home() {
    await this.waitVisible("~Views");
  }
  async openViews() {
    await this.gestures.click("~Views");
    await this.waitVisible("~Buttons");
  }
  async openBouncingBalls() {
    await this.gestures.click("~Animation");
    await this.gestures.click("~Bouncing Balls");
    await this.driver.pause(1000);
  }
  async openDragAndDrop() {
    await this.gestures.click("~Views");
    await this.gestures.click("~Drag and Drop");
    await this.waitVisible(id("drag_dot_1"));
  }
  async dragDot(from, to) {
    await this.gestures.drag(id(`drag_dot_${from}`), id(`drag_dot_${to}`));
  }
  /** Texto que o app mostra depois de soltar um ponto sobre outro. */
  async dropResult() {
    const el = await this.driver.$(id("drag_result_text"));
    await this.driver.waitUntil(async () => (await el.getText()) !== "", {
      timeout: 5000,
      timeoutMsg: "O app não registrou a soltura do ponto",
    });
    return el.getText();
  }
}
module.exports = { ApiDemosPage };
