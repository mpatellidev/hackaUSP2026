from typing import Protocol


class TTSProvider(Protocol):
    def synthesize(self, text: str) -> str | None:
        """Gera o áudio e devolve a URL pública (relativa à API).

        Retorna None quando não há TTS no servidor — o front usa a voz do navegador.
        """
        ...


class NoTTS:
    def synthesize(self, text: str) -> str | None:
        return None
