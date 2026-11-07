from pydantic import AwareDatetime, BaseModel, Field


class CriarVagaIn(BaseModel):
    especialidade: str = Field(min_length=1, max_length=80)
    inicio: AwareDatetime
    fim: AwareDatetime
    profissional_id: str | None = Field(default=None, max_length=64)  # opcional; da própria clínica e ativo


class InteresseIn(BaseModel):
    solicitacao_id: str = Field(min_length=1, max_length=64)


class ConfirmarIn(BaseModel):
    interesse_id: str = Field(min_length=1, max_length=64)
