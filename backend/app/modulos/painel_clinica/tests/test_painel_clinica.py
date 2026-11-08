from tests.conftest import ANA, ATEND_A, CLINICA_A, CLINICA_B

PROF_A = "funcionario.profissional.a"


def test_pedidos_com_nome_do_paciente_e_mesmo_escopo(client, login):
    h = login(ATEND_A)
    painel = client.get("/api/v1/painel-clinica/pedidos", headers=h)
    assert painel.status_code == 200
    base = client.get("/api/v1/solicitacoes", headers=h).json()
    itens = painel.json()["itens"]
    assert [i["id"] for i in itens] == [s["id"] for s in base["itens"]] and painel.json()["total"] == base["total"]
    assert itens and all(i["clinica_id"] == CLINICA_A and i["paciente_nome_exibicao"] for i in itens)


def test_pedidos_so_funcionario(client, login):
    assert client.get("/api/v1/painel-clinica/pedidos", headers=login(ANA)).status_code == 403


def test_atualizar_clinica_atendimento(client, login):
    h = login(ATEND_A)
    r = client.patch(f"/api/v1/clinicas/{CLINICA_A}", headers=h,
                     json={"telefone": " (11) 1000-0000 ", "recebendo_pedidos": False})
    assert r.status_code == 200, r.text
    assert r.json()["telefone"] == "(11) 1000-0000" and r.json()["recebendo_pedidos"] is False
    clinica = client.get(f"/api/v1/clinicas/{CLINICA_A}", headers=h).json()
    assert clinica["recebendo_pedidos"] is False and clinica["telefone"] == "(11) 1000-0000"


def test_atualizar_clinica_permissoes(client, login):
    assert client.patch(f"/api/v1/clinicas/{CLINICA_B}", headers=login(ATEND_A), json={"nome": "X"}).status_code == 404
    assert client.patch(f"/api/v1/clinicas/{CLINICA_A}", headers=login(PROF_A), json={"nome": "X"}).status_code == 403
    assert client.patch(f"/api/v1/clinicas/{CLINICA_A}", headers=login(ANA), json={"nome": "X"}).status_code == 403


def test_atualizar_clinica_valida_campos(client, login):
    r = client.patch(f"/api/v1/clinicas/{CLINICA_A}", headers=login(ATEND_A), json={"nome": ""})
    assert r.status_code == 422
