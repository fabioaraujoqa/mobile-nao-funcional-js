Anexei a minha apresentação "Tipos de testes mobile" (30 slides). Quero que você edite o próprio arquivo e me devolva o .pptx atualizado.

Regras:
- Mantenha o design: cores, fontes, tamanhos, posições, ícones e o layout de cada slide. Mude só os textos indicados abaixo e crie os slides novos copiando o layout de um slide existente, como eu indico.
- Use exatamente os números e textos daqui. Não invente dados.
- Não mexa nos slides marcados como "sem mudança".
- Os selos do quadro EXEMPLO têm três tipos: "DADO REAL DA SUÍTE" (borda verde), "EXEMPLO ILUSTRATIVO" e "CASE DE CAMPO". Quando eu pedir para trocar o selo, copie o estilo do selo equivalente de outro slide.
- Nas faixas ONDE RODAR e FUNCIONA EM, "●" é a caixa destacada e "○" é a apagada. Para mudar, copie o estilo da caixa equivalente.
- Se um texto novo não couber na caixa, encurte a frase sem mudar o sentido. Não diminua a fonte.
- No fim, renumere o rodapé "N / total" de todos os slides e me diga em uma lista o que mudou em cada slide.

Contexto, só para você entender (não precisa virar slide): a suíte de testes roda no ApiDemos 6.0.18 com WebdriverIO + Appium (UiAutomator2), num Moto G06 (Android 15) e num emulador Android 14. Os números são das rodadas de 10 e 11/11/2026.

---

## Slides 1 a 4: sem mudança

## Slide 5 (O comando é do Appium, não da linguagem): sem mudança

## Slide 6 (Teste funcional)
Texto do quadro EXEMPLO (o selo continua "DADO REAL DA SUÍTE"):
"No ApiDemos, o teste arrasta um ponto sobre outro e confere que o app mostra "Dropped!". Passou no G06 e no emulador."
Motivo: o arrastar foi validado com toque por software. Com o braço robótico, ainda não.

## Slide 7 (Funcional no Appium): sem mudança

## Slide 8 (Teste de usabilidade)
- Troque o selo para "DADO REAL DA SUÍTE" e o texto do quadro EXEMPLO para:
  "Os itens do menu do ApiDemos têm exatamente 48 dp no G06 e no emulador: no limite mínimo recomendado pelo Android."
- ONDE RODAR: ● Emulador ● Mesa ● Campo (o tamanho dos alvos também é medido no emulador).

## Slide 9 (Usabilidade no Appium)
O exemplo do getevent está errado: getevent não termina sozinho e trava o comando. Troque as duas últimas linhas do bloco de código por:
```
// toque físico do braço, com horário (em segundo plano)
mobile: shell
{ "command": "sh", "args": ["-c",
  "nohup getevent -lt /dev/input/eventN > /data/local/tmp/toque.log &"] }
```
Acrescente ao quadro ATENÇÃO, depois do texto atual: "getevent fica rodando: grave em arquivo e leia depois."

## Slide 10 (Teste de acessibilidade)
Troque o selo para "DADO REAL DA SUÍTE" e o texto do quadro EXEMPLO para:
"Com a fonte em 130%, o menu do ApiDemos continua inteiro na tela, todo item tem rótulo para o leitor de tela e o modo escuro não derruba o app."

## Slide 11 (Acessibilidade no Appium)
No quadro ATENÇÃO, troque "Volte font_scale para 1.0 no fim do teste." por "No fim do teste, volte font_scale ao valor que estava antes." O resto fica igual.

## Slide 12 (Teste de performance)
Texto do quadro EXEMPLO (o selo continua "DADO REAL DA SUÍTE"):
"Início frio no Moto G06: p50 de 857 ms (limite 2.000 ms). Jank na rolagem: 0%. No emulador, o jank chegou a 21,9%."

## Slide 13 (Performance no Appium)
Na primeira chamada do bloco de código, acrescente "-S" aos argumentos para que ela meça o início frio:
`"args": ["start", "-W", "-S", "-n", "io.appium.android.apis/.ApiDemos"]`
No quadro ATENÇÃO, troque "Para início frio, feche o app antes (am force-stop)." por "-S encerra o app antes de abrir (início frio). Sem ele, a medida é de início morno."

## Slide 14 (Teste de resistência)
Texto do quadro EXEMPLO (o selo continua "DADO REAL DA SUÍTE"):
"Reprovado: a memória cresceu 38,5 MB/h no G06 (limite 20 MB/h). Em 2 h, foi de 58 para 139 MB. Numa rodada de 6 h 46 min, chegou a 300 MB. Nenhum crash."
Motivo: o texto atual não diz que o teste reprovou.

## Slide 15 (Resistência no Appium): sem mudança

## Slide 16 (Teste de bateria e temperatura)
Mantenha o case de campo e acrescente uma segunda frase ao quadro EXEMPLO:
"Na mesa, o G06 gastou 3,3% por hora e chegou a 34 °C, em 1 h fora da tomada com a tela sempre acesa."

