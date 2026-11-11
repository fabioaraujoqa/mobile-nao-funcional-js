// Dados para indicadores: arquivos CSV fixos que só recebem linhas novas, rodada após rodada.
//   indicadores/testes.csv    uma linha por teste: status, duração, erro
//   indicadores/metricas.csv  uma linha por métrica: valor, unidade, limite, aprovado
// Toda linha leva o contexto da rodada (aparelho, Android, versão do app, commit), para
// comparar aparelhos, versões e datas depois. As amostras brutas continuam em nfr/*.csv,
// com o mesmo id de rodada no nome do arquivo.
const fs = require("node:fs");
const path = require("node:path");
const { limit } = require("./metrics");
const { linhaCsv } = require("./csv");
const { saidaShell } = require("./parsers");
const { env } = require("./env");

const CONTEXTO = [
  "rodada",
  "aparelho",
  "udid",
  "emulador",
  "android",
  "api",
  "app",
  "app_versao",
  "git",
  "appium",
  "tipo",
  "spec",
];
const COLUNAS = {
  testes: ["data_hora", ...CONTEXTO, "teste", "status", "duracao_s", "erro"],
  metricas: [
    "data_hora",
    ...CONTEXTO,
    "teste",
    "metrica",
    "valor",
    "unidade",
    "limite_min",
    "limite_max",
    "aprovado",
  ],
};

const estado = { contexto: {}, teste: "" };

function pasta() {
  return path.join(env.resultados, "indicadores");
}

function anexar(nome, campos) {
  const colunas = COLUNAS[nome];
  const arquivo = path.join(pasta(), `${nome}.csv`);
  fs.mkdirSync(pasta(), { recursive: true });
  if (!fs.existsSync(arquivo)) fs.writeFileSync(arquivo, linhaCsv(colunas));
  const linha = {
    data_hora: new Date().toISOString(),
    ...estado.contexto,
    ...campos,
  };
  fs.appendFileSync(arquivo, linhaCsv(colunas, linha));
  return arquivo;
}

/** Id da rodada: o mesmo para todos os specs de uma execução do wdio. */
function rodadaId() {
  return (
    env.rodada || new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
  );
}

/** Lê aparelho e app uma vez por sessão. Falha de leitura vira campo vazio, não erro. */
async function iniciar(driver, spec) {
  const caps = driver.requestedCapabilities || {};
  const app = caps["appium:appPackage"] || "";
  const udid = caps["appium:udid"] || "";
  const d = await driver.execute("mobile: deviceInfo").catch(() => ({}));
  const versao = await driver
    .execute("mobile: shell", {
      command: `dumpsys package ${app} | grep -m1 versionName`,
    })
    .then((out) => saidaShell(out).match(/versionName=(\S+)/)?.[1])
    .catch(() => null);
  const arquivo = path.basename(String(spec));
  estado.contexto = {
    rodada: rodadaId(),
    aparelho: [d.manufacturer, d.model].filter(Boolean).join(" "),
    udid,
    emulador: udid.startsWith("emulator-") ? "sim" : "não",
    android: d.platformVersion,
    api: d.apiVersion,
    app,
    app_versao: versao,
    git: process.env.GIT_COMMIT,
    appium: process.env.APPIUM_VERSAO,
    tipo: arquivo.match(/^(\d{2})-/)?.[1] ?? "",
    spec: arquivo.replace(/\.spec\.js$/, ""),
  };
}

function testeAtual(titulo) {
  estado.teste = titulo;
}

function registrarTeste(titulo, status, { duracaoMs, erro } = {}) {
  return anexar("testes", {
    teste: titulo,
    status,
    duracao_s: duracaoMs == null ? "" : (duracaoMs / 1000).toFixed(1),
    erro: erro
      ? String(erro.message || erro)
          .split("\n")[0]
          .slice(0, 300)
      : "",
  });
}

/** Registra a métrica com seus limites (max e/ou min) e diz se ficou dentro deles. */
function registrar(nome, valor, { max, min, unidade = "" } = {}) {
  const ok =
    typeof valor === "number" &&
    Number.isFinite(valor) &&
    (max == null || valor <= max) &&
    (min == null || valor >= min);
  anexar("metricas", {
    teste: estado.teste,
    metrica: nome,
    valor,
    unidade,
    limite_min: min,
    limite_max: max,
    aprovado: ok ? "sim" : "não",
  });
  return ok;
}

/** Registra e reprova na hora se ficar fora do limite. Use no lugar de limit(). */
function medir(nome, valor, opcoes = {}) {
  if (registrar(nome, valor, opcoes)) return;
  if (opcoes.max != null) limit(nome, valor, opcoes.max);
  throw Error(`${nome}: ${valor} abaixo de ${opcoes.min}`);
}

module.exports = {
  iniciar,
  testeAtual,
  registrarTeste,
  medir,
  registrar,
  rodadaId,
  pasta,
};
