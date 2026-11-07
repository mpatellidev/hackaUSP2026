from typing import Literal

from pydantic import BaseModel, Field

EstadoAgendamento = Literal["agendado", "concluido", "cancelado"]


class CancelarIn(BaseModel):
    """O motivo é administrativo e opcional; nunca dado clínico. Quem cancela vem do token."""
    motivo: str | None = Field(default=None, max_length=280)
