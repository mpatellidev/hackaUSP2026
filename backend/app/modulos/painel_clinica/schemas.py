from pydantic import BaseModel, Field

from app.modulos.solicitacoes.schemas import SolicitacaoOut


class PedidoDoPainel(SolicitacaoOut):
    """Pedido como o painel da clínica mostra: o mesmo `SolicitacaoOut` com o nome de exibição do paciente."""
    paciente_nome_exibicao: str


class ListaPedidosDoPainel(BaseModel):
    itens: list[PedidoDoPainel]
    total: int


class AtualizarClinicaIn(BaseModel):
    """Dados de contato e recebimento. Só os campos enviados mudam."""
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    telefone: str | None = Field(default=None, min_length=1, max_length=40)
    endereco: str | None = Field(default=None, max_length=200)
    bairro: str | None = Field(default=None, max_length=80)
    recebendo_pedidos: bool | None = None