## Slide 17 (Bateria no Appium)
No quadro ATENÇÃO, troque o texto por:
"O cabo USB carrega o aparelho. Para medir bateria de verdade, use o adb por Wi-Fi: adb tcpip 5555, tire o cabo e rode adb connect <ip>:5555."

## Slide 18 (Teste de conectividade)
Mantenha o case de campo e acrescente uma segunda frase ao quadro EXEMPLO:
"Na suíte, a troca Wi-Fi → dados passou no G06 e no emulador."

## Slide 19 (Conectividade no Appium): sem mudança

## Slide 20 (Teste de interrupção)
Texto do quadro EXEMPLO (o selo continua "DADO REAL DA SUÍTE"):
"Chamada, SMS, segundo plano e bloqueio de tela no emulador: 4 de 4 passaram e o texto digitado foi preservado."

## Slide 21 (Interrupção no Appium)
Acrescente ao quadro ATENÇÃO, depois do texto atual: "mobile: lock só desbloqueia sozinho em aparelho sem PIN."

## Slide 22 (Teste de concorrência)
- Mantenha o case de campo e acrescente uma segunda frase ao quadro EXEMPLO:
  "Na suíte, outro app por cima, aviso de memória crítica e "Não manter atividades": 3 de 3 nos dois aparelhos, sem perder o texto."
- ONDE RODAR: ● Emulador ● Mesa ● Campo.

## Slide 23 (Concorrência no Appium): sem mudança

## Slide 24 (Teste de sensores e localização)
Texto do quadro EXEMPLO (o selo continua "DADO REAL DA SUÍTE"):
"Sem permissão de câmera, o ApiDemos cai (no G06 e no emulador). A tela de sensores cai assim que abre (emulador). O teste encontra e continua reprovando."

## Slide 25 (Sensores no Appium): sem mudança

## Slide 26 (Teste de compatibilidade)
Texto do quadro EXEMPLO (o selo continua "DADO REAL DA SUÍTE"):
"Cada tela é comparada com a foto de referência do próprio aparelho (@wdio/visual-service): 3 de 3 no G06 e no emulador."

## Slide 27 (Compatibilidade no Appium)
Acrescente ao fim do bloco de código:
```
// comparação visual (@wdio/visual-service)
await expect(browser).toMatchScreenSnapshot("inicio", 0.5)
```
Acrescente ao quadro ATENÇÃO, depois do texto atual: "Cada aparelho tem a sua referência. A 1ª rodada grava, as próximas comparam."

## Slide 28 (Teste de segurança)
Mantenha o exemplo ilustrativo e acrescente uma segunda frase ao quadro EXEMPLO:
"Na suíte: nenhuma senha ou token em texto aberto, mas o build do ApiDemos é depurável (falha conhecida)."

## Slide 29 (Segurança no Appium): sem mudança

---

## Slides novos (entre o slide 29 e o atual slide 30, nesta ordem)

Para os três, copie o layout de um slide "N O A P P I U M" (por exemplo, o slide 29): título grande, bloco escuro à esquerda e coluna à direita. Rótulo pequeno no topo: "N A P R Á T I C A".

### Novo slide A. Título: "Como a suíte está organizada"
Bloco da esquerda, em lista:
- Um arquivo por tipo de teste: 01-funcional até 12-seguranca, com o objetivo escrito no topo.
- Cada teste diz onde roda: [emulador], [aparelho_real] ou [braco]. Fora do lugar certo, ele é pulado e o motivo fica registrado.
- Defeito do próprio app fica marcado como "falha conhecida" e continua reprovando.
- Toda rodada grava indicadores: aparelho, versão do Android e do app, valor medido e limite.
Coluna da direita, como "FERRAMENTAS": WebdriverIO 10 + Mocha · Appium 3 + UiAutomator2 · @wdio/visual-service · Braço robótico (impressora 3D + caneta touch).

### Novo slide B. Título: "O resultado"
Coluna da direita (como na "FUNCIONA EM"), em duas caixas:
- "Aparelho real (G06): 25 de 28 passaram"
- "Emulador: 28 de 31 passaram"
Bloco da esquerda: deixe vazio, com o texto pequeno "[PRINT DO PAINEL: tabela dos 12 tipos]" no centro, para eu colar a imagem.
Faixa de rodapé (estilo da faixa de citação do slide 2): "Reprovaram só as falhas conhecidas do ApiDemos e o soak, que achou um vazamento de memória."

### Novo slide C. Título: "Próximos passos"
Bloco da esquerda, em lista:
- Braço robótico na tela: arrastar e medir a latência do toque físico.
- Notificação chegando com o app aberto.
- Mais aparelhos na comparação visual, inclusive iPhone: o braço toca qualquer tela.
- Painel de indicadores atualizado a cada rodada.
Coluna da direita: deixe vazia, com o texto pequeno "[PRINT DO PAINEL: gráfico do soak]".

## Slide 30 (Para levar): sem mudança. Só o rodapé passa a ser o último número.
