from app.core.config import SENHA_DEMO_PADRAO, get_settings
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
    monkeypatch.setattr(get_settings(), "demo_senha", SENHA_DEMO_PADRAO)  # o .env local pode ter outra senha
    r = client.post("/api/v1/auth/demo/login", json={"conta": ANA})
    assert r.status_code == 404
    # fora do modo demo, a senha pública do repositório não vale (login fecha até definir DEMO_SENHA)
    r = client.post("/api/v1/auth/login", json={"conta": ANA, "senha": SENHA_DEMO_PADRAO})
    assert r.status_code == 503 and r.json()["erro"]["codigo"] == "servico_indisponivel"


def test_fora_do_modo_demo_com_senha_propria_o_login_funciona(client, db, monkeypatch):
    from app.seed import run as seed
    monkeypatch.setattr(get_settings(), "demo_mode", False)
    monkeypatch.setattr(get_settings(), "demo_senha", "senha-do-ambiente-7")
    seed(db)
    assert client.post("/api/v1/auth/login", json={"conta": ANA, "senha": "senha-do-ambiente-7"}).status_code == 200


def test_contas_publicas_mostram_senha_so_em_modo_demo(client, monkeypatch):
    corpo = client.get("/api/v1/auth/contas").json()
    assert corpo["senha_demo"] == get_settings().demo_senha and corpo["login_sem_senha"] is True
    contas = {i["conta"]: i for i in corpo["itens"]}
    assert contas[ATEND_A]["funcao"] == "atendimento" and contas[ATEND_A]["clinica_nome"]
    assert contas[ANA]["papel"] == "paciente"
    monkeypatch.setattr(get_settings(), "demo_mode", False)
    assert client.get("/api/v1/auth/contas").json()["senha_demo"] is None


def test_trocar_a_senha_de_demo_e_rodar_o_seed_atualiza_as_contas(client, db, monkeypatch):
    from app.seed import run as seed
    monkeypatch.setattr(get_settings(), "demo_senha", "outra-senha-9")
    seed(db)
    assert client.post("/api/v1/auth/login", json={"conta": ANA, "senha": "outra-senha-9"}).status_code == 200
    assert client.post("/api/v1/auth/login", json={"conta": ANA, "senha": "demo1234"}).status_code == 401
