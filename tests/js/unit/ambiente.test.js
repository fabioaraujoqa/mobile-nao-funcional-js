const { motivoParaPular, marcas } = require("../support/ambiente");
const emulador = { emulador: true, braco: false },
  real = { emulador: false, braco: false },
  realComBraco = { emulador: false, braco: true };

test("lê as marcas do título", () => {
  expect(marcas("Chamada [emulador] [falha conhecida ApiDemos]")).toEqual([
    "emulador",
  ]);
  expect(marcas("Consumo [aparelho_real] [longo]")).toEqual([
    "aparelho_real",
    "longo",
  ]);
});
test("teste sem marca de ambiente roda em qualquer aparelho", () => {
  expect(motivoParaPular("Segundo plano", emulador)).toBeNull();
  expect(motivoParaPular("Segundo plano", real)).toBeNull();
});
test("teste de emulador pula no aparelho real e vice-versa", () => {
  expect(motivoParaPular("Chamada [emulador]", real)).toMatch(/só em emulador/);
  expect(motivoParaPular("Chamada [emulador]", emulador)).toBeNull();
  expect(motivoParaPular("Bateria [aparelho_real]", emulador)).toMatch(
    /aparelho_real/,
  );
});
test("teste do braço exige o braço real", () => {
  expect(motivoParaPular("Latência [braco]", real)).toMatch(/braço/);
  expect(motivoParaPular("Latência [braco]", realComBraco)).toBeNull();
});
