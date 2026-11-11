#!/usr/bin/env node
// Gera o painel de resultados como um único HTML que abre sem internet.
// Lê os indicadores e as amostras mais recentes de soak e bateria em RESULTS_DIR
// (padrão results/wdio) e embute os dados e o d3 no arquivo.
//   npm run painel            -> results/wdio/painel.html
//   npm run painel -- saida.html
const fs = require("node:fs");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");
const resultados = path.resolve(
  raiz,
  process.env.RESULTS_DIR || "results/wdio",
);
const saida = path.resolve(
  process.argv[2] || path.join(resultados, "painel.html"),
);

/** CSV com aspas duplas (o formato que indicadores.js e csv.js gravam). */
function lerCsv(arquivo) {
  const texto = fs.readFileSync(arquivo, "utf8").replace(/^﻿/, "");
  const linhas = [];
  let campo = "",
    linha = [],
    aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') ((campo += '"'), i++);
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") (linha.push(campo), (campo = ""));
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      (linha.push(campo), linhas.push(linha), (linha = []), (campo = ""));
    } else campo += c;
  }
  if (campo || linha.length) (linha.push(campo), linhas.push(linha));
  const [cab, ...resto] = linhas.filter((l) => l.some((v) => v !== ""));
  return (resto || []).map((l) =>
    Object.fromEntries(cab.map((k, i) => [k, l[i] ?? ""])),
  );
}

function maisRecente(prefixo) {
  const pasta = path.join(resultados, "nfr");
  if (!fs.existsSync(pasta)) return null;
  const nomes = fs
    .readdirSync(pasta)
    .filter((n) => n.startsWith(prefixo + "_") && n.endsWith(".csv"))
    .sort();
  return nomes.length ? path.join(pasta, nomes[nomes.length - 1]) : null;
}

function ler(arquivo) {
  if (!arquivo || !fs.existsSync(arquivo)) return null;
  return lerCsv(arquivo);
}

const dados = {
  metricas: ler(path.join(resultados, "indicadores", "metricas.csv")),
  testes: ler(path.join(resultados, "indicadores", "testes.csv")),
  soak: ler(maisRecente("soak")),
  bateria: ler(maisRecente("bateria")),
};
if (!dados.metricas || !dados.testes) {
  console.error(
    `Sem indicadores em ${path.join(resultados, "indicadores")}. Rode os testes antes.`,
  );
  process.exit(1);
}

const d3 = fs.readFileSync(
  path.join(raiz, "node_modules/d3/dist/d3.min.js"),
  "utf8",
);
const pagina = fs.readFileSync(path.join(__dirname, "painel.html"), "utf8");
const gerado = new Date().toLocaleString("pt-BR");

// Embutido no HTML: só "<" precisa de escape para não fechar o <script>.
const json = JSON.stringify(dados).replace(/</g, "\\u003c");

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Painel de testes mobile</title>
<style>
  :root {
    --color-bg: #f6f7f9; --color-panel: #ffffff; --color-fg: #1c2230; --color-fg-muted: #5d6677;
    --color-border-line: #dde1e8; --color-ok: #2f8a56; --color-warn: #c98a12; --color-bad: #c8423b;
    --s1: #2f6fdf; --s2: #d9822b; --s3: #7a5cc7;
    --font-anthropic-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --font-anthropic-serif: Georgia, "Times New Roman", serif;
    --cds-font-size-caption: 12px; --cds-font-size-body: 14px; --cds-font-size-heading: 18px; --cds-font-size-title: 30px;
    --cds-font-weight-medium: 600;
    --cds-gap-xs: 4px; --cds-gap-sm: 8px; --cds-gap-md: 12px; --cds-gap-lg: 20px; --cds-gap-xl: 32px;
    --cds-pad-xs: 4px; --cds-pad-sm: 6px; --cds-pad-md: 10px; --cds-pad-lg: 16px; --cds-pad-xl: 24px;
    --cds-radius: 8px;
    --cds-chart-muted: #b9c0cc; --cds-chart-status-critical: #c8423b; --cds-chart-grid: #e9ecf1;
    --cds-chart-axis: #c3c9d3; --cds-chart-reference: #8a93a3; --cds-text-secondary: #5d6677;
    --cds-surface-popover: #ffffff; --cds-border: #d3d8e0; --cds-shadow-popover: 0 4px 16px rgba(20, 30, 50, .12);
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --color-bg: #12151b; --color-panel: #1a1f27; --color-fg: #e6e9ef; --color-fg-muted: #9aa3b2;
      --color-border-line: #2b323d; --color-ok: #4cb07a; --color-warn: #e0a83a; --color-bad: #e5675f;
      --s1: #6c9cf0; --s2: #eba25a; --s3: #a58ce0;
      --cds-chart-muted: #4a5260; --cds-chart-status-critical: #e5675f; --cds-chart-grid: #232933;
      --cds-chart-axis: #3a424f; --cds-chart-reference: #7d8696; --cds-text-secondary: #9aa3b2;
      --cds-surface-popover: #222833; --cds-border: #353d4a; --cds-shadow-popover: 0 4px 16px rgba(0, 0, 0, .4);
      color-scheme: dark;
    }
  }
  body { margin: 0; background: var(--color-bg); color: var(--color-fg); font-family: var(--font-anthropic-sans); font-size: 14px; }
  #dash-root { max-width: 1120px; margin: 0 auto; padding: 32px max(16px, env(safe-area-inset-right, 0px)) 48px max(16px, env(safe-area-inset-left, 0px)); }
  .tm-gerado { margin-top: 32px; color: var(--color-fg-muted); font-size: 12px; }
  code { font-size: .92em; }
</style>
<script>${d3}</script>
<script>
  window.DADOS = ${json};
  window.dash = (() => {
    const calcs = {}, desenhos = {}, cache = {};
    function data(id) {
      if (Array.isArray(DADOS[id])) return { status: "ok", data: DADOS[id] };
      if (calcs[id]) {
        if (!(id in cache)) {
          const entradas = calcs[id].inputs.map((i) => data(i));
          if (entradas.some((e) => e.status !== "ok")) return { status: "missing", data: [] };
          cache[id] = calcs[id].fn(...entradas.map((e) => e.data));
        }
        return { status: "ok", data: cache[id] };
      }
      return { status: "missing", data: [] };
    }
    function desenhar() {
      document.querySelectorAll("[data-draw]").forEach((el) => {
        const f = desenhos[el.dataset.draw];
        if (!f) return;
        try { f(el); } catch (e) { console.error(el.dataset.draw, e); }
      });
    }
    return {
      data,
      calc: (id, o) => (calcs[id] = o),
      draw: (nome, f) => (desenhos[nome] = typeof f === "function" ? f : f.update),
      onData: (f) => f(),
      colors: ["var(--s1)", "var(--s2)", "var(--s3)"],
      desenhar,
    };
  })();
</script>
</head>
<body>
<div id="dash-root">
${pagina}
<p class="tm-gerado">Gerado em ${gerado} a partir de ${path.relative(raiz, resultados) || "."}.</p>
</div>
<script>
  dash.desenhar();
  let largura = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === largura) return;
    largura = innerWidth;
    clearTimeout(window.__painelResize);
    window.__painelResize = setTimeout(dash.desenhar, 150);
  });
</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(saida), { recursive: true });
fs.writeFileSync(saida, html);
console.log(`Painel gerado: ${path.relative(process.cwd(), saida)}`);
for (const [id, linhas] of Object.entries(dados))
  console.log(`  ${id}: ${linhas ? linhas.length + " linhas" : "sem arquivo"}`);
