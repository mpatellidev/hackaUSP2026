"""App de DESENVOLVIMENTO do módulo, com auth DEMO provisória (sem senha, NÃO segura).
Existe só até a #2 entregar a auth real: lá, basta incluir `router` e sobrescrever `obter_sessao`.
Rodar (a partir de backend/): uvicorn app.modulos.cenarios.dev_app:app --reload"""
import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Header

from . import seed
from .deps import Sessao, obter_sessao
from .erros import ErroApi, instalar_tratadores
from .router import router

_FIX = Path(__file__).resolve().parents[4] / "docs" / "fixtures"


def _sessao_demo(authorization: Optional[str] = Header(default=None)) -> Sessao:
    """Token provisório: `Bearer demo:<conta>` (ex.: demo:paciente.ana). Só para dev/testes."""
    if not authorization or not authorization.startswith("Bearer demo:"):
        raise ErroApi(401, "nao_autenticado", "Entre na sua conta para continuar.")
    contas = {c["conta"]: c for c in json.loads((_FIX / "contas-demo.json").read_text("utf-8"))["itens"]}
    conta = contas.get(authorization.removeprefix("Bearer demo:"))
    if not conta:
        raise ErroApi(401, "nao_autenticado", "Entre na sua conta para continuar.")
    vinculos = {v["usuario_id"]: v for v in json.loads((_FIX / "vinculos.json").read_text("utf-8"))["itens"]}
    v = vinculos.get(conta["usuario_id"])
    return Sessao(conta["usuario_id"], conta["papel"], v["funcao"] if v else None, v["clinica_id"] if v else None)


def criar_app() -> FastAPI:
    app = FastAPI(title="UHealth · cenários (DEV, auth demo)", version="0.1.0")
    instalar_tratadores(app)
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[obter_sessao] = _sessao_demo
    seed.carregar()
    return app


app = criar_app()
