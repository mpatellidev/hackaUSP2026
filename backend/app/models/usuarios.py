from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import CriadoEm, UuidPk

PAPEIS = ("paciente", "funcionario")
# profissional = professor/supervisor · coordenacao = gestor da clínica-escola · estudante = graduação (atende)
FUNCOES = ("atendimento", "profissional", "coordenacao", "estudante")


class Usuario(UuidPk, CriadoEm, Base):
    __tablename__ = "usuarios"
    __table_args__ = (Index("uq_usuarios_email", "email", unique=True),
                      Index("uq_usuarios_cpf_hash", "cpf_hash", unique=True))
    papel: Mapped[str]
    nome_exibicao: Mapped[str]
    conta_demo: Mapped[str] = mapped_column(unique=True)  # nome da conta (login do painel); no cadastro = e-mail
    email: Mapped[str | None] = mapped_column(default=None)  # login do paciente (minúsculo, índice único)
    # CPF: chave de interoperabilidade. Nunca em texto aberto: hash (busca e unicidade) + valor cifrado (core.cripto)
    cpf_hash: Mapped[str | None] = mapped_column(default=None)
    cpf_cifrado: Mapped[str | None] = mapped_column(default=None)
    cro: Mapped[str | None] = mapped_column(default=None)  # registro do cirurgião-dentista (quem assina receita)
    senha_hash: Mapped[str | None] = mapped_column(default=None)  # pbkdf2; senha única de demo (core.config)
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
