"""Áudio (TTS). Padrão: nenhum no servidor — o navegador fala o texto (speechSynthesis)."""
import re
from functools import lru_cache
from typing import Protocol

from app.core.config import get_settings

AUDIO_PATH = "/api/v1/acessibilidade/audio/"
NOME_AUDIO = re.compile(r"^[0-9a-f]{32}\.mp3$")


class TTSProvider(Protocol):
    def synthesize(self, text: str) -> str | None:
        """Gera o áudio e devolve o caminho público (a partir da raiz do servidor).
        None => o front usa a voz do navegador."""
        ...


class NoTTS:
    def synthesize(self, text: str) -> str | None:
        return None


@lru_cache
def get_tts_provider() -> TTSProvider:
    s = get_settings()
    if s.tts_provider == "openai" and s.openai_api_key:
        from app.modulos.acessibilidade.tts_openai import OpenAITTS

        return OpenAITTS(s.openai_api_key, s.openai_tts_voice, s.tts_cache_dir)
    return NoTTS()
