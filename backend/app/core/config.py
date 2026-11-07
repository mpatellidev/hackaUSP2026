from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./dev.db"
    demo_mode: bool = True
    session_ttl_hours: int = 8
    cors_origins: str = "http://localhost:8081,http://localhost:1420,http://localhost:5173,http://tauri.localhost,tauri://localhost"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
