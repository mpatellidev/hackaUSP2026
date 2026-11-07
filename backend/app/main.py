from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.routers import ROUTERS, saude


def create_app() -> FastAPI:
    settings = get_settings()
    if not settings.demo_mode:
        raise RuntimeError("Só existe autenticação DEMO neste protótipo; DEMO_MODE=false não é suportado.")
    app = FastAPI(
        title="UHealth API (DEMO)",
        version="0.1.0",
        description="Protótipo de hackathon. **Dados fictícios e autenticação DEMO sem senha: "
                    "não é seguro para produção.**",
    )
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_methods=["*"], allow_headers=["*"])
    install_error_handlers(app)
    api = APIRouter(prefix="/api/v1")
    for r in ROUTERS:
        api.include_router(r)
    app.include_router(api)
    app.include_router(saude.router)  # atalho GET /saude (contrato §2)
    return app


app = create_app()
