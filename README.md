# Testes mobile não funcionais com WebdriverIO + Appium

Os 12 tipos de teste mobile da apresentação "Tipos de testes mobile", automatizados num app
Android real, e um braço robótico que faz o toque físico na tela.

- **Um arquivo por tipo de teste:** funcional, usabilidade, acessibilidade, performance, resistência
  (soak), bateria e temperatura, conectividade, interrupção, concorrência, sensores e localização,
  compatibilidade e segurança.
- **Dois ambientes:** aparelho real (Moto G06, Android 15) e emulador (Android 14). Cada teste diz
  no título onde faz sentido rodar. Fora do ambiente certo, ele é pulado e o motivo fica registrado.
- **Indicadores:** toda rodada grava em CSV o resultado de cada teste e de cada métrica (valor,
  limite e se passou), com aparelho, versão do Android, versão do app e commit. O painel em HTML
  é gerado a partir desses CSVs.
- **Braço robótico:** uma impressora 3D Bambu Lab P1S com uma caneta touch no cabeçote. O Appium
  acha o elemento, o braço toca o centro dele.

App testado: [ApiDemos](apps/) 6.0.18, app de exemplo do Android com telas prontas para teste.

## Resultado da última rodada (10 e 11/11/2026)

| | Moto G06 | Emulador |
|---|---|---|
| Testes que passaram | 25 de 28 | 28 de 31 |
| Início a frio (p50) | 857 ms | 849 ms |
| Jank na rolagem | 0% | 21,9% |
| Menor alvo de toque | 48 dp | 48 dp |
| Soak, 2 h | reprovado: memória cresce 38,5 MB/h | — |
| Bateria, 1 h fora da tomada | 3,3%/h, máx. 34 °C | — |

As reprovações são falhas do próprio ApiDemos, marcadas como `[falha conhecida ApiDemos]`
(câmera sem permissão, tela de sensores, build depurável), e o vazamento de memória que o soak
encontrou. O detalhe por tipo está em [docs/cobertura.md](docs/cobertura.md).

## Como funciona

```
tests/js/tipos/NN-*.spec.js ──► WebdriverIO ──► Appium (UiAutomator2) ──► celular
          │                                         │
          │ toque com ROBO=true                     └─ mobile: shell (adb): dumpsys,
          ▼                                            settings, getevent, am start
python -m tools.server (HTTP) ──► MQTT/LAN ──► P1S: a caneta toca a tela
          │
          └─ confirma o contato pelo getevent do celular

Toda rodada ──► results/wdio/indicadores/*.csv ──► npm run painel ──► painel.html
```

## Instalação

Precisa de Node.js 22.19+, Python 3.10+, Android SDK (`adb`) e Appium 3.

```bash
npm ci
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

npm install -g appium
appium driver install uiautomator2
```

## Rodar

```bash
# Terminal 1: Appium, com permissão para os comandos adb dos testes
appium --allow-insecure=uiautomator2:adb_shell

# Terminal 2: com o celular desbloqueado e autorizado no adb
npm run test:rapidos                      # os 10 tipos rápidos (~15 min)
UDID=emulator-5554 npm run test:rapidos   # no emulador
```

| Comando | O que roda |
|---|---|
| `npm run test:tipos` | os 12 tipos |
| `npm run test:rapidos` | os 12 menos os longos (soak e bateria) |
| `npm run test:longos` | soak e bateria; duram `DURACAO_MIN` (padrão 30 min) cada |
| `npm run test:braco` | os tipos que tocam como o usuário (01 e 02); use com `ROBO=true` |
| `npm run test:mobile -- --suite <nome>` | um tipo só: `funcional`, `usabilidade`, … `seguranca` |
| `npm run test:addnumber` | exemplo com outro app, instalado à parte |
| `npm run painel` | gera `results/wdio/painel.html`, que abre sem internet |
| `npm test` | testes unitários (Jest), sem celular |
| `npm run test:dry-run` | lista os cenários sem executar |
| `.venv/bin/python -m pytest` | testes da parte Python (braço, calibração, soak), sem hardware |

Sem `UDID`, o aparelho é encontrado sozinho, no cabo USB ou pelo Wi-Fi.

### Onde cada teste roda

O título do teste traz o ambiente:

| Marca | Significa |
|---|---|
| sem marca | roda em qualquer aparelho |
| `[emulador]` | só no emulador (ex.: chamada e SMS simulados, sensores) |
| `[aparelho_real]` | só no aparelho real (ex.: bateria, rota de GPS) |
| `[braco]` | só com o braço real (`ROBO=true`, `SIMULADO=false`) |
| `[longo]` | dura `DURACAO_MIN`; fica fora de `test:rapidos` |
| `[falha conhecida ApiDemos]` | defeito do app; continua reprovando |

