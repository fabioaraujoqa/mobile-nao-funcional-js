# Cobertura dos testes

Este documento compara os 12 tipos de teste mobile (funcional e não funcionais) com o que a suíte
cobre hoje: onde cada um está, como é medido e o que falta. Cada tipo tem **um arquivo** em
`tests/js/tipos/`, com o objetivo no cabeçalho. Os números vêm das rodadas da suíte WebdriverIO de
10/11/2026 (Moto G06 com Android 15 e emulador com Android 14, ApiDemos 6.0.18).

Situação: ✅ coberto · ◐ parcial · ✗ não coberto

## Resumo

| # | Tipo | Situação | Arquivo (`tests/js/tipos/`) | Roda em | Medido |
|---|---|---|---|---|---|
| 1 | Funcional | ✅ | `01-funcional` (+ `outros-apps/addnumber`) | emulador, mesa | navegação e arrastar/soltar passam |
| 2 | Usabilidade | ◐ | `02-usabilidade` | emulador, mesa | alvos do menu com 48 dp no G06; latência pede o braço |
| 3 | Acessibilidade | ✅ | `03-acessibilidade` | emulador, mesa | fonte 130%, rótulos e modo escuro passam |
| 4 | Performance | ✅ | `04-performance` | emulador, mesa | G06: frio p50 772 ms, morno p50 195 ms, jank 0,22% |
| 5 | Resistência (soak) | ✅ | `05-resistencia` | mesa | G06, 2 h: ~38,5 MB/h; **reprovado** (abaixo) |
| 6 | Bateria e temperatura | ✅ | `06-bateria-temperatura` | aparelho real | G06, 1 h fora da tomada: 3,3 %/h, máx. 34 °C |
| 7 | Conectividade | ✅ | `07-conectividade` | emulador, mesa | perda/volta, Wi-Fi → dados, velocidades |
| 8 | Interrupção | ✅ | `08-interrupcao` | emulador, mesa | chamada, SMS, 2º plano e bloqueio, texto preservado |
| 9 | Concorrência | ✅ | `09-concorrencia` | emulador, mesa | outro app, memória crítica, "Não manter atividades" |
| 10 | Sensores e localização | ✅ | `10-sensores-localizacao` | emulador, mesa | 2 falhas conhecidas do ApiDemos |
| 11 | Compatibilidade | ✅ | `11-compatibilidade` | emulador, mesa | referências visuais do G06 e do emulador |
| 12 | Segurança | ◐ | `12-seguranca` | emulador, mesa | permissões e arquivos ok; build depurável (falha conhecida) |

Total: 10 cobertos e 2 parciais. Nenhum tipo está sem cobertura.

Marcas no título de cada teste dizem onde ele roda: `[emulador]`, `[aparelho_real]`, `[braco]` e
`[longo]`. Fora do ambiente, o teste é pulado com o motivo no log e em `indicadores/testes.csv`.
Falhas do próprio ApiDemos ficam marcadas `[falha conhecida ApiDemos]` e continuam reprovando.

## Por tipo

### 1. Funcional ✅
- **Como:** page objects (`pages/`) com seletores por accessibility id e resource-id. O toque passa
  por `Gestures`: por software, pelo braço real ou pelo braço simulado.
- **Casos:** navegar até Views e voltar; soltar o ponto 1 sobre o ponto 2 e conferir `Dropped!`.
- **Falta:** validar o arrastar com o braço na tela (`ROBO=true`) depois da calibração.

### 2. Usabilidade ◐
- **Alvos de toque:** cada item do menu precisa de pelo menos 48 dp (`getElementRect` +
  `mobile: getDisplayDensity`). No G06 eles têm exatamente 48 dp (84 px com densidade 280).
- **Resposta visual `[braco]`:** do contato físico (`getevent -lt`) até o primeiro quadro novo
  (`dumpsys gfxinfo framestats`). Limites: p50 ≤ 150 ms, p95 ≤ 300 ms. Ainda sem medida: o braço não
  tocou a tela.
- Clareza de fluxos e textos continua sendo teste com pessoas.

### 3. Acessibilidade ✅
- **Fonte grande:** `font_scale` 1.3, todos os itens do menu dentro da tela e uma imagem de
  referência (`menu-fonte-grande`). Depois o valor anterior é devolvido.
- **Leitor de tela:** todo item do menu tem `content-desc`.
- **Modo escuro:** `mobile: setUiMode` liga e desliga sem derrubar o app. O modo anterior é devolvido.

