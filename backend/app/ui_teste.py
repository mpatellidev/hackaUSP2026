"""UI de teste (navegador e celular): HTML/CSS/JS puro servido pela própria API em /teste/.

Cliente fino da API real em /api/v1 (mesma origem, sem CORS e sem build). Protótipo: dados fictícios,
login DEMO inseguro. Nada aqui altera regras do backend.
"""
import mimetypes
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

PASTA = Path(__file__).parent / "ui_teste"


def montar(app: FastAPI) -> None:
    mimetypes.add_type("text/javascript", ".js")  # módulos ES exigem MIME de JavaScript

    @app.get("/", include_in_schema=False)
    def raiz() -> RedirectResponse:
        return RedirectResponse("/teste/", status_code=307)

    @app.get("/teste", include_in_schema=False)
    def teste_sem_barra() -> RedirectResponse:
        return RedirectResponse("/teste/", status_code=307)

    app.mount("/teste", StaticFiles(directory=PASTA, html=True), name="ui_teste")
