"""Regras críticas do paciente (odontologia): ranqueamento, referenciamento, score, fila e a jornada pela API."""
from datetime import datetime, timezone

from app.core.config import get_settings
from app.modulos.prioridade import pesos as pesos_mod
from app.modulos.prioridade import service as score
from app.modulos.ranqueamento import service as rq
from tests.conftest import ANA

API = "/api/v1"
D = "c1000000-0000-4000-8000-000000000004"
AGORA = datetime(2026, 11, 7, 12, tzinfo=timezone.utc)


def _cand(id_, **kw):
    base = dict(clinica_id=id_, nome=id_, recebendo_pedidos=True, especialidades=("endodontia",), latitude=-23.56,
                longitude=-46.65, tipo_instituicao="publica", transportes=("metro",), turnos=("manha",), acessivel=True,
                horarios_livres=1)
    return rq.Candidata(**{**base, **kw})


# ---------- ranqueamento ----------
def test_ranqueamento_prefere_perto_publica_com_metro_e_explica():
    p = rq.Preferencias(latitude=-23.56, longitude=-46.65, preferencia_instituicao="publica", transportes=("metro",),
                        turnos=("manha",))
    perto = _cand("perto")
    longe = _cand("longe", latitude=-23.70, longitude=-46.80)
    privada = _cand("privada", tipo_instituicao="privada")
    r = rq.ranquear(p, [longe, privada, perto], "endodontia")
    assert [x.clinica_id for x in r] == ["perto", "privada", "longe"]
    assert "É pública, como você prefere" in r[0].motivos and any("metrô" in m for m in r[0].motivos)


def test_ranqueamento_exclui_fechada_sem_especialidade_e_longe_demais():
    p = rq.Preferencias(latitude=-23.56, longitude=-46.65, distancia_max_km=5)
    r = rq.ranquear(p, [_cand("fechada", recebendo_pedidos=False), _cand("sem", especialidades=("protese",)),
                        _cand("campinas", latitude=-22.82, longitude=-47.07), _cand("ok")], "endodontia")
    assert [x.clinica_id for x in r] == ["ok"]


# ---------- score e fila ----------
def test_score_risco_e_assiduidade_e_urgencia_sempre_antes():
    p = pesos_mod.carregar("odonto-1.0")
    base = dict(clinica_id="c", criado_em=AGORA)
    moderado = score.calcular(score.Entrada("a", risco_clinico="moderado", comparecimentos=2, **base), p, AGORA)
    faltoso = score.calcular(score.Entrada("b", risco_clinico="alto", faltas_confirmadas=3, **base), p, AGORA)
    urgente = score.calcular(score.Entrada("c", risco_clinico="urgente", faltas_confirmadas=3, **base), p, AGORA)
    assert {c.nome for c in moderado.componentes} >= {"risco_clinico", "assiduidade", "falta_verificada"}
    assert moderado.score == 25.0 and faltoso.score == -15.0  # 15 + 2×5 ; 30 − 3×15
    ordem = [i.entrada.solicitacao_id for i in score.ordenar([moderado, faltoso, urgente])]
    assert ordem == ["c", "a", "b"]  # urgente validado vem antes mesmo com faltas


# ---------- referenciamento ----------
def test_triagem_da_ana_foi_referenciada_para_quem_ensina_canal(client, login):
    h = login(ANA)
    refs = client.get(f"{API}/referenciamentos", headers=h).json()["itens"]
    assert len(refs) == 1 and refs[0]["estado"] == "aguardando_paciente"
    r = refs[0]
    assert r["clinica_destino"]["id"] == D and r["motivo"] == "fora_do_escopo" and r["horario_inicio"]
    assert any(not c["apta"] for c in r["candidatos"])  # auditoria mostra quem não podia e por quê
    avisos = client.get(f"{API}/notificacoes", headers=h).json()
    assert avisos["nao_lidas"] >= 1 and "outra clínica" in avisos["itens"][0]["titulo"]


