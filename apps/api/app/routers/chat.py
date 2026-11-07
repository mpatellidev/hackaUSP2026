from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai.chat_service import ChatUnavailable, handle_chat
from app.ai.engines.base import ChatEngine
from app.ai.engines.factory import get_chat_engine
from app.auth.deps import get_current_user
from app.db import get_db
from app.models import User
from app.profile.adaptation import build_adaptation
from app.scheduling.base import SchedulingProvider
from app.scheduling.factory import get_scheduling_provider
from app.schemas import ChatRequest, ChatResponse, ProfileIn
from app.tts.base import TTSProvider
from app.tts.factory import get_tts_provider

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    engine: ChatEngine = Depends(get_chat_engine),
    scheduling: SchedulingProvider = Depends(get_scheduling_provider),
    tts: TTSProvider = Depends(get_tts_provider),
) -> ChatResponse:
    if not user.profile:
        raise HTTPException(status.HTTP_409_CONFLICT, "Preencha o perfil antes de conversar.")
    adaptation = build_adaptation(ProfileIn.model_validate(user.profile, from_attributes=True))
    try:
        return handle_chat(db, user, adaptation, body.message, body.conversation_id, engine, scheduling, tts)
    except ChatUnavailable as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
