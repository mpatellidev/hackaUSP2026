from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.models.vagas import Agendamento
from app.modulos.prioridade import router as prioridade_router
from app.modulos.prioridade.models import RegistroFalta, RevisaoFalta
from tests.conftest import ANA, ATEND_A, ATEND_B, CLINICA_A, CLINICA_B

PROF_A, PROF_B = "funcionario.profissional.a", "funcionario.profissional.b"
PEDIDO_CARLA = "b1000000-0000-4000-8000-000000000004"   # urgência avaliada, 1 falta confirmada
PEDIDO_BRUNO = "b1000000-0000-4000-8000-000000000003"   # urgência autodeclarada
PEDIDO_FABIO = "b1000000-0000-4000-8000-000000000007"
PEDIDO_ANA_B = "b1000000-0000-4000-8000-000000000002"
FILA = "/api/v1/clinicas/{}/fila"


def test_fila_urgencia_avaliada_primeiro_e_autodeclarada_so_sinaliza(client, login):
    r = client.get(FILA.format(CLINICA_A), headers=login(ATEND_A))
    assert r.status_code == 200
    corpo = r.json()
    ids = [i["solicitacao_id"] for i in corpo["itens"]]
    assert ids[0] == PEDIDO_CARLA and corpo["itens"][0]["urgencia_avaliada"] is True
    assert set(ids) == {PEDIDO_CARLA, PEDIDO_BRUNO, PEDIDO_FABIO}      # indisponível não entra na fila
    bruno = next(i for i in corpo["itens"] if i["solicitacao_id"] == PEDIDO_BRUNO)
    assert bruno["urgencia_avaliada"] is False and bruno["sinalizacoes"]
    assert corpo["fontes_demo"] is True and "ilustrativos" in corpo["aviso"] and corpo["versao_pesos"] == "demo-0.1"
    carla = corpo["itens"][0]
    assert {c["nome"] for c in carla["componentes"]} == {
        "socioeconomico", "necessidade_academica", "tempo_espera", "falta_verificada"}
    assert next(c for c in carla["componentes"] if c["nome"] == "falta_verificada")["valor"] == -10


def test_fila_nao_expoe_faixa_de_renda(client, login):
    texto = client.get(FILA.format(CLINICA_A), headers=login(ATEND_A)).text
    assert "salario" not in texto and "faixa_renda" not in texto


def test_fila_isolamento_entre_clinicas_e_papeis(client, login):
    assert client.get(FILA.format(CLINICA_A), headers=login(ATEND_B)).status_code == 404
    assert client.get(FILA.format(CLINICA_A), headers=login(ANA)).status_code == 403
    assert client.get(FILA.format(CLINICA_A)).status_code == 401
    fila_b = client.get(FILA.format(CLINICA_B), headers=login(ATEND_B)).json()["itens"]
    assert all(i["clinica_id"] == CLINICA_B for i in fila_b)


def test_prioridade_de_um_pedido_e_escopada(client, login):
    ok = client.get(f"/api/v1/solicitacoes/{PEDIDO_CARLA}/prioridade", headers=login(ATEND_A))
    assert ok.status_code == 200 and ok.json()["posicao"] == 1
    assert client.get(f"/api/v1/solicitacoes/{PEDIDO_CARLA}/prioridade", headers=login(ATEND_B)).status_code == 404
    assert client.get(f"/api/v1/solicitacoes/{PEDIDO_CARLA}/prioridade", headers=login(ANA)).status_code == 403


@pytest.fixture
def depois_da_vaga(monkeypatch):
    """Falta só pode ser registrada depois do início da vaga (a do fixture é 2026-11-12)."""
    monkeypatch.setattr(prioridade_router, "utc_now", lambda: datetime(2026, 11, 12, 20, 0, tzinfo=timezone.utc))


def _agendamento_b(db):
    return db.scalar(select(Agendamento).where(Agendamento.clinica_id == CLINICA_B, Agendamento.estado == "agendado"))


