# Importar todos os módulos de modelo aqui para o Alembic/Base enxergá-los.
# Cada frente adiciona UMA linha (ex.: from app.models import cenarios  # noqa).
from app.models import clinicas, solicitacoes, usuarios, vagas  # noqa: F401
from app.modulos.prioridade import models as _prioridade  # noqa: F401
