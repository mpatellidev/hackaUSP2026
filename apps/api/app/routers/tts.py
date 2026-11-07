from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user
from app.schemas import TTSRequest, TTSResponse
from app.tts.base import TTSProvider
from app.tts.factory import get_tts_provider

router = APIRouter(prefix="/tts", tags=["áudio"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=TTSResponse)
def synthesize(body: TTSRequest, tts: TTSProvider = Depends(get_tts_provider)) -> TTSResponse:
    """Gera áudio para qualquer texto (ex.: botão 'ouvir' em mensagens do onboarding).
    url=None => o front usa a voz do navegador."""
    return TTSResponse(url=tts.synthesize(body.text))
