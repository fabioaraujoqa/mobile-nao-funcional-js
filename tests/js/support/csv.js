const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const escape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
class Csv {
  constructor(
    dir = path.join(process.env.RESULTS_DIR || "results/wdio", "nfr"),
  ) {
    this.dir = dir;
    this.files = new Map();
    this.run = `${process.env.RODADA_ID || new Date().toISOString().replace(/[:.]/g, "-")}_${crypto.randomUUID().slice(0, 8)}`;
  }
  write(type, fields) {
    if (!/^[a-z_]+$/.test(type)) throw Error("Tipo de CSV inválido");
    if (!this.files.has(type)) {
      fs.mkdirSync(this.dir, { recursive: true });
      const file = path.join(this.dir, `${type}_${this.run}.csv`),
        columns = ["data_hora", ...Object.keys(fields)];
      fs.writeFileSync(file, columns.map(escape).join(",") + "\n");
      this.files.set(type, { file, columns });
    }
    const { file, columns } = this.files.get(type);
    if (Object.keys(fields).some((k) => !columns.includes(k)))
      throw Error("Coluna nova no CSV");
    const row = { data_hora: new Date().toISOString(), ...fields };
    fs.appendFileSync(
      file,
      columns.map((k) => escape(row[k])).join(",") + "\n",
    );
    return file;
  }
}
module.exports = { Csv };
