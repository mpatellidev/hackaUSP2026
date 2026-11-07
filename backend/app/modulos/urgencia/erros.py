from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse


class ErroApi(Exception):
    def __init__(self, status: int, codigo: str, mensagem: str, detalhes: Optional[dict] = None):
        self.status, self.codigo, self.mensagem, self.detalhes = status, codigo, mensagem, detalhes


def acesso_negado(msg: str = "Você não tem permissão para esta ação.") -> ErroApi:
    return ErroApi(403, "acesso_negado", msg)


def nao_encontrado() -> ErroApi:
    return ErroApi(404, "nao_encontrado", "Não encontramos este registro.")


def transicao_invalida(msg: str) -> ErroApi:
    return ErroApi(409, "transicao_invalida", msg)


async def tratar_erro_api(_: Request, e: ErroApi) -> JSONResponse:
    corpo = {"codigo": e.codigo, "mensagem": e.mensagem}
    if e.detalhes:
        corpo["detalhes"] = e.detalhes
    return JSONResponse(status_code=e.status, content={"erro": corpo})
