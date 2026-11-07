"""Regras de urgência.

Interface para o score (#13): `urgencia_avaliada(repo, solicitacao_id)` e
`solicitacoes_com_urgencia_avaliada(repo)`. Só urgência CONFIRMADA por
profissional conta; relato não avaliado ou `sem_urgencia` nunca altera o score
nem gera penalidade.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

from .erros import acesso_negado, nao_encontrado, transicao_invalida
from .models import Ator, Avaliacao, Relato
from .repositorio import RepositorioUrgencia

FUSO = timezone(timedelta(hours=-3))  # America/Sao_Paulo


def _agora() -> datetime:
    return datetime.now(FUSO)


def _visivel(repo: RepositorioUrgencia, ator: Ator, r: Relato) -> bool:
    if ator.papel == "paciente":
        return r.paciente_id == ator.usuario_id
    if ator.papel == "funcionario" and r.solicitacao_id and ator.clinica_id:
        return repo.clinica_da_solicitacao(r.solicitacao_id) == ator.clinica_id
    return False


def criar_relato(repo: RepositorioUrgencia, ator: Ator, solicitacao_id: Optional[UUID]) -> tuple[Relato, bool]:
    """Devolve (relato, criado). Relato repetido e ainda pendente é reaproveitado."""
    if ator.papel != "paciente":
        raise acesso_negado("Só a pessoa atendida pode relatar urgência.")
    if solicitacao_id and repo.paciente_da_solicitacao(solicitacao_id) != ator.usuario_id:
        raise nao_encontrado()
    for r in repo.listar_relatos():
        if (r.paciente_id == ator.usuario_id and r.solicitacao_id == solicitacao_id
                and r.estado == "aguardando_avaliacao"):
            return r, False
    r = Relato(uuid4(), ator.usuario_id, solicitacao_id, "aguardando_avaliacao", _agora())
    repo.salvar_relato(r)
    return r, True


def listar(repo: RepositorioUrgencia, ator: Ator, estado: Optional[str] = None) -> list[Relato]:
    return [r for r in repo.listar_relatos() if _visivel(repo, ator, r) and (estado is None or r.estado == estado)]


def obter(repo: RepositorioUrgencia, ator: Ator, relato_id: UUID) -> Relato:
    r = repo.obter_relato(relato_id)
    if not r or not _visivel(repo, ator, r):
        raise nao_encontrado()
    return r


def avaliar(repo: RepositorioUrgencia, ator: Ator, relato_id: UUID,
            classificacao: str, observacao: Optional[str]) -> Avaliacao:
    """Só `funcionario` com `funcao == profissional`, da clínica do pedido."""
    if ator.papel != "funcionario" or ator.funcao != "profissional":
        raise acesso_negado("Só um profissional da clínica pode avaliar urgência.")
    r = obter(repo, ator, relato_id)
    if repo.avaliacao_do_relato(r.id):
        raise transicao_invalida("Este relato já foi avaliado.")
    a = Avaliacao(uuid4(), r.id, ator.usuario_id, classificacao, observacao, _agora())
    repo.salvar_avaliacao(a)
    r.estado = "avaliada"
    repo.salvar_relato(r)
    return a


def urgencia_avaliada(repo: RepositorioUrgencia, solicitacao_id: UUID) -> bool:
    return solicitacao_id in solicitacoes_com_urgencia_avaliada(repo)


def solicitacoes_com_urgencia_avaliada(repo: RepositorioUrgencia) -> set[UUID]:
    out: set[UUID] = set()
    for r in repo.listar_relatos():
        if r.solicitacao_id:
            a = repo.avaliacao_do_relato(r.id)
            if a and a.classificacao == "urgencia_confirmada":
                out.add(r.solicitacao_id)
    return out
