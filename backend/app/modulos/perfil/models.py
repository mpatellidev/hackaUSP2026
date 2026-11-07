"""Tabela de perfil (migração própria: alembic/versions/0007_perfil_tabela.py)."""
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.time import utc_now


class PerfilUsuario(Base):
    """Um perfil por pessoa. Renda é opcional e só alimenta a fila explicável (#13); nunca fica visível a outros
    pacientes nem à clínica em texto (a fila mostra só o componente numérico)."""
    __tablename__ = "perfis"
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), primary_key=True)
    cidade: Mapped[str | None] = mapped_column(default=None)
    uf: Mapped[str | None] = mapped_column(default=None)
    contato_preferido: Mapped[str | None] = mapped_column(default=None)        # app | telefone
    socioeconomico: Mapped[dict] = mapped_column(JSON, default=dict)
    acessibilidade: Mapped[dict] = mapped_column(JSON, default=dict)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
