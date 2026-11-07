from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

SP = ZoneInfo("America/Sao_Paulo")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_aware(value: str) -> datetime:
    """Horário ISO 8601 COM fuso (contrato §2). Sem fuso -> ValueError."""
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        raise ValueError("horário sem fuso")
    return dt.astimezone(timezone.utc)


def to_sp_iso(dt: datetime | None) -> str | None:
    """Saída em America/Sao_Paulo (-03:00). O banco guarda UTC (SQLite perde o tzinfo)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(SP).isoformat(timespec="seconds")


def hours(n: int) -> timedelta:
    return timedelta(hours=n)


def as_utc(dt: datetime) -> datetime:
    """SQLite devolve datetimes sem tzinfo; no banco tudo é UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
