"""Urgência (#14) pela API real montada: auth do core, dados no banco."""
import pytest
from sqlalchemy import func, select

from app.modulos.urgencia import service
from app.modulos.urgencia.models import AvaliacaoUrgencia, RelatoUrgencia
from app.modulos.urgencia.repositorio import RepositorioUrgencia

API = "/api/v1/urgencias"
ID_ANA, ID_BRUNO = "a1000000-0000-4000-8000-000000000001", "a1000000-0000-4000-8000-000000000002"
ID_PROF_A = "a1000000-0000-4000-8000-000000000012"
PED1 = "b1000000-0000-4000-8000-000000000001"  # Ana
PED3 = "b1000000-0000-4000-8000-000000000003"  # Bruno, clínica A
PED4 = "b1000000-0000-4000-8000-000000000004"  # Carla, clínica A
RELATO1 = "e2000000-0000-4000-8000-000000000001"  # Bruno, pendente
RELATO2 = "e2000000-0000-4000-8000-000000000002"  # Carla, avaliada

ANA, BRUNO = "paciente.ana", "paciente.bruno"
ATEND_A, PROF_A, PROF_B = "funcionario.atendimento.a", "funcionario.profissional.a", "funcionario.profissional.b"


def test_sem_token_401(client):
    r = client.get(API)
    assert r.status_code == 401 and r.json()["erro"]["codigo"] == "nao_autenticado"


def test_orientacao_estatica_com_samu(client):
    j = client.get(f"{API}/orientacao").json()
    assert j["samu"] == "192" and "192" in j["texto"] and j["modo"] == "demo"


def test_paciente_relata_urgencia_aguardando_sem_prometer_contato(client, login):
    r = client.post(API, headers=login(ANA), json={"solicitacao_id": PED1})
    assert r.status_code == 201
    j = r.json()
    assert j["estado"] == "aguardando_avaliacao" and j["rotulo"] == "Aguardando avaliação"
    assert j["avaliacao"] is None and j["modo"] == "demo" and j["criado_em"].endswith("-03:00")
    assert "não garante contato imediato" in j["aviso"] and "192" in j["aviso"]


def test_paciente_id_do_corpo_e_ignorado(client, login):
    j = client.post(API, headers=login(ANA), json={"paciente_id": ID_BRUNO}).json()
    assert j["paciente_id"] == ID_ANA


def test_nao_relata_sobre_pedido_de_outra_pessoa(client, login):
    assert client.post(API, headers=login(ANA), json={"solicitacao_id": PED3}).status_code == 404


def test_funcionario_nao_relata(client, login):
    assert client.post(API, headers=login(PROF_A), json={}).status_code == 403


def test_relato_repetido_pendente_nao_duplica(client, login, db):
    a = client.post(API, headers=login(BRUNO), json={"solicitacao_id": PED3}).json()
    assert a["id"] == RELATO1
    assert db.scalar(select(func.count()).select_from(RelatoUrgencia)) == 2


def test_listagem_por_escopo(client, login):
    assert [i["id"] for i in client.get(API, headers=login(BRUNO)).json()["itens"]] == [RELATO1]
    assert client.get(API, headers=login(ANA)).json()["total"] == 0
    assert client.get(API, headers=login(ATEND_A)).json()["total"] == 2
    assert client.get(API, headers=login(PROF_B)).json()["total"] == 0
    f = client.get(f"{API}?estado=aguardando_avaliacao", headers=login(PROF_A)).json()
    assert [i["id"] for i in f["itens"]] == [RELATO1]


@pytest.mark.parametrize("conta", [ANA, BRUNO, ATEND_A])
def test_sem_papel_profissional_nao_avalia(client, login, db, conta):
    r = client.post(f"{API}/{RELATO1}/avaliacao", headers=login(conta), json={"classificacao": "urgencia_confirmada"})
    assert r.status_code == 403
    assert RepositorioUrgencia(db).avaliacao_do_relato(RELATO1) is None
    assert db.get(RelatoUrgencia, RELATO1).estado == "aguardando_avaliacao"


def test_profissional_de_outra_clinica_recebe_404(client, login):
    r = client.post(f"{API}/{RELATO1}/avaliacao", headers=login(PROF_B), json={"classificacao": "urgencia_confirmada"})
    assert r.status_code == 404


def test_profissional_avalia_com_autor_e_horario_do_servidor(client, login, db):
    r = client.post(f"{API}/{RELATO1}/avaliacao", headers=login(PROF_A), json={
        "classificacao": "urgencia_confirmada", "observacao_administrativa": "Priorizar contato.",
        "avaliador_usuario_id": "a1000000-0000-4000-8000-000000000014"})
    assert r.status_code == 201
    j = r.json()
    assert j["estado"] == "avaliada"
    assert j["avaliacao"]["avaliador_usuario_id"] == ID_PROF_A
    assert j["avaliacao"]["avaliado_em"].endswith("-03:00")
    assert service.urgencia_avaliada(RepositorioUrgencia(db), PED3)


def test_nao_avalia_duas_vezes(client, login):
    r = client.post(f"{API}/{RELATO2}/avaliacao", headers=login(PROF_A), json={"classificacao": "sem_urgencia"})
    assert r.status_code == 409 and r.json()["erro"]["codigo"] == "transicao_invalida"


def test_classificacao_invalida_422(client, login):
    r = client.post(f"{API}/{RELATO1}/avaliacao", headers=login(PROF_A), json={"classificacao": "grave"})
    assert r.status_code == 422 and r.json()["erro"]["codigo"] == "validacao"


def test_interface_para_score_so_conta_urgencia_confirmada(client, login, db):
    repo = RepositorioUrgencia(db)
    # fixture: Carla (PED4) tem urgência confirmada; Bruno (PED3) só relatou.
    assert service.solicitacoes_com_urgencia_avaliada(repo) == {PED4}
    assert service.status_urgencia(repo, PED3) == "autodeclarada"   # só sinaliza, não reordena
    assert service.status_urgencia(repo, PED4) == "avaliada"
    client.post(f"{API}/{RELATO1}/avaliacao", headers=login(PROF_A), json={"classificacao": "sem_urgencia"})
    db.expire_all()
    assert not service.urgencia_avaliada(repo, PED3)   # sem_urgencia: neutro, sem punição
    assert service.status_urgencia(repo, PED3) == "nenhuma"


def test_urgencia_persiste_em_nova_sessao(client, login, engine):
    from sqlalchemy.orm import sessionmaker
    client.post(f"{API}/{RELATO1}/avaliacao", headers=login(PROF_A), json={"classificacao": "urgencia_confirmada"})
    with sessionmaker(bind=engine)() as outra:
        assert outra.scalar(select(func.count()).select_from(AvaliacaoUrgencia)) == 2
