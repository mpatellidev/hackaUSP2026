from sqlalchemy.orm import Session

from app.auth.base import AuthError
from app.models import User


class ExternalAuthProvider:
    """STUB — autenticação delegada ao sistema real de agendamento.

    TODO(integração): validar o token emitido pelo sistema real (ex.: JWKS/introspecção),
    extrair o id/e-mail/nome do usuário e fazer upsert em `User` usando `external_id`.
    O login em si acontece no sistema real, então `authenticate` não é usado.
    """

    def authenticate(self, db: Session, email: str, senha: str) -> str:
        raise AuthError("Login é feito pelo sistema principal.")

    def get_user_from_token(self, db: Session, token: str) -> User:
        raise NotImplementedError("Integração com o sistema real ainda não implementada.")
