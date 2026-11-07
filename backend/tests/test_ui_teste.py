"""UI de teste servida pela própria API (/teste/): HTML, assets referenciados e redirecionamentos."""
import re
from pathlib import Path
from app.core.config import FIXTURES_DIR

PASTA = Path(__file__).resolve().parents[1] / "app" / "ui_teste"


def test_teste_responde_html(client):
    r = client.get("/teste/")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]
    assert "Protótipo de teste" in r.text and "192" in r.text


def test_assets_do_index_existem_e_sao_servidos(client):
    html = (PASTA / "index.html").read_text(encoding="utf-8")
    assets = re.findall(r'(?:src|href)="((?:css|js|dados)/[^"]+)"', html)
    assert assets, "index.html deveria referenciar css/js"
    for a in assets:
        assert (PASTA / a).is_file(), a
        assert client.get(f"/teste/{a}").status_code == 200, a


def test_imports_dos_modulos_js_existem(client):
    for js in (PASTA / "js").glob("*.js"):
        for rel in re.findall(r"from '\./([^']+)'", js.read_text(encoding="utf-8")):
            assert (PASTA / "js" / rel).is_file(), f"{js.name} importa {rel}"
    r = client.get("/teste/js/app.js")
    assert "javascript" in r.headers["content-type"]


def test_contas_demo_batem_com_a_fixture(client):
    import json
    fixture = json.loads((FIXTURES_DIR / "contas-demo.json").read_text(encoding="utf-8"))
    assert client.get("/teste/dados/contas-demo.json").json()["itens"] == fixture["itens"]


def test_raiz_e_teste_redirecionam(client):
    for origem in ("/", "/teste"):
        r = client.get(origem, follow_redirects=False)
        assert r.status_code in (301, 302, 307, 308), origem
        assert r.headers["location"].endswith("/teste/")
