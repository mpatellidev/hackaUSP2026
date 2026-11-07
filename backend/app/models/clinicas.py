from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import UuidPk


class Clinica(UuidPk, Base):
    __tablename__ = "clinicas"
    nome: Mapped[str]
    cidade: Mapped[str]
    uf: Mapped[str]
    publico: Mapped[list] = mapped_column(JSON, default=list)
    especialidades: Mapped[list] = mapped_column(JSON, default=list)
    custo_informado: Mapped[str]            # gratuito | a_confirmar | pago_informado
    recebendo_pedidos: Mapped[bool]
    telefone: Mapped[str]                   # sempre fictício (DD) 0000-XXXX
