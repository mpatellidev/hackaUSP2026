"""Formato único de erro do contrato §2: {"erro": {"codigo", "mensagem", "detalhes"?}}."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(self, status: int, codigo: str, mensagem: str, detalhes: dict | None = None):
        self.status, self.codigo, self.mensagem, self.detalhes = status, codigo, mensagem, detalhes


def nao_autenticado() -> ApiError:
    return ApiError(401, "nao_autenticado", "Você precisa entrar para continuar.")


def acesso_negado() -> ApiError:
    return ApiError(403, "acesso_negado", "Você não tem permissão para fazer isso.")


def nao_encontrado() -> ApiError:
    return ApiError(404, "nao_encontrado", "Não encontramos o que você procurou.")


def _body(codigo: str, mensagem: str, detalhes: dict | None = None) -> dict:
    erro = {"codigo": codigo, "mensagem": mensagem}
    if detalhes:
        erro["detalhes"] = detalhes
    return {"erro": erro}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api(_: Request, exc: ApiError):
        return JSONResponse(_body(exc.codigo, exc.mensagem, exc.detalhes), status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def _val(_: Request, exc: RequestValidationError):
        campos = sorted({".".join(str(p) for p in e["loc"] if p != "body") for e in exc.errors()})
        return JSONResponse(
            _body("validacao", "Alguns dados estão inválidos. Confira e tente de novo.", {"campos": campos}),
            status_code=422,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        codigo = {401: "nao_autenticado", 403: "acesso_negado", 404: "nao_encontrado"}.get(exc.status_code, "erro")
        return JSONResponse(_body(codigo, "Não foi possível concluir o pedido."), status_code=exc.status_code)
