const assert = require("node:assert/strict");
const { Nfr } = require("../support/nfr");
describe("Geolocalização: aparelho e sobrevivência [emulador] [aparelho_real]", () => {
  let n;
  before(async () => {
    n = new Nfr(browser, gestures);
    await n.prepare(".view.List1");
    await n.shell(
      "am broadcast -a io.appium.settings.location -n io.appium.settings/.receivers.LocationInfoReceiver",
    );
  });
  after(async () => {
    if (n) await n.mobile("resetGeolocation");
  });
  async function position(caso, latitude, longitude) {
    await n.mobile("setGeolocation", { latitude, longitude });
    let read;
    await browser.waitUntil(
      async () => {
        const s = await n.shell("dumpsys location"),
          m = s.match(/last location=Location\[gps (-?[\d.]+),(-?[\d.]+)/);
        read = m ? { latitude: Number(m[1]), longitude: Number(m[2]) } : null;
        return (
          read &&
          Math.abs(read.latitude - latitude) < 0.0002 &&
          Math.abs(read.longitude - longitude) < 0.0002
        );
      },
      {
        timeout: 75000,
        interval: 3000,
        timeoutMsg: "GPS não confirmou posição",
      },
    );
    n.csv.write("geolocalizacao", {
      caso,
      latitude,
      longitude,
      latitude_lida: read.latitude,
      longitude_lida: read.longitude,
    });
  }
  it("Segue rota simulada", async () => {
    const base = await n.baseline();
    for (const [lat, lon] of [
      [-23.5505, -46.6333],
      [-23.551, -46.634],
      [-23.5515, -46.6347],
      [-23.552, -46.6354],
    ])
      await position("rota", lat, lon);
    await n.alive(base);
  });
  it("Sobrevive ao salto de posição", async () => {
    const base = await n.baseline();
    await position("salto", -23.5505, -46.6333);
    await position("salto", 48.8566, 2.3522);
    await n.alive(base);
  });
  it("Sobrevive ao GPS desligado", async () => {
    const base = await n.baseline();
    try {
      await n.shell("cmd location set-location-enabled false");
      await browser.pause(2000);
      assert.match(await n.shell("cmd location is-location-enabled"), /false/);
      await n.alive(base, false);
    } finally {
      await n.shell("cmd location set-location-enabled true");
    }
  });
});
