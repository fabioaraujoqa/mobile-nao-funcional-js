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
