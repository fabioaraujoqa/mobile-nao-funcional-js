# Testes JavaScript (WebdriverIO + Appium)

Use Node.js 22.19 ou superior. Os testes mobile usam WebdriverIO com Mocha; os unitários da camada JS usam Jest.
O Appium continua necessário: WebdriverIO é o cliente.
A calibragem, MQTT, G-code, descoberta USB/Wi-Fi e controle físico permanecem em Python.

```bash
npm ci
npm test                              # Jest, sem hardware
npm run check                         # sintaxe de todos os arquivos JS
npm run lint                          # formatação (Prettier)
npm run test:dry-run                  # registra os cenários, sem executá-los
.venv/bin/python -m pytest -q          # braço, calibração, soak (Python)
```

## Arquitetura

```
wdio.conf.js                 configuração WebdriverIO (Appium, suítes, hooks)
tests/js/
  tipos/                     um arquivo por tipo de teste (01-funcional … 12-seguranca)
  demo/                      demos da apresentação (controles e loop com o braço)
  pages/                     page objects (ApiDemosPage, ControlesPage)
  visual/referencia/         imagens de referência do teste visual, uma por aparelho
  support/
    env.js                   parâmetros por variável de ambiente (Appium, UDID, braço, saída)
    suite.js                 prepararSuite(): ganchos comuns dos specs de tipos/
    apps.js                  pacote, activity e APK de cada app; resourceId()
    session.js               UDID, capabilities e modo de gestos por spec
    ambiente.js              "onde rodar" de cada teste, lido do título ([emulador] etc.)
    gestures.js              toque por software, braço real ou simulado
    robot-client.js          HTTP para o servidor do braço (python -m tools.server)
    nfr.js                   comandos adb e coletas (memória, CPU, bateria, toque);
                             comConfiguracao() muda um settings e devolve o valor antigo
    indicadores.js           CSVs fixos de testes e métricas, com o contexto da rodada
    parsers.js metrics.js    leitura de dumpsys/getevent e estatística (puros, testados)
    limits.js csv.js         limites/parâmetros por variável de ambiente; CSV por amostra
  unit/                      Jest, sem aparelho
```

Regras: cada arquivo de `tipos/` começa com um cabeçalho (objetivo, o que testa, onde rodar,
comandos Appium) e tem um `describe` com o objetivo do tipo. O título de cada teste diz onde ele
roda: `[emulador]`, `[aparelho_real]` (sem marca = qualquer um) e `[braco]`. Fora do seu ambiente,
o teste fica pendente (SKIP) com o motivo no log. `[longo]` marca os testes que duram `DURACAO_MIN`
(ficam fora da suíte `rapidos`).

Um spec novo de `tipos/` começa assim:

```js
const { prepararSuite } = require("../support/suite");
const { medir } = require("../support/indicadores");
const L = require("../support/limits");

describe("N · Tipo: objetivo", () => {
  const n = prepararSuite(); // confere o aparelho, abre o app e pula fora do ambiente
  it("Faz algo [emulador]", async () => {
    medir("Nome da métrica", valor, { max: L.ALGUM_LIMITE, unidade: "ms" });
  });
});
```

Toque na tela passa por `gestures` (global criado no hook `before`), para valer com ou sem braço.
Configuração do aparelho que o teste muda volta no fim: `n.comConfiguracao(...)` para `settings`,
`finally` para o resto. Métricas usam `medir()` (registra e reprova fora do limite) ou
`registrar()` (só registra). Pacotes e ids vêm de `apps.js`; seletores, dos page objects. O limite
padrão por teste é 10 min; soak e bateria ampliam com `this.timeout()` a partir de `DURACAO_MIN`.

## Executar

Prepare Appium e UiAutomator2 no ambiente (se já instalados, reutilize):

```bash
npm install -g appium
appium driver install uiautomator2
appium --allow-insecure=uiautomator2:adb_shell
```

Se a porta 4723 já estiver ocupada por outro Appium (de outro projeto), suba este em outra porta
e aponte `APPIUM_URL`, por exemplo `appium --port 4725 ...` e `APPIUM_URL=http://127.0.0.1:4725`.

Com o celular desbloqueado e autorizado no ADB:

```bash
npm run test:tipos                    # os 12 tipos
npm run test:rapidos                  # sem os [longo] (soak e bateria)
npm run test:longos                   # só soak e bateria
npm run test:braco                    # 01 e 02, os que tocam como o usuário
npm run test:funcional                # tipo 1
npm run test:mobile -- --suite concorrencia   # um tipo pelo nome
UDID=emulator-5554 npm run test:rapidos       # no emulador
```

