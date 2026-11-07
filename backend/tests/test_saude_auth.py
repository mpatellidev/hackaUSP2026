from datetime import timedelta

from sqlalchemy import update

from app.core.time import utc_now
from app.models.usuarios import SessaoDemo
from tests.conftest import ANA, ATEND_A, CLINICA_A


def test_saude_e_docs(client):
    assert client.get("/saude").json()["status"] == "ok"
    assert client.get("/api/v1/saude").status_code == 200
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 200


def test_login_demo_rotulado_como_demo(client):
    r = client.post("/api/v1/auth/demo/login", json={"conta": ANA})
    corpo = r.json()
    assert r.status_code == 200 and corpo["modo"] == "demo" and corpo["token"]
    assert corpo["expira_em"].endswith("-03:00")


def test_conta_inexistente_401_com_formato_de_erro(client):
    r = client.post("/api/v1/auth/demo/login", json={"conta": "ninguem"})
    assert r.status_code == 401 and r.json()["erro"]["codigo"] == "nao_autenticado"


def test_corpo_invalido_422_validacao(client):
    r = client.post("/api/v1/auth/demo/login", json={})
    assert r.status_code == 422 and r.json()["erro"]["codigo"] == "validacao"


def test_token_ausente_ou_invalido_401(client):
    assert client.get("/api/v1/auth/me").status_code == 401
    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer lixo"})
    assert r.status_code == 401 and r.json()["erro"]["codigo"] == "nao_autenticado"


def test_token_expirado_401(client, login, db):
    h = login(ANA)
    db.execute(update(SessaoDemo).values(expira_em=utc_now() - timedelta(minutes=1)))
    db.commit()
    assert client.get("/api/v1/auth/me", headers=h).status_code == 401


def test_logout_invalida_token(client, login):
    h = login(ANA)
    assert client.post("/api/v1/auth/logout", headers=h).status_code == 204
    assert client.get("/api/v1/auth/me", headers=h).status_code == 401


def test_me_papel_e_clinica_vem_do_servidor_nao_do_cliente(client, login):
    h = login(ATEND_A)
    me = client.get("/api/v1/auth/me", headers={**h, "X-Papel": "paciente", "X-Clinica-Id": "outra"},
                    params={"papel": "paciente", "clinica_id": "outra"}).json()["usuario"]
    assert me["papel"] == "funcionario" and me["clinica_id"] == CLINICA_A and me["funcao"] == "atendimento"


def test_paciente_sem_clinica(client, login):
    me = client.get("/api/v1/auth/me", headers=login(ANA)).json()["usuario"]
    assert me["papel"] == "paciente" and "clinica_id" not in me
