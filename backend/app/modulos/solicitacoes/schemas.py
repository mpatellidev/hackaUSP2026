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


# ---- respostas (tipadas para o OpenAPI e para o app) -------------------------------------------------

EstadoSolicitacao = Literal["enviada", "em_analise", "precisa_contato", "indisponivel", "aguardando_confirmacao",
                            "agendada", "concluida"]
CustoInformado = Literal["gratuito", "a_confirmar", "pago_informado"]


class ClinicaOut(BaseModel):
    id: str
    nome: str
    cidade: str
    uf: str
    publico: list[PublicoAlvo]
    especialidades: list[str]
    custo_informado: CustoInformado
    recebendo_pedidos: bool
    telefone: str


class ListaClinicas(BaseModel):
    itens: list[ClinicaOut]
    total: int


class SolicitacaoOut(BaseModel):
    id: str
    paciente_id: str
    clinica_id: str
    estado: EstadoSolicitacao
    especialidade: str
    publico_alvo: PublicoAlvo
    descricao_administrativa: str
    solicitacao_origem_id: str | None
    criado_em: str
    atualizado_em: str | None


class ListaSolicitacoes(BaseModel):
    itens: list[SolicitacaoOut]
    total: int


class EventoOut(BaseModel):
    id: str
    solicitacao_id: str
    tipo: Literal["criada", "transicao", "encaminhamento_escolhido", "interesse_registrado", "confirmacao"]
    estado_anterior: EstadoSolicitacao | None
    estado_novo: EstadoSolicitacao | None
    autor_usuario_id: str
    autor_papel: Literal["paciente", "funcionario"]
    motivo: str | None
    criado_em: str


class ListaEventos(BaseModel):
    itens: list[EventoOut]
    total: int


class AlternativaOut(BaseModel):
    clinica: ClinicaOut


class AlternativasOut(BaseModel):
    criterios: list[str]
    itens: list[AlternativaOut]
    aviso: str


class EncaminhadoOut(BaseModel):
    solicitacao: SolicitacaoOut
    campos_compartilhados: list[str]
    aviso: str
