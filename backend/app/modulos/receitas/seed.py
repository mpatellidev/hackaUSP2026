"""Seed idempotente: receitas fictícias (docs/fixtures/receitas.json). Conteúdo cifrado ao gravar."""
import json

from sqlalchemy.orm import Session

from app.core.config import FIXTURES_DIR
from app.core.cripto import cifrar, decifrar
from app.core.time import parse_aware
from app.models.clinicas import Clinica
from app.models.usuarios import Usuario
from app.modulos.receitas.models import Receita


def run(db: Session) -> dict[str, int]:
    for r in json.loads((FIXTURES_DIR / "receitas.json").read_text(encoding="utf-8"))["itens"]:
        conteudo = json.dumps({"itens": r["itens"], "orientacoes": r["orientacoes"]}, ensure_ascii=False)
        atual = db.get(Receita, r["id"])
        cifrado = atual.conteudo_cifrado if atual and decifrar(atual.conteudo_cifrado) == conteudo else cifrar(conteudo)
        clinica = db.get(Clinica, r["clinica_id"])
        assinante = db.get(Usuario, r["assinado_por"]) if r.get("assinado_por") else None
        db.merge(Receita(
            id=r["id"], paciente_id=r["paciente_id"], clinica_id=r["clinica_id"], solicitacao_id=r.get("solicitacao_id"),
            instituicao=f"{clinica.nome} · {clinica.universidade}", conteudo_cifrado=cifrado, autor_id=r["autor_id"],
            estado="assinada" if assinante else "rascunho", assinado_por=assinante.id if assinante else None,
            assinante_nome=assinante.nome_exibicao if assinante else None, assinante_cro=assinante.cro if assinante else None,
            assinado_em=parse_aware(r["assinado_em"]) if r.get("assinado_em") else None, criado_em=parse_aware(r["criado_em"])))
    db.commit()
    return {"receitas": db.query(Receita).count()}
