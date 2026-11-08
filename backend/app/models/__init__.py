# Importar todos os módulos de modelo aqui para o Alembic/Base enxergá-los (uma linha por módulo com tabela).
from app.models import clinicas, solicitacoes, usuarios, vagas  # noqa: F401
from app.modulos.acessibilidade import models as _acessibilidade  # noqa: F401
from app.modulos.alertas import models as _alertas  # noqa: F401
from app.modulos.avaliacoes import models as _avaliacoes  # noqa: F401
from app.modulos.cenarios import models as _cenarios  # noqa: F401
from app.modulos.indexador import models as _indexador  # noqa: F401
from app.modulos.notificacoes import models as _notificacoes  # noqa: F401
from app.modulos.perfil import models as _perfil  # noqa: F401
from app.modulos.prioridade import models as _prioridade  # noqa: F401
from app.modulos.profissionais import models as _profissionais  # noqa: F401
from app.modulos.prontuario import models as _prontuario  # noqa: F401
from app.modulos.receitas import models as _receitas  # noqa: F401
from app.modulos.resumos import models as _resumos  # noqa: F401
from app.modulos.urgencia import models as _urgencia  # noqa: F401
