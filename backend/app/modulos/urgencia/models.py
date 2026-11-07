"""Tabelas de urgência (migração própria: alembic/versions/0005_urgencia_tabelas.py)."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import CriadoEm, UuidPk

ESTADOS_RELATO = ("aguardando_avaliacao", "avaliada")
CLASSIFICACOES = ("urgencia_confirmada", "sem_urgencia")


class RelatoUrgencia(UuidPk, CriadoEm, Base):
    """Relato feito pelo paciente. Gera revisão humana; NUNCA gera punição."""
    __tablename__ = "urgencia_relatos"
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    solicitacao_id: Mapped[str | None] = mapped_column(ForeignKey("solicitacoes.id"), default=None, index=True)
    estado: Mapped[str] = mapped_column(default="aguardando_avaliacao")


class AvaliacaoUrgencia(UuidPk, Base):
    """Avaliação por profissional (única por relato). Só a avaliação `urgencia_confirmada` pesa na fila (#13)."""
    __tablename__ = "urgencia_avaliacoes"
    __table_args__ = (UniqueConstraint("relato_id"),)
    relato_id: Mapped[str] = mapped_column(ForeignKey("urgencia_relatos.id"))
    avaliador_usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    classificacao: Mapped[str]
    observacao_administrativa: Mapped[str | None] = mapped_column(default=None)
    avaliado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
