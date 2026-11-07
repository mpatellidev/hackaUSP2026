"""Tabelas de cenários acadêmicos (migração própria: alembic/versions/0006_cenarios_tabelas.py)."""
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.time import utc_now
from app.models.base import CriadoEm, UuidPk

PUBLICOS = ("adultos", "criancas", "gestantes", "idosos")
ESPECIALIDADES = (
    "clinica_geral", "pediatria", "ginecologia_obstetricia", "cardiologia", "dermatologia",
    "ortopedia", "oftalmologia", "saude_mental", "odontologia", "fisioterapia", "nutricao",
)


class Cenario(UuidPk, Base):
    __tablename__ = "cenarios"
    clinica_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"), index=True)
    titulo: Mapped[str]
    descricao_leiga: Mapped[str]
    requisitos: Mapped[list] = mapped_column(JSON, default=list)
    publico: Mapped[str | None] = mapped_column(default=None)
    cidade: Mapped[str]
    uf: Mapped[str]
    especialidade: Mapped[str]
    estado: Mapped[str] = mapped_column(default="ativo")        # ativo | pausado
    publicado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class InteresseCenario(UuidPk, CriadoEm, Base):
    """Interesse NÃO é confirmação, avaliação profissional nem agendamento."""
    __tablename__ = "cenarios_interesses"
    __table_args__ = (UniqueConstraint("cenario_id", "paciente_id"),)
    cenario_id: Mapped[str] = mapped_column(ForeignKey("cenarios.id"), index=True)
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    estado: Mapped[str] = mapped_column(default="registrado")   # registrado | retirado
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
