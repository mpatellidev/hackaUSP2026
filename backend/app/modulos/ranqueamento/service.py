"""Ranqueamento de universidades parceiras (PURO: sem banco nem HTTP; pesos em config.json).

Para cada clínica: pontos de 0 a 100 em cada critério × peso. Fica de fora a clínica que não recebe pedidos,
que não oferece a especialidade ou que passa da distância máxima do paciente. Cada resultado explica os motivos
em linguagem simples (para o painel e para a assistente).
"""
import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from app.modulos.solicitacoes.localizacao import distancia_km

CONFIG = Path(__file__).parent / "config.json"


@lru_cache(maxsize=1)
def config() -> dict:
    dados = json.loads(CONFIG.read_text(encoding="utf-8"))
    soma = round(sum(dados["pesos"].values()), 6)
    if soma != 1:
        raise ValueError(f"Os pesos do ranqueamento devem somar 1 (somam {soma}).")
    return dados


@dataclass(frozen=True)
class Preferencias:
    latitude: float | None = None
    longitude: float | None = None
    preferencia_instituicao: str | None = None  # publica | privada | tanto_faz
    distancia_max_km: float | None = None
    transportes: tuple[str, ...] = ()
    turnos: tuple[str, ...] = ()
    precisa_acessibilidade: bool = False


@dataclass(frozen=True)
class Candidata:
    clinica_id: str
    nome: str
    recebendo_pedidos: bool
    especialidades: tuple[str, ...]
    latitude: float | None
    longitude: float | None
    tipo_instituicao: str | None
    transportes: tuple[str, ...]
    turnos: tuple[str, ...]
    acessivel: bool | None
    horarios_livres: int = 0


@dataclass
class Resultado:
    clinica_id: str
    nome: str
    pontos: float
    distancia_km: float | None
    criterios: dict[str, float] = field(default_factory=dict)
    motivos: list[str] = field(default_factory=list)


def _km(p: Preferencias, c: Candidata) -> float | None:
    if None in (p.latitude, p.longitude, c.latitude, c.longitude):
        return None
    return round(distancia_km(p.latitude, p.longitude, c.latitude, c.longitude), 1)


def ranquear(p: Preferencias, candidatas: list[Candidata], especialidade: str | None = None) -> list[Resultado]:
    cfg = config()
    pesos, zero_km, equiv = cfg["pesos"], cfg["distancia_km_zero_pontos"], cfg["transporte_equivalente"]
    saida: list[Resultado] = []
    for c in candidatas:
        if not c.recebendo_pedidos or (especialidade and especialidade not in c.especialidades):
            continue
        km = _km(p, c)
        if km is not None and p.distancia_max_km and km > p.distancia_max_km:
            continue
        crit, motivos = {}, []

        crit["distancia"] = 50.0 if km is None else max(0.0, 100.0 * (1 - km / zero_km))
        if km is not None:
            motivos.append(f"Fica a {str(km).replace('.', ',')} km de você")

        pref = p.preferencia_instituicao
        if not pref or pref == "tanto_faz":
            crit["preferencia_instituicao"] = 100.0
        else:
            crit["preferencia_instituicao"] = 100.0 if c.tipo_instituicao == pref else 0.0
            if c.tipo_instituicao == pref:
                motivos.append("É pública, como você prefere" if pref == "publica" else "É particular, como você prefere")

        if not p.transportes:
            crit["transporte"] = 100.0
        elif "a_pe" in p.transportes and km is not None and km <= 2:
            crit["transporte"] = 100.0
            motivos.append("Dá para ir a pé")
        else:
            servidos = {t for tp in p.transportes for t in equiv.get(tp, [])}
            comum = servidos & set(c.transportes)
            crit["transporte"] = 100.0 if comum else 0.0
            nomes = {"metro": "metrô", "trem": "trem", "onibus": "ônibus", "estacionamento": "estacionamento"}
            if comum:
                motivos.append("Dá para chegar de " + " ou ".join(nomes[t] for t in sorted(comum)))

        if not p.turnos:
            crit["turno"] = 100.0
        else:
            comum_t = set(p.turnos) & set(c.turnos)
            crit["turno"] = 100.0 * len(comum_t) / len(p.turnos)
            nomes_t = {"manha": "de manhã", "tarde": "à tarde", "noite": "à noite"}
            if comum_t:
                motivos.append("Atende " + " e ".join(nomes_t[t] for t in ("manha", "tarde", "noite") if t in comum_t))

        if p.precisa_acessibilidade:
            crit["acessibilidade"] = 100.0 if c.acessivel else 0.0
            if c.acessivel:
                motivos.append("Tem acesso sem degraus")
        else:
            crit["acessibilidade"] = 100.0

        crit["disponibilidade"] = min(100.0, c.horarios_livres * 34.0)
        if c.horarios_livres:
            motivos.append("Tem horário livre" if c.horarios_livres == 1 else f"Tem {c.horarios_livres} horários livres")

        pontos = round(sum(crit[k] * pesos[k] for k in pesos), 1)
        saida.append(Resultado(c.clinica_id, c.nome, pontos, km, {k: round(v, 1) for k, v in crit.items()}, motivos))
    return sorted(saida, key=lambda r: (-r.pontos, r.distancia_km if r.distancia_km is not None else 1e9, r.nome))
