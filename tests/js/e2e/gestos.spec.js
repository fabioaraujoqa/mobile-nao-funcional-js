const assert = require("node:assert/strict");
const { ApiDemosPage } = require("../pages/apidemos");
describe("Gestos [e2e]", () => {
  let page;
  before(() => {
    page = new ApiDemosPage(browser, gestures);
  });
  afterEach(async () => {
    await browser.back();
    await browser.back();
    await page.home();
  });
  it("Bolinhas com toques e arrastes", async () => {
    await page.openBouncingBalls();
    await gestures.tap(360, 600);
    await gestures.tap(200, 900);
    await gestures.swipe(150, 500, 570, 1100);
    await gestures.swipe(570, 500, 150, 1100);
  });
  it("Arrastar um ponto até outro", async () => {
    await page.openDragAndDrop();
    await page.dragDot(1, 2);
    assert.equal(await page.dropResult(), "Dropped!");
  });
});
