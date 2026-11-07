"""Seed idempotente de urgência: docs/fixtures/urgencias.json (IDs fixos; não sobrescreve o que já mudou)."""
import json

from sqlalchemy.orm import Session

from app.core.time import parse_aware
from app.modulos.urgencia.models import AvaliacaoUrgencia, RelatoUrgencia
from app.core.config import FIXTURES_DIR

_ARQUIVO = FIXTURES_DIR / "urgencias.json"


def run(db: Session) -> dict[str, int]:
    dados = json.loads(_ARQUIVO.read_text(encoding="utf-8"))
    for r in dados["relatos"]:
        if db.get(RelatoUrgencia, r["id"]) is None:
            db.add(RelatoUrgencia(id=r["id"], paciente_id=r["paciente_id"], solicitacao_id=r["solicitacao_id"],
                                  estado=r["estado"], criado_em=parse_aware(r["criado_em"])))
    db.flush()
    for a in dados["avaliacoes"]:
        if db.get(AvaliacaoUrgencia, a["id"]) is None:
            db.add(AvaliacaoUrgencia(id=a["id"], relato_id=a["relato_id"], avaliador_usuario_id=a["avaliador_usuario_id"],
                                     classificacao=a["classificacao"],
                                     observacao_administrativa=a["observacao_administrativa"],
                                     avaliado_em=parse_aware(a["avaliado_em"])))
    db.commit()
    return {"urgencia_relatos": db.query(RelatoUrgencia).count(),
            "urgencia_avaliacoes": db.query(AvaliacaoUrgencia).count()}
