"""Seed idempotente: resumo fictício, compartilhamento e auditoria (resumos.json, compartilhamentos.json, eventos-acesso.json)."""
import json

from sqlalchemy.orm import Session

from app.core.config import FIXTURES_DIR
from app.core.time import parse_aware
from app.modulos.resumos.models import Compartilhamento, EventoAcesso, ResumoProntuario


def _itens(nome: str) -> list[dict]:
    return json.loads((FIXTURES_DIR / f"{nome}.json").read_text(encoding="utf-8"))["itens"]


def run(db: Session) -> dict[str, int]:
    for r in _itens("resumos"):
        db.merge(ResumoProntuario(id=r["id"], paciente_id=r["paciente_id"], clinica_autora_id=r["clinica_autora_id"],
                                  campos=r["campos"], criado_por=r["criado_por"], criado_em=parse_aware(r["criado_em"])))
    db.flush()
    for r in _itens("compartilhamentos"):
        db.merge(Compartilhamento(id=r["id"], resumo_id=r["resumo_id"], clinica_destino_id=r["clinica_destino_id"],
                                  campos_compartilhados=r["campos_compartilhados"], finalidade=r["finalidade"],
                                  aceite=r["aceite"], aceito_em=parse_aware(r["aceito_em"]),
                                  revogado_em=parse_aware(r["revogado_em"]) if r["revogado_em"] else None))
    for r in _itens("eventos-acesso"):
        db.merge(EventoAcesso(id=r["id"], resumo_id=r["resumo_id"], usuario_id=r["usuario_id"],
                              clinica_id=r["clinica_id"], tipo=r["tipo"], criado_em=parse_aware(r["criado_em"])))
    db.commit()
    return {"resumos": db.query(ResumoProntuario).count(), "resumos_compartilhamentos": db.query(Compartilhamento).count()}
