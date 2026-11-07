"""Erros no formato único do contrato (§2). #2 pode trocar por um tratador global."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ErroApi(Exception):
    def __init__(self, status: int, codigo: str, mensagem: str, detalhes: dict | None = None):
        self.status, self.codigo, self.mensagem, self.detalhes = status, codigo, mensagem, detalhes


def _corpo(codigo: str, mensagem: str, detalhes: dict | None = None) -> dict:
    erro = {"codigo": codigo, "mensagem": mensagem}
    if detalhes:
        erro["detalhes"] = detalhes
    return {"erro": erro}


def nao_encontrado() -> ErroApi:
    return ErroApi(404, "nao_encontrado", "Não encontramos este cenário.")


def acesso_negado(mensagem: str = "Você não tem permissão para esta ação.") -> ErroApi:
    return ErroApi(403, "acesso_negado", mensagem)


def instalar_tratadores(app: FastAPI) -> None:
    @app.exception_handler(ErroApi)
    async def _erro_api(_: Request, e: ErroApi):
        return JSONResponse(_corpo(e.codigo, e.mensagem, e.detalhes), status_code=e.status)

    @app.exception_handler(RequestValidationError)
    async def _validacao(_: Request, e: RequestValidationError):
        campos = [".".join(str(p) for p in err["loc"][1:]) or str(err["loc"][0]) for err in e.errors()]
        return JSONResponse(
            _corpo("validacao", "Confira os campos informados e tente de novo.", {"campos": campos}),
            status_code=422,
        )
