"""Contrato de um "motor" de IA.

O chat_service não conhece o provedor: ele entrega o histórico salvo, a mensagem
nova e um executor de ferramentas; o motor roda o loop de ferramentas no formato
do seu provedor e devolve o texto final + as mensagens novas para salvar.
"""

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Protocol

# (nome_da_ferramenta, argumentos) -> (resultado_em_json, is_error)
ToolExecutor = Callable[[str, dict[str, Any]], tuple[str, bool]]

MAX_TOOL_ROUNDS = 8


@dataclass
class StoredMessage:
    """Mensagem no formato nativo do provedor, pronta para salvar/reenviar sem alterações."""

    role: str
    content: Any


@dataclass
class TurnResult:
    texts: list[str] = field(default_factory=list)
    new_messages: list[StoredMessage] = field(default_factory=list)
    refused: bool = False


class LLMNotConfigured(Exception):
    """Chave/credencial do provedor ausente ou inválida."""


class LLMUnavailable(Exception):
    """Provedor fora do ar, limite de uso atingido ou erro inesperado da API."""


class ChatEngine(Protocol):
    provider: str  # gravado na conversa; históricos de provedores diferentes não se misturam

    def run_turn(
        self,
        base_system: str,
        dynamic_system: str,
        history: list[StoredMessage],
        user_text: str,
        execute_tool: ToolExecutor,
    ) -> TurnResult: ...
