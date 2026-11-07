"""Chat acessível (#9). Só para pacientes: o chat age em nome de quem está no token."""
from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.auth import Actor, require_paciente
from app.core.db import get_db
from app.core.errors import ApiError, nao_encontrado
from app.modulos.acessibilidade.adaptacao import build_adaptation, describe_profile
from app.core.config import get_settings
from app.modulos.acessibilidade.models import PerfilChat
from app.modulos.acessibilidade.motores.base import ChatEngine
from app.modulos.acessibilidade.motores.factory import get_chat_engine
from app.modulos.acessibilidade.schemas import ChatIn, ChatOut, PerfilChatIn, PerfilChatOut, TTSIn, TTSOut
from app.modulos.acessibilidade.service import handle_chat
from app.modulos.acessibilidade.tts import NOME_AUDIO, TTSProvider, get_tts_provider

router = APIRouter(prefix="/acessibilidade", tags=["acessibilidade e chat"])


def _perfil_in(p: PerfilChat) -> PerfilChatIn:
    return PerfilChatIn(escolaridade=p.escolaridade, faixa_etaria=p.faixa_etaria,
                        deficiencias=p.deficiencias, prefere_audio=p.prefere_audio)


def _perfil_out(p: PerfilChat) -> PerfilChatOut:
    data = _perfil_in(p)
    return PerfilChatOut(**data.model_dump(), ui_prefs=build_adaptation(data).ui_prefs,
                         resumo=describe_profile(data))


@router.get("/chat/perfil", response_model=PerfilChatOut, summary="Perfil de comunicação do chat")
def get_perfil(actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    p = db.get(PerfilChat, actor.usuario_id)
    if p is None:
        raise nao_encontrado()
    return _perfil_out(p)


@router.put("/chat/perfil", response_model=PerfilChatOut, summary="Salvar perfil de comunicação do chat")
def put_perfil(body: PerfilChatIn, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db)):
    # "nenhuma"/"prefiro_nao_dizer" não fazem sentido junto com outras opções
    defs = list(dict.fromkeys(body.deficiencias))
    if len(defs) > 1:
        defs = [d for d in defs if d not in ("nenhuma", "prefiro_nao_dizer")] or defs[:1]
    p = db.get(PerfilChat, actor.usuario_id) or PerfilChat(usuario_id=actor.usuario_id)
    p.escolaridade, p.faixa_etaria, p.deficiencias, p.prefere_audio = (
        body.escolaridade, body.faixa_etaria, defs, body.prefere_audio)
    db.add(p)
    db.commit()
    return _perfil_out(p)


@router.post("/chat", response_model=ChatOut, summary="Enviar mensagem ao assistente (demo)")
def chat(body: ChatIn, actor: Actor = Depends(require_paciente), db: Session = Depends(get_db),
         engine: ChatEngine = Depends(get_chat_engine), tts: TTSProvider = Depends(get_tts_provider)):
    p = db.get(PerfilChat, actor.usuario_id)
    if p is None:
        raise ApiError(422, "validacao", "Responda às perguntas do perfil antes de conversar.",
                       {"campos": ["perfil"]})
    return handle_chat(db, actor, build_adaptation(_perfil_in(p)), body.message, body.conversation_id,
                       engine, tts)


@router.post("/tts", response_model=TTSOut, summary="Gerar áudio de um texto")
def tts(body: TTSIn, _: Actor = Depends(require_paciente), provider: TTSProvider = Depends(get_tts_provider)):
    """url=None => o front usa a voz do navegador."""
    return TTSOut(url=provider.synthesize(body.text))


@router.get("/audio/{arquivo}", summary="Arquivo de áudio gerado", include_in_schema=False)
def audio(arquivo: str):
    # Sem token: o <audio> do navegador não envia cabeçalho. O nome é um hash imprevisível.
    if not NOME_AUDIO.match(arquivo):
        raise nao_encontrado()
    path = get_settings().tts_cache_dir / arquivo
    if not path.is_file():
        raise nao_encontrado()
    return FileResponse(path, media_type="audio/mpeg")
