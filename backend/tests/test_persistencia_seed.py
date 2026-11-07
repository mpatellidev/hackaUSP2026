from sqlalchemy.orm import sessionmaker

from app.models.usuarios import Usuario
from app.seed import run as seed


def test_seed_idempotente(db):
    antes = seed(db)
    depois = seed(db)
    assert antes == depois and antes["clinicas"] == 4 and antes["usuarios"] == 11


def test_dados_persistem_em_nova_sessao(engine, db):
    with sessionmaker(bind=engine)() as outra:
        assert outra.query(Usuario).filter_by(conta_demo="paciente.ana").one().nome_exibicao == "Ana M."


def test_migracao_alembic_cria_o_mesmo_esquema(tmp_path, monkeypatch):
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import inspect

    from app.core import config
    from app.core.db import Base, make_engine

    url = f"sqlite:///{tmp_path / 'mig.db'}"
    monkeypatch.setenv("DATABASE_URL", url)
    config.get_settings.cache_clear()
    try:
        command.upgrade(Config("alembic.ini"), "head")
        tabelas = set(inspect(make_engine(url)).get_table_names())
    finally:
        config.get_settings.cache_clear()
    assert set(Base.metadata.tables) <= tabelas
