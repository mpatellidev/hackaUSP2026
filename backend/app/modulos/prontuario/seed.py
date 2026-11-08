"""Seed idempotente: prontuário fictício (docs/fixtures/prontuario.json). O conteúdo é cifrado ao gravar."""
import json

from sqlalchemy.orm import Session

from app.core.config import FIXTURES_DIR
from app.core.cripto import cifrar, decifrar
from app.core.time import parse_aware
from app.modulos.prontuario.models import RegistroProntuario


def run(db: Session) -> dict[str, int]:
    for r in json.loads((FIXTURES_DIR / "prontuario.json").read_text(encoding="utf-8"))["itens"]:
        atual = db.get(RegistroProntuario, r["id"])
        # Fernet gera um texto cifrado diferente a cada vez: só regrava se o conteúdo mudou (seed idempotente).
        cifrado = atual.conteudo_cifrado if atual and decifrar(atual.conteudo_cifrado) == r["conteudo"] else cifrar(r["conteudo"])
        db.merge(RegistroProntuario(
            id=r["id"], paciente_id=r["paciente_id"], clinica_id=r["clinica_id"], solicitacao_id=r.get("solicitacao_id"),
            tipo=r["tipo"], risco_clinico=r.get("risco_clinico"), procedimentos=r["procedimentos"],
            especialidades=r["especialidades"], conteudo_cifrado=cifrado, autor_id=r["autor_id"],
            validado_por=r.get("validado_por"), validado_em=parse_aware(r["validado_em"]) if r.get("validado_em") else None,
            criado_em=parse_aware(r["criado_em"])))
    db.commit()
    # Triagem validada sem decisão do indexador (dados iniciais): decide agora (mantém ou referencia)
    from app.modulos.indexador.models import DecisaoIndexador
    from app.modulos.indexador.service import decidir
    for r in db.query(RegistroProntuario).filter(RegistroProntuario.validado_por.is_not(None),
                                                 RegistroProntuario.tipo.in_(("triagem", "plano_tratamento"))):
        if not db.query(DecisaoIndexador).filter_by(paciente_id=r.paciente_id, solicitacao_id=r.solicitacao_id).count():
            decidir(db, r)
    db.commit()
    return {"prontuario_registros": db.query(RegistroProntuario).count()}
