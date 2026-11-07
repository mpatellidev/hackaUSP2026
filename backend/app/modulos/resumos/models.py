"""Resumo compartilhável (DEMO) com escolha do paciente e auditoria (migração 0010). Não é prontuário real."""
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import UuidPk


class ResumoProntuario(UuidPk, Base):
    __tablename__ = "resumos"
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    clinica_autora_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"))
    campos: Mapped[list] = mapped_column(JSON)  # [{nome, valor}] fictícios
    criado_por: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Compartilhamento(UuidPk, Base):
    __tablename__ = "resumos_compartilhamentos"
    resumo_id: Mapped[str] = mapped_column(ForeignKey("resumos.id"), index=True)
    clinica_destino_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"), index=True)
    campos_compartilhados: Mapped[list] = mapped_column(JSON)
    finalidade: Mapped[str]
    aceite: Mapped[str]  # aceito | recusado
    aceito_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revogado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class EventoAcesso(UuidPk, Base):
    __tablename__ = "resumos_eventos_acesso"
    resumo_id: Mapped[str] = mapped_column(ForeignKey("resumos.id"), index=True)
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    clinica_id: Mapped[str | None] = mapped_column(ForeignKey("clinicas.id"), default=None)
    tipo: Mapped[str]  # consulta | criacao | aceite | recusa | revogacao
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
