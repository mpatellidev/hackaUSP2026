"""Testes de ponta a ponta da API com a IA (Gemini e Claude) substituída por fakes roteirizados."""

import copy
from datetime import timedelta
from types import SimpleNamespace

import pytest
from anthropic.types.beta import BetaMessage
from fastapi.testclient import TestClient
from google.genai import types as gtypes

from app.ai.engines.claude_engine import ClaudeEngine
from app.ai.engines.factory import get_chat_engine
from app.ai.engines.gemini_engine import GeminiEngine
from app.clock import now_local
from app.main import app
from app.scheduling.factory import get_scheduling_provider
from app.scheduling.mock_provider import MockSchedulingProvider


class Scripted:
    """Devolve respostas roteirizadas e registra cópias das requisições."""

    def __init__(self, script):
        self.script = list(script)
        self.calls: list[dict] = []

    def __call__(self, **kwargs):
        self.calls.append(copy.deepcopy(kwargs))
        return self.script.pop(0)


def fake_gemini(script) -> tuple[SimpleNamespace, Scripted]:
    s = Scripted(script)
    return SimpleNamespace(models=SimpleNamespace(generate_content=s)), s


def fake_anthropic(script) -> tuple[SimpleNamespace, Scripted]:
    s = Scripted(script)
    return SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(create=s))), s


def g_resp(parts: list[dict]) -> gtypes.GenerateContentResponse:
    return gtypes.GenerateContentResponse.model_validate(
        {"candidates": [{"content": {"role": "model", "parts": parts}, "finish_reason": "STOP"}]}
    )


def c_msg(content: list[dict], stop_reason: str) -> BetaMessage:
    return BetaMessage.model_validate({
        "id": "msg_test", "type": "message", "role": "assistant", "model": "fake",
        "content": content, "stop_reason": stop_reason, "stop_sequence": None,
        "usage": {"input_tokens": 1, "output_tokens": 1},
    })


@pytest.fixture
def scheduling():
    return MockSchedulingProvider()


