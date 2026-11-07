# Fixtures compartilhadas (tests/conftest.py) também para os testes dos módulos em app/modulos/*/tests.
from tests.conftest import client, db, engine, login  # noqa: F401
