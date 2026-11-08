"""Notificações ao paciente. Canal "app" (e o chat) sempre; e-mail, SMS e WhatsApp ficam "registrada"
até um provedor ser configurado (nada é prometido como enviado sem ter sido)."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import CriadoEm, UuidPk

CANAIS = ("app", "email", "sms", "whatsapp")
ESTADOS = ("entregue", "registrada", "falhou", "lida")


class Notificacao(UuidPk, CriadoEm, Base):
    __tablename__ = "notificacoes"
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    canal: Mapped[str]
    titulo: Mapped[str]
    texto: Mapped[str]
    estado: Mapped[str]
    referencia: Mapped[str | None] = mapped_column(default=None)  # ex.: referenciamento:<id>
    lida_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
