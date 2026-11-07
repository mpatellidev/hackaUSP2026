from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import acesso_negado, erro_validacao, nao_encontrado
from app.core.time import SP, as_utc, to_sp_iso
from app.models.clinicas import Clinica
from app.modulos.profissionais.models import BlocoAgenda, Profissional

GESTAO = ("coordenacao", "atendimento")  # quem cadastra profissionais e mexe na agenda


def profissional_json(p: Profissional) -> dict:
    return {"id": p.id, "clinica_id": p.clinica_id, "nome_exibicao": p.nome_exibicao,
            "especialidade": p.especialidade, "vinculo": p.vinculo, "ativo": p.ativo}


def bloco_json(b: BlocoAgenda) -> dict:
    return {"id": b.id, "profissional_id": b.profissional_id, "inicio": to_sp_iso(b.inicio),
            "fim": to_sp_iso(b.fim), "estado": b.estado}


def _profissional_da_clinica(db: Session, actor: Actor, profissional_id: str) -> Profissional:
    p = db.get(Profissional, profissional_id)
    if p is None or not actor.pode_na_clinica(p.clinica_id):
        raise nao_encontrado()  # outra clínica = 404, sem revelar existência
    return p


def _exigir_gestao(actor: Actor, clinica_id: str) -> None:
    if not actor.tem_funcao(clinica_id, *GESTAO):
        raise acesso_negado("Só atendimento ou coordenação da clínica podem alterar profissionais e agenda.")


def listar(db: Session, actor: Actor, clinica_id: str | None, so_ativos: bool) -> list[dict]:
    if clinica_id and not actor.pode_na_clinica(clinica_id):
        raise nao_encontrado()
    q = select(Profissional).where(Profissional.clinica_id.in_([clinica_id] if clinica_id else actor.clinica_ids))
    if so_ativos:
        q = q.where(Profissional.ativo)
    return [profissional_json(p) for p in db.scalars(q.order_by(Profissional.clinica_id, Profissional.nome_exibicao))]


def criar(db: Session, actor: Actor, nome: str, especialidade: str, vinculo: str) -> Profissional:
    clinica_id = actor.clinica_da_funcao(*GESTAO)
    if clinica_id is None:
        raise acesso_negado("Só atendimento ou coordenação da clínica podem cadastrar profissionais.")
    clinica = db.get(Clinica, clinica_id)
    if especialidade not in clinica.especialidades:
        raise erro_validacao(["especialidade"], "A clínica não atende essa especialidade.")
    p = Profissional(clinica_id=clinica_id, nome_exibicao=nome, especialidade=especialidade, vinculo=vinculo)
    db.add(p)
    db.flush()
    return p


def atualizar(db: Session, actor: Actor, profissional_id: str, mudancas: dict) -> Profissional:
    p = _profissional_da_clinica(db, actor, profissional_id)
    _exigir_gestao(actor, p.clinica_id)
    if "especialidade" in mudancas and mudancas["especialidade"] not in db.get(Clinica, p.clinica_id).especialidades:
        raise erro_validacao(["especialidade"], "A clínica não atende essa especialidade.")
    for campo, valor in mudancas.items():
        setattr(p, campo, valor)
    return p


def agenda(db: Session, actor: Actor, profissional_id: str, data: date | None) -> list[dict]:
    p = _profissional_da_clinica(db, actor, profissional_id)
    q = select(BlocoAgenda).where(BlocoAgenda.profissional_id == p.id)
    if data:
        q = q.where(BlocoAgenda.inicio >= _dia(data), BlocoAgenda.inicio < _dia(data + timedelta(days=1)))
    return [bloco_json(b) for b in db.scalars(q.order_by(BlocoAgenda.inicio, BlocoAgenda.id))]


def criar_bloco(db: Session, actor: Actor, profissional_id: str, inicio: datetime, fim: datetime,
                estado: str) -> BlocoAgenda:
    p = _profissional_da_clinica(db, actor, profissional_id)
    _exigir_gestao(actor, p.clinica_id)
    if fim <= inicio:
        raise erro_validacao(["fim"], "O fim do horário precisa ser depois do início.")
    for outro in db.scalars(select(BlocoAgenda).where(BlocoAgenda.profissional_id == p.id)):
        if inicio < as_utc(outro.fim) and as_utc(outro.inicio) < fim:
            raise erro_validacao(["inicio"], "Esse horário se sobrepõe a outro já cadastrado.")
    b = BlocoAgenda(profissional_id=p.id, inicio=inicio, fim=fim, estado=estado)
    db.add(b)
    db.flush()
    return b


def atualizar_bloco(db: Session, actor: Actor, bloco_id: str, estado: str) -> BlocoAgenda:
    b = db.get(BlocoAgenda, bloco_id)
    p = db.get(Profissional, b.profissional_id) if b else None
    if b is None or not actor.pode_na_clinica(p.clinica_id):
        raise nao_encontrado()
    _exigir_gestao(actor, p.clinica_id)
    b.estado = estado
    return b


def _dia(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=SP).astimezone(timezone.utc)


def disponibilidade(db: Session, actor: Actor, clinica_id: str, data: date) -> dict:
    if not actor.pode_na_clinica(clinica_id):
        raise nao_encontrado()
    profissionais = db.scalars(select(Profissional).where(Profissional.clinica_id == clinica_id, Profissional.ativo)
                               .order_by(Profissional.nome_exibicao))
    saida = []
    for p in profissionais:
        blocos = [b for b in db.scalars(select(BlocoAgenda).where(
            BlocoAgenda.profissional_id == p.id, BlocoAgenda.inicio >= _dia(data),
            BlocoAgenda.inicio < _dia(data + timedelta(days=1))).order_by(BlocoAgenda.inicio))]
        saida.append({**profissional_json(p), "blocos": [bloco_json(b) for b in blocos],
                      "disponiveis": sum(1 for b in blocos if b.estado == "disponivel")})
    return {"clinica_id": clinica_id, "data": data.isoformat(), "profissionais": saida,
            "aviso": "Agenda fictícia de demonstração. Horário disponível não é vaga publicada nem agendamento."}
