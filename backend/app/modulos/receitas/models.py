"""Receitas pós-consulta. O estudante redige; só vale depois que o professor (cirurgião-dentista) aprova e
assina (nome e CRO registrados). Itens e orientações são cifrados em repouso (dado de saúde)."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import CriadoEm, UuidPk

ESTADOS = ("rascunho", "assinada")


class Receita(UuidPk, CriadoEm, Base):
    __tablename__ = "receitas"
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    clinica_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"))
    solicitacao_id: Mapped[str | None] = mapped_column(ForeignKey("solicitacoes.id"), default=None)
    agendamento_id: Mapped[str | None] = mapped_column(ForeignKey("agendamentos.id"), default=None)
    instituicao: Mapped[str]
    conteudo_cifrado: Mapped[str]          # JSON {"itens": [...], "orientacoes": "..."} cifrado (core.cripto)
    autor_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    estado: Mapped[str]
    assinado_por: Mapped[str | None] = mapped_column(ForeignKey("usuarios.id"), default=None)
    assinante_nome: Mapped[str | None] = mapped_column(default=None)
    assinante_cro: Mapped[str | None] = mapped_column(default=None)
    assinado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
