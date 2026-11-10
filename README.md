# Robô de toque para testes Appium (Bambu Lab P1S + Moto G06)

Usa a P1S como robô cartesiano: o cabeçote leva uma ponteira (borracha touch) até o
ponto da tela e a mesa sobe/desce para tocar. Os testes Appium continuam iguais:
o Appium localiza o elemento, o robô faz o toque físico.

```
Teste Appium → element.rect (centro em px)
      ↓
RobotTap: px → mm (calibração) → G-code
      ↓ MQTT/TLS (modo LAN)
P1S → ponteira toca a tela
```

> **Status:** a lógica (conversão, limites de segurança, geração de G-code, parser do
> `getevent`, soak) tem testes automáticos que passam. **Testado no hardware:** conexão
> MQTT com a P1S, homing, movimento e desenho com caneta no papel; testes Appium no Moto G06
> pelo USB (por software e com o robô simulado). **Ainda não testado:** toque na tela com a
> ponteira, calibração no hardware e soak real.
> Faça o primeiro uso com calma, seguindo [docs/montagem.md](docs/montagem.md).

## Começo rápido

Duas partes: o **braço** (calibração, MQTT, G-code, servidor HTTP e soak) em Python, e os
**testes Appium** em WebdriverIO (JavaScript), um arquivo por tipo de teste mobile.

```bash
# Python: braço e testes unitários da lógica, sem hardware
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m pytest
.venv/bin/python -m soak run soak/examples/apidemos_soak.yaml --dry-run   # soak simulado, ~2 min

# JavaScript: testes no celular (WebdriverIO + Appium)
npm ci
npm test                                       # unitários Jest, sem celular
appium --allow-insecure=uiautomator2:adb_shell # em outro terminal
npm run test:funcional                         # tipo 1, toque por software
npm run test:tipos                             # os 12 tipos (tests/js/tipos/)
```

O celular (Moto G06) é encontrado sozinho, no cabo USB ou na Depuração por Wi-Fi, e
precisa estar com a tela desbloqueada. Para usar a P1S de verdade, siga a montagem e a
calibração antes.

## Documentação

| Para | Leia |
|---|---|
| Manual passo a passo: rede/Modo LAN, caneta no cabeçote, até a calibração | [docs/manual-p1s.md](docs/manual-p1s.md) |
| Preparar a P1S, montar a ponteira, regras de segurança e calibrar (resumo) | [docs/montagem.md](docs/montagem.md) |
| Testes Appium (WebdriverIO): instalação, arquitetura, braço e execução | [docs/testes-js.md](docs/testes-js.md) |
| O que a suíte cobre dos 12 tipos de teste mobile, e o que falta | [docs/cobertura.md](docs/cobertura.md) |
| Teste de resistência (soak) e de consumo de bateria | [docs/soak.md](docs/soak.md) |
| Limitações e solução de problemas | [docs/problemas.md](docs/problemas.md) |
| Por que o projeto é assim, aprendizados no hardware e pendências | [docs/decisoes.md](docs/decisoes.md) |

## Segurança, em resumo

- **Homing (G28) sempre com a mesa vazia** e sem o módulo da ponteira no cabeçote.
- `motion.z_floor` é o Z mínimo permitido: o código bloqueia qualquer movimento abaixo dele.
- Nas primeiras execuções, mantenha a mão perto do botão de energia da P1S.
- `config.yaml` (com o access code) e `calibration.json` nunca vão para o git.

## Estrutura

```
taprobot/      biblioteca do robô (bambu.py MQTT, robot.py gestos, calibration.py,
               touch_reader.py, adb.py, device.py busca do celular, simulated.py)
soak/          teste de resistência e de consumo (cenário, coletor, guardião, relatório)
tools/         linha de comando: calibrate, test_connection, server (python -m tools.<nome>)
tests/js/      testes WebdriverIO: tipos/ (um arquivo por tipo de teste), pages, support, Jest
tests/unit/    testes unitários da lógica (sem hardware): python -m pytest -q
apps/          APK de exemplo (ApiDemos)
docs/          decisões e aprendizados
results/       saída dos testes: CSVs, indicadores, capturas (não versionar)
runs/          execuções do soak (não versionar)
```
