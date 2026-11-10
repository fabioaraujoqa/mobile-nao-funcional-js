const session = require("../support/session");
const { config } = require("../../../wdio.conf");
const real = { UDID: "device" },
  emulator = { UDID: "emulator-5554" };

test("ApiDemos instala o APK do repositório e respeita UDID explícito", () => {
  const caps = session.capabilities(["apidemos.spec.js"], real);
  expect(caps["appium:udid"]).toBe("device");
  expect(caps["appium:appPackage"]).toBe("io.appium.android.apis");
  expect(caps["appium:app"]).toMatch(/apps\/ApiDemos-debug\.apk$/);
});
test("AddNumber usa o aplicativo instalado, sem APK", () => {
  const caps = session.capabilities(["addnumber.spec.js"], real);
  expect(caps["appium:appPackage"]).toBe("com.browserstack.addnumber");
  expect(caps["appium:app"]).toBeUndefined();
});
test.each(["05-sensores", "06-rede", "07-interrupcoes"])(
  "%s rejeita aparelho real",
  (name) => {
    expect(() => session.capabilities([`${name}.spec.js`], real)).toThrow(
      "emulador",
    );
  },
);
test("bateria rejeita emulador", () => {
  expect(() => session.capabilities(["04-bateria.spec.js"], emulator)).toThrow(
    "aparelho real",
  );
});
test("não funcionais usam gestos por software, exceto a latência", () => {
  expect(
    session.gestureOptions(["/nao-funcionais/01-inicializacao.spec.js"]),
  ).toEqual({
    robot: false,
    simulated: false,
  });
  expect(
    session.gestureOptions(["/nao-funcionais/10-latencia.spec.js"]),
  ).toEqual({});
  expect(session.gestureOptions(["/funcionais/apidemos.spec.js"])).toEqual({});
});
test("wdio.conf aplica as capabilities da sessão", () => {
  process.env.UDID = "device";
  try {
    const caps = {};
    config.beforeSession({}, caps, ["apidemos.spec.js"]);
    expect(caps["appium:udid"]).toBe("device");
  } finally {
    delete process.env.UDID;
  }
});
