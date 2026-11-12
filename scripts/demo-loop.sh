#!/usr/bin/env bash
# Lançador da demo em loop (apresentação): o braço alterna Bouncing Balls (bolinha)
# e "hello world" até DEMO_MIN minutos ou até Ctrl+C. Tudo com o braço.
#
# Pré-requisitos (cada um no seu terminal):
#   1) Appium:  appium --allow-insecure=uiautomator2:adb_shell
#   2) Braço:   .venv/bin/python -m tools.server --config config.yaml --udid <UDID>
#
# Uso:
#   scripts/demo-loop.sh
#   DEMO_MIN=10 BOLINHA_S=20 scripts/demo-loop.sh
#   UDID=192.168.15.23:44317 scripts/demo-loop.sh
set -euo pipefail
cd "$(dirname "$0")/.."

UDID="${UDID:-192.168.15.23:44317}"
ROBOT_URL="${ROBOT_URL:-http://127.0.0.1:8765}"
APPIUM_URL="${APPIUM_URL:-http://127.0.0.1:4723}"
export DEMO_MIN="${DEMO_MIN:-30}"
export BOLINHA_S="${BOLINHA_S:-30}"

echo "Demo em loop — ${DEMO_MIN} min, bolinha ~${BOLINHA_S}s por ciclo. Ctrl+C para parar."

# Appium no ar?
if ! curl -fsS -m 3 "$APPIUM_URL/status" | grep -q '"ready":true'; then
  echo "ERRO: Appium não respondeu em $APPIUM_URL." >&2
  echo "  Suba num terminal: appium --allow-insecure=uiautomator2:adb_shell" >&2
  exit 1
fi

# Braço no ar e calibrado?
health="$(curl -fsS -m 3 "$ROBOT_URL/health" || true)"
if ! echo "$health" | grep -q '"ok": true'; then
  echo "ERRO: servidor do braço não respondeu em $ROBOT_URL." >&2
  echo "  Suba: .venv/bin/python -m tools.server --config config.yaml --udid $UDID" >&2
  exit 1
fi
if ! echo "$health" | grep -q '"calibrated": true'; then
  echo "ERRO: o braço está sem calibração. Rode: .venv/bin/python -m tools.calibrate run" >&2
  exit 1
fi

# Tela acesa (os toques do braço já reiniciam o timer; isto é reforço).
adb -s "$UDID" shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
adb -s "$UDID" shell settings put system screen_off_timeout 1800000 >/dev/null 2>&1 || true

UDID="$UDID" ROBO=true ROBOT_URL="$ROBOT_URL" exec npx wdio run wdio.conf.js --suite demo-loop
