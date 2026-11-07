"""MOCK de agendamento — NÃO DEFINITIVO.

Gera serviços e horários fictícios para o protótipo. Os agendamentos ficam em
memória (somem ao reiniciar o servidor). Substitua por um provedor real
implementando `SchedulingProvider`.
"""

import hashlib
import threading
import uuid
from datetime import date, datetime, time, timedelta

from app.clock import now_local
from app.scheduling.base import Appointment, SchedulingError, Service, Slot

SERVICES = [
    Service(
        id="consulta-clinica",
        nome="Consulta com clínico geral",
        descricao="Consulta médica de rotina.",
        duracao_min=30,
        local="Unidade Centro — Rua das Flores, 100, sala 2",
        orientacoes="Leve um documento com foto e o cartão do SUS.",
    ),
    Service(
        id="exame-sangue",
        nome="Coleta de exame de sangue",
        descricao="Coleta de sangue para exames laboratoriais.",
        duracao_min=15,
        local="Laboratório — Rua das Flores, 100, térreo",
        orientacoes="Fique em jejum de 8 horas: não coma nada depois do jantar. Pode beber água.",
    ),
    Service(
        id="atendimento-social",
        nome="Atendimento com assistente social",
        descricao="Orientação sobre benefícios e documentos.",
        duracao_min=60,
        local="CRAS Bairro Novo — Av. Brasil, 500",
        orientacoes="Leve RG, CPF e comprovante de endereço.",
    ),
]

OPEN_HOUR, CLOSE_HOUR = 8, 17


def _step_minutes(service: Service) -> int:
    """Grade de horários: de 30 em 30 min, ou na duração do serviço se for maior."""
    return max(service.duracao_min, 30)


class MockSchedulingProvider:
    def __init__(self, now: datetime | None = None) -> None:
        self._now = now
        self._services = {s.id: s for s in SERVICES}
        self._appointments: dict[str, Appointment] = {}
        self._lock = threading.Lock()

    # ---- helpers ----
    def now(self) -> datetime:
        return self._now or now_local()

    def _service(self, service_id: str) -> Service:
        if service_id not in self._services:
            raise SchedulingError(f"Serviço '{service_id}' não existe.")
        return self._services[service_id]

    @staticmethod
    def _pre_booked(service_id: str, inicio: datetime) -> bool:
        """Simula horários já ocupados por outras pessoas (determinístico)."""
        h = hashlib.md5(f"{service_id}{inicio.isoformat()}".encode()).digest()[0]
        return h % 3 == 0

    def _is_free(self, service: Service, inicio: datetime, ignore_id: str | None = None) -> bool:
        if inicio.weekday() >= 5 or inicio <= self.now():
            return False
        end = inicio + timedelta(minutes=service.duracao_min)
        if inicio.time() < time(OPEN_HOUR) or end.time() > time(CLOSE_HOUR) or end.date() != inicio.date():
            return False
        minutes_since_open = (inicio.hour - OPEN_HOUR) * 60 + inicio.minute
        if minutes_since_open % _step_minutes(service) != 0:
            return False
        if self._pre_booked(service.id, inicio):
            return False
        for a in self._appointments.values():
            if a.id == ignore_id or a.status != "confirmado" or a.service_id != service.id:
                continue
            a_end = a.inicio + timedelta(minutes=service.duracao_min)
            if inicio < a_end and a.inicio < end:
                return False
        return True

    def _owned(self, user_id: str, appointment_id: str) -> Appointment:
        a = self._appointments.get(appointment_id)
        if not a or a.user_id != user_id:
            raise SchedulingError("Agendamento não encontrado.")
        return a

    # ---- interface ----
    def list_services(self) -> list[Service]:
        return list(self._services.values())

    def find_available_slots(
        self, service_id: str, start: date, end: date, limit: int = 12
    ) -> list[Slot]:
        service = self._service(service_id)
        start = max(start, self.now().date())
        end = min(end, start + timedelta(days=30))
        slots: list[Slot] = []
        day = start
        step = timedelta(minutes=_step_minutes(service))
        while day <= end and len(slots) < limit:
            t = datetime.combine(day, time(OPEN_HOUR))
            while t.date() == day and len(slots) < limit:
                if self._is_free(service, t):
                    slots.append(Slot(service_id=service.id, inicio=t))
                t += step
            day += timedelta(days=1)
        return slots

    def create_appointment(self, user_id: str, service_id: str, inicio: datetime) -> Appointment:
        service = self._service(service_id)
        with self._lock:
            if not self._is_free(service, inicio):
                raise SchedulingError("Esse horário não está disponível. Escolha outro horário.")
            appt = Appointment(
                id=uuid.uuid4().hex[:8], user_id=user_id, service_id=service_id, inicio=inicio
            )
            self._appointments[appt.id] = appt
            return appt

    def list_appointments(self, user_id: str) -> list[Appointment]:
        return sorted(
            (a for a in self._appointments.values() if a.user_id == user_id and a.status == "confirmado"),
            key=lambda a: a.inicio,
        )

    def cancel_appointment(self, user_id: str, appointment_id: str) -> Appointment:
        with self._lock:
            a = self._owned(user_id, appointment_id)
            a.status = "cancelado"
            return a

    def reschedule_appointment(
        self, user_id: str, appointment_id: str, novo_inicio: datetime
    ) -> Appointment:
        with self._lock:
            a = self._owned(user_id, appointment_id)
            if a.status != "confirmado":
                raise SchedulingError("Esse agendamento foi cancelado.")
            if not self._is_free(self._service(a.service_id), novo_inicio, ignore_id=a.id):
                raise SchedulingError("O novo horário não está disponível. Escolha outro horário.")
            a.inicio = novo_inicio
            return a
