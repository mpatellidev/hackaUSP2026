"""Sessão vinda do servidor (token). A #2 substitui `obter_sessao` via dependency_overrides
(ou apontando este nome para a auth real). Nada aqui lê papel/clínica do corpo."""
from dataclasses import dataclass
from typing import Optional

from fastapi import Header

from .erros import ErroApi


@dataclass(frozen=True)
class Sessao:
    usuario_id: str
    papel: str  # paciente | funcionario
    funcao: Optional[str] = None  # atendimento | profissional | coordenacao
    clinica_id: Optional[str] = None




def obter_sessao(authorization: Optional[str] = Header(default=None)) -> Sessao:
    # Padrão: sem auth integrada ainda -> sempre 401. dev_app.py injeta um stub DEMO.
    raise ErroApi(401, "nao_autenticado", "Entre na sua conta para continuar.")


def exigir_paciente(s: Sessao) -> Sessao:
    if s.papel != "paciente":
        raise ErroApi(403, "acesso_negado", "Apenas pacientes podem demonstrar interesse.")
    return s


def exigir_funcionario(s: Sessao) -> Sessao:
    if s.papel != "funcionario" or not s.clinica_id:
        raise ErroApi(403, "acesso_negado", "Apenas integrantes de clínica podem fazer isso.")
    return s


def exigir_coordenacao(s: Sessao) -> Sessao:
    exigir_funcionario(s)
    if s.funcao != "coordenacao":
        raise ErroApi(403, "acesso_negado", "Apenas a coordenação da clínica gerencia cenários.")
    return s