### 4. Performance ✅
- **Abertura:** `am start -W` (frio com `-S`, morno depois de HOME), 10 repetições, p50 e p90.
- **Jank:** `dumpsys gfxinfo` depois de 20 rolagens. Limite: 25%, com pelo menos 30 quadros.

  | | G06 (Android 15) | Emulador (Android 14) |
  |---|---|---|
  | Início frio, p50 | 772 ms | 1.174 ms |
  | Início morno, p50 | 195 ms | 487 ms |
  | Jank na rolagem | 0,22% | 9,5% |

  O emulador depende muito da máquina: antes de um cold boot, o mesmo AVD deu 3,8 s e 96% de jank.
  Para comparar versões do app, use sempre o aparelho real.
- **Fora do escopo:** backend sob carga, que precisa de ferramenta de carga no servidor.

### 5. Resistência (soak) ✅
- **Como:** um laço por três telas. A cada ciclo grava PSS, heaps, threads, CPU, bateria e
  temperatura em `nfr/soak_*.csv`. Reprova se a memória crescer mais de 20 MB/h (regressão linear),
  se o PSS passar de 300 MB, se as threads passarem de 200, se a temperatura passar de 45 °C ou se
  houver crash. Mesmo quando para no meio, o teste grava o resumo em `indicadores/metricas.csv`.
  Duração em `DURACAO_MIN`, com padrão de 30 min.
- **Rodada de 2 h no G06 (10/11, aparelho reiniciado antes):**

  | Métrica | Valor | Limite | |
  |---|---|---|---|
  | Crescimento da memória | 38,5 MB/h | ≤ 20 MB/h | ✗ |
  | PSS | 58 → 139 MB | ≤ 300 MB | ✓ |
  | Java heap / native heap | 10 → 54 MB / 10 → 45 MB | — | |
  | Threads (máx.) | 46 | ≤ 200 | ✓ |
  | Temperatura (máx.) | 33 °C | ≤ 45 °C | ✓ |
  | Crashes | 0 (mesmo processo as 2 h) | 0 | ✓ |

  O crescimento é uma reta: a 2ª hora cresceu no mesmo ritmo da 1ª (37,8 MB/h) e não há platô.
  Java e native crescem juntos. Isso confirma a rodada de 05/11 (suíte anterior, ~33 MB/h, parou com
  300 MB em 6 h 46 min). No ritmo atual, o PSS chegaria a 300 MB em cerca de 6 h. O vazamento é do
  ApiDemos (há animações e telas de exemplo no laço). O teste faz o que deve: reprova e registra.

### 6. Bateria e temperatura ✅
- **Como:** com a tela acesa nas Bouncing Balls (animação contínua), lê `dumpsys battery` e a
  temperatura a cada 5 min. Limites: 25 %/h de consumo (regressão linear) e 45 °C. Pula (com o
  motivo) se o aparelho estiver carregando, e só roda em aparelho real.
- **Rodada do G06 (10/11, 60 min, adb por Wi-Fi):** bateria de 100% para 97%, consumo de
  **3,3 %/h**, e temperatura máxima de **34 °C**, que caiu para 29 °C ao longo da rodada. CPU do app
  em torno de 5%. Aprovado.
- **Cuidado ao ler:** o nível da bateria só muda de 1 em 1%, então rodadas curtas dão pouca
  precisão. E logo depois de sair dos 100% o Android segura o nível por um tempo. Para comparar
  versões, use rodadas de 1 h ou mais, começando abaixo de 100%.
- **Como rodar sem cabo:** com o cabo ligado, `adb tcpip 5555`; depois tire o cabo e use
  `adb connect <ip>:5555` e `UDID=<ip>:5555 DURACAO_MIN=60 BATERIA_TELA_LIGADA_MS=4200000`.

### 7. Conectividade ✅
- Sem Wi-Fi nem dados e a volta da rede `[emulador]`, a troca Wi-Fi → dados móveis e as velocidades
  gsm/edge/umts/lte/full `[emulador]` (`mobile: setConnectivity`, `mobile: networkSpeed`). O estado
  da rede é sempre devolvido no fim.
- O ApiDemos não usa rede, então aqui só se confere que o app sobrevive. Num app com backend, some
  a verificação de que nenhum dado se perdeu.

### 8. Interrupção ✅
- Chamada (`mobile: gsmCall`) e SMS (`mobile: sendSms`) `[emulador]`, segundo plano
  (`mobile: backgroundApp`) e bloqueio (`mobile: lock`) `[emulador]`. Em todos, o texto digitado
  no SaveRestoreState precisa continuar lá.
