"""Proteções transversais da API e das páginas web: cabeçalhos HTTP de segurança e limite de tentativas.

- Cabeçalhos: CSP (bloqueia script inline/injetado), anti-iframe (clickjacking), nosniff, Referrer-Policy e HSTS
  quando a conexão é HTTPS. A CSP libera só o que os apps usam: Google Fonts e o widget oficial VLibras.
- Limite: janela deslizante em memória, por processo (suficiente para o protótipo; com várias instâncias,
  troque por um armazenamento compartilhado). Cada app criado tem o seu limitador (testes isolados).
"""
import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, FastAPI, Request

from app.core.auth import Actor, get_actor
from app.core.errors import ApiError

_VLIBRAS = "https://vlibras.gov.br https://*.vlibras.gov.br"
CSP = "; ".join([
    "default-src 'self'",
    # VLibras (Unity WebGL) precisa de eval/wasm e blob:. Script inline continua bloqueado.
    f"script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' blob: {_VLIBRAS}",
    f"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com {_VLIBRAS}",
    f"font-src 'self' data: https://fonts.gstatic.com {_VLIBRAS}",
    f"img-src 'self' data: blob: {_VLIBRAS}",
    f"connect-src 'self' {_VLIBRAS}",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    f"frame-src {_VLIBRAS}",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
])
# A documentação interativa (Swagger/ReDoc) carrega scripts de CDN: fica sem CSP.
_SEM_CSP = ("/docs", "/redoc", "/openapi.json")


def instalar_cabecalhos(app: FastAPI) -> None:
    @app.middleware("http")
    async def _cabecalhos(request: Request, call_next):
        resposta = await call_next(request)
        h = resposta.headers
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        h.setdefault("Permissions-Policy", "camera=(), geolocation=(), microphone=(self)")
        if not request.url.path.startswith(_SEM_CSP):
            h.setdefault("Content-Security-Policy", CSP)
        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
            h.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return resposta


class Limitador:
    def __init__(self) -> None:
        self._eventos: dict[str, deque[float]] = defaultdict(deque)
        self._trava = threading.Lock()

    def _janela(self, chave: str, janela_s: float) -> deque[float]:
        fila, limite = self._eventos[chave], time.monotonic() - janela_s
        while fila and fila[0] <= limite:
            fila.popleft()
        return fila

    def excedido(self, chave: str, maximo: int, janela_s: float) -> bool:
        """Só consulta (não conta). Use com `registrar` para contar apenas falhas."""
        with self._trava:
            return len(self._janela(chave, janela_s)) >= maximo

    def registrar(self, chave: str) -> None:
        with self._trava:
            self._eventos[chave].append(time.monotonic())

    def consumir(self, chave: str, maximo: int, janela_s: float) -> None:
        """Conta uma chamada; acima do limite, 429."""
        with self._trava:
            fila = self._janela(chave, janela_s)
            if len(fila) >= maximo:
                raise muitas_tentativas()
            fila.append(time.monotonic())


def muitas_tentativas() -> ApiError:
    return ApiError(429, "muitas_tentativas", "Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.")


def limitador(request: Request) -> Limitador:
    return request.app.state.limitador


def ip(request: Request) -> str:
    return request.client.host if request.client else "desconhecido"


def limitar_por_usuario(nome: str, maximo: int, janela_s: float):
    """Dependência: no máximo `maximo` chamadas por usuário (token) a cada `janela_s` segundos."""
    def _dep(request: Request, actor: Actor = Depends(get_actor)) -> None:
        limitador(request).consumir(f"{nome}:{actor.usuario_id}", maximo, janela_s)
    return _dep
