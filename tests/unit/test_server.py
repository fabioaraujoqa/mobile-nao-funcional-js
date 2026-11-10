"""Testa o servidor HTTP em dry-run (sem impressora). Rode: python -m pytest tests -q"""
import json
import threading
import urllib.error
import urllib.request

import pytest

from tools.server import make_server
from taprobot import RobotTap
from tests.unit.test_logic import Recorder, make_cal, make_cfg


@pytest.fixture()
def api():
    cal, _, _ = make_cal()
    link = Recorder()
    robot = RobotTap(make_cfg(), link, cal, sleep=lambda s: None)
    server = make_server(robot, "127.0.0.1", 0)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def call(method, path, body=None):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(
            f"http://127.0.0.1:{port}{path}", data=data, method=method,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status, json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read())

    yield call, link
    server.shutdown()
    server.server_close()


def test_health(api):
    call, _ = api
    status, body = call("GET", "/health")
    assert status == 200 and body["calibrated"] and body["screen"]["width"] == 720
    assert body["simulated"] is False


def test_tap_sends_gcode(api):
    call, link = api
    status, body = call("POST", "/tap", {"x": 360, "y": 800})
    assert status == 200 and body["ok"]
    assert len(link.sent) == 1 and "G4 P60" in link.sent[0]


def test_swipe_and_long_press(api):
    call, link = api
    assert call("POST", "/swipe", {"x1": 360, "y1": 1200, "x2": 360, "y2": 500})[0] == 200
    assert call("POST", "/long_press", {"x": 360, "y": 800, "seconds": 1.0})[0] == 200
    assert "G4 P1000" in link.sent[-1]


def test_bad_requests(api):
    call, link = api
    assert call("POST", "/tap", {"x": 360})[0] == 400            # falta y
    assert call("POST", "/tap", {"x": "a", "y": 1})[0] == 400    # tipo errado
    status, body = call("POST", "/tap", {"x": 5000, "y": 10})    # fora da tela
    assert status == 400 and "fora da tela" in body["error"]
    assert call("POST", "/nada", {})[0] == 404
    assert call("GET", "/nada")[0] == 404
    assert link.sent == []  # nada foi enviado à impressora


@pytest.mark.parametrize("sente, esperado", [(True, 200), (False, 500)])
def test_servidor_exige_contato_fisico(sente, esperado):
    class Reader:
        contacts = []

        def wait_contact(self, before, timeout):
            assert before == 0 and timeout == 3.0
            return (360, 800) if sente else None

    cal, _, _ = make_cal()
    link = Recorder()
    robot = RobotTap(make_cfg(), link, cal, sleep=lambda s: None)
    server = make_server(robot, "127.0.0.1", 0, reader=Reader())
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = f"http://127.0.0.1:{server.server_address[1]}"
        with urllib.request.urlopen(base + "/health") as response:
            assert json.loads(response.read())["contact_verification"] is True
        request = urllib.request.Request(
            base + "/tap", data=b'{"x":360,"y":800}',
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                status = response.status
        except urllib.error.HTTPError as exc:
            status = exc.code
            assert "contato" in json.loads(exc.read())["error"]
        assert status == esperado
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def test_arraste_http_preserva_espera(api):
    call, link = api
    status, _ = call("POST", "/swipe", {
        "x1": 360, "y1": 1200, "x2": 360, "y2": 500,
        "duration_s": 0.8, "hold_s": 0.6,
    })
    assert status == 200
    assert "G4 P600" in link.sent[-1]
