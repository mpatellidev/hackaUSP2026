"""REGISTRO ÚNICO dos módulos da API. Para acrescentar um módulo:

1. crie `app/modulos/<modulo>/` com `router.py` (exporta `router: APIRouter`), `schemas.py`, `service.py`,
   `models.py` (se tiver tabela) e `tests/`;
2. adicione UMA linha em `ROUTERS` abaixo e, se tiver tabela, UMA linha em `app/models/__init__.py`
   (mais uma migração `NNNN_<modulo>_<descricao>` em `alembic/versions/`);
3. se tiver dados fictícios, exponha `seed.run(db)` e chame-o em `app/seed.py`.

Autenticação (`Actor`), erros (`ApiError`), configuração e banco vêm SEMPRE de `app/core/`; os handlers de erro
são instalados num lugar só (`app.core.errors.install_error_handlers`).
"""
from fastapi import APIRouter

from app.modulos.acessibilidade import router as acessibilidade
from app.modulos.agendamentos import router as agendamentos
from app.modulos.alertas import router as alertas
from app.modulos.avaliacoes import router as avaliacoes
from app.modulos.auth import router as auth
from app.modulos.cenarios import router as cenarios
from app.modulos.perfil import router as perfil
from app.modulos.prioridade import router as prioridade
from app.modulos.profissionais import router as profissionais
from app.modulos.resumos import router as resumos
from app.modulos.saude import router as saude
from app.modulos.solicitacoes import router as solicitacoes
from app.modulos.urgencia import router as urgencia
from app.modulos.vagas import router as vagas

ROUTERS: list[APIRouter] = [
    saude.router,
    auth.router,
    solicitacoes.router,
    vagas.router,
    agendamentos.router,
    prioridade.router,
    urgencia.router,
    cenarios.router,
    perfil.router,
    profissionais.router,
    avaliacoes.router,
    alertas.router,
    resumos.router,
    acessibilidade.router,
]
