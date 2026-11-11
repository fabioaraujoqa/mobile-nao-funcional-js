// TIPO 5 DE 12 · DESEMPENHO — Teste de resistência (soak)
// Objetivo:    se o app aguenta horas de uso sem se degradar.
// O que testa: crescimento da memória (MB/h), teto de memória, threads, temperatura e crashes
//              durante DURACAO_MIN minutos de navegação.
// Onde rodar:  mesa (aparelho real). Relatórios longos: motor soak/ em Python.
// Appium:      mobile: shell (dumpsys meminfo · /proc) · BACK
// Se um teto estourar no meio, o laço para, as métricas são gravadas e só então o teste reprova.
const { prepararSuite } = require("../support/suite");
const { memorySlope } = require("../support/metrics");
const { registrar } = require("../support/indicadores");
const L = require("../support/limits");

const TELAS = [
  ".view.List1",
  ".animation.BouncingBalls",
  ".view.DragAndDropDemo",
];
const TETOS = [
  ["pss_mb", L.SOAK_PSS_MAX_MB],
  ["threads", L.SOAK_THREADS_MAX],
  ["temperatura_c", L.SOAK_TEMP_MAX_C],
];

describe("5 · Resistência: aguenta horas de uso", () => {
  const n = prepararSuite();

  it("Memória estável durante a navegação [longo]", async function () {
    this.timeout((L.DURACAO_MIN + 10) * 60000);
    const start = Date.now(),
      end = start + L.DURACAO_MIN * 60000;
    let base = await n.baseline(),
      crashes = 0,
      estouro = null;
    const samples = [];
    while (Date.now() < end && !estouro) {
      try {
        for (const tela of TELAS) {
          await n.open(tela);
          await n.scroll();
          await browser.pause(1000);
          await browser.back();
          await browser.pause(1000);
        }
      } catch (e) {
        console.warn("Navegação interrompida:", e.message);
      }
      const s = await n.sample(start),
        reiniciou = s.pid !== base.pid;
      s.evento = reiniciou ? "crash" : "";
      n.csv.write("soak", s);
      if (reiniciou) {
        crashes++;
        await n.open();
        base = { ...base, pid: await n.pid() };
        continue;
      }
      samples.push(s);
      const fora = TETOS.find(
        ([campo, max]) => !(Number.isFinite(s[campo]) && s[campo] <= max),
      );
      if (fora) estouro = `${fora[0]} = ${s[fora[0]]} (teto ${fora[1]})`;
      else await n.wait(L.SOAK_PAUSA_CICLO_S);
    }

    // Grava tudo o que foi medido antes de decidir: o indicador não perde rodadas reprovadas.
    const maior = (campo) =>
      Math.max(...samples.map((s) => s[campo]).filter(Number.isFinite));
    let regressao = null;
    try {
      regressao = memorySlope(samples, L.SOAK_CICLOS_AQUECIMENTO);
      console.log(regressao);
    } catch (e) {
      console.warn("Sem regressão:", e.message);
    }
    const falhas = [
      [
        "PSS máximo",
        maior("pss_mb"),
        { max: L.SOAK_PSS_MAX_MB, unidade: "MB" },
      ],
      [
        "Threads máximo",
        maior("threads"),
        { max: L.SOAK_THREADS_MAX, unidade: "threads" },
      ],
      [
        "Temperatura máxima",
        maior("temperatura_c"),
        { max: L.SOAK_TEMP_MAX_C, unidade: "°C" },
      ],
      [
        "Crashes",
        Math.max(crashes, (await n.crashes()) - base.crashes),
        { max: L.SOAK_CRASHES_MAX, unidade: "crashes" },
      ],
      [
        "Duração medida",
        regressao ? regressao.horas * 60 : (Date.now() - start) / 60000,
        { min: L.SOAK_MIN_MINUTOS_REGRESSAO, unidade: "min" },
      ],
      [
        "Crescimento da memória",
        regressao?.mb_por_hora ?? NaN,
        { max: L.SOAK_MB_POR_HORA_MAX, unidade: "MB/h" },
      ],
    ]
      .filter(([nome, valor, opcoes]) => !registrar(nome, valor, opcoes))
      .map(([nome, valor]) => `${nome}: ${valor}`);
    if (estouro) falhas.unshift(`Teto estourado durante a rodada: ${estouro}`);
    if (falhas.length) throw Error(falhas.join("; "));
  });
});
