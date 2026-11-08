from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import acesso_negado, erro_validacao, nao_encontrado, transicao_invalida
from app.core.time import to_sp_iso, utc_now
from app.models.clinicas import Clinica
from app.models.solicitacoes import Solicitacao
from app.models.usuarios import Usuario
from app.modulos.resumos.models import Compartilhamento, EventoAcesso, ResumoProntuario

AVISO = ("Resumo FICTÍCIO de demonstração: o registro de escolha não basta para exigências legais e isto não é "
         "prontuário real. Nada daqui vai para a IA.")


def _evento(db: Session, resumo_id: str, actor: Actor, tipo: str, clinica_id: str | None = None) -> None:
    db.add(EventoAcesso(resumo_id=resumo_id, usuario_id=actor.usuario_id, clinica_id=clinica_id, tipo=tipo,
                        criado_em=utc_now()))


def _nome_clinica(db: Session, clinica_id: str | None) -> str | None:
    c = db.get(Clinica, clinica_id) if clinica_id else None
    return c.nome if c else None


def compartilhamento_json(db: Session, c: Compartilhamento) -> dict:
    return {"id": c.id, "resumo_id": c.resumo_id, "clinica_destino_id": c.clinica_destino_id,
            "clinica_destino_nome": _nome_clinica(db, c.clinica_destino_id),
            "campos_compartilhados": c.campos_compartilhados, "finalidade": c.finalidade, "aceite": c.aceite,
            "aceito_em": to_sp_iso(c.aceito_em), "revogado_em": to_sp_iso(c.revogado_em),
            "ativo": c.aceite == "aceito" and c.revogado_em is None}


def _json(db: Session, r: ResumoProntuario, origem: str, campos: list[dict]) -> dict:
    return {"id": r.id, "paciente_id": r.paciente_id if origem in ("proprio", "autor") else None,
            "clinica_autora_id": r.clinica_autora_id, "clinica_autora_nome": _nome_clinica(db, r.clinica_autora_id),
            "campos": campos, "origem": origem, "criado_em": to_sp_iso(r.criado_em), "aviso": AVISO}


def _compartilhamentos_ativos(db: Session, resumo_id: str, clinicas: set[str]) -> list[Compartilhamento]:
    return list(db.scalars(select(Compartilhamento).where(
        Compartilhamento.resumo_id == resumo_id, Compartilhamento.clinica_destino_id.in_(clinicas or {""}),
        Compartilhamento.aceite == "aceito", Compartilhamento.revogado_em.is_(None))))


def _visao(db: Session, actor: Actor, r: ResumoProntuario) -> dict | None:
    """O que ESTE usuário pode ver do resumo; None = fora do escopo (vira 404)."""
    if actor.papel == "paciente":
        return _json(db, r, "proprio", r.campos) if r.paciente_id == actor.usuario_id else None
    if r.clinica_autora_id in actor.clinica_ids:
        return _json(db, r, "autor", r.campos)
    nomes: set[str] = set()
    for c in _compartilhamentos_ativos(db, r.id, actor.clinica_ids):
        nomes |= set(c.campos_compartilhados)
    if not nomes:
        return None
    return _json(db, r, "compartilhado", [c for c in r.campos if c["nome"] in nomes])


def criar(db: Session, actor: Actor, solicitacao_id: str, campos: list[dict]) -> dict:
    pedido = db.get(Solicitacao, solicitacao_id)
    if pedido is None or not actor.pode_na_clinica(pedido.clinica_id):
        raise nao_encontrado()
    if not actor.tem_funcao(pedido.clinica_id, "profissional"):
        raise acesso_negado("Só profissional da clínica cria o resumo.")
    nomes = [c["nome"] for c in campos]
    if len(set(nomes)) != len(nomes):
        raise erro_validacao(["campos"], "Cada campo precisa de um nome diferente.")
    r = ResumoProntuario(paciente_id=pedido.paciente_id, clinica_autora_id=pedido.clinica_id, campos=campos,
                         criado_por=actor.usuario_id, criado_em=utc_now())
    db.add(r)
    db.flush()
    _evento(db, r.id, actor, "criacao", pedido.clinica_id)
    return _json(db, r, "autor", r.campos)


