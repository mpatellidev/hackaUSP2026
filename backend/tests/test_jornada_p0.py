"""Jornada P0 ponta a ponta (#10) pela API real montada: pedido -> indisponível -> alternativa escolhida ->
vaga -> interesse -> confirmação única -> agendada. Também isolamento, urgência vs. score e módulos montados."""
from tests.conftest import ANA, ATEND_A, ATEND_B, CLINICA_A, CLINICA_B, EVA

API = "/api/v1"
BRUNO, PROF_A, COORD_C = "paciente.bruno", "funcionario.profissional.a", "funcionario.coordenacao.c"
PEDIDO_CARLA_A = "b1000000-0000-4000-8000-000000000004"  # urgência já avaliada nas fixtures


def test_jornada_p0_completa(client, login):
    bruno, a, b, eva = login(BRUNO), login(ATEND_A), login(ATEND_B), login(EVA)

    # 1-2. Paciente envia pedido à clínica A
    r = client.post(f"{API}/solicitacoes", headers=bruno, json={
        "clinica_id": CLINICA_A, "especialidade": "clinica_integrada", "publico_alvo": "adultos",
        "descricao_administrativa": "Avaliação de rotina dos dentes"})
    assert r.status_code == 201, r.text
    pedido_a = r.json()["id"]
    assert r.json()["estado"] == "enviada"

    # 3-4. A marca em análise e indisponível (motivo administrativo)
    p = f"{API}/solicitacoes/{pedido_a}/estado"
    assert client.patch(p, headers=a, json={"estado": "em_analise"}).status_code == 200
    r = client.patch(p, headers=a, json={"estado": "indisponivel", "motivo": "Sem agenda disponível neste período."})
    assert r.status_code == 200 and r.json()["estado"] == "indisponivel"

    # 5. Alternativas (nada foi enviado ainda)
    alt = client.get(f"{API}/solicitacoes/{pedido_a}/alternativas", headers=bruno).json()
    assert CLINICA_B in [i["clinica"]["id"] for i in alt["itens"]]
    assert all(s["clinica_id"] != CLINICA_B for s in client.get(f"{API}/solicitacoes", headers=bruno).json()["itens"])

    # 6. Paciente escolhe B
    r = client.post(f"{API}/solicitacoes/{pedido_a}/encaminhar", headers=bruno, json={"clinica_destino_id": CLINICA_B})
    assert r.status_code == 201, r.text
    pedido_b = r.json()["solicitacao"]["id"]
    assert r.json()["solicitacao"]["solicitacao_origem_id"] == pedido_a

    # Isolamento: A não vê o pedido de B; Eva não vê o de Bruno
    assert client.get(f"{API}/solicitacoes/{pedido_b}", headers=a).status_code == 404
    assert client.get(f"{API}/solicitacoes/{pedido_b}", headers=eva).status_code == 404

    # Pedido apenas `enviada` já pode demonstrar interesse (contrato §5, 0.1.3); a clínica ainda confirma depois
    vaga = client.post(f"{API}/vagas", headers=b, json={
        "especialidade": "clinica_integrada", "inicio": "2026-11-25T14:00:00-03:00", "fim": "2026-11-25T14:30:00-03:00"})
    assert vaga.status_code == 201
    vaga_id = vaga.json()["id"]

    # 7. B marca em análise
    assert client.patch(f"{API}/solicitacoes/{pedido_b}/estado", headers=b, json={"estado": "em_analise"}).status_code == 200

    # 8. Bruno e Eva demonstram interesse; pedido vai a aguardando_confirmação (não agendada)
    r = client.post(f"{API}/vagas/{vaga_id}/interesses", headers=bruno, json={"solicitacao_id": pedido_b})
    assert r.status_code == 201, r.text
    assert r.json()["solicitacao_estado"] == "aguardando_confirmacao" and r.json()["interesse"] == "registrado"
    assert client.get(f"{API}/solicitacoes/{pedido_b}", headers=bruno).json()["estado"] == "aguardando_confirmacao"
    pedido_eva = "b1000000-0000-4000-8000-000000000005"
    assert client.post(f"{API}/vagas/{vaga_id}/interesses", headers=eva,
                       json={"solicitacao_id": pedido_eva}).status_code == 201

    # 9. B confirma Bruno (uma única vez)
    interesses = client.get(f"{API}/vagas/{vaga_id}/interesses", headers=b).json()["itens"]
    assert len(interesses) == 2
    interesse_bruno = next(i for i in interesses if i["paciente_nome_exibicao"] == "Bruno Souza")["id"]
    r = client.post(f"{API}/vagas/{vaga_id}/confirmar", headers=b, json={"interesse_id": interesse_bruno})
    assert r.status_code == 200, r.text
    assert r.json()["solicitacao_estado"] == "agendada" and r.json()["estado"] == "preenchida"
    assert client.get(f"{API}/solicitacoes/{pedido_b}", headers=bruno).json()["estado"] == "agendada"
    eva_interesses = client.get(f"{API}/vagas?clinica_id={CLINICA_B}", headers=eva).json()["itens"]
    assert next(v for v in eva_interesses if v["id"] == vaga_id)["interesse"] == "nao_selecionado"

    # 409 em dupla confirmação (mesmo interesse e outro interesse)
    for i in interesses:
        r = client.post(f"{API}/vagas/{vaga_id}/confirmar", headers=b, json={"interesse_id": i["id"]})
        assert r.status_code == 409 and r.json()["erro"]["codigo"] == "vaga_ja_preenchida"

    # 10. Histórico completo de Bruno: os dois pedidos
    tipos = [e["tipo"] for e in client.get(f"{API}/solicitacoes/{pedido_b}/eventos", headers=bruno).json()["itens"]]
    assert tipos == ["encaminhamento_escolhido", "transicao", "interesse_registrado", "confirmacao"]


