"""Serviço PURO de score e fila (sem banco, sem HTTP). Regras do contrato §9.3.

Ordenação: (urgencia_avaliada desc, score desc, criado_em asc, id asc).
- Só urgência AVALIADA por profissional (urgencia_confirmada) precede qualquer score.
- Urgência autodeclarada aguardando avaliação NÃO reordena: só gera sinalização para revisão humana.
- Campo desconhecido (renda não informada) vale 0 e aparece com valor=null no componente.
- Empate total é resolvido por criado_em (mais antigo primeiro) e depois por id: ordem estável e determinística.
"""
from dataclasses import dataclass, field
from datetime import datetime

from app.modulos.prioridade.pesos import Pesos

SINAL_AUTODECLARADA = "urgencia_autodeclarada_aguardando_avaliacao"


@dataclass(frozen=True)
class Entrada:
    solicitacao_id: str
    clinica_id: str
    criado_em: datetime            # com fuso
    urgencia: str = "nenhuma"      # avaliada | autodeclarada | nenhuma
    faixa_renda: str | None = None  # None = não informado / prefiro não informar
    necessidade_academica: bool = False
    faltas_confirmadas: int = 0


@dataclass(frozen=True)
class Componente:
    nome: str
    valor: float | None
    peso: float
    fonte: str


@dataclass(frozen=True)
class Item:
    entrada: Entrada
    urgencia_avaliada: bool
    score: float
    componentes: list[Componente]
    sinalizacoes: list[str] = field(default_factory=list)


def calcular(e: Entrada, pesos: Pesos, agora: datetime) -> Item:
    s, a, t, f = pesos.socioeconomico, pesos.necessidade_academica, pesos.tempo_espera, pesos.falta_verificada

    if e.faixa_renda is not None and e.faixa_renda in s["faixas"]:
        v_soc, fonte_soc = float(s["faixas"][e.faixa_renda]), "perfil.socioeconomico"
    else:
        v_soc, fonte_soc = None, "perfil.socioeconomico (desconhecido = 0)"
    v_aca = float(a["valor_se_correspondente"]) if e.necessidade_academica else 0.0
    dias = max(0, min((agora - e.criado_em).days, t["teto_dias"]))
    v_tmp = float(dias * t["pontos_por_dia"])
    n_faltas = min(e.faltas_confirmadas, f["teto_faltas"])
    v_fal = float(n_faltas * f["valor_por_falta_confirmada"])

    comps = [
        Componente("socioeconomico", v_soc, s["peso"], fonte_soc),
        Componente("necessidade_academica", v_aca, a["peso"], "cenarios"),
        Componente("tempo_espera", v_tmp, t["peso"], "solicitacao.criado_em"),
        Componente("falta_verificada", v_fal, f["peso"], "faltas (somente confirmadas)"),
    ]
    score = round(sum((c.valor or 0.0) * c.peso for c in comps), 1)
    sinais = [SINAL_AUTODECLARADA] if e.urgencia == "autodeclarada" else []
    return Item(e, e.urgencia == "avaliada", score, comps, sinais)


def ordenar(itens: list[Item]) -> list[Item]:
    return sorted(itens, key=lambda i: (not i.urgencia_avaliada, -i.score, i.entrada.criado_em, i.entrada.solicitacao_id))
