const { AddNumberPage } = require("../pages/addnumber");
describe("AddNumber [addnumber]", () => {
  let page;
  before(async () => {
    page = new AddNumberPage(browser, gestures);
    await page.dismissWarning();
  });
  it("Abre com os campos vazios", async () => {
    await page.waitReady();
    await page.waitForResult("Hello World!");
  });
  for (const [a, b, total] of [
    [7, 5, 12],
    [-3, 10, 7],
  ])
    it(`Soma ${a} + ${b}`, async () => {
      await page.add(a, b);
      await page.waitForResult(`Answer: ${total}`);
    });
});
