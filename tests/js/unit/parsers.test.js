const fs = require("node:fs"),
  path = require("node:path");
const p = require("../support/parsers");
const fixture = (name) =>
  fs.readFileSync(
    path.resolve(__dirname, "../../unit/fixtures/moto_g06", name + ".txt"),
    "utf8",
  );
test("memória usa saídas reais Android e trata ausência", () => {
  expect(p.meminfo(fixture("meminfo"))).toEqual({
    pss_mb: 83580 / 1024,
    java_heap_mb: 12656 / 1024,
    native_heap_mb: 6224 / 1024,
  });
  expect(p.meminfo("No process found").pss_mb).toBeNull();
  expect(
    p.meminfo(" TOTAL 2048\n Native Heap 1024\n Dalvik Heap 512").pss_mb,
  ).toBe(2);
});
test("jank sem quadros não vira zero", () => {
  expect(p.gfxinfo(fixture("gfxinfo_reset")).janky_pct).toBe(100);
  expect(
    p.gfxinfo("Total frames rendered: 0\nJanky frames: 0").janky_pct,
  ).toBeNull();
});
test("bateria e térmica reais", () => {
  expect(p.battery(fixture("battery"))).toEqual({
    bateria_pct: 93,
    carregando: false,
    temperatura_c: 22,
  });
  expect(p.thermal(fixture("thermalservice"))).toBe(24);
  expect(p.battery("status: 2").carregando).toBe(true);
});
test("CPU tolera espaços no nome do processo", () => {
  expect(p.cpuTicks(fixture("proc_stat"))).toBe(547);
  expect(p.cpuTicks("1 (a b) c) S 1 1 0 0 -1 0 0 0 0 0 10 5 0 0")).toBe(15);
  expect(p.totalTicks(fixture("proc_stat_total"))).toBe(6766952);
});
test("inicialização exige TotalTime na validação", () => {
  expect(p.startup("TotalTime: 120\nWaitTime: 130\nLaunchState: COLD")).toEqual(
    { total_ms: 120, wait_ms: 130, estado: "COLD" },
  );
  expect(p.startup("").total_ms).toBeNull();
});
test("latência usa primeiro quadro válido posterior ao último toque", () => {
  const s =
    "---PROFILEDATA---\nFlags,FrameCompleted,\n0,1100000000,\n1,1050000000,\n0,1200000000,\n---PROFILEDATA---";
  expect(p.frames(s)).toEqual([1.1, 1.2]);
  expect(p.latency(1, p.frames(s))).toBeCloseTo(100);
  expect(() => p.latency(2, p.frames(s))).toThrow();
  expect(
    p.touch(
      "[ 1.0] /dev/input/event1: EV_KEY BTN_TOUCH DOWN\n[ 2.0] /dev/input/event1: EV_KEY BTN_TOUCH DOWN",
    ),
  ).toBe(2);
});
