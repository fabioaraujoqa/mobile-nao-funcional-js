const { ApiDemosPage } = require("../pages/apidemos");
describe("ApiDemos", () => {
  let page;
  before(() => {
    page = new ApiDemosPage(browser, gestures);
  });
  it("Abre a tela inicial", async () => {
    await page.home();
  });
  it("Entra em Views", async () => {
    await page.openViews();
  });
  it("Volta para a tela inicial", async () => {
    await browser.back();
    await page.home();
  });
});