def _auditar_consulta(db: Session, actor: Actor, r: ResumoProntuario, v: dict) -> None:
    """Toda leitura por clínica destinatária (lista ou detalhe) fica na auditoria do paciente."""
    if actor.papel == "funcionario" and v["origem"] == "compartilhado":
        clinica = next(iter(actor.clinica_ids & {c.clinica_destino_id for c in _compartilhamentos_ativos(db, r.id, actor.clinica_ids)}))
        _evento(db, r.id, actor, "consulta", clinica)


def listar(db: Session, actor: Actor) -> list[dict]:
    saida = []
    for r in db.scalars(select(ResumoProntuario).order_by(ResumoProntuario.criado_em.desc(), ResumoProntuario.id)):
        v = _visao(db, actor, r)
        if v:
            _auditar_consulta(db, actor, r, v)
            saida.append(v)
    return saida


def obter(db: Session, actor: Actor, resumo_id: str) -> dict:
    r = db.get(ResumoProntuario, resumo_id)
    v = _visao(db, actor, r) if r else None
    if v is None:
        raise nao_encontrado()
    _auditar_consulta(db, actor, r, v)
    return v


def _do_paciente(db: Session, actor: Actor, resumo_id: str) -> ResumoProntuario:
    r = db.get(ResumoProntuario, resumo_id)
    if r is None or r.paciente_id != actor.usuario_id:
        raise nao_encontrado()
    return r


def compartilhar(db: Session, actor: Actor, resumo_id: str, clinica_destino_id: str, campos: list[str],
                 finalidade: str, aceite: str) -> dict:
    r = _do_paciente(db, actor, resumo_id)
    if db.get(Clinica, clinica_destino_id) is None:
        raise erro_validacao(["clinica_destino_id"], "Escolha uma clínica da lista.")
    if clinica_destino_id == r.clinica_autora_id:
        raise erro_validacao(["clinica_destino_id"], "Esse resumo já é da própria clínica. Escolha outra.")
    existentes = {c["nome"] for c in r.campos}
    if not set(campos) <= existentes:
        raise erro_validacao(["campos_compartilhados"], "Escolha só campos que existem no resumo.")
    c = Compartilhamento(resumo_id=r.id, clinica_destino_id=clinica_destino_id, campos_compartilhados=sorted(set(campos)),
                         finalidade=finalidade, aceite=aceite, aceito_em=utc_now())
    db.add(c)
    db.flush()
    _evento(db, r.id, actor, "aceite" if aceite == "aceito" else "recusa", clinica_destino_id)
    return compartilhamento_json(db, c)


def compartilhamentos(db: Session, actor: Actor, resumo_id: str) -> list[dict]:
    r = _do_paciente(db, actor, resumo_id)
    q = select(Compartilhamento).where(Compartilhamento.resumo_id == r.id).order_by(Compartilhamento.aceito_em.desc())
    return [compartilhamento_json(db, c) for c in db.scalars(q)]


def revogar(db: Session, actor: Actor, compartilhamento_id: str) -> dict:
    c = db.get(Compartilhamento, compartilhamento_id)
    r = db.get(ResumoProntuario, c.resumo_id) if c else None
    if c is None or r is None or r.paciente_id != actor.usuario_id:
        raise nao_encontrado()
    if c.aceite != "aceito" or c.revogado_em is not None:
        raise transicao_invalida("Esse compartilhamento já não está valendo.", {"compartilhamento_id": c.id})
    c.revogado_em = utc_now()
    _evento(db, r.id, actor, "revogacao", c.clinica_destino_id)
    db.flush()
    return compartilhamento_json(db, c)


def eventos(db: Session, actor: Actor, resumo_id: str) -> list[dict]:
    r = _do_paciente(db, actor, resumo_id)
    q = select(EventoAcesso).where(EventoAcesso.resumo_id == r.id).order_by(EventoAcesso.criado_em, EventoAcesso.id)
    saida = []
    for e in db.scalars(q):
        u = db.get(Usuario, e.usuario_id)
        saida.append({"id": e.id, "tipo": e.tipo, "clinica_id": e.clinica_id,
                      "clinica_nome": _nome_clinica(db, e.clinica_id), "usuario_nome": u.nome_exibicao if u else "—",
                      "criado_em": to_sp_iso(e.criado_em)})
    return saida
