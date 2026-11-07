from typing import Literal

from pydantic import AwareDatetime, BaseModel, Field

Vinculo = Literal["docente", "residente", "estudante_supervisionado"]
EstadoBloco = Literal["disponivel", "reservado", "indisponivel"]


class ProfissionalIn(BaseModel):
    nome_exibicao: str = Field(min_length=2, max_length=80)
    especialidade: str = Field(min_length=1, max_length=80)
    vinculo: Vinculo


class ProfissionalPatch(BaseModel):
    nome_exibicao: str | None = Field(default=None, min_length=2, max_length=80)
    especialidade: str | None = Field(default=None, min_length=1, max_length=80)
    vinculo: Vinculo | None = None
    ativo: bool | None = None


class BlocoIn(BaseModel):
    inicio: AwareDatetime
    fim: AwareDatetime
    estado: EstadoBloco = "disponivel"


class BlocoPatch(BaseModel):
    estado: EstadoBloco


class ProfissionalOut(BaseModel):
    id: str
    clinica_id: str
    nome_exibicao: str
    especialidade: str
    vinculo: Vinculo
    ativo: bool


class BlocoOut(BaseModel):
    id: str
    profissional_id: str
    inicio: str
    fim: str
    estado: EstadoBloco


class ListaProfissionais(BaseModel):
    itens: list[ProfissionalOut]
    total: int
    aviso: str


class ListaBlocos(BaseModel):
    itens: list[BlocoOut]
    total: int


class DisponibilidadeProfissional(ProfissionalOut):
    blocos: list[BlocoOut]
    disponiveis: int


class Disponibilidade(BaseModel):
    clinica_id: str
    data: str
    profissionais: list[DisponibilidadeProfissional]
    aviso: str
