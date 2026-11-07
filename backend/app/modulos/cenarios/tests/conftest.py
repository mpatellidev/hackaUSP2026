import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))  # backend/


@pytest.fixture()
def client():
    from app.modulos.cenarios import service
    from app.modulos.cenarios.dev_app import criar_app

    service.repo.cenarios.clear()
    service.repo.interesses.clear()
    return TestClient(criar_app())
