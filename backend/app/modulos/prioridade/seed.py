"""Seed idempotente das faltas fictícias (fixture faltas.json, id fixo)."""
import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.time import parse_aware
from app.models.usuarios import VinculoClinica
from app.modulos.prioridade.models import RegistroFalta


def run(db: Session) -> dict[str, int]:
    itens = json.loads((Path(__file__).resolve().parents[4] / "docs" / "fixtures" / "faltas.json").read_text(encoding="utf-8"))["itens"]
    for r in itens:
        clinica = db.scalar(select(VinculoClinica.clinica_id).where(VinculoClinica.usuario_id == r["registrada_por"]))
        db.merge(RegistroFalta(id=r["id"], paciente_id=r["paciente_id"], agendamento_id=r["agendamento_id"],
                               clinica_id=clinica, registrada_por=r["registrada_por"],
                               justificativa=r["justificativa"], estado=r["estado"], criado_em=parse_aware(r["criado_em"])))
    db.commit()
    return {"registros_falta": db.query(RegistroFalta).count()}
