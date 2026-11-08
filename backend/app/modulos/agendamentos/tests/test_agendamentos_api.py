from datetime import datetime, timezone

import pytest
from sqlalchemy import func, select

from app.models.solicitacoes import Solicitacao
from app.models.vagas import Agendamento, InteresseVaga, Vaga
from app.modulos.agendamentos import service as agendamentos_service
from app.modulos.prioridade import router as prioridade_router
from app.modulos.prioridade.models import RegistroFalta, RevisaoFalta
from tests.conftest import ANA, ATEND_A, ATEND_B, CLINICA_B, EVA

API = "/api/v1"
PROF_B = "funcionario.profissional.b"
AG_ANA = "b2000000-0000-4000-8000-000000000001"        # Ana em B, agendado, vaga 1 (2026-11-12)
AG_CONCLUIDO = "b2000000-0000-4000-8000-000000000002"  # outro paciente, concluído
VAGA_1 = "f1000000-0000-4000-8000-000000000001"
PEDIDO_ANA_B = "b1000000-0000-4000-8000-000000000002"
INTERESSE_ANA = "d1000000-0000-4000-8000-000000000001"
PEDIDO_EVA = "b1000000-0000-4000-8000-000000000005"
HOJE = datetime(2026, 11, 7, 15, 0, tzinfo=timezone.utc)
DEPOIS_DA_VAGA = datetime(2026, 11, 12, 20, 0, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def relogio(monkeypatch):
    """Congela o 'agora' do serviço: os testes não dependem da data real."""
    monkeypatch.setattr(agendamentos_service, "utc_now", lambda: HOJE)


def _cancelar(client, headers, ag=AG_ANA, **corpo):
    return client.post(f"{API}/agendamentos/{ag}/cancelar", headers=headers, json=corpo)


def test_paciente_cancela_antecipado_sem_falta_nem_penalidade(client, login, db):
    faltas_antes = db.scalar(select(func.count()).select_from(RegistroFalta))
    r = _cancelar(client, login(ANA), motivo="Não vou conseguir ir.")
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["estado"] == "cancelado" and j["desfecho"] == "cancelado_antecipado"
    assert j["solicitacao_estado"] == "em_analise" and j["vaga_estado"] == "aberta"
    assert "não gera falta" in j["aviso"]

    db.expire_all()
    assert db.get(Agendamento, AG_ANA).desfecho == "cancelado_antecipado"
    assert db.get(Vaga, VAGA_1).estado == "aberta"
    assert db.get(InteresseVaga, INTERESSE_ANA).estado == "retirado"
    assert db.get(Solicitacao, PEDIDO_ANA_B).estado == "em_analise"
    # nenhuma falta nem revisão foi criada
    assert db.scalar(select(func.count()).select_from(RegistroFalta)) == faltas_antes
    assert db.scalar(select(func.count()).select_from(RevisaoFalta)) == 0

    eventos = client.get(f"{API}/solicitacoes/{PEDIDO_ANA_B}/eventos", headers=login(ANA)).json()["itens"]
    ultimo = eventos[-1]
    assert (ultimo["tipo"], ultimo["estado_anterior"], ultimo["estado_novo"]) == ("transicao", "agendada", "em_analise")
    assert ultimo["autor_papel"] == "paciente" and "Não vou conseguir ir." in ultimo["motivo"]

    # a fila (#13) não penaliza: o pedido volta à fila de B com falta_verificada = 0
    fila = client.get(f"{API}/clinicas/{CLINICA_B}/fila", headers=login(ATEND_B)).json()
    item = next(i for i in fila["itens"] if i["solicitacao_id"] == PEDIDO_ANA_B)
    assert next(c for c in item["componentes"] if c["nome"] == "falta_verificada")["valor"] == 0


def test_clinica_cancela_pela_clinica_e_nao_gera_falta(client, login, db):
    faltas_antes = db.scalar(select(func.count()).select_from(RegistroFalta))
    r = _cancelar(client, login(ATEND_B), motivo="Sala indisponível.")
    assert r.status_code == 200, r.text
    assert r.json()["desfecho"] == "cancelado_pela_clinica" and r.json()["paciente_nome_exibicao"] == "Ana M."
    db.expire_all()
    assert db.get(Solicitacao, PEDIDO_ANA_B).estado == "em_analise"
    assert db.get(Vaga, VAGA_1).estado == "aberta"
    assert db.scalar(select(func.count()).select_from(RegistroFalta)) == faltas_antes
    ver = client.get(f"{API}/agendamentos/{AG_ANA}", headers=login(ANA)).json()
    assert ver["estado"] == "cancelado" and ver["desfecho"] == "cancelado_pela_clinica"
    ev = client.get(f"{API}/solicitacoes/{PEDIDO_ANA_B}/eventos", headers=login(ANA)).json()["itens"][-1]
    assert ev["autor_papel"] == "funcionario" and "pela clínica" in ev["motivo"]


def test_isolamento_e_autenticacao(client, login):
    assert client.post(f"{API}/agendamentos/{AG_ANA}/cancelar", json={}).status_code == 401
    assert client.get(f"{API}/agendamentos").status_code == 401
    for intruso in (login(EVA), login(ATEND_A)):  # outra paciente; funcionário de outra clínica
        assert _cancelar(client, intruso).status_code == 404
        assert client.get(f"{API}/agendamentos/{AG_ANA}", headers=intruso).status_code == 404
    assert _cancelar(client, login(ANA), ag="b2000000-0000-4000-8000-0000000000ff").status_code == 404
    # nada mudou
    assert client.get(f"{API}/agendamentos/{AG_ANA}", headers=login(ANA)).json()["estado"] == "agendado"


def test_listar_por_escopo_e_filtro_de_estado(client, login):
    ana = client.get(f"{API}/agendamentos", headers=login(ANA)).json()
    assert [a["id"] for a in ana["itens"]] == [AG_ANA] and ana["total"] == 1
    assert ana["itens"][0]["vaga"]["inicio"].endswith("-03:00") and "paciente_nome_exibicao" not in ana["itens"][0]
    b = client.get(f"{API}/agendamentos", headers=login(ATEND_B)).json()
    assert {a["id"] for a in b["itens"]} == {AG_ANA, AG_CONCLUIDO}
    assert client.get(f"{API}/agendamentos", headers=login(ATEND_A)).json()["total"] == 0
    so_concluidos = client.get(f"{API}/agendamentos?estado=concluido", headers=login(ATEND_B)).json()
    assert [a["id"] for a in so_concluidos["itens"]] == [AG_CONCLUIDO]
    assert client.get(f"{API}/agendamentos?estado=cancelado", headers=login(ATEND_B)).json()["total"] == 0
    assert client.get(f"{API}/agendamentos?estado=xyz", headers=login(ATEND_B)).status_code == 422


def test_409_ja_cancelado_concluido_ou_com_falta_registrada(client, login):
    assert _cancelar(client, login(ANA)).status_code == 200
    segundo = _cancelar(client, login(ANA))
    assert segundo.status_code == 409 and segundo.json()["erro"]["codigo"] == "transicao_invalida"
    assert _cancelar(client, login(ATEND_B)).status_code == 409
    concluido = _cancelar(client, login(ATEND_B), ag=AG_CONCLUIDO)
    assert concluido.status_code == 409 and concluido.json()["erro"]["codigo"] == "transicao_invalida"


def test_409_quando_ja_ha_falta_registrada_pelo_profissional(client, login, monkeypatch):
    monkeypatch.setattr(prioridade_router, "utc_now", lambda: DEPOIS_DA_VAGA)  # falta só depois do horário
    falta =client.post(f"{API}/faltas", headers=login(PROF_B),
                        json={"agendamento_id": AG_ANA, "justificativa": "Não compareceu, sem aviso à clínica."})
    assert falta.status_code == 201, falta.text
    assert _cancelar(client, login(ANA)).status_code == 409   # desfecho já registrado por humano
    assert _cancelar(client, login(ATEND_B)).status_code == 409


def test_corpo_invalido_422(client, login):
    r = _cancelar(client, login(ANA), motivo="x" * 281)
    assert r.status_code == 422 and r.json()["erro"]["codigo"] == "validacao"
    assert client.post(f"{API}/agendamentos/{AG_ANA}/cancelar", headers=login(ANA), json={}).status_code == 200


def test_horario_ja_passou_so_a_clinica_cancela_e_a_vaga_nao_reabre(client, login, db, monkeypatch):
    monkeypatch.setattr(agendamentos_service, "utc_now", lambda: DEPOIS_DA_VAGA)
    paciente = _cancelar(client, login(ANA))
    assert paciente.status_code == 409 and "clínica" in paciente.json()["erro"]["mensagem"]
    clinica = _cancelar(client, login(ATEND_B))
    assert clinica.status_code == 200
    assert clinica.json()["desfecho"] == "cancelado_pela_clinica" and clinica.json()["vaga_estado"] == "cancelada"
    db.expire_all()
    assert db.get(Vaga, VAGA_1).estado == "cancelada"


def test_vaga_reaberta_aceita_novo_interesse_e_nova_confirmacao(client, login, db):
    assert _cancelar(client, login(ANA)).status_code == 200
    # Eva estava `nao_selecionado` nesta vaga: com a vaga aberta, pode demonstrar interesse de novo.
    eva = client.post(f"{API}/vagas/{VAGA_1}/interesses", headers=login(EVA), json={"solicitacao_id": PEDIDO_EVA})
    assert eva.status_code == 201, eva.text
    # Ana (pedido de volta em análise) também pode voltar à mesma vaga.
    ana = client.post(f"{API}/vagas/{VAGA_1}/interesses", headers=login(ANA), json={"solicitacao_id": PEDIDO_ANA_B})
    assert ana.status_code == 201, ana.text
    assert ana.json()["solicitacao_estado"] == "aguardando_confirmacao"
    # A clínica confirma de novo: o índice único só considera agendamento NÃO cancelado.
    ok = client.post(f"{API}/vagas/{VAGA_1}/confirmar", headers=login(ATEND_B),
                     json={"interesse_id": ana.json()["interesse_id"]})
    assert ok.status_code == 200, ok.text
    assert ok.json()["solicitacao_estado"] == "agendada"
    db.expire_all()
    ags = list(db.scalars(select(Agendamento).where(Agendamento.vaga_id == VAGA_1)))
    assert sorted(a.estado for a in ags) == ["agendado", "cancelado"]
