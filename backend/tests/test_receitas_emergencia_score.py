"""Receitas, emergência, comparação de clínicas, score odonto-2.0 e consentimento de dados sensíveis."""
import json
from datetime import datetime, timezone

from app.modulos.emergencia import router as emergencia_mod
from app.modulos.prioridade import pesos as pesos_mod
from app.modulos.prioridade import service as score
from tests.conftest import ANA

API = "/api/v1"
A, B = "c1000000-0000-4000-8000-000000000001", "c1000000-0000-4000-8000-000000000002"
PEDIDO_ANA_B = "b1000000-0000-4000-8000-000000000002"


# ---------- receitas ----------
def test_paciente_ve_receita_assinada_com_cro_e_baixa_pdf(client, login):
    h = login(ANA)
    r = client.get(f"{API}/receitas", headers=h).json()
    assert r["total"] == 1
    rec = r["itens"][0]
    assert rec["valida"] and rec["assinante_cro"] == "CRO-SP 000102" and rec["itens"][0]["frequencia"] == "de 8 em 8 horas"
    pdf = client.get(f"{API}/receitas/{rec['id']}/pdf", headers=h)
    assert pdf.status_code == 200 and pdf.headers["content-type"] == "application/pdf" and pdf.content[:4] == b"%PDF"
    assert client.get(f"{API}/receitas/{rec['id']}/pdf", headers=login("paciente.bruno")).status_code == 404


def test_estudante_redige_so_professor_com_cro_assina_e_paciente_e_avisado(client, login):
    corpo = {"solicitacao_id": PEDIDO_ANA_B, "orientacoes": "Depois de comer.",
             "itens": [{"medicamento": "Paracetamol 750 mg", "dosagem": "1 comprimido", "via": "oral",
                        "frequencia": "de 6 em 6 horas", "duracao": "2 dias"}]}
    r = client.post(f"{API}/receitas", headers=login("funcionario.estudante.b"), json=corpo)
    assert r.status_code == 201 and r.json()["estado"] == "rascunho"
    rid = r.json()["id"]
    assert client.get(f"{API}/receitas", headers=login(ANA)).json()["total"] == 1  # rascunho não aparece
    assert client.post(f"{API}/receitas/{rid}/assinar", headers=login("funcionario.estudante.b")).status_code == 403
    a = client.post(f"{API}/receitas/{rid}/assinar", headers=login("funcionario.profissional.b"))
    assert a.status_code == 200 and a.json()["assinante_nome"] == "Dra. Joana Prado" and a.json()["data_emissao"]
    assert client.get(f"{API}/receitas", headers=login(ANA)).json()["total"] == 2
    assert any(n["titulo"] == "Nova receita" for n in client.get(f"{API}/notificacoes", headers=login(ANA)).json()["itens"])


# ---------- emergência ----------
def test_emergencia_so_mostra_clinicas_abertas_com_urgencia(client, login, monkeypatch):
    # quarta-feira 10h em São Paulo: A (24h) e B (seg-sex 8h-20h) abertas; C e D não atendem urgência
    monkeypatch.setattr(emergencia_mod, "utc_now", lambda: datetime(2026, 11, 11, 13, 0, tzinfo=timezone.utc))
    r = client.get(f"{API}/emergencia", headers=login(ANA), params={"lat": -23.5891, "lng": -46.6345}).json()
    assert r["principal"]["clinica"]["id"] == B and [x["clinica"]["id"] for x in r["alternativas"]] == [A]
    assert r["samu"] == "192" and r["sinais_graves"]
    # domingo 23h: só a A (24h)
    monkeypatch.setattr(emergencia_mod, "utc_now", lambda: datetime(2026, 11, 16, 2, 0, tzinfo=timezone.utc))
    r = client.get(f"{API}/emergencia", headers=login(ANA)).json()
    assert r["principal"]["clinica"]["id"] == A and r["principal"]["aberta_ate"] == "24 horas" and r["alternativas"] == []
    assert client.get(f"{API}/agendamentos", headers=login(ANA)).json()["total"] == 1  # não criou agendamento


# ---------- comparação ----------
def test_comparacao_traz_distancia_valor_tipo_e_proximos_horarios(client, login):
    d = client.get(f"{API}/clinicas-comparacao", headers=login(ANA), params={"lat": -23.5891, "lng": -46.6345}).json()
    porid = {i["clinica"]["id"]: i for i in d["itens"]}
    assert porid[B]["clinica"]["valor_consulta"] == 60.0 and porid[B]["clinica"]["tipo_instituicao"] == "privada"
    assert porid[B]["distancia_km"] is not None and porid[B]["proximos_horarios"]
    assert porid[A]["clinica"]["horarios_funcionamento"]["seg"] == ["07:00", "19:00"]


