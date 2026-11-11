const session = require("../support/session");
const { config } = require("../../../wdio.conf");
const env = { UDID: "device" };

test("ApiDemos instala o APK do repositório e respeita UDID explícito", () => {
  const caps = session.capabilities(["tipos/01-funcional.spec.js"], env);
  expect(caps["appium:udid"]).toBe("device");
  expect(caps["appium:appPackage"]).toBe("io.appium.android.apis");
  expect(caps["appium:app"]).toMatch(/apps\/ApiDemos-debug\.apk$/);
});
test("AddNumber usa o aplicativo instalado, sem APK", () => {
  const caps = session.capabilities(["outros-apps/addnumber.spec.js"], env);
  expect(caps["appium:appPackage"]).toBe("com.browserstack.addnumber");
  expect(caps["appium:app"]).toBeUndefined();
});
test("só funcional e usabilidade usam o braço; os outros tipos, software", () => {
  const software = { robot: false, simulated: false };
  expect(session.gestureOptions(["/tipos/01-funcional.spec.js"])).toEqual({});
  expect(session.gestureOptions(["/tipos/02-usabilidade.spec.js"])).toEqual({});
  expect(session.gestureOptions(["/tipos/04-performance.spec.js"])).toEqual(
    software,
  );
  expect(session.gestureOptions(["/tipos/12-seguranca.spec.js"])).toEqual(
    software,
  );
});
test("wdio.conf tem uma suíte com os 12 tipos, em ordem", () => {
  expect(config.suites.tipos).toHaveLength(12);
  expect(config.suites.tipos[0]).toMatch(/01-funcional/);
  expect(config.suites.tipos[11]).toMatch(/12-seguranca/);
  expect(config.suites.nfr).toHaveLength(11);
});
test("wdio.conf aplica as capabilities da sessão", () => {
  process.env.UDID = "device";
  try {
    const caps = {};
    config.beforeSession({}, caps, ["tipos/01-funcional.spec.js"]);
    expect(caps["appium:udid"]).toBe("device");
  } finally {
    delete process.env.UDID;
  }
});
test("wdio.conf separa longos, rápidos, braço e um tipo por nome", () => {
  const nomes = (s) => config.suites[s].map((f) => f.split("/").pop());
  expect(nomes("longos")).toEqual([
    "05-resistencia.spec.js",
    "06-bateria-temperatura.spec.js",
  ]);
  expect(config.suites.rapidos).toHaveLength(10);
  expect(nomes("braco")).toEqual([
    "01-funcional.spec.js",
    "02-usabilidade.spec.js",
  ]);
  expect(nomes("seguranca")).toEqual(["12-seguranca.spec.js"]);
});
