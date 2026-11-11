// TIPO 9 DE 12 · AMBIENTE — Teste de concorrência no aparelho
// Objetivo:    como o app divide memória, tela e recursos com outros apps.
// O que testa: outro app por cima, aviso de memória crítica e o sistema destruindo as telas
//              ("Não manter atividades"), sempre com o texto digitado preservado.
// Onde rodar:  emulador e mesa. A opção "Não manter atividades" volta ao valor original.
// Appium:      mobile: activateApp · mobile: queryAppState · mobile: sendTrimMemory ·
//              mobile: shell (settings always_finish_activities)
const assert = require("node:assert/strict");
const { PACKAGE } = require("../support/nfr");
const { prepararSuite } = require("../support/suite");

const OUTRO_APP = "com.android.settings";
// queryAppState: 3 = rodando em segundo plano, 4 = na frente
const SEGUNDO_PLANO = 3;

describe("9 · Concorrência: convive com outros apps", () => {
  const n = prepararSuite();
  let base;
  beforeEach(async () => {
    await n.digitarTexto();
    base = await n.baseline();
  });

  async function outroAppPorCima() {
    await n.mobile("activateApp", { appId: OUTRO_APP });
    await browser.pause(2000);
    assert.equal(
      await n.mobile("queryAppState", { appId: PACKAGE }),
      SEGUNDO_PLANO,
    );
    await n.mobile("activateApp", { appId: PACKAGE });
    await browser.pause(1000);
  }

  it("Outro app por cima e volta sem perder o texto", async () => {
    await outroAppPorCima();
    await n.confirmaTexto(base);
  });

  it("Aviso de memória crítica não perde o texto", async () => {
    await n.mobile("sendTrimMemory", {
      pkg: PACKAGE,
      level: "RUNNING_CRITICAL",
    });
    await browser.pause(2000);
    await n.confirmaTexto(base);
  });

  it("Com 'Não manter atividades', sair e voltar não perde o texto", async () => {
    await n.comConfiguracao(
      "global",
      "always_finish_activities",
      1,
      async () => {
        await outroAppPorCima();
        await n.confirmaTexto(base);
      },
    );
  });
});
