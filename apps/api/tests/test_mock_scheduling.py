from datetime import date, datetime, timedelta

import pytest

from app.scheduling.base import SchedulingError
from app.scheduling.mock_provider import MockSchedulingProvider

NOW = datetime(2026, 11, 9, 7, 0)  # segunda-feira


@pytest.fixture
def p():
    return MockSchedulingProvider(now=NOW)


def test_slots_somente_dias_uteis_e_no_futuro(p):
    slots = p.find_available_slots("consulta-clinica", NOW.date(), NOW.date() + timedelta(days=13), limit=200)
    assert slots
    assert all(s.inicio.weekday() < 5 and s.inicio > NOW for s in slots)
    assert all(8 <= s.inicio.hour < 17 for s in slots)


def test_agendar_remove_horario_e_impede_conflito(p):
    slot = p.find_available_slots("consulta-clinica", NOW.date(), NOW.date())[0]
    a = p.create_appointment("u1", "consulta-clinica", slot.inicio)
    assert a.status == "confirmado"
    remaining = p.find_available_slots("consulta-clinica", NOW.date(), NOW.date(), limit=100)
    assert slot.inicio not in [s.inicio for s in remaining]
    with pytest.raises(SchedulingError):
        p.create_appointment("u2", "consulta-clinica", slot.inicio)


def test_cancelar_libera_horario_e_respeita_dono(p):
    slot = p.find_available_slots("exame-sangue", NOW.date(), NOW.date())[0]
    a = p.create_appointment("u1", "exame-sangue", slot.inicio)
    with pytest.raises(SchedulingError):
        p.cancel_appointment("outro", a.id)
    p.cancel_appointment("u1", a.id)
    assert p.list_appointments("u1") == []
    p.create_appointment("u2", "exame-sangue", slot.inicio)  # liberado


def test_remarcar(p):
    s1, s2 = p.find_available_slots("atendimento-social", NOW.date(), NOW.date() + timedelta(days=5))[:2]
    a = p.create_appointment("u1", "atendimento-social", s1.inicio)
    p.reschedule_appointment("u1", a.id, s2.inicio)
    assert p.list_appointments("u1")[0].inicio == s2.inicio


def test_horario_fora_do_expediente_ou_passado(p):
    with pytest.raises(SchedulingError):
        p.create_appointment("u1", "consulta-clinica", datetime(2026, 11, 9, 20, 0))
    with pytest.raises(SchedulingError):
        p.create_appointment("u1", "consulta-clinica", datetime(2026, 11, 8, 10, 0))  # domingo
    with pytest.raises(SchedulingError):
        p.find_available_slots("nao-existe", date(2026, 11, 9), date(2026, 11, 10))
