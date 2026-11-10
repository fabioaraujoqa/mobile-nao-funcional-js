# Cobertura dos testes

Este documento compara os 12 tipos de teste mobile (funcional e não funcionais) com o que a suíte
cobre hoje, onde cada um está, como é medido e o que falta. Os números vêm dos resultados
guardados em `results/` (rodadas de 05/11/2026, suíte anterior; Moto G06 com Android 15 e emulador com
Android 14, ApiDemos 6.0.18).

Situação: ✅ coberto · ◐ parcial · ✗ não coberto

## Resumo

| # | Tipo | Situação | Onde (`tests/js/`) | Roda em | Medido até agora |
|---|---|---|---|---|---|
| 1 | Funcional | ✅ | `funcionais/apidemos`, `funcionais/addnumber`, `e2e/gestos` | emulador, mesa | 5/5 no G06 (WebdriverIO, 10/11) |
| 2 | Usabilidade | ◐ | `nao-funcionais/10-latencia` (toque físico até o 1º quadro) | mesa (braço) | ainda sem medida: o braço não tocou a tela |
| 3 | Acessibilidade | ✗ | — | — | — |
| 4 | Performance | ✅ | `01-inicializacao`, `02-fluidez`, `10-latencia` | emulador, mesa | G06: início frio p50 788 ms, morno p50 220 ms, jank 0,13% |
| 5 | Resistência (soak) | ✅ | `03-soak-memoria` e o motor `soak/` (Python) | mesa | G06: 75 → 300 MB em 6 h 46 min, sem crash; **reprovado** |
| 6 | Bateria e temperatura | ◐ | `04-bateria`; temperatura com limite só no `03` | mesa | nenhuma rodada válida (só com o aparelho carregando) |
| 7 | Conectividade | ◐ | `06-rede` | emulador | sobrevive a rede cortada, modo avião e 5 velocidades |
| 8 | Interrupção | ◐ | `07-interrupcoes` | emulador | chamada, SMS e 2º plano: 3/3, texto preservado |
| 9 | Concorrência | ✗ | — | — | — |
| 10 | Sensores e localização | ✅ | `05-sensores`, `08-camera`, `09-geolocalizacao` | emulador, mesa | 2 falhas conhecidas do ApiDemos (abaixo) |
| 11 | Compatibilidade | ◐ | toda a suíte, rodada em mais de um aparelho | emulador, mesa | G06 × emulador com tempos e jank diferentes |
| 12 | Segurança | ✗ | — (fora do alcance do Appium) | — | — |

Total: 4 cobertos, 5 parciais, 3 não cobertos.

## Por tipo

### 1. Funcional ✅
- **Como:** page objects (`pages/`) com seletores por accessibility id e resource-id; o toque passa
  por `Gestures` (por software, pelo braço real ou pelo braço simulado).
- **Arrastar e soltar:** `e2e/gestos` solta o ponto 1 sobre o ponto 2 e confere que o app mostra
  `Dropped!`. Passou no G06 com toque por software. Com o braço ainda falta validar na tela.

### 2. Usabilidade ◐
- **Coberto:** "resposta visual a cada ação". `10-latencia` mede, com o braço, o tempo do contato
  físico (`getevent -lt`) até o primeiro quadro novo (`dumpsys gfxinfo framestats`).
  Limites: p50 ≤ 150 ms, p95 ≤ 300 ms.
- **Falta:** tamanho dos alvos de toque (≥ 48 dp: `mobile: getDisplayDensity` + `getElementRect`).
  Clareza de fluxos e textos continua sendo teste com pessoas.

### 3. Acessibilidade ✗
- **Falta:** fonte grande (`settings put system font_scale 1.3`) com verificação de que os botões
  continuam visíveis dentro da tela, `content-desc` nos elementos clicáveis e modo escuro
  (`mobile: setUiMode`). Encaixa no teste visual (abaixo).

### 4. Performance ✅
- **Abertura:** `am start -W` (frio com `-S`, morno depois de HOME), 10 repetições, p50/p90.
- **Jank:** `dumpsys gfxinfo` depois de 20 rolagens. Limite: 25%, com pelo menos 30 quadros.
- **Fora do escopo:** backend sob carga (precisa de ferramenta de carga no servidor).

### 5. Resistência (soak) ✅
- **Como:** um laço por três telas; a cada ciclo grava PSS, heaps, threads, CPU, bateria e
  temperatura em CSV. Reprova se a memória crescer mais de 20 MB/h (regressão linear), se o PSS
  passar de 300 MB, se as threads passarem de 200, se a temperatura passar de 45 °C ou se houver
  crash. Os relatórios longos ficam com o motor `soak/` em Python.
- **Rodada do G06:** a de 8 h parou em 6 h 46 min porque o PSS chegou a 300,002 MB. O crescimento
  médio foi de ~33 MB/h, contra o limite de 20 MB/h. Nenhum crash e o mesmo processo a rodada inteira.

