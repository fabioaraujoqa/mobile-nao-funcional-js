const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { Csv } = require("../support/csv");
test("CSV escapa aspas, mantém colunas e grava cada linha imediatamente", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tap-csv-"));
  try {
    const csv = new Csv(dir),
      file = csv.write("soak", { evento: 'a,"b"', pss_mb: null });
    csv.write("soak", { pss_mb: 1, evento: "ok" });
    const text = fs.readFileSync(file, "utf8");
    expect(text).toContain('"a,""b""",""');
    expect(text.trim().split("\n")).toHaveLength(3);
    expect(() => csv.write("soak", { other: 1 })).toThrow();
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