# ---------- score odonto-2.0 ----------
def test_score_renda_deficiencia_e_faltas():
    p = pesos_mod.carregar("odonto-2.0")
    agora = datetime(2026, 11, 8, tzinfo=timezone.utc)
    pobre_defic = score.calcular(score.Entrada("a", "c", agora, faixa_renda="ate_1_salario_minimo", deficiencia=True), p, agora)
    faltoso = score.calcular(score.Entrada("b", "c", agora, faixa_renda="ate_1_salario_minimo", faltas_confirmadas=2), p, agora)
    alta = score.calcular(score.Entrada("c", "c", agora, faixa_renda="acima_de_3_salarios_minimos"), p, agora)
    assert pobre_defic.score == 50.0 and faltoso.score == 0.0 and alta.score == 0.0
    assert {c.nome for c in pobre_defic.componentes} == {"socioeconomico", "falta_verificada", "deficiencia"}
    urgente = score.calcular(score.Entrada("d", "c", agora, urgencia="avaliada"), p, agora)
    assert score.ordenar([pobre_defic, urgente])[0].entrada.solicitacao_id == "d"


def test_renda_e_deficiencia_exigem_consentimento_e_contam_no_score(client, login):
    h = login("paciente.diego")
    base = {"socioeconomico": {"informado": True, "faixa_renda_familiar": "1_a_2_salarios_minimos"}, "possui_deficiencia": True,
            "tipo_deficiencia": "motora"}
    assert client.put(f"{API}/perfil", headers=h, json=base).status_code == 422
    r = client.put(f"{API}/perfil", headers=h, json={**base, "consentimento_dados_sensiveis": True})
    assert r.status_code == 200 and r.json()["possui_deficiencia"] is True
    s = client.get(f"{API}/meu-score", headers=h).json()
    assert s["versao_pesos"] == "odonto-2.0" and s["score"] == 40.0  # 20 (renda) + 20 (deficiência)
    retirado = client.put(f"{API}/perfil", headers=h, json={"consentimento_dados_sensiveis": False})
    assert retirado.json()["possui_deficiencia"] is None and retirado.json()["socioeconomico"]["informado"] is False
    assert client.get(f"{API}/meu-score", headers=h).json()["score"] == 0.0


# ---------- IA: agendar do começo ao fim e emergência pela conversa ----------
def test_ia_compara_agenda_e_aciona_emergencia_so_com_ferramentas(client, login, db):
    from app.core.auth import get_actor
    from app.modulos.acessibilidade.ferramentas import ToolContext, run_tool
    actor = get_actor(token=login("paciente.carla")["Authorization"].split()[1], db=db)
    comp, _ = run_tool("comparar_clinicas", {"ordenar_por": "data"}, ToolContext(db=db, actor=actor))
    primeira = json.loads(comp)["clinicas"][0]
    assert primeira["proximos_horarios"]
    h = primeira["proximos_horarios"][0]
    args = {"clinica_id": primeira["clinica_id"], "especialidade": "clinica_integrada", "descricao_administrativa": "dor ao mastigar",
            "telefone_contato": "(11) 91234-5678", "vaga_id": h["vaga_id"]}
    negado, erro = run_tool("pedir_atendimento", args, ToolContext(db=db, actor=actor, mensagem_usuario="acho que sim, talvez"))
    assert erro and json.loads(negado)["codigo"] == "confirmacao_necessaria"
    feito, erro = run_tool("pedir_atendimento", args, ToolContext(db=db, actor=actor, mensagem_usuario="sim"))
    assert not erro and json.loads(feito)["horario_pedido"], feito
    emerg, erro = run_tool("acionar_emergencia", {}, ToolContext(db=db, actor=actor, mensagem_usuario="meu dente quebrou"))
    assert not erro and "sinais_graves" in json.loads(emerg)
    rec, _ = run_tool("ver_minhas_receitas", {}, ToolContext(db=db, actor=get_actor(token=login(ANA)["Authorization"].split()[1], db=db)))
    assert "NUNCA" not in rec and json.loads(rec)["receitas"][0]["itens"][0]["medicamento"].startswith("Ibuprofeno")