def test_urgencia_avaliada_vem_antes_do_score_na_fila(client, login):
    fila = client.get(f"{API}/clinicas/{CLINICA_A}/fila", headers=login(ATEND_A)).json()["itens"]
    assert fila[0]["solicitacao_id"] == PEDIDO_CARLA_A and fila[0]["urgencia_avaliada"] is True

    # Bruno relata urgência: sozinho NÃO reordena nem pune (aguardando avaliação)
    bruno = login(BRUNO)
    pedido_bruno = "b1000000-0000-4000-8000-000000000003"
    r = client.post(f"{API}/urgencias", headers=bruno, json={"solicitacao_id": pedido_bruno})
    assert r.status_code == 201 and r.json()["estado"] == "aguardando_avaliacao"
    fila = client.get(f"{API}/clinicas/{CLINICA_A}/fila", headers=login(ATEND_A)).json()["itens"]
    assert [i["solicitacao_id"] for i in fila if i["urgencia_avaliada"]] == [PEDIDO_CARLA_A]

    # Só profissional avalia; atendimento não
    relato_id = r.json()["id"]
    assert client.post(f"{API}/urgencias/{relato_id}/avaliacao", headers=login(ATEND_A),
                       json={"classificacao": "urgencia_confirmada"}).status_code == 403
    av = client.post(f"{API}/urgencias/{relato_id}/avaliacao", headers=login(PROF_A),
                     json={"classificacao": "urgencia_confirmada", "observacao_administrativa": "Priorizar contato."})
    assert av.status_code == 201, av.text
    fila = client.get(f"{API}/clinicas/{CLINICA_A}/fila", headers=login(ATEND_A)).json()["itens"]
    assert {fila[0]["solicitacao_id"], fila[1]["solicitacao_id"]} == {PEDIDO_CARLA_A, pedido_bruno}
    assert all(i["urgencia_avaliada"] for i in fila[:2]) and not any(i["urgencia_avaliada"] for i in fila[2:])
    # paciente de outra clínica não vê o relato
    assert client.get(f"{API}/urgencias", headers=login(EVA)).json()["total"] == 0


def test_urgencia_e_cenarios_montados_com_auth_do_core(client, login):
    assert client.get(f"{API}/urgencias").status_code == 401
    assert client.get(f"{API}/urgencias/orientacao").json()["samu"]
    cen = client.get(f"{API}/cenarios", headers=login(ANA))
    assert cen.status_code == 200 and cen.json()["total"] >= 1
    assert all(c["estado"] == "ativo" for c in cen.json()["itens"])
    # coordenação cria cenário; atendimento não
    corpo = {"titulo": "Cenário de teste", "descricao_leiga": "Atendimento supervisionado por professores.",
             "requisitos": [], "publico": "adultos", "cidade": "São Paulo", "uf": "SP",
             "especialidade": "cirurgia", "estado": "pausado"}
    assert client.post(f"{API}/cenarios", headers=login(ATEND_A), json=corpo).status_code == 403
    assert client.post(f"{API}/cenarios", headers=login(COORD_C), json=corpo).status_code == 201
