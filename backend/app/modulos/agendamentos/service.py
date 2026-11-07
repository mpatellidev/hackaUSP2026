"""Agendamento: consulta e cancelamento (contrato §4.6, §5, §7.7).

Regras do cancelamento (tudo na MESMA transação; o router faz o commit):
- Quem cancela vem do token. Paciente dono -> desfecho `cancelado_antecipado`; funcionário da clínica
  do agendamento -> `cancelado_pela_clinica`. Qualquer outra pessoa recebe 404.
- Só agendamento `agendado` e com desfecho `pendente` pode ser cancelado (senão 409 `transicao_invalida`).
- O paciente só cancela ANTES do início da vaga (depois disso é a clínica quem registra o desfecho,
  inclusive falta). A clínica pode cancelar enquanto o agendamento estiver ativo.
- Cancelar NUNCA cria `RegistroFalta` e NUNCA mexe no score: cancelamento antecipado e cancelamento
  pela clínica não são falta (contrato §9.3).
- Vaga: volta a `aberta` se ainda futura; se o horário já passou vira `cancelada`.
- Interesse confirmado -> `retirado`.
- Pedido: `agendada` -> `em_analise` (o sistema devolve o pedido para a clínica; nada de cascata nem de
  novo pedido automático). O paciente pode demonstrar interesse em outra vaga ou a clínica marcar
  `indisponivel` (e então o paciente escolhe alternativa).
- Evento `transicao` no histórico do pedido, com autor e motivo administrativo.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import ApiError, nao_encontrado
from app.core.time import as_utc, to_sp_iso, utc_now
from app.models.clinicas import Clinica
from app.models.solicitacoes import EventoSolicitacao, Solicitacao
from app.models.usuarios import Usuario
from app.models.vagas import Agendamento, InteresseVaga, Vaga
from app.modulos.vagas.service import agendamento_json, vaga_json

AVISO_CANCELAMENTO = ("Cancelamento não gera falta nem penalidade. O pedido volta para análise da clínica; "
                      "nenhum novo pedido é criado automaticamente.")


def agendamento_detalhe(db: Session, ag: Agendamento, actor: Actor) -> dict:
    vaga = db.get(Vaga, ag.vaga_id)
    clinica = db.get(Clinica, ag.clinica_id)
    saida = {**agendamento_json(ag),
             "vaga": {k: vaga_json(vaga)[k] for k in ("id", "especialidade", "inicio", "fim", "estado")},
             "clinica": {"id": clinica.id, "nome": clinica.nome, "telefone": clinica.telefone}}
    if actor.papel == "funcionario":
        saida["paciente_nome_exibicao"] = db.get(Usuario, ag.paciente_id).nome_exibicao
    return saida


def _escopo(actor: Actor):
    if actor.papel == "paciente":
        return Agendamento.paciente_id == actor.usuario_id
    return Agendamento.clinica_id.in_(actor.clinica_ids or {""})


def listar(db: Session, actor: Actor, estado: str | None) -> list[dict]:
    q = (select(Agendamento).join(Vaga, Vaga.id == Agendamento.vaga_id)
         .where(_escopo(actor)).order_by(Vaga.inicio, Agendamento.id))
    if estado:
        q = q.where(Agendamento.estado == estado)
    return [agendamento_detalhe(db, ag, actor) for ag in db.scalars(q)]


def obter(db: Session, actor: Actor, agendamento_id: str) -> Agendamento:
    """Fora do escopo = 404 (não revela existência; contrato §2)."""
    ag = db.scalar(select(Agendamento).where(Agendamento.id == agendamento_id, _escopo(actor)))
    if ag is None:
        raise nao_encontrado()
    return ag


def cancelar(db: Session, actor: Actor, agendamento_id: str, motivo: str | None) -> dict:
    ag = obter(db, actor, agendamento_id)
    pelo_paciente = actor.papel == "paciente"
    if ag.estado != "agendado" or ag.desfecho != "pendente":
        raise ApiError(409, "transicao_invalida",
                       "Este agendamento não pode mais ser cancelado: ele já foi cancelado, concluído ou teve o "
                       "desfecho registrado.")
    agora = utc_now()
    vaga = db.get(Vaga, ag.vaga_id)
    futura = as_utc(vaga.inicio) > agora
    if pelo_paciente and not futura:
        raise ApiError(409, "transicao_invalida",
                       "O horário já começou ou passou. Fale com a clínica: ela registra o que aconteceu.")
    motivo = motivo.strip() if motivo and motivo.strip() else None

    ag.estado = "cancelado"
    ag.desfecho = "cancelado_antecipado" if pelo_paciente else "cancelado_pela_clinica"
    vaga.estado = "aberta" if futura else "cancelada"
    for i in db.scalars(select(InteresseVaga).where(
            InteresseVaga.vaga_id == vaga.id, InteresseVaga.solicitacao_id == ag.solicitacao_id,
            InteresseVaga.estado == "confirmado")):
        i.estado = "retirado"

    pedido = db.get(Solicitacao, ag.solicitacao_id)
    anterior = pedido.estado
    if anterior == "agendada":
        pedido.estado = "em_analise"
        pedido.atualizado_em = agora
    quem = "pelo paciente" if pelo_paciente else "pela clínica"
    texto = f"Agendamento cancelado {quem}. O pedido voltou para análise."
    db.add(EventoSolicitacao(
        solicitacao_id=pedido.id, tipo="transicao", estado_anterior=anterior, estado_novo=pedido.estado,
        autor_usuario_id=actor.usuario_id, autor_papel=actor.papel,
        motivo=f"{texto} Motivo: {motivo}" if motivo else texto, criado_em=agora))
    db.flush()
    return {**agendamento_detalhe(db, ag, actor), "solicitacao_estado": pedido.estado,
            "vaga_estado": vaga.estado, "aviso": AVISO_CANCELAMENTO,
            "cancelado_em": to_sp_iso(agora)}
