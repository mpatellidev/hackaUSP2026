from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor
from app.core.db import get_db
from app.modulos.perfil import service
from app.modulos.perfil.schemas import PerfilIn

router = APIRouter(tags=["perfil"])

AVISO = ("Renda é opcional ('prefiro não informar' vale) e não impede pedido. Serve só de apoio à fila explicável, "
         "nunca fica visível a outros pacientes. Dados fictícios (demo).")


@router.get("/perfil", summary="Meu perfil (apenas o próprio usuário)")
def meu_perfil(actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    return {**service.obter(db, actor), "modo": "demo", "aviso": AVISO}


@router.put("/perfil", summary="Salvar meu perfil (substitui o anterior)")
def salvar_perfil(body: PerfilIn, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    saida = service.salvar(db, actor, body)
    db.commit()
    return {**saida, "modo": "demo", "aviso": AVISO}
