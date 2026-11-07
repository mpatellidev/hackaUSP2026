from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import nao_encontrado, transicao_invalida
from app.core.time import to_sp_iso, utc_now
from app.models.clinicas import Clinica
from app.models.solicitacoes import Solicitacao
from app.modulos.avaliacoes.models import AvaliacaoClinica

AVISO = "Avaliações fictícias de demonstração, sem nome e sem dado de saúde."


def avaliacao_json(a: AvaliacaoClinica) -> dict:
    return {"id": a.id, "clinica_id": a.clinica_id, "solicitacao_id": a.solicitacao_id, "nota": a.nota,
            "comentario": a.comentario, "criado_em": to_sp_iso(a.criado_em)}


def avaliar(db: Session, actor: Actor, solicitacao_id: str, nota: int, comentario: str | None) -> tuple[dict, bool]:
    """Devolve (avaliação, criada). Só o paciente dono, só com atendimento concluído; reenviar edita."""
    pedido = db.get(Solicitacao, solicitacao_id)
    if pedido is None or pedido.paciente_id != actor.usuario_id:
        raise nao_encontrado()
    if pedido.estado != "concluida":
        raise transicao_invalida("Você só pode avaliar depois que o atendimento for concluído.",
                                 {"solicitacao_id": pedido.id, "estado": pedido.estado})
    existente = db.scalar(select(AvaliacaoClinica).where(AvaliacaoClinica.solicitacao_id == pedido.id))
    if existente:
        existente.nota, existente.comentario = nota, comentario
        db.flush()
        return avaliacao_json(existente), False
    nova = AvaliacaoClinica(clinica_id=pedido.clinica_id, paciente_id=actor.usuario_id, solicitacao_id=pedido.id,
                            nota=nota, comentario=comentario, criado_em=utc_now())
    db.add(nova)
    db.flush()
    return avaliacao_json(nova), True


def minhas(db: Session, actor: Actor) -> list[dict]:
    q = select(AvaliacaoClinica).where(AvaliacaoClinica.paciente_id == actor.usuario_id)
    return [avaliacao_json(a) for a in db.scalars(q.order_by(AvaliacaoClinica.criado_em.desc()))]


def da_clinica(db: Session, clinica_id: str) -> dict:
    if db.get(Clinica, clinica_id) is None:
        raise nao_encontrado()
    itens = list(db.scalars(select(AvaliacaoClinica).where(AvaliacaoClinica.clinica_id == clinica_id)
                            .order_by(AvaliacaoClinica.criado_em.desc())))
    media = db.scalar(select(func.avg(AvaliacaoClinica.nota)).where(AvaliacaoClinica.clinica_id == clinica_id))
    return {"clinica_id": clinica_id, "media": round(float(media), 1) if media is not None else None,
            "quantidade": len(itens), "aviso": AVISO,
            "itens": [{"nota": a.nota, "comentario": a.comentario, "criado_em": to_sp_iso(a.criado_em)} for a in itens]}
