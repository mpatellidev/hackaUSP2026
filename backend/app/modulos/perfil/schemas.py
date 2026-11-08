from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

FaixaRenda = Literal["ate_1_salario_minimo", "1_a_2_salarios_minimos", "2_a_3_salarios_minimos",
                     "acima_de_3_salarios_minimos"]
FINALIDADE_RENDA = "Apoiar a fila explicável (#13). Opcional."


class SocioeconomicoIn(BaseModel):
    """`{"informado": false, "prefiro_nao_informar": true}` é válido e não impede solicitação."""
    model_config = ConfigDict(extra="ignore")
    informado: bool = False
    faixa_renda_familiar: FaixaRenda | None = None
    prefiro_nao_informar: bool = False

    @model_validator(mode="after")
    def _coerente(self):
        if self.informado and self.faixa_renda_familiar is None:
            raise ValueError("faixa_renda_familiar é obrigatória quando informado = true")
        if not self.informado:
            self.faixa_renda_familiar = None
        else:
            self.prefiro_nao_informar = False
        return self


class AcessibilidadeIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    texto: Literal["normal", "grande", "extra_grande"] = "normal"
    linguagem: Literal["simples", "detalhada"] = "simples"
    audio: bool = False
    tema: Literal["sistema", "claro", "escuro", "alto_contraste"] = "sistema"


Transporte = Literal["a_pe", "onibus", "metro", "trem", "carro"]
Turno = Literal["manha", "tarde", "noite"]
Preferencia = Literal["publica", "privada", "tanto_faz"]
Modo = Literal["conversa", "telas"]


class PerfilIn(BaseModel):
    """Só o que a pessoa escolhe. `usuario_id` vem do token. Sem dado clínico."""
    model_config = ConfigDict(extra="ignore")
    cidade: str | None = Field(default=None, max_length=80)
    uf: str | None = Field(default=None, min_length=2, max_length=2)
    contato_preferido: Literal["app", "telefone"] | None = None
    socioeconomico: SocioeconomicoIn = Field(default_factory=SocioeconomicoIn)
    acessibilidade: AcessibilidadeIn = Field(default_factory=AcessibilidadeIn)
    # Endereço/território (sugere a universidade mais próxima). Sem lat/lng, o CEP vira o centro da região.
    cep: str | None = Field(default=None, max_length=9)
    logradouro: str | None = Field(default=None, max_length=120)
    numero: str | None = Field(default=None, max_length=12)
    bairro: str | None = Field(default=None, max_length=80)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    # Preferências de atendimento
    preferencia_instituicao: Preferencia | None = None
    distancia_max_km: float | None = Field(default=None, gt=0, le=200)
    transportes: list[Transporte] = Field(default_factory=list)
    turnos: list[Turno] = Field(default_factory=list)
    precisa_acessibilidade: bool = False
    # Dados sensíveis (LGPD): renda e deficiência só valem com consentimento explícito
    possui_deficiencia: bool | None = None
    tipo_deficiencia: Literal["visual", "auditiva", "motora", "intelectual", "tea", "outra"] | None = None
    consentimento_dados_sensiveis: bool = False


class ModoIn(BaseModel):
    modo: Modo


class SocioeconomicoOut(BaseModel):
    informado: bool = False
    faixa_renda_familiar: FaixaRenda | None = None
    prefiro_nao_informar: bool = False
    finalidade: str | None = None


class AcessibilidadeOut(BaseModel):
    texto: Literal["normal", "grande", "extra_grande"]
    linguagem: Literal["simples", "detalhada"]
    audio: bool
    tema: Literal["sistema", "claro", "escuro", "alto_contraste"]


class PerfilOut(BaseModel):
    usuario_id: str
    cidade: str | None
    uf: str | None
    contato_preferido: Literal["app", "telefone"] | None
    socioeconomico: SocioeconomicoOut
    acessibilidade: AcessibilidadeOut
    atualizado_em: str | None
    salvo: bool
    modo: Literal["demo"]
    aviso: str
    cep: str | None = None
    logradouro: str | None = None
    numero: str | None = None
    bairro: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    preferencia_instituicao: Preferencia | None = None
    distancia_max_km: float | None = None
    transportes: list[Transporte] = []
    turnos: list[Turno] = []
    precisa_acessibilidade: bool = False
    modo_atendimento: Modo | None = None
    cadastro_completo: bool = False  # endereço (CEP) e preferências preenchidos
    possui_deficiencia: bool | None = None
    tipo_deficiencia: str | None = None
    consentimento_dados_sensiveis: bool = False
