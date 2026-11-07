import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app import models  # noqa: F401
from app.core.db import Base, get_db, make_engine
from app.main import create_app
from app.seed import run as seed

ANA, EVA = "paciente.ana", "paciente.eva"
ATEND_A, ATEND_B = "funcionario.atendimento.a", "funcionario.atendimento.b"
CLINICA_A, CLINICA_B = "c1000000-0000-4000-8000-000000000001", "c1000000-0000-4000-8000-000000000002"


@pytest.fixture
def engine(tmp_path):
    eng = make_engine(f"sqlite:///{tmp_path / 'teste.db'}")
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture
def db(engine):
    with sessionmaker(bind=engine, expire_on_commit=False)() as s:
        seed(s)
        yield s


@pytest.fixture
def client(engine, db):
    app = create_app()

    def _db():
        with sessionmaker(bind=engine, expire_on_commit=False)() as s:
            yield s

    app.dependency_overrides[get_db] = _db
    return TestClient(app)


@pytest.fixture
def login(client):
    def _login(conta: str) -> dict:
        r = client.post("/api/v1/auth/demo/login", json={"conta": conta})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['token']}"}
    return _login
