"""Pontos de montagem. Cada frente cria app/routers/<modulo>.py com `router = APIRouter(...)`
e adiciona UMA linha em ROUTERS (evita conflito de merge no main.py)."""
from app.routers import auth, saude

ROUTERS = [
    saude.router,
    auth.router,
]
