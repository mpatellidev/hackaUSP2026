from pydantic import BaseModel, Field


class ComponenteOut(BaseModel):
    nome: str
    valor: float | None
    peso: float
    fonte: str


class ItemFila(BaseModel):
    posicao: int
    solicitacao_id: str
    clinica_id: str
    paciente_nome_exibicao: str
    estado: str
    especialidade: str
    criado_em: str
    urgencia_avaliada: bool
    score: float
    versao_pesos: str
    componentes: list[ComponenteOut]
    sinalizacoes: list[str]


class FilaOut(BaseModel):
    itens: list[ItemFila]
    total: int
    versao_pesos: str
    ordenacao: str
    fontes_demo: bool
    aviso: str


class FaltaIn(BaseModel):
    agendamento_id: str
    justificativa: str = Field(min_length=5, max_length=280)


class RevisaoIn(BaseModel):
    acao: str = Field(pattern="^(reverter|manter)$")
    motivo: str = Field(min_length=5, max_length=280)


class RevisaoOut(BaseModel):
    acao: str
    motivo: str
    revisor_id: str
    estado_anterior: str
    estado_novo: str
    criado_em: str


class FaltaOut(BaseModel):
    id: str
    paciente_id: str
    agendamento_id: str | None
    clinica_id: str | None
    registrada_por: str
    justificativa: str
    estado: str
    revisoes: list[RevisaoOut]
    criado_em: str
