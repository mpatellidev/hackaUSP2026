from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import nao_encontrado
from app.core.time import to_sp_iso, utc_now
from app.models.clinicas import Clinica
from app.models.solicitacoes import ESTADOS_ATIVOS, Solicitacao
from app.models.vagas import Vaga
from app.modulos.alertas.models import Alerta, PreferenciaAlerta

AVISO = ("Alerta avisa que existe uma vaga, mas não reserva horário nem garante atendimento. "
         "Não enviamos notificação ao celular: veja os alertas aqui no app.")


def preferencia(db: Session, actor: Actor) -> dict:
    p = db.get(PreferenciaAlerta, actor.usuario_id)
    return {"receber": bool(p and p.receber), "ligacao": bool(p and p.ligacao), "aviso": AVISO}


def salvar_preferencia(db: Session, actor: Actor, receber: bool, ligacao: bool) -> dict:
    p = db.get(PreferenciaAlerta, actor.usuario_id)
    if p is None:
        p = PreferenciaAlerta(usuario_id=actor.usuario_id)
        db.add(p)
    p.receber, p.ligacao, p.atualizado_em = receber, ligacao and receber, utc_now()
    db.flush()
    return preferencia(db, actor)


def gerar_para_vaga(db: Session, vaga: Vaga) -> int:
    """Evento `vaga_criada`: avisa quem OPTOU e tem pedido ativo na mesma clínica e especialidade. Um por (paciente, vaga)."""
    pacientes = set(db.scalars(select(Solicitacao.paciente_id).where(
        Solicitacao.clinica_id == vaga.clinica_id, Solicitacao.especialidade == vaga.especialidade,
        Solicitacao.estado.in_(ESTADOS_ATIVOS))))
    criados = 0
    for pid in sorted(pacientes):
        pref = db.get(PreferenciaAlerta, pid)
        if not (pref and pref.receber):
            continue
        if db.scalar(select(Alerta.id).where(Alerta.paciente_id == pid, Alerta.vaga_id == vaga.id)):
            continue
        db.add(Alerta(paciente_id=pid, vaga_id=vaga.id, clinica_id=vaga.clinica_id, evento_origem="vaga_criada",
                      lido=False, criado_em=utc_now()))
        criados += 1
    db.flush()
    return criados


def _json(db: Session, a: Alerta) -> dict:
    vaga, clinica = db.get(Vaga, a.vaga_id), db.get(Clinica, a.clinica_id)
    return {"id": a.id, "vaga_id": a.vaga_id, "clinica_id": a.clinica_id, "clinica_nome": clinica.nome,
            "especialidade": vaga.especialidade, "inicio": to_sp_iso(vaga.inicio), "evento_origem": a.evento_origem,
            "lido": a.lido, "criado_em": to_sp_iso(a.criado_em)}


def listar(db: Session, actor: Actor) -> dict:
    itens = [_json(db, a) for a in db.scalars(select(Alerta).where(Alerta.paciente_id == actor.usuario_id)
                                              .order_by(Alerta.criado_em.desc(), Alerta.id))]
    return {"itens": itens, "total": len(itens), "nao_lidos": sum(1 for i in itens if not i["lido"]), "aviso": AVISO}


def marcar_lido(db: Session, actor: Actor, alerta_id: str) -> dict:
    a = db.get(Alerta, alerta_id)
    if a is None or a.paciente_id != actor.usuario_id:
        raise nao_encontrado()
    a.lido = True
    db.flush()
    return _json(db, a)
