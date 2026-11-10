# Testes JavaScript (WebdriverIO + Appium)

Use Node.js 22.19 ou superior. Os testes mobile usam WebdriverIO com Mocha; os unitários da camada JS usam Jest.
O Appium continua necessário: WebdriverIO substitui o cliente e os testes Robot Framework.
A calibragem, MQTT, G-code, descoberta USB/Wi-Fi e controle físico permanecem em Python.

```bash
npm ci
npm test                              # Jest, sem hardware
npm run check                         # sintaxe de todos os arquivos JS
npm run lint                          # formatação (Prettier)
npm run test:dry-run                  # registra os cenários, sem executá-los
.venv/bin/python -m pytest -q          # infraestrutura Python e legado durante transição
```

## Arquitetura

```
wdio.conf.js                 configuração WebdriverIO (Appium, suítes, hooks)
tests/js/
  funcionais/ e2e/           specs: descrevem o comportamento, sem seletores soltos
  nao-funcionais/            specs NFR: medem o app via adb (Nfr) e comparam com limits.js
  pages/                     page objects (ApiDemosPage, AddNumberPage)
  support/
    apps.js                  pacote, activity e APK de cada app; resourceId()
    session.js               UDID, aparelho exigido por spec, capabilities, modo de gestos
    gestures.js              toque por software, braço real ou simulado
    robot-client.js          HTTP para o servidor do braço (python -m tools.server)
    nfr.js                   comandos adb e coletas (memória, CPU, bateria, toque)
    parsers.js metrics.js    leitura de dumpsys/getevent e estatística (puros, testados)
    limits.js csv.js         limites/parâmetros por variável de ambiente; CSV por amostra
  unit/                      Jest, sem aparelho
```

Regras: specs usam page objects e `gestures` (global criado no hook `before`); dependências
de `Nfr` e das páginas são passadas no construtor; pacotes e ids vêm de `apps.js`. O limite
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
npm run test:funcionais               # ApiDemos, APK incluído
npm run test:e2e                      # gestos por software
npm run test:mobile -- --suite addnumber  # exige AddNumber instalado separadamente
UDID=emulator-5554 npm run test:funcionais
```

Sem `UDID`, usa a descoberta Python existente. `PYTHON` pode apontar para outro interpretador;
o padrão é `.venv/bin/python`. Crie o ambiente com `python3 -m venv .venv` e instale
`pip install -r requirements.txt` nele. Não copie `.venv` de outra pasta: os scripts e a instalação
editável guardam o caminho absoluto de onde foram criados. As dependências Robot ainda ficam instaladas para comparar
com o legado; não são usadas pela nova suíte JS.

## Braço real e simulado

O servidor precisa usar o mesmo celular da sessão Appium e a configuração já calibrada:

```bash
# Terminal 1: Appium (acima)
# Terminal 2: braço real; não iniciar sem preparar/calibrar o equipamento
.venv/bin/python -m tools.server --config config_s25.yaml --udid SEU_SERIAL
# Terminal 3: testes
UDID=SEU_SERIAL ROBO=true npm run test:funcionais
```

Para simular o braço sem conectar à P1S:

```bash
.venv/bin/python -m tools.server --dry-run
ROBO=true SIMULADO=true npm run test:e2e
```

O simulado ainda precisa de celular/emulador e Appium: gera movimentos simulados e aplica gestos
por software. Não representa validação física. A suíte exige que `SIMULADO` corresponda ao estado
informado pelo servidor. O servidor real exige contato via `getevent` para cada gesto.
O encerramento dos testes solicita `/park`; ao parar o servidor, ele também tenta estacionar.
Não encerre o processo à força contando com esse teardown.

## Não funcionais

```bash
npm run test:mobile -- --spec tests/js/nao-funcionais/01-inicializacao.spec.js
UDID=emulator-5554 npm run test:mobile -- --spec tests/js/nao-funcionais/05-sensores.spec.js
DURACAO_MIN=60 npm run test:mobile -- --spec tests/js/nao-funcionais/03-soak-memoria.spec.js
ROBO=true npm run test:mobile -- --spec tests/js/nao-funcionais/10-latencia.spec.js
```

Prefira selecionar um arquivo: bateria exige aparelho real fora da tomada e sensores/rede/interrupções
exigem emulador. A execução conjunta de NFR inclui cenários incompatíveis entre si conforme o aparelho.
As suítes 01–09 usam gestos por software mesmo com `ROBO=true`; só 10 usa o braço.
Latência sem braço real fica pendente (SKIP). Sensores e câmera preservam as falhas conhecidas do ApiDemos;
não são convertidas em aprovação. Rede e GPS verificam sobrevivência do app, não uso desses recursos pelo ApiDemos.

Limites ficam em `tests/js/support/limits.js` e aceitam variáveis de ambiente com os mesmos nomes
do legado, por exemplo `JANK_MAX_PCT=30`. São provisórios até obter uma referência do aparelho.
O soak exige duração/amostras suficientes para regressão; métricas ausentes falham explicitamente.
Bateria carregando fica pendente. Mudanças de rede, orientação, GPS e permissão de câmera têm limpeza
nos respectivos testes. Há um worker por execução: não execute dois processos contra o mesmo braço.

Variáveis: `APPIUM_URL` (padrão `http://127.0.0.1:4723`), `UDID`, `PYTHON`, `ROBO`, `SIMULADO`,
`ROBOT_URL` (padrão `http://127.0.0.1:8765`), `RESULTS_DIR` (padrão `results/wdio`), `DURACAO_MIN`.
Capturas de falhas ficam em `RESULTS_DIR`, CSVs em `RESULTS_DIR/nfr` com escrita por amostra.
Os gráficos Python existentes podem consumir esses CSVs:

```bash
.venv/bin/python tests/robot/nao_funcionais/scripts/gerar_graficos.py --entrada results/wdio/nfr --saida results/wdio/graficos
```

## Transição

`tests/robot/` e seus unitários Python continuam disponíveis até comparar as execuções no aparelho.
O CI valida JS e Python sem movimentar o equipamento. A equivalência no celular e na P1S ainda
precisa ser verificada no ambiente montado antes de remover Robot/AppiumLibrary.

A suíte JS cobre os dois funcionais, os dois cenários de gestos e as dez áreas NFR do legado.
O motor independente `soak/` e seus testes continuam em Python; não depende da suíte WebdriverIO.

As versões WebdriverIO estão fixadas em 10.1.0 para compatibilidade com Node 22.19+.
A auditoria npm da instalação registrou 31 alertas transitivos de desenvolvimento (1 baixo, 30 moderados),
sem correção compatível oferecida pela auditoria. Não foi aplicada troca forçada de versões principais.
