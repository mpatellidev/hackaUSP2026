"""Criptografia em repouso de dados sensíveis (LGPD): CPF e conteúdo do prontuário.

- `cifrar`/`decifrar`: Fernet (AES-128-CBC + HMAC-SHA256), chave em CHAVE_CRIPTOGRAFIA no .env.
- `hash_cpf`: HMAC-SHA256 do CPF com a mesma chave, para buscar e garantir CPF único sem guardar o CPF aberto.

Sem CHAVE_CRIPTOGRAFIA: no modo de desenvolvimento usa uma chave derivada fixa (só para rodar localmente);
fora dele, recusa iniciar (nunca guardar dado de saúde com chave conhecida).
"""
import base64
import hashlib
import hmac
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings
from app.core.cpf import so_digitos

_CHAVE_DEV = "uhealth-chave-somente-desenvolvimento"


class ChaveAusente(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _material() -> bytes:
    cfg = get_settings()
    chave = cfg.chave_criptografia.strip()
    if not chave:
        if not cfg.demo_mode:
            raise ChaveAusente("Defina CHAVE_CRIPTOGRAFIA no ambiente do servidor (dados de saúde são sensíveis).")
        chave = _CHAVE_DEV
    return hashlib.sha256(chave.encode()).digest()


def _fernet() -> Fernet:
    return Fernet(base64.urlsafe_b64encode(_material()))


def cifrar(texto: str) -> str:
    return _fernet().encrypt(texto.encode()).decode()


def decifrar(cifrado: str) -> str:
    try:
        return _fernet().decrypt(cifrado.encode()).decode()
    except InvalidToken as e:
        raise ValueError("Não foi possível decifrar (chave diferente da usada para cifrar).") from e


def hash_cpf(cpf: str) -> str:
    return hmac.new(_material(), so_digitos(cpf).encode(), hashlib.sha256).hexdigest()
