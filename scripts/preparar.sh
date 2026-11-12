#!/usr/bin/env bash
# Preparo guiado da P1S + braço para a rede atual (apresentação).
# Conduz, na ordem certa, tudo o que a troca de rede exige:
#   1) conectar (IP + access code + celular, automático)
#   2) conferir Modo Desenvolvedor (a P1S precisa aceitar G-code)
#   3) homing (G28) com a mesa vazia (depois de religar)
#   4) posicionar o celular
#   5) testar o toque do braço
# Uso:  npm run preparar     (ou: scripts/preparar.sh)
set -uo pipefail
cd "$(dirname "$0")/.."

PY="${PYTHON:-.venv/bin/python}"
UDID="${UDID:-192.168.15.23:44317}"
ROBOT_URL="${ROBOT_URL:-http://127.0.0.1:8765}"

# Testa se a P1S aceita G-code (G90 = success). Sai 0 = ok, 1 = recusado.
gcode_ok() {
  "$PY" - <<'PYEOF'
import sys
from taprobot import BambuLink, load_config
c = load_config("config.yaml"); p = c["printer"]
l = BambuLink(p["ip"], p["serial"], p["access_code"])
try:
    l.connect(); r = l.send_gcode("G90")
finally:
    l.close()
sys.exit(0 if r.get("result") == "success" else 1)
PYEOF
}

echo "=============================================="
echo " Preparo da P1S + braço — rede atual"
echo "=============================================="

# --- 1) Conectar -------------------------------------------------------------
echo
echo "[1/5] Procurando a impressora e o celular na rede..."
if ! "$PY" -m tools.reconfig --phone; then
  echo
  echo "Não consegui conectar. Na tela da P1S (Configurações > Rede), confira:"
  echo "  - 'Somente modo LAN': LIGADO"
  echo "  - Impressora e Mac na MESMA rede, impressora ligada"
  echo "Depois rode de novo: npm run preparar"
  exit 1
fi

# --- 2) Modo Desenvolvedor (aceita G-code?) ----------------------------------
echo
echo "[2/5] Conferindo se a impressora aceita G-code (Modo Desenvolvedor)..."
if ! gcode_ok; then
  echo
  echo "A impressora CONECTOU mas RECUSA G-code (o braço não se move)."
  echo ">> Na tela da P1S: Configurações > Rede > ative o MODO DESENVOLVEDOR."
  echo "   Ele some quando o 'Somente LAN' é religado, e o access code pode mudar."
  read -r -p "Ligou o Modo Desenvolvedor? Enter para testar de novo... " _
  echo "Reconectando (caso o access code tenha mudado)..."
  "$PY" -m tools.reconfig || { echo "Falhou. Rode npm run preparar de novo."; exit 1; }
  if ! gcode_ok; then
    echo "Ainda recusando G-code. Confira o Modo Desenvolvedor e rode de novo."
    exit 1
  fi
fi
echo "OK: a impressora aceita G-code."

# --- 3) Homing (mesa vazia) --------------------------------------------------
echo
echo "[3/5] Referenciar (G28) — necessário depois de religar a impressora."
echo "      O G28 move a mesa e o cabeçote, então a MESA precisa estar VAZIA."
read -r -p "A mesa está VAZIA (sem gabarito/celular)? digite 'sim' para referenciar: " resp
if [ "$resp" = "sim" ]; then
  "$PY" -m tools.test_connection --config config.yaml --home --bed-empty || {
    echo "Falha no homing. Confira a impressora e rode de novo."; exit 1; }
  echo "Baixando a mesa para você encaixar o celular..."
  "$PY" - <<'PYEOF'
from taprobot import BambuLink, load_config
c = load_config("config.yaml"); p = c["printer"]
l = BambuLink(p["ip"], p["serial"], p["access_code"]); l.connect()
l.send_gcode("G90"); l.send_gcode("G1 Z60 F1200"); l.close()
PYEOF
  echo "Homing feito e mesa baixada."
else
  echo "Pulando o homing. ATENÇÃO: sem referenciar depois de religar, o braço"
  echo "se move na altura errada e o toque não registra."
fi

# --- 4) Posicionar o celular -------------------------------------------------
echo
echo "[4/5] Encaixe o CELULAR na posição marcada (fita), bem firme, tela acesa."
read -r -p "Celular na posição? Enter para testar o toque do braço... " _

# --- 5) Testar o toque -------------------------------------------------------
echo
echo "[5/5] Testando o toque do braço no centro da tela..."
adb -s "$UDID" shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
adb -s "$UDID" shell svc power stayon true >/dev/null 2>&1 || true

if ! curl -fsS -m 2 "$ROBOT_URL/health" >/dev/null 2>&1; then
  echo "Subindo o servidor do braço..."
  nohup "$PY" -m tools.server --config config.yaml --udid "$UDID" >/tmp/taprobot-server.log 2>&1 &
  disown || true
  for _ in $(seq 1 10); do
    curl -fsS -m 2 "$ROBOT_URL/health" >/dev/null 2>&1 && break
    sleep 1
  done
fi

res="$(curl -s -m 30 -X POST "$ROBOT_URL/tap" -H "Content-Type: application/json" -d '{"x":360,"y":820}')"
echo "  resposta: $res"
echo
if echo "$res" | grep -q '"ok": true'; then
  echo "=============================================="
  echo " ✅ TUDO PRONTO. O servidor do braço está no ar."
  echo "    Agora, num outro terminal, suba o Appium:"
  echo "      appium --allow-insecure=uiautomator2:adb_shell"
  echo "    E rode a demo:"
  echo "      npm run demo"
  echo "=============================================="
else
  echo "⚠️  Sem contato. O celular pode estar fora da posição/altura."
  echo "   Reposicione na marca da fita e rode npm run preparar de novo,"
  echo "   ou recalibre: $PY -m tools.calibrate run"
fi
