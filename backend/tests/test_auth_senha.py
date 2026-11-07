from app.core.config import get_settings
from tests.conftest import ANA, ATEND_A


def test_login_com_senha_de_demo(client):
    r = client.post("/api/v1/auth/login", json={"conta": ANA, "senha": get_settings().demo_senha})
    corpo = r.json()
    assert r.status_code == 200 and corpo["modo"] == "demo" and corpo["token"]
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {corpo['token']}"}).status_code == 200


def test_senha_errada_ou_ausente(client):
    r = client.post("/api/v1/auth/login", json={"conta": ANA, "senha": "errada"})
    assert r.status_code == 401 and r.json()["erro"]["codigo"] == "nao_autenticado"
    assert client.post("/api/v1/auth/login", json={"conta": ANA}).status_code == 422


def test_login_sem_senha_so_com_demo_mode(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", False)
    r = client.post("/api/v1/auth/demo/login", json={"conta": ANA})
    assert r.status_code == 404
    assert client.post("/api/v1/auth/login", json={"conta": ANA, "senha": get_settings().demo_senha}).status_code == 200


def test_contas_publicas_mostram_senha_so_em_modo_demo(client, monkeypatch):
    corpo = client.get("/api/v1/auth/contas").json()
    assert corpo["senha_demo"] == get_settings().demo_senha and corpo["login_sem_senha"] is True
    contas = {i["conta"]: i for i in corpo["itens"]}
    assert contas[ATEND_A]["funcao"] == "atendimento" and contas[ATEND_A]["clinica_nome"]
    assert contas[ANA]["papel"] == "paciente"
    monkeypatch.setattr(get_settings(), "demo_mode", False)
    assert client.get("/api/v1/auth/contas").json()["senha_demo"] is None
