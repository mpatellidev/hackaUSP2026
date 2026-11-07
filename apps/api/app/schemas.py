from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Escolaridade = Literal[
    "fundamental_incompleto",
    "fundamental_completo",
    "medio_completo",
    "superior_completo",
    "pos_graduacao",
    "prefiro_nao_dizer",
]
FaixaEtaria = Literal["ate_17", "18_29", "30_59", "60_mais", "prefiro_nao_dizer"]
Deficiencia = Literal[
    "visual", "auditiva", "motora", "intelectual", "tea", "nenhuma", "prefiro_nao_dizer"
]


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: str
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    nome: str


# ---------- Perfil ----------
class ProfileIn(BaseModel):
    escolaridade: Escolaridade
    faixa_etaria: FaixaEtaria
    deficiencias: list[Deficiencia] = Field(default_factory=list)
    prefere_audio: bool = False


class UiPrefs(BaseModel):
    auto_play_audio: bool = False
    font_scale: float = 1.0
    high_contrast: bool = False
    show_quick_replies: bool = True
    vlibras: bool = False


class ProfileOut(ProfileIn):
    model_config = ConfigDict(from_attributes=True)
    ui_prefs: UiPrefs = Field(default_factory=UiPrefs)


# ---------- Chat ----------
class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: int | None = None


class AudioPayload(BaseModel):
    text: str
    url: str | None = None  # None => o navegador sintetiza a fala


class BotMessage(BaseModel):
    text: str
    audio: AudioPayload | None = None


class QuickReply(BaseModel):
    label: str
    value: str


class ChatResponse(BaseModel):
    conversation_id: int
    messages: list[BotMessage]
    quick_replies: list[QuickReply] = Field(default_factory=list)
    ui_prefs: UiPrefs


# ---------- TTS ----------
class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=3000)


class TTSResponse(BaseModel):
    url: str | None
