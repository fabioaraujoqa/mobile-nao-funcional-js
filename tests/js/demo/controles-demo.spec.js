// DEMO — Digitar e selecionar na tela Views/Controls/3. Holo Light Theme do ApiDemos.
// O braço toca o campo, abre o teclado e digita "hello world" tecla por tecla, depois
// marca um checkbox e um radio button.
// Sem marca de ambiente: roda por software (UiAutomator) e, com ROBO=true, pelo braço.
//   UDID=<cel> npm run test:demo                 # UiAutomator (software)
//   UDID=<cel> ROBO=true npm run test:demo       # toque físico do braço
const assert = require("node:assert/strict");
const { ControlesPage } = require("../pages/controles");

const TEXTO = "hello world";
const normal = (s) => String(s).trim().toLowerCase();

describe("Demo: digitar e selecionar", () => {
  let page;
  before(() => {
    page = new ControlesPage(browser, gestures);
  });

  it("Toca o campo, digita 'hello world' no teclado e marca um checkbox e um radio", async () => {
    await page.abrir();

    await page.digitar(TEXTO);
    // O teclado pode autocapitalizar/corrigir; comparamos sem diferenciar maiúsculas.
    assert.equal(normal(await page.texto()), TEXTO, "o texto digitado não bateu");

    await page.marcarCheckbox(1);
    assert.ok(await page.marcado("check1"), "o checkbox 1 deveria ficar marcado");

    await page.marcarRadio(1);
    assert.ok(await page.marcado("radio1"), "o radio 1 deveria ficar marcado");
  });
});
