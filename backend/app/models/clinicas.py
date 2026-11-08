from sqlalchemy import JSON, Float
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
    telefone: Mapped[str]                   # fictício: (DD) 1XXX-XXXX não é número válido no Brasil
    endereco: Mapped[str | None] = mapped_column(default=None)
    bairro: Mapped[str | None] = mapped_column(default=None)
    cep: Mapped[str | None] = mapped_column(default=None)
    latitude: Mapped[float | None] = mapped_column(Float, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, default=None)
    # Universidade parceira (para o ranqueamento): pública ou privada, turnos, transporte e acessibilidade
    universidade: Mapped[str | None] = mapped_column(default=None)
    tipo_instituicao: Mapped[str | None] = mapped_column(default=None)   # publica | privada
    turnos: Mapped[list] = mapped_column(JSON, default=list)             # manha | tarde | noite
    transportes: Mapped[list] = mapped_column(JSON, default=list)        # metro | trem | onibus | estacionamento
    acessivel: Mapped[bool | None] = mapped_column(default=None)         # entrada e consultório sem degraus
    acessibilidade_info: Mapped[str | None] = mapped_column(default=None)  # texto para a página da clínica
    como_chegar: Mapped[str | None] = mapped_column(default=None)
    valor_consulta: Mapped[float | None] = mapped_column(Float, default=None)  # None + custo gratuito = gratuito
    # {"seg": ["08:00", "18:00"], ..., "dom": null} (horário de São Paulo)
    horarios_funcionamento: Mapped[dict] = mapped_column(JSON, default=dict)
    atende_urgencia: Mapped[bool] = mapped_column(default=False)
    horario_urgencia: Mapped[dict] = mapped_column(JSON, default=dict)
