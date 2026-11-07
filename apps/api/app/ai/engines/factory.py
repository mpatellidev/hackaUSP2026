from functools import lru_cache

from app.ai.engines.base import ChatEngine
from app.config import get_settings


@lru_cache
def get_chat_engine() -> ChatEngine:
    s = get_settings()
    if s.llm_provider == "gemini":
        from app.ai.engines.gemini_engine import GeminiEngine

        fallbacks = [m.strip() for m in s.gemini_fallback_models.split(",") if m.strip()]
        return GeminiEngine(
            api_key=s.gemini_api_key,
            model=s.gemini_model,
            fallback_models=fallbacks,
            thinking_level=s.gemini_thinking_level or None,
        )
    if s.llm_provider == "claude":
        from app.ai.engines.claude_engine import ClaudeEngine

        return ClaudeEngine(
            api_key=s.anthropic_api_key,
            model=s.anthropic_model,
            effort=s.anthropic_effort,
            fallbacks=s.anthropic_fallbacks,
        )
    raise ValueError(f"LLM_PROVIDER desconhecido: {s.llm_provider}")
