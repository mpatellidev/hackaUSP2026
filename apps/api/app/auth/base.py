"""Contrato de autenticação.

O chat assume que o usuário já chega logado. Hoje usamos um provedor local
(usuários seed + JWT); quando integrar com o sistema real, basta implementar
um `AuthProvider` que valide o token emitido por ele e selecioná-lo via
`AUTH_PROVIDER`.
"""

from typing import Protocol

from sqlalchemy.orm import Session

from app.models import User


class AuthError(Exception):
    pass


class AuthProvider(Protocol):
    def authenticate(self, db: Session, email: str, senha: str) -> str:
        """Valida credenciais e devolve um access token. Lança AuthError."""
        ...

    def get_user_from_token(self, db: Session, token: str) -> User:
        """Resolve o usuário a partir do token. Lança AuthError."""
        ...
