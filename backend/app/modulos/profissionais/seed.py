"""Seed idempotente de profissionais e agenda (docs/fixtures/profissionais.json e agenda.json)."""
import json

from sqlalchemy.orm import Session

from app.core.config import FIXTURES_DIR
from app.core.time import parse_aware
from app.modulos.profissionais.models import BlocoAgenda, Profissional


def _itens(nome: str) -> list[dict]:
    return json.loads((FIXTURES_DIR / f"{nome}.json").read_text(encoding="utf-8"))["itens"]


def run(db: Session) -> dict[str, int]:
    for r in _itens("profissionais"):
        db.merge(Profissional(**r))
    db.flush()
    for r in _itens("agenda"):
        db.merge(BlocoAgenda(id=r["id"], profissional_id=r["profissional_id"], estado=r["estado"],
                             inicio=parse_aware(r["inicio"]), fim=parse_aware(r["fim"])))
    db.commit()
    return {"profissionais": db.query(Profissional).count(), "agenda_blocos": db.query(BlocoAgenda).count()}