Sem `UDID`, usa a descoberta Python existente. `PYTHON` pode apontar para outro interpretador;
o padrão é `.venv/bin/python`. Crie o ambiente com `python3 -m venv .venv` e instale
`pip install -r requirements.txt` nele. Não copie `.venv` de outra pasta: os scripts e a instalação
editável guardam o caminho absoluto de onde foram criados.

## Braço real e simulado

O servidor precisa usar o mesmo celular da sessão Appium e a configuração já calibrada:

```bash
# Terminal 1: Appium (acima)
# Terminal 2: braço real; não iniciar sem preparar/calibrar o equipamento
.venv/bin/python -m tools.server --config config.yaml --udid SEU_SERIAL
# Terminal 3: testes
UDID=SEU_SERIAL ROBO=true npm run test:braco
```

Para simular o braço sem conectar à P1S:

```bash
.venv/bin/python -m tools.server --dry-run
ROBO=true SIMULADO=true npm run test:braco
```

O simulado ainda precisa de celular/emulador e Appium: gera movimentos simulados e aplica gestos
por software. Não representa validação física. A suíte exige que `SIMULADO` corresponda ao estado
informado pelo servidor. O servidor real exige contato via `getevent` para cada gesto.
O encerramento dos testes solicita `/park`; ao parar o servidor, ele também tenta estacionar.
Não encerre o processo à força contando com esse teardown.

## Tipos de teste

Os 12 arquivos de `tests/js/tipos/` seguem a ordem da apresentação "Tipos de testes mobile";
o mapa do que cada um cobre e do que falta está em [cobertura.md](cobertura.md).

```bash
npm run test:mobile -- --suite performance
UDID=emulator-5554 npm run test:mobile -- --suite interrupcao
DURACAO_MIN=60 npm run test:mobile -- --suite resistencia
ROBO=true npm run test:mobile -- --suite usabilidade
```

- Só os tipos 1 e 2 usam o braço com `ROBO=true`; os outros medem o app com gestos por software.
- 05 (soak) e 06 (bateria) são longos: duram `DURACAO_MIN` (padrão 30). Bateria carregando fica
  pendente; desconecte o cabo e use adb por Wi-Fi.
- Falhas conhecidas do ApiDemos ficam marcadas no título (`[falha conhecida ApiDemos]`) e continuam
  reprovando: não são convertidas em aprovação.
- Testes que mudam o aparelho (fonte, modo escuro, rede, GPS, permissão, "Não manter atividades",
  orientação) devolvem o valor original no `finally`.
- Bloquear a tela é `[emulador]`: com senha no aparelho real, o Appium só desbloqueia com
  `appium:unlockType` e `appium:unlockKey`.

### Teste visual

`@wdio/visual-service` 11.x (compatível com WebdriverIO 10) compara a tela com uma referência do
mesmo aparelho (`toMatchScreenSnapshot`). Na primeira rodada num aparelho, a referência é gravada em
`tests/js/visual/referencia/` e o teste passa; versione essas imagens. Nas rodadas seguintes, a
diferença acima de `VISUAL_DIFERENCA_MAX_PCT` (0,5%) reprova, e a imagem atual e a de diferença
ficam em `results/wdio/visual/`. A barra de status e a de navegação são cobertas antes de comparar.
"Localização do ponteiro" e "Mostrar toques" (opções do desenvolvedor) ficam desligadas durante a
captura (`n.compararTela()`) e voltam ao estado anterior: dá para deixá-las ligadas com o braço.
Para aceitar uma mudança visual intencional, apague a referência do aparelho e rode de novo.

Limites ficam em `tests/js/support/limits.js` e aceitam variáveis de ambiente com os mesmos nomes
do teste, por exemplo `JANK_MAX_PCT=30`. São provisórios até obter uma referência do aparelho.
O soak exige duração/amostras suficientes para regressão; métricas ausentes falham explicitamente.
Bateria carregando fica pendente. Mudanças de rede, orientação, GPS e permissão de câmera têm limpeza
nos respectivos testes. Há um worker por execução: não execute dois processos contra o mesmo braço.

Variáveis de execução: veja a tabela no [README](../README.md#parâmetros) ou
`tests/js/support/env.js`. Capturas de falhas ficam em `RESULTS_DIR`, CSVs em `RESULTS_DIR/nfr`
com escrita por amostra, e `npm run painel` gera o painel de resultados em HTML.

## Versões

WebdriverIO fixado em 10.1.0 (compatível com Node 22.19+) e `@wdio/visual-service` em 11.1.0,
que exige WebdriverIO 10. O porquê da escolha está em [decisoes.md](decisoes.md).