## Parâmetros

Variáveis de ambiente da execução (lidas em [tests/js/support/env.js](tests/js/support/env.js)):

| Variável | Padrão | Para |
|---|---|---|
| `APPIUM_URL` | `http://127.0.0.1:4723` | servidor Appium |
| `UDID` | descoberta automática | aparelho da rodada |
| `ROBO` | `false` | toque pelo braço |
| `SIMULADO` | `false` | braço simulado: não move a P1S |
| `ROBOT_URL` | `http://127.0.0.1:8765` | servidor do braço |
| `RESULTS_DIR` | `results/wdio` | saída: indicadores, CSVs, capturas |
| `PYTHON` | `.venv/bin/python` | Python da descoberta do aparelho |

Limites e durações ficam em [tests/js/support/limits.js](tests/js/support/limits.js) e também
aceitam variável de ambiente com o mesmo nome, por exemplo:

```bash
DURACAO_MIN=120 npm run test:mobile -- --suite resistencia   # soak de 2 h
JANK_MAX_PCT=30 npm run test:mobile -- --suite performance
```

## Braço robótico

Antes do primeiro uso, siga a montagem e a calibração em [docs/manual-p1s.md](docs/manual-p1s.md).
Homing sempre com a mesa vazia, e a mão perto do botão de energia nas primeiras execuções.

```bash
# Terminal 1: Appium (acima)
# Terminal 2: servidor do braço, com a configuração calibrada
.venv/bin/python -m tools.server --config config.yaml --udid <serial>
# Terminal 3: testes com toque físico
UDID=<serial> ROBO=true npm run test:braco
```

Para testar a integração sem mover a impressora:

```bash
.venv/bin/python -m tools.server --dry-run
ROBO=true SIMULADO=true npm run test:braco
```

O servidor confirma pelo `getevent` do celular que cada toque chegou na tela. No fim da
rodada, os testes estacionam a caneta (`/park`).

## Resultados

```
results/wdio/
  indicadores/testes.csv     uma linha por teste: status, duração, erro
  indicadores/metricas.csv   uma linha por métrica: valor, unidade, limites, aprovado
  nfr/<tipo>_<rodada>.csv    amostras brutas (soak, bateria, início, latência…)
  visual/                    imagem atual e diferença dos testes visuais
  painel.html                npm run painel
```

As imagens de referência dos testes visuais ficam versionadas em `tests/js/visual/referencia/`,
uma por aparelho. A primeira rodada num aparelho novo grava a referência; as seguintes comparam.

## Estrutura

```
wdio.conf.js           WebdriverIO: Appium, suítes, hooks e indicadores
tests/js/
  tipos/               um arquivo por tipo de teste (01-funcional … 12-seguranca)
  outros-apps/         exemplo com outro app (AddNumber)
  pages/               page objects
  support/             env, limites, sessão, gestos, adb (nfr.js), indicadores, parsers
  unit/                Jest, sem celular
  visual/referencia/   referências do teste visual
taprobot/              Python: robô (MQTT, G-code, calibração, leitura do toque, adb)
tools/                 Python: server (HTTP do braço), calibrate, test_connection, camera
soak/                  Python: soak com toque físico do braço e relatório próprio
scripts/               painel de resultados e checagem de sintaxe
tests/unit/            pytest, sem hardware
apps/                  APK do ApiDemos
docs/                  manuais, cobertura, decisões
```

## Documentação

| Para | Leia |
|---|---|
| O que a suíte cobre dos 12 tipos, resultados e o que falta | [docs/cobertura.md](docs/cobertura.md) |
| Arquitetura dos testes WebdriverIO e regras para escrever um teste novo | [docs/testes-js.md](docs/testes-js.md) |
| Manual da P1S: rede, Modo LAN, caneta no cabeçote, calibração | [docs/manual-p1s.md](docs/manual-p1s.md) |
| Montagem e segurança, em resumo | [docs/montagem.md](docs/montagem.md) |
| Soak com toque físico (motor Python) | [docs/soak.md](docs/soak.md) |
| Problemas conhecidos | [docs/problemas.md](docs/problemas.md) |
| Por que o projeto é assim | [docs/decisoes.md](docs/decisoes.md) |

## Integração contínua

A cada push, o GitHub Actions roda os testes unitários (Jest e pytest), a checagem de sintaxe,
o Prettier e o dry-run dos cenários. Nada disso precisa de celular nem da impressora.
