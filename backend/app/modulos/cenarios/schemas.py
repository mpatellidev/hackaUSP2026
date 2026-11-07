from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .models import ESPECIALIDADES, PUBLICOS

Estado = Literal["ativo", "pausado"]
AVISO = (
    "Cenário acadêmico é um convite para atividade supervisionada com estudantes. "
    "Demonstrar interesse não é confirmação, avaliação profissional nem agendamento, "
    "e não garante vaga, atendimento, custo ou prazo. Dados fictícios (demo)."
)


def _validar_requisitos(v: list[str]) -> list[str]:
    limpo = [r.strip() for r in v if r and r.strip()]
    if len(limpo) > 10 or any(len(r) > 200 for r in limpo):
        raise ValueError("até 10 requisitos de até 200 caracteres")
    return limpo


class CenarioCriar(BaseModel):
    model_config = ConfigDict(extra="ignore")  # clinica_id/papel do corpo são ignorados (§3)
    titulo: str = Field(min_length=3, max_length=120)
    descricao_leiga: str = Field(min_length=10, max_length=600)
    requisitos: list[str] = Field(default_factory=list)
    publico: Optional[str] = None
    cidade: str = Field(min_length=2, max_length=80)
    uf: str = Field(min_length=2, max_length=2)
    especialidade: str
    estado: Estado = "ativo"

    @field_validator("requisitos")
    @classmethod
    def _req(cls, v):
        return _validar_requisitos(v)

    @field_validator("publico")
    @classmethod
    def _publico(cls, v):
        if v is not None and v not in PUBLICOS:
            raise ValueError("publico desconhecido")
        return v

    @field_validator("especialidade")
    @classmethod
    def _esp(cls, v):
        if v not in ESPECIALIDADES:
            raise ValueError("especialidade desconhecida")
        return v

    @field_validator("uf")
    @classmethod
    def _uf(cls, v):
        return v.upper()


class CenarioAtualizar(BaseModel):
    model_config = ConfigDict(extra="ignore")
    titulo: Optional[str] = Field(default=None, min_length=3, max_length=120)
    descricao_leiga: Optional[str] = Field(default=None, min_length=10, max_length=600)
    requisitos: Optional[list[str]] = None
    publico: Optional[str] = None
    cidade: Optional[str] = Field(default=None, min_length=2, max_length=80)
    uf: Optional[str] = Field(default=None, min_length=2, max_length=2)
    especialidade: Optional[str] = None
    estado: Optional[Estado] = None

    @field_validator("requisitos")
    @classmethod
    def _req(cls, v):
        return v if v is None else _validar_requisitos(v)

    @field_validator("publico")
    @classmethod
    def _publico(cls, v):
        if v is not None and v not in PUBLICOS:
            raise ValueError("publico desconhecido")
        return v

    @field_validator("especialidade")
    @classmethod
    def _esp(cls, v):
        if v is not None and v not in ESPECIALIDADES:
            raise ValueError("especialidade desconhecida")
        return v

    @field_validator("uf")
    @classmethod
    def _uf(cls, v):
        return v.upper() if v else v


class CenarioSaida(BaseModel):
    id: str
    clinica_id: str
    titulo: str
    descricao_leiga: str
    requisitos: list[str]
    publico: Optional[str]
    cidade: str
    uf: str
    especialidade: str
    estado: Estado
    publicado_em: datetime
    meu_interesse: Optional[Literal["registrado", "retirado"]] = None  # só para paciente


class ListaCenarios(BaseModel):
    itens: list[CenarioSaida]
    total: int
    aviso: str = AVISO
    mensagem_vazia: Optional[str] = None


class InteresseSaida(BaseModel):
    id: str
    cenario_id: str
    paciente_id: str
    estado: Literal["registrado", "retirado"]
    criado_em: datetime
    aviso: str = "Interesse registrado não é confirmação nem agendamento."


class ListaInteresses(BaseModel):
    itens: list[InteresseSaida]
    total: int


class CompatibilidadeAcademica(BaseModel):
    """Sinal de entrada para o score (#13). Não é prioridade clínica."""
    correspondente: bool
    cenario_id: Optional[str] = None
