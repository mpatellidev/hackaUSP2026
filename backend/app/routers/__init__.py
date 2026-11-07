"""Pontos de montagem. Cada frente cria app/routers/<modulo>.py com `router = APIRouter(...)`
e adiciona UMA linha em ROUTERS (evita conflito de merge no main.py)."""
from app.modulos.prioridade import router as prioridade
from app.modulos.solicitacoes import router as solicitacoes
from app.routers import auth, saude

ROUTERS = [
    saude.router,
    auth.router,
    prioridade.router,
    solicitacoes.router,
]
