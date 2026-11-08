from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor, require_funcionario, require_paciente
from app.core.db import get_db
from app.modulos.prontuario import service

router = APIRouter(tags=["prontuário"])

AVISO = ("Seu prontuário é protegido (guardado com criptografia). Cada vez que alguém vê ou escreve, fica registrado "
         "aqui. Outra clínica só vê depois que você confirma um encaminhamento.")


class RegistroOut(BaseModel):
    id: str
    tipo: str
    tipo_rotulo: str
    clinica_nome: str
    risco_clinico: str | None
    especialidades: list[str]
    procedimentos: list[str]
    conteudo: str
    autor_nome: str | None
    validado_por_nome: str | None
    validado_em: str | None
    criado_em: str


class ProntuarioOut(BaseModel):
    itens: list[RegistroOut]
    total: int
    aviso: str


class AcessoOut(BaseModel):
    id: str
    quem: str
    acao: str
    acao_rotulo: str
    clinica_nome: str | None
    criado_em: str


class ListaAcessos(BaseModel):
    itens: list[AcessoOut]
    total: int


class RegistroIn(BaseModel):
    solicitacao_id: str = Field(min_length=1, max_length=64)
    tipo: Literal["triagem", "exame_clinico", "radiografia", "laudo", "plano_tratamento", "evolucao"]
    conteudo: str = Field(min_length=3, max_length=4000)
    risco_clinico: Literal["baixo", "moderado", "alto", "urgente"] | None = None
    especialidades: list[str] = Field(default_factory=list, max_length=10)
    procedimentos: list[str] = Field(default_factory=list, max_length=20)


@router.get("/prontuario", response_model=ProntuarioOut, summary="Meu prontuário (só leitura; o acesso fica registrado)")
def meu(actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    itens = service.do_paciente(db, actor, actor.usuario_id)
    db.commit()
    return {"itens": itens, "total": len(itens), "aviso": AVISO}


@router.get("/prontuario/acessos", response_model=ListaAcessos, summary="Quem viu ou escreveu no meu prontuário")
def acessos(actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    itens = service.acessos(db, actor)
    return {"itens": itens, "total": len(itens)}


@router.get("/pacientes/{paciente_id}/prontuario", response_model=ProntuarioOut,
            summary="Prontuário de um paciente com pedido na minha clínica (equipe; acesso registrado)")
def do_paciente(paciente_id: str, actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    itens = service.do_paciente(db, actor, paciente_id)
    db.commit()
    return {"itens": itens, "total": len(itens), "aviso": AVISO}


@router.post("/prontuario", status_code=201, response_model=RegistroOut, summary="Escrever no prontuário (estudante ou professor)")
def criar(body: RegistroIn, actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    r = service.criar(db, actor, body.solicitacao_id, body.tipo, body.conteudo, body.risco_clinico,
                      body.especialidades, body.procedimentos)
    db.commit()
    return service.registro_json(db, r)


@router.post("/prontuario/{registro_id}/validar", response_model=RegistroOut,
             summary="Validar registro (professor). Triagem validada aciona o indexador")
def validar(registro_id: str, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    r = service.validar(db, actor, registro_id)
    db.commit()
    return service.registro_json(db, r)
