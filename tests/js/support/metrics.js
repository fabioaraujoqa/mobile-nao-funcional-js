function numbers(values) {
  if (
    !values.length ||
    values.some((v) => typeof v !== "number" || !Number.isFinite(v))
  )
    throw Error("Amostras ausentes ou inválidas");
  return values;
}
function percentile(values, p) {
  const a = [...numbers(values)].sort((x, y) => x - y);
  if (!Number.isFinite(p) || p < 0 || p > 100)
    throw Error("Percentil inválido");
  const i = ((a.length - 1) * p) / 100,
    lo = Math.floor(i);
  return a[lo] + (a[Math.ceil(i)] - a[lo]) * (i - lo);
}
function slope(x, y) {
  numbers(x);
  numbers(y);
  if (x.length !== y.length || x.length < 3)
    throw Error("Regressão exige três amostras pareadas");
  const mx = x.reduce((a, b) => a + b) / x.length,
    my = y.reduce((a, b) => a + b) / y.length;
  const d = x.reduce((a, v) => a + (v - mx) ** 2, 0);
  if (!d) throw Error("Horários iguais");
  return x.reduce((a, v, i) => a + (v - mx) * (y[i] - my), 0) / d;
}
function memorySlope(samples, warmup = 0) {
  const groups = [];
  for (const s of samples) {
    if (s.pid == null || s.pss_mb == null) continue;
    if (!groups.length || groups.at(-1).at(-1).pid !== s.pid) groups.push([]);
    groups.at(-1).push(s);
  }
  const g = groups.sort((a, b) => b.length - a.length)[0]?.slice(warmup) || [];
  return {
    mb_por_hora: slope(
      g.map((s) => s.horas),
      g.map((s) => s.pss_mb),
    ),
    amostras: g.length,
    trechos: groups.length,
    horas: g.at(-1).horas - g[0].horas,
  };
}
function limit(name, value, max) {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw Error(`${name}: métrica ausente ou inválida`);
  if (value > max) throw Error(`${name}: ${value} acima de ${max}`);
}
module.exports = { percentile, slope, memorySlope, limit };
