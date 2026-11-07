from tests.conftest import ANA, ATEND_A, ATEND_B, CLINICA_A, CLINICA_B

PEDIDO_ANA_A = "b1000000-0000-4000-8000-000000000001"
PEDIDO_BRUNO_A = "b1000000-0000-4000-8000-000000000003"
PEDIDO_EVA_B = "b1000000-0000-4000-8000-000000000005"


def pedido(clinica_id=CLINICA_A, especialidade="cardiologia", publico_alvo="adultos"):
    return {
        "clinica_id": clinica_id,
        "especialidade": especialidade,
        "publico_alvo": publico_alvo,
        "descricao_administrativa": "Consulta de rotina, sem informação clínica detalhada.",
    }


def test_paciente_lista_clinicas_e_cria_pedido_com_evento(client, login):
    r = client.get("/api/v1/clinicas?cidade=São%20Paulo&especialidade=cardiologia", headers=login(ANA))
    assert r.status_code == 200
    assert [c["id"] for c in r.json()["itens"]] == [CLINICA_A]
    assert client.get("/api/v1/clinicas", headers=login(ATEND_A)).status_code == 403

    criado = client.post("/api/v1/solicitacoes", json=pedido(), headers=login(ANA))
    assert criado.status_code == 201, criado.text
    corpo = criado.json()
    assert corpo["paciente_id"] != "id informado pelo cliente" and corpo["estado"] == "enviada"
    assert corpo["publico_alvo"] == "adultos" and corpo["atualizado_em"].endswith("-03:00")

    eventos = client.get(f"/api/v1/solicitacoes/{corpo['id']}/eventos", headers=login(ANA)).json()
    assert eventos["total"] == 1
    assert eventos["itens"][0]["tipo"] == "criada" and eventos["itens"][0]["estado_novo"] == "enviada"


def test_criacao_valida_clinica_e_impede_duplicidade_ativa(client, login):
    fechado = client.post("/api/v1/solicitacoes", json=pedido(
        "c1000000-0000-4000-8000-000000000003", "ortopedia"), headers=login(ANA))
    assert fechado.status_code == 409 and fechado.json()["erro"]["codigo"] == "clinica_sem_recebimento"

    incompativel = client.post("/api/v1/solicitacoes", json=pedido(CLINICA_A, "pediatria"), headers=login(ANA))
    assert incompativel.status_code == 422 and "especialidade" in incompativel.json()["erro"]["detalhes"]["campos"]

    primeiro = client.post("/api/v1/solicitacoes", json=pedido(), headers=login(ANA))
    assert primeiro.status_code == 201
    duplicado = client.post("/api/v1/solicitacoes", json=pedido(), headers=login(ANA))
    assert duplicado.status_code == 409 and duplicado.json()["erro"]["codigo"] == "solicitacao_duplicada"


def test_transicoes_exigem_clinica_correta_e_motivo_administrativo(client, login):
    path = f"/api/v1/solicitacoes/{PEDIDO_BRUNO_A}/estado"
    assert client.patch(path, json={"estado": "em_analise"}, headers=login(ATEND_B)).status_code == 404
    assert client.patch(path, json={"estado": "em_analise"}, headers=login(ANA)).status_code == 403
    assert client.patch(path, json={"estado": "em_analise"}, headers=login(ATEND_A)).status_code == 200

    sem_motivo = client.patch(path, json={"estado": "precisa_contato"}, headers=login(ATEND_A))
    assert sem_motivo.status_code == 422 and sem_motivo.json()["erro"]["detalhes"]["campos"] == ["motivo"]
    alterado = client.patch(path, json={"estado": "precisa_contato", "motivo": "Faltam informações de contato."},
                            headers=login(ATEND_A))
    assert alterado.status_code == 200 and alterado.json()["estado"] == "precisa_contato"
    assert client.patch(path, json={"estado": "precisa_contato", "motivo": "Ainda falta contato."},
                        headers=login(ATEND_A)).status_code == 409

    eventos = client.get(f"/api/v1/solicitacoes/{PEDIDO_BRUNO_A}/eventos", headers=login(ATEND_A)).json()["itens"]
    assert [e["estado_novo"] for e in eventos[-2:]] == ["em_analise", "precisa_contato"]
    assert eventos[-1]["motivo"] == "Faltam informações de contato."


def test_alternativas_e_encaminhamento_exigem_escolha_explicita(client, login):
    alternativas = client.get(f"/api/v1/solicitacoes/{PEDIDO_ANA_A}/alternativas", headers=login(ANA))
    assert alternativas.status_code == 200
    assert alternativas.json()["criterios"] == ["mesma_cidade", "publico_compativel", "recebendo_pedidos", "mesma_especialidade"]
    assert [i["clinica"]["id"] for i in alternativas.json()["itens"]] == [CLINICA_B]
    assert "garantia" in alternativas.json()["aviso"]
    assert client.get(f"/api/v1/solicitacoes/{PEDIDO_EVA_B}/alternativas", headers=login(ANA)).status_code == 404

    encaminhado = client.post(f"/api/v1/solicitacoes/{PEDIDO_ANA_A}/encaminhar",
                              json={"clinica_destino_id": CLINICA_B}, headers=login(ANA))
    assert encaminhado.status_code == 201, encaminhado.text
    novo = encaminhado.json()["solicitacao"]
    assert novo["clinica_id"] == CLINICA_B and novo["solicitacao_origem_id"] == PEDIDO_ANA_A
    assert encaminhado.json()["campos_compartilhados"] == [
        "nome_exibicao", "cidade", "contato_preferido", "especialidade", "descricao_administrativa"]
    assert client.get(f"/api/v1/solicitacoes/{novo['id']}", headers=login("paciente.eva")).status_code == 404
    assert client.post(f"/api/v1/solicitacoes/{PEDIDO_ANA_A}/encaminhar",
                       json={"clinica_destino_id": CLINICA_B}, headers=login(ANA)).status_code == 409

    historico_origem = client.get(f"/api/v1/solicitacoes/{PEDIDO_ANA_A}", headers=login(ANA)).json()
    assert historico_origem["estado"] == "indisponivel"
    eventos_novo = client.get(f"/api/v1/solicitacoes/{novo['id']}/eventos", headers=login(ANA)).json()["itens"]
    assert eventos_novo[0]["tipo"] == "encaminhamento_escolhido"


def test_lista_vazia_e_destino_fora_da_alternativa(client, login):
    criado = client.post("/api/v1/solicitacoes", json=pedido(), headers=login(ANA)).json()
    estado = client.patch(f"/api/v1/solicitacoes/{criado['id']}/estado",
                          json={"estado": "indisponivel", "motivo": "Sem agenda disponível neste período."},
                          headers=login(ATEND_A))
    assert estado.status_code == 200
    alternativas = client.get(f"/api/v1/solicitacoes/{criado['id']}/alternativas", headers=login(ANA))
    assert alternativas.status_code == 200 and alternativas.json()["itens"] == []
    invalido = client.post(f"/api/v1/solicitacoes/{criado['id']}/encaminhar",
                           json={"clinica_destino_id": CLINICA_B}, headers=login(ANA))
    assert invalido.status_code == 422 and invalido.json()["erro"]["detalhes"]["campos"] == ["clinica_destino_id"]
