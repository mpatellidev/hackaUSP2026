from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import Actor, require_paciente
from app.core.db import get_db
from app.modulos.alertas import service
from app.modulos.alertas.schemas import AlertaOut, ListaAlertas, PreferenciaIn, PreferenciaOut

router = APIRouter(tags=["alertas"])


@router.get("/alertas", response_model=ListaAlertas, summary="Meus alertas de vaga")
def listar(actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    return service.listar(db, actor)


@router.post("/alertas/{alerta_id}/lido", response_model=AlertaOut, summary="Marcar alerta como lido")
def marcar_lido(alerta_id: str, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    saida = service.marcar_lido(db, actor, alerta_id)
    db.commit()
    return saida


@router.get("/alertas/preferencia", response_model=PreferenciaOut, summary="Quero receber alertas de vaga?")
def ver_preferencia(actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    return service.preferencia(db, actor)


@router.put("/alertas/preferencia", response_model=PreferenciaOut, summary="Ligar ou desligar alertas de vaga")
def salvar_preferencia(body: PreferenciaIn, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    saida = service.salvar_preferencia(db, actor, body.receber, body.ligacao)
    db.commit()
    return saida
