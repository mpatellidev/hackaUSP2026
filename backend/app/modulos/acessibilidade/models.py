"""Tabelas do chat (#9). Migração própria: alembic/versions/0003_acessibilidade_chat.py."""
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.time import utc_now
from app.models.base import CriadoEm, UuidPk


class PerfilChat(Base):
    """Como a pessoa prefere que o chat fale com ela. Respostas opcionais ("prefiro não dizer").
    Não é o perfil do contrato §9.2 (#18): aqui só ficam preferências de comunicação do chat."""
    __tablename__ = "chat_perfis"
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), primary_key=True)
    escolaridade: Mapped[str]
    faixa_etaria: Mapped[str]
    deficiencias: Mapped[list] = mapped_column(JSON, default=list)
    prefere_audio: Mapped[bool] = mapped_column(default=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class ConversaChat(UuidPk, CriadoEm, Base):
    __tablename__ = "chat_conversas"
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    # mock | gemini | claude — históricos de provedores diferentes têm formatos diferentes
    provedor: Mapped[str]


class MensagemChat(UuidPk, CriadoEm, Base):
    """Mensagem no formato nativo do provedor (papel + conteúdo JSON), reenviada sem alterações.
    Só-anexar: nunca editar nem apagar."""
    __tablename__ = "chat_mensagens"
    __table_args__ = (Index("ix_chat_mensagens_conversa_ordem", "conversa_id", "ordem"),)
    conversa_id: Mapped[str] = mapped_column(ForeignKey("chat_conversas.id"))
    ordem: Mapped[int]
    papel: Mapped[str]
    conteudo: Mapped[list | dict | str] = mapped_column(JSON)
