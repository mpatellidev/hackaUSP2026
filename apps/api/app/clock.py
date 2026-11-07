from datetime import datetime
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Sao_Paulo")

DIAS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]


def now_local() -> datetime:
    """Horário local (São Paulo) sem tzinfo — o mock trabalha com horários locais."""
    return datetime.now(TZ).replace(tzinfo=None, second=0, microsecond=0)


def por_extenso(dt: datetime) -> str:
    """Ex.: 'terça-feira, 12 de novembro de 2026, às 9h30'."""
    hora = f"{dt.hour}h" + (f"{dt.minute:02d}" if dt.minute else "")
    return f"{DIAS[dt.weekday()]}, {dt.day} de {MESES[dt.month - 1]} de {dt.year}, às {hora}"
