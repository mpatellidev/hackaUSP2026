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
from app.models.vagas import Agendamento


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


def risco_clinico(db: Session, paciente_id: str) -> str | None:
    """Risco da triagem/plano mais recente VALIDADO por professor (nunca autodeclarado)."""
    from app.modulos.prontuario.models import RegistroProntuario
    return db.scalar(select(RegistroProntuario.risco_clinico).where(
        RegistroProntuario.paciente_id == paciente_id, RegistroProntuario.validado_por.is_not(None),
        RegistroProntuario.risco_clinico.is_not(None)).order_by(RegistroProntuario.validado_em.desc()).limit(1))


def assiduidade(db: Session, paciente_id: str) -> tuple[int, int]:
    """(comparecimentos, cancelamentos com aviso). Falta sem aviso conta à parte (só falta confirmada)."""
    q = select(Agendamento.desfecho, func.count()).where(Agendamento.paciente_id == paciente_id).group_by(Agendamento.desfecho)
    n = dict(db.execute(q).all())
    return n.get("compareceu", 0), n.get("cancelado_antecipado", 0)


def entrada_do_paciente(db: Session, paciente_id: str, solicitacao: Solicitacao | None, fontes: Fontes,
                        faltas: int) -> service.Entrada:
    comp, canc = assiduidade(db, paciente_id)
    return service.Entrada(
        solicitacao_id=solicitacao.id if solicitacao else paciente_id,
        clinica_id=solicitacao.clinica_id if solicitacao else "",
        criado_em=as_utc(solicitacao.criado_em) if solicitacao else utc_now(),
        urgencia=fontes.urgencia(solicitacao.id) if solicitacao else "nenhuma",
        faixa_renda=fontes.faixa_renda(paciente_id),
        necessidade_academica=fontes.cenario_correspondente(solicitacao.clinica_id, solicitacao.especialidade) if solicitacao else False,
        faltas_confirmadas=faltas, risco_clinico=risco_clinico(db, paciente_id),
        comparecimentos=comp, cancelamentos_antecipados=canc,
        deficiencia=fontes.deficiencia(paciente_id) if hasattr(fontes, "deficiencia") else False)


def ordenar_pedidos(db: Session, solicitacoes: list[Solicitacao],
                    fontes: Fontes) -> list[tuple[Solicitacao, service.Item]]:
    """(urgencia_avaliada desc, score desc, criado_em asc, id asc): urgência avaliada precede qualquer score."""
    pesos, agora = carregar_pesos(), utc_now()
    faltas = faltas_confirmadas(db, {s.paciente_id for s in solicitacoes})
    out = []
    for s in solicitacoes:
        entrada = entrada_do_paciente(db, s.paciente_id, s, fontes, faltas.get(s.paciente_id, 0))
        out.append((s, service.calcular(entrada, pesos, agora)))
    por_id = {i.entrada.solicitacao_id: s for s, i in out}
    return [(por_id[i.entrada.solicitacao_id], i) for i in service.ordenar([i for _, i in out])]
