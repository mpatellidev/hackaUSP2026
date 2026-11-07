from functools import lru_cache

from app.config import get_settings
from app.scheduling.base import SchedulingProvider


@lru_cache
def get_scheduling_provider() -> SchedulingProvider:
    s = get_settings()
    if s.scheduling_provider == "mock":
        from app.scheduling.mock_provider import MockSchedulingProvider

        return MockSchedulingProvider()
    if s.scheduling_provider == "http":
        from app.scheduling.http_provider import HttpSchedulingProvider

        return HttpSchedulingProvider(s.scheduling_api_url)
    raise ValueError(f"SCHEDULING_PROVIDER desconhecido: {s.scheduling_provider}")
