"""Consultas JÁ ESCOPADAS pelo Actor. As frentes #3/#4/#13… devem ler pedidos por aqui,
nunca com select direto, para manter o isolamento paciente/clínica em um só lugar."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import nao_encontrado
from app.models.solicitacoes import EventoSolicitacao, Solicitacao


def _escopo(actor: Actor):
    if actor.papel == "paciente":
        return Solicitacao.paciente_id == actor.usuario_id
    return Solicitacao.clinica_id.in_(actor.clinica_ids or {""})


def listar(db: Session, actor: Actor, estado: str | None = None) -> list[Solicitacao]:
    q = select(Solicitacao).where(_escopo(actor)).order_by(Solicitacao.criado_em, Solicitacao.id)
    if estado:
        q = q.where(Solicitacao.estado == estado)
    return list(db.scalars(q))


def obter(db: Session, actor: Actor, solicitacao_id: str) -> Solicitacao:
    """Fora do escopo = 404 (não revela existência; contrato §2)."""
    s = db.scalar(select(Solicitacao).where(Solicitacao.id == solicitacao_id, _escopo(actor)))
    if s is None:
        raise nao_encontrado()
    return s


def eventos(db: Session, actor: Actor, solicitacao_id: str) -> list[EventoSolicitacao]:
    obter(db, actor, solicitacao_id)
    return list(db.scalars(
        select(EventoSolicitacao).where(EventoSolicitacao.solicitacao_id == solicitacao_id)
        .order_by(EventoSolicitacao.criado_em, EventoSolicitacao.id)))
