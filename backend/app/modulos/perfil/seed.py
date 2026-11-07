"""Seed idempotente de perfis: docs/fixtures/perfis.json (não sobrescreve perfis já alterados)."""
import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.modulos.perfil.models import PerfilUsuario

_ARQUIVO = Path(__file__).resolve().parents[4] / "docs" / "fixtures" / "perfis.json"


def run(db: Session) -> dict[str, int]:
    for r in json.loads(_ARQUIVO.read_text(encoding="utf-8"))["itens"]:
        if db.get(PerfilUsuario, r["usuario_id"]) is None:
            socio = {k: v for k, v in r["socioeconomico"].items() if k != "finalidade"}
            db.add(PerfilUsuario(usuario_id=r["usuario_id"], cidade=r["cidade"], uf=r["uf"],
                                 contato_preferido=r["contato_preferido"], socioeconomico=socio,
                                 acessibilidade=r["acessibilidade"]))
    db.commit()
    return {"perfis": db.query(PerfilUsuario).count()}
