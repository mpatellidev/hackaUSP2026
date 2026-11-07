"""Adaptadores da integração (#10): ligam módulos que têm auth/armazenamento próprios ao core.

- urgência (#14) e cenários (#11) esperam uma dependência de sessão própria (hoje um stub que devolve 401).
  Aqui o `Actor` do core (token -> papel e clínicas, sempre do servidor) é convertido para o tipo de cada módulo.
- Os dois módulos guardam dados EM MEMÓRIA (demo, carregados das fixtures): reiniciar a API volta ao estado inicial.
- A fila de prioridade (#13) passa a ler urgência avaliada e cenários desses módulos, não só dos JSON.
"""
import importlib
from uuid import UUID

from fastapi import Depends, FastAPI
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor
from app.core.db import get_db
from app.models.solicitacoes import Solicitacao
from app.modulos.cenarios import deps as cenarios_deps
from app.modulos.cenarios import erros as cenarios_erros
from app.modulos.cenarios import seed as cenarios_seed
from app.modulos.cenarios import service as cenarios_service
from app.modulos.prioridade import fontes as prioridade_fontes
from app.modulos.urgencia import erros as urgencia_erros
from app.modulos.urgencia import models as urgencia_models
from app.modulos.urgencia import repositorio as urgencia_repositorio
from app.modulos.urgencia import service as urgencia_service


urgencia_router = importlib.import_module("app.modulos.urgencia.router")


def _primeiro_vinculo(actor: Actor) -> tuple[str | None, str | None]:
    """Clínica e função do funcionário (ordem estável; o protótipo usa um vínculo por conta)."""
    if actor.papel != "funcionario" or not actor.vinculos:
        return None, None
    clinica_id = sorted(actor.vinculos)[0]
    return clinica_id, actor.vinculos[clinica_id]


def sessao_cenarios(actor: Actor = Depends(get_actor)) -> cenarios_deps.Sessao:
    clinica_id, funcao = _primeiro_vinculo(actor)
    return cenarios_deps.Sessao(actor.usuario_id, actor.papel, funcao, clinica_id)


def ator_urgencia(actor: Actor = Depends(get_actor)) -> urgencia_models.Ator:
    clinica_id, funcao = _primeiro_vinculo(actor)
    return urgencia_models.Ator(UUID(actor.usuario_id), actor.papel, funcao, UUID(clinica_id) if clinica_id else None)


class RepoUrgenciaComBanco:
    """Relatos e avaliações ficam na memória do módulo; pedidos (paciente e clínica) vêm do banco real."""

    def __init__(self, memoria, db: Session) -> None:
        self._memoria, self._db = memoria, db

    def __getattr__(self, nome):
        return getattr(self._memoria, nome)

    def _pedido(self, solicitacao_id: UUID) -> Solicitacao | None:
        return self._db.scalar(select(Solicitacao).where(Solicitacao.id == str(solicitacao_id)))

    def clinica_da_solicitacao(self, solicitacao_id: UUID) -> UUID | None:
        p = self._pedido(solicitacao_id)
        return UUID(p.clinica_id) if p else None

    def paciente_da_solicitacao(self, solicitacao_id: UUID) -> UUID | None:
        p = self._pedido(solicitacao_id)
        return UUID(p.paciente_id) if p else None


class FontesIntegradas(prioridade_fontes.FontesDemo):
    """Urgência avaliada (#14) e cenários ativos (#11) vêm dos módulos; perfil (#18) ainda é fixture."""

    def __init__(self, repo_urgencia) -> None:
        super().__init__()
        self._repo_urgencia = repo_urgencia

    def urgencia(self, solicitacao_id: str) -> str:
        repo, sid = self._repo_urgencia, UUID(solicitacao_id)
        if urgencia_service.urgencia_avaliada(repo, sid):
            return "avaliada"
        pendente = any(r.solicitacao_id == sid and r.estado == "aguardando_avaliacao" for r in repo.listar_relatos())
        return "autodeclarada" if pendente else "nenhuma"

    def cenario_correspondente(self, clinica_id: str, especialidade: str) -> bool:
        return any(c.clinica_id == clinica_id and c.especialidade == especialidade and c.estado == "ativo"
                   for c in cenarios_service.repo.listar())


def instalar(app: FastAPI) -> None:
    """Cada app nasce com urgência e cenários no estado inicial das fixtures (memória, demo)."""
    memoria = urgencia_repositorio.RepositorioMemoria.das_fixtures()
    cenarios_service.repo.cenarios.clear()
    cenarios_service.repo.interesses.clear()
    cenarios_seed.carregar()
    app.dependency_overrides[cenarios_deps.obter_sessao] = sessao_cenarios
    app.dependency_overrides[urgencia_router.obter_ator] = ator_urgencia
    app.dependency_overrides[urgencia_router.obter_repo] = lambda db=Depends(get_db): RepoUrgenciaComBanco(memoria, db)
    app.dependency_overrides[prioridade_fontes.get_fontes] = lambda: FontesIntegradas(memoria)
    app.add_exception_handler(cenarios_erros.ErroApi, _tratar_cenarios)
    app.add_exception_handler(urgencia_erros.ErroApi, urgencia_erros.tratar_erro_api)


async def _tratar_cenarios(request, exc: cenarios_erros.ErroApi):
    from fastapi.responses import JSONResponse
    corpo = cenarios_erros._corpo(exc.codigo, exc.mensagem, exc.detalhes)
    return JSONResponse(corpo, status_code=exc.status)
