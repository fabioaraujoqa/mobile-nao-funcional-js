const { RobotClient } = require("../support/robot-client");
const { Gestures } = require("../support/gestures");
test("cliente propaga falha HTTP sem aprovação falsa", async () => {
  const c = new RobotClient("http://localhost", async () => ({
    ok: false,
    status: 500,
    json: async () => ({ ok: false, error: "sem contato" }),
  }));
  await expect(c.tap(1, 2)).rejects.toThrow("sem contato");
});
test("arraste envia duração e espera", async () => {
  const request = jest.fn(async () => ({
    ok: true,
    json: async () => ({ ok: true }),
  }));
  await new RobotClient("http://localhost", request).swipe(
    1,
    2,
    3,
    4,
    0.8,
    0.6,
  );
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
    x1: 1,
    y1: 2,
    x2: 3,
    y2: 4,
    duration_s: 0.8,
    hold_s: 0.6,
  });
});
test("modo real exige confirmação de contato e corresponde ao servidor", async () => {
  const g = new Gestures(
    {},
    {
      robot: true,
      simulated: false,
      client: {
        health: async () => ({ ok: true, calibrated: true, simulated: false }),
      },
    },
  );
  await expect(g.prepare()).rejects.toThrow("confirmação");
});
test("clique físico usa centro e não clica por software", async () => {
  const el = {
      waitForDisplayed: jest.fn(),
      getLocation: async () => ({ x: 10, y: 20 }),
      getSize: async () => ({ width: 40, height: 60 }),
      click: jest.fn(),
    },
    tap = jest.fn();
  await new Gestures(
    { $: async () => el },
    { robot: true, simulated: false, client: { tap } },
  ).click("x");
  expect(tap).toHaveBeenCalledWith(30, 50);
  expect(el.click).not.toHaveBeenCalled();
});
test("simulado executa gesto e clique por software", async () => {
  const el = {
      waitForDisplayed: jest.fn(),
      getLocation: async () => ({ x: 0, y: 0 }),
      getSize: async () => ({ width: 10, height: 10 }),
      click: jest.fn(),
    },
    tap = jest.fn();
  await new Gestures(
    { $: async () => el },
    { robot: true, simulated: true, client: { tap } },
  ).click("x");
  expect(tap).toHaveBeenCalled();
  expect(el.click).toHaveBeenCalled();
});
test("servidor fora do ar gera mensagem com o comando para iniciar", async () => {
  const c = new RobotClient("http://localhost:1", async () => {
    throw Object.assign(Error("fetch failed"), {
      cause: { code: "ECONNREFUSED" },
    });
  });
  await expect(c.health()).rejects.toThrow(
    /indisponível.*ECONNREFUSED.*tools\.server/,
  );
});
test("resposta que não é JSON informa o status HTTP", async () => {
  const c = new RobotClient("http://localhost", async () => ({
    ok: false,
    status: 502,
    json: async () => {
      throw SyntaxError("Unexpected token <");
    },
  }));
  await expect(c.tap(1, 2)).rejects.toThrow("resposta inválida (HTTP 502)");
});
