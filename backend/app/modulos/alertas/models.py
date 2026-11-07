"""Alertas de vaga e preferência de aviso (migração 0010). Alerta não é reserva nem agendamento; não há push."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import UuidPk


class PreferenciaAlerta(Base):
    __tablename__ = "alertas_preferencia"
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), primary_key=True)
    receber: Mapped[bool] = mapped_column(default=False)
    ligacao: Mapped[bool] = mapped_column(default=False)  # aceita contato por telefone (a clínica liga; sem ligação automática)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Alerta(UuidPk, Base):
    __tablename__ = "alertas"
    __table_args__ = (UniqueConstraint("paciente_id", "vaga_id"),)  # um alerta por (paciente, vaga)
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    vaga_id: Mapped[str] = mapped_column(ForeignKey("vagas.id"))
    clinica_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"))
    evento_origem: Mapped[str] = mapped_column(default="vaga_criada")
    lido: Mapped[bool] = mapped_column(default=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
