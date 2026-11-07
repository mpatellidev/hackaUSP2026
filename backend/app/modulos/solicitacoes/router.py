from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor, require_funcionario, require_paciente
from app.core.db import get_db
from app.models.clinicas import Clinica
from app.modulos.solicitacoes import service
from app.modulos.solicitacoes.schemas import (AlternativasOut, AtualizarEstadoIn, ClinicaOut, CriarSolicitacaoIn,
                                              EncaminhadoOut, EncaminharIn, ListaClinicas, ListaEventos,
                                              ListaSolicitacoes, SolicitacaoOut)
from app.modulos.solicitacoes import repositorio as repo

router = APIRouter(tags=["solicitações"])


@router.get("/clinicas", response_model=ListaClinicas, summary="Listar clínicas para o paciente")
def listar_clinicas(cidade: str | None = Query(default=None), especialidade: str | None = Query(default=None),
                    _: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    q = select(Clinica).order_by(Clinica.nome, Clinica.id)
    if cidade:
        q = q.where(Clinica.cidade == cidade)
    clinicas = list(db.scalars(q))
    if especialidade:
        clinicas = [c for c in clinicas if especialidade in c.especialidades]
    return {"itens": [service.clinica_json(c) for c in clinicas], "total": len(clinicas)}


@router.get("/clinicas/{clinica_id}", response_model=ClinicaOut, summary="Ver detalhes de uma clínica")
def detalhe_clinica(clinica_id: str, _: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    return service.clinica_json(service.obter_clinica(db, clinica_id))


@router.get("/solicitacoes", response_model=ListaSolicitacoes, summary="Listar pedidos no escopo do token")
def listar_solicitacoes(estado: str | None = Query(default=None), actor: Actor = Depends(get_actor),
                         db: Session = Depends(get_db)):
    itens = repo.listar(db, actor, estado=estado)
    return {"itens": [service.solicitacao_json(s) for s in itens], "total": len(itens)}


@router.post("/solicitacoes", status_code=201, response_model=SolicitacaoOut, summary="Criar pedido de atendimento")
def criar_solicitacao(body: CriarSolicitacaoIn, actor: Actor = Depends(require_paciente),
                      db: Session = Depends(get_db)):
    pedido = service.criar(db, actor, body.clinica_id, body.especialidade, body.publico_alvo,
                           body.descricao_administrativa.strip())
    db.commit()
    db.refresh(pedido)
    return service.solicitacao_json(pedido)


@router.get("/solicitacoes/{solicitacao_id}", response_model=SolicitacaoOut, summary="Ver pedido no escopo do token")
def detalhe_solicitacao(solicitacao_id: str, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    return service.solicitacao_json(repo.obter(db, actor, solicitacao_id))


@router.get("/solicitacoes/{solicitacao_id}/eventos", response_model=ListaEventos, summary="Histórico imutável do pedido")
def eventos(solicitacao_id: str, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    itens = repo.eventos(db, actor, solicitacao_id)
    return {"itens": [service.evento_json(e) for e in itens], "total": len(itens)}


@router.patch("/solicitacoes/{solicitacao_id}/estado", response_model=SolicitacaoOut, summary="Atualizar estado pela clínica responsável")
def atualizar_estado(solicitacao_id: str, body: AtualizarEstadoIn,
                     actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    pedido = service.transicionar(db, actor, solicitacao_id, body.estado, body.motivo)
    db.commit()
    db.refresh(pedido)
    return service.solicitacao_json(pedido)


@router.get("/solicitacoes/{solicitacao_id}/alternativas", response_model=AlternativasOut, summary="Sugerir clínicas após indisponibilidade")
def listar_alternativas(solicitacao_id: str, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    itens = service.alternativas(db, actor, solicitacao_id)
    return {"criterios": service.CRITERIOS_ALTERNATIVAS,
            "itens": [{"clinica": service.clinica_json(c)} for c in itens],
            "aviso": service.AVISO_ALTERNATIVAS}


@router.post("/solicitacoes/{solicitacao_id}/encaminhar", status_code=201, response_model=EncaminhadoOut,
             summary="Criar pedido na alternativa escolhida pelo paciente")
def encaminhar(solicitacao_id: str, body: EncaminharIn, actor: Actor = Depends(require_paciente),
               db: Session = Depends(get_db)):
    pedido = service.encaminhar(db, actor, solicitacao_id, body.clinica_destino_id)
    db.commit()
    db.refresh(pedido)
    return {"solicitacao": service.solicitacao_json(pedido),
            "campos_compartilhados": service.CAMPOS_COMPARTILHADOS,
            "aviso": "Encaminhamento escolhido pelo paciente. Não é garantia de vaga ou atendimento."}
