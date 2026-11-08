from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.seguranca import Limitador, instalar_cabecalhos
from app.modulos.saude import router as saude
from app.registro import ROUTERS
from app.spa import montar as montar_spa


def create_app() -> FastAPI:
    settings = get_settings()
    docs = settings.demo_mode  # documentação interativa só no modo demo (local); hospedado fica fechada
    app = FastAPI(
        title="Sorriu+ API (DEMO)",
        version="0.1.0",
        description="Protótipo de hackathon. **Dados fictícios e autenticação DEMO sem senha: "
                    "não é seguro para produção.**",
        docs_url="/docs" if docs else None, redoc_url="/redoc" if docs else None,
        openapi_url="/openapi.json" if docs else None,
    )
    app.state.limitador = Limitador()
    instalar_cabecalhos(app)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_methods=["*"], allow_headers=["*"])
    install_error_handlers(app)
    api = APIRouter(prefix="/api/v1")
    for r in ROUTERS:
        api.include_router(r)
    app.include_router(api)
    app.include_router(saude.router)  # atalho GET /saude (contrato §2)
    montar_spa(app)  # apps web: paciente em / e clínicas em /clinica/ (builds de app/*/dist), por último
    return app


app = create_app()
