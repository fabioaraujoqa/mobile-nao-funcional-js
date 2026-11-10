const { Nfr } = require("../support/nfr");
const { memorySlope, limit } = require("../support/metrics");
const L = require("../support/limits");
describe("Memória [emulador] [aparelho_real] [longo]", () => {
  it("Memória estável durante navegação", async function () {
    this.timeout((L.DURACAO_MIN + 10) * 60000);
    const n = new Nfr(browser, gestures);
    await n.prepare();
    const start = Date.now(),
      end = start + L.DURACAO_MIN * 60000;
    let base = await n.baseline(),
      crashes = 0;
    const samples = [];
    while (Date.now() < end) {
      try {
        for (const screen of [
          ".view.List1",
          ".animation.BouncingBalls",
          ".view.DragAndDropDemo",
        ]) {
          await n.open(screen);
          await n.scroll();
          await browser.pause(1000);
          await browser.back();
          await browser.pause(1000);
        }
      } catch (e) {
        console.warn("Navegação interrompida:", e.message);
      }
      const s = await n.sample(start),
        changed = s.pid !== base.pid;
      s.evento = changed ? "crash" : "";
      n.csv.write("soak", s);
      if (changed) {
        crashes++;
        await n.open();
        base = { ...base, pid: await n.pid() };
      } else {
        samples.push(s);
        for (const [field, max] of [
          ["pss_mb", L.SOAK_PSS_MAX_MB],
          ["threads", L.SOAK_THREADS_MAX],
          ["temperatura_c", L.SOAK_TEMP_MAX_C],
        ]) {
          limit(field, s[field], max);
        }
      }
      await n.wait(L.SOAK_PAUSA_CICLO_S);
    }
    limit(
      "Crashes",
      Math.max(crashes, (await n.crashes()) - base.crashes),
      L.SOAK_CRASHES_MAX,
    );
    const r = memorySlope(samples, L.SOAK_CICLOS_AQUECIMENTO);
    console.log(r);
    if (r.horas * 60 < L.SOAK_MIN_MINUTOS_REGRESSAO)
      throw Error("Medição insuficiente para validar crescimento da memória");
    limit("Memória MB/h", r.mb_por_hora, L.SOAK_MB_POR_HORA_MAX);
  });
});
