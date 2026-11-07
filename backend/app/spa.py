"""Serve os builds dos apps web na MESMA origem da API (sem CORS): paciente em `/` e clínicas em `/clinica/`.

Os builds vêm de `app/paciente/dist` e `app/clinica/dist` (`npm run build` dentro de `app/`). Rotas do navegador
(React Router) voltam ao `index.html`; caminhos de API desconhecidos continuam 404.
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles

from app.core.config import FRONTEND_DIR

AVISO_SEM_BUILD = ("O frontend ainda não foi construído.\nRode `npm install && npm run build` dentro de app/ "
                   "(ou use `npm run dev` para desenvolver). A documentação da API está em /docs.\n")


class AppWeb(StaticFiles):
    """StaticFiles com fallback para o index.html (rotas do React Router)."""

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404 or path.startswith("api/") or "." in Path(path).name:
                raise
            return await super().get_response("index.html", scope)


def montar(app: FastAPI, pasta: Path = FRONTEND_DIR) -> None:
    paciente, clinica = pasta / "paciente" / "dist", pasta / "clinica" / "dist"
    if clinica.is_dir():
        app.mount("/clinica", AppWeb(directory=clinica, html=True), name="app_clinica")
    if paciente.is_dir():
        app.mount("/", AppWeb(directory=paciente, html=True), name="app_paciente")
    else:
        @app.get("/", include_in_schema=False)
        def sem_build() -> PlainTextResponse:
            return PlainTextResponse(AVISO_SEM_BUILD)
