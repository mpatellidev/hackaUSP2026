"""Seed independente: carrega docs/fixtures/cenarios.json + interesses-cenario.json + fixtures/cenarios-extra.json
(idempotente; IDs fixos)."""
import json
from datetime import datetime
from pathlib import Path

from .models import Cenario, InteresseCenario
from .service import RepositorioCenarios, repo

_RAIZ = Path(__file__).resolve().parents[4]
_FIX = _RAIZ / "docs" / "fixtures"
_EXTRA = Path(__file__).parent / "fixtures" / "cenarios-extra.json"


def _itens(p: Path) -> list[dict]:
    return json.loads(p.read_text(encoding="utf-8"))["itens"]


def _dt(s: str) -> datetime:
    return datetime.fromisoformat(s)


def carregar(r: RepositorioCenarios = repo) -> RepositorioCenarios:
    for d in _itens(_FIX / "cenarios.json") + _itens(_EXTRA):
        d = {**d, "publicado_em": _dt(d["publicado_em"])}
        r.cenarios.setdefault(d["id"], Cenario(**d))
    for d in _itens(_FIX / "interesses-cenario.json"):
        d = {**d, "criado_em": _dt(d["criado_em"])}
        r.interesses.setdefault(d["id"], InteresseCenario(**d, atualizado_em=d["criado_em"]))
    return r
