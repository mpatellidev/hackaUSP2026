"""Contrato do serviço de agendamento.

O chat conversa SOMENTE com esta interface. Hoje a implementação é um mock;
para integrar com o sistema real, implemente `SchedulingProvider` em outro
módulo (ex.: http_provider.py) e selecione via SCHEDULING_PROVIDER.
"""

from dataclasses import asdict, dataclass
from datetime import date, datetime
from typing import Protocol


class SchedulingError(Exception):
    """Erro de negócio que deve ser explicado ao usuário (ex.: horário ocupado)."""


@dataclass(frozen=True)
class Service:
    id: str
    nome: str
    descricao: str
    duracao_min: int
    local: str
    orientacoes: str = ""


@dataclass(frozen=True)
class Slot:
    service_id: str
    inicio: datetime


@dataclass
class Appointment:
    id: str
    user_id: str
    service_id: str
    inicio: datetime
    status: str = "confirmado"  # confirmado | cancelado


def to_dict(obj) -> dict:
    d = asdict(obj)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat(timespec="minutes")
    return d


class SchedulingProvider(Protocol):
    def list_services(self) -> list[Service]: ...

    def find_available_slots(
        self, service_id: str, start: date, end: date, limit: int = 12
    ) -> list[Slot]: ...

    def create_appointment(self, user_id: str, service_id: str, inicio: datetime) -> Appointment: ...

    def list_appointments(self, user_id: str) -> list[Appointment]: ...

    def cancel_appointment(self, user_id: str, appointment_id: str) -> Appointment: ...

    def reschedule_appointment(
        self, user_id: str, appointment_id: str, novo_inicio: datetime
    ) -> Appointment: ...
