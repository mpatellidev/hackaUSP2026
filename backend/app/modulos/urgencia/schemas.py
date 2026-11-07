from datetime import datetime
from enum import Enum
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EstadoRelato(str, Enum):
    aguardando_avaliacao = "aguardando_avaliacao"
    avaliada = "avaliada"


class Classificacao(str, Enum):
    urgencia_confirmada = "urgencia_confirmada"
    sem_urgencia = "sem_urgencia"


class RelatoCriar(BaseModel):
    """`paciente_id`, papel e clínica vêm do token; campos extras são ignorados."""

    model_config = ConfigDict(extra="ignore")
    solicitacao_id: Optional[UUID] = None


class AvaliacaoCriar(BaseModel):
    model_config = ConfigDict(extra="ignore")
    classificacao: Classificacao
    observacao_administrativa: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Nota administrativa. Não registre diagnóstico nem dados clínicos.",
    )


class AvaliacaoOut(BaseModel):
    id: UUID
    relato_id: UUID
    avaliador_usuario_id: UUID
    classificacao: Classificacao
    observacao_administrativa: Optional[str]
    avaliado_em: datetime


class RelatoOut(BaseModel):
    id: UUID
    paciente_id: UUID
    solicitacao_id: Optional[UUID]
    estado: EstadoRelato
    criado_em: datetime
    rotulo: str
    avaliacao: Optional[AvaliacaoOut] = None
    modo: Literal["demo"] = "demo"
    aviso: str


class ListaRelatos(BaseModel):
    itens: list[RelatoOut]
    total: int


class Orientacao(BaseModel):
    modo: Literal["demo"] = "demo"
    samu: str
    texto: str
    aviso: str
