// Regras da sessão Appium: qual aparelho, qual app e quais gestos cada spec usa.
// Fica fora do wdio.conf.js para ser testada sem Appium.
const { execFileSync } = require("node:child_process");
const { APPS } = require("./apps");

const EMULATOR_ONLY = ["05-sensores", "06-rede", "07-interrupcoes"];
const REAL_DEVICE_ONLY = ["04-bateria"];

const uses = (specs, names) =>
  specs.some((spec) => names.some((name) => String(spec).includes(name)));
const isEmulator = (udid) => udid.startsWith("emulator-");

/** UDID explícito ou a descoberta USB/mDNS da infraestrutura Python. */
function resolveUdid(env = process.env) {
  if (env.UDID) return env.UDID;
  const out = execFileSync(
    env.PYTHON || ".venv/bin/python",
    ["-c", "from taprobot.device import resolve_udid; print(resolve_udid())"],
    { encoding: "utf8" },
  );
  return out.trim().split("\n").at(-1);
}

function checkDevice(udid, specs) {
  if (uses(specs, EMULATOR_ONLY) && !isEmulator(udid))
    throw Error("Esta suíte exige emulador Android (UDID=emulator-5554)");
  if (uses(specs, REAL_DEVICE_ONLY) && isEmulator(udid))
    throw Error("Bateria exige aparelho real fora da tomada");
}

function appFor(specs) {
  return uses(specs, ["addnumber.spec"]) ? APPS.addnumber : APPS.apidemos;
}

/** Capabilities que dependem do aparelho e do spec em execução. */
function capabilities(specs, env = process.env) {
  const udid = resolveUdid(env);
  checkDevice(udid, specs);
  const app = appFor(specs);
  return {
    "appium:udid": udid,
    "appium:appPackage": app.package,
    "appium:appActivity": app.activity,
    ...(app.apk && { "appium:app": app.apk }),
  };
}

/**
 * Opções de Gestures por spec. Os não funcionais medem o app, não o toque:
 * usam gestos por software, exceto a latência, que existe para medir o braço.
 */
function gestureOptions(specs) {
  const nfr = uses(specs, ["nao-funcionais"]);
  return nfr && !uses(specs, ["10-latencia"])
    ? { robot: false, simulated: false }
    : {};
}

module.exports = { capabilities, gestureOptions, resolveUdid };