def test_aceitar_encaminhamento_cria_pedido_pede_horario_e_libera_diagnostico(client, login):
    h = login(ANA)
    ref = client.get(f"{API}/referenciamentos", headers=h).json()["itens"][0]
    r = client.post(f"{API}/referenciamentos/{ref['id']}/aceitar", headers=h)
    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "aceito" and r.json()["solicitacao_destino_id"]
    pedido = client.get(f"{API}/solicitacoes/{r.json()['solicitacao_destino_id']}", headers=h).json()
    assert pedido["clinica_id"] == D and pedido["estado"] == "aguardando_confirmacao" and pedido["trilha"] == "estruturada"
    acessos = client.get(f"{API}/prontuario/acessos", headers=h).json()["itens"]
    assert any(a["acao"] == "compartilhamento" for a in acessos)
    assert client.post(f"{API}/referenciamentos/{ref['id']}/aceitar", headers=h).status_code == 409


# ---------- cadastro, perfil e sugestões ----------
def test_cadastro_com_cpf_e_login_por_cpf(client):
    r = client.post(f"{API}/auth/cadastro", json={"nome": "Rita Gomes", "cpf": "529.982.247-25",
                                                  "email": "rita@example.com", "senha": "senha-forte-1"})
    assert r.status_code == 201, r.text
    assert client.post(f"{API}/auth/entrar", json={"login": "52998224725", "senha": "senha-forte-1"}).status_code == 200
    invalido = client.post(f"{API}/auth/cadastro", json={"nome": "Xavier", "cpf": "529.982.247-26", "email": "x@example.com", "senha": "senha-forte-1"})
    assert invalido.status_code == 422
    repetido = client.post(f"{API}/auth/cadastro", json={"nome": "Yara", "cpf": "52998224725", "email": "y@example.com", "senha": "senha-forte-1"})
    assert repetido.status_code == 409 and repetido.json()["erro"]["codigo"] == "cpf_em_uso"
    ana = client.post(f"{API}/auth/entrar", json={"login": "000.000.001-91", "senha": get_settings().demo_senha})
    assert ana.status_code == 200 and ana.json()["usuario"]["nome_exibicao"] == "Ana Martins"


def test_perfil_endereco_preferencias_modo_e_sugestoes(client, login):
    h = login("paciente.bruno")
    corpo = {"cep": "04019-030", "numero": "120", "bairro": "Vila Mariana", "preferencia_instituicao": "privada",
             "transportes": ["metro"], "turnos": ["noite"], "distancia_max_km": 15}
    r = client.put(f"{API}/perfil", headers=h, json=corpo)
    assert r.status_code == 200, r.text
    assert r.json()["cadastro_completo"] is True and r.json()["latitude"] is not None
    assert client.put(f"{API}/perfil/modo", headers=h, json={"modo": "conversa"}).json()["modo_atendimento"] == "conversa"
    assert client.get(f"{API}/perfil", headers=h).json()["cep"] == "04019030"  # modo não apagou o resto
    s = client.get(f"{API}/universidades/sugestoes", headers=h).json()
    assert s["usou_localizacao"] and s["itens"][0]["clinica"]["tipo_instituicao"] == "privada"
    assert all(i["distancia_km"] <= 15 for i in s["itens"])  # Campinas fica de fora
    assert s["itens"][0]["motivos"]


# ---------- trilha, remarcar, prontuário, atendente ----------
def test_trilha_estruturada_comeca_pela_triagem(client, login):
    h = login("paciente.diego")
    base = {"clinica_id": D, "publico_alvo": "adultos", "descricao_administrativa": "dor de dente", "trilha": "estruturada"}
    assert client.post(f"{API}/solicitacoes", headers=h, json={**base, "especialidade": "endodontia"}).status_code == 422
    assert client.post(f"{API}/solicitacoes", headers=h, json={**base, "especialidade": "triagem"}).status_code == 201


