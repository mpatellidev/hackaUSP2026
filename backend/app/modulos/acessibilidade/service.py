"""Orquestra uma rodada de conversa: histórico -> motor de IA (com ferramentas) -> resposta adaptada."""
import logging

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import ApiError
from app.modulos.acessibilidade.adaptacao import Adaptation
from app.modulos.acessibilidade.ferramentas import ToolContext, run_tool
from app.modulos.acessibilidade.formatos import agora_sp
from app.modulos.acessibilidade.models import ConversaChat, MensagemChat
from app.modulos.acessibilidade.motores.base import ChatEngine, LLMNotConfigured, LLMUnavailable, StoredMessage
from app.modulos.acessibilidade.prompts import BASE_SYSTEM_PROMPT, dynamic_context
from app.modulos.acessibilidade.schemas import AudioPayload, BotMessage, ChatOut
from app.modulos.acessibilidade.tts import TTSProvider

log = logging.getLogger(__name__)

ERRO_GENERICO = "Desculpe, tive um problema para responder agora. Por favor, tente de novo em alguns instantes."
NAO_CONFIGURADO = "O assistente ainda não está configurado. Avise a equipe responsável."
RECUSA = ("Desculpe, não consigo ajudar com esse pedido. Posso ajudar você a encontrar clínicas, "
          "enviar um pedido e acompanhar seus pedidos.")


def _conversa(db: Session, actor: Actor, conversation_id: str | None, provedor: str) -> ConversaChat:
    if conversation_id:
        conv = db.get(ConversaChat, conversation_id)
        # De outra pessoa ou de outro provedor (formato diferente): começa uma nova.
        if conv and conv.usuario_id == actor.usuario_id and conv.provedor == provedor:
            return conv
    conv = ConversaChat(usuario_id=actor.usuario_id, provedor=provedor)
    db.add(conv)
    db.flush()
    return conv


def handle_chat(db: Session, actor: Actor, adaptation: Adaptation, text: str, conversation_id: str | None,
                engine: ChatEngine, tts: TTSProvider) -> ChatOut:
    conv = _conversa(db, actor, conversation_id, engine.provider)
    linhas = list(db.scalars(select(MensagemChat).where(MensagemChat.conversa_id == conv.id)
                             .order_by(MensagemChat.ordem)))
    history = [StoredMessage(m.papel, m.conteudo) for m in linhas]
    ctx = ToolContext(db=db, actor=actor, mensagem_usuario=text)

    try:
        turn = engine.run_turn(
            base_system=BASE_SYSTEM_PROMPT,
            dynamic_system=dynamic_context(adaptation.prompt_instructions, actor.nome_exibicao, agora_sp()),
            history=history,
            user_text=text,
            execute_tool=lambda name, args: run_tool(name, args, ctx),
        )
    except LLMNotConfigured as exc:
        log.error("IA não configurada: %s", exc)
        db.rollback()
        raise ApiError(503, "servico_indisponivel", NAO_CONFIGURADO) from exc
    except LLMUnavailable as exc:
        log.warning("IA indisponível: %s", exc)
        db.rollback()
        raise ApiError(503, "servico_indisponivel", ERRO_GENERICO) from exc

    ordem = (db.scalar(select(func.max(MensagemChat.ordem)).where(MensagemChat.conversa_id == conv.id)) or 0)
    for i, m in enumerate(turn.new_messages, 1):
        db.add(MensagemChat(conversa_id=conv.id, ordem=ordem + i, papel=m.role, conteudo=m.content))
    db.commit()  # também grava um pedido enviado pela ferramenta, na mesma transação

    texts = [RECUSA] if turn.refused else turn.texts
    messages = [BotMessage(text="\n\n".join(texts).strip() or ERRO_GENERICO)]
    for i, script in enumerate(ctx.audios):
        audio = AudioPayload(text=script, url=tts.synthesize(script))
        if i == 0:
            messages[0].audio = audio
        else:
            messages.append(BotMessage(text=script, audio=audio))

    return ChatOut(fonte=engine.provider, conversation_id=conv.id, messages=messages,
                   quick_replies=ctx.quick_replies, ui_prefs=adaptation.ui_prefs)
