"""Regras de pedido. Sem cascata: uma nova clínica só recebe pedido escolhido pelo paciente."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import ApiError, nao_encontrado
from app.core.time import to_sp_iso, utc_now
from app.models.clinicas import Clinica
from app.models.solicitacoes import ESTADOS_ATIVOS, EventoSolicitacao, Solicitacao
from app.models.vagas import Agendamento
from app.repositories import solicitacoes as repo

CRITERIOS_ALTERNATIVAS = ["mesma_cidade", "publico_compativel", "recebendo_pedidos", "mesma_especialidade"]
AVISO_ALTERNATIVAS = "Sugestão não é garantia de vaga nem de atendimento."
CAMPOS_COMPARTILHADOS = ["nome_exibicao", "cidade", "contato_preferido", "especialidade", "descricao_administrativa"]

TRANSICOES_FUNCIONARIO = {
    "enviada": {"em_analise", "indisponivel"},
    "em_analise": {"precisa_contato", "indisponivel"},
    "precisa_contato": {"em_analise", "indisponivel"},
    "agendada": {"concluida"},  # contrato §5; "agendada" só nasce da confirmação de vaga (#4)
}


def _erro_validacao(campos: list[str], mensagem: str) -> ApiError:
    return ApiError(422, "validacao", mensagem, {"campos": campos})


def clinica_json(c: Clinica) -> dict:
    return {
        "id": c.id, "nome": c.nome, "cidade": c.cidade, "uf": c.uf, "publico": c.publico,
        "especialidades": c.especialidades, "custo_informado": c.custo_informado,
        "recebendo_pedidos": c.recebendo_pedidos, "telefone": c.telefone,
    }


def solicitacao_json(s: Solicitacao) -> dict:
    return {
        "id": s.id, "paciente_id": s.paciente_id, "clinica_id": s.clinica_id, "estado": s.estado,
        "especialidade": s.especialidade, "publico_alvo": s.publico_alvo,
        "descricao_administrativa": s.descricao_administrativa, "solicitacao_origem_id": s.solicitacao_origem_id,
        "criado_em": to_sp_iso(s.criado_em), "atualizado_em": to_sp_iso(s.atualizado_em),
    }


def evento_json(e: EventoSolicitacao) -> dict:
    return {
        "id": e.id, "solicitacao_id": e.solicitacao_id, "tipo": e.tipo,
        "estado_anterior": e.estado_anterior, "estado_novo": e.estado_novo,
        "autor_usuario_id": e.autor_usuario_id, "autor_papel": e.autor_papel,
        "motivo": e.motivo, "criado_em": to_sp_iso(e.criado_em),
    }


def obter_clinica(db: Session, clinica_id: str) -> Clinica:
    clinica = db.get(Clinica, clinica_id)
    if clinica is None:
        raise nao_encontrado()
    return clinica


def validar_clinica_para_pedido(clinica: Clinica, especialidade: str, publico_alvo: str) -> None:
    if not clinica.recebendo_pedidos:
        raise ApiError(409, "clinica_sem_recebimento", "Esta clínica não está recebendo pedidos no momento.",
                       {"clinica_id": clinica.id})
    campos = []
    if especialidade not in clinica.especialidades:
        campos.append("especialidade")
    if publico_alvo not in clinica.publico:
        campos.append("publico_alvo")
    if campos:
        raise _erro_validacao(campos, "A clínica não atende a especialidade ou o público escolhido.")


def _duplicada(db: Session, paciente_id: str, clinica_id: str, especialidade: str) -> bool:
    return db.scalar(select(Solicitacao.id).where(
        Solicitacao.paciente_id == paciente_id,
        Solicitacao.clinica_id == clinica_id,
        Solicitacao.especialidade == especialidade,
        Solicitacao.estado.in_(ESTADOS_ATIVOS),
    )) is not None


def _evento(db: Session, solicitacao: Solicitacao, tipo: str, actor: Actor,
            anterior: str | None, novo: str | None, motivo: str | None = None) -> EventoSolicitacao:
    evento = EventoSolicitacao(solicitacao_id=solicitacao.id, tipo=tipo, estado_anterior=anterior,
                               estado_novo=novo, autor_usuario_id=actor.usuario_id,
                               autor_papel=actor.papel, motivo=motivo, criado_em=utc_now())
    db.add(evento)
    return evento


def criar(db: Session, actor: Actor, clinica_id: str, especialidade: str, publico_alvo: str,
          descricao_administrativa: str) -> Solicitacao:
    clinica = obter_clinica(db, clinica_id)
    validar_clinica_para_pedido(clinica, especialidade, publico_alvo)
    if _duplicada(db, actor.usuario_id, clinica_id, especialidade):
        raise ApiError(409, "solicitacao_duplicada", "Você já tem um pedido ativo para esta especialidade nesta clínica.")
    agora = utc_now()
    pedido = Solicitacao(paciente_id=actor.usuario_id, clinica_id=clinica_id, estado="enviada",
                         especialidade=especialidade, publico_alvo=publico_alvo,
                         descricao_administrativa=descricao_administrativa, atualizado_em=agora)
    db.add(pedido)
    db.flush()
    _evento(db, pedido, "criada", actor, None, "enviada")
    return pedido


def transicionar(db: Session, actor: Actor, solicitacao_id: str, estado_novo: str,
                 motivo: str | None) -> Solicitacao:
    pedido = repo.obter(db, actor, solicitacao_id)
    if not actor.pode_na_clinica(pedido.clinica_id):
        raise nao_encontrado()
    permitidos = TRANSICOES_FUNCIONARIO.get(pedido.estado, set())
    if estado_novo not in permitidos:
        raise ApiError(409, "transicao_invalida", "Esta mudança de estado não é permitida para o pedido.")
    motivo = motivo.strip() if motivo else None
    if estado_novo in {"precisa_contato", "indisponivel"} and not motivo:
        raise _erro_validacao(["motivo"], "Informe um motivo administrativo para esta mudança.")
    anterior = pedido.estado
    pedido.estado = estado_novo
    pedido.atualizado_em = utc_now()
    _evento(db, pedido, "transicao", actor, anterior, estado_novo, motivo)
    if estado_novo == "concluida":
        _concluir_agendamento(db, pedido)
    return pedido


def _concluir_agendamento(db: Session, pedido: Solicitacao) -> None:
    """Pedido concluído fecha o agendamento. Falta já registrada (§9.3) permanece como desfecho;
    sem registro de falta, o desfecho pendente passa a `compareceu` (ato humano de concluir)."""
    ag = db.scalar(select(Agendamento).where(Agendamento.solicitacao_id == pedido.id,
                                             Agendamento.estado == "agendado"))
    if ag is not None:
        ag.estado = "concluido"
        if ag.desfecho == "pendente":
            ag.desfecho = "compareceu"


def alternativas(db: Session, actor: Actor, solicitacao_id: str) -> list[Clinica]:
    pedido = repo.obter(db, actor, solicitacao_id)
    if pedido.estado != "indisponivel":
        raise ApiError(409, "transicao_invalida", "Alternativas só estão disponíveis para pedido indisponível.")
    origem = obter_clinica(db, pedido.clinica_id)
    candidatas = db.scalars(select(Clinica).where(
        Clinica.id != origem.id, Clinica.cidade == origem.cidade, Clinica.recebendo_pedidos.is_(True)
    ).order_by(Clinica.nome, Clinica.id))
    return [c for c in candidatas if pedido.especialidade in c.especialidades and pedido.publico_alvo in c.publico]


def encaminhar(db: Session, actor: Actor, solicitacao_id: str, clinica_destino_id: str) -> Solicitacao:
    origem = repo.obter(db, actor, solicitacao_id)
    if origem.estado != "indisponivel":
        raise ApiError(409, "transicao_invalida", "Só é possível escolher alternativa para pedido indisponível.")
    destino = obter_clinica(db, clinica_destino_id)
    alternativas_ids = {c.id for c in alternativas(db, actor, solicitacao_id)}
    if destino.id not in alternativas_ids:
        raise _erro_validacao(["clinica_destino_id"], "Escolha uma clínica entre as alternativas disponíveis.")
    if _duplicada(db, actor.usuario_id, destino.id, origem.especialidade):
        raise ApiError(409, "solicitacao_duplicada", "Você já tem um pedido ativo para esta especialidade nesta clínica.")
    agora = utc_now()
    novo = Solicitacao(paciente_id=actor.usuario_id, clinica_id=destino.id, estado="enviada",
                       especialidade=origem.especialidade, publico_alvo=origem.publico_alvo,
                       descricao_administrativa=origem.descricao_administrativa,
                       solicitacao_origem_id=origem.id, atualizado_em=agora)
    db.add(novo)
    db.flush()
    _evento(db, novo, "encaminhamento_escolhido", actor, None, "enviada",
            f"Paciente escolheu {destino.nome} entre as alternativas sugeridas.")
    return novo
