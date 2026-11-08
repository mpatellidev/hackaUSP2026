"""Seed idempotente: escopo didático das clínicas-escola (docs/fixtures/escopo-didatico.json)."""
import json

from sqlalchemy.orm import Session

from app.core.config import FIXTURES_DIR
from app.modulos.indexador.models import EscopoDidatico


def run(db: Session) -> dict[str, int]:
    for r in json.loads((FIXTURES_DIR / "escopo-didatico.json").read_text(encoding="utf-8"))["itens"]:
        db.merge(EscopoDidatico(id=r["id"], clinica_id=r["clinica_id"], semestre=r["semestre"], especialidade=r["especialidade"],
                                procedimento=r["procedimento"], complexidade_max=r["complexidade_max"], ativo=r["ativo"]))
    db.commit()
    return {"escopo_didatico": db.query(EscopoDidatico).count()}
