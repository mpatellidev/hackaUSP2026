"""Prontuário Único do paciente (LGPD: conteúdo cifrado em repouso; todo acesso fica registrado).

Quem escreve: estudante da clínica-escola. Quem valida: professor/supervisor. O paciente lê o próprio.
Ao ser referenciado para outra universidade, o diagnóstico validado vai junto (com consentimento), sem repetir exames.
"""
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import CriadoEm, UuidPk

TIPOS = ("triagem", "exame_clinico", "radiografia", "laudo", "plano_tratamento", "evolucao")
RISCOS = ("baixo", "moderado", "alto", "urgente")


class RegistroProntuario(UuidPk, CriadoEm, Base):
    __tablename__ = "prontuario_registros"
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    clinica_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"))
    solicitacao_id: Mapped[str | None] = mapped_column(ForeignKey("solicitacoes.id"), default=None)
    tipo: Mapped[str]
    risco_clinico: Mapped[str | None] = mapped_column(default=None)            # só na triagem/plano
    procedimentos: Mapped[list] = mapped_column(JSON, default=list)            # códigos de procedimento necessários
    especialidades: Mapped[list] = mapped_column(JSON, default=list)           # especialidades necessárias
    conteudo_cifrado: Mapped[str]                                             # texto clínico (core.cripto)
    autor_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))           # estudante
    validado_por: Mapped[str | None] = mapped_column(ForeignKey("usuarios.id"), default=None)  # professor
    validado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)


class AcessoProntuario(UuidPk, CriadoEm, Base):
    """Log de acesso (append-only): quem viu/escreveu/validou/compartilhou o prontuário de quem."""
    __tablename__ = "prontuario_acessos"
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"), index=True)
    usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    registro_id: Mapped[str | None] = mapped_column(ForeignKey("prontuario_registros.id"), default=None)
    clinica_id: Mapped[str | None] = mapped_column(ForeignKey("clinicas.id"), default=None)
    acao: Mapped[str]  # consulta | criacao | validacao | compartilhamento
