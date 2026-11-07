from typing import Literal

from pydantic import BaseModel, Field


PublicoAlvo = Literal["adultos", "criancas", "gestantes", "idosos"]


class CriarSolicitacaoIn(BaseModel):
    clinica_id: str = Field(min_length=1, max_length=64)
    especialidade: str = Field(min_length=1, max_length=80)
    publico_alvo: PublicoAlvo
    descricao_administrativa: str = Field(min_length=3, max_length=280)


class AtualizarEstadoIn(BaseModel):
    estado: Literal["em_analise", "precisa_contato", "indisponivel", "concluida"]
    motivo: str | None = Field(default=None, max_length=280)


class EncaminharIn(BaseModel):
    clinica_destino_id: str = Field(min_length=1, max_length=64)