- O bloqueio fica no emulador porque o G06 tem PIN.
- **Falta:** notificações.

### 9. Concorrência ✅
- Outro app por cima (`mobile: activateApp` nas Configurações e `mobile: queryAppState`), aviso de
  memória crítica (`mobile: sendTrimMemory`, `RUNNING_CRITICAL`) e "Não manter atividades"
  (`always_finish_activities=1`, devolvido no fim). Em todos, o texto digitado é preservado.

### 10. Sensores e localização ✅
- **GPS:** rota e salto São Paulo → Paris `[aparelho_real]`, conferindo a posição lida em
  `dumpsys location`, e GPS desligado. No emulador, a posição simulada só é registrada se algum app
  estiver pedindo GPS, e o ApiDemos não pede. Por isso, rota e salto rodam na mesa. Em 05/11 eles
  passaram no emulador porque outro app do AVD estava pedindo GPS.
- **Câmera:** abrir e fechar 10 vezes e abrir com a permissão negada (`mobile: changePermissions`).
- **Sensores:** luz, proximidade, temperatura, pressão, umidade e aceleração (`mobile: sensorSet`,
  `[emulador]`) e texto preservado na rotação da tela.
- **Falhas conhecidas do ApiDemos:** a câmera cai sem permissão (emulador e G06) e a tela de sensores
  cai ao abrir (emulador). Depois delas, o teste fecha o diálogo "o app parou" para não atrapalhar os
  próximos.

### 11. Compatibilidade ✅
- Registra quem é o aparelho (`mobile: deviceInfo`) e compara a tela inicial e a de Views com a
  referência **daquele** aparelho (`@wdio/visual-service`, até 0,5% de diferença, com a barra de
  status e a de navegação escondidas). Referências gravadas: G06 (720×1640) e emulador (1080×2400).
- Para um aparelho novo, rode a suíte com `UDID=...`: a 1ª rodada grava a referência e as seguintes
  comparam.
- **Falta:** mais aparelhos e versões do Android na matriz.

### 12. Segurança ◐
- **Permissões:** `mobile: getPermissions` comparado com a lista esperada (as 4 de instalação e as 10
  em tempo de execução que o ApiDemos declara).
- **Arquivos internos:** `run-as` + `mobile: pullFile` em `shared_prefs`, procurando senha ou token
  em texto aberto.
- **Build:** não pode ser `DEBUGGABLE` nem permitir backup. O ApiDemos é build de debug, então esse
  caso reprova (falha conhecida).
- **Fora do alcance do Appium:** análise estática e de tráfego. Para isso, use ferramentas próprias,
  como o MobSF.

## Indicadores

Toda rodada grava duas tabelas em `results/wdio/indicadores/`, que só recebem linhas novas:

- `testes.csv`: uma linha por teste (aprovado, reprovado ou pulado), com duração e erro.
- `metricas.csv`: uma linha por métrica, com valor, unidade, limites e se ficou dentro deles.

As duas levam o contexto da rodada: id, aparelho, UDID, emulador ou não, Android, API, app e versão,
commit, versão do Appium, tipo e spec. Assim dá para montar painéis por aparelho, por versão do app
ou ao longo do tempo. As amostras brutas ficam em `results/wdio/nfr/`, com o mesmo id de rodada no
nome, e os gráficos saem com `python -m tools.graficos`.

## Próximos passos, por prioridade

1. **Braço na tela:** rodar `01-funcional` e a latência do `02` com `ROBO=true` depois da calibração.
2. **Interrupção:** notificações.
3. **Compatibilidade:** mais aparelhos na matriz visual.

O WebdriverIO também tem atalhos como `browser.gsmCall()`, mas eles chamam o mesmo `mobile:` do
Appium. Trocar não traz capacidade nova, então a suíte continua com `execute('mobile: ...')`, que
fica igual em qualquer cliente.

## Origem dos números

- Rodadas de 10/11/2026 em `results/wdio/` (`indicadores/*.csv` e `nfr/*.csv`). O soak é a rodada
  `2026-11-10-20-08-48` e a bateria, a `2026-11-10-22-38-00`.
- Rodadas de 05/11 (suíte anterior) em `results/g06/` e `results/emulador/`.
- Os comandos `mobile:` citados aqui existem no UiAutomator2 6.8.0 instalado, com esses parâmetros.
