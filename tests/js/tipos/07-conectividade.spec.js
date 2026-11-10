// TIPO 7 DE 12 · AMBIENTE — Teste de conectividade
// Objetivo:    como o app se comporta sem conexão ou com conexão ruim.
// O que testa: perda e volta da conexão, modo avião, troca de Wi-Fi para dados e rede lenta.
// Onde rodar:  emulador (tudo) e mesa (troca Wi-Fi → dados, Android 11+). Cada teste
//              devolve o estado de rede que o aparelho tinha antes.
// Appium:      mobile: setConnectivity · mobile: getConnectivity · mobile: networkSpeed
// O ApiDemos não usa rede: aqui se verifica que o app sobrevive, não que os dados sincronizam.
const { Nfr } = require("../support/nfr");
const { ondeRodar } = require("../support/ambiente");

describe("7 · Conectividade: aguenta rede ruim", () => {
  let n;
  before(async () => {
    n = new Nfr(browser, gestures);
    await n.prepare(".view.List1");
  });
  beforeEach(ondeRodar);

  /** Executa `acao` e devolve Wi-Fi, dados e modo avião ao estado anterior. */
  async function comRedeRestaurada(acao) {
    const antes = await n.mobile("getConnectivity");
    try {
      await acao();
    } finally {
      await n.mobile("setConnectivity", {
        wifi: antes.wifi,
        data: antes.data,
        airplaneMode: antes.airplaneMode,
      });
    }
  }

  it("Sobrevive à perda e à volta da conexão [emulador]", async () => {
    const base = await n.baseline();
    await comRedeRestaurada(async () => {
      for (const estado of [
        { wifi: false, data: false },
        { airplaneMode: true },
        { airplaneMode: false, wifi: true, data: true },
      ]) {
        await n.mobile("setConnectivity", estado);
        await browser.pause(2000);
        await n.alive(base);
      }
      await n.scroll();
    });
  });

  it("Troca do Wi-Fi para dados móveis sem cair", async () => {
    const base = await n.baseline();
    await comRedeRestaurada(async () => {
      await n.mobile("setConnectivity", { wifi: false, data: true });
      await browser.waitUntil(
        async () => !(await n.mobile("getConnectivity")).wifi,
        {
          timeout: 15000,
          timeoutMsg: "O Wi-Fi não desligou",
        },
      );
      await n.scroll();
      await n.alive(base);
    });
  });

  it("Sobrevive às velocidades de rede [emulador]", async () => {
    const base = await n.baseline();
    try {
      for (const speed of ["gsm", "edge", "umts", "lte", "full"]) {
        await n.mobile("networkSpeed", { speed });
        await n.scroll();
        await n.alive(base);
      }
    } finally {
      await n.mobile("networkSpeed", { speed: "full" });
    }
  });
});
