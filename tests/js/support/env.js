// Parâmetros de execução lidos de variáveis de ambiente, num lugar só.
// São lidos na hora do uso (getters), para que testes possam mudar process.env.
// Limites e durações dos testes ficam em limits.js.

/** "true", "1", "sim", "yes" ou "on" (sem diferenciar maiúsculas). */
const ligado = (v) =>
  ["true", "1", "sim", "yes", "on"].includes(String(v).toLowerCase());

const env = {
  /** Servidor Appium. */
  get appiumUrl() {
    return process.env.APPIUM_URL || "http://127.0.0.1:4723";
  },
  /** Aparelho da sessão; vazio = descoberta USB/Wi-Fi do Python (taprobot.device). */
  get udid() {
    return process.env.UDID || "";
  },
  /** Interpretador Python usado na descoberta do aparelho. */
  get python() {
    return process.env.PYTHON || ".venv/bin/python";
  },
  /** Toque pelo braço (servidor python -m tools.server). */
  get robo() {
    return ligado(process.env.ROBO);
  },
  /** Braço simulado: o servidor não move a P1S e o toque também é feito por software. */
  get simulado() {
    return ligado(process.env.SIMULADO);
  },
  get robotUrl() {
    return process.env.ROBOT_URL || "http://127.0.0.1:8765";
  },
  /** Pasta de saída: capturas, CSVs por amostra (nfr/), indicadores e comparação visual. */
  get resultados() {
    return process.env.RESULTS_DIR || "results/wdio";
  },
  /** Id da rodada, definido no onPrepare: o mesmo para todos os specs de uma execução. */
  get rodada() {
    return process.env.RODADA_ID || "";
  },
};

module.exports = { env, ligado };
