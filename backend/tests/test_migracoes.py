"""Migrações em banco COM dados (o caso real de quem já rodou o app): nada pode recriar tabela referenciada nem perder linhas."""
import json
import os
import sqlite3
import subprocess
import sys

from app.core.config import FIXTURES_DIR

TABELAS = [("clinicas", "clinicas"), ("usuarios", "usuarios"), ("vinculos_clinica", "vinculos"),
           ("solicitacoes", "solicitacoes"), ("vagas", "vagas"), ("interesses_vaga", "interesses"),
           ("agendamentos", "agendamentos")]


def _alembic(url: str, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, "-m", "alembic", *args], capture_output=True, text=True,
                          env={**os.environ, "DATABASE_URL": url})


def _carregar_fixtures_no_esquema_antigo(caminho: str) -> dict[str, int]:
    con = sqlite3.connect(caminho)
    contagem = {}
    for tabela, arquivo in TABELAS:
        colunas = {r[1] for r in con.execute(f"PRAGMA table_info({tabela})")}
        itens = json.loads((FIXTURES_DIR / f"{arquivo}.json").read_text(encoding="utf-8"))["itens"]
        for item in itens:
            linha = {k: (json.dumps(v) if isinstance(v, (list, dict)) else v) for k, v in item.items() if k in colunas}
            if "criado_em" in colunas:  # colunas NOT NULL que as fixtures não trazem
                linha.setdefault("criado_em", "2026-11-01T00:00:00+00:00")
            con.execute(f"INSERT INTO {tabela} ({', '.join(linha)}) VALUES ({', '.join('?' * len(linha))})", list(linha.values()))
        contagem[tabela] = len(itens)
    con.commit()
    con.close()
    return contagem


def test_upgrade_com_dados_preserva_linhas_e_integridade(tmp_path):
    caminho = tmp_path / "antigo.db"
    url = f"sqlite:///{caminho}"
    assert _alembic(url, "upgrade", "0007").returncode == 0
    antes = _carregar_fixtures_no_esquema_antigo(str(caminho))

    r = _alembic(url, "upgrade", "head")
    assert r.returncode == 0, r.stderr[-1500:]

    con = sqlite3.connect(caminho)
    for tabela, n in antes.items():
        assert con.execute(f"SELECT count(*) FROM {tabela}").fetchone()[0] == n, tabela
    assert con.execute("PRAGMA foreign_key_check").fetchall() == []
    assert "profissional_id" in {r[1] for r in con.execute("PRAGMA table_info(vagas)")}
    assert "senha_hash" in {r[1] for r in con.execute("PRAGMA table_info(usuarios)")}
    con.close()


def test_banco_limpo_chega_a_uma_unica_head_sem_diferenca_com_os_modelos(tmp_path):
    url = f"sqlite:///{tmp_path / 'limpo.db'}"
    assert _alembic(url, "upgrade", "head").returncode == 0
    assert len(_alembic(url, "heads").stdout.strip().splitlines()) == 1
    check = _alembic(url, "check")
    assert check.returncode == 0, check.stdout + check.stderr
