#!/usr/bin/env python3
"""Luz e câmera da P1S pela rede local (Modo LAN).

  python -m tools.camera --light on                       # liga a luz da câmara
  python -m tools.camera --snapshot foto.jpg              # uma foto
  python -m tools.camera --record video.mp4 --seconds 180 # grava (precisa do ffmpeg)
  python -m tools.camera --light on --record v.mp4 --seconds 60 --light-after off

A câmera da P1S é lida por TLS na porta 6000 (certificado autoassinado): um pacote de
autenticação com o usuário `bblp` e o access code, e depois um fluxo de quadros JPEG, cada
um com um cabeçalho de 16 bytes cujo início é o tamanho do quadro. A taxa de quadros da P1S
é baixa (poucos quadros por segundo); o vídeo é montado com a taxa média medida.
"""
import argparse
import shutil
import socket
import ssl
import struct
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from taprobot import BambuLink, load_config

CAMERA_PORT = 6000


def _auth_packet(access_code: str) -> bytes:
    head = struct.pack("<IIII", 0x40, 0x3000, 0, 0)
    return head + b"bblp".ljust(32, b"\0") + access_code.encode().ljust(32, b"\0")


def _recv_exact(sock, n: int) -> bytes:
    buf = bytearray()
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("a câmera fechou a conexão")
        buf += chunk
    return bytes(buf)


def frames(ip: str, access_code: str, timeout: float = 10.0):
    """Gera quadros JPEG (bytes) da câmera da P1S até o chamador parar."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # certificado autoassinado da impressora (rede local)
    with socket.create_connection((ip, CAMERA_PORT), timeout=timeout) as raw:
        with ctx.wrap_socket(raw, server_hostname=ip) as sock:
            sock.sendall(_auth_packet(access_code))
            while True:
                header = _recv_exact(sock, 16)
                size = struct.unpack_from("<I", header, 0)[0]
                if not 0 < size < 10_000_000:
                    raise ConnectionError(f"cabeçalho de quadro inválido (tamanho {size})")
                data = _recv_exact(sock, size)
                if data[:2] != b"\xff\xd8" or data[-2:] != b"\xff\xd9":
                    continue  # quadro que não é JPEG completo
                yield data


def record(ip, access_code, out: Path, seconds: float):
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        sys.exit("ffmpeg não encontrado (brew install ffmpeg)")
    with tempfile.TemporaryDirectory() as tmp:
        n, t0 = 0, time.monotonic()
        for jpg in frames(ip, access_code):
            (Path(tmp) / f"{n:06d}.jpg").write_bytes(jpg)
            n += 1
            if time.monotonic() - t0 >= seconds:
                break
        elapsed = time.monotonic() - t0
        fps = max(n / elapsed, 0.5) if elapsed > 0 else 1.0
        print(f"{n} quadros em {elapsed:.0f} s ({fps:.1f} quadros/s). Montando o vídeo...")
        subprocess.run(
            [ffmpeg, "-y", "-loglevel", "error", "-framerate", f"{fps:.3f}", "-i", f"{tmp}/%06d.jpg",
             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", str(out)],
            check=True,
        )
    print(f"Vídeo salvo em {out}")


def set_light(cfg, on: bool):
    p = cfg["printer"]
    link = BambuLink(p["ip"], p["serial"], p["access_code"])
    link.connect()
    try:
        link.set_light(on)
    finally:
        link.close()
    print("Luz", "ligada" if on else "desligada")


def main():
    ap = argparse.ArgumentParser(description="Luz e câmera da P1S")
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--light", choices=["on", "off"], help="liga/desliga a luz antes de tudo")
    ap.add_argument("--snapshot", type=Path, help="salva uma foto (JPEG)")
    ap.add_argument("--record", type=Path, help="grava um vídeo (MP4)")
    ap.add_argument("--seconds", type=float, default=60.0, help="duração da gravação")
    ap.add_argument("--light-after", choices=["on", "off"], help="estado da luz ao terminar")
    args = ap.parse_args()

    cfg = load_config(args.config)
    p = cfg["printer"]
    if args.light:
        set_light(cfg, args.light == "on")
    try:
        if args.snapshot:
            args.snapshot.write_bytes(next(frames(p["ip"], p["access_code"])))
            print(f"Foto salva em {args.snapshot}")
        if args.record:
            record(p["ip"], p["access_code"], args.record, args.seconds)
    finally:
        if args.light_after:
            set_light(cfg, args.light_after == "on")


if __name__ == "__main__":
    main()
