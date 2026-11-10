"""Os gráficos da palestra saem dos CSVs e pulam o que não foi medido."""
import csv

import pytest

graficos = pytest.importorskip("tools.graficos")


def _csv(caminho, linhas):
    with caminho.open("w", newline="", encoding="utf-8") as f:
        escritor = csv.DictWriter(f, fieldnames=list(linhas[0]))
        escritor.writeheader()
        escritor.writerows(linhas)


def test_gera_png_so_do_que_tem_csv(tmp_path):
    _csv(tmp_path / "soak_2026-01-01.csv", [
        {"horas": 0.0, "pss_mb": 100, "evento": ""},
        {"horas": 0.5, "pss_mb": "", "evento": "crash"},
        {"horas": 1.0, "pss_mb": 110, "evento": ""},
    ])
    gerados = graficos.gerar(tmp_path, tmp_path / "png")
    assert [g.name for g in gerados] == ["memoria.png"]
    assert gerados[0].stat().st_size > 0


def test_usa_o_csv_mais_recente(tmp_path):
    (tmp_path / "soak_2026-01-01_10-00-00.csv").write_text("x\n")
    (tmp_path / "soak_2026-01-02_10-00-00.csv").write_text("x\n")
    assert graficos._mais_recente(tmp_path, "soak").name == "soak_2026-01-02_10-00-00.csv"


def test_latencia_e_bateria(tmp_path):
    _csv(tmp_path / "latencia_a.csv", [{"latencia_ms": v} for v in (50, 60, 70)])
    _csv(tmp_path / "bateria_a.csv", [{"horas": h, "bateria_pct": 90 - h} for h in (0, 1, 2)])
    nomes = {g.name for g in graficos.gerar(tmp_path, tmp_path / "png")}
    assert nomes == {"latencia_p95.png", "bateria.png"}
