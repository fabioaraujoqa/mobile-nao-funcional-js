"""Lê os toques reais do celular via `adb shell getevent`.

É o "sensor" da calibração: o robô toca, o celular informa em que pixel sentiu o
toque. Assim a calibração não depende de marcações visuais.
"""
from __future__ import annotations

import re
import statistics
import subprocess
import threading
import time

from .adb import AdbClient


def parse_getevent_lp(text: str):
    """Extrai de `getevent -lp` os dispositivos com posição absoluta.

    Touchscreens usam ABS_MT_POSITION_X/Y (multitoque, "mt": True). Canetas como a S Pen
    (`sec_e-pen`) usam só ABS_X/ABS_Y ("mt": False).
    """
    devices, cur = [], None
    for line in text.splitlines():
        m = re.match(r"add device \d+:\s+(\S+)", line)
        if m:
            cur = {"path": m.group(1), "name": "", "max_x": None, "max_y": None,
                   "st_x": None, "st_y": None}
            devices.append(cur)
            continue
        if cur is None:
            continue
        m = re.search(r'name:\s+"(.*)"', line)
        if m:
            cur["name"] = m.group(1)
        m = re.search(r"ABS_MT_POSITION_X\s*:.*?max (\d+)", line)
        if m:
            cur["max_x"] = int(m.group(1))
        m = re.search(r"ABS_MT_POSITION_Y\s*:.*?max (\d+)", line)
        if m:
            cur["max_y"] = int(m.group(1))
        m = re.search(r"\bABS_X\s*:.*?max (\d+)", line)
        if m:
            cur["st_x"] = int(m.group(1))
        m = re.search(r"\bABS_Y\s*:.*?max (\d+)", line)
        if m:
            cur["st_y"] = int(m.group(1))
    out = []
    for d in devices:
        st_x, st_y = d.pop("st_x"), d.pop("st_y")
        if d["max_x"] and d["max_y"]:
            out.append({**d, "mt": True})
        elif st_x and st_y:
            out.append({**d, "max_x": st_x, "max_y": st_y, "mt": False})
    return out


def find_touch_device(adb: AdbClient, name: str | None = None):
    """Dispositivo de toque. Sem `name`, o primeiro touchscreen multitoque; com `name`
    (config `adb.touch_device`, ex. "sec_e-pen" para a S Pen), o dispositivo com esse nome."""
    devices = parse_getevent_lp(adb.shell("getevent", "-lp"))
    if name:
        found = [d for d in devices if d["name"] == name]
        if not found:
            names = ", ".join(d["name"] for d in devices) or "nenhum"
            raise RuntimeError(f"dispositivo de toque {name!r} não encontrado (há: {names})")
        return found[0]
    devices = [d for d in devices if d["mt"]]
    if not devices:
        raise RuntimeError(
            "nenhum touchscreen encontrado em `adb shell getevent -lp` "
            "(o celular está conectado e com depuração USB autorizada?)"
        )
    return devices[0]


def get_wm_size(adb: AdbClient):
    """Tamanho físico da tela em px, ex.: (720, 1640)."""
    out = adb.shell("wm", "size")
    sizes = re.findall(r"(\d+)x(\d+)", out)
    if not sizes:
        raise RuntimeError(f"não consegui ler `wm size`: {out!r}")
    w, h = sizes[-1]  # "Override size" (se houver) vem por último
    return int(w), int(h)


_LINE = re.compile(r"(EV_\w+)\s+(\w+)\s+(\w+)")


class TouchReader:
    """Acompanha os toques do celular em segundo plano."""

    def __init__(self, adb: AdbClient, device: dict, screen_w: int, screen_h: int):
        self.adb = adb
        self.device = device
        # S Pen e similares mandam ABS_X/ABS_Y; touchscreens, ABS_MT_POSITION_X/Y
        self._kx, self._ky = (
            ("ABS_MT_POSITION_X", "ABS_MT_POSITION_Y") if device.get("mt", True) else ("ABS_X", "ABS_Y")
        )
        self.sx = (screen_w - 1) / device["max_x"]
        self.sy = (screen_h - 1) / device["max_y"]
        self.contacts: list[tuple[float, float]] = []  # toques concluídos (px)
        self.down_count = 0
        self.in_contact = False
        self._x = self._y = None
        self._samples: list[tuple[int, int]] = []
        self._proc = None
        self._thread = None

    def start(self):
        self._proc = subprocess.Popen(
            self.adb.base + ["shell", "getevent", "-l", self.device["path"]],
            # sem isso o `adb shell` herda o teclado do terminal e "come" o que for
            # digitado no jog da calibração
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            bufsize=1,
        )
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        time.sleep(0.5)

    def stop(self):
        if self._proc is not None:
            self._proc.terminate()
            self._proc = None

    def _loop(self):
        for line in self._proc.stdout:
            self.handle_line(line)

    def handle_line(self, line: str):
        m = _LINE.search(line)
        if not m:
            return
        ev, name, val = m.groups()
        if ev == "EV_ABS":
            if name == self._kx:
                self._x = int(val, 16)
            elif name == self._ky:
                self._y = int(val, 16)
            elif name == "ABS_MT_TRACKING_ID":
                self._up() if val.lower() == "ffffffff" else self._down()
        elif ev == "EV_KEY" and name == "BTN_TOUCH":
            self._down() if val == "DOWN" else self._up()
        elif ev == "EV_SYN" and name == "SYN_REPORT":
            if self.in_contact and self._x is not None and self._y is not None:
                self._samples.append((self._x, self._y))

    def _down(self):
        if not self.in_contact:
            self.in_contact = True
            self.down_count += 1
            self._samples = []

    def _up(self):
        if self.in_contact:
            self.in_contact = False
            if self._samples:
                rx = statistics.median(s[0] for s in self._samples)
                ry = statistics.median(s[1] for s in self._samples)
                self.contacts.append((rx * self.sx, ry * self.sy))
            elif self._x is not None and self._y is not None:
                # O kernel não reenvia X/Y iguais aos do toque anterior: o toque no mesmo
                # ponto chega sem coordenada e vale a última posição conhecida.
                self.contacts.append((self._x * self.sx, self._y * self.sy))

    def wait_contact(self, count_before: int, timeout: float = 4.0):
        """Espera um novo toque CONCLUÍDO e devolve (x_px, y_px)."""
        t0 = time.monotonic()
        while time.monotonic() - t0 < timeout:
            if len(self.contacts) > count_before:
                return self.contacts[-1]
            time.sleep(0.02)
        return None
