from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.base import AuthError
from app.config import get_settings
from app.models import User

ALGORITHM = "HS256"

# Usuários de teste (provisório, até integrar com o sistema real)
SEED_USERS = [
    {"email": "maria@exemplo.com", "nome": "Maria", "senha": "senha123"},
    {"email": "joao@exemplo.com", "nome": "João", "senha": "senha123"},
    {"email": "ana@exemplo.com", "nome": "Ana", "senha": "senha123"},
]


def hash_password(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def verify_password(senha: str, password_hash: str) -> bool:
    return bcrypt.checkpw(senha.encode(), password_hash.encode())


class LocalAuthProvider:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _issue_token(self, user: User) -> str:
        exp = datetime.now(timezone.utc) + timedelta(minutes=self.settings.jwt_expires_minutes)
        return jwt.encode({"sub": str(user.id), "exp": exp}, self.settings.jwt_secret, ALGORITHM)

    def authenticate(self, db: Session, email: str, senha: str) -> str:
        user = db.scalar(select(User).where(User.email == email.strip().lower()))
        if not user or not user.password_hash or not verify_password(senha, user.password_hash):
            raise AuthError("E-mail ou senha incorretos.")
        return self._issue_token(user)

    def get_user_from_token(self, db: Session, token: str) -> User:
        try:
            payload = jwt.decode(token, self.settings.jwt_secret, algorithms=[ALGORITHM])
        except jwt.PyJWTError as exc:
            raise AuthError("Sessão inválida ou expirada.") from exc
        user = db.get(User, int(payload["sub"]))
        if not user:
            raise AuthError("Usuário não encontrado.")
        return user


def seed_users(db: Session) -> None:
    for u in SEED_USERS:
        if not db.scalar(select(User).where(User.email == u["email"])):
            db.add(User(email=u["email"], nome=u["nome"], password_hash=hash_password(u["senha"])))
    db.commit()
