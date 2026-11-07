from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import Actor, require_funcionario
from app.core.db import get_db
from app.modulos.profissionais import service
from app.modulos.profissionais.schemas import (BlocoIn, BlocoOut, BlocoPatch, Disponibilidade, ListaBlocos,
                                               ListaProfissionais, ProfissionalIn, ProfissionalOut, ProfissionalPatch)

router = APIRouter(tags=["profissionais"])
AVISO = "Profissionais e agenda fictícios (demo). Disponibilidade não é garantia de atendimento."


@router.get("/profissionais", response_model=ListaProfissionais, summary="Profissionais das minhas clínicas")
def listar(clinica_id: str | None = Query(default=None), ativos: bool = Query(default=False),
           actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    itens = service.listar(db, actor, clinica_id, ativos)
    return {"itens": itens, "total": len(itens), "aviso": AVISO}


@router.post("/profissionais", status_code=201, response_model=ProfissionalOut,
             summary="Cadastrar profissional (atendimento ou coordenação)")
def criar(body: ProfissionalIn, actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    p = service.criar(db, actor, body.nome_exibicao, body.especialidade, body.vinculo)
    db.commit()
    return service.profissional_json(p)


@router.patch("/profissionais/{profissional_id}", response_model=ProfissionalOut, summary="Atualizar profissional")
def atualizar(profissional_id: str, body: ProfissionalPatch, actor: Actor = Depends(require_funcionario),
              db: Session = Depends(get_db)):
    p = service.atualizar(db, actor, profissional_id, body.model_dump(exclude_unset=True, exclude_none=True))
    db.commit()
    return service.profissional_json(p)


@router.get("/profissionais/{profissional_id}/agenda", response_model=ListaBlocos, summary="Agenda do profissional")
def agenda(profissional_id: str, data: date | None = Query(default=None),
           actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    itens = service.agenda(db, actor, profissional_id, data)
    return {"itens": itens, "total": len(itens)}


@router.post("/profissionais/{profissional_id}/agenda", status_code=201, response_model=BlocoOut,
             summary="Cadastrar horário na agenda")
def criar_bloco(profissional_id: str, body: BlocoIn, actor: Actor = Depends(require_funcionario),
                db: Session = Depends(get_db)):
    b = service.criar_bloco(db, actor, profissional_id, body.inicio, body.fim, body.estado)
    db.commit()
    return service.bloco_json(b)


@router.patch("/agenda/{bloco_id}", response_model=BlocoOut, summary="Mudar o estado de um horário")
def atualizar_bloco(bloco_id: str, body: BlocoPatch, actor: Actor = Depends(require_funcionario),
                    db: Session = Depends(get_db)):
    b = service.atualizar_bloco(db, actor, bloco_id, body.estado)
    db.commit()
    return service.bloco_json(b)


@router.get("/clinicas/{clinica_id}/disponibilidade", response_model=Disponibilidade,
            summary="Disponibilidade dos profissionais da clínica em um dia")
def disponibilidade(clinica_id: str, data: date = Query(), actor: Actor = Depends(require_funcionario),
                    db: Session = Depends(get_db)):
    return service.disponibilidade(db, actor, clinica_id, data)
