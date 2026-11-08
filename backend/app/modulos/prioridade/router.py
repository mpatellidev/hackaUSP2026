from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor, require_funcionario
from app.core.db import get_db
from app.core.errors import ApiError, acesso_negado, nao_encontrado
from app.core.time import as_utc, to_sp_iso, utc_now
from app.models.solicitacoes import Solicitacao
from app.models.usuarios import Usuario
from app.models.vagas import Agendamento, Vaga
from app.modulos.prioridade import service
from app.modulos.prioridade.fila import carregar_pesos, ordenar_pedidos
from app.modulos.prioridade.fontes import Fontes, get_fontes
from app.modulos.prioridade.models import RegistroFalta, RevisaoFalta
from app.modulos.prioridade.schemas import (ComponenteOut, FaltaIn, FaltaOut, FilaOut, ItemFila,
                                            RevisaoIn, RevisaoOut)
from app.modulos.solicitacoes import repositorio as repo

router = APIRouter(tags=["prioridade e faltas"])

ESTADOS_NA_FILA = ("enviada", "em_analise", "precisa_contato", "aguardando_confirmacao")
ORDENACAO = "(urgencia_avaliada desc, score desc, criado_em asc, id asc)"
AVISO = ("Pesos ilustrativos, não são critérios clínicos validados. A ordem é apoio à decisão: "
         "a priorização e a verificação são sempre feitas por profissional.")


def _item_out(db: Session, pos: int, s: Solicitacao, i: service.Item, versao: str) -> ItemFila:
    nome = db.get(Usuario, s.paciente_id).nome_exibicao
    return ItemFila(
        posicao=pos, solicitacao_id=s.id, clinica_id=s.clinica_id, paciente_nome_exibicao=nome,
        estado=s.estado, especialidade=s.especialidade, criado_em=to_sp_iso(s.criado_em),
        urgencia_avaliada=i.urgencia_avaliada, score=i.score, versao_pesos=versao,
        componentes=[ComponenteOut(nome=c.nome, valor=c.valor, peso=c.peso, fonte=c.fonte) for c in i.componentes],
        sinalizacoes=i.sinalizacoes)


@router.get("/clinicas/{clinica_id}/fila", response_model=FilaOut, summary="Fila explicável da clínica")
def fila(clinica_id: str, actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db),
         fontes: Fontes = Depends(get_fontes)):
    if not actor.pode_na_clinica(clinica_id):
        raise nao_encontrado()
    pedidos = [s for s in repo.listar(db, actor) if s.clinica_id == clinica_id and s.estado in ESTADOS_NA_FILA]
    versao = carregar_pesos().versao
    itens = [_item_out(db, n, s, i, versao) for n, (s, i) in enumerate(ordenar_pedidos(db, pedidos, fontes), 1)]
    return FilaOut(itens=itens, total=len(itens), versao_pesos=versao, ordenacao=ORDENACAO,
                   fontes_demo=fontes.demo, aviso=AVISO)


@router.get("/solicitacoes/{solicitacao_id}/prioridade", response_model=ItemFila,
            summary="Decomposição do score de um pedido")
def prioridade(solicitacao_id: str, actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db),
               fontes: Fontes = Depends(get_fontes)):
    s = repo.obter(db, actor, solicitacao_id)
    fila_ordenada = ordenar_pedidos(db, [x for x in repo.listar(db, actor) if x.clinica_id == s.clinica_id
                                and x.estado in ESTADOS_NA_FILA] or [s], fontes)
    versao = carregar_pesos().versao
    for n, (x, i) in enumerate(fila_ordenada, 1):
        if x.id == s.id:
            return _item_out(db, n, x, i, versao)
    (x, i), = ordenar_pedidos(db, [s], fontes)  # pedido fora da fila (ex.: concluído): só a decomposição
    return _item_out(db, 0, x, i, versao)


# ---- faltas --------------------------------------------------------------------------------------

