import hashlib
import logging
from pathlib import Path

import httpx

from app.modulos.acessibilidade.tts import AUDIO_PATH

log = logging.getLogger(__name__)


class OpenAITTS:
    """TTS via API da OpenAI, com cache em disco por hash do texto.

    Em caso de falha devolve None, e o front cai no speechSynthesis do navegador.
    """

    def __init__(self, api_key: str, voice: str, cache_dir: Path, model: str = "gpt-4o-mini-tts") -> None:
        self.api_key = api_key
        self.voice = voice
        self.model = model
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def synthesize(self, text: str) -> str | None:
        key = hashlib.sha256(f"{self.model}|{self.voice}|{text}".encode()).hexdigest()[:32]
        path = self.cache_dir / f"{key}.mp3"
        if not path.exists():
            try:
                resp = httpx.post(
                    "https://api.openai.com/v1/audio/speech",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "voice": self.voice,
                        "input": text,
                        "response_format": "mp3",
                        "instructions": "Fale em português do Brasil, com calma, clareza e tom acolhedor.",
                    },
                    timeout=30,
                )
                resp.raise_for_status()
            except httpx.HTTPError as exc:
                log.warning("Falha no TTS externo, usando fallback do navegador: %s", exc)
                return None
            path.write_bytes(resp.content)
        return f"{AUDIO_PATH}{path.name}"
