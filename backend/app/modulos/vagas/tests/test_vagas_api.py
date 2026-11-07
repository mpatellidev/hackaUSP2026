from sqlalchemy import select

from app.models.solicitacoes import Solicitacao
from app.models.vagas import Agendamento
from tests.conftest import ANA, ATEND_A, ATEND_B, CLINICA_A, CLINICA_B, EVA

V = "/api/v1/vagas"
VAGA_ABERTA = "f1000000-0000-4000-8000-000000000002"      # clínica B, clinica_geral, aberta
VAGA_PREENCHIDA = "f1000000-0000-4000-8000-000000000001"  # clínica B, preenchida (Ana)
PEDIDO_EVA = "b1000000-0000-4000-8000-000000000005"       # Eva em B, aguardando_confirmacao
INTERESSE_EVA = "d1000000-0000-4000-8000-000000000003"    # Eva na vaga 2, registrado
PEDIDO_ANA_B = "b1000000-0000-4000-8000-000000000002"     # Ana em B, agendada
NOVA = {"especialidade": "clinica_geral", "inicio": "2026-11-20T10:00:00-03:00", "fim": "2026-11-20T10:30:00-03:00"}


def test_funcionario_publica_vaga_com_clinica_do_token(client, login):
    r = client.post(V, json={**NOVA, "clinica_id": CLINICA_A}, headers=login(ATEND_B))
    assert r.status_code == 201, r.text
    assert r.json()["clinica_id"] == CLINICA_B and r.json()["estado"] == "aberta"
    assert r.json()["inicio"].endswith("-03:00")
    assert client.post(V, json=NOVA, headers=login(ANA)).status_code == 403
    assert client.post(V, json=NOVA).status_code == 401


def test_publicar_valida_horario_fuso_e_especialidade(client, login):
    h = login(ATEND_B)
    sem_fuso = client.post(V, json={**NOVA, "inicio": "2026-11-20T10:00:00"}, headers=h)
    assert sem_fuso.status_code == 422 and sem_fuso.json()["erro"]["codigo"] == "validacao"
    invertido = client.post(V, json={**NOVA, "fim": "2026-11-20T09:00:00-03:00"}, headers=h)
    assert invertido.status_code == 422
    outra = client.post(V, json={**NOVA, "especialidade": "cardiologia"}, headers=h)
    assert outra.status_code == 422 and "especialidade" in outra.json()["erro"]["detalhes"]["campos"]


def test_paciente_so_ve_vagas_de_clinica_com_pedido_ativo(client, login):
    ver = client.get(f"{V}?clinica_id={CLINICA_B}", headers=login(EVA))
    assert ver.status_code == 200
    ids = {v["id"]: v for v in ver.json()["itens"]}
    assert VAGA_ABERTA in ids and ids[VAGA_ABERTA]["interesse"] == "registrado"
    assert VAGA_PREENCHIDA in ids and ids[VAGA_PREENCHIDA]["interesse"] == "nao_selecionado"
    # Ana não tem pedido ativo em B (o dela já está agendado): não vê vagas de B.
    assert client.get(f"{V}?clinica_id={CLINICA_B}", headers=login(ANA)).status_code == 403


def test_funcionario_ve_so_vagas_da_propria_clinica(client, login):
    proprias = client.get(V, headers=login(ATEND_B)).json()
    assert {v["clinica_id"] for v in proprias["itens"]} == {CLINICA_B}
    aberta = next(v for v in proprias["itens"] if v["id"] == VAGA_ABERTA)
    assert aberta["interesses_registrados"] == 1
    assert client.get(f"{V}?clinica_id={CLINICA_B}", headers=login(ATEND_A)).status_code == 404
    assert client.get(V, headers=login(ATEND_A)).json()["total"] == 0


def test_interesse_exige_pedido_do_paciente_e_vaga_da_mesma_clinica(client, login):
    h = login(ANA)
    # pedido de outra pessoa: 404 (não revela existência)
    assert client.post(f"{V}/{VAGA_ABERTA}/interesses", json={"solicitacao_id": PEDIDO_EVA}, headers=h).status_code == 404
    # pedido agendado de Ana não é elegível a novo interesse
    r = client.post(f"{V}/{VAGA_ABERTA}/interesses", json={"solicitacao_id": PEDIDO_ANA_B}, headers=h)
    assert r.status_code == 409 and r.json()["erro"]["codigo"] == "transicao_invalida"
    # funcionário não demonstra interesse
    assert client.post(f"{V}/{VAGA_ABERTA}/interesses", json={"solicitacao_id": PEDIDO_EVA},
                       headers=login(ATEND_B)).status_code == 403


