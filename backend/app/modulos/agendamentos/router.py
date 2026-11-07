"""Agendamentos (contrato §4.6): consulta no escopo do token e cancelamento. Dados fictícios (demo)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor
from app.core.db import get_db
from app.modulos.agendamentos import service
from app.modulos.agendamentos.schemas import CancelarIn, EstadoAgendamento

router = APIRouter(tags=["agendamentos"])


@router.get("/agendamentos", summary="Agendamentos no escopo do token (paciente: próprios; funcionário: da clínica)")
def listar_agendamentos(estado: EstadoAgendamento | None = Query(default=None),
                        actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    itens = service.listar(db, actor, estado)
    return {"itens": itens, "total": len(itens)}


@router.get("/agendamentos/{agendamento_id}", summary="Ver um agendamento no escopo do token")
def detalhe_agendamento(agendamento_id: str, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    return service.agendamento_detalhe(db, service.obter(db, actor, agendamento_id), actor)


@router.post("/agendamentos/{agendamento_id}/cancelar",
             summary="Cancelar agendamento (paciente dono ou funcionário da clínica)")
def cancelar_agendamento(agendamento_id: str, body: CancelarIn, actor: Actor = Depends(get_actor),
                         db: Session = Depends(get_db)):
    saida = service.cancelar(db, actor, agendamento_id, body.motivo)
    db.commit()
    return saida
