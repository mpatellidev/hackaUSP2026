from functools import lru_cache

from app.modulos.acessibilidade.config import get_chat_settings
from app.modulos.acessibilidade.motores.base import ChatEngine


@lru_cache
def get_chat_engine() -> ChatEngine:
    s = get_chat_settings()
    if s.llm_provider == "mock":
        from app.modulos.acessibilidade.motores.mock import MockEngine

        return MockEngine()
    if s.llm_provider == "gemini":
        from app.modulos.acessibilidade.motores.gemini import GeminiEngine

        fallbacks = [m.strip() for m in s.gemini_fallback_models.split(",") if m.strip()]
        return GeminiEngine(api_key=s.gemini_api_key, model=s.gemini_model, fallback_models=fallbacks,
                            thinking_level=s.gemini_thinking_level or None)
    if s.llm_provider == "claude":
        from app.modulos.acessibilidade.motores.claude import ClaudeEngine

        return ClaudeEngine(api_key=s.anthropic_api_key, model=s.anthropic_model, effort=s.anthropic_effort,
                            fallbacks=s.anthropic_fallbacks)
    raise ValueError(f"LLM_PROVIDER desconhecido: {s.llm_provider} (use mock, gemini ou claude)")
