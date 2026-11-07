"""Acesso ao banco do módulo de urgência. Regras de visibilidade ficam no serviço."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.solicitacoes import Solicitacao
from app.modulos.urgencia.models import AvaliacaoUrgencia, RelatoUrgencia


class RepositorioUrgencia:
    def __init__(self, db: Session) -> None:
        self.db = db

    def salvar_relato(self, r: RelatoUrgencia) -> None:
        self.db.add(r)
        self.db.flush()

    def obter_relato(self, relato_id: str) -> RelatoUrgencia | None:
        return self.db.get(RelatoUrgencia, relato_id)

    def listar_relatos(self) -> list[RelatoUrgencia]:
        return list(self.db.scalars(select(RelatoUrgencia).order_by(
            RelatoUrgencia.criado_em.desc(), RelatoUrgencia.id.desc())))

    def salvar_avaliacao(self, a: AvaliacaoUrgencia) -> None:
        self.db.add(a)
        self.db.flush()

    def avaliacao_do_relato(self, relato_id: str) -> AvaliacaoUrgencia | None:
        return self.db.scalar(select(AvaliacaoUrgencia).where(AvaliacaoUrgencia.relato_id == relato_id))

    def clinica_da_solicitacao(self, solicitacao_id: str) -> str | None:
        return self.db.scalar(select(Solicitacao.clinica_id).where(Solicitacao.id == solicitacao_id))

    def paciente_da_solicitacao(self, solicitacao_id: str) -> str | None:
        return self.db.scalar(select(Solicitacao.paciente_id).where(Solicitacao.id == solicitacao_id))

    def solicitacoes_com_classificacao(self, classificacao: str) -> set[str]:
        q = (select(RelatoUrgencia.solicitacao_id).join(AvaliacaoUrgencia, AvaliacaoUrgencia.relato_id == RelatoUrgencia.id)
             .where(RelatoUrgencia.solicitacao_id.is_not(None), AvaliacaoUrgencia.classificacao == classificacao))
        return set(self.db.scalars(q))

    def solicitacoes_com_relato_pendente(self) -> set[str]:
        q = select(RelatoUrgencia.solicitacao_id).where(
            RelatoUrgencia.solicitacao_id.is_not(None), RelatoUrgencia.estado == "aguardando_avaliacao")
        return set(self.db.scalars(q))
