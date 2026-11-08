from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.models.base import CriadoEm, UuidPk

ESTADOS = ("enviada", "em_analise", "precisa_contato", "indisponivel",
           "aguardando_confirmacao", "agendada", "concluida")
ESTADOS_ATIVOS = ("enviada", "em_analise", "precisa_contato")
TRILHAS = ("avulso", "estruturada")
TIPOS_EVENTO = ("criada", "transicao", "encaminhamento_escolhido",
                "interesse_registrado", "confirmacao")


class Solicitacao(UuidPk, CriadoEm, Base):
    __tablename__ = "solicitacoes"
    __table_args__ = (Index("ix_solicitacoes_paciente", "paciente_id"),
                      Index("ix_solicitacoes_clinica", "clinica_id"))
    paciente_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    clinica_id: Mapped[str] = mapped_column(ForeignKey("clinicas.id"))
    estado: Mapped[str]
    especialidade: Mapped[str]
    publico_alvo: Mapped[str]
    descricao_administrativa: Mapped[str]   # sem dados clínicos sensíveis
    solicitacao_origem_id: Mapped[str | None] = mapped_column(ForeignKey("solicitacoes.id"), default=None)
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    # Dados de contato do pedido (opcionais; só administrativos, nunca clínicos)
    para_quem: Mapped[str | None] = mapped_column(default=None)        # mim | outra
    nome_paciente: Mapped[str | None] = mapped_column(default=None)    # quem será atendido
    telefone_contato: Mapped[str | None] = mapped_column(default=None)
    trilha: Mapped[str | None] = mapped_column(default=None)  # avulso (porta aberta) | estruturada (começa pela triagem)


class EventoSolicitacao(UuidPk, CriadoEm, Base):
    """Histórico append-only: nunca atualizar nem apagar linhas."""
    __tablename__ = "eventos_solicitacao"
    solicitacao_id: Mapped[str] = mapped_column(ForeignKey("solicitacoes.id"), index=True)
    tipo: Mapped[str]
    estado_anterior: Mapped[str | None]
    estado_novo: Mapped[str | None]
    autor_usuario_id: Mapped[str] = mapped_column(ForeignKey("usuarios.id"))
    autor_papel: Mapped[str]
    motivo: Mapped[str | None]              # administrativo, nunca clínico
