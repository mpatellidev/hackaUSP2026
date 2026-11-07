"""Orquestra uma rodada de conversa: histórico -> motor de IA (com ferramentas) -> resposta adaptada."""

import logging

from sqlalchemy.orm import Session

from app.ai.engines.base import ChatEngine, LLMNotConfigured, LLMUnavailable, StoredMessage
from app.ai.prompts import BASE_SYSTEM_PROMPT, dynamic_context
from app.ai.tools import ToolContext, run_tool
from app.clock import now_local
from app.models import Conversation, Message, User
from app.profile.adaptation import Adaptation
from app.scheduling.base import SchedulingProvider
from app.schemas import AudioPayload, BotMessage, ChatResponse
from app.tts.base import TTSProvider

log = logging.getLogger(__name__)

ERRO_GENERICO = (
    "Desculpe, tive um problema para responder agora. "
    "Por favor, tente de novo em alguns instantes."
)
NAO_CONFIGURADO = "O assistente ainda não está configurado. Avise a equipe responsável."
RECUSA = (
    "Desculpe, não consigo ajudar com esse pedido. "
    "Posso ajudar você a marcar, ver, remarcar ou cancelar um atendimento."
)


class ChatUnavailable(Exception):
    pass


def _get_or_create_conversation(
    db: Session, user: User, conversation_id: int | None, provider: str
) -> Conversation:
    if conversation_id is not None:
        conv = db.get(Conversation, conversation_id)
        # Históricos de provedores diferentes têm formatos diferentes: não se misturam.
        if conv and conv.user_id == user.id and conv.provider == provider:
            return conv
    conv = Conversation(user_id=user.id, provider=provider)
    db.add(conv)
    db.flush()
    return conv


def handle_chat(
    db: Session,
    user: User,
    adaptation: Adaptation,
    text: str,
    conversation_id: int | None,
    engine: ChatEngine,
    scheduling: SchedulingProvider,
    tts: TTSProvider,
) -> ChatResponse:
    conv = _get_or_create_conversation(db, user, conversation_id, engine.provider)
    history = [StoredMessage(m.role, m.content) for m in conv.messages]
    ctx = ToolContext(user_id=str(user.id), scheduling=scheduling)

    try:
        turn = engine.run_turn(
            base_system=BASE_SYSTEM_PROMPT,
            dynamic_system=dynamic_context(adaptation.prompt_instructions, user.nome, now_local()),
            history=history,
            user_text=text,
            execute_tool=lambda name, args: run_tool(name, args, ctx),
        )
    except LLMNotConfigured as exc:
        log.error("IA não configurada: %s", exc)
        db.rollback()
        raise ChatUnavailable(NAO_CONFIGURADO) from exc
    except LLMUnavailable as exc:
        log.warning("IA indisponível: %s", exc)
        db.rollback()
        raise ChatUnavailable(ERRO_GENERICO) from exc

    for m in turn.new_messages:
        db.add(Message(conversation_id=conv.id, role=m.role, content=m.content))
    db.commit()

    texts = [RECUSA] if turn.refused else turn.texts
    main_text = "\n\n".join(texts).strip() or ERRO_GENERICO
    messages = [BotMessage(text=main_text)]
    for i, script in enumerate(ctx.audios):
        audio = AudioPayload(text=script, url=tts.synthesize(script))
        if i == 0:
            messages[0].audio = audio
        else:
            messages.append(BotMessage(text=script, audio=audio))

    return ChatResponse(
        conversation_id=conv.id,
        messages=messages,
        quick_replies=ctx.quick_replies,
        ui_prefs=adaptation.ui_prefs,
    )
