from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import (AVISO_DEMO, Actor, criar_sessao, encerrar_sessao, get_actor, hash_senha, hash_senha_demo,
                           senha_confere, token_atual)
from app.core.config import get_settings
from app.core import cpf as cpf_util
from app.core.cripto import cifrar, hash_cpf
from app.core.db import get_db
from app.core.errors import ApiError, nao_encontrado
from app.core.seguranca import ip, limitador, muitas_tentativas
from app.core.time import to_sp_iso
from app.models.clinicas import Clinica
from app.models.usuarios import Usuario, VinculoClinica
from app.modulos.auth.schemas import CadastroIn, ContasDemo, EntrarIn, LoginDemoIn, LoginIn, LoginOut, MeOut

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


@router.get("/contas", response_model=ContasDemo, summary="Contas fictícias para o login de demonstração")
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


FALHAS_LOGIN, JANELA_LOGIN_S = 10, 300  # por IP: todas as contas fictícias compartilham a mesma senha


@router.post("/login", response_model=LoginOut, summary="Login DEMO com conta fictícia e senha de demonstração")
def login_com_senha(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    if get_settings().senha_insegura:
        raise ApiError(503, "servico_indisponivel", "Login desativado: defina DEMO_SENHA no ambiente do servidor "
                                                    "(a senha padrão do repositório não vale fora do modo demo).")
    lim, chave = limitador(request), f"login:{ip(request)}"
    if lim.excedido(chave, FALHAS_LOGIN, JANELA_LOGIN_S):
        raise muitas_tentativas()
    usuario = db.scalar(select(Usuario).where(Usuario.conta_demo == body.conta, Usuario.ativo))
    if usuario is None or not senha_confere(body.senha, usuario.senha_hash):
        lim.registrar(chave)  # só falhas contam
        raise ApiError(401, "nao_autenticado", "Conta ou senha incorretas. Use uma conta fictícia de demonstração.")
    return _resposta_login(db, usuario)


@router.post("/entrar", response_model=LoginOut, summary="Entrar com e-mail e senha (app do paciente)")
def entrar(body: EntrarIn, request: Request, db: Session = Depends(get_db)):
    lim, chave = limitador(request), f"login:{ip(request)}"
    if lim.excedido(chave, FALHAS_LOGIN, JANELA_LOGIN_S):
        raise muitas_tentativas()
    login = body.login.strip().lower()
    if "@" in login:
        filtro = Usuario.email == login
    elif cpf_util.valido(login):
        filtro = Usuario.cpf_hash == hash_cpf(login)
    else:
        filtro = None
    usuario = db.scalar(select(Usuario).where(filtro, Usuario.ativo)) if filtro is not None else None
    if usuario is None or not senha_confere(body.senha, usuario.senha_hash):
        lim.registrar(chave)  # só falhas contam
        raise ApiError(401, "nao_autenticado", "CPF/e-mail ou senha incorretos.")
    cfg = get_settings()
    if cfg.senha_insegura and usuario.senha_hash == hash_senha_demo(cfg.demo_senha):
        raise ApiError(503, "servico_indisponivel", "Esta conta usa a senha inicial padrão, que está desativada "
                                                    "neste servidor. Defina DEMO_SENHA no ambiente.")
    return _resposta_login(db, usuario)


@router.post("/cadastro", status_code=201, response_model=LoginOut, summary="Criar conta de paciente (e-mail e senha)")
def cadastro(body: CadastroIn, request: Request, db: Session = Depends(get_db)):
    lim, chave = limitador(request), f"cadastro:{ip(request)}"
    if lim.excedido(chave, 10, 3600):
        raise muitas_tentativas()
    email = body.email.strip().lower()
    if not cpf_util.valido(body.cpf):
        raise ApiError(422, "validacao", "CPF inválido. Confira os números.", {"campos": ["cpf"]})
    if db.scalar(select(Usuario.id).where(Usuario.cpf_hash == hash_cpf(body.cpf))):
        raise ApiError(409, "cpf_em_uso", "Já existe uma conta com este CPF. Tente entrar.", {"campos": ["cpf"]})
    if db.scalar(select(Usuario.id).where((Usuario.email == email) | (Usuario.conta_demo == email))):
        raise ApiError(409, "email_em_uso", "Já existe uma conta com este e-mail. Tente entrar.", {"campos": ["email"]})
    lim.registrar(chave)
    usuario = Usuario(papel="paciente", nome_exibicao=body.nome.strip(), conta_demo=email, email=email,
                      senha_hash=hash_senha(body.senha),  # sal aleatório por conta
                      cpf_hash=hash_cpf(body.cpf), cpf_cifrado=cifrar(cpf_util.so_digitos(body.cpf)))
    db.add(usuario)
    db.flush()
    resposta = _resposta_login(db, usuario)
    db.commit()
    return resposta


@router.post("/demo/login", response_model=LoginOut, summary="Login DEMO sem senha (só com DEMO_MODE=true)")
def login_sem_senha(body: LoginDemoIn, db: Session = Depends(get_db)):
    if not get_settings().demo_mode:
        raise nao_encontrado()
    usuario = db.scalar(select(Usuario).where(Usuario.conta_demo == body.conta, Usuario.ativo))
    if usuario is None:
        raise ApiError(401, "nao_autenticado", "Conta não encontrada. Use uma conta fictícia de demonstração.")
    return _resposta_login(db, usuario)


@router.get("/me", response_model=MeOut, response_model_exclude_unset=True, summary="Usuário do token (papel e clínica vêm do servidor)")
def me(actor: Actor = Depends(get_actor)):
    return {"modo": "demo", "usuario": _usuario_json(actor)}


@router.post("/logout", status_code=204)
def logout(token: str = Depends(token_atual), _: Actor = Depends(get_actor), db: Session = Depends(get_db)):
    encerrar_sessao(db, token)
