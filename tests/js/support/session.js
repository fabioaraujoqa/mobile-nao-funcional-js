// Regras da sessão Appium: qual aparelho, qual app e quais gestos cada spec usa.
// Fica fora do wdio.conf.js para ser testada sem Appium. O ambiente de cada teste
// (emulador, aparelho real, braço) é decidido por teste, em ambiente.js.
const { execFileSync } = require("node:child_process");
const { APPS } = require("./apps");
const { env: ambiente } = require("./env");

const uses = (specs, names) =>
  specs.some((spec) => names.some((name) => String(spec).includes(name)));

/** UDID explícito ou a descoberta USB/mDNS da infraestrutura Python. */
function resolveUdid(env = process.env) {
  if (env.UDID) return env.UDID;
  const out = execFileSync(
    env.PYTHON || ambiente.python,
    ["-c", "from taprobot.device import resolve_udid; print(resolve_udid())"],
    { encoding: "utf8" },
  );
  return out.trim().split("\n").at(-1);
}

function appFor(specs) {
  return uses(specs, ["addnumber.spec"]) ? APPS.addnumber : APPS.apidemos;
}

/** Capabilities que dependem do aparelho e do spec em execução. */
function capabilities(specs, env = process.env) {
  const app = appFor(specs);
  return {
    "appium:udid": resolveUdid(env),
    "appium:appPackage": app.package,
    "appium:appActivity": app.activity,
    ...(app.apk && { "appium:app": app.apk }),
  };
}

// Tipos que podem usar o braço: os que tocam na tela como o usuário.
const TOQUE_FISICO = ["01-funcional", "02-usabilidade", "addnumber.spec"];

/**
 * Opções de Gestures por spec. Os tipos 03 a 12 medem o app, não o toque:
 * usam gestos por software mesmo com ROBO=true.
 */
function gestureOptions(specs) {
  return uses(specs, ["/tipos/"]) && !uses(specs, TOQUE_FISICO)
    ? { robot: false, simulated: false }
    : {};
}

module.exports = { capabilities, gestureOptions, resolveUdid, TOQUE_FISICO };
