from pydantic import BaseModel, Field


class AvaliarIn(BaseModel):
    solicitacao_id: str = Field(min_length=1, max_length=64)
    nota: int = Field(ge=1, le=5)
    comentario: str | None = Field(default=None, max_length=280)


class AvaliacaoOut(BaseModel):
    id: str
    clinica_id: str
    solicitacao_id: str
    nota: int
    comentario: str | None
    criado_em: str


class ListaMinhasAvaliacoes(BaseModel):
    itens: list[AvaliacaoOut]
    total: int


class AvaliacaoPublica(BaseModel):
    nota: int
    comentario: str | None
    criado_em: str


class AvaliacoesDaClinica(BaseModel):
    clinica_id: str
    media: float | None
    quantidade: int
    itens: list[AvaliacaoPublica]
    aviso: str
