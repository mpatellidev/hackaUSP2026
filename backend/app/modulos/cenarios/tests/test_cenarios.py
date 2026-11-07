def h(conta: str) -> dict:
    return {"Authorization": f"Bearer demo:{conta}"}


A = "c2000000-0000-4000-8000-000000000001"   # ativo, clínica A, SP, clinica_geral
B = "c2000000-0000-4000-8000-000000000002"   # pausado, clínica B
NOVO = {"titulo": "Orientação de rotina com estudantes", "descricao_leiga": "Atividade supervisionada por professores.",
        "requisitos": ["Ter 18 anos ou mais"], "publico": "adultos", "cidade": "São Paulo", "uf": "sp",
        "especialidade": "oftalmologia"}
COORD = "funcionario.coordenacao.c"


def test_sem_token_401(client):
    r = client.get("/api/v1/cenarios")
    assert r.status_code == 401 and r.json()["erro"]["codigo"] == "nao_autenticado"


# ---- autorização ----
def test_paciente_nao_publica(client):
    r = client.post("/api/v1/cenarios", json=NOVO, headers=h("paciente.ana"))
    assert r.status_code == 403 and r.json()["erro"]["codigo"] == "acesso_negado"


def test_atendimento_e_profissional_nao_publicam(client):
    for conta in ("funcionario.atendimento.a", "funcionario.profissional.a"):
        assert client.post("/api/v1/cenarios", json=NOVO, headers=h(conta)).status_code == 403


def test_coordenacao_publica_na_propria_clinica_ignorando_corpo(client):
    r = client.post("/api/v1/cenarios", json={**NOVO, "clinica_id": "c1000000-0000-4000-8000-000000000001"},
                    headers=h(COORD))
    assert r.status_code == 201
    j = r.json()
    assert j["clinica_id"] == "c1000000-0000-4000-8000-000000000003" and j["uf"] == "SP"
    assert j["estado"] == "ativo" and j["publicado_em"].endswith("-03:00")


def test_validacao_formato_do_contrato(client):
    r = client.post("/api/v1/cenarios", json={**NOVO, "especialidade": "xyz"}, headers=h(COORD))
    e = r.json()["erro"]
    assert r.status_code == 422 and e["codigo"] == "validacao" and "especialidade" in e["detalhes"]["campos"]


def test_coordenacao_nao_edita_cenario_de_outra_clinica(client):
    r = client.patch(f"/api/v1/cenarios/{A}", json={"titulo": "Invadido"}, headers=h(COORD))
    assert r.status_code == 404


def test_atendimento_nao_edita(client):
    r = client.patch(f"/api/v1/cenarios/{A}", json={"estado": "pausado"}, headers=h("funcionario.atendimento.a"))
    assert r.status_code == 403


# ---- listagem, filtros, pausa ----
def test_paciente_ve_so_ativos(client):
    j = client.get("/api/v1/cenarios", headers=h("paciente.ana")).json()
    ids = {c["id"] for c in j["itens"]}
    assert A in ids and B not in ids and j["total"] == len(ids)
    assert "garante" in j["aviso"]


def test_filtro_cidade_sem_acento_e_caixa(client):
    h_ = h("paciente.ana")
    assert client.get("/api/v1/cenarios?cidade=sao paulo", headers=h_).json()["total"] >= 1
    j = client.get("/api/v1/cenarios?cidade=Recife", headers=h_).json()
    assert j["total"] == 0 and j["mensagem_vazia"]


def test_filtro_interesse_autodeclarado(client):
    j = client.get("/api/v1/cenarios?interesse=pediatria", headers=h("paciente.ana")).json()
    assert [c["especialidade"] for c in j["itens"]] == ["pediatria"]


