"""Avaliação de clínica (migração 0010)."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import UuidPk


class AvaliacaoClinica(UuidPk, Base):
    """Uma avaliação por atendimento (solicitação concluída); o autor pode editar."""
    __tablename__ = "avaliacoes_clinica"
    __table_args__ = (UniqueConstraint("solicitacao_id"),)
    clinica_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"), index=True)
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    solicitacao_id: Mapped[str] = mapped_column(ForeignKey("solicitacoes.id"))
    nota: Mapped[int]
    comentario: Mapped[str | None] = mapped_column(default=None)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
