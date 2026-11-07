from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class Relato:
    id: UUID
    paciente_id: UUID
    solicitacao_id: Optional[UUID]
    estado: str
    criado_em: datetime


@dataclass
class Avaliacao:
    id: UUID
    relato_id: UUID
    avaliador_usuario_id: UUID
    classificacao: str
    observacao_administrativa: Optional[str]
    avaliado_em: datetime


@dataclass(frozen=True)
class Ator:
    """Identidade vinda do servidor (token). Nunca construída a partir do corpo."""

    usuario_id: UUID
    papel: str  # "paciente" | "funcionario"
    funcao: Optional[str] = None  # atendimento | profissional | coordenacao
    clinica_id: Optional[UUID] = None
