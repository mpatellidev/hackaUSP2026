from sqlalchemy import select

from app.models.solicitacoes import Solicitacao
from tests.conftest import ANA, ATEND_A, CLINICA_B

DIEGO = "paciente.diego"  # tem pedido concluído e avaliado nas fixtures
PEDIDO_CONCLUIDO = "b1000000-0000-4000-8000-000000000006"


def test_clinica_mostra_media_sem_nome(client, login):
    corpo = client.get(f"/api/v1/clinicas/{CLINICA_B}/avaliacoes", headers=login(ANA)).json()
    assert corpo["quantidade"] == 1 and corpo["media"] == 5.0
    assert set(corpo["itens"][0]) == {"nota", "comentario", "criado_em"}


def test_so_avalia_pedido_concluido_do_proprio_paciente(client, login, db):
    pedido = db.scalars(select(Solicitacao).where(Solicitacao.paciente_id.like("%0001"))).first()
    r = client.post("/api/v1/avaliacoes", headers=login(ANA), json={"solicitacao_id": pedido.id, "nota": 4})
    assert r.status_code == 409 and r.json()["erro"]["codigo"] == "transicao_invalida"
    r = client.post("/api/v1/avaliacoes", headers=login(ANA), json={"solicitacao_id": PEDIDO_CONCLUIDO, "nota": 4})
    assert r.status_code == 404  # pedido de outra pessoa
    assert client.post("/api/v1/avaliacoes", headers=login(ATEND_A), json={"solicitacao_id": PEDIDO_CONCLUIDO, "nota": 4}).status_code == 403


def test_avaliar_cria_e_reenviar_edita(client, login, db):
    pedido = db.get(Solicitacao, PEDIDO_CONCLUIDO)
    pedido.estado = "concluida"
    db.commit()
    h = login(DIEGO)
    r = client.post("/api/v1/avaliacoes", headers=h, json={"solicitacao_id": PEDIDO_CONCLUIDO, "nota": 3, "comentario": "ok"})
    assert r.status_code == 200 and r.json()["nota"] == 3  # já existia nas fixtures: edita
    assert client.get("/api/v1/avaliacoes", headers=h).json()["itens"][0]["nota"] == 3


def test_nota_fora_da_faixa_422(client, login):
    r = client.post("/api/v1/avaliacoes", headers=login(DIEGO), json={"solicitacao_id": PEDIDO_CONCLUIDO, "nota": 9})
    assert r.status_code == 422 and r.json()["erro"]["codigo"] == "validacao"
