"""Avisar o paciente. O canal "app" (lido no app e no chat) é sempre entregue. E-mail, SMS e WhatsApp ficam
"registrada" enquanto não houver provedor configurado: nada é dito como enviado sem ter sido."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import nao_encontrado
from app.core.time import to_sp_iso, utc_now
from app.models.usuarios import Usuario
from app.modulos.notificacoes.models import Notificacao


class Provedor:
    """Interface de envio externo. Troque por um provedor real (ex.: e-mail SMTP, SMS, WhatsApp) quando houver."""
    configurado = False

    def enviar(self, canal: str, usuario: Usuario, titulo: str, texto: str) -> bool:  # pragma: no cover
        return False


PROVEDOR = Provedor()


def notificar(db: Session, usuario_id: str, titulo: str, texto: str, referencia: str | None = None) -> Notificacao:
    """Cria o aviso no app e registra os canais externos (e-mail sempre; SMS/WhatsApp só com provedor)."""
    aviso = Notificacao(usuario_id=usuario_id, canal="app", titulo=titulo, texto=texto, estado="entregue", referencia=referencia)
    db.add(aviso)
    usuario = db.get(Usuario, usuario_id)
    for canal in ("email", "sms", "whatsapp"):
        enviado = PROVEDOR.configurado and usuario is not None and PROVEDOR.enviar(canal, usuario, titulo, texto)
        db.add(Notificacao(usuario_id=usuario_id, canal=canal, titulo=titulo, texto=texto,
                           estado="entregue" if enviado else "registrada", referencia=referencia))
    db.flush()
    return aviso


def notificacao_json(n: Notificacao) -> dict:
    return {"id": n.id, "titulo": n.titulo, "texto": n.texto, "lida": n.lida_em is not None,
            "referencia": n.referencia, "criado_em": to_sp_iso(n.criado_em)}


def listar(db: Session, usuario_id: str) -> list[dict]:
    q = select(Notificacao).where(Notificacao.usuario_id == usuario_id, Notificacao.canal == "app")
    return [notificacao_json(n) for n in db.scalars(q.order_by(Notificacao.criado_em.desc(), Notificacao.id))]


def marcar_lida(db: Session, usuario_id: str, notificacao_id: str) -> dict:
    n = db.get(Notificacao, notificacao_id)
    if n is None or n.usuario_id != usuario_id or n.canal != "app":
        raise nao_encontrado()
    n.lida_em = n.lida_em or utc_now()
    db.flush()
    return notificacao_json(n)
