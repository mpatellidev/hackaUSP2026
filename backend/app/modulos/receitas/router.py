from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor, require_funcionario, require_paciente
from app.core.db import get_db
from app.modulos.receitas import service

router = APIRouter(tags=["receitas"])

AVISO = ("Siga a receita como está escrita. Não mude a dose por conta própria. Dúvidas sobre o remédio: fale com a "
         "clínica que receitou. " + service.AVISO_ASSINATURA)


class ItemReceita(BaseModel):
    medicamento: str = Field(min_length=2, max_length=120)
    dosagem: str = Field(min_length=1, max_length=80)
    via: str = Field(min_length=2, max_length=40, description="Via de administração (ex.: oral, bochecho)")
    frequencia: str = Field(min_length=2, max_length=80)
    duracao: str = Field(min_length=2, max_length=60)


class ReceitaIn(BaseModel):
    solicitacao_id: str = Field(min_length=1, max_length=64)
    itens: list[ItemReceita] = Field(min_length=1, max_length=10)
    orientacoes: str = Field(default="", max_length=1000)


class ReceitaOut(BaseModel):
    id: str
    estado: str
    valida: bool
    instituicao: str
    itens: list[ItemReceita]
    orientacoes: str
    redigida_por: str | None
    assinante_nome: str | None
    assinante_cro: str | None
    data_emissao: str | None
    solicitacao_id: str | None
    criado_em: str


class ListaReceitas(BaseModel):
    itens: list[ReceitaOut]
    total: int
    aviso: str


@router.get("/receitas", response_model=ListaReceitas, summary="Minhas receitas (só as assinadas, histórico completo)")
def minhas(actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    itens = service.do_paciente(db, actor)
    return {"itens": itens, "total": len(itens), "aviso": AVISO}


@router.get("/receitas/{receita_id}/pdf", summary="Baixar a receita em PDF", response_class=Response)
def baixar(receita_id: str, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    r = service.obter(db, actor, receita_id)
    return Response(service.pdf(db, r), media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="receita-{r.id[:8]}.pdf"'})


@router.post("/receitas", status_code=201, response_model=ReceitaOut, summary="Redigir receita (estudante ou professor)")
def criar(body: ReceitaIn, actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    r = service.criar(db, actor, body.solicitacao_id, [i.model_dump() for i in body.itens], body.orientacoes.strip())
    db.commit()
    return service.receita_json(db, r)


@router.post("/receitas/{receita_id}/assinar", response_model=ReceitaOut,
             summary="Aprovar e assinar a receita (professor com CRO). O paciente é avisado")
def assinar(receita_id: str, actor: Actor = Depends(require_funcionario), db: Session = Depends(get_db)):
    r = service.assinar(db, actor, receita_id)
    db.commit()
    return service.receita_json(db, r)
