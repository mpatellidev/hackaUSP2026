"""Correções da revisão de segurança: cabeçalhos, limites, faltas, auditoria de resumos e urgência."""
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app
from app.modulos.prioridade import router as prioridade_router
from tests.conftest import ANA, ATEND_A, CLINICA_A

API = "/api/v1"
PROF_B = "funcionario.profissional.b"
AG_ANA = "b2000000-0000-4000-8000-000000000001"        # vaga em 2026-11-12 14:00 (-03)
PEDIDO_ANA_B = "b1000000-0000-4000-8000-000000000002"
ANTES_DA_VAGA = datetime(2026, 11, 7, 15, 0, tzinfo=timezone.utc)
DEPOIS_DA_VAGA = datetime(2026, 11, 12, 20, 0, tzinfo=timezone.utc)


def test_cabecalhos_de_seguranca_na_api_e_csp_fora_da_documentacao(client):
    h = client.get(f"{API}/saude").headers
    assert h["x-content-type-options"] == "nosniff" and h["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in h["content-security-policy"]
    assert "script-src 'self'" in h["content-security-policy"] and "'unsafe-inline'" not in \
        h["content-security-policy"].split("script-src")[1].split(";")[0]
    assert "strict-transport-security" not in h  # só em HTTPS
    assert "content-security-policy" not in client.get("/docs").headers  # Swagger usa CDN


def test_hsts_quando_atras_de_proxy_https(client):
    r = client.get(f"{API}/saude", headers={"X-Forwarded-Proto": "https"})
    assert r.headers["strict-transport-security"].startswith("max-age=")


def test_documentacao_fechada_fora_do_modo_demo(monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", False)
    c = TestClient(create_app())
    assert c.get("/docs").status_code == 404 and c.get("/openapi.json").status_code == 404


def test_login_bloqueia_depois_de_muitas_senhas_erradas(client):
    for _ in range(10):
        assert client.post(f"{API}/auth/login", json={"conta": ANA, "senha": "errada"}).status_code == 401
    r = client.post(f"{API}/auth/login", json={"conta": ANA, "senha": get_settings().demo_senha})
    assert r.status_code == 429 and r.json()["erro"]["codigo"] == "muitas_tentativas"


def test_login_certo_nao_conta_para_o_limite(client):
    for _ in range(15):
        assert client.post(f"{API}/auth/login", json={"conta": ANA, "senha": get_settings().demo_senha}).status_code == 200


def test_falta_so_depois_do_inicio_do_horario(client, login, monkeypatch):
    corpo = {"agendamento_id": AG_ANA, "justificativa": "Não compareceu ao horário confirmado."}
    monkeypatch.setattr(prioridade_router, "utc_now", lambda: ANTES_DA_VAGA)
    r = client.post(f"{API}/faltas", headers=login(PROF_B), json=corpo)
    assert r.status_code == 409 and "ainda não começou" in r.json()["erro"]["mensagem"]
    # o paciente continua podendo cancelar antes do horário
    monkeypatch.setattr(prioridade_router, "utc_now", lambda: DEPOIS_DA_VAGA)
    assert client.post(f"{API}/faltas", headers=login(PROF_B), json=corpo).status_code == 201


def test_quem_registrou_a_falta_nao_a_mantem_na_revisao(client, login, monkeypatch):
    monkeypatch.setattr(prioridade_router, "utc_now", lambda: DEPOIS_DA_VAGA)
    h = login(PROF_B)
    falta = client.post(f"{API}/faltas", headers=h, json={
        "agendamento_id": AG_ANA, "justificativa": "Não compareceu ao horário confirmado."}).json()
    r = client.post(f"{API}/faltas/{falta['id']}/revisao", headers=h, json={"acao": "manter", "motivo": "Confirmo."})
    assert r.status_code == 403
    r = client.post(f"{API}/faltas/{falta['id']}/revisao", headers=h,
                    json={"acao": "reverter", "motivo": "Registrei por engano."})
    assert r.status_code == 200 and r.json()["estado"] == "revertida"


def test_listar_resumos_pela_clinica_destinataria_fica_na_auditoria(client, login):
    resumo = client.post(f"{API}/resumos", headers=login(PROF_B), json={"solicitacao_id": PEDIDO_ANA_B, "campos": [
        {"nome": "orientacao", "valor": "texto fictício"}, {"nome": "retorno", "valor": "outro texto"}]}).json()
    ana = login(ANA)
    assert client.post(f"{API}/resumos/{resumo['id']}/compartilhamentos", headers=ana, json={
        "clinica_destino_id": CLINICA_A, "campos_compartilhados": ["orientacao"], "finalidade": "continuidade",
        "aceite": "aceito"}).status_code == 201
    lidos = [r for r in client.get(f"{API}/resumos", headers=login(ATEND_A)).json()["itens"] if r["id"] == resumo["id"]]
    assert [c["nome"] for c in lidos[0]["campos"]] == ["orientacao"]
    eventos = client.get(f"{API}/resumos/{resumo['id']}/eventos", headers=ana).json()["itens"]
    assert [e for e in eventos if e["tipo"] == "consulta" and e["clinica_id"] == CLINICA_A]


def test_relato_de_urgencia_exige_pedido(client, login):
    r = client.post(f"{API}/urgencias", headers=login(ANA), json={})
    assert r.status_code == 422 and r.json()["erro"]["detalhes"]["campos"] == ["solicitacao_id"]
    assert "192" in r.json()["erro"]["mensagem"]
    assert client.post(f"{API}/urgencias", headers=login(ANA), json={"solicitacao_id": PEDIDO_ANA_B}).status_code == 201


def test_rotas_de_ia_tem_limite_por_usuario(client, login):
    h = login(ANA)
    codigos = [client.post(f"{API}/acessibilidade/tts", headers=h, json={"text": "olá"}).status_code for _ in range(31)]
    assert codigos[:30] == [200] * 30 and codigos[30] == 429
