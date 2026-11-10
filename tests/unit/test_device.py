"""Busca do celular (taprobot.device): USB, Wi-Fi já conectado e mDNS."""

import pytest

from taprobot import device



def test_parse_mdns_acha_o_serial_certo():
    text = (
        "List of discovered mdns services\n"
        "adb-OUTRO123-aaaa\t_adb-tls-connect._tcp\t192.168.15.30:5555\n"
        "adb-ZF525PMHVF-iQtco6\t_adb-tls-pairing._tcp\t0.0.0.0:38429\n"
        "adb-ZF525PMHVF-iQtco6\t_adb-tls-connect._tcp\t192.168.15.20:41983\n"
    )
    assert device.parse_mdns(text, "ZF525PMHVF") == "192.168.15.20:41983"
    assert device.parse_mdns(text, "NAOEXISTE") is None


def fake_adb(responses):
    """Substitui o _adb: responde pelo início dos argumentos e registra as chamadas."""
    calls = []

    def run(*args, adb="adb", timeout=15):
        calls.append(args)
        for prefix, out in responses.items():
            if args[: len(prefix)] == prefix:
                return out
        return ""
    return run, calls


def test_resolve_prefere_usb(monkeypatch):
    run, _ = fake_adb({("devices",): "List of devices attached\nZF525PMHVF\tdevice\n"})
    monkeypatch.setattr(device, "_adb", run)
    assert device.resolve_udid("ZF525PMHVF") == "ZF525PMHVF"


def test_resolve_reconhece_wifi_ja_conectado(monkeypatch):
    run, calls = fake_adb({
        ("devices",): "List of devices attached\nRQ8R709VAVR\tdevice\n192.168.15.20:41983\tdevice\n",
        ("-s", "192.168.15.20:41983", "shell"): "ZF525PMHVF\n",
    })
    monkeypatch.setattr(device, "_adb", run)
    assert device.resolve_udid("ZF525PMHVF") == "192.168.15.20:41983"
    assert not any(c[0] == "connect" for c in calls)


def test_resolve_conecta_pelo_mdns_e_limpa_offline(monkeypatch):
    run, calls = fake_adb({
        ("devices",): "List of devices attached\n192.168.15.24:40935\toffline\n",
        ("mdns",): "adb-ZF525PMHVF-x\t_adb-tls-connect._tcp\t192.168.15.20:41983\n",
        ("connect",): "connected to 192.168.15.20:41983\n",
    })
    monkeypatch.setattr(device, "_adb", run)
    assert device.resolve_udid("ZF525PMHVF") == "192.168.15.20:41983"
    assert ("disconnect", "192.168.15.24:40935") in calls


def test_resolve_sem_celular(monkeypatch):
    run, _ = fake_adb({("devices",): "List of devices attached\n"})
    monkeypatch.setattr(device, "_adb", run)
    monkeypatch.setattr(device.time, "sleep", lambda s: None)
    with pytest.raises(device.DeviceNotFound, match="Depuração por Wi-Fi"):
        device.resolve_udid("ZF525PMHVF")
