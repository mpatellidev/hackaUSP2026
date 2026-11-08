"""Prontuário Único: leitura pelo paciente, escrita pelo estudante, validação pelo professor. Todo acesso é registrado.

Equipe só vê o prontuário de quem tem (ou teve) pedido na própria clínica: é o caso da clínica de destino depois
que o paciente confirma um encaminhamento (consentimento), e por isso o paciente não repete exames.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.cripto import cifrar, decifrar
from app.core.errors import ApiError, acesso_negado, nao_encontrado
from app.core.time import to_sp_iso, utc_now
from app.models.clinicas import Clinica
from app.models.solicitacoes import Solicitacao
from app.models.usuarios import Usuario
from app.modulos.prontuario.models import AcessoProntuario, RegistroProntuario

ROTULO_TIPO = {"triagem": "Triagem", "exame_clinico": "Exame clínico", "radiografia": "Radiografia", "laudo": "Laudo",
               "plano_tratamento": "Plano de tratamento", "evolucao": "Evolução do tratamento"}
ROTULO_ACAO = {"consulta": "viu", "criacao": "escreveu", "validacao": "validou", "compartilhamento": "liberou para"}


def _nome(db: Session, usuario_id: str | None) -> str | None:
    u = db.get(Usuario, usuario_id) if usuario_id else None
    return u.nome_exibicao if u else None


def registro_json(db: Session, r: RegistroProntuario) -> dict:
    c = db.get(Clinica, r.clinica_id)
    return {"id": r.id, "tipo": r.tipo, "tipo_rotulo": ROTULO_TIPO.get(r.tipo, r.tipo), "clinica_nome": c.nome if c else "",
            "risco_clinico": r.risco_clinico, "especialidades": list(r.especialidades or []),
            "procedimentos": list(r.procedimentos or []), "conteudo": decifrar(r.conteudo_cifrado),
            "autor_nome": _nome(db, r.autor_id), "validado_por_nome": _nome(db, r.validado_por),
            "validado_em": to_sp_iso(r.validado_em) if r.validado_em else None, "criado_em": to_sp_iso(r.criado_em)}


def _registrar(db: Session, paciente_id: str, actor: Actor, acao: str, registro_id: str | None = None,
               clinica_id: str | None = None) -> None:
    db.add(AcessoProntuario(paciente_id=paciente_id, usuario_id=actor.usuario_id, registro_id=registro_id,
                            clinica_id=clinica_id, acao=acao))


def do_paciente(db: Session, actor: Actor, paciente_id: str) -> list[dict]:
    """Paciente vê o próprio; equipe só de quem tem pedido na clínica dela (senão 404)."""
    if actor.papel == "paciente":
        if paciente_id != actor.usuario_id:
            raise nao_encontrado()
        clinica = None
    else:
        clinica = next((c for c in actor.clinica_ids if db.scalar(select(Solicitacao.id).where(
            Solicitacao.paciente_id == paciente_id, Solicitacao.clinica_id == c))), None)
        if clinica is None:
            raise nao_encontrado()
    q = select(RegistroProntuario).where(RegistroProntuario.paciente_id == paciente_id)
    registros = list(db.scalars(q.order_by(RegistroProntuario.criado_em.desc(), RegistroProntuario.id)))
    _registrar(db, paciente_id, actor, "consulta", clinica_id=clinica)
    db.flush()
    return [registro_json(db, r) for r in registros]


def acessos(db: Session, actor: Actor) -> list[dict]:
    q = select(AcessoProntuario).where(AcessoProntuario.paciente_id == actor.usuario_id)
    saida = []
    for a in db.scalars(q.order_by(AcessoProntuario.criado_em.desc(), AcessoProntuario.id)):
        c = db.get(Clinica, a.clinica_id) if a.clinica_id else None
        saida.append({"id": a.id, "quem": "Você" if a.usuario_id == actor.usuario_id else (_nome(db, a.usuario_id) or ""),
                      "acao": a.acao, "acao_rotulo": ROTULO_ACAO.get(a.acao, a.acao), "clinica_nome": c.nome if c else None,
                      "criado_em": to_sp_iso(a.criado_em)})
    return saida


def criar(db: Session, actor: Actor, solicitacao_id: str, tipo: str, conteudo: str, risco_clinico: str | None,
          especialidades: list[str], procedimentos: list[str]) -> RegistroProntuario:
    pedido = db.get(Solicitacao, solicitacao_id)
    if pedido is None or not actor.pode_na_clinica(pedido.clinica_id):
        raise nao_encontrado()
    if not actor.tem_funcao(pedido.clinica_id, "estudante", "profissional"):
        raise acesso_negado("Só estudante ou professor da clínica escreve no prontuário.")
    r = RegistroProntuario(paciente_id=pedido.paciente_id, clinica_id=pedido.clinica_id, solicitacao_id=pedido.id,
                           tipo=tipo, risco_clinico=risco_clinico, especialidades=especialidades,
                           procedimentos=procedimentos, conteudo_cifrado=cifrar(conteudo.strip()), autor_id=actor.usuario_id)
    db.add(r)
    db.flush()
    _registrar(db, pedido.paciente_id, actor, "criacao", r.id, pedido.clinica_id)
    return r


def validar(db: Session, actor: Actor, registro_id: str) -> RegistroProntuario:
    """Professor/supervisor valida. Triagem ou plano validado aciona o indexador (manter ou referenciar)."""
    from app.modulos.indexador.service import decidir
    r = db.get(RegistroProntuario, registro_id)
    if r is None or not actor.pode_na_clinica(r.clinica_id):
        raise nao_encontrado()
    if not actor.tem_funcao(r.clinica_id, "profissional"):
        raise acesso_negado("Só o professor/supervisor valida o prontuário.")
    if r.validado_por:
        raise ApiError(409, "transicao_invalida", "Este registro já foi validado.")
    r.validado_por, r.validado_em = actor.usuario_id, utc_now()
    _registrar(db, r.paciente_id, actor, "validacao", r.id, r.clinica_id)
    db.flush()
    if r.tipo in ("triagem", "plano_tratamento"):
        decidir(db, r)
    return r
