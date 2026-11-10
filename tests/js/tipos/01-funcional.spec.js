// TIPO 1 DE 12 · O QUE FAZ — Teste funcional
// Objetivo:    o que o app faz: cada função entrega o resultado esperado.
// O que testa: navegação entre telas e arrastar e soltar com o resultado confirmado.
// Onde rodar:  emulador e mesa. Com ROBO=true, o toque é do braço.
// Appium:      findElement · click · gestos W3C (arrastar) · BACK
const assert = require("node:assert/strict");
const { ApiDemosPage } = require("../pages/apidemos");
const { ondeRodar } = require("../support/ambiente");

describe("1 · Funcional: o app faz o que promete", () => {
  let page;
  before(() => {
    page = new ApiDemosPage(browser, gestures);
  });
  beforeEach(ondeRodar);

  it("Navega até Views e volta ao início", async () => {
    await page.home();
    await page.openViews();
    await browser.back();
    await page.home();
  });

  it("Arrastar um ponto sobre outro registra a soltura", async () => {
    await page.openDragAndDrop();
    await page.dragDot(1, 2);
    assert.equal(await page.dropResult(), "Dropped!");
    await browser.back();
    await browser.back();
    await page.home();
  });
});
