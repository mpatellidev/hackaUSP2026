"""Definição das ferramentas expostas ao Claude e seu executor."""

import json
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any

from app.clock import por_extenso
from app.scheduling.base import Appointment, SchedulingError, SchedulingProvider, to_dict
from app.schemas import QuickReply


def _tool(name: str, description: str, properties: dict, required: list[str]) -> dict:
    return {
        "name": name,
        "description": description,
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": False,
        },
    }


TOOLS: list[dict] = [
    _tool(
        "listar_servicos",
        "Lista os serviços que podem ser agendados, com id, nome, duração, local e orientações.",
        {},
        [],
    ),
    _tool(
        "buscar_horarios_disponiveis",
        "Busca horários livres de um serviço entre duas datas (inclusive). Se a pessoa não disser "
        "uma data, busque a partir de hoje até 7 dias depois.",
        {
            "servico_id": {"type": "string", "description": "id do serviço (de listar_servicos)"},
            "data_inicio": {"type": "string", "description": "AAAA-MM-DD"},
            "data_fim": {"type": "string", "description": "AAAA-MM-DD"},
        },
        ["servico_id", "data_inicio", "data_fim"],
    ),
    _tool(
        "criar_agendamento",
        "Cria o agendamento. Use SOMENTE depois que a pessoa confirmar explicitamente serviço, dia e horário.",
        {
            "servico_id": {"type": "string"},
            "inicio": {"type": "string", "description": "AAAA-MM-DDTHH:MM, um horário retornado pela busca"},
        },
        ["servico_id", "inicio"],
    ),
    _tool(
        "listar_meus_agendamentos",
        "Lista os agendamentos futuros confirmados da pessoa.",
        {},
        [],
    ),
    _tool(
        "cancelar_agendamento",
        "Cancela um agendamento da pessoa. Use SOMENTE após confirmação explícita.",
        {"agendamento_id": {"type": "string"}},
        ["agendamento_id"],
    ),
    _tool(
        "remarcar_agendamento",
        "Muda o horário de um agendamento existente. Use SOMENTE após confirmação explícita.",
        {
            "agendamento_id": {"type": "string"},
            "novo_inicio": {"type": "string", "description": "AAAA-MM-DDTHH:MM"},
        },
        ["agendamento_id", "novo_inicio"],
    ),
    _tool(
        "explicar_em_audio",
        "Envia um áudio falado junto com a sua resposta, para explicar algo importante "
        "(ex.: confirmação do agendamento, orientações de preparo). Escreva o texto como fala natural.",
        {"texto": {"type": "string", "description": "O que será falado no áudio"}},
        ["texto"],
    ),
    _tool(
        "oferecer_opcoes",
        "Mostra botões de resposta rápida para a pessoa escolher, em vez de digitar.",
        {
            "opcoes": {
                "type": "array",
                "description": "Até 6 opções",
                "items": {
                    "type": "object",
                    "properties": {
                        "rotulo": {"type": "string", "description": "Texto curto exibido no botão"},
                        "valor": {"type": "string", "description": "Mensagem enviada quando a pessoa tocar"},
                    },
                    "required": ["rotulo", "valor"],
                    "additionalProperties": False,
                },
            }
        },
        ["opcoes"],
    ),
]


@dataclass
class ToolContext:
    user_id: str
    scheduling: SchedulingProvider
    audios: list[str] = field(default_factory=list)
    quick_replies: list[QuickReply] = field(default_factory=list)


def _appt_out(a: Appointment, scheduling: SchedulingProvider) -> dict:
    services = {s.id: s for s in scheduling.list_services()}
    s = services.get(a.service_id)
    return {
        **to_dict(a),
        "quando_por_extenso": por_extenso(a.inicio),
        "servico": s.nome if s else a.service_id,
        "local": s.local if s else None,
        "orientacoes": s.orientacoes if s else None,
    }


def _parse_dt(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value).replace(tzinfo=None, second=0, microsecond=0)
    except ValueError as exc:
        raise SchedulingError(f"Data/hora inválida: {value!r}. Use AAAA-MM-DDTHH:MM.") from exc


def _parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise SchedulingError(f"Data inválida: {value!r}. Use AAAA-MM-DD.") from exc


def run_tool(name: str, args: dict[str, Any], ctx: ToolContext) -> tuple[str, bool]:
    """Executa uma ferramenta. Retorna (conteúdo JSON, is_error)."""
    sch = ctx.scheduling
    try:
        match name:
            case "listar_servicos":
                result: Any = [to_dict(s) for s in sch.list_services()]
            case "buscar_horarios_disponiveis":
                start = _parse_date(args["data_inicio"])
                end = _parse_date(args["data_fim"])
                if end < start:
                    end = start + timedelta(days=7)
                slots = sch.find_available_slots(args["servico_id"], start, end)
                result = {
                    "horarios": [
                        {"inicio": s.inicio.isoformat(timespec="minutes"), "por_extenso": por_extenso(s.inicio)}
                        for s in slots
                    ],
                    "observacao": None if slots else "Nenhum horário livre nesse período.",
                }
            case "criar_agendamento":
                a = sch.create_appointment(ctx.user_id, args["servico_id"], _parse_dt(args["inicio"]))
                result = {"agendamento": _appt_out(a, sch)}
            case "listar_meus_agendamentos":
                result = {"agendamentos": [_appt_out(a, sch) for a in sch.list_appointments(ctx.user_id)]}
            case "cancelar_agendamento":
                a = sch.cancel_appointment(ctx.user_id, args["agendamento_id"])
                result = {"agendamento": _appt_out(a, sch)}
            case "remarcar_agendamento":
                a = sch.reschedule_appointment(
                    ctx.user_id, args["agendamento_id"], _parse_dt(args["novo_inicio"])
                )
                result = {"agendamento": _appt_out(a, sch)}
            case "explicar_em_audio":
                ctx.audios.append(args["texto"].strip())
                result = {"ok": True, "info": "O áudio será enviado junto com a sua próxima mensagem."}
            case "oferecer_opcoes":
                ctx.quick_replies = [
                    QuickReply(label=o["rotulo"], value=o["valor"]) for o in args["opcoes"][:6]
                ]
                result = {"ok": True, "info": "Os botões serão exibidos abaixo da sua mensagem."}
            case _:
                return json.dumps({"erro": f"Ferramenta desconhecida: {name}"}), True
    except SchedulingError as exc:
        return json.dumps({"erro": str(exc)}, ensure_ascii=False), True
    except KeyError as exc:
        return json.dumps({"erro": f"Parâmetro obrigatório ausente: {exc}"}, ensure_ascii=False), True
    return json.dumps(result, ensure_ascii=False), False
