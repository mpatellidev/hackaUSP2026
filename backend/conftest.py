# Fixtures compartilhadas (tests/conftest.py) também para os testes dos módulos em app/modulos/*/tests.
import os

os.environ.setdefault("DEMO_MODE", "true")  # o padrão do app é fechado; os testes usam o modo demo (como o .env local)

from tests.conftest import client, db, engine, login  # noqa: E402,F401
