"""Seed idempotente: docs/fixtures/cenarios.json + interesses-cenario.json + fixtures/cenarios-extra.json
(IDs fixos; upsert por id; não sobrescreve o que a clínica ou o paciente já alterou)."""
import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.time import parse_aware
from app.modulos.cenarios.models import Cenario, InteresseCenario
from app.core.config import FIXTURES_DIR

_FIX = FIXTURES_DIR
_EXTRA = Path(__file__).parent / "fixtures" / "cenarios-extra.json"


def _itens(p: Path) -> list[dict]:
    return json.loads(p.read_text(encoding="utf-8"))["itens"]


def run(db: Session) -> dict[str, int]:
    for d in _itens(_FIX / "cenarios.json") + _itens(_EXTRA):
        if db.get(Cenario, d["id"]) is None:
            db.add(Cenario(**{**d, "publicado_em": parse_aware(d["publicado_em"])}))
    db.flush()
    for d in _itens(_FIX / "interesses-cenario.json"):
        if db.get(InteresseCenario, d["id"]) is None:
            criado = parse_aware(d["criado_em"])
            db.add(InteresseCenario(**{**d, "criado_em": criado}, atualizado_em=criado))
    db.commit()
    return {"cenarios": db.query(Cenario).count(), "cenarios_interesses": db.query(InteresseCenario).count()}
