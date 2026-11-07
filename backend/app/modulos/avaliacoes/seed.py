"""Seed idempotente das avaliações fictícias (docs/fixtures/avaliacoes-clinica.json)."""
import json

from sqlalchemy.orm import Session

from app.core.config import FIXTURES_DIR
from app.core.time import parse_aware
from app.modulos.avaliacoes.models import AvaliacaoClinica


def run(db: Session) -> dict[str, int]:
    for r in json.loads((FIXTURES_DIR / "avaliacoes-clinica.json").read_text(encoding="utf-8"))["itens"]:
        db.merge(AvaliacaoClinica(id=r["id"], clinica_id=r["clinica_id"], paciente_id=r["paciente_id"],
                                  solicitacao_id=r["solicitacao_id"], nota=r["nota"], comentario=r["comentario"],
                                  criado_em=parse_aware(r["criado_em"])))
    db.commit()
    return {"avaliacoes_clinica": db.query(AvaliacaoClinica).count()}
