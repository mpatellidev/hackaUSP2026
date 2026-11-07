from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor, require_funcionario, require_paciente
from app.core.db import get_db
from app.modulos.prioridade.fontes import Fontes, get_fontes
from app.modulos.vagas import service
from app.modulos.vagas.schemas import (ConfirmadoOut, ConfirmarIn, CriarVagaIn, InteresseIn, InteresseRegistradoOut,
                                       ListaInteresses, ListaVagas, VagaOut)

router = APIRouter(tags=["vagas"])

AVISO_VAGAS = ("Vaga não é agendamento. Demonstrar interesse não reserva horário: "
               "a clínica confirma uma única pessoa.")


@router.get("/vagas", response_model=ListaVagas, response_model_exclude_unset=True, summary="Listar vagas no escopo do token")
def listar_vagas(clinica_id: str | None = Query(default=None), estado: str | None = Query(default=None),
                 actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    itens = service.listar(db, actor, clinica_id, estado)
    return {"itens": itens, "total": len(itens), "aviso": AVISO_VAGAS}


@router.post("/vagas", status_code=201, response_model=VagaOut, response_model_exclude_unset=True, summary="Publicar vaga (funcionário da clínica)")
def criar_vaga(body: CriarVagaIn, actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    vaga = service.criar(db, actor, body.especialidade, body.inicio, body.fim, body.profissional_id)
    db.commit()
    db.refresh(vaga)
    return service.vaga_json(vaga)


@router.post("/vagas/{vaga_id}/interesses", status_code=201, response_model=InteresseRegistradoOut, response_model_exclude_unset=True,
             summary="Demonstrar interesse em uma vaga (paciente dono do pedido)")
def demonstrar_interesse(vaga_id: str, body: InteresseIn, actor: Actor = Depends(require_paciente),
                         db: Session = Depends(get_db)):
    saida = service.registrar_interesse(db, actor, vaga_id, body.solicitacao_id)
    db.commit()
    return saida


@router.get("/vagas/{vaga_id}/interesses", response_model=ListaInteresses, summary="Interessados na vaga, na ordem sugerida pela prioridade")
def listar_interesses(vaga_id: str, actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db),
                      fontes: Fontes = Depends(get_fontes)):
    itens = service.interesses_da_vaga(db, actor, vaga_id, fontes)
    return {"itens": itens, "total": len(itens),
            "aviso": "A ordem é uma sugestão (urgência avaliada primeiro). A decisão final é do funcionário."}


@router.post("/vagas/{vaga_id}/confirmar", response_model=ConfirmadoOut, response_model_exclude_unset=True, summary="Confirmar uma única pessoa na vaga (funcionário)")
def confirmar_vaga(vaga_id: str, body: ConfirmarIn, actor: Actor = Depends(require_funcionario),
                   db: Session = Depends(get_db)):
    saida = service.confirmar(db, actor, vaga_id, body.interesse_id)
    db.commit()
    return saida
