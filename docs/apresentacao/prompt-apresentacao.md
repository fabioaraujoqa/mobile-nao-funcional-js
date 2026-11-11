Atualize a minha apresentação "Tipos de testes mobile" com os resultados reais do projeto de automação. Mantenha o visual, a ordem dos 12 tipos e o tom atual. Mude só o conteúdo descrito abaixo. Não invente números: use apenas os que estão aqui. Onde eu indicar [PRINT], deixe um espaço reservado para eu colar uma imagem do painel.

## Contexto do projeto (para um slide de abertura ou de método)

- App testado: ApiDemos 6.0.18, app de exemplo do Android com telas prontas para testes.
- Aparelhos: Moto G06 (aparelho real, Android 15, tela 720×1640) e emulador Android 14 (1080×2400).
- Ferramentas: WebdriverIO 10 com Mocha, Appium 3 com o driver UiAutomator2, comandos `mobile:` do Appium e `adb shell`. Teste visual com @wdio/visual-service.
- Um braço robótico (impressora 3D adaptada com uma caneta touch) faz toques físicos reais na tela. Os testes podem tocar por software ou pelo braço.
- Organização: um arquivo de teste por tipo (01-funcional até 12-seguranca), cada um com o objetivo escrito no topo.
- Cada teste traz no título onde roda: [emulador], [aparelho_real] ou [braco]. Fora do ambiente certo, ele é pulado e o motivo fica registrado.
- Falhas do próprio ApiDemos ficam marcadas como "falha conhecida" e continuam reprovando. Não viram aprovação.
- Toda rodada grava indicadores em CSV (aparelho, versão do Android, versão do app, commit), que alimentam o painel de resultados.
- Resultado geral (última rodada de cada tipo):
  - Aparelho real: 25 de 28 testes passaram. Reprovaram 2 falhas conhecidas do ApiDemos e o soak. 8 foram pulados por serem de outro ambiente.
  - Emulador: 28 de 31 passaram. Reprovaram só as 3 falhas conhecidas. 3 foram pulados.
  [PRINT: topo do painel e a tabela "Os 12 tipos de teste, por aparelho"]

## Um slide (ou bloco) por tipo: como testamos, o que rodou e o resultado

1. Funcional. Como: page objects e seletores por accessibility id e resource-id. Rodou: navegar até Views e voltar; arrastar um ponto sobre outro e conferir "Dropped!". Resultado: 2 de 2 no aparelho real e no emulador. Com o braço, o arrastar ainda não foi validado na tela.

2. Usabilidade. Como: tamanho de cada item do menu (getElementRect) convertido para dp com mobile: getDisplayDensity; latência do toque físico até o primeiro quadro novo (getevent + dumpsys gfxinfo). Resultado: menor alvo de toque de 48 dp, exatamente o mínimo recomendado. A latência com o braço ainda não foi medida.

3. Acessibilidade. Como: fonte em 130% (font_scale) com o menu inteiro na tela e comparação visual; content-desc em todos os itens para o leitor de tela; modo escuro com mobile: setUiMode. Resultado: 3 de 3 nos dois aparelhos.

4. Performance. Como: am start -W, 10 aberturas a frio e mornas (p50 e p90); dumpsys gfxinfo depois de 20 rolagens para medir jank. Resultado na última rodada:
   - Aparelho real: abertura a frio p50 857 ms (limite 2.000), morna p50 258 ms (limite 1.000), jank 0%.
   - Emulador: frio p50 849 ms, morno p50 224 ms, jank 21,9% (limite 25%).
   - Mensagem: o emulador varia muito com a máquina (antes de reiniciar o emulador, deu 3,8 s e 96% de jank). Para comparar versões do app, use aparelho real.
   [PRINT: gráfico "Desempenho: aparelho real × emulador"]

