from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import Actor, require_paciente
from app.core.db import get_db
from app.modulos.notificacoes import service

router = APIRouter(tags=["notificações"])


class NotificacaoOut(BaseModel):
    id: str
    titulo: str
    texto: str
    lida: bool
    referencia: str | None
    criado_em: str


class ListaNotificacoes(BaseModel):
    itens: list[NotificacaoOut]
    total: int
    nao_lidas: int


@router.get("/notificacoes", response_model=ListaNotificacoes, summary="Meus avisos (no app e no chat)")
def minhas(actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    itens = service.listar(db, actor.usuario_id)
    return {"itens": itens, "total": len(itens), "nao_lidas": sum(1 for i in itens if not i["lida"])}


@router.post("/notificacoes/{notificacao_id}/lida", response_model=NotificacaoOut, summary="Marcar aviso como lido")
def lida(notificacao_id: str, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    saida = service.marcar_lida(db, actor.usuario_id, notificacao_id)
    db.commit()
    return saida


class AtendenteIn(BaseModel):
    mensagem: str | None = Field(default=None, max_length=280)


class ContatoOut(BaseModel):
    clinica_nome: str
    telefone: str


class AtendenteOut(BaseModel):
    mensagem: str
    contatos: list[ContatoOut]


@router.post("/atendimento-humano", response_model=AtendenteOut, summary="Pedir para falar com uma pessoa da equipe")
def atendente(body: AtendenteIn, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    from sqlalchemy import select
    from app.models.clinicas import Clinica
    from app.models.solicitacoes import Solicitacao
    from app.models.usuarios import Usuario, VinculoClinica
    clinicas = list(dict.fromkeys(db.scalars(select(Solicitacao.clinica_id).where(
        Solicitacao.paciente_id == actor.usuario_id).order_by(Solicitacao.criado_em.desc()))))
    paciente = db.get(Usuario, actor.usuario_id)
    texto = f"{paciente.nome_exibicao} pediu para falar com uma pessoa." + (f" Recado: {body.mensagem.strip()}" if body.mensagem else "")
    for v in db.scalars(select(VinculoClinica).where(VinculoClinica.clinica_id.in_(clinicas), VinculoClinica.funcao == "atendimento")):
        service.notificar(db, v.usuario_id, "Paciente pediu atendimento humano", texto, f"paciente:{actor.usuario_id}")
    db.commit()
    contatos = [{"clinica_nome": c.nome, "telefone": c.telefone} for c in (db.get(Clinica, i) for i in clinicas) if c]
    msg = ("Avisamos a equipe da clínica. Uma pessoa vai falar com você. Se preferir, ligue agora."
           if contatos else "Você ainda não tem pedido em uma clínica. Escolha uma clínica e ligue para ela.")
    return {"mensagem": msg, "contatos": contatos}
