// Parâmetros e limites dos não funcionais. Todos aceitam variável de ambiente
// com o mesmo nome (ex.: JANK_MAX_PCT=30).
const defaults = {
  DURACAO_MIN: 30,
  INICIO_REPETICOES: 10,
  INICIO_FRIO_P50_MAX_MS: 2000,
  INICIO_FRIO_P90_MAX_MS: 3000,
  INICIO_MORNO_P50_MAX_MS: 1000,
  INICIO_MORNO_P90_MAX_MS: 1500,
  JANK_ROLAGENS: 20,
  JANK_MAX_PCT: 25,
  JANK_MIN_QUADROS: 30,
  SOAK_PAUSA_CICLO_S: 10,
  SOAK_CICLOS_AQUECIMENTO: 3,
  SOAK_MB_POR_HORA_MAX: 20,
  SOAK_MIN_MINUTOS_REGRESSAO: 15,
  SOAK_PSS_MAX_MB: 300,
  SOAK_THREADS_MAX: 200,
  SOAK_TEMP_MAX_C: 45,
  SOAK_CRASHES_MAX: 0,
  BATERIA_INTERVALO_MIN: 5,
  BATERIA_MAX_PCT_POR_HORA: 25,
  BATERIA_TELA_LIGADA_MS: 1800000,
  BATERIA_TEMP_MAX_C: 45,
  ALVO_TOQUE_MIN_DP: 48,
  FONTE_ESCALA: 1.3,
  VISUAL_DIFERENCA_MAX_PCT: 0.5,
  CAMERA_REPETICOES: 10,
  LATENCIA_REPETICOES: 20,
  LATENCIA_P50_MAX_MS: 150,
  LATENCIA_P95_MAX_MS: 300,
};
module.exports = Object.fromEntries(
  Object.entries(defaults).map(([k, v]) => {
    const n = Number(process.env[k] ?? v);
    if (!Number.isFinite(n) || n < 0) throw Error(`Limite inválido: ${k}`);
    return [k, n];
  }),
);
