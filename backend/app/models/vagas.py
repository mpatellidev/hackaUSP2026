from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import CriadoEm, UuidPk


class Vaga(UuidPk, CriadoEm, Base):
    __tablename__ = "vagas"
    clinica_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"), index=True)
    especialidade: Mapped[str]
    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    fim: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    estado: Mapped[str]                     # aberta | preenchida | cancelada
    criado_por: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))


class InteresseVaga(UuidPk, CriadoEm, Base):
    """Interesse NÃO é agendamento."""
    __tablename__ = "interesses_vaga"
    __table_args__ = (UniqueConstraint("vaga_id", "solicitacao_id"),)
    vaga_id: Mapped[str] = mapped_column(ForeignKey("vagas.id"))
    solicitacao_id: Mapped[str] = mapped_column(ForeignKey("solicitacoes.id"))
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    estado: Mapped[str]                     # registrado | confirmado | nao_selecionado | retirado


class Agendamento(UuidPk, Base):
    __tablename__ = "agendamentos"
    # No máximo UM agendamento não cancelado por vaga (contrato §7.4), garantido pelo banco.
    __table_args__ = (
        Index("uq_agendamento_vaga_ativo", "vaga_id", unique=True,
              sqlite_where=text("estado <> 'cancelado'"),
              postgresql_where=text("estado <> 'cancelado'")),
    )
    vaga_id: Mapped[str] = mapped_column(ForeignKey("vagas.id"))
    solicitacao_id: Mapped[str] = mapped_column(ForeignKey("solicitacoes.id"))
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    clinica_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"))
    estado: Mapped[str]                     # agendado | concluido | cancelado
    confirmado_por: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    confirmado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
