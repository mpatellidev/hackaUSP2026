import pytest


@pytest.fixture(autouse=True)
def _pesos_antigos(monkeypatch):
    """Estes testes cobrem a versão de pesos demo-0.1 (renda, encaixe acadêmico, espera e faltas)."""
    monkeypatch.setenv("PESOS_VERSAO", "demo-0.1")