def test_falta_so_profissional_da_clinica_com_justificativa(client, login, db, depois_da_vaga):
    ag = _agendamento_b(db)
    corpo = {"agendamento_id": ag.id, "justificativa": "Não compareceu ao horário confirmado."}
    assert client.post("/api/v1/faltas", json=corpo, headers=login(ATEND_B)).status_code == 403   # atendimento
    assert client.post("/api/v1/faltas", json=corpo, headers=login(PROF_A)).status_code == 404     # outra clínica
    assert client.post("/api/v1/faltas", json=corpo, headers=login(ANA)).status_code == 403        # paciente
    r = client.post("/api/v1/faltas", json={**corpo, "justificativa": ""}, headers=login(PROF_B))
    assert r.status_code == 422 and r.json()["erro"]["codigo"] == "validacao"
    ok = client.post("/api/v1/faltas", json=corpo, headers=login(PROF_B))
    assert ok.status_code == 201 and ok.json()["estado"] == "confirmada" and ok.json()["paciente_id"] == ag.paciente_id
    dup = client.post("/api/v1/faltas", json=corpo, headers=login(PROF_B))
    assert dup.status_code == 409
    db.refresh(ag)
    assert ag.desfecho == "falta_registrada"


def test_penalidade_reversao_e_auditoria(client, login, db, depois_da_vaga):
    ag = _agendamento_b(db)
    h = login(PROF_B)
    falta = client.post("/api/v1/faltas", headers=h, json={
        "agendamento_id": ag.id, "justificativa": "Não compareceu ao horário confirmado."}).json()
    # a falta aparece para o paciente (que vê o motivo) e não para outro paciente
    vistas = client.get("/api/v1/faltas", headers=login(ANA)).json()
    assert any(f["id"] == falta["id"] and f["justificativa"] for f in vistas["itens"])
    # reverter exige função e motivo; é auditado e é irreversível sem novo registro
    assert client.post(f"/api/v1/faltas/{falta['id']}/revisao", headers=login(ATEND_B),
                       json={"acao": "reverter", "motivo": "Erro de registro."}).status_code == 403
    r = client.post(f"/api/v1/faltas/{falta['id']}/revisao", headers=h,
                    json={"acao": "reverter", "motivo": "Erro de registro da clínica."})
    assert r.status_code == 200 and r.json()["estado"] == "revertida"
    db.refresh(ag)
    assert ag.desfecho == "pendente"
    assert r.json()["revisoes"][0]["estado_anterior"] == "confirmada"
    assert client.post(f"/api/v1/faltas/{falta['id']}/revisao", headers=h,
                       json={"acao": "reverter", "motivo": "De novo."}).status_code == 409
    assert db.scalar(select(RevisaoFalta).where(RevisaoFalta.falta_id == falta["id"])) is not None
    assert client.post(f"/api/v1/faltas/{falta['id']}/revisao", headers=login(PROF_A),
                       json={"acao": "manter", "motivo": "Teste de acesso."}).status_code == 404


def test_reversao_remove_penalidade_na_fila(client, login, db):
    h = login(PROF_A)
    falta = db.scalar(select(RegistroFalta).where(RegistroFalta.paciente_id.like("%0003")))
    def penalidade():
        item = client.get(FILA.format(CLINICA_A), headers=login(ATEND_A)).json()["itens"][0]
        return next(c["valor"] for c in item["componentes"] if c["nome"] == "falta_verificada")
    assert penalidade() == -10
    assert client.post(f"/api/v1/faltas/{falta.id}/revisao", headers=h,
                       json={"acao": "reverter", "motivo": "Revisão: justificou ausência."}).status_code == 200
    assert penalidade() == 0


def test_fila_le_cenarios_e_urgencia_do_banco_pelos_servicos_dos_modulos(client, login, db):
    from app.modulos.cenarios.models import Cenario

    def componente(nome, pedido=PEDIDO_BRUNO):
        fila = client.get(FILA.format(CLINICA_A), headers=login(ATEND_A)).json()["itens"]
        item = next(i for i in fila if i["solicitacao_id"] == pedido)
        return item, next(c for c in item["componentes"] if c["nome"] == nome)

    # cenário ativo de clínica_geral na clínica A (fixture) -> necessidade acadêmica
    assert componente("necessidade_academica", PEDIDO_CARLA)[1]["valor"] == 10
    db.get(Cenario, "c2000000-0000-4000-8000-000000000001").estado = "pausado"
    db.commit()
    assert componente("necessidade_academica", PEDIDO_CARLA)[1]["valor"] == 0

    # relato de urgência aguardando avaliação só sinaliza; avaliado por profissional passa à frente
    item, _ = componente("tempo_espera")
    assert item["urgencia_avaliada"] is False and item["sinalizacoes"]
    relato = "e2000000-0000-4000-8000-000000000001"
    r = client.post(f"/api/v1/urgencias/{relato}/avaliacao", headers=login(PROF_A),
                    json={"classificacao": "urgencia_confirmada"})
    assert r.status_code == 201
    item, _ = componente("tempo_espera")
    assert item["urgencia_avaliada"] is True and item["sinalizacoes"] == []
