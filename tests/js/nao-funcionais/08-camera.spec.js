const { Nfr, PACKAGE } = require("../support/nfr");
const L = require("../support/limits");
describe("Câmera [emulador] [aparelho_real]", () => {
  let n;
  before(async () => {
    n = new Nfr(browser, gestures);
    await n.prepare();
  });
  it("Preview abre e fecha repetidamente", async () => {
    const base = await n.baseline();
    for (let i = 0; i < L.CAMERA_REPETICOES; i++) {
      await n.open(".graphics.CameraPreview");
      await browser.pause(2000);
      await browser.back();
      await browser.pause(1000);
      n.csv.write("camera", {
        caso: "repeticoes",
        repeticao: i,
        pid: await n.pid(),
        crashes: (await n.crashes()) - base.crashes,
      });
    }
    await n.alive(base);
  });
  it("Permissão negada não derruba o app [falha conhecida ApiDemos]", async () => {
    try {
      await n.shell(`pm revoke ${PACKAGE} android.permission.CAMERA`);
      await n.open();
      await browser.pause(1000);
      const base = await n.baseline();
      await n.open(".graphics.CameraPreview");
      await browser.pause(3000);
      n.csv.write("camera", {
        caso: "permissao_negada",
        repeticao: 0,
        pid: await n.pid(),
        crashes: (await n.crashes()) - base.crashes,
      });
      await n.alive(base, false);
    } finally {
      await n.shell(`pm grant ${PACKAGE} android.permission.CAMERA`);
    }
  });
});