def _falta_out(db: Session, f: RegistroFalta) -> FaltaOut:
    revs = db.scalars(select(RevisaoFalta).where(RevisaoFalta.falta_id == f.id)
                      .order_by(RevisaoFalta.criado_em, RevisaoFalta.id))
    return FaltaOut(
        id=f.id, paciente_id=f.paciente_id, agendamento_id=f.agendamento_id, clinica_id=f.clinica_id,
        registrada_por=f.registrada_por, justificativa=f.justificativa, estado=f.estado, criado_em=to_sp_iso(f.criado_em),
        revisoes=[RevisaoOut(acao=r.acao, motivo=r.motivo, revisor_id=r.revisor_id, estado_anterior=r.estado_anterior,
                             estado_novo=r.estado_novo, criado_em=to_sp_iso(r.criado_em)) for r in revs])


def _falta_visivel(db: Session, actor: Actor, falta_id: str) -> RegistroFalta:
    f = db.get(RegistroFalta, falta_id)
    if f is None:
        raise nao_encontrado()
    if actor.papel == "paciente":
        ok = f.paciente_id == actor.usuario_id
    else:
        ok = bool(f.clinica_id and actor.pode_na_clinica(f.clinica_id))
    if not ok:
        raise nao_encontrado()
    return f


@router.post("/faltas", response_model=FaltaOut, status_code=201,
             summary="Registrar falta efetiva (somente profissional, com justificativa)")
def registrar_falta(body: FaltaIn, actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    ag = db.get(Agendamento, body.agendamento_id)
    if ag is None or not actor.pode_na_clinica(ag.clinica_id):
        raise nao_encontrado()
    if not actor.tem_funcao(ag.clinica_id, "profissional"):
        raise acesso_negado()
    if ag.estado != "agendado":
        raise ApiError(409, "transicao_invalida", "Só é possível registrar falta de um agendamento ativo.")
    if as_utc(db.get(Vaga, ag.vaga_id).inicio) > utc_now():  # falta só depois que o horário começou
        raise ApiError(409, "transicao_invalida", "O horário ainda não começou. A falta só pode ser registrada "
                                                  "depois do início do atendimento.")
    if db.scalar(select(RegistroFalta.id).where(RegistroFalta.agendamento_id == ag.id)):
        raise ApiError(409, "solicitacao_duplicada", "Já existe um registro de falta para este agendamento.")
    f = RegistroFalta(paciente_id=ag.paciente_id, agendamento_id=ag.id, clinica_id=ag.clinica_id,
                      registrada_por=actor.usuario_id, justificativa=body.justificativa, estado="confirmada")
    db.add(f)
    ag.desfecho = "falta_registrada"   # contrato §4.6: exige RegistroFalta confirmado
    db.commit()
    return _falta_out(db, f)


@router.get("/faltas", summary="Faltas: paciente vê as próprias; funcionário vê as da clínica")
def listar_faltas(actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    q = select(RegistroFalta).order_by(RegistroFalta.criado_em, RegistroFalta.id)
    if actor.papel == "paciente":
        q = q.where(RegistroFalta.paciente_id == actor.usuario_id)
    else:
        q = q.where(RegistroFalta.clinica_id.in_(actor.clinica_ids or {""}))
    itens = [_falta_out(db, f) for f in db.scalars(q)]
    return {"itens": itens, "total": len(itens)}


@router.post("/faltas/{falta_id}/revisao", response_model=FaltaOut,
             summary="Revisar falta (profissional ou coordenação); fica auditado")
def revisar_falta(falta_id: str, body: RevisaoIn, actor: Actor = Depends(require_funcionario),
                  db: Session = Depends(get_db)):
    f = _falta_visivel(db, actor, falta_id)
    if not actor.tem_funcao(f.clinica_id, "profissional", "coordenacao"):
        raise acesso_negado()
    if body.acao == "manter" and f.registrada_por == actor.usuario_id:  # reverter o próprio erro continua livre
        raise acesso_negado("Quem registrou a falta não pode confirmá-la na revisão. Peça a outra pessoa da clínica.")
    novo = f.estado
    if body.acao == "reverter":
        if f.estado != "confirmada":
            raise ApiError(409, "transicao_invalida", "Esta falta já foi revertida.")
        novo = "revertida"
    db.add(RevisaoFalta(falta_id=f.id, acao=body.acao, motivo=body.motivo, revisor_id=actor.usuario_id,
                        estado_anterior=f.estado, estado_novo=novo))
    f.estado = novo
    if novo == "revertida" and f.agendamento_id:
        db.get(Agendamento, f.agendamento_id).desfecho = "pendente"
    db.commit()
    return _falta_out(db, f)
