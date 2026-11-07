from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Escolaridade = Literal[
    "fundamental_incompleto", "fundamental_completo", "medio_completo",
    "superior_completo", "pos_graduacao", "prefiro_nao_dizer",
]
FaixaEtaria = Literal["ate_17", "18_29", "30_59", "60_mais", "prefiro_nao_dizer"]
Deficiencia = Literal["visual", "auditiva", "motora", "intelectual", "tea", "nenhuma", "prefiro_nao_dizer"]

AVISO_CHAT = ("Assistente de demonstração com dados fictícios. Não diagnostica, não prescreve e não garante vaga. "
              "Em emergência, ligue 192 (SAMU).")


# ---------- Perfil de comunicação do chat ----------
class PerfilChatIn(BaseModel):
    escolaridade: Escolaridade
    faixa_etaria: FaixaEtaria
    deficiencias: list[Deficiencia] = Field(default_factory=list)
    prefere_audio: bool = False


class UiPrefs(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)  # defaults aparecem como obrigatórios no OpenAPI (resposta)
    auto_play_audio: bool = False
    font_scale: float = 1.0
    high_contrast: bool = False
    show_quick_replies: bool = True
    vlibras: bool = False


class PerfilChatOut(PerfilChatIn):
    model_config = ConfigDict(from_attributes=True, json_schema_serialization_defaults_required=True)
    ui_prefs: UiPrefs = Field(default_factory=UiPrefs)
    resumo: str


# ---------- Chat ----------
class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = None


class AudioPayload(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)  # defaults aparecem como obrigatórios no OpenAPI (resposta)
    text: str
    url: str | None = None  # None => o navegador sintetiza a fala


class BotMessage(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)  # defaults aparecem como obrigatórios no OpenAPI (resposta)
    text: str
    audio: AudioPayload | None = None


class QuickReply(BaseModel):
    label: str
    value: str


class ChatOut(BaseModel):
    model_config = ConfigDict(json_schema_serialization_defaults_required=True)  # defaults aparecem como obrigatórios no OpenAPI (resposta)
    modo: Literal["demo"] = "demo"
    fonte: str  # mock | gemini | claude
    aviso: str = AVISO_CHAT
    conversation_id: str
    messages: list[BotMessage]
    quick_replies: list[QuickReply] = Field(default_factory=list)
    ui_prefs: UiPrefs


# ---------- Áudio ----------
class TTSIn(BaseModel):
    text: str = Field(min_length=1, max_length=3000)


class TTSOut(BaseModel):
    url: str | None
