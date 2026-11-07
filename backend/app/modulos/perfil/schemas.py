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


class PerfilIn(BaseModel):
    """Só o que a pessoa escolhe. `usuario_id` vem do token. Sem documento, endereço ou dado clínico."""
    model_config = ConfigDict(extra="ignore")
    cidade: str | None = Field(default=None, max_length=80)
    uf: str | None = Field(default=None, min_length=2, max_length=2)
    contato_preferido: Literal["app", "telefone"] | None = None
    socioeconomico: SocioeconomicoIn = Field(default_factory=SocioeconomicoIn)
    acessibilidade: AcessibilidadeIn = Field(default_factory=AcessibilidadeIn)


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
