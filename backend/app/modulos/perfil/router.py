from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor
from app.core.db import get_db
from app.modulos.perfil import service
from app.modulos.perfil.schemas import ModoIn, PerfilIn, PerfilOut

router = APIRouter(tags=["perfil"])

AVISO = ("Renda é opcional ('prefiro não informar' vale) e não impede pedido. Seus dados ficam protegidos e "
         "nunca aparecem para outros pacientes.")


@router.get("/perfil", response_model=PerfilOut, response_model_exclude_unset=True, summary="Meu perfil (apenas o próprio usuário)")
def meu_perfil(actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    return {**service.obter(db, actor), "modo": "demo", "aviso": AVISO}


@router.put("/perfil", response_model=PerfilOut, response_model_exclude_unset=True, summary="Salvar meu perfil (substitui o anterior)")
def salvar_perfil(body: PerfilIn, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    saida = service.salvar(db, actor, body)
    db.commit()
    return {**saida, "modo": "demo", "aviso": AVISO}


@router.put("/perfil/modo", response_model=PerfilOut, response_model_exclude_unset=True,
            summary="Salvar o modo de uso: assistente (conversa) ou telas")
def salvar_modo(body: ModoIn, actor: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    saida = service.salvar_modo(db, actor, body.modo)
    db.commit()
    return {**saida, "modo": "demo", "aviso": AVISO}
