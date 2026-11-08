"""Agendamentos (contrato §4.6): consulta no escopo do token e cancelamento. Dados fictícios (demo)."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor, require_paciente
from app.core.db import get_db
from app.modulos.agendamentos import service
from app.modulos.agendamentos.schemas import (AgendamentoOut, CanceladoOut, CancelarIn, EstadoAgendamento,
                                             ListaAgendamentos)

router = APIRouter(tags=["agendamentos"])


@router.get("/agendamentos", response_model=ListaAgendamentos, response_model_exclude_unset=True, summary="Agendamentos no escopo do token (paciente: próprios; funcionário: da clínica)")
def listar_agendamentos(estado: EstadoAgendamento | None = Query(default=None),
                        actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    itens = service.listar(db, actor, estado)
    return {"itens": itens, "total": len(itens)}


@router.get("/agendamentos/{agendamento_id}", response_model=AgendamentoOut, response_model_exclude_unset=True, summary="Ver um agendamento no escopo do token")
def detalhe_agendamento(agendamento_id: str, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    return service.agendamento_detalhe(db, service.obter(db, actor, agendamento_id), actor)


@router.post("/agendamentos/{agendamento_id}/cancelar", response_model=CanceladoOut, response_model_exclude_unset=True,
             summary="Cancelar agendamento (paciente dono ou funcionário da clínica)")
def cancelar_agendamento(agendamento_id: str, body: CancelarIn, actor: Actor = Depends(get_actor),
                         db: Session = Depends(get_db)):
    saida = service.cancelar(db, actor, agendamento_id, body.motivo)
    db.commit()
    return saida


class RemarcarIn(BaseModel):
    vaga_id: str = Field(min_length=1, max_length=64)


class RemarcadoOut(BaseModel):
    agendamento_cancelado_id: str
    vaga_id: str
    inicio: str
    aviso: str


@router.post("/agendamentos/{agendamento_id}/remarcar", response_model=RemarcadoOut,
             summary="Remarcar: troca por outro horário livre da mesma clínica (a clínica confirma o novo)")
def remarcar(agendamento_id: str, body: RemarcarIn, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    from app.modulos.vagas import service as vagas
    ag = service.obter(db, actor, agendamento_id)
    service.cancelar(db, actor, agendamento_id, "Remarcação pedida pelo paciente")  # sem falta nem penalidade
    novo = vagas.registrar_interesse(db, actor, body.vaga_id, ag.solicitacao_id)  # erro aqui desfaz tudo (sem commit)
    db.commit()
    return {"agendamento_cancelado_id": ag.id, "vaga_id": body.vaga_id, "inicio": novo["inicio"],
            "aviso": "Pedimos o novo horário. Só vale quando a clínica confirmar; o antigo foi liberado sem penalidade."}
