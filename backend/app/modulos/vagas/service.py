"""Regras de vagas. Pedido ≠ interesse ≠ agendamento (contrato §4.7).

- Interesse leva o pedido a `aguardando_confirmacao`, mas NÃO agenda.
- A confirmação é feita por funcionário, é única por vaga e é a ÚNICA porta para `agendada`.
- Tudo na mesma transação: interesse -> confirmado, vaga -> preenchida, pedido -> agendada, Agendamento.
- Clínica vem do token (Actor); nunca do corpo.
"""
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import ApiError, nao_encontrado
from app.core.time import to_sp_iso, utc_now
from app.models.clinicas import Clinica
from app.models.solicitacoes import ESTADOS_ATIVOS, EventoSolicitacao, Solicitacao
from app.models.usuarios import Usuario
from app.models.vagas import Agendamento, InteresseVaga, Vaga
from app.repositories import solicitacoes as repo

# Pedido em que o paciente já pode demonstrar interesse (tabela da seção 5 do contrato).
ESTADOS_PARA_INTERESSE = ("em_analise", "precisa_contato", "aguardando_confirmacao")
# Pedidos que dão direito a ver as vagas da clínica (pedido ativo ou já aguardando confirmação).
ESTADOS_VISIVEIS = ESTADOS_ATIVOS + ("aguardando_confirmacao",)


def _erro_validacao(campos: list[str], mensagem: str) -> ApiError:
    return ApiError(422, "validacao", mensagem, {"campos": campos})


def vaga_preenchida(vaga_id: str) -> ApiError:
    return ApiError(409, "vaga_ja_preenchida", "Esta vaga já foi preenchida. Veja outras vagas disponíveis.",
                    {"vaga_id": vaga_id})


def vaga_json(v: Vaga) -> dict:
    return {"id": v.id, "clinica_id": v.clinica_id, "especialidade": v.especialidade,
            "inicio": to_sp_iso(v.inicio), "fim": to_sp_iso(v.fim), "estado": v.estado,
            "criado_em": to_sp_iso(v.criado_em)}


def interesse_json(i: InteresseVaga) -> dict:
    return {"id": i.id, "vaga_id": i.vaga_id, "solicitacao_id": i.solicitacao_id,
            "paciente_id": i.paciente_id, "estado": i.estado, "criado_em": to_sp_iso(i.criado_em)}


def agendamento_json(a: Agendamento) -> dict:
    return {"id": a.id, "vaga_id": a.vaga_id, "solicitacao_id": a.solicitacao_id, "paciente_id": a.paciente_id,
            "clinica_id": a.clinica_id, "estado": a.estado, "desfecho": a.desfecho,
            "confirmado_por": a.confirmado_por, "confirmado_em": to_sp_iso(a.confirmado_em)}


def _evento(db: Session, pedido: Solicitacao, tipo: str, actor: Actor, anterior: str | None,
            novo: str | None, motivo: str | None = None) -> None:
    db.add(EventoSolicitacao(solicitacao_id=pedido.id, tipo=tipo, estado_anterior=anterior, estado_novo=novo,
                             autor_usuario_id=actor.usuario_id, autor_papel=actor.papel, motivo=motivo,
                             criado_em=utc_now()))


def _clinica_do_funcionario(actor: Actor) -> str:
    return sorted(actor.vinculos)[0]


def _vaga_da_clinica(db: Session, actor: Actor, vaga_id: str) -> Vaga:
    """Funcionário só enxerga vagas das próprias clínicas; fora disso, 404."""
    vaga = db.get(Vaga, vaga_id)
    if vaga is None or not actor.pode_na_clinica(vaga.clinica_id):
        raise nao_encontrado()
    return vaga


# ---- publicar e listar ------------------------------------------------------------------------

def criar(db: Session, actor: Actor, especialidade: str, inicio, fim) -> Vaga:
    clinica_id = _clinica_do_funcionario(actor)
    clinica = db.get(Clinica, clinica_id)
    if especialidade not in clinica.especialidades:
        raise _erro_validacao(["especialidade"], "A clínica não atende essa especialidade.")
    if fim <= inicio:
        raise _erro_validacao(["fim"], "O fim da vaga precisa ser depois do início.")
    vaga = Vaga(clinica_id=clinica_id, especialidade=especialidade, inicio=inicio, fim=fim, estado="aberta",
                criado_por=actor.usuario_id, criado_em=utc_now())
    db.add(vaga)
    db.flush()
    return vaga


def _meu_interesse(db: Session, paciente_id: str, vaga_id: str) -> InteresseVaga | None:
    return db.scalar(select(InteresseVaga).where(InteresseVaga.vaga_id == vaga_id,
                                                 InteresseVaga.paciente_id == paciente_id)
                     .order_by(InteresseVaga.criado_em.desc()))


