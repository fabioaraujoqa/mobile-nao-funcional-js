const { Nfr } = require("../support/nfr");
const { slope, limit } = require("../support/metrics");
const L = require("../support/limits");
describe("Bateria [aparelho_real] [longo]", () => {
  it("Consumo dentro do limite", async function () {
    this.timeout((L.DURACAO_MIN + 10) * 60000);
    const n = new Nfr(browser, gestures);
    await n.prepare(".animation.BouncingBalls");
    const old = (
      await n.shell("settings get system screen_off_timeout")
    ).trim();
    const start = Date.now(),
      hours = [],
      levels = [];
    let charging = false;
    try {
      await n.shell(
        `settings put system screen_off_timeout ${L.BATERIA_TELA_LIGADA_MS}`,
      );
      if (L.BATERIA_INTERVALO_MIN <= 0)
        throw Error("Intervalo de bateria deve ser positivo");
      const cycles = Math.floor(L.DURACAO_MIN / L.BATERIA_INTERVALO_MIN);
      for (let i = 0; i <= cycles; i++) {
        const s = await n.sample(start);
        n.csv.write("bateria", s);
        hours.push(s.horas);
        levels.push(s.bateria_pct);
        charging ||= s.carregando;
        if (charging) break;
        if (i < cycles) await n.wait(L.BATERIA_INTERVALO_MIN * 60);
      }
    } finally {
      await n.shell(`settings put system screen_off_timeout ${old}`);
    }
    if (charging) this.skip();
    limit("Consumo %/h", -slope(hours, levels), L.BATERIA_MAX_PCT_POR_HORA);
  });
});
