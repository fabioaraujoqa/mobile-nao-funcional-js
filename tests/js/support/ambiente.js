// "Onde rodar" de cada teste, declarado no próprio título:
//   [emulador] [aparelho_real]  ambientes em que o teste faz sentido (sem marca = qualquer um)
//   [braco]                     exige o braço real (ROBO=true, SIMULADO=false)
// Um teste fora do seu ambiente fica pendente (SKIP) com o motivo no log; não falha.

const AMBIENTES = ["emulador", "aparelho_real"];

/** Marcas entre colchetes do título: "Chamada [emulador]" → ["emulador"]. */
const marcas = (titulo) =>
  [...titulo.matchAll(/\[([\w_]+)\]/g)].map((m) => m[1].toLowerCase());

/** Motivo para não rodar neste ambiente, ou null se o teste cabe. */
function motivoParaPular(titulo, { emulador, braco }) {
  const m = marcas(titulo);
  const ambientes = m.filter((x) => AMBIENTES.includes(x));
  const atual = emulador ? "emulador" : "aparelho_real";
  if (ambientes.length && !ambientes.includes(atual))
    return `roda só em ${ambientes.join(" ou ")}; o aparelho atual é ${atual}`;
  if (m.includes("braco") && !braco)
    return "exige o braço real (ROBO=true, SIMULADO=false)";
  return null;
}

function ambienteAtual(driver = browser, gestures = global.gestures) {
  const udid =
    driver.requestedCapabilities?.["appium:udid"] ??
    driver.capabilities?.["appium:udid"] ??
    "";
  return {
    emulador: String(udid).startsWith("emulator-"),
    braco: Boolean(gestures?.robot && !gestures?.simulated),
  };
}

/** Use como `beforeEach(ondeRodar)`: pula o teste fora do seu ambiente. */
function ondeRodar() {
  const motivo = motivoParaPular(this.currentTest.title, ambienteAtual());
  if (motivo) {
    console.log(`SKIP "${this.currentTest.title}": ${motivo}`);
    require("./indicadores").registrarTeste(this.currentTest.title, "pulado", {
      erro: motivo,
    });
    this.skip();
  }
}

module.exports = { ondeRodar, motivoParaPular, marcas };