def test_pausar_some_para_paciente_e_continua_para_clinica(client):
    cid = client.post("/api/v1/cenarios", json=NOVO, headers=h(COORD)).json()["id"]
    assert client.get(f"/api/v1/cenarios/{cid}", headers=h("paciente.ana")).status_code == 200
    r = client.patch(f"/api/v1/cenarios/{cid}", json={"estado": "pausado"}, headers=h(COORD))
    assert r.status_code == 200 and r.json()["estado"] == "pausado"
    assert client.get(f"/api/v1/cenarios/{cid}", headers=h("paciente.ana")).status_code == 404
    ids = {c["id"] for c in client.get("/api/v1/cenarios", headers=h("paciente.ana")).json()["itens"]}
    assert cid not in ids
    assert client.get(f"/api/v1/cenarios/{cid}", headers=h(COORD)).status_code == 200
    assert client.post(f"/api/v1/cenarios/{cid}/interesses", headers=h("paciente.ana")).status_code == 404
    client.patch(f"/api/v1/cenarios/{cid}", json={"estado": "ativo"}, headers=h(COORD))
    assert client.get(f"/api/v1/cenarios/{cid}", headers=h("paciente.ana")).status_code == 200


def test_funcionario_lista_so_da_propria_clinica(client):
    j = client.get("/api/v1/cenarios", headers=h("funcionario.atendimento.b")).json()
    assert {c["id"] for c in j["itens"]} == {B, "c2000000-0000-4000-8000-000000000004"}  # inclui pausado


# ---- interesse ----
def test_interesse_registra_idempotente_e_nao_e_agendamento(client):
    a = h("paciente.ana")
    r1 = client.post(f"/api/v1/cenarios/{A}/interesses", headers=a)
    r2 = client.post(f"/api/v1/cenarios/{A}/interesses", headers=a)
    assert (r1.status_code, r2.status_code) == (201, 200) and r1.json()["id"] == r2.json()["id"]
    assert r1.json()["estado"] == "registrado" and "não é confirmação" in r1.json()["aviso"]
    assert client.get(f"/api/v1/cenarios/{A}", headers=a).json()["meu_interesse"] == "registrado"


def test_interesse_paciente_so_o_proprio_e_retirar(client):
    carla, ana = h("paciente.carla"), h("paciente.ana")
    # Carla já tem interesse na fixture; Ana não vê isso
    assert client.get(f"/api/v1/cenarios/{A}", headers=ana).json()["meu_interesse"] is None
    assert client.delete(f"/api/v1/cenarios/{A}/interesses", headers=ana).status_code == 404
    r = client.delete(f"/api/v1/cenarios/{A}/interesses", headers=carla)
    assert r.status_code == 200 and r.json()["estado"] == "retirado"
    r = client.post(f"/api/v1/cenarios/{A}/interesses", headers=carla)  # reativa
    assert r.json()["estado"] == "registrado"


def test_funcionario_nao_registra_interesse(client):
    r = client.post(f"/api/v1/cenarios/{A}/interesses", headers=h("funcionario.atendimento.a"))
    assert r.status_code == 403


def test_clinica_ve_interesses_so_do_proprio_cenario(client):
    assert client.get(f"/api/v1/cenarios/{A}/interesses", headers=h("funcionario.atendimento.a")).json()["total"] == 1
    assert client.get(f"/api/v1/cenarios/{A}/interesses", headers=h("funcionario.atendimento.b")).status_code == 404
    assert client.get(f"/api/v1/cenarios/{A}/interesses", headers=h("paciente.ana")).status_code == 403


# ---- compatibilidade (sinal para #13) ----
def test_compatibilidade_academica(client):
    a = h("funcionario.atendimento.a")
    carla = "a1000000-0000-4000-8000-000000000003"
    j = client.get(f"/api/v1/cenarios/compatibilidade?paciente_id={carla}", headers=a).json()
    assert j == {"correspondente": True, "cenario_id": A}
    ana = "a1000000-0000-4000-8000-000000000001"
    assert client.get(f"/api/v1/cenarios/compatibilidade?paciente_id={ana}", headers=a).json() == {
        "correspondente": False, "cenario_id": None}
    # outra clínica não enxerga o sinal da clínica A
    assert client.get(f"/api/v1/cenarios/compatibilidade?paciente_id={carla}",
                      headers=h("funcionario.atendimento.b")).json()["correspondente"] is False
    # interesse retirado ou cenário pausado desliga o sinal
    client.delete(f"/api/v1/cenarios/{A}/interesses", headers=h("paciente.carla"))
    assert client.get(f"/api/v1/cenarios/compatibilidade?paciente_id={carla}", headers=a).json()["correspondente"] is False
    assert client.get(f"/api/v1/cenarios/compatibilidade?paciente_id={carla}", headers=h("paciente.carla")).status_code == 403
