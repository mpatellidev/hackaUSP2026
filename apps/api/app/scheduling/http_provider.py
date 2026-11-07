"""STUB do provedor real de agendamento.

TODO(integração): implementar cada método chamando a API do projeto real
(SCHEDULING_API_URL), convertendo as respostas para Service/Slot/Appointment
e transformando erros de negócio em SchedulingError.
"""

from datetime import date, datetime

from app.scheduling.base import Appointment, Service, Slot


class HttpSchedulingProvider:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url

    def list_services(self) -> list[Service]:
        raise NotImplementedError

    def find_available_slots(self, service_id: str, start: date, end: date, limit: int = 12) -> list[Slot]:
        raise NotImplementedError

    def create_appointment(self, user_id: str, service_id: str, inicio: datetime) -> Appointment:
        raise NotImplementedError

    def list_appointments(self, user_id: str) -> list[Appointment]:
        raise NotImplementedError

    def cancel_appointment(self, user_id: str, appointment_id: str) -> Appointment:
        raise NotImplementedError

    def reschedule_appointment(self, user_id: str, appointment_id: str, novo_inicio: datetime) -> Appointment:
        raise NotImplementedError