def test_remarcar_troca_horario_sem_penalidade(client, login):
    h = login(ANA)
    ag = client.get(f"{API}/agendamentos", headers=h).json()["itens"][0]
    livres = client.get(f"{API}/clinicas/{ag['clinica']['id']}/horarios", headers=h,
                        params={"especialidade": ag["vaga"]["especialidade"]}).json()["itens"]
    nova = next(x for x in livres if x["vaga_id"] != ag["vaga_id"])
    r = client.post(f"{API}/agendamentos/{ag['id']}/remarcar", headers=h, json={"vaga_id": nova["vaga_id"]})
    assert r.status_code == 200, r.text
    pedido = client.get(f"{API}/solicitacoes/{ag['solicitacao_id']}", headers=h).json()
    assert pedido["estado"] == "aguardando_confirmacao"
    score = client.get(f"{API}/meu-score", headers=h).json()
    assert score["faltas_sem_aviso"] == 0 and score["cancelamentos_com_aviso"] == 1


def test_prontuario_do_paciente_decifrado_e_acesso_registrado(client, login):
    h = login(ANA)
    p = client.get(f"{API}/prontuario", headers=h).json()
    assert p["itens"][0]["tipo"] == "triagem" and "dente 46" in p["itens"][0]["conteudo"]
    assert p["itens"][0]["validado_por_nome"] == "Dra. Joana Prado"
    assert any(a["acao"] == "consulta" and a["quem"] == "Você" for a in client.get(f"{API}/prontuario/acessos", headers=h).json()["itens"])
    assert client.get(f"{API}/pacientes/{'a1000000-0000-4000-8000-000000000001'}/prontuario", headers=login("funcionario.atendimento.a")).status_code == 200
    estranho = login("funcionario.coordenacao.c")  # clínica C: a Ana nunca pediu lá
    assert client.get(f"{API}/pacientes/a1000000-0000-4000-8000-000000000001/prontuario", headers=estranho).status_code == 404


def test_estudante_escreve_professor_valida_e_indexador_decide(client, login):
    pedido = "b1000000-0000-4000-8000-000000000002"  # Ana, clínica Vila Mariana
    r = client.post(f"{API}/prontuario", headers=login("funcionario.estudante.b"), json={
        "solicitacao_id": pedido, "tipo": "plano_tratamento", "conteudo": "Restauração simples no dente 11.",
        "risco_clinico": "baixo", "especialidades": ["clinica_integrada"], "procedimentos": ["restauracao_resina"]})
    assert r.status_code == 201, r.text
    assert client.post(f"{API}/prontuario/{r.json()['id']}/validar", headers=login("funcionario.estudante.b")).status_code == 403
    v = client.post(f"{API}/prontuario/{r.json()['id']}/validar", headers=login("funcionario.profissional.b"))
    assert v.status_code == 200 and v.json()["validado_por_nome"] == "Dra. Joana Prado"


def test_atendente_humano_avisa_a_equipe_e_mostra_telefone(client, login):
    r = client.post(f"{API}/atendimento-humano", headers=login(ANA), json={"mensagem": "Não entendi o encaminhamento"})
    assert r.status_code == 200 and r.json()["contatos"]


def test_ferramentas_da_ia_usam_os_servicos_e_exigem_confirmacao(client, login, db):
    import json
    from app.core.auth import get_actor
    from app.modulos.acessibilidade.ferramentas import ToolContext, run_tool
    token = login(ANA)["Authorization"].split()[1]
    actor = get_actor(token=token, db=db)
    leitura, erro = run_tool("ver_minha_prioridade", {}, ToolContext(db=db, actor=actor, mensagem_usuario="qual minha prioridade?"))
    assert not erro and "score" in json.loads(leitura)
    refs, _ = run_tool("ver_meus_encaminhamentos", {}, ToolContext(db=db, actor=actor))
    ref_id = json.loads(refs)["encaminhamentos"][0]["id"]
    sem, erro = run_tool("responder_encaminhamento", {"referenciamento_id": ref_id, "aceitar": True},
                         ToolContext(db=db, actor=actor, mensagem_usuario="me explica melhor"))
    assert erro and json.loads(sem)["codigo"] == "confirmacao_necessaria"
    com, erro = run_tool("responder_encaminhamento", {"referenciamento_id": ref_id, "aceitar": True},
                         ToolContext(db=db, actor=actor, mensagem_usuario="sim"))
    assert not erro and json.loads(com)["estado"] == "aceito"
