"""Etapa 1: validação de CPF, criptografia em repouso e dados sensíveis nunca gravados abertos."""
import pytest
from sqlalchemy import text

from app.core import cpf
from app.core.cripto import cifrar, decifrar, hash_cpf
from app.models.usuarios import Usuario
from app.modulos.prontuario.models import RegistroProntuario

ANA_ID = "a1000000-0000-4000-8000-000000000001"


@pytest.mark.parametrize("valor", ["529.982.247-25", "52998224725", "000.000.001-91"])
def test_cpf_valido(valor):
    assert cpf.valido(valor)


@pytest.mark.parametrize("valor", ["529.982.247-26", "111.111.111-11", "00000000000", "1234567890", "abc", ""])
def test_cpf_invalido(valor):
    assert not cpf.valido(valor)


def test_cpf_formatar_mascarar_e_gerar():
    assert cpf.formatar("52998224725") == "529.982.247-25"
    assert cpf.mascarar("52998224725") == "***.***.*47-25"
    assert cpf.gerar_digitos("529982247") == "52998224725"


def test_cifrar_e_decifrar_e_hash_estavel():
    a, b = cifrar("dado sensível"), cifrar("dado sensível")
    assert a != b and decifrar(a) == decifrar(b) == "dado sensível"  # cifra muda a cada vez
    assert hash_cpf("529.982.247-25") == hash_cpf("52998224725") != hash_cpf("00000000191")


def test_seed_guarda_cpf_e_prontuario_cifrados(db):
    ana = db.get(Usuario, ANA_ID)
    assert ana.cpf_hash == hash_cpf("00000000191") and decifrar(ana.cpf_cifrado) == "00000000191"
    linha = db.execute(text("SELECT cpf_hash, cpf_cifrado FROM usuarios WHERE id = :i"), {"i": ANA_ID}).one()
    assert "00000000191" not in "".join(linha)  # nada em texto aberto no banco
    registro = db.query(RegistroProntuario).filter_by(paciente_id=ANA_ID).one()
    assert "dente 46" not in registro.conteudo_cifrado and "dente 46" in decifrar(registro.conteudo_cifrado)
    assert registro.validado_por and registro.especialidades == ["endodontia"]


def test_seed_de_novo_nao_troca_os_cifrados(db):
    from app.seed import run as seed
    antes = (db.get(Usuario, ANA_ID).cpf_cifrado, db.query(RegistroProntuario).one().conteudo_cifrado)
    seed(db)
    db.expire_all()
    assert antes == (db.get(Usuario, ANA_ID).cpf_cifrado, db.query(RegistroProntuario).one().conteudo_cifrado)
