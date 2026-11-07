"""Montagem da fila a partir de pedidos do banco (usada pelo router da fila e pela ordem sugerida das vagas)."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.core.time import as_utc, utc_now
from app.models.solicitacoes import Solicitacao
from app.modulos.prioridade import pesos as pesos_mod
from app.modulos.prioridade import service
from app.modulos.prioridade.fontes import Fontes
from app.modulos.prioridade.models import RegistroFalta


def carregar_pesos() -> pesos_mod.Pesos:
    try:
        return pesos_mod.carregar()
    except pesos_mod.PesosInvalidos as e:
        raise ApiError(503, "servico_indisponivel", f"Configuração de pesos inválida: {e}")


def faltas_confirmadas(db: Session, paciente_ids: set[str]) -> dict[str, int]:
    """Só `RegistroFalta.estado = confirmada` conta. Cancelamento e relato de urgência nunca geram falta."""
    if not paciente_ids:
        return {}
    q = (select(RegistroFalta.paciente_id, func.count()).where(
        RegistroFalta.estado == "confirmada", RegistroFalta.paciente_id.in_(paciente_ids))
        .group_by(RegistroFalta.paciente_id))
    return dict(db.execute(q).all())


def ordenar_pedidos(db: Session, solicitacoes: list[Solicitacao],
                    fontes: Fontes) -> list[tuple[Solicitacao, service.Item]]:
    """(urgencia_avaliada desc, score desc, criado_em asc, id asc): urgência avaliada precede qualquer score."""
    pesos, agora = carregar_pesos(), utc_now()
    faltas = faltas_confirmadas(db, {s.paciente_id for s in solicitacoes})
    out = []
    for s in solicitacoes:
        entrada = service.Entrada(
            solicitacao_id=s.id, clinica_id=s.clinica_id, criado_em=as_utc(s.criado_em),
            urgencia=fontes.urgencia(s.id), faixa_renda=fontes.faixa_renda(s.paciente_id),
            necessidade_academica=fontes.cenario_correspondente(s.clinica_id, s.especialidade),
            faltas_confirmadas=faltas.get(s.paciente_id, 0))
        out.append((s, service.calcular(entrada, pesos, agora)))
    por_id = {i.entrada.solicitacao_id: s for s, i in out}
    return [(por_id[i.entrada.solicitacao_id], i) for i in service.ordenar([i for _, i in out])]
