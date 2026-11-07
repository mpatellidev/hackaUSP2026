from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor, require_funcionario, require_paciente
from app.core.db import get_db
from app.modulos.resumos import service
from app.modulos.resumos.schemas import (CompartilharIn, CompartilhamentoOut, CriarResumoIn, ListaCompartilhamentos,
                                         ListaEventosAcesso, ListaResumos, ResumoOut)

router = APIRouter(tags=["resumos (demo)"])


@router.post("/resumos", status_code=201, response_model=ResumoOut,
             summary="Criar resumo fictício de um pedido (profissional da clínica)")
def criar(body: CriarResumoIn, actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    saida = service.criar(db, actor, body.solicitacao_id, [c.model_dump() for c in body.campos])
    db.commit()
    return saida


@router.get("/resumos", response_model=ListaResumos, summary="Resumos no escopo do token")
def listar(actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    itens = service.listar(db, actor)
    return {"itens": itens, "total": len(itens), "aviso": service.AVISO}


@router.get("/resumos/{resumo_id}", response_model=ResumoOut,
            summary="Ver um resumo (consulta de clínica destinatária fica registrada)")
def obter(resumo_id: str, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    saida = service.obter(db, actor, resumo_id)
    db.commit()
    return saida


@router.post("/resumos/{resumo_id}/compartilhamentos", status_code=201, response_model=CompartilhamentoOut,
             summary="Paciente escolhe a clínica, os campos e a finalidade (ou recusa)")
def compartilhar(resumo_id: str, body: CompartilharIn, actor: Actor = Depends(require_paciente),
                 db: Session = Depends(get_db)):
    saida = service.compartilhar(db, actor, resumo_id, body.clinica_destino_id, body.campos_compartilhados,
                                 body.finalidade, body.aceite)
    db.commit()
    return saida


@router.get("/resumos/{resumo_id}/compartilhamentos", response_model=ListaCompartilhamentos,
            summary="Com quem compartilhei este resumo")
def listar_compartilhamentos(resumo_id: str, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    itens = service.compartilhamentos(db, actor, resumo_id)
    return {"itens": itens, "total": len(itens)}


@router.post("/compartilhamentos/{compartilhamento_id}/revogar", response_model=CompartilhamentoOut,
             summary="Revogar compartilhamento (vale para acessos futuros; histórico preservado)")
def revogar(compartilhamento_id: str, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    saida = service.revogar(db, actor, compartilhamento_id)
    db.commit()
    return saida


@router.get("/resumos/{resumo_id}/eventos", response_model=ListaEventosAcesso,
            summary="Auditoria: quem criou, aceitou, consultou e revogou")
def eventos(resumo_id: str, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    itens = service.eventos(db, actor, resumo_id)
    return {"itens": itens, "total": len(itens)}
