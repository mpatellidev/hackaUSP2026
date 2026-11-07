from typing import Literal

from pydantic import BaseModel, Field

from app.modulos.vagas.schemas import AgendamentoBase, EstadoAgendamento, EstadoPedido, EstadoVaga


class CancelarIn(BaseModel):
    """O motivo é administrativo e opcional; nunca dado clínico. Quem cancela vem do token."""
    motivo: str | None = Field(default=None, max_length=280)


class VagaDoAgendamento(BaseModel):
    id: str
    especialidade: str
    inicio: str
    fim: str
    estado: EstadoVaga


class ClinicaDoAgendamento(BaseModel):
    id: str
    nome: str
    telefone: str


class AgendamentoOut(AgendamentoBase):
    vaga: VagaDoAgendamento
    clinica: ClinicaDoAgendamento
    paciente_nome_exibicao: str | None = None  # só para funcionário


class ListaAgendamentos(BaseModel):
    itens: list[AgendamentoOut]
    total: int


class CanceladoOut(AgendamentoOut):
    solicitacao_estado: EstadoPedido
    vaga_estado: EstadoVaga
    cancelado_em: str
    aviso: str
