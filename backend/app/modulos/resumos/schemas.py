from typing import Literal

from pydantic import BaseModel, Field


class Campo(BaseModel):
    nome: str = Field(min_length=1, max_length=60)
    valor: str = Field(min_length=1, max_length=400)


class CriarResumoIn(BaseModel):
    solicitacao_id: str = Field(min_length=1, max_length=64)
    campos: list[Campo] = Field(min_length=1, max_length=10)


class CompartilharIn(BaseModel):
    clinica_destino_id: str = Field(min_length=1, max_length=64)
    campos_compartilhados: list[str] = Field(min_length=1, max_length=10)
    finalidade: str = Field(min_length=3, max_length=200)
    aceite: Literal["aceito", "recusado"]


class CompartilhamentoOut(BaseModel):
    id: str
    resumo_id: str
    clinica_destino_id: str
    clinica_destino_nome: str
    campos_compartilhados: list[str]
    finalidade: str
    aceite: Literal["aceito", "recusado"]
    aceito_em: str
    revogado_em: str | None
    ativo: bool


class ResumoOut(BaseModel):
    id: str
    paciente_id: str | None
    clinica_autora_id: str
    clinica_autora_nome: str
    campos: list[Campo]
    origem: Literal["proprio", "autor", "compartilhado"]
    criado_em: str
    aviso: str


class ListaResumos(BaseModel):
    itens: list[ResumoOut]
    total: int
    aviso: str


class ListaCompartilhamentos(BaseModel):
    itens: list[CompartilhamentoOut]
    total: int


class EventoAcessoOut(BaseModel):
    id: str
    tipo: Literal["consulta", "criacao", "aceite", "recusa", "revogacao"]
    clinica_id: str | None
    clinica_nome: str | None
    usuario_nome: str
    criado_em: str


class ListaEventosAcesso(BaseModel):
    itens: list[EventoAcessoOut]
    total: int
