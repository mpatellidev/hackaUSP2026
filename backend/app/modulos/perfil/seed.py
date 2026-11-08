"""Seed idempotente de perfis: docs/fixtures/perfis.json (não sobrescreve perfis já alterados)."""
import json

from sqlalchemy.orm import Session

from app.modulos.perfil.models import PerfilUsuario
from app.core.config import FIXTURES_DIR

_ARQUIVO = FIXTURES_DIR / "perfis.json"


def run(db: Session) -> dict[str, int]:
    from app.core.time import utc_now
    for r in json.loads(_ARQUIVO.read_text(encoding="utf-8"))["itens"]:
        atual = db.get(PerfilUsuario, r["usuario_id"])
        if atual is not None and atual.consentimento_sensivel_em is None and r.get("consentimento_dados_sensiveis"):
            # dados iniciais com consentimento (fictícios): aplica uma vez, sem mexer em escolhas já feitas
            atual.consentimento_sensivel_em = utc_now()
            atual.possui_deficiencia = r.get("possui_deficiencia")
            atual.tipo_deficiencia = r.get("tipo_deficiencia")
        if atual is None:
            socio = {k: v for k, v in r["socioeconomico"].items() if k != "finalidade"}
            db.add(PerfilUsuario(usuario_id=r["usuario_id"], cidade=r["cidade"], uf=r["uf"],
                                 contato_preferido=r["contato_preferido"], socioeconomico=socio,
                                 acessibilidade=r["acessibilidade"], possui_deficiencia=r.get("possui_deficiencia"),
                                 tipo_deficiencia=r.get("tipo_deficiencia"),
                                 consentimento_sensivel_em=utc_now() if r.get("consentimento_dados_sensiveis") else None))
    db.commit()
    return {"perfis": db.query(PerfilUsuario).count()}
