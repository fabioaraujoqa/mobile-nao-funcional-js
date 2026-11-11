const { Nfr } = require("../support/nfr");
test("shell usa mobile: shell e explica a permissão somente para esse erro", async () => {
  const execute = jest.fn(async () => ({ stdout: "ok" })),
    n = new Nfr({ execute });
  expect(await n.shell("true")).toBe("ok");
  expect(execute).toHaveBeenCalledWith("mobile: shell", {
    command: "true",
    timeout: 30000,
  });
  execute.mockRejectedValueOnce(Error("adb_shell disabled"));
  await expect(n.shell("true")).rejects.toThrow("allow-insecure");
  execute.mockRejectedValueOnce(Error("device offline"));
  await expect(n.shell("true")).rejects.toThrow("device offline");
});
test("latência rejeita evento antigo mesmo com quadros novos", async () => {
  const n = new Nfr({});
  n.shell = jest.fn(
    async () => "[ 2.0] /dev/input/event1: EV_KEY BTN_TOUCH DOWN",
  );
  await expect(n.latency(2)).rejects.toThrow("Nenhum contato físico novo");
});
test("app ausente não pode criar referência válida de processo", async () => {
  const n = new Nfr({});
  n.pid = async () => null;
  await expect(n.baseline()).rejects.toThrow("execução");
});
test("reinício do processo falha na verificação de sobrevivência", async () => {
  const n = new Nfr({});
  n.pid = async () => 2;
  await expect(n.alive({ pid: 1, crashes: 0 })).rejects.toThrow(
    "Processo morreu",
  );
});
test("rolagem usa os gestos injetados", async () => {
  const swipe = jest.fn(),
    n = new Nfr(
      { getWindowSize: async () => ({ width: 100, height: 1000 }) },
      { swipe },
    );
  await n.scroll();
  expect(swipe).toHaveBeenCalledWith(50, 800, 50, 200, 0.3);
});
test("comConfiguracao devolve o valor anterior mesmo se a ação falhar", async () => {
  const n = new Nfr({});
  const comandos = [];
  n.shell = jest.fn(
    async (c) => (comandos.push(c), c.includes(" get ") ? "1.0\n" : ""),
  );
  await expect(
    n.comConfiguracao("system", "font_scale", 1.3, async () => {
      throw Error("falhou");
    }),
  ).rejects.toThrow("falhou");
  expect(comandos).toEqual([
    "settings get system font_scale",
    "settings put system font_scale 1.3",
    "settings put system font_scale 1.0",
  ]);
});
test("comConfiguracao apaga a configuração que não existia antes", async () => {
  const n = new Nfr({});
  n.shell = jest.fn(async (c) => (c.includes(" get ") ? "null" : ""));
  expect(
    await n.comConfiguracao(
      "global",
      "always_finish_activities",
      1,
      async () => 7,
    ),
  ).toBe(7);
  expect(n.shell).toHaveBeenLastCalledWith(
    "settings delete global always_finish_activities",
  );
});
test("sem argumentos, usa os globais do WebdriverIO na hora do uso", () => {
  const n = new Nfr();
  global.browser = { id: "b" };
  global.gestures = { id: "g" };
  try {
    expect(n.driver.id).toBe("b");
    expect(n.gestures.id).toBe("g");
  } finally {
    delete global.browser;
    delete global.gestures;
  }
});
