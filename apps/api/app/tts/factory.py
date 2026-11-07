from functools import lru_cache

from app.config import get_settings
from app.tts.base import NoTTS, TTSProvider


@lru_cache
def get_tts_provider() -> TTSProvider:
    s = get_settings()
    if s.tts_provider == "openai" and s.openai_api_key:
        from app.tts.openai_tts import OpenAITTS

        return OpenAITTS(s.openai_api_key, s.openai_tts_voice, s.tts_cache_dir)
    return NoTTS()
