from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import CriadoEm, UuidPk

PAPEIS = ("paciente", "funcionario")
FUNCOES = ("atendimento", "profissional", "coordenacao")


class Usuario(UuidPk, CriadoEm, Base):
    __tablename__ = "usuarios"
    papel: Mapped[str]
    nome_exibicao: Mapped[str]
    conta_demo: Mapped[str] = mapped_column(unique=True)  # login DEMO, sem senha
    ativo: Mapped[bool] = mapped_column(default=True)


class VinculoClinica(UuidPk, Base):
    """Vínculo funcionário↔clínica. Fonte de verdade do escopo de acesso."""
    __tablename__ = "vinculos_clinica"
    __table_args__ = (UniqueConstraint("usuario_id", "clinica_id"),)
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    clinica_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"))
    funcao: Mapped[str]


class SessaoDemo(Base):
    __tablename__ = "sessoes_demo"
    token_hash: Mapped[str] = mapped_column(primary_key=True)  # só o hash fica no banco
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
