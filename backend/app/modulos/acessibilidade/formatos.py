from datetime import datetime

from app.core.time import SP, as_utc

DIAS = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"]
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]


def agora_sp() -> datetime:
    return datetime.now(SP).replace(second=0, microsecond=0)


def por_extenso(dt: datetime) -> str:
    """Ex.: 'quinta-feira, 12 de novembro de 2026, às 14h'. Sem fuso = UTC (como vem do SQLite)."""
    dt = as_utc(dt).astimezone(SP)
    hora = f"{dt.hour}h" + (f"{dt.minute:02d}" if dt.minute else "")
    return f"{DIAS[dt.weekday()]}, {dt.day} de {MESES[dt.month - 1]} de {dt.year}, às {hora}"
