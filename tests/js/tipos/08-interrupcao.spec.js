// TIPO 8 DE 12 · AMBIENTE — Teste de interrupção
// Objetivo:    como o app reage quando algo interrompe o uso.
// O que testa: chamada, SMS, segundo plano e bloqueio de tela, com o texto digitado preservado.
// Onde rodar:  emulador (tudo) e mesa (segundo plano). Chamada e SMS simulados só existem no
//              emulador. Bloqueio no aparelho real exige appium:unlockType/unlockKey se houver senha.
// Appium:      mobile: gsmCall · mobile: sendSms · mobile: backgroundApp · mobile: lock
const { prepararSuite } = require("../support/suite");

const TELEFONE = "11999990000";

describe("8 · Interrupção: retoma de onde parou", () => {
  const n = prepararSuite();
  let base;
  beforeEach(async () => {
    await n.digitarTexto();
    base = await n.baseline();
  });

  it("Chamada não perde o texto digitado [emulador]", async () => {
    try {
      await n.mobile("gsmCall", { phoneNumber: TELEFONE, action: "call" });
      await browser.pause(3000);
    } finally {
      await n.mobile("gsmCall", { phoneNumber: TELEFONE, action: "cancel" });
    }
    await browser.pause(3000);
    await n.confirmaTexto(base);
  });

  it("SMS não perde o texto digitado [emulador]", async () => {
    await n.mobile("sendSms", {
      phoneNumber: TELEFONE,
      message: "Mensagem de teste",
    });
    await browser.pause(3000);
    await n.confirmaTexto(base);
  });

  it("Ir para o segundo plano e voltar não perde o texto", async () => {
    await n.mobile("backgroundApp", { seconds: 3 });
    await n.confirmaTexto(base);
  });

  it("Bloquear e desbloquear a tela não perde o texto [emulador]", async () => {
    await n.mobile("lock", { seconds: 3 });
    await browser.pause(1000);
    await n.confirmaTexto(base);
  });
});