5. Resistência (soak). Como: laço por três telas durante 2 h; a cada ciclo lê memória (dumpsys meminfo), threads, CPU e temperatura; o crescimento da memória é a inclinação de uma regressão linear. Resultado no Moto G06: REPROVADO. A memória cresceu 38,5 MB/h (limite 20 MB/h), de 58 para 139 MB, em linha reta, sem estabilizar. Sem crash, 46 threads no máximo, 33 °C. Uma rodada anterior de quase 7 h (05/11) mostrou o mesmo vazamento (~33 MB/h). O vazamento é do ApiDemos: o teste fez o papel dele.
   [PRINT: gráfico "Soak: memória ao longo de 2 h"]

6. Bateria e temperatura. Como: aparelho fora da tomada por 1 h, adb pelo Wi-Fi, tela acesa com animação contínua, leitura de dumpsys battery e thermalservice a cada 5 min. Resultado: APROVADO. Consumo de 3,3%/h (limite 25%/h), bateria de 100% para 97%, temperatura máxima de 34 °C (limite 45 °C). Ressalva: o nível da bateria só muda de 1 em 1%, então rodadas curtas são aproximadas.
   [PRINT: gráficos "Bateria e temperatura: 1 h fora da tomada"]

7. Conectividade. Como: mobile: setConnectivity (Wi-Fi, dados, modo avião) e mobile: networkSpeed (gsm até lte). Rodou: perda e volta da rede e velocidades no emulador; troca de Wi-Fi para dados nos dois. Resultado: 3 de 3 no emulador, 1 de 1 no aparelho real.

8. Interrupção. Como: mobile: gsmCall (chamada), sendSms, backgroundApp e lock, sempre com um texto digitado que precisa continuar na tela. Resultado: 4 de 4 no emulador, 1 de 1 (segundo plano) no aparelho real. Chamada, SMS e bloqueio só no emulador (o aparelho real tem PIN e não recebe chamada simulada).

9. Concorrência. Como: outro app por cima (mobile: activateApp e queryAppState), aviso de memória crítica (mobile: sendTrimMemory) e a opção "Não manter atividades". Resultado: 3 de 3 nos dois aparelhos, com o texto digitado preservado.

10. Sensores e localização. Como: mobile: setGeolocation (rota e salto São Paulo → Paris), GPS desligado, câmera aberta e fechada 10 vezes, câmera sem permissão (mobile: changePermissions), sensores simulados (mobile: sensorSet) e rotação da tela. Resultado: 5 de 6 no aparelho real e 4 de 6 no emulador. As falhas são do ApiDemos: o app cai quando a permissão da câmera é negada (nos dois) e a tela de sensores cai ao abrir (emulador).

11. Compatibilidade. Como: mobile: deviceInfo e comparação visual de cada tela com a referência do mesmo aparelho (até 0,5% de diferença, barras do sistema escondidas). Resultado: 3 de 3 nos dois aparelhos. Próximo passo, só citado no discurso: levar a mesma estrutura para iOS (iPhone), onde o braço robótico funciona igual, porque toca qualquer tela.

12. Segurança. Como: mobile: getPermissions comparado com a lista esperada; busca de senha ou token em texto aberto nos arquivos internos (shared_prefs); flags do build. Resultado: 2 de 3. O build é depurável (DEBUGGABLE), uma falha conhecida porque o ApiDemos é build de debug. Análise de código e de tráfego fica para ferramentas próprias, como o MobSF.

## Correções em slides que já existem

- Se algum slide disser que o soak passou, corrija: ele reprovou nas duas rodadas (vazamento de memória do ApiDemos).
- Se algum slide disser que o braço já arrasta itens na tela ou já mediu latência, troque por "próximo passo": hoje o arrastar foi validado por software, e a latência com o braço ainda não foi medida.
- Os números antigos do Moto G06 (abertura a frio p50 de 788 ms e jank de 0,13%, de 05/11) estavam certos para aquela rodada. Se preferir números atuais, use os da seção 4.

## Slide final sugerido: próximos passos

- Rodar o arrastar e a latência com o braço na tela, depois da calibração.
- Testar notificações chegando com o app aberto.
- Mais aparelhos na comparação visual, inclusive iPhone.
- Painel de indicadores atualizado a cada rodada.