def test_pedido_enviada_ja_pode_demonstrar_interesse(client, login, db):
    ana = login(ANA)
    pedido = client.post("/api/v1/solicitacoes", headers=ana, json={
        "clinica_id": CLINICA_B, "especialidade": "clinica_geral", "publico_alvo": "adultos",
        "descricao_administrativa": "Nova consulta de rotina"})
    assert pedido.status_code == 201 and pedido.json()["estado"] == "enviada"
    r = client.post(f"{V}/{VAGA_ABERTA}/interesses", json={"solicitacao_id": pedido.json()["id"]}, headers=ana)
    assert r.status_code == 201, r.text
    assert r.json()["interesse"] == "registrado" and r.json()["solicitacao_estado"] == "aguardando_confirmacao"
    # interesse não é agendamento: nada foi confirmado
    db.expire_all()
    assert db.get(Solicitacao, pedido.json()["id"]).estado == "aguardando_confirmacao"
    assert list(db.scalars(select(Agendamento).where(Agendamento.vaga_id == VAGA_ABERTA))) == []


def test_interesse_duplicado_e_em_vaga_preenchida(client, login):
    h = login(EVA)
    dup = client.post(f"{V}/{VAGA_ABERTA}/interesses", json={"solicitacao_id": PEDIDO_EVA}, headers=h)
    assert dup.status_code == 409
    cheia = client.post(f"{V}/{VAGA_PREENCHIDA}/interesses", json={"solicitacao_id": PEDIDO_EVA}, headers=h)
    assert cheia.status_code == 409 and cheia.json()["erro"]["codigo"] == "vaga_ja_preenchida"


def test_confirmacao_unica_com_agendamento_e_nao_selecionados(client, login, db):
    h = login(ATEND_B)
    lista = client.get(f"{V}/{VAGA_ABERTA}/interesses", headers=h).json()
    assert lista["itens"][0]["id"] == INTERESSE_EVA and lista["itens"][0]["posicao_sugerida"] == 1
    # outro funcionário (clínica A) não vê nem confirma
    assert client.get(f"{V}/{VAGA_ABERTA}/interesses", headers=login(ATEND_A)).status_code == 404
    assert client.post(f"{V}/{VAGA_ABERTA}/confirmar", json={"interesse_id": INTERESSE_EVA},
                       headers=login(ATEND_A)).status_code == 404
    assert client.post(f"{V}/{VAGA_ABERTA}/confirmar", json={"interesse_id": INTERESSE_EVA},
                       headers=login(EVA)).status_code == 403

    ok = client.post(f"{V}/{VAGA_ABERTA}/confirmar", json={"interesse_id": INTERESSE_EVA}, headers=h)
    assert ok.status_code == 200, ok.text
    corpo = ok.json()
    assert corpo["estado"] == "preenchida" and corpo["solicitacao_estado"] == "agendada"
    assert corpo["agendamento"]["estado"] == "agendado" and corpo["agendamento"]["desfecho"] == "pendente"

    db.expire_all()
    assert db.get(Solicitacao, PEDIDO_EVA).estado == "agendada"
    assert len(list(db.scalars(select(Agendamento).where(Agendamento.vaga_id == VAGA_ABERTA)))) == 1

    segunda = client.post(f"{V}/{VAGA_ABERTA}/confirmar", json={"interesse_id": INTERESSE_EVA}, headers=h)
    assert segunda.status_code == 409 and segunda.json()["erro"]["codigo"] == "vaga_ja_preenchida"
    eventos = client.get(f"/api/v1/solicitacoes/{PEDIDO_EVA}/eventos", headers=login(EVA)).json()["itens"]
    assert eventos[-1]["tipo"] == "confirmacao" and eventos[-1]["estado_novo"] == "agendada"


def test_confirmar_interesse_inexistente_ou_de_outra_vaga(client, login):
    h = login(ATEND_B)
    r = client.post(f"{V}/{VAGA_ABERTA}/confirmar", json={"interesse_id": "d1000000-0000-4000-8000-000000000001"},
                    headers=h)
    assert r.status_code == 404


def test_concluir_pedido_agendado_fecha_o_agendamento(client, login, db):
    r = client.patch(f"/api/v1/solicitacoes/{PEDIDO_ANA_B}/estado", json={"estado": "concluida"},
                     headers=login(ATEND_B))
    assert r.status_code == 200 and r.json()["estado"] == "concluida"
    ag = db.scalar(select(Agendamento).where(Agendamento.solicitacao_id == PEDIDO_ANA_B))
    db.refresh(ag)
    assert ag.estado == "concluido" and ag.desfecho == "compareceu"
    # concluída é terminal
    assert client.patch(f"/api/v1/solicitacoes/{PEDIDO_ANA_B}/estado", json={"estado": "em_analise"},
                        headers=login(ATEND_B)).status_code == 409
    # só a partir de agendada
    assert client.patch("/api/v1/solicitacoes/b1000000-0000-4000-8000-000000000003/estado",
                        json={"estado": "concluida"}, headers=login(ATEND_A)).status_code == 409
