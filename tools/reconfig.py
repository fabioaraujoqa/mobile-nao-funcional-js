#!/usr/bin/env python3
"""Reconfigura o acesso à P1S numa rede nova, com o mínimo de digitação.

Numa rede diferente a impressora ganha outro IP e outro access code. Este utilitário:
  1. varre a sub-rede local e acha a P1S pelo SERIAL no certificado TLS (não depende
     de IP nem de MAC — compara com printer.serial do config.yaml);
  2. atualiza o IP no config.yaml, preservando os comentários;
  3. pede o access code novo (leia na tela da impressora > Rede) e grava;
  4. testa a conexão MQTT (envia um G90 inofensivo);
  5. opcional (--phone): reconecta o celular por mDNS e mostra o UDID.

Exemplos:
  .venv/bin/python -m tools.reconfig                 # acha, pergunta o code, testa
  .venv/bin/python -m tools.reconfig --access-code 259ce937   # sem perguntar
  .venv/bin/python -m tools.reconfig --phone         # também reconecta o celular
  .venv/bin/python -m tools.reconfig --subnet 192.168.0  # força a sub-rede da varredura

Nada aqui move a impressora.
"""
from __future__ import annotations

import argparse
import re
import socket
import ssl
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from taprobot import load_config
from taprobot.config import ConfigError

MQTT_PORT = 8883


def local_subnet() -> str | None:
    """Prefixo /24 da interface ativa (ex.: '192.168.15')."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  # não envia nada; só descobre a rota de saída
        ip = s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()
    return ip.rsplit(".", 1)[0]


def port_open(ip: str, port: int = MQTT_PORT, timeout: float = 0.4) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        return s.connect_ex((ip, port)) == 0


def cert_cn(ip: str, port: int = MQTT_PORT, timeout: float = 2.0) -> str | None:
    """CN do certificado da impressora (o serial verdadeiro, começa com 01P)."""
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        with socket.create_connection((ip, port), timeout=timeout) as raw:
            with ctx.wrap_socket(raw, server_hostname=ip) as tls:
                der = tls.getpeercert(binary_form=True)
    except OSError:
        return None
    if not der:
        return None
    pem = ssl.DER_cert_to_PEM_cert(der)
    out = subprocess.run(
        ["openssl", "x509", "-noout", "-subject"],
        input=pem, capture_output=True, text=True,
    )
    m = re.search(r"CN\s*=\s*([^,/\n]+)", out.stdout)
    return m.group(1).strip() if m else None


def find_printer(serial: str, subnet: str) -> str | None:
    hosts = [f"{subnet}.{i}" for i in range(1, 255)]
    with ThreadPoolExecutor(max_workers=64) as pool:
        live = [ip for ip, ok in zip(hosts, pool.map(port_open, hosts)) if ok]
    print(f"  {len(live)} host(s) com a porta {MQTT_PORT} aberta: {', '.join(live) or '—'}")
    for ip in live:
        cn = cert_cn(ip)
        if cn:
            print(f"  {ip} -> serial {cn}")
            if cn == serial:
                return ip
    return None


def patch_config(path: Path, *, ip: str | None = None, access_code: str | None = None):
    text = path.read_text()

    def replace(field: str, value: str, body: str) -> str:
        pat = re.compile(rf'^(\s*{field}:\s*)"[^"]*"(.*)$', re.MULTILINE)
        if not pat.search(body):
            raise ConfigError(f"não achei a linha '{field}:' em {path.name}")
        return pat.sub(lambda m: f'{m.group(1)}"{value}"{m.group(2)}', body, count=1)

    if ip is not None:
        text = replace("ip", ip, text)
    if access_code is not None:
        text = replace("access_code", access_code, text)
    path.write_text(text)


def test_mqtt(cfg: dict) -> bool:
    from taprobot import BambuError, BambuLink

    p = cfg["printer"]
    link = BambuLink(p["ip"], p["serial"], p["access_code"])
    try:
        link.connect()
        res = link.send_gcode("G90")
        print(f"  conexão OK (G90 -> {res.get('result', res)})")
        return True
    except BambuError as exc:
        print(f"  FALHA: {exc}")
        return False
    finally:
        link.close()


def connect_phone(cfg: dict):
    from taprobot.device import resolve_udid

    serial = cfg["adb"].get("serial")
    try:
        udid = resolve_udid(adb=cfg["adb"]["path"]) if not serial else serial
        print(f"  celular: {udid}")
    except Exception as exc:  # noqa: BLE001
        print(f"  não consegui achar o celular por mDNS: {exc}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--access-code", help="novo access code (senão pergunta)")
    ap.add_argument("--subnet", help="prefixo /24 da varredura, ex.: 192.168.0 (senão detecta)")
    ap.add_argument("--ip", help="pula a varredura e usa este IP")
    ap.add_argument("--phone", action="store_true", help="também reconecta o celular por mDNS")
    args = ap.parse_args()

    path = Path(args.config)
    cfg = load_config(path, require_printer=False)
    serial = str(cfg["printer"].get("serial") or "")
    if not serial:
        sys.exit("printer.serial não está no config.yaml; preencha antes (é fixo da impressora).")

    ip = args.ip
    if not ip:
        subnet = args.subnet or local_subnet()
        if not subnet:
            sys.exit("não detectei a sub-rede; passe --subnet (ex.: 192.168.0).")
        print(f"Procurando a P1S (serial {serial}) na rede {subnet}.0/24 ...")
        ip = find_printer(serial, subnet)
        if not ip:
            sys.exit(
                "Impressora não encontrada. Confira: ligada, no Wi-Fi certo, "
                "'Somente modo LAN' ligado. Ou passe --ip manualmente."
            )
        print(f"P1S encontrada em {ip}")

    access_code = args.access_code
    if not access_code:
        access_code = input("Access code novo (tela da impressora > Rede): ").strip()
    if not access_code:
        sys.exit("sem access code, não dá para testar. Abortei (o IP não foi gravado).")

    patch_config(path, ip=ip, access_code=access_code)
    print(f"config.yaml atualizado: ip={ip}, access_code={access_code}")

    cfg = load_config(path)  # recarrega já validado
    print("Testando a conexão com a P1S ...")
    ok = test_mqtt(cfg)

    if args.phone:
        print("Procurando o celular ...")
        connect_phone(cfg)

    if not ok:
        sys.exit("A conexão falhou — confira o access code na tela da impressora e rode de novo.")
    print("Pronto. Já pode calibrar/rodar os testes.")


if __name__ == "__main__":
    main()
