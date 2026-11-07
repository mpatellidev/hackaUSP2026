from tests.conftest import ANA, ATEND_A, CLINICA_A, CLINICA_B

DIEGO, PROF_B, PROF_A = "paciente.diego", "funcionario.profissional.b", "funcionario.profissional.a"
RESUMO = "e3000000-0000-4000-8000-000000000001"
COMPART = "e4000000-0000-4000-8000-000000000001"
PEDIDO_B = "b1000000-0000-4000-8000-000000000006"


def test_paciente_ve_so_o_proprio(client, login):
    assert client.get("/api/v1/resumos", headers=login(DIEGO)).json()["total"] == 1
    assert client.get("/api/v1/resumos", headers=login(ANA)).json()["total"] == 0
    assert client.get(f"/api/v1/resumos/{RESUMO}", headers=login(ANA)).status_code == 404


def test_clinica_destino_ve_so_campos_compartilhados_e_consulta_fica_registrada(client, login):
    r = client.get(f"/api/v1/resumos/{RESUMO}", headers=login(PROF_A))
    corpo = r.json()
    assert r.status_code == 200 and corpo["origem"] == "compartilhado" and corpo["paciente_id"] is None
    assert [c["nome"] for c in corpo["campos"]] == ["Motivo do atendimento", "Orientação administrativa"]
    tipos = [e["tipo"] for e in client.get(f"/api/v1/resumos/{RESUMO}/eventos", headers=login(DIEGO)).json()["itens"]]
    assert tipos == ["criacao", "aceite", "consulta"]


def test_clinica_sem_compartilhamento_nao_ve(client, login):
    assert client.get(f"/api/v1/resumos/{RESUMO}", headers=login("funcionario.coordenacao.c")).status_code == 404


def test_revogacao_vale_para_acessos_futuros_e_preserva_historico(client, login):
    assert client.post(f"/api/v1/compartilhamentos/{COMPART}/revogar", headers=login(ANA)).status_code == 404
    r = client.post(f"/api/v1/compartilhamentos/{COMPART}/revogar", headers=login(DIEGO))
    assert r.status_code == 200 and r.json()["ativo"] is False
    assert client.get(f"/api/v1/resumos/{RESUMO}", headers=login(PROF_A)).status_code == 404
    assert client.post(f"/api/v1/compartilhamentos/{COMPART}/revogar", headers=login(DIEGO)).status_code == 409
    tipos = [e["tipo"] for e in client.get(f"/api/v1/resumos/{RESUMO}/eventos", headers=login(DIEGO)).json()["itens"]]
    assert tipos[-1] == "revogacao" and "criacao" in tipos


def test_so_o_paciente_escolhe_e_so_campos_existentes(client, login):
    corpo = {"clinica_destino_id": CLINICA_B, "campos_compartilhados": ["Alergias informadas"],
             "finalidade": "Teste de escolha", "aceite": "aceito"}
    assert client.post(f"/api/v1/resumos/{RESUMO}/compartilhamentos", headers=login(PROF_B), json=corpo).status_code == 403
    assert client.post(f"/api/v1/resumos/{RESUMO}/compartilhamentos", headers=login(DIEGO), json=corpo).status_code == 422  # destino = autora
    corpo["clinica_destino_id"] = CLINICA_A
    assert client.post(f"/api/v1/resumos/{RESUMO}/compartilhamentos", headers=login(DIEGO),
                       json={**corpo, "campos_compartilhados": ["Inexistente"]}).status_code == 422
    r = client.post(f"/api/v1/resumos/{RESUMO}/compartilhamentos", headers=login(DIEGO), json=corpo)
    assert r.status_code == 201 and r.json()["ativo"] is True


def test_recusa_nao_da_acesso(client, login):
    corpo = {"clinica_destino_id": "c1000000-0000-4000-8000-000000000003", "campos_compartilhados": ["Alergias informadas"],
             "finalidade": "Teste de recusa", "aceite": "recusado"}
    r = client.post(f"/api/v1/resumos/{RESUMO}/compartilhamentos", headers=login(DIEGO), json=corpo)
    assert r.status_code == 201 and r.json()["ativo"] is False
    assert client.get(f"/api/v1/resumos/{RESUMO}", headers=login("funcionario.coordenacao.c")).status_code == 404


def test_so_profissional_cria_resumo(client, login):
    corpo = {"solicitacao_id": PEDIDO_B, "campos": [{"nome": "Observação", "valor": "Texto fictício."}]}
    assert client.post("/api/v1/resumos", headers=login("funcionario.atendimento.b"), json=corpo).status_code == 403
    assert client.post("/api/v1/resumos", headers=login(PROF_A), json=corpo).status_code == 404  # pedido de outra clínica
    r = client.post("/api/v1/resumos", headers=login(PROF_B), json=corpo)
    assert r.status_code == 201 and r.json()["origem"] == "autor"
