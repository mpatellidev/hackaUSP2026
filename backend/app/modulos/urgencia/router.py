from typing import Callable, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from . import service
from .models import Ator
from .repositorio import RepositorioMemoria, RepositorioUrgencia
from .schemas import (AvaliacaoCriar, AvaliacaoOut, EstadoRelato, ListaRelatos,
                      Orientacao, RelatoCriar, RelatoOut)
from .textos import AVISO_DEMO, AVISO_RELATO, ORIENTACAO_EMERGENCIA, ROTULO_AGUARDANDO, SAMU

router = APIRouter(prefix="/urgencias", tags=["urgência (demo)"])

_repo: RepositorioUrgencia = RepositorioMemoria.das_fixtures()


def obter_repo() -> RepositorioUrgencia:
    return _repo


def obter_ator(request: Request) -> Ator:
    """PONTO DE INTEGRAÇÃO com a auth demo da #2.

    A #2 deve substituir via `app.dependency_overrides[obter_ator]`, resolvendo
    token -> Ator (papel, funcao e clinica_id do servidor). Sem isso, 401.
    """
    from .erros import ErroApi
    raise ErroApi(401, "nao_autenticado", "Entre com uma conta para continuar.")


def _out(repo: RepositorioUrgencia, r) -> RelatoOut:
    a = repo.avaliacao_do_relato(r.id)
    return RelatoOut(
        **{k: getattr(r, k) for k in ("id", "paciente_id", "solicitacao_id", "estado", "criado_em")},
        rotulo=ROTULO_AGUARDANDO if r.estado == "aguardando_avaliacao" else "Avaliada por profissional",
        avaliacao=AvaliacaoOut(**vars(a)) if a else None,
        aviso=AVISO_RELATO,
    )


@router.get("/orientacao", response_model=Orientacao)
def orientacao() -> Orientacao:
    """Mesmo texto estático embutido no app. Público e sem dados pessoais."""
    return Orientacao(samu=SAMU, texto=ORIENTACAO_EMERGENCIA, aviso=AVISO_DEMO)


@router.post("", response_model=RelatoOut, status_code=201)
def criar(corpo: RelatoCriar, ator: Ator = Depends(obter_ator), repo: RepositorioUrgencia = Depends(obter_repo)):
    r, _ = service.criar_relato(repo, ator, corpo.solicitacao_id)
    return _out(repo, r)


@router.get("", response_model=ListaRelatos)
def listar(estado: Optional[EstadoRelato] = None, ator: Ator = Depends(obter_ator),
           repo: RepositorioUrgencia = Depends(obter_repo)):
    itens = [_out(repo, r) for r in service.listar(repo, ator, estado.value if estado else None)]
    return ListaRelatos(itens=itens, total=len(itens))


@router.post("/{relato_id}/avaliacao", response_model=RelatoOut, status_code=201)
def avaliar(relato_id: UUID, corpo: AvaliacaoCriar, ator: Ator = Depends(obter_ator),
            repo: RepositorioUrgencia = Depends(obter_repo)):
    service.avaliar(repo, ator, relato_id, corpo.classificacao.value, corpo.observacao_administrativa)
    return _out(repo, service.obter(repo, ator, relato_id))
