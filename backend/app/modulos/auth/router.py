from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import AVISO_DEMO, Actor, criar_sessao, encerrar_sessao, get_actor, senha_confere, token_atual
from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import ApiError, nao_encontrado
from app.core.time import to_sp_iso
from app.models.clinicas import Clinica
from app.models.usuarios import Usuario, VinculoClinica
from app.modulos.auth.schemas import LoginDemoIn, LoginIn

router = APIRouter(prefix="/auth", tags=["autenticação DEMO"])


def _usuario_json(actor: Actor) -> dict:
    out = {"id": actor.usuario_id, "papel": actor.papel, "nome_exibicao": actor.nome_exibicao}
    if actor.papel == "funcionario":
        primeiro = next(iter(actor.vinculos.items()), (None, None))
        out |= {"clinica_id": primeiro[0], "funcao": primeiro[1],
                "vinculos": [{"clinica_id": c, "funcao": f} for c, f in actor.vinculos.items()]}
    return out


def _resposta_login(db: Session, usuario: Usuario) -> dict:
    token, expira = criar_sessao(db, usuario)
    return {"modo": "demo", "aviso": AVISO_DEMO, "token": token, "expira_em": to_sp_iso(expira),
            "usuario": {"id": usuario.id, "papel": usuario.papel, "nome_exibicao": usuario.nome_exibicao}}


@router.get("/contas", summary="Contas fictícias para o login de demonstração")
def contas_demo(db: Session = Depends(get_db)):
    """Lista pública de contas FICTÍCIAS (sem dado pessoal). A senha de demo só é exibida com DEMO_MODE=true."""
    cfg = get_settings()
    vinculos = {v.usuario_id: v for v in db.scalars(select(VinculoClinica))}
    clinicas = {c.id: c.nome for c in db.scalars(select(Clinica))}
    itens = []
    for u in db.scalars(select(Usuario).where(Usuario.ativo).order_by(Usuario.papel.desc(), Usuario.conta_demo)):
        v = vinculos.get(u.id)
        itens.append({"conta": u.conta_demo, "nome_exibicao": u.nome_exibicao, "papel": u.papel,
                      "funcao": v.funcao if v else None, "clinica_nome": clinicas.get(v.clinica_id) if v else None})
    return {"modo": "demo", "aviso": AVISO_DEMO, "senha_demo": cfg.demo_senha if cfg.demo_mode else None,
            "login_sem_senha": cfg.demo_mode, "itens": itens}


@router.post("/login", summary="Login DEMO com conta fictícia e senha de demonstração")
def login_com_senha(body: LoginIn, db: Session = Depends(get_db)):
    usuario = db.scalar(select(Usuario).where(Usuario.conta_demo == body.conta, Usuario.ativo))
    if usuario is None or not senha_confere(body.senha, usuario.senha_hash):
        raise ApiError(401, "nao_autenticado", "Conta ou senha incorretas. Use uma conta fictícia de demonstração.")
    return _resposta_login(db, usuario)


@router.post("/demo/login", summary="Login DEMO sem senha (só com DEMO_MODE=true)")
def login_sem_senha(body: LoginDemoIn, db: Session = Depends(get_db)):
    if not get_settings().demo_mode:
        raise nao_encontrado()
    usuario = db.scalar(select(Usuario).where(Usuario.conta_demo == body.conta, Usuario.ativo))
    if usuario is None:
        raise ApiError(401, "nao_autenticado", "Conta não encontrada. Use uma conta fictícia de demonstração.")
    return _resposta_login(db, usuario)


@router.get("/me", summary="Usuário do token (papel e clínica vêm do servidor)")
def me(actor: Actor = Depends(get_actor)):
    return {"modo": "demo", "usuario": _usuario_json(actor)}


@router.post("/logout", status_code=204)
def logout(token: str = Depends(token_atual), _: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    encerrar_sessao(db, token)
