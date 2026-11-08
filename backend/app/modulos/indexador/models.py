"""Indexador e referenciamento entre universidades parceiras.

- EscopoDidatico: o que cada clínica-escola ensina no semestre (cadastrado pelo gestor).
- DecisaoIndexador: toda decisão (manter na instituição ou referenciar), com candidatos e critérios, para auditoria.
- Referenciamento: a próxima consulta reservada na outra instituição; vale depois que o paciente confirma
  (a confirmação também é o consentimento para levar o diagnóstico).
"""
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import CriadoEm, UuidPk

MOTIVOS = ("adequado", "sem_vaga", "fora_do_escopo", "excede_limite_didatico")
ESTADOS_REFERENCIAMENTO = ("aguardando_paciente", "aceito", "recusado", "expirado")


class EscopoDidatico(UuidPk, Base):
    __tablename__ = "escopo_didatico"
    clinica_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"), index=True)
    semestre: Mapped[str]                       # ex.: 2026.2
    especialidade: Mapped[str]
    procedimento: Mapped[str]                   # código do procedimento ensinado
    complexidade_max: Mapped[int] = mapped_column(default=2)  # 1 básico · 2 intermediário · 3 avançado (pós)
    ativo: Mapped[bool] = mapped_column(default=True)


class DecisaoIndexador(UuidPk, CriadoEm, Base):
    __tablename__ = "decisoes_indexador"
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    solicitacao_id: Mapped[str | None] = mapped_column(ForeignKey("solicitacoes.id"), default=None)
    clinica_origem_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"))
    clinica_destino_id: Mapped[str | None] = mapped_column(ForeignKey("clinicas.id"), default=None)
    resultado: Mapped[str]                      # mantido | referenciado | sem_destino
    motivo: Mapped[str]
    candidatos: Mapped[list] = mapped_column(JSON, default=list)   # [{clinica_id, pontos, criterios}]
    versao_config: Mapped[str]


class Referenciamento(UuidPk, CriadoEm, Base):
    __tablename__ = "referenciamentos"
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    decisao_id: Mapped[str] = mapped_column(ForeignKey("decisoes_indexador.id"))
    solicitacao_origem_id: Mapped[str | None] = mapped_column(ForeignKey("solicitacoes.id"), default=None)
    solicitacao_destino_id: Mapped[str | None] = mapped_column(ForeignKey("solicitacoes.id"), default=None)
    clinica_destino_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"))
    vaga_id: Mapped[str | None] = mapped_column(ForeignKey("vagas.id"), default=None)
    estado: Mapped[str]
    respondido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