@pytest.fixture
def client(scheduling):
    app.dependency_overrides[get_scheduling_provider] = lambda: scheduling
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _login(client, email="maria@exemplo.com"):
    r = client.post("/auth/login", json={"email": email, "senha": "senha123"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _setup_user(client, email):
    h = _login(client, email)
    client.put("/me/profile", headers=h, json={
        "escolaridade": "fundamental_completo", "faixa_etaria": "30_59",
        "deficiencias": [], "prefere_audio": True})
    return h, str(client.get("/auth/me", headers=h).json()["id"])


def _first_slot(scheduling):
    hoje = now_local().date()
    slot = scheduling.find_available_slots("exame-sangue", hoje, hoje + timedelta(days=10))[0]
    return slot.inicio.isoformat(timespec="minutes")


# ---------------------------------------------------------------- auth / perfil

def test_login_e_rotas_protegidas(client):
    assert client.post("/auth/login", json={"email": "maria@exemplo.com", "senha": "x"}).status_code == 401
    assert client.get("/me/profile").status_code == 401
    h = _login(client)
    assert client.get("/auth/me", headers=h).json()["nome"] == "Maria"


def test_perfil_persistido(client):
    h = _login(client, "joao@exemplo.com")
    assert client.get("/me/profile", headers=h).status_code == 404
    body = {"escolaridade": "medio_completo", "faixa_etaria": "60_mais",
            "deficiencias": ["nenhuma", "visual"], "prefere_audio": False}
    r = client.put("/me/profile", json=body, headers=h)
    assert r.status_code == 200
    assert r.json()["deficiencias"] == ["visual"]
    assert r.json()["ui_prefs"]["auto_play_audio"] is True
    h2 = _login(client, "joao@exemplo.com")  # novo login -> perfil continua salvo
    assert "Deficiência visual" in client.get("/me/profile", headers=h2).json()["resumo"]


def test_chat_exige_perfil(client):
    h = _login(client, "maria@exemplo.com")
    app.dependency_overrides[get_chat_engine] = lambda: GeminiEngine("", "x", client=fake_gemini([])[0])
    assert client.post("/chat", headers=h, json={"message": "oi"}).status_code == 409


# ---------------------------------------------------------------- Gemini

def test_gemini_agenda_com_funcoes_audio_e_botoes(client, scheduling):
    h, uid = _setup_user(client, "ana@exemplo.com")
    inicio = _first_slot(scheduling)
    fake, calls = fake_gemini([
        g_resp([{"function_call": {"id": "c1", "name": "criar_agendamento",
                                   "args": {"servico_id": "exame-sangue", "inicio": inicio}},
                 "thought_signature": "AP9hYmM="}]),
        g_resp([
            {"function_call": {"id": "c2", "name": "explicar_em_audio",
                               "args": {"texto": "Seu exame está marcado. Venha em jejum."}}},
            {"function_call": {"id": "c3", "name": "oferecer_opcoes",
                               "args": {"opcoes": [{"rotulo": "Entendi", "valor": "Entendi"}]}}},
        ]),
        g_resp([{"text": "Pronto! Seu exame está marcado."}]),
    ])
    app.dependency_overrides[get_chat_engine] = lambda: GeminiEngine("", "fake-model", client=fake)

    r = client.post("/chat", headers=h, json={"message": "Sim, pode marcar"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["messages"][0]["text"] == "Pronto! Seu exame está marcado."
    assert data["messages"][0]["audio"] == {"text": "Seu exame está marcado. Venha em jejum.", "url": None}
    assert data["quick_replies"] == [{"label": "Entendi", "value": "Entendi"}]
    assert len(scheduling.list_appointments(uid)) == 1

    # perfil no system_instruction; as 2 respostas de função voltam numa única mensagem
    assert "Ensino fundamental completo" in calls.calls[0]["config"].system_instruction
    last = calls.calls[2]["contents"][-1]
    assert last.role == "user" and [p.function_response.id for p in last.parts] == ["c2", "c3"]
    assert last.parts[0].function_response.response["output"]["ok"] is True

    # 2ª rodada: histórico recarregado do banco, com thought_signature intacta
    fake2, calls2 = fake_gemini([g_resp([{"text": "De nada!"}])])
    app.dependency_overrides[get_chat_engine] = lambda: GeminiEngine("", "fake-model", client=fake2)
    r2 = client.post("/chat", headers=h, json={"message": "Obrigada", "conversation_id": data["conversation_id"]})
    assert r2.json()["messages"][0]["text"] == "De nada!"
    contents = calls2.calls[0]["contents"]
    assert len(contents) == 7  # user, model, fn_resp, model, fn_resp, model, user
    assert contents[1].parts[0].thought_signature == b"\x00\xffabc"


def test_gemini_erro_de_ferramenta_vai_como_error(client):
    h, _ = _setup_user(client, "maria@exemplo.com")
    fake, calls = fake_gemini([
        g_resp([{"function_call": {"id": "c1", "name": "cancelar_agendamento", "args": {"agendamento_id": "nao-existe"}}}]),
        g_resp([{"text": "Não encontrei esse agendamento."}]),
    ])
    app.dependency_overrides[get_chat_engine] = lambda: GeminiEngine("", "fake-model", client=fake)
    r = client.post("/chat", headers=h, json={"message": "cancela"})
    assert r.status_code == 200
    resp = calls.calls[1]["contents"][-1].parts[0].function_response.response
    assert "erro" in resp["error"]


def test_gemini_sem_chave_retorna_503(client):
    h, _ = _setup_user(client, "joao@exemplo.com")
    app.dependency_overrides[get_chat_engine] = lambda: GeminiEngine(api_key="", model="x")
    r = client.post("/chat", headers=h, json={"message": "oi"})
    assert r.status_code == 503
    assert "não está configurado" in r.json()["detail"]


# ---------------------------------------------------------------- Claude (alternativo)

def test_claude_agenda_com_ferramentas(client, scheduling):
    h, uid = _setup_user(client, "joao@exemplo.com")
    inicio = _first_slot(scheduling)
    fake, calls = fake_anthropic([
        c_msg([{"type": "tool_use", "id": "t1", "name": "criar_agendamento",
                "input": {"servico_id": "exame-sangue", "inicio": inicio}}], "tool_use"),
        c_msg([{"type": "text", "text": "Marcado!"}], "end_turn"),
    ])
    app.dependency_overrides[get_chat_engine] = lambda: ClaudeEngine("k", "fake", client=fake)
    r = client.post("/chat", headers=h, json={"message": "Pode marcar"})
    assert r.status_code == 200, r.text
    assert r.json()["messages"][0]["text"] == "Marcado!"
    assert len(scheduling.list_appointments(uid)) == 1
    assert "Ensino fundamental completo" in calls.calls[0]["system"][1]["text"]
    assert calls.calls[1]["messages"][-1]["content"][0]["type"] == "tool_result"


def test_gemini_cai_para_modelo_reserva_quando_sobrecarregado(client):
    from google.genai import errors as gerrors

    h, _ = _setup_user(client, "ana@exemplo.com")
    overloaded = gerrors.ServerError(503, {"error": {"code": 503, "message": "high demand", "status": "UNAVAILABLE"}})
    used: list[str] = []

    def generate_content(model, contents, config):
        used.append(model)
        if model == "principal":
            raise overloaded
        return g_resp([{"text": "Oi!"}])

    fake = SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))
    engine = GeminiEngine("", "principal", fallback_models=["reserva"], client=fake, retry_delay=0)
    app.dependency_overrides[get_chat_engine] = lambda: engine
    r = client.post("/chat", headers=h, json={"message": "oi"})
    assert r.status_code == 200 and r.json()["messages"][0]["text"] == "Oi!"
    assert used == ["principal", "principal", "reserva"]
