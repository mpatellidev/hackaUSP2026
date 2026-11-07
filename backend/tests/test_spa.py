from fastapi.testclient import TestClient

from app.spa import montar
from fastapi import FastAPI


def _build(pasta, nome, titulo):
    dist = pasta / nome / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(f"<!doctype html><title>{titulo}</title>")
    (dist / "assets" / "app.js").write_text("console.log(1)")


def test_serve_os_dois_apps_e_volta_ao_index_nas_rotas_do_navegador(tmp_path):
    _build(tmp_path, "paciente", "Paciente")
    _build(tmp_path, "clinica", "Clinica")
    app = FastAPI()

    @app.get("/api/v1/ping")
    def ping():
        return {"ok": True}

    montar(app, tmp_path)
    c = TestClient(app)
    assert "Paciente" in c.get("/").text and "Paciente" in c.get("/pedidos/123").text
    assert "Clinica" in c.get("/clinica/").text and "Clinica" in c.get("/clinica/vagas").text
    assert c.get("/assets/app.js").status_code == 200
    assert c.get("/api/v1/ping").json() == {"ok": True}
    assert c.get("/api/v1/inexistente").status_code == 404  # API desconhecida nunca vira index.html
    assert c.get("/imagem-que-nao-existe.png").status_code == 404


def test_sem_build_explica_o_que_fazer(tmp_path):
    app = FastAPI()
    montar(app, tmp_path)
    r = TestClient(app).get("/")
    assert r.status_code == 200 and "npm run build" in r.text


def test_api_real_continua_funcionando_com_o_front_montado(client):
    assert client.get("/saude").json()["status"] == "ok"
    assert client.get("/api/v1/auth/contas").status_code == 200
