// TIPO 6 DE 12 · DESEMPENHO — Teste de bateria e temperatura
// Objetivo:    quanto o app gasta de energia e o quanto esquenta o aparelho.
// O que testa: consumo por hora (%/h, regressão linear) e temperatura máxima durante o uso.
// Onde rodar:  mesa, aparelho real FORA DA TOMADA (adb por Wi-Fi). Carregando = SKIP.
// Appium:      mobile: shell (dumpsys battery · dumpsys thermalservice)
const { prepararSuite } = require("../support/suite");
const { slope } = require("../support/metrics");
const { medir } = require("../support/indicadores");
const L = require("../support/limits");

describe("6 · Bateria e temperatura: econômico e frio", () => {
  const n = prepararSuite(".animation.BouncingBalls");

  it("Consumo e temperatura dentro do limite [aparelho_real] [longo]", async function () {
    this.timeout((L.DURACAO_MIN + 10) * 60000);
    if (L.BATERIA_INTERVALO_MIN <= 0)
      throw Error("Intervalo de bateria deve ser positivo");
    const start = Date.now(),
      horas = [],
      niveis = [],
      temperaturas = [];
    let carregando = false;
    // A tela fica acesa durante a medida e volta ao tempo de antes no fim.
    await n.comConfiguracao(
      "system",
      "screen_off_timeout",
      L.BATERIA_TELA_LIGADA_MS,
      async () => {
        const ciclos = Math.floor(L.DURACAO_MIN / L.BATERIA_INTERVALO_MIN);
        for (let i = 0; i <= ciclos; i++) {
          const s = await n.sample(start);
          n.csv.write("bateria", s);
          horas.push(s.horas);
          niveis.push(s.bateria_pct);
          if (s.temperatura_c != null) temperaturas.push(s.temperatura_c);
          carregando ||= s.carregando;
          if (carregando) break;
          if (i < ciclos) await n.wait(L.BATERIA_INTERVALO_MIN * 60);
        }
      },
    );
    if (carregando) {
      console.log(
        "SKIP: aparelho carregando; desconecte o cabo e use adb por Wi-Fi",
      );
      this.skip();
    }
    medir("Consumo de bateria", -slope(horas, niveis), {
      max: L.BATERIA_MAX_PCT_POR_HORA,
      unidade: "%/h",
    });
    medir("Temperatura máxima", Math.max(...temperaturas), {
      max: L.BATERIA_TEMP_MAX_C,
      unidade: "°C",
    });
  });
});
