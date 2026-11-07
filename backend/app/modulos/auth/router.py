from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import AVISO_DEMO, Actor, criar_sessao, encerrar_sessao, get_actor, token_atual
from app.core.db import get_db
from app.core.errors import ApiError
from app.core.time import to_sp_iso
from app.models.usuarios import Usuario
from app.modulos.auth.schemas import LoginIn

router = APIRouter(prefix="/auth", tags=["autenticação DEMO"])


def _usuario_json(actor: Actor) -> dict:
    out = {"id": actor.usuario_id, "papel": actor.papel, "nome_exibicao": actor.nome_exibicao}
    if actor.papel == "funcionario":
        primeiro = next(iter(actor.vinculos.items()), (None, None))
        out |= {"clinica_id": primeiro[0], "funcao": primeiro[1],
                "vinculos": [{"clinica_id": c, "funcao": f} for c, f in actor.vinculos.items()]}
    return out


@router.post("/demo/login", summary="Login DEMO (sem senha)")
def login(body: LoginIn, db: Session = Depends(get_db)):
    usuario = db.scalar(select(Usuario).where(Usuario.conta_demo == body.conta, Usuario.ativo))
    if usuario is None:
        raise ApiError(401, "nao_autenticado", "Conta não encontrada. Use uma conta fictícia de demonstração.")
    token, expira = criar_sessao(db, usuario)
    return {"modo": "demo", "aviso": AVISO_DEMO, "token": token, "expira_em": to_sp_iso(expira),
            "usuario": {"id": usuario.id, "papel": usuario.papel, "nome_exibicao": usuario.nome_exibicao}}


@router.get("/me", summary="Usuário do token (papel e clínica vêm do servidor)")
def me(actor: Actor = Depends(get_actor)):
    return {"modo": "demo", "usuario": _usuario_json(actor)}


@router.post("/logout", status_code=204)
def logout(token: str = Depends(token_atual), _: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    encerrar_sessao(db, token)
