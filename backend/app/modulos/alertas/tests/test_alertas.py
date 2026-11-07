from tests.conftest import ANA, ATEND_A, EVA

CARLA = "paciente.carla"  # pedido ativo de clínica geral na Clínica A

VAGA_ALERTA = "f1000000-0000-4000-8000-000000000002"


def _vaga(client, h, **extra):
    corpo = {"especialidade": "clinica_geral", "inicio": "2026-12-02T09:00:00-03:00", "fim": "2026-12-02T09:30:00-03:00"}
    return client.post("/api/v1/vagas", headers=h, json={**corpo, **extra})


def test_alerta_so_para_quem_optou_e_tem_pedido_ativo(client, login):
    # Carla tem pedido ativo (clínica A, clínica geral) mas ainda não optou: nenhum alerta
    h = login(CARLA)
    _vaga(client, login(ATEND_A))
    assert client.get("/api/v1/alertas", headers=h).json()["total"] == 0
    r = client.put("/api/v1/alertas/preferencia", headers=h, json={"receber": True, "ligacao": True})
    assert r.status_code == 200 and r.json() == {**r.json(), "receber": True, "ligacao": True}
    assert _vaga(client, login(ATEND_A)).status_code == 201
    corpo = client.get("/api/v1/alertas", headers=h).json()
    assert corpo["total"] == 1 and corpo["nao_lidos"] == 1 and corpo["itens"][0]["clinica_nome"]


def test_um_alerta_por_paciente_e_vaga_e_marcar_lido(client, login):
    h = login(CARLA)
    client.put("/api/v1/alertas/preferencia", headers=h, json={"receber": True})
    _vaga(client, login(ATEND_A))
    alerta = client.get("/api/v1/alertas", headers=h).json()["itens"][0]
    r = client.post(f"/api/v1/alertas/{alerta['id']}/lido", headers=h)
    assert r.status_code == 200 and r.json()["lido"] is True
    assert client.get("/api/v1/alertas", headers=h).json()["nao_lidos"] == 0


def test_alerta_de_outro_paciente_404_e_funcionario_403(client, login):
    assert client.post(f"/api/v1/alertas/a3000000-0000-4000-8000-000000000001/lido", headers=login(ANA)).status_code == 404
    assert client.get("/api/v1/alertas", headers=login(ATEND_A)).status_code == 403
    assert client.post("/api/v1/alertas/a3000000-0000-4000-8000-000000000001/lido", headers=login(EVA)).status_code == 200


def test_desligar_remove_ligacao(client, login):
    h = login(CARLA)
    r = client.put("/api/v1/alertas/preferencia", headers=h, json={"receber": False, "ligacao": True})
    assert r.json()["receber"] is False and r.json()["ligacao"] is False
