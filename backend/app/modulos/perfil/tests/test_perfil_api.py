from tests.conftest import ANA, ATEND_A, CLINICA_A

URL = "/api/v1/perfil"
BRUNO = "paciente.bruno"
PEDIDO_BRUNO = "b1000000-0000-4000-8000-000000000003"   # clínica A, renda "prefiro não informar" na fixture


def _componente(client, login, nome):
    fila = client.get(f"/api/v1/clinicas/{CLINICA_A}/fila", headers=login(ATEND_A)).json()["itens"]
    item = next(i for i in fila if i["solicitacao_id"] == PEDIDO_BRUNO)
    return next(c for c in item["componentes"] if c["nome"] == nome)


def test_exige_login_e_so_paciente(client, login):
    assert client.get(URL).status_code == 401
    assert client.get(URL, headers=login(ATEND_A)).status_code == 403
    assert client.put(URL, headers=login(ATEND_A), json={}).status_code == 403


def test_get_devolve_o_perfil_da_fixture_so_do_proprio_usuario(client, login):
    j = client.get(URL, headers=login(ANA)).json()
    assert j["usuario_id"] == "a1000000-0000-4000-8000-000000000001" and j["modo"] == "demo"
    assert j["cidade"] == "São Paulo" and j["socioeconomico"]["faixa_renda_familiar"] == "ate_1_salario_minimo"
    assert j["acessibilidade"]["texto"] == "grande"


def test_put_valida_e_ignora_usuario_do_corpo(client, login):
    h = login(BRUNO)
    ruim = client.put(URL, headers=h, json={"socioeconomico": {"informado": True}})
    assert ruim.status_code == 422 and ruim.json()["erro"]["codigo"] == "validacao"
    ruim = client.put(URL, headers=h, json={"acessibilidade": {"tema": "neon"}})
    assert ruim.status_code == 422
    ok = client.put(URL, headers=h, json={"usuario_id": "a1000000-0000-4000-8000-000000000001", "cidade": "Campinas",
                                          "uf": "sp", "contato_preferido": "telefone",
                                          "socioeconomico": {"informado": False, "prefiro_nao_informar": True},
                                          "acessibilidade": {"texto": "extra_grande", "audio": True}})
    assert ok.status_code == 200, ok.text
    j = ok.json()
    assert j["usuario_id"] == "a1000000-0000-4000-8000-000000000002" and j["uf"] == "SP" and j["salvo"] is True
    assert j["acessibilidade"]["texto"] == "extra_grande" and j["acessibilidade"]["linguagem"] == "simples"
    assert client.get(URL, headers=h).json()["cidade"] == "Campinas"
    # a Ana não foi alterada
    assert client.get(URL, headers=login(ANA)).json()["cidade"] == "São Paulo"


def test_nao_informar_renda_vale_e_nao_impede_pedido(client, login):
    j = client.put(URL, headers=login(BRUNO), json={"socioeconomico": {"informado": False}}).json()
    assert j["socioeconomico"]["informado"] is False and "faixa_renda_familiar" not in j["socioeconomico"]


def test_renda_informada_alimenta_a_fila_sem_expor_a_faixa(client, login):
    antes = _componente(client, login, "socioeconomico")
    assert antes["valor"] is None                      # desconhecido = 0, documentado
    r = client.put(URL, headers=login(BRUNO), json={"socioeconomico": {
        "informado": True, "faixa_renda_familiar": "ate_1_salario_minimo"}})
    assert r.status_code == 200 and "finalidade" in r.json()["socioeconomico"]
    assert _componente(client, login, "socioeconomico")["valor"] == 15
    texto = client.get(f"/api/v1/clinicas/{CLINICA_A}/fila", headers=login(ATEND_A)).text
    assert "salario" not in texto
