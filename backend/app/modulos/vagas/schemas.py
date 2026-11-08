from typing import Literal

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


# ---- respostas ----------------------------------------------------------------------------------------

EstadoVaga = Literal["aberta", "preenchida", "cancelada"]
EstadoInteresse = Literal["registrado", "confirmado", "nao_selecionado", "retirado"]
EstadoPedido = Literal["enviada", "em_analise", "precisa_contato", "indisponivel", "aguardando_confirmacao",
                       "agendada", "concluida"]


class VagaOut(BaseModel):
    id: str
    clinica_id: str
    especialidade: str
    inicio: str
    fim: str
    estado: EstadoVaga
    profissional_id: str | None
    criado_em: str
    interesses_registrados: int | None = None  # só para funcionário
    interesse: EstadoInteresse | None = None  # só para paciente


class ListaVagas(BaseModel):
    itens: list[VagaOut]
    total: int
    aviso: str


class InteresseRegistradoOut(VagaOut):
    interesse_id: str
    solicitacao_estado: EstadoPedido
    aviso: str


class InteresseOut(BaseModel):
    id: str
    vaga_id: str
    solicitacao_id: str
    paciente_id: str
    estado: EstadoInteresse
    criado_em: str
    paciente_nome_exibicao: str
    pedido_estado: EstadoPedido
    posicao_sugerida: int
    urgencia_avaliada: bool
    score: float
    sinalizacoes: list[str]


class ListaInteresses(BaseModel):
    itens: list[InteresseOut]
    total: int
    aviso: str


EstadoAgendamento = Literal["agendado", "concluido", "cancelado"]
Desfecho = Literal["pendente", "compareceu", "falta_registrada", "cancelado_antecipado", "cancelado_pela_clinica"]


class AgendamentoBase(BaseModel):
    id: str
    vaga_id: str
    solicitacao_id: str
    paciente_id: str
    clinica_id: str
    estado: EstadoAgendamento
    desfecho: Desfecho
    confirmado_por: str
    confirmado_em: str


class ConfirmadoOut(VagaOut):
    interesse_id: str
    interesse_estado: EstadoInteresse
    agendamento: AgendamentoBase
    solicitacao_estado: EstadoPedido
    aviso: str


class HorarioLivreOut(BaseModel):
    vaga_id: str
    especialidade: str
    inicio: str
    fim: str


class HorariosLivresOut(BaseModel):
    clinica_id: str
    itens: list[HorarioLivreOut]
    total: int
    aviso: str
