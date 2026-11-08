from tests.conftest import ANA, ATEND_A, ATEND_B, CLINICA_A, CLINICA_B

COORD_C = "funcionario.coordenacao.c"
PROF_A_GERAL = "e1000000-0000-4000-8000-000000000001"


def test_lista_so_das_proprias_clinicas(client, login):
    itens = client.get("/api/v1/profissionais", headers=login(ATEND_A)).json()["itens"]
    assert itens and {p["clinica_id"] for p in itens} == {CLINICA_A}
    assert client.get("/api/v1/profissionais", params={"clinica_id": CLINICA_B}, headers=login(ATEND_A)).status_code == 404


def test_paciente_nao_acessa(client, login):
    assert client.get("/api/v1/profissionais", headers=login(ANA)).status_code == 403


def test_cadastro_e_edicao(client, login):
    h = login(ATEND_A)
    r = client.post("/api/v1/profissionais", headers=h, json={
        "nome_exibicao": "Dra. Teste (fictícia)", "especialidade": "periodontia", "vinculo": "residente"})
    assert r.status_code == 201 and r.json()["clinica_id"] == CLINICA_A
    pid = r.json()["id"]
    r = client.patch(f"/api/v1/profissionais/{pid}", headers=h, json={"ativo": False})
    assert r.status_code == 200 and r.json()["ativo"] is False
    assert pid not in [p["id"] for p in client.get("/api/v1/profissionais", params={"ativos": True}, headers=h).json()["itens"]]


def test_especialidade_fora_da_clinica_422(client, login):
    r = client.post("/api/v1/profissionais", headers=login(ATEND_A), json={
        "nome_exibicao": "Dr. Teste (fictício)", "especialidade": "odontopediatria", "vinculo": "docente"})
    assert r.status_code == 422 and r.json()["erro"]["codigo"] == "validacao"


def test_isolamento_entre_clinicas(client, login):
    assert client.patch(f"/api/v1/profissionais/{PROF_A_GERAL}", headers=login(ATEND_B), json={"ativo": False}).status_code == 404
    assert client.get(f"/api/v1/profissionais/{PROF_A_GERAL}/agenda", headers=login(ATEND_B)).status_code == 404


def test_agenda_dia_e_sobreposicao(client, login):
    h = login(ATEND_A)
    dia = client.get(f"/api/v1/profissionais/{PROF_A_GERAL}/agenda", params={"data": "2026-11-12"}, headers=h).json()
    assert dia["total"] == 2
    r = client.post(f"/api/v1/profissionais/{PROF_A_GERAL}/agenda", headers=h, json={
        "inicio": "2026-11-12T09:30:00-03:00", "fim": "2026-11-12T10:30:00-03:00"})
    assert r.status_code == 422
    r = client.post(f"/api/v1/profissionais/{PROF_A_GERAL}/agenda", headers=h, json={
        "inicio": "2026-11-12T15:00:00-03:00", "fim": "2026-11-12T16:00:00-03:00"})
    assert r.status_code == 201 and r.json()["estado"] == "disponivel"
    r = client.patch(f"/api/v1/agenda/{r.json()['id']}", headers=h, json={"estado": "indisponivel"})
    assert r.status_code == 200 and r.json()["estado"] == "indisponivel"


def test_disponibilidade_da_clinica(client, login):
    r = client.get(f"/api/v1/clinicas/{CLINICA_A}/disponibilidade", params={"data": "2026-11-12"}, headers=login(ATEND_A))
    assert r.status_code == 200
    por_id = {p["id"]: p for p in r.json()["profissionais"]}
    assert por_id[PROF_A_GERAL]["disponiveis"] == 1  # 09h reservado, 10h disponível
    assert client.get(f"/api/v1/clinicas/{CLINICA_B}/disponibilidade", params={"data": "2026-11-12"}, headers=login(ATEND_A)).status_code == 404


def test_vaga_com_profissional(client, login):
    h = login(ATEND_A)
    corpo = {"especialidade": "clinica_integrada", "inicio": "2026-12-01T09:00:00-03:00", "fim": "2026-12-01T09:30:00-03:00"}
    r = client.post("/api/v1/vagas", headers=h, json={**corpo, "profissional_id": PROF_A_GERAL})
    assert r.status_code == 201 and r.json()["profissional_id"] == PROF_A_GERAL
    outra = "e1000000-0000-4000-8000-000000000002"  # periodontia: não atende clínica integrada
    assert client.post("/api/v1/vagas", headers=h, json={**corpo, "profissional_id": outra}).status_code == 422
    de_b = "e1000000-0000-4000-8000-000000000004"
    assert client.post("/api/v1/vagas", headers=h, json={**corpo, "profissional_id": de_b}).status_code == 422
