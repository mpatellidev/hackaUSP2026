from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # gemini (padrão) | claude
    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    gemini_thinking_level: str = "low"
    # usados em ordem se o modelo principal estiver sobrecarregado (429/503)
    gemini_fallback_models: str = "gemini-3.1-flash-lite"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-5-5"
    anthropic_effort: str = "low"
    anthropic_fallbacks: bool = True

    database_url: str = "sqlite:///./chat.db"

    auth_provider: str = "local"
    jwt_secret: str = "dev-secret-change-me-before-production-0123456789"
    jwt_expires_minutes: int = 480

    scheduling_provider: str = "mock"
    scheduling_api_url: str = ""

    tts_provider: str = "none"
    openai_api_key: str = ""
    openai_tts_voice: str = "nova"
    tts_cache_dir: Path = Path("./tts_cache")

    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
