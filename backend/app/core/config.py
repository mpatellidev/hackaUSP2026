from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Fixtures fictícias estáveis (contrato em backend/docs); lidas pelos seeds.
FIXTURES_DIR = Path(__file__).resolve().parents[2] / "docs" / "fixtures"
# Frontend web (apps/paciente e apps/clinica) na pasta irmã de backend/.
FRONTEND_DIR = Path(__file__).resolve().parents[3] / "app"
SENHA_DEMO_PADRAO = "demo1234"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///./dev.db"
    # true: libera o login sem senha (/auth/demo/login), mostra a senha de demo e abre /docs.
    # Padrão FECHADO: localmente o .env (copiado do .env.example pelo iniciar.*) liga o modo demo.
    demo_mode: bool = False
    # Senha única das contas fictícias (hash no seed). Fora do modo demo, a senha padrão abaixo (pública no
    # repositório) NÃO é aceita: defina DEMO_SENHA no ambiente do serviço e rode o seed de novo.
    demo_senha: str = SENHA_DEMO_PADRAO
    session_ttl_hours: int = 8
    # Origens que podem chamar a API de OUTRA origem (separadas por vírgula). Os apps usam a mesma origem
    # (build servido pela API ou proxy do Vite), então só é preciso preencher para clientes externos.
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174"

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
    def senha_insegura(self) -> bool:
        """Fora do modo demo com a senha pública do repositório: o login com senha fica desligado."""
        return not self.demo_mode and self.demo_senha == SENHA_DEMO_PADRAO

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
