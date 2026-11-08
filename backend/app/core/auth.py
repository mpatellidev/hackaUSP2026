"""Autenticação DEMO (contrato §3). NÃO é segura e NÃO pode ir para produção: contas fictícias com UMA senha de
demo (ou, com DEMO_MODE, sem senha). Papel e clínica vêm SEMPRE do banco,
a partir do token; qualquer papel/clinica_id/paciente_id enviado pelo cliente é ignorado."""
import hashlib
import hmac
import secrets
from functools import lru_cache
from dataclasses import dataclass, field
from datetime import datetime, timezone

from fastapi import Depends, Header
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db
from app.core.errors import acesso_negado, nao_autenticado
from app.core.time import hours, utc_now
from app.models.usuarios import SessaoDemo, Usuario, VinculoClinica

AVISO_DEMO = "Autenticação DEMO: conta fictícia com senha de demonstração. Não usar em produção."


@dataclass(frozen=True)
class Actor:
    usuario_id: str
    papel: str
    nome_exibicao: str
    vinculos: dict[str, str] = field(default_factory=dict)  # clinica_id -> funcao

    @property
    def clinica_principal(self) -> str | None:
        """Clínica usada ao CRIAR algo (vaga, cenário). O protótipo tem um vínculo por conta; a ordem é estável."""
        return sorted(self.vinculos)[0] if self.vinculos else None

    @property
    def clinica_ids(self) -> set[str]:
        return set(self.vinculos)

    def clinica_da_funcao(self, *funcoes: str) -> str | None:
        """Primeira clínica (ordem estável) em que o funcionário tem uma das funções."""
        return next((c for c in sorted(self.vinculos) if self.vinculos[c] in funcoes), None)

    def pode_na_clinica(self, clinica_id: str) -> bool:
        return clinica_id in self.vinculos

    def tem_funcao(self, clinica_id: str, *funcoes: str) -> bool:
        return self.vinculos.get(clinica_id) in funcoes


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


_ITERACOES = 120_000


def hash_senha(senha: str, sal: str | None = None) -> str:
    sal = sal or secrets.token_hex(8)
    h = hashlib.pbkdf2_hmac("sha256", senha.encode(), sal.encode(), _ITERACOES).hex()
    return f"pbkdf2${_ITERACOES}${sal}${h}"


@lru_cache(maxsize=4)
def hash_senha_demo(senha: str) -> str:
    """Todas as contas fictícias compartilham a senha de demo; o hash é calculado uma vez por processo."""
    return hash_senha(senha, sal="uhealth-demo")


def senha_confere(senha: str, guardado: str | None) -> bool:
    if not guardado:
        return False
    try:
        _, iteracoes, sal, esperado = guardado.split("$")
    except ValueError:
        return False
    calculado = hashlib.pbkdf2_hmac("sha256", senha.encode(), sal.encode(), int(iteracoes)).hex()
    return hmac.compare_digest(calculado, esperado)


def criar_sessao(db: Session, usuario: Usuario) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    agora = utc_now()
    expira = agora + hours(get_settings().session_ttl_hours)
    db.execute(delete(SessaoDemo).where(SessaoDemo.expira_em <= agora))  # limpa sessões vencidas
    db.add(SessaoDemo(token_hash=_hash(token), usuario_id=usuario.id, expira_em=expira, criado_em=agora))
    db.commit()
    return token, expira


def encerrar_sessao(db: Session, token: str) -> None:
    sessao = db.get(SessaoDemo, _hash(token))
    if sessao:
        db.delete(sessao)
        db.commit()


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise nao_autenticado()
    return authorization[7:].strip()


def token_atual(authorization: str | None = Header(default=None)) -> str:
    return _bearer(authorization)


def get_actor(token: str = Depends(token_atual), db: Session = Depends(get_db)) -> Actor:
    sessao = db.get(SessaoDemo, _hash(token))
    if sessao is None:
        raise nao_autenticado()
    expira = sessao.expira_em if sessao.expira_em.tzinfo else sessao.expira_em.replace(tzinfo=timezone.utc)
    if expira <= utc_now():
        raise nao_autenticado()
    usuario = db.get(Usuario, sessao.usuario_id)
    if usuario is None or not usuario.ativo:
        raise nao_autenticado()
    vinculos = {
        v.clinica_id: v.funcao
        for v in db.scalars(select(VinculoClinica).where(VinculoClinica.usuario_id == usuario.id))
    }
    return Actor(usuario.id, usuario.papel, usuario.nome_exibicao, vinculos)


def require_paciente(actor: Actor = Depends(get_actor)) -> Actor:
    if actor.papel != "paciente":
        raise acesso_negado()
    return actor


def require_funcionario(actor: Actor = Depends(get_actor)) -> Actor:
    if actor.papel != "funcionario" or not actor.vinculos:
        raise acesso_negado()
    return actor

