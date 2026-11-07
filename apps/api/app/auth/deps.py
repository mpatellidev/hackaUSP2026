from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.base import AuthError, AuthProvider
from app.config import get_settings
from app.db import get_db
from app.models import User

_bearer = HTTPBearer(auto_error=False)


@lru_cache
def get_auth_provider() -> AuthProvider:
    kind = get_settings().auth_provider
    if kind == "local":
        from app.auth.local_provider import LocalAuthProvider

        return LocalAuthProvider()
    if kind == "external":
        from app.auth.external_provider import ExternalAuthProvider

        return ExternalAuthProvider()
    raise ValueError(f"AUTH_PROVIDER desconhecido: {kind}")


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
    provider: AuthProvider = Depends(get_auth_provider),
) -> User:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login para continuar.")
    try:
        return provider.get_user_from_token(db, creds.credentials)
    except AuthError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc
