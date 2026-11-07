from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor
from app.core.db import get_db
from app.core.time import to_sp
from app.modulos.urgencia import service
from app.modulos.urgencia.models import RelatoUrgencia
from app.modulos.urgencia.repositorio import RepositorioUrgencia
from app.modulos.urgencia.schemas import (AvaliacaoCriar, AvaliacaoOut, EstadoRelato, ListaRelatos,
                                          Orientacao, RelatoCriar, RelatoOut)
from app.modulos.urgencia.textos import AVISO_DEMO, AVISO_RELATO, ORIENTACAO_EMERGENCIA, ROTULO_AGUARDANDO, SAMU

router = APIRouter(prefix="/urgencias", tags=["urgência (demo)"])


def obter_repo(db: Session = Depends(get_db)) -> RepositorioUrgencia:
    return RepositorioUrgencia(db)


def _out(repo: RepositorioUrgencia, r: RelatoUrgencia) -> RelatoOut:
    a = repo.avaliacao_do_relato(r.id)
    return RelatoOut(
        id=r.id, paciente_id=r.paciente_id, solicitacao_id=r.solicitacao_id, estado=r.estado,
        criado_em=to_sp(r.criado_em),
        rotulo=ROTULO_AGUARDANDO if r.estado == "aguardando_avaliacao" else "Avaliada por profissional",
        avaliacao=AvaliacaoOut(id=a.id, relato_id=a.relato_id, avaliador_usuario_id=a.avaliador_usuario_id,
                               classificacao=a.classificacao, observacao_administrativa=a.observacao_administrativa,
                               avaliado_em=to_sp(a.avaliado_em)) if a else None,
        aviso=AVISO_RELATO,
    )


@router.get("/orientacao", response_model=Orientacao)
def orientacao() -> Orientacao:
    """Mesmo texto estático embutido no app. Público e sem dados pessoais."""
    return Orientacao(samu=SAMU, texto=ORIENTACAO_EMERGENCIA, aviso=AVISO_DEMO)


@router.post("", response_model=RelatoOut, status_code=201)
def criar(corpo: RelatoCriar, actor: Actor = Depends(get_actor), repo: RepositorioUrgencia = Depends(obter_repo)):
    r, _ = service.criar_relato(repo, actor, str(corpo.solicitacao_id) if corpo.solicitacao_id else None)
    repo.db.commit()
    return _out(repo, r)


@router.get("", response_model=ListaRelatos)
def listar(estado: EstadoRelato | None = None, actor: Actor = Depends(get_actor),
           repo: RepositorioUrgencia = Depends(obter_repo)):
    itens = [_out(repo, r) for r in service.listar(repo, actor, estado.value if estado else None)]
    return ListaRelatos(itens=itens, total=len(itens))


@router.post("/{relato_id}/avaliacao", response_model=RelatoOut, status_code=201)
def avaliar(relato_id: UUID, corpo: AvaliacaoCriar, actor: Actor = Depends(get_actor),
            repo: RepositorioUrgencia = Depends(obter_repo)):
    service.avaliar(repo, actor, str(relato_id), corpo.classificacao.value, corpo.observacao_administrativa)
    repo.db.commit()
    return _out(repo, service.obter(repo, actor, str(relato_id)))
