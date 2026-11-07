from datetime import datetime, timedelta, timezone

import pytest

from app.modulos.prioridade import pesos as pesos_mod
from app.modulos.prioridade import service
from app.modulos.prioridade.service import Entrada

AGORA = datetime(2026, 11, 7, 12, 0, tzinfo=timezone.utc)
P = pesos_mod.carregar("demo-0.1")


def ent(id_, dias=0, **kw):
    return Entrada(solicitacao_id=id_, clinica_id="c", criado_em=AGORA - timedelta(days=dias), **kw)


def fila(*entradas):
    return [i.entrada.solicitacao_id for i in service.ordenar([service.calcular(e, P, AGORA) for e in entradas])]


def test_urgencia_avaliada_precede_qualquer_score_mesmo_com_falta():
    forte = ent("forte", dias=30, faixa_renda="ate_1_salario_minimo", necessidade_academica=True)
    urgente = ent("urgente", dias=0, urgencia="avaliada", faltas_confirmadas=3)
    assert service.calcular(urgente, P, AGORA).score < service.calcular(forte, P, AGORA).score
    assert fila(forte, urgente)[0] == "urgente"


def test_urgencia_autodeclarada_nao_reordena_so_sinaliza():
    a, b = ent("a", dias=5), ent("b", dias=1, urgencia="autodeclarada")
    assert fila(a, b) == ["a", "b"]
    item = service.calcular(b, P, AGORA)
    assert item.sinalizacoes == [service.SINAL_AUTODECLARADA] and not item.urgencia_avaliada


def test_desempate_estavel_por_criado_em_depois_id():
    mesmo = [ent("z", dias=3), ent("a", dias=3), ent("m", dias=3)]
    assert fila(*mesmo) == ["a", "m", "z"]
    assert fila(*reversed(mesmo)) == ["a", "m", "z"]
    # mesmo score (5), datas diferentes -> o pedido mais antigo vem primeiro
    antigo, novo = ent("antigo", dias=5), ent("novo", dias=0, faixa_renda="2_a_3_salarios_minimos")
    assert service.calcular(antigo, P, AGORA).score == service.calcular(novo, P, AGORA).score
    assert fila(novo, antigo) == ["antigo", "novo"]


def test_socioeconomico_desconhecido_vale_zero_com_valor_nulo():
    comp = {c.nome: c for c in service.calcular(ent("x", faixa_renda=None), P, AGORA).componentes}["socioeconomico"]
    assert comp.valor is None and "desconhecido" in comp.fonte
    assert service.calcular(ent("x"), P, AGORA).score == 0.0
    assert service.calcular(ent("y", faixa_renda="faixa_inexistente"), P, AGORA).score == 0.0


def test_componentes_explicaveis_e_soma():
    it = service.calcular(ent("x", dias=10, faixa_renda="ate_1_salario_minimo", necessidade_academica=True,
                              faltas_confirmadas=1), P, AGORA)
    vals = {c.nome: c.valor for c in it.componentes}
    assert vals == {"socioeconomico": 15, "necessidade_academica": 10, "tempo_espera": 10, "falta_verificada": -10}
    assert it.score == 25.0 and all(c.fonte and c.peso == 1.0 for c in it.componentes)


def test_tetos_de_tempo_e_de_faltas():
    it = service.calcular(ent("x", dias=400, faltas_confirmadas=99), P, AGORA)
    vals = {c.nome: c.valor for c in it.componentes}
    assert vals["tempo_espera"] == 30 and vals["falta_verificada"] == -30


def test_pesos_configuraveis_mudam_o_score(tmp_path, monkeypatch):
    import json
    dados = json.loads((pesos_mod.DIR / "demo-0.1.json").read_text())
    dados["versao"] = "demo-9.9"
    dados["tempo_espera"]["peso"] = 2.0
    monkeypatch.setattr(pesos_mod, "DIR", tmp_path)
    (tmp_path / "demo-9.9.json").write_text(json.dumps(dados))
    p2 = pesos_mod.carregar("demo-9.9")
    e = ent("x", dias=10)
    assert service.calcular(e, p2, AGORA).score == 2 * service.calcular(e, P, AGORA).score and p2.versao == "demo-9.9"


def test_pesos_invalidos_dao_erro_claro(tmp_path, monkeypatch):
    monkeypatch.setattr(pesos_mod, "DIR", tmp_path)
    (tmp_path / "ruim.json").write_text('{"versao": "ruim", "aviso": "x", "socioeconomico": {}}')
    with pytest.raises(pesos_mod.PesosInvalidos, match="socioeconomico"):
        pesos_mod.carregar("ruim")
    with pytest.raises(pesos_mod.PesosInvalidos, match="desconhecida"):
        pesos_mod.carregar("nao-existe")
