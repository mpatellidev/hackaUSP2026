from uuid import UUID

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modulos.urgencia import ErroApi, obter_ator, obter_repo, router, tratar_erro_api
from app.modulos.urgencia import service
from app.modulos.urgencia.models import Ator
from app.modulos.urgencia.repositorio import RepositorioMemoria

U = lambda n: UUID(f"a1000000-0000-4000-8000-{n:012d}")
A_CLI = UUID("c1000000-0000-4000-8000-000000000001")
B_CLI = UUID("c1000000-0000-4000-8000-000000000002")
PED3 = "b1000000-0000-4000-8000-000000000003"  # Bruno, clínica A
PED4 = "b1000000-0000-4000-8000-000000000004"  # Carla, clínica A
RELATO1 = "e2000000-0000-4000-8000-000000000001"  # Bruno, pendente
RELATO2 = "e2000000-0000-4000-8000-000000000002"  # Carla, avaliada

ANA = Ator(U(1), "paciente")
BRUNO = Ator(U(2), "paciente")
ATEND_A = Ator(U(11), "funcionario", "atendimento", A_CLI)
PROF_A = Ator(U(12), "funcionario", "profissional", A_CLI)
PROF_B = Ator(U(14), "funcionario", "profissional", B_CLI)


@pytest.fixture
def ctx():
    app = FastAPI()
    app.add_exception_handler(ErroApi, tratar_erro_api)
    app.include_router(router, prefix="/api/v1")
    repo = RepositorioMemoria.das_fixtures()
    atual = {"ator": None}
    app.dependency_overrides[obter_repo] = lambda: repo
    def _ator():
        if atual["ator"] is None:
            raise ErroApi(401, "nao_autenticado", "Entre.")
        return atual["ator"]
    app.dependency_overrides[obter_ator] = _ator
    c = TestClient(app)
    def como(a):
        atual["ator"] = a
        return c
    return como, repo


def test_sem_token_401(ctx):
    como, _ = ctx
    r = como(None).get("/api/v1/urgencias")
    assert r.status_code == 401 and r.json()["erro"]["codigo"] == "nao_autenticado"


def test_orientacao_estatica_com_samu(ctx):
    como, _ = ctx
    j = como(None).get("/api/v1/urgencias/orientacao").json()
    assert j["samu"] == "192" and "192" in j["texto"] and j["modo"] == "demo"


def test_paciente_relata_urgencia_aguardando_sem_prometer_contato(ctx):
    como, _ = ctx
    r = como(ANA).post("/api/v1/urgencias", json={"solicitacao_id": "b1000000-0000-4000-8000-000000000001"})
    assert r.status_code == 201
    j = r.json()
    assert j["estado"] == "aguardando_avaliacao" and j["rotulo"] == "Aguardando avaliação"
    assert j["avaliacao"] is None and j["modo"] == "demo"
    assert "não garante contato imediato" in j["aviso"] and "192" in j["aviso"]


def test_paciente_id_do_corpo_e_ignorado(ctx):
    como, _ = ctx
    j = como(ANA).post("/api/v1/urgencias", json={"paciente_id": str(U(2))}).json()
    assert j["paciente_id"] == str(U(1))


def test_nao_relata_sobre_pedido_de_outra_pessoa(ctx):
    como, _ = ctx
    assert como(ANA).post("/api/v1/urgencias", json={"solicitacao_id": PED3}).status_code == 404


def test_funcionario_nao_relata(ctx):
    como, _ = ctx
    assert como(PROF_A).post("/api/v1/urgencias", json={}).status_code == 403


def test_relato_repetido_pendente_nao_duplica(ctx):
    como, repo = ctx
    a = como(BRUNO).post("/api/v1/urgencias", json={"solicitacao_id": PED3}).json()
    assert a["id"] == RELATO1
    assert len(repo.listar_relatos()) == 2


def test_listagem_por_escopo(ctx):
    como, _ = ctx
    assert [i["id"] for i in como(BRUNO).get("/api/v1/urgencias").json()["itens"]] == [RELATO1]
    assert como(ANA).get("/api/v1/urgencias").json()["total"] == 0
    assert como(ATEND_A).get("/api/v1/urgencias").json()["total"] == 2
    assert como(PROF_B).get("/api/v1/urgencias").json()["total"] == 0
    f = como(PROF_A).get("/api/v1/urgencias?estado=aguardando_avaliacao").json()
    assert [i["id"] for i in f["itens"]] == [RELATO1]


@pytest.mark.parametrize("ator", [ANA, BRUNO, ATEND_A])
def test_sem_papel_profissional_nao_avalia(ctx, ator):
    como, repo = ctx
    r = como(ator).post(f"/api/v1/urgencias/{RELATO1}/avaliacao", json={"classificacao": "urgencia_confirmada"})
    assert r.status_code == 403
    assert repo.avaliacao_do_relato(UUID(RELATO1)) is None
    assert repo.obter_relato(UUID(RELATO1)).estado == "aguardando_avaliacao"


def test_profissional_de_outra_clinica_recebe_404(ctx):
    como, _ = ctx
    r = como(PROF_B).post(f"/api/v1/urgencias/{RELATO1}/avaliacao", json={"classificacao": "urgencia_confirmada"})
    assert r.status_code == 404


def test_profissional_avalia_com_autor_e_horario_do_servidor(ctx):
    como, repo = ctx
    r = como(PROF_A).post(f"/api/v1/urgencias/{RELATO1}/avaliacao", json={
        "classificacao": "urgencia_confirmada", "observacao_administrativa": "Priorizar contato.",
        "avaliador_usuario_id": str(U(14))})
    assert r.status_code == 201
    j = r.json()
    assert j["estado"] == "avaliada"
    assert j["avaliacao"]["avaliador_usuario_id"] == str(U(12))
    assert j["avaliacao"]["avaliado_em"].endswith("-03:00")
    assert service.urgencia_avaliada(repo, UUID(PED3))


def test_nao_avalia_duas_vezes(ctx):
    como, _ = ctx
    r = como(PROF_A).post(f"/api/v1/urgencias/{RELATO2}/avaliacao", json={"classificacao": "sem_urgencia"})
    assert r.status_code == 409 and r.json()["erro"]["codigo"] == "transicao_invalida"


def test_classificacao_invalida_422(ctx):
    como, _ = ctx
    r = como(PROF_A).post(f"/api/v1/urgencias/{RELATO1}/avaliacao", json={"classificacao": "grave"})
    assert r.status_code == 422


def test_interface_para_score_so_conta_urgencia_confirmada(ctx):
    como, repo = ctx
    # fixture: Carla (PED4) tem urgência confirmada; Bruno (PED3) só relatou.
    assert service.solicitacoes_com_urgencia_avaliada(repo) == {UUID(PED4)}
    assert not service.urgencia_avaliada(repo, UUID(PED3))  # relato não confirmado: sem efeito
    como(PROF_A).post(f"/api/v1/urgencias/{RELATO1}/avaliacao", json={"classificacao": "sem_urgencia"})
    assert not service.urgencia_avaliada(repo, UUID(PED3))  # sem_urgencia: neutro, sem punição
