# Manual: da P1S na caixa até a calibração

Passo a passo completo para transformar a Bambu Lab P1S no robô de toque, na ordem certa.
O [montagem.md](montagem.md) é o resumo; este é o roteiro detalhado para seguir com a
impressora na frente.

Ordem geral:

1. [Rede e Modo LAN](#1-rede-e-modo-lan)
2. [Computador (Mac)](#2-computador-mac)
3. [Testar a conexão com a P1S](#3-testar-a-conexão-com-a-p1s)
4. [Imprimir as peças](#4-imprimir-as-peças)
5. [Montar a caneta touch](#5-montar-a-caneta-touch)
6. [Preparar o celular](#6-preparar-o-celular)
7. [Homing com a mesa vazia](#7-homing-com-a-mesa-vazia)
8. [Encaixar o módulo e a caneta no cabeçote](#8-encaixar-o-módulo-e-a-caneta-no-cabeçote)
9. [Medir quanto a ponta passa do bico](#9-medir-quanto-a-ponta-passa-do-bico)
10. [Montar o celular e definir o z_floor](#10-montar-o-celular-e-definir-o-z_floor)
11. [Calibrar](#11-calibrar)
12. [Verificar e usar](#12-verificar-e-usar)

> **Regra de ouro:** o homing (G28) é feito **sempre sem o módulo da caneta e sem nada na
> mesa**. No G28 a mesa sobe até encostar no bico. Com a caneta montada, a ponta bate antes;
> com o celular na mesa, ele seria esmagado.

---

## 1. Rede e Modo LAN

A P1S **não tem porta Ethernet**. O "LAN" é o Modo LAN pelo Wi-Fi: o computador fala direto
com a impressora na rede local (MQTT na porta 8883), sem passar pela nuvem da Bambu.

1. Ligue a P1S e conecte-a ao Wi-Fi (tela > **Configurações** > **WLAN**). Use uma rede de
   **2,4 GHz**; a P1S não enxerga 5 GHz.
2. Na mesma tela de rede, ative **Somente LAN** (*LAN Only Mode*). A nuvem e o app Bambu
   Handy deixam de funcionar enquanto ele estiver ligado.
3. Com o Somente LAN ligado, aparece a opção **Modo Desenvolvedor**. Ative. Sem ela a
   impressora recusa G-code vindo de fora.
4. Anote:
   - **IP** (tela de rede). Vale reservar esse IP no roteador (DHCP fixo pelo MAC) para ele
     não mudar.
   - **Access code** (tela de rede, 8 caracteres). Ele muda se você mexer no Modo LAN de
     novo; aí é preciso atualizar o `config.yaml`.
   - **Número de série**: o código impresso na etiqueta **não** serve. Leia o verdadeiro no
     certificado da impressora (começa com `01P` na P1S):

     ```bash
     openssl s_client -connect IP_DA_P1S:8883 </dev/null 2>/dev/null \
       | openssl x509 -noout -subject
     # subject=... CN=01P00C630601759   <- este é o serial
     ```

5. **Mac, celular e impressora precisam estar na mesma rede** (a da impressora).

Os nomes dos menus variam um pouco com a versão do firmware. Se o Modo Desenvolvedor não
aparecer, atualize o firmware (pelo Bambu Studio ou pelo cartão SD) antes de continuar.

## 2. Computador (Mac)

```bash
cd tap-robot
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
source .venv/bin/activate        # em todo terminal novo
brew install android-platform-tools   # traz o adb, se ainda não tiver
cp config.example.yaml config.yaml
```

Edite o `config.yaml` (ele não vai para o git):

```yaml
printer:
  ip: "192.168.15.27"
  serial: "01P00C630601759"
  access_code: "12345678"
```

Deixe `motion.z_floor: null` por enquanto. Ele é definido no passo 10.

## 3. Testar a conexão com a P1S

```bash
python -m tools.test_connection --latency
```

Esperado: `Conectado ao broker MQTT da P1S.`, `Resposta ao G90: ... success` e latência na
casa de dezenas de ms. Nada se move nesse teste.

| Sintoma | Causa provável |
|---|---|
| Conexão recusada ou tempo esgotado | IP errado, Mac em outra rede, Modo LAN desligado |
| Erro de autenticação | access code errado (ou mudou) |
| Conecta mas "sem confirmação" | serial errado, Modo Desenvolvedor desligado, ou o formato mudou no firmware (ver [problemas.md](problemas.md)) |

## 4. Imprimir as peças

Imprima com a P1S ainda no uso normal (pode desligar o Somente LAN e imprimir pela nuvem, se
preferir; depois volte ao passo 1.2).

**a) Módulo de caneta:** "P1/X1 Pen Plotter Module" (KEV_3DP, MakerWorld). Encaixa no
cabeçote e tem uma mola em zigue-zague que segura a caneta. Siga o perfil e as instruções de
montagem da página do modelo.

**b) Caneta touch:** os arquivos estão em
[anexos/Caneta_Touch_BIC_Escalonada_Base_Descartavel_P1S/](../anexos/Caneta_Touch_BIC_Escalonada_Base_Descartavel_P1S/).
Ela tem o formato de uma BIC (corpo sextavado de 8,3 mm, 140 mm), para entrar no módulo no
lugar da esferográfica, e uma ponta escalonada onde vai a borrachinha condutiva.

1. **Imprima antes o teste curto** (`Teste_Encaixe_Escalonado_Base_Descartavel.3mf`,
   ~46 mm) para conferir o encaixe da borracha e se as marcas de corte aguentam.
2. Depois a caneta inteira: `Caneta_BIC_140mm_Escalonada_P1S_Base_Descartavel.3mf`.
3. Perfil inicial: PLA, bico 0,4, camada 0,16 mm, 3 paredes, 10–15% de preenchimento,
   **em pé, sem girar** (o disco da base apoiado na mesa), sem suporte e sem raft,
   primeira camada a 20–30 mm/s, paredes a 40–60 mm/s (a peça é alta e fina e vibra).
4. O 3MF traz só a geometria: escolha P1S, filamento e bico manualmente no Bambu Studio.

Detalhes em `LEIA-ME_Impressao_Bambu_P1S.txt`, na mesma pasta.

**c) Gabarito do celular:** ainda não está no projeto. Requisitos: prender o Moto G06
(171,35 × 77,5 × 8,31 mm) só pelos cantos, deixar livres os botões laterais e o USB-C, e
ficar sempre no mesmo lugar da mesa. Anote a **espessura da base** do gabarito: ela entra na
conta do `z_floor`.

## 5. Montar a caneta touch

1. Espere a peça esfriar. Corte o pescoço da base descartável com alicate de corte,
   segurando a caneta perto do disco (não puxe pela ponta). Lixe a rebarba.
2. Meça o **diâmetro interno** da borrachinha condutiva.
3. A ponta tem degraus de 3,0 / 3,5 / 4,0 / 4,5 / 5,0 mm (da ponta para o corpo). Teste o
   encaixe antes de cortar. Escolhido o degrau, corte na canaleta **antes** dele, removendo
   os menores (ex.: para 4,5 mm, remova os de 3, 3,5 e 4). Lixe sem deformar o cilindro.
4. **Caminho elétrico (importante):** PLA não conduz. Uma ponta touch só funciona se a
   borracha estiver ligada a algo que faça o papel da mão. Passe um fio de cobre fino pelo
   canal central até a borracha, saindo pelo furo lateral, e ligue a outra ponta a uma massa:
   - para o primeiro teste, segure o fio com os dedos;
   - no uso fixo, ligue ao corpo metálico do celular/gabarito ou a uma placa de alumínio.
5. Encaixe a borracha no degrau, prendendo o fio entre os dois.

Esse projeto de caneta ainda **não foi testado fisicamente**. Confira o primeiro protótipo
com calma: encaixe, firmeza no módulo e se o celular sente o toque.

## 6. Preparar o celular

No Moto G06 (Android 15):

1. Ative as **Opções do desenvolvedor** (Configurações > Sobre o telefone > toque 7 vezes em
   "Número da versão").
2. Nas opções do desenvolvedor: ligue **Depuração USB**, **Depuração por Wi-Fi** e
   **Permanecer ativo** (tela não apaga no carregador). Desligue o bloqueio de tela ou
   aumente o tempo de tela.
3. Pareie uma vez com o Mac: em Depuração por Wi-Fi > "Parear dispositivo com código",
   depois `adb pair IP:PORTA_DE_PAREAMENTO` e digite o código.
4. Conecte e confira:

   ```bash
   python -m taprobot.device      # acha a porta nova via mDNS e mostra o UDID
   adb devices
   ```

   Se houver mais de um aparelho, ponha o UDID em `adb.serial` no `config.yaml`.

A porta da depuração Wi-Fi muda sempre que ela é religada ou a rede muda; o comando acima
redescobre sozinho.

## 7. Homing com a mesa vazia

1. Retire **o módulo da caneta** e **tudo de cima da placa** (gabarito, celular, papel).
   A placa PEI pode ficar.
2. Rode:

   ```bash
   python -m tools.test_connection --home --bed-empty
   ```

   A mesa e o cabeçote se movem; espere terminar (~90 s).
3. A partir daqui **não desligue nem reinicie a impressora**, e não use "desativar motores"
   na tela. Se isso acontecer, a posição se perde: volte a este passo (sem o módulo!).
4. Abaixe a mesa para ter espaço de trabalho: na tela da P1S, aba **Controle**, mova Z
   para baixo uns 40 mm (botões de 10 mm). Mover pela tela não perde o homing.

## 8. Encaixar o módulo e a caneta no cabeçote

1. Encaixe o módulo no cabeçote, conforme as instruções do MakerWorld. Não mexa no
   cabeçote com força a ponto de deslizá-lo nos trilhos (se escorregar, não tem problema em
   XY, mas evite).
2. Coloque a caneta touch no módulo e ajuste a altura:
   - a ponta da borracha precisa ficar **pelo menos ~5 mm abaixo do bico**, senão o bico
     encosta no celular antes da caneta;
   - a mola do módulo precisa ter **1–2 mm de curso livre** para cima;
   - nada encostando no bico ou no bloco aquecido (a impressora não aquece nesse uso, mas
     não deixe o fio passar perto do bico).
3. Aperte bem: se a caneta escorregar no módulo depois da calibração, tudo precisa ser
   refeito.
4. Se a caneta ficar deslocada do bico em XY, tudo bem (a calibração absorve), mas a área
   que ela alcança diminui: pode ser preciso ajustar `x_min/x_max/y_min/y_max`.

## 9. Medir quanto a ponta passa do bico

Esse valor (chame de **T**) é a base do `z_floor`. Lembre: na Bambu, **Z é a distância entre
o bico e a mesa**. Z menor = mesa mais alta. A ponta encosta na mesa quando Z ≈ T.

O jog precisa do celular conectado (ele lê a tela), mas nesta etapa o celular fica **fora da
mesa**, só ligado à rede.

1. Ponha uma folha de papel na mesa vazia.
2. Para esta medição, use temporariamente no `config.yaml`:

   ```yaml
   motion:
     z_floor: 3.0     # só para medir T com a mesa VAZIA; o bico nunca encosta acima disso
   ```

3. Rode o jog e leve a mesa para perto da ponta:

   ```bash
   python -m tools.calibrate jog
   ```

   ```text
   jog> z- 10        # de 40 para 30
   jog> z- 10        # 20
   jog> z- 5         # 15, olhe a distância entre ponta e papel a cada passo
   jog> z-           # passos de 1 mm até faltar ~1 mm
   jog> step 0.1
   jog> z-           # de 0,1 em 0,1 até a ponta tocar o papel (o papel não desliza mais)
   jog> pos          # anote o Z: este é o T
   jog> q
   ```

   Pare se a mola começar a comprimir ou algo parecer errado; o jog sobe a caneta ao sair.
   Referência: com a esferográfica do módulo, deu T ≈ 8 mm.

## 10. Montar o celular e definir o z_floor

1. Fixe o gabarito na mesa (marque a posição com fita) e encaixe o celular, tela acesa e
   desbloqueada, cabo USB (se usar) saindo para longe do caminho da caneta.
2. Calcule onde a ponta encosta na tela e tire uma folga:

   ```text
   Z de contato (estimado) = T + base do gabarito + 8,31 (espessura do G06)
   z_floor                 = Z de contato - 1,0
   ```

   Exemplo: T = 8,0, base = 3,0 → contato ≈ 19,3 → `z_floor: 18.3`.

3. Ponha esse valor no `config.yaml`. O código **bloqueia** qualquer movimento abaixo do
   `z_floor`: é ele que impede a mesa de esmagar o celular. Na dúvida, arredonde **para
   cima**. Se a calibração reclamar que chegou no `z_floor` sem toque, baixe 0,5 mm e tente
   de novo.

## 11. Calibrar

Checklist antes de rodar (o script mostra de novo):

- P1S com homing feito com a mesa vazia e ligada desde então;
- gabarito e celular firmes, tela acesa e desbloqueada;
- caneta firme, ponta abaixo do bico;
- `z_floor` conferido;
- mão perto do botão de energia da impressora.

```bash
python -m tools.calibrate run
```

O que acontece (≈ 3 min):

1. **Jog manual.** A caneta vai para Z=40 no centro da mesa. Com `x+ 5`, `y- 2`, `z- 10`
   etc., leve-a para **cima da tela, perto do centro** (±8 mm em X, ±15 mm em Y), deixando
   uns 3 mm entre a ponta e o vidro. Lembre que +Y aponta para o fundo da impressora.
   Digite `ok`.
2. **Z de contato.** O script desce de 0,1 em 0,1 mm até o celular sentir o toque (via
   `adb shell getevent`) e grava esse Z.
3. **Sondagem.** Dois toques deslocados de 10 mm descobrem orientação e escala (esperado
   ~10,25 px/mm no G06).
4. **Grade 3×3** sobre a tela inteira. Cada toque é lido no celular.
5. Ajusta a transformação, salva em `calibration.json` e mostra o **erro máximo**
   (bom: < 0,5 mm).

| Mensagem | O que fazer |
|---|---|
| "cheguei no z_floor sem detectar toque" | ponta fora da tela, sem caminho elétrico (passo 5.4) ou `z_floor` alto demais |
| "toque não detectado em X=... Y=..." | a grade saiu da tela: refaça começando mais perto do centro |
| "escala bem diferente do esperado" | caneta frouxa ou celular solto no gabarito |
| "erro alto" | celular mexendo no gabarito; firme e repita |
| "BLOQUEADO" no jog | movimento fora dos limites XY ou abaixo do `z_floor` (é a trava funcionando) |

## 12. Verificar e usar

```bash
python -m tools.calibrate verify    # 10 toques em pontos aleatórios, mede o erro real
```

Pior erro < 1 mm é bom para botões de 4 mm ou mais. Depois disso o robô está pronto para
os testes Appium ([testes-js.md](testes-js.md)) e o soak ([soak.md](soak.md)).

**Recalibre** se mudar a posição do gabarito, mexer na caneta ou no módulo, trocar a
borracha, ou mudar a resolução/escala de exibição do celular. **Refaça o homing** (passo 7,
sem o módulo) sempre que a impressora for desligada ou reiniciada.

### Fim da sessão

1. Os scripts sobem a caneta ao terminar; confira que ela está longe da tela.
2. Retire o celular e o gabarito.
3. Retire o módulo da caneta **antes** de qualquer novo homing ou impressão.
4. Para voltar a imprimir pela nuvem, desligue o Somente LAN.
