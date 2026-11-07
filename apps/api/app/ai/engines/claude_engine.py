"""Motor Claude (SDK oficial anthropic) — alternativa ao Gemini via LLM_PROVIDER=claude."""

import logging
from typing import Any

import anthropic

from app.ai.engines.base import (
    MAX_TOOL_ROUNDS,
    LLMNotConfigured,
    LLMUnavailable,
    StoredMessage,
    ToolExecutor,
    TurnResult,
)
from app.ai.tools import TOOLS

log = logging.getLogger(__name__)

FALLBACK_BETA = "server-side-fallback-2026-07-01"


class ClaudeEngine:
    provider = "claude"

    def __init__(
        self, api_key: str, model: str, effort: str = "low", fallbacks: bool = True, client: Any | None = None
    ) -> None:
        self.model = model
        self.effort = effort
        self.fallbacks = fallbacks
        self._client = client or anthropic.Anthropic(api_key=api_key or None)

    def _create(self, **kwargs: Any) -> Any:
        params: dict[str, Any] = {
            "model": self.model,
            "max_tokens": 16000,
            "output_config": {"effort": self.effort},
            **kwargs,
        }
        if self.fallbacks:
            # Se o modelo recusar por política de segurança, a API reexecuta em outro modelo.
            params["betas"] = [FALLBACK_BETA]
            params["fallbacks"] = "default"
        try:
            return self._client.beta.messages.create(**params)
        except TypeError as exc:
            # O SDK só descobre a falta de credencial na hora da requisição.
            if "authentication" in str(exc):
                raise LLMNotConfigured("Defina ANTHROPIC_API_KEY no .env da API.") from exc
            raise

    def run_turn(
        self,
        base_system: str,
        dynamic_system: str,
        history: list[StoredMessage],
        user_text: str,
        execute_tool: ToolExecutor,
    ) -> TurnResult:
        messages: list[dict] = [{"role": m.role, "content": m.content} for m in history]
        result = TurnResult()

        def add(role: str, content: Any) -> None:
            messages.append({"role": role, "content": content})
            result.new_messages.append(StoredMessage(role, content))

        add("user", user_text)
        system = [
            # Parte estável primeiro (cacheável); perfil e data/hora depois.
            {"type": "text", "text": base_system, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": dynamic_system},
        ]

        try:
            for _ in range(MAX_TOOL_ROUNDS):
                response = self._create(system=system, tools=TOOLS, messages=messages)
                if response.stop_reason == "refusal":
                    result.refused = True
                    break

                # Reenvia os blocos exatamente como vieram (histórico só-anexar).
                add("assistant", [b.model_dump(mode="json", by_alias=True, exclude_none=True) for b in response.content])
                result.texts += [b.text for b in response.content if b.type == "text" and b.text.strip()]

                if response.stop_reason == "pause_turn":
                    continue
                if response.stop_reason != "tool_use":
                    break

                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        content, is_error = execute_tool(block.name, dict(block.input))
                        tool_results.append(
                            {"type": "tool_result", "tool_use_id": block.id, "content": content, "is_error": is_error}
                        )
                add("user", tool_results)  # todos os resultados numa única mensagem
            else:
                log.warning("Limite de rodadas de ferramentas atingido")
        except (anthropic.APIConnectionError, anthropic.RateLimitError, anthropic.InternalServerError) as exc:
            raise LLMUnavailable(str(exc)) from exc
        except anthropic.AuthenticationError as exc:
            raise LLMNotConfigured(str(exc)) from exc
        except anthropic.APIStatusError as exc:
            raise LLMUnavailable(str(exc)) from exc

        return result
