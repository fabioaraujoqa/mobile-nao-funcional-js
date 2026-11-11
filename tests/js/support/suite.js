// Ganchos comuns dos specs de tipos/. Chame dentro do `describe`:
//
//   describe("4 · Performance", () => {
//     const n = prepararSuite();          // ou prepararSuite(".view.List1")
//     it("...", async () => { await n.open(); });
//   });
//
// Registra um `before` que confere o aparelho (adb, diálogos, tela desbloqueada) e abre a
// activity, e um `beforeEach` que pula o teste fora do seu ambiente ([emulador] etc.).
const { Nfr } = require("./nfr");
const { ondeRodar } = require("./ambiente");

function prepararSuite(activity) {
  const n = new Nfr();
  before(() => n.prepare(activity));
  beforeEach(ondeRodar);
  return n;
}

module.exports = { prepararSuite };
