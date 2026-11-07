from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor, require_paciente
from app.core.db import get_db
from app.modulos.avaliacoes import service
from app.modulos.avaliacoes.schemas import AvaliacaoOut, AvaliacoesDaClinica, AvaliarIn, ListaMinhasAvaliacoes

router = APIRouter(tags=["avaliações"])


@router.post("/avaliacoes", response_model=AvaliacaoOut, status_code=201,
             summary="Avaliar a clínica de um atendimento concluído (reenviar edita)")
def avaliar(body: AvaliarIn, resposta: Response, actor: Actor = Depends(require_paciente),
            db: Session = Depends(get_db)):
    saida, criada = service.avaliar(db, actor, body.solicitacao_id, body.nota, body.comentario)
    db.commit()
    if not criada:
        resposta.status_code = 200
    return saida


@router.get("/avaliacoes", response_model=ListaMinhasAvaliacoes, summary="Minhas avaliações")
def minhas(actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    itens = service.minhas(db, actor)
    return {"itens": itens, "total": len(itens)}


@router.get("/clinicas/{clinica_id}/avaliacoes", response_model=AvaliacoesDaClinica,
            summary="Avaliações da clínica (sem nome nem dado de saúde)")
def da_clinica(clinica_id: str, _: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    return service.da_clinica(db, clinica_id)
