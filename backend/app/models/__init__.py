# Importar todos os módulos de modelo aqui para o Alembic/Base enxergá-los (uma linha por módulo com tabela).
from app.models import clinicas, solicitacoes, usuarios, vagas  # noqa: F401
from app.modulos.acessibilidade import models as _acessibilidade  # noqa: F401
from app.modulos.cenarios import models as _cenarios  # noqa: F401
from app.modulos.perfil import models as _perfil  # noqa: F401
from app.modulos.prioridade import models as _prioridade  # noqa: F401
from app.modulos.urgencia import models as _urgencia  # noqa: F401
