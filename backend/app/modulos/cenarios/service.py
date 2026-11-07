"""Regras de cenários acadêmicos. Quem age vem do `Actor` (token); papel e clínica nunca vêm do corpo."""
from app.core.auth import Actor
from app.core.errors import acesso_negado, nao_encontrado
from app.modulos.cenarios.models import Cenario
from app.modulos.cenarios.repositorio import RepositorioCenarios


def exigir_paciente(actor: Actor) -> None:
    if actor.papel != "paciente":
        raise acesso_negado("Apenas pacientes podem demonstrar interesse.")


def exigir_funcionario(actor: Actor) -> None:
    if actor.papel != "funcionario" or not actor.vinculos:
        raise acesso_negado("Apenas integrantes de clínica podem fazer isso.")


def clinica_da_coordenacao(actor: Actor) -> str:
    """Clínica onde a pessoa é coordenação; senão 403 (só a coordenação gerencia cenários)."""
    exigir_funcionario(actor)
    clinica_id = actor.clinica_da_funcao("coordenacao")
    if clinica_id is None:
        raise acesso_negado("Apenas a coordenação da clínica gerencia cenários.")
    return clinica_id


def cenario_visivel(repo: RepositorioCenarios, actor: Actor, cenario_id: str) -> Cenario:
    """Paciente enxerga só ativos; funcionário só os das próprias clínicas. Fora disso: 404."""
    c = repo.obter(cenario_id)
    if c is None:
        raise nao_encontrado("Não encontramos este cenário.")
    if actor.papel == "paciente" and c.estado != "ativo":
        raise nao_encontrado("Não encontramos este cenário.")
    if actor.papel == "funcionario" and c.clinica_id not in actor.clinica_ids:
        raise nao_encontrado("Não encontramos este cenário.")
    return c


def cenario_correspondente(repo: RepositorioCenarios, clinica_id: str, especialidade: str) -> bool:
    """Sinal de entrada da fila (#13): a clínica tem cenário ATIVO nessa especialidade. Não é prioridade clínica."""
    return any(c.especialidade == especialidade for c in repo.listar(clinica_ids={clinica_id}, somente_ativos=True))


def compatibilidade_academica(repo: RepositorioCenarios, paciente_id: str, clinica_ids: set[str],
                              especialidade: str | None = None) -> dict:
    """Sinal de entrada para o score (#13): paciente tem interesse `registrado` em cenário `ativo` da clínica
    (e da especialidade, se informada). NÃO é prioridade clínica nem diagnóstico."""
    for c in repo.listar(clinica_ids=clinica_ids, somente_ativos=True):
        if especialidade and c.especialidade != especialidade:
            continue
        i = repo.interesse_do_paciente(c.id, paciente_id)
        if i and i.estado == "registrado":
            return {"correspondente": True, "cenario_id": c.id}
    return {"correspondente": False, "cenario_id": None}
