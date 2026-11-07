from sqlalchemy import select

from app.models.vagas import Agendamento
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


def _agendamento_b(db):
    return db.scalar(select(Agendamento).where(Agendamento.clinica_id == CLINICA_B, Agendamento.estado == "agendado"))


def test_falta_so_profissional_da_clinica_com_justificativa(client, login, db):
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


def test_penalidade_reversao_e_auditoria(client, login, db):
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
