const { RobotClient } = require("./robot-client");
const enabled = (v) =>
  ["true", "1", "sim", "yes", "on"].includes(String(v).toLowerCase());
class Gestures {
  constructor(
    driver,
    {
      robot = enabled(process.env.ROBO),
      simulated = enabled(process.env.SIMULADO),
      client = new RobotClient(),
    } = {},
  ) {
    Object.assign(this, { driver, robot, simulated, client });
  }
  async prepare() {
    if (!this.robot) return;
    const h = await this.client.health();
    if (h.simulated !== this.simulated)
      throw Error("SIMULADO não corresponde ao servidor do braço");
    if (!h.calibrated) throw Error("Braço sem calibração");
    if (!this.simulated && !h.contact_verification)
      throw Error("Servidor sem confirmação de contato");
    this.prepared = true;
  }
  async center(selector) {
    const el = await this.driver.$(selector);
    await el.waitForDisplayed({ timeout: 10000 });
    const { x, y } = await el.getLocation(),
      { width, height } = await el.getSize();
    return [x + width / 2, y + height / 2];
  }
  async click(selector) {
    if (this.robot) await this.client.tap(...(await this.center(selector)));
    if (!this.robot || this.simulated) {
      const el = await this.driver.$(selector);
      await el.waitForDisplayed({ timeout: 10000 });
      await el.click();
    }
  }
  async action(x1, y1, x2, y2, duration = 0.8, hold = 0) {
    const actions = [
      {
        type: "pointerMove",
        duration: 0,
        x: Math.round(x1),
        y: Math.round(y1),
      },
      { type: "pointerDown", button: 0 },
      { type: "pause", duration: Math.round(hold * 1000) },
    ];
    if (x2 != null)
      actions.push({
        type: "pointerMove",
        duration: Math.round(duration * 1000),
        x: Math.round(x2),
        y: Math.round(y2),
      });
    actions.push({ type: "pointerUp", button: 0 });
    try {
      await this.driver.performActions([
        {
          type: "pointer",
          id: "finger",
          parameters: { pointerType: "touch" },
          actions,
        },
      ]);
    } finally {
      await this.driver.releaseActions();
    }
  }
  async tap(x, y) {
    if (this.robot) await this.client.tap(x, y);
    if (!this.robot || this.simulated)
      await this.action(x, y, null, null, 0, 0.1);
  }
  async swipe(x1, y1, x2, y2, duration = 0.8, hold = 0) {
    if (this.robot) await this.client.swipe(x1, y1, x2, y2, duration, hold);
    if (!this.robot || this.simulated)
      await this.action(x1, y1, x2, y2, duration, hold);
  }
  async drag(from, to) {
    await this.swipe(
      ...(await this.center(from)),
      ...(await this.center(to)),
      0.8,
      0.6,
    );
  }
  async close() {
    if (this.robot && this.prepared) await this.client.park();
  }
}
module.exports = { Gestures, enabled };
