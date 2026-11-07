"""Modelos de domínio (em memória). Tabelas reais ficam com a #2 (migração prefixada cenarios_)."""
from dataclasses import dataclass, field
from datetime import datetime

PUBLICOS = ("adultos", "criancas", "gestantes", "idosos")
ESPECIALIDADES = (
    "clinica_geral", "pediatria", "ginecologia_obstetricia", "cardiologia", "dermatologia",
    "ortopedia", "oftalmologia", "saude_mental", "odontologia", "fisioterapia", "nutricao",
)


@dataclass
class Cenario:
    id: str
    clinica_id: str
    titulo: str
    descricao_leiga: str
    requisitos: list[str]
    publico: str | None
    cidade: str
    uf: str
    especialidade: str
    estado: str  # ativo | pausado
    publicado_em: datetime  # UTC


@dataclass
class InteresseCenario:
    id: str
    cenario_id: str
    paciente_id: str
    estado: str  # registrado | retirado
    criado_em: datetime  # UTC
    atualizado_em: datetime = field(default=None)  # type: ignore[assignment]
