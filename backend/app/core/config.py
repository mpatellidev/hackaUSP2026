from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Fixtures fictícias estáveis (contrato em backend/docs); lidas pelos seeds.
FIXTURES_DIR = Path(__file__).resolve().parents[2] / "docs" / "fixtures"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///./dev.db"
    demo_mode: bool = True
    session_ttl_hours: int = 8
    # Origens que podem chamar a API (separadas por vírgula). Para abrir os apps de outro aparelho da rede,
    # acrescente o IP do computador (ex.: http://192.168.0.10:8081). O iniciar.sh faz isso sozinho.
    cors_origins: str = ("http://localhost:8081,http://localhost:1420,http://localhost:5173,"
                         "http://127.0.0.1:8081,http://127.0.0.1:1420,http://127.0.0.1:5173,"
                         "http://tauri.localhost,tauri://localhost")

    # ---- chat acessível (#9): IA e TTS opcionais; chaves SÓ no servidor, nunca no cliente ----
    # mock (padrão, sem rede e sem chave) | gemini | claude
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

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
