"""Receitas: estudante redige, professor (cirurgião-dentista com CRO) aprova e assina; paciente vê, baixa e é avisado."""
import json

from fpdf import FPDF
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.cripto import cifrar, decifrar
from app.core.errors import ApiError, acesso_negado, nao_encontrado
from app.core.time import to_sp_iso, utc_now
from app.models.clinicas import Clinica
from app.models.solicitacoes import Solicitacao
from app.models.usuarios import Usuario
from app.modulos.notificacoes.service import notificar
from app.modulos.prontuario.models import AcessoProntuario
from app.modulos.receitas.models import Receita

AVISO_ASSINATURA = ("Aprovada e assinada eletronicamente no sistema pelo profissional indicado (nome e CRO). "
                    "Não substitui receita com assinatura digital ICP-Brasil.")


def receita_json(db: Session, r: Receita) -> dict:
    conteudo = json.loads(decifrar(r.conteudo_cifrado))
    autor = db.get(Usuario, r.autor_id)
    return {"id": r.id, "estado": r.estado, "valida": r.estado == "assinada", "instituicao": r.instituicao,
            "itens": conteudo["itens"], "orientacoes": conteudo.get("orientacoes") or "",
            "redigida_por": autor.nome_exibicao if autor else None, "assinante_nome": r.assinante_nome,
            "assinante_cro": r.assinante_cro, "data_emissao": to_sp_iso(r.assinado_em) if r.assinado_em else None,
            "solicitacao_id": r.solicitacao_id, "criado_em": to_sp_iso(r.criado_em)}


def do_paciente(db: Session, actor: Actor) -> list[dict]:
    """O paciente vê só receitas válidas (assinadas); rascunho não é receita."""
    q = select(Receita).where(Receita.paciente_id == actor.usuario_id, Receita.estado == "assinada")
    return [receita_json(db, r) for r in db.scalars(q.order_by(Receita.assinado_em.desc(), Receita.id))]


def obter(db: Session, actor: Actor, receita_id: str) -> Receita:
    r = db.get(Receita, receita_id)
    if r is None:
        raise nao_encontrado()
    if actor.papel == "paciente":
        if r.paciente_id != actor.usuario_id or r.estado != "assinada":
            raise nao_encontrado()
    elif not actor.pode_na_clinica(r.clinica_id):
        raise nao_encontrado()
    return r


def criar(db: Session, actor: Actor, solicitacao_id: str, itens: list[dict], orientacoes: str) -> Receita:
    pedido = db.get(Solicitacao, solicitacao_id)
    if pedido is None or not actor.pode_na_clinica(pedido.clinica_id):
        raise nao_encontrado()
    if not actor.tem_funcao(pedido.clinica_id, "estudante", "profissional"):
        raise acesso_negado("Só estudante ou professor da clínica redige receita.")
    clinica = db.get(Clinica, pedido.clinica_id)
    r = Receita(paciente_id=pedido.paciente_id, clinica_id=clinica.id, solicitacao_id=pedido.id,
                instituicao=f"{clinica.nome} · {clinica.universidade or ''}".strip(" ·"),
                conteudo_cifrado=cifrar(json.dumps({"itens": itens, "orientacoes": orientacoes}, ensure_ascii=False)),
                autor_id=actor.usuario_id, estado="rascunho")
    db.add(r)
    db.flush()
    db.add(AcessoProntuario(paciente_id=pedido.paciente_id, usuario_id=actor.usuario_id, clinica_id=clinica.id, acao="criacao"))
    return r


def assinar(db: Session, actor: Actor, receita_id: str) -> Receita:
    r = obter(db, actor, receita_id)
    if not actor.tem_funcao(r.clinica_id, "profissional"):
        raise acesso_negado("Só o professor/cirurgião-dentista supervisor assina a receita.")
    if r.estado == "assinada":
        raise ApiError(409, "transicao_invalida", "Esta receita já foi assinada.")
    assinante = db.get(Usuario, actor.usuario_id)
    if not assinante.cro:
        raise ApiError(422, "validacao", "Cadastre seu CRO antes de assinar receitas.", {"campos": ["cro"]})
    r.estado, r.assinado_por, r.assinado_em = "assinada", assinante.id, utc_now()
    r.assinante_nome, r.assinante_cro = assinante.nome_exibicao, assinante.cro
    db.add(AcessoProntuario(paciente_id=r.paciente_id, usuario_id=actor.usuario_id, clinica_id=r.clinica_id, acao="validacao"))
    db.flush()
    notificar(db, r.paciente_id, "Nova receita",
              f"Você tem uma nova receita da {r.instituicao}. Veja em Meu cuidado > Receitas. Dúvidas sobre o remédio: fale com a clínica.",
              f"receita:{r.id}")
    return r


def _t(texto: str) -> str:
    """fpdf2 com fonte padrão aceita latin-1: troca o que não couber (ex.: travessão)."""
    return texto.replace("—", "-").replace("–", "-").replace("·", "-").encode("latin-1", "replace").decode("latin-1")


def pdf(db: Session, r: Receita) -> bytes:
    d = receita_json(db, r)
    paciente = db.get(Usuario, r.paciente_id)
    doc = FPDF(format="A4")
    doc.add_page()
    doc.set_auto_page_break(True, margin=18)
    doc.set_font("Helvetica", "B", 16)
    doc.cell(0, 10, _t("Receita odontológica"), new_x="LMARGIN", new_y="NEXT")
    doc.set_font("Helvetica", "", 11)
    doc.multi_cell(0, 6, _t(d["instituicao"]), new_x="LMARGIN", new_y="NEXT")
    emissao = d["data_emissao"] or ""
    doc.cell(0, 6, _t(f"Data de emissão: {emissao[8:10]}/{emissao[5:7]}/{emissao[:4]}"), new_x="LMARGIN", new_y="NEXT")
    doc.cell(0, 6, _t(f"Paciente: {paciente.nome_exibicao if paciente else ''}"), new_x="LMARGIN", new_y="NEXT")
    doc.ln(4)
    for n, item in enumerate(d["itens"], start=1):
        doc.set_font("Helvetica", "B", 12)
        doc.multi_cell(0, 7, _t(f"{n}. {item['medicamento']}"), new_x="LMARGIN", new_y="NEXT")
        doc.set_font("Helvetica", "", 11)
        for rotulo, chave in (("Dose", "dosagem"), ("Como usar", "via"), ("Quando", "frequencia"), ("Por quanto tempo", "duracao")):
            doc.multi_cell(0, 6, _t(f"   {rotulo}: {item[chave]}"), new_x="LMARGIN", new_y="NEXT")
        doc.ln(2)
    if d["orientacoes"]:
        doc.set_font("Helvetica", "B", 11)
        doc.cell(0, 7, _t("Orientações"), new_x="LMARGIN", new_y="NEXT")
        doc.set_font("Helvetica", "", 11)
        doc.multi_cell(0, 6, _t(d["orientacoes"]), new_x="LMARGIN", new_y="NEXT")
    doc.ln(8)
    doc.set_font("Helvetica", "B", 11)
    doc.cell(0, 6, _t(f"{d['assinante_nome']} - {d['assinante_cro']}"), new_x="LMARGIN", new_y="NEXT")
    doc.set_font("Helvetica", "I", 9)
    doc.multi_cell(0, 5, _t(AVISO_ASSINATURA), new_x="LMARGIN", new_y="NEXT")
    doc.multi_cell(0, 5, _t(f"Redigida por {d['redigida_por']} (estudante supervisionado). Código {r.id[:8].upper()}."),
                   new_x="LMARGIN", new_y="NEXT")
    return bytes(doc.output())
