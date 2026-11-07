"""Configuração do chat (#9). Lê o mesmo .env do backend, sem mexer em app/core/config.py (#2).
Chaves de IA/TTS ficam SÓ no servidor; o padrão é `mock`, que funciona sem rede e sem chave."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class ChatSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # mock (padrão, sem rede) | gemini | claude
    llm_provider: str = "mock"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    gemini_thinking_level: str = "low"
    gemini_fallback_models: str = "gemini-3.1-flash-lite"  # usados em ordem se o principal estiver sobrecarregado

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-5-5"
    anthropic_effort: str = "low"
    anthropic_fallbacks: bool = True

    # none = o navegador fala (speechSynthesis) | openai = MP3 gerado no servidor
    tts_provider: str = "none"
    openai_api_key: str = ""
    openai_tts_voice: str = "nova"
    tts_cache_dir: Path = Path("./tts_cache")


@lru_cache
def get_chat_settings() -> ChatSettings:
    return ChatSettings()
