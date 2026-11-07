"""Motor Google Gemini (SDK oficial google-genai) com chamada de funções."""

import json
import logging
import time
from typing import Any

from google import genai
from google.genai import errors, types

from app.modulos.acessibilidade.motores.base import (
    MAX_TOOL_ROUNDS,
    LLMNotConfigured,
    LLMUnavailable,
    StoredMessage,
    ToolExecutor,
    TurnResult,
)
from app.modulos.acessibilidade.ferramentas import TOOLS

log = logging.getLogger(__name__)

BLOCKED_FINISH_REASONS = {"SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"}


def _declarations() -> list[types.FunctionDeclaration]:
    return [
        types.FunctionDeclaration(
            name=t["name"], description=t["description"], parameters_json_schema=t["input_schema"]
        )
        for t in TOOLS
    ]


def _dump(content: types.Content) -> StoredMessage:
    # mode="json" codifica thought_signature (bytes) em base64 — necessário reenviar intacto.
    return StoredMessage(role=content.role or "model", content=content.model_dump(mode="json", exclude_none=True))


class GeminiEngine:
    provider = "gemini"

    def __init__(
        self,
        api_key: str,
        model: str,
        fallback_models: list[str] | None = None,
        client: Any | None = None,
        retry_delay: float = 1.5,
        thinking_level: str | None = None,
    ) -> None:
        self.model = model
        self.thinking_level = thinking_level
        self.fallback_models = fallback_models or []
        self.retry_delay = retry_delay
        self._client = client or (genai.Client(api_key=api_key) if api_key else None)
        self._tools = [types.Tool(function_declarations=_declarations())]

    def _generate(self, contents: list[types.Content], config: types.GenerateContentConfig) -> Any:
        """Chama o modelo principal; se estiver sobrecarregado (429/5xx), tenta de novo
        e depois passa para os modelos reserva (GEMINI_FALLBACK_MODELS)."""
        last_exc: errors.APIError | None = None
        for model in [self.model, *self.fallback_models]:
            for attempt in range(2):
                try:
                    return self._client.models.generate_content(model=model, contents=contents, config=config)
                except errors.APIError as exc:
                    if not (exc.code == 429 or (exc.code or 0) >= 500):
                        raise
                    last_exc = exc
                    log.warning("Gemini %s indisponível (%s), tentativa %d", model, exc.code, attempt + 1)
                    if attempt == 0:
                        time.sleep(self.retry_delay)
        assert last_exc is not None
        raise last_exc

    def run_turn(
        self,
        base_system: str,
        dynamic_system: str,
        history: list[StoredMessage],
        user_text: str,
        execute_tool: ToolExecutor,
    ) -> TurnResult:
        if self._client is None:
            raise LLMNotConfigured("Defina GEMINI_API_KEY no .env do backend (ou use LLM_PROVIDER=mock).")
        contents = [types.Content.model_validate(m.content) for m in history]
        user = types.Content(role="user", parts=[types.Part.from_text(text=user_text)])
        contents.append(user)
        result = TurnResult(new_messages=[_dump(user)])
        config = types.GenerateContentConfig(
            system_instruction=f"{base_system}\n\n{dynamic_system}",
            tools=self._tools,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            thinking_config=types.ThinkingConfig(thinking_level=self.thinking_level) if self.thinking_level else None,
        )

        try:
            for _ in range(MAX_TOOL_ROUNDS):
                response = self._generate(contents, config)
                cand = response.candidates[0] if response.candidates else None
                finish = str(getattr(cand, "finish_reason", "") or "").rsplit(".", 1)[-1]
                if cand is None or cand.content is None or not cand.content.parts:
                    if finish in BLOCKED_FINISH_REASONS or (
                        response.prompt_feedback and response.prompt_feedback.block_reason
                    ):
                        result.refused = True
                    break

                contents.append(cand.content)
                result.new_messages.append(_dump(cand.content))
                result.texts += [
                    p.text for p in cand.content.parts if p.text and not p.thought and p.text.strip()
                ]

                calls = [p.function_call for p in cand.content.parts if p.function_call]
                if not calls:
                    break

                parts = []
                for fc in calls:
                    output, is_error = execute_tool(fc.name, dict(fc.args or {}))
                    payload = json.loads(output)
                    parts.append(
                        types.Part(
                            function_response=types.FunctionResponse(
                                id=fc.id,
                                name=fc.name,
                                response={"error": payload} if is_error else {"output": payload},
                            )
                        )
                    )
                # Todas as respostas de função numa única mensagem.
                tool_msg = types.Content(role="user", parts=parts)
                contents.append(tool_msg)
                result.new_messages.append(_dump(tool_msg))
            else:
                log.warning("Limite de rodadas de ferramentas atingido")
        except errors.ClientError as exc:
            if exc.code in (401, 403):
                raise LLMNotConfigured(f"Chave do Gemini inválida ou sem permissão: {exc}") from exc
            raise LLMUnavailable(str(exc)) from exc  # 429 (cota), 400, 404 (modelo)...
        except errors.APIError as exc:
            raise LLMUnavailable(str(exc)) from exc

        return result