### 6. Bateria e temperatura ◐
- **Como:** `04-bateria` lê `dumpsys battery` a cada 5 min e reprova acima de 25 %/h. Fica
  pendente (SKIP) se o aparelho estiver carregando, e só roda em aparelho real.
- **Falta:** uma rodada válida (adb por Wi-Fi, fora da tomada) e limite de temperatura no próprio `04`
  (hoje ela só é registrada).

### 7. Conectividade ◐
- **Coberto:** sem Wi-Fi nem dados, modo avião, volta da rede e as velocidades gsm/edge/umts/lte/full
  (`mobile: setConnectivity`, `mobile: networkSpeed`), sempre conferindo que o processo continua vivo.
- **Falta:** a troca Wi-Fi → dados móveis (`{ wifi: false, data: true }`) e verificar que nenhuma
  informação se perdeu. O ApiDemos não usa rede, então aqui só se verifica que o app sobrevive.

### 8. Interrupção ◐
- **Coberto:** chamada (`mobile: gsmCall`), SMS (`mobile: sendSms`) e segundo plano
  (`mobile: backgroundApp`), com texto digitado preservado.
- **Falta:** bloquear e desbloquear (`mobile: lock`) e notificações.

### 9. Concorrência ✗
- **Falta:** abrir outro app por cima (`mobile: activateApp`), simular falta de memória
  (`mobile: sendTrimMemory`, nível `RUNNING_CRITICAL`), ativar "Não manter atividades"
  (`always_finish_activities`) e conferir o estado com `mobile: queryAppState`. Dá para reaproveitar
  o padrão do `07` (texto preservado no SaveRestoreState).

### 10. Sensores e localização ✅
- **GPS:** rota, salto São Paulo → Paris e GPS desligado (`09`), conferindo a posição lida em `dumpsys location`.
- **Câmera:** abrir e fechar 10 vezes e abrir com a permissão negada (`08`).
- **Sensores:** leituras de luz, proximidade, temperatura, pressão, umidade e aceleração, e rotação da tela (`05`).
- **Falhas conhecidas do ApiDemos:** a tela de sensores cai ao abrir (emulador) e a câmera cai
  sem permissão (emulador e G06). Os testes registram essas falhas, sem convertê-las em aprovação.

### 11. Compatibilidade ◐
- **Coberto:** a mesma suíte roda em qualquer aparelho (`UDID`). G06 × emulador:

  | | G06 (Android 15) | Emulador (Android 14) |
  |---|---|---|
  | Início frio, p50 | 788 ms | 484 ms |
  | Jank na rolagem | 0,13% | 4,6% |

- **Falta:** comparação visual entre aparelhos e uma matriz de versões e tamanhos de tela.

### 12. Segurança ✗
- O Appium só ajuda a olhar: `mobile: getPermissions` (comparar com o esperado) e `mobile: pullFile`
  em `shared_prefs` de build debug. A análise de verdade usa ferramentas próprias, como o MobSF.

## Próximos passos, por prioridade

1. **Teste visual com `@wdio/visual-service`** (fecha boa parte de 3 e 11). A versão 11.x pede
   `webdriverio ^10.0.0`, compatível com o nosso 10.1.0 (conferido no npm). Para apps nativos, os
   matchers são `toMatchScreenSnapshot` e `toMatchElementSnapshot`. Cuidados: uma base de imagens por
   aparelho e resolução, telas sem animação (não usar Bouncing Balls) e esconder áreas que mudam
   sozinhas, como a barra de status.
   Primeiros casos: tela inicial e Views em cada aparelho, e as mesmas telas com `font_scale` 1.3.
2. **Acessibilidade:** `font_scale` 1.3 com botão visível dentro da tela e `content-desc` nos clicáveis.
3. **Concorrência:** outro app por cima + falta de memória + "Não manter atividades", com estado preservado.
4. **Conectividade e interrupção:** troca Wi-Fi → dados no G06 (Android 11+) e `mobile: lock`.
5. **Usabilidade:** alvos de toque ≥ 48 dp.
6. **Bateria:** rodada fora da tomada e limite de temperatura no `04`.
7. **Braço na tela:** rodar `e2e` e `10-latencia` com `ROBO=true` depois da calibração.

O WebdriverIO também tem atalhos como `browser.gsmCall()`, mas eles chamam o mesmo `mobile:` do
Appium. Trocar não traz capacidade nova, então a suíte continua com `execute('mobile: ...')`, que
fica igual em qualquer cliente.

## Origem dos números

- Rodadas de 05/11 em `results/g06/` e `results/emulador/` (`nfr/*.csv`).
- A suíte WebdriverIO mede da mesma forma, mas até agora só rodou no aparelho os funcionais, o e2e
  e o `02-fluidez`. Para citar números "da suíte WebdriverIO", rode os não funcionais de novo.
- Os comandos `mobile:` citados aqui existem no UiAutomator2 6.8.0 instalado, com esses parâmetros.
