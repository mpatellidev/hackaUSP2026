from pydantic import BaseModel


class PreferenciaIn(BaseModel):
    receber: bool
    ligacao: bool = False


class PreferenciaOut(PreferenciaIn):
    aviso: str


class AlertaOut(BaseModel):
    id: str
    vaga_id: str
    clinica_id: str
    clinica_nome: str
    especialidade: str
    inicio: str
    evento_origem: str
    lido: bool
    criado_em: str


class ListaAlertas(BaseModel):
    itens: list[AlertaOut]
    total: int
    nao_lidos: int
    aviso: str
