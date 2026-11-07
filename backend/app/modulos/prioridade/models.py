from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import CriadoEm, UuidPk

ESTADOS_FALTA = ("confirmada", "revertida")


class RegistroFalta(UuidPk, CriadoEm, Base):
    """Falta EFETIVA registrada por humano (profissional). Nunca criada automaticamente."""
    __tablename__ = "registros_falta"
    __table_args__ = (Index("uq_falta_agendamento", "agendamento_id", unique=True),)
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    agendamento_id: Mapped[str | None] = mapped_column(ForeignKey("agendamentos.id"), default=None)
    clinica_id: Mapped[str | None] = mapped_column(ForeignKey("clinicas.id"), default=None)
    registrada_por: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    justificativa: Mapped[str]
    estado: Mapped[str] = mapped_column(default="confirmada")


class RevisaoFalta(UuidPk, CriadoEm, Base):
    """Auditoria append-only das revisões: nunca atualizar nem apagar linhas."""
    __tablename__ = "revisoes_falta"
    falta_id: Mapped[str] = mapped_column(ForeignKey("registros_falta.id"), index=True)
    acao: Mapped[str]                       # reverter | manter
    motivo: Mapped[str]
    revisor_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    estado_anterior: Mapped[str]
    estado_novo: Mapped[str]
