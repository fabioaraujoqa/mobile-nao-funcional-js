// TIPO 3 DE 12 · EXPERIÊNCIA — Teste de acessibilidade
// Objetivo:    se pessoas com necessidades diferentes conseguem usar o app.
// O que testa: fonte do sistema grande, rótulo para o leitor de tela e modo escuro.
// Onde rodar:  emulador e mesa. Cada teste devolve a configuração original do aparelho.
// Appium:      mobile: shell (settings font_scale) · mobile: setUiMode ·
//              getAttribute("content-desc") · n.compararTela() → toMatchScreenSnapshot (@wdio/visual-service)
const assert = require("node:assert/strict");
const { prepararSuite } = require("../support/suite");
const { ITENS_DO_MENU } = require("../pages/apidemos");
const L = require("../support/limits");

describe("3 · Acessibilidade: usável por todos", () => {
  const n = prepararSuite();

  it(`Com a fonte em ${L.FONTE_ESCALA * 100}%, o menu continua inteiro na tela`, async () => {
    await n.comConfiguracao(
      "system",
      "font_scale",
      L.FONTE_ESCALA,
      async () => {
        await n.open();
        const tela = await browser.getWindowSize();
        for (const nome of ["Views", "Animation"]) {
          const el = await browser.$(`~${nome}`);
          const r = await browser.getElementRect(el.elementId);
          assert.ok(
            r.x >= 0 &&
              r.x + r.width <= tela.width &&
              r.y + r.height <= tela.height,
            `"${nome}" saiu da tela com a fonte grande`,
          );
        }
        await n.compararTela("menu-fonte-grande");
      },
      { pausaMs: 2000 },
    );
  });

  it("Itens do menu têm rótulo para o leitor de tela", async () => {
    await n.open();
    const semRotulo = [];
    for (const item of await browser.$$(ITENS_DO_MENU)) {
      if (!(await item.getAttribute("content-desc")))
        semRotulo.push(await item.getText());
    }
    assert.deepEqual(semRotulo, [], "Itens sem content-desc");
  });

  it("Trocar o modo escuro não derruba o app", async () => {
    await n.open();
    const antes =
      (await n.shell("cmd uimode night")).match(/Night mode:\s*(\w+)/)?.[1] ??
      "no";
    const base = await n.baseline();
    try {
      await n.mobile("setUiMode", {
        mode: "night",
        value: antes === "yes" ? "no" : "yes",
      });
      await browser.pause(2000);
      await n.alive(base);
    } finally {
      await n.mobile("setUiMode", { mode: "night", value: antes });
    }
  });
});
