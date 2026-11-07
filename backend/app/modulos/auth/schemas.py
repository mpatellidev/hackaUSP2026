from typing import Literal

from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    conta: str = Field(min_length=1, max_length=80)
    senha: str = Field(min_length=1, max_length=120)


class LoginDemoIn(BaseModel):
    conta: str = Field(min_length=1, max_length=80)


class UsuarioSessao(BaseModel):
    id: str
    papel: Literal["paciente", "funcionario"]
    nome_exibicao: str


class LoginOut(BaseModel):
    modo: Literal["demo"]
    aviso: str
    token: str
    expira_em: str
    usuario: UsuarioSessao


class VinculoOut(BaseModel):
    clinica_id: str
    funcao: Literal["atendimento", "profissional", "coordenacao"]


class UsuarioMe(UsuarioSessao):
    clinica_id: str | None = None
    funcao: Literal["atendimento", "profissional", "coordenacao"] | None = None
    vinculos: list[VinculoOut] | None = None


class MeOut(BaseModel):
    modo: Literal["demo"]
    usuario: UsuarioMe


class ContaDemo(BaseModel):
    conta: str
    nome_exibicao: str
    papel: Literal["paciente", "funcionario"]
    funcao: Literal["atendimento", "profissional", "coordenacao"] | None
    clinica_nome: str | None


class ContasDemo(BaseModel):
    modo: Literal["demo"]
    aviso: str
    senha_demo: str | None
    login_sem_senha: bool
    itens: list[ContaDemo]
