const num = (s, re) => {
  const m = s.match(re);
  return m ? Number(m[1]) : null;
};
function meminfo(s) {
  const summary = s.split("App Summary")[1] || "";
  const mb = (v) => (v == null ? null : v / 1024);
  return {
    pss_mb: mb(num(s, /TOTAL PSS:\s+(\d+)/) ?? num(s, /^\s*TOTAL\s+(\d+)/m)),
    java_heap_mb: mb(
      num(summary, /Java Heap:\s+(\d+)/) ?? num(s, /^\s*Dalvik Heap\s+(\d+)/m),
    ),
    native_heap_mb: mb(
      num(summary, /Native Heap:\s+(\d+)/) ??
        num(s, /^\s*Native Heap\s+(\d+)/m),
    ),
  };
}
function gfxinfo(s) {
  const frames = num(s, /Total frames rendered:\s*(\d+)/),
    j = num(s, /Janky frames:\s*(\d+)/);
  return {
    frames,
    janky_frames: j,
    janky_pct: frames && j != null ? (100 * j) / frames : null,
    frame_p90_ms: num(s, /^90th percentile:\s*(\d+)ms/m),
  };
}
function battery(s) {
  const level = num(s, /^\s*level:\s*(\d+)/m),
    scale = num(s, /^\s*scale:\s*(\d+)/m) || 100,
    temp = num(s, /^\s*temperature:\s*(-?\d+)/m);
  return {
    bateria_pct: level == null ? null : (100 * level) / scale,
    carregando:
      /^\s*(?:AC|USB|Wireless|Dock) powered:\s*true/m.test(s) ||
      [2, 5].includes(num(s, /^\s*status:\s*(\d+)/m)),
    temperatura_c: temp == null ? null : temp / 10,
  };
}
function thermal(s) {
  const section = s.includes("Current temperatures from HAL")
    ? s
        .split("Current temperatures from HAL")[1]
        .split("Current cooling devices")[0]
    : s;
  const temps = {};
  for (const m of section.matchAll(
    /Temperature\{mValue=([-\d.]+),\s*mType=\d+,\s*mName=([^,}]+)/g,
  ))
    temps[m[2].trim().toUpperCase()] ??= Number(m[1]);
  return temps.SKIN ?? temps.CPU ?? temps.SOC ?? null;
}
function frames(s) {
  const out = [];
  for (const m of s.matchAll(
    /---PROFILEDATA---\s*\n([\s\S]*?)---PROFILEDATA---/g,
  )) {
    const lines = m[1]
      .trim()
      .split("\n")
      .map((l) => l.trim().replace(/,$/, "").split(","));
    const header = lines.shift(),
      flag = header.indexOf("Flags"),
      end = header.indexOf("FrameCompleted");
    if (flag < 0 || end < 0) continue;
    for (const row of lines)
      if (row[flag] === "0" && Number(row[end]) > 0)
        out.push(Number(row[end]) / 1e9);
  }
  return out.sort((a, b) => a - b);
}
function touch(s) {
  return (
    [...s.matchAll(/\[\s*([\d.]+)\]\s+\S*\s*EV_KEY\s+BTN_TOUCH\s+DOWN/g)]
      .map((m) => Number(m[1]))
      .at(-1) ?? null
  );
}
function latency(t, fs) {
  const f = fs.find((v) => v > t);
  if (t == null || f == null) throw Error("Sem toque ou quadro novo");
  return (f - t) * 1000;
}
function startup(s) {
  return {
    total_ms: num(s, /^\s*TotalTime:\s*(\d+)/m),
    wait_ms: num(s, /^\s*WaitTime:\s*(\d+)/m),
    estado: s.match(/^\s*LaunchState:\s*(\w+)/m)?.[1] ?? null,
  };
}
function cpuTicks(s) {
  const fields = s
    .slice(s.lastIndexOf(")") + 1)
    .trim()
    .split(/\s+/);
  return s.includes(")") && fields.length >= 13
    ? Number(fields[11]) + Number(fields[12])
    : null;
}
function totalTicks(s) {
  const m = s.match(/^cpu\s+(.+)$/m);
  return m
    ? m[1]
        .trim()
        .split(/\s+/)
        .reduce((a, v) => a + Number(v), 0)
    : null;
}
module.exports = {
  num,
  meminfo,
  gfxinfo,
  battery,
  thermal,
  frames,
  touch,
  latency,
  startup,
  cpuTicks,
  totalTicks,
};
