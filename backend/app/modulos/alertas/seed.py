"""Seed idempotente: alertas fictícios (docs/fixtures/alertas.json) e a preferência de quem os recebe."""
import json

from sqlalchemy.orm import Session

from app.core.config import FIXTURES_DIR
from app.core.time import parse_aware, utc_now
from app.modulos.alertas.models import Alerta, PreferenciaAlerta


def run(db: Session) -> dict[str, int]:
    for r in json.loads((FIXTURES_DIR / "alertas.json").read_text(encoding="utf-8"))["itens"]:
        if db.get(PreferenciaAlerta, r["paciente_id"]) is None:
            db.add(PreferenciaAlerta(usuario_id=r["paciente_id"], receber=True, ligacao=False, atualizado_em=utc_now()))
        db.merge(Alerta(id=r["id"], paciente_id=r["paciente_id"], vaga_id=r["vaga_id"], clinica_id=r["clinica_id"],
                        evento_origem=r["evento_origem"], lido=r["lido"], criado_em=parse_aware(r["criado_em"])))
    db.commit()
    return {"alertas": db.query(Alerta).count()}
