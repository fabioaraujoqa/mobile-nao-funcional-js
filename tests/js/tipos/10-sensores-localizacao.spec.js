// TIPO 10 DE 12 · AMBIENTE — Teste de sensores e localização
// Objetivo:    se o app usa GPS, câmera e sensores direito, e sobrevive quando eles falham.
// O que testa: rota e salto de GPS, GPS desligado, câmera repetida e sem permissão,
//              leituras de sensores e rotação da tela.
// Onde rodar:  emulador (tudo) e mesa (GPS simulado, câmera, rotação). Sensores simulados só
//              existem no emulador.
// Appium:      mobile: setGeolocation · mobile: changePermissions · mobile: sensorSet ·
//              setOrientation
// Falhas conhecidas do ApiDemos ficam marcadas no título e não viram aprovação.
const assert = require("node:assert/strict");
const { Nfr, PACKAGE } = require("../support/nfr");
const { ondeRodar } = require("../support/ambiente");
const L = require("../support/limits");

const CAMERA = "android.permission.CAMERA";

describe("10 · Sensores e localização: usa e sobrevive às falhas", () => {
  let n;
  before(async () => {
    n = new Nfr(browser, gestures);
    await n.prepare();
    // No emulador, a posição só é registrada se algum app pedir o GPS.
    await n.shell(
      "am broadcast -a io.appium.settings.location -n io.appium.settings/.receivers.LocationInfoReceiver",
    );
  });
  after(async () => {
    if (n) await n.mobile("resetGeolocation");
  });
  beforeEach(ondeRodar);

  describe("GPS", () => {
    async function posicao(caso, latitude, longitude) {
      await n.mobile("setGeolocation", { latitude, longitude });
      let lida;
      await browser.waitUntil(
        async () => {
          const m = (await n.shell("dumpsys location")).match(
            /last location=Location\[gps (-?[\d.]+),(-?[\d.]+)/,
          );
          lida = m ? { latitude: Number(m[1]), longitude: Number(m[2]) } : null;
          return (
            lida &&
            Math.abs(lida.latitude - latitude) < 0.0002 &&
            Math.abs(lida.longitude - longitude) < 0.0002
          );
        },
        {
          timeout: 75000,
          interval: 3000,
          timeoutMsg: "GPS não confirmou a posição",
        },
      );
      n.csv.write("geolocalizacao", {
        caso,
        latitude,
        longitude,
        latitude_lida: lida.latitude,
        longitude_lida: lida.longitude,
      });
    }

    it("Segue uma rota simulada", async function () {
      this.timeout(6 * 60000);
      const base = await n.baseline();
      for (const [lat, lon] of [
        [-23.5505, -46.6333],
        [-23.551, -46.634],
        [-23.5515, -46.6347],
        [-23.552, -46.6354],
      ])
        await posicao("rota", lat, lon);
      await n.alive(base);
    });

    it("Sobrevive a um salto de posição (São Paulo → Paris)", async () => {
      const base = await n.baseline();
      await posicao("salto", -23.5505, -46.6333);
      await posicao("salto", 48.8566, 2.3522);
      await n.alive(base);
    });

    it("Sobrevive ao GPS desligado", async () => {
      const base = await n.baseline();
      try {
        await n.shell("cmd location set-location-enabled false");
        await browser.pause(2000);
        assert.match(
          await n.shell("cmd location is-location-enabled"),
          /false/,
        );
        await n.alive(base, false);
      } finally {
        await n.shell("cmd location set-location-enabled true");
      }
    });
  });

  describe("Câmera", () => {
    it(`Abre e fecha o preview ${L.CAMERA_REPETICOES} vezes sem cair`, async () => {
      await n.open();
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

    it("Permissão de câmera negada não derruba o app [falha conhecida ApiDemos]", async () => {
      try {
        await n.mobile("changePermissions", {
          permissions: CAMERA,
          appPackage: PACKAGE,
          action: "revoke",
        });
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
        await n.mobile("changePermissions", {
          permissions: CAMERA,
          appPackage: PACKAGE,
          action: "grant",
        });
        await n.open();
      }
    });
  });

  describe("Sensores e rotação", () => {
    it("Tela de sensores abre sem cair [emulador] [falha conhecida ApiDemos]", async () => {
      await n.open();
      const base = await n.baseline();
      try {
        await n.open(".os.Sensors");
        await browser.pause(2000);
        await n.alive(base, false);
      } finally {
        await n.open();
      }
    });

    it("Bússola aguenta mudanças de leitura [emulador]", async () => {
      await n.open(".graphics.Compass");
      const base = await n.baseline();
      for (const [sensorType, value] of [
        ["light", "50"],
        ["proximity", "1"],
        ["temperature", "25"],
        ["pressure", "1000"],
        ["humidity", "60"],
        ["acceleration", "0:9.8:0"],
        ["acceleration", "9.8:0:0"],
      ]) {
        await n.mobile("sensorSet", { sensorType, value });
        await browser.pause(500);
      }
      await n.alive(base);
    });

    it("Texto digitado sobrevive à rotação da tela", async () => {
      const texto = "texto preservado";
      await n.digitarTexto(texto);
      const base = await n.baseline();
      try {
        for (const orientacao of ["LANDSCAPE", "PORTRAIT"]) {
          await browser.setOrientation(orientacao);
          await browser.pause(1000);
          await n.confirmaTexto(base, texto);
        }
      } finally {
        await browser.setOrientation("PORTRAIT");
      }
    });
  });
});