def listar(db: Session, actor: Actor, clinica_id: str | None, estado: str | None) -> list[dict]:
    q = select(Vaga).order_by(Vaga.inicio, Vaga.id)
    if estado:
        q = q.where(Vaga.estado == estado)
    if actor.papel == "funcionario":
        if clinica_id and not actor.pode_na_clinica(clinica_id):
            raise nao_encontrado()
        q = q.where(Vaga.clinica_id.in_([clinica_id] if clinica_id else actor.clinica_ids or {""}))
        itens = []
        for v in db.scalars(q):
            registrados = db.scalar(select(func.count()).select_from(InteresseVaga).where(
                InteresseVaga.vaga_id == v.id, InteresseVaga.estado == "registrado"))
            itens.append({**vaga_json(v), "interesses_registrados": registrados})
        return itens
    # paciente: só clínicas onde tem pedido ativo (ou aguardando confirmação)
    clinicas = set(db.scalars(select(Solicitacao.clinica_id).where(
        Solicitacao.paciente_id == actor.usuario_id, Solicitacao.estado.in_(ESTADOS_VISIVEIS))))
    if clinica_id:
        if clinica_id not in clinicas:
            raise ApiError(403, "acesso_negado", "Você precisa de um pedido ativo nesta clínica para ver as vagas.")
        clinicas = {clinica_id}
    itens = []
    for v in db.scalars(q.where(Vaga.clinica_id.in_(clinicas or {""}))):
        meu = _meu_interesse(db, actor.usuario_id, v.id)
        if v.estado != "aberta" and meu is None:
            continue  # vaga preenchida/cancelada só aparece para quem tinha interesse nela
        itens.append({**vaga_json(v), "interesse": meu.estado if meu else None})
    return itens


# ---- interesse (paciente) ---------------------------------------------------------------------

def registrar_interesse(db: Session, actor: Actor, vaga_id: str, solicitacao_id: str) -> dict:
    pedido = repo.obter(db, actor, solicitacao_id)  # fora do escopo = 404
    vaga = db.get(Vaga, vaga_id)
    if vaga is None or vaga.clinica_id != pedido.clinica_id:
        raise nao_encontrado()
    if vaga.estado == "preenchida":
        raise vaga_preenchida(vaga.id)
    if vaga.estado != "aberta":
        raise ApiError(409, "transicao_invalida", "Esta vaga não está mais disponível.", {"vaga_id": vaga.id})
    if pedido.estado not in ESTADOS_PARA_INTERESSE:
        raise ApiError(409, "transicao_invalida",
                       "A clínica ainda precisa começar a analisar o seu pedido antes de você demonstrar interesse.")
    if pedido.especialidade != vaga.especialidade:
        raise _erro_validacao(["solicitacao_id"], "A vaga é de outra especialidade que a do seu pedido.")
    if db.scalar(select(InteresseVaga.id).where(InteresseVaga.vaga_id == vaga.id,
                                                InteresseVaga.solicitacao_id == pedido.id)):
        raise ApiError(409, "transicao_invalida", "Você já demonstrou interesse nesta vaga.", {"vaga_id": vaga.id})
    interesse = InteresseVaga(vaga_id=vaga.id, solicitacao_id=pedido.id, paciente_id=actor.usuario_id,
                              estado="registrado", criado_em=utc_now())
    db.add(interesse)
    anterior = pedido.estado
    if anterior != "aguardando_confirmacao":
        pedido.estado = "aguardando_confirmacao"
        pedido.atualizado_em = utc_now()
    db.flush()
    _evento(db, pedido, "interesse_registrado", actor, anterior, pedido.estado,
            "Paciente demonstrou interesse na vaga. Interesse não é agendamento.")
    return {**vaga_json(vaga), "interesse": interesse.estado, "interesse_id": interesse.id,
            "solicitacao_estado": pedido.estado,
            "aviso": "Interesse não é agendamento: a clínica confirma uma única pessoa."}


# ---- interesses e confirmação (funcionário) ---------------------------------------------------

