"""Tabela de perfil (migração própria: alembic/versions/0007_perfil_tabela.py)."""
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey
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
    # Endereço/território (para sugerir a universidade mais próxima e acessível)
    cep: Mapped[str | None] = mapped_column(default=None)
    logradouro: Mapped[str | None] = mapped_column(default=None)
    numero: Mapped[str | None] = mapped_column(default=None)
    bairro: Mapped[str | None] = mapped_column(default=None)
    latitude: Mapped[float | None] = mapped_column(Float, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, default=None)
    # Preferências de atendimento
    preferencia_instituicao: Mapped[str | None] = mapped_column(default=None)  # publica | privada | tanto_faz
    distancia_max_km: Mapped[float | None] = mapped_column(Float, default=None)
    transportes: Mapped[list] = mapped_column(JSON, default=list)              # a_pe | onibus | metro | trem | carro
    turnos: Mapped[list] = mapped_column(JSON, default=list)                   # manha | tarde | noite
    precisa_acessibilidade: Mapped[bool] = mapped_column(default=False)
    # Dados sensíveis (LGPD): só são guardados e usados no score com consentimento explícito
    possui_deficiencia: Mapped[bool | None] = mapped_column(default=None)
    tipo_deficiencia: Mapped[str | None] = mapped_column(default=None)
    consentimento_sensivel_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    # Modo de uso escolhido depois do login: conversa (assistente) | telas (painel manual)
    modo_atendimento: Mapped[str | None] = mapped_column(default=None)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
