from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor, require_funcionario, require_paciente
from app.core.db import get_db
from app.core.errors import ApiError, nao_encontrado
from app.models.clinicas import Clinica
from app.modulos.solicitacoes import service
from app.modulos.solicitacoes.localizacao import CepNaoAtendido, distancia_km, origem_do_cep
from app.modulos.solicitacoes.schemas import (AlternativasOut, AtualizarEstadoIn, ClinicaOut, CriarSolicitacaoIn,
                                              EncaminhadoOut, EncaminharIn, ListaClinicas, ListaEventos,
                                              ListaSolicitacoes, SolicitacaoOut)
from app.modulos.solicitacoes import repositorio as repo

router = APIRouter(tags=["solicitações"])


@router.get("/clinicas", response_model=ListaClinicas,
            summary="Listar clínicas para o paciente (com lat/lng ou CEP: mais próximas primeiro)")
def listar_clinicas(cidade: str | None = Query(default=None), especialidade: str | None = Query(default=None),
                    lat: float | None = Query(default=None, ge=-90, le=90),
                    lng: float | None = Query(default=None, ge=-180, le=180),
                    cep: str | None = Query(default=None, max_length=12),
                    _: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    q = select(Clinica).order_by(Clinica.nome, Clinica.id)
    if cidade:
        q = q.where(Clinica.cidade == cidade)
    clinicas = list(db.scalars(q))
    if especialidade:
        clinicas = [c for c in clinicas if especialidade in c.especialidades]
    itens = [service.clinica_json(c) for c in clinicas]
    localizacao = None
    if (lat is None) != (lng is None):
        raise ApiError(422, "validacao", "Envie latitude e longitude juntas.", {"campos": ["lat", "lng"]})
    if lat is not None and lng is not None:
        localizacao = {"fonte": "aparelho", "aproximada": False, "descricao": "sua localização"}
    elif cep:
        try:
            lat, lng, regiao = origem_do_cep(cep)
        except CepNaoAtendido as e:
            raise ApiError(422, "validacao", str(e), {"campos": ["cep"]}) from e
        localizacao = {"fonte": "cep", "aproximada": True, "descricao": regiao}
    if localizacao is not None:
        for it in itens:
            if it["latitude"] is not None and it["longitude"] is not None:
                it["distancia_km"] = round(distancia_km(lat, lng, it["latitude"], it["longitude"]), 1)
        itens.sort(key=lambda it: (it.get("distancia_km") is None, it.get("distancia_km") or 0, it["nome"]))
    return {"itens": itens, "total": len(itens), "localizacao": localizacao}


@router.get("/clinicas/{clinica_id}", response_model=ClinicaOut, summary="Ver detalhes de uma clínica (paciente: qualquer; funcionário: a própria)")
def detalhe_clinica(clinica_id: str, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    """Paciente vê qualquer clínica; funcionário só a(s) própria(s) (outra clínica = 404)."""
    if actor.papel == "funcionario" and not actor.pode_na_clinica(clinica_id):
        raise nao_encontrado()
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
                           body.descricao_administrativa.strip(), body.para_quem, body.nome_paciente,
                           body.telefone_contato, body.trilha)
    from app.modulos.notificacoes.service import notificar
    clinica = db.get(Clinica, pedido.clinica_id)
    notificar(db, actor.usuario_id, "Pedido enviado",
              f"Seu pedido para a {clinica.nome} foi enviado. Protocolo {pedido.id[:8].upper()}. A clínica vai analisar.",
              f"solicitacao:{pedido.id}")
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
