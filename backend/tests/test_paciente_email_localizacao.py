"""Login por e-mail, cadastro, clínicas mais próximas, horários livres e contato do pedido."""
from app.core.config import get_settings
from tests.conftest import ANA, CLINICA_A, CLINICA_B

API = "/api/v1"
CLINICA_C = "c1000000-0000-4000-8000-000000000003"
CLINICA_D = "c1000000-0000-4000-8000-000000000004"


def test_entrar_com_email_e_senha_inicial(client):
    r = client.post(f"{API}/auth/entrar", json={"login": "Ana.Martins@example.com", "senha": get_settings().demo_senha})
    assert r.status_code == 200, r.text
    assert r.json()["usuario"]["nome_exibicao"] == "Ana Martins"
    errada = client.post(f"{API}/auth/entrar", json={"login": "ana.martins@example.com", "senha": "nao-e-essa"})
    assert errada.status_code == 401 and errada.json()["erro"]["mensagem"] == "CPF/e-mail ou senha incorretos."


def test_cadastro_cria_paciente_com_senha_propria_e_nao_repete_email(client, db):
    r = client.post(f"{API}/auth/cadastro", json={"cpf": "52998224725", "nome": "Marina Rocha", "email": "marina.rocha@example.com", "senha": "segredo-forte-1"})
    assert r.status_code == 201, r.text
    token = r.json()["token"]
    me = client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}).json()["usuario"]
    assert me["papel"] == "paciente" and me["nome_exibicao"] == "Marina Rocha"
    assert client.post(f"{API}/auth/entrar", json={"login": "marina.rocha@example.com", "senha": "segredo-forte-1"}).status_code == 200
    repetido = client.post(f"{API}/auth/cadastro", json={"cpf": "11144477735", "nome": "Outra", "email": "MARINA.rocha@example.com", "senha": "outra-senha-2"})
    assert repetido.status_code == 409
    curta = client.post(f"{API}/auth/cadastro", json={"cpf": "39053344705", "nome": "Leo", "email": "leo@example.com", "senha": "123"})
    assert curta.status_code == 422


def test_seed_nao_troca_senha_de_quem_se_cadastrou(client, db):
    from app.seed import run as seed
    client.post(f"{API}/auth/cadastro", json={"cpf": "15350946056", "nome": "Paulo Reis", "email": "paulo.reis@example.com", "senha": "minha-senha-9"})
    seed(db)
    db.commit()
    assert client.post(f"{API}/auth/entrar", json={"login": "paulo.reis@example.com", "senha": "minha-senha-9"}).status_code == 200


def test_clinicas_mais_proximas_pela_localizacao_do_aparelho(client, login):
    # Perto da Vila Mariana: Vila Mariana primeiro, Campinas por último
    r = client.get(f"{API}/clinicas", params={"lat": -23.5880, "lng": -46.6350}, headers=login(ANA))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["localizacao"] == {"fonte": "aparelho", "aproximada": False, "descricao": "sua localização"}
    ids = [c["id"] for c in d["itens"]]
    assert ids[0] == CLINICA_B and ids[-1] == CLINICA_D
    assert d["itens"][0]["distancia_km"] < 1 and d["itens"][0]["endereco"]


def test_clinicas_mais_proximas_pelo_cep_aproximado(client, login):
    d = client.get(f"{API}/clinicas", params={"cep": "13083-970"}, headers=login(ANA)).json()
    assert d["localizacao"]["fonte"] == "cep" and d["localizacao"]["aproximada"] is True
    assert d["itens"][0]["id"] == CLINICA_D
    fora = client.get(f"{API}/clinicas", params={"cep": "69000-000"}, headers=login(ANA))
    assert fora.status_code == 422


def test_sem_localizacao_a_lista_continua_igual(client, login):
    d = client.get(f"{API}/clinicas", headers=login(ANA)).json()
    assert d["total"] == 4 and d.get("localizacao") is None
    assert all(c["distancia_km"] is None for c in d["itens"])


def test_horarios_livres_sem_precisar_de_pedido_e_sem_dados_de_outros(client, login):
    r = client.get(f"{API}/clinicas/{CLINICA_A}/horarios", headers=login(ANA))
    assert r.status_code == 200, r.text
    for h in r.json()["itens"]:
        assert set(h) == {"vaga_id", "especialidade", "inicio", "fim"}
    assert client.get(f"{API}/clinicas/nao-existe/horarios", headers=login(ANA)).status_code == 404
    assert client.get(f"{API}/clinicas/{CLINICA_A}/horarios", headers=login("funcionario.atendimento.a")).status_code == 403


def test_pedido_guarda_contato_e_exige_nome_quando_e_para_outra_pessoa(client, login):
    h = login("paciente.carla")
    base = {"clinica_id": CLINICA_A, "especialidade": "dentistica", "publico_alvo": "adultos",
            "descricao_administrativa": "consulta de rotina"}
    sem_nome = client.post(f"{API}/solicitacoes", headers=h, json={**base, "para_quem": "outra"})
    assert sem_nome.status_code == 422
    r = client.post(f"{API}/solicitacoes", headers=h, json={**base, "para_quem": "outra", "nome_paciente": "José Pereira",
                                                            "telefone_contato": "(11) 91234-5678"})
    assert r.status_code == 201, r.text
    assert r.json()["nome_paciente"] == "José Pereira" and r.json()["telefone_contato"] == "(11) 91234-5678"
    assert client.get(f"{API}/clinicas/{CLINICA_C}", headers=h).json()["bairro"] == "Pinheiros"
