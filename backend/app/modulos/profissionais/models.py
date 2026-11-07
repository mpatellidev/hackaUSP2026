"""Profissionais fictícios das clínicas-escola e blocos de agenda (migração 0009)."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import UuidPk

VINCULOS = ("docente", "residente", "estudante_supervisionado")
ESTADOS_BLOCO = ("disponivel", "reservado", "indisponivel")


class Profissional(UuidPk, Base):
    __tablename__ = "profissionais"
    clinica_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"), index=True)
    nome_exibicao: Mapped[str]
    especialidade: Mapped[str]
    vinculo: Mapped[str]
    ativo: Mapped[bool] = mapped_column(default=True)


class BlocoAgenda(UuidPk, Base):
    __tablename__ = "agenda_blocos"
    profissional_id: Mapped[str] = mapped_column(ForeignKey("profissionais.id"), index=True)
    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    fim: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    estado: Mapped[str]
