const { percentile, slope, memorySlope, limit } = require("../support/metrics");
test("percentil interpola e rejeita dados ausentes", () => {
  expect(percentile([30, 10, 20], 95)).toBe(29);
  expect(() => percentile([], 50)).toThrow();
  expect(() => percentile([null], 50)).toThrow();
});
test("regressão recupera MB por hora e exige horários distintos", () => {
  expect(slope([0, 0.5, 1], [80, 85, 90])).toBe(10);
  expect(() => slope([0, 0, 0], [1, 2, 3])).toThrow();
});
test("memória separa reinícios e remove aquecimento", () => {
  const s = [
    { pid: 1, horas: 0, pss_mb: 100 },
    { pid: 1, horas: 1, pss_mb: 200 },
    ...Array.from({ length: 4 }, (_, i) => ({
      pid: 2,
      horas: i + 2,
      pss_mb: 10 + i * 5,
    })),
  ];
  expect(memorySlope(s, 1)).toEqual({
    mb_por_hora: 5,
    amostras: 3,
    trechos: 2,
    horas: 2,
  });
});
test("métrica ausente nunca aprova limite", () => {
  for (const v of [null, undefined, NaN, Infinity])
    expect(() => limit("m", v, 10)).toThrow();
  expect(() => limit("m", 11, 10)).toThrow();
});
