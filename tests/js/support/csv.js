// CSV por amostra: um arquivo por tipo de coleta e rodada (ex.: nfr/soak_<rodada>.csv),
// gravado linha a linha para não perder dados se o teste cair no meio.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { env } = require("./env");

const escape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
/** Uma linha CSV com os valores de `colunas`, na ordem. */
const linhaCsv = (
  colunas,
  valores = Object.fromEntries(colunas.map((c) => [c, c])),
) => colunas.map((c) => escape(valores[c])).join(",") + "\n";

class Csv {
  constructor(dir = path.join(env.resultados, "nfr")) {
    this.dir = dir;
    this.files = new Map();
    this.run = `${env.rodada || new Date().toISOString().replace(/[:.]/g, "-")}_${crypto.randomUUID().slice(0, 8)}`;
  }
  write(type, fields) {
    if (!/^[a-z_]+$/.test(type)) throw Error("Tipo de CSV inválido");
    if (!this.files.has(type)) {
      fs.mkdirSync(this.dir, { recursive: true });
      const file = path.join(this.dir, `${type}_${this.run}.csv`),
        columns = ["data_hora", ...Object.keys(fields)];
      fs.writeFileSync(file, linhaCsv(columns));
      this.files.set(type, { file, columns });
    }
    const { file, columns } = this.files.get(type);
    if (Object.keys(fields).some((k) => !columns.includes(k)))
      throw Error("Coluna nova no CSV");
    fs.appendFileSync(
      file,
      linhaCsv(columns, { data_hora: new Date().toISOString(), ...fields }),
    );
    return file;
  }
}
module.exports = { Csv, linhaCsv };