def interesses_da_vaga(db: Session, actor: Actor, vaga_id: str, fontes) -> list[dict]:
    """Interessados na ordem SUGERIDA pelo serviço de prioridade (#13): urgência avaliada primeiro.
    A decisão final é do funcionário."""
    from app.modulos.prioridade.router import _itens  # score e ordenação vivem só na #13

    vaga = _vaga_da_clinica(db, actor, vaga_id)
    interesses = list(db.scalars(select(InteresseVaga).where(InteresseVaga.vaga_id == vaga.id)
                                 .order_by(InteresseVaga.criado_em, InteresseVaga.id)))
    pedidos = {p.id: p for p in db.scalars(select(Solicitacao).where(
        Solicitacao.id.in_([i.solicitacao_id for i in interesses] or [""])))}
    ordem = {s.id: (n, item) for n, (s, item) in enumerate(_itens(db, list(pedidos.values()), fontes), 1)}
    saida = []
    for i in interesses:
        pedido = pedidos[i.solicitacao_id]
        posicao, item = ordem[pedido.id]
        nome = db.get(Usuario, i.paciente_id).nome_exibicao
        saida.append({**interesse_json(i), "paciente_nome_exibicao": nome, "pedido_estado": pedido.estado,
                      "posicao_sugerida": posicao, "urgencia_avaliada": item.urgencia_avaliada,
                      "score": item.score, "sinalizacoes": item.sinalizacoes})
    saida.sort(key=lambda x: (x["estado"] != "registrado", x["posicao_sugerida"]))
    return saida


def confirmar(db: Session, actor: Actor, vaga_id: str, interesse_id: str) -> dict:
    vaga = _vaga_da_clinica(db, actor, vaga_id)
    if vaga.estado == "preenchida":
        raise vaga_preenchida(vaga.id)
    if vaga.estado != "aberta":
        raise ApiError(409, "transicao_invalida", "Esta vaga não está mais disponível.", {"vaga_id": vaga.id})
    interesse = db.get(InteresseVaga, interesse_id)
    if interesse is None or interesse.vaga_id != vaga.id:
        raise nao_encontrado()
    if interesse.estado != "registrado":
        raise ApiError(409, "transicao_invalida", "Este interesse não está mais aguardando confirmação.")
    pedido = db.get(Solicitacao, interesse.solicitacao_id)
    if pedido is None or pedido.clinica_id != vaga.clinica_id or pedido.estado != "aguardando_confirmacao":
        raise ApiError(409, "transicao_invalida", "O pedido não está mais aguardando confirmação.")

    agora = utc_now()
    # Troca atômica aberta -> preenchida: se outra confirmação ganhou a corrida, rowcount = 0.
    if db.execute(update(Vaga).where(Vaga.id == vaga.id, Vaga.estado == "aberta")
                  .values(estado="preenchida")).rowcount != 1:
        db.rollback()
        raise vaga_preenchida(vaga.id)
    agendamento = Agendamento(vaga_id=vaga.id, solicitacao_id=pedido.id, paciente_id=interesse.paciente_id,
                              clinica_id=vaga.clinica_id, estado="agendado", desfecho="pendente",
                              confirmado_por=actor.usuario_id, confirmado_em=agora)
    db.add(agendamento)
    interesse.estado = "confirmado"
    pedido.estado = "agendada"
    pedido.atualizado_em = agora
    _evento(db, pedido, "confirmacao", actor, "aguardando_confirmacao", "agendada",
            "Vaga confirmada pela clínica.")
    # Quem pediu a mesma vaga e não foi escolhido: não selecionado (sem punição, sem outro efeito).
    outros = list(db.scalars(select(InteresseVaga).where(
        InteresseVaga.vaga_id == vaga.id, InteresseVaga.id != interesse.id, InteresseVaga.estado == "registrado")))
    for o in outros:
        o.estado = "nao_selecionado"
    # Interesses do confirmado em outras vagas deixam de valer: o pedido já está agendado.
    for o in db.scalars(select(InteresseVaga).where(
            InteresseVaga.solicitacao_id == pedido.id, InteresseVaga.id != interesse.id,
            InteresseVaga.estado == "registrado")):
        o.estado = "retirado"
    db.flush()
    for o in outros:  # pedido sem outro interesse registrado volta para análise (contrato §5)
        p = db.get(Solicitacao, o.solicitacao_id)
        restante = db.scalar(select(InteresseVaga.id).where(
            InteresseVaga.solicitacao_id == p.id, InteresseVaga.estado == "registrado").limit(1))
        if p.estado == "aguardando_confirmacao" and restante is None:
            p.estado = "em_analise"
            p.atualizado_em = agora
            _evento(db, p, "transicao", actor, "aguardando_confirmacao", "em_analise",
                    "A vaga foi confirmada para outra pessoa. Seu pedido segue em análise.")
    try:
        db.flush()
    except IntegrityError:  # restrição única: no máximo um agendamento ativo por vaga
        db.rollback()
        raise vaga_preenchida(vaga.id)
    db.refresh(vaga)
    return {**vaga_json(vaga), "interesse_id": interesse.id, "interesse_estado": interesse.estado,
            "agendamento": agendamento_json(agendamento), "solicitacao_estado": pedido.estado,
            "aviso": "Confirmação feita pela clínica. Dados fictícios (demonstração)."}
