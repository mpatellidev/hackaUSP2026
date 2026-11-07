"""Regras de urgência.

Interface para o score (#13): `status_urgencia`, `urgencia_avaliada` e `solicitacoes_com_urgencia_avaliada`.
Só urgência CONFIRMADA por profissional conta; relato não avaliado ou `sem_urgencia` nunca altera o score
nem gera penalidade. Quem age (papel, função, clínicas) vem do `Actor` do servidor, nunca do corpo.
"""
from app.core.auth import Actor
from app.core.errors import acesso_negado, nao_encontrado, transicao_invalida
from app.core.time import utc_now
from app.modulos.urgencia.models import AvaliacaoUrgencia, RelatoUrgencia
from app.modulos.urgencia.repositorio import RepositorioUrgencia


def _visivel(repo: RepositorioUrgencia, actor: Actor, r: RelatoUrgencia) -> bool:
    if actor.papel == "paciente":
        return r.paciente_id == actor.usuario_id
    if actor.papel == "funcionario" and r.solicitacao_id:
        return repo.clinica_da_solicitacao(r.solicitacao_id) in actor.clinica_ids
    return False


def criar_relato(repo: RepositorioUrgencia, actor: Actor, solicitacao_id: str | None) -> tuple[RelatoUrgencia, bool]:
    """Devolve (relato, criado). Relato repetido e ainda pendente é reaproveitado."""
    if actor.papel != "paciente":
        raise acesso_negado("Só a pessoa atendida pode relatar urgência.")
    if solicitacao_id and repo.paciente_da_solicitacao(solicitacao_id) != actor.usuario_id:
        raise nao_encontrado("Não encontramos este registro.")
    for r in repo.listar_relatos():
        if (r.paciente_id == actor.usuario_id and r.solicitacao_id == solicitacao_id
                and r.estado == "aguardando_avaliacao"):
            return r, False
    r = RelatoUrgencia(paciente_id=actor.usuario_id, solicitacao_id=solicitacao_id,
                       estado="aguardando_avaliacao", criado_em=utc_now())
    repo.salvar_relato(r)
    return r, True


def listar(repo: RepositorioUrgencia, actor: Actor, estado: str | None = None) -> list[RelatoUrgencia]:
    return [r for r in repo.listar_relatos() if _visivel(repo, actor, r) and (estado is None or r.estado == estado)]


def obter(repo: RepositorioUrgencia, actor: Actor, relato_id: str) -> RelatoUrgencia:
    r = repo.obter_relato(relato_id)
    if not r or not _visivel(repo, actor, r):
        raise nao_encontrado("Não encontramos este registro.")
    return r


def avaliar(repo: RepositorioUrgencia, actor: Actor, relato_id: str,
            classificacao: str, observacao: str | None) -> AvaliacaoUrgencia:
    """Só `funcionario` com função `profissional`, da clínica do pedido."""
    if actor.papel != "funcionario" or "profissional" not in actor.vinculos.values():
        raise acesso_negado("Só um profissional da clínica pode avaliar urgência.")
    r = obter(repo, actor, relato_id)
    if not actor.tem_funcao(repo.clinica_da_solicitacao(r.solicitacao_id), "profissional"):
        raise acesso_negado("Só um profissional da clínica pode avaliar urgência.")
    if repo.avaliacao_do_relato(r.id):
        raise transicao_invalida("Este relato já foi avaliado.")
    a = AvaliacaoUrgencia(relato_id=r.id, avaliador_usuario_id=actor.usuario_id, classificacao=classificacao,
                          observacao_administrativa=observacao, avaliado_em=utc_now())
    repo.salvar_avaliacao(a)
    r.estado = "avaliada"
    repo.db.flush()
    return a


def solicitacoes_com_urgencia_avaliada(repo: RepositorioUrgencia) -> set[str]:
    return repo.solicitacoes_com_classificacao("urgencia_confirmada")


def urgencia_avaliada(repo: RepositorioUrgencia, solicitacao_id: str) -> bool:
    return solicitacao_id in solicitacoes_com_urgencia_avaliada(repo)


def status_urgencia(repo: RepositorioUrgencia, solicitacao_id: str) -> str:
    """Para a fila (#13): `avaliada` (urgência confirmada por profissional, precede qualquer score),
    `autodeclarada` (relato aguardando avaliação: só sinaliza, não reordena) ou `nenhuma`."""
    if urgencia_avaliada(repo, solicitacao_id):
        return "avaliada"
    return "autodeclarada" if solicitacao_id in repo.solicitacoes_com_relato_pendente() else "nenhuma"
